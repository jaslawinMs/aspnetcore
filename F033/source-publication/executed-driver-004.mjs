import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F033');
const execution = path.join(run, 'source-publication');
const branch = 'autoperf/F033-httpsys-write-start';
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const file = 'src/Servers/HttpSys/src/ResponseStream.cs';
const read = input => JSON.parse(fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, ''));
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const decision = read(path.join(run, 'decision.json'));
const live = read(path.join(run, 'live-frozen-closure-audit.json'));
const tested = read(path.join(run, 'validation', 'candidate-existing-1', 'verified-result.json'));
assert.equal(decision.disposition, 'qualified-no-callback-scoped-fork-draft');
assert.equal(decision.actualSourceComparisonBudgetPermanentlyClosed, true);
assert.equal(decision.actualCompletedSourceComparisonPairs, 3);
assert.equal(live.actualFinalCandidateSourceAndProductByteMatchTestedVariant, true);
assert.equal(live.actualConsumerBindings, 744);
assert.equal(live.actualLoadedRuntimeBindings, 5576);
assert.equal(fs.existsSync(path.join(execution, 'verified-source-publication.json')), false);
fs.mkdirSync(execution, { recursive: true });
const callsPath = path.join(execution, 'actual-invocations.json');
const calls = fs.existsSync(callsPath) ? read(callsPath) : [];
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(execution, `executed-driver-${String(calls.length).padStart(3, '0')}.mjs`));
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
  fs.writeFileSync(callsPath, JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${command}: ${result.stderr}`);
  return result.stdout;
}
const git = args => capture('git', args).toString().trim();
assert.equal(git(['branch', '--show-current']), branch);
assert.equal(git(['diff', '--cached', '--name-only']), '');
assert.match(git(['remote', 'get-url', 'autoperf']), /^https:\/\/github\.com\/jaslawinMs\/aspnetcore(?:\.git)?$/i);
assert.equal(sha(fs.readFileSync(path.join(root, ...file.split('/')))), tested.actualResponseStreamSourceSha256);
const investigation = read(path.join(run, 'investigation.json'));
for (const entry of investigation.parity.filter(row => row.core && row.file !== file)) {
  assert.equal(sha(fs.readFileSync(path.join(root, ...entry.file.split('/')))), entry.actualWorkingBytesSha256);
}
const audit = spawnSync(process.execPath, [path.join(session, 'F033-audit.mjs'), run, '--verify'],
  { cwd: root, encoding: 'utf8' });
fs.writeFileSync(path.join(execution, 'prepublication-audit.stdout'), audit.stdout ?? '');
fs.writeFileSync(path.join(execution, 'prepublication-audit.stderr'), audit.stderr ?? '');
assert.equal(audit.status, 0, audit.stderr);
const current = JSON.parse(capture('gh', ['api', 'repos/dotnet/aspnetcore/branches/main'])).commit.sha;
if (current !== investigation.actualCurrentDefault) {
  const reassessment = read(path.join(run, 'prepublication-default-refresh', 'verified-default-reassessment.json'));
  assert.equal(reassessment.actualCurrentDefault, current, 'A newer current default requires another explicit selected-source assessment.');
  assert.equal(reassessment.actualSelectedFilePairs, 16);
  assert.equal(reassessment.actualAllSelectedSourcesMatchBaseline, true);
  assert.equal(reassessment.actualSelectedInterveningHistory, '');
  assert.equal(reassessment.actualNewSourceComparisons, 0);
}
const forkBase = JSON.parse(capture('gh', ['api', 'repos/jaslawinMs/aspnetcore/branches/main'])).commit.sha;
assert.equal(forkBase, baseline, 'Do not publish an unexpectedly broad fork-base comparison.');
const originalHead = git(['rev-parse', 'HEAD']);
if (originalHead === baseline) {
  assert.equal(git(['diff', '--name-only']), file);
  git(['add', '--', file]);
  assert.equal(git(['diff', '--cached', '--name-only']), file);
  git(['diff', '--cached', '--check']);
  git(['commit', '-m', 'Guard completed HTTP.sys synchronous write startup',
    '-m', 'Retain synchronous completion and all start/error/argument/default-IO ordering. F033 records three measured pairs with scenario-specific no-callback benefit, mixed declared callback primary, tiny prepared-zero gain and all adverse controls.',
    '-m', 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>\nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00']);
}
const commit = git(['rev-parse', 'HEAD']);
assert.notEqual(commit, baseline);
assert.equal(git(['rev-parse', 'HEAD^']), baseline);
assert.equal(git(['diff', '--name-only', `${baseline}..${commit}`]), file);
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
const actualBlob = capture('git', ['show', `${commit}:${file}`]);
fs.writeFileSync(path.join(execution, 'committed-ResponseStream.cs'), actualBlob);
const testedBytes = fs.readFileSync(path.join(run, 'validation', 'candidate-existing-1', 'ResponseStream.cs.executed-source'));
assert.equal(actualBlob.toString().replaceAll('\r\n', '\n'), testedBytes.toString().replaceAll('\r\n', '\n'));
const blobId = git(['rev-parse', `${commit}:${file}`]);
assert.equal(blobId, git(['hash-object', `--path=${file}`, file]));
git(['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential',
  'push', 'autoperf', `${branch}:refs/heads/${branch}`]);
const remote = JSON.parse(capture('gh', ['api', `repos/jaslawinMs/aspnetcore/git/ref/heads/${branch}`]));
assert.equal(remote.ref, `refs/heads/${branch}`);
assert.equal(remote.object.sha, commit);
const comparison = JSON.parse(capture('gh', ['api', `repos/jaslawinMs/aspnetcore/compare/main...${branch}`]));
assert.equal(comparison.status, 'ahead');
assert.equal(comparison.ahead_by, 1);
assert.equal(comparison.behind_by, 0);
assert.deepEqual(comparison.files.map(entry => entry.filename), [file]);
assert.equal(comparison.files[0].sha, blobId);
const receipt = {
  candidate: 'F033', disposition: decision.disposition, sourceBranch: branch, sourceCommit: commit,
  actualMeasuredBuildHead: baseline, actualMeasuredSourceWasUncommittedOnBaseline: true,
  actualForkBase: forkBase, actualCurrentDefault: current, actualInitiallyInvestigatedDefault: investigation.actualCurrentDefault,
  actualSelectedSourcesRehashed: 16,
  actualChangedFiles: [file], actualFinalSourceTrackedClean: true, actualRemoteRef: remote,
  actualCommittedCanonicalBlob: blobId, actualCommittedCanonicalSourceSha256: sha(actualBlob),
  actualTestedRawSourceSha256: sha(testedBytes), actualCommittedRawBytesEqualTestedRawBytes: actualBlob.equals(testedBytes),
  actualCommittedLfCanonicalTextEqualsTestedSource: true, actualAllSourceRefChecksPassed: true,
  actualSourceComparisons: 3, actualCompletedSourceComparisonPairs: 3,
  actualOnlyWriteCompletedSuccessGuard: true, actualPublicApiAndBaselineChanges: 0,
  actualPerformancePrCreatedAtSourcePublication: false, actualPortableAuditExitCode: audit.status,
  qualification: 'Only source commit/reference and LF-canonical tested text are bound here. Timed owner/harness images were actually built on baseline37e809e plus the uncommitted guard,not relabeled as compiled from this later publication commit.',
};
fs.writeFileSync(path.join(execution, 'verified-source-publication.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ actualSourceCommit: commit, actualForkDiffFiles: comparison.files.length,
  actualCanonicalTestedSourceMatched: true, actualPerformancePrCreated: false }, null, 2));
