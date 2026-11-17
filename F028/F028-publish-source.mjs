import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F028');
const execution = path.join(run, 'source-publication');
fs.mkdirSync(execution);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(execution, 'executed-driver.mjs'));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F028-external-login-scheme-source';
const product = 'src/Identity/Core/src/SignInManager.cs';
const tests = 'src/Identity/test/Identity.Test/SignInManagerTest.cs';
const calls = [];
function capture(command, args, allowFailure = false) {
  const prefix = String(calls.length + 1).padStart(3, '0');
  const started = new Date().toISOString();
  const result = spawnSync(command, args, { cwd: root, maxBuffer: 8 * 1024 * 1024 });
  fs.writeFileSync(path.join(execution, `${prefix}.stdout`), result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(path.join(execution, `${prefix}.stderr`), result.stderr ?? Buffer.alloc(0));
  calls.push({ command, args, started, completed: new Date().toISOString(), actualExitCode: result.status,
    stdout: `${prefix}.stdout`, stderr: `${prefix}.stderr` });
  fs.writeFileSync(path.join(execution, 'actual-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  if (!allowFailure) {
    assert.equal(result.status, 0, `${command} failed:${result.stderr}`);
  }
  return { ...result, text: (result.stdout ?? Buffer.alloc(0)).toString().trim() };
}
const git = args => capture('git', args).text;
const gh = endpoint => JSON.parse(capture('gh', ['api', endpoint]).text);
assert.equal(git(['branch', '--show-current']), branch);
assert.equal(git(['rev-parse', 'HEAD']), baseline);
assert.equal(git(['diff', '--cached', '--name-only']), '');
assert.deepEqual(git(['diff', '--name-only']).split('\n').sort(), [product, tests].sort());
const allowedUntracked = [
  'autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md',
];
assert.deepEqual(git(['ls-files', '--others', '--exclude-standard']).split('\n').sort(), allowedUntracked.sort());
assert.match(git(['remote', 'get-url', 'autoperf']), /^https:\/\/github\.com\/jaslawinMs\/aspnetcore(?:\.git)?$/i);
assert.equal(git(['ls-remote', '--heads', 'autoperf', `refs/heads/${branch}`]), '');
assert.equal(gh('repos/jaslawinMs/aspnetcore/git/ref/heads/main').object.sha, baseline);
const budget = read(path.join(run, 'measurement-budget.json'));
const capsule = read(path.join(run, 'prepared', 'capsule.json'));
const selected = read(path.join(run, 'validation', 'selected-owning', 'verified-result.json'));
const live = read(path.join(run, 'live-frozen-closure-audit.json'));
assert.equal(budget.comparison_budget_closed, true);
assert.equal(budget.actual_comparisons_completed, 1);
assert.equal(budget.actual_timing_profiles_started, 6);
assert.equal(selected.actualPassed, 138);
assert.equal(selected.actualExpectedRed, 0);
assert.equal(selected.actualSkipped, 0);
assert.equal(live.actualFreshStandaloneCharacterizeSucceeded, true);
assert.equal(live.actualRehashedClosureBindings, 264);
assert.equal(capsule.actualOtherSignInManagerMethodsUnchanged, true);
assert.equal(hash(path.join(root, ...product.split('/'))), capsule.actualSelectedSourceSha256);
assert.equal(hash(path.join(root, ...tests.split('/'))),
  hash(path.join(run, 'validation', 'selected-owning', 'executed-SignInManagerTest.cs')));
const current = gh('repos/dotnet/aspnetcore/branches/main').commit.sha;
const local = capture('git', ['cat-file', '-e', `${current}^{commit}`], true);
if (local.status !== 0) {
  git(['fetch', '--no-tags', 'origin', current]);
}
const relevant = read(path.join(run, 'investigation.json')).parity.filter(row => row.core).map(row => row.file);
assert.equal(relevant.length, 11);
const parity = [];
for (const file of [...relevant, 'global.json', 'eng/Versions.props']) {
  const before = capture('git', ['show', `${baseline}:${file}`]).stdout;
  const after = capture('git', ['show', `${current}:${file}`]).stdout;
  const same = before.equals(after);
  parity.push({ file, actualBaselineAndCurrentBytesEqual: same, core: relevant.includes(file) });
  if (relevant.includes(file)) {
    assert.equal(same, true, `Current default changed relevant source:${file}`);
  }
}
const history = git(['--no-pager', 'log', '--format=%H %s', `${baseline}..${current}`, '--', ...relevant]);
assert.equal(history, '');
fs.writeFileSync(path.join(execution, 'verified-default-parity.json'), JSON.stringify({
  actualCurrentDefault: current, actualSourceFilePairs: parity.length, parity,
  actualSelectedInterveningHistoryEmpty: true,
  limit: 'Selected source/history parity only. Keep the measured baseline SDK/runtime;not a whole-current-default build or integration claim.',
}, null, 2) + '\n');
git(['add', '--', product, tests]);
assert.deepEqual(git(['diff', '--cached', '--name-only']).split('\n').sort(), [product, tests].sort());
git(['--no-pager', 'diff', '--cached', '--check']);
const numstat = git(['--no-pager', 'diff', '--cached', '--numstat']);
assert.ok(numstat.split('\n').includes(`11\t1\t${product}`));
assert.ok(numstat.split('\n').includes(`222\t0\t${tests}`));
const sourceBlobs = [product, tests].map(file => ({ file, stagedBlob: git(['rev-parse', `:${file}`]) }));
const message = '[AutoPerf F028] Key default external login scheme display lookup\n\n' +
  'Use the existing ordinal dictionary only for exact default types.\n' +
  'Preserve custom manager/provider sequence,filter and first-match behavior.\n\n' +
  'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>\n' +
  'Copilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00';
git(['commit', '-m', message]);
const commit = git(['rev-parse', 'HEAD']);
assert.equal(git(['rev-parse', 'HEAD^']), baseline);
assert.deepEqual(git(['diff-tree', '--no-commit-id', '--name-only', '-r', commit]).split('\n').sort(), [product, tests].sort());
git(['push', '--set-upstream', 'autoperf', `HEAD:refs/heads/${branch}`]);
assert.equal(gh(`repos/jaslawinMs/aspnetcore/git/ref/heads/${branch}`).object.sha, commit);
for (const file of sourceBlobs) {
  assert.equal(gh(`repos/jaslawinMs/aspnetcore/contents/${file.file}?ref=${commit}`).sha, file.stagedBlob);
}
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
const result = {
  candidate: 'F028', actualSourceCommit: commit, actualSourceBranch: branch, actualBaseline: baseline,
  actualOnlySourceFiles: sourceBlobs, actualProductNumstat: numstat, actualCurrentDefault: current,
  actualCoreCurrentDefaultFilePairsMatched: relevant.length, actualAllRemoteSourceRefsAndBlobsVerified: true,
  actualBuiltAsBaselinePlusScopedUncommittedPatch: true, actualNewSourceCommitBuildClaim: false,
  actualSourceHeadAtMeasurementBuild: capsule.actualSourceHeadAtBuild, actualHistoricalTimingBudgetPermanentlyClosed: true,
  actualUnrelatedUntrackedReportsUntouched: allowedUntracked,
};
fs.writeFileSync(path.join(execution, 'verified-source-publication.json'), JSON.stringify(result, null, 2) + '\n');
fs.writeFileSync(path.join(session, 'F028-source-commit.txt'), commit + '\n');
console.log(JSON.stringify(result, null, 2));
