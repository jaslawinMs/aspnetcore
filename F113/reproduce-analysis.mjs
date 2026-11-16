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
    const row = mappings.get(relative.replaceAll('/', '\\'));
    assert(row, 'Missing exact authoritative artifact:' + relative);

    return local(row.destination);
}
const text = relative => textAt(file(relative));
const read = relative => jsonAt(file(relative));
const hash = relative => digest(fs.readFileSync(file(relative)));
const canonical = relative => text(relative).replace(/\r\n/g, '\n');
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
    unique(copies.filter(row => row.kind.startsWith('run')).map(row => row.original));
    for (const row of copies) equal([digest(fs.readFileSync(local(row.destination))), fs.statSync(local(row.destination)).size],
        [row.sha256, row.bytes], row.original);
}
const budget = read('measurement-budget.json'), comparisons = budget.completedSourceComparisons;
assert(comparisons >= 1 && comparisons <= 3);
equal([budget.maximumSourceComparisons, budget.startedSourceComparisons, budget.originalProfilesCompleted, budget.candidateProfilesCompleted,
    budget.closed, budget.selectedVariant, budget.completedProfiles.length, budget.unusedComparisons],
[3, comparisons, comparisons, comparisons, true, 'candidate1', 2 * comparisons, 3 - comparisons]);
const sources = read('producer-source-copies.json');
equal(sources.length, 16); unique(sources.map(row => row.path));
for (const row of sources)
{
    const bytes = fs.readFileSync(file(row.rawSnapshot)), clean = fs.readFileSync(file(row.canonicalSnapshot));
    equal([digest(bytes), bytes.length, row.equalityVerified], [row.rawSha256, row.rawBytes, true]);
    equal([digest(clean), clean.length, hash(row.baselineSnapshot)], [row.canonicalSha256, row.canonicalBytes, row.baselineSha256]);
    equal(clean, fs.readFileSync(file(row.baselineSnapshot)));
    equal(Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n')), clean);
    const blob = crypto.createHash('sha1').update(Buffer.from(`blob ${clean.length}\0`)).update(clean).digest('hex');
    equal([row.currentDefaultGitBlob, row.baselineGitBlob, row.workingGitBlob], [blob, blob, blob]);
}
const archived = 'development\\preprofile-settings';
const amendment = read('shared-settings-amendment.json');
equal([amendment.timingComparisonsStarted, amendment.allocationGoalsUnchanged, amendment.originalResourceGoalSha256],
    [0, true, hash('resource-goals.json')]);
const manifests = new Map(), closures = new Map();
for (const variant of ['original', 'candidate1'])
{
    const manifest = read(`${variant}-manifest.json`), closure = read(`execution-closure-${variant}.json`);
    manifests.set(variant, manifest); closures.set(variant, closure);
    equal([manifest.candidate, manifest.variant, manifest.baseline, closure.copiedFiles, closure.files.length,
        closure.declaredRuntimeAssets, closure.runtimeAssets.length, closure.onlyMicrosoftNetCoreFramework],
    ['F113', variant, '37e809ead5824bc753a1c3d56f11615bdb1296c5', 284, 284, 117, 117, true]);
    unique(closure.files.map(row => row.file));
    for (const [name, field] of [
        ['AutoPerf.Benchmarks.dll', 'harnessSha256'], ['AutoPerf.Benchmarks.pdb', 'harnessPdbSha256'],
        ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtimeConfigurationSha256'], ['AutoPerf.Benchmarks.deps.json', 'dependencyConfigurationSha256'],
        ['Microsoft.AspNetCore.Mvc.TagHelpers.dll', 'ownerSha256'], ['Microsoft.AspNetCore.Mvc.TagHelpers.pdb', 'ownerPdbSha256'],
        ['Microsoft.Extensions.Caching.Memory.dll', 'cacheSha256']
    ]) equal(closure.files.find(row => row.file === name)?.sha256, manifest[field]);
    for (const asset of closure.runtimeAssets) equal(asset.sha256, closure.files.find(row => row.file === asset.copied)?.sha256);
    for (const row of manifest.sourceFiles) equal([hash(`frozen-source\\${variant}\\${row.file}`), fs.statSync(file(`frozen-source\\${variant}\\${row.file}`)).size],
        [row.sha256, row.bytes]);
    for (const name of ['Program.cs', 'Cases.cs', 'Workload.cs', 'SettingsPreservingEmitToolchain.cs', 'AutoPerf.Benchmarks.csproj'])
        equal(hash(`frozen-source\\${variant}\\harness\\${name}`), hash(`harness\\${name}`));
    equal(hash(`${archived}\\frozen-source\\${variant}\\harness\\Workload.cs`), hash('harness\\Workload.cs'));
    equal(hash(`${archived}\\frozen-source\\${variant}\\harness\\Cases.cs`), hash('harness\\Cases.cs'));
    const prior = read(`${archived}\\${variant}-manifest.json`);
    equal([prior.ownerSha256, prior.ownerPdbSha256], [manifest.ownerSha256, manifest.ownerPdbSha256]);
    assert(prior.harnessSha256 !== manifest.harnessSha256, 'Preserve both actual preprofile and settings-preserving harness identities.');
    if (variant !== 'original')
    {
        equal(manifest.harnessSha256, manifests.get('original').harnessSha256);
        equal(closure.files.filter(row => row.sha256 !== closures.get('original').files.find(old => old.file === row.file)?.sha256)
            .map(row => row.file).sort(), ['Microsoft.AspNetCore.Mvc.TagHelpers.dll', 'Microsoft.AspNetCore.Mvc.TagHelpers.pdb']);
    }
}
const original = manifests.get('original');
for (const name of ['AutoPerf.Benchmarks.runtimeconfig.json', 'AutoPerf.Benchmarks.deps.json'])
{
    const field = name.includes('runtimeconfig') ? 'runtimeConfigurationSha256' : 'dependencyConfigurationSha256';
    for (const manifest of manifests.values()) equal(hash('binaries\\original\\' + name), manifest[field]);
}
const config = read('binaries\\original\\AutoPerf.Benchmarks.runtimeconfig.json').runtimeOptions;
equal([config.tfm, config.rollForward, config.framework.name, config.framework.version,
    config.configProperties['System.GC.Server'], config.configProperties['System.GC.Concurrent']],
['net12.0', 'Disable', 'Microsoft.NETCore.App', '12.0.0-alpha.1.26562.105', true, true]);
const ownerPath = 'src\\Mvc\\Mvc.TagHelpers\\src\\Cache\\DistributedCacheTagHelperService.cs';
const beforeOwner = canonical('frozen-source\\original\\' + ownerPath), afterOwner = canonical('frozen-source\\candidate1\\' + ownerPath);
const oldEncode = `        using (var buffer = new MemoryStream())
        {
            var keyLength = BitConverter.GetBytes(serializedKey.Length);

            buffer.Write(keyLength, 0, keyLength.Length);
            buffer.Write(serializedKey, 0, serializedKey.Length);
            buffer.Write(value, 0, value.Length);

            return buffer.ToArray();
        }`;
const newEncode = `        var keyLength = BitConverter.GetBytes(serializedKey.Length);
        var buffer = new byte[checked(keyLength.Length + serializedKey.Length + value.Length)];

        keyLength.CopyTo(buffer, 0);
        serializedKey.CopyTo(buffer, keyLength.Length);
        value.CopyTo(buffer, keyLength.Length + serializedKey.Length);

        return buffer;`;
assert(beforeOwner.includes(oldEncode));
equal(afterOwner, beforeOwner.replace(oldEncode, newEncode), 'Only exact private Encode may change.');
for (const row of original.sourceFiles.filter(row => row.file !== ownerPath))
    equal(hash(`frozen-source\\original\\${row.file}`), hash(`frozen-source\\candidate1\\${row.file}`));
const fixture = read('fixture\\manifest.json');
equal([fixture.candidate, fixture.actualCases, fixture.files.length, fixture.owner.sha256, fixture.harness.sha256],
    ['F113', 28, 28, original.ownerSha256, original.harnessSha256]);
const labels = fixture.files.map(row => row.Label); unique(labels);
for (const row of fixture.files)
{
    const inputName = `fixture\\inputs\\${row.Label}.json`, outputName = `fixture\\expected\\${row.Label}.bin`;
    equal(hash(inputName), row.inputSha256);
    equal([hash(outputName), fs.statSync(file(outputName)).size], [row.outputSha256, row.outputBytes]);
    equal([hash(`${archived}\\${inputName}`), hash(`${archived}\\${outputName}`)], [row.inputSha256, row.outputSha256]);
    const input = read(inputName), output = fs.readFileSync(file(outputName));
    const key = Buffer.from(input.keyUtf8, 'base64'), payload = Buffer.from(input.payloadUtf8, 'base64');
    equal([input.nativeLittleEndian, output.readInt32LE(0), output.length], [true, key.length, 4 + key.length + payload.length]);
    equal(output.subarray(4, 4 + key.length), key); equal(output.subarray(4 + key.length), payload);
    assert(key.length > input.key.length, 'Real non-ASCII key must exercise UTF8-byte rather than character count.');
    if (row.ExactOutputLength !== null) equal(row.outputBytes, row.ExactOutputLength);
}
const referenceRuntime = read('characterization\\original-settings\\states\\runtime.json');
function runtime(relative, variant)
{
    const value = read(relative + '\\states\\runtime.json'), manifest = manifests.get(variant);
    equal([value.candidate, value.variant, value.harness.sha256, value.owner.sha256, value.cache.sha256,
        value.architecture, value.serverGc, value.configuredConcurrentGc, value.fixtureManifestSha256],
    ['F113', variant, original.harnessSha256, manifest.ownerSha256, original.cacheSha256, 'X64', true, true, hash('fixture\\manifest.json')]);
    for (const key of ['runtime', 'processorCount', 'json', 'corelib', 'cases', 'settings']) equal(value[key], referenceRuntime[key]);
    equal(value.settings, { processPriority: 'Normal', threadPriority: 'Normal', affinity: 65535 });
    assert(value.processId > 0);

    return value;
}
let completeContracts = 0;
function contract(value, count = true)
{
    const input = fixture.files.find(row => row.Label === value.Label); assert(input);
    equal([value.Mode, value.inputSha256, value.outputSha256, value.outputBytes], [input.Mode, input.inputSha256, input.outputSha256, input.outputBytes]);
    for (const key of ['exactNativePrefixKeyPayload', 'independentlyOwnedAcrossInputMutation', 'retainedAcrossLargerCall',
        'realRegisteredPipelineStoreAndNextHitVerified', 'actualPreparedTimedModeVerified', 'preparedOperationsSynchronouslyComplete', 'noPrivateCallbackInjection'])
        equal(value[key], true, value.Label + '/' + key);
    for (const key of ['privateEncodeBoundOnceOutsideTimingByHarnessOnly', 'missIncludesExplicitCacheRemovalAndNewOutput',
        'childContentPreparedOutsideTiming', 'fixtureEnvelopeNormalizesControlsRatherThanClaimingTheirActualResultIsEnvelope',
        'noRazorHttpExternalStoreOrProductionFrequencyClaim']) equal(value.Binding[key], true);
    for (const [key, prefix] of [['service', 'DistributedCacheTagHelperService'], ['formatter', 'DistributedCacheTagHelperFormatter'], ['storage', 'DistributedCacheTagHelperStorage']])
        assert(value.Binding[key].startsWith('Microsoft.AspNetCore.Mvc.TagHelpers.Cache.' + prefix + ','));
    assert(value.Binding.cache.startsWith('Microsoft.Extensions.Caching.Distributed.MemoryDistributedCache,'));
    equal(value, read(`characterization\\original-settings\\states\\contract-${value.Label}.json`));
    if (count) completeContracts++;
}
const calipers = [];
let preprofileContracts = 0, preprofileCalipers = 0;
for (const variant of ['original', 'candidate1'])
{
    for (const [relative, counted] of [[`characterization\\${variant}-settings`, true], [`${archived}\\characterization\\${variant}`, false]])
    {
        equal(read(relative + '\\execution.json').exitCode, 0);
        if (counted) runtime(relative, variant);
        for (const label of labels)
        {
            contract(read(`${relative}\\states\\contract-${label}.json`), counted);
            if (!counted) preprofileContracts++;
            const value = read(`${relative}\\states\\caliper-${label}.json`);
            equal([value.Label, value.outputBytes, value.samples.length], [label, fixture.files.find(row => row.Label === label).outputBytes, 5]);
            equal(value.samples.map(row => row.sample), [0, 1, 2, 3, 4]);
            for (const sample of value.samples)
            {
                equal(sample.operations, value.outputBytes >= 65536 ? 256 : value.outputBytes >= 4096 ? 1024 : 4096);
                assert(sample.thread > 0 && sample.allocatedBytes > 0 && sample.processAllocatedBytes >= 0);
                near(sample.bytesPerOperation, sample.allocatedBytes / sample.operations);
                near(sample.processBytesPerOperation, sample.processAllocatedBytes / sample.operations);
                assert(sample.diagnosticElapsedMilliseconds > 0);
                if (counted) calipers.push({ variant, label, ...sample }); else preprofileCalipers++;
            }
        }
    }
}
const goals = read('resource-goals.json'), acceptance = read('acceptance.json');
equal(goals.goals.map(row => row.Label), acceptance.measurement.preselectedTargets);
equal(goals.exactOriginalOwnerSourceSha256, hash('producer-source\\' + ownerPath));
assert(Date.parse(goals.definedAt) < Date.parse(read(`${archived}\\candidate1-manifest.json`).capturedAt));
for (const variant of ['original', 'candidate1'])
{
    const report = read(`resource-check-${variant}-settings.json`);
    equal([report.resourceGoalsSha256, report.passed, report.failed, report.outcomes.length],
        [hash('resource-goals.json'), variant === 'original' ? 0 : 7, variant === 'original' ? 7 : 0, 7]);
    for (const goal of goals.goals)
    {
        const source = `${archived}\\characterization\\original\\states\\caliper-${goal.Label}.json`;
        equal(goal.originalCaliperSha256, hash(source));
        equal(goal.originalMinimumBytesPerOperation, Math.min(...read(source).samples.map(row => row.bytesPerOperation)));
        equal(goal.reductionRequiredPercent, acceptance.measurement.resourceReductionRequiredPercent[goal.Label]);
        equal(goal.maximumCandidateBytesPerOperation, goal.originalMinimumBytesPerOperation * (1 - goal.reductionRequiredPercent / 100));
        const row = report.outcomes.find(item => item.Label === goal.Label); assert(row);
        equal(row.actualCaliperSha256, hash(`characterization\\${variant}-settings\\states\\caliper-${goal.Label}.json`));
        const samples = calipers.filter(item => item.variant === variant && item.label === goal.Label).map(item =>
            ({ sample: item.sample, bytesPerOperation: item.bytesPerOperation, passed: item.bytesPerOperation <= goal.maximumCandidateBytesPerOperation }));
        equal(row.samples, samples); equal(row.passed, samples.every(item => item.passed));
    }
}
const decodeXml = value => value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attributes = value => Object.fromEntries([...value.matchAll(/([\w:]+)="([^"]*)"/g)].map(match => [match[1], decodeXml(match[2])]));
let testRows = 0;
const newTests = [
    ...[0, 32, 16384, 131072].map(length => `ProcessAsync_PreservesEncodedCacheBytesAndReadsCachedContent(contentLength: ${length})`),
    'ProcessAsync_PreservesStoredBytesAcrossFormatterMutationAndSubsequentCalls'
].map(name => 'Microsoft.AspNetCore.Mvc.TagHelpers.DistributedCacheTagHelperTest.' + name);
for (const [label, count, variant] of [['original', 14, 'original'], ['original-new-controls', 19, 'original'], ['candidate1', 19, 'candidate1'],
    ['original-final', 19, 'original'], ['candidate1-final', 19, 'candidate1']])
{
    const relative = 'tests\\' + label, audit = read(relative + '\\test-audit.json'), execution = read(relative + '\\execution.json');
    equal(execution.exitCode, 0);
    const trxName = relative + `\\owning-${label}.trx`, trx = text(trxName); equal(hash(trxName), audit.trxSha256);
    const results = [...trx.matchAll(/<UnitTestResult\s+([^>]*?)(?:\/>|>)/g)].map(match => attributes(match[1]));
    const definitions = [...trx.matchAll(/<UnitTest\s+([^>]+)>([\s\S]*?)<\/UnitTest>/g)].map(match =>
        ({ ...attributes(match[1]), execution: attributes(match[2].match(/<Execution\s+([^>]+)\/>/)?.[1] ?? '') }));
    const entries = [...trx.matchAll(/<TestEntry\s+([^>]+)\/>/g)].map(match => attributes(match[1]));
    equal([results.length, definitions.length, entries.length, audit.rows.length, audit.skipped, audit.failed], [count, count, count, count, 0, 0]);
    unique(results.map(row => row.testId)); unique(results.map(row => row.executionId));
    equal(results.map(row => row.testName).sort(), [...execution.existingSelectedFacts, ...(count === 19 ? newTests : [])].sort());
    equal(audit.capturedTestAndOwnerImage.find(row => row.file === 'Microsoft.AspNetCore.Mvc.TagHelpers.dll').sha256, manifests.get(variant).ownerSha256);
    for (const row of results)
    {
        const definition = definitions.find(item => item.id === row.testId);
        assert(definition && entries.some(item => item.testId === row.testId && item.executionId === row.executionId));
        equal([definition.name, definition.execution.id], [row.testName, row.executionId]);
        equal(audit.rows.find(item => item.testId === row.testId), { testName: row.testName, testId: row.testId, executionId: row.executionId, outcome: row.outcome, duration: row.duration });
        equal(row.outcome, 'Passed');
        assert(/^\d+:\d+:\d+(?:\.\d+)?$/.test(row.duration) && Number(row.duration.replaceAll(':', '')) > 0);
    }
    testRows += count;
}
let pdbDocuments = 0;
for (const variant of ['original', 'candidate1'])
{
    const records = read(`symbols\\${variant}\\commands.json`);
    equal(records.commands.length, 11);
    for (const command of records.commands)
    {
        equal(command.exitCode, 0);
        const argument = command.arguments.at(-1), marker = '\\autoperf-runs\\F113\\', index = argument.indexOf(marker);
        assert(index >= 0);
        const source = argument.slice(index + marker.length), proof = read(`symbols\\${variant}\\${path.win32.basename(source)}.json`);
        equal([proof.verified, proof.source_sha256, proof.actual_pdb_document_sha256], [true, hash(source), hash(source)]);
        pdbDocuments++;
    }
}
const outcomes = [];
let warmups = 0, retained = 0, overheads = 0, setups = 0, settingsRecords = 0;
for (let comparison = 1; comparison <= comparisons; comparison++)
{
    for (const variant of ['original', 'candidate1'])
    {
        const relative = `measurements\\comparison${comparison}\\${variant}`, r = runtime(relative, variant), execution = read(relative + '\\execution.json');
        const order = comparison % 2 ? 'original-first' : 'candidate-first';
        equal([execution.exitCode, execution.expectedCases, execution.expectedRetainedResultsPerCase, execution.sdk, execution.pairOrder,
            execution.harnessSha256, execution.ownerSha256, execution.cacheSha256],
        [0, 28, 8, '12.0.100-alpha.1.26557.102', order, original.harnessSha256, manifests.get(variant).ownerSha256, original.cacheSha256]);
        equal(execution.beforePower, execution.afterPower);
        for (const [flag, expected] of [['--warmupCount', '3'], ['--iterationCount', '8'], ['--iterationTime', '100'], ['--outliers', 'DontRemove']])
            equal(execution.arguments[execution.arguments.indexOf(flag) + 1], expected);
        assert(!execution.arguments.includes('--inProcess') && !execution.arguments.includes('--job') && Date.parse(execution.completedAt) > Date.parse(execution.startedAt));
        const reportNames = listing(relative + '\\results').filter(name => /-report-full.*\.json$/.test(name)); equal(reportNames.length, 1);
        const receipt = budget.completedProfiles.find(row => row.comparison === comparison && row.variant === variant); assert(receipt);
        equal(hash(reportNames[0]), receipt.reportSha256); equal(Date.parse(execution.startedAt), Date.parse(receipt.startedAt));
        const report = read(reportNames[0]), console = text(relative + '\\console.log');
        equal([report.Benchmarks.length, report.HostEnvironmentInfo.BenchmarkDotNetVersion], [28, '0.13.0']);
        const blocks = console.split(/^\/\/ Benchmark: /m).slice(1); equal(blocks.length, 28);
        unique(report.Benchmarks.map(row => row.FullName));
        for (const label of labels)
        {
            const benchmark = report.Benchmarks.find(row => row.FullName === `AutoPerf.DistributedEncodingBenchmark.EncodeOrProcess(Case: "${label}")`); assert(benchmark);
            assert(benchmark.DisplayInfo.includes('Toolchain=SettingsPreservingEmitToolchain') && benchmark.DisplayInfo.includes('OutlierMode=DontRemove') &&
                benchmark.DisplayInfo.includes('PowerPlanMode=00000000-0000-0000-0000-000000000000'));
            const setup = read(`${relative}\\states\\setup-${label}.json`);
            equal([setup.label, setup.variant, setup.owner.sha256, setup.harness.sha256, setup.processId], [label, variant, r.owner.sha256, r.harness.sha256, r.processId]);
            equal(setup.owner, r.owner); equal(setup.harness, r.harness); contract(setup.contract);
            for (const name of [`settings-before-${label}`, `settings-after-${label}`])
            {
                equal(read(`${relative}\\states\\${name}.json`), r.settings); settingsRecords++;
            }
            equal(setup.settings, r.settings);
            const block = blocks.find(value => value.startsWith(benchmark.DisplayInfo)); assert(block);
            const markers = [...block.matchAll(/^AUTOPERF_F113_SETUP (\{[^\r\n]+\})/gm)]; equal(markers.length, 1); equal(JSON.parse(markers[0][1]), setup);
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
            outcomes.push({ comparison, variant, label, meanNs: mean, medianNs: stats.Median, cvPercent: 100 * deviation / mean,
                bytesPerOperation: benchmark.Memory.BytesAllocatedPerOperation, rawOverheadMedianNs: overheadMedian });
            warmups += 3; retained += 8; overheads += overhead.length; setups++;
        }
    }
}
for (let index = 1; index < budget.completedProfiles.length; index++)
    assert(Date.parse(budget.completedProfiles[index].startedAt) > Date.parse(budget.completedProfiles[index - 1].completedAt));
equal(read('format-execution.json').exitCode, 0);
const pairs = Array.from({ length: comparisons }, (_, index) => index + 1).flatMap(comparison => labels.map(label =>
{
    const a = outcomes.find(row => row.comparison === comparison && row.variant === 'original' && row.label === label);
    const b = outcomes.find(row => row.comparison === comparison && row.variant === 'candidate1' && row.label === label);

    return { comparison, label, original: a, candidate: b, timeChangePercent: 100 * (b.meanNs / a.meanNs - 1),
        allocationChangePercent: 100 * (b.bytesPerOperation / a.bytesPerOperation - 1) };
}));
const targeted = pairs.filter(row => goals.goals.some(goal => goal.Label === row.label));
const publicMisses = pairs.filter(row => row.label === 'Miss16K' || row.label === 'Miss128K');
const controls = pairs.filter(row => row.label.startsWith('Hit') || row.label.startsWith('Formatter') || row.label === 'Disabled16K');
const audit = {
    candidate: 'F113', disposition: 'measured-exact-owned-buffer-component-draft', selectedVariant: 'candidate1',
    sourceComparisons: comparisons, distinctCandidateSourceShapes: 1, comparisonBudgetClosed: true, comparisonsIntentionallyUnused: 3 - comparisons,
    actualBenchmarkOutcomes: outcomes.length, actualRetainedResultSamples: retained, actualWorkloadWarmups: warmups,
    actualRetainedOverheadSamples: overheads, actualHashPidLinkedSetups: setups, actualSettingsBeforeAfterRecords: settingsRecords,
    actualCompleteContractPasses: completeContracts, actualResourceCalipers: calipers.length,
    preservedPreprofileContractPasses: preprofileContracts, preservedPreprofileResourceCalipers: preprofileCalipers,
    actualTestRowExecutions: testRows, testSkips: 0, selectedGreenTestRows: 19, expectedResourceOriginalRedRows: 7, selectedResourceGreenRows: 7,
    scopedCurrentBaselineWorkingSourceIdentities: sources.length, actualPdbDocumentChecks: pdbDocuments,
    copiedApplicationFilesPerImage: 284, declaredRuntimeAssets: 117, frozenMeasuredImages: 2,
    targetedMinimumTimeReductionPercent: Math.min(...targeted.map(row => -row.timeChangePercent)),
    targetedMaximumTimeReductionPercent: Math.max(...targeted.map(row => -row.timeChangePercent)),
    targetedMinimumAllocationReductionPercent: Math.min(...targeted.map(row => -row.allocationChangePercent)),
    targetedMaximumAllocationReductionPercent: Math.max(...targeted.map(row => -row.allocationChangePercent)),
    publicMissMinimumTimeReductionPercent: Math.min(...publicMisses.map(row => -row.timeChangePercent)),
    publicMissMaximumTimeReductionPercent: Math.max(...publicMisses.map(row => -row.timeChangePercent)),
    publicMissMinimumAllocationReductionPercent: Math.min(...publicMisses.map(row => -row.allocationChangePercent)),
    publicMissMaximumAllocationReductionPercent: Math.max(...publicMisses.map(row => -row.allocationChangePercent)),
    maximumCvPercent: Math.max(...outcomes.map(row => row.cvPercent)),
    unchangedControlMaximumSlowerPercent: Math.max(...controls.map(row => row.timeChangePercent)),
    toolchain: 'Actual pinned BDN emitted generator/builder/RunnableProgram/engine with harness-only settings-preserving executor,not default InProcessEmitExecutor or NoEmit.',
    observedProcessThreadPriorities: ['Normal', 'Normal'], observedAffinity: 65535, noPowerPlanApplicationConfigured: true,
    omittedDllPdbRuntimeRehashedByPublicAudit: false, pdbDocumentChecksAreNotPeBindingOrMethodCoverage: true,
    confidenceCriticalValuesIndependentlyComputed: false, razorHttpExternalStoreProductionFrequencyOrWholeApplicationGainClaimed: false,
    unrepresentableAggregateArrayCapacityOrOomExceptionEquivalenceVerified: false,
    qualification: 'Only exact private Encode changes;keyLength BitConverter local/native prefix and independently owned output remain. Direct cases bind Encode once outside timing. Public misses include actual cache.Remove,new TagHelperOutput and real registered key/hash/render/UTF8/envelope/MemoryDistributedCache work with prepared child content. Hit/disabled/formatter controls retained. No Razor page/HTTP/external store/load/production mix/LOH cutoff/large growth-copy count/heap-limit failure-equivalence claim. Preprofile fixtures/calipers/images preserved,goals never retuned. Settings-policy amendment made before any timing sweep;past stock-executor priority changes are unverified rather than claimed absent.',
    outcomes, pairs, publicMissObservations: publicMisses, unchangedControlCosts: controls
};
const table = ['# F113 actual paired outcomes', '', `All${outcomes.length} outcomes/eight retained results each;${comparisons} sequential original/candidate comparisons. Negative change is lower time/allocation. Actual settings-preserving BDN emitted engine;all controls and variability retained.`, '',
    '| Comparison | Case | Original ns | Candidate ns | Time change | Original B | Candidate B | Allocation change |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...pairs.map(row => `| ${row.comparison} | ${row.label} | ${row.original.meanNs.toFixed(3)} | ${row.candidate.meanNs.toFixed(3)} | ${row.timeChangePercent.toFixed(2)}% | ${row.original.bytesPerOperation} | ${row.candidate.bytesPerOperation} | ${row.allocationChangePercent.toFixed(2)}% |`), ''].join('\n');
const encoded = JSON.stringify(audit, null, 2) + '\n';
if (mode === '--verify') { equal(text('measurement-audit.json'), encoded); equal(text('paired-outcomes.md'), table); }
else
{
    assert(!fs.existsSync(local('measurement-audit.json')), 'Never replace completed arithmetic output.');
    fs.writeFileSync(local('measurement-audit.json'), encoded, { flag: 'wx' });
    fs.writeFileSync(local('paired-outcomes.md'), table, { flag: 'wx' });
}
console.log(`F113:${outcomes.length} outcomes/${retained} retained/${warmups} warmups/${overheads} overheads/${setups} hash-PID setups/${settingsRecords} settings records;${completeContracts} current contracts/${calipers.length} current calipers/${testRows} passing TRX rows/${pdbDocuments} source-document checks;${comparisons}/3 budget closed.`);
console.log(`Public evict-plus-miss targets:${audit.publicMissMinimumTimeReductionPercent.toFixed(2)}..${audit.publicMissMaximumTimeReductionPercent.toFixed(2)}% lower time;${audit.publicMissMinimumAllocationReductionPercent.toFixed(2)}..${audit.publicMissMaximumAllocationReductionPercent.toFixed(2)}% fewer B/op. Control max slower:${audit.unchangedControlMaximumSlowerPercent.toFixed(2)}%;all limitations retained.`);
