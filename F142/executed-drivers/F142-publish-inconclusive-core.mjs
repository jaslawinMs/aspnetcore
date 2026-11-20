import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F142');
const published = path.join(session, 'autoperf-published-results');
const directory = path.join(published, 'F142');
const parent = '5cef668754f82c5d9d2e7d5ea0f394ff4b62a793';
const report = '73abf142464b1f81676e03a1eebc766c279cb47b';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const calls = [];
function execute(command, args)
{
    const result = spawnSync(command, args, { cwd: published, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
    assert.ifError(result.error);
    calls.push({ command, arguments: args, actualExitCode: result.status, stdout: result.stdout, stderr: result.stderr });
    fs.writeFileSync(path.join(run, 'evidence-publication-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
    assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
    return result.stdout.trim();
}
const git = args => execute('git', ['-c', 'core.longpaths=true', '--no-pager', ...args]);
const api = endpoint => JSON.parse(execute('gh', ['api', endpoint]));
assert.equal(fs.existsSync(path.join(run, 'evidence-publication.json')), false);
assert.equal(git(['rev-parse', 'HEAD']), parent);
assert.equal(git(['branch', '--show-current']), 'autoperf-results');
assert.equal(git(['diff', '--name-only']), '');
assert.equal(git(['diff', '--cached', '--name-only']), '');
assert.equal(git(['status', '--porcelain', '--untracked-files=normal']), '?? F142/');
assert.match(git(['remote', 'get-url', 'origin']), /^https:\/\/github\.com\/jaslawinMs\/aspnetcore(?:\.git)?$/i);
assert.equal(git(['rev-parse', 'HEAD:REPORT.md']), report);
const qualification = read(path.join(directory, 'final-qualification.json'));
assert.equal(qualification.actualFinalPerformanceQualification, false);
assert.equal(qualification.actualNoPerformancePrAuthorized, true);
assert.equal(hash(path.join(run, 'diagnostic-budget.json')), qualification.actualClosedBudgetPreservedSha256);
for (const item of read(path.join(directory, 'authoritative-copies.json')))
{
    assert.equal(hash(path.join(directory, item.file)), item.sha256);
}
const audit = JSON.parse(execute('node', [path.join(directory, 'F142-verify.mjs'), directory]));
write(path.join(directory, 'historical-audit.json'), audit);
fs.copyFileSync(path.join(session, 'F142-publish-inconclusive-core.mjs'), path.join(directory, 'executed-drivers', 'F142-publish-inconclusive-core.mjs'), fs.constants.COPYFILE_EXCL);
function inventory(current, relative = '')
{
    return fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const file = path.join(current, entry.name), logical = path.join(relative, entry.name);
        return entry.isDirectory() ? inventory(file, logical) : [{ file: logical.replaceAll('\\', '/'), bytes: fs.statSync(file).size, sha256: hash(file) }];
    });
}
const material = inventory(directory);
assert.equal(material.some(item => item.file === 'capsule-file-hashes.json' || item.file === 'publication.json'), false);
write(path.join(directory, 'capsule-file-hashes.json'), { recordedAt: new Date().toISOString(), actualImmutableCoreFilesExcludingSeal: material.length, files: material });
execute('node', [path.join(directory, 'F142-verify.mjs'), directory, '--require-seal']);
for (const file of ['README.md', 'validation-commands.md'])
{
    for (const match of fs.readFileSync(path.join(directory, file), 'utf8').matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g))
    {
        if (!/^(https?:|mailto:)/.test(match[1])) { assert.ok(fs.existsSync(path.resolve(directory, match[1])), match[1]); }
    }
}
const expectedPaths = [...material.map(item => 'F142/' + item.file), 'F142/capsule-file-hashes.json'].sort();
git(['add', '--', 'F142']);
assert.deepEqual(git(['diff', '--cached', '--name-only']).split(/\r?\n/).sort(), expectedPaths);
git(['-c', 'core.whitespace=cr-at-eol', 'diff', '--cached', '--check', '--', ...['README.md', 'validation-commands.md', 'F142-verify.mjs', 'F142-audit-trx.ps1'].map(file => 'F142/' + file)]);
const staged = git(['ls-files', '--stage', '--', 'F142']).split(/\r?\n/).map(line =>
{
    const match = line.match(/^100644 ([a-f0-9]{40}) 0\t(.+)$/);
    assert.ok(match, line);
    const bytes = fs.readFileSync(path.join(published, match[2]));
    assert.equal(crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), match[1]);
    return { file: match[2], sha: match[1] };
});
assert.equal(api('repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results').object.sha, parent);
assert.equal(api('repos/jaslawinMs/aspnetcore/git/ref/heads/' + qualification.actualSourceBranchIsExploratoryOnly).object.sha, qualification.actualSourceRevision);
git(['commit', '-m', 'Publish inconclusive F142 parameter-array study with identity failure',
    '-m', 'Retain all630 raw observations,42 serialized native measurement children, full seven-profile producer and existing25-test original/candidate results,17 expected golden-only failures and exact common-project untimed reconstruction. Numerical168B/op allocation difference passes its arithmetic gate but the frozen common measurement DLL/PDB identity requirement fails: the pre-timing fixture-prefix exclusion was too broad. Preserve the premature numerical decision and accepted-images record without rewriting history; final qualification is measurement-identity-inconclusive, no performance PR, no retiming or source tuning. Three authorizations permanently closed. Campaign counters and fixed classified report unchanged until verified issue/index publication.',
    '-m', 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>\nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00']);
const commit = git(['rev-parse', 'HEAD']);
fs.writeFileSync(path.join(run, 'evidence-commit.txt'), commit + '\n', { flag: 'wx' });
assert.equal(git(['rev-parse', 'HEAD^']), parent);
assert.equal(git(['rev-parse', 'HEAD:REPORT.md']), report);
assert.equal(git(['status', '--porcelain']), '');
git(['push', 'origin', 'HEAD:refs/heads/autoperf-results']);
assert.equal(api('repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results').object.sha, commit);
const remoteCommit = api('repos/jaslawinMs/aspnetcore/git/commits/' + commit);
const rootTree = api('repos/jaslawinMs/aspnetcore/git/trees/' + remoteCommit.tree.sha);
assert.equal(rootTree.truncated, false);
assert.equal(rootTree.tree.find(item => item.path === 'REPORT.md').sha, report);
const subtree = rootTree.tree.find(item => item.path === 'F142');
assert.equal(subtree.type, 'tree');
const remote = api('repos/jaslawinMs/aspnetcore/git/trees/' + subtree.sha + '?recursive=1');
assert.equal(remote.truncated, false);
const blobs = remote.tree.filter(item => item.type === 'blob');
assert.equal(blobs.length, expectedPaths.length);
for (const item of staged) { assert.equal(blobs.find(blob => 'F142/' + blob.path === item.file)?.sha, item.sha); }
const receipt = { candidate: 'F142', disposition: 'no-gain', subtype: 'measurement-identity-inconclusive',
    actualPerformanceQualification: false, actualNoPerformancePrAuthorized: true, evidenceCommit: commit,
    parentEvidenceIndexCommit: parent, actualImmutableFiles: expectedPaths.length,
    actualRemoteImmutableBlobIdsVerified: blobs.length, actualSealedBytesEqualStagedBlobs: true,
    actualCopiedAuthoritativeFiles: read(path.join(directory, 'authoritative-copies.json')).length,
    actualHashedOmittedFiles: read(path.join(directory, 'omitted-file-hashes.json')).files.length,
    actualReportBlobUnchanged: report, actualCountersNotYetAdvanced: true, actualNoAdditionalMeasurements: true };
write(path.join(run, 'evidence-publication.json'), receipt);
console.log(JSON.stringify(receipt, null, 2));
