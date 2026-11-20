import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const parallel = path.join(session, 'autoperf-parallelism');
const root = path.join(session, 'autoperf-runs', 'F140');
const file = path.join(parallel, 'policy.json');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(hash(file), 'B432FD9DCEE41D3BFAEB40CD208289D8670E54569FABE14E8745AD87A75FEDCF');
assert.equal(hash(path.join(parallel, 'Invoke-AutoPerfBenchmark.ps1')),
    '4780D493C98E9743F5598CAEB37BE595F4A6FF5BD52DA21A06123253FEF22753');
assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
const policy = read(file);
assert.deepEqual(policy.independentFindingPreparationWorkers, {
    F176: '06005641-57b2-4fa5-856c-b2bf4bf642e9',
    F182: 'd766df6d-0b55-44d6-846d-7050b83f2eea'
});
assert.equal(policy.actualWorkerBuildHoldActive, false);
assert.equal(policy.workersMayBuildOrTest, true);
assert.equal(policy.buildAndTestWorkQuiesced, false);
const inspection = read(path.join(root, 'static-inspection-027.json'));
assert.equal(inspection.actualExitCode, 0);
assert.equal(JSON.parse(inspection.stdout).actualNoNativeExecutionOrCounters, true);
const plan = read(path.join(root, 'plan.json'));
const driver = path.join(session, 'F140-compare-027.mjs');
assert.equal(hash(driver), plan.driverSha256);
assert.equal(policy.approvedBenchmarkDrivers.some(item => item.findingId === 'F140'), false);
const before = path.join(parallel, 'policy-before-F140-HOLD-028.json');
fs.copyFileSync(file, before, fs.constants.COPYFILE_EXCL);
policy.approvedBenchmarkDrivers.push({
    findingId: 'F140', path: driver, sha256: hash(driver), awaitsAllChildren: true,
    actualStaticImageInspectionPassedWithoutMeasurement: true,
    acceptedImagesSha256: hash(path.join(root, 'accepted-images.json')),
    functionalAcceptanceSha256: hash(path.join(root, 'functional-acceptance.json')),
    nativeRunnerSha256: plan.runnerSha256, optionalInfrastructureRetryEnabled: false,
    review: 'Synchronous Node launches; direct-exec wrapper verifies actual gateway/driver ancestry, creation-time identity and token, awaits native root/streams and bounded post-root children. No image hashing/CIM polling inside counters. Full273-file causal images differ only ownerDLL/PDB, common5files/197or198runtimefiles/selectedhosts rehashed. Exact frozen original mixed primary, primitive guard control, pre-counter clarified plain zero-interface control;8192sends/128warmups/7fresh-process pairs,ABBAand3-dataset rotation. Original62mustpassbeforeDefault69;all allocation/useful-saving/elapsed/control/nonregression gates unchanged. Actual-worker HOLD receipt/gateway parent required. Failed/partial authorization persisted before inspection/warmup; no tuning/retry/replay/role pooling/dedicated-host claims.'
});
policy.actualWorkerBuildHoldActive = true;
policy.workersMayBuildOrTest = false;
policy.buildAndTestWorkQuiesced = false;
policy.explicitF140HoldId = 'F140-027';
policy.explicitF140HoldRequestedAt = new Date().toISOString();
policy.explicitF140HoldState = 'Explicit HOLD requested from the two actual registered owners; finish already active roots and drain streams, then stop native/source-heavy IO. Quiescence acknowledgements and timing admission still pending; no counters authorized.';
fs.writeFileSync(file, JSON.stringify(policy, null, 2) + '\n');
write(path.join(root, 'hold-request-028.json'), {
    recordedAt: new Date().toISOString(), actualExplicitHoldId: 'F140-027',
    actualWorkerIds: Object.values(policy.independentFindingPreparationWorkers),
    actualPolicyBefore: { file: before, sha256: hash(before) }, actualPolicyAfterSha256: hash(file),
    actualNoBenchmarkOrCounterStarted: true, actualQuiescenceClaimed: false,
    actualGatewayUnmodified: true
});
console.log(JSON.stringify({ actualExplicitHoldId: 'F140-027',
    actualWorkerBuildHoldActive: true, actualQuiescenceAcknowledgementsStillRequired: true,
    actualBenchmarksStarted: 0, actualPolicySha256: hash(file) }, null, 2));
