import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitId, sha256, treeEntries, verifyMembership } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const root = import.meta.dirname, parallel = path.dirname(root), session = path.dirname(parallel);
const repo = String.raw`C:\src\aspnetcore`;
const capsule = path.join(session, 'autoperf-published-results', 'F150-F206-F215-F220');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const logical = value => value.replaceAll('\\', '/').replace(/^\.\//, '');
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
    assert.deepEqual(Object.keys(policy.independentFindingPreparationWorkers).sort(), ['F209', 'F225', 'F227', 'F229']);
    assert.equal(policy.actualWorkerBuildHoldActive, false);
    assert.equal(policy.buildAndTestWorkQuiesced, false);
    assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
    return { observedUtc: new Date().toISOString(), policySha256: sha256(raw),
        actualRegisteredOwners: policy.independentFindingPreparationWorkers,
        actualScopes: policy.activeWorkerPreparationScopes, leaseExists: false, HOLD: false, quiesced: false,
        boundary: 'Point read-only source archiving, not product/runtime/comparison admission or machine idleness.' };
}
const commands = [];
function git(label, argv, input)
{
    const observation = guard(), startedUtc = new Date().toISOString();
    const args = ['--no-pager', '-C', repo, ...argv];
    const result = spawnSync('git', args, { cwd: repo, input, windowsHide: true,
        timeout: 90000, maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', GIT_PAGER: '' } });
    const prefix = path.join(root, 'commands', String(commands.length + 1).padStart(3, '0') + '-' + label);
    write(prefix + '.stdout', result.stdout ?? Buffer.alloc(0));
    write(prefix + '.stderr', result.stderr ?? Buffer.alloc(0));
    if (input) write(prefix + '.stdin', input);
    const record = { label, executable: 'git', argv: args, cwd: repo, pid: result.pid, observation,
        startedUtc, endedUtc: new Date().toISOString(), exitCode: result.status, signal: result.signal,
        launchError: result.error?.message ?? null, stdout: logical(path.relative(root, prefix + '.stdout')),
        stderr: logical(path.relative(root, prefix + '.stderr')),
        stdin: input ? logical(path.relative(root, prefix + '.stdin')) : null,
        rootWaited: true, redirectedStreamsDrained: true };
    commands.push(record);
    jsonWrite(prefix + '.json', record);
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
    { finding: 'F150', folder: 'finding-F150-246', index: 'seal-005.json', indexed: 295,
        hash: '98ACDFC4D0378A1DA5981A9CE240B6AF5863E06AC9567C81297DD39FF5F88264',
        envelopes: ['seal-005.json', 'seal-005-launch.stdout.bin', 'seal-005-launch.stderr.bin', 'seal-005-launch.result.json'] },
    { finding: 'F206', folder: 'finding-F206-245', index: 'WHOLE-SEAL-v1.json', indexed: 331,
        hash: '6A0A5162A3B6BDF7E312025842E6C1EC1DECFFCC9477E3242E3A057B74F690EC',
        envelopes: ['WHOLE-SEAL-v1.json'] },
    { finding: 'F215', folder: 'finding-F215-249', index: 'HASHES.json', indexed: 144,
        hash: '2444E822B24D98CEDA4A36F2FCAE4854DC718AE0DDD293217DDE4397FE90E900',
        envelopes: ['HASHES.json', 'HANDOFF.json'] },
    { finding: 'F220', folder: 'finding-F220-243', index: 'HASHES.json', indexed: 1365,
        hash: 'E57279DEF6F66F198738746B814EB433347B69A2BDCE72A06F623E03DA180737',
        envelopes: ['HASHES.json', 'HASHES.sha256'] },
];
const evidence = [], copied = new Set(), ownerCopies = [];
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
    const entries = JSON.parse(indexRaw).files;
    assert.equal(entries.length, owner.indexed);
    for (const item of entries)
    {
        const raw = fs.readFileSync(path.join(directory, ...item.path.split(/[\\/]/)));
        assert.equal(raw.length, item.bytes, item.path);
        assert.equal(sha256(raw), item.sha256, item.path);
    }
    const complete = inventory(directory).sort();
    assert.deepEqual(complete, [...new Set([...entries.map(x => logical(x.path)), ...owner.envelopes])].sort());
    for (const file of complete)
    {
        copy('evidence/' + owner.finding + '/' + file, fs.readFileSync(path.join(directory, ...file.split('/'))));
    }
    ownerCopies.push({ finding: owner.finding, indexedPayloads: entries.length, completeCopiedFiles: complete.length,
        disposition: 'source-qualified-no-material-candidate', productNativeOrComparisonStarts: 0 });
}
assert.equal(ownerCopies.reduce((sum, item) => sum + item.completeCopiedFiles, 0), 2144);
const sources = [], external = [];
const roleNames = { original: 'Original', default: 'Default', Original: 'Original', Default: 'Default' };
function source(finding, folder, item, capture, suppliedBlob)
{
    const raw = fs.readFileSync(path.join(parallel, folder, ...capture.split(/[\\/]/)));
    assert.equal(raw.length, item.bytes);
    assert.equal(sha256(raw), item.sha256);
    const blob = gitId('blob', raw);
    if (suppliedBlob) assert.equal(blob, suppliedBlob);
    assert.match(item.commit, /^[a-f0-9]{40}$/);
    assert.ok(roleNames[item.role]);
    sources.push({ finding, role: roleNames[item.role], commit: item.commit, path: logical(item.path), blob,
        artifact: 'evidence/' + finding + '/' + logical(capture), bytes: raw.length, sha256: sha256(raw), raw });
}
for (const item of read(path.join(parallel, 'finding-F150-246', 'closure-003', 'source-manifest.json')).sources)
{
    source('F150', 'finding-F150-246', { ...item, path: item.repositoryPath }, item.evidencePath);
}
const initial206 = read(path.join(parallel, 'finding-F206-245', 'collection-initial-v1.json'));
const closure206 = read(path.join(parallel, 'finding-F206-245', 'collection-closure-v1.json'));
for (const item of [...initial206.copiedFiles, ...closure206.files].filter(x => ['Original', 'Default'].includes(x.role)))
{
    const commit = item.commit ?? (item.role === 'Original' ? initial206.originalCommit : initial206.defaultCommit);
    source('F206', 'finding-F206-245', { ...item, commit, path: item.logicalPath }, item.path);
}
external.push({ finding: 'F206', role: 'DeclaredPackageContract', package: 'xunit.assert', version: '2.9.2',
    path: 'xunit.assert-2.9.2.xml', artifact: 'evidence/F206/source/ExternalContract/xunit.assert-2.9.2.xml',
    bytes: 279602, sha256: 'B54F3EBB1456B497ADAA27E7FD4AA879109A32430D9D46F63503FC1AA5DEC829',
    representation: 'Whole existing local package XML fingerprint; not external Git membership, selected binary, overload compilation or running assertion proof.' });
for (const item of read(path.join(parallel, 'finding-F215-249', 'source-membership.json')).sources)
{
    source('F215', 'finding-F215-249', item, item.artifact, item.blob);
}
for (const item of read(path.join(parallel, 'finding-F215-249', 'external-source.json')))
{
    external.push({ ...item, finding: 'F215', artifact: 'evidence/F215/' + item.artifact });
}
for (const file of ['source-bindings-003.json', 'source-bindings-004.json', 'source-bindings-005.json', 'source-bindings-006.json'])
{
    for (const item of read(path.join(parallel, 'finding-F220-243', file)))
    {
        assert.equal(item.repository, 'dotnet/aspnetcore');
        source('F220', 'finding-F220-243', { ...item, path: item.repositoryPath }, item.artifact, item.gitBlob);
    }
}
for (const file of ['dependency-source-bindings-005.json', 'dependency-source-bindings-006.json', 'dependency-source-bindings-007.json'])
{
    for (const item of read(path.join(parallel, 'finding-F220-243', file)))
    {
        external.push({ finding: 'F220', role: item.role, repository: item.repository, commit: item.commit,
            path: logical(item.repositoryPath), artifact: 'evidence/F220/' + logical(item.artifact),
            bytes: item.bytes, sha256: item.sha256, gitBlob: item.gitBlob,
            representation: 'Whole declared-version source/blob fingerprint, not external raw commit/tree membership or selected loaded code.' });
    }
}
assert.equal(sources.length, 334);
assert.equal(external.length, 39);
const objects = new Map(), reusable = new Map(), reuse = [];
for (const directory of [path.join(session, 'autoperf-published-results', 'F212-F217-F218-F221'),
    path.join(parallel, 'finding-F215-249')])
{
    const index = read(path.join(directory, 'source-membership.json'));
    verifyMembership(directory, index);
    for (const item of index.objects)
    {
        if (!reusable.has(item.sha)) reusable.set(item.sha, { ...item, directory });
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
    if (provenance) reuse.push({ type, sha, provenance });
}
for (const item of sources) save('blob', item.blob, item.raw, { completeAcceptedCapture: item.artifact });
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
        const size = Number(header[3]), start = end + 1;
        assert.equal(raw[start + size], 10);
        save(type, sha, raw.subarray(start, start + size));
        offset = start + size + 1;
    }
    assert.equal(offset, raw.length);
}
ensure('commit', sources.map(x => x.commit));
const pending = sources.map(item => ({ item, parts: item.path.split('/'), part: 0,
    current: objects.get(item.commit).raw.toString('utf8').match(/^tree ([a-f0-9]{40})$/m)[1] }));
while (pending.some(x => x.part < x.parts.length))
{
    const active = pending.filter(x => x.part < x.parts.length);
    ensure('tree', active.map(x => x.current));
    for (const state of active)
    {
        const entry = treeEntries(objects.get(state.current).raw).get(state.parts[state.part]);
        assert.ok(entry, state.item.path);
        const last = state.part === state.parts.length - 1;
        if (last)
        {
            assert.ok(['100644', '100755'].includes(entry.mode));
            state.item.mode = entry.mode;
        }
        else assert.equal(entry.mode, '40000');
        state.current = entry.sha;
        state.part++;
        if (last) assert.equal(state.current, state.item.blob);
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
    if (item.gitBlob) assert.equal(gitId('blob', raw), item.gitBlob);
}
jsonWrite(path.join(root, 'external-source.json'), external);
jsonWrite(path.join(root, 'raw-object-reuse.json'), { reuse,
    boundary: 'Only byte-verified raw objects/complete captures reused, never inherited native/behavior/performance qualification.' });
const after = {
    head: git('reserved-head-after', ['rev-parse', 'HEAD']).toString('utf8'),
    status: git('reserved-status-after', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
};
assert.deepEqual(after, before);
jsonWrite(path.join(root, 'COMMANDS.json'), commands);
jsonWrite(path.join(root, 'owned-terminal.json'), { sourceUtilityRoots: commands.length,
    rootsWaitedAndStreamsDrained: commands.length, productNativeBuildTestServerRuntimeProbeOrComparisonStarts: 0,
    before, after, reservedHeadStatusEqual: true, collectorPid: process.pid,
    boundary: 'Direct synchronous read-only Git roots; no universal descendant/machine-idleness or future timing claim.' });
jsonWrite(path.join(root, 'ARCHIVE.json'), { findings: owners.map(x => x.finding), ownerCopies,
    rawGitVerification: verified, externalWholeSourceFingerprints: external.length, sourceUtilityRoots: commands.length,
    productNativeOrComparisonStarts: 0, rejectedIsNotMeasuredNoGain: true,
    externalMembershipBoundary: 'No external commit/tree graphs or selected executing package/CLR/browser images.',
    finalizationRequiresIndependentPublisher: true });
for (const item of membership.objects) copy(item.file, fs.readFileSync(path.join(root, ...item.file.split('/'))));
for (const file of ['source-membership.json', 'external-source.json']) copy(file, fs.readFileSync(path.join(root, file)));
for (const file of inventory(root).filter(x => !x.startsWith('raw-git/') && !['source-membership.json', 'external-source.json'].includes(x)))
{
    copy('evidence/parent260/' + file, fs.readFileSync(path.join(root, ...file.split('/'))));
}
for (const file of ['Accept-Terminals-254.mjs', 'Accept-Terminals-255.mjs', 'accepted-terminals-255.json',
    'owner-retirements-255.json', 'Accept-F220-258.mjs', 'accepted-F220-258.json', 'owner-retirement-F220-258.json',
    'finding-F215-terminal-251/enclosing-tool-result.json'])
{
    copy('evidence/parent/' + file, fs.readFileSync(path.join(parallel, ...file.split('/'))));
}
for (const file of ['README.md', 'verify.mjs', 'source-objects.mjs', '.gitattributes'])
{
    const raw = fs.readFileSync(path.join(capsule, file));
    assert.equal(copied.has(file), false);
    evidence.push({ file, bytes: raw.length, sha256: sha256(raw) });
}
jsonWrite(path.join(capsule, 'evidence-index.json'), { files: evidence, ownerCopies,
    boundary: 'All owner payloads/envelopes and actual terminal receipts; separate actual collector tool result added after return, before publisher seal.' });
console.log(JSON.stringify({ completeOwnerFiles: 2144, completeCopiedEvidenceFiles: evidence.length,
    sourceMemberships: verified.memberships, rawGitObjects: verified.objects,
    externalWholeSourceFingerprints: external.length, terminalSourceUtilityRoots: commands.length,
    productNativeOrComparisonStarts: 0, outerCollectorToolExitNotSelfAttested: true }));
