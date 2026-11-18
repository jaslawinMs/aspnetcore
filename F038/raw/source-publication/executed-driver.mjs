import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F038');
const execution = path.join(run, 'source-publication');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F038-render-tree-keyed-lookup';
const owner = 'src/Components/Components/src/RenderTree/RenderTreeDiffBuilder.cs';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const decision = read(path.join(run, 'decision.json'));
const live = read(path.join(run, 'live-file-audit.json'));
const preparation = read(path.join(run, 'preparation-candidate-001', 'verified-preparation.json'));
assert.equal(decision.actualAllApplicableAcceptanceChecksPassed, true);
assert.equal(decision.actualSourceComparisonBudgetPermanentlyClosed, true);
assert.equal(decision.actualCompletedSourceComparisonPairs, 3);
assert.equal(decision.actualSeleniumRows, 8);
assert.equal(live.actualAllLiveChecksPassed, true);
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
assert.equal(git(['diff', '--name-only']), owner);
assert.equal(git(['diff', '--numstat']), `5\t3\t${owner}`);
assert.equal(git(['diff', '--check']), '');
assert.match(git(['remote', 'get-url', 'autoperf']), /^https:\/\/github\.com\/jaslawinMs\/aspnetcore(?:\.git)?$/i);
assert.match(git(['remote', 'get-url', 'origin']), /^https:\/\/github\.com\/dotnet\/aspnetcore(?:\.git)?$/i);
for (const entry of preparation.actualSelectedSourceFiles)
  assert.equal(sha(fs.readFileSync(path.join(root, entry.path))), entry.sha256);
const current = JSON.parse(capture('gh', ['api', 'repos/dotnet/aspnetcore/branches/main'])).commit.sha;
capture('git', ['fetch', '--quiet', '--no-tags', 'origin', current]);
const investigation = read(path.join(run, 'investigation.json'));
const parity = investigation.sourceHashes.map(entry => {
  const actual = capture('git', ['show', `${current}:${entry.source}`]);
  assert.equal(sha(actual), entry.currentDefaultSha256,
    `A newly changed selected default source requires reassessment:${entry.source}`);
  return { file: entry.source, actualFreshDefaultBlobSha256: sha(actual),
    actualMatchesTestedBaseline: entry.matchesCurrentDefault,
    actualMatchesOriginallyAssessedDefault: true };
});
assert.equal(parity.length, 21);
assert.equal(parity.filter(entry => entry.actualMatchesTestedBaseline).length, 20);
assert.equal(parity.find(entry => entry.file === owner).actualMatchesTestedBaseline, true);
const forkBase = JSON.parse(capture('gh', ['api', 'repos/jaslawinMs/aspnetcore/branches/main'])).commit.sha;
assert.equal(forkBase, baseline, 'Fork default must yield exactly one independently reviewable source change.');
const template = fs.readFileSync(path.join(root, '.github', 'pull_request_template.md'));
fs.writeFileSync(path.join(run, 'pr-template-main.md'), template, { flag: 'wx' });
git(['add', '--', owner]);
assert.equal(git(['diff', '--cached', '--name-only']), owner);
git(['diff', '--cached', '--check']);
git(['commit', '-m', 'Avoid duplicate new-tree key lookups during rendering',
  '-m', 'Use an immediately consumed dictionary value ref only in the new-tree loop. Preserve old-tree construction, duplicate guards, index merging and pooling. F038 measures three actual renderer comparisons and retains all controls; no application-throughput or novel-strategy claim.',
  '-m', 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>\nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00']);
const commit = git(['rev-parse', 'HEAD']);
assert.equal(git(['rev-parse', 'HEAD^']), baseline);
assert.equal(git(['diff', '--name-only', `${baseline}..${commit}`]), owner);
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
const actualBlob = capture('git', ['show', `${commit}:${owner}`]);
const actualRawTestedSource = fs.readFileSync(path.join(run, 'preparation-candidate-001', 'sources', 'RenderTreeDiffBuilder.cs'));
assert.equal(actualBlob.toString().replaceAll('\r\n', '\n'),
  actualRawTestedSource.toString().replaceAll('\r\n', '\n'));
fs.writeFileSync(path.join(execution, 'committed-RenderTreeDiffBuilder.cs'), actualBlob);
const blobId = git(['rev-parse', `${commit}:${owner}`]);
assert.equal(blobId, git(['hash-object', `--path=${owner}`, owner]));
git(['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential',
  'push', 'autoperf', `${branch}:refs/heads/${branch}`]);
const remote = JSON.parse(capture('gh', ['api', `repos/jaslawinMs/aspnetcore/git/ref/heads/${branch}`]));
assert.equal(remote.object.sha, commit);
const comparison = JSON.parse(capture('gh', ['api', `repos/jaslawinMs/aspnetcore/compare/main...${branch}`]));
assert.equal(comparison.status, 'ahead');
assert.equal(comparison.ahead_by, 1);
assert.equal(comparison.behind_by, 0);
assert.deepEqual(comparison.files.map(file => file.filename), [owner]);
assert.equal(comparison.files[0].sha, blobId);
const receipt = {
  candidate: 'F038', disposition: decision.disposition, sourceBranch: branch, sourceCommit: commit,
  actualMeasuredBuildHead: baseline, actualMeasuredSourceWasUncommittedOnBaseline: true,
  actualForkBase: forkBase, actualCurrentDefault: current,
  actualInitiallyInvestigatedDefault: investigation.actualCurrentDefault,
  actualFreshSelectedSourcePairs: parity, actualSelectedPairs: 21, actualSelectedBaselineMatches: 20,
  actualRendererDependencyDriftUnchangedAndStillExcluded: true,
  actualOnlyChangedFiles: [owner], actualCanonicalBlobId: blobId,
  actualCommittedLfCanonicalTextEqualsTestedSource: true,
  actualCommittedRawBytesEqualTestedRawBytes: actualBlob.equals(actualRawTestedSource),
  actualTestedRawSourceSha256: sha(actualRawTestedSource),
  actualCommittedCanonicalSourceSha256: sha(actualBlob), actualRemoteRef: remote,
  actualSourceTrackedClean: true, actualAllSourceRefChecksPassed: true,
  actualPublicOrProtectedApiChanges: 0, actualPrCreatedAtSourcePublication: false,
  actualMeasuredBinariesNotRelabeledAsBuiltFromLaterPublicationCommit: true,
};
fs.writeFileSync(path.join(execution, 'verified-source-publication.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualSourceCommit: commit, actualForkDiffFiles: 1,
  actualFreshDefaultPairs: 21, actualSelectedBaselineMatches: 20,
  actualCanonicalTestedSourceMatched: true, actualPerformancePrCreated: false }, null, 2));
