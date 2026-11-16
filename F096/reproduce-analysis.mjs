import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [root, option] = process.argv.slice(2);
assert(root && path.isAbsolute(root) && (!option || option === '--verify'));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const emit = (name, value, text = false) =>
{
    const content = text ? value : JSON.stringify(value, null, 2) + '\n';
    if (option === '--verify')
    {
        assert.equal(fs.readFileSync(path.join(root, name), 'utf8'), content, `Recorded audit differs:${name}`);
    }
    else
    {
        fs.writeFileSync(path.join(root, name), content);
    }
};
const close = (actual, expected, label) =>
{
    assert(Number.isFinite(actual) && Number.isFinite(expected), label);
    assert(Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), label);
};
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const operations = ['Invoke', 'InvokeVoid', 'Constructor', 'Get', 'Set'];
const policies = ['Finite', 'Infinite'];
const replies = ['Inline', 'Deferred'];
const expected = operations.flatMap(operation => policies.flatMap(policy => replies.map(reply => `${operation}/${policy}/${reply}`))).sort();
const manifest = read(path.join(root, 'before-manifest.json'));
assert.equal(manifest.source_revision, baseline);
assert.equal(manifest.variant, 'before');
const budget = read(path.join(root, 'measurement-budget.json'));
assert.deepEqual([budget.maximumComparisons, budget.startedComparisons, budget.completedComparisons,
    budget.startedOriginalProfileSweeps, budget.completedOriginalProfileSweeps, budget.closed, budget.sourceCandidate],
    [3, 0, 0, 1, 1, true, null]);
const sources = read(path.join(root, 'producer-source-copies.json'));
assert.equal(sources.length, 13);
assert.equal(new Set(sources.map(row => row.path)).size, 13);
for (const source of sources)
{
    const file = path.join(root, source.source);
    assert.equal(hash(file), source.sha256);
    assert.equal(source.baseline, baseline);
    assert.equal(source.currentDefault, 'b38e2847d9cda5fbba26177354ed11ede3f7dbfe');
    const canonical = Buffer.from(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), 'utf8');
    const gitBlob = crypto.createHash('sha1').update(Buffer.from(`blob ${canonical.length}\0`)).update(canonical).digest('hex');
    assert.equal(gitBlob, source.baselineBlob, `Canonical Git source identity:${source.path}`);
    assert.equal(source.currentDefaultBlob, source.baselineBlob);
    assert.equal(source.workingCanonicalBlob, source.baselineBlob);
}
const owner = sources.find(row => row.path.endsWith('/JSObjectReferenceExtensions.cs'));
assert.equal(owner.sha256, manifest.target_source_sha256);
assert.equal(hash(path.join(root, 'source-before', 'JSObjectReferenceExtensions.cs')), owner.sha256);
const pdbs = [];
for (const source of sources.filter(row => row.path.includes('/src/') && row.path.endsWith('.cs')))
{
    const name = path.basename(source.path, '.cs');
    const proof = read(path.join(root, `owner-${name}-pdb-before.json`));
    assert(proof.verified && proof.document.endsWith(`${name}.cs`));
    assert.equal(proof.actual_pdb_document_sha256, source.sha256);
    assert.equal(proof.source_sha256, source.sha256);
    pdbs.push({ file: `${name}.cs`, ...proof });
}
for (const name of ['Program', 'RuntimeBoundary', 'TimeoutBenchmark', 'TimeoutProbe'])
{
    const proof = read(path.join(root, `harness-${name}-pdb-before.json`));
    const actual = hash(path.join(root, 'harness', `${name}.cs`));
    assert(proof.verified && proof.document.endsWith(`${name}.cs`));
    assert.equal(proof.actual_pdb_document_sha256, actual);
    assert.equal(proof.source_sha256, actual);
    pdbs.push({ file: `${name}.cs`, ...proof });
}
assert.equal(pdbs.length, 12);
const initialRoot = path.join(root, 'preparation', 'initial-harness');
const initial = read(path.join(initialRoot, 'source-and-binary-identities.json'));
assert.equal(initial.sources.length, 5);
for (const source of initial.sources)
{
    assert.equal(hash(path.join(initialRoot, source.file)), source.sha256);
    if (source.file.endsWith('.cs'))
    {
        const proof = read(path.join(initialRoot, source.file.replace('.cs', '-pdb.json')));
        assert(proof.verified);
        assert.equal(proof.actual_pdb_document_sha256, source.sha256);
        assert.equal(proof.source_sha256, source.sha256);
    }
}
const closure = read(path.join(root, 'execution-closure.json'));
assert.equal(closure.type, 'original-only-no-source-comparison');
assert.equal(closure.copied_files, 62);
assert.equal(closure.before.length, 62);
assert.equal(new Set(closure.before.map(row => row.file)).size, 62);
assert.equal(closure.runtime_assets, 20);
assert.equal(closure.runtimeAssets.length, 20);
for (const asset of closure.runtimeAssets)
{
    assert.equal(closure.before.find(row => row.file === asset.copied)?.sha256, asset.sha256);
}
for (const [file, field] of [
    ['Microsoft.JSInterop.dll', 'target_assembly_sha256'], ['AutoPerf.Benchmarks.dll', 'benchmark_assembly_sha256'],
    ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtime_configuration_sha256'], ['AutoPerf.Benchmarks.deps.json', 'dependency_configuration_sha256']
])
{
    assert.equal(closure.before.find(row => row.file === file)?.sha256, manifest[field]);
}
const testAudit = read(path.join(root, 'actual-test-audit.json'));
assert.deepEqual([testAudit.expectedCount, testAudit.actualCount, testAudit.skipped, testAudit.rows.length], [18, 18, 0, 18]);
assert.equal(new Set(testAudit.rows.map(row => row.name)).size, 18);
assert(testAudit.rows.every(row => row.outcome === 'Passed' && !/^00:00:00(?:\.0+)?$/.test(row.duration)));
const probe = read(path.join(root, 'verify-before', 'states', 'original-contract-resource-probe.json'));
const initialProbe = read(path.join(root, 'verification', 'initial', 'states', 'original-contract-resource-probe.json'));
for (const value of [initialProbe, probe])
{
    assert.equal(value.MissingDeadlines, 9);
    assert.equal(value.Deadlines.length, 15);
    for (const operation of operations)
    {
        const rows = value.Deadlines.filter(row => row.Operation === operation);
        assert.deepEqual(rows.map(row => row.Repetition), [1, 2, 3]);
        for (const row of rows)
        {
            const expectedCancellation = ['Invoke', 'InvokeVoid'].includes(operation);
            assert.equal(row.Test, `FiniteTimeout_CancelsPending${operation}`);
            assert(row.PendingAtDispatch && row.SentinelTimerFired && row.ElapsedMilliseconds >= 100);
            assert.equal(row.CanceledBeforeReply, expectedCancellation);
            assert.equal(row.ActualCancellationTokenMatched, expectedCancellation);
            assert.equal(row.LateReplyPreservedCancellation, expectedCancellation);
            assert.equal(row.ValueAfterCleanupReply, !expectedCancellation);
            assert.equal(row.ContractSatisfied, expectedCancellation);
        }
    }
    assert.equal(value.Timers.length, 10);
    for (const operation of operations)
    {
        for (const policy of policies)
        {
            const rows = value.Timers.filter(row => row.Operation === operation && row.Policy === policy);
            assert.equal(rows.length, 1);
            const row = rows[0];
            assert(row.PendingAtDispatch);
            assert.equal(row.Pending - row.Before, policy === 'Finite' && ['Invoke', 'InvokeVoid'].includes(operation) ? 1 : 0);
            assert.equal(row.After, row.Before);
            assert.equal(row.CanBeCanceled, policy === 'Finite');
            assert.equal(row.TokenIsNone, policy === 'Infinite');
        }
    }
    assert.equal(value.Errors.length, 25);
    for (const operation of operations)
    {
        for (const [kind, type, parameter] of [
            ['NullObject', 'ArgumentNullException', 'jsObjectReference'],
            ['InvalidTimeout', 'ArgumentOutOfRangeException', 'delay'],
            ['DisposedObject', 'ObjectDisposedException', null],
            ['SynchronousTransportFailure', 'DispatchFailure', null],
            ['AsyncPublicProtocolFailure', 'JSException', null]
        ])
        {
            const rows = value.Errors.filter(row => row.Test === `${kind}_${operation}`);
            assert.equal(rows.length, 1);
            const row = rows[0];
            const synchronous = kind !== 'AsyncPublicProtocolFailure' && !['Invoke', 'InvokeVoid'].includes(operation)
                && !(['DisposedObject', 'SynchronousTransportFailure'].includes(kind) && operation === 'Set');
            assert.equal(row.ExceptionType, type);
            assert.equal(row.ParameterName, parameter);
            assert.equal(row.Timing, synchronous ? 'synchronous' : 'returned-task');
        }
    }
    assert.equal(value.Resources.length, 10);
    assert(value.Resources.every(row => row.Calls === 5000 && row.Checksum === 3655000 && row.AllocatedBytes > 0));
    assert.deepEqual([value.PoolingControl.actualResetSucceeded, value.PoolingControl.actualSecondRuntimeCallCanceled,
        value.PoolingControl.previousOriginalTokenCanceled, value.PoolingControl.previousPooledTokenCanceled,
        value.PoolingControl.pooledTokenIdentityReused], [true, true, false, true, true]);
}
assert.equal(probe.InfiniteDefaultControls.length, 5);
assert.deepEqual(probe.InfiniteDefaultControls.map(row => row.operation), operations);
assert(probe.InfiniteDefaultControls.every(row => row.defaultTaskCanceledBeforeReply && row.infiniteTaskPendingAfterDefaultDeadline
    && row.infiniteTokenIsNone && row.lateReplyPreservedDefaultCancellation && row.infiniteCompletedFromPublicReply));
const gateExecution = read(path.join(root, 'verify-before-command.json'));
assert.deepEqual([gateExecution.actualExitCode, gateExecution.expectedExitCode], [1, 1]);
const folder = path.join(root, 'measurements', 'original-profiles');
const reports = fs.readdirSync(path.join(folder, 'results')).filter(file => file.includes('full') && file.endsWith('.json'));
assert.equal(reports.length, 1);
const report = read(path.join(folder, 'results', reports[0]));
const keyFromParameters = parameters =>
{
    const values = Object.fromEntries(new URLSearchParams(parameters));
    assert.deepEqual(Object.keys(values).sort(), ['Operation', 'Policy', 'Reply']);
    return `${values.Operation}/${values.Policy}/${values.Reply}`;
};
assert.deepEqual(report.Benchmarks.map(row => keyFromParameters(row.Parameters)).sort(), expected);
assert.equal(report.Benchmarks.length, 20);
const environment = report.HostEnvironmentInfo;
assert.deepEqual([environment.BenchmarkDotNetVersion, environment.RuntimeVersion, environment.Architecture,
    environment.Configuration, environment.DotNetCliVersion],
    ['0.13.0', '.NET 12.0.0 (12.0.26.56305)', 'X64', 'RELEASE', '12.0.100-alpha.1.26557.102']);
const runtime = read(path.join(folder, 'states', 'runtime.json'));
assert.equal(runtime.corelibInformationalVersion, '12.0.0-alpha.1.26562.105+dfd6ac738610ea05f42e704be82b386e71052e12');
assert.equal(runtime.ownerSha256, manifest.target_assembly_sha256);
assert.equal(runtime.harnessSha256, manifest.benchmark_assembly_sha256);
assert(runtime.serverGc && runtime.architecture === 'X64' && runtime.processId > 0);
const verifyRuntime = read(path.join(root, 'verify-before', 'states', 'runtime.json'));
const initialRuntime = read(path.join(root, 'verification', 'initial', 'states', 'runtime.json'));
assert.equal(verifyRuntime.ownerSha256, runtime.ownerSha256);
assert.equal(verifyRuntime.harnessSha256, runtime.harnessSha256);
assert.equal(verifyRuntime.corelibSha256, runtime.corelibSha256);
assert.equal(initialRuntime.ownerSha256, initial.ownerSha256);
assert.equal(initialRuntime.harnessSha256, initial.harnessSha256);
const execution = read(path.join(root, 'execution-original-profiles.json'));
assert.equal(execution.exitCode, 0);
assert.equal(execution.sourceComparisons, 0);
assert.equal(execution.sdk, environment.DotNetCliVersion);
for (const [flag, expectedValue] of [['--filter', '*TimeoutBenchmark*'], ['--job', 'Short'], ['--warmupCount', '3'],
    ['--iterationCount', '8'], ['--iterationTime', '100'], ['--outliers', 'DontRemove']])
{
    assert.equal(execution.arguments[execution.arguments.indexOf(flag) + 1], expectedValue);
}
assert(execution.arguments.includes('--inProcess'));
const stateFiles = fs.readdirSync(path.join(folder, 'states')).filter(file => file.endsWith('.json'));
assert.equal(stateFiles.length, 21);
const states = stateFiles.filter(file => file !== 'runtime.json').map(file => ({ file, value: read(path.join(folder, 'states', file)) }));
assert.deepEqual(states.map(row => `${row.value.operation}/${row.value.policy}/${row.value.reply}`).sort(), expected);
const consoleText = fs.readFileSync(path.join(folder, 'console.log'), 'utf8').replace(/\r\n/g, '\n');
const sections = consoleText.split(/^\/\/ Benchmark:\s*/m).slice(1);
assert.equal(sections.length, 20);
const receipts = new Map();
const setupReceipts = [];
for (const section of sections)
{
    const identity = /^TimeoutBenchmark\.Invoke:[^\n]+\[Operation=(\w+), Policy=(\w+), Reply=(\w+)\]/.exec(section);
    assert(identity);
    const [, operation, policy, reply] = identity;
    const key = `${operation}/${policy}/${reply}`;
    assert(!receipts.has(key) && section.includes('GC=Concurrent Server'));
    const matches = [...section.matchAll(/^AUTOPERF_F096_SETUP (\{[^\n]+\})$/gm)];
    assert.equal(matches.length, 1);
    const setup = JSON.parse(matches[0][1]);
    const state = states.filter(row => `${row.value.operation}/${row.value.policy}/${row.value.reply}` === key);
    assert.equal(state.length, 1);
    assert.deepEqual(setup, state[0].value);
    assert.deepEqual([setup.actualSetupRuns, setup.dispatchCount, setup.asyncHandle, setup.targetId, setup.checksum], [2, 2, 3, 47, 731]);
    assert.equal(setup.ownerSha256, manifest.target_assembly_sha256);
    assert.equal(setup.harnessSha256, manifest.benchmark_assembly_sha256);
    assert.equal(setup.processId, runtime.processId);
    assert.equal(setup.actualReferenceType, 'Microsoft.JSInterop.Implementation.JSObjectReference');
    assert.equal(setup.callType, operation === 'Constructor' ? 'ConstructorCall' : operation === 'Get' ? 'GetValue' : operation === 'Set' ? 'SetValue' : 'FunctionCall');
    assert.equal(setup.resultType, operation === 'Constructor' ? 'JSObjectReference' : operation === 'InvokeVoid' ? 'JSVoidResult' : 'Default');
    assert.equal(setup.argsJson, operation === 'Get' ? '[]' : operation === 'Set' ? '["assigned-value"]' : '[123,"actual-argument"]');
    setupReceipts.push({ file: state[0].file, ...setup });
    const samples = stage => [...section.matchAll(new RegExp(`^Workload${stage}\\s+(\\d+):\\s+(\\d+) op,\\s+([\\d.]+) ns,`, 'gm'))]
        .map(match => ({ index: Number(match[1]), operations: Number(match[2]), nanoseconds: Number(match[3]) }));
    const warmups = samples('Warmup'), results = samples('Result');
    assert.deepEqual(warmups.map(row => row.index), [1, 2, 3]);
    assert.deepEqual(results.map(row => row.index), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert([...warmups, ...results].every(row => row.operations > 0 && row.nanoseconds > 0));
    const gcMatches = [...section.matchAll(/^GC:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/gm)];
    assert.equal(gcMatches.length, 1);
    const gc = { gen0: Number(gcMatches[0][1]), gen1: Number(gcMatches[0][2]), gen2: Number(gcMatches[0][3]),
        totalAllocatedBytes: Number(gcMatches[0][4]), totalOperations: Number(gcMatches[0][5]) };
    assert(gc.totalAllocatedBytes > 0 && gc.totalOperations > 0);
    receipts.set(key, { operation, policy, reply, warmups, results, gc, actualOwnerSha256: setup.ownerSha256,
        actualHarnessSha256: setup.harnessSha256, actualProcessId: setup.processId });
}
const outcomes = [];
for (const row of report.Benchmarks)
{
    assert.equal(row.Method, 'Invoke');
    const key = keyFromParameters(row.Parameters);
    const receipt = receipts.get(key);
    assert(receipt);
    const measurements = row.Measurements.filter(value => value.IterationMode === 'Workload' && value.IterationStage === 'Result');
    assert.equal(row.Statistics.N, 8);
    assert.equal(measurements.length, 8);
    assert.deepEqual(measurements.map(value => value.IterationIndex), [1, 2, 3, 4, 5, 6, 7, 8]);
    measurements.forEach((value, index) =>
    {
        assert.equal(value.LaunchIndex, 1);
        assert.equal(value.Operations, receipt.results[index].operations);
        assert.equal(value.Nanoseconds, receipt.results[index].nanoseconds);
    });
    const values = measurements.map(value => value.Nanoseconds / value.Operations);
    const average = mean(values);
    const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / 7;
    assert.equal(row.Statistics.OriginalValues.length, 8);
    values.forEach((value, index) => close(row.Statistics.OriginalValues[index], value, 'Actual result sample'));
    close(row.Statistics.Mean, average, 'Actual mean');
    close(row.Statistics.Variance, variance, 'Actual variance');
    close(row.Statistics.StandardDeviation, Math.sqrt(variance), 'Actual SD');
    close(row.Statistics.StandardError, Math.sqrt(variance / 8), 'Actual SE');
    close(row.Statistics.Min, Math.min(...values), 'Actual min');
    close(row.Statistics.Max, Math.max(...values), 'Actual max');
    const sorted = [...values].sort((a, b) => a - b);
    close(row.Statistics.Median, (sorted[3] + sorted[4]) / 2, 'Actual median');
    const ci = row.Statistics.ConfidenceInterval;
    assert.equal(ci.N, 8);
    close(ci.Mean, average, 'CI mean');
    close(ci.StandardError, row.Statistics.StandardError, 'CI SE');
    close(ci.Lower, ci.Mean - ci.Margin, 'Reported CI lower arithmetic');
    close(ci.Upper, ci.Mean + ci.Margin, 'Reported CI upper arithmetic');
    assert.equal(row.Memory.Gen0Collections, receipt.gc.gen0);
    assert.equal(row.Memory.Gen1Collections, receipt.gc.gen1);
    assert.equal(row.Memory.Gen2Collections, receipt.gc.gen2);
    assert.equal(row.Memory.TotalOperations, receipt.gc.totalOperations);
    assert.equal(row.Memory.BytesAllocatedPerOperation, Math.round(receipt.gc.totalAllocatedBytes / receipt.gc.totalOperations));
    outcomes.push({ operation: receipt.operation, policy: receipt.policy, reply: receipt.reply,
        meanNs: average, medianNs: row.Statistics.Median, cvPercent: 100 * row.Statistics.StandardDeviation / average,
        bytesPerOperation: row.Memory.BytesAllocatedPerOperation,
        rawGcBytesPerOperation: receipt.gc.totalAllocatedBytes / receipt.gc.totalOperations, samplesNs: values, raw: row });
}
const resourceDeltas = operations.map(operation =>
{
    const finite = probe.Resources.find(row => row.Operation === operation && row.Policy === 'Finite');
    const infinite = probe.Resources.find(row => row.Operation === operation && row.Policy === 'Infinite');
    return { operation, calls: 5000, finiteBytesPerCall: finite.AllocatedBytes / finite.Calls,
        infiniteBytesPerCall: infinite.AllocatedBytes / infinite.Calls,
        differenceBytesPerCall: (finite.AllocatedBytes - infinite.AllocatedBytes) / 5000 };
});
const summary = {
    candidate: 'F096', disposition: 'rejected', performanceSourceCandidate: null, performanceSourceComparisons: 0,
    originalProfileSweeps: 1, actualOutcomes: 20, actualResultSamples: 160, actualWarmups: 60, actualSetupReceipts: 20,
    sourceDocuments: 13, actualOwnerProducerHarnessPdbDocuments: 12, initialHarnessPdbDocuments: 4,
    recordedOriginalClosureFiles: 62, recordedDeclaredRuntimeAssets: 20, actualOwningTests: 18,
    initialMissingManagedDeadlineRows: 9, frozenMissingManagedDeadlineRows: 9, finiteRowsPerCheck: 15,
    originalFinitePositiveDeadlineRowsPerCheck: 6, actualInfiniteDefaultControlPairs: 5,
    actualErrorTimingRowsPerCheck: 25, actualTimerRowsPerCheck: 10, actualAllocationBatchesPerCheck: 10,
    maximumCvPercent: Math.max(...outcomes.map(row => row.cvPercent)), environment, actualRuntime: runtime,
    actualResourceDeltas: resourceDeltas, verifiedPerformanceGain: null, shippingChange: false,
    boundary: 'Managed JSRuntime/object-reference converter and actual implementation, real BCL CTS timers and public protocol completion. No actual browser/JS execution or transport validation.',
    limitations: ['Different finite/infinity deadline contracts are not optimization A/B variants.',
        'Generic pooled token reuse changes a previous successful public consumer token; no restricted-consumer pool was implemented or measured.',
        'Constructor/get/set finite deadlines remain incorrect in the observed original managed boundary; no repair or repair speedup is claimed.',
        'No independent confidence-distribution quantile computation.',
        'Public package omits DLL/PDB bytes; portable audit verifies actual recorded proofs/closure, not omitted binary bytes.']
};
emit('raw-outcomes.json', outcomes);
emit('console-measurement-receipts.json', [...receipts.values()]);
emit('setup-correctness.json', setupReceipts);
emit('resource-deltas.json', resourceDeltas);
emit('measurement-audit.json', summary);
const lines = [
    '# F096 original managed interop pressure - not an optimization comparison', '',
    'Original finite and infinity policies are different documented cancellation contracts. No source proposal is measured or justified. Every actual outcome is retained.', '',
    '| Operation | Original deadline | Public reply | Mean ns | Median ns | CV % | Managed B/op |',
    '|---|---|---|---:|---:|---:|---:|'
];
for (const row of outcomes)
{
    lines.push(`| ${row.operation} | ${row.policy} | ${row.reply} | ${row.meanNs.toFixed(3)} | ${row.medianNs.toFixed(3)} | ${row.cvPercent.toFixed(2)} | ${row.bytesPerOperation} |`);
}
lines.push('', '20 actual outcomes,160 actual retained results,60 actual warmups and20 source/hash/PID-linked actual setup receipts. Requested100ms iterations,3 warmups/8 retained results,one in-process original-only sweep; DontRemove. Maximum CV is retained, not explained causally or discarded.',
    '', 'The warm5000-call batches show approximately400 incremental bytes per finite request, including the actual runtime cancellation-registration boundary, not just CTS size. Infinity already bypasses the CTS. Timed construction/get/set complete from harness-owned public replies before a deadline; they do not repair or validate the failing pending deadline.', '');
emit('comparison.md', lines.join('\n'), true);
console.log(JSON.stringify(summary, null, 2));
