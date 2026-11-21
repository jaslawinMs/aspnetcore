import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = import.meta.dirname, read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = raw => crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
const gitBlob = raw => crypto.createHash('sha1').update(`blob ${raw.length}\0`).update(raw).digest('hex');
const logical = text => text.replaceAll('\\', '/').replace(/^\.\//, '');
function files(directory, relative = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const name = relative ? relative + '/' + entry.name : entry.name;
        return entry.isDirectory() ? files(path.join(directory, entry.name), name) : [name];
    });
}
function check(file, bytes, hash)
{
    const raw = fs.readFileSync(file);
    assert.equal(raw.length, bytes, file);
    assert.equal(sha(raw), hash, file);
    return raw;
}
const policyRaw = fs.readFileSync(path.join(root, 'policy.json')), policy = JSON.parse(policyRaw);
assert.deepEqual(Object.keys(policy.independentFindingPreparationWorkers).sort(), ['F209', 'F225', 'F227', 'F229']);
assert.equal(policy.actualWorkerBuildHoldActive, false);
assert.equal(policy.buildAndTestWorkQuiesced, false);
assert.equal(fs.existsSync(path.join(root, 'benchmark-exclusive.lease.json')), false);
const specs = [
    { key: 'F225', folder: 'finding-F225-F226-256', index: 'index.json', list: 'entries', indexed: 154, complete: 156,
        hash: '933FE97F15FDF7DB60815D9AAD037162357B9C37A0D67C73449FAF84B7CC9F9D',
        extra: ['index.json', 'seal.json'], finalTool: 'Owner final response after actual completion notification reports final sealer tool exit0.' },
    { key: 'F227', folder: 'finding-F227-257', index: 'WHOLE-SEAL-v1.json', list: 'files', indexed: 190, complete: 191,
        hash: 'A6CA473FB3EC1C6DAE1E6940141C68C1C94CFD8D4EFD81F7D236FE36EF5AAB09',
        extra: ['WHOLE-SEAL-v1.json'], finalTool: 'f227-257-byte-seal-v1 actually returned0; observed owner final response after completion notification.' },
    { key: 'F229', folder: 'finding-F229-F230-259', index: 'EVIDENCE-INDEX-259.json', list: 'entries', indexed: 165, complete: 167,
        hash: 'A12FD7372A3784778EE36A90B4E00E5A4028C12FD7AEA6C7036ED95474872567',
        extra: ['EVIDENCE-INDEX-259.json', 'SEAL-259.json'], finalTool: 'f229-259-seal returned0; observed owner final response after completion notification.' },
    { key: 'F209', folder: 'finding-F209-261', index: 'artifact-index-261.json', list: 'files', indexed: 35, complete: 42,
        hash: '11B0909C8A52D163D498D65060CBC3B09D5CF3B769A257F377F2644A1F0468C0',
        extra: ['artifact-index-261.json', 'HANDOFF.seal.json', 'proposal-sealer-261.stdout', 'proposal-sealer-261.stderr',
            'proposal-sealer-261.started.json', 'proposal-sealer-261.receipt.json', 'FINALIZATION-TERMINAL-261.json'],
        finalTool: 'f209-proposal261-seal-once completed with exit code0; outside-seal FINALIZATION-TERMINAL-261.json and actual owner final response.' },
];
const accepted = [];
for (const spec of specs)
{
    const directory = path.join(root, spec.folder), indexRaw = fs.readFileSync(path.join(directory, spec.index));
    assert.equal(sha(indexRaw), spec.hash);
    const entries = JSON.parse(indexRaw)[spec.list];
    assert.equal(entries.length, spec.indexed);
    let bytes = 0;
    for (const item of entries)
    {
        const name = item.path ?? item.relativePath;
        bytes += check(path.join(directory, name), item.bytes ?? item.byteLength, item.sha256).length;
    }
    const complete = files(directory).sort();
    assert.equal(complete.length, spec.complete);
    assert.deepEqual(complete, [...new Set([...entries.map(x => logical(x.path ?? x.relativePath)), ...spec.extra])].sort());
    accepted.push({ ...spec, indexedBytesRehashed: bytes, allIndexedBytesAndCompleteInventoryVerified: true,
        completeFiles: complete.map(file => {
            const raw = fs.readFileSync(path.join(directory, file));
            return { file, bytes: raw.length, sha256: sha(raw) };
        }) });
}
const sourceBindings = [];
for (const file of ['014-initial-whole-sources.sources.json', '018-producer-whole-sources.sources.json'])
    for (const item of read(path.join(root, 'finding-F225-F226-256', file)))
    {
        const raw = check(path.join(root, 'finding-F225-F226-256', item.retainedPath), item.bytes, item.sha256);
        assert.equal(gitBlob(raw), item.blob);
        sourceBindings.push({ finding: 'F225/F226', role: item.role, path: item.repositoryPath, blob: item.blob });
    }
for (const file of ['collection-source-v1.json', 'collection-contract-history-v1.json'])
    for (const item of read(path.join(root, 'finding-F227-257', file)).files)
    {
        const raw = check(path.join(root, 'finding-F227-257', item.path), item.bytes, item.sha256);
        sourceBindings.push({ finding: 'F227', role: item.role, path: item.logicalPath, computedBlob: gitBlob(raw) });
    }
for (const item of read(path.join(root, 'finding-F229-F230-259', 'SOURCE-MANIFEST.json')).filter(x => x.kind === 'blob'))
{
    const raw = check(item.evidencePath, item.byteLength, item.sha256);
    assert.equal(gitBlob(raw), item.objectId);
    sourceBindings.push({ finding: 'F229/F230', role: item.role, path: item.repositoryPath, blob: item.objectId });
}
assert.equal(sourceBindings.length, 78);
const directory209 = path.join(root, 'finding-F209-261'), terminal209 = read(path.join(directory209, 'FINALIZATION-TERMINAL-261.json'));
assert.equal(sha(fs.readFileSync(path.join(directory209, 'HANDOFF.seal.json'))),
    'E7053046515A5840B8D0A79E737638D67D2352F6C6C2B8C6AF788389128A95B9');
for (const item of terminal209.postExitOutsideSealIdentities)
    check(path.join(directory209, item.relativePath), item.bytes, item.sha256);
check(path.join(directory209, 'HANDOFF.seal.json'), terminal209.sealedPayload.seal.bytes, terminal209.sealedPayload.seal.sha256);
assert.equal(terminal209.dataOnlySealer.exitCode, 0);
assert.equal(terminal209.dataOnlySealer.bothRawStreamCopiesCompleted, true);
assert.equal(terminal209.sourceOnlyResult.actualProductStarts, 0);
const plan209 = read(path.join(directory209, 'managed-entry-plan-261.json'));
for (const item of plan209.requiredInputBindings) check(item.path, item.bytes, item.sha256);
assert.deepEqual(plan209.argv, ['exec', String.raw`C:\src\aspnetcore\.dotnet\sdk\12.0.100-alpha.1.26557.102\dotnet.dll`, '--version']);
assert.equal(plan209.deadline.totalFutureRootAndClosureBoundMilliseconds, 70000);
const result = { observedUtc: new Date().toISOString(), policySha256: sha(policyRaw), accepted, sourceBindings,
    indexedPayloadsRehashed: accepted.reduce((sum, x) => sum + x.indexed, 0),
    completeFilesRehashed: accepted.reduce((sum, x) => sum + x.complete, 0),
    qualification: 'Independent byte/inventory/reported-terminal consistency acceptance only.78 source capture fingerprints checked; full fresh raw commit/tree/path membership remains a separate publication gate. No selected runtime/product/test/performance qualification.',
    F209: '261 source proposal accepted for parent launcher review only. No launcher or Native GO exists.250 unused commands remain closed.',
    actualOwnerRetirementsOrLedgerChanges: 0, productNativeSourceUtilityOrComparisonStarts: 0,
    ownFinalToolExit: 'Not self-attested; actual enclosing tool completion required.' };
fs.writeFileSync(path.join(root, 'accepted-preparations-265.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ indexedPayloadsRehashed: result.indexedPayloadsRehashed,
    completeFilesRehashed: result.completeFilesRehashed, sourceCaptureBindings: sourceBindings.length,
    acceptedKeys: specs.map(x => x.key), noRuntimeOrGitMembershipQualificationInferred: true }));
