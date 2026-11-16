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
const equal = (a, b, label = 'Evidence differs.') => assert.deepEqual(a, b, label);
const near = (a, b, label = 'Numerical evidence differs.') => assert(Number.isFinite(a) && Number.isFinite(b) &&
    Math.abs(a - b) <= Math.max(1e-5, Math.abs(b) * 1e-12), label);
const unique = values => equal(new Set(values).size, values.length);
function file(relative)
{
    if (!copies) return local(relative);
    const row = mappings.get(relative.replaceAll('/', '\\')); assert(row, 'Missing authoritative artifact:' + relative);

    return local(row.destination);
}
const text = relative => textAt(file(relative)), read = relative => jsonAt(file(relative));
const hash = relative => digest(fs.readFileSync(file(relative)));
const percentile = (sorted, p) =>
{
    const rank = (sorted.length - 1) * p / 100, lower = Math.floor(rank), upper = Math.ceil(rank);

    return sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);
};
const roundEven = value => value - Math.floor(value) === 0.5 ? Math.floor(value) + Math.floor(value) % 2 : Math.round(value);
if (copies)
{
    unique(copies.map(row => row.destination)); unique([...mappings.keys()]);
    for (const row of copies) equal([digest(fs.readFileSync(local(row.destination))), fs.statSync(local(row.destination)).size], [row.sha256, row.bytes], row.original);
}
const source = read('current-source-investigation.json');
equal([source.baseline, source.freshDefault, source.exactScopedIdentities, source.scopedSources, source.currentTestOnlyDifferenceVerified],
['37e809ead5824bc753a1c3d56f11615bdb1296c5', '0d5708d05bb47d5ae84cecd1b12dff7b1d90c84b', 21, 22, true]);
equal(source.scopedSourceIdentities.length, 22); unique(source.scopedSourceIdentities.map(row => row.path));
const ready = { original: read('original-ready.json'), candidate1: read('candidate1-ready.json') };
const manifests = Object.fromEntries(Object.entries(ready).map(([variant, value]) => [variant, read(value.manifest)]));
const closures = Object.fromEntries(Object.entries(ready).map(([variant, value]) => [variant, read(value.closureFile)]));
const owners = ['Microsoft.AspNetCore.Server.Kestrel.Core', 'Microsoft.AspNetCore.SignalR.Core', 'Microsoft.AspNetCore.Http.Connections'];
const primary = 'src\\Shared\\ConnectionEndpointTags.cs';
for (const row of source.scopedSourceIdentities)
{
    const raw = fs.readFileSync(file('producer-source\\' + row.path)), canonical = Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'));
    equal([digest(raw), digest(canonical)], [row.workingRawSha256, row.baselineCanonicalSha256]);
    equal(hash('baseline-canonical\\' + row.path), digest(canonical));
    equal(hash('current-default-canonical\\' + row.path), row.currentCanonicalSha256);
    equal(hash(ready.original.sourceRelative + '\\' + row.path), digest(raw));
    if (row.path !== primary) equal(hash(ready.candidate1.sourceRelative + '\\' + row.path), digest(raw));
}
const candidateSourceHash = hash(ready.candidate1.sourceRelative + '\\' + primary);
equal(candidateSourceHash, read('candidate1-source-registration.json').sourceSha256);
const expectedChanged = owners.flatMap(owner => [owner + '.dll', owner + '.pdb']).sort();
equal(closures.original.files.map(row => row.file), closures.candidate1.files.map(row => row.file));
equal(closures.original.files.filter(row => row.sha256 !== closures.candidate1.files.find(other => other.file === row.file).sha256).map(row => row.file).sort(), expectedChanged);
for (const variant of ['original', 'candidate1'])
{
    const manifest = manifests[variant], closure = closures[variant];
    equal([manifest.candidate, manifest.variant, manifest.actualTestedOwnerMatches, manifest.semanticRows, closure.copiedFiles,
        closure.files.length, closure.declaredRuntimeAssets, closure.runtimeAssets.length, closure.onlyMicrosoftNetCoreFramework],
    ['F116', variant, true, 31, 233, 233, 105, 105, true]);
    unique(closure.files.map(row => row.file));
    for (const row of manifest.executionIdentities) equal(closure.files.find(item => item.file === row.file)?.sha256, row.sha256);
    for (const row of closure.runtimeAssets) equal(closure.files.find(item => item.file === row.copied)?.sha256, row.sha256);
    if (!copies)
    {
        for (const row of closure.files) equal([hash(manifest.imageRelative + '\\' + row.file), fs.statSync(file(manifest.imageRelative + '\\' + row.file)).size], [row.sha256, row.bytes]);
    }
    const runtimeConfig = read(manifest.imageRelative + '\\AutoPerf.Benchmarks.runtimeconfig.json').runtimeOptions;
    equal([runtimeConfig.tfm, runtimeConfig.rollForward, runtimeConfig.framework.name, runtimeConfig.framework.version,
        runtimeConfig.configProperties['System.GC.Server'], runtimeConfig.configProperties['System.GC.Concurrent']],
    ['net12.0', 'Disable', 'Microsoft.NETCore.App', '12.0.0-alpha.1.26562.105', true, true]);
    for (const name of ['Program.cs', 'Bindings.cs', 'Workloads.cs', 'ParallelWork.cs', 'Controls.cs', 'SettingsPreservingEmitToolchain.cs', 'AutoPerf.Benchmarks.csproj'])
        equal(hash(ready.original.sourceRelative + '\\harness\\' + name), hash(manifest.sourceRelative + '\\harness\\' + name));
}
assert(text(ready.original.sourceRelative + '\\harness\\Program.cs').includes('.WithPowerPlan(Guid.Empty)'));
assert(!/(?:\.PriorityClass|Thread\.CurrentThread\.Priority|\.ProcessorAffinity)\s*=(?!=)/.test(text(ready.original.sourceRelative + '\\harness\\SettingsPreservingEmitToolchain.cs')));
assert(text('investigation\\bdn-memory-accounting\\GcStats.cs').includes('GetTotalAllocatedBytesDelegate.Invoke(true)'));
equal(read('pre-timing-memory-accounting-amendment.json').actualTimingProfilesBeforeAmendment, 0);
const fixtureRoot = ready.original.fixtureRelative;
equal(ready.candidate1.fixtureRelative, fixtureRoot);
equal(hash('fixtures\\original-prep1\\manifest.json'), hash(fixtureRoot + '\\manifest.json'));
const fixture = read(fixtureRoot + '\\manifest.json'), ports = read(fixtureRoot + '\\ports.json');
equal(ports.length, 4); unique(ports); assert(ports.every(port => Number.isInteger(port) && port > 0 && port <= 65535));
const labels = ['GetFirst', 'GetSecond', 'GetThird', 'GetMix2', 'GetMix4', 'TagsFirst', 'TagsSecond', 'TagsThird', 'TagsMix2',
    'TagsIPv6', 'TagsFallback', 'TagsOverride', 'ListFirst', 'ListSecond', 'ListThird', 'ListMix2', 'QueueFirst', 'QueueSecond',
    'QueueMix2', 'QueueMany', 'QueueOff', 'ParallelFirst', 'ParallelMix2', 'ParallelMiss'];
equal(fixture.cases.map(row => row.Label), labels);
const tag = (Key, Value) => ({ Key, Value, ValueType: typeof Value === 'number' ? 'System.Int32' : 'System.String' });
const endpointTags = (port, ipv6 = false) => [tag('server.address', ipv6 ? '::1' : '127.0.0.1'), tag('server.port', port),
    tag('network.type', ipv6 ? 'ipv6' : 'ipv4'), tag('network.transport', 'tcp')];
for (const row of fixture.cases)
{
    equal([hash(`${fixtureRoot}\\inputs\\${row.Label}.json`), hash(`${fixtureRoot}\\expected\\${row.Label}.json`)], [row.inputSha256, row.outputSha256]);
    const input = read(`${fixtureRoot}\\inputs\\${row.Label}.json`), output = read(`${fixtureRoot}\\expected\\${row.Label}.json`);
    if (input.kind === 'Parallel')
    {
        const byWorker = Array.from({ length: 12 }, (_, index) => input.ports[index % input.ports.length]);
        const checksum = byWorker.reduce((sum, port) => sum + port * 512, 0);
        equal(output, { workers: 12, callsPerWorker: 512, totalEndpointCalls: 6144, portsByWorker: byWorker,
            checksum, expectedChecksum: checksum, everyPortReadValid: true });
        continue;
    }
    const expected = [];
    for (const port of input.ports)
    {
        const tags = endpointTags(port, input.Ipv6);
        if (input.kind === 'Getter') expected.push({ Event: 'get', Tags: [], Value: port, ValueType: 'System.Int32' });
        if (input.kind === 'Tags') expected.push({ Event: 'tags', Tags: tags, Value: null, ValueType: null });
        if (input.kind === 'SignalRList') expected.push({ Event: 'signalr-list', Tags: [
            tag('rpc.system', 'signalr'), tag('rpc.service', 'AutoPerfHub'), tag('rpc.method', 'Echo'), ...tags], Value: null, ValueType: null });
        if (input.kind === 'Queue' && input.Enabled)
        {
            const metricTags = [...tags, tag('network.protocol.name', 'http'), tag('network.protocol.version', '2')];
            expected.push({ Event: 'queue-start', Tags: metricTags, Value: null, ValueType: null },
                { Event: 'queue-stop', Tags: metricTags, Value: null, ValueType: null });
        }
    }
    equal(output, { value: input.kind === 'Queue' ? (input.Enabled ? input.ports.length * 2 : 0) : input.ports.reduce((sum, port) => sum + port, 0),
        balancedMetricDeltas: 0, snapshots: expected });
}
let runtimeRecords = 0, contracts = 0, calipers = 0, retained = 0, warmups = 0, overheads = 0, setups = 0, settingsRecords = 0, testRows = 0, pdbDocuments = 0;
const expectedSettings = { processPriority: 'Normal', threadPriority: 'Normal', affinity: 65535 };
function runtime(relative, variant)
{
    const r = read(relative + '\\states\\runtime.json'), manifest = manifests[variant], closure = closures[variant];
    equal([r.variant, r.runtime, r.architecture, r.serverGc, r.configuredConcurrentGc, r.processorCount,
        r.processWidePreciseBdnAllocationDelegateAvailable], [variant, '12.0.0', 'X64', true, true, 16, true]);
    equal(r.settings, expectedSettings); equal(r.fixtureManifestSha256, hash(fixtureRoot + '\\manifest.json'));
    equal(r.cases.map(row => row.Label), labels);
    assert(Number.isInteger(r.processId) && r.processId > 0);
    equal(r.owners.map(owner => owner.assembly), owners);
    for (const owner of [...r.owners, r.harness, r.benchmarkDotNet])
        equal(owner.sha256, closure.files.find(row => row.file === owner.assembly + '.dll')?.sha256);
    for (const key of ['corelib', 'json'])
    {
        assert(r[key].informationalVersion.startsWith('12.0.0-alpha.1.26562.105+'));
        if (!copies) equal(digest(fs.readFileSync(r[key].file)), r[key].sha256);
    }
    runtimeRecords++;

    return r;
}
function controls(relative)
{
    equal(read(relative + '\\states\\endpoint-controls.json'), read(fixtureRoot + '\\endpoint-controls.json'));
    equal(read(relative + '\\states\\late-listener-control.json'), read(fixtureRoot + '\\late-listener-control.json'));
    equal(read(relative + '\\states\\endpoint-controls.json').rows.length, 27);
}
function contract(value)
{
    const row = fixture.cases.find(row => row.Label === value.Label); assert(row);
    equal([value.inputSha256, value.outputSha256, value.passed], [row.inputSha256, row.outputSha256, true]);
    equal(value.result, read(`${fixtureRoot}\\expected\\${row.Label}.json`)); contracts++;
}
const resources = read('resource-goals.json');
equal([resources.operationsPerSample, resources.samplesPerGoal, resources.doNotRetune], [4096, 5, true]);
for (const variant of ['original', 'candidate1'])
{
    const relative = ready[variant].characterizationRelative; runtime(relative, variant); controls(relative);
    for (const label of labels)
    {
        contract(read(`${relative}\\states\\contract-${label}.json`));
        const value = read(`${relative}\\states\\caliper-${label}.json`);
        equal([value.Label, value.samples.length], [label, 5]);
        for (const sample of value.samples)
        {
            const parallel = label.startsWith('Parallel');
            equal(sample.operations, parallel ? 16 : 4096);
            near(sample.bytesPerOperation, sample.allocatedBytes / sample.operations);
            near(sample.processBytesPerOperation, sample.processAllocatedBytes / sample.operations);
            equal(sample.totalWorkerAllocatedBytes, sample.workerAllocatedBytes.reduce((a, b) => a + b, 0));
            assert(sample.allocatedBytes >= 0 && sample.processAllocatedBytes >= sample.allocatedBytes + sample.totalWorkerAllocatedBytes && sample.diagnosticElapsedMilliseconds > 0);
            if (parallel)
            {
                equal(sample.workerAllocatedBytes.length, 12);
                near(sample.workerBytesPerEndpointCall, label === 'ParallelMiss' ? 24 : label === 'ParallelMix2' && variant === 'original' ? 12 : 0);
            }
            const goal = resources.goals.find(goal => goal.label === label);
            if (goal)
            {
                if (variant === 'original') equal(sample.bytesPerOperation, goal.originalExpectedBytesPerOperation);
                else assert(sample.bytesPerOperation <= goal.maximumBytesPerOperation);
            }
            calipers++;
        }
    }
    const proof = read(variant === 'original' ? 'resource-original-original-prep2.json' : 'resource-candidate1.json');
    equal(proof.goalsSha256, hash('resource-goals.json')); equal(proof.goals.length, 5);
    for (let sample = 1; sample <= 3; sample++)
    {
        const relative = `cold\\${variant === 'original' ? 'original-prep2' : variant}-${sample}`;
        runtime(relative, variant);
        const cold = read(relative + '\\states\\cold-race.json');
        equal([cold.workers, cold.coldCalls, cold.privateCacheWritesByHarness, cold.values.length], [12, 12, false, 12]);
        equal(cold.values, Array.from({ length: 12 }, (_, index) => ports[index % 4]));
        // Historical nested Select was deferred until serialization after warmup.
        equal(cold.before, cold.warm); equal(cold.cold, cold.warm);
        for (const owner of cold.warm)
        {
            equal(owner.slots.length, variant === 'original' ? 1 : 2);
            const values = owner.slots.map(slot => slot.value); unique(values);
            assert(values.every(port => ports.includes(port)));
            assert(owner.slots.every(slot => slot.valueType === 'System.Int32'));
        }
        for (let worker = 0; worker < 12; worker++)
        {
            equal(cold.initialSettings[worker], expectedSettings); equal(cold.finalSettings[worker], expectedSettings);
        }
    }
}
equal(read('development\\analysis-attempt1-execution.json').exitCode, 1);
assert(text('development\\analysis-attempt1.log').includes('cold.before.every'));
assert(read('cold-capture-amendment.json').actualIssue.includes('deferred Select'));
const independentCold = read('cold-capture-repair\\completion.json');
equal([independentCold.actualFreshColdOnlyProcesses, independentCold.exactMeasuredOwnersVerified,
    independentCold.actualSourceComparisonsRerun, independentCold.measurementHarnessChanged, independentCold.shippingSourceChanged],
[6, true, 0, false, false]);
equal(independentCold.processes.length, 6); unique(independentCold.processes.map(row => row.processId));
for (const row of independentCold.source) equal(hash(row.file), row.sha256);
for (const row of independentCold.processes)
{
    const relative = 'cold-capture-repair\\' + row.file;
    equal(hash(relative), row.sha256);
    const value = read(relative), slotCount = row.variant === 'original' ? 1 : 2;
    equal([value.candidate, value.variant, value.processId, value.runtime, value.snapshotsMaterializedAtCapture,
        value.shippingCacheFieldsWrittenByProbe, value.actualTimingRerun, value.probe.sha256],
    ['F116', row.variant, row.processId, '12.0.0', true, false, false, independentCold.probeSha256]);
    equal(value.owners.map(owner => owner.assembly), owners);
    for (const owner of value.owners)
        equal(owner.sha256, closures[row.variant].files.find(item => item.file === owner.assembly + '.dll')?.sha256);
    equal(value.values, Array.from({ length: 12 }, (_, index) => ports[index % 4]));
    equal(value.before.map(owner => owner.Owner), owners); equal(value.cold.map(owner => owner.Owner), owners); equal(value.warm.map(owner => owner.Owner), owners);
    for (let owner = 0; owner < owners.length; owner++)
    {
        equal(value.before[owner].Slots.length, slotCount); equal(value.cold[owner].Slots.length, slotCount);
        assert(value.before[owner].Slots.every(slot => slot.Value === null && slot.ValueType === null));
        equal(value.warm[owner].Slots.length, slotCount);
        unique(value.warm[owner].Slots.map(slot => slot.Value));
        assert(value.warm[owner].Slots.every(slot => ports.includes(slot.Value) && slot.ValueType === 'System.Int32'));
        for (const slot of value.cold[owner].Slots.filter(slot => slot.Value !== null))
            equal(value.warm[owner].Slots.find(other => other.Name === slot.Name)?.Value, slot.Value);
    }
    for (let worker = 0; worker < 12; worker++)
    {
        equal(value.initialSettings[worker], expectedSettings); equal(value.finalSettings[worker], expectedSettings);
    }
    equal(value.controllerSettings, expectedSettings);
    if (!copies) equal(digest(fs.readFileSync(value.probe.file)), value.probe.sha256);
}
const decode = value => value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) =>
    entity[0] === '#' ? String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)))
        : ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[entity.toLowerCase()]);
const attributes = value => Object.fromEntries([...value.matchAll(/([\w:]+)="([^"]*)"/g)].map(match => [match[1], decode(match[2])]));
for (const variant of ['original', 'candidate1'])
{
    const audit = read(`tests\\${variant}\\test-audit.json`); equal([audit.actualRows, audit.allPassed, audit.skipped], [31, true, 0]);
    for (const scope of audit.scopes)
    {
        const xml = text(`tests\\${variant}\\${scope.trx}`);
        equal(hash(`tests\\${variant}\\${scope.trx}`), scope.trxSha256);
        const rows = [...xml.matchAll(/<UnitTestResult\s+([^>]+)>/g)].map(match => attributes(match[1]));
        const definitions = [...xml.matchAll(/<UnitTest\s+([^>]+)>([\s\S]*?)<\/UnitTest>/g)].map(match =>
            ({ ...attributes(match[1]), execution: attributes(match[2].match(/<Execution\s+([^>]+)\/>/)[1]).id }));
        const entries = [...xml.matchAll(/<TestEntry\s+([^>]+)\/>/g)].map(match => attributes(match[1]));
        const discovered = [...text(`tests\\${variant}\\${scope.discoveryLog}`).matchAll(/^\s+(Microsoft\.AspNetCore\..+)$/gm)].map(match => match[1].trim());
        equal([rows.length, definitions.length, entries.length], [scope.passed, scope.discovered, scope.passed]);
        equal(discovered.sort(), definitions.map(row => row.name).sort()); unique(rows.map(row => row.executionId));
        for (const row of rows)
        {
            equal(row.outcome, 'Passed'); assert(Number(row.duration.split(':').at(-1)) > 0);
            const definition = definitions.filter(value => value.id === row.testId), entry = entries.filter(value => value.executionId === row.executionId && value.testId === row.testId);
            equal([definition.length, entry.length, definition[0].name, definition[0].execution], [1, 1, row.testName, row.executionId]);
            assert(scope.rows.some(value => value.testId === row.testId && value.executionId === row.executionId && value.testName === row.testName && value.outcome === row.outcome));
            testRows++;
        }
        for (const owner of owners)
        {
            for (const extension of ['.dll', '.pdb'])
            {
                const captured = scope.capturedTestAndOwnerImage.find(row => row.file === owner + extension);
                if (captured) equal(captured.sha256, closures[variant].files.find(row => row.file === owner + extension).sha256);
            }
        }
    }
    const pdb = read(`pdb\\${variant}\\document-audit.json`);
    equal([pdb.verifiedDocuments, pdb.rows.length], [20, 20]);
    for (const row of pdb.rows)
    {
        const actualHash = hash(ready[variant].sourceRelative + '\\' + row.source);
        equal([row.sourceSha256, row.actual.verified, row.actual.source_sha256, row.actual.actual_pdb_document_sha256], [actualHash, true, actualHash, actualHash]);
        equal(row.pdbSha256, closures[variant].files.find(value => value.file === row.owner + '.pdb')?.sha256);
        pdbDocuments++;
    }
}
const outcomes = [], executions = [];
for (let round = 1; round <= 3; round++)
{
    for (const variant of ['original', 'candidate1'])
    {
        const relative = `measurements\\round${round}-${variant}`, r = runtime(relative, variant); controls(relative);
        const execution = read(relative + '\\execution.json'); executions.push(execution); equal(execution.exitCode, 0);
        for (const [flag, expected] of [['--warmupCount', '3'], ['--iterationCount', '8'], ['--iterationTime', '100'], ['--outliers', 'DontRemove']])
            equal(execution.arguments[execution.arguments.indexOf(flag) + 1], expected);
        assert(!execution.arguments.includes('--inProcess') && !execution.arguments.includes('--job'));
        const report = read(relative + '\\results\\AutoPerf.PortBenchmark-report-full-compressed.json');
        equal([report.Benchmarks.length, report.HostEnvironmentInfo.BenchmarkDotNetVersion], [24, '0.13.0']);
        const blocks = text(relative + '\\console.log').split(/^\/\/ Benchmark: /m).slice(1); equal(blocks.length, 24);
        const byCase = new Map();
        for (const block of blocks)
        {
            const markers = [...block.matchAll(/^AUTOPERF_F116_SETUP (\{[^\r\n]+\})/gm)]; equal(markers.length, 1);
            const setup = JSON.parse(markers[0][1]); assert(labels.includes(setup.Case) && !byCase.has(setup.Case)); byCase.set(setup.Case, { block, setup });
        }
        for (const label of labels)
        {
            const benchmark = report.Benchmarks.find(row => row.FullName === `AutoPerf.PortBenchmark.ReadOrEmit(Case: "${label}")`); assert(benchmark);
            assert(benchmark.DisplayInfo.includes('Toolchain=SettingsPreservingEmitToolchain') && benchmark.DisplayInfo.includes('OutlierMode=DontRemove') &&
                benchmark.DisplayInfo.includes('PowerPlanMode=00000000-0000-0000-0000-000000000000'));
            const setup = read(`${relative}\\states\\contract-${label}.json`), { block, setup: rawSetup } = byCase.get(label);
            equal([setup.Case, setup.variant, setup.processId], [label, variant, r.processId]); equal(setup.owners, r.owners); equal(setup.harness, r.harness);
            equal(setup.settings, expectedSettings); equal(rawSetup, setup); contract(setup.contract);
            assert(block.startsWith(benchmark.DisplayInfo + '\n') || block.startsWith(benchmark.DisplayInfo + '\r\n'));
            for (const name of [`settings-before-${label}`, `settings-after-${label}`])
            {
                equal(read(`${relative}\\states\\${name}.json`), expectedSettings); settingsRecords++;
            }
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
            if (label.startsWith('Parallel'))
            {
                const workers = read(`${relative}\\states\\workers-${label}.json`); equal([workers.initial.length, workers.final.length], [12, 12]);
                for (let worker = 0; worker < 12; worker++)
                {
                    equal(workers.initial[worker], workers.final[worker]); equal(workers.initial[worker].settings, expectedSettings);
                }
            }
            outcomes.push({ round, variant, label, meanNs: mean, medianNs: stats.Median, cvPercent: 100 * deviation / mean,
                bytesPerInvocation: benchmark.Memory.BytesAllocatedPerOperation, confidenceLower: stats.ConfidenceInterval.Lower,
                confidenceUpper: stats.ConfidenceInterval.Upper, rawOverheadMedianNs: overheadMedian });
            retained += 8; warmups += 3; overheads += overhead.length; setups++;
        }
    }
}
equal([outcomes.length, contracts, calipers, retained, warmups, setups, settingsRecords, runtimeRecords, testRows, pdbDocuments],
[144, 192, 240, 1152, 432, 144, 288, 14, 62, 40]);
const comparisons = [];
for (let round = 1; round <= 3; round++)
{
    const ordered = executions.filter(row => row.round === round).sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
    equal(ordered.map(row => row.variant), round === 2 ? ['candidate1', 'original'] : ['original', 'candidate1']);
    assert(Date.parse(ordered[0].completedAt) <= Date.parse(ordered[1].startedAt));
    for (const label of labels)
    {
        const original = outcomes.find(row => row.round === round && row.variant === 'original' && row.label === label);
        const candidate = outcomes.find(row => row.round === round && row.variant === 'candidate1' && row.label === label);
        comparisons.push({ round, label, originalMeanNs: original.meanNs, candidateMeanNs: candidate.meanNs,
            changePercent: 100 * (candidate.meanNs / original.meanNs - 1), originalBytes: original.bytesPerInvocation, candidateBytes: candidate.bytesPerInvocation,
            originalCvPercent: original.cvPercent, candidateCvPercent: candidate.cvPercent,
            reportedIntervalsOverlap: Math.max(original.confidenceLower, candidate.confidenceLower) <= Math.min(original.confidenceUpper, candidate.confidenceUpper) });
    }
}
const budget = read('measurement-budget.json'), disposition = read('final-evaluation.json');
equal([budget.maximumSourceComparisons, budget.startedSourceComparisons, budget.completedSourceComparisons,
    budget.candidateSourceShapes.length, budget.originalProfilesStarted, budget.candidateProfilesStarted, budget.completedProfiles.length, budget.closed],
[3, 3, 3, 1, 3, 3, 6, true]);
const result = {
    candidate: 'F116', disposition: disposition.disposition, sourceComparisons: 3, candidateSourceShapes: 1, actualProfiles: 6,
    actualBenchmarkOutcomes: 144, retainedResultSamples: retained, workloadWarmups: warmups, retainedOverheadSamples: overheads,
    exactHashPidLinkedSetups: setups, settingsBeforeAfterRecords: settingsRecords, capturedPerCaseContracts: contracts,
    resourceCalipers: calipers, expectedRedGoalSamples: 25, unchangedGreenGoalSamples: 25, actualOwningTestRows: testRows,
    actualPdbDocumentChecks: pdbDocuments, activeFreshFourPortColdProcesses: 6, archivedEarlierColdProcesses: 3,
    historicalColdBeforeAndIntermediateSnapshotsAreDeferred: true, independentMaterializedFreshColdProcesses: 6,
    independentColdTwelveWorkerProducerIsKestrel: true, independentWarmOwnerCopies: 3,
    scopedSourceIdentities: 22, currentDefaultExactScopedFiles: 21, copiedApplicationFilesPerVariant: 233, declaredRuntimeAssetsPerVariant: 105,
    onlySixTestedOwnerDllPdbChanged: true, processWidePreciseBdnAllocationVerified: true, candidateSourceSha256: candidateSourceHash,
    maximumCvPercent: Math.max(...outcomes.map(row => row.cvPercent)), observedSettings: expectedSettings,
    performancePrJustified: disposition.performancePrJustified, shippedPublicApiOrDefaultChanged: false,
    omittedDllPdbRuntimeRehashedByPublicAudit: false, pdbDocumentChecksAreNotPeBindingOrMethodCoverage: true,
    confidenceCriticalValuesIndependentlyComputed: false,
    qualification: 'Actual prepared component/real meter-producer evidence,not network/full hub/application throughput or production-frequency proof. All first/miss/parallel/startup/retention tradeoffs retained. BDN0.13 process-wide allocation includes workers on this runtime;independent per-worker calipers attribute loops. Shared VM,not isolated,Normal/Normal/affinity points and explicit no-mutation config are not continuous OS tracing. Live audit rehashes images/runtime bytes;public audit cannot rehash deliberately omitted binaries. Initial metadata/scope/PowerShell preparation failures are preserved,never used to rerun actual timing. First full audit found deferred before/intermediate cold JSON snapshots;those historical labels are not valid point observations. Six additional immediately-materialized cold-only diagnostics against the exact measured owner images establish empty-before/correct-ports/stable-bounded-publication without changing source/frozen timing harness or rerunning a comparison.',
    outcomes, comparisons
};
const markdown = [
    '# F116: actual bounded second-port cache comparisons', '',
    'Negative change means lower observed component mean,not an application speedup. Eight retained samples per outcome,all outliers retained. Units and raw variability must be read with the frozen inputs;parallel rows are6144-call coordinated batches,QueueMix2 is2streams/4emissions.', '',
    '| Pair | Case | Original ns | Candidate ns | Change | Original B/invocation | Candidate B/invocation | CV original/candidate | Reported CI overlap |',
    '| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |',
    ...comparisons.map(row => `| ${row.round} | ${row.label} | ${row.originalMeanNs.toFixed(3)} | ${row.candidateMeanNs.toFixed(3)} | ${row.changePercent.toFixed(2)}% | ${row.originalBytes} | ${row.candidateBytes} | ${row.originalCvPercent.toFixed(2)}%/${row.candidateCvPercent.toFixed(2)}% | ${row.reportedIntervalsOverlap ? 'yes' : 'no'} |`),
    '', `Raw retained:${retained};warmups:${warmups};actual overhead samples:${overheads};three comparisons,one source shape. No confidence-critical-value or application-frequency inference.`, ''
].join('\n');
if (mode === '--verify')
{
    equal(jsonAt(local('measurement-audit.json')), result); equal(textAt(local('comparison-outcomes.md')), markdown);
}
else
{
    fs.writeFileSync(local('measurement-audit.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    fs.writeFileSync(local('comparison-outcomes.md'), markdown, { flag: 'wx' });
}
console.log(`F116:144 outcomes/${retained} retained/${warmups} warmups/${overheads} overheads,192 contracts/240 calipers/62 exact owning rows/40 PDB documents;six profiles/three comparisons,one unchanged source shape. ${copies ? 'Public copied evidence verified;omitted binaries not rehashed.' : 'Live image/runtime bytes rehashed.'}`);
