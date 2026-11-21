import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitId, sha256, verifyMembership } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const root = import.meta.dirname, parallel = path.dirname(root), session = path.dirname(parallel);
const repo = String.raw`C:\src\aspnetcore`, published = path.join(session, 'autoperf-published-results');
const capsule = path.join(published, 'F222-F223-F224'), commands = [];
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
function write(file, raw)
{
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
const json = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
function git(directory, label, args)
{
    assert.ok(commands.length < 6);
    const policyBytes = fs.readFileSync(path.join(parallel, 'policy.json')), policy = JSON.parse(policyBytes);
    assert.deepEqual(Object.keys(policy.independentFindingPreparationWorkers).sort(), ['F209', 'F231', 'F234', 'F239']);
    assert.equal(policy.actualWorkerBuildHoldActive, false);
    assert.equal(policy.buildAndTestWorkQuiesced, false);
    assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
    const argv = ['--no-pager', '-C', directory, ...args], startedUtc = new Date().toISOString();
    const result = spawnSync('git', argv, { cwd: directory, timeout: 90000, windowsHide: true,
        maxBuffer: 8 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: '', GIT_TERMINAL_PROMPT: '0' } });
    const prefix = 'commands/' + String(commands.length + 1).padStart(3, '0') + '-' + label;
    write(path.join(root, prefix + '.stdout'), result.stdout ?? Buffer.alloc(0));
    write(path.join(root, prefix + '.stderr'), result.stderr ?? Buffer.alloc(0));
    const record = { executable: 'git', argv, cwd: directory, pid: result.pid, startedUtc,
        endedUtc: new Date().toISOString(), exitCode: result.status, error: result.error?.message ?? null,
        policySha256: sha256(policyBytes), rootWaited: result.status !== null && !result.error,
        bothRawStreamsReturned: !result.error, universalDescendantCensusNotClaimed: true,
        stdout: prefix + '.stdout', stderr: prefix + '.stderr' };
    commands.push(record);
    json(path.join(root, prefix + '.json'), record);
    assert.ifError(result.error);
    assert.equal(result.status, 0);
    return result.stdout.toString('utf8');
}
const before = { head: git(repo, 'reserved-head-before', ['rev-parse', 'HEAD']),
    status: git(repo, 'reserved-status-before', ['status', '--porcelain', '--untracked-files=normal']),
    globalSha256: sha256(fs.readFileSync(path.join(repo, 'global.json'))) };
assert.equal(before.head.trim(), '24875ef5dabb55567870b39f6eb0002170435e2f');
assert.equal(before.globalSha256, 'C3D6E7C29D94C34B6343D4A2EFE74164929F29BFA26FD84B5E2020A15091CD53');
assert.equal(git(published, 'publication-parent', ['rev-parse', 'HEAD']).trim(), 'b7aa4b83c609a8bcce50967ce59c9b296c10abce');
assert.equal(git(published, 'publication-status', ['status', '--porcelain', '--untracked-files=normal']).trim(), '?? F222-F223-F224/');
const prior273 = path.join(parallel, 'finding-F222-F223-F224-273');
const prior274 = path.join(parallel, 'finding-F222-F223-F224-274');
const membership = read(path.join(prior273, 'source-membership.json'));
assert.deepEqual(verifyMembership(prior273, membership), { objects: 63, memberships: 46 });
for (const item of membership.sources)
{
    const raw = fs.readFileSync(path.join(prior273, item.artifact));
    assert.equal(raw.length, item.bytes);
    assert.equal(sha256(raw), item.sha256);
    assert.equal(gitId('blob', raw), item.blob);
}
assert.equal(read(path.join(prior273, 'actual-collection-tool-273.json')).actualReturnedExitCode, 0);
assert.equal(read(path.join(prior274, 'actual-assertion-tool-274.json')).actualReturnedExitCode, 0);
function copyTree(from, to)
{
    for (const entry of fs.readdirSync(from, { withFileTypes: true }))
    {
        assert.equal(entry.isSymbolicLink(), false);
        const input = path.join(from, entry.name), output = path.join(to, entry.name);
        if (entry.isDirectory()) copyTree(input, output);
        else
        {
            const raw = fs.readFileSync(input);
            write(output, raw);
            assert.ok(fs.readFileSync(output).equals(raw));
        }
    }
}
copyTree(prior273, path.join(capsule, 'evidence', 'source273'));
copyTree(prior274, path.join(capsule, 'evidence', 'source274'));
for (const item of membership.objects) write(path.join(capsule, item.file), fs.readFileSync(path.join(prior273, item.file)));
json(path.join(capsule, 'source-membership.json'), { ...membership,
    sources: membership.sources.map(x => ({ ...x, artifact: 'evidence/source273/' + x.artifact })) });
const external = [];
for (const [directory, prefix] of [[prior273, 'source273'], [prior274, 'source274']])
    for (const item of read(path.join(directory, 'external-source.json')))
    {
        const raw = fs.readFileSync(path.join(directory, item.artifact));
        assert.equal(raw.length, item.bytes);
        assert.equal(sha256(raw), item.sha256);
        assert.equal(gitId('blob', raw), item.blob);
        external.push({ ...item, artifact: 'evidence/' + prefix + '/' + item.artifact });
    }
json(path.join(capsule, 'external-source.json'), external);
write(path.join(capsule, 'source-objects.mjs'),
    fs.readFileSync(path.join(published, 'F150-F206-F215-F220', 'source-objects.mjs')));
const roleEquality = membership.sources.filter(x => x.role === 'Original').map(item =>
{
    const current = membership.sources.find(x => x.role === 'Default' && x.finding === item.finding && x.path === item.path);
    assert.ok(current);
    return { finding: item.finding, path: item.path, exactOriginalDefaultBlobEqual: item.blob === current.blob,
        OriginalBlob: item.blob, DefaultBlob: current.blob };
});
const after = { head: git(repo, 'reserved-head-after', ['rev-parse', 'HEAD']),
    status: git(repo, 'reserved-status-after', ['status', '--porcelain', '--untracked-files=normal']),
    globalSha256: sha256(fs.readFileSync(path.join(repo, 'global.json'))) };
assert.deepEqual(before, after);
json(path.join(root, 'COMMANDS.json'), commands);
json(path.join(root, 'ARCHIVE.json'), { observedUtc: new Date().toISOString(), before, after, reservedStateUnchanged: true,
    rawMemberships: 46, rawGitObjects: 63, externalWholeFingerprints: external.length, roleEquality,
    priorCollectorsNotEditedOrReplayed: true, source273GitGhRoots: 22, source274GhRoots: 3,
    packagingGitMetadataRoots: commands.length, aggregateSourceAndPackagingGitGhRoots: 31,
    externalRawGitGraphOrSelectedBinaryQualified: false, productNativeTestsCandidatesOrComparisons: 0,
    actualEnclosingToolExitNotSelfAttested: true });
copyTree(root, path.join(capsule, 'evidence', 'parent275'));
function inventory(directory, prefix = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const relative = prefix ? prefix + '/' + entry.name : entry.name;
        return entry.isDirectory() ? inventory(path.join(directory, entry.name), relative) : [relative];
    });
}
const files = inventory(path.join(capsule, 'evidence'), 'evidence').map(file =>
{
    const raw = fs.readFileSync(path.join(capsule, file));
    return { file, bytes: raw.length, sha256: sha256(raw) };
});
json(path.join(capsule, 'evidence-index.json'), { files, completeCopyOf273274AndParent275: true,
    sourceAndRawBytesNotNormalized: true, sourceOnly: true });
console.log(JSON.stringify({ rawMemberships: 46, rawGitObjects: 63, externalWholeFingerprints: external.length,
    copiedEvidenceFiles: files.length, sourceAndPackagingGitGhRoots: 31,
    exactOriginalDefaultSourcePairs: roleEquality.filter(x => x.exactOriginalDefaultBlobEqual).length,
    productNativeTestsCandidatesOrComparisons: 0, awaitingActualEnclosingCompletionAndPortableAudit: true }));
