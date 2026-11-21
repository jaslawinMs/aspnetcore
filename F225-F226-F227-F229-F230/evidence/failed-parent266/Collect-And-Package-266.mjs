import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitId, sha256, treeEntries, verifyMembership } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const root = import.meta.dirname, parallel = path.dirname(root), session = path.dirname(parallel);
const repo = String.raw`C:\src\aspnetcore`, prior = path.join(session, 'autoperf-published-results', 'F150-F206-F215-F220');
const capsule = path.join(session, 'autoperf-published-results', 'F225-F226-F227-F229-F230');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const logical = text => text.replaceAll('\\', '/').replace(/^\.\//, '');
function write(file, raw)
{
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
const jsonWrite = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
function inventory(directory, relative = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const name = relative ? relative + '/' + entry.name : entry.name;
        return entry.isDirectory() ? inventory(path.join(directory, entry.name), name) : [name];
    });
}
function guard()
{
    const raw = fs.readFileSync(path.join(parallel, 'policy.json')), policy = JSON.parse(raw);
    assert.deepEqual(Object.keys(policy.independentFindingPreparationWorkers).sort(), ['F209', 'F231', 'F234', 'F239']);
    assert.equal(policy.actualWorkerBuildHoldActive, false);
    assert.equal(policy.buildAndTestWorkQuiesced, false);
    assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
    return { observedUtc: new Date().toISOString(), policySha256: sha256(raw),
        actualOwners: policy.independentFindingPreparationWorkers, scopes: policy.activeWorkerPreparationScopes,
        leaseAbsent: true, HOLD: false, quiesced: false,
        boundary: 'Read-only source archiving point, not native/comparison admission or dedicated-host observation.' };
}
const commands = [];
function git(label, argv, input)
{
    assert.ok(commands.length < 16);
    const observation = guard(), args = ['--no-pager', '-C', repo, ...argv], startedUtc = new Date().toISOString();
    const result = spawnSync('git', args, { cwd: repo, input, windowsHide: true, timeout: 90000,
        maxBuffer: 64 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', GIT_PAGER: '' } });
    const prefix = 'commands/' + String(commands.length + 1).padStart(3, '0') + '-' + label;
    write(path.join(root, prefix + '.stdout'), result.stdout ?? Buffer.alloc(0));
    write(path.join(root, prefix + '.stderr'), result.stderr ?? Buffer.alloc(0));
    if (input) write(path.join(root, prefix + '.stdin'), input);
    const record = { label, argv: args, cwd: repo, pid: result.pid, observation, startedUtc,
        endedUtc: new Date().toISOString(), exitCode: result.status, signal: result.signal,
        error: result.error?.message ?? null, stdout: prefix + '.stdout', stderr: prefix + '.stderr',
        stdin: input ? prefix + '.stdin' : null,
        rootWaited: result.status !== null && !result.error, redirectedStreamsDrained: !result.error,
        creationAndUnobservedDescendantIdentityNotClaimed: true };
    commands.push(record);
    jsonWrite(path.join(root, prefix + '.json'), record);
    assert.ifError(result.error);
    assert.equal(result.status, 0, (result.stderr ?? Buffer.alloc(0)).toString('utf8'));
    return result.stdout;
}
jsonWrite(path.join(root, 'policy-observation.json'), guard());
const before = {
    head: git('reserved-head-before', ['rev-parse', 'HEAD']).toString('utf8'),
    status: git('reserved-status-before', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
};
const owners = [
    { group: 'F225-F226', folder: 'finding-F225-F226-256', index: 'index.json', list: 'entries', indexed: 154,
        hash: '933FE97F15FDF7DB60815D9AAD037162357B9C37A0D67C73449FAF84B7CC9F9D',
        envelopes: ['index.json', 'seal.json'] },
    { group: 'F227', folder: 'finding-F227-257', index: 'WHOLE-SEAL-v1.json', list: 'files', indexed: 190,
        hash: 'A6CA473FB3EC1C6DAE1E6940141C68C1C94CFD8D4EFD81F7D236FE36EF5AAB09',
        envelopes: ['WHOLE-SEAL-v1.json'] },
    { group: 'F229-F230', folder: 'finding-F229-F230-259', index: 'EVIDENCE-INDEX-259.json', list: 'entries', indexed: 165,
        hash: 'A12FD7372A3784778EE36A90B4E00E5A4028C12FD7AEA6C7036ED95474872567',
        envelopes: ['EVIDENCE-INDEX-259.json', 'SEAL-259.json'] },
];
const evidence = [], ownerCopies = [], copied = new Set();
function copy(file, raw)
{
    assert.equal(copied.has(file), false, file);
    copied.add(file);
    write(path.join(capsule, ...file.split('/')), raw);
    evidence.push({ file, bytes: raw.length, sha256: sha256(raw) });
}
for (const owner of owners)
{
    const directory = path.join(parallel, owner.folder), indexRaw = fs.readFileSync(path.join(directory, owner.index));
    assert.equal(sha256(indexRaw), owner.hash);
    const entries = JSON.parse(indexRaw)[owner.list];
    assert.equal(entries.length, owner.indexed);
    for (const item of entries)
    {
        const file = item.path ?? item.relativePath, raw = fs.readFileSync(path.join(directory, file));
        assert.equal(raw.length, item.bytes ?? item.byteLength, file);
        assert.equal(sha256(raw), item.sha256, file);
    }
    const complete = inventory(directory).sort();
    assert.deepEqual(complete, [...new Set([...entries.map(x => logical(x.path ?? x.relativePath)), ...owner.envelopes])].sort());
    for (const file of complete) copy('evidence/' + owner.group + '/' + file, fs.readFileSync(path.join(directory, file)));
    ownerCopies.push({ group: owner.group, indexedPayloads: entries.length, completeCopiedFiles: complete.length,
        disposition: 'source-qualified-material-candidate-not-established', productNativeOrComparisonStarts: 0 });
}
assert.equal(ownerCopies.reduce((sum, item) => sum + item.completeCopiedFiles, 0), 514);
const sources = [], external = [], objects = new Map(), reusable = new Map(), reused = [];
function save(type, sha, raw)
{
    assert.equal(gitId(type, raw), sha);
    assert.equal(objects.has(sha), false);
    const file = `raw-git/objects/${sha}.payload`;
    write(path.join(root, file), raw);
    objects.set(sha, { type, sha, file, bytes: raw.length, sha256: sha256(raw), raw });
}
function source(group, folder, role, commit, file, capture, bytes, hash, blob)
{
    const raw = fs.readFileSync(path.join(parallel, folder, capture)), actualBlob = gitId('blob', raw);
    assert.equal(raw.length, bytes, file);
    assert.equal(sha256(raw), hash, file);
    if (blob) assert.equal(actualBlob, blob, file);
    assert.ok(['Original', 'Default'].includes(role));
    assert.match(commit, /^[a-f0-9]{40}$/);
    if (!objects.has(actualBlob)) save('blob', actualBlob, raw);
    sources.push({ group, role, commit, path: logical(file), blob: actualBlob,
        artifact: 'evidence/' + group + '/' + logical(capture), bytes, sha256: hash });
}
for (const file of ['014-initial-whole-sources.sources.json', '018-producer-whole-sources.sources.json'])
    for (const item of read(path.join(parallel, 'finding-F225-F226-256', file)))
        source('F225-F226', 'finding-F225-F226-256', item.role, item.commit, item.repositoryPath,
            item.retainedPath, item.bytes, item.sha256, item.blob);
for (const file of ['collection-source-v1.json', 'collection-contract-history-v1.json'])
    for (const item of read(path.join(parallel, 'finding-F227-257', file)).files)
        source('F227', 'finding-F227-257', item.role, item.commit, item.logicalPath, item.path, item.bytes, item.sha256);
for (const item of read(path.join(parallel, 'finding-F229-F230-259', 'SOURCE-MANIFEST.json')).filter(x => x.kind === 'blob'))
    source('F229-F230', 'finding-F229-F230-259', item.role, item.commit, item.repositoryPath,
        path.relative(path.join(parallel, 'finding-F229-F230-259'), item.evidencePath), item.byteLength, item.sha256, item.objectId);
assert.equal(sources.length, 78);
const oldMembership = read(path.join(prior, 'source-membership.json'));
verifyMembership(prior, oldMembership);
for (const item of oldMembership.objects) reusable.set(item.sha, item);
function ensure(type, hashes)
{
    const missing = [];
    for (const sha of new Set(hashes))
    {
        if (objects.has(sha))
        {
            assert.equal(objects.get(sha).type, type);
            continue;
        }
        if (reusable.has(sha))
        {
            const item = reusable.get(sha), raw = fs.readFileSync(path.join(prior, item.file));
            assert.equal(item.type, type);
            assert.equal(raw.length, item.bytes);
            assert.equal(sha256(raw), item.sha256);
            save(type, sha, raw);
            reused.push({ type, sha, priorCapsule: 'F150-F206-F215-F220' });
        }
        else missing.push(sha);
    }
    if (!missing.length) return;
    const raw = git(`raw-${type}-batch-${commands.length}`, ['cat-file', '--batch'], Buffer.from(missing.join('\n') + '\n'));
    let offset = 0;
    for (const sha of missing)
    {
        const end = raw.indexOf(10, offset);
        assert.ok(end >= offset);
        const header = raw.subarray(offset, end).toString('ascii').match(/^([a-f0-9]{40}) (commit|tree|blob) (\d+)$/);
        assert.ok(header);
        assert.equal(header[1], sha);
        assert.equal(header[2], type);
        const length = Number(header[3]), start = end + 1;
        assert.equal(raw[start + length], 10);
        save(type, sha, raw.subarray(start, start + length));
        offset = start + length + 1;
    }
    assert.equal(offset, raw.length);
}
ensure('commit', sources.map(x => x.commit));
const walkers = sources.map(item => ({ item, parts: item.path.split('/'), position: 0,
    current: objects.get(item.commit).raw.toString('utf8').match(/^tree ([a-f0-9]{40})$/m)[1] }));
while (walkers.some(x => x.position < x.parts.length))
{
    const active = walkers.filter(x => x.position < x.parts.length);
    ensure('tree', active.map(x => x.current));
    for (const state of active)
    {
        const entry = treeEntries(objects.get(state.current).raw).get(state.parts[state.position]);
        assert.ok(entry, state.item.path);
        const last = state.position === state.parts.length - 1;
        assert.ok(last ? ['100644', '100755'].includes(entry.mode) : entry.mode === '40000');
        if (last)
        {
            assert.equal(entry.sha, state.item.blob, `${state.item.group}/${state.item.role}/${state.item.path}`);
            state.item.mode = entry.mode;
        }
        state.current = entry.sha;
        state.position++;
    }
}
const membership = { sources, objects: [...objects.values()].map(({ raw, ...item }) => item) };
for (const item of membership.objects) copy(item.file, fs.readFileSync(path.join(root, item.file)));
copy('source-membership.json', Buffer.from(JSON.stringify(membership, null, 2) + '\n'));
const verified = verifyMembership(capsule, membership);
for (const item of read(path.join(parallel, 'finding-F227-257', 'collection-contract-history-v1.json')).referenceContracts)
{
    assert.equal(item.wholeFile, true);
    const artifact = 'evidence/F227/' + logical(item.path), raw = fs.readFileSync(path.join(capsule, artifact));
    assert.equal(raw.length, item.bytes);
    assert.equal(sha256(raw), item.sha256);
    external.push({ repository: item.repository, commit: item.commit, role: item.role,
        path: logical(item.logicalPath), artifact, bytes: item.bytes, sha256: item.sha256,
        computedBlob: gitId('blob', raw), notSelectedRoleRuntime: true,
        boundary: 'Whole common reference-source fingerprint; not external commit/tree membership or executing runtime/comparer/culture proof.' });
}
assert.equal(external.length, 4);
copy('external-source.json', Buffer.from(JSON.stringify(external, null, 2) + '\n'));
const after = {
    head: git('reserved-head-after', ['rev-parse', 'HEAD']).toString('utf8'),
    status: git('reserved-status-after', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
};
assert.deepEqual(after, before);
jsonWrite(path.join(root, 'COMMANDS.json'), commands);
jsonWrite(path.join(root, 'raw-object-reuse.json'), reused);
jsonWrite(path.join(root, 'ARCHIVE.json'), {
    findings: ['F225', 'F226', 'F227', 'F229', 'F230'], ownerCopies, rawGitVerification: verified,
    sourceUtilityRoots: commands.length, allDirectSourceRootsWaitedAndStreamsReturned: true,
    before, after, reservedHeadStatusEqual: true, externalWholeSourceFingerprints: external.length,
    productNativeOrComparisonStarts: 0, rejectedIsNotMeasuredNoGain: true, finalizationRequiresIndependentPublisher: true,
    externalRuntimeOrTreeAndUniversalChildClosureNotClaimed: true
});
for (const file of inventory(root).filter(x => !x.startsWith('raw-git/')))
    copy('evidence/parent266/' + file, fs.readFileSync(path.join(root, file)));
for (const file of ['Accept-Preparations-265.mjs', 'accepted-preparations-265.json', 'owner-advancement-265.json'])
    copy('evidence/parent/' + file, fs.readFileSync(path.join(parallel, file)));
copy('source-objects.mjs', fs.readFileSync(path.join(prior, 'source-objects.mjs')));
for (const file of ['README.md', 'verify.mjs', '.gitattributes'])
{
    const raw = fs.readFileSync(path.join(capsule, file));
    evidence.push({ file, bytes: raw.length, sha256: sha256(raw) });
}
jsonWrite(path.join(capsule, 'evidence-index.json'), { files: evidence, ownerCopies,
    boundary: 'Complete owner evidence and source roots; actual collector tool completion added after real return, before publisher seal.' });
console.log(JSON.stringify({ completeOwnerFiles: 514, completeCopiedEvidenceFiles: evidence.length,
    sourceMemberships: verified.memberships, rawGitObjects: verified.objects,
    externalWholeSourceFingerprints: external.length, directSourceUtilityRoots: commands.length,
    productNativeOrComparisonStarts: 0, ownFinalToolExitNotSelfAttested: true }));
