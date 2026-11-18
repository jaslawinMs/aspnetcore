import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F044');
const root = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const receipt = path.join(run, 'source-publication.json');
assert.equal(fs.existsSync(receipt), false, 'Inspect any previous or partial source publication before continuing.');
const calls = [];
function execute(executable, args) {
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  calls.push({ executable, arguments: args, actualExitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(path.join(run, 'source-publication-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${executable} ${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
  return result.stdout.trim();
}
const git = args => execute('git', ['-c', 'core.longpaths=true', ...args]);
const api = endpoint => JSON.parse(execute('gh', ['api', endpoint]));
const inputs = read(path.join(run, 'source-inputs-candidate.json'));
const branch = 'autoperf/F044-razor-base-section-try-add';
const owner = 'src\\Mvc\\Mvc.Razor\\src\\RazorPageBase.cs';
const test = 'src\\Mvc\\Mvc.Razor\\test\\RazorPageTest.cs';
const expectedPaths = [owner, test].map(file => file.replaceAll('\\', '/')).sort();
const disposition = read(path.join(run, 'decision.json'));
assert.equal(read(path.join(run, 'diagnostic-budget.json')).closed, true);
assert.equal(disposition.disposition, 'qualified');
assert.equal(disposition.numericalPrimaryTimingGateMet, true);
assert.equal(disposition.controlCredibilityGateMet, true);
assert.equal(read(path.join(run, 'measurement-audit.json')).actualRetainedSamples, 576);
assert.equal(read(path.join(run, 'reproduction-paired-001', 'verified-reproduction.json')).actualByteExactProjectFiles, 13);
assert.equal(git(['rev-parse', 'HEAD']), inputs.observedHead);
assert.equal(git(['branch', '--show-current']), branch);
assert.equal(git(['diff', '--cached', '--name-only']), '');
assert.deepEqual(git(['diff', '--name-only']).split(/\r?\n/).sort(), expectedPaths);
const reports = ['autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md'];
assert.deepEqual(git(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).sort(), reports.sort());
const reportHashes = Object.fromEntries(reports.map(file => [file, sha(path.join(root, file))]));
for (const file of inputs.sourceFiles) assert.equal(sha(path.join(root, file.path)), file.sha256);
for (const file of read(path.join(run, 'premeasurement-protected-inputs.json')).protectedFiles) {
  assert.equal(sha(path.join(root, file.path)), file.sha256);
}
const remote = new URL(git(['remote', 'get-url', 'autoperf']));
assert.equal(remote.hostname, 'github.com');
assert.equal(remote.pathname.replace(/\.git$/, '').toLowerCase(), '/jaslawinms/aspnetcore');
assert.equal(git(['ls-remote', '--heads', 'autoperf', 'refs/heads/' + branch]), '');
git(['diff', '--check']);
git(['add', '--', owner, test]);
assert.deepEqual(git(['diff', '--cached', '--name-only']).split(/\r?\n/).sort(), expectedPaths);
git(['diff', '--cached', '--check']);
git(['commit', '-m', 'Avoid duplicate base Razor section registration lookups',
  '-m', 'Use concrete Dictionary.TryAdd only in RazorPageBase.DefineSection and add two focused original/candidate preservation rows. The SDK-compiled custom-base primary uses a median10.22% less time at unchanged704 B/op across three permanently closed source comparisons. Retain noisy and adverse one-section/full-view results; no normal RazorPage, application-throughput or merge-ready claim.',
  '-m', 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>\nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00']);
const commit = git(['rev-parse', 'HEAD']);
fs.writeFileSync(path.join(run, 'source-commit.txt'), commit + '\n', { flag: 'wx' });
assert.equal(git(['rev-parse', 'HEAD^']), inputs.observedHead);
assert.deepEqual(git(['diff-tree', '--no-commit-id', '--name-only', '-r', commit]).split(/\r?\n/).sort(), expectedPaths);
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
for (const file of inputs.sourceFiles) assert.equal(sha(path.join(root, file.path)), file.sha256);
for (const file of reports) assert.equal(sha(path.join(root, file)), reportHashes[file]);
git(['push', 'autoperf', 'HEAD:refs/heads/' + branch]);
assert.equal(api('repos/jaslawinMs/aspnetcore/git/ref/heads/' + branch).object.sha, commit);
assert.deepEqual(api('repos/jaslawinMs/aspnetcore/git/commits/' + commit).parents.map(item => item.sha), [inputs.observedHead]);
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
  candidate: 'F044', disposition: disposition.disposition, repository: 'jaslawinMs/aspnetcore', branch,
  sourceCommit: commit, parentBaseline: inputs.observedHead,
  sourceBranchUrl: 'https://github.com/jaslawinMs/aspnetcore/tree/' + branch,
  actualRemoteRefVerified: true, actualOnlySourceFiles: bindings,
  actualNewPerformancePullRequestCreated: false, actualCandidateRecommendedForMerge: false,
  actualMeasuredCandidateBuiltBeforePublicationCommit: true,
  actualPhysicalSnapshotsAndPdbHashesAreHistoricalAuthority: true,
  actualProtectedPrimaryGlobalJsonPreserved: true, actualUnrelatedReportHashesPreserved: reportHashes,
  actualHistoricalTimingRerun: false,
  qualification: 'Qualified workload-dependent custom-base registration result only: primary10.22% less time, unchanged704 B/op; preserve all adverse one-section/full-view outcomes and shared-machine uncertainty. A source publication is not itself a pull-request or merge recommendation.'
};
fs.writeFileSync(receipt, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
