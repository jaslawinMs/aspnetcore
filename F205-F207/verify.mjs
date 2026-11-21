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
assert.equal(evidence.files.length, 802);
assert.equal(new Set(evidence.files.map(item => item.file)).size, evidence.files.length);
for (const item of evidence.files)
{
    checked(item.file, item.bytes, item.sha256);
}
for (const [finding, index, expected] of [['F205', 'ARTIFACT-INDEX-003.json', 339], ['F207', 'artifact-index-225-v002.json', 459]])
{
    const files = json(`evidence/${finding}/${index}`).files;
    assert.equal(files.length, expected);
    for (const item of files)
    {
        checked(`evidence/${finding}/${item.path}`, item.bytes, item.sha256);
    }
}
const endpointSeal = json('evidence/F205/SEAL-003.json');
const identitySeal = json('evidence/F207/SEAL-225-v002.json');
for (const [finding, entries] of [
    ['F205', [endpointSeal.handoff, endpointSeal.fullArtifactIndex]],
    ['F207', [identitySeal.unchangedHandoff, identitySeal.artifactIndex, identitySeal.originalSealPreserved, identitySeal.correction, identitySeal.terminalOwnedWork]],
])
{
    for (const item of entries)
    {
        checked(`evidence/${finding}/${item.path}`, item.bytes, item.sha256);
    }
}
assert.equal(endpointSeal.wholePreparationNoWriteCompliance, false);
assert.equal(endpointSeal.finalReservedStateRestored, true);
assert.equal(endpointSeal.nativeProductStarts, 0);
const endpoint = json('evidence/F205/HANDOFF.json');
assert.equal(endpoint.outcome, 'SOURCE_ONLY_NO_CANDIDATE');
assert.equal(endpoint.implementation.candidateCreated, false);
assert.deepEqual(endpoint.implementation.privateWorktrees, []);
assert.equal(endpoint.reservedCheckoutIncident.wholePreparationNoWriteCompliance, false);
assert.equal(endpoint.reservedCheckoutIncident.finalReservedStateRestored, true);
assert.equal(endpoint.nativeFacts.productStarts, 0);
assert.equal(endpoint.nativeFacts.performanceExecutions, 0);
assert.equal(endpoint.terminalState.matchingLiveRecordedRootsOrObservedDescendants, 0);
const identity = json('evidence/F207/HANDOFF.json');
assert.equal(identity.state, 'SOURCE_NO_CANDIDATE_MATERIALITY_NOT_ESTABLISHED');
assert.equal(identity.native.builds, 0);
assert.equal(identity.native.tests, 0);
assert.equal(identity.native.dotnet, 0);
assert.equal(identity.candidate.created, false);
const terminal = json('evidence/F207/terminal-owned-work-225.json');
assert.deepEqual(terminal.nativeBuildTestOrDotnetRuntimeRootsStarted, []);
assert.deepEqual(terminal.benchmarkRootsStarted, []);
assert.deepEqual(terminal.outstandingOwnedBuildTestOrBenchmarkWork, []);
const sourceIndex = json('source-membership.json');
const objects = verifyMembership(root, sourceIndex);
assert.equal(sourceIndex.sources.length, 155);
let captures = 0;
for (const item of sourceIndex.sources)
{
    for (const capture of item.captures)
    {
        const raw = checked(capture.file, capture.bytes, capture.sha256);
        assert.equal(gitId('blob', raw), item.blob);
        assert.deepEqual(raw, content(`raw-git/objects/${item.blob}.payload`));
        captures++;
    }
}
assert.equal(captures, 157);
const expected = [
    ...['source-membership-002.json', 'source-membership-003.json', 'source-membership-004.json'].flatMap(file =>
        json(`evidence/F205/${file}`).map(item => ({ finding: 'F205', role: item.role, commit: item.commit, path: item.path,
            blob: item.gitBlob ?? item.gitLsTree.match(/\bblob ([a-f0-9]{40})/)[1], artifact: item.rawArtifact }))),
    ...['capture-v002/source-memberships.json', 'capture-v004/source-memberships.json', 'capture-v006/source-memberships.json'].flatMap(file =>
        json(`evidence/F207/${file}`).map(item => ({ finding: 'F207', role: item.role, commit: item.commit, path: item.path,
            blob: item.gitBlobSha1, artifact: item.capture }))),
];
assert.equal(expected.length, 157);
for (const item of expected)
{
    const member = sourceIndex.sources.find(source => source.finding === item.finding && source.role === item.role
        && source.commit === item.commit && source.path === item.path.replaceAll('\\', '/'));
    assert.ok(member);
    assert.equal(member.blob, item.blob);
    assert.ok(member.captures.some(capture => capture.file === `evidence/${item.finding}/${item.artifact.replaceAll('\\', '/')}`));
}
const external = [
    ...json('evidence/F207/capture-v003/external-source-memberships.json'),
    ...json('evidence/F207/capture-v005/external-source-memberships.json'),
];
assert.equal(external.length, 16);
for (const item of external)
{
    const raw = checked('evidence/F207/' + item.capture, item.bytes, item.sha256);
    assert.equal(gitId('blob', raw), item.gitBlobSha1);
}
const commands = json('source-object-commands.json');
assert.ok(commands.every(item => item.exitCode === 0 && item.rootWaited && item.redirectedStreamsDrained));
if (fs.existsSync(path.join(root, 'capsule-file-hashes.json')) || process.argv.includes('--require-seal'))
{
    const seal = json('capsule-file-hashes.json');
    for (const item of seal.files)
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
    assert.deepEqual(files(root).filter(item => !['capsule-file-hashes.json', 'publication.json'].includes(item)).sort(),
        seal.files.map(item => item.file).sort());
}
console.log(JSON.stringify({ findings: ['F205', 'F207'], completeCopiedEvidenceFiles: 802,
    rawGitObjectsVerified: objects.objects, distinctSourceMemberships: objects.memberships, completeSourceCaptures: captures,
    completeExternalSourceBlobFingerprints: external.length, F205ActualReceiptPathViolationRetained: true,
    F205FinalRestorationNotWholePreparationCompliance: true, candidateChanges: 0,
    nativeProductBuildsTestsRuntimeProbesOrComparisons: 0, offlineSourceOnly: true }));
