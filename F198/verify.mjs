import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '.');
const file = logical => path.join(root, ...logical.replaceAll('\\', '/').split('/'));
const bytes = logical => fs.readFileSync(file(logical));
const read = logical => JSON.parse(bytes(logical).toString('utf8').replace(/^\uFEFF/, ''));
const hash = logical => crypto.createHash('sha256').update(bytes(logical)).digest('hex').toUpperCase();
const close = (actual, expected) => {
    assert.ok(Number.isFinite(actual) && Number.isFinite(expected));
    assert.ok(Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-10, `${actual} != ${expected}`);
};
const logicalFiles = (directory = root, prefix = '') => fs.readdirSync(directory, { withFileTypes: true })
    .flatMap(entry => {
        assert.equal(entry.isSymbolicLink(), false);
        const logical = prefix + entry.name;
        return entry.isDirectory() ? logicalFiles(path.join(directory, entry.name), logical + '/') : [logical];
    });
const selection = read('evidence-selection.json');
assert.equal(selection.findingId, 'F198');
assert.equal(selection.noNewCounterOrBenchmarkExecution, true);
assert.equal(new Set(selection.files.map(item => item.file)).size, selection.files.length);
for (const item of selection.files)
{
    assert.equal(bytes(item.file).length, item.bytes, item.file);
    assert.equal(hash(item.file), item.sha256, item.file);
}
const allowed = new Set([...selection.files.map(item => item.file), 'evidence-selection.json',
    'historical-audit.json', 'capsule-file-hashes.json', 'publication.json']);
assert.ok(logicalFiles().every(item => allowed.has(item)));
if (process.argv.includes('--require-seal'))
{
    const sealed = read('capsule-file-hashes.json').files;
    assert.deepEqual(sealed.map(item => item.file).sort(),
        logicalFiles().filter(item => !['capsule-file-hashes.json', 'publication.json'].includes(item)).sort());
    for (const item of sealed)
    {
        assert.equal(bytes(item.file).length, item.bytes);
        assert.equal(hash(item.file), item.sha256, item.file);
    }
}
assert.equal(hash('plan.json'), '448B26429F40AD582CB9C72F327549D24238974A82E8B060CA9C977CFDAB611F');
assert.equal(hash('diagnostic-budget.json'), '0BFA4006C3EA313F10E5035CA6AF7C09131EED5EC10A18AE2A529C5535690F12');
assert.equal(hash('raw/Original/outcome.json'), '32552182F0DE4C75616CC86FB952475498260A90119124D97D46C1FD1CC1E9A2');
assert.equal(hash('source/AutoPerf.F198.Driver173.mjs'), 'BD8A1D93CA2FCFD7E0C182CDAB3A2834D491F40F8BB3C04AC649766904CA3010');
const budget = read('diagnostic-budget.json');
assert.equal(budget.closed, true);
assert.equal(budget.authorizations.length, 1);
assert.equal(budget.authorizations[0].sourceRole, 'Original');
assert.equal(budget.authorizations[0].status, 'inconclusive-control-drift');
assert.equal(budget.nextSourceRole, null);
const config = read('driver-config-173.json');
assert.equal(hash('compatibility-173.json'), config.compatibilitySha256);
const compatibility = read('compatibility-173.json');
assert.equal(compatibility.actualNativeCasePhaseClrOrMvidDirectlySampled, false);
assert.equal(compatibility.actualCommonOwnerFixtureCoreLibDirectlySampled, true);
const suppliedSources = new Map(selection.files.map(item => [item.sourcePath.toLowerCase(), item]));
for (const item of compatibility.evidence)
{
    const supplied = suppliedSources.get(item.path.toLowerCase());
    assert.ok(supplied, item.path);
    assert.equal(supplied.sha256, item.sha256);
}
for (const image of compatibility.images)
{
    const inventory = 'inventories/' + path.win32.basename(image.inventoryPath);
    assert.equal(hash(inventory), image.inventorySha256);
    assert.equal(read(inventory).length, image.actualFilesVerified);
}
for (const kind of ['Perf', 'Native'])
{
    const baseline = read(`inventories/${kind}-Baseline-inventory.json`);
    const candidate = read(`inventories/${kind}-Candidate-inventory.json`);
    assert.deepEqual(baseline.map(item => item.path), candidate.map(item => item.path));
    assert.deepEqual(baseline.filter((item, index) => item.sha256 !== candidate[index].sha256)
        .map(item => item.path).sort(),
    ['Microsoft.AspNetCore.Server.Kestrel.Core.dll', 'Microsoft.AspNetCore.Server.Kestrel.Core.pdb'].sort());
}
const attributes = tag => Object.fromEntries([...tag.matchAll(/([A-Za-z][A-Za-z0-9_:.-]*)="([^"]*)"/g)]
    .map(match => [match[1], match[2]]));
let nativeRows = 0;
const nativeLifecycles = [];
for (const variant of ['Baseline', 'Candidate'])
{
    const prefix = `correctness/serial-native-171/${variant}/Native/`;
    const life = read(prefix + 'lifecycle.json');
    assert.equal(life.actualExitCode, 0);
    assert.equal(life.actualDirectChildAwaitedToExit, true);
    assert.equal(life.actualBothStreamsDrained, true);
    nativeLifecycles.push(life);
    const trx = bytes(prefix + 'F198-native.trx').toString('utf8');
    const results = [...trx.matchAll(/<UnitTestResult\b[^>]*>/g)].map(match => attributes(match[0]));
    assert.equal(results.length, 2);
    assert.ok(results.every(item => item.outcome === 'Passed'));
    for (const method of ['Http1Connection_ServerShutdown_Graceful', 'Http1Connection_ServerShutdown_Abort'])
    {
        assert.equal(results.filter(item => item.testName.endsWith(method)).length, 1);
    }
    nativeRows += results.length;
    const inspection = read(`correctness/causal-169/${variant}/inspection/inspection.json`);
    assert.deepEqual(inspection.Cases.map(item => item.ConnectionCount), [0, 1, 16, 256]);
    for (const item of inspection.Cases)
    {
        for (const field of ['ActualCloseRequested', 'ActualExecutionTasksCompleted', 'ActualDelegatesCompleted'])
        {
            assert.equal(item[field], item.ConnectionCount);
        }
        assert.equal(item.ActualRemainingConnections, 0);
        assert.equal(item.ActualCloseResult, true);
        assert.equal(item.ActualPrivateExecutionTaskOrCallbackInjected, false);
    }
    assert.equal(inspection.ExecuteCalls, 0);
    assert.equal(inspection.ActualNoEngineOrCounters, true);
    assert.equal(inspection.ActualAllFourCustomIsSupportedCallsPassed, true);
    assert.equal(inspection.ActualCompleteConfigValidationClean, true);
    assert.deepEqual(inspection.NegativeControls, ['WrongGcRejected', 'MultipleInvocationsRejected', 'StockExecutorRejected']);
}
assert.ok(Date.parse(nativeLifecycles[1].actualChildCreationUtc) >= Date.parse(nativeLifecycles[0].completedAtUtc));
const failedNative = bytes('correctness/causal-169/Candidate/Native/F198-native.trx').toString('utf8');
assert.ok(failedNative.includes('NullReferenceException') && failedNative.includes('LoggedTest.Initialize'));
assert.equal([...failedNative.matchAll(/<UnitTestResult\b[^>]*>/g)]
    .map(match => attributes(match[0])).filter(item => item.outcome === 'Failed').length, 1);
assert.equal(hash('selected-pe/Baseline-Kestrel.Core.dll'), config.specimens.Baseline.Owner.Sha256);
assert.equal(hash('selected-pe/Candidate-Kestrel.Core.dll'), config.specimens.Candidate.Owner.Sha256);
assert.equal(hash('selected-pe/Microsoft.AspNetCore.Server.Kestrel.Microbenchmarks.dll'), config.specimens.Baseline.Fixture.Sha256);
assert.equal(hash('selected-pe/AutoPerf.F198.Benchmark163.dll'), '546787543F36D8F68888E34FD26456C5D66583921DD24F588F5C0118FB043304');
const parameters = [0, 1, 16, 256];
const blocks = [];
const pids = new Set();
let priorEnd = -Infinity;
let rawMeasurements = 0;
for (let block = 1; block <= 7; block++)
{
    const rows = {};
    for (const step of ['BaselineBefore', 'Candidate', 'BaselineAfter'])
    {
        const prefix = `raw/Original/block-${String(block).padStart(2, '0')}/${step}/`;
        const life = read(prefix + 'lifecycle.json');
        assert.equal(life.actualExitCode, 0);
        assert.equal(life.actualChildAwaitedToExit, true);
        assert.ok(Date.parse(life.startedAt) >= priorEnd);
        priorEnd = Date.parse(life.completedAt);
        const identity = read(prefix + 'results/identity.json');
        assert.equal(identity.Runtime, '12.0.0-alpha.1.26562.105');
        assert.equal(identity.IsServerGC, true);
        assert.equal(identity.Pid, life.actualOwnedChildPid);
        assert.equal(pids.has(identity.Pid), false);
        pids.add(identity.Pid);
        const variant = step === 'Candidate' ? 'Candidate' : 'Baseline';
        const specimen = config.specimens[variant];
        const completion = read(prefix + 'results/completion.json');
        assert.equal(completion.Role, `Original-${block}-${step}`);
        assert.equal(completion.Mode, 'run');
        assert.equal(completion.Passed, true);
        for (const expected of [specimen.Owner, specimen.Fixture, specimen.CoreLib])
        {
            const loaded = completion.Assemblies.filter(item => item.Path.toLowerCase() === expected.Path.toLowerCase());
            assert.equal(loaded.length, 1);
            assert.equal(loaded[0].Sha256, expected.Sha256);
            assert.equal(loaded[0].Mvid, expected.Mvid);
        }
        const accepted = read(`correctness/causal-169/${variant}/inspection/identity.json`);
        assert.equal(identity.NativeRuntime.length, accepted.NativeRuntime.length);
        for (const actual of identity.NativeRuntime)
        {
            assert.equal(accepted.NativeRuntime.filter(expected => actual.ModuleName === expected.ModuleName &&
                actual.Path === expected.Path && actual.Sha256 === expected.Sha256).length, 1);
        }
        const measurement = read(prefix + 'results/measurement.json');
        assert.equal(measurement.Role, completion.Role);
        assert.deepEqual(measurement.Rows.map(item => item.ConnectionCount), parameters);
        for (const row of measurement.Rows)
        {
            assert.equal(row.Measurements.length, 501);
            assert.equal(new Set(row.Measurements.map(item => item.IterationIndex)).size, 501);
            assert.ok(row.Measurements.every(item => item.Operations === 1 &&
                Number.isFinite(item.Nanoseconds) && item.Nanoseconds >= 0));
            close(row.Nanoseconds, row.Measurements.reduce((sum, item) => sum + item.Nanoseconds, 0) / 501);
            assert.ok(Number.isFinite(row.Bytes) && row.Bytes >= 0);
            rawMeasurements += row.Measurements.length;
        }
        rows[step] = measurement.Rows;
    }
    blocks.push(rows);
}
const gm = values => {
    assert.ok(values.every(value => value >= 0 && !Number.isNaN(value)));
    assert.ok(!(values.includes(0) && values.includes(Infinity)));
    if (values.every(value => value === values[0])) { return values[0]; }
    if (values.includes(0)) { return 0; }
    if (values.includes(Infinity)) { return Infinity; }
    return Math.exp(values.reduce((sum, value) => sum + Math.log(value), 0) / values.length);
};
const outcome = read('raw/Original/outcome.json');
let failedControls = 0;
for (const count of parameters)
{
    const aggregate = outcome.ratios.find(item => item.ConnectionCount === count);
    const samples = blocks.map((block, index) => {
        const select = step => block[step].find(item => item.ConnectionCount === count);
        const before = select('BaselineBefore'), candidate = select('Candidate'), after = select('BaselineAfter');
        const control = outcome.controls.find(item => item.ConnectionCount === count && item.block === index + 1);
        close(control.driftPercent, Math.abs(after.Nanoseconds / before.Nanoseconds - 1) * 100);
        assert.equal(control.passed, Math.abs(after.Nanoseconds - before.Nanoseconds) <= before.Nanoseconds * 0.1);
        if (!control.passed) { failedControls++; }
        const baselineBytes = gm([before.Bytes, after.Bytes]);
        const sample = {
            elapsedRatio: candidate.Nanoseconds / gm([before.Nanoseconds, after.Nanoseconds]),
            allocationRatio: baselineBytes === 0 ? (candidate.Bytes === 0 ? 1 : Infinity) : candidate.Bytes / baselineBytes
        };
        close(aggregate.samples[index].elapsedRatio, sample.elapsedRatio);
        close(aggregate.samples[index].allocationRatio, sample.allocationRatio);
        return sample;
    });
    close(aggregate.elapsedRatio, gm(samples.map(item => item.elapsedRatio)));
    close(aggregate.allocationRatio, gm(samples.map(item => item.allocationRatio)));
    close(aggregate.elapsedReductionPercent, (1 - aggregate.elapsedRatio) * 100);
    close(aggregate.allocationReductionPercent, (1 - aggregate.allocationRatio) * 100);
    assert.equal(aggregate.elapsedDirectionalBlocks, samples.filter(item => item.elapsedRatio < 1).length);
    assert.equal(aggregate.allocationDirectionalBlocks, samples.filter(item => item.allocationRatio < 1).length);
    assert.equal(aggregate.elapsedNonregressionPassed, aggregate.elapsedRatio <= 1.05);
    assert.equal(aggregate.allocationNonregressionPassed, aggregate.allocationRatio <= 1.01);
}
assert.equal(outcome.controls.length, 28);
assert.equal(failedControls, 5);
assert.equal(outcome.controlsPassed, false);
assert.equal(outcome.status, 'inconclusive-control-drift');
assert.equal(outcome.actualCompleteBlocks, 7);
assert.equal(outcome.actualManagedBenchmarkHostProcesses, pids.size);
assert.equal(pids.size, 21);
assert.equal(rawMeasurements, 42084);
const primary = outcome.ratios.find(item => item.ConnectionCount === 16);
assert.equal(outcome.primaryPassed, (primary.elapsedRatio <= 0.95 && primary.elapsedDirectionalBlocks >= 6) ||
    (primary.allocationRatio <= 0.95 && primary.allocationDirectionalBlocks >= 6));
assert.equal(outcome.primaryPassed, false);
assert.equal(outcome.nonregressionPassed,
    outcome.ratios.every(item => item.elapsedNonregressionPassed && item.allocationNonregressionPassed));
const classification = read('classification-control-result.json');
assert.equal(classification.actualCleanCases, 8);
assert.ok(classification.actualExtractedPublisherFunctionControls.every(item => item.passed));
assert.equal(classification.actualClosedBudgetBytesUnchanged, true);
assert.equal(hash('source/autoperf-publish-bounded-outcome-174.mjs'), classification.publisherSha256);
console.log(JSON.stringify({
    findingId: 'F198', actualSuppliedSelectedFilesHashVerified: selection.files.length,
    actualCleanSerialNativeRows: nativeRows, actualRealProducerCasesPerVariant: 4,
    actualFreshManagedProcesses: pids.size, actualMeasuredRows: pids.size * 4,
    actualRawWorkloadResults: rawMeasurements, actualFailedFrozenControls: failedControls,
    actualIndependentlyRecomputedOutcome: outcome.status,
    actualBudgetPermanentlyClosedConsumedAuthorizations: 1,
    actualNativeCaseClrOrMvidDirectlySampled: false,
    actualWholeSdkRuntimeSourceOrImageClosureSupplied: false,
    actualNoBenchmarkOrBuildExecutedByAudit: true
}));
