import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F035');
const execution = path.join(run, 'source-publication');
const branch = 'autoperf/F035-value-provider-enumeration';
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const decision = read(path.join(run, 'decision.json'));
const live = read(path.join(run, 'live-file-audit.json'));
assert.equal(decision.disposition, 'no-gain');
assert.equal(decision.actualFinalShippingChangedFiles, 0);
assert.equal(decision.actualCompletedSourceComparisonPairs, 3);
assert.equal(decision.actualAuditPassed, true);
assert.equal(live.actualOriginalShippingSourceRestored, true);
assert.equal(live.actualOriginalProductAndTestBinOwnerRestored, true);
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
  return result.stdout;
}
const str = (command, args) => capture(command, args).toString().trim();
assert.equal(str('git', ['branch', '--show-current']), branch);
assert.equal(str('git', ['rev-parse', 'HEAD']), baseline);
assert.equal(str('git', ['status', '--porcelain=v1', '--untracked-files=no']), '');
assert.equal(str('git', ['--no-pager', 'diff', '--check']), '');
assert.match(str('git', ['remote', 'get-url', 'autoperf']), /^https:\/\/github\.com\/jaslawinMs\/aspnetcore(?:\.git)?$/i);
assert.match(str('git', ['remote', 'get-url', 'origin']), /^https:\/\/github\.com\/dotnet\/aspnetcore(?:\.git)?$/i);
const audit = spawnSync(process.execPath, [path.join(session, 'F035-audit.mjs'), run, '--verify'],
  { cwd: root, encoding: 'utf8' });
fs.writeFileSync(path.join(execution, 'prepublication-audit.stdout'), audit.stdout ?? '');
fs.writeFileSync(path.join(execution, 'prepublication-audit.stderr'), audit.stderr ?? '');
assert.equal(audit.status, 0, audit.stderr);
const current = JSON.parse(str('gh', ['api', 'repos/dotnet/aspnetcore/branches/main'])).commit.sha;
str('git', ['fetch', '--no-tags', 'origin', current]);
const investigation = read(path.join(run, 'investigation.json'));
const files = [...investigation.parity.filter(row => row.core).map(row => row.file),
  'src/Mvc/Mvc.Core/src/ModelBinding/Binders/SimpleTypeModelBinder.cs'];
assert.equal(new Set(files).size, 13);
const parity = files.map(file => {
  const actual = capture('git', ['show', `${current}:${file}`]);
  const physical = fs.readFileSync(path.join(root, ...file.split('/')));
  const originalLf = Buffer.from(physical.toString('utf8').replaceAll('\r\n', '\n'));
  assert.equal(sha(actual), sha(originalLf), `Current default changed selected source:${file}`);
  return { file, actualCurrentBlobSha256: sha(actual), actualOriginalWorkingLfSha256: sha(originalLf),
    actualCurrentAndTestedOriginalSourceMatch: true };
});
str('git', ['--no-pager', 'log', '--format=%H %ad %s', '--date=iso-strict',
  `${investigation.actualCurrentDefault}..${current}`, '--', ...files]);
str('git', ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential',
  'push', 'autoperf', `${branch}:refs/heads/${branch}`]);
const remote = JSON.parse(str('gh', ['api', `repos/jaslawinMs/aspnetcore/git/ref/heads/${branch}`]));
assert.equal(remote.ref, `refs/heads/${branch}`);
assert.equal(remote.object.sha, baseline);
fs.writeFileSync(path.join(execution, 'verified-source-publication.json'), JSON.stringify({
  candidate: 'F035', disposition: 'no-gain', sourceBranch: branch, sourceCommit: baseline,
  actualSourceTrackedUnchanged: true, actualSelectedSourcesRehashed: 13,
  actualCurrentDefault: current, actualOriginallyCapturedDefault: investigation.actualCurrentDefault,
  actualFreshSelectedParity: parity, actualRemoteRef: remote, actualSourceComparisons: 3,
  actualCompletedSourceComparisonPairs: 3, actualFailedTimedAttempts: 0,
  actualPerformancePrCreated: false, actualAllSourceRefChecksPassed: true,
  actualPortableAuditExitCode: audit.status, actualOptimizationCommitCreated: false,
}, null, 2) + '\n', { flag: 'wx' });
console.log('F035:independent unchanged fork source ref verified at restored37e809;13fresh selected source pairs match current default;3closed pairs,no optimization commit or performance PR.');
