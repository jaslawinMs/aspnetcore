import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gitId, sha256, verifyMembership } from './source-objects.mjs';

const root = path.resolve(process.argv[2] ?? import.meta.dirname);
function content(relative)
{
    const file = path.resolve(root, ...relative.split(/[\\/]/));
    assert.ok(file.startsWith(root + path.sep), relative);
    return fs.readFileSync(file);
}
const json = relative => JSON.parse(content(relative).toString('utf8').replace(/^\uFEFF/, ''));
function checked(relative, bytes, hash)
{
    const raw = content(relative);
    assert.equal(raw.length, bytes, relative);
    assert.equal(sha256(raw), hash.toUpperCase(), relative);
    return raw;
}
const evidence = json('evidence-index.json');
assert.equal(new Set(evidence.files.map(item => item.file)).size, evidence.files.length);
for (const item of evidence.files)
{
    checked(item.file, item.bytes, item.sha256);
}
function files(directory, relative = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const logical = relative ? relative + '/' + entry.name : entry.name;
        return entry.isDirectory() ? files(path.join(directory, entry.name), logical) : [logical];
    });
}
const ownerSpecs = [
    ['F212', 'artifact-index-008.json', 'files', 'bytes', 312, ['HANDOFF.json', 'artifact-index-008.json', 'artifact-seal-008.json']],
    ['F217', 'HANDOFF.json', 'artifactIndex', 'length', 918, ['HANDOFF.json', 'SEAL.json']],
    ['F218', 'HASHES.json', 'files', 'bytes', 155, ['HASHES.json', 'HANDOFF.json']],
    ['F221', 'artifact-index.json', 'entries', 'bytes', 396, ['artifact-index.json', 'SEAL.json']],
];
for (const [finding, index, field, size, count, envelopes] of ownerSpecs)
{
    const prefix = 'evidence/' + finding + '/', entries = json(prefix + index)[field];
    assert.equal(entries.length, count);
    for (const item of entries)
    {
        checked(prefix + item.path, item[size], item.sha256);
    }
    assert.deepEqual(files(path.join(root, 'evidence', finding)).sort(),
        [...new Set([...entries.map(item => item.path.replaceAll('\\', '/')), ...envelopes])].sort());
}
const membership = json('source-membership.json'), graph = verifyMembership(root, membership);
assert.equal(graph.memberships, 214);
const counts = Object.fromEntries(['F212', 'F217', 'F218', 'F221'].map(id =>
    [id, membership.sources.filter(item => item.finding === id).length]));
assert.deepEqual(counts, { F212: 59, F217: 84, F218: 34, F221: 37 });
for (const item of membership.sources)
{
    assert.equal(gitId('blob', checked(item.artifact, item.bytes, item.sha256)), item.blob);
}
const external = json('external-source.json');
assert.equal(external.length, 20);
for (const item of external)
{
    const raw = checked(item.artifact, item.bytes, item.sha256);
    if (item.gitBlob)
    {
        assert.equal(gitId('blob', raw), item.gitBlob);
    }
    if (item.finding === 'F218')
    {
        assert.equal(item.actualLoadedRuntimeObserved, false);
        const declaration = membership.sources.find(source => source.finding === 'F218' &&
            source.role === item.role && source.path === 'eng/Version.Details.xml');
        const versions = content(declaration.artifact).toString('utf8');
        assert.ok(versions.includes('<Sha>' + item.commit + '</Sha>'));
    }
}
const pseal = json('evidence/F212/artifact-seal-008.json');
assert.equal(sha256(content('evidence/F212/artifact-index-008.json')), pseal.artifactIndexSha256);
const photino = json('evidence/F212/HANDOFF.json'), pterminal = json('evidence/F212/native-terminal-008.json');
assert.equal(photino.disposition, 'SOURCE_ONLY_INTENTIONAL_DISPATCH_NO_MATERIAL_CANDIDATE');
assert.equal(photino.candidate.created, false);
assert.deepEqual(photino.validation.tests, []);
assert.deepEqual(photino.validation.performance, []);
assert.equal(pterminal.directReadOnlyRootCount, 36);
assert.equal(pterminal.allDirectRootsExited, true);
assert.equal(pterminal.allDirectStreamsDrained, true);
assert.deepEqual(pterminal.outstandingOwnedNativeWork, []);
const pipeSeal = json('evidence/F217/SEAL.json'), pipeTerminal = json('evidence/F217/native-terminal-summary.json');
assert.equal(sha256(content('evidence/F217/HANDOFF.json')), pipeSeal.handoffSha256);
assert.equal(pipeTerminal.nativeRoots, 124);
assert.equal(pipeTerminal.observedChildIdentities, 228);
assert.equal(pipeTerminal.allRootsWaitsAndBothStreamsTerminal, true);
assert.equal(pipeTerminal.allRecordedObservedChildrenTerminal, true);
assert.deepEqual(pipeTerminal.dotnetRoots, []);
assert.deepEqual(pipeTerminal.testRoots, []);
assert.deepEqual(pipeTerminal.buildRoots, []);
assert.deepEqual(pipeTerminal.outstandingOwnedWork, []);
const discovery = json('evidence/F218/HANDOFF.json');
assert.equal(sha256(content('evidence/F218/HASHES.json')), discovery.indexSha256);
assert.equal(discovery.nativeProductBuildTestRestoreServerRuntimeProbeStarts, 0);
assert.equal(discovery.candidateEdits, 0);
assert.equal(discovery.performanceAuthorizationsOrMeasurements, 0);
assert.equal(discovery.decision, 'bounded-source-only-no-material-candidate');
const analyzerSeal = json('evidence/F221/SEAL.json');
checked('evidence/F221/' + analyzerSeal.artifactIndex.path, analyzerSeal.artifactIndex.bytes, analyzerSeal.artifactIndex.sha256);
checked('evidence/F221/' + analyzerSeal.handoff.path, analyzerSeal.handoff.bytes, analyzerSeal.handoff.sha256);
assert.equal(analyzerSeal.disposition, 'source-only-no-material-candidate');
assert.equal(analyzerSeal.measuredNoGain, false);
assert.equal(analyzerSeal.sourceHelperRootsVerified, 6);
assert.equal(analyzerSeal.directSourceCommandsVerified, 95);
assert.equal(analyzerSeal.candidateDiff.bytes, 0);
assert.deepEqual(analyzerSeal.ownedBuildTestApplicationWorkOutstanding, []);
const actualSealer = json('evidence/parent/finding-F221-terminal-240/enclosing-tool-result.json');
assert.equal(actualSealer.actualReturnedResult.exitCode, 0);
assert.equal(actualSealer.actualReturnedResult.completed, true);
assert.equal(actualSealer.originalToolCall.shellId, 'f221-seal-001');
const archive = json('evidence/parent244/ARCHIVE.json'), commands = json('evidence/parent244/COMMANDS.json');
assert.equal(archive.rawGitVerification.memberships, 214);
assert.equal(archive.rawGitVerification.objects, graph.objects);
assert.equal(archive.productNativeOrComparisonStarts, 0);
assert.equal(commands.length, archive.sourceUtilityRoots);
assert.ok(commands.every(item => item.exitCode === 0 && item.rootWaited && item.redirectedStreamsDrained));
const preparation = json('preparation-terminal.json');
assert.equal(preparation.actualToolCompleted, true);
assert.equal(preparation.actualToolExitCode, 0);
assert.equal(preparation.actualCollectorReplayedOrEdited, false);
if (fs.existsSync(path.join(root, 'capsule-file-hashes.json')) || process.argv.includes('--require-seal'))
{
    const seal = json('capsule-file-hashes.json');
    for (const item of seal.files)
    {
        checked(item.file, item.bytes, item.sha256);
    }
    assert.deepEqual(files(root).filter(item => !['capsule-file-hashes.json', 'publication.json'].includes(item)).sort(),
        seal.files.map(item => item.file).sort());
}
console.log(JSON.stringify({ findings: ['F212', 'F217', 'F218', 'F221'],
    completeOwnerFiles: evidence.ownerCopies.reduce((sum, item) => sum + item.completeCopiedFiles, 0),
    completeCopiedEvidenceFiles: evidence.files.length, sourceMemberships: graph.memberships, rawGitObjects: graph.objects,
    sourceMembershipCounts: counts, externalWholeSourceFingerprints: external.length,
    sourceOnly: true, candidateEdits: 0, nativeProductBuildTestServerRuntimeProbeOrComparisons: 0,
    externalCommitTreeGraphsOrSelectedImagesQualified: false, outerSourceStreamLimitationsRetained: true }));
