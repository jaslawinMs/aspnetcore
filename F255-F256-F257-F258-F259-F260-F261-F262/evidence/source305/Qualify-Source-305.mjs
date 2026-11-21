import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256, gitId, treeEntries, verifyMembership } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const root = import.meta.dirname, parallel = path.dirname(root), repo = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
function write(file, raw)
{
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, raw, { flag: 'wx' });
}
const json = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
const commands = [];
function git(label, argv, input)
{
    assert.ok(commands.length < 32);
    const bytes = fs.readFileSync(path.join(parallel, 'policy.json')), policy = JSON.parse(bytes);
    assert.equal(policy.actualWorkerBuildHoldActive, false);
    assert.equal(policy.buildAndTestWorkQuiesced, false);
    assert.ok(Object.keys(policy.independentFindingPreparationWorkers).length <= 4);
    assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
    const campaign = read(path.join(path.dirname(parallel), 'autoperf-campaign.json'));
    for (const id of ['F255', 'F256', 'F257', 'F258', 'F259'])
        assert.equal(campaign.candidates.find(x => x.id === id).status, 'pending');
    const prefix = 'commands/' + String(commands.length + 1).padStart(3, '0') + '-' + label;
    const args = ['--no-pager', '-C', repo, ...argv], startedUtc = new Date().toISOString();
    json(prefix + '.request.json', { executable: 'git', argv: args, cwd: repo,
        policySha256: sha256(bytes), inputBytes: input?.length ?? 0 });
    if (input) write(prefix + '.stdin', input);
    const result = spawnSync('git', args, { cwd: repo, input, windowsHide: true, timeout: 90000,
        maxBuffer: 64 * 1024 * 1024, env: { ...process.env, GIT_PAGER: '', GIT_OPTIONAL_LOCKS: '0',
            GIT_TERMINAL_PROMPT: '0' } });
    write(prefix + '.stdout', result.stdout ?? Buffer.alloc(0));
    write(prefix + '.stderr', result.stderr ?? Buffer.alloc(0));
    const receipt = { label, argv: args, startedUtc, returnedUtc: new Date().toISOString(), pid: result.pid,
        actualRootExitCode: result.status, error: result.error?.message ?? null,
        rootWaitAndReturnedPipesOnly: true, universalOrCreationBoundDescendantCensusClaimed: false };
    commands.push(receipt);
    json(prefix + '.receipt.json', receipt);
    assert.ifError(result.error);
    assert.equal(result.status, 0);
    return result.stdout;
}
function reserved(suffix)
{
    return { branch: git('reserved-branch-' + suffix, ['symbolic-ref', '--short', 'HEAD']).toString('utf8').trim(),
        head: git('reserved-head-' + suffix, ['rev-parse', 'HEAD']).toString('utf8').trim(),
        status: git('reserved-status-' + suffix, ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
        globalSha256: sha256(fs.readFileSync(path.join(repo, 'global.json'))) };
}
const before = reserved('before');
assert.deepEqual(before, read(path.join(parallel, 'finding-F260-F261-F262-302', 'reserved-before.json')));
json('reserved-before.json', before);
const original = '37e809ead5824bc753a1c3d56f11615bdb1296c5', defaultCommit = 'd3483989953ae3cccd773aea5ea04cb0c7198531';
const selected = [];
function add(group, packet, item, sourcePath)
{
    assert.ok(['Original', 'Default'].includes(item.role));
    assert.equal(item.commit, item.role === 'Original' ? original : defaultCommit);
    assert.ok(['100644', '100755'].includes(item.mode));
    assert.match(item.blob, /^[a-f0-9]{40}$/);
    selected.push({ ...item, group, packet, sourcePath });
}
const templates = 'finding-F255-F256-293';
for (const item of read(path.join(parallel, templates, 'source-input-inventory-019.json')))
{
    const match = item.commitPath.match(/^([a-f0-9]{40}):(.+)$/);
    assert.ok(match);
    assert.ok(['Original', 'ObservedDefault'].includes(item.role));
    add('F255-F256', templates, { role: item.role === 'Original' ? 'Original' : 'Default',
        commit: match[1], path: match[2], mode: item.mode, blob: item.blob,
        bytes: item.bytes, sha256: item.sha256.toUpperCase() }, item.sourceFile);
}
const transport = 'finding-F257-298', state = read(path.join(parallel, transport, 'STATE.json'));
for (const role of ['Original', 'Default'])
    for (const item of state.bodies[role])
        add('F257', transport, { role, commit: item.commit, path: item.path, mode: item.mode,
            blob: item.blob, bytes: item.bytes, sha256: item.sha256.toUpperCase() }, item.file);
const headers = 'finding-F258-F259-299';
for (const role of ['Original', 'Default'])
    for (const number of ['01', '02', '03'])
        for (const item of read(path.join(parallel, headers, 'bodies-' + role + '-selection-' + number + '.json')).entries)
            add('F258-F259', headers, { role, commit: item.commit, path: item.path, mode: item.mode,
                blob: item.blob, bytes: item.bytes, sha256: item.sha256.toUpperCase() }, item.file);
assert.equal(selected.length, 90);
assert.equal(new Set(selected.map(x => x.group + '/' + x.role + '/' + x.path)).size, 90);
for (const group of ['F255-F256', 'F257', 'F258-F259'])
    for (const role of ['Original', 'Default'])
        assert.equal(selected.filter(x => x.group === group && x.role === role).length, 15);
json('selected-existing-inputs-before-fresh-bodies.json', { selected, newLogicalRepositoryPaths: 0 });
const objects = new Map(), reusable = new Map(), sources = [];
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
for (const directory of ['source-qualification-297', 'finding-F260-F261-F262-302'])
{
    const priorRoot = path.join(parallel, directory), prior = read(path.join(priorRoot, 'source-membership.json'));
    verifyMembership(priorRoot, prior);
    for (const item of prior.objects) reusable.set(item.sha, { ...item, root: priorRoot });
}
function parse(raw, expected, visit)
{
    let offset = 0;
    for (const item of expected)
    {
        const end = raw.indexOf(10, offset);
        assert.ok(end >= offset);
        const header = raw.subarray(offset, end).toString('ascii').match(/^([a-f0-9]{40}) (commit|tree|blob) (\d+)$/);
        assert.ok(header);
        assert.equal(header[1], item.sha);
        assert.equal(header[2], item.type);
        const start = end + 1, bytes = Number(header[3]), body = raw.subarray(start, start + bytes);
        assert.equal(raw[start + bytes], 10);
        save(item.type, item.sha, body);
        visit?.(item, body);
        offset = start + bytes + 1;
    }
    assert.equal(offset, raw.length);
}
const commits = [original, defaultCommit].map(sha => ({ sha, type: 'commit' }));
parse(git('fresh-role-commits', ['cat-file', '--batch'], Buffer.from(commits.map(x => x.sha).join('\n') + '\n')), commits);
const rawBodies = git('fresh-selected-whole-bodies', ['cat-file', '--batch'],
    Buffer.from(selected.map(x => x.commit + ':' + x.path).join('\n') + '\n'));
parse(rawBodies, selected.map(x => ({ ...x, sha: x.blob, type: 'blob' })), (item, raw) =>
{
    const ownerRaw = fs.readFileSync(path.join(parallel, item.packet, item.sourcePath));
    assert.equal(raw.length, item.bytes);
    assert.equal(sha256(raw), item.sha256);
    assert.ok(ownerRaw.equals(raw));
    const artifact = 'source/' + item.group + '/' + item.role + '/' + item.path;
    write(artifact, raw);
    sources.push({ finding: item.group, role: item.role, commit: item.commit, path: item.path,
        mode: item.mode, blob: item.blob, artifact, bytes: item.bytes, sha256: item.sha256 });
});
function trees(shas)
{
    const missing = [];
    for (const sha of new Set(shas))
    {
        if (objects.has(sha)) { assert.equal(objects.get(sha).type, 'tree'); continue; }
        const old = reusable.get(sha);
        if (old)
        {
            assert.equal(old.type, 'tree');
            const raw = fs.readFileSync(path.join(old.root, old.file));
            assert.equal(raw.length, old.bytes);
            assert.equal(sha256(raw), old.sha256);
            save('tree', sha, raw);
        }
        else missing.push(sha);
    }
    if (missing.length)
        parse(git('fresh-tree-batch-' + commands.length, ['cat-file', '--batch'],
            Buffer.from(missing.join('\n') + '\n')), missing.map(sha => ({ sha, type: 'tree' })));
}
const walkers = sources.map(item => ({ item, parts: item.path.split('/'), position: 0,
    current: objects.get(item.commit).raw.toString('utf8').match(/^tree ([a-f0-9]{40})$/m)[1] }));
while (walkers.some(x => x.position < x.parts.length))
{
    const active = walkers.filter(x => x.position < x.parts.length);
    trees(active.map(x => x.current));
    for (const state of active)
    {
        const entry = treeEntries(objects.get(state.current).raw).get(state.parts[state.position]);
        assert.ok(entry, state.item.path);
        const last = state.position === state.parts.length - 1;
        assert.equal(entry.mode, last ? state.item.mode : '40000');
        if (last) assert.equal(entry.sha, state.item.blob);
        state.current = entry.sha;
        state.position++;
    }
}
const membership = { sources, objects: [...objects.values()].map(({ raw, ...item }) => item) };
json('source-membership.json', membership);
const verification = verifyMembership(root, membership);
const pairs = sources.filter(x => x.role === 'Original').map(item =>
{
    const other = sources.find(x => x.finding === item.finding && x.role === 'Default' && x.path === item.path);
    assert.ok(other);
    return { group: item.finding, path: item.path, exactWholeBlobEqual: item.blob === other.blob && item.mode === other.mode };
});
const after = reserved('after');
assert.deepEqual(after, before);
json('COMMANDS.json', commands);
json('QUALIFICATION.json', { observedUtc: new Date().toISOString(), verification, pairs,
    independentlyRehashedOwnerArtifacts: 90, independentlyEqualFreshWholeGitBodies: 90,
    selectedExistingBodyCountsPerGroupRole: 15, newLogicalSourcePaths: 0,
    parentRetainedContextsLimitPerRole: 8, aggregateRootCount: commands.length, aggregateRootMaximum: 32,
    reservedBeforeAfterUnchanged: true, after, noRetroactiveOwnerProceduralApproval: true,
    sourceIdentityOnlyNotRuntimeOrMaterialityQualification: true,
    actualEnclosingToolExitMustBeRecordedAfterReturn: true, productTestsCandidatesComparisons: 0 });
console.log(JSON.stringify({ verification, ownerArtifactsEqualFreshWholeGitBytes: 90,
    exactWholePairs: pairs.filter(x => x.exactWholeBlobEqual).length, totalPairs: 45,
    directGitRoots: commands.length, reservedUnchanged: true, productTestsCandidatesComparisons: 0 }));
