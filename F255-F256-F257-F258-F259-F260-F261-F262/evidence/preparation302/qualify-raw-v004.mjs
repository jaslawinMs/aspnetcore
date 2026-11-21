import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root, parallel, read, write, json, git } from './source-io-v001.mjs';
import { sha256, gitId, treeEntries, verifyMembership } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const captures = ['whole-inputs-v001.json', 'whole-inputs-v002.json', 'whole-inputs-v003.json']
    .flatMap(file => read(path.join(root, file)).captures);
assert.equal(captures.length, 36);
assert.equal(new Set(captures.map(x => x.role + '/' + x.path)).size, 36);
const objects = new Map(), sources = [];
function save(type, sha, raw)
{
    assert.equal(gitId(type, raw), sha);
    if (objects.has(sha))
    {
        assert.equal(objects.get(sha).type, type);
        assert.ok(objects.get(sha).raw.equals(raw));
        return;
    }
    const file = 'raw-git/objects/' + sha + '.payload';
    write(file, raw);
    objects.set(sha, { type, sha, file, bytes: raw.length, sha256: sha256(raw), raw });
}
for (const item of captures)
{
    const artifact = fs.readFileSync(path.join(root, item.artifact));
    assert.equal(artifact.length, item.bytes);
    assert.equal(sha256(artifact), item.sha256);
    const frames = fs.readdirSync(path.join(root, 'commands')).filter(x => x.endsWith('-' + item.rawBatchLabel + '.stdout'));
    assert.equal(frames.length, 1);
    const stream = fs.readFileSync(path.join(root, 'commands', frames[0]));
    const header = stream.subarray(item.frameHeaderOffset, item.frameBodyOffset - 1).toString('ascii');
    assert.equal(header, item.oid + ' blob ' + item.bytes);
    assert.ok(artifact.equals(stream.subarray(item.frameBodyOffset, item.frameBodyOffset + item.bytes)));
    assert.equal(stream[item.frameEndExclusive - 1], 10);
    save('blob', item.oid, artifact);
    sources.push({ finding: 'F260-F261-F262', role: item.role, commit: item.commit, path: item.path,
        mode: item.mode, blob: item.oid, artifact: item.artifact, bytes: item.bytes, sha256: item.sha256 });
}
function parse(raw, expected)
{
    let offset = 0;
    for (const item of expected)
    {
        const end = raw.indexOf(10, offset);
        assert.ok(end >= offset);
        const header = raw.subarray(offset, end).toString('ascii').match(/^([a-f0-9]{40}) (commit|tree) (\d+)$/);
        assert.ok(header);
        assert.equal(header[1], item.sha);
        assert.equal(header[2], item.type);
        const bytes = Number(header[3]), start = end + 1;
        assert.equal(raw[start + bytes], 10);
        save(item.type, item.sha, raw.subarray(start, start + bytes));
        offset = start + bytes + 1;
    }
    assert.equal(offset, raw.length);
}
const roles = read(path.join(root, 'roles.json')).roles;
const commits = [...new Set(Object.values(roles))].map(sha => ({ sha, type: 'commit' }));
parse(git('raw-role-commits', ['cat-file', '--batch'], Buffer.from(commits.map(x => x.sha).join('\n') + '\n')), commits);
const previous = path.join(parallel, 'source-qualification-297'), prior = read(path.join(previous, 'source-membership.json'));
verifyMembership(previous, prior);
const reusable = new Map(prior.objects.map(x => [x.sha, x]));
function trees(hashes)
{
    const missing = [];
    for (const sha of new Set(hashes))
    {
        if (objects.has(sha)) { assert.equal(objects.get(sha).type, 'tree'); continue; }
        const old = reusable.get(sha);
        if (old)
        {
            assert.equal(old.type, 'tree');
            const raw = fs.readFileSync(path.join(previous, old.file));
            assert.equal(raw.length, old.bytes);
            assert.equal(sha256(raw), old.sha256);
            save('tree', sha, raw);
        }
        else missing.push(sha);
    }
    if (missing.length)
        parse(git('raw-tree-batch-' + objects.size, ['cat-file', '--batch'], Buffer.from(missing.join('\n') + '\n')),
            missing.map(sha => ({ sha, type: 'tree' })));
}
const walkers = sources.map(item => ({ item, parts: item.path.split('/'), position: 0,
    current: objects.get(item.commit).raw.toString('utf8').match(/^tree ([a-f0-9]{40})$/m)[1] }));
while (walkers.some(x => x.position < x.parts.length))
{
    const active = walkers.filter(x => x.position < x.parts.length);
    trees(active.map(x => x.current));
    for (const state of active)
    {
        const entry = treeEntries(objects.get(state.current).raw).get(state.parts[state.position]), last = state.position === state.parts.length - 1;
        assert.ok(entry, state.item.path);
        if (last)
        {
            assert.equal(entry.mode, state.item.mode);
            assert.equal(entry.sha, state.item.blob);
        }
        else assert.equal(entry.mode, '40000');
        state.current = entry.sha;
        state.position++;
    }
}
const membership = { sources, objects: [...objects.values()].map(({ raw, ...item }) => item) };
json('source-membership.json', membership);
const verification = verifyMembership(root, membership);
const pairs = sources.filter(x => x.role === 'Original').map(item =>
{
    const other = sources.find(x => x.role === 'Default' && x.path === item.path);
    assert.ok(other);
    return { path: item.path, exactWholeBlobEqual: item.blob === other.blob && item.mode === other.mode };
});
const after = {
    branch: git('reserved-branch-after', ['symbolic-ref', '--short', 'HEAD']).toString('utf8').trim(),
    head: git('reserved-head-after', ['rev-parse', 'HEAD']).toString('utf8').trim(),
    status: git('reserved-status-after', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
    globalSha256: sha256(fs.readFileSync(String.raw`C:\src\aspnetcore\global.json`))
};
assert.deepEqual(after, read(path.join(root, 'reserved-before.json')));
const count = fs.readdirSync(path.join(root, 'commands')).filter(x => x.endsWith('.receipt.json')).length;
json('RAW-QUALIFICATION.json', { observedUtc: new Date().toISOString(), verification, pairs,
    wholeArtifactsSeparatelyRehashed: 36, framedWholeInputsRechecked: 36, repositoryBodiesPerRole: 18,
    logicalSourceBodyBudgetClosed: true, directGitGhRoots: count, maximumDirectRoots: 32,
    reservedBeforeAfterUnchanged: true, after, noProductTestsCandidatesOrMeasurements: true,
    sourceIdentityNotRuntimeOrMaterialityQualification: true, actualEnclosingToolCompletionNotSelfAttested: true });
console.log(JSON.stringify({ verification, wholeArtifactsRehashed: 36,
    exactRolePairs: pairs.filter(x => x.exactWholeBlobEqual).length, totalRolePairs: 18,
    directGitGhRoots: count, reservedUnchanged: true, productTestsCandidatesComparisons: 0 }));
