import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const [rootArgument, operation] = process.argv.slice(2);
assert.ok(rootArgument && ['--finalize', '--verify'].includes(operation), 'Supply F033 root and --finalize or --verify.');
const root = path.resolve(rootArgument);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const at = file => path.join(root, ...file.split(/[\\/]/));
const leaf = file => file.split(/[\\/]/).at(-1);
const relocate = original => {
  const marker = '/autoperf-runs/F033/';
  const normalized = original.replaceAll('\\', '/');
  const index = normalized.indexOf(marker);
  assert.ok(index >= 0, `Recorded path outside F033: ${original}`);
  return at(normalized.slice(index + marker.length));
};
const same = (left, right) => assert.ok(Math.abs(left - right) <= Math.max(1e-8, Math.abs(right) * 1e-10), `${left} != ${right}`);
const profiles = ['Request.Sync.None.128', 'Request.Sync.Ready.128', 'Request.Sync.Ready.4096',
  'Request.Async.Ready.128', 'Live.Sync.Started.Zero', 'Live.Async.Started.Zero'];
const plan = read(at('measurement-plan.json'));
const budget = read(at('measurement-budget.json'));
assert.equal(plan.actualDeclaredBeforeProductEditAndNativeTiming, true);
assert.equal(plan.maximumActualSourceComparisons, 3);
assert.equal(plan.primaryProfile, 'Request.Sync.Ready.128');
assert.deepEqual(plan.profiles, profiles);
assert.equal(read(at('acceptance.json')).definedBeforeProductEditsOrTiming, true);
assert.equal(read(at('measurement-plan-receipt.json')).actualPlanSha256, sha(at('measurement-plan.json')));
assert.equal(read(at('premeasurement-contract-comparison.json')).actualPlanSha256, sha(at('measurement-plan.json')));
assert.equal(read(at('premeasurement-contract-comparison.json')).actualComparedSemanticObservations, 52);
assert.equal(read(at('premeasurement-contract-comparison.json')).actualConcreteErrorsParametersOrderHeadersAndWireMatched, true);
assert.equal(budget.maximumActualSourceComparisons, 3);
assert.equal(budget.actualSourceComparisonsStarted, 3);
assert.equal(budget.actualSourceComparisonsCompleted, 3);
assert.equal(budget.actualSourceComparisonsConcluded, 3);
assert.equal(budget.sourceComparisonBudgetClosed, true);
assert.deepEqual(budget.comparisonsSettled.map(row => [row.round, row.actualCompletedPair]), [[1, true], [2, true], [3, true]]);
const timedOrder = plan.pairedOrder.flatMap((variants, index) => variants.map(variant =>
  ({ round: index + 1, variant, label: `round-${index + 1}-${variant}` })));
assert.equal(budget.nativeProfilesStarted.length, 6);
assert.equal(budget.nativeProfilesCompleted.length, 6);
for (const [index, row] of timedOrder.entries()) {
  for (const key of ['round', 'variant', 'label']) {
    assert.equal(budget.nativeProfilesStarted[index][key], row[key]);
    assert.equal(budget.nativeProfilesCompleted[index][key], row[key]);
  }
  const before = read(at(`profiles/${row.label}/budget-before-native-launch.json`));
  assert.equal(before.actualSourceComparisonsStarted, row.round);
  assert.equal(before.nativeProfilesStarted.length, index + 1);
  assert.equal(before.nativeProfilesCompleted.length, index);
}
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
if (fs.existsSync(at('prepublication-default-refresh/verified-default-reassessment.json'))) {
  const reassessment = read(at('prepublication-default-refresh/verified-default-reassessment.json'));
  assert.equal(reassessment.actualInitiallyInvestigatedDefault, investigation.actualCurrentDefault);
  assert.equal(reassessment.actualSelectedFilePairs, 16);
  assert.equal(reassessment.actualAllSelectedSourcesMatchBaseline, true);
  assert.equal(reassessment.actualSelectedInterveningHistory, '');
  assert.equal(reassessment.actualNewSourceComparisons, 0);
  for (const row of reassessment.actualLatestSourceSnapshots) {
    assert.equal(sha(at('prepublication-default-refresh/' + row.snapshot)), row.actualLatestBlobSha256);
    assert.equal(row.actualLatestBlobSha256, row.expectedBaselineBlobSha256);
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
const seam = '    public override void Write(byte[] buffer, int offset, int count)\n    {\n        _onStart().GetAwaiter().GetResult();\n';
const guard = '    public override void Write(byte[] buffer, int offset, int count)\n    {\n        var startTask = _onStart();\n        if (!startTask.IsCompletedSuccessfully)\n        {\n            startTask.GetAwaiter().GetResult();\n        }\n\n';
assert.equal(originalSource.split(seam).length, 2);
assert.equal(candidateSource, originalSource.replace(seam, guard));
assert.equal(read(at('candidate-shipping-whitespace.json')).actualExitCode, 0);
assert.equal(read(at('candidate-source-format.json')).actualExitCode, 0);
assert.equal(read(at('candidate-source-format.json')).actualVerifyNoChanges, true);
for (const [label, variant] of [['reproduction-original-owner-build', 'original'], ['final-candidate-owner-build', 'candidate']]) {
  const invocation = read(at(`${label}/invocation.json`));
  const verified = read(at(`${label}/verified-rebuild.json`));
  assert.equal(invocation.actualExitCode, 0);
  assert.equal(invocation.variant, variant);
  assert.equal(invocation.arguments.includes('--no-incremental'), true);
  assert.equal(invocation.arguments.includes('-p:BuildProjectReferences=false'), true);
  assert.equal(verified.actualRebuiltProductDllAndPdbMatchOriginallyTestedOwners, true);
  assert.equal(verified.actualSourceByteExactToPreviouslyTestedSnapshot, true);
  assert.equal(verified.actualSourceSha256, tests.get(variant).verified.actualResponseStreamSourceSha256);
  assert.equal(invocation.actualTimingRerunPerformed, false);
}
const preparationLabels = ['preparation-original', 'preparation-original-002', 'preparation-candidate', 'reproduction-preparation'];
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
    assert.match(fs.readFileSync(at(`${label}/build.stdout`), 'utf8'), /0 Warning\(s\)[\s\S]*0 Error\(s\)/);
  } else {
    assert.equal(read(at(`${label}/identical-harness-owner-patch.json`)).actualHarnessRebuilt, false);
  }
  capsules.set(label, { ...capsule, closure });
}
const original = capsules.get('preparation-original-002');
const candidate = capsules.get('preparation-candidate');
assert.equal(original.actualHarnessSha256, candidate.actualHarnessSha256);
assert.equal(original.actualHarnessPdbSha256, candidate.actualHarnessPdbSha256);
const originalFiles = new Map(original.closure.files.map(row => [row.path, row.sha256]));
const differingFiles = candidate.closure.files.filter(row => row.sha256 !== originalFiles.get(row.path));
assert.deepEqual(differingFiles.map(row => row.path).sort(),
  ['Microsoft.AspNetCore.Server.HttpSys.dll', 'Microsoft.AspNetCore.Server.HttpSys.pdb']);
for (const file of original.sourceFiles.filter(row => row.path.replaceAll('\\', '/').startsWith('sources/harness/'))) {
  assert.equal(candidate.sourceFiles.find(row => row.path === file.path)?.sha256, file.sha256);
  assert.equal(sha(at('harness/' + leaf(file.path))), file.sha256);
}
const relocated = read(at('relocated-harness-copy.json'));
assert.equal(relocated.actualFiles, 6);
assert.equal(relocated.actualSourcesByteExact, true);
for (const row of relocated.mappings) {
  assert.equal(sha(relocate(row.original)), row.sha256);
  assert.equal(sha(relocate(row.copy)), row.sha256);
}
const semanticEvents = new Set(['completed-profile', 'completed-live-before-release', 'pending-before-release',
  'pending-after-release', 'already-failed-producer', 'default-sync-disabled', 'completed-async-control',
  'no-callback-async-control', 'invalid-arguments-observed', 'invalid-arguments-after-start', 'zero-first-write',
  'benchmark-lifecycle-characterized']);
function normalizeOwner(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeOwner);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'actualStreamOwner')
      .map(([key, item]) => [key, normalizeOwner(item)]));
  }
  return value;
}
function verifyPlan(value) {
  assert.equal(value.actualStreamType, 'Microsoft.AspNetCore.Server.HttpSys.ResponseStream');
  assert.equal(value.actualPublicHasStarted, true);
  assert.equal(value.requestAbortProducerTest, false);
  assert.equal(value.harnessTaskWaitInsideSynchronousServerCall, false);
  assert.equal(value.actualOperationBufferOffset, 3);
}
function verifyTerminal(row) {
  const value = row.actualPlan;
  verifyPlan(value);
  assert.equal(value.actualApplicationFinished, true);
  assert.equal(value.actualPublicInvocationFinished, true);
  assert.equal(value.actualCallbackTaskIncomplete, false);
  assert.equal(value.actualHeadersReadOnly, true);
  assert.equal(row.actualWireSuccess, true);
  const expected = Buffer.concat([value.actualPublicInvocationSucceeded ?
    Buffer.alloc(value.actualOperationPayloadLength, 'w') : Buffer.alloc(0),
    Buffer.from(value.actualPublicInvocationSucceeded ? 'returned|after' : 'caught|after')]);
  assert.equal(row.actualWirePayloadBytes, expected.length);
  assert.equal(row.actualWirePayloadSha256, createHash('sha256').update(expected).digest('hex').toUpperCase());
  const callbackFailed = /Failure|Cancellation|Faulted|Canceled/.test(value.callback);
  const invalid = value.actualBufferCase !== 'Valid' && !callbackFailed;
  assert.deepEqual(value.actualCallbackOrder, value.callback === 'None' ? [] :
    callbackFailed ? ['new-enter'] : ['new-enter', 'new-exit', 'old']);
  assert.equal(row.actualWireStartingHeader, value.callback === 'None' || callbackFailed ? null : 'ready');
  assert.equal(row.actualWireOrderHeader, value.callback === 'None' || callbackFailed ? null : 'new-enter,new-exit,old');
  assert.equal(value.actualHeadersReadOnlyAfterInvocation, !callbackFailed);
  assert.equal(value.actualFailureReferencePreserved, /Failure|Faulted/.test(value.callback));
  assert.equal(value.actualProducerTokenPreserved, /Cancellation|Canceled/.test(value.callback));
  if (invalid) {
    assert.equal(value.actualPublicInvocationSucceeded, false);
    assert.equal(value.actualPublicErrorType, value.actualBufferCase === 'Null' ?
      'System.ArgumentNullException' : 'System.ArgumentOutOfRangeException');
    assert.equal(value.actualArgumentParameter, value.actualBufferCase === 'Null' ? 'buffer' :
      value.actualBufferCase === 'NegativeOffset' ? 'offset' : 'count');
  } else if (value.actualFailureReferencePreserved || !value.actualAllowSynchronousIO) {
    assert.equal(value.actualPublicErrorType, 'System.InvalidOperationException');
  } else if (value.actualProducerTokenPreserved) {
    assert.ok(['System.OperationCanceledException', 'System.Threading.Tasks.TaskCanceledException'].includes(value.actualPublicErrorType));
  } else {
    assert.equal(value.actualPublicErrorType, null);
    assert.equal(value.actualPublicInvocationSucceeded, true);
  }
}
const nativeLabels = ['characterize-original', 'characterize-original-002', 'characterize-candidate',
  'reproduction-characterized', ...timedOrder.map(row => row.label)];
assert.deepEqual(fs.readdirSync(at('profiles')).sort(), [...nativeLabels].sort());
const contracts = [], auditedProfiles = [], results = [], runtimeBindings = [], semanticSets = [];
let settingsCount = 0, matchedStdoutSamples = 0, totalTimedSeconds = 0, startedListeners = 0, disposedListeners = 0;
for (const label of nativeLabels) {
  const directory = at(`profiles/${label}`);
  const invocation = read(path.join(directory, 'invocation.json'));
  const capsule = capsules.get(invocation.preparation);
  assert.ok(capsule);
  const characterizing = invocation.mode === 'characterize';
  const failed = label === 'characterize-original';
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
    assert.equal(rows.length, 1, `${label}:${ending}`);
    return rows[0];
  };
  const before = single(`-runtime-${invocation.mode}-before.json`);
  if (!failed) {
    assert.equal(single(`-runtime-${invocation.mode}-after.json`).processId, before.processId);
  }
  const runtimes = states.filter(row => row.file.includes('-runtime-')).map(row => row.value);
  assert.equal(runtimes.length, failed ? 1 : 8);
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
      const loaded = runtime.runtimeAssemblies.find(row => row.name === owner.assembly);
      assert.equal(loaded?.sha256, owner.actualOwnerSha256);
      assert.equal(loaded?.path, path.join(capsule.output, owner.assembly + '.dll'));
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
  assert.equal(started.length, failed ? 1 : characterizing ? 7 : 6);
  assert.equal(disposed.length, started.length);
  startedListeners += started.length;
  disposedListeners += disposed.length;
  started.forEach(row => {
    assert.equal(row.actualNativeHostStarted, true);
    assert.equal(row.actualUniqueEphemeralLoopback, true);
    assert.equal(row.actualMaxAccepts, 1);
    assert.ok(row.actualPort > 0);
  });
  disposed.forEach(row => {
    assert.equal(row.actualHostStoppedAndDisposed, true);
    assert.equal(row.actualRemainingRequests, 0);
  });
  if (failed) {
    assert.equal(characterizing, true);
    assert.equal(invocation.actualTimingProfile, false);
    assert.equal(matching('-characterization-completed.json').length, 0);
    assert.equal(matching('-benchmark-lifecycle-characterized.json').length, 0);
    assert.equal(matching('-completed-profile.json').length, 6);
    assert.equal(matching('-pending-before-release.json').length, 7);
    assert.equal(matching('-invalid-arguments-after-start.json').length, 3);
    assert.match(fs.readFileSync(path.join(directory, 'native.stderr'), 'utf8'), /Actual OnStarting must finish before exact native argument validation/);
  } else if (characterizing) {
    const summary = single('-characterization-completed.json');
    assert.equal(summary.actualCompletedProfiles, 6);
    assert.equal(summary.actualAdditionalProducerContracts, 22);
    assert.equal(summary.actualBenchmarkLifecycleProfiles, 6);
    assert.equal(summary.actualAllSuccessful, true);
    assert.equal(summary.actualRealHttpSysHostAndAcceptedRequest, true);
    assert.equal(summary.directMockedStartTaskOrNativeRequestContext, false);
    const completed = matching('-completed-profile.json');
    assert.deepEqual(completed.map(row => row.actualPlan.profile).sort(), [...profiles].sort());
    const pending = matching('-pending-before-release.json');
    assert.deepEqual(pending.map(row => row.profile).sort(), [
      ...['Sync', 'Async'].flatMap(api => ['PendingSuccess', 'PendingFailure', 'PendingCancellation'].map(kind => `${api}.${kind}.Enabled.Valid`)),
      'Sync.PendingSuccess.DefaultDisabled.Valid',
      ...['PendingSuccess', 'PendingFailure', 'PendingCancellation'].map(kind => `Sync.${kind}.Enabled.NegativeCount`),
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
      assert.equal(row.actualPlan.actualAsyncWriteReturnedIncomplete, row.profile.startsWith('Async.'));
    }
    const after = matching('-pending-after-release.json');
    assert.deepEqual(after.map(row => row.actualPlan.profile).sort(), pending.map(row => row.profile).sort());
    const terminals = [...completed, ...after, ...matching('-already-failed-producer.json'),
      single('-default-sync-disabled.json'), single('-completed-async-control.json'), single('-no-callback-async-control.json'),
      ...matching('-invalid-arguments-after-start.json'), ...matching('-zero-first-write.json')];
    assert.equal(terminals.length, 28);
    terminals.forEach(verifyTerminal);
    assert.equal(matching('-invalid-arguments-observed.json').length, 6);
    const lifecycle = matching('-benchmark-lifecycle-characterized.json');
    assert.equal(lifecycle.length, 6);
    assert.deepEqual(lifecycle.map(row => row.profile).sort(), [...profiles].sort());
    for (const row of lifecycle) {
      assert.equal(row.actualSetupReturnedBeforeWorkload, true);
      assert.equal(row.actualCleanupReturnedAfterWireConsumptionAndHostDisposal, true);
      assert.equal(row.actualResult, row.profile.startsWith('Live.') ? 1 : row.profile.endsWith('.4096') ? 4110 : 142);
      assert.equal(row.timing, false);
    }
    const semantic = states.filter(row => semanticEvents.has(row.file.replace(/^\d+-/, '').replace(/\.json$/, '')))
      .map(row => {
        const owner = row.value.actualStreamOwner ?? row.value.actualPlan?.actualStreamOwner;
        if (owner !== undefined) {
          assert.equal(owner, path.join(capsule.output, 'Microsoft.AspNetCore.Server.HttpSys.dll'));
        }
        return { key: row.file.replace(/^\d+-/, '').replace(/\.json$/, '') + ':' +
          (row.value.profile ?? row.value.actualPlan?.profile), value: normalizeOwner(row.value) };
      });
    assert.equal(semantic.length, 52);
    assert.equal(new Set(semantic.map(row => row.key)).size, 52);
    semanticSets.push(semantic);
    contracts.push({ label, actualCompletedProfiles: 6, actualAdditionalRealProducerContracts: 22,
      actualBenchmarkLifecycleProfiles: 6, actualConcreteSemanticObservations: 52 });
  } else {
    for (const ending of ['-settings-before.json', '-settings-after.json']) {
      const observations = matching(ending);
      assert.equal(observations.length, 6);
      observations.forEach(row => assert.deepEqual(row, before.initialSettings));
      settingsCount += observations.length;
    }
    const reached = matching('-benchmark-reached.json');
    assert.deepEqual(reached.map(row => row.profile).sort(), [...profiles].sort());
    for (const row of reached) {
      assert.equal(row.actualHostStarted, true);
      assert.equal(row.actualFullRequestConsumed, !row.profile.startsWith('Live.'));
      assert.equal(row.actualNoNewNetworkIoPerPreparedLiveZeroWrite, row.profile.startsWith('Live.'));
      if (row.actualLivePlan) {
        verifyPlan(row.actualLivePlan);
        assert.equal(row.actualLivePlan.actualApplicationFinished, false);
        assert.equal(row.actualLivePlan.actualHeadersReadOnly, true);
      }
    }
    assert.equal(single('-completed.json').actualReports, 6);
    const reportFile = path.join(directory, 'results', 'AutoPerf.WriteBenchmarks-report-full.json');
    const report = read(reportFile);
    assert.equal(report.Benchmarks.length, 6);
    const stdout = fs.readFileSync(path.join(directory, 'native.stdout'), 'utf8');
    const samplesInStdout = [...stdout.matchAll(/^WorkloadResult\s+\d+:\s+(\d+) op,\s+([\d.]+) ns,/gm)]
      .map(([, count, nanoseconds]) => ({ operations: Number(count), nanoseconds: Number(nanoseconds) }));
    assert.equal(samplesInStdout.length, 48);
    const elapsed = /Global total time:[^\r\n]*\(([\d.]+) sec\)/.exec(stdout);
    assert.ok(elapsed);
    totalTimedSeconds += Number(elapsed[1]);
    let stdoutIndex = 0;
    const observed = [];
    for (const row of report.Benchmarks) {
      const match = /^AutoPerf\.WriteBenchmarks\.WriteAndConsumeAsync\(Profile: "([^"]+)"\)$/.exec(row.FullName);
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
        const raw = samplesInStdout[stdoutIndex++];
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
  auditedProfiles.push({ label, actualNativeExit: invocation.actualExitCode, variant: capsule.variant,
    actualHarnessSha256: capsule.actualHarnessSha256, sourcePdbDocuments: 9, actualStartedListeners: started.length,
    actualGracefullyDisposedListeners: disposed.length, actualTimed: !characterizing });
}
assert.equal(semanticSets.length, 3);
assert.deepEqual(semanticSets[1], semanticSets[0]);
assert.deepEqual(semanticSets[2], semanticSets[0]);
assert.equal(matchedStdoutSamples, 288);
assert.equal(results.length, 36);
assert.equal(settingsCount, 72);
assert.equal(startedListeners, 58);
assert.equal(disposedListeners, 58);
const processProbe = read(at('owned-native-process-exit-probe.json'));
assert.equal(processProbe.actualAllRecordedNativeProcessIdsAbsent, true);
assert.equal(processProbe.actualObservedProcesses.length, 0);
assert.equal(processProbe.actualProfiles.length, 10);
assert.equal(processProbe.actualSuccessfulListenerDisposalReceipts, disposedListeners);
assert.equal(processProbe.actualEveryStartedListenerHasGracefulDisposalReceipt, true);
const pairs = [1, 2, 3].flatMap(round => profiles.map(profile => {
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
const primary = pairs.filter(row => row.profile === plan.primaryProfile);
const noCallback = pairs.filter(row => row.profile === 'Request.Sync.None.128');
const prepared = pairs.filter(row => row.profile === 'Live.Sync.Started.Zero');
assert.ok(noCallback.every(row => row.lessTimePercent > 0));
assert.ok(prepared.every(row => row.lessTimePercent > 0 && row.lessTimePercent < 5));
assert.ok(primary.some(row => row.lessTimePercent < 0) && primary.some(row => row.lessTimePercent > 0));
const maximumCv = Math.max(...results.map(row => row.coefficientOfVariationPercent));
const limitations = [
  'Qualified fork-only proposal,not a general/default/primary-case improvement or merge-ready result. No-callback128B full requests measured8.23/11.47/19.10%less time across all3pairs;declared completed-callback primary measured3.75%less,4.99%more,0.54%less. Keep the primary regression and all favorable/adverse results equally visible.',
  'Prepared already-started zero-byte Sync Write measured only1.07-2.84%less time,about0.22-0.58ns/op. Initial128B/header send occurs before timing;one measured zero write returns before a new native send. Not nonzero network throughput or explanation/proof that this tiny local saving causes the entire full-request difference.',
  'The no-callback improvement is scenario-specific supporting evidence,not promotion of the mixed declared primary. Shared non-isolated Windows VM;all8samples/outliers retained per row. Unchanged async controls also move,and loopback/dispatch/scheduling/code-generation/fixture costs prevent attributing the full change to the eliminated GetResult call alone.',
  'All3predeclared alternating source-comparison pairs complete;6timed native launches,36rows/all288samples. Budget permanently closed. Initial failed characterization is untimed and consumes no source-comparison slot;no extra benchmark after the third pair.',
  'MemoryDiagnoser full-request allocation residuals are retained,including higher no-callback allocations in every candidate pair and mixed/control changes. Prepared profiles remain0B/op;no structural managed-allocation reduction or cross-thread allocation/GC tracing claim.',
  'Real public UseHttpSys generic hosts and accepted HTTP/1.1 loopback requests own start/callback/native-body production. Full requests include client,dispatch,plan/registration,ranged128B/4096B writes,complete bytes and bookkeeping/disposal. Offset3sentinels are not transmitted. Not external network or application throughput,production frequency or later runtime/platform evidence.',
  'Only synchronous ResponseStream.Write changes. Pending/faulted/canceled start tasks remain awaited;Flush/all async methods/native producer/API/baselines/default AllowSynchronousIO=false unchanged. Real pending contracts observe public HasStarted=true,mutable headers,actual waiting synchronous server caller,incomplete callback/public invocation and absent wire headers.',
  'All52concrete semantic observations match measured original/candidate and relocated original,including exact error types/parameter names,callback LIFO/reference/token,immediate header state and complete wire SHA256. Buffer validation remains after start and before synchronous-IO rejection. Callback-gate cancellation is not RequestAborted production,starvation or deadlock proof.',
  'Initial original characterization assumed exact base ArgumentException/no parameter for past-end array;the pinned native owner actually throws ArgumentOutOfRangeException(count). Retain initial image,raw negative exit and partial contracts. Corrected contract records actual errors before assertion;portable audit separately requires exact type/parameter equality across variants. Public reported CoreLib commit lookup returns404,not compiler provenance.',
  'Both actual owning native suites pass15/15rows with0skipped,including both Boolean theory values. Thirteen full-host rows and two lower Listener rows per variant;lower rows bypass ResponseStream. No semantic bug-fix red/green claim:correctness contracts intentionally pass original and compatible guard;performance comparison is actual native timing.',
  'Measured186-file consumers differ only in actual tested HTTP.sys DLL/PDB.184unchanged files total includes the2harness DLL/PDB,leaving182other unchanged files. Candidate copies original harness;relocated source is byte-exact and independently built/characterized without timing,not a claim that rebuilt path-dependent harness PE/PDB bytes are identical.',
  'All58owned native listeners,including the untimed failed process listener,have stopped/disposed receipts;all10recorded native process IDs were observed absent. An initial null Hashtable aggregate is preserved and corrected from the original per-profile integer counts;not a new native/CIM observation.',
  'Original and candidate owner-only forced --no-incremental rebuilds byte-match previously tested source/DLL/PDB for relocation/final candidate state. Historical snapshots/timing untouched. Product source was measured as an uncommitted guard on baseline37e809e;any later publication source commit is byte-bound,not relabeled as the historical build commit.',
  'Sixteen selected owner/API/test/producer files match current main90d90ff3;54raw snapshots include2changed toolchain context files. Pinned campaign SDK/runtime,not newer-default SDK integration or complete repository/history coverage. Remote code index unavailable for this GitHub checkout;LSP coverage bounded.',
  'All288Workload.Result samples match native stdout/JSON;mean,sample variance,SD,SE independently recomputed. Confidence intervals and MemoryDiagnoser allocations retained as reported,not independent CI-distribution derivation. Portable audit rehashes copied textual sources/receipts,not omitted binary bytes;separate live audit rehashes frozen consumers/runtime. Nine selected PE/PDB/source associations per native profile are not complete compiler provenance or method coverage.',
];
const audit = {
  candidate: 'F033', disposition: 'qualified-no-callback-scoped-fork-draft', mergeReady: false,
  actualSourceComparisons: 3, actualCompletedSourceComparisonPairs: 3, actualFailedSourceComparisonAttempts: 0,
  actualStrategyVariants: 1, actualTimedNativeProfilesStarted: 6, actualTimedNativeProfiles: 6,
  actualFailedTimedNativeProfiles: 0, actualFailedUntimedCharacterizations: 1,
  actualRetainedResultSamples: matchedStdoutSamples, actualNativeStdoutSamplesMatchedToJson: matchedStdoutSamples,
  actualReportedRows: results.length, actualOwningRowsPerVariant: 15, actualOwningSkippedPerVariant: 0,
  actualConsumerFilesPerImage: 186, actualPreparationLabels: preparationLabels,
  actualMeasuredImagesUseIdenticalHarnessDllAndPdb: true, actualConsumerDifferences: differingFiles,
  actualUnchangedConsumerFilesIncludingHarnessPair: 184, actualOtherUnchangedFilesExcludingHarnessPair: 182,
  actualCharacterizations: contracts, actualAuditedNativeProfiles: auditedProfiles,
  actualSettingsObservations: settingsCount, actualRecordedLoadedAssemblyBindings: runtimeBindings.length,
  actualSourcePdbDocumentsPerNativeProfile: 9, actualMaximumCvPercent: maximumCv, actualTimedGlobalSeconds: totalTimedSeconds,
  actualPassingStandaloneBuildWarnings: 0, actualFailedNativeFunctionalTestRuns: 0,
  actualStartedNativeListeners: startedListeners, actualGracefulListenerDisposalReceipts: disposedListeners,
  actualAllRecordedNativeProcessIdsAbsent: true, actualFinalShippingChangedFiles: 1,
  actualTimingBudgetPermanentlyClosed: true, actualOnlySynchronousWriteGuardChanged: true,
  pairs, results, limitations,
};
const decision = {
  candidate: 'F033', disposition: audit.disposition, mergeReady: false,
  qualification: 'Narrow no-callback128B supporting full-request timing win in all3pairs and tiny prepared-zero gain;declared completed-callback primary is mixed,including4.99%regression. Preserve full trade-off in a fork-only draft,not a general/default/application or structural allocation speedup claim.',
  actualSourceComparisons: 3, actualCompletedSourceComparisonPairs: 3, actualFailedSourceComparisonAttempts: 0,
  actualSourceComparisonBudgetPermanentlyClosed: true, actualStrategyVariants: 1,
  actualTimedNativeProfiles: 6, actualFailedTimedNativeProfiles: 0, actualFailedUntimedCharacterizationsRetained: 1,
  actualFinalShippingChangedFiles: 1, actualPublicApiAndBaselineChanges: 0,
  actualOwningRowsPerVariant: 15, actualCompletedProfilesPerImage: 6, actualAdditionalProducerContractsPerImage: 22,
  actualBenchmarkLifecycleProfilesPerCorrectedImage: 6, actualCorrectedCharacterizedImageVariants: 3,
  actualConcreteSemanticObservationsPerCorrectedImage: 52, actualRawResultSamples: matchedStdoutSamples,
  actualIdenticalMeasuredHarnessDllAndPdb: true, actualOnlyChangedMeasuredConsumerFiles: differingFiles.map(row => row.path),
  actualMaximumCvPercent: maximumCv, actualSettingsObservations: settingsCount, actualTimedGlobalSeconds: totalTimedSeconds,
  actualDeclaredPrimaryProfile: plan.primaryProfile, actualDeclaredPrimaryPairs: primary,
  actualSupportingNoCallbackPairs: noCallback, actualLimitedPreparedZeroPairs: prepared,
  actualAllMeasuredSourcesAndImagesRetained: true, actualOwnerRebuildsByteMatchTestedVariants: true,
  noClaims: limitations,
};
const table = [
  '| Profile | Attempt | Original us/op | Guard us/op | Less time % | Original B/op | Guard B/op | Original CV% | Guard CV% |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
  ...pairs.map(row => `| ${row.profile} | ${row.round} | ${(row.originalMeanNanoseconds / 1000).toFixed(6)} | ${(row.candidateMeanNanoseconds / 1000).toFixed(6)} | ${row.lessTimePercent.toFixed(2)} | ${row.originalBytesPerOperation} | ${row.candidateBytesPerOperation} | ${row.originalCvPercent.toFixed(2)} | ${row.candidateCvPercent.toFixed(2)} |`),
].join('\n');
const markdown = [
  '# F033 HTTP.sys synchronous Write completed-success guard comparisons', '',
  '**Qualified no-callback-scoped fork proposal;declared callback primary mixed,not merge-ready.**',
  'Three completed alternating six-profile pairs;36reported rows/all288samples retained. Positive less-time favors guard;negative is regression. Async rows are unchanged controls.', '',
  table, '',
  `Maximum within-profile CV:${maximumCv.toFixed(2)}%. Actual cumulative successful global time:${totalTimedSeconds.toFixed(2)}seconds.`,
  'No-callback128B supporting profile improves in all3pairs;declared callback primary reverses. Prepared zero-byte gain is tiny and does not establish a nonzero network/application speedup. No structural allocation reduction claim.', '',
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
console.log(`F033:2x15owning rows,3corrected6/22+6characterizations/52matching observations,3pairs/288stdout-JSON samples,${settingsCount}settings;qualified no-callback proposal with mixed primary retained.`);
