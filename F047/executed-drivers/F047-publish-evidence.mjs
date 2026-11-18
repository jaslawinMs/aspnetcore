import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F047');
const published = path.join(session, 'autoperf-published-results');
const directory = path.join(published, 'F047');
const parent = 'f22854a7d380af7765048f6479b933288210d2d4';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const receipt = path.join(run, 'evidence-publication.json');
assert.equal(fs.existsSync(receipt), false, 'Inspect a previous or partial evidence publication.');
const calls = [];
function execute(executable, args) {
  const result = spawnSync(executable, args, { cwd: published, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  calls.push({ executable, arguments: args, actualExitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(path.join(run, 'evidence-publication-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${executable} ${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
  return result.stdout.trim();
}
const git = args => execute('git', ['-c', 'core.longpaths=true', '--no-pager', ...args]);
const api = endpoint => JSON.parse(execute('gh', ['api', endpoint]));
assert.equal(git(['rev-parse', 'HEAD']), parent);
assert.equal(git(['branch', '--show-current']), 'autoperf-results');
assert.equal(git(['diff', '--name-only']), '');
assert.equal(git(['diff', '--cached', '--name-only']), '');
const remote = new URL(git(['remote', 'get-url', 'origin']));
assert.equal(remote.hostname, 'github.com');
assert.equal(remote.pathname.replace(/\.git$/, '').toLowerCase(), '/jaslawinms/aspnetcore');
assert.equal(api('repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results').object.sha, parent);
const preparation = read(path.join(run, 'capsule-preparation.json'));
assert.equal(preparation.actualSealedCapsuleAuditPassed, true);
assert.equal(preparation.actualBrokenAuthoredArtifactLinks, 0);
const material = read(path.join(directory, 'capsule-file-hashes.json')).files;
for (const item of material) {
  const file = path.join(directory, ...item.path.split('/'));
  assert.equal(fs.statSync(file).size, item.bytes);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase(), item.sha256);
}
const expectedPaths = [...material.map(item => 'F047/' + item.path), 'F047/capsule-file-hashes.json'].sort();
assert.ok(expectedPaths.length > 400);
assert.equal(preparation.actualImmutableFilesIncludingSeal, expectedPaths.length);
git(['add', '--', 'F047']);
assert.deepEqual(git(['diff', '--cached', '--name-only']).split(/\r?\n/).sort(), expectedPaths);
assert.deepEqual(git(['diff', '--cached', '--diff-filter=A', '--name-only']).split(/\r?\n/).sort(), expectedPaths);
const authored = ['README.md', 'validation-commands.md', 'comparison-results.md', 'issue-template.md', '.gitattributes',
  'F047-verify.mjs', 'F047-audit-trx.ps1', 'decision.json'].map(file => 'F047/' + file);
git(['-c', 'core.whitespace=cr-at-eol', 'diff', '--cached', '--check', '--', ...authored]);
const staged = git(['ls-files', '--stage', '--', 'F047']).split(/\r?\n/).map(line => {
  const match = line.match(/^100644 ([a-f0-9]{40}) 0\t(.+)$/);
  assert.ok(match, line);
  const bytes = fs.readFileSync(path.join(published, ...match[2].split('/')));
  const blob = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  assert.equal(match[1], blob, 'Git altered sealed bytes: ' + match[2]);
  return { path: match[2], sha: match[1] };
});
assert.equal(staged.length, expectedPaths.length);
git(['commit', '-m', 'Publish F047 SSR parameter allocation-trade-off evidence',
  '-m', 'Publish the exact eight-file BenchmarkDotNet project, three source comparisons and 384 retained observations, 314 individually parsed passing XML rows, canonical browser producer checks and the independent untimed rebuild. The one-scalar fresh-boundary primary saves 56 B/op in every pair but has no demonstrated latency gain: median paired effect -1.43%, slower in two pairs. Retain the unstable first original baseline and all adverse/control outcomes. No latency-neutrality, application-throughput or merge-ready claim; counters and the fixed report remain unchanged.',
  '-m', 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>\nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00']);
const commit = git(['rev-parse', 'HEAD']);
fs.writeFileSync(path.join(run, 'evidence-commit.txt'), commit + '\n', { flag: 'wx' });
assert.equal(git(['rev-parse', 'HEAD^']), parent);
assert.deepEqual(git(['diff-tree', '--no-commit-id', '--name-only', '-r', commit]).split(/\r?\n/).sort(), expectedPaths);
assert.equal(git(['rev-parse', 'HEAD:REPORT.md']), '73abf142464b1f81676e03a1eebc766c279cb47b');
assert.equal(git(['status', '--porcelain']), '');
git(['push', 'origin', 'HEAD:refs/heads/autoperf-results']);
assert.equal(api('repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results').object.sha, commit);
const remoteCommit = api('repos/jaslawinMs/aspnetcore/git/commits/' + commit);
assert.deepEqual(remoteCommit.parents.map(item => item.sha), [parent]);
const rootTree = api('repos/jaslawinMs/aspnetcore/git/trees/' + remoteCommit.tree.sha);
assert.equal(rootTree.truncated, false);
const subtree = rootTree.tree.find(item => item.path === 'F047');
assert.equal(subtree.type, 'tree');
const remoteTree = api('repos/jaslawinMs/aspnetcore/git/trees/' + subtree.sha + '?recursive=1');
assert.equal(remoteTree.truncated, false);
const blobs = remoteTree.tree.filter(item => item.type === 'blob');
assert.equal(blobs.length, expectedPaths.length);
for (const item of staged) {
  const remoteBlob = blobs.find(blob => 'F047/' + blob.path === item.path);
  assert.ok(remoteBlob);
  assert.equal(remoteBlob.sha, item.sha);
}
const result = {
  candidate: 'F047', disposition: 'qualified', subtype: 'allocation-only-ssr-parameter-trade-off',
  repository: 'jaslawinMs/aspnetcore', branch: 'autoperf-results', evidenceCommit: commit,
  parentEvidenceIndexCommit: parent,
  evidenceUrl: `https://github.com/jaslawinMs/aspnetcore/blob/${commit}/F047/README.md`,
  actualImmutableFiles: expectedPaths.length, actualRemoteImmutableBlobIdsVerified: blobs.length,
  actualSealedBytesEqualStagedBlobs: true,
  actualCopiedAuthoritativeFiles: preparation.actualCopiedAuthoritativeFiles,
  actualOmittedCompiledRestoreFiles: preparation.actualOmittedCompiledRestoreFiles,
  actualAuthoredWhitespaceCheckPassed: true, actualPublishedReportPreserved: true,
  actualCounterAdvanced: false, actualNewPerformancePullRequestCreated: false,
  actualHistoricalTimingRerun: false, actualLatePublicationReceiptNotYetCreated: true
};
fs.writeFileSync(receipt, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
