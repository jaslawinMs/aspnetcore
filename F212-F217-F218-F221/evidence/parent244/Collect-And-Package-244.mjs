import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitId, sha256, treeEntries, verifyMembership } from '../../autoperf-published-results/F240-F268/source-objects.mjs';

const root = import.meta.dirname, parallel = path.dirname(root), session = path.dirname(parallel);
const repo = String.raw`C:\src\aspnetcore`;
const capsule = path.join(session, 'autoperf-published-results', 'F212-F217-F218-F221');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
function write(file, raw)
{
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
const jsonWrite = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
const logical = value => value.replaceAll('\\', '/');
function inventory(directory, relative = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const name = relative ? relative + '/' + entry.name : entry.name;
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? inventory(file, name) : [name];
    });
}
const commands = [];
function git(label, argv, input)
{
    const startedUtc = new Date().toISOString();
    const args = ['--no-pager', '-C', repo, ...argv];
    const result = spawnSync('git', args, { cwd: repo, input, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
    const prefix = path.join(root, 'commands', String(commands.length + 1).padStart(3, '0') + '-' + label);
    write(prefix + '.stdout', result.stdout ?? Buffer.alloc(0));
    write(prefix + '.stderr', result.stderr ?? Buffer.alloc(0));
    if (input)
    {
        write(prefix + '.stdin', input);
    }
    const record = { label, executable: 'git', argv: args, cwd: repo, pid: result.pid,
        startedUtc, endedUtc: new Date().toISOString(), exitCode: result.status, signal: result.signal,
        launchError: result.error?.message ?? null, stdout: logical(path.relative(root, prefix + '.stdout')),
        stderr: logical(path.relative(root, prefix + '.stderr')), stdin: input ? logical(path.relative(root, prefix + '.stdin')) : null,
        rootWaited: true, redirectedStreamsDrained: true };
    commands.push(record);
    jsonWrite(prefix + '.json', record);
    assert.ifError(result.error);
    assert.equal(result.status, 0, (result.stderr ?? Buffer.alloc(0)).toString('utf8'));
    return result.stdout;
}
const policyRaw = fs.readFileSync(path.join(parallel, 'policy.json')), policy = JSON.parse(policyRaw);
assert.deepEqual(Object.keys(policy.independentFindingPreparationWorkers).sort(), ['F150', 'F206', 'F209', 'F220']);
jsonWrite(path.join(root, 'policy-observation.json'), { observedUtc: new Date().toISOString(), policySha256: sha256(policyRaw),
    actualRegisteredOwners: policy.independentFindingPreparationWorkers, actualScopes: policy.activeWorkerPreparationScopes,
    leaseExists: fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')),
    HOLD: policy.actualWorkerBuildHoldActive, quiesced: policy.buildAndTestWorkQuiesced,
    boundary: 'Read-only source archive point, not native product admission, permanent registry/idleness or future timing permission.' });
const before = {
    head: git('reserved-head-before', ['rev-parse', 'HEAD']).toString('utf8'),
    status: git('reserved-status-before', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
};
const owners = [
    { finding: 'F212', folder: 'finding-F212-233', indexed: 312,
        index: 'artifact-index-008.json', array: 'files', size: 'bytes',
        envelopes: ['HANDOFF.json', 'artifact-index-008.json', 'artifact-seal-008.json'] },
    { finding: 'F217', folder: 'finding-F217-237', indexed: 918,
        index: 'HANDOFF.json', array: 'artifactIndex', size: 'length', envelopes: ['HANDOFF.json', 'SEAL.json'] },
    { finding: 'F218', folder: 'finding-F218-239', indexed: 155,
        index: 'HASHES.json', array: 'files', size: 'bytes', envelopes: ['HASHES.json', 'HANDOFF.json'] },
    { finding: 'F221', folder: 'finding-F221-234', indexed: 396,
        index: 'artifact-index.json', array: 'entries', size: 'bytes', envelopes: ['artifact-index.json', 'SEAL.json'] },
];
const evidence = [];
function copy(logicalFile, raw)
{
    write(path.join(capsule, ...logicalFile.split('/')), raw);
    evidence.push({ file: logicalFile, bytes: raw.length, sha256: sha256(raw) });
}
const ownerCopies = [];
for (const owner of owners)
{
    const directory = path.join(parallel, owner.folder), entries = read(path.join(directory, owner.index))[owner.array];
    assert.equal(entries.length, owner.indexed);
    for (const item of entries)
    {
        const raw = fs.readFileSync(path.join(directory, ...item.path.split(/[\\/]/)));
        assert.equal(raw.length, item[owner.size], item.path);
        assert.equal(sha256(raw), item.sha256, item.path);
    }
    const complete = inventory(directory).sort();
    assert.deepEqual(complete, [...new Set([...entries.map(item => logical(item.path)), ...owner.envelopes])].sort());
    for (const relative of complete)
    {
        copy('evidence/' + owner.finding + '/' + relative, fs.readFileSync(path.join(directory, ...relative.split('/'))));
    }
    ownerCopies.push({ finding: owner.finding, indexedPayloads: entries.length, completeCopiedFiles: complete.length,
        disposition: 'source-only-no-material-candidate', productNativeOrComparisonStarts: 0 });
}
const sources = [], external = [];
function source(finding, ownerFolder, item, capture, bytes, blob)
{
    const directory = path.join(parallel, ownerFolder), raw = fs.readFileSync(path.join(directory, ...capture.split(/[\\/]/)));
    assert.equal(raw.length, bytes);
    assert.equal(sha256(raw), item.sha256);
    assert.equal(gitId('blob', raw), blob);
    assert.match(item.commit, /^[a-f0-9]{40}$/);
    assert.ok(typeof item.role === 'string' && item.role.length > 0);
    sources.push({ finding, role: item.role, commit: item.commit, path: item.path, blob,
        artifact: 'evidence/' + finding + '/' + logical(capture), bytes, sha256: item.sha256, raw });
}
for (const item of read(path.join(parallel, 'finding-F212-233', 'source-integrity-008.json')).verified)
{
    const capture = path.relative(path.join(parallel, 'finding-F212-233'), item.savedPath);
    assert.ok(!capture.startsWith('..') && !path.isAbsolute(capture));
    if (item.repository === 'dotnet/aspnetcore')
    {
        source('F212', 'finding-F212-233', item, capture, item.bytes, item.gitBlob);
    }
    else
    {
        external.push({ finding: 'F212', repository: item.repository, role: item.role, commit: item.commit, path: item.path,
            artifact: 'evidence/F212/' + logical(capture), bytes: item.bytes, sha256: item.sha256, gitBlob: item.gitBlob,
            representation: 'Whole pinned external capture/blob fingerprint, not a full external commit/tree archive or selected installed/native/runtime image.' });
    }
}
for (const item of read(path.join(parallel, 'finding-F217-237', 'raw-discovery', 'verified-members.json')).sources)
{
    source('F217', 'finding-F217-237', item, item.evidencePath, item.length, item.gitBlob);
}
for (const item of read(path.join(parallel, 'finding-F217-237', 'documentation', 'final-known-sources.json')).documents)
{
    external.push({ finding: 'F217', repository: item.repository, role: item.role, commit: item.commit, path: item.path,
        artifact: 'evidence/F217/' + logical(item.evidencePath), bytes: item.length, sha256: item.sha256,
        representation: 'Whole pinned documentation capture and SHA256; no independent raw external Git commit/tree membership or loaded code proof.' });
}
for (const item of read(path.join(parallel, 'finding-F218-239', 'source-membership.json')).sources)
{
    source('F218', 'finding-F218-239', item, item.artifact, item.bytes, item.blob);
}
for (const item of read(path.join(parallel, 'finding-F218-239', 'external-source.json')))
{
    external.push({ ...item, finding: 'F218', artifact: 'evidence/F218/' + item.artifact });
}
for (const item of read(path.join(parallel, 'finding-F221-234', 'source-manifest.json')))
{
    source('F221', 'finding-F221-234', item, item.artifact, item.bytes, item.blob);
}
assert.equal(sources.length, 214);
assert.equal(external.length, 20);
const objects = new Map(), reusable = new Map(), reuse = [];
for (const [directory, indexFile] of [
    [path.join(session, 'autoperf-published-results', 'F205-F207'), 'source-membership.json'],
    [path.join(parallel, 'finding-F218-239'), 'source-membership.json'],
])
{
    const index = read(path.join(directory, indexFile));
    verifyMembership(directory, index);
    for (const item of index.objects)
    {
        if (!reusable.has(item.sha))
        {
            reusable.set(item.sha, { ...item, directory });
        }
    }
}
function save(type, sha, raw, provenance)
{
    assert.equal(gitId(type, raw), sha);
    if (objects.has(sha))
    {
        assert.equal(objects.get(sha).type, type);
        assert.equal(objects.get(sha).sha256, sha256(raw));
        return;
    }
    const file = `raw-git/objects/${sha}.payload`;
    write(path.join(root, ...file.split('/')), raw);
    objects.set(sha, { type, sha, file, bytes: raw.length, sha256: sha256(raw), raw });
    if (provenance)
    {
        reuse.push({ type, sha, provenance });
    }
}
for (const item of sources)
{
    save('blob', item.blob, item.raw, { completeAcceptedCapture: item.artifact });
}
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
        const old = reusable.get(sha);
        if (old)
        {
            assert.equal(old.type, type);
            const raw = fs.readFileSync(path.join(old.directory, ...old.file.split('/')));
            assert.equal(raw.length, old.bytes);
            assert.equal(sha256(raw), old.sha256);
            save(type, sha, raw, { qualifiedArchive: old.directory, file: old.file });
        }
        else
        {
            missing.push(sha);
        }
    }
    if (!missing.length)
    {
        return;
    }
    const raw = git(`raw-${type}-batch-${commands.length}`, ['cat-file', '--batch'], Buffer.from(missing.join('\n') + '\n'));
    let offset = 0;
    for (const sha of missing)
    {
        const end = raw.indexOf(10, offset);
        assert.ok(end >= offset);
        const header = raw.subarray(offset, end).toString('ascii').match(/^([a-f0-9]{40}) (commit|tree|blob) (\d+)$/);
        assert.ok(header, raw.subarray(offset, end).toString('ascii'));
        assert.equal(header[1], sha);
        assert.equal(header[2], type);
        const size = Number(header[3]), start = end + 1;
        assert.equal(raw[start + size], 10);
        save(type, sha, raw.subarray(start, start + size));
        offset = start + size + 1;
    }
    assert.equal(offset, raw.length);
}
ensure('commit', sources.map(item => item.commit));
const pending = sources.map(item => ({ item, parts: item.path.split('/'), part: 0,
    current: objects.get(item.commit).raw.toString('utf8').match(/^tree ([a-f0-9]{40})$/m)[1] }));
while (pending.some(item => item.part < item.parts.length))
{
    const active = pending.filter(item => item.part < item.parts.length);
    ensure('tree', active.map(item => item.current));
    for (const state of active)
    {
        const entry = treeEntries(objects.get(state.current).raw).get(state.parts[state.part]);
        assert.ok(entry, state.item.path);
        const last = state.part === state.parts.length - 1;
        assert.equal(entry.mode, last ? '100644' : '40000');
        state.current = entry.sha;
        state.part++;
        if (last)
        {
            assert.equal(state.current, state.item.blob);
        }
    }
}
const membership = { objects: [...objects.values()].map(({ raw, ...item }) => item),
    sources: sources.map(({ raw, ...item }) => item) };
jsonWrite(path.join(root, 'source-membership.json'), membership);
const verified = verifyMembership(root, membership);
for (const item of external)
{
    const raw = fs.readFileSync(path.join(capsule, ...item.artifact.split('/')));
    assert.equal(raw.length, item.bytes);
    assert.equal(sha256(raw), item.sha256);
    if (item.gitBlob)
    {
        assert.equal(gitId('blob', raw), item.gitBlob);
    }
}
jsonWrite(path.join(root, 'external-source.json'), external);
jsonWrite(path.join(root, 'raw-object-reuse.json'), { reuse,
    boundary: 'Only byte-revalidated immutable raw objects and complete accepted source captures reused; no repeated producer analysis or inherited native qualification.' });
const after = {
    head: git('reserved-head-after', ['rev-parse', 'HEAD']).toString('utf8'),
    status: git('reserved-status-after', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
};
assert.deepEqual(after, before);
jsonWrite(path.join(root, 'COMMANDS.json'), commands);
jsonWrite(path.join(root, 'owned-terminal.json'), { sourceUtilityRoots: commands.length,
    rootsWaitedAndStreamsDrained: commands.length, productNativeBuildTestServerRuntimeProbeOrComparisonStarts: 0,
    before, after, reservedHeadStatusEqual: true, collectorPid: process.pid,
    boundary: 'Direct synchronous git-source roots only; outer collector final tool exit requires separate observed receipt, no all-machine/descendant/idleness claim.' });
jsonWrite(path.join(root, 'ARCHIVE.json'), { findings: owners.map(item => item.finding), ownerCopies,
    rawGitVerification: verified, externalWholeSourceFingerprints: external.length,
    sourceUtilityRoots: commands.length, productNativeOrComparisonStarts: 0,
    rejectedIsNotMeasuredNoGain: true, externalMembershipBoundary: 'No external commit/tree graphs or selected binaries/runtimes.',
    finalizationRequiresIndependentPublisher: true });
for (const item of membership.objects)
{
    copy(item.file, fs.readFileSync(path.join(root, ...item.file.split('/'))));
}
for (const file of ['source-membership.json', 'external-source.json'])
{
    copy(file, fs.readFileSync(path.join(root, file)));
}
for (const relative of inventory(root).filter(item => !item.startsWith('raw-git/') && !['source-membership.json', 'external-source.json'].includes(item)))
{
    copy('evidence/parent244/' + relative, fs.readFileSync(path.join(root, ...relative.split('/'))));
}
for (const relative of [
    'Accept-Preparations-240.mjs', 'owner-acceptance-240.json',
    'Accept-Terminals-242.mjs', 'owner-retirements-242.json', 'owner-retirement-observation-242.json',
    'finding-F221-terminal-240/enclosing-tool-result.json',
])
{
    copy('evidence/parent/' + relative, fs.readFileSync(path.join(parallel, ...relative.split('/'))));
}
copy('source-objects.mjs', fs.readFileSync(path.join(session, 'autoperf-published-results', 'F240-F268', 'source-objects.mjs')));
copy('.gitattributes', Buffer.from('* -text\n'));
jsonWrite(path.join(capsule, 'evidence-index.json'), { files: evidence, ownerCopies,
    boundary: 'Every copied owner directory includes all indexed payloads and excluded envelopes; outer244 tool receipt is additive before publication seal.' });
console.log(JSON.stringify({ completeOwnerFiles: ownerCopies.reduce((sum, item) => sum + item.completeCopiedFiles, 0),
    completeCopiedEvidenceFiles: evidence.length, sourceMemberships: verified.memberships, rawGitObjects: verified.objects,
    externalWholeSourceFingerprints: external.length, terminalSourceUtilityRoots: commands.length,
    nativeProductOrComparisonStarts: 0, outerCollectorToolExitNotSelfAttested: true }));
