import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const parallel = path.join(session, 'autoperf-parallelism');
const driver = path.join(session, 'F147-F149-compare-011.mjs');
const runner = path.join(session, 'F147-F149-run-variant-011.ps1');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const writeOnce = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const policyFile = path.join(parallel, 'policy.json'), before = fs.readFileSync(policyFile);
const policy = JSON.parse(before);
assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
assert.equal(policy.actualWorkerBuildHoldActive, false);
assert.equal(policy.workersMayBuildOrTest, true);
assert.equal(policy.buildAndTestWorkQuiesced, false);
assert.equal(hash(path.join(parallel, 'Invoke-AutoPerfBenchmark.ps1')),
    '4780D493C98E9743F5598CAEB37BE595F4A6FF5BD52DA21A06123253FEF22753');
assert.equal(hash(driver), '5F39DE625FC5DED9F9C0002690D0CDB51D3306874116F126E8B94353DDB8440B');
assert.equal(hash(runner), '1505E54AAEA96BB05FE6A2F885B041A138900B74B393ECA89DCA18F376B89382');
assert.deepEqual(policy.independentFindingPreparationWorkers, {
    F160: '4c0aec00-558b-4b47-8384-bd60867facc1',
    F163: '99f6a6f7-2ec9-40ab-aa1d-f6486b7f9d5e'
});
const approvals = [];
for (const finding of ['F147', 'F149'])
{
    const root = path.join(session, 'autoperf-runs', finding);
    const inspection = read(path.join(root, 'static-inspection-001.json'));
    assert.equal(inspection.actualExitCode, 0);
    assert.equal(inspection.actualResult.actualNoNativeExecutionOrCounters, true);
    assert.equal(read(path.join(root, 'diagnostic-budget.json')).authorizations.length, 0);
    assert.equal(policy.approvedBenchmarkDrivers.some(p => p.findingId === finding), false);
    for (const stem of ['plan', 'accepted-images', 'functional-acceptance'])
    {
        assert.equal(hash(path.join(root, stem + '.json')), read(path.join(root, stem + '-seal.json')).sha256);
    }
    const approval = {
        findingId: finding, path: driver, sha256: hash(driver), awaitsAllChildren: true,
        acceptedImagesSha256: hash(path.join(root, 'accepted-images.json')),
        functionalAcceptanceSha256: hash(path.join(root, 'functional-acceptance.json')),
        nativeRunnerSha256: hash(runner), actualStaticImageInspectionPassedWithoutMeasurement: true,
        optionalInfrastructureRetryEnabled: false,
        review: 'Synchronous Node launches; native runner waits root, observed descendants and both redirected streams, real XML single Fact/IDs/counters. Immutable original allocation/elapsed/control gates,7 fresh-process pairs,16 internal warmups per direction,128x65536-byte operations. All four causal pairs enumerate156files and differ only ownerDLL/PDB; one identical224file common fixture and197file runtime57closure. Source-default sample-owner only, not stock default framework. Actual gateway parent/start/token and explicit actual-owner HOLD required. Authorization including failed/partial consumed before inspection/warmup; no tuning/retry/replay/role pooling.'
    };
    approvals.push(approval);
    for (const role of ['Original', 'CurrentDefault'])
    {
        writeOnce(path.join(root, `benchmark-request-${role}.json`), {
            recordedAt: new Date().toISOString(), purpose: 'benchmark', findingId: finding,
            executable: process.execPath, arguments: [driver, finding, role], workingDirectory: root,
            actualRunStillRequiresFreshOwnerHoldAndNativeQuiescence: true,
            actualSameHostAndExactRuntimeWithinEachPair: true, actualNoRemoteBenchmark: true
        });
    }
}
fs.writeFileSync(path.join(parallel, 'policy-before-F147-F149-timing-approval-011.json'), before, { flag: 'wx' });
policy.approvedBenchmarkDrivers.push(...approvals);
policy.actualWorkerBuildHoldActive = true;
policy.workersMayBuildOrTest = false;
policy.buildAndTestWorkQuiesced = false;
policy.explicitF147F149HoldRequestedAt = new Date().toISOString();
policy.explicitF147F149HoldId = 'F147-F149-011';
policy.explicitF147F149HoldState = 'Requested from actual F160/F163 owners; no timing until fresh terminal native/streams/heavy-IO acknowledgements and coordinator review.';
fs.writeFileSync(policyFile, JSON.stringify(policy, null, 2) + '\n');
writeOnce(path.join(parallel, 'F147-F149-timing-approval-011.json'), {
    recordedAt: new Date().toISOString(), approvals,
    actualWorkerRegistry: policy.independentFindingPreparationWorkers,
    actualHoldRequestedNotYetAcknowledged: true, actualBuildTestQuiescenceClaimed: false,
    actualNewPolicySha256: hash(policyFile),
    actualGatewayUnmodified: true, actualNoCounterWarmupOrBenchmarkStarted: true
});
console.log(JSON.stringify({ actualReviewedAndPinnedDrivers: approvals.length,
    actualHoldRequested: true, actualNotYetQuiescentOrTimingAdmitted: true }, null, 2));
