import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256, gitId, treeEntries, verifyMembership } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const root = import.meta.dirname, parallel = path.dirname(root), session = path.dirname(parallel);
const repo = String.raw`C:\src\aspnetcore`, commands = [];
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
function write(file, raw)
{
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
const json = (file, value) => write(path.join(root, file), JSON.stringify(value, null, 2) + '\n');
function git(label, argv, input)
{
    assert.ok(commands.length < 16);
    const policyBytes = fs.readFileSync(path.join(parallel, 'policy.json')), policy = JSON.parse(policyBytes);
    assert.deepEqual(Object.keys(policy.independentFindingPreparationWorkers).sort(), ['F209', 'F234', 'F242', 'F243']);
    assert.equal(policy.actualWorkerBuildHoldActive, false);
    assert.equal(policy.buildAndTestWorkQuiesced, false);
    assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
    const args = ['--no-pager', '-C', repo, ...argv], startedUtc = new Date().toISOString();
    const result = spawnSync('git', args, { cwd: repo, input, timeout: 90000, windowsHide: true,
        maxBuffer: 64 * 1024 * 1024, env: { ...process.env, GIT_PAGER: '', GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' } });
    const prefix = 'commands/' + String(commands.length + 1).padStart(3, '0') + '-' + label;
    write(path.join(root, prefix + '.stdout'), result.stdout ?? Buffer.alloc(0));
    write(path.join(root, prefix + '.stderr'), result.stderr ?? Buffer.alloc(0));
    if (input) write(path.join(root, prefix + '.stdin'), input);
    const record = {
        executable: 'git', argv: args, cwd: repo, pid: result.pid, startedUtc, endedUtc: new Date().toISOString(),
        exitCode: result.status, error: result.error?.message ?? null, stdout: prefix + '.stdout', stderr: prefix + '.stderr',
        stdin: input ? prefix + '.stdin' : null, sourcePreparationPolicySha256: sha256(policyBytes),
        rootWaited: result.status !== null && !result.error, bothRawStreamsReturned: !result.error,
        creationBoundRootOrUniversalDescendantCensusNotClaimed: true, productNativeOrComparisonAdmission: false
    };
    commands.push(record);
    json(prefix + '.json', record);
    assert.ifError(result.error);
    assert.equal(result.status, 0, (result.stderr ?? Buffer.alloc(0)).toString('utf8'));
    return result.stdout;
}
const before = {
    head: git('reserved-head-before', ['rev-parse', 'HEAD']).toString('utf8'),
    status: git('reserved-status-before', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
    globalSha256: sha256(fs.readFileSync(path.join(repo, 'global.json')))
};
assert.equal(before.head.trim(), '24875ef5dabb55567870b39f6eb0002170435e2f');
assert.equal(before.globalSha256, 'C3D6E7C29D94C34B6343D4A2EFE74164929F29BFA26FD84B5E2020A15091CD53');
const claims = path.join(parallel, 'finding-F231-F232-F233-267'), directory = path.join(parallel, 'finding-F239-269');
const requests = [
    { type: 'commit', expression: '37e809ead5824bc753a1c3d56f11615bdb1296c5' },
    { type: 'commit', expression: 'd3483989953ae3cccd773aea5ea04cb0c7198531' }
];
for (const item of read(path.join(claims, 'WHOLE-ROLE-BINDINGS-267.json')).files)
    requests.push({ type: 'blob', expression: item.commitPathExpression, commit: item.commit, role: item.role,
        finding: 'F231-F232-F233', path: item.repositoryPath, expectedBlob: item.blobSha1,
        expectedBytes: item.bytes, expectedSha256: item.sha256, ownerArtifact: path.join(claims, item.sourceFile) });
for (const item of read(path.join(directory, 'whole-source-bindings-v2.json')))
    requests.push({ type: 'blob', expression: item.spec, commit: item.commit, role: item.role,
        finding: 'F239', path: item.logicalPath, expectedBlob: item.objectSha1,
        expectedBytes: item.size, expectedSha256: item.contentSha256, ownerArtifact: path.join(directory, item.output) });
assert.equal(requests.length, 56);
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
    const file = `raw-git/objects/${sha}.payload`;
    write(path.join(root, file), raw);
    objects.set(sha, { type, sha, file, bytes: raw.length, sha256: sha256(raw), raw });
}
function parse(raw, expected, consume)
{
    let offset = 0;
    for (const item of expected)
    {
        const end = raw.indexOf(10, offset);
        assert.ok(end >= offset);
        const header = raw.subarray(offset, end).toString('ascii').match(/^([a-f0-9]{40}) (commit|tree|blob) (\d+)$/);
        assert.ok(header, item.expression ?? item.sha);
        assert.equal(header[2], item.type);
        assert.equal(header[1], item.sha ?? item.expectedBlob ?? item.expression);
        const size = Number(header[3]), start = end + 1;
        assert.equal(raw[start + size], 10);
        const body = raw.subarray(start, start + size);
        save(item.type, header[1], body);
        consume(item, header[1], body);
        offset = start + size + 1;
    }
    assert.equal(offset, raw.length);
}
const initial = git('commits-and-54-whole-blobs', ['cat-file', '--batch'], Buffer.from(requests.map(x => x.expression).join('\n') + '\n'));
parse(initial, requests, (item, blob, raw) =>
{
    if (item.type !== 'blob') return;
    const captured = fs.readFileSync(item.ownerArtifact);
    assert.equal(raw.length, item.expectedBytes);
    assert.equal(sha256(raw), item.expectedSha256);
    assert.ok(raw.equals(captured), item.ownerArtifact);
    const artifact = `source/${item.finding}/${item.role}/${item.path}`;
    write(path.join(root, artifact), raw);
    sources.push({ finding: item.finding, role: item.role, commit: item.commit, path: item.path,
        blob, artifact, bytes: raw.length, sha256: sha256(raw) });
});
const previous = path.join(parallel, 'finding-F222-F223-F224-273'), prior = read(path.join(previous, 'source-membership.json'));
verifyMembership(previous, prior);
const reusable = new Map(prior.objects.map(x => [x.sha, x]));
function ensureTrees(hashes)
{
    const missing = [];
    for (const sha of new Set(hashes))
    {
        if (objects.has(sha)) { assert.equal(objects.get(sha).type, 'tree'); continue; }
        const item = reusable.get(sha);
        if (item)
        {
            assert.equal(item.type, 'tree');
            const raw = fs.readFileSync(path.join(previous, item.file));
            assert.equal(raw.length, item.bytes);
            assert.equal(sha256(raw), item.sha256);
            save('tree', sha, raw);
        }
        else missing.push(sha);
    }
    if (missing.length)
        parse(git('raw-ancestor-trees-' + commands.length, ['cat-file', '--batch'], Buffer.from(missing.join('\n') + '\n')),
            missing.map(sha => ({ sha, type: 'tree' })), () => {});
}
const walkers = sources.map(item => ({ item, parts: item.path.split('/'), position: 0,
    current: objects.get(item.commit).raw.toString('utf8').match(/^tree ([a-f0-9]{40})$/m)[1] }));
while (walkers.some(x => x.position < x.parts.length))
{
    const active = walkers.filter(x => x.position < x.parts.length);
    ensureTrees(active.map(x => x.current));
    for (const state of active)
    {
        const entry = treeEntries(objects.get(state.current).raw).get(state.parts[state.position]), last = state.position === state.parts.length - 1;
        assert.ok(entry, state.item.path);
        assert.ok(last ? ['100644', '100755'].includes(entry.mode) : entry.mode === '40000');
        if (last) { assert.equal(entry.sha, state.item.blob); state.item.mode = entry.mode; }
        state.current = entry.sha;
        state.position++;
    }
}
const membership = { sources, objects: [...objects.values()].map(({ raw, ...item }) => item) };
json('source-membership.json', membership);
const verification = verifyMembership(root, membership);
for (const item of sources)
{
    const raw = fs.readFileSync(path.join(root, item.artifact));
    assert.equal(raw.length, item.bytes);
    assert.equal(sha256(raw), item.sha256);
    assert.equal(gitId('blob', raw), item.blob);
}
const after = {
    head: git('reserved-head-after', ['rev-parse', 'HEAD']).toString('utf8'),
    status: git('reserved-status-after', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
    globalSha256: sha256(fs.readFileSync(path.join(repo, 'global.json')))
};
assert.deepEqual(before, after);
const roleEquality = sources.filter(x => x.role === 'Original').map(item =>
{
    const current = sources.find(x => x.finding === item.finding && x.role === 'Default' && x.path === item.path);
    assert.ok(current);
    return { finding: item.finding, path: item.path, exactOriginalDefaultBlobEqual: current.blob === item.blob };
});
json('COMMANDS.json', commands);
json('QUALIFICATION.json', { observedUtc: new Date().toISOString(), verification, sourceCapturesIndependentlyEqual: 54,
    before, after, reservedStateUnchanged: true, roleEquality, sourceGitMetadataRoots: commands.length,
    immutableOriginal: requests[0].expression, observedOwnerDefault: requests[1].expression,
    freshCurrentUpstreamRecheckClaimed: false, declaredTestsNotRun: true,
    inheritedNormalizerAndExternalRazorEngineFrequencyNotQualified: true,
    productNativeTestsCandidatesOrComparisons: 0, actualEnclosingToolCompletionNotSelfAttested: true });
console.log(JSON.stringify({ verification, sourceCapturesIndependentlyEqual: 54,
    exactOriginalDefaultPairs: roleEquality.filter(x => x.exactOriginalDefaultBlobEqual).length,
    wholePairs: roleEquality.length, GitMetadataRoots: commands.length,
    reservedStateUnchanged: true, testsCandidatesComparisons: 0 }));
