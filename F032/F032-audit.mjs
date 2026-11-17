import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const [rootArgument, operation] = process.argv.slice(2);
assert.ok(rootArgument && ['--finalize', '--verify'].includes(operation), 'Supply F032 root and --finalize or --verify.');
const root = path.resolve(rootArgument);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const at = file => path.join(root, ...file.split(/[\\/]/));
const leaf = file => file.split(/[\\/]/).at(-1);
const relocate = original => {
  const marker = '/autoperf-runs/F032/';
  const normalized = original.replaceAll('\\', '/');
  const index = normalized.indexOf(marker);
  assert.ok(index >= 0, `Recorded path outside F032: ${original}`);
  return at(normalized.slice(index + marker.length));
};
const same = (left, right) => assert.ok(Math.abs(left - right) <= Math.max(1e-8, Math.abs(right) * 1e-10), `${left} != ${right}`);
const profiles = ['Request.Sync.None.1', 'Request.Sync.Ready.1', 'Request.Sync.Ready.64',
  'Request.Async.Ready.1', 'Live.Sync.Started', 'Live.Async.Started'];
const plan = read(at('measurement-plan.json'));
const budget = read(at('measurement-budget.json'));
const amendment = read(at('measurement-plan-lifecycle-amendment.json'));
assert.equal(plan.definedBeforeFirstTiming, true);
assert.equal(plan.maximumActualSourceComparisons, 3);
assert.deepEqual(plan.profiles, profiles);
assert.equal(read(at('acceptance.json')).definedBeforeProductEditsOrTiming, true);
assert.equal(amendment.actualOriginalPlanSha256, sha(at('measurement-plan.json')));
assert.equal(amendment.actualFailedSourceComparisonStillConsumed, 1);
assert.equal(amendment.actualRemainingSourceComparisons, 2);
assert.equal(amendment.actualSourceOptimizationStrategyUnchanged, true);
assert.equal(amendment.actualSixProfilesAndOperationBoundariesUnchanged, true);
assert.equal(amendment.actualBenchmarkDotNetAndEmitterUnchanged, true);
assert.equal(budget.maximumActualSourceComparisons, 3);
assert.equal(budget.actualSourceComparisonsStarted, 3);
assert.equal(budget.actualSourceComparisonsCompleted, 2);
assert.equal(budget.actualSourceComparisonsConcluded, 3);
assert.equal(budget.sourceComparisonBudgetClosed, true);
assert.equal(budget.allPartialOrFailedComparisonsConsumeTheirSlot, true);
assert.deepEqual(budget.comparisonsSettled.map(row => [row.round, row.actualCompletedPair]), [[1, false], [2, true], [3, true]]);
const timedOrder = [[1, 'original'], [2, 'candidate'], [2, 'original'], [3, 'original'], [3, 'candidate']]
  .map(([round, variant]) => ({ round, variant, label: `round-${round}-${variant}` }));
assert.equal(budget.nativeProfilesStarted.length, 5);
assert.equal(budget.nativeProfilesCompleted.length, 4);
for (const [index, row] of timedOrder.entries()) {
  for (const key of ['round', 'variant', 'label']) {
    assert.equal(budget.nativeProfilesStarted[index][key], row[key]);
    if (index > 0) {
      assert.equal(budget.nativeProfilesCompleted[index - 1][key], row[key]);
    }
  }
}
const originalBudget = read(at('profiles/round-1-original/budget-before-native-launch.json'));
assert.equal(originalBudget.actualSourceComparisonsStarted, 1);
assert.equal(originalBudget.actualSourceComparisonsCompleted, 0);
assert.equal(originalBudget.nativeProfilesStarted.length, 1);
const investigation = read(at('investigation.json'));
assert.equal(investigation.actualSelectedFilePairs, 16);
assert.equal(investigation.actualSelectedSourceParity, true);
assert.equal(investigation.actualRawSnapshots, 54);
assert.equal(investigation.parity.length, 18);
assert.equal(investigation.actualSelectedInterveningHistory, '');
assert.equal(investigation.actualDocumentationExit, 0);
for (const [index, entry] of investigation.parity.entries()) {
  const prefix = `${String(index).padStart(2, '0')}-${leaf(entry.file)}`;
  for (const [variant, expected] of [['baseline', entry.actualBaselineBlobBytesSha256],
    ['current', entry.actualCurrentBlobBytesSha256], ['working', entry.actualWorkingBytesSha256]]) {
    assert.equal(sha(at(`source-snapshots/${prefix}.${variant}`)), expected);
  }
  if (entry.core) {
    assert.equal(entry.actualBaselineAndCurrentBlobBytesEqual, true);
    assert.equal(entry.actualWorkingLfBytesMatchBaselineBlob, true);
  }
}
const tests = new Map();
const xmlDecode = value => value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
for (const variant of ['original', 'candidate']) {
  const directory = at(`validation/${variant}-existing-1`);
  const verified = read(path.join(directory, 'verified-result.json'));
  const outcomes = read(path.join(directory, 'actual-outcomes.json'));
  assert.equal(read(path.join(directory, 'invocation.json')).actualExitCode, 0);
  assert.equal(verified.actualPassed, 15);
  assert.equal(verified.actualSkipped, 0);
  assert.equal(verified.actualFailures, 0);
  assert.deepEqual(verified.actualBooleanTheoryValues, ['false', 'true']);
  assert.equal(outcomes.actualXmlSha256, sha(path.join(directory, 'owning.trx')));
  const xml = fs.readFileSync(path.join(directory, 'owning.trx'), 'utf8');
  const rows = [...xml.matchAll(/<UnitTestResult\b([^>]*?)(?:\/>|>)/g)].map(match =>
    Object.fromEntries([...match[1].matchAll(/([\w:]+)="([^"]*)"/g)].map(([, key, value]) => [key, xmlDecode(value)])));
  assert.equal(rows.length, 15);
  assert.equal(outcomes.actualOutcomes.length, 15);
  assert.equal(new Set(rows.map(row => row.executionId)).size, 15);
  assert.ok(rows.every(row => row.outcome === 'Passed'));
  for (const row of outcomes.actualOutcomes) {
    assert.equal(rows.filter(value => value.executionId === row.executionId && value.testId === row.testId &&
      value.testName === row.name && value.outcome === row.outcome).length, 1);
  }
  for (const selected of verified.actualSelection) {
    assert.equal(rows.filter(row => row.testName === selected.method ||
      row.testName.startsWith(selected.method + '(')).length, selected.rows);
  }
  assert.equal(sha(path.join(directory, 'ResponseStream.cs.executed-source')), verified.actualResponseStreamSourceSha256);
  tests.set(variant, { verified, outcomes });
}
assert.deepEqual(tests.get('original').outcomes.actualOutcomes.map(row => row.name).sort(),
  tests.get('candidate').outcomes.actualOutcomes.map(row => row.name).sort());
const originalSource = fs.readFileSync(at('validation/original-existing-1/ResponseStream.cs.executed-source'), 'utf8').replaceAll('\r\n', '\n');
const candidateSource = fs.readFileSync(at('validation/candidate-existing-1/ResponseStream.cs.executed-source'), 'utf8').replaceAll('\r\n', '\n');
const seam = '    public override void Flush()\n    {\n        _onStart().GetAwaiter().GetResult();\n        _innerStream.Flush();';
assert.equal(originalSource.split(seam).length, 2);
assert.equal(candidateSource, originalSource.replace(seam,
  '    public override void Flush()\n    {\n        var startTask = _onStart();\n' +
  '        if (!startTask.IsCompletedSuccessfully)\n        {\n            startTask.GetAwaiter().GetResult();\n        }\n\n        _innerStream.Flush();'));
assert.equal(read(at('candidate-shipping-whitespace.json')).actualExitCode, 0);
const rebuildFailure = read(at('lifecycle-original-owner-rebuild/postcondition-failure-reverification.json'));
assert.equal(read(at('lifecycle-original-owner-rebuild/invocation.json')).actualExitCode, 0);
assert.equal(rebuildFailure.actualInitialPostconditionFailed, true);
assert.equal(rebuildFailure.actualInitialVerificationReceiptAbsent, true);
assert.equal(rebuildFailure.actualObservedInitialProductHash, tests.get('candidate').verified.actualOwners[0].actualOwnerSha256);
assert.equal(rebuildFailure.actualRestoredSourceSha256, tests.get('original').verified.actualResponseStreamSourceSha256);
for (const label of ['lifecycle-original-owner-rebuild-002', 'lifecycle-candidate-owner-rebuild', 'restored-owner-build']) {
  const invocation = read(at(`${label}/invocation.json`));
  const verified = read(at(`${label}/verified-rebuild.json`));
  assert.equal(invocation.actualExitCode, 0);
  assert.equal(invocation.arguments.includes('--no-incremental'), true);
  assert.equal(invocation.arguments.includes('-p:BuildProjectReferences=false'), true);
  assert.equal(verified.actualRebuiltProductDllAndPdbMatchOriginallyTestedOwners, true);
  assert.equal(verified.actualSourceByteExactToPreviouslyTestedSnapshot, true);
}
const preparationLabels = ['preparation-original', 'preparation-original-002', 'preparation-candidate',
  'preparation-original-003', 'preparation-candidate-002', 'reproduction-preparation'];
const capsules = new Map();
for (const label of preparationLabels) {
  const capsule = read(at(`${label}/prepared/capsule.json`));
  assert.equal(capsule.actualClosureFiles, 186);
  assert.equal(capsule.actualSourceHeadAtBuild, '37e809ead5824bc753a1c3d56f11615bdb1296c5');
  assert.equal(capsule.actualSettingsExecutorSourceSha256, '02B69C0AA06612700D9DA122BA64081771EE333B126DABC08156C0BD118F115B');
  assert.equal(capsule.actualWhitespaceVerifiedBeforeFreeze, true);
  assert.equal(capsule.actualRepoEditorConfigSha256, sha(at('.editorconfig')));
  assert.deepEqual(capsule.actualTestedOwners, tests.get(capsule.variant).verified.actualOwners);
  const closure = read(relocate(capsule.closurePath));
  assert.equal(closure.files.length, 186);
  assert.equal(new Set(closure.files.map(row => row.path)).size, 186);
  for (const source of capsule.sourceFiles) {
    assert.equal(sha(path.join(path.dirname(relocate(capsule.closurePath)), ...source.path.split(/[\\/]/))), source.sha256);
  }
  if (capsule.actualHarnessRebuilt) {
    const commands = read(at(`${label}/actual-invocations.json`));
    assert.deepEqual(commands.map(row => row.actualExitCode), [0, 0, 0]);
    assert.equal(commands[1].arguments.includes('--verify-no-changes'), true);
    assert.equal(commands[1].arguments.filter(value => value.endsWith('.cs')).length, 5);
    const build = fs.readFileSync(at(`${label}/build.stdout`), 'utf8');
    assert.match(build, label === 'preparation-original' ? /11 Warning\(s\)[\s\S]*0 Error\(s\)/ : /0 Warning\(s\)[\s\S]*0 Error\(s\)/);
  } else {
    assert.equal(read(at(`${label}/identical-harness-owner-patch.json`)).actualHarnessRebuilt, false);
  }
  capsules.set(label, { ...capsule, closure });
}
function compareImages(originalLabel, candidateLabel) {
  const original = capsules.get(originalLabel);
  const candidate = capsules.get(candidateLabel);
  assert.equal(original.actualHarnessSha256, candidate.actualHarnessSha256);
  assert.equal(original.actualHarnessPdbSha256, candidate.actualHarnessPdbSha256);
  const files = new Map(original.closure.files.map(row => [row.path, row.sha256]));
  const differences = candidate.closure.files.filter(row => row.sha256 !== files.get(row.path));
  assert.deepEqual(differences.map(row => row.path).sort(),
    ['Microsoft.AspNetCore.Server.HttpSys.dll', 'Microsoft.AspNetCore.Server.HttpSys.pdb']);
  return differences;
}
compareImages('preparation-original-002', 'preparation-candidate');
const differingFiles = compareImages('preparation-original-003', 'preparation-candidate-002');
for (const file of capsules.get('preparation-original-003').sourceFiles.filter(row => row.path.replaceAll('\\', '/').startsWith('sources/harness/'))) {
  assert.equal(capsules.get('preparation-candidate-002').sourceFiles.find(row => row.path === file.path)?.sha256, file.sha256);
  assert.equal(sha(at('harness/' + leaf(file.path))), file.sha256);
}
const relocated = read(at('relocated-harness-copy.json'));
assert.equal(relocated.actualFiles, 6);
assert.equal(relocated.actualSourcesByteExact, true);
for (const row of relocated.mappings) {
  assert.equal(sha(relocate(row.original)), row.sha256);
  assert.equal(sha(relocate(row.copy)), row.sha256);
}
const nativeLabels = ['characterize-original', 'characterize-candidate', 'characterize-original-002',
  'characterize-candidate-002', 'reproduction-characterized', ...timedOrder.map(row => row.label)];
assert.deepEqual(fs.readdirSync(at('profiles')).sort(), [...nativeLabels].sort());
const contracts = [], auditedProfiles = [], results = [], runtimeBindings = [];
let settingsCount = 0, failedSettingsCount = 0, matchedStdoutSamples = 0;
let totalTimedSeconds = 0, failedGlobalSeconds = 0, startedListeners = 0, disposedListeners = 0;
function verifyPlan(value) {
  assert.equal(value.actualStreamType, 'Microsoft.AspNetCore.Server.HttpSys.ResponseStream');
  assert.equal(value.actualPublicHasStarted, true);
  assert.equal(value.requestAbortProducerTest, false);
  assert.equal(value.harnessTaskWaitInsideSynchronousServerCall, false);
}
function verifyTerminal(row) {
  const value = row.actualPlan;
  verifyPlan(value);
  assert.equal(value.actualApplicationFinished, true);
  assert.equal(value.actualPublicInvocationFinished, true);
  assert.equal(value.actualCallbackTaskIncomplete, false);
  assert.equal(value.actualHeadersReadOnly, true);
  assert.equal(row.actualWireSuccess, true);
  assert.equal(row.actualWirePayload, value.actualPublicInvocationSucceeded ? 'returned|after' : 'caught|after');
  const callbackFailed = /Failure|Cancellation|Faulted|Canceled/.test(value.callback);
  assert.deepEqual(value.actualCallbackOrder, value.callback === 'None' ? [] :
    callbackFailed ? ['new-enter'] : ['new-enter', 'new-exit', 'old']);
  assert.equal(row.actualWireStartingHeader, value.callback === 'None' || callbackFailed ? null : 'ready');
  assert.equal(row.actualWireOrderHeader, value.callback === 'None' || callbackFailed ? null : 'new-enter,new-exit,old');
  assert.equal(value.actualHeadersReadOnlyAfterInvocation, !callbackFailed);
  assert.equal(value.actualFailureReferencePreserved, /Failure|Faulted/.test(value.callback));
  assert.equal(value.actualProducerTokenPreserved, /Cancellation|Canceled/.test(value.callback));
  if (value.actualFailureReferencePreserved || !value.actualAllowSynchronousIO) {
    assert.equal(value.actualPublicErrorType, 'System.InvalidOperationException');
  } else if (value.actualProducerTokenPreserved) {
    assert.ok(['System.OperationCanceledException', 'System.Threading.Tasks.TaskCanceledException'].includes(value.actualPublicErrorType));
  } else {
    assert.equal(value.actualPublicErrorType, null);
  }
}
for (const label of nativeLabels) {
  const directory = at(`profiles/${label}`);
  const invocation = read(path.join(directory, 'invocation.json'));
  const capsule = capsules.get(invocation.preparation);
  assert.ok(capsule);
  const characterizing = invocation.mode === 'characterize';
  const failed = label === 'round-1-original';
  const old = ['characterize-original', 'characterize-candidate'].includes(label);
  assert.equal(invocation.actualExitCode, failed ? -532462766 : 0);
  if (!failed) {
    const exit = read(path.join(directory, 'verified-native-exit.json'));
    assert.equal(exit.actualNativeExitCode, 0);
    assert.equal(exit.actualClosureBeforeAndAfterMatched, true);
  }
  assert.equal(invocation.variant, capsule.variant);
  assert.equal(invocation.actualHarnessSha256, capsule.actualHarnessSha256);
  assert.equal(invocation.actualHarnessPdbSha256, capsule.actualHarnessPdbSha256);
  assert.equal(invocation.actualClosureFileCount, 186);
  assert.equal(invocation.actualClosureSha256, sha(relocate(capsule.closurePath)));
  const states = fs.readdirSync(path.join(directory, 'states')).filter(file => file.endsWith('.json')).map(file =>
    ({ file, value: read(path.join(directory, 'states', file)) }));
  const matching = ending => states.filter(row => row.file.endsWith(ending)).map(row => row.value);
  const single = ending => {
    const rows = matching(ending);
    assert.equal(rows.length, 1, `${label}: ${ending}`);
    return rows[0];
  };
  const before = single(`-runtime-${invocation.mode}-before.json`);
  if (!failed) {
    assert.equal(single(`-runtime-${invocation.mode}-after.json`).processId, before.processId);
  }
  const runtimes = states.filter(row => row.file.includes('-runtime-')).map(row => row.value);
  assert.equal(runtimes.length, failed || old ? 2 : 8);
  for (const runtime of runtimes) {
    assert.equal(runtime.processId, before.processId);
    assert.equal(runtime.variant, capsule.variant);
    assert.equal(runtime.serverGc, true);
    assert.equal(runtime.actualX64Process, true);
    assert.equal(runtime.sharedMachineNotIsolated, true);
    assert.equal(runtime.actualClosureSha256, invocation.actualClosureSha256);
    assert.equal(runtime.initialSettings.processPriority, 'Normal');
    assert.equal(runtime.initialSettings.threadPriority, 'Normal');
    assert.deepEqual(runtime.initialSettings, before.initialSettings);
    assert.equal(runtime.runtimeAssemblies.find(row => row.name === 'System.Private.CoreLib')?.sha256,
      '0CEBA028A838AFF170CFF9D03570B34F9F044D6A9597974088E58B9834DF74E4');
    assert.equal(runtime.runtimeAssemblies.find(row => row.name === 'AutoPerf.Benchmarks')?.sha256, capsule.actualHarnessSha256);
    for (const owner of capsule.actualTestedOwners) {
      assert.equal(runtime.runtimeAssemblies.find(row => row.name === owner.assembly)?.sha256, owner.actualOwnerSha256);
    }
    runtimeBindings.push(...runtime.runtimeAssemblies.map(row => ({ profile: label, ...row })));
  }
  for (const [assembly, count] of [['Microsoft.AspNetCore.Server.HttpSys', 4], ['AutoPerf.Benchmarks', 5]]) {
    const witness = single(`-source-pdb-${assembly}.json`);
    assert.equal(witness.actualPePdbBindingMatched, true);
    assert.equal(witness.codeViewGuid, witness.pdbGuid);
    assert.equal(witness.assemblySha256, before.runtimeAssemblies.find(row => row.name === assembly)?.sha256);
    assert.equal(witness.documents.length, count);
    for (const document of witness.documents) {
      const file = relocate(document.source);
      assert.equal(sha(file), document.sha256);
      const algorithm = document.algorithm.toLowerCase() === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256'
        : document.algorithm.toLowerCase() === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
      assert.ok(algorithm);
      assert.equal(createHash(algorithm).update(fs.readFileSync(file)).digest('hex').toUpperCase(), document.checksum);
    }
  }
  const started = matching('-actual-listener-started.json');
  const disposed = matching('-actual-listener-disposed.json');
  assert.equal(started.length, failed || old ? 1 : characterizing ? 7 : 6);
  assert.equal(disposed.length, failed ? 0 : started.length);
  startedListeners += started.length;
  disposedListeners += disposed.length;
  for (const row of started) {
    assert.equal(row.actualNativeHostStarted, true);
    assert.equal(row.actualUniqueEphemeralLoopback, true);
    assert.equal(row.actualMaxAccepts, 1);
    assert.ok(row.actualPort > 0);
  }
  for (const row of disposed) {
    assert.equal(row.actualHostStoppedAndDisposed, true);
    assert.equal(row.actualRemainingRequests, 0);
  }
  if (characterizing) {
    const summary = single('-characterization-completed.json');
    assert.equal(summary.actualCompletedProfiles, 6);
    assert.equal(summary.actualAdditionalProducerContracts, 12);
    assert.equal(summary.actualAllSuccessful, true);
    assert.equal(summary.actualRealHttpSysHostAndAcceptedRequest, true);
    assert.equal(summary.directMockedStartTaskOrNativeRequestContext, false);
    const completed = matching('-completed-profile.json');
    assert.deepEqual(completed.map(row => row.actualPlan.profile).sort(), [...profiles].sort());
    const pending = matching('-pending-before-release.json');
    assert.deepEqual(pending.map(row => row.profile).sort(), [
      ...['Sync', 'Async'].flatMap(api => ['PendingSuccess', 'PendingFailure', 'PendingCancellation'].map(kind => `${api}.${kind}.Enabled`)),
      'Sync.PendingSuccess.DefaultDisabled',
    ].sort());
    for (const row of pending) {
      verifyPlan(row.actualPlan);
      assert.equal(row.actualPlan.actualCallbackTaskIncomplete, true);
      assert.equal(row.actualPlan.actualPublicInvocationFinished, false);
      assert.equal(row.actualPlan.actualApplicationFinished, false);
      assert.equal(row.actualPlan.actualHeadersReadOnly, false);
      assert.deepEqual(row.actualPlan.actualCallbackOrder, ['new-enter']);
      assert.equal(row.actualClientHeadersReturned, false);
      assert.equal(row.actualSynchronousCallerWaiting, row.profile.startsWith('Sync.'));
      assert.equal(row.actualPlan.actualAsyncFlushReturnedIncomplete, row.profile.startsWith('Async.'));
    }
    const after = matching('-pending-after-release.json');
    assert.deepEqual(after.map(row => row.actualPlan.profile).sort(), pending.map(row => row.profile).sort());
    const already = matching('-already-failed-producer.json');
    assert.deepEqual(already.map(row => row.actualPlan.callback).sort(), ['AlreadyCanceled', 'AlreadyFaulted']);
    const disabled = single('-default-sync-disabled.json');
    assert.equal(disabled.actualPlan.actualAllowSynchronousIO, false);
    [ ...completed, ...after, ...already, disabled, single('-completed-async-control.json'),
      single('-no-callback-async-control.json') ].forEach(verifyTerminal);
    const held = matching('-completed-live-before-release.json');
    assert.equal(held.length, 2);
    held.forEach(row => {
      verifyPlan(row);
      assert.equal(row.actualApplicationFinished, false);
      assert.equal(row.actualHeadersReadOnly, true);
      assert.equal(row.actualLive, true);
    });
    const lifecycle = matching('-benchmark-lifecycle-characterized.json');
    assert.equal(lifecycle.length, old ? 0 : 6);
    if (!old) {
      assert.equal(summary.actualBenchmarkLifecycleProfiles, 6);
      assert.deepEqual(lifecycle.map(row => row.profile).sort(), [...profiles].sort());
      for (const row of lifecycle) {
        assert.equal(row.actualSetupReturnedBeforeWorkload, true);
        assert.equal(row.actualCleanupReturnedAfterWireConsumptionAndHostDisposal, true);
        assert.equal(row.actualResult, row.profile.startsWith('Live.') ? 1 : 14);
        assert.equal(row.timing, false);
      }
    }
    contracts.push({ label, actualCompletedProfiles: 6, actualAdditionalRealProducerContracts: 12, actualBenchmarkLifecycleProfiles: lifecycle.length });
  } else {
    for (const ending of ['-settings-before.json', '-settings-after.json']) {
      const rows = matching(ending);
      assert.equal(rows.length, failed ? 1 : 6);
      rows.forEach(row => assert.deepEqual(row, before.initialSettings));
      if (failed) {
        failedSettingsCount += rows.length;
      } else {
        settingsCount += rows.length;
      }
    }
    const reportFile = path.join(directory, 'results', 'AutoPerf.FlushBenchmarks-report-full.json');
    const report = read(reportFile);
    const stdout = fs.readFileSync(path.join(directory, 'native.stdout'), 'utf8');
    const stdoutSamples = [...stdout.matchAll(/^WorkloadResult\s+\d+:\s+(\d+) op,\s+([\d.]+) ns,/gm)]
      .map(([, operations, nanoseconds]) => ({ operations: Number(operations), nanoseconds: Number(nanoseconds) }));
    const elapsed = /Global total time:[^\r\n]*\(([\d.]+) sec\)/.exec(stdout);
    assert.ok(elapsed);
    if (failed) {
      assert.equal(report.Benchmarks.length, 1);
      assert.equal(report.Benchmarks[0].Statistics, null);
      assert.equal(stdoutSamples.length, 0);
      assert.match(stdout, /Actual accepted request has not entered the application/);
      assert.equal(amendment.actualFailedInvocationSha256, sha(path.join(directory, 'invocation.json')));
      assert.equal(amendment.actualFailedStdoutSha256, sha(path.join(directory, 'native.stdout')));
      assert.equal(amendment.actualFailedJsonReportSha256, sha(reportFile));
      failedGlobalSeconds += Number(elapsed[1]);
    } else {
      const reached = matching('-benchmark-reached.json');
      assert.deepEqual(reached.map(row => row.profile).sort(), [...profiles].sort());
      for (const row of reached) {
        assert.equal(row.actualHostStarted, true);
        assert.equal(row.actualFullRequestConsumed, !row.profile.startsWith('Live.'));
        assert.equal(row.actualNoNewNetworkIoPerPreparedLiveFlush, row.profile.startsWith('Live.'));
        if (row.actualLivePlan) {
          verifyPlan(row.actualLivePlan);
          assert.equal(row.actualLivePlan.actualApplicationFinished, false);
          assert.equal(row.actualLivePlan.actualHeadersReadOnly, true);
        }
      }
      assert.equal(single('-completed.json').actualReports, 6);
      assert.equal(report.Benchmarks.length, 6);
      assert.equal(stdoutSamples.length, 48);
      totalTimedSeconds += Number(elapsed[1]);
      let stdoutIndex = 0;
      const observed = [];
      for (const row of report.Benchmarks) {
        const match = /^AutoPerf\.FlushBenchmarks\.FlushAndConsumeAsync\(Profile: "([^"]+)"\)$/.exec(row.FullName);
        assert.ok(match, row.FullName);
        assert.ok(profiles.includes(match[1]));
        observed.push(match[1]);
        for (const setting of ['OutlierMode=DontRemove', 'IterationCount=8', 'UnrollFactor=1', 'WarmupCount=3']) {
          assert.ok(row.DisplayInfo.includes(setting));
        }
        const samples = row.Measurements.filter(value => value.IterationMode === 'Workload' && value.IterationStage === 'Result');
        assert.equal(samples.length, 8);
        assert.equal(row.Statistics.N, 8);
        const values = samples.map(value => {
          assert.ok(value.Operations > 0 && value.Nanoseconds > 0);
          const raw = stdoutSamples[stdoutIndex++];
          assert.equal(raw.operations, value.Operations);
          same(raw.nanoseconds, value.Nanoseconds);
          return value.Nanoseconds / value.Operations;
        }).sort((left, right) => left - right);
        [...row.Statistics.OriginalValues].sort((left, right) => left - right).forEach((value, index) => same(value, values[index]));
        const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
        const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
        same(mean, row.Statistics.Mean);
        same(variance, row.Statistics.Variance);
        same(Math.sqrt(variance), row.Statistics.StandardDeviation);
        same(Math.sqrt(variance / values.length), row.Statistics.StandardError);
        assert.ok(Number.isFinite(row.Memory.BytesAllocatedPerOperation) && row.Memory.BytesAllocatedPerOperation >= 0);
        results.push({ label, round: invocation.round, variant: capsule.variant, profile: match[1],
          meanNanoseconds: mean, standardDeviationNanoseconds: Math.sqrt(variance),
          coefficientOfVariationPercent: 100 * Math.sqrt(variance) / mean,
          bytesPerOperation: row.Memory.BytesAllocatedPerOperation, retainedResults: values.length,
          actualValuesNanoseconds: values, reportedConfidenceInterval: row.Statistics.ConfidenceInterval,
          reportSha256: sha(reportFile), nativeStdoutSha256: sha(path.join(directory, 'native.stdout')) });
      }
      assert.deepEqual(observed.sort(), [...profiles].sort());
      matchedStdoutSamples += stdoutIndex;
    }
  }
  auditedProfiles.push({ label, actualNativeExit: invocation.actualExitCode, variant: capsule.variant,
    actualHarnessSha256: capsule.actualHarnessSha256, sourcePdbDocuments: 9, actualStartedListeners: started.length,
    actualGracefullyDisposedListeners: disposed.length });
}
assert.equal(matchedStdoutSamples, 192);
assert.equal(results.length, 24);
assert.equal(settingsCount, 48);
assert.equal(failedSettingsCount, 2);
assert.equal(startedListeners, 48);
assert.equal(disposedListeners, 47);
const processProbe = read(at('owned-native-process-exit-probe.json'));
assert.equal(processProbe.actualAllRecordedNativeProcessIdsAbsent, true);
assert.equal(processProbe.actualObservedProcesses.length, 0);
assert.equal(processProbe.actualProfiles.length, 10);
assert.equal(processProbe.actualSuccessfulListenerDisposalReceipts, disposedListeners);
assert.equal(processProbe.actualFailedListenerDisposalReceiptMissing, true);
const pairs = [2, 3].flatMap(round => profiles.map(profile => {
  const before = results.find(row => row.round === round && row.variant === 'original' && row.profile === profile);
  const after = results.find(row => row.round === round && row.variant === 'candidate' && row.profile === profile);
  assert.ok(before && after);
  return { round, profile, unchangedControl: profile.includes('.Async.'),
    originalMeanNanoseconds: before.meanNanoseconds, candidateMeanNanoseconds: after.meanNanoseconds,
    lessTimePercent: 100 * (1 - after.meanNanoseconds / before.meanNanoseconds),
    originalBytesPerOperation: before.bytesPerOperation, candidateBytesPerOperation: after.bytesPerOperation,
    fewerBytesPerOperation: before.bytesPerOperation - after.bytesPerOperation,
    originalCvPercent: before.coefficientOfVariationPercent, candidateCvPercent: after.coefficientOfVariationPercent };
}));
const primary = pairs.filter(row => row.profile === 'Live.Sync.Started');
assert.ok(primary.every(row => row.lessTimePercent < 0));
for (const profile of ['Request.Sync.None.1', 'Request.Sync.Ready.1']) {
  const rows = pairs.filter(row => row.profile === profile);
  assert.ok(rows[0].lessTimePercent > 0 && rows[1].lessTimePercent < 0);
}
const maximumCv = Math.max(...results.map(row => row.coefficientOfVariationPercent));
const limitations = [
  'No-gain means no convincing compatible benefit from this one completed-success guard,not zero original cost or proof that all future improvements are impossible. Original source/product restored;no optimization commit or performance PR.',
  'Three attempt slots are permanently consumed:round1original fails during async benchmark setup before any statistical sample;round2candidate/original and round3original/candidate are the only two completed pairs. Never describe these as three successful comparisons.',
  'Pinned BDN0.13.0in-process lifecycle initially does not await async GlobalSetup/GlobalCleanup. Retain the failed original image/logs/null-statistics report. Only harness lifecycle gains synchronous void adapters,outside measured operations;each corrected original/candidate/relocated image additionally completes all6actual setup/workload/cleanup lifecycles.',
  'Prepared Sync Flush regresses about1%in both valid pairs;ordinary full-request apparent gains reverse into regressions. Unchanged async controls also move. Shared non-isolated Windows VM;retain all192samples/outliers and reported allocation differences without causal small-difference or application-speedup claims.',
  'Full-request profiles include actual loopback client,server dispatch,plan/callback registration,flush,body/wire consumption and fixture bookkeeping. Ready64 means64synchronous flushes in one request,not64callbacks. Prepared live profiles use one already-started accepted request and one flush per operation,with no new network I/O;not isolated GetResult cost or production throughput.',
  'Default AllowSynchronousIO=false is preserved and independently exercised. Real OnStarting sets public HasStarted before awaiting callback;pending contracts observe true HasStarted,mutable headers and no received wire headers. Callback-gate cancellation is not RequestAborted production,starvation or deadlock proof.',
  'The first source restoration preserves old snapshot timestamps;an incremental owner build exits0but leaves the candidate image. Source/owner postcondition rejects it. Retain that wrapper failure;forced owner-only --no-incremental rebuilds byte-match the original/candidate tested DLL/PDB without test reruns.',
  'Initial uncharacterized preparation builds with11warnings/0errors. Generic IHost and configured async disposal fix them before any characterization/timing;corrected authoritative and relocated standalone builds have0warnings/0errors. All historical inputs/images/logs remain unchanged.',
  'All47successful native listeners have explicit stopped/disposed receipts. The setup-failed native process has no graceful listener-disposal receipt;its process exit and absence are recorded. Do not claim graceful managed cleanup for that failure.',
  'All192Workload.Result samples match native stdout and JSON;mean,sample variance,SD,SE are recomputed. MemoryDiagnoser allocations and confidence intervals are reported evidence,not independent cross-thread allocation/GC tracing or CI-distribution derivation.',
  'Measured original/candidate harness DLL/PDB and184other consumer files are identical;only actually tested HTTP.sys DLL/PDB differ. Relocated harness source is byte-exact and untimed;path-dependent rebuilt harness PE/PDB bytes need not equal the measured ones.',
  'Sixteen selected owner/API/test/producer files match current main90d90ff3;54raw snapshots include two changed toolchain context files. Pinned campaign SDK/runtime,not newer-default SDK integration or complete repository/history coverage. Remote code index unavailable for this GitHub checkout;LSP coverage is bounded.',
  'Portable audit rehashes copied textual sources/receipts,not omitted binary bytes. Live audit separately rehashes actual frozen files. Nine selected PE/PDB/source associations per native profile are not complete compiler provenance or method coverage.',
];
const audit = {
  candidate: 'F032', disposition: 'no-gain', actualSourceComparisons: 3, actualCompletedSourceComparisonPairs: 2,
  actualFailedSourceComparisonAttempts: 1, actualStrategyVariants: 1, actualTimedNativeProfilesStarted: 5,
  actualTimedNativeProfiles: 4, actualFailedTimedNativeProfiles: 1, actualRetainedResultSamples: matchedStdoutSamples,
  actualNativeStdoutSamplesMatchedToJson: matchedStdoutSamples, actualReportedRows: results.length,
  actualOwningRowsPerVariant: 15, actualOwningSkippedPerVariant: 0, actualConsumerFilesPerImage: 186,
  actualPreparationLabels: preparationLabels, actualMeasuredImagesUseIdenticalHarnessDllAndPdb: true,
  actualConsumerDifferences: differingFiles, actualCharacterizations: contracts, actualAuditedNativeProfiles: auditedProfiles,
  actualSettingsObservations: settingsCount, actualFailedAttemptSettingsObservations: failedSettingsCount,
  actualRecordedLoadedAssemblyBindings: runtimeBindings.length, actualSourcePdbDocumentsPerNativeProfile: 9,
  actualMaximumCvPercent: maximumCv, actualTimedGlobalSeconds: totalTimedSeconds, actualFailedGlobalSeconds: failedGlobalSeconds,
  actualPassingAuthoritativeStandaloneBuildWarnings: 0, actualInitialUncharacterizedBuildWarnings: 11,
  actualFailedOwnerRebuildPostconditionWrappers: 1, actualFailedNativeFunctionalTestRuns: 0,
  actualStartedNativeListeners: startedListeners, actualGracefulListenerDisposalReceipts: disposedListeners,
  actualAllRecordedNativeProcessIdsAbsent: true, actualFinalShippingChanges: 0,
  actualTimingBudgetPermanentlyClosed: true, pairs, results, limitations,
};
const decision = {
  candidate: 'F032', disposition: 'no-gain',
  qualification: 'Compatible Flush-only completed-task guard:two completed opposite-order pairs plus one retained setup-only failed attempt;no convincing benefit. Original restored;nonblocking synchronous return remains contract-blocked.',
  actualSourceComparisons: 3, actualCompletedSourceComparisonPairs: 2, actualFailedSourceComparisonAttempts: 1,
  actualSourceComparisonBudgetPermanentlyClosed: true, actualStrategyVariants: 1,
  actualTimedNativeProfiles: 4, actualFailedTimedNativeProfiles: 1, actualFinalShippingChanges: 0,
  actualPerformancePrCreated: false, actualOptimizationCommitCreated: false,
  actualOwningRowsPerVariant: 15, actualCompletedProfilesPerImage: 6, actualAdditionalProducerContractsPerImage: 12,
  actualBenchmarkLifecycleProfilesPerCorrectedImage: 6, actualCorrectedCharacterizedImageVariants: 3,
  actualEarlierCharacterizedImageVariantsRetained: 2, actualRawResultSamples: matchedStdoutSamples,
  actualIdenticalMeasuredHarnessDllAndPdb: true, actualOnlyChangedMeasuredConsumerFiles: differingFiles.map(row => row.path),
  actualMaximumCvPercent: maximumCv, actualSettingsObservations: settingsCount, actualFailedAttemptSettingsObservations: failedSettingsCount,
  actualTimedGlobalSeconds: totalTimedSeconds, actualFailedGlobalSeconds: failedGlobalSeconds,
  actualPublicApiAndBaselineChanges: 0, actualPassingAuthoritativeStandaloneBuildWarnings: 0,
  actualInitialUncharacterizedBuildWarnings: 11, actualFailedOwnerRebuildPostconditionWrappersRetained: 1,
  actualRestoredProductMatchesOriginallyTestedOwner: true, actualPreparedPrimaryPairs: primary,
  actualAllMeasuredSourcesAndImagesRetained: true, noClaims: limitations,
};
const table = [
  '| Profile | Attempt | Original us/op | Guard us/op | Less time % | Original B/op | Guard B/op | Original CV% | Guard CV% |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
  ...pairs.map(row => `| ${row.profile} | ${row.round} | ${(row.originalMeanNanoseconds / 1000).toFixed(6)} | ${(row.candidateMeanNanoseconds / 1000).toFixed(6)} | ${row.lessTimePercent.toFixed(2)} | ${row.originalBytesPerOperation} | ${row.candidateBytesPerOperation} | ${row.originalCvPercent.toFixed(2)} | ${row.candidateCvPercent.toFixed(2)} |`),
].join('\n');
const markdown = [
  '# F032 HTTP.sys Flush completed-success guard comparisons', '',
  '**No-gain:original source/product restored;no optimization commit or performance PR.**',
  'Three consumed attempt slots:one setup-only failure with no statistical sample,two successful six-profile pairs;24reported rows/all192samples retained.',
  'Positive less-time favors the guard;negative is regression. Async rows are unchanged controls. Attempt1has no fabricated comparison row.', '',
  table, '',
  `Maximum within-profile CV:${maximumCv.toFixed(2)}%. Actual cumulative successful global time:${totalTimedSeconds.toFixed(2)}seconds;failed setup profile:${failedGlobalSeconds.toFixed(2)}seconds.`,
  'Prepared Sync Flush stays near20ns and regresses in both pairs. Full-request apparent gains reverse. No structural allocation reduction or overall application-speedup claim.', '',
  ...limitations.map(value => `- ${value}`), '',
].join('\n');
for (const [file, value] of [['measurement-audit.json', audit], ['decision.json', decision]]) {
  if (operation === '--finalize') {
    assert.equal(fs.existsSync(at(file)), false, 'Do not overwrite a finalized audit.');
    fs.writeFileSync(at(file), JSON.stringify(value, null, 2) + '\n');
  } else {
    assert.deepEqual(read(at(file)), value);
  }
}
if (operation === '--finalize') {
  assert.equal(fs.existsSync(at('comparison-results.md')), false);
  fs.writeFileSync(at('comparison-results.md'), markdown);
} else {
  assert.equal(fs.readFileSync(at('comparison-results.md'), 'utf8'), markdown);
}
console.log(`F032:2x15owning rows,3corrected6/12+6and2earlier6/12characterizations,3consumed slots(2pairs+1setup failure),192stdout/JSON samples,${settingsCount}+${failedSettingsCount}settings;no-gain.`);
