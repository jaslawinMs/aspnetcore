import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F046');
const root = 'C:\\src\\aspnetcore';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const receipt = path.join(run, 'source-publication.json');
assert.equal(fs.existsSync(receipt), false, 'Inspect any previous or partial source publication first.');
const calls = [];
function execute(executable, args) {
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  calls.push({ executable, arguments: args, actualExitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(path.join(run, 'source-publication-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${executable} ${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
  return result.stdout.trim();
}
const git = args => execute('git', ['-c', 'core.longpaths=true', '--no-pager', ...args]);
const api = endpoint => JSON.parse(execute('gh', ['api', endpoint]));
const inputs = read(path.join(run, 'source-inputs-candidate.json'));
const branch = 'autoperf/F046-httpsys-header-append-ref';
const owner = 'src\\Shared\\HttpSys\\RequestProcessing\\HeaderCollection.cs';
const test = 'src\\Servers\\HttpSys\\test\\Tests\\HeaderCollectionTests.cs';
const expectedPaths = [owner, test].map(file => file.replaceAll('\\', '/')).sort();
const decision = read(path.join(run, 'decision.json'));
assert.equal(read(path.join(run, 'diagnostic-budget.json')).permanentlyClosed, true);
assert.equal(decision.disposition, 'qualified');
assert.equal(decision.numericalPrimaryTimingGateMet, true);
assert.equal(decision.controlCredibilityGateMet, true);
const audited = read(path.join(run, 'audit-summary.json'));
assert.equal(audited.actualRetainedSamples, 576);
assert.equal(audited.actualRuntimeRecordsChecked, 22);
assert.equal(audited.actualIndependentlyRebuiltProjectFiles, 9);
assert.equal(git(['rev-parse', 'HEAD']), inputs.actualMeasuredBuildGitHead);
assert.equal(git(['branch', '--show-current']), branch);
assert.equal(git(['diff', '--cached', '--name-only']), '');
assert.deepEqual(git(['diff', '--name-only']).split(/\r?\n/), [owner.replaceAll('\\', '/')]);
const reports = ['autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md'];
assert.deepEqual(git(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).sort(),
  [...reports, test.replaceAll('\\', '/')].sort());
const reportHashes = Object.fromEntries(reports.map(file => [file, sha(path.join(root, file))]));
for (const item of inputs.sourceFiles) {
  assert.equal(sha(path.join(root, ...item.path.split('/'))), item.sha256);
}
for (const item of read(path.join(run, 'intake-completed.json')).protectedFiles) {
  assert.equal(sha(path.join(root, item.path)), item.sha256);
}
const remote = new URL(git(['remote', 'get-url', 'autoperf']));
assert.equal(remote.hostname, 'github.com');
assert.equal(remote.pathname.replace(/\.git$/, '').toLowerCase(), '/jaslawinms/aspnetcore');
assert.equal(git(['ls-remote', '--heads', 'autoperf', 'refs/heads/' + branch]), '');
git(['diff', '--check']);
git(['add', '--', owner, test]);
assert.deepEqual(git(['diff', '--cached', '--name-only']).split(/\r?\n/).sort(), expectedPaths);
git(['diff', '--cached', '--check']);
git(['commit', '-m', 'Avoid duplicate lookups when appending HTTP.sys close headers',
  '-m', 'Use CollectionsMarshal only for the exact concrete dictionary and retain interface operations for wrappers and subclasses. Add ten focused preservation rows. The fresh close-header primary uses a median 13.41% less time at unchanged 384 B/op across three permanently closed AB/BA/AB comparisons. Preserve the noisy unchanged controls and mixed fallback results; no native HTTP.sys, IIS, application-throughput or merge-ready claim.',
  '-m', 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>\nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00']);
const commit = git(['rev-parse', 'HEAD']);
fs.writeFileSync(path.join(run, 'source-commit.txt'), commit + '\n', { flag: 'wx' });
assert.equal(git(['rev-parse', 'HEAD^']), inputs.actualMeasuredBuildGitHead);
assert.deepEqual(git(['diff-tree', '--no-commit-id', '--name-only', '-r', commit]).split(/\r?\n/).sort(), expectedPaths);
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
for (const item of inputs.sourceFiles) {
  assert.equal(sha(path.join(root, ...item.path.split('/'))), item.sha256);
}
for (const file of reports) {
  assert.equal(sha(path.join(root, file)), reportHashes[file]);
}
git(['push', 'autoperf', 'HEAD:refs/heads/' + branch]);
assert.equal(api('repos/jaslawinMs/aspnetcore/git/ref/heads/' + branch).object.sha, commit);
assert.deepEqual(api('repos/jaslawinMs/aspnetcore/git/commits/' + commit).parents.map(item => item.sha), [inputs.actualMeasuredBuildGitHead]);
const bindings = expectedPaths.map(file => {
  const id = git(['rev-parse', commit + ':' + file]);
  const object = api('repos/jaslawinMs/aspnetcore/git/blobs/' + id);
  assert.equal(object.sha, id);
  assert.equal(object.encoding, 'base64');
  const remoteBytes = Buffer.from(object.content.replace(/\s/g, ''), 'base64');
  const physical = fs.readFileSync(path.join(root, ...file.split('/')));
  assert.equal(crypto.createHash('sha1').update(`blob ${remoteBytes.length}\0`).update(remoteBytes).digest('hex'), id);
  assert.equal(remoteBytes.toString('utf8').replaceAll('\r\n', '\n'), physical.toString('utf8').replaceAll('\r\n', '\n'));
  return { path: file, gitBlob: id, actualRemoteBytesVerified: true,
    actualLfCanonicalContentMatchesTestedPhysicalSnapshot: true, actualPhysicalSnapshotSha256: sha(path.join(root, ...file.split('/'))) };
});
const result = {
  candidate: 'F046', disposition: decision.disposition, repository: 'jaslawinMs/aspnetcore', branch,
  sourceCommit: commit, parentBaseline: inputs.actualMeasuredBuildGitHead,
  sourceBranchUrl: 'https://github.com/jaslawinMs/aspnetcore/tree/' + branch,
  actualRemoteRefVerified: true, actualOnlySourceFiles: bindings,
  actualNewPerformancePullRequestCreated: false, actualCandidateRecommendedForMerge: false,
  actualMeasuredCandidateBuiltBeforePublicationCommit: true,
  actualPhysicalSnapshotsAndPdbHashesAreHistoricalAuthority: true,
  actualProtectedPrimaryGlobalJsonPreserved: true, actualUnrelatedReportHashesPreserved: reportHashes,
  actualHistoricalTimingRerun: false,
  qualification: 'Qualified focused local result: the default-store fresh Connection: close suffix primary uses13.41% median paired less time, unchanged384 B/op. Native HTTP.sys and IIS throughput, general request-header appends and application impact are not measured. Keep the27.44% unchanged secondary-control swing and the2.31% fallback regression visible.'
};
fs.writeFileSync(receipt, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
