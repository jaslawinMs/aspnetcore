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
        assert.equal(fs.readFileSync(at(name), 'utf8'), content, `Recorded F101 audit differs:${name}`);
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
const marker = 'System.Int32', reference = 'Microsoft.JSInterop.Implementation.JSObjectReference';
const referenceReply = '{"__jsObjectId":47}';
const manifest = read(at('original-manifest.json'));
assert.deepEqual([manifest.candidate, manifest.variant, manifest.source_revision, manifest.source_tracked_unchanged],
    ['F101', 'original', baseline, true]);
const budget = read(at('measurement-budget.json'));
assert.deepEqual([budget.maximumSourceComparisons, budget.startedSourceComparisons, budget.completedSourceComparisons,
    budget.originalSweepsStarted, budget.originalSweepsCompleted, budget.closed], [3, 0, 0, 1, 1, true]);
const sources = read(at('producer-source-copies.json'));
assert.equal(sources.length, 19);
assert.equal(new Set(sources.map(row => row.path)).size, 19);
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
for (const name of ['IJSVoidResult', 'JSCallType', 'LinkerFlags'])
{
    assert(!sources.find(row => row.path.endsWith(`/${name}.cs`)).executableBodyPdbExpected);
}
assert(sources.find(row => row.path.endsWith('/JSObjectReferenceJsonWorker.cs')).executableBodyPdbExpected);
const pdbs = [];
for (const source of sources.filter(row => row.executableBodyPdbExpected))
{
    const name = path.basename(source.path, '.cs');
    const proof = read(at(`owner-${name}-pdb-original.json`));
    assert(proof.verified && proof.document.endsWith(`${name}.cs`));
    assert.equal(proof.actual_pdb_document_sha256, source.sha256);
    assert.equal(proof.source_sha256, source.sha256);
    pdbs.push(proof);
}
for (const name of ['Program', 'RuntimeBoundary', 'TimeoutBenchmark', 'TimeoutProbe', 'CorelibEvidence'])
{
    const proof = read(at(`harness-${name}-pdb-original.json`)), actual = hash(at('harness', `${name}.cs`));
    assert(proof.verified && proof.document.endsWith(`${name}.cs`));
    assert.equal(proof.actual_pdb_document_sha256, actual);
    assert.equal(proof.source_sha256, actual);
    pdbs.push(proof);
}
assert.equal(pdbs.length, 16);
const pdbCommands = read(at('pdb-original-commands.json'));
assert.equal(pdbCommands.length, 16);
assert(pdbCommands.every(row => row.exitCode === 0));
const helper = read(at('unchanged-helper-copy.json'));
assert(helper.byteIdentical);
assert.equal(hash(at('harness', 'CorelibEvidence.cs')), helper.sha256);
const closure = read(at('execution-closure-original.json'));
assert.deepEqual([closure.candidate, closure.copiedFiles, closure.files.length, closure.declaredRuntimeAssets, closure.runtimeAssets.length],
    ['F101', 62, 62, 20, 20]);
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
assert.deepEqual([test.candidate, test.actualRows, test.actualDefinitions, test.passed, test.skipped, test.rows.length], ['F101', 16, 16, 16, 0, 16]);
assert.equal(new Set(test.rows.map(row => row.fullName)).size, 16);
assert.deepEqual(test.rows.map(row => row.fullName).sort(), [...test.exactExpectedNames].sort());
assert(test.allPositiveDurations && test.rows.every(row => row.outcome === 'Passed' && !/^00:00:00(?:\.0+)?$/.test(row.duration)));
const testOwner = read(at('test-owner-identities.json'));
assert.equal(testOwner.testOwnerSha256, manifest.target_assembly_sha256);
assert.equal(testOwner.frozenOriginalOwnerSha256, manifest.target_assembly_sha256);
for (const name of ['JSRuntimeExtensionsTest', 'JSRuntimeTest', 'JSObjectReferenceTest'])
{
    const proof = read(at(`owning-${name}-source-pdb.json`)), source = sources.find(row => row.path.endsWith(`/test/${name}.cs`));
    assert(proof.verified);
    assert.equal(proof.actual_pdb_document_sha256, source.sha256);
    assert.equal(proof.source_sha256, source.sha256);
}
const testPdbCommands = read(at('owning-tests-source-pdb-commands.json'));
assert.equal(testPdbCommands.length, 3);
assert(testPdbCommands.every(row => row.exitCode === 0));
assert.equal(read(at('owning-tests-original-command.json')).exitCode, 0);
const sourceBranch = read(at('source-branch-publication.json'));
assert.deepEqual([sourceBranch.branch, sourceBranch.commit, sourceBranch.actualRemoteRef.object.sha,
    sourceBranch.sourceChanged, sourceBranch.independentOptimizationCommit],
    ['autoperf/F101-js-runtime-property-read-timeouts', baseline, baseline, false, false]);
assert.deepEqual([sourceBranch.sourceDiffCheckExit, sourceBranch.sourceTrackedDiffExit,
    sourceBranch.pushExitCode, sourceBranch.verificationExitCode], [0, 0, 0, 0]);
const preparation = read(at('preparation-parser-failure.json'));
assert.deepEqual([preparation.candidate, preparation.actualExitCode, preparation.postFailureRunExists,
    preparation.sourceComparison, preparation.benchmarkOrProbeExecuted], ['F101', 1, false, false, false]);
assert.equal(preparation.originalScriptSha256, hash(at(preparation.originalScript)));
assert.equal(preparation.originalScriptSha256, 'CAB48575B360756BD0D0437A79458814DFBD33D1E4B7D3B9ADBC4911A89BB6F1');
for (const copy of read(at('earlier-document-inventory-copies.json')))
{
    assert(copy.byteIdentical);
    assert.equal(hash(at(copy.destination)), copy.sha256);
}
const observationNames = [
    'ActualPropertyRead_ConsumesTypedPublicReply', 'ActualReferenceProperty_ConvertedReferenceReadsMaterialTarget',
    'NearestTypedFunctionControl_ResultValuePreserved',
    ...[1, 2, 3].flatMap(() => ['OriginalFinitePropertyDeadline_FailsWhilePending', 'NearestAwaitedInvokeDeadline_CancelsPending']),
    ...['Infinite', 'ExplicitNone'].map(policy => `PropertyOverride_DoesNotInheritDefault_${policy}`),
    'ZeroPropertyTimeout_IsRequestedAtConsumerEntry', ...policies.map(policy => `OriginalPropertyTimerLifetime_${policy}`),
    'NullRuntime_OriginalSynchronousPropertyError', 'InvalidTimeout_OriginalSynchronousPropertyError',
    'ActualSynchronousPropertyTransportFailure', 'ActualAsynchronousPropertyProtocolFailure', 'ActualPropertyResultDeserializationFailure',
    'PropertyDeadline_CancelsDuringManagedPreReturnTransportGate', 'OriginalOverlappingProperties_DeadlinesGoneBeforeCompletion',
    'RuntimeDispose_PreservesOriginalPendingProperty', 'OriginalCompletedPropertyToken_RemainsUncanceledAtLaterDeadline',
    'ActualPropertyReferenceDispose_RejectsFurtherPublicPropertyReads'
];
assert.equal(observationNames.length, 25);
const resources = [];
const phases = [['frozen-original-characterization', 0], ['frozen-original-deadline-red', 1], ['frozen-generic-reuse-equivalence-red', 1]];
for (const [phase, code] of phases)
{
    const probe = read(at('verification', phase, 'states', 'explicit-property-timeout-contract-resources.json'));
    const runtime = read(at('verification', phase, 'states', 'runtime.json'));
    assert.equal(runtime.ownerSha256, manifest.target_assembly_sha256);
    assert.equal(runtime.harnessSha256, manifest.benchmark_assembly_sha256);
    assert.equal(runtime.corelibSha256, '0CEBA028A838AFF170CFF9D03570B34F9F044D6A9597974088E58B9834DF74E4');
    assert(runtime.serverGc && runtime.architecture === 'X64' && runtime.processId > 0);
    assert.equal(probe.OriginalPropertyDeadlineFailures, 3);
    assert.equal(probe.PropertyHasInputArguments, false);
    assert.deepEqual(probe.Observations.map(row => row.Name), observationNames);
    const details = name => probe.Observations.filter(row => row.Name === name).map(row => row.Detail);
    assert.deepEqual(details('ActualPropertyRead_ConsumesTypedPublicReply'), [{
        underlyingResultType: marker, actualTypedValue: 731, actualPublicReply: '731', actualCallType: 'GetValue',
        actualTarget: 0, inputArgumentsJson: '[]', propertyHasInputArguments: false
    }]);
    assert.deepEqual(details('ActualReferenceProperty_ConvertedReferenceReadsMaterialTarget'), [{
        actualReturnedType: reference, referenceOwnerSha256: manifest.target_assembly_sha256, actualProtocolResult: referenceReply,
        materialCallType: 'GetValue', materialTarget: 47, materialValue: 731, inputArgumentsJson: '[]'
    }]);
    assert.deepEqual(details('NearestTypedFunctionControl_ResultValuePreserved'), [{ declaredCallType: 'FunctionCall', actualTypedValue: 731 }]);
    const failed = details('OriginalFinitePropertyDeadline_FailsWhilePending'), controls = details('NearestAwaitedInvokeDeadline_CancelsPending');
    assert.deepEqual(failed.map(row => row.repetition), [1, 2, 3]);
    assert.deepEqual(controls.map(row => row.repetition), [1, 2, 3]);
    assert(failed.every(row => row.elapsedMilliseconds >= 100 && row.tokenCanBeCanceled &&
        !row.tokenRequestedAtObservedDeadline && row.taskPendingAtObservedDeadline &&
        !row.actualDeadlineAssertionPassed && row.laterValueReplyCompletes));
    assert(controls.every(row => row.actualExceptionTokenMatched && row.tokenRequested && row.lateReplyPreservedCancellation));
    for (const policy of ['Infinite', 'ExplicitNone'])
    {
        assert.deepEqual(details(`PropertyOverride_DoesNotInheritDefault_${policy}`),
            [{ actualDefaultCanceled: true, overridePendingPastDefault: true, tokenIsNone: true, actualValueCompleted: true }]);
    }
    assert.deepEqual(details('ZeroPropertyTimeout_IsRequestedAtConsumerEntry'), [{ requestedBeforeDispatch: true, dispatches: 0 }]);
    for (const policy of policies)
    {
        const [row] = details(`OriginalPropertyTimerLifetime_${policy}`);
        assert.equal(row.pending, row.before);
        assert.equal(row.after, row.before);
        assert.equal(row.tokenCanBeCanceled, policy === 'Finite');
        assert.equal(row.tokenIsNone, policy !== 'Finite');
        assert.equal(row.sourceTimerAlreadyGoneWhilePending, policy === 'Finite');
    }
    for (const [name, type, returned, parameter, inner] of [
        ['NullRuntime_OriginalSynchronousPropertyError', 'System.ArgumentNullException', false, 'jsRuntime', null],
        ['InvalidTimeout_OriginalSynchronousPropertyError', 'System.ArgumentOutOfRangeException', false, 'delay', null],
        ['ActualSynchronousPropertyTransportFailure', 'AutoPerf.DispatchFailure', false, null, null],
        ['ActualAsynchronousPropertyProtocolFailure', 'Microsoft.JSInterop.JSException', true, null, null],
        ['ActualPropertyResultDeserializationFailure', 'Microsoft.JSInterop.JSException', true, null, 'System.Text.Json.JsonException']
    ])
    {
        const [row] = details(name);
        assert.deepEqual([row.exceptionType, row.returnedTask, row.parameter, row.activeTimerCountRestored, row.innerExceptionType],
            [type, returned, parameter, true, inner]);
    }
    assert.deepEqual(details('PropertyDeadline_CancelsDuringManagedPreReturnTransportGate'), [{
        actualBeginInvokeJSEntered: true, heldBeyondActualDeadline: true, actualExceptionTokenMatched: true,
        publicTaskCanceled: true, propertyHasInputArguments: false,
        boundary: 'Test-host synchronous BeginInvokeJS gate;actual CTS/runtime cancellation,not browser stall or argument serialization.',
        DispatchCount: 1
    }]);
    assert.deepEqual(details('OriginalOverlappingProperties_DeadlinesGoneBeforeCompletion'), [{
        actualPendingRequests: 8, distinctTokens: 8, earlyValueSuccess: 1, stillPendingAtObservedDeadline: 7,
        actualDeadlineCancellations: 0, allLaterValuesComplete: true, successfulTokenNeverCanceled: true
    }]);
    assert.deepEqual(details('RuntimeDispose_PreservesOriginalPendingProperty'), [{ pendingSurvivedDispose: true, actualValueCompleted: true }]);
    assert.deepEqual(details('OriginalCompletedPropertyToken_RemainsUncanceledAtLaterDeadline'),
        [{ earlierCanBeCanceled: true, earlierRequested: false, laterRequested: false, laterPendingAtDeadline: true, tokensDistinct: true }]);
    assert.deepEqual(details('ActualPropertyReferenceDispose_RejectsFurtherPublicPropertyReads'),
        [{ actualDisposalId: 47, actualNullReply: true, synchronousObjectDisposed: true, furtherDispatches: 0 }]);
    assert.deepEqual(probe.GenericReuseControl, {
        Name: 'GenericTryResetReuse_ChangesPreviouslyCompletedPropertyConsumerToken', ActualOriginalRetainedTokenCanceled: false,
        ActualReusedRetainedTokenCanceled: true, ActualLaterCallCanceled: true, ActualResetSucceeded: true,
        IsShippingCandidate: false, IsBenchmarkSpeedup: false, GenericReuseEquivalent: false
    });
    for (const [kind, rows, calls] of [['warm', probe.Resources, 5000], ['fresh', probe.FreshRuntimeResources, 20]])
    {
        assert.equal(rows.length, 3);
        assert.deepEqual(rows.map(row => row.Policy), policies);
        assert(rows.every(row => row.Calls === calls && row.SuccessfullyConsumedValues === calls &&
            row.ActualValueChecksum === calls * 731 && row.Bytes > 0));
        rows.forEach(row => close(row.BytesPerCall, row.Bytes / calls, 'Actual property caliper arithmetic'));
        resources.push({ phase, kind, rows, successfullyConsumedValuesPerPolicy: calls, actualValueChecksumPerPolicy: calls * 731,
            finiteMinusInfiniteBytesPerCall: rows[0].BytesPerCall - rows[1].BytesPerCall,
            finiteMinusNoneBytesPerCall: rows[0].BytesPerCall - rows[2].BytesPerCall, equivalentPerformanceVariants: false });
    }
    const record = read(at(`${phase}-command.json`));
    assert.deepEqual([record.actualExitCode, record.expectedExitCode, record.shippingSourceCandidate], [code, code, false]);
    assert.equal(record.ownerSha256, manifest.target_assembly_sha256);
    assert.equal(record.harnessSha256, manifest.benchmark_assembly_sha256);
}
const gate = read(at('contract-gate.json'));
assert.deepEqual([gate.candidate, gate.disposition, gate.actualOriginalObservations, gate.originalPendingDeadlineFailures,
    gate.originalDeadlineFailureNotRepaired, gate.propertyHasInputArguments, gate.shippingSourceChanged, gate.compiledPerformanceCandidate],
    ['F101', 'rejected', 25, 3, true, false, false, false]);
assert.deepEqual([gate.maximumSourceComparisons, gate.startedSourceComparisons, gate.completedSourceComparisons], [3, 0, 0]);
assert(gate.actualPublicConsumerReuseCounterexample.ActualReusedRetainedTokenCanceled);
const investigation = read(at('current-source-investigation.json'));
assert.equal(hash(at('public-TryReset-documentation.html')), investigation.tryResetDocumentationSha256);
assert.equal(investigation.verifiedScopedSources, 19);
assert(investigation.excludedPropertyArgumentSerialization);
const work = read(at('bounded-existing-work-query.json'));
assert.equal(work.total_count, 7);
assert.equal(work.items.length, 7);
assert(!work.incomplete_results);
const related = read(at('existing-abortlink-pr.json'));
assert.equal(related.headRefOid, 'e1ed8f36869a9485ebc061d6762f9a47991ed43f');
assert.equal(related.files.length, 10);
assert(!related.files.some(row => row.path === 'src/Components/JSInterop/src/JSRuntimeExtensions.cs'));
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
const execution = read(at('execution.json'));
assert.equal(execution.exit_code, 0);
assert.equal(execution.expectedCases, 9);
assert.equal(execution.actualBenchmarkReturn, marker);
assert(!execution.sourceComparison);
for (const [flag, value] of [['--filter', '*TimeoutBenchmark*'], ['--job', 'Short'], ['--warmupCount', '3'],
    ['--iterationCount', '8'], ['--iterationTime', '100'], ['--outliers', 'DontRemove']])
{
    assert.equal(execution.arguments[execution.arguments.indexOf(flag) + 1], value);
}
assert(execution.arguments.includes('--inProcess'));
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
    const identity = /^TimeoutBenchmark\.ActualExplicitPropertyReadTimeout:[^\n]+\[Policy=(\w+), Workload=(\w+)\]/.exec(section);
    assert(identity);
    const [, policy, workload] = identity, key = `${policy}/${workload}`;
    assert(!receipts.has(key) && section.includes('GC=Concurrent Server'));
    const matches = [...section.matchAll(/^AUTOPERF_F101_SETUP (\{[^\n]+\})$/gm)];
    assert.equal(matches.length, 1);
    const setup = JSON.parse(matches[0][1]), state = states.find(row => `${row.value.policy}/${row.value.workload}` === key);
    assert(state);
    assert.equal(state.value.CallType, 'GetValue');
    assert.equal(state.value.ResultType, 'Default');
    assert.deepEqual(setup, { ...state.value, CallType: 3, ResultType: 0 });
    const calls = workload === 'Overlap8' ? 8 : 1;
    assert.deepEqual([setup.callsPerInvoke, setup.setupInvocations, setup.actualPropertyRequests, setup.actualTotalSetupRequests,
        setup.successfullyConsumedPropertyValues, setup.actualBenchmarkReturnType, setup.actualPropertyValue, setup.actualPropertyReply,
        setup.referencePropertyControlRequests, setup.referencePropertyControlTarget, setup.referencePropertyControlValue,
        setup.actualReturnedReferenceType, setup.actualReferencePropertyReply, setup.AsyncHandle, setup.TargetInstanceId, setup.Identifier, setup.ArgsJson],
        [calls, 2, calls * 2, calls * 2 + 2, calls * 2, marker, 731, '731', 2, 47, 731,
            reference, referenceReply, calls * 2 + 1, 0, 'actual.Property', '[]']);
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
    assert.equal(row.Method, 'ActualExplicitPropertyReadTimeout');
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
    values.forEach((value, index) => close(row.Statistics.OriginalValues[index], value, 'Actual property result sample'));
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
const allocationDeltas = workloads.map(workload =>
{
    const finite = outcomes.find(row => row.policy === 'Finite' && row.workload === workload);
    const infinite = outcomes.find(row => row.policy === 'Infinite' && row.workload === workload);
    const none = outcomes.find(row => row.policy === 'ExplicitNone' && row.workload === workload);

    return { workload, finiteMinusInfiniteBytes: finite.bytesPerOperation - infinite.bytesPerOperation,
        infiniteMinusNoneBytes: infinite.bytesPerOperation - none.bytesPerOperation, equivalentOptimizationVariants: false };
});
const summary = {
    candidate: 'F101', disposition: 'rejected', shippingSourceChanged: false, verifiedPerformanceGain: null,
    performanceSourceComparisons: 0, originalProfileSweeps: 1, actualOutcomes: 9, actualResultSamples: 72,
    actualWarmups: 27, actualSetupReceipts: 9, scopedCurrentBaselineWorkingSourceIdentities: 19,
    actualOwnerProducerHarnessPdbDocuments: 16, actualTestPdbDocuments: 3,
    pureVoidMarkerEnumAndFlagsNotClaimedExecutablePdbProof: true, recordedOriginalClosureFiles: 62, recordedDeclaredRuntimeAssets: 20,
    actualOriginalSemanticObservationsPerProbe: 25, actualFrozenOriginalOwningControlTests: 16, originalPropertyDeadlineFailuresPerProbe: 3,
    actualNearestAwaitedDeadlineControlsPerProbe: 3, originalDeadlineFailureNotRepaired: true,
    publicPropertyTokenConsumerResetCounterexampleVerified: true, isCompiledShippingCandidate: false,
    originalRequireDeadlinesExpectedExit: 1, genericReuseEquivalenceCheckExpectedExit: 1,
    actualBenchmarkReturn: marker, actualPublicReplyValue: '731', actualReferencePropertyReply: referenceReply,
    actualReferencePropertyMaterialTarget: 47, actualMaterialControlValue: 731, propertyHasInputArguments: false,
    maximumCvPercent: Math.max(...outcomes.map(row => row.cvPercent)),
    firstFiniteInlineCvPercent: outcomes.find(row => row.policy === 'Finite' && row.workload === 'Inline').cvPercent,
    actualPreExecutionPreparationParserFailures: 1, failedScriptAndOutcomePreserved: true, environment,
    actualRuntime: runtime, originalAllocationDeltas: allocationDeltas, boundedExistingWorkMatches: 7,
    boundaries: ['Actual public timed scalar GetValue/retaining consumer/JSRuntime/CTS/int731 public reply;separate actual reference-valued property/converter/worker/material property target47.',
        'Original post-dispatch finite deadline failure characterized,not repaired;real pre-return test-host BeginInvokeJS gate/zero/errors/tokens still matter.',
        'GetValue has no input arguments or value serialization;no constructor argument getter gate or setter path substituted.',
        'Original finite/infinity/None costs are distinct policies,not equivalent-contract A/B source optimizations;actual allocation deltas all retained.',
        'First finite Inline/control variation and all warm/fresh actual int731 property costs retained;no causal variance or isolated CTS/cold-layout claim.',
        'One actual parser failure occurred before any execution;exact original script/outcome preserved,corrected before C# build and measurements.',
        'No independent CI quantiles or omitted DLL/PDB byte check;pure marker/enum/flags are source provenance,not executable PDB proof.',
        'No sibling correctness repair,owner-specific redesign/browser stall/native JavaScript identity/release/server/network/AOT/frequency/throughput claim.']
};
emit('raw-outcomes.json', outcomes);
emit('console-measurement-receipts.json', [...receipts.values()]);
emit('setup-correctness.json', setups);
emit('resource-deltas.json', resources);
emit('original-allocation-deltas.json', allocationDeltas);
emit('measurement-audit.json', summary);
const lines = [
    '# F101 actual original property-read timeout pressure - no source optimization', '',
    'Generic removal/reset-reuse rejected by public tokens/zero/validation/pre-return managed transport contracts. Original pending Get deadlines fail3/3 per frozen mode while actual nearest awaited/default controls cancel;not repaired or credited as a speedup. Benchmark returns the actual public int731 property value;reference-valued Get/target47 control is outside measurement. Get has no input/value serialization.', '',
    '| Original policy | Actual property workload | Mean ns | Median ns | CV % | Managed B/op |',
    '|---|---|---:|---:|---:|---:|'
];
for (const row of outcomes)
{
    lines.push(`| ${row.policy} | ${row.workload} | ${row.meanNs.toFixed(3)} | ${row.medianNs.toFixed(3)} | ${row.cvPercent.toFixed(2)} | ${row.bytesPerOperation} |`);
}
lines.push('', 'All9 outcomes/72 retained results/27 console warmups/9 exact owner-harness-PID/GetValue/typed731/reference-property-target47 setup receipts retained. One original in-process sweep;requested100ms,3warmups/8results,DontRemove. Overlap8 is an eight-property batch,not per-call normalized.',
    '', `First Finite/Inline CV${summary.firstFiniteInlineCvPercent.toFixed(2)}% retained without causal explanation or stable latency claim;no extra run to discard unfavorable variation.`,
    '', ...allocationDeltas.map(row => `${row.workload}:finite-minus-infinity${row.finiteMinusInfiniteBytes}B;infinity-minus-None${row.infiniteMinusNoneBytes}B. Different original policies,not compatible source-change savings.`),
    '', 'All three phase warm5000/fresh20 actual typed731 calipers/checksums/policy variation retained;fresh includes actual runtime/serializer metadata,not isolated cold CTS or the constructor sibling costs. Exact original preparation parser failure retained;corrected before first C# build,not a discarded benchmark or source comparison.', '');
emit('comparison.md', lines.join('\n'), true);
console.log(JSON.stringify(summary, null, 2));
