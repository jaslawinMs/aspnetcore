import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gitId, sha256, verifyMembership } from './source-objects.mjs';

const root = path.resolve(process.argv[2] ?? import.meta.dirname);
function content(relative)
{
    const resolved = path.resolve(root, ...relative.split(/[\\/]/));
    assert.ok(resolved.startsWith(root + path.sep), relative);
    return fs.readFileSync(resolved);
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
assert.equal(evidence.files.length, 2087);
assert.equal(new Set(evidence.files.map(item => item.file)).size, evidence.files.length);
for (const item of evidence.files)
{
    checked(item.file, item.bytes, item.sha256);
}
const guid = json('evidence/F192/HANDOFF.json');
const headers = json('evidence/F193/HANDOFF.json');
const tags = json('evidence/F196/HANDOFF.json');
for (const [finding, entries, expected] of [
    ['F192', guid.artifactIndex.files, 603],
    ['F193', json('evidence/F193/ARTIFACT-INDEX.sha256.json').files, 825],
    ['F196', tags.artifactIndex.files, 653],
])
{
    assert.equal(entries.length, expected);
    for (const item of entries)
    {
        checked(`evidence/${finding}/${item.path}`, item.bytes, item.sha256);
    }
}
assert.equal(guid.status, 'SEALED_SOURCE_ONLY_NO_CANDIDATE');
assert.equal(guid.acceptance.nativeGate.builds, 0);
assert.equal(guid.acceptance.nativeGate.tests, 0);
assert.equal(guid.acceptance.nativeGate.restores, 0);
assert.deepEqual(guid.changes.repositoryChangedFiles, []);
assert.deepEqual(guid.changes.graphsCreated, []);
const guidChecks = json('evidence/F192/source-audit-v1.json');
assert.equal(guidChecks.checks.length, 29);
assert.ok(guidChecks.checks.every(item => item.passed === true));
assert.equal(headers.status, 'sealed-bounded-source-level-no-candidate');
assert.equal(headers.native.dotnetInvocations, 0);
assert.equal(headers.native.benchmarkOrCounterRuns, 0);
assert.equal(headers.privateGraphsCreated, false);
assert.equal(headers.benchmarkAuthorizationsConsumed, 0);
const headerChecks = json('evidence/F193/SOURCE-CHECKS.json');
assert.equal(headerChecks.presentSourceEntries, 95);
assert.equal(headerChecks.verifications.length, 95);
assert.ok(headerChecks.verifications.every(item => item.rawBytesAndGitBlobReverified === true));
assert.equal(tags.status, 'sealed-source-only-no-material-candidate');
assert.equal(tags.retainedCandidate, null);
assert.deepEqual(tags.repositoryChanges, []);
assert.deepEqual(tags.privateGraphsCreated, []);
assert.deepEqual(tags.sourceVsRuntime.actualSourceCounts, [20, 15, 20]);
assert.equal(tags.sourceVsRuntime.staticProducerCount, 67);
assert.deepEqual(tags.sourceVsRuntime.nativeBuildTestRestoreCommands, []);
assert.equal(tags.sourceVsRuntime.comparisonBudgetConsumed, 0);
const tagAudit = json('evidence/F196/SOURCE_AUDIT.json');
assert.equal(tagAudit.verifiedMvcRawSourceEntries, 82);
assert.equal(tagAudit.sourceChecksPassed, true);
assert.equal(tagAudit.nativeBuildTestRestoreStarts, 0);
assert.equal(tagAudit.sourceSubprocessCount, 165);
assert.equal(tagAudit.sourceSubprocessesActuallyWaitedAndStreamsDrained, 165);
assert.equal(json('evidence/F196/static_producer_check_05.json').tokenCount, 67);

const membership = json('source-membership.json');
const objects = verifyMembership(root, membership);
assert.equal(membership.sources.length, 220);
for (const item of membership.sources)
{
    const capture = checked(item.captureFile, item.captureBytes, item.captureSha256);
    assert.equal(item.captureRepresentation, 'raw-git-bytes');
    assert.equal(gitId('blob', capture), item.blob);
    assert.deepEqual(capture, content(`raw-git/objects/${item.blob}.payload`));
}
const expectedSources = [
    ...json('evidence/F192/source-membership-index.json').map(item =>
        ['F192', item.role, item.revision, item.sourcePath, item.rawArtifact, item.gitBlobSha1]),
    (() =>
    {
        const item = json('evidence/F192/historical-source-membership.json');
        return ['F192', 'history-introduction', item.revision, item.sourcePath, item.artifact, item.gitBlobSha1];
    })(),
    ...json('evidence/F193/source-manifest.json').map(item =>
        ['F193', item.role, item.revision, item.gitPath, item.artifact, item.gitBlob]),
    ...json('evidence/F196/RAW_SOURCE_INDEX.json').verified.map(item =>
        ['F196', item.role, item.revision, item.gitPath, item.artifact, item.blobSha1]),
];
const key = (finding, role, commit, file) => `${finding}/${role}/${commit}/${file.replaceAll('\\', '/')}`;
assert.deepEqual(
    membership.sources.map(item => key(item.finding, item.role, item.commit, item.path)).sort(),
    expectedSources.map(item => key(...item)).sort());
for (const [finding, role, commit, file, artifact, blob] of expectedSources)
{
    const member = membership.sources.find(item => key(item.finding, item.role, item.commit, item.path) === key(finding, role, commit, file));
    assert.equal(member.captureFile, `evidence/${finding}/${artifact.replaceAll('\\', '/')}`);
    assert.equal(member.blob, blob);
}
const external = [
    ...[...json('evidence/F192/runtime-source-index-v1.json'), ...json('evidence/F192/msbuild-source-index-v1.json')].map(item =>
        ({ finding: 'F192', artifact: item.artifact.path, bytes: item.artifact.bytes, sha256: item.artifact.sha256, blob: item.gitBlobSha1 })),
    ...json('evidence/F193/external-source-manifest.json').map(item =>
        ({ finding: 'F193', artifact: item.artifact, bytes: item.bytes, sha256: item.sha256, blob: item.gitBlob })),
    ...json('evidence/F196/runtime_membership_06.json').map(item =>
        ({ finding: 'F196', artifact: item.artifact, bytes: item.bytes, sha256: item.sha256, blob: null })),
];
assert.equal(external.length, 25);
for (const item of external)
{
    const raw = checked(`evidence/${item.finding}/${item.artifact}`, item.bytes, item.sha256);
    if (item.blob !== null)
    {
        assert.equal(gitId('blob', raw), item.blob);
    }
}
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
console.log(JSON.stringify({
    findings: ['F192', 'F193', 'F196'],
    copiedEvidenceFilesVerified: evidence.files.length,
    rawGitObjectsVerified: objects.objects,
    sourceMembershipsVerified: objects.memberships,
    completeExternalSourceFingerprints: external.length,
    externalBlobIdsVerified: external.filter(item => item.blob !== null).length,
    unboundSupportingRuntimeMainFiles: 5,
    guidStaticChecksPassed: 29,
    headerCompleteSourceEntriesVerified: 95,
    tagCompleteMvcSourceEntriesVerified: 82,
    candidateChanges: 0,
    nativeBuildsTestsAndRuntimeProbes: 0,
    performanceComparisons: 0,
    offlineSourceOnly: true,
}));
