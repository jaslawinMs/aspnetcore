import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F142'), common = path.join(session, 'autoperf-runs', 'F142-common');
const root = String.raw`C:\src\aspnetcore`, inputs = path.join(run, 'canonical-preflight-inputs-001');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function git(...args)
{
    const result = spawnSync('git', ['--no-pager', '-c', 'core.longpaths=true', ...args], { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
}
assert.equal(fs.existsSync(inputs), false);
assert.equal(fs.existsSync(path.join(run, 'diagnostic-budget.json')), false);
assert.equal(git('rev-parse', 'HEAD'), '37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(git('status', '--porcelain', '--untracked-files=no'), '');
const sourceFile = path.join(root, 'src', 'OpenApi', 'gen', 'XmlCommentGenerator.Emitter.cs');
const original = read(path.join(run, 'alias-source-manifest.json')).actualSourceSnapshots.find(item => item.role === 'Original' && item.file.endsWith('/XmlCommentGenerator.Emitter.cs'));
assert.equal(hash(sourceFile), original.sha256);
const files = [
    'owner/AutoPerf.F142.GeneratedOwner.csproj', 'owner/DocumentFixture.cs',
    'probe/AutoPerf.F142.Characterization.csproj', 'probe/Program.cs', 'Invoke-Characterization.ps1',
].map(file =>
{
    const source = path.join(common, ...file.split('/')), destination = path.join(inputs, ...file.split('/'));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    assert.equal(hash(source), hash(destination));
    return { file, bytes: fs.statSync(source).size, sha256: hash(source) };
});
const sourceClosure = path.join(session, 'autoperf-parallelism', 'worker-a', 'runtime-003', 'closures', 'F138-original-001');
assert.equal(read(path.join(session, 'autoperf-parallelism', 'integrated-runtime-003.json')).actualAuditPassed, true);
assert.equal(read(path.join(session, 'autoperf-parallelism', 'policy.json')).buildAndTestWorkQuiesced, false);
const planFile = path.join(run, 'canonical-characterization-plan.json');
const receipt = { recordedAt: new Date().toISOString(), actualBeforeAnyCanonicalManagedCommand: true,
    actualPlanSha256: hash(planFile), actualExactCommonInputs: files,
    actualPrivateLedgerSha256: hash(path.join(session, 'autoperf-campaign.json')),
    actualRootHead: git('rev-parse', 'HEAD'), actualRootBranch: git('branch', '--show-current'),
    actualGlobalJsonSha256: hash(path.join(root, 'global.json')),
    actualEmitterSourceSha256: hash(sourceFile), actualOriginalSourceBuiltClosure: sourceClosure,
    actualOriginalClosureProvenanceSha256: hash(path.join(sourceClosure, 'InputProvenance.json')),
    actualFreshGeneratorRebuildRequiredToAvoidStaleIncrementalImage: true,
    actualNoCanonicalPrototypeOrTimingBudgetOrMeasurementExists: true,
    actualPublishedAliasEvidenceUnchangedAndSeparate: true,
    actualCertificateGenerationMustBeDisabledBeforeSdkActivation: true };
write(path.join(run, 'canonical-characterization-plan-seal.json'), { recordedAt: receipt.recordedAt, sha256: hash(planFile), actualBeforeAnyCanonicalManagedCommand: true });
write(path.join(run, 'canonical-preflight-preservation.json'), receipt);
console.log(JSON.stringify(receipt, null, 2));
