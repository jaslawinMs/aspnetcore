import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F124');
const root = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
assert.equal(fs.existsSync(path.join(run, 'source-publication.json')), false);
assert.equal(fs.existsSync(path.join(run, 'source-commit.txt')), false, 'Resume a known partial source publication.');
const calls = [];
function execute(executable, args) {
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  assert.ifError(result.error);
  calls.push({ executable, arguments: args, actualExitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(path.join(run, 'source-publication-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${executable}: ${result.stderr}\n${result.stdout}`);
  return result.stdout.trim();
}
const git = args => execute('git', ['--no-pager', ...args]);
const api = endpoint => JSON.parse(execute('gh', ['api', endpoint]));
const intake = read(path.join(run, 'intake-completed.json'));
const inputs = read(path.join(run, 'source-inputs-candidate-002.json'));
const decision = read(path.join(run, 'decision.json'));
const audit = read(path.join(run, 'audit-summary.json'));
const branch = 'autoperf/F124-bounded-program-analyzer-traversal';
const owner = 'src/Framework/AspNetCoreAnalyzers/src/Analyzers/WebApplicationBuilder/PublicPartialProgramClassAnalyzer.cs';
const test = 'src/Framework/AspNetCoreAnalyzers/test/WebApplicationBuilder/PublicPartialProgramClassTest.cs';
const expectedPaths = [owner, test].sort();
assert.equal(read(path.join(run, 'diagnostic-budget.json')).permanentlyClosed, true);
assert.equal(decision.actualDraftProposalWarrantedWithinExplicitLimitations, true);
assert.equal(audit.actualPrimaryQualificationMet, true);
assert.equal(audit.actualRetainedSamples, 576);
assert.equal(audit.actualParsedIndividualTestRows, 63);
assert.equal(audit.actualRuntimeRecordsChecked, 22);
assert.equal(audit.actualPartialPreparationRuntimeRecordsChecked, 1);
assert.equal(git(['rev-parse', 'HEAD']), intake.actualBaseline);
assert.equal(git(['branch', '--show-current']), branch);
assert.equal(git(['diff', '--cached', '--name-only']), '');
assert.deepEqual(git(['diff', '--name-only']).split(/\r?\n/).sort(), expectedPaths);
const changes = git(['diff', '--numstat']).split(/\r?\n/).map(line => line.split('\t'));
assert.deepEqual(changes.map(item => item.slice(0, 2)), [['1', '1'], ['41', '0']]);
const reports = ['autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md'];
assert.deepEqual(git(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).sort(), reports.sort());
const reportHashes = Object.fromEntries(reports.map(file => [file, sha(path.join(root, file))]));
for (const file of [...inputs.sourceFiles, ...intake.actualProtectedPrimaryInputs]) {
  assert.equal(sha(path.join(root, file.path)), file.sha256);
}
const remote = new URL(git(['remote', 'get-url', 'autoperf']));
assert.equal(remote.hostname, 'github.com');
assert.equal(remote.pathname.replace(/\.git$/, '').toLowerCase(), '/jaslawinms/aspnetcore');
assert.equal(git(['ls-remote', '--heads', 'autoperf', `refs/heads/${branch}`]), '');
git(['diff', '--check']);
git(['add', '--', ...expectedPaths]);
assert.deepEqual(git(['diff', '--cached', '--name-only']).split(/\r?\n/).sort(), expectedPaths);
git(['diff', '--cached', '--check']);
git(['commit', '-m', 'Bound public Program analyzer descendant existence checks',
  '-m', 'Preserve the two-descendant threshold using Skip(1).Any() instead of traversing the complete syntax tree. Add six green/green diagnostic and code-fix preservation rows in the established test class. The predeclared 38-node private-predicate primary has 83.73% median less time across three closed comparisons; allocation increases by 56 B/op, the full fresh-driver primary has no demonstrated gain and unstable unchanged guards are retained. Narrow workload-dependent draft proposal, not whole-build or IDE throughput.',
  '-m', 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>\nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00']);
const commit = git(['rev-parse', 'HEAD']);
fs.writeFileSync(path.join(run, 'source-commit.txt'), commit + '\n', { flag: 'wx' });
assert.equal(git(['rev-parse', 'HEAD^']), intake.actualBaseline);
assert.deepEqual(git(['diff-tree', '--no-commit-id', '--name-only', '-r', commit]).split(/\r?\n/).sort(), expectedPaths);
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
for (const file of [...inputs.sourceFiles, ...intake.actualProtectedPrimaryInputs]) {
  assert.equal(sha(path.join(root, file.path)), file.sha256);
}
for (const file of reports) assert.equal(sha(path.join(root, file)), reportHashes[file]);
git(['push', 'autoperf', `HEAD:refs/heads/${branch}`]);
assert.equal(api(`repos/jaslawinMs/aspnetcore/git/ref/heads/${branch}`).object.sha, commit);
assert.deepEqual(api(`repos/jaslawinMs/aspnetcore/git/commits/${commit}`).parents.map(item => item.sha), [intake.actualBaseline]);
const bindings = expectedPaths.map(file => {
  const id = git(['rev-parse', `${commit}:${file}`]);
  const object = api(`repos/jaslawinMs/aspnetcore/git/blobs/${id}`);
  assert.equal(object.sha, id);
  assert.equal(object.encoding, 'base64');
  const bytes = Buffer.from(object.content.replace(/\s/g, ''), 'base64');
  assert.equal(crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), id);
  assert.equal(bytes.toString('utf8').replaceAll('\r\n', '\n'),
    fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n'));
  return { path: file, gitBlob: id, actualRemoteBytesVerified: true,
    actualLfCanonicalContentMatchesTestedPhysicalSnapshot: true, actualPhysicalSnapshotSha256: sha(path.join(root, file)) };
});
const result = {
  candidate: 'F124', disposition: 'qualified', subtype: decision.subtype, mergeReady: false,
  repository: 'jaslawinMs/aspnetcore', branch, sourceCommit: commit, parentBaseline: intake.actualBaseline,
  sourceBranchUrl: `https://github.com/jaslawinMs/aspnetcore/tree/${branch}`,
  actualRemoteRefVerified: true, actualOnlySourceFiles: bindings,
  actualNewPerformancePullRequestCreated: false, actualNarrowQualifiedDraftWarranted: true,
  actualMeasuredCandidateBuiltBeforePublicationCommit: true,
  actualPhysicalSnapshotsAndPdbHashesAreHistoricalAuthority: true,
  actualProtectedFilesPreserved: true, actualUnrelatedReportHashesPreserved: reportHashes,
  actualHistoricalTimingRerun: false
};
fs.writeFileSync(path.join(run, 'source-publication.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
