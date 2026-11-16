import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [root, option] = process.argv.slice(2);
assert(root && path.isAbsolute(root) && (!option || option === '--verify'));
const at = (...parts) => path.join(root, ...parts);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const emit = (name, value, text = false) =>
{
    const content = text ? value : JSON.stringify(value, null, 2) + '\n';
    if (option === '--verify')
    {
        assert.equal(fs.readFileSync(at(name), 'utf8'), content, `Recorded audit differs:${name}`);
    }
    else
    {
        fs.writeFileSync(at(name), content);
    }
};
const close = (actual, expected, label) =>
{
    assert(Number.isFinite(actual) && Number.isFinite(expected), label);
    assert(Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), label);
};
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const policies = ['Finite', 'Infinite', 'ExplicitNone'], workloads = ['Inline', 'Deferred', 'Overlap8'];
const expected = policies.flatMap(policy => workloads.map(workload => `${policy}/${workload}`)).sort();
const manifest = read(at('original-manifest.json'));
assert.equal(manifest.source_revision, baseline);
assert.equal(manifest.variant, 'original');
assert(manifest.source_tracked_unchanged);
assert.equal(manifest.target_assembly_sha256, '9737FA503AF90C69C2D9FBA1386898054A4BFDA613F11E8260A090BFDCDC40D5');
const budget = read(at('measurement-budget.json'));
assert.deepEqual([budget.maximumSourceComparisons, budget.startedSourceComparisons, budget.completedSourceComparisons,
    budget.originalSweepsStarted, budget.originalSweepsCompleted, budget.closed], [3, 0, 0, 1, 1, true]);
const sources = read(at('producer-source-copies.json'));
assert.equal(sources.length, 9);
assert.equal(new Set(sources.map(row => row.path)).size, 9);
for (const source of sources)
{
    const file = at(...source.snapshot.split('\\'));
    assert.equal(hash(file), source.sha256);
    assert(source.equalityVerified && source.canonicalRemoteBytesVerified && source.utf8BomPreserved);
    const canonical = Buffer.from(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), 'utf8');
    const blob = crypto.createHash('sha1').update(`blob ${canonical.length}\0`).update(canonical).digest('hex');
    assert.equal(blob, source.baselineGitBlob);
    assert.equal(source.currentDefaultGitBlob, blob);
    assert.equal(source.workingGitBlob, blob);
    assert.equal(source.currentDefaultRevision, 'd7870e7ec8da214eb96f96f5512aad0d89bfef11');
}
assert.equal(sources.find(row => row.path.endsWith('/JSRuntimeExtensions.cs')).sha256, manifest.target_source_sha256);
const pdbs = [];
for (const source of sources.filter(row => row.path.includes('/src/') && row.path.endsWith('.cs')))
{
    const name = path.basename(source.path, '.cs');
    const proof = read(at(`owner-${name}-pdb-original.json`));
    assert(proof.verified && proof.document.endsWith(`${name}.cs`));
    assert.equal(proof.actual_pdb_document_sha256, source.sha256);
    assert.equal(proof.source_sha256, source.sha256);
    pdbs.push(proof);
}
const harnessNames = ['Program', 'RuntimeBoundary', 'TimeoutBenchmark', 'TimeoutProbe', 'CorelibEvidence'];
for (const name of harnessNames)
{
    const proof = read(at(`harness-${name}-pdb-original.json`)), actual = hash(at('harness', `${name}.cs`));
    assert(proof.verified && proof.document.endsWith(`${name}.cs`));
    assert.equal(proof.actual_pdb_document_sha256, actual);
    assert.equal(proof.source_sha256, actual);
    pdbs.push(proof);
    const initialProof = read(at('preparation', 'initial-harness', `${name}-pdb.json`));
    const initialHash = hash(at('preparation', 'initial-harness', 'source', `${name}.cs`));
    assert(initialProof.verified);
    assert.equal(initialProof.actual_pdb_document_sha256, initialHash);
    assert.equal(initialProof.source_sha256, initialHash);
}
assert.equal(pdbs.length, 11);
const commands = read(at('pdb-original-commands.json'));
assert.equal(commands.length, 11);
assert(commands.every(row => row.exitCode === 0));
const closure = read(at('execution-closure-original.json'));
assert.deepEqual([closure.copiedFiles, closure.files.length, closure.declaredRuntimeAssets, closure.runtimeAssets.length], [62, 62, 20, 20]);
assert.equal(new Set(closure.files.map(row => row.file)).size, 62);
for (const asset of closure.runtimeAssets)
{
    assert.equal(closure.files.find(row => row.file === asset.copied)?.sha256, asset.sha256);
}
for (const [file, field] of [
    ['Microsoft.JSInterop.dll', 'target_assembly_sha256'], ['AutoPerf.Benchmarks.dll', 'benchmark_assembly_sha256'],
    ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtime_configuration_sha256'], ['AutoPerf.Benchmarks.deps.json', 'dependency_configuration_sha256']
])
{
    assert.equal(closure.files.find(row => row.file === file)?.sha256, manifest[field]);
}
const test = read(at('actual-test-audit-original.json'));
assert.deepEqual([test.actualRows, test.actualDefinitions, test.passed, test.skipped, test.rows.length], [8, 8, 8, 0, 8]);
assert.equal(new Set(test.rows.map(row => row.name)).size, 8);
assert(test.allPositiveDurations && test.rows.every(row => row.outcome === 'Passed' && !/^00:00:00(?:\.0+)?$/.test(row.duration)));
const testOwner = read(at('test-owner-identities.json'));
assert.equal(testOwner.testOwnerSha256, manifest.target_assembly_sha256);
assert.equal(testOwner.frozenOriginalOwnerSha256, manifest.target_assembly_sha256);
const testProof = read(at('owning-tests-source-pdb.json'));
const testSource = sources.find(row => row.path.endsWith('/JSRuntimeExtensionsTest.cs'));
assert(testProof.verified);
assert.equal(testProof.actual_pdb_document_sha256, testSource.sha256);
assert.equal(testProof.source_sha256, testSource.sha256);
assert.equal(read(at('owning-tests-source-pdb-command.json')).exitCode, 0);
const sourceBranch = read(at('source-branch-publication.json'));
assert.deepEqual([sourceBranch.branch, sourceBranch.commit, sourceBranch.actualRemoteRef.object.sha,
    sourceBranch.sourceChanged, sourceBranch.independentOptimizationCommit],
    ['autoperf/F098-js-runtime-explicit-timeouts', baseline, baseline, false, false]);
assert.deepEqual([sourceBranch.sourceDiffCheckExit, sourceBranch.sourceTrackedDiffExit,
    sourceBranch.pushExitCode, sourceBranch.verificationExitCode], [0, 0, 0, 0]);
const observationNames = [
    ...Array(3).fill('FiniteTimeout_CancelsActualPendingInvoke'),
    ...['Infinite', 'ExplicitNone'].map(policy => `ExplicitOverride_DoesNotInheritDefault_${policy}`),
    'ZeroTimeout_IsCanceledAtPublicConsumerEntry', ...policies.map(policy => `ActualTimerLifetime_${policy}`),
    'NullRuntime_OriginalReturnedTaskError', 'InvalidTimeout_OriginalReturnedTaskError', 'ActualSerializationGetterFailure',
    'SynchronousPublicTransportFailure', 'ActualPublicProtocolFailure', 'ExplicitDeadline_CoversActualSerialization',
    'OverlappingExplicitCalls_IndependentTokensAndDeadlines', 'RuntimeDispose_PreservesPendingExplicitCall',
    'OriginalCompletedConsumerToken_RemainsUncanceledAfterLaterDeadline'
];
const resources = [];
for (const phase of ['initial-compatibility', 'frozen-original-compatible', 'frozen-generic-reuse-equivalence-red'])
{
    const probe = read(at('verification', phase, 'states', 'explicit-timeout-contract-resources.json'));
    const runtime = read(at('verification', phase, 'states', 'runtime.json'));
    assert.equal(runtime.ownerSha256, manifest.target_assembly_sha256);
    assert.equal(runtime.harnessSha256, manifest.benchmark_assembly_sha256);
    assert.equal(runtime.corelibSha256, '0CEBA028A838AFF170CFF9D03570B34F9F044D6A9597974088E58B9834DF74E4');
    assert(runtime.serverGc && runtime.architecture === 'X64' && runtime.processId > 0);
    assert.deepEqual(probe.Observations.map(row => row.Name), observationNames);
    const details = name => probe.Observations.filter(row => row.Name === name).map(row => row.Detail);
    assert.deepEqual(details('FiniteTimeout_CancelsActualPendingInvoke').map(row => row.repetition), [1, 2, 3]);
    assert(details('FiniteTimeout_CancelsActualPendingInvoke').every(row =>
        row.elapsedMilliseconds >= 100 && row.requested && row.actualExceptionTokenMatched && row.lateReplyPreservedCancellation));
    for (const policy of ['Infinite', 'ExplicitNone'])
    {
        assert(details(`ExplicitOverride_DoesNotInheritDefault_${policy}`).every(row =>
            row.actualDefaultCanceled && row.overridePendingPastDefault && row.tokenIsNone && row.result === 731));
    }
    assert.deepEqual(details('ZeroTimeout_IsCanceledAtPublicConsumerEntry'), [{ requestedBeforeDispatch: true, dispatches: 0 }]);
    for (const policy of policies)
    {
        const [row] = details(`ActualTimerLifetime_${policy}`);
        assert.equal(row.pending - row.before, policy === 'Finite' ? 1 : 0);
        assert.equal(row.after, row.before);
        assert.equal(row.tokenCanBeCanceled, policy === 'Finite');
        assert.equal(row.tokenIsNone, policy !== 'Finite');
    }
    for (const [name, type, parameter] of [
        ['NullRuntime_OriginalReturnedTaskError', 'System.ArgumentNullException', 'jsRuntime'],
        ['InvalidTimeout_OriginalReturnedTaskError', 'System.ArgumentOutOfRangeException', 'delay'],
        ['ActualSerializationGetterFailure', 'System.InvalidOperationException', null],
        ['SynchronousPublicTransportFailure', 'AutoPerf.DispatchFailure', null],
        ['ActualPublicProtocolFailure', 'Microsoft.JSInterop.JSException', null]
    ])
    {
        const [row] = details(name);
        assert.deepEqual([row.exceptionType, row.parameter, row.returnedTask, row.activeTimerCountRestored], [type, parameter, true, true]);
    }
    const [serialization] = details('ExplicitDeadline_CoversActualSerialization');
    assert(serialization.getterEntered && serialization.heldBeyondActualDeadline && serialization.publicTaskCanceled);
    assert.equal(serialization.DispatchCount, 1);
    assert.deepEqual(details('OverlappingExplicitCalls_IndependentTokensAndDeadlines'), [{
        pendingRequests: 8, distinctTokens: 8, success: 1, realCancellations: 7, successfulTokenNeverCanceled: true
    }]);
    assert.deepEqual(details('RuntimeDispose_PreservesPendingExplicitCall'), [{ pendingSurvivedDispose: true, result: 731 }]);
    assert.deepEqual(details('OriginalCompletedConsumerToken_RemainsUncanceledAfterLaterDeadline'),
        [{ earlierCanBeCanceled: true, earlierRequested: false, laterRequested: true, tokensDistinct: true }]);
    assert.deepEqual(probe.GenericReuseControl, {
        Name: 'GenericTryResetReuse_ChangesPreviouslyCompletedPublicConsumerToken', ActualOriginalRetainedTokenCanceled: false,
        ActualReusedRetainedTokenCanceled: true, ActualLaterCallCanceled: true, ActualResetSucceeded: true,
        IsShippingCandidate: false, IsBenchmarkSpeedup: false, GenericReuseEquivalent: false
    });
    for (const [kind, rows, calls] of [['warm', probe.Resources, 5000], ['fresh', probe.FreshRuntimeResources, 20]])
    {
        assert.equal(rows.length, 3);
        assert.deepEqual(rows.map(row => row.Policy), policies);
        assert(rows.every(row => row.Calls === calls && row.Checksum === 731 * calls && row.Bytes > 0));
        rows.forEach(row => close(row.BytesPerCall, row.Bytes / calls, 'Actual resource allocation arithmetic'));
        resources.push({ phase, kind, rows,
            finiteMinusInfiniteBytesPerCall: rows[0].BytesPerCall - rows[1].BytesPerCall,
            finiteMinusNoneBytesPerCall: rows[0].BytesPerCall - rows[2].BytesPerCall,
            equivalentPerformanceVariants: false });
    }
}
assert.deepEqual([read(at('frozen-original-compatible-command.json')).actualExitCode,
    read(at('frozen-generic-reuse-equivalence-red-command.json')).actualExitCode], [0, 1]);
const gate = read(at('contract-gate.json'));
assert.equal(gate.decision, 'reject-generic-removal-or-unconditional-cts-reset-reuse');
assert(!gate.shippingSourceModified && !gate.isCompiledReplacementCandidate);
const investigation = read(at('current-source-investigation.json'));
assert.equal(hash(at('public-TryReset-documentation.html')), investigation.tryResetDocumentationSha256);
const folder = at('original-sweep');
const reports = fs.readdirSync(path.join(folder, 'results')).filter(file => file.includes('full') && file.endsWith('.json'));
assert.equal(reports.length, 1);
const report = read(path.join(folder, 'results', reports[0]));
const keyFromParameters = parameters =>
{
    const values = Object.fromEntries(new URLSearchParams(parameters));
    assert.deepEqual(Object.keys(values).sort(), ['Policy', 'Workload']);

    return `${values.Policy}/${values.Workload}`;
};
assert.deepEqual(report.Benchmarks.map(row => keyFromParameters(row.Parameters)).sort(), expected);
assert.equal(report.Benchmarks.length, 9);
const environment = report.HostEnvironmentInfo;
assert.deepEqual([environment.BenchmarkDotNetVersion, environment.RuntimeVersion, environment.Architecture,
    environment.Configuration, environment.DotNetCliVersion],
    ['0.13.0', '.NET 12.0.0 (12.0.26.56305)', 'X64', 'RELEASE', '12.0.100-alpha.1.26557.102']);
const runtime = read(path.join(folder, 'states', 'runtime.json'));
assert.equal(runtime.ownerSha256, manifest.target_assembly_sha256);
assert.equal(runtime.harnessSha256, manifest.benchmark_assembly_sha256);
assert.equal(runtime.corelibSha256, '0CEBA028A838AFF170CFF9D03570B34F9F044D6A9597974088E58B9834DF74E4');
assert.equal(runtime.corelibInformationalVersion, '12.0.0-alpha.1.26562.105+dfd6ac738610ea05f42e704be82b386e71052e12');
assert(runtime.serverGc && runtime.architecture === 'X64' && runtime.processId > 0);
const execution = [read(at('execution.json'))];
assert.equal(execution.length, 1);
assert.equal(execution[0].exit_code, 0);
assert(!execution[0].sourceComparison);
for (const [flag, value] of [['--filter', '*TimeoutBenchmark*'], ['--job', 'Short'], ['--warmupCount', '3'],
    ['--iterationCount', '8'], ['--iterationTime', '100'], ['--outliers', 'DontRemove']])
{
    assert.equal(execution[0].arguments[execution[0].arguments.indexOf(flag) + 1], value);
}
assert(execution[0].arguments.includes('--inProcess'));
const stateFiles = fs.readdirSync(path.join(folder, 'states')).filter(file => file.startsWith('setup-') && file.endsWith('.json'));
assert.equal(stateFiles.length, 9);
const states = stateFiles.map(file => ({ file, value: read(path.join(folder, 'states', file)) }));
assert.deepEqual(states.map(row => `${row.value.policy}/${row.value.workload}`).sort(), expected);
const consoleText = fs.readFileSync(path.join(folder, 'console.log'), 'utf8').replace(/\r\n/g, '\n');
const sections = consoleText.split(/^\/\/ Benchmark:\s*/m).slice(1);
assert.equal(sections.length, 9);
const receipts = new Map(), setups = [];
for (const section of sections)
{
    const identity = /^TimeoutBenchmark\.ActualExplicitTimeout:[^\n]+\[Policy=(\w+), Workload=(\w+)\]/.exec(section);
    assert(identity);
    const [, policy, workload] = identity;
    const key = `${policy}/${workload}`;
    assert(!receipts.has(key) && section.includes('GC=Concurrent Server'));
    const matches = [...section.matchAll(/^AUTOPERF_F098_SETUP (\{[^\n]+\})$/gm)];
    assert.equal(matches.length, 1);
    const setup = JSON.parse(matches[0][1]);
    const state = states.find(row => `${row.value.policy}/${row.value.workload}` === key);
    assert(state);
    const normalized = { ...state.value, CallType: 1, ResultType: 0 };
    assert.equal(state.value.CallType, 'FunctionCall');
    assert.equal(state.value.ResultType, 'Default');
    assert.deepEqual(setup, normalized);
    const calls = workload === 'Overlap8' ? 8 : 1;
    assert.deepEqual([setup.callsPerInvoke, setup.setupInvocations, setup.actualSetupRequests, setup.checksum, setup.AsyncHandle,
        setup.TargetInstanceId, setup.Identifier, setup.ArgsJson], [calls, 2, calls * 2, calls * 1462, calls * 2 + 1, 0, 'actual.member', '[123,"actual-argument"]']);
    assert.equal(setup.ownerSha256, manifest.target_assembly_sha256);
    assert.equal(setup.harnessSha256, manifest.benchmark_assembly_sha256);
    assert.equal(setup.processId, runtime.processId);
    setups.push({ file: state.file, ...setup });
    const samples = stage => [...section.matchAll(new RegExp(`^Workload${stage}\\s+(\\d+):\\s+(\\d+) op,\\s+([\\d.]+) ns,`, 'gm'))]
        .map(match => ({ index: Number(match[1]), operations: Number(match[2]), nanoseconds: Number(match[3]) }));
    const warmups = samples('Warmup'), results = samples('Result');
    assert.deepEqual(warmups.map(row => row.index), [1, 2, 3]);
    assert.deepEqual(results.map(row => row.index), [1, 2, 3, 4, 5, 6, 7, 8]);
    const gcMatches = [...section.matchAll(/^GC:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/gm)];
    assert.equal(gcMatches.length, 1);
    const gc = { gen0: Number(gcMatches[0][1]), gen1: Number(gcMatches[0][2]), gen2: Number(gcMatches[0][3]),
        totalAllocatedBytes: Number(gcMatches[0][4]), totalOperations: Number(gcMatches[0][5]) };
    assert([...warmups, ...results].every(row => row.operations > 0 && row.nanoseconds > 0));
    assert(gc.totalAllocatedBytes > 0 && gc.totalOperations > 0);
    receipts.set(key, { policy, workload, warmups, results, gc, actualOwnerSha256: setup.ownerSha256,
        actualHarnessSha256: setup.harnessSha256, actualProcessId: setup.processId });
}
const outcomes = [];
for (const row of report.Benchmarks)
{
    assert.equal(row.Method, 'ActualExplicitTimeout');
    const key = keyFromParameters(row.Parameters), receipt = receipts.get(key);
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
    const average = mean(values), variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / 7;
    assert.equal(row.Statistics.OriginalValues.length, 8);
    values.forEach((value, index) => close(row.Statistics.OriginalValues[index], value, 'Raw sample'));
    close(row.Statistics.Mean, average, 'Mean');
    close(row.Statistics.Variance, variance, 'Variance');
    close(row.Statistics.StandardDeviation, Math.sqrt(variance), 'SD');
    close(row.Statistics.StandardError, Math.sqrt(variance / 8), 'SE');
    close(row.Statistics.Min, Math.min(...values), 'Min');
    close(row.Statistics.Max, Math.max(...values), 'Max');
    const sorted = [...values].sort((a, b) => a - b);
    close(row.Statistics.Median, (sorted[3] + sorted[4]) / 2, 'Median');
    const ci = row.Statistics.ConfidenceInterval;
    assert.equal(ci.N, 8);
    close(ci.Mean, average, 'CI mean');
    close(ci.StandardError, row.Statistics.StandardError, 'CI SE');
    close(ci.Lower, ci.Mean - ci.Margin, 'CI lower arithmetic');
    close(ci.Upper, ci.Mean + ci.Margin, 'CI upper arithmetic');
    assert.equal(row.Memory.Gen0Collections, receipt.gc.gen0);
    assert.equal(row.Memory.Gen1Collections, receipt.gc.gen1);
    assert.equal(row.Memory.Gen2Collections, receipt.gc.gen2);
    assert.equal(row.Memory.TotalOperations, receipt.gc.totalOperations);
    assert.equal(row.Memory.BytesAllocatedPerOperation, Math.round(receipt.gc.totalAllocatedBytes / receipt.gc.totalOperations));
    outcomes.push({ policy: receipt.policy, workload: receipt.workload, meanNs: average, medianNs: row.Statistics.Median,
        cvPercent: 100 * row.Statistics.StandardDeviation / average, bytesPerOperation: row.Memory.BytesAllocatedPerOperation,
        rawGcBytesPerOperation: receipt.gc.totalAllocatedBytes / receipt.gc.totalOperations, samplesNs: values, raw: row });
}
const summary = {
    candidate: 'F098', disposition: 'rejected', shippingSourceChanged: false, verifiedPerformanceGain: null,
    performanceSourceComparisons: 0, originalProfileSweeps: 1, actualOutcomes: 9, actualResultSamples: 72,
    actualWarmups: 27, actualSetupReceipts: 9, scopedCurrentBaselineWorkingSourceIdentities: 9,
    actualOwnerProducerHarnessPdbDocuments: 11, initialHarnessPdbDocuments: 5, actualTestPdbDocuments: 1,
    recordedOriginalClosureFiles: 62, recordedDeclaredRuntimeAssets: 20, actualOriginalSemanticObservationsPerProbe: 18,
    actualFrozenOriginalOwningTests: 8, actualRealFiniteDeadlineRowsPerProbe: 3,
    publicTokenConsumerResetCounterexampleVerified: true, isCompiledShippingCandidate: false,
    genericReuseEquivalenceCheckExpectedExit: 1, maximumCvPercent: Math.max(...outcomes.map(row => row.cvPercent)),
    environment, actualRuntime: runtime,
    boundaries: ['Real timed InvokeAsync extension/retaining public IJSRuntime consumer/JSRuntime/CTS/public protocol replies.',
        'Separate actual public reset/reuse token-consumer control; not a compiled replacement or performance gain.',
        'Finite/infinity/None distinct policies and pending await-adapter differences are retained, not declared equivalent A/B optimizations.',
        'No independent CI distribution quantile computation or omitted-binary/PDB byte rehash.',
        'No sibling timeout repair, browser/JS/transport/server/WebAssembly/frequency/throughput or isolated fresh-runtime size claim.']
};
emit('raw-outcomes.json', outcomes);
emit('console-measurement-receipts.json', [...receipts.values()]);
emit('setup-correctness.json', setups);
emit('resource-deltas.json', resources);
emit('measurement-audit.json', summary);
const lines = [
    '# F098 original runtime timeout pressure - not an optimization comparison', '',
    'No compatible generic finite-timeout source removal/reset/reuse is proposed. Infinity already bypasses the CTS; explicit-None is also no deadline, but uses a different pending adapter. All original observations remain.', '',
    '| Original policy | Public reply workload | Mean ns | Median ns | CV % | Managed B/op |',
    '|---|---|---:|---:|---:|---:|'
];
for (const row of outcomes)
{
    lines.push(`| ${row.policy} | ${row.workload} | ${row.meanNs.toFixed(3)} | ${row.medianNs.toFixed(3)} | ${row.cvPercent.toFixed(2)} | ${row.bytesPerOperation} |`);
}
lines.push('', '9 actual outcomes/72 retained results/27 warmups/9 owner-harness-PID-linked exact public-protocol setup receipts. Requested100ms iterations,3 warmups/8 retained results,one in-process original-only sweep; DontRemove. Overlap8 is per eight-request batch, not per-call normalized.',
    '', 'Finite-minus-infinity reported allocation is400B per single call/3200B per eight-call batch, including actual runtime registration behavior, not just CTS size. Both are original source with different deadline contracts, not a performance improvement. Infinity Deferred/Overlap8 additionally carry152B/1216B relative to explicit-None; actual adapter differences are disclosed, not silently fixed. Exact warmed/fresh-runtime calipers and their variation remain in resource-deltas.json. No isolated layout/first-use attribution.', '');
emit('comparison.md', lines.join('\n'), true);
console.log(JSON.stringify(summary, null, 2));
