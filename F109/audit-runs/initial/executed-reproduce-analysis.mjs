import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const [root, mode] = process.argv.slice(2);
assert(root && path.isAbsolute(root) && (!mode || mode === '--verify'));
const local = relative => path.join(root, ...relative.split(/[\\/]/));
const textAt = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const jsonAt = file => JSON.parse(textAt(file));
const digest = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const copies = fs.existsSync(local('authoritative-copy-manifest.json')) ? jsonAt(local('authoritative-copy-manifest.json')) : null;
const mappings = new Map((copies ?? []).filter(row => row.kind.startsWith('run'))
    .map(row => [row.original.replaceAll('/', '\\'), row]));
function file(relative)
{
    if (!copies) return local(relative);
    const row = mappings.get(relative.replaceAll('/', '\\'));
    assert(row, 'Missing exact authoritative artifact:' + relative);

    return local(row.destination);
}
const text = relative => textAt(file(relative));
const read = relative => jsonAt(file(relative));
const hash = relative => digest(fs.readFileSync(file(relative)));
const equal = (a, b, label) => assert.deepEqual(a, b, label);
const near = (a, b, label) => assert(Number.isFinite(a) && Number.isFinite(b) &&
    Math.abs(a - b) <= Math.max(1e-5, Math.abs(b) * 1e-12), label);
const unique = values => assert.equal(new Set(values).size, values.length);
const array = value => Array.isArray(value) ? value : [value];
const percentile = (sorted, p) =>
{
    const rank = (sorted.length - 1) * p / 100;
    const lower = Math.floor(rank), upper = Math.ceil(rank);

    return sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);
};
const roundEven = value => value - Math.floor(value) === 0.5
    ? Math.floor(value) + Math.floor(value) % 2 : Math.round(value);
const budget = read('measurement-budget.json');
equal([budget.maximumSourceComparisons, budget.startedSourceComparisons, budget.completedSourceComparisons,
    budget.originalProfilesCompleted, budget.candidateProfilesCompleted, budget.closed, budget.selectedVariant],
[3, 3, 3, 3, 3, true, 'candidate2']);
const final = read('final-evaluation.json');
equal([final.disposition, final.selectedVariant, final.sourceComparisons, final.comparisonBudgetClosed],
    ['validated', 'candidate2', 3, true]);
const sources = read('producer-source-copies.json');
assert.equal(sources.length, 21);
unique(sources.map(row => row.path));
for (const row of sources)
{
    const bytes = fs.readFileSync(file(row.rawSnapshot));
    equal([digest(bytes), bytes.length, row.equalityVerified], [row.rawSha256, row.rawBytes, true]);
    const canonical = fs.readFileSync(file(row.canonicalSnapshot));
    equal([digest(canonical), canonical.length, hash(row.baselineSnapshot)],
        [row.canonicalSha256, row.canonicalBytes, row.baselineSha256]);
    equal(canonical, fs.readFileSync(file(row.baselineSnapshot)));
    equal(Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n')), canonical);
    const blob = crypto.createHash('sha1').update(Buffer.from(`blob ${canonical.length}\0`)).update(canonical).digest('hex');
    equal([row.currentDefaultGitBlob, row.baselineGitBlob, row.workingGitBlob], [blob, blob, blob]);
}
const manifests = new Map(), closures = new Map();
for (const variant of ['original', 'candidate1', 'candidate2'])
{
    const manifest = read(`${variant}-manifest.json`), closure = read(`execution-closure-${variant}.json`);
    manifests.set(variant, manifest); closures.set(variant, closure);
    equal([manifest.candidate, manifest.variant, manifest.baselineSourceRevision, manifest.profileCount],
        ['F109', variant, '37e809ead5824bc753a1c3d56f11615bdb1296c5', 33]);
    equal([closure.copiedFiles, closure.files.length, closure.declaredRuntimeAssets, closure.runtimeAssets.length],
        [178, 178, 83, 83]);
    unique(closure.files.map(row => row.file));
    for (const [name, field] of [
        ['AutoPerf.Benchmarks.dll', 'harnessSha256'], ['AutoPerf.Benchmarks.pdb', 'harnessPdbSha256'],
        ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtimeConfigurationSha256'],
        ['AutoPerf.Benchmarks.deps.json', 'dependencyConfigurationSha256']
    ]) equal(closure.files.find(row => row.file === name)?.sha256, manifest[field]);
    for (const owner of manifest.actualOwners) equal(closure.files.find(row => row.file === owner.assembly + '.dll')?.sha256, owner.sha256);
    for (const asset of closure.runtimeAssets) equal(asset.sha256, closure.files.find(row => row.file === asset.copied)?.sha256);
    if (variant !== 'original')
    {
        equal(manifest.harnessSha256, manifests.get('original').harnessSha256);
        equal(closure.files.filter(row => row.sha256 !== closures.get('original').files.find(old => old.file === row.file)?.sha256)
            .map(row => row.file).sort(), ['Microsoft.AspNetCore.Identity.dll', 'Microsoft.AspNetCore.Identity.pdb']);
        equal(hash(manifest.sourceCopy), manifest.sourceSha256);
    }
}
const original = manifests.get('original');
for (const row of original.harnessSources) equal(hash('source-original\\harness\\' + row.file), row.sha256);
for (const name of ['AutoPerf.Benchmarks.runtimeconfig.json', 'AutoPerf.Benchmarks.deps.json'])
{
    const field = name.includes('runtimeconfig') ? 'runtimeConfigurationSha256' : 'dependencyConfigurationSha256';
    for (const manifest of manifests.values()) equal(hash('execution-image-metadata\\original\\' + name), manifest[field]);
}
const config = read('execution-image-metadata\\original\\AutoPerf.Benchmarks.runtimeconfig.json').runtimeOptions;
equal([config.tfm, config.rollForward, config.framework.name, config.framework.version,
    config.configProperties['System.GC.Server'], config.configProperties['System.GC.Concurrent']],
['net12.0', 'Disable', 'Microsoft.NETCore.App', '12.0.0-alpha.1.26562.105', true, true]);
const provenance = read('synthetic-fixture\\provenance.json');
equal([provenance.caseCount, provenance.syntheticOnly, provenance.actualPublicManagerGenerateUsed,
    provenance.actualPublicDataProtectionUsed, provenance.normalGeneratedLifespanDays, provenance.privateKeyBytesMustNotBePublished],
[33, true, true, true, 1, true]);
const labels = provenance.inputs.map(row => row.label);
unique(labels); assert.equal(labels.length, 33);
const inputs = new Map();
for (const row of provenance.inputs)
{
    const relative = `synthetic-fixture\\case-inputs\\${row.label}.json`;
    const bytes = fs.readFileSync(file(relative)), input = read(relative);
    equal([digest(bytes), bytes.length, input.Label, input.Token?.length ?? null],
        [row.sha256, row.bytes, row.label, row.tokenCharacters]);
    if (input.MalformedBase64) assert(!/[ \t\r\n]/.test(input.Token), 'Timed malformed inputs have no bypassed ASCII whitespace.');
    inputs.set(row.label, input);
}
const equivalence = read('bcl-compatibility\\actual-decoder-equivalence.json');
equal([equivalence.checkedCases, equivalence.accepted, equivalence.rejected, equivalence.mismatches.length,
    equivalence.nullSpanPredicateAccepted, equivalence.actualNullDecoderException, equivalence.actualNullDecoderParameter],
[673963, 1835, 672128, 0, true, 'System.ArgumentNullException', 's']);
assert.equal(equivalence.accepted + equivalence.rejected, equivalence.checkedCases);
const referenceRuntime = read('verification\\frozen-original\\states\\runtime.json');
function runtime(relative, variant)
{
    const value = read(relative + '\\states\\runtime.json'), manifest = manifests.get(variant);
    equal([value.variant, value.harnessSha256, value.ownerSha256, value.architecture, value.serverGc, value.configuredConcurrentGc],
        [variant, original.harnessSha256, manifest.actualOwners[0].sha256, 'X64', true, true]);
    for (const field of ['runtime', 'corelibInformationalVersion', 'corelibSha256', 'corelibMvid',
        'userManagerSha256', 'dataProtectionSha256', 'dataProtectionExtensionsSha256', 'profiles', 'fixture'])
        equal(value[field], referenceRuntime[field]);
    equal(value.corelibSha256, equivalence.corelibSha256);
    equal(value.fixture.provenanceSha256, hash('synthetic-fixture\\provenance.json'));
    assert(value.processId > 0);

    return value;
}
const events = [
    ['InvalidExpirationTime', 'ValidateAsync failed: the expiration time is invalid.'],
    ['UserIdsNotEquals', 'ValidateAsync failed: did not find expected UserId.'],
    ['PurposeNotEquals', "ValidateAsync failed: did not find expected purpose. '{ActualPurpose}' does not match the expected purpose '{ExpectedPurpose}'."],
    ['UnexpectedEndOfInput', 'ValidateAsync failed: unexpected end of input.'],
    ['SecurityStampNotEquals', 'ValidateAsync failed: did not find expected security stamp.'],
    ['SecurityStampIsNotEmpty', 'ValidateAsync failed: the expected stamp is not empty.'],
    ['UnhandledException', 'ValidateAsync failed: unhandled exception was thrown.']
];
let inputProofs = 0, contractPasses = 0;
function contract(relative, value, inputReceipt, variant)
{
    const input = inputs.get(value.Label);
    assert(input); equal(value.actualProtectorType, provenance.actualProtectorType);
    equal([value.publicProviderName, value.completeRunsCheckedOutsideTiming, value.noFirstChanceListenerOrLogFormattingInsideBenchmark],
        ['F109', 2, true]);
    const expectedInput = provenance.inputs.find(row => row.label === value.Label);
    equal([inputReceipt.sha256, inputReceipt.bytes, inputReceipt.label], [expectedInput.sha256, expectedInput.bytes, value.Label]);
    equal(hash(`${relative}\\inputs\\${value.Label}.json`), expectedInput.sha256); inputProofs++;
    for (const pass of ['configured', 'enabled'])
    {
        const observed = value[pass].observation;
        equal(value[pass].allExactContractsPassed, true);
        equal(read(`${relative}\\states\\observed-${value.Label}-${pass}.json`), observed);
        const enabled = pass === 'enabled' || input.LogEnabled;
        const formats = input.ReaderFormatExceptions + (input.MalformedBase64 && variant === 'original' ? 1 : 0);
        equal([observed.result, observed.expectedResult, observed.enabled, observed.actualIdCalls, observed.actualStampCalls,
            observed.actualUnprotectCalls, observed.formatExceptions, observed.expectedFormatExceptions],
        [input.ExpectedResult, input.ExpectedResult, enabled, input.IdCalls, input.StampCalls, input.UnprotectCalls, formats, formats]);
        equal(observed.firstChanceExceptions.filter(row => row.type === 'System.FormatException').length, formats);
        const provider = [];
        if (enabled && input.ProviderEvent !== null)
        {
            const [name, template] = events[input.ProviderEvent];
            const fields = [];
            let message = template;
            if (input.ProviderEvent === 2)
            {
                fields.push({ Key: 'ActualPurpose', Value: input.Purpose }, { Key: 'ExpectedPurpose', Value: inputs.get('ValidSmall').Purpose });
                message = `ValidateAsync failed: did not find expected purpose. '${input.Purpose}' does not match the expected purpose '${inputs.get('ValidSmall').Purpose}'.`;
            }
            fields.push({ Key: '{OriginalFormat}', Value: template });
            provider.push({ Level: 1, Id: input.ProviderEvent, Name: name, Message: message, Fields: fields, ExceptionType: null });
        }
        equal(observed.providerLogs, provider);
        const manager = [];
        if (enabled && !input.ExpectedResult)
        {
            const template = 'VerifyUserTokenAsync() failed with purpose: {purpose} for user.';
            manager.push({ Level: 1, Id: 9, Name: 'VerifyUserTokenFailed',
                Message: `VerifyUserTokenAsync() failed with purpose: ${input.Purpose} for user.`,
                Fields: [{ Key: 'purpose', Value: input.Purpose }, { Key: '{OriginalFormat}', Value: template }], ExceptionType: null });
        }
        equal(observed.managerLogs, manager); contractPasses++;
    }
}
const probes = ['development-original', 'frozen-original', 'frozen-candidate1', 'frozen-candidate2', 'post-original', 'post-candidate2'];
const calipers = [];
for (const label of probes)
{
    const variant = label.includes('candidate1') ? 'candidate1' : label.includes('candidate2') ? 'candidate2' : 'original';
    const relative = 'verification\\' + label, r = runtime(relative, variant);
    const report = read(relative + '\\states\\contract-resources.json');
    equal([read(relative + '\\execution.json').exitCode, report.contracts.length, report.resources.length,
        report.independentContractRuns, report.allCompleteOutcomesAndExactContractsPassed,
        report.harnessSha256, report.ownerSha256, report.processId],
    [0, 33, 165, 66, true, r.harnessSha256, r.ownerSha256, r.processId]);
    unique(report.contracts.map(row => row.contract.Label));
    for (const row of report.contracts) contract(relative, row.contract, row.input, variant);
    for (const resource of report.resources)
    {
        const input = inputs.get(resource.label); assert(input);
        equal([resource.operations, resource.trueCount, resource.expectedResult],
            [8192, input.ExpectedResult ? 8192 : 0, input.ExpectedResult]);
        equal(resource.allocatedAfter - resource.allocatedBefore, resource.allocatedBytes);
        near(resource.bytesPerOperation, resource.allocatedBytes / resource.operations);
        equal(resource.enclosingActualBdnGcHelperBytes - resource.allocatedBytes, resource.enclosingActualBdnGcHelperExtraBytes);
        equal(resource.enclosingActualBdnGcHelperBytesPerOperation, roundEven(resource.enclosingActualBdnGcHelperBytes / resource.operations));
        assert(resource.elapsedTimeSpanTicks > 0 && resource.processWideManagedBoundaryNotNativeOrPureDecoderAllocation);
        calipers.push({ probe: label, ...resource });
    }
    for (const label of labels) equal(report.resources.filter(row => row.label === label).map(row => row.sample), [0, 1, 2, 3, 4]);
}
const decodeXml = value => value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attributes = value => Object.fromEntries([...value.matchAll(/([\w:]+)="([^"]*)"/g)].map(match => [match[1], decodeXml(match[2])]));
let testRows = 0, testFailures = 0;
for (const [label, count, failures] of [
    ['original', 2, 0], ['original-red', 7, 4], ['candidate1-green', 7, 0],
    ['original-whitespace-controls', 3, 0], ['candidate2-green', 10, 0]
])
{
    const relative = 'tests\\' + label, audit = read(relative + '\\test-audit.json'), execution = read(relative + '\\execution.json');
    equal(execution.exitCode, failures ? 1 : 0);
    const trxName = label === 'original-whitespace-controls' ? 'original-whitespace-controls.trx' : `owning-${label}.trx`;
    const trx = text(relative + '\\' + trxName);
    if (audit.trxSha256) equal(hash(relative + '\\' + trxName), audit.trxSha256);
    const results = [...trx.matchAll(/<UnitTestResult\s+([^>]*?)(?:\/>|>)/g)].map(match => attributes(match[1]));
    const definitions = [...trx.matchAll(/<UnitTest\s+([^>]+)>([\s\S]*?)<\/UnitTest>/g)].map(match =>
        ({ ...attributes(match[1]), execution: attributes(match[2].match(/<Execution\s+([^>]+)\/>/)?.[1] ?? '') }));
    const entries = [...trx.matchAll(/<TestEntry\s+([^>]+)\/>/g)].map(match => attributes(match[1]));
    equal([results.length, definitions.length, entries.length, audit.rows.length, audit.skipped], [count, count, count, count, 0]);
    unique(results.map(row => row.testId)); unique(results.map(row => row.executionId));
    equal(results.filter(row => row.outcome === 'Failed').length, failures);
    for (const row of results)
    {
        const definition = definitions.find(item => item.id === row.testId);
        assert(definition && entries.some(item => item.testId === row.testId && item.executionId === row.executionId));
        equal([definition.name, definition.execution.id], [row.testName, row.executionId]);
        const recorded = audit.rows.find(item => item.testId === row.testId);
        for (const key of ['testName', 'testId', 'executionId', 'outcome', 'duration']) equal(recorded[key], row[key]);
        assert(/^\d+:\d+:\d+(?:\.\d+)?$/.test(row.duration) && Number(row.duration.replaceAll(':', '')) > 0);
        const malformed = row.testName.includes('.ValidateAsyncAvoidsFormatExceptionsForMalformedTokens(');
        equal(row.outcome, label === 'original-red' && malformed ? 'Failed' : 'Passed');
    }
    testRows += count; testFailures += failures;
}
let pdbAssociations = 0;
function proof(relative, source)
{
    const value = read(relative);
    equal([value.verified, value.source_sha256, value.actual_pdb_document_sha256], [true, hash(source), hash(source)]);
    pdbAssociations++;
}
function historicalSource(argument)
{
    const marker = '\\autoperf-runs\\F109\\', index = argument.indexOf(marker);
    assert(index >= 0);

    return argument.slice(index + marker.length);
}
for (const command of array(read('pdb-original-commands.json')))
{
    equal(command.exitCode, 0);
    const source = historicalSource(command.arguments.at(-1)), name = path.win32.basename(source, '.cs');
    const output = command.kind === 'reused-evidence-tool' ? 'evidence-tool-source-pdb.json'
        : command.kind === 'harness' ? `harness-${name}-pdb-original.json`
        : command.kind === 'selected-owning-source' ? `owner-${name}-pdb-original.json`
        : `tests\\original-red\\${name}-source-pdb.json`;
    proof(output, source);
}
for (const [variant, outputs] of [
    ['candidate1', ['owner-DataProtectorTokenProvider-pdb-candidate1.json',
        'tests\\candidate1-green\\DataProtectorTokenProviderTest-source-pdb.json', 'tests\\candidate1-green\\UserManagerTest-source-pdb.json']],
    ['candidate2', ['candidate2-owner-source-pdb.json', 'candidate2-new-test-source-pdb.json', 'candidate2-existing-test-source-pdb.json']]
])
{
    const commands = array(read(`pdb-${variant}-commands.json`)); assert.equal(commands.length, 3);
    commands.forEach((command, i) => { equal(command.exitCode, 0); proof(outputs[i], historicalSource(command.arguments.at(-1))); });
}
const extraProof = read('tests\\original-whitespace-controls\\source-pdb-command.json');
equal(extraProof.exitCode, 0);
proof('tests\\original-whitespace-controls\\DataProtectorTokenProviderTest-source-pdb.json', historicalSource(extraProof.arguments.at(-1)));
const outcomes = [];
let warmups = 0, resultSamples = 0, overheadSamples = 0, setups = 0;
for (const [comparison, variant] of [[1, 'original'], [1, 'candidate1'], [2, 'original'], [2, 'candidate2'], [3, 'candidate2'], [3, 'original']])
{
    const relative = `measurements\\comparison${comparison}\\${variant}`, r = runtime(relative, variant);
    const execution = read(relative + '\\execution.json');
    equal([execution.exitCode, execution.expectedCases, execution.expectedRetainedResultsPerCase, execution.sdk],
        [0, 33, 8, '12.0.100-alpha.1.26557.102']);
    for (const [flag, expected] of [['--warmupCount', '3'], ['--iterationCount', '8'], ['--iterationTime', '100'], ['--outliers', 'DontRemove']])
        equal(execution.arguments[execution.arguments.indexOf(flag) + 1], expected);
    assert(execution.arguments.includes('--inProcess') && Date.parse(execution.completedAt) > Date.parse(execution.startedAt));
    const reportName = copies
        ? [...mappings.keys()].filter(name => name.startsWith(relative + '\\results\\') && /-report-full.*\.json$/.test(name))
        : fs.readdirSync(local(relative + '\\results')).filter(name => /-report-full.*\.json$/.test(name)).map(name => relative + '\\results\\' + name);
    assert.equal(reportName.length, 1);
    const report = read(reportName[0]), console = text(relative + '\\console.log');
    equal([report.Benchmarks.length, report.HostEnvironmentInfo.BenchmarkDotNetVersion], [33, '0.13.0']);
    const blocks = console.split(/^\/\/ Benchmark: /m).slice(1); assert.equal(blocks.length, 33);
    unique(report.Benchmarks.map(row => row.Parameters));
    for (const label of labels)
    {
        const benchmark = report.Benchmarks.find(row => row.Parameters === 'Case=' + label); assert(benchmark);
        equal(benchmark.Method, 'VerifyToken');
        const setup = read(`${relative}\\states\\setup-${label}.json`);
        equal([setup.label, setup.variant, setup.ownerSha256, setup.harnessSha256, setup.processId, setup.completeRunsCheckedOutsideTiming],
            [label, variant, r.ownerSha256, r.harnessSha256, r.processId, 2]);
        contract(relative, setup.contract, setup.input, variant);
        const block = blocks.find(value => value.startsWith(benchmark.DisplayInfo)); assert(block);
        const markers = [...block.matchAll(/^AUTOPERF_F109_SETUP (\{[^\r\n]+\})/gm)]; assert.equal(markers.length, 1);
        equal(JSON.parse(markers[0][1]), setup);
        const raw = [...block.matchAll(/^Workload(Warmup|Actual|Result)\s+(\d+):\s+(\d+) op,\s+([\d.]+) ns/gm)]
            .map(match => ({ stage: match[1], index: Number(match[2]), operations: Number(match[3]), nanoseconds: Number(match[4]) }));
        const actual = raw.filter(row => row.stage === 'Actual'), result = raw.filter(row => row.stage === 'Result');
        equal([raw.filter(row => row.stage === 'Warmup').length, actual.length, result.length], [3, 8, 8]);
        const overhead = [...block.matchAll(/^OverheadActual\s+(\d+):\s+(\d+) op,\s+([\d.]+) ns/gm)]
            .map(match => ({ index: Number(match[1]), operations: Number(match[2]), nanoseconds: Number(match[3]) }));
        assert(overhead.every(row => row.operations === actual[0].operations && row.nanoseconds >= 0));
        unique(overhead.map(row => row.index));
        const overheadMedian = overhead.length ? percentile(overhead.map(row => row.nanoseconds).sort((a, b) => a - b), 50) : 0;
        equal(actual.map(({ index, operations, nanoseconds }) => ({ index, operations, nanoseconds: Math.max(0, nanoseconds - overheadMedian) })),
            result.map(({ index, operations, nanoseconds }) => ({ index, operations, nanoseconds })));
        equal(benchmark.Measurements, result.map(row => ({ IterationMode: 'Workload', IterationStage: 'Result', LaunchIndex: 1,
            IterationIndex: row.index, Operations: row.operations, Nanoseconds: row.nanoseconds })));
        const samples = result.map(row => row.nanoseconds / row.operations), sorted = [...samples].sort((a, b) => a - b);
        const mean = samples.reduce((a, b) => a + b, 0) / 8;
        const variance = samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / 7, deviation = Math.sqrt(variance);
        const stats = benchmark.Statistics;
        equal([stats.N, stats.OriginalValues], [8, samples]);
        for (const [key, value] of Object.entries({ Mean: mean, Min: sorted[0], Max: sorted[7], Variance: variance,
            StandardDeviation: deviation, StandardError: deviation / Math.sqrt(8), Median: percentile(sorted, 50),
            Q1: percentile(sorted, 25), Q3: percentile(sorted, 75) })) near(stats[key], value, label + '/' + key);
        for (const [key, value] of Object.entries(stats.Percentiles)) near(value, percentile(sorted, Number(key.slice(1))));
        near(stats.ConfidenceInterval.Lower, mean - stats.ConfidenceInterval.Margin);
        near(stats.ConfidenceInterval.Upper, mean + stats.ConfidenceInterval.Margin);
        const gc = [...block.matchAll(/^GC:\s+(\d+) (\d+) (\d+) (\d+) (\d+)/gm)]; assert.equal(gc.length, 1);
        const [gen0, gen1, gen2, allocated, operations] = gc[0].slice(1).map(Number);
        equal([benchmark.Memory.Gen0Collections, benchmark.Memory.Gen1Collections, benchmark.Memory.Gen2Collections,
            benchmark.Memory.TotalOperations, benchmark.Memory.BytesAllocatedPerOperation],
        [gen0, gen1, gen2, operations, roundEven(allocated / operations)]);
        outcomes.push({ comparison, variant, label, meanNs: mean, medianNs: stats.Median, cvPercent: 100 * deviation / mean,
            bytesPerOperation: benchmark.Memory.BytesAllocatedPerOperation, rawOverheadMedianNs: overheadMedian });
        warmups += 3; resultSamples += 8; overheadSamples += overhead.length; setups++;
    }
}
const pairs = [];
for (const comparison of [1, 2, 3])
{
    for (const label of labels)
    {
        const a = outcomes.find(row => row.comparison === comparison && row.variant === 'original' && row.label === label);
        const b = outcomes.find(row => row.comparison === comparison && row.variant !== 'original' && row.label === label);
        pairs.push({ comparison, label, original: a, candidate: b, timeChangePercent: 100 * (b.meanNs / a.meanNs - 1),
            allocationChangeBytes: b.bytesPerOperation - a.bytesPerOperation, malformedNoAsciiWhitespace: inputs.get(label).MalformedBase64 });
    }
}
const selected = pairs.filter(row => row.comparison > 1), targeted = selected.filter(row => row.malformedNoAsciiWhitespace);
const audit = {
    candidate: 'F109', disposition: 'validated', selectedVariant: 'candidate2', sourceComparisons: 3, comparisonBudgetClosed: true,
    qualification: final.qualification, actualBenchmarkOutcomes: outcomes.length, actualRetainedResultSamples: resultSamples,
    actualWorkloadWarmups: warmups, actualRetainedOverheadSamples: overheadSamples, actualHashPidLinkedSetups: setups,
    actualInputProofs: inputProofs, actualCompleteContractPasses: contractPasses, actualResourceCalipers: calipers.length,
    actualTestRowExecutions: testRows, expectedOriginalRedFailures: testFailures, testSkips: 0,
    actualSelectedGreenRows: 10, scopedCurrentBaselineWorkingSourceIdentities: sources.length,
    actualSourcePdbAssociations: pdbAssociations, copiedApplicationFilesPerImage: 178, declaredRuntimeAssets: 83, frozenImages: 3,
    bclDiagnosticCases: equivalence.checkedCases, bclDiagnosticDifferences: 0,
    selectedMalformedMinimumReductionPercent: Math.min(...targeted.map(row => -row.timeChangePercent)),
    selectedMalformedMaximumReductionPercent: Math.max(...targeted.map(row => -row.timeChangePercent)),
    maximumCvPercent: Math.max(...outcomes.map(row => row.cvPercent)),
    confidenceCriticalValuesIndependentlyComputed: false, rawOmittedDllPdbRuntimeAndKeysRehashed: false,
    sourcePdbAssociationNotMethodCoverage: true, productionFrequencyOrWholeRequestSpeedupClaimed: false,
    outcomes, pairs, selectedControlCostsRetained: selected.filter(row => !row.malformedNoAsciiWhitespace)
};
const table = ['# F109 actual paired outcomes', '', 'All198 outcomes/eight retained results each;negative time change is lower time. No pooling across variants or promotion to application throughput. Candidate2 selected;comparison3 reversed pair order. All unchanged-path costs are retained.', '',
    '| Pair | Case | Original ns | Candidate ns | Time change | Original B | Candidate B |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
    ...pairs.map(row => `| ${row.comparison} | ${row.label} | ${row.original.meanNs.toFixed(3)} | ${row.candidate.meanNs.toFixed(3)} | ${row.timeChangePercent.toFixed(2)}% | ${row.original.bytesPerOperation} | ${row.candidate.bytesPerOperation} |`), ''].join('\n');
const encoded = JSON.stringify(audit, null, 2) + '\n';
if (mode === '--verify')
{
    equal(text('measurement-audit.json'), encoded); equal(text('paired-outcomes.md'), table);
}
else
{
    assert(!fs.existsSync(local('measurement-audit.json')), 'Retain completed arithmetic output.');
    fs.writeFileSync(local('measurement-audit.json'), encoded, { flag: 'wx' });
    fs.writeFileSync(local('paired-outcomes.md'), table, { flag: 'wx' });
}
console.log(`F109:${outcomes.length} outcomes/${resultSamples} results/${warmups} warmups/${overheadSamples} actual overheads/${setups} setups;${inputProofs} inputs/${contractPasses} complete contracts/${calipers.length} calipers/${testRows} test executions/${pdbAssociations} source-PDB associations verified;3/3 budget closed.`);
console.log(`Selected targeted lower time:${audit.selectedMalformedMinimumReductionPercent.toFixed(2)}..${audit.selectedMalformedMaximumReductionPercent.toFixed(2)}%;all control costs/limits retained.`);
