import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const [root, option] = process.argv.slice(2);
assert(root && path.isAbsolute(root) && (!option || option === '--verify'));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const at = (...parts) => path.join(root, ...parts);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const emit = (name, value, text = false) =>
{
    const content = text ? value : JSON.stringify(value, null, 2) + '\n';
    if (option === '--verify')
    {
        assert.equal(fs.readFileSync(at(name), 'utf8'), content, `Nonmutating actual audit differs:${name}`);
    }
    else
    {
        fs.writeFileSync(at(name), content);
    }
};
const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const median = values =>
{
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
};
const close = (actual, expected, label) =>
{
    assert(Number.isFinite(actual) && Number.isFinite(expected), label);
    assert(Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), label);
};
const operations = ['Invoke', 'InvokeVoid', 'Constructor', 'Get', 'Set'];
const policies = ['Finite', 'Unconfigured'];
const workloads = ['WindowInline', 'WindowDeferred', 'ObjectInline', 'ObjectDeferred', 'Overlap8'];
const expected = operations.flatMap(operation => policies.flatMap(policy => workloads.map(workload => `${operation}/${policy}/${workload}`))).sort();
const key = row => `${row.operation}/${row.policy}/${row.workload}`;
const fromParameters = parameters =>
{
    const values = Object.fromEntries(new URLSearchParams(parameters));
    assert.deepEqual(Object.keys(values).sort(), ['Operation', 'Policy', 'Workload']);
    return { operation: values.Operation, policy: values.Policy, workload: values.Workload };
};
const budget = read(at('measurement-budget.json'));
assert.deepEqual([budget.maximumComparisons, budget.startedComparisons, budget.completedComparisons, budget.closed], [3, 3, 3, true]);
assert.deepEqual(budget.history.map(row => [row.round, row.order, row.status]),
    [[1, ['before', 'after'], 'completed'], [2, ['after', 'before'], 'completed'], [3, ['before', 'after'], 'completed']]);
const executions = read(at('execution.json'));
assert.deepEqual(executions.map(row => row.label),
    ['round-1-before', 'round-1-after', 'round-2-after', 'round-2-before', 'round-3-before', 'round-3-after']);
const manifests = Object.fromEntries(['before', 'after'].map(variant => [variant, read(at(`${variant}-manifest.json`))]));
const producers = read(at('producer-source-copies.json'));
assert.equal(producers.length, 14);
for (const row of producers)
{
    assert(row.equalityVerified);
    assert.equal(row.baselineGitBlob, row.currentDefaultGitBlob);
    assert.equal(row.baselineGitBlob, row.workingGitBlob);
    assert.equal(row.currentDefaultRevision, 'b38e2847d9cda5fbba26177354ed11ede3f7dbfe');
    const source = at(...row.snapshot.split('\\'));
    assert.equal(hash(source), row.sha256);
    const canonical = Buffer.from(fs.readFileSync(source, 'utf8').replace(/\r\n/g, '\n'));
    assert.equal(crypto.createHash('sha1').update(`blob ${canonical.length}\0`).update(canonical).digest('hex'), row.baselineGitBlob);
}
const ownerSources = producers.filter(row => row.path.includes('/src/') && row.path.endsWith('.cs'));
assert.equal(ownerSources.length, 9);
const latestSources = read(at('prepublication-current-default-identity.json'));
assert.equal(latestSources.length, 14);
assert(latestSources.every(row => row.identical && row.currentDefault === 'd7870e7ec8da214eb96f96f5512aad0d89bfef11'
    && row.currentDefaultGitBlob === row.baselineGitBlob));
const harnessSources = ['Program', 'RuntimeBoundary', 'CorelibEvidence', 'RuntimeProbe', 'DefaultTimeoutBenchmark'];
const closures = {};
for (const variant of ['before', 'after'])
{
    const manifest = manifests[variant];
    assert.equal(manifest.source_revision, '37e809ead5824bc753a1c3d56f11615bdb1296c5');
    assert.equal(manifest.target_source_sha256, hash(at(`source-${variant}`, 'JSRuntime.cs')));
    assert.equal(manifest.benchmark_assembly_sha256, 'AD21DF0F89338DAED964539510C4B4ABC1F0E1A0747DE54AFB0294E332D42AD1');
    const commands = read(at(`pdb-${variant}-commands.json`));
    assert.equal(commands.length, 14);
    assert(commands.every(row => row.exitCode === 0));
    for (const name of harnessSources)
    {
        const proof = read(at(`harness-${name}-pdb-${variant}.json`));
        assert(proof.verified && proof.document.endsWith(`${name}.cs`));
        assert.equal(proof.source_sha256, hash(at('harness', `${name}.cs`)));
        assert.equal(proof.actual_pdb_document_sha256, proof.source_sha256);
    }
    for (const source of ownerSources)
    {
        const name = path.posix.basename(source.path);
        const proof = read(at(`owner-${name.replace('.cs', '')}-pdb-${variant}.json`));
        assert(proof.verified && proof.document.endsWith(name));
        const file = name === 'JSRuntime.cs' ? at(`source-${variant}`, name) : at(...source.snapshot.split('\\'));
        assert.equal(proof.source_sha256, hash(file));
        assert.equal(proof.actual_pdb_document_sha256, proof.source_sha256);
    }
    closures[variant] = read(at(`execution-closure-${variant}.json`));
    assert.deepEqual([closures[variant].copiedFiles, closures[variant].declaredRuntimeAssets], [62, 20]);
    for (const [file, field] of [['Microsoft.JSInterop.dll', 'target_assembly_sha256'], ['AutoPerf.Benchmarks.dll', 'benchmark_assembly_sha256'],
        ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtime_configuration_sha256'], ['AutoPerf.Benchmarks.deps.json', 'dependency_configuration_sha256']])
    {
        assert.equal(closures[variant].files.find(row => row.file === file)?.sha256, manifest[field]);
    }
}
assert.deepEqual(closures.before.files.map(row => row.file), closures.after.files.map(row => row.file));
assert.deepEqual(closures.before.files.filter((row, index) => row.sha256 !== closures.after.files[index].sha256).map(row => row.file).sort(),
    ['Microsoft.JSInterop.dll', 'Microsoft.JSInterop.pdb']);
for (const field of ['benchmark_assembly_sha256', 'runtime_configuration_sha256', 'dependency_configuration_sha256'])
{
    assert.equal(manifests.before[field], manifests.after[field]);
}
assert.notEqual(manifests.before.target_assembly_sha256, manifests.after.target_assembly_sha256);
assert.equal(manifests.before.target_source_sha256, 'DA2D13AEC5522330EEC9CBFCD8C904465DA019ED3DDDF0AD7AA38E4E2D371E04');
assert.equal(manifests.after.target_source_sha256, '85BA24A3146FED0B61C66DA20477E7F73B11ED56B15F383EB5E5C1602904C830');
const sourceCommit = fs.readFileSync(at('source-commit.txt'), 'utf8').trim();
const sourceComparison = read(at('committed-source-comparison.json'));
assert.equal(sourceComparison.merge_base_commit.sha, manifests.before.source_revision);
assert.equal(sourceComparison.commits.length, 1);
assert.equal(sourceComparison.commits[0].sha, sourceCommit);
assert.equal(sourceComparison.files.length, 2);
const sourceIdentities = read(at('committed-source-identities.json'));
assert.equal(sourceIdentities.length, 2);
for (const row of sourceIdentities)
{
    assert.equal(row.sourceCommit, sourceCommit);
    assert(row.substantiveBytesIdentical && row.onlyPossibleGitCrLfToLfCanonicalization);
    const measured = at(...row.measuredSource.split('\\')), canonical = at(row.canonicalSource);
    assert.equal(hash(measured), row.measuredSourceSha256);
    assert.equal(hash(canonical), row.canonicalSourceSha256);
    const bytes = fs.readFileSync(canonical);
    assert(bytes.equals(Buffer.from(fs.readFileSync(measured, 'utf8').replace(/\r\n/g, '\n'))));
    assert.equal(crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), row.remoteGitBlob);
    const file = sourceComparison.files.find(file => file.filename === row.path);
    assert(file);
    assert.equal(file.sha, row.remoteGitBlob);
    assert.deepEqual([file.additions, file.deletions], row.path.endsWith('/src/JSRuntime.cs') ? [54, 8] : [132, 0]);
}
assert(read(at('source-branch-verification.json')).exactRemoteSourceRefVerified);
const probes = Object.fromEntries(['frozen-baseline-reuse-red', 'frozen-prototype1-reuse-red', 'frozen-candidate-reuse-green'].map(phase =>
    [phase, read(at('verification', phase, 'states', 'default-timeout-contract-resources.json'))]));
const observationKeys = operations.flatMap(operation => [
    ...[1, 2, 3].map(repeat => `DefaultDeadline_CancelsPending${operation}/${repeat}`),
    `DefaultVsExplicitNone_${operation}/`, `PendingDefault_${operation}_Infinite/`, `PendingDefault_${operation}_Unconfigured/`,
    `ZeroDefault_NoDispatchAfterCompleted${operation}/`, `EarlierDeadlineCannotCancelLaterInfinite_${operation}/`, `CanceledDefaultTokenNeverReused_${operation}/`
]).concat(['OverlappingDefaults_IndependentDeadlines/', 'DefaultDeadline_CoversActualSerialization/', 'InvalidDefaultTimeout/',
    'ActualSerializationGetterFailure/', 'SynchronousPublicTransportFailure/', 'ActualPublicProtocolFailure/',
    'Dispose_PreservesPendingAndPostDisposeBehavior/', 'CompletedDefaultRuntime_IsCollectable/']).sort();
assert.equal(observationKeys.length, 53);
const runtimeVersion = '12.0.0-alpha.1.26562.105+dfd6ac738610ea05f42e704be82b386e71052e12';
for (const [phase, probe] of Object.entries(probes))
{
    const expectedReuse = phase === 'frozen-candidate-reuse-green';
    const command = read(at(`${phase}-command.json`));
    assert.deepEqual([command.expectedExitCode, command.actualExitCode], expectedReuse ? [0, 0] : [1, 1]);
    assert.equal(probe.ReuseObjectivePassed, expectedReuse);
    assert.deepEqual(probe.Observations.map(row => `${row.Name}/${row.Detail.repeat ?? ''}`).sort(), observationKeys);
    const original = probes['frozen-baseline-reuse-red'];
    for (const row of probe.Observations.filter(row => row.Name !== 'Dispose_PreservesPendingAndPostDisposeBehavior'))
    {
        const other = original.Observations.find(other => other.Name === row.Name && other.Detail.repeat === row.Detail.repeat);
        assert.deepEqual(row, other, `Actual original semantic observable changed:${row.Name}`);
    }
    assert.equal(probe.Summary.semanticObservations, 53);
    assert.deepEqual([probe.Resources.length, probe.ColdResources.length], [15, 15]);
    assert.equal(probe.Summary.harnessSha256, manifests.before.benchmark_assembly_sha256);
    for (const rows of [probe.Resources, probe.ColdResources])
    {
        assert.deepEqual(rows.map(row => `${row.Operation}/${row.Policy}`).sort(),
            operations.flatMap(operation => ['Finite', 'Unconfigured', 'Infinite'].map(policy => `${operation}/${policy}`)).sort());
    }
    const disposal = probe.Observations.find(row => row.Name === 'Dispose_PreservesPendingAndPostDisposeBehavior').Detail;
    assert(disposal.pendingSurvivedDispose);
    assert.equal(disposal.laterResult, 731);
    assert.equal(disposal.activeTimersBefore, disposal.activeTimersAfterWarmCalls);
    assert.equal(disposal.reuseShutdownResourceObjective, phase !== 'frozen-baseline-reuse-red');
    assert.equal(disposal.reuseShutdownResourceObjective, disposal.afterDisposeBytesPerCall - disposal.warmBytesPerCall >= 200);
    for (const row of [...probe.Resources, ...probe.ColdResources])
    {
        assert(operations.includes(row.Operation) && ['Finite', 'Unconfigured', 'Infinite'].includes(row.Policy));
        assert.equal(row.Calls, probe.Resources.includes(row) ? 5000 : 20);
        assert.equal(row.Checksum, row.Calls * 731);
        close(row.BytesPerCall, row.Bytes / row.Calls, 'Actual resource row arithmetic');
    }
    const il = read(at('verification', phase, 'states', 'actual-corelib-reset-and-zero-il.json'));
    assert.equal(il.informationalVersion, runtimeVersion);
    assert.equal(il.sha256, '0CEBA028A838AFF170CFF9D03570B34F9F044D6A9597974088E58B9834DF74E4');
    assert.equal(il.reset.methodBodySha256, 'CFADE21083EE15F0B6A1F8DCFFE3CA176D31E30F449CD10CA368133CA4662C86');
    const reset = il.reset.rows;
    assert.equal(reset.find(row => row.Offset === 9)?.Operand, 'System.Threading.CancellationTokenSource::States _state');
    assert.equal(reset.find(row => row.Offset === 14)?.Opcode, 'brtrue.s');
    assert(reset.find(row => row.Offset === 46)?.Operand.endsWith('Change(UInt32, UInt32)'));
    assert(reset.find(row => row.Offset === 54)?.Operand.endsWith('Boolean _everQueued'));
    assert.equal(reset.find(row => row.Offset === 68)?.Opcode, 'brfalse.s');
    assert(reset.find(row => row.Offset === 87)?.Operand.endsWith('UnregisterAll()'));
    assert.equal(reset.find(row => row.Offset === 92)?.Opcode, 'ldc.i4.1');
    assert.equal(reset.find(row => row.Offset === 94)?.Opcode, 'ldc.i4.0');
    assert(il.constructorInitializer.rows.some(row => row.Operand.includes('System.TimeSpan Zero')));
}
assert.equal(probes['frozen-baseline-reuse-red'].Summary.ownerSha256, manifests.before.target_assembly_sha256);
assert.equal(probes['frozen-candidate-reuse-green'].Summary.ownerSha256, manifests.after.target_assembly_sha256);
assert.equal(probes['frozen-prototype1-reuse-red'].Summary.ownerSha256, '054F1ED9DD16A6F1359C032D04FA7DAA5A4DB5DEE9070E9D61FCE231EB7BFA6A');
const originalProbe = probes['frozen-baseline-reuse-red'];
const selectedProbe = probes['frozen-candidate-reuse-green'];
const resources = operations.map(operation =>
{
    const rows = Object.fromEntries(Object.entries(probes).map(([phase, probe]) =>
        [phase, Object.fromEntries(probe.Resources.filter(row => row.Operation === operation).map(row => [row.Policy, row.BytesPerCall]))]));
    const before = rows['frozen-baseline-reuse-red'], first = rows['frozen-prototype1-reuse-red'], after = rows['frozen-candidate-reuse-green'];
    close(before.Finite - before.Unconfigured, 400, 'Original actual default overhead');
    close(first.Finite - first.Unconfigured, 112, 'Preserved failed first-candidate overhead');
    close(after.Finite - after.Unconfigured, 96, 'Unchanged <100B allocation goal');
    close(before.Finite - first.Finite, 288, 'First private cache actual saving');
    close(before.Finite - after.Finite, 352, 'Final actual finite saving');
    close(before.Unconfigured - after.Unconfigured, 48, 'Separate changed-control actual saving');
    return { operation, beforeFiniteBytes: before.Finite, firstFiniteBytes: first.Finite, afterFiniteBytes: after.Finite,
        beforeUnconfiguredBytes: before.Unconfigured, afterUnconfiguredBytes: after.Unconfigured,
        beforeInfiniteBytes: before.Infinite, afterInfiniteBytes: after.Infinite, finiteSavedBytes: before.Finite - after.Finite,
        controlSavedBytes: before.Unconfigured - after.Unconfigured, finiteAllocationReductionPercent: 100 * (before.Finite - after.Finite) / before.Finite };
});
const testIdentities = read(at('test-owner-identities.json'));
assert.equal(testIdentities.originalLocalTestOwnerSha256, manifests.before.target_assembly_sha256);
assert.equal(testIdentities.proposedLocalTestOwnerSha256, manifests.after.target_assembly_sha256);
assert.equal(testIdentities.expectedTestRowsEach, 41);
const testSource = read(at('owning-tests-updated-source-pdb.json'));
assert(testSource.verified);
assert.equal(testSource.source_sha256, testIdentities.updatedTestSourceSha256);
assert.equal(testSource.actual_pdb_document_sha256, testSource.source_sha256);
for (const [phase, count] of [['before', 34], ['baseline-newtests', 40], ['baseline-tunedtests', 41], ['after', 41]])
{
    const tests = read(at(`actual-test-audit-${phase}.json`));
    assert.deepEqual([tests.expectedCount, tests.actualCount, tests.skipped], [count, count, 0]);
    assert.equal(tests.trxSha256, hash(at(...tests.source.split('\\'))));
    assert.equal(new Set(tests.rows.map(row => row.name)).size, count);
    assert(tests.rows.every(row => row.outcome === 'Passed' && row.duration !== '00:00:00'));
}
assert.deepEqual(read(at('actual-test-audit-baseline-tunedtests.json')).rows.map(row => row.name).sort(),
    read(at('actual-test-audit-after.json')).rows.map(row => row.name).sort());
assert.equal(read(at('surgical-whitespace-format-verify-command.json')).exitCode, 0);
const outcomes = [], consoleReceipts = [], setupReceipts = [], environments = [];
for (const execution of executions)
{
    const { variant, round, label } = execution;
    assert.equal(execution.exit_code, 0);
    assert.equal(execution.sdk, '12.0.100-alpha.1.26557.102');
    for (const [flag, value] of [['--filter', '*DefaultTimeoutBenchmark*'], ['--job', 'Short'], ['--warmupCount', '3'],
        ['--iterationCount', '8'], ['--iterationTime', '100'], ['--outliers', 'DontRemove']])
    {
        assert.equal(String(execution.arguments[execution.arguments.indexOf(flag) + 1]), value);
    }
    assert(execution.arguments.includes('--inProcess'));
    assert(execution.arguments[0].endsWith(`\\${variant}\\AutoPerf.Benchmarks.dll`));
    const reports = fs.readdirSync(at(label, 'results')).filter(file => file.includes('full') && file.endsWith('.json'));
    assert.equal(reports.length, 1);
    const report = read(at(label, 'results', reports[0]));
    assert.deepEqual(report.Benchmarks.map(row => key(fromParameters(row.Parameters))).sort(), expected);
    const env = report.HostEnvironmentInfo;
    assert.deepEqual([env.BenchmarkDotNetVersion, env.RuntimeVersion, env.Architecture, env.Configuration, env.DotNetCliVersion],
        ['0.13.0', '.NET 12.0.0 (12.0.26.56305)', 'X64', 'RELEASE', '12.0.100-alpha.1.26557.102']);
    environments.push({ label, actual: env });
    const runtime = read(at(label, 'states', 'runtime.json'));
    assert(runtime.serverGc && runtime.architecture === 'X64' && runtime.processId > 0);
    assert.equal(runtime.corelibInformationalVersion, runtimeVersion);
    assert.equal(runtime.ownerSha256, manifests[variant].target_assembly_sha256);
    assert.equal(runtime.harnessSha256, manifests[variant].benchmark_assembly_sha256);
    assert.equal(runtime.corelibSha256, '0CEBA028A838AFF170CFF9D03570B34F9F044D6A9597974088E58B9834DF74E4');
    const states = fs.readdirSync(at(label, 'states')).filter(file => file.startsWith('setup-') && file.endsWith('.json'))
        .map(file => ({ file, value: read(at(label, 'states', file)) }));
    assert.deepEqual(states.map(row => key(row.value)).sort(), expected);
    const text = fs.readFileSync(at(label, 'console.log'), 'utf8').replace(/\r\n/g, '\n');
    const sections = text.split(/^\/\/ Benchmark:\s*/m).slice(1);
    assert.equal(sections.length, 50);
    const receipts = new Map();
    for (const section of sections)
    {
        const identity = /^DefaultTimeoutBenchmark\.ActualDefaultTimeout:[^\n]+\[Operation=(\w+), Policy=(\w+), Workload=(\w+)\]/.exec(section);
        assert(identity && section.includes('GC=Concurrent Server'));
        const [, operation, policy, workload] = identity;
        const name = key({ operation, policy, workload });
        assert(!receipts.has(name));
        const setupLines = [...section.matchAll(/^AUTOPERF_F097_SETUP (\{[^\n]+\})$/gm)];
        assert.equal(setupLines.length, 1);
        const consoleSetup = JSON.parse(setupLines[0][1]);
        const state = states.find(row => key(row.value) === name);
        assert(state);
        const setup = state.value;
        const normalized = { ...consoleSetup, CallType: ({ 1: 'FunctionCall', 2: 'ConstructorCall', 3: 'GetValue', 4: 'SetValue' })[consoleSetup.CallType],
            ResultType: ({ 0: 'Default', 1: 'JSObjectReference', 2: 'JSStreamReference', 3: 'JSVoidResult' })[consoleSetup.ResultType] };
        assert.deepEqual(normalized, setup, 'Exact console/stored actual setup differs.');
        const requests = workload === 'Overlap8' ? 8 : 1;
        assert.deepEqual([setup.callsPerInvoke, setup.setupInvocations, setup.actualSetupRequests, setup.checksum, setup.AsyncHandle],
            [requests, 2, requests * 2, requests * 1462, requests * 2 + 1]);
        const objectTarget = workload.startsWith('Object');
        assert.equal(setup.TargetInstanceId, objectTarget ? 47 : 0);
        assert.equal(setup.Identifier, 'actual.member');
        assert.equal(setup.CallType, operation === 'Constructor' ? 'ConstructorCall' : operation === 'Get' ? 'GetValue' : operation === 'Set' ? 'SetValue' : 'FunctionCall');
        assert.equal(setup.ResultType, operation === 'Constructor' ? 'JSObjectReference' : operation === 'InvokeVoid' || (operation === 'Set' && !objectTarget) ? 'JSVoidResult' : 'Default');
        assert.equal(setup.ArgsJson, operation === 'Get' ? '[]' : operation === 'Set' ? '["assigned-value"]' : '[123,"actual-argument"]');
        assert.equal(setup.ownerSha256, runtime.ownerSha256);
        assert.equal(setup.harnessSha256, runtime.harnessSha256);
        assert.equal(setup.processId, runtime.processId);
        setupReceipts.push({ round, variant, file: `${label}/states/${state.file}`, ...setup });
        const samples = stage => [...section.matchAll(new RegExp(`^Workload${stage}\\s+(\\d+):\\s+(\\d+) op,\\s+([\\d.]+) ns,`, 'gm'))]
            .map(match => ({ index: Number(match[1]), operations: Number(match[2]), nanoseconds: Number(match[3]) }));
        const warmups = samples('Warmup'), results = samples('Result');
        assert.deepEqual(warmups.map(row => row.index), [1, 2, 3]);
        assert.deepEqual(results.map(row => row.index), [1, 2, 3, 4, 5, 6, 7, 8]);
        assert([...warmups, ...results].every(row => row.operations > 0 && row.nanoseconds > 0));
        const gcLines = [...section.matchAll(/^GC:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/gm)];
        assert.equal(gcLines.length, 1);
        const [, gen0, gen1, gen2, bytes, totalOperations] = gcLines[0].map(Number);
        const gc = { gen0, gen1, gen2, totalAllocatedBytes: bytes, totalOperations };
        assert(bytes > 0 && totalOperations > 0);
        const receipt = { round, variant, operation, policy, workload, callsPerInvoke: requests, warmups, results, gc,
            actualOwnerSha256: runtime.ownerSha256, actualHarnessSha256: runtime.harnessSha256, actualProcessId: runtime.processId };
        receipts.set(name, receipt);
        consoleReceipts.push(receipt);
    }
    for (const benchmark of report.Benchmarks)
    {
        assert.equal(benchmark.Method, 'ActualDefaultTimeout');
        const identity = fromParameters(benchmark.Parameters), receipt = receipts.get(key(identity));
        assert(receipt);
        const measured = benchmark.Measurements.filter(row => row.IterationMode === 'Workload' && row.IterationStage === 'Result');
        assert.equal(benchmark.Statistics.N, 8);
        assert.equal(measured.length, 8);
        measured.forEach((row, index) =>
        {
            assert.deepEqual([row.IterationIndex, row.LaunchIndex, row.Operations, row.Nanoseconds],
                [index + 1, 1, receipt.results[index].operations, receipt.results[index].nanoseconds]);
        });
        const values = measured.map(row => row.Nanoseconds / row.Operations);
        const mean = average(values), variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / 7;
        const stats = benchmark.Statistics;
        assert.equal(stats.OriginalValues.length, 8);
        stats.OriginalValues.forEach((value, index) => close(value, values[index], 'Actual retained result value'));
        close(stats.Mean, mean, 'Actual mean');
        close(stats.Variance, variance, 'Actual variance');
        close(stats.StandardDeviation, Math.sqrt(variance), 'Actual SD');
        close(stats.StandardError, Math.sqrt(variance / 8), 'Actual SE');
        close(stats.Min, Math.min(...values), 'Actual min');
        close(stats.Max, Math.max(...values), 'Actual max');
        close(stats.Median, median(values), 'Actual median');
        const ci = stats.ConfidenceInterval;
        assert.equal(ci.N, 8);
        close(ci.Mean, mean, 'Reported CI mean');
        close(ci.StandardError, stats.StandardError, 'Reported CI SE');
        close(ci.Lower, ci.Mean - ci.Margin, 'Reported CI lower arithmetic');
        close(ci.Upper, ci.Mean + ci.Margin, 'Reported CI upper arithmetic');
        assert.equal(benchmark.Memory.Gen0Collections, receipt.gc.gen0);
        assert.equal(benchmark.Memory.Gen1Collections, receipt.gc.gen1);
        assert.equal(benchmark.Memory.Gen2Collections, receipt.gc.gen2);
        assert.equal(benchmark.Memory.TotalOperations, receipt.gc.totalOperations);
        assert.equal(benchmark.Memory.BytesAllocatedPerOperation, Math.round(receipt.gc.totalAllocatedBytes / receipt.gc.totalOperations));
        outcomes.push({ round, variant, ...identity, callsPerInvoke: receipt.callsPerInvoke, meanNs: mean, medianNs: stats.Median,
            cvPercent: 100 * stats.StandardDeviation / mean, bytesPerOperation: benchmark.Memory.BytesAllocatedPerOperation,
            rawGcBytesPerOperation: receipt.gc.totalAllocatedBytes / receipt.gc.totalOperations, samplesNs: values, raw: benchmark });
    }
}
assert.equal(outcomes.length, 300);
const pairs = outcomes.filter(row => row.variant === 'before').map(before =>
{
    const after = outcomes.find(row => row.round === before.round && row.variant === 'after' && key(row) === key(before));
    assert(after);
    const bytesSaved = before.bytesPerOperation - after.bytesPerOperation;
    return { round: before.round, operation: before.operation, policy: before.policy, workload: before.workload, callsPerInvoke: before.callsPerInvoke,
        beforeMeanNs: before.meanNs, afterMeanNs: after.meanNs, meanSpeedupPercent: 100 * (before.meanNs - after.meanNs) / before.meanNs,
        beforeMedianNs: before.medianNs, afterMedianNs: after.medianNs, medianSpeedupPercent: 100 * (before.medianNs - after.medianNs) / before.medianNs,
        beforeBytes: before.bytesPerOperation, afterBytes: after.bytesPerOperation, bytesSaved,
        allocationReductionPercent: 100 * bytesSaved / before.bytesPerOperation, beforeCvPercent: before.cvPercent, afterCvPercent: after.cvPercent };
});
const grouped = expected.map(name =>
{
    const rows = pairs.filter(row => key(row) === name);
    assert.equal(rows.length, 3);
    return { ...fromParameters(`Operation=${rows[0].operation}&Policy=${rows[0].policy}&Workload=${rows[0].workload}`),
        meanSpeedupMinimumPercent: Math.min(...rows.map(row => row.meanSpeedupPercent)),
        meanSpeedupMaximumPercent: Math.max(...rows.map(row => row.meanSpeedupPercent)),
        medianPairMeanSpeedupPercent: median(rows.map(row => row.meanSpeedupPercent)),
        medianPairMedianSpeedupPercent: median(rows.map(row => row.medianSpeedupPercent)),
        beforeBytes: rows[0].beforeBytes, afterBytes: rows[0].afterBytes, bytesSaved: rows[0].bytesSaved,
        beforeBytesRange: [Math.min(...rows.map(row => row.beforeBytes)), Math.max(...rows.map(row => row.beforeBytes))],
        afterBytesRange: [Math.min(...rows.map(row => row.afterBytes)), Math.max(...rows.map(row => row.afterBytes))],
        bytesSavedRange: [Math.min(...rows.map(row => row.bytesSaved)), Math.max(...rows.map(row => row.bytesSaved))],
        allocationReductionPercent: rows[0].allocationReductionPercent, allPairsFaster: rows.every(row => row.meanSpeedupPercent > 0),
        allPairsSlower: rows.every(row => row.meanSpeedupPercent < 0), rounds: rows };
});
const audit = {
    candidate: 'F097', disposition: 'qualified-allocation-proposal', comparisons: 3, outcomes: 300, pairedOutcomes: 150,
    sourceCommit, actualCanonicalCommittedSourceVerified: true, sourceFiles: 2, sourceAdditions: 186, sourceDeletions: 8,
    resultSamples: 2400, actualConsoleWarmups: 900, actualHashPidLinkedSetupReceipts: 300,
    initialHarnessPdbDocuments: 5, ownerProducerHarnessPdbDocuments: 28, updatedTestPdbDocuments: 1,
    recordedClosureFilesPerVariant: 62, declaredRuntimeAssetsPerVariant: 20, onlyOwningDllPdbDiffer: true,
    currentDefaultSourceIdentities: 14, finalSemanticObservationsPerOwner: 53, actualOwningTestsOriginalProposedEach: 41,
    originalExistingTestRows: 34, baselineInitialNewTestRows: 40, resourceObjectiveUnchangedAndRedGreen: true,
    prototype1ResourceGoalFailedAndPreserved: true, measuredWarmResourceSavings: resources,
    overlapUnit: 'Per eight genuinely pending requests and eight public replies; no per-call normalization in BDN.',
    maximumCvPercent: Math.max(...outcomes.map(row => row.cvPercent)),
    allPairMeanSpeedupsRangePercent: [Math.min(...pairs.map(row => row.meanSpeedupPercent)), Math.max(...pairs.map(row => row.meanSpeedupPercent))],
    allPairAllocationSavingsRangeBytes: [Math.min(...pairs.map(row => row.bytesSaved)), Math.max(...pairs.map(row => row.bytesSaved))],
    environment: environments, grouped, boundary: 'Actual managed JSRuntime/converter/reference, real BCL timers and public protocol completion. No browser/JS execution, circuit or transport validation.',
    limitations: ['Allocation-focused draft; finite overlap8 timings and other actual regressions remain, not merge-ready.',
        'No-default controls also change: separate48B/call saving, not an untouched-path or timer-only speedup claim.',
        'One inactive CTS/timer/registration may be retained per runtime; extra instance/first-use/idle retention cost is not free.',
        'Fresh-runtime resource batches include real serializer/runtime setup and variation; no isolated layout-cost or cold-throughput causal claim.',
        'Actual compiled CoreLib informational revision publicly404; current-public CTS source is reference-only, not the measured source.',
        'Bounded desktop probes do not prove every timer/disposal interleaving, WebAssembly/native runtime or application invocation frequency.',
        'CI distribution quantiles are not independently recomputed.',
        'Public evidence omits binary/PDB bytes; copied proof/closure records are audited, not omitted binaries rehashed.']
};
emit('raw-outcomes.json', outcomes);
emit('console-measurement-receipts.json', consoleReceipts);
emit('setup-correctness.json', setupReceipts);
emit('resource-deltas.json', resources);
emit('paired-outcomes.json', pairs);
emit('measurement-audit.json', audit);
const lines = ['# F097 actual comparisons and controls', '',
    'Three unchanged-candidate comparisons, AB/BA/AB. Every regression and variance remains. Positive speedup is faster; negative is slower. **Overlap8 reports one eight-request batch**, not one call.',
    '',     '| Operation | Default | Workload | Mean speedup range % | Median pair mean speedup % | Original B/op range | Proposed B/op range | Saved B/op range |',
    '|---|---|---|---:|---:|---:|---:|---:|'];
for (const row of grouped)
{
    const range = values => values[0] === values[1] ? values[0] : `${values[0]} to ${values[1]}`;
    lines.push(`| ${row.operation} | ${row.policy} | ${row.workload} | ${row.meanSpeedupMinimumPercent.toFixed(2)} to ${row.meanSpeedupMaximumPercent.toFixed(2)} | ${row.medianPairMeanSpeedupPercent.toFixed(2)} | ${range(row.beforeBytesRange)} | ${range(row.afterBytesRange)} | ${range(row.bytesSavedRange)} |`);
}
lines.push('', '## Every actual paired outcome', '',
    '| Pair | Operation | Default | Workload | Original mean ns | Proposed mean ns | Mean speedup % | Median speedup % | Original CV % | Proposed CV % | Original B/op | Proposed B/op |',
    '|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const row of pairs)
{
    lines.push(`| ${row.round} | ${row.operation} | ${row.policy} | ${row.workload} | ${row.beforeMeanNs.toFixed(3)} | ${row.afterMeanNs.toFixed(3)} | ${row.meanSpeedupPercent.toFixed(2)} | ${row.medianSpeedupPercent.toFixed(2)} | ${row.beforeCvPercent.toFixed(2)} | ${row.afterCvPercent.toFixed(2)} | ${row.beforeBytes} | ${row.afterBytes} |`);
}
lines.push('', '300 actual outcomes/150 pairs,2400 actual retained results,900 actual warmups and300 exact owner/harness/PID-linked protocol/result setup receipts. Requested100ms iterations,3 warmups/8 retained results,DontRemove,in-process Release/x64/server-concurrent GC. This shared-machine sample is not isolated production throughput.',
    '', 'Raw console GC totals/rounding and actual retained-sample mean/variance/SD/SE/median are recomputed. Reported CI mean/SE/lower/upper arithmetic is checked; confidence-distribution quantiles are not independently recomputed. No-default controls save48B/call separately. Fresh-runtime observations and one-slot idle retention are not silently dropped.', '');
emit('comparison.md', lines.join('\n'), true);
console.log(JSON.stringify({ ...audit, environment: undefined, grouped: undefined }, null, 2));
