import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F047');
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
const branch = 'autoperf/F047-ssr-parameter-enumeration';
const owner = 'src\\Components\\Endpoints\\src\\Rendering\\SSRRenderModeBoundary.cs';
const test = 'src\\Components\\Endpoints\\test\\EndpointHtmlRendererTest.cs';
const expectedPaths = [owner, test].map(file => file.replaceAll('\\', '/')).sort();
const decision = read(path.join(run, 'decision.json'));
assert.equal(read(path.join(run, 'diagnostic-budget.json')).permanentlyClosed, true);
assert.equal(decision.disposition, 'qualified');
assert.equal(decision.qualificationBasis, 'allocation-only-trade-off');
assert.equal(decision.numericalPrimaryTimingGateMet, false);
assert.equal(decision.allocationGateMet, true);
assert.deepEqual(decision.actualPrimarySlowerComparisons, [2, 3]);
const audited = read(path.join(run, 'audit-summary.json'));
assert.equal(audited.actualRetainedSamples, 384);
assert.equal(audited.actualRuntimeRecordsChecked, 22);
assert.equal(audited.actualIndependentlyRebuiltProjectFiles, 8);
assert.equal(git(['rev-parse', 'HEAD']), inputs.actualMeasuredBuildGitHead);
assert.equal(git(['branch', '--show-current']), branch);
assert.equal(git(['diff', '--cached', '--name-only']), '');
assert.deepEqual(git(['diff', '--name-only']).split(/\r?\n/).sort(), expectedPaths);
const reports = ['autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md'];
assert.deepEqual(git(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).sort(), reports.sort());
const reportHashes = Object.fromEntries(reports.map(file => [file, sha(path.join(root, file))]));
for (const item of [...inputs.sourceFiles, ...read(path.join(run, 'intake-completed.json')).protectedFiles]) {
  assert.equal(sha(path.join(root, ...item.path.split('/'))), item.sha256);
}
const remote = new URL(git(['remote', 'get-url', 'autoperf']));
assert.equal(remote.hostname, 'github.com');
assert.equal(remote.pathname.replace(/\.git$/, '').toLowerCase(), '/jaslawinms/aspnetcore');
assert.equal(git(['ls-remote', '--heads', 'autoperf', 'refs/heads/' + branch]), '');
git(['diff', '--check']);
git(['add', '--', owner, test]);
assert.deepEqual(git(['diff', '--cached', '--name-only']).split(/\r?\n/).sort(), expectedPaths);
git(['diff', '--cached', '--check']);
git(['commit', '-m', 'Avoid temporary parameter-key arrays during SSR fragment wrapping',
  '-m', 'Enumerate the private parameter snapshot directly while retaining existing-value fragment wrapping. Add three owning-renderer preservation rows for Server, WebAssembly and Auto. Three closed AB/BA/AB comparisons save 56 B/op in the one-scalar fresh-boundary primary, but do not establish a latency gain: its median paired less-time effect is -1.43%, with slower means in two pairs. Publish as an allocation trade-off, retaining the unstable first baseline, adverse results and unchanged controls; no application-throughput or merge-ready claim.',
  '-m', 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>\nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00']);
const commit = git(['rev-parse', 'HEAD']);
fs.writeFileSync(path.join(run, 'source-commit.txt'), commit + '\n', { flag: 'wx' });
assert.equal(git(['rev-parse', 'HEAD^']), inputs.actualMeasuredBuildGitHead);
assert.deepEqual(git(['diff-tree', '--no-commit-id', '--name-only', '-r', commit]).split(/\r?\n/).sort(), expectedPaths);
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
for (const item of inputs.sourceFiles) assert.equal(sha(path.join(root, ...item.path.split('/'))), item.sha256);
for (const file of reports) assert.equal(sha(path.join(root, file)), reportHashes[file]);
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
  candidate: 'F047', disposition: decision.disposition, qualificationBasis: decision.qualificationBasis,
  repository: 'jaslawinMs/aspnetcore', branch, sourceCommit: commit, parentBaseline: inputs.actualMeasuredBuildGitHead,
  sourceBranchUrl: 'https://github.com/jaslawinMs/aspnetcore/tree/' + branch,
  actualRemoteRefVerified: true, actualOnlySourceFiles: bindings,
  actualNewPerformancePullRequestCreated: false, actualCandidateRecommendedForMerge: false,
  actualMeasuredCandidateBuiltBeforePublicationCommit: true,
  actualPhysicalSnapshotsAndPdbHashesAreHistoricalAuthority: true,
  actualProtectedPrimaryGlobalJsonPreserved: true, actualUnrelatedReportHashesPreserved: reportHashes,
  actualHistoricalTimingRerun: false, qualification: decision.qualification
};
fs.writeFileSync(receipt, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
