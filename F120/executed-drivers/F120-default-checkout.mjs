import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const run = path.join(path.dirname(fileURLToPath(import.meta.url)), 'autoperf-runs', 'F120');
const root = 'C:\\src\\autoperf-F042-default';
const intake = JSON.parse(fs.readFileSync(path.join(run, 'intake-completed.json'), 'utf8'));
const receipt = path.join(run, 'current-default-checkout.json');
assert.equal(fs.existsSync(receipt), false);
const invocations = [];
function git(args) {
  const result = spawnSync('git', ['-c', 'core.longpaths=true', '--no-pager', ...args],
    { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  invocations.push({ executable: 'git', arguments: args, actualExitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(path.join(run, 'default-checkout-invocations.json'), JSON.stringify(invocations, null, 2) + '\n');
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
assert.equal(git(['rev-parse', 'HEAD']), '31c15331c03714b7a602e1817e65881474c29e2e');
assert.equal(git(['status', '--porcelain']), '', 'Never replace another user or case worktree edit.');
git(['switch', '--detach', intake.actualCurrentDefault]);
assert.equal(git(['rev-parse', 'HEAD']), intake.actualCurrentDefault);
assert.equal(git(['status', '--porcelain']), '');
const submodules = git(['submodule', 'status']);
assert.ok(submodules.split(/\r?\n/).every(line => line && !/^[+-U]/.test(line)),
  'Reconcile an uninitialized or changed required submodule before building this default.');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const selected = intake.actualSelectedSources.map(item => {
  const file = path.join(root, ...item.path.split('/'));
  const blob = git(['rev-parse', 'HEAD:' + item.path]);
  assert.equal(blob, item.actualDefaultBlob);
  return { path: item.path, gitBlob: blob, actualPhysicalSha256: sha(file) };
});
const result = {
  candidate: 'F120', actualCurrentDefaultRoot: root, actualCurrentDefault: intake.actualCurrentDefault,
  actualReusedTaskOwnedDefaultWorktreeAfterF047ImmutablePublication: true,
  actualPreviouslyCleanTrackedAndUntrackedStateVerified: true, actualRequiredSubmodulesInitializedAndMatching: true,
  actualGlobalJsonSha256: sha(path.join(root, 'global.json')), actualNugetConfigSha256: sha(path.join(root, 'NuGet.config')),
  actualSelectedSources: selected, actualShippingEdits: 0, actualBuildOrTimingRun: false
};
fs.writeFileSync(receipt, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualCurrentDefault: intake.actualCurrentDefault,
  actualSelectedPhysicalFiles: selected.length, actualCleanWorktree: true, actualMatchingSubmodules: true }, null, 2));
