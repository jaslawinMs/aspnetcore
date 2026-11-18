import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F042'), root = 'C:\\src\\aspnetcore';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const receipt = path.join(run, 'source-publication.json');
assert.equal(fs.existsSync(receipt), false, 'Inspect any previous or partial source publication before continuing.');
const calls = [];
const execute = (executable, args) => {
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  calls.push({ executable, arguments: args, actualExitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(path.join(run, 'source-publication-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${executable} ${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
  return result.stdout.trim();
};
const git = args => execute('git', args);
const api = endpoint => JSON.parse(execute('gh', ['api', endpoint]));
const inputs = read(path.join(run, 'source-inputs-candidate.json'));
const branch = 'autoperf/F042-jsonpatch-dictionary-replace';
const owner = 'src\\Features\\JsonPatch.SystemTextJson\\src\\Internal\\DictionaryAdapterOfTU.cs';
const test = 'src\\Features\\JsonPatch.SystemTextJson\\test\\IntegrationTests\\DictionaryReplaceTest.cs';
const expectedPaths = [owner, test].map(file => file.replaceAll('\\', '/')).sort();
assert.equal(read(path.join(run, 'diagnostic-budget.json')).closed, true);
assert.equal(read(path.join(run, 'audit-summary.json')).disposition, 'no-gain');
assert.equal(git(['rev-parse', 'HEAD']), inputs.actualPrimaryBaseline);
assert.equal(git(['branch', '--show-current']), branch);
assert.equal(git(['diff', '--cached', '--name-only']), '');
assert.deepEqual(git(['diff', '--name-only']).split(/\r?\n/), [owner.replaceAll('\\', '/')]);
const reports = ['autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md'];
assert.deepEqual(git(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).sort(),
  [...reports, test.replaceAll('\\', '/')].sort());
const reportHashes = Object.fromEntries(reports.map(file => [file, sha(path.join(root, file))]));
for (const file of inputs.sourceFiles) assert.equal(sha(path.join(root, file.path)), file.sha256);
assert.equal(sha(path.join(root, test)), sha(path.join(run, 'new-tests-candidate.cs')));
assert.equal(sha(path.join(root, 'global.json')), 'C3D6E7C29D94C34B6343D4A2EFE74164929F29BFA26FD84B5E2020A15091CD53');
const remote = new URL(git(['remote', 'get-url', 'autoperf']));
assert.equal(remote.hostname, 'github.com');
assert.equal(remote.pathname.replace(/\.git$/, '').toLowerCase(), '/jaslawinms/aspnetcore');
assert.equal(git(['ls-remote', '--heads', 'autoperf', `refs/heads/${branch}`]), '');
git(['diff', '--check']);
git(['add', '--', owner, test]);
assert.deepEqual(git(['diff', '--cached', '--name-only']).split(/\r?\n/).sort(), expectedPaths);
git(['diff', '--cached', '--check']);
git(['commit', '-m', 'Record F042 conversion-safe dictionary replacement experiment',
  '-m', 'Keep the guarded exact-dictionary/already-assignable candidate and five public-producer preservation cases on an independent research branch. Three source comparisons did not establish the declared timing or allocation gain. This is diagnostic evidence, not a merge recommendation; no performance pull request is warranted.',
  '-m', 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>\nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00']);
const commit = git(['rev-parse', 'HEAD']);
fs.writeFileSync(path.join(run, 'source-commit.txt'), commit + '\n', { flag: 'wx' });
assert.equal(git(['rev-parse', 'HEAD^']), inputs.actualPrimaryBaseline);
assert.deepEqual(git(['diff-tree', '--no-commit-id', '--name-only', '-r', commit]).split(/\r?\n/).sort(), expectedPaths);
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
for (const file of inputs.sourceFiles) assert.equal(sha(path.join(root, file.path)), file.sha256);
for (const file of reports) assert.equal(sha(path.join(root, file)), reportHashes[file]);
git(['push', 'autoperf', `HEAD:refs/heads/${branch}`]);
assert.equal(api(`repos/jaslawinMs/aspnetcore/git/ref/heads/${branch}`).object.sha, commit);
assert.deepEqual(api(`repos/jaslawinMs/aspnetcore/git/commits/${commit}`).parents.map(item => item.sha), [inputs.actualPrimaryBaseline]);
const bindings = expectedPaths.map(file => {
  const id = git(['rev-parse', `${commit}:${file}`]), object = api(`repos/jaslawinMs/aspnetcore/git/blobs/${id}`);
  assert.equal(object.sha, id);
  assert.equal(object.encoding, 'base64');
  const remoteBytes = Buffer.from(object.content.replace(/\s/g, ''), 'base64');
  const physical = fs.readFileSync(path.join(root, ...file.split('/')));
  assert.equal(crypto.createHash('sha1').update(`blob ${remoteBytes.length}\0`).update(remoteBytes).digest('hex'), id);
  assert.equal(remoteBytes.toString('utf8').replaceAll('\r\n', '\n'), physical.toString('utf8').replaceAll('\r\n', '\n'));
  return { path: file, gitBlob: id, actualRemoteBytesVerified: true, actualLfCanonicalContentMatchesTestedPhysicalSnapshot: true,
    actualPhysicalSnapshotSha256: crypto.createHash('sha256').update(physical).digest('hex').toUpperCase() };
});
const result = { candidate: 'F042', disposition: 'no-gain', repository: 'jaslawinMs/aspnetcore', branch,
  sourceCommit: commit, parentBaseline: inputs.actualPrimaryBaseline,
  sourceBranchUrl: `https://github.com/jaslawinMs/aspnetcore/tree/${branch}`,
  actualRemoteRefVerified: true, actualOnlySourceFiles: bindings,
  actualNewPerformancePullRequestCreated: false, actualCandidateRecommendedForMerge: false,
  actualMeasuredCandidateBuiltBeforePublicationCommit: true, actualPhysicalSnapshotsAndPdbHashesAreHistoricalAuthority: true,
  actualProtectedPrimaryGlobalJsonPreserved: true, actualUnrelatedReportHashesPreserved: reportHashes,
  actualHistoricalTimingRerun: false };
fs.writeFileSync(receipt, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
