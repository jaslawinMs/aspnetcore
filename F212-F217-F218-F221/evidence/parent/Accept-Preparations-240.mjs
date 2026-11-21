import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = import.meta.dirname;
const sha256 = raw => crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
function checked(directory, relative, bytes, expected)
{
    const file = path.resolve(directory, ...relative.split(/[\\/]/));
    assert.ok(file.startsWith(directory + path.sep));
    const raw = fs.readFileSync(file);
    if (bytes !== undefined)
    {
        assert.equal(raw.length, bytes, relative);
    }
    assert.equal(sha256(raw), expected, relative);
    return raw;
}
const analyzer = path.join(root, 'finding-F221-234');
const handoff = read(path.join(analyzer, 'HANDOFF.json')), seal = read(path.join(analyzer, 'SEAL.json'));
checked(analyzer, 'HANDOFF.json', 14564, 'C24C0B23E528F812F3EC975D12E613D7FAC71FC1830790B5721E42D767D77759');
checked(analyzer, 'SEAL.json', undefined, 'CD36360C99DF93BF8057C29182F55F4135596E5125B97FA7C098445F80E89AE3');
const index = JSON.parse(checked(analyzer, seal.artifactIndex.path, seal.artifactIndex.bytes, seal.artifactIndex.sha256));
assert.equal(index.entries.length, 396);
assert.equal(new Set(index.entries.map(item => item.path)).size, 396);
let analyzerBytes = 0;
for (const item of index.entries)
{
    analyzerBytes += checked(analyzer, item.path, item.bytes, item.sha256).length;
}
assert.equal(handoff.terminalDisposition, 'source-only-no-material-candidate');
assert.equal(handoff.implementationCreated, false);
assert.equal(handoff.measuredNoGain, false);
assert.deepEqual(handoff.outstandingWorkerWork, []);
const processes = read(path.join(analyzer, 'process-summary.json'));
assert.equal(processes.rootCount, 6);
assert.equal(processes.directSourceCommandCount, 95);
assert.equal(processes.allDirectSourceChildrenWaitedAndStreamsDrained, true);
assert.deepEqual(processes.outstandingOwnedBuildTestApplicationWork, []);
for (const item of processes.observedSourceHelperRoots)
{
    assert.equal(item.waited, true);
    assert.equal(item.stdoutDrained, true);
    assert.equal(item.stderrDrained, true);
    const receipt = read(path.join(analyzer, item.receipt));
    assert.equal(receipt.exitCode, item.exitCode);
}
for (const item of processes.directSourceCommands)
{
    assert.equal(item.waitedAndBothStreamsDrained, true);
}
const prerequisite = path.join(root, 'finding-F209-235');
const proposal = JSON.parse(checked(prerequisite, 'PROPOSAL.json', 16603,
    '6290CF6538B80F1296DBB93DE08DBE18EBCD79B5C176EB326F0496FAAE8EEA26'));
const proposalSeal = read(path.join(prerequisite, 'PROPOSAL.seal.json'));
const proposalIndex = JSON.parse(checked(prerequisite, proposalSeal.index.path, undefined, proposalSeal.index.sha256));
assert.equal(proposalIndex.files.length, 13);
for (const item of proposalIndex.files)
{
    checked(prerequisite, item.path, item.bytes, item.sha256);
}
assert.equal(proposal.own235Actions.nativeStarts, 0);
assert.equal(proposal.own235Actions.copiedFiles, 0);
assert.equal(proposal.own235Actions.old226Writes, 0);
assert.equal(read(path.join(prerequisite, 'seal-proposal-235-002.outer-exit.json')).exitCode, 0);
const full235 = fs.readdirSync(prerequisite, { withFileTypes: true }).map(entry =>
{
    assert.equal(entry.isFile(), true);
    const raw = fs.readFileSync(path.join(prerequisite, entry.name));
    return { file: entry.name, bytes: raw.length, sha256: sha256(raw) };
});
const map = read(path.join(prerequisite, 'private-host-file-map-235.json'));
assert.equal(map.mappings.length, 200);
assert.equal(new Set(map.mappings.map(item => item.destinationRelative.toLowerCase())).size, 200);
const runtimeRoot = String.raw`C:\.tools\.nuget\packages\microsoft.netcore.app.runtime.win-x64\12.0.0-alpha.1.26569.107`;
const muxer = String.raw`C:\src\aspnetcore\.dotnet\dotnet.exe`;
const distinct = new Map();
for (const item of map.mappings)
{
    assert.ok(!path.isAbsolute(item.destinationRelative));
    assert.ok(item.destinationRelative.split(/[\\/]/).every(part => part && part !== '.' && part !== '..'));
    assert.ok(item.source.path === muxer || item.source.path.startsWith(runtimeRoot + path.sep));
    if (!distinct.has(item.source.path))
    {
        const raw = fs.readFileSync(item.source.path);
        assert.equal(raw.length, item.source.bytes);
        assert.equal(sha256(raw), item.source.sha256);
        distinct.set(item.source.path, item.source);
    }
}
assert.equal(distinct.size, 199);
const receipt = {
    recordedUtc: new Date().toISOString(),
    F221: { indexedFiles: 396, bytesRehashed: analyzerBytes, handoffSha256: seal.handoff.sha256,
        accepted: 'Bounded source-only no material candidate, not runtime/Roslyn/diagnostic-output/no-gain evidence.',
        terminalSourceHelperRoots: 6, terminalDirectSourceCommands: 95,
        actualFailuresRetained: ['Python alias9009', 'Node malformed parent policy1'],
        finalSealer: 'Worker returned after final synchronous sealer; report explicitly distinguishes six source-helper roots from final sealer40476 with no external children. No native work admitted.',
        retirementAuthorized: true, campaignFinalized: false },
    F209235: { indexedFiles: 13, allPresentRegularFilesRehashed: full235,
        proposalSha256: proposalSeal.proposal.sha256, proposedDestinationFiles: 200, distinctSourceFilesRevalidated: 199,
        accepted: 'Exact complete proposed private host/framework file-map source identities only; NOT runnable/selected runtime, SDK/test class, materiality or native authority.',
        old226RecollectionOrWrite: false, loggingOwnershipStillBlocksClass: true,
        futureScopeRequires: 'Fresh physical destination/new finite explicit authority; no install/copy/activation/native follows from this acceptance.',
        ownerRetired: false },
    coordinatorNativeProductOrBenchmarkStarts: 0,
    policyWritesByThisAcceptor: 0
};
fs.writeFileSync(path.join(root, 'owner-acceptance-240.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ F221: { indexedFiles: 396, bytes: analyzerBytes, sourceOnly: true },
    F209235: { indexedFiles: 13, wholePresentFiles: full235.length, mapEntries: 200, distinctSources: 199, sourceOnly: true },
    retirementAuthorized: ['F221'], campaignFinalized: false, nativeStarts: 0 }));
