import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(session, 'autoperf-runs', 'F140');
const implementation = path.join(session, 'autoperf-parallelism', 'finding-F140-implementation-019');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(process.argv.length, 3);
const powershell = process.argv[2];
assert.equal(path.basename(powershell).toLowerCase(), 'pwsh.exe');
assert.equal(fs.existsSync(root), false);
assert.equal(fs.existsSync(path.join(session, 'autoperf-parallelism', 'benchmark-exclusive.lease.json')), false);
const acceptanceFile = path.join(implementation, 'acceptance-before-candidate.json');
const clarificationFile = path.join(implementation, 'pre-execution-dataset-clarification-021.json');
const acceptance = read(acceptanceFile);
assert.equal(hash(acceptanceFile), 'F87E6F884C3D528F7D3833D229C90781D2B41DCFF53D6C5455213030DB35B98B');
assert.equal(acceptance.actualSourceCandidateNotYetWritten, true);
const driver = path.join(session, 'F140-compare-027.mjs');
const runner = path.join(session, 'F140-run-variant-027.ps1');
fs.mkdirSync(root);
fs.mkdirSync(path.join(root, 'comparisons'));
fs.mkdirSync(path.join(root, 'executions'));
const roles = {};
for (const item of acceptance.roles)
{
    roles[item.role] = { graph: item.graph, revision: item.revision, runtime: item.runtime,
        functionalResults: Object.fromEntries(['baseline', 'candidate'].map(variant => [
            variant, path.join(implementation, 'invocations', `${item.role}-${variant}-functional-022`, 'functional-result.json')])) };
}
write(path.join(root, 'plan.json'), { findingId: 'F140', recordedAt: new Date().toISOString(),
    expectedMachine: process.env.COMPUTERNAME, powershell, roles,
    driverSha256: hash(driver), runnerSha256: hash(runner),
    acceptanceFile, acceptanceSha256: hash(acceptanceFile),
    clarificationFile, clarificationSha256: hash(clarificationFile), protocol: acceptance.performanceAcceptance,
    actualFixtureInputsAndCandidateAlreadyFrozenBeforeAnyMetric: true,
    actualNoAlternativeDatasetsThresholdsRetriesOrPrimarySelectors: true,
    actualPhysicalMachineDedicatedOrNormalSamplePriorityClaimed: false });
for (const [source, target] of [
    ['accepted-causal-images-before-functional-023.json', 'accepted-images.json'],
    ['functional-metadata-acceptance-025.json', 'functional-acceptance.json']])
{
    fs.copyFileSync(path.join(implementation, source), path.join(root, target), fs.constants.COPYFILE_EXCL);
}
for (const stem of ['plan', 'accepted-images', 'functional-acceptance'])
{
    write(path.join(root, stem + '-seal.json'), { recordedAt: new Date().toISOString(), sha256: hash(path.join(root, stem + '.json')) });
}
write(path.join(root, 'diagnostic-budget.json'), { findingId: 'F140', maximumComparisons: 3,
    authorizations: [], closed: false, noTimingYet: true,
    actualNoFailedOrPartialAuthorizationsBeforeThisPlan: true, actualNoRetimingOrTuning: true });
for (const role of ['Original37', 'Default90'])
{
    write(path.join(root, `gateway-request-${role}-027.json`), { purpose: 'benchmark', findingId: 'F140',
        executable: process.execPath, workingDirectory: root, arguments: [driver, 'F140', role] });
}
const inspection = spawnSync(process.execPath, [driver, 'F140', '--inspect-images'], {
    cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 1024 * 1024
});
write(path.join(root, 'static-inspection-027.json'), { recordedAt: new Date().toISOString(),
    actualExitCode: inspection.status, actualError: inspection.error?.message ?? null,
    stdout: inspection.stdout, stderr: inspection.stderr, actualNativeCounterExecution: false });
assert.ifError(inspection.error);
assert.equal(inspection.status, 0, inspection.stderr);
console.log(inspection.stdout);
