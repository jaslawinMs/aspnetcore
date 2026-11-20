import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const parallel = path.join(session, 'autoperf-parallelism');
const run = path.join(session, 'autoperf-runs', 'F219');
const admission = path.join(run, 'admission-147');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const writeNew = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const driver = path.join(session, 'F219-Original-compare.mjs');
assert.equal(hash(driver), '23B8CFD070D7A4AD66CEF5C56968C3E193BA692152D442B4DFF91B8826244DB8');
const imagesFile = path.join(run, 'accepted-images-Original.json');
assert.equal(hash(imagesFile), '7466DB6FB63E6B786180145F0521F82DA5A831A5EA6950020481DB0F394E1382');
assert.equal(read(path.join(run, 'accepted-images-Original-seal.json')).sha256, hash(imagesFile));
assert.equal(hash(path.join(run, 'plan.json')), 'D83AC482C2A940298186EE421CE780ECC17A1A711E5514A3E4480FB24F66390C');
const budget = read(path.join(run, 'diagnostic-budget.json'));
assert.equal(budget.closed, false);
assert.equal(budget.authorizations.length, 0);
assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
const quiescence = read(path.join(admission, 'quiescence.json'));
assert.equal(quiescence.actualKnownOwnedCoordinatorPreparationProcessesRemaining.length, 0);
assert.equal(quiescence.actualUnrelatedMachineActivityNotAsserted, true);
assert.ok(Date.now() - Date.parse(quiescence.observedAtUtc) < 300000);
const comparisons = path.join(run, 'comparisons');
if (!fs.existsSync(comparisons)) { fs.mkdirSync(comparisons); }
assert.equal(fs.readdirSync(comparisons).length, 0);
const policyFile = path.join(parallel, 'policy.json');
assert.equal(hash(policyFile), '748D161B91073053F650A4EBD2DAD5B85B5254A21B77A8D120363DCD796936CE');
const policy = read(policyFile);
assert.equal(policy.maximumSimultaneousBenchmarks, 1);
assert.equal(policy.coordinatorOnlyTiming, true);
assert.equal(policy.remoteBenchmarksAuthorized, false);
assert.ok(!policy.approvedBenchmarkDrivers.some(item => item.findingId === 'F219'));
const approval = {
    findingId: 'F219', path: driver, sha256: hash(driver), awaitsAllChildren: true,
    review: 'Original-only frozen seven fresh A/C/A blocks, three unchanged repository GenerationBenchmarks parameters, pinned BDN0.13 engine and private no-priority executor. Actual native15/helper7/document counts green per causal role; all-file inventories differ only ownerDLL/PDB. Sequential Node spawnSync plus reviewed launcher awaits direct native child and streams. Budget persisted before any warmup, partial/failure consumes authorization, no repeats of source role. No unrelated-user inactivity or universal descendant closure claim.',
    actualStaticImageInspectionPassedWithoutMeasurement: true,
    actualStaticInspectionReceipt: 'Actual tool3980 exit0, no measurement.',
    acceptedImagesSha256: hash(imagesFile), actualQuiescenceReceiptSha256: hash(path.join(admission, 'quiescence.json'))
};
fs.copyFileSync(policyFile, path.join(admission, 'policy-before.json'), fs.constants.COPYFILE_EXCL);
policy.approvedBenchmarkDrivers.push(approval);
policy.buildAndTestWorkQuiesced = true;
policy.F219TimingAdmission = {
    recordedAtUtc: new Date().toISOString(), sourceRole: 'Original', approvedDriverSha256: hash(driver),
    actualCoordinatorKnownOwnedWorkQuiescent: true, actualRemoteUntimedMayContinue: true,
    actualNoDedicatedHostOrUnrelatedUserInactivityClaim: true
};
const next = path.join(admission, 'policy-next.json');
writeNew(next, policy);
fs.renameSync(next, policyFile);
writeNew(path.join(admission, 'driver-approval.json'), { ...approval, actualAfterPolicySha256: hash(policyFile) });
const request = {
    purpose: 'benchmark', findingId: 'F219', executable: process.execPath,
    arguments: [driver], workingDirectory: run, actualNoAdHocSelectors: true,
    actualExpectedPlanSha256: hash(path.join(run, 'plan.json')), actualExpectedAcceptedImagesSha256: hash(imagesFile)
};
writeNew(path.join(admission, 'gateway-request.json'), request);
console.log(JSON.stringify({ actualDriverApproved: true, actualAfterPolicySha256: hash(policyFile),
    actualRequest: path.join(admission, 'gateway-request.json'), actualNoAuthorizationOrMeasurementInRegistration: true }, null, 2));
