import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256, gitId, treeEntries, verifyMembership } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const root = import.meta.dirname, parallel = path.dirname(root), commands = [];
const repo = String.raw`C:\src\aspnetcore`, read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
function write(file, raw)
{
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
const json = (file, value) => write(path.join(root, file), JSON.stringify(value, null, 2) + '\n');
const requests = [
    { type: 'commit', expression: '37e809ead5824bc753a1c3d56f11615bdb1296c5' },
    { type: 'commit', expression: 'd3483989953ae3cccd773aea5ea04cb0c7198531' }
];
const identity = path.join(parallel, 'finding-F234-F235-286');
for (const item of read(path.join(identity, 'ROLE-BINDINGS-286.json')).cumulativeBodyInventory)
{
    const raw = fs.readFileSync(item.capture);
    assert.equal(raw.length, item.bytes);
    assert.equal(sha256(raw), item.sha256);
    requests.push({ type: 'blob', expression: item.commit + ':' + item.path, finding: 'F234-F235',
        commit: item.commit, role: item.role, path: item.path, expectedBlob: gitId('blob', raw),
        expectedBytes: item.bytes, expectedSha256: item.sha256, ownerArtifact: item.capture });
}
assert.equal(requests.length, 38);
const mvc = path.join(parallel, 'finding-F242-282'), mvcInputs = new Map();
for (const item of read(path.join(mvc, 'SOURCE-VERIFICATION.json')).verifiedInputs.filter(x => x.type === 'blob'))
{
    assert.match(item.commitPath, /^[a-f0-9]{40}:/);
    const key = item.role + '/' + item.commitPath;
    if (mvcInputs.has(key)) assert.deepEqual(mvcInputs.get(key), item);
    else mvcInputs.set(key, item);
}
assert.equal(mvcInputs.size, 30);
for (const item of mvcInputs.values())
    requests.push({ type: 'blob', expression: item.commitPath, finding: 'F242',
        commit: item.commitPath.slice(0, 40), role: item.role, path: item.commitPath.slice(41),
        expectedBlob: item.gitObjectId, expectedMode: item.mode, expectedBytes: item.bytes,
        expectedSha256: item.sha256, ownerArtifact: path.join(mvc, item.rawPath) });
for (const [directory, file] of [['finding-F243-F246-283', 'whole-inputs-v001.json'],
    ['finding-F243-F246-283', 'whole-inputs-v002.json'], ['finding-F243-F246-290', 'whole-inputs-v001.json']])
{
    const packet = path.join(parallel, directory);
    for (const item of read(path.join(packet, file)).members)
        requests.push({ type: 'blob', expression: item.commitPath, finding: 'F243-F246',
            commit: item.commit, role: item.role, path: item.path, expectedBlob: item.oid,
            expectedMode: item.mode, expectedBytes: item.fullBytes, expectedSha256: item.sha256,
            ownerArtifact: path.join(packet, item.capturedFile) });
}
assert.equal(requests.length, 106);
const unique = new Set(requests.filter(x => x.type === 'blob').map(x => x.finding + '/' + x.role + '/' + x.path));
assert.equal(unique.size, 104);
for (const item of requests.filter(x => x.type === 'blob'))
{
    assert.equal(item.commit, requests[item.role === 'Original' ? 0 : 1].expression);
    assert.ok(['Original', 'Default'].includes(item.role));
}
function git(label, argv, input)
{
    assert.ok(commands.length < 24);
    const policyBytes = fs.readFileSync(path.join(parallel, 'policy.json')), policy = JSON.parse(policyBytes);
    assert.deepEqual(Object.keys(policy.independentFindingPreparationWorkers).sort(), ['F209', 'F255', 'F257', 'F258']);
    assert.equal(policy.independentFindingPreparationWorkers.F257, '7ebf00d6-76eb-41b9-8a9b-b6549a772002');
    assert.equal(policy.independentFindingPreparationWorkers.F258, 'a4e76420-cb81-4c3e-9008-491e049270d2');
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
function reserved(when)
{
    return {
        branch: git('reserved-branch-' + when, ['symbolic-ref', '--short', 'HEAD']).toString('utf8'),
        head: git('reserved-head-' + when, ['rev-parse', 'HEAD']).toString('utf8'),
        status: git('reserved-status-' + when, ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
        globalSha256: sha256(fs.readFileSync(path.join(repo, 'global.json')))
    };
}
const before = reserved('before');
assert.equal(before.branch.trim(), 'autoperf/F145-hoist-large-response-utf8-encoding');
assert.equal(before.head.trim(), '24875ef5dabb55567870b39f6eb0002170435e2f');
assert.equal(before.globalSha256, 'C3D6E7C29D94C34B6343D4A2EFE74164929F29BFA26FD84B5E2020A15091CD53');
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
parse(git('commits-and-104-whole-blobs', ['cat-file', '--batch'], Buffer.from(requests.map(x => x.expression).join('\n') + '\n')),
    requests, (item, blob, raw) =>
    {
        if (item.type !== 'blob') return;
        assert.equal(raw.length, item.expectedBytes);
        assert.equal(sha256(raw), item.expectedSha256);
        assert.ok(raw.equals(fs.readFileSync(item.ownerArtifact)), item.ownerArtifact);
        const artifact = `source/${item.finding}/${item.role}/${item.path}`;
        write(path.join(root, artifact), raw);
        sources.push({ finding: item.finding, role: item.role, commit: item.commit, path: item.path,
            blob, artifact, bytes: raw.length, sha256: sha256(raw), expectedOwnerMode: item.expectedMode });
    });
const previous = path.join(parallel, 'source-qualification-284'), prior = read(path.join(previous, 'source-membership.json'));
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
        if (last)
        {
            assert.equal(entry.sha, state.item.blob);
            if (state.item.expectedOwnerMode !== undefined) assert.equal(entry.mode, state.item.expectedOwnerMode);
            state.item.mode = entry.mode;
            delete state.item.expectedOwnerMode;
        }
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
const after = reserved('after');
assert.deepEqual(before, after);
const roleEquality = sources.filter(x => x.role === 'Original').map(item =>
{
    const current = sources.find(x => x.finding === item.finding && x.role === 'Default' && x.path === item.path);
    assert.ok(current);
    return { finding: item.finding, path: item.path, exactOriginalDefaultBlobEqual: current.blob === item.blob };
});
json('COMMANDS.json', commands);
json('QUALIFICATION.json', { observedUtc: new Date().toISOString(), verification, sourceCapturesIndependentlyEqual: 104,
    before, after, reservedStateUnchanged: true, roleEquality, sourceGitMetadataRoots: commands.length,
    immutableOriginal: requests[0].expression, observedPreparationDefault: requests[1].expression,
    freshCurrentUpstreamRecheckClaimed: false, newLogicalRepositorySourceInputsBeyondCapturedSets: 0,
    injectedContextAccountingAndOldMissingHelperFailuresPreservedNotRetroactivelyApproved: true,
    nativeDiSelectionGlobalPasskeyScenarioOpenApiDelegatesAndActualFrequencyNotQualified: true,
    declaredTestsNotRun: true, productNativeTestsCandidatesOrComparisons: 0, actualEnclosingToolCompletionNotSelfAttested: true });
console.log(JSON.stringify({ verification, sourceCapturesIndependentlyEqual: 104,
    exactOriginalDefaultPairs: roleEquality.filter(x => x.exactOriginalDefaultBlobEqual).length,
    wholePairs: roleEquality.length, GitMetadataRoots: commands.length,
    reservedStateUnchanged: true, testsCandidatesComparisons: 0 }));
