import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gitId, sha256, verifyMembership } from './source-objects.mjs';

const root = path.resolve(process.argv[2] ?? import.meta.dirname);
function content(relative)
{
    const resolved = path.resolve(root, relative.replaceAll('\\', path.sep));
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
for (const item of evidence.files)
{
    checked(item.file, item.bytes, item.sha256);
}
for (const [finding, indexName, property, checksumName] of [
    ['F190', 'HASHES.json', 'entries', 'HASHES.sha256'],
    ['F191', 'HASH_INDEX.json', 'files', 'HASH_INDEX.sha256'],
])
{
    const index = json(`evidence/${finding}/${indexName}`);
    const checksum = content(`evidence/${finding}/${checksumName}`).toString('utf8').match(/[a-f0-9]{64}/i)[0].toUpperCase();
    assert.equal(sha256(content(`evidence/${finding}/${indexName}`)), checksum);
    for (const item of index[property])
    {
        checked(`evidence/${finding}/${item.path}`, item.bytes, item.sha256);
    }
}
const links = json('evidence/F190/HANDOFF.json');
assert.equal(links.disposition, 'bounded-no-candidate');
assert.equal(links.candidateRetained, false);
assert.deepEqual(links.implementation.privateGraphsCreated, []);
assert.deepEqual(links.implementation.shippingFilesEdited, []);
assert.equal(links.validation.nativeRowsExecuted, 0);
assert.equal(links.validation.comparisonCount, 0);
assert.equal(links.producerSummary.nonNullInitializerSites, 16);
assert.equal(links.producerSummary.stringArraySites, 12);
assert.equal(links.producerSummary.realDeferredPipelineSites, 4);
assert.equal(links.producerSummary.blazorNullConstructionSites, 7);
assert.equal(links.producerSummary.observedNativeRuntimeTypes, false);
const linkChecks = json('evidence/F190/source-audit-results.json');
assert.equal(linkChecks.checks.length, 67);
assert.ok(linkChecks.checks.every(item => item.passed === true));
assert.equal(content('evidence/F190/candidate.diff').length, 0);
const diagnostics = json('evidence/F191/HANDOFF.json');
assert.equal(diagnostics.status, 'complete-no-candidate');
assert.equal(diagnostics.reasonCode, 'REAL_PRODUCER_ALREADY_MATERIALIZES_INDEXED_ARRAY');
assert.equal(diagnostics.candidate.created, false);
assert.equal(diagnostics.nativeAndTests.nativeBuildStarts, 0);
assert.equal(diagnostics.nativeAndTests.nativeTestStarts, 0);
assert.equal(diagnostics.nativeAndTests.comparisonCount, 0);
assert.equal(diagnostics.rawEvidence.originalCanonicalCallSites, 189);
assert.equal(diagnostics.rawEvidence.defaultCanonicalCallSites, 201);
assert.equal(diagnostics.rawEvidence.runtimeDiagnosticCountsObserved, false);
assert.ok(diagnostics.privateGraphs.every(item => item.createdByThisTask === false && item.exists === false));
const diagnosticChecks = json('evidence/F191/SOURCE_QUALIFICATION_CHECKS.json');
assert.equal(diagnosticChecks.allPassed, true);
assert.ok(diagnosticChecks.validations.every(item => item.passed === true));
for (const role of ['Original', 'Default'])
{
    assert.equal(content(`evidence/F191/changes-${role}.patch`).length, 0);
}
const sourceIndex = json('source-membership.json');
const objects = verifyMembership(root, sourceIndex);
const sourceKey = item => `${item.finding}/${item.role}/${item.path}`;
const sourceMap = new Map(sourceIndex.sources.map(item => [sourceKey(item), item]));
const roles = new Map([
    ['original', '37e809ead5824bc753a1c3d56f11615bdb1296c5'],
    ['default', 'd3483989953ae3cccd773aea5ea04cb0c7198531'],
    ['reservedguidance', '24875ef5dabb55567870b39f6eb0002170435e2f'],
]);
const expectedSourceKeys = [];
for (const [finding, name] of [['F190', 'source-bindings.json'], ['F191', 'SOURCE_FILES.json']])
{
    for (const item of json(`evidence/${finding}/${name}`))
    {
        const role = item.role.toLowerCase();
        const relative = item.repositoryPath.replaceAll('\\', '/');
        const key = `${finding}/${role}/${relative}`;
        expectedSourceKeys.push(key);
        const membership = sourceMap.get(key);
        assert.ok(membership, key);
        assert.equal(membership.commit, roles.get(role));
        assert.equal(item.commit, membership.commit);
        if (item.gitBlob)
        {
            assert.equal(membership.blob, item.gitBlob);
        }
        const raw = checked(`evidence/${finding}/${item.artifact}`, item.bytes, item.sha256);
        const gitRaw = content(`raw-git/objects/${membership.blob}.payload`);
        if (membership.captureRepresentation === 'guidance-worktree-crlf-lf-projection')
        {
            assert.equal(finding, 'F191');
            assert.equal(role, 'reservedguidance');
            assert.deepEqual(Buffer.from(raw.toString('utf8'), 'utf8'), raw);
            assert.deepEqual(Buffer.from(raw.toString('utf8').replaceAll('\r\n', '\n'), 'utf8'), gitRaw);
            assert.notDeepEqual(raw, gitRaw);
        }
        else
        {
            assert.equal(membership.captureRepresentation, 'raw-git-bytes');
            assert.equal(gitId('blob', raw), membership.blob);
            assert.deepEqual(raw, gitRaw);
        }
    }
}
assert.deepEqual([...sourceMap.keys()].sort(), expectedSourceKeys.sort());
const linq = json('evidence/F190/linq-source-bindings.json');
assert.equal(linq.length, 14);
for (const item of linq)
{
    assert.equal(item.repository, 'dotnet/dotnet');
    assert.equal(item.actualExecutingRuntimeObserved, false);
    assert.equal(item.commit, item.role === 'original' ? 'dfd6ac738610ea05f42e704be82b386e71052e12' : '4f30608f5e5220a5671e61f4bd5dece130657f47');
    const raw = checked(`evidence/F190/${item.artifact}`, item.bytes, item.sha256);
    assert.equal(gitId('blob', raw), item.gitBlob);
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
    findings: ['F190', 'F191'],
    copiedEvidenceFilesVerified: evidence.files.length,
    rawGitObjectsVerified: objects.objects,
    sourceMembershipsVerified: objects.memberships,
    externalLinqBlobCapturesVerified: linq.length,
    templateSourceChecksPassed: 67,
    analyzerSourceChecksPassed: diagnosticChecks.validations.length,
    candidateChanges: 0,
    nativeBuildsTestsAndRuntimeProbes: 0,
    performanceComparisons: 0,
    offlineSourceOnly: true,
}));
