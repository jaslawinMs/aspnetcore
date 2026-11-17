import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F024');
const execution = path.join(run, 'source-publication');
fs.mkdirSync(execution);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(execution, 'executed-driver.mjs'));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F024-session-commit-timeout-source';
const product = 'src/Middleware/Session/src/DistributedSession.cs';
const tests = 'src/Middleware/Session/test/DistributedSessionCommitTests.cs';
const calls = [];
function capture(command, args, allowFailure = false) {
  const number = calls.length + 1;
  const prefix = String(number).padStart(3, '0');
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
assert.deepEqual(git(['diff', '--name-only']).split('\n'), [product]);
const allowedUntracked = [
  'autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md', tests,
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
assert.equal(budget.actual_comparisons_completed, 3);
assert.equal(budget.actual_timing_profiles_started, 18);
assert.equal(selected.actualPassed, 34);
assert.equal(selected.actualExpectedRed, 0);
assert.equal(selected.actualSkipped, 0);
assert.equal(live.actualFreshStandaloneCharacterizeSucceeded, true);
assert.equal(live.actualRehashedClosureBindings, 196);
assert.equal(capsule.actualF023LoadAndNonCommitSourceUnchanged, true);
assert.equal(hash(path.join(root, ...product.split('/'))), capsule.actualSelectedSourceSha256);
const actualExecutedTests = path.join(run, 'validation', 'selected-owning', 'executed-DistributedSessionCommitTests.cs');
assert.equal(hash(path.join(root, ...tests.split('/'))), hash(actualExecutedTests));
const current = gh('repos/dotnet/aspnetcore/branches/main').commit.sha;
const local = capture('git', ['cat-file', '-e', `${current}^{commit}`], true);
if (local.status !== 0) {
  git(['fetch', '--no-tags', 'origin', current]);
}
const relevant = [
  product, 'src/Middleware/Session/src/DistributedSessionStore.cs', 'src/Middleware/Session/src/SessionOptions.cs',
  'src/Middleware/Session/src/SessionMiddleware.cs', 'src/Middleware/Session/src/Microsoft.AspNetCore.Session.csproj',
  'src/Middleware/Session/test/SessionTests.cs', 'src/Middleware/Session/test/Microsoft.AspNetCore.Session.Tests.csproj',
  'src/Middleware/Session/src/DefaultDistributedSessionStore.cs', 'src/Middleware/Session/src/EncodedKey.cs',
  'src/Middleware/Session/src/LoggingExtensions.cs', 'src/Middleware/Session/src/PublicAPI.Shipped.txt',
  'src/Middleware/Session/src/PublicAPI.Unshipped.txt',
];
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
const freshness = { actualCurrentDefault: current, actualSourceFilePairs: parity.length, parity,
  actualSelectedInterveningHistoryEmpty: true,
  limit: 'Selected source/history parity only. Keep the measured baseline SDK/runtime;not a whole-current-default build or integration claim.' };
fs.writeFileSync(path.join(execution, 'verified-default-parity.json'), JSON.stringify(freshness, null, 2) + '\n');
git(['add', '--', product, tests]);
assert.deepEqual(git(['diff', '--cached', '--name-only']).split('\n').sort(), [product, tests].sort());
git(['--no-pager', 'diff', '--cached', '--check']);
const numstat = git(['--no-pager', 'diff', '--cached', '--numstat']);
assert.ok(numstat.split('\n').includes(`4\t1\t${product}`));
const sourceBlobs = [product, tests].map(file => ({ file, stagedBlob: git(['rev-parse', `:${file}`]) }));
const message = '[AutoPerf F024] Skip disabled infinite session commit timer\n\n' +
  'Keep fresh linked cancellation ownership and finite/default deadlines.\n' +
  'Avoid the disabled timer only for explicit InfiniteTimeSpan commits.\n\n' +
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
  candidate: 'F024', actualSourceCommit: commit, actualSourceBranch: branch, actualBaseline: baseline,
  actualOnlySourceFiles: sourceBlobs, actualProductNumstat: numstat, actualCurrentDefault: current,
  actualCoreCurrentDefaultFilePairsMatched: relevant.length, actualAllRemoteSourceRefsAndBlobsVerified: true,
  actualBuiltAsBaselinePlusScopedUncommittedPatch: true, actualNewSourceCommitBuildClaim: false,
  actualSourceHeadAtMeasurementBuild: capsule.actualSourceHeadAtBuild, actualHistoricalTimingBudgetPermanentlyClosed: true,
  actualUnrelatedUntrackedReportsUntouched: allowedUntracked.filter(file => file !== tests),
};
fs.writeFileSync(path.join(execution, 'verified-source-publication.json'), JSON.stringify(result, null, 2) + '\n');
fs.writeFileSync(path.join(session, 'F024-source-commit.txt'), commit + '\n');
console.log(JSON.stringify(result, null, 2));
