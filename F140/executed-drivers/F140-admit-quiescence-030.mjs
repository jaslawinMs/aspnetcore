import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(session, 'autoperf-runs', 'F140');
const parallel = path.join(session, 'autoperf-parallelism');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const policyFile = path.join(parallel, 'policy.json'), policy = read(policyFile);
assert.equal(hash(policyFile), '3C2527B5F3A2AC5F301A659E85794C1A7D8B48CD22DF0F155440CF5EF5F8D6BB');
assert.equal(policy.actualWorkerBuildHoldActive, true);
assert.equal(policy.workersMayBuildOrTest, false);
assert.equal(policy.buildAndTestWorkQuiesced, false);
assert.equal(policy.explicitF140HoldId, 'F140-027');
assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
const paths = ['finding-F176-F179-022', 'finding-F182-F186-022']
    .map(directory => path.join(parallel, directory, 'F140-HOLD-027-ack.json'));
const expectedHashes = [
    '6F1007584C07112DED978BA7A8C4090D38F4DA814F493BF4DD33B619851C468E',
    'D771EC7CE79337E6A1D98AD1994D941FF9D54B30F0ADA3F6FE0A19A5057EFB78'
];
const acknowledgements = paths.map((file, index) =>
{
    assert.equal(hash(file), expectedHashes[index]);
    return { file, sha256: hash(file), actualAcknowledgement: read(file) };
});
const [a, b] = acknowledgements.map(item => item.actualAcknowledgement);
assert.equal(a.agentId, policy.independentFindingPreparationWorkers.F176);
assert.equal(b.actualAgentId, policy.independentFindingPreparationWorkers.F182);
for (const ack of [a, b])
{
    assert.equal(ack.holdId, 'F140-027');
    assert.equal(ack.actualNativeAndSourceHeavyIoQuiesced, true);
    assert.equal(ack.policyObserved.sha256, hash(policyFile));
    assert.ok(ack.agreement.includes('RELEASE F140-027'));
}
assert.deepEqual(a.actualRemainingOwnedNativeRoots, []);
assert.deepEqual(a.actualRemainingObservedChildren, []);
assert.deepEqual(a.actualRemainingOwnedNativeWrappers, []);
assert.equal(a.recordedNativeCommands.length, 44);
assert.equal(a.knownPidCreationTerminalObservations.length, 591);
for (const command of a.recordedNativeCommands)
{
    assert.equal(command.nativeExited, true);
    assert.equal(command.observedDescendantsDrained, true);
    assert.equal(hash(command.receipt), command.receiptSha256);
    for (const stream of [command.stdout, command.stderr])
    {
        assert.equal(stream.exists, true);
        assert.equal(stream.state, 'fully-drained-and-persisted');
        assert.equal(fs.statSync(stream.path).size, stream.bytes);
    }
}
assert.equal(b.actualRemainingOwnedNativeRoots, 0);
assert.equal(b.actualRemainingObservedChildren, 0);
assert.equal(b.actualRemainingOwnedRecorderWrappers, 0);
assert.equal(b.invocations.length, 12);
assert.equal(b.terminalObservations.length, 106);
assert.deepEqual(b.unclosedStartedInvocations.filter(item => item !== null), []);
for (const command of b.invocations)
{
    assert.ok(command.nativeExited && command.stdoutDrained && command.stderrDrained && command.observedDescendantsDrained);
}
const freshFile = path.join(root, 'fresh-target-before-admission-029.json');
assert.equal(read(freshFile).actualBothRelevantTargetBlobsStillIdentical, true);
const plan = read(path.join(root, 'plan.json'));
const reviewScript = path.join(session, 'F140-review-owned-processes-029.ps1');
const review = spawnSync(plan.powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', reviewScript], {
    cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 1024 * 1024
});
write(path.join(root, 'process-review-launch-030.json'), { recordedAt: new Date().toISOString(),
    actualExitCode: review.status, actualError: review.error?.message ?? null, stdout: review.stdout, stderr: review.stderr });
assert.ifError(review.error);
assert.equal(review.status, 0, review.stderr + '\n' + review.stdout);
const reviewFile = path.join(root, 'coordinator-known-process-review-029.json');
assert.equal(read(reviewFile).actualNoKnownOwnedOrRecognizedWorkRemains, true);
const quiescenceFile = path.join(parallel, 'F140-local-quiescence-030.json');
write(quiescenceFile, {
    recordedAt: new Date().toISOString(), actualExplicitHoldId: 'F140-027',
    actualWorkerIds: Object.values(policy.independentFindingPreparationWorkers),
    actualAllRecordedLocalNativeAndSourceHeavyIoQuiesced: true,
    actualCoordinatorKnownBuildTestChildrenAndStreamsTerminal: true,
    actualCoordinatorSourceBuildAuditPublicationAndHeavyIoQuiescent: true,
    actualOwnerAcknowledgements: acknowledgements,
    actualWorkerBUnclosedListNullSentinelsNotWorkRecords: b.unclosedStartedInvocations.filter(item => item === null).length,
    actualIndependentBoundedProcessReview: { file: reviewFile, sha256: hash(reviewFile) },
    actualCoordinatorFunctionalRootsAndBothStreamsTerminal: 8,
    actualSourceTargetFreshness: { file: freshFile, sha256: hash(freshFile) },
    actualNoArbitraryThirdPartyActivityAbsenceOrHistoricalExecutionClosureClaim: true,
    actualNoBenchmarkOrCounterStarted: true,
    actualRemoteJobsAreOptionalAndNoRemoteBenchmarkAuthorized: true
});
const before = path.join(parallel, 'policy-before-F140-admission-030.json');
fs.copyFileSync(policyFile, before, fs.constants.COPYFILE_EXCL);
policy.buildAndTestWorkQuiesced = true;
policy.actualLocalQuiescenceReceipt = path.relative(session, quiescenceFile);
policy.explicitF140HoldState = 'Both actual owners acknowledged and remain held.56 recorded worker roots/commands and697 known worker PID/creation observations plus8 F140 invocation roots/streams accepted terminal; fresh bounded process review finds no same/possibly-same known owned, source-scoped or recognized benchmark work. No shared-host-idleness or exhaustive execution-closure claim. Original timing can now request the unchanged exclusive gateway.';
policy.actualF140TimingAdmissionReceipt = path.join('autoperf-runs', 'F140', 'timing-admission-030.json');
fs.writeFileSync(policyFile, JSON.stringify(policy, null, 2) + '\n');
write(path.join(root, 'timing-admission-030.json'), {
    recordedAt: new Date().toISOString(), actualExplicitHoldId: 'F140-027',
    actualPolicyBefore: { file: before, sha256: hash(before) }, actualPolicyAfterSha256: hash(policyFile),
    actualQuiescenceReceipt: { file: quiescenceFile, sha256: hash(quiescenceFile) },
    actualStaticInspectionPassed: true, actualComparisonAuthorizationsConsumed: 0,
    actualGateRequestRequiredBeforeEveryComparison: true, actualGatewayModified: false
});
console.log(JSON.stringify({ actualExplicitHoldId: 'F140-027',
    actualActualOwnersHeld: 2, actualWorkerNativeCommandsTerminal: 56,
    actualKnownWorkerCreationObservationsFreshlyReviewed: 697,
    actualCoordinatorInvocationRootsAndStreamsTerminal: 8,
    actualNoKnownOwnedOrRecognizedWorkRemains: true,
    actualBuildAndTestWorkQuiesced: true, actualCountersStarted: 0,
    actualCurrentTargetOnlyFreshnessNotWholeNewMainBuild: true }, null, 2));
