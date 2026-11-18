import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F040');
const execution = path.join(run, 'source-publication');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F040-tempdata-remove-lookup';
const files = ['src/Components/Endpoints/src/TempData/TempData.cs', 'src/Components/Endpoints/test/TempData/TempDataTest.cs'];
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const decision = read(path.join(run, 'decision.json'));
assert.equal(decision.actualAllApplicableAcceptanceChecksPassed, true);
assert.equal(decision.actualSourceComparisonBudgetPermanentlyClosed, true);
assert.equal(decision.actualCompletedSourceComparisonPairs, 3);
assert.equal(decision.actualFailedSourceComparisonAttempts, 0);
assert.equal(decision.actualSeleniumRows, 10);
assert.equal(read(path.join(run, 'live-file-audit.json')).actualAllLiveChecksPassed, true);
assert.equal(fs.existsSync(execution), false);
fs.mkdirSync(execution);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(execution, 'executed-driver.mjs'));
const calls = [];
function capture(command, args) {
  const index = String(calls.length + 1).padStart(3, '0');
  const started = new Date().toISOString();
  const result = spawnSync(command, args, { cwd: root, maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, windowsHide: true });
  assert.ifError(result.error);
  fs.writeFileSync(path.join(execution, `${index}.stdout`), result.stdout ?? '');
  fs.writeFileSync(path.join(execution, `${index}.stderr`), result.stderr ?? '');
  calls.push({ executable: command, arguments: args, workingDirectory: root, started,
    completed: new Date().toISOString(), actualExitCode: result.status,
    stdout: `${index}.stdout`, stderr: `${index}.stderr` });
  fs.writeFileSync(path.join(execution, 'actual-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${command}: ${result.stderr}`);
  return result.stdout;
}
const git = args => capture('git', args).toString().trim();
assert.equal(git(['rev-parse', 'HEAD']), baseline);
assert.equal(git(['branch', '--show-current']), branch);
assert.equal(git(['diff', '--cached', '--name-only']), '');
assert.deepEqual(git(['diff', '--name-only']).split(/\r?\n/), files);
assert.equal(git(['diff', '--numstat']), `1\t1\t${files[0]}\n47\t0\t${files[1]}`);
assert.equal(git(['diff', '--check']), '');
assert.match(git(['remote', 'get-url', 'autoperf']), /^https:\/\/github\.com\/jaslawinMs\/aspnetcore(?:\.git)?$/i);
assert.match(git(['remote', 'get-url', 'origin']), /^https:\/\/github\.com\/dotnet\/aspnetcore(?:\.git)?$/i);
for (const entry of read(path.join(run, 'preparation-candidate-001', 'source-manifest.json')).documents)
  assert.equal(sha(fs.readFileSync(entry.actualRootSource)), entry.sha256);
const current = JSON.parse(capture('gh', ['api', 'repos/dotnet/aspnetcore/branches/main'])).commit.sha;
capture('git', ['fetch', '--quiet', '--no-tags', 'origin', current]);
const context = read(path.join(run, 'context.json'));
const parity = context.actualAllSelectedPairs.map(entry => {
  const actual = capture('git', ['show', `${current}:${entry.file}`]);
  const expected = entry.actualCurrentDefaultBlobSha256 ?? entry.actualDefaultBlobSha256;
  assert.equal(sha(actual), expected, `Reassess newly changed selected default source:${entry.file}`);
  assert.equal(entry.actualDefaultEqualsBaseline, true);
  return { file: entry.file, actualFreshDefaultBlobSha256: sha(actual), actualMatchesTestedBaseline: true,
    actualMatchesOriginallyAssessedDefault: true };
});
assert.equal(parity.length, 18);
const forkBase = JSON.parse(capture('gh', ['api', 'repos/jaslawinMs/aspnetcore/branches/main'])).commit.sha;
assert.equal(forkBase, baseline, 'The fork default must yield one independent two-file source change.');
fs.writeFileSync(path.join(run, 'pr-template-main.md'), fs.readFileSync(path.join(root, '.github', 'pull_request_template.md')), { flag: 'wx' });
git(['add', '--', ...files]);
assert.deepEqual(git(['diff', '--cached', '--name-only']).split(/\r?\n/), files);
git(['diff', '--cached', '--check']);
git(['commit', '-m', 'Avoid duplicate lookups in TempData conditional collection removal',
  '-m', 'Use the private Data dictionary TryGetValue, not the consuming public member. Preserve lazy loading, null, equality and retention, including the final Remove(key) result after reentrant equality. Add eight first-access preservation rows. F040 retains three completed RemoveAndRestore comparisons with restoration inside timing; no isolated Remove, cookie or application speedup claim.',
  '-m', 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>\nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00']);
const commit = git(['rev-parse', 'HEAD']);
assert.equal(git(['rev-parse', 'HEAD^']), baseline);
assert.deepEqual(git(['diff', '--name-only', `${baseline}..${commit}`]).split(/\r?\n/), files);
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
const sourceBlobs = files.map(file => {
  const actual = capture('git', ['show', `${commit}:${file}`]);
  const tested = fs.readFileSync(path.join(run, 'proposed-source', path.posix.basename(file)));
  assert.equal(actual.toString().replaceAll('\r\n', '\n'), tested.toString().replaceAll('\r\n', '\n'));
  fs.writeFileSync(path.join(execution, `committed-${path.posix.basename(file)}`), actual);
  const blobId = git(['rev-parse', `${commit}:${file}`]);
  assert.equal(blobId, git(['hash-object', `--path=${file}`, file]));
  return { file, actualCanonicalBlobId: blobId, actualCommittedLfCanonicalTextEqualsTestedSource: true,
    actualRawBytesEqualTestedRawBytes: actual.equals(tested),
    actualTestedRawSha256: sha(tested), actualCommittedCanonicalSha256: sha(actual) };
});
git(['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential',
  'push', 'autoperf', `${branch}:refs/heads/${branch}`]);
const remote = JSON.parse(capture('gh', ['api', `repos/jaslawinMs/aspnetcore/git/ref/heads/${branch}`]));
assert.equal(remote.object.sha, commit);
const comparison = JSON.parse(capture('gh', ['api', `repos/jaslawinMs/aspnetcore/compare/main...${branch}`]));
assert.equal(comparison.status, 'ahead');
assert.equal(comparison.ahead_by, 1);
assert.equal(comparison.behind_by, 0);
assert.deepEqual(comparison.files.map(file => file.filename), files);
comparison.files.forEach((file, index) => assert.equal(file.sha, sourceBlobs[index].actualCanonicalBlobId));
const receipt = {
  candidate: 'F040', disposition: decision.disposition, sourceBranch: branch, sourceCommit: commit,
  actualMeasuredBuildHead: baseline, actualMeasuredSourceWasUncommittedOnBaseline: true,
  actualForkBase: forkBase, actualCurrentDefault: current,
  actualInitiallyInvestigatedDefault: read(path.join(run, 'investigation.json')).actualFreshDefault,
  actualFreshSelectedSourcePairs: parity, actualSelectedPairs: 18, actualSelectedBaselineMatches: 18,
  actualFullCurrentDefaultBuildOrDependencyEquivalenceClaimed: false,
  actualOnlyChangedFiles: files, actualSourceBlobs: sourceBlobs,
  actualCommittedLfCanonicalTextEqualsTestedSource: true, actualRemoteRef: remote,
  actualSourceTrackedClean: true, actualAllSourceRefChecksPassed: true,
  actualPublicOrProtectedApiChanges: 0, actualF039CollectionContainsChanged: false,
  actualPrCreatedAtSourcePublication: false, actualMeasuredBinariesNotRelabeledAsBuiltFromLaterPublicationCommit: true,
};
fs.writeFileSync(path.join(execution, 'verified-source-publication.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualSourceCommit: commit, actualForkDiffFiles: 2,
  actualFreshDefaultPairs: 18, actualSelectedBaselineMatches: 18,
  actualCanonicalTestedSourcesMatched: true, actualPerformancePrCreated: false }, null, 2));
