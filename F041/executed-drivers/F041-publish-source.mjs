import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F041');
const root = 'C:\\src\\aspnetcore';
const inputs = JSON.parse(fs.readFileSync(path.join(run, 'source-inputs.json'), 'utf8'));
const receipt = path.join(run, 'source-publication.json');
assert.equal(fs.existsSync(receipt), false, 'Inspect existing publication; do not repeat it blindly.');
const calls = [];
const execute = (executable, args) => {
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', windowsHide: true });
  calls.push({ executable, arguments: args, actualExitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(path.join(run, 'source-publication-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${executable} ${args.join(' ')}\n${result.stderr}`);
  return result.stdout.trim();
};
const git = args => execute('git', args);
assert.equal(git(['rev-parse', 'HEAD']), inputs.baseline);
assert.equal(git(['branch', '--show-current']), inputs.branch);
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
for (const item of [...inputs.sourceFiles, ...inputs.preservedUntrackedReports]) {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, ...item.path.split('\\')))).digest('hex').toUpperCase();
  assert.equal(actual, item.sha256);
}
const remote = new URL(git(['remote', 'get-url', 'autoperf']));
assert.equal(remote.hostname, 'github.com');
assert.equal(remote.pathname.replace(/\.git$/, '').toLowerCase(), '/jaslawinms/aspnetcore');
const ref = `refs/heads/${inputs.branch}`;
const existing = git(['ls-remote', '--heads', 'autoperf', ref]);
if (existing) assert.equal(existing.split(/\s+/)[0], inputs.baseline);
else git(['push', 'autoperf', `${inputs.baseline}:${ref}`]);
const actual = JSON.parse(execute('gh', ['api', `repos/jaslawinMs/aspnetcore/git/ref/heads/${inputs.branch}`]));
assert.equal(actual.object.sha, inputs.baseline);
const result = { candidate: 'F041', repository: 'jaslawinMs/aspnetcore', branch: inputs.branch,
  sourceCommit: inputs.baseline, sourceBranchUrl: `https://github.com/jaslawinMs/aspnetcore/tree/${inputs.branch}`,
  actualRemoteRefVerified: true, actualNewSourceCommitCreated: false,
  actualShippingSourceChanged: false, actualSourceComparisons: 0 };
fs.writeFileSync(receipt, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
