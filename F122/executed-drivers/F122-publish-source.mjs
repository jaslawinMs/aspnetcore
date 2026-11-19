import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F122');
const root = String.raw`C:\src\aspnetcore`;
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, ''));
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex').toUpperCase();
const receipt = path.join(run, 'source-publication.json');
assert.equal(fs.existsSync(receipt), false, 'Resume a known partial publication instead of creating another source commit.');
const calls = [];
function execute(executable, args) {
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  calls.push({ executable, arguments: args, actualExitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(path.join(run, 'source-publication-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${executable} ${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
  return result.stdout.trim();
}
const git = args => execute('git', ['--no-pager', ...args]);
const api = endpoint => JSON.parse(execute('gh', ['api', endpoint]));
const intake = read(path.join(run, 'intake-completed.json'));
const inputs = read(path.join(run, 'source-inputs-original.json'));
const branch = 'autoperf/F122-copy-on-write-enumerator';
const owner = 'src/Mvc/Mvc.Core/src/Infrastructure/CopyOnWriteList.cs';
const test = 'src/Mvc/Mvc.Core/test/Infrastructure/CopyOnWriteListTest.cs';
const expectedPaths = [test];
const audit = read(path.join(run, 'audit-summary.json'));
assert.equal(read(path.join(run, 'diagnostic-budget.json')).permanentlyClosed, true);
assert.equal(audit.actualDisposition, 'rejected');
assert.equal(audit.actualRuntimeRecordsChecked, 10);
assert.equal(audit.actualRetainedSamples, 256);
assert.equal(audit.actualParsedIndividualTestRows, 68);
assert.equal(git(['rev-parse', 'HEAD']), intake.actualBaseline);
assert.equal(git(['branch', '--show-current']), branch);
assert.equal(git(['diff', '--cached', '--name-only']), '');
assert.equal(git(['diff', '--name-only']), '');
const reports = ['autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md'];
assert.deepEqual(git(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).sort(), [...reports, test].sort());
const reportHashes = Object.fromEntries(reports.map(filename => [filename, sha(path.join(root, filename))]));
for (const file of [...inputs.sourceFiles, ...intake.actualProtectedPrimaryInputs]) {
  assert.equal(sha(path.join(root, file.path)), file.sha256);
}
const ownerBlob = git(['rev-parse', 'HEAD:' + owner]);
const focused = read(path.join(run, 'baseline-validation.json')).actualFocusedTestSource;
assert.equal(sha(path.join(root, test)), focused.sha256);
assert.equal(sha(path.join(run, focused.snapshot)), focused.sha256);
const remote = new URL(git(['remote', 'get-url', 'autoperf']));
assert.equal(remote.hostname, 'github.com');
assert.equal(remote.pathname.replace(/\.git$/, '').toLowerCase(), '/jaslawinms/aspnetcore');
assert.equal(git(['ls-remote', '--heads', 'autoperf', `refs/heads/${branch}`]), '');
git(['diff', '--check']);
git(['add', '--', test]);
assert.deepEqual(git(['diff', '--cached', '--name-only']).split(/\r?\n/), expectedPaths);
git(['diff', '--cached', '--check']);
git(['commit', '-m', 'Preserve F122 CopyOnWriteList enumeration contracts',
  '-m', 'Tests-only independent research branch: six methods/twelve passing Boolean rows preserve references, source isolation, cursor/reset behavior, capture/mutation semantics, arbitrary-source forwarding and early disposal. The concrete-only struct-enumerator suggestion did not meet its predeclared production-fit gate: actual controller/page properties expose IList and both inspected MVC IL cohorts establish no non-forwarding concrete GetEnumerator call. One original-only 32-case profile retains 256 observations, including real nonempty interface allocations. No shipping change, synthetic concrete consumer, candidate comparison or performance pull request.',
  '-m', 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>\nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00']);
const commit = git(['rev-parse', 'HEAD']);
fs.writeFileSync(path.join(run, 'source-commit.txt'), commit + '\n', { flag: 'wx' });
assert.equal(git(['rev-parse', 'HEAD^']), intake.actualBaseline);
assert.deepEqual(git(['diff-tree', '--no-commit-id', '--name-only', '-r', commit]).split(/\r?\n/), expectedPaths);
assert.equal(git(['rev-parse', 'HEAD:' + owner]), ownerBlob);
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
for (const file of [...inputs.sourceFiles, ...intake.actualProtectedPrimaryInputs]) assert.equal(sha(path.join(root, file.path)), file.sha256);
for (const filename of reports) assert.equal(sha(path.join(root, filename)), reportHashes[filename]);
git(['push', 'autoperf', `HEAD:refs/heads/${branch}`]);
assert.equal(api(`repos/jaslawinMs/aspnetcore/git/ref/heads/${branch}`).object.sha, commit);
assert.deepEqual(api(`repos/jaslawinMs/aspnetcore/git/commits/${commit}`).parents.map(item => item.sha), [intake.actualBaseline]);
const bindings = expectedPaths.map(filename => {
  const id = git(['rev-parse', `${commit}:${filename}`]);
  const object = api(`repos/jaslawinMs/aspnetcore/git/blobs/${id}`);
  assert.equal(object.sha, id);
  assert.equal(object.encoding, 'base64');
  const bytes = Buffer.from(object.content.replace(/\s/g, ''), 'base64');
  assert.equal(crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), id);
  assert.equal(bytes.toString('utf8').replaceAll('\r\n', '\n'),
    fs.readFileSync(path.join(root, filename), 'utf8').replaceAll('\r\n', '\n'));
  return { path: filename, gitBlob: id, actualRemoteBytesVerified: true,
    actualLfCanonicalContentMatchesTestedPhysicalSnapshot: true, actualPhysicalSnapshotSha256: sha(path.join(root, filename)) };
});
const result = {
  candidate: 'F122', disposition: 'rejected', repository: 'jaslawinMs/aspnetcore', branch,
  sourceCommit: commit, parentBaseline: intake.actualBaseline,
  sourceBranchUrl: `https://github.com/jaslawinMs/aspnetcore/tree/${branch}`,
  actualRemoteRefVerified: true, actualOnlySourceFiles: bindings,
  actualShippingOwnerUnchangedGitBlob: ownerBlob, actualShippingSourceChanged: false,
  actualTestsOnlyCharacterizationBranch: true, actualNewPerformancePullRequestCreated: false,
  actualCandidateSelected: false, actualCandidateRecommendedForMerge: false,
  actualPhysicalSnapshotsAndPdbHashesAreHistoricalAuthority: true,
  actualProtectedFilesPreserved: true, actualUnrelatedReportHashesPreserved: reportHashes,
  actualHistoricalTimingRerun: false
};
fs.writeFileSync(receipt, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
