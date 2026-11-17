import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F031');
const execution = path.join(run, 'source-publication');
const branch = 'autoperf/F031-template-completed-task';
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const decision = read(path.join(run, 'decision.json'));
const live = read(path.join(run, 'live-frozen-closure-audit.json'));
assert.equal(decision.disposition, 'no-gain');
assert.equal(decision.actualFinalShippingChanges, 0);
assert.equal(decision.actualSourceComparisonBudgetPermanentlyClosed, true);
assert.equal(live.actualConsumerBindings, 882);
assert.equal(live.actualShippingChanges, 0);
fs.mkdirSync(execution);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(execution, 'executed-driver.mjs'));
const calls = [];
function capture(command, args) {
  const index = String(calls.length + 1).padStart(3, '0');
  const started = new Date().toISOString();
  const result = spawnSync(command, args, { cwd: root, maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  fs.writeFileSync(path.join(execution, index + '.stdout'), result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(path.join(execution, index + '.stderr'), result.stderr ?? Buffer.alloc(0));
  calls.push({ executable: command, arguments: args, workingDirectory: root, started,
    completed: new Date().toISOString(), actualExitCode: result.status,
    stdout: index + '.stdout', stderr: index + '.stderr' });
  fs.writeFileSync(path.join(execution, 'actual-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${command}: ${result.stderr}`);
  return result.stdout.toString().trim();
}
assert.equal(capture('git', ['branch', '--show-current']), branch);
assert.equal(capture('git', ['rev-parse', 'HEAD']), baseline);
assert.equal(capture('git', ['status', '--porcelain', '--untracked-files=no']), '');
assert.equal(capture('git', ['--no-pager', 'diff', '--check']), '');
const investigation = read(path.join(run, 'investigation.json'));
for (const entry of investigation.parity.filter(row => row.core)) {
  const actual = createHash('sha256').update(fs.readFileSync(path.join(root, entry.file))).digest('hex').toUpperCase();
  assert.equal(actual, entry.actualWorkingBytesSha256);
}
const audit = spawnSync(process.execPath, [path.join(session, 'F031-audit.mjs'), run, '--verify'],
  { cwd: root, encoding: 'utf8' });
fs.writeFileSync(path.join(execution, 'prepublication-audit.stdout'), audit.stdout ?? '');
fs.writeFileSync(path.join(execution, 'prepublication-audit.stderr'), audit.stderr ?? '');
assert.equal(audit.status, 0, audit.stderr);
const current = JSON.parse(capture('gh', ['api', 'repos/dotnet/aspnetcore/branches/main'])).commit.sha;
assert.equal(current, investigation.actualCurrentDefault, 'A changed current default requires a fresh selected-source assessment.');
capture('git', ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential',
  'push', 'autoperf', `${branch}:refs/heads/${branch}`]);
const remote = JSON.parse(capture('gh', ['api', `repos/jaslawinMs/aspnetcore/git/ref/heads/${branch}`]));
assert.equal(remote.ref, `refs/heads/${branch}`);
assert.equal(remote.object.sha, baseline);
fs.writeFileSync(path.join(execution, 'verified-source-publication.json'), JSON.stringify({
  candidate: 'F031', disposition: 'no-gain', sourceBranch: branch, sourceCommit: baseline,
  actualSourceTrackedUnchanged: true, actualSelectedSourcesRehashed: 21, actualCurrentDefault: current,
  actualRemoteRef: remote, actualSourceComparisons: 3, actualPerformancePrCreated: false,
  actualAllSourceRefChecksPassed: true, actualPortableAuditExitCode: audit.status,
}, null, 2) + '\n');
console.log('F031: independent fork source ref verified at restored37e809;3closed comparisons,no optimization commit or performance PR.');
