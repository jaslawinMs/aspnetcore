import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const [root, mode] = process.argv.slice(2);
assert(root && path.isAbsolute(root) && (!mode || mode === '--verify'));
const local = relative => path.join(root, ...relative.split(/[\\/]/));
const textAt = name => fs.readFileSync(name, 'utf8').replace(/^\uFEFF/, '');
const jsonAt = name => JSON.parse(textAt(name));
const digest = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const copies = fs.existsSync(local('authoritative-copy-manifest.json')) ? jsonAt(local('authoritative-copy-manifest.json')) : null;
const mappings = new Map((copies ?? []).filter(row => row.kind.startsWith('run')).map(row => [row.original.replaceAll('/', '\\'), row]));
const equal = (a, b, label = 'Actual evidence differs.') => assert.deepEqual(a, b, label);
const near = (a, b, label = 'Numerical evidence differs.') => assert(Number.isFinite(a) && Number.isFinite(b) &&
    Math.abs(a - b) <= Math.max(1e-5, Math.abs(b) * 1e-12), label);
const unique = values => equal(new Set(values).size, values.length);
function file(relative)
{
    if (!copies) return local(relative);
    const row = mappings.get(relative.replaceAll('/', '\\')); assert(row, 'Missing authoritative artifact:' + relative);

    return local(row.destination);
}
const text = relative => textAt(file(relative));
const read = relative => jsonAt(file(relative));
const hash = relative => digest(fs.readFileSync(file(relative)));
const listing = relative => copies ? [...mappings.keys()].filter(name => path.win32.dirname(name) === relative)
    : fs.readdirSync(local(relative)).map(name => relative + '\\' + name);
const percentile = (sorted, p) =>
{
    const rank = (sorted.length - 1) * p / 100, lower = Math.floor(rank), upper = Math.ceil(rank);

    return sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);
};
const roundEven = value => value - Math.floor(value) === 0.5 ? Math.floor(value) + Math.floor(value) % 2 : Math.round(value);
if (copies)
{
    unique(copies.map(row => row.destination));
    unique(copies.filter(row => row.kind.startsWith('run')).map(row => row.original));
    for (const row of copies) equal([digest(fs.readFileSync(local(row.destination))), fs.statSync(local(row.destination)).size], [row.sha256, row.bytes], row.original);
}
const budget = read('measurement-budget.json'), disposition = read('final-evaluation.json');
equal([budget.maximumSourceComparisons, budget.actualSourceComparisons, budget.candidateSourceShapes, budget.originalPressureProfilesStarted,
    budget.originalPressureProfilesCompleted, budget.originalPressureParserFailures, budget.closed, budget.unusedComparisons],
[3, 0, [], 1, 1, 1, true, 3]);
equal([disposition.disposition, disposition.sourceChanged, disposition.sourceComparisons, disposition.performancePrJustified],
['rejected-local-boxing-removal', false, 0, false]);
const source = read('current-source-investigation.json');
equal([source.baseline, source.freshDefault, source.exactScopedIdentities, source.shippingChanges, source.priorF086CacheChangeInherited],
['37e809ead5824bc753a1c3d56f11615bdb1296c5', '18781e9d03cba0f3df9cdf7fae90f77771ca9f00', 14, false, false]);
equal(source.scopedSourceIdentities.length, 14); unique(source.scopedSourceIdentities.map(row => row.path));
for (const row of source.scopedSourceIdentities)
{
    const raw = fs.readFileSync(file('producer-source\\' + row.path)), canonical = Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'));
    equal([digest(raw), digest(canonical), row.canonicalEqual], [row.workingRawSha256, row.baselineCanonicalSha256, true]);
    equal([hash('baseline-canonical\\' + row.path), hash('current-default-canonical\\' + row.path)], [digest(canonical), digest(canonical)]);
    equal(hash('frozen-source\\original\\' + row.path), digest(raw));
}
assert(source.commands.every(command => command.exitCode === 0));
const manifest = read('original-manifest.json'), closure = read('execution-closure-original.json');
equal([manifest.sourceTrackedUnchanged, manifest.priorF086ChangeInherited, manifest.actualTestedOwnerMatches, manifest.semanticRows,
    closure.copiedFiles, closure.files.length, closure.declaredRuntimeAssets, closure.runtimeAssets.length, closure.onlyMicrosoftNetCoreFramework],
[true, false, true, 81, 152, 152, 70, 70, true]);
unique(closure.files.map(row => row.file));
for (const [name, field] of [
    ['AutoPerf.Benchmarks.dll', 'harnessSha256'], ['AutoPerf.Benchmarks.pdb', 'harnessPdbSha256'],
    ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtimeConfigurationSha256'], ['AutoPerf.Benchmarks.deps.json', 'dependencyConfigurationSha256'],
    ['Microsoft.AspNetCore.JsonPatch.SystemTextJson.dll', 'ownerSha256'], ['Microsoft.AspNetCore.JsonPatch.SystemTextJson.pdb', 'ownerPdbSha256']
]) equal(closure.files.find(row => row.file === name)?.sha256, manifest[field]);
for (const asset of closure.runtimeAssets) equal(closure.files.find(row => row.file === asset.copied)?.sha256, asset.sha256);
for (const name of ['Program.cs', 'Cases.cs', 'Workload.cs', 'SettingsPreservingEmitToolchain.cs', 'AutoPerf.Benchmarks.csproj'])
    equal(hash('harness\\' + name), hash('frozen-source\\original\\harness\\' + name));
assert(!text('producer-source\\src\\Features\\JsonPatch.SystemTextJson\\src\\Internal\\ListAdapter.cs').includes('ConditionalWeakTable'));
assert(text('harness\\Program.cs').includes('.WithPowerPlan(Guid.Empty)'));
assert(!/(?:\.PriorityClass|Thread\.CurrentThread\.Priority|\.ProcessorAffinity)\s*=(?!=)/.test(text('harness\\SettingsPreservingEmitToolchain.cs')));
const fixture = read('fixture\\manifest.json');
const labels = ['ReadInt', 'ReadLong', 'ReadDecimal', 'ReadGuid', 'ReadMutableStruct', 'ReadNullableValue', 'ReadNullableNull',
    'ReadString', 'ReadReference', 'ReadPreboxedObject', 'ReadJsonArrayValue', 'ReadJsonArrayNull',
    'GetInt', 'GetNullableValue', 'GetNullableNull', 'GetString', 'GetJsonArray', 'TraverseStruct',
    'PatchTestInt', 'PatchTestInt8', 'PatchCopyInt', 'PatchTestNullableValue', 'PatchTestNullableNull',
    'PatchTestStructMember', 'PatchTestReferenceMember', 'PatchTestJsonArrayMember', 'PatchTestScalar', 'PatchCopyString'];
equal(fixture.cases.map(row => row.Label), labels);
const labelSet = new Set(labels), unicode = 'value-\u00e9\u4e2d\u{1F30D}';
const expectedModel = label => ({
    Ints: [731], Longs: [1099511627777], Decimals: [1234.125], Guids: ['00112233-4455-6677-8899-aabbccddeeff'],
    Structs: [{ Value: 731, Stamp: 1099511627777 }], Nullable: [731, null], Strings: [unicode],
    References: [{ Value: 731, Text: unicode }], Objects: [731], ScalarNodes: [731, null], Nodes: [{ Value: 731 }], Scalar: 731,
    CopiedInt: label === 'PatchCopyInt' ? 731 : 0, CopiedString: label === 'PatchCopyString' ? unicode : ''
});
const expectedValue = target => ({
    Int: 731, Long: 1099511627777, Decimal: 1234.125, Guid: '00112233-4455-6677-8899-aabbccddeeff',
    Struct: { Value: 731, Stamp: 1099511627777 }, NullableValue: 731, NullableNull: null, String: unicode,
    Reference: { Value: 731, Text: unicode }, Preboxed: 731, JsonValue: 731, JsonNull: null, Model: null
})[target];
for (const row of fixture.cases)
{
    equal([hash(`fixture\\inputs\\${row.Label}.json`), hash(`fixture\\expected\\${row.Label}.json`)], [row.inputSha256, row.outputSha256]);
    const input = read(`fixture\\inputs\\${row.Label}.json`), output = read(`fixture\\expected\\${row.Label}.json`);
    equal([input.Label, input.mode, input.target, output.Label, output.mode, output.passed], [row.Label, row.mode, row.target, row.Label, row.mode, true]);
    equal(JSON.parse(input.initialModel), expectedModel('initial')); equal(JSON.parse(output.finalModel), expectedModel(row.Label));
    equal(JSON.parse(output.resultJson), expectedValue(row.target));
    if (row.target === 'JsonValue') assert(output.resultType.startsWith('System.Text.Json.Nodes.JsonValuePrimitive`1[[System.Int32,'));
    else equal(output.resultType, ({ Int: 'System.Int32', Long: 'System.Int64', Decimal: 'System.Decimal', Guid: 'System.Guid',
        Struct: 'AutoPerf.MutableNumber', NullableValue: 'System.Int32', NullableNull: null, String: 'System.String',
        Reference: 'AutoPerf.Leaf', Preboxed: 'System.Int32', JsonNull: null, Model: null })[row.target]);
    equal(output.patchOperations, row.mode === 'Patch' ? (row.Label === 'PatchTestInt8' ? 8 : 1) : 0);
    if (row.mode === 'Patch')
    {
        const operations = JSON.parse(input.Patch); equal(operations.length, output.patchOperations);
        assert(operations.every(operation => ['test', 'copy'].includes(operation.op)));
        equal(output.resultType, null);
    }
}
function boundary(relative)
{
    const value = read(relative);
    equal([value.listMutationObserved, value.boxedMutableStructIsolated, value.currentPipelineReturnType,
        value.publicDivergentNonGenericValue, value.genericIndexerValue, value.publicNonGenericReads,
        value.nearestOppositePublicTestFailed, value.actualArrayAndNonGenericListRejected],
    [true, true, 'System.Object', 1731, 731, 2, true, true]);
    equal(value.nearestOppositeMessage, "The current value '1731' at position '0' is not equal to the test value '731'.");
}
boundary('fixture\\boundary-producer-contract.json');
function runtime(relative)
{
    const r = read(relative + '\\states\\runtime.json');
    equal([r.variant, r.owner.sha256, r.harness.sha256, r.runtime, r.architecture, r.serverGc, r.configuredConcurrentGc, r.processorCount],
    ['original', manifest.ownerSha256, manifest.harnessSha256, '12.0.0', 'X64', true, true, 16]);
    for (const key of ['corelib', 'json'])
    {
        assert(r[key].informationalVersion.startsWith('12.0.0-alpha.1.26562.105+'));
        assert(/^[A-F0-9]{64}$/.test(r[key].sha256) && /^[a-f0-9-]{36}$/.test(r[key].mvid));
    }
    equal(r.settings, { processPriority: 'Normal', threadPriority: 'Normal', affinity: 65535 });
    equal(r.fixtureManifestSha256, hash('fixture\\manifest.json')); equal(r.cases.map(row => row.Label), labels);
    assert(Number.isInteger(r.processId) && r.processId > 0); boundary(relative + '\\states\\object-boundary.json');

    return r;
}
let contracts = 0, calipers = 0;
function contract(value)
{
    const fixtureRow = fixture.cases.find(row => row.Label === value.Label); assert(fixtureRow);
    equal([value.inputSha256, value.outputSha256, value.passed], [fixtureRow.inputSha256, fixtureRow.outputSha256, true]);
    equal(value.result, read(`fixture\\expected\\${value.Label}.json`)); contracts++;
}
const charRelative = 'characterization\\original'; runtime(charRelative);
equal(read(charRelative + '\\execution.json').exitCode, 0);
const directBytes = { ReadInt: 24, ReadLong: 24, ReadDecimal: 32, ReadGuid: 32, ReadMutableStruct: 32, ReadNullableValue: 24,
    ReadNullableNull: 0, ReadString: 0, ReadReference: 0, ReadPreboxedObject: 0, ReadJsonArrayValue: 0, ReadJsonArrayNull: 0 };
for (const label of labels)
{
    contract(read(`${charRelative}\\states\\contract-${label}.json`));
    const value = read(`${charRelative}\\states\\caliper-${label}.json`); equal([value.Label, value.samples.length], [label, 5]);
    equal(value.samples.map(row => row.sample), [0, 1, 2, 3, 4]);
    for (const sample of value.samples)
    {
        equal(sample.operations, 4096); near(sample.bytesPerOperation, sample.allocatedBytes / 4096);
        near(sample.processBytesPerOperation, sample.processAllocatedBytes / 4096);
        assert(sample.allocatedBytes >= 0 && sample.processAllocatedBytes >= sample.allocatedBytes && sample.diagnosticElapsedMilliseconds > 0);
        if (label in directBytes) near(sample.bytesPerOperation, directBytes[label]);
        calipers++;
    }
}
const typed = read(charRelative + '\\states\\typed-reader-diagnostics.json');
equal([typed.sourceComparison, typed.objectResultValue, typed.nativeResultValue, typed.genericToObject.length, typed.nativeTypedReturn.length], [false, 731, 731, 5, 5]);
for (const sample of typed.genericToObject) equal([sample.operations, sample.allocatedBytes, sample.bytesPerOperation], [4096, 4096 * 24, 24]);
for (const sample of typed.nativeTypedReturn) equal([sample.operations, sample.allocatedBytes, sample.bytesPerOperation], [4096, 0, 0]);
const audit = read('tests\\original\\test-audit.json'), testXml = text('tests\\original\\owning-original.trx');
equal([audit.discoveredDefinitions, audit.actualExpandedResults, audit.passed, audit.failed, audit.skipped, hash('tests\\original\\owning-original.trx')],
[61, 81, 81, 0, 0, audit.trxSha256]);
equal(audit.sourceMemberDataExpansions, {
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.Internal.ListAdapterTest.Add_Appends_AtTheEnd': 2,
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.Internal.ListAdapterTest.Add_DifferentComplexTypeWorks': 4,
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.Internal.ListAdapterTest.Add_KeepsObjectReference': 4,
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.Internal.ListAdapterTest.Replace_ReplacesValue_AtGivenPosition': 2,
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.Internal.ObjectVisitorTest.Visit_ValidPathToArray_ReturnsListAdapter': 6,
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.Internal.ObjectVisitorTest.Visit_ValidPathToDictionary_ReturnsDictionaryAdapter': 5,
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.Internal.ObjectVisitorTest.Visit_ValidPath_ReturnsExpandoAdapter': 4
});
equal([audit.firstHelperAuditFailedNotTests, audit.testsRerunToFixAuditor], [true, false]);
assert(read('tests\\original\\execution.json').commands.every(row => row.exitCode === 0));
const decode = value => value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) =>
    entity[0] === '#' ? String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)))
        : ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[entity.toLowerCase()]);
const attributes = value => Object.fromEntries([...value.matchAll(/([\w:]+)="([^"]*)"/g)].map(match => [match[1], decode(match[2])]));
const rawRows = [...testXml.matchAll(/<UnitTestResult\s+([^>]+)>/g)].map(match => attributes(match[1]));
const definitions = [...testXml.matchAll(/<UnitTest\s+([^>]+)>([\s\S]*?)<\/UnitTest>/g)].map(match =>
    ({ ...attributes(match[1]), execution: attributes(match[2].match(/<Execution\s+([^>]+)\/>/)[1]).id }));
const entries = [...testXml.matchAll(/<TestEntry\s+([^>]+)\/>/g)].map(match => attributes(match[1]));
equal([rawRows.length, definitions.length, entries.length], [81, 61, 81]); unique(rawRows.map(row => row.executionId));
const discovered = [...text('tests\\original\\discovery.log').matchAll(/^\s+(Microsoft\.AspNetCore\.JsonPatch\.SystemTextJson\..+)$/gm)].map(match => match[1].trim());
equal(discovered.length, 61); equal(discovered.sort(), definitions.map(row => row.name).sort());
for (const row of rawRows)
{
    const definition = definitions.find(value => value.id === row.testId); assert(definition);
    equal(row.outcome, 'Passed'); assert(row.duration && /[1-9]/.test(row.duration));
    equal(entries.filter(value => value.testId === row.testId && value.executionId === row.executionId).length, 1);
    equal(audit.rows.filter(value => value.testId === row.testId && value.executionId === row.executionId && value.testName === row.testName && value.duration === row.duration).length, 1);
}
for (const definition of definitions)
{
    const rows = rawRows.filter(row => row.testId === definition.id), expected = audit.sourceMemberDataExpansions[definition.name] ?? 1;
    equal(rows.length, expected); assert(rows.some(row => row.executionId === definition.execution));
    assert(rows.every(row => expected === 1 ? row.testName === definition.name : row.testName.startsWith(definition.name + '(')));
}
for (const [fileName, field] of [['Microsoft.AspNetCore.JsonPatch.SystemTextJson.dll', 'ownerSha256'], ['Microsoft.AspNetCore.JsonPatch.SystemTextJson.pdb', 'ownerPdbSha256']])
    equal(audit.capturedTestAndOwnerImage.find(row => row.file === fileName)?.sha256, manifest[field]);
const pdb = read('symbols\\original\\commands.json'); equal(pdb.commands.length, 15);
for (const command of pdb.commands)
{
    equal(command.exitCode, 0);
    const argument = command.arguments.at(-1), marker = '\\autoperf-runs\\F115\\', offset = argument.indexOf(marker); assert(offset >= 0);
    const sourcePath = argument.slice(offset + marker.length), proof = read(`symbols\\original\\${path.win32.basename(sourcePath)}.json`);
    equal([proof.verified, proof.source_sha256, proof.actual_pdb_document_sha256], [true, hash(sourcePath), hash(sourcePath)]);
}
const correction = read('preprofile-exporter-correction.json'), failed = read('development\\preprofile-invalid-exporter\\execution.json');
equal([correction.actualWorkloadOutcomesBeforeCorrection, correction.actualBenchmarkSetupsBeforeCorrection, correction.frozenImageChanged, failed.exitCode], [0, 0, false, -532462766]);
assert(failed.arguments.includes('jsonfull'));
assert(!/^\/\/ Benchmark: |^(?:Workload|Overhead)(?:Warmup|Actual|Result|Pilot)/m.test(text('development\\preprofile-invalid-exporter\\console.log')));
runtime('development\\preprofile-invalid-exporter');
for (const row of correction.archivedFiles) equal([hash('development\\preprofile-invalid-exporter\\' + row.relative),
    fs.statSync(file('development\\preprofile-invalid-exporter\\' + row.relative)).size], [row.sha256, row.bytes]);
const relative = 'measurements\\original', r = runtime(relative), execution = read(relative + '\\execution.json');
equal([execution.exitCode, execution.expectedCases, execution.sourceChanged, execution.sourceComparison], [0, 28, false, false]);
const postprocess = read(relative + '\\postprocess-first-failure.json');
equal([postprocess.outerHelperExitCode, postprocess.actualChildDotnetExitCode, postprocess.actualOutcomes, postprocess.actualRetainedSamples,
    postprocess.benchmarksRerunToFixAuditor], [1, 0, 28, 224, false]);
assert(text(relative + '\\executed-source.ps1').includes("-Filter '*-full.json'"));
equal(execution.powerSchemeBefore, execution.powerSchemeAfter);
for (const [flag, expected] of [['--warmupCount', '3'], ['--iterationCount', '8'], ['--iterationTime', '100'], ['--outliers', 'DontRemove']])
    equal(execution.arguments[execution.arguments.indexOf(flag) + 1], expected);
assert(!execution.arguments.includes('--inProcess') && !execution.arguments.includes('--job'));
const reportNames = listing(relative + '\\results').filter(name => /-report-full.*\.json$/.test(name)); equal(reportNames.length, 1);
const report = read(reportNames[0]), consoleText = text(relative + '\\console.log');
equal([report.Benchmarks.length, report.HostEnvironmentInfo.BenchmarkDotNetVersion], [28, '0.13.0']);
const blocks = consoleText.split(/^\/\/ Benchmark: /m).slice(1); equal(blocks.length, 28); unique(report.Benchmarks.map(row => row.FullName));
const outcomes = []; let warmups = 0, retained = 0, overheads = 0, setups = 0, settingsRecords = 0;
for (const label of labels)
{
    const benchmark = report.Benchmarks.find(row => row.FullName === `AutoPerf.ListReadBenchmark.ReadOrProcess(Case: "${label}")`); assert(benchmark);
    assert(benchmark.DisplayInfo.includes('Toolchain=SettingsPreservingEmitToolchain') && benchmark.DisplayInfo.includes('OutlierMode=DontRemove') &&
        benchmark.DisplayInfo.includes('PowerPlanMode=00000000-0000-0000-0000-000000000000'));
    const setup = read(`${relative}\\states\\contract-${label}.json`);
    equal([setup.Case, setup.variant, setup.processId], [label, 'original', r.processId]); equal(setup.owner, r.owner); equal(setup.harness, r.harness);
    contract(setup.contract); equal(setup.settings, r.settings);
    for (const name of [`settings-before-${label}`, `settings-after-${label}`])
    {
        equal(read(`${relative}\\states\\${name}.json`), r.settings); settingsRecords++;
    }
    const block = blocks.find(value => value.startsWith(benchmark.DisplayInfo)); assert(block);
    const markers = [...block.matchAll(/^AUTOPERF_F115_SETUP (\{[^\r\n]+\})/gm)]; equal(markers.length, 1); equal(JSON.parse(markers[0][1]), setup);
    const raw = [...block.matchAll(/^Workload(Warmup|Actual|Result)\s+(\d+):\s+(\d+) op,\s+([\d.]+) ns/gm)]
        .map(match => ({ stage: match[1], index: Number(match[2]), operations: Number(match[3]), nanoseconds: Number(match[4]) }));
    const actual = raw.filter(row => row.stage === 'Actual'), result = raw.filter(row => row.stage === 'Result');
    equal([raw.filter(row => row.stage === 'Warmup').length, actual.length, result.length], [3, 8, 8]);
    const overhead = [...block.matchAll(/^OverheadActual\s+(\d+):\s+(\d+) op,\s+([\d.]+) ns/gm)]
        .map(match => ({ index: Number(match[1]), operations: Number(match[2]), nanoseconds: Number(match[3]) }));
    assert(overhead.every(row => row.operations === actual[0].operations && row.nanoseconds >= 0)); unique(overhead.map(row => row.index));
    const overheadMedian = overhead.length ? percentile(overhead.map(row => row.nanoseconds).sort((a, b) => a - b), 50) : 0;
    equal(actual.map(({ index, operations, nanoseconds }) => ({ index, operations, nanoseconds: Math.max(0, nanoseconds - overheadMedian) })),
        result.map(({ index, operations, nanoseconds }) => ({ index, operations, nanoseconds })));
    equal(benchmark.Measurements, result.map(row => ({ IterationMode: 'Workload', IterationStage: 'Result', LaunchIndex: 1,
        IterationIndex: row.index, Operations: row.operations, Nanoseconds: row.nanoseconds })));
    const samples = result.map(row => row.nanoseconds / row.operations), sorted = [...samples].sort((a, b) => a - b);
    const mean = samples.reduce((a, b) => a + b, 0) / 8, variance = samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / 7, deviation = Math.sqrt(variance);
    const stats = benchmark.Statistics; equal([stats.N, stats.OriginalValues], [8, samples]);
    for (const [key, value] of Object.entries({ Mean: mean, Min: sorted[0], Max: sorted[7], Variance: variance, StandardDeviation: deviation,
        StandardError: deviation / Math.sqrt(8), Median: percentile(sorted, 50), Q1: percentile(sorted, 25), Q3: percentile(sorted, 75) })) near(stats[key], value, label + '/' + key);
    for (const [key, value] of Object.entries(stats.Percentiles)) near(value, percentile(sorted, Number(key.slice(1))));
    near(stats.ConfidenceInterval.Lower, mean - stats.ConfidenceInterval.Margin); near(stats.ConfidenceInterval.Upper, mean + stats.ConfidenceInterval.Margin);
    const gc = [...block.matchAll(/^GC:\s+(\d+) (\d+) (\d+) (\d+) (\d+)/gm)]; equal(gc.length, 1);
    const [gen0, gen1, gen2, allocated, operations] = gc[0].slice(1).map(Number);
    equal([benchmark.Memory.Gen0Collections, benchmark.Memory.Gen1Collections, benchmark.Memory.Gen2Collections,
        benchmark.Memory.TotalOperations, benchmark.Memory.BytesAllocatedPerOperation], [gen0, gen1, gen2, operations, roundEven(allocated / operations)]);
    if (label in directBytes) equal(benchmark.Memory.BytesAllocatedPerOperation, directBytes[label]);
    outcomes.push({ label, mode: fixture.cases.find(row => row.Label === label).mode, meanNs: mean, medianNs: stats.Median,
        cvPercent: 100 * deviation / mean, bytesPerOperation: benchmark.Memory.BytesAllocatedPerOperation, rawOverheadMedianNs: overheadMedian });
    warmups += 3; retained += 8; overheads += overhead.length; setups++;
}
equal([contracts, calipers, warmups, retained, setups, settingsRecords], [56, 140, 84, 224, 28, 56]);
const result = {
    candidate: 'F115', disposition: 'rejected-local-boxing-removal', sourceChanged: false, sourceComparisons: 0, unusedSourceComparisons: 3,
    actualOriginalPressureProfiles: 1, preprofileCliParserFailures: 1, actualBenchmarkOutcomes: 28,
    actualRetainedResultSamples: retained, actualWorkloadWarmups: warmups, actualRetainedOverheadSamples: overheads,
    actualHashPidLinkedSetups: setups, actualSettingsBeforeAfterRecords: settingsRecords,
    actualCapturedPerCaseContracts: contracts, fixtureCases: 28, actualResourceCalipers: calipers, typedContractDiagnosticCalipers: 10,
    standalonePublicObjectBoundaryProbeRecords: 4, actualTestRowExecutions: 81, discoveredTestDefinitions: 61,
    sourceMemberDataExpansions: 7, actualPdbDocumentChecks: 15, sourceIdentities: 14, copiedApplicationFiles: 152, declaredRuntimeAssets: 70,
    genericToObjectIntBytesPerOperation: 24, nativeTypedIntDiagnosticBytesPerOperation: 0,
    maximumCvPercent: Math.max(...outcomes.map(row => row.cvPercent)), observedSettings: r.settings,
    performancePrJustified: false, shippedApiOrDefaultChanged: false, omittedDllPdbRuntimeRehashedByPublicAudit: false,
    pdbDocumentChecksAreNotPeBindingOrMethodCoverage: true, confidenceCriticalValuesIndependentlyComputed: false,
    qualification: 'Actual original helper boxing pressure is measured,not a before/after gain. Current helper/adapter/visitor/serializer path is internal and object-valued. A generic read returning object still24B;native int-return0B changes the result/escape contract. Legal divergent IList/IList<int> public Test observes1731 not731;boxed mutable-struct mutations stay isolated. No compatible local candidate measured,no universal generic-redesign/cache impossibility claim,no HTTP/production-frequency/application gain. Every failed preprofile/auditor attempt and original uncertainty retained.',
    outcomes
};
const markdown = [
    '# F115: actual original list-read and JSON Patch pressure', '',
    '**No before/after comparison or performance improvement is claimed.** All rows are the unchanged owner. Native typed-return diagnostics are a different contract,not a zero-allocation replacement.', '',
    '| Case | Owning mode | Mean ns | Median ns | CV | Allocated B/op |',
    '| --- | --- | ---: | ---: | ---: | ---: |',
    ...outcomes.map(row => `| ${row.label} | ${row.mode} | ${row.meanNs.toFixed(3)} | ${row.medianNs.toFixed(3)} | ${row.cvPercent.toFixed(2)}% | ${row.bytesPerOperation} |`),
    '', `Raw retained:${retained};warmups:${warmups};actual overhead samples:${overheads};source comparisons:0. All shared-machine variability retained.`, ''
].join('\n');
if (mode === '--verify')
{
    equal(jsonAt(local('measurement-audit.json')), result);
    equal(textAt(local('original-outcomes.md')), markdown);
}
else
{
    fs.writeFileSync(local('measurement-audit.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    fs.writeFileSync(local('original-outcomes.md'), markdown, { flag: 'wx' });
}
console.log(`F115:${outcomes.length} original outcomes/${retained} retained/${warmups} warmups/${overheads} overheads/56 contracts/140+10 calipers/81 exact test rows/15 PDB documents;zero source comparisons,required object boxing not a demonstrated gain.`);
