import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F129');
const read = file => JSON.parse(fs.readFileSync(path.join(run, file), 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const output = path.join(run, 'baseline-completed.json');
assert.equal(fs.existsSync(output), false);
assert.equal(hash(path.join(run, 'plan.json')), read('plan-seal.json').sha256);
const original = read(String.raw`validation\original-characterize-001\observations.json`);
const current = read(String.raw`validation\default-characterize-001\observations.json`);
const stable = row => ({ ...row, Exception: row.Exception ? { Type: row.Exception.Type, Message: row.Exception.Message } : null });
for (const [role, report] of [['Original', original], ['Default', current]])
{
    assert.equal(report.Role, role);
    assert.equal(report.Observations.length, 27);
    assert.equal(report.ContractFailureRows, 0);
    assert.equal(report.SourceBindings.length, 5);
    const manifest = read(path.join('images', role, 'manifest.json'));
    for (const binding of report.SourceBindings)
    {
        assert.equal(binding.SnapshotSha256, manifest.sourceInputs.find(file => file.path === binding.RelativeSource.replaceAll('\\', '/')).sha256);
    }
    for (const file of manifest.files)
    {
        assert.equal(hash(path.join(run, 'images', role, 'consumer', ...file.path.split('/'))), file.sha256);
    }
}
assert.deepEqual(current.Observations.map(stable), original.Observations.map(stable), 'Actual-default semantic observations must match the baseline');
const roles = ['Original', 'Default'];
const script = `& '${path.join(session, 'F129-audit-trx.ps1').replaceAll("'", "''")}' -CaseRoot '${run.replaceAll("'", "''")}' -Roles @('Original','Default')`;
const command = { executable: 'pwsh', arguments: ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script] };
const result = spawnSync(command.executable, command.arguments, { encoding: 'utf8', windowsHide: true });
fs.writeFileSync(path.join(run, 'baseline-trx-audit.command.json'), JSON.stringify({ ...command, exitCode: result.status }, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'baseline-trx-audit.stdout.txt'), result.stdout ?? '', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'baseline-trx-audit.stderr.txt'), result.stderr ?? '', { flag: 'wx' });
assert.equal(result.status, 0, result.stderr);
const xml = JSON.parse(result.stdout.replace(/^\uFEFF/, ''));
assert.equal(xml.individualExecutions, 14);
const git = spawnSync('git', ['--no-pager', 'diff', '--name-only'], { cwd: String.raw`C:\src\aspnetcore`, encoding: 'utf8', windowsHide: true });
assert.equal(git.status, 0);
assert.equal(git.stdout.trim(), '', 'Must complete the baseline before any prototype edit');
const receipt = {
    findingId: 'F129', recordedAt: new Date().toISOString(), roles,
    actualDefaultCommit: read('plan.json').actualDefaultCommit, baselineCommit: read('plan.json').baselineCommit,
    sealedPlanSha256: read('plan-seal.json').sha256,
    actualIndividualExistingXmlExecutions: xml.individualExecutions, actualFailed: 0, actualSkipped: 0,
    actualRealRendererRows: 54, actualProfilesPerRole: 9, actualRepetitionsPerProfile: 3,
    actualSelectedSourcePePdbAssociationsPerRole: 5, actualCompleteCompilerProvenanceClaimed: false,
    actualOriginalAndDefaultStableObservationsAgree: true, actualOriginalDefaultFrozenConsumerFilesEach: 30,
    actualCommonHarnessDllPdbIdentical: ['AutoPerf.Characterization.dll', 'AutoPerf.Characterization.pdb'].every(file =>
        hash(path.join(run, 'images', 'Original', 'consumer', file)) === hash(path.join(run, 'images', 'Default', 'consumer', file))),
    actualTimingAuthorizations: 0, actualPrototypeEditsAtBaselineCompletion: 0,
    actualMissingAssetsAttemptsPreserved: ['default-tests-001', 'harness-build-001'],
};
assert.equal(receipt.actualCommonHarnessDllPdbIdentical, true);
fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt, null, 2));
