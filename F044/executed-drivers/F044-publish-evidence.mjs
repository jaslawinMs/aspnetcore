import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F044');
const published = path.join(session, 'autoperf-published-results');
const directory = path.join(published, 'F044');
const parent = '361851fa709b82a82e8f231c405beecd0265210f';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const receipt = path.join(run, 'evidence-publication.json');
assert.equal(fs.existsSync(receipt), false, 'Inspect any previous or partial evidence publication.');
const calls = [];
function execute(executable, args) {
  const result = spawnSync(executable, args, { cwd: published, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  calls.push({ executable, arguments: args, actualExitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(path.join(run, 'evidence-publication-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${executable} ${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
  return result.stdout.trim();
}
const git = args => execute('git', ['-c', 'core.longpaths=true', ...args]);
const api = endpoint => JSON.parse(execute('gh', ['api', endpoint]));
assert.equal(git(['rev-parse', 'HEAD']), parent);
assert.equal(git(['branch', '--show-current']), 'autoperf-results');
assert.equal(git(['diff', '--name-only']), '');
assert.equal(git(['diff', '--cached', '--name-only']), '');
const origin = new URL(git(['remote', 'get-url', 'origin']));
assert.equal(origin.hostname, 'github.com');
assert.equal(origin.pathname.replace(/\.git$/, '').toLowerCase(), '/jaslawinms/aspnetcore');
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
const expectedPaths = [...material.map(item => 'F044/' + item.path), 'F044/capsule-file-hashes.json'].sort();
assert.ok(expectedPaths.length > 500);
assert.equal(preparation.actualImmutableFilesIncludingSeal, expectedPaths.length);
git(['add', '--', 'F044']);
assert.deepEqual(git(['diff', '--cached', '--name-only']).split(/\r?\n/).sort(), expectedPaths);
assert.deepEqual(git(['diff', '--cached', '--diff-filter=A', '--name-only']).split(/\r?\n/).sort(), expectedPaths);
const authored = ['README.md', 'validation-commands.md', 'comparison-results.md', 'issue-template.md',
  '.gitattributes', 'F044-verify.mjs', 'F044-audit-trx.ps1', 'decision.json'].map(file => 'F044/' + file);
git(['-c', 'core.whitespace=cr-at-eol', 'diff', '--cached', '--check', '--', ...authored]);
const staged = git(['ls-files', '--stage', '--', 'F044']).split(/\r?\n/).map(line => {
  const match = line.match(/^100644 ([a-f0-9]{40}) 0\t(.+)$/);
  assert.ok(match, line);
  const bytes = fs.readFileSync(path.join(published, ...match[2].split('/')));
  const blob = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  assert.equal(match[1], blob, 'Git changed sealed bytes: ' + match[2]);
  return { path: match[2], sha: match[1] };
});
assert.equal(staged.length, expectedPaths.length);
git(['commit', '-m', 'Publish qualified F044 custom-base section registration evidence',
  '-m', 'Publish the exact13-file Razor SDK/BenchmarkDotNet project, all three source comparisons and576retained observations, both59-row TRX inventories, actual current-default managed validation and independent rebuild. The explicitly custom-base primary uses10.22% median less time at unchanged704 B/op. Retain all one-section/full-view regressions and shared-machine uncertainty. No normal RazorPage, application-throughput or allocation-saving claim; counters and the fixed classified report remain unchanged.',
  '-m', 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>\nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00']);
const commit = git(['rev-parse', 'HEAD']);
fs.writeFileSync(path.join(run, 'evidence-commit.txt'), commit + '\n', { flag: 'wx' });
assert.equal(git(['rev-parse', 'HEAD^']), parent);
assert.deepEqual(git(['diff-tree', '--no-commit-id', '--name-only', '-r', commit]).split(/\r?\n/).sort(), expectedPaths);
assert.equal(git(['rev-parse', 'HEAD:REPORT.md']), '73abf142464b1f81676e03a1eebc766c279cb47b');
assert.equal(git(['status', '--porcelain']), '');
git(['push', 'origin', 'HEAD:refs/heads/autoperf-results']);
assert.equal(api('repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results').object.sha, commit);
const commitObject = api('repos/jaslawinMs/aspnetcore/git/commits/' + commit);
assert.deepEqual(commitObject.parents.map(item => item.sha), [parent]);
const rootTree = api('repos/jaslawinMs/aspnetcore/git/trees/' + commitObject.tree.sha);
assert.equal(rootTree.truncated, false);
const subtree = rootTree.tree.find(item => item.path === 'F044');
assert.equal(subtree.type, 'tree');
const remote = api('repos/jaslawinMs/aspnetcore/git/trees/' + subtree.sha + '?recursive=1');
assert.equal(remote.truncated, false);
const blobs = remote.tree.filter(item => item.type === 'blob');
assert.equal(blobs.length, expectedPaths.length);
for (const entry of staged) {
  const found = blobs.find(item => 'F044/' + item.path === entry.path);
  assert.ok(found, entry.path);
  assert.equal(found.sha, entry.sha, entry.path);
}
const result = {
  candidate: 'F044', disposition: 'qualified', subtype: 'workload-dependent-custom-base-local-gain',
  repository: 'jaslawinMs/aspnetcore', branch: 'autoperf-results', evidenceCommit: commit,
  parentEvidenceIndexCommit: parent,
  evidenceUrl: `https://github.com/jaslawinMs/aspnetcore/blob/${commit}/F044/README.md`,
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
