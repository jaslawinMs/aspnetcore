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
const equal = (a, b, label = 'Actual evidence differs.') => assert.deepEqual(a, b, label);
const near = (a, b, label) => assert(Number.isFinite(a) && Number.isFinite(b) &&
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
const listing = relative => copies
    ? [...mappings.keys()].filter(name => path.win32.dirname(name) === relative)
    : fs.readdirSync(local(relative)).map(name => relative + '\\' + name);
const percentile = (sorted, p) =>
{
    const rank = (sorted.length - 1) * p / 100;
    const lower = Math.floor(rank), upper = Math.ceil(rank);

    return sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);
};
const roundEven = value => value - Math.floor(value) === 0.5
    ? Math.floor(value) + Math.floor(value) % 2 : Math.round(value);
if (copies)
{
    unique(copies.filter(row => row.kind.startsWith('run')).map(row => row.original));
    for (const row of copies)
        equal([digest(fs.readFileSync(local(row.destination))), fs.statSync(local(row.destination)).size],
            [row.sha256, row.bytes], row.original);
}
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const budget = read('measurement-budget.json');
equal([budget.maximumSourceComparisons, budget.startedSourceComparisons, budget.completedSourceComparisons,
    budget.originalProfilesCompleted, budget.candidateProfilesCompleted, budget.closed, budget.selectedVariant,
    budget.completedProfiles.length], [3, 3, 3, 3, 3, true, 'candidate2', 6]);
const sources = read('producer-source-copies.json');
equal(sources.length, 14); unique(sources.map(row => row.path));
for (const row of sources)
{
    const bytes = fs.readFileSync(file(row.rawSnapshot));
    equal([digest(bytes), bytes.length, row.equalityVerified], [row.rawSha256, row.rawBytes, true]);
    const clean = fs.readFileSync(file(row.canonicalSnapshot));
    equal([digest(clean), clean.length, hash(row.baselineSnapshot)],
        [row.canonicalSha256, row.canonicalBytes, row.baselineSha256]);
    equal(clean, fs.readFileSync(file(row.baselineSnapshot)));
    equal(Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n')), clean);
    const blob = crypto.createHash('sha1').update(Buffer.from(`blob ${clean.length}\0`)).update(clean).digest('hex');
    equal([row.currentDefaultGitBlob, row.baselineGitBlob, row.workingGitBlob], [blob, blob, blob]);
}
const manifests = new Map(), closures = new Map();
for (const variant of ['original', 'candidate1', 'candidate2'])
{
    const manifest = read(`${variant}-manifest.json`), closure = read(`execution-closure-${variant}.json`);
    manifests.set(variant, manifest); closures.set(variant, closure);
    equal([manifest.candidate, manifest.variant, manifest.baseline, closure.copiedFiles, closure.files.length,
        closure.declaredRuntimeAssets, closure.runtimeAssets.length, closure.onlyMicrosoftNetCoreFramework],
    ['F111', variant, baseline, 199, 199, 87, 87, true]);
    unique(closure.files.map(row => row.file));
    for (const [name, field] of [
        ['AutoPerf.Benchmarks.dll', 'harnessSha256'], ['AutoPerf.Benchmarks.pdb', 'harnessPdbSha256'],
        ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtimeConfigurationSha256'],
        ['AutoPerf.Benchmarks.deps.json', 'dependencyConfigurationSha256'],
        ['Microsoft.AspNetCore.Components.Endpoints.dll', 'ownerSha256'],
        ['Microsoft.AspNetCore.Components.Endpoints.pdb', 'ownerPdbSha256'],
        ['Microsoft.AspNetCore.Session.dll', 'sessionSha256']
    ]) equal(closure.files.find(row => row.file === name)?.sha256, manifest[field]);
    for (const asset of closure.runtimeAssets) equal(asset.sha256, closure.files.find(row => row.file === asset.copied)?.sha256);
    for (const row of manifest.sourceFiles)
        equal([hash(`frozen-source\\${variant}\\${row.file}`), fs.statSync(file(`frozen-source\\${variant}\\${row.file}`)).size],
            [row.sha256, row.bytes]);
    for (const name of ['Program.cs', 'Cases.cs', 'Workload.cs', 'AutoPerf.Benchmarks.csproj'])
        equal(hash(`frozen-source\\${variant}\\harness\\${name}`), hash(`harness\\${name}`));
    if (variant !== 'original')
    {
        equal(manifest.harnessSha256, manifests.get('original').harnessSha256);
        equal(closure.files.filter(row => row.sha256 !== closures.get('original').files.find(old => old.file === row.file)?.sha256)
            .map(row => row.file).sort(), ['Microsoft.AspNetCore.Components.Endpoints.dll', 'Microsoft.AspNetCore.Components.Endpoints.pdb']);
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
const serializerPath = 'src\\Components\\Endpoints\\src\\Serialization\\JsonStoredDataSerializer.cs';
const projectPath = 'src\\Components\\Endpoints\\src\\Microsoft.AspNetCore.Components.Endpoints.csproj';
const selectedSource = canonical('frozen-source\\candidate2\\' + serializerPath);
equal(selectedSource.replace('using System.Buffers;\n', '')
    .replace('using var buffer = new PooledArrayBufferWriter<byte>();', 'using var buffer = new MemoryStream();')
    .replace('return buffer.WrittenSpan.ToArray();', 'return buffer.ToArray();'),
canonical('frozen-source\\original\\' + serializerPath), 'Only the three exact SerializeData seams may differ;F112 is unchanged.');
equal(canonical('frozen-source\\candidate2\\' + projectPath)
    .replace('    <Compile Include="$(SharedSourceRoot)PooledArrayBufferWriter.cs" LinkBase="Shared" />\n', ''),
canonical('frozen-source\\original\\' + projectPath));
const fixture = read('fixture\\manifest.json');
equal([fixture.candidate, fixture.actualCases, fixture.files.length, fixture.owner.sha256, fixture.harness.sha256],
    ['F111', 28, 28, original.ownerSha256, original.harnessSha256]);
const labels = fixture.files.map(row => row.Label); unique(labels);
for (const row of fixture.files)
{
    equal(hash(`fixture\\inputs\\${row.Label}.json`), row.inputSha256);
    equal([hash(`fixture\\expected\\${row.Label}.bin`), fs.statSync(file(`fixture\\expected\\${row.Label}.bin`)).size],
        [row.outputSha256, row.outputBytes]);
    if (row.ExactOutputLength !== null) equal(row.outputBytes, row.ExactOutputLength);
}
const referenceRuntime = read('characterization\\original\\states\\runtime.json');
function runtime(relative, variant)
{
    const value = read(relative + '\\states\\runtime.json'), manifest = manifests.get(variant);
    equal([value.candidate, value.variant, value.harness.sha256, value.owner.sha256, value.session.sha256,
        value.architecture, value.serverGc, value.configuredConcurrentGc, value.fixtureManifestSha256],
    ['F111', variant, original.harnessSha256, manifest.ownerSha256, original.sessionSha256,
        'X64', true, true, hash('fixture\\manifest.json')]);
    for (const key of ['runtime', 'processorCount', 'json', 'corelib', 'cases']) equal(value[key], referenceRuntime[key]);
    assert(value.processId > 0);

    return value;
}
let completeContracts = 0;
function contract(value)
{
    const input = fixture.files.find(row => row.Label === value.Label); assert(input);
    equal([value.Mode, value.inputSha256, value.outputSha256, value.outputBytes],
        [input.Mode, input.inputSha256, input.outputSha256, input.outputBytes]);
    for (const key of ['exactOutputAndTypedRoundTrip', 'retainedAcrossUnrelatedSerialization',
        'independentAcrossCalls', 'noPartialSessionReplacement', 'recoveryThroughSameProducer'])
        equal(value[key], true, value.Label + '/' + key);
    equal(value.unsupportedFailure, "Cannot serialize type 'System.Object'.");
    equal(value.Binding.publicMethodsBoundOnceOutsideTiming, true);
    assert(value.Binding.session.startsWith('Microsoft.AspNetCore.Session.DistributedSession,'));
    assert(value.Binding.cache.startsWith('Microsoft.Extensions.Caching.Distributed.MemoryDistributedCache,'));
    equal(value, read(`characterization\\original\\states\\contract-${value.Label}.json`));
    completeContracts++;
}
const calipers = [];
for (const variant of ['original', 'candidate1', 'candidate2'])
{
    const relative = 'characterization\\' + variant;
    runtime(relative, variant); equal(read(relative + '\\execution.json').exitCode, 0);
    for (const label of labels)
    {
        contract(read(`${relative}\\states\\contract-${label}.json`));
        const value = read(`${relative}\\states\\caliper-${label}.json`);
        equal([value.Label, value.outputBytes, value.samples.length],
            [label, fixture.files.find(row => row.Label === label).outputBytes, 5]);
        equal(value.samples.map(row => row.sample), [0, 1, 2, 3, 4]);
        for (const sample of value.samples)
        {
            equal(sample.operations, value.outputBytes >= 65536 ? 256 : value.outputBytes >= 4096 ? 1024 : 4096);
            assert(sample.thread > 0 && sample.allocatedBytes > 0 && sample.processAllocatedBytes >= 0);
            near(sample.bytesPerOperation, sample.allocatedBytes / sample.operations);
            near(sample.processBytesPerOperation, sample.processAllocatedBytes / sample.operations);
            assert(sample.diagnosticElapsedMilliseconds > 0);
            calipers.push({ variant, label, ...sample });
        }
    }
}
const goals = read('resource-goals.json');
equal([goals.targets.length, goals.shippingSerializerStillExactOriginalSha256, goals.originalOwnerSha256,
    goals.harnessSha256, goals.fixtureManifestSha256],
[7, hash('producer-source\\' + serializerPath), original.ownerSha256, original.harnessSha256, hash('fixture\\manifest.json')]);
assert(Date.parse(goals.definedAt) < Date.parse(manifests.get('candidate1').capturedAt));
for (const goal of goals.targets)
{
    const samples = calipers.filter(row => row.variant === 'original' && row.label === goal.label);
    equal(goal.originalCaliperSha256, hash(`characterization\\original\\states\\caliper-${goal.label}.json`));
    equal(goal.minimumOriginalBytes, Math.min(...samples.map(row => row.bytesPerOperation)));
    equal(goal.reductionRequiredPercent, 25);
    equal(goal.maximumSelectedBytesPerOperation, goal.minimumOriginalBytes * 0.75);
}
for (const [variant, passed, failed] of [['original', 0, 7], ['candidate1', 6, 1], ['candidate2', 7, 0]])
{
    const report = read(`resource-check-${variant}.json`);
    equal([report.goalsSha256, report.ownerSha256, report.harnessSha256, report.passed, report.failed, report.rows.length],
        [hash('resource-goals.json'), manifests.get(variant).ownerSha256, original.harnessSha256, passed, failed, 7]);
    for (const goal of goals.targets)
    {
        const samples = calipers.filter(row => row.variant === variant && row.label === goal.label);
        const row = report.rows.find(row => row.label === goal.label); assert(row);
        const maximum = Math.max(...samples.map(row => row.bytesPerOperation));
        equal([row.samplesChecked, row.maximumObservedBytes, row.maximumAllowedBytes, row.passed, row.caliperSha256],
            [5, maximum, goal.maximumSelectedBytesPerOperation, maximum <= goal.maximumSelectedBytesPerOperation,
                hash(`characterization\\${variant}\\states\\caliper-${goal.label}.json`)]);
    }
}
const decodeXml = value => value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attributes = value => Object.fromEntries([...value.matchAll(/([\w:]+)="([^"]*)"/g)].map(match => [match[1], decodeXml(match[2])]));
let testRows = 0;
const newTests = [
    'SerializeData_PreservesOwnedBytesAcrossSubsequentCalls',
    ...[16, 4096, 131072].map(length => `SerializeData_PreservesLargeEscapedOutputAndPropertyOrder(length: ${length})`),
    ...['True', 'False'].map(value => `SerializeData_PreservesFailureBeforeStorageAndRecovers(throwingEnumeration: ${value})`)
].map(name => 'Microsoft.AspNetCore.Components.Endpoints.JsonStoredDataSerializerTest.' + name);
for (const [label, count, variant] of [
    ['original', 6, 'original'], ['original-new-controls2', 12, 'original'],
    ['candidate1', 12, 'candidate1'], ['candidate2', 12, 'candidate2']
])
{
    const relative = 'tests\\' + label, audit = read(relative + '\\test-audit.json'), execution = read(relative + '\\execution.json');
    equal(execution.exitCode, 0);
    const trxName = relative + `\\owning-${label}.trx`, trx = text(trxName);
    equal(hash(trxName), audit.trxSha256);
    const results = [...trx.matchAll(/<UnitTestResult\s+([^>]*?)(?:\/>|>)/g)].map(match => attributes(match[1]));
    const definitions = [...trx.matchAll(/<UnitTest\s+([^>]+)>([\s\S]*?)<\/UnitTest>/g)].map(match =>
        ({ ...attributes(match[1]), execution: attributes(match[2].match(/<Execution\s+([^>]+)\/>/)?.[1] ?? '') }));
    const entries = [...trx.matchAll(/<TestEntry\s+([^>]+)\/>/g)].map(match => attributes(match[1]));
    equal([results.length, definitions.length, entries.length, audit.rows.length, audit.skipped, audit.failed],
        [count, count, count, count, 0, 0]);
    unique(results.map(row => row.testId)); unique(results.map(row => row.executionId));
    equal(results.map(row => row.testName).sort(), [...execution.existingSelectedFacts, ...(count === 12 ? newTests : [])].sort());
    equal(audit.capturedTestAndOwnerImage.find(row => row.file === 'Microsoft.AspNetCore.Components.Endpoints.dll').sha256,
        manifests.get(variant).ownerSha256);
    for (const row of results)
    {
        const definition = definitions.find(item => item.id === row.testId);
        assert(definition && entries.some(item => item.testId === row.testId && item.executionId === row.executionId));
        equal([definition.name, definition.execution.id], [row.testName, row.executionId]);
        equal(audit.rows.find(item => item.testId === row.testId), {
            testName: row.testName, testId: row.testId, executionId: row.executionId, outcome: row.outcome, duration: row.duration
        });
        equal(row.outcome, 'Passed');
        assert(/^\d+:\d+:\d+(?:\.\d+)?$/.test(row.duration) && Number(row.duration.replaceAll(':', '')) > 0);
    }
    testRows += count;
}
equal(read('tests\\original-new-controls\\execution.json').exitCode, 1);
assert(read('tests\\original-new-controls\\compile-failure.json').boundary.includes('CS8632'));
let pdbDocuments = 0;
for (const variant of ['original', 'candidate1', 'candidate2'])
{
    const commands = read(`symbols\\${variant}\\commands.json`);
    equal(commands.length, variant === 'candidate2' ? 9 : 8);
    for (const command of commands)
    {
        equal(command.exitCode, 0);
        const argument = command.arguments.at(-1), marker = '\\autoperf-runs\\F111\\', index = argument.indexOf(marker);
        assert(index >= 0);
        const source = argument.slice(index + marker.length);
        const proof = read(`symbols\\${variant}\\${path.win32.basename(source)}.json`);
        equal([proof.verified, proof.source_sha256, proof.actual_pdb_document_sha256], [true, hash(source), hash(source)]);
        pdbDocuments++;
    }
}
const outcomes = [];
let warmups = 0, retained = 0, overheads = 0, setups = 0;
for (const [comparison, variant] of [[1, 'original'], [1, 'candidate1'], [2, 'original'], [2, 'candidate2'], [3, 'candidate2'], [3, 'original']])
{
    const relative = `measurements\\comparison${comparison}\\${variant}`, r = runtime(relative, variant);
    const execution = read(relative + '\\execution.json');
    equal([execution.exitCode, execution.expectedCases, execution.expectedRetainedResultsPerCase, execution.sdk,
        execution.pairOrder, execution.harnessSha256, execution.ownerSha256, execution.sessionSha256],
    [0, 28, 8, '12.0.100-alpha.1.26557.102', comparison === 3 ? 'candidate-first' : 'original-first',
        original.harnessSha256, manifests.get(variant).ownerSha256, original.sessionSha256]);
    for (const [flag, expected] of [['--warmupCount', '3'], ['--iterationCount', '8'], ['--iterationTime', '100'], ['--outliers', 'DontRemove']])
        equal(execution.arguments[execution.arguments.indexOf(flag) + 1], expected);
    assert(execution.arguments.includes('--inProcess') && Date.parse(execution.completedAt) > Date.parse(execution.startedAt));
    const reportName = listing(relative + '\\results').filter(name => /-report-full.*\.json$/.test(name));
    equal(reportName.length, 1);
    const receipt = budget.completedProfiles.find(row => row.comparison === comparison && row.variant === variant); assert(receipt);
    equal(hash(reportName[0]), receipt.reportSha256);
    equal(Date.parse(execution.startedAt), Date.parse(receipt.startedAt));
    const report = read(reportName[0]), console = text(relative + '\\console.log');
    equal([report.Benchmarks.length, report.HostEnvironmentInfo.BenchmarkDotNetVersion], [28, '0.13.0']);
    const blocks = console.split(/^\/\/ Benchmark: /m).slice(1); equal(blocks.length, 28);
    unique(report.Benchmarks.map(row => row.FullName));
    for (const label of labels)
    {
        const benchmark = report.Benchmarks.find(row =>
            row.FullName === `AutoPerf.StoredDataBenchmark.SerializeOrSave(Case: "${label}")`); assert(benchmark);
        assert(benchmark.DisplayInfo.includes('InProcessEmitToolchain') && benchmark.DisplayInfo.includes('OutlierMode=DontRemove'));
        const setup = read(`${relative}\\states\\setup-${label}.json`);
        equal([setup.label, setup.variant, setup.owner.sha256, setup.harness.sha256, setup.processId],
            [label, variant, r.owner.sha256, r.harness.sha256, r.processId]);
        equal(setup.owner, r.owner); equal(setup.harness, r.harness);
        contract(setup.contract);
        const block = blocks.find(value => value.startsWith(benchmark.DisplayInfo)); assert(block);
        const markers = [...block.matchAll(/^AUTOPERF_F111_SETUP (\{[^\r\n]+\})/gm)]; equal(markers.length, 1);
        equal(JSON.parse(markers[0][1]), { label, contract: setup.contract });
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
        const gc = [...block.matchAll(/^GC:\s+(\d+) (\d+) (\d+) (\d+) (\d+)/gm)]; equal(gc.length, 1);
        const [gen0, gen1, gen2, allocated, operations] = gc[0].slice(1).map(Number);
        equal([benchmark.Memory.Gen0Collections, benchmark.Memory.Gen1Collections, benchmark.Memory.Gen2Collections,
            benchmark.Memory.TotalOperations, benchmark.Memory.BytesAllocatedPerOperation],
        [gen0, gen1, gen2, operations, roundEven(allocated / operations)]);
        outcomes.push({ comparison, variant, label, meanNs: mean, medianNs: stats.Median, cvPercent: 100 * deviation / mean,
            bytesPerOperation: benchmark.Memory.BytesAllocatedPerOperation, rawOverheadMedianNs: overheadMedian });
        warmups += 3; retained += 8; overheads += overhead.length; setups++;
    }
}
for (const comparison of [1, 2, 3])
{
    const pair = budget.completedProfiles.filter(row => row.comparison === comparison);
    equal(pair.length, 2);
    assert(Date.parse(pair[1].startedAt) > Date.parse(pair[0].completedAt));
}
for (const variant of ['original', 'candidate2'])
{
    const browser = read(`browser\\${variant}\\execution.json`);
    equal([browser.exitCode, browser.owner.ownerSha256, browser.errors.length, browser.expectedUtf16Length],
        [0, manifests.get(variant).ownerSha256, 0, 2688]);
    equal(browser.observations.map(row => row.status), ['ready', 'stored', 'read', 'consumed']);
    equal(browser.observations[2].integers, '7,11,19');
    equal(browser.observations[2].hash, browser.expectedUtf8PayloadSha256);
    equal(browser.observations[3].hash, 'missing');
    assert(browser.requests.some(row => /\/_framework\/blazor\.web[^/]*\.js$/.test(row.url) && row.status === 200));
    assert(browser.requests.filter(row => row.url.includes('/autoperf-f111')).every(row => row.status === 200));
}
equal([read('browser\\cleanup.json').temporaryProgramExactlyRestored, read('browser\\cleanup.json').temporaryPageRemoved],
    [true, true]);
equal(read('format2-execution.json').exitCode, 0);
equal(read('runtime-pool-source-request.json').exitCode, 1);
const pairs = [];
for (const comparison of [1, 2, 3])
    for (const label of labels)
    {
        const a = outcomes.find(row => row.comparison === comparison && row.variant === 'original' && row.label === label);
        const b = outcomes.find(row => row.comparison === comparison && row.variant !== 'original' && row.label === label);
        pairs.push({ comparison, label, original: a, candidate: b, timeChangePercent: 100 * (b.meanNs / a.meanNs - 1),
            allocationChangePercent: 100 * (b.bytesPerOperation / a.bytesPerOperation - 1) });
    }
const selected = pairs.filter(row => row.comparison > 1);
const targeted = selected.filter(row => goals.targets.some(goal => goal.label === row.label));
const controls = selected.filter(row => row.label.startsWith('Value') || row.label === 'SessionEmpty');
const audit = {
    candidate: 'F111', disposition: 'validated-warmed-component-draft', selectedVariant: 'candidate2',
    sourceComparisons: 3, comparisonBudgetClosed: true, actualBenchmarkOutcomes: outcomes.length,
    actualRetainedResultSamples: retained, actualWorkloadWarmups: warmups, actualRetainedOverheadSamples: overheads,
    actualHashPidLinkedSetups: setups, actualCompleteContractPasses: completeContracts, actualResourceCalipers: calipers.length,
    actualTestRowExecutions: testRows, testSkips: 0, selectedGreenTestRows: 12, expectedResourceOriginalRedRows: 7,
    selectedResourceGreenRows: 7, unselectedCandidate1ResourceFailures: 1, compileFailedTestAttempts: 1,
    scopedCurrentBaselineWorkingSourceIdentities: sources.length, actualPdbDocumentChecks: pdbDocuments,
    copiedApplicationFilesPerImage: 199, declaredRuntimeAssets: 87, frozenImages: 3,
    selectedTargetedMinimumTimeReductionPercent: Math.min(...targeted.map(row => -row.timeChangePercent)),
    selectedTargetedMaximumTimeReductionPercent: Math.max(...targeted.map(row => -row.timeChangePercent)),
    selectedTargetedMinimumAllocationReductionPercent: Math.min(...targeted.map(row => -row.allocationChangePercent)),
    selectedTargetedMaximumAllocationReductionPercent: Math.max(...targeted.map(row => -row.allocationChangePercent)),
    maximumCvPercent: Math.max(...outcomes.map(row => row.cvPercent)),
    selectedUnchangedControlMaximumSlowerPercent: Math.max(...controls.map(row => row.timeChangePercent)),
    omittedDllPdbRuntimeRehashedByPublicAudit: false, pdbDocumentChecksAreNotPeBindingOrMethodCoverage: true,
    confidenceCriticalValuesIndependentlyComputed: false, coldPoolMissesOrRetainedHeapMeasured: false,
    exactRuntimePoolRetentionPolicyEstablished: false, exactStreamResizeOrCopyAttributionEstablished: false,
    productionFrequencyHttpThroughputOrWholeApplicationGainClaimed: false,
    qualification: 'Conditional warmed-pool component proposal,not merge-ready evidence for cold starts/retained heap or application throughput. Selected reuses existing contiguous growable shared pooled writer,clears/returns written rentals and retains final independent result/session copies. Cold misses,pool-retained heap/concurrency/distribution/runtime pool policy unmeasured;unchanged timing controls drift. F112 stays unchanged.',
    outcomes, pairs, selectedUnchangedControlCosts: controls
};
const table = ['# F111 actual paired outcomes', '',
    'All168 outcomes/eight retained results each. Negative change is lower time/allocation. Comparison1 is unselected BCL ArrayBufferWriter;comparisons2/3 are selected pooled candidate2,with comparison3 reversed. Warmed component calls only;all unchanged-control drift and first-candidate costs retained.', '',
    '| Pair | Case | Original ns | Candidate ns | Time change | Original B | Candidate B | Allocation change |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...pairs.map(row => `| ${row.comparison} | ${row.label} | ${row.original.meanNs.toFixed(3)} | ${row.candidate.meanNs.toFixed(3)} | ${row.timeChangePercent.toFixed(2)}% | ${row.original.bytesPerOperation} | ${row.candidate.bytesPerOperation} | ${row.allocationChangePercent.toFixed(2)}% |`), ''].join('\n');
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
console.log(`F111:${outcomes.length} outcomes/${retained} retained/${warmups} warmups/${overheads} actual overheads/${setups} hash-PID setups;${completeContracts} complete contracts/${calipers.length} calipers/${testRows} passing test rows/${pdbDocuments} source-document checks;3/3 budget closed.`);
console.log(`Selected seven targets:${audit.selectedTargetedMinimumTimeReductionPercent.toFixed(2)}..${audit.selectedTargetedMaximumTimeReductionPercent.toFixed(2)}% lower time;${audit.selectedTargetedMinimumAllocationReductionPercent.toFixed(2)}..${audit.selectedTargetedMaximumAllocationReductionPercent.toFixed(2)}% fewer allocated B/op. Control max slower:${audit.selectedUnchangedControlMaximumSlowerPercent.toFixed(2)}%;cold/retained heap unmeasured.`);
