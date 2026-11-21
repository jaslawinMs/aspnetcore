import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sha256, verifyMembership } from './source-objects.mjs';

const root = path.resolve(process.argv[2] ?? import.meta.dirname);
function content(relative)
{
    const resolved = path.resolve(root, relative.replaceAll('\\', path.sep));
    assert.ok(resolved.startsWith(root + path.sep), relative);
    return fs.readFileSync(resolved);
}
const read = relative => JSON.parse(content(relative).toString('utf8').replace(/^\uFEFF/, ''));
function check(relative, bytes, hash)
{
    const raw = content(relative);
    assert.equal(raw.length, bytes, relative);
    assert.equal(sha256(raw), hash, relative);
}
const evidence = read('evidence-index.json');
for (const item of evidence.files)
{
    check(item.file, item.bytes, item.sha256);
}
for (const [finding, indexName, property] of [
    ['F240', 'ARTIFACT_SHA256.json', 'files'],
    ['F268', 'artifact-index.json', 'entries'],
])
{
    const index = read(`evidence/${finding}/${indexName}`);
    for (const item of index[property])
    {
        check(`evidence/${finding}/${item.path}`, item.bytes, item.sha256);
    }
    assert.equal(content(`evidence/${finding}/candidate.diff`).length, 0);
}
const discovery = read('evidence/F240/HANDOFF.json');
assert.equal(discovery.status, 'complete-no-candidate-at-source-materiality-gate');
assert.equal(discovery.changes.candidate, null);
assert.deepEqual(discovery.changes.productFiles, []);
assert.deepEqual(discovery.changes.privateGraphsCreated, []);
assert.equal(discovery.validation.nativeRowsExecuted, 0);
assert.equal(discovery.validation.comparisons, 0);
assert.equal(discovery.validation.initialSourceAttempt.passed, 7);
assert.equal(discovery.validation.finalSourceAttempt.passed, 8);
const sourceChecks = read('evidence/F240/validation/source-check-results.json');
assert.equal(sourceChecks.length, 8);
assert.ok(sourceChecks.every(item => item.passed === true));
const analysis = read('evidence/F240/SOURCE_ANALYSIS.json');
assert.equal(analysis.cardinality.realOptInSite.acceptedHelpersFromSource.length, 1);
assert.equal(analysis.cardinality.builtInSourcePopulations['Microsoft.AspNetCore.Mvc.TagHelpersConcreteDeclarations'], 20);
assert.equal(analysis.cardinality.builtInSourcePopulations['Microsoft.AspNetCore.Mvc.RazorAdditionalConcreteDeclarations'], 3);
const broadcast = read('evidence/F268/HANDOFF.json');
assert.equal(broadcast.disposition, 'COMPLETE_NO_MATERIAL_CANDIDATE_QUALIFIED');
assert.equal(broadcast.sourceFindingConfirmed, true);
assert.equal(broadcast.candidateApplied, false);
assert.deepEqual(broadcast.changes.shippingFiles, []);
assert.deepEqual(broadcast.changes.privateGraphsCreated, []);
assert.equal(broadcast.nativeSafety.dotnetInvocations, 0);
assert.equal(broadcast.nativeSafety.comparisons, 0);
assert.equal(broadcast.nativeSafety.timingsWarmupsProfilesCounters, 0);
const original = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const current = 'd3483989953ae3cccd773aea5ea04cb0c7198531';
assert.equal(broadcast.sourcePins.original, original);
assert.equal(broadcast.sourcePins.freshDefault, current);
const membership = read('source-membership.json');
assert.ok(membership.sources.every(item => item.commit === (item.role === 'original' ? original : current)));
assert.deepEqual([...new Set(membership.sources.map(item => item.finding))].sort(), ['F240', 'F268']);
const verified = verifyMembership(root, membership);
for (const [finding, sourcePath, blob] of [
    ['F240', 'src/Mvc/Mvc.Razor/src/TagHelpers/TagHelperFeatureProvider.cs', 'c0e725cf013e36a87c939f85fce1144c41589c35'],
    ['F268', 'src/SignalR/samples/SocialWeather/PersistentConnectionLifeTimeManager.cs', 'ca0b398d812784c11c1bef714aafcd5f6badf195'],
])
{
    const rows = membership.sources.filter(item => item.finding === finding && item.path === sourcePath);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map(item => item.role).sort(), ['default', 'original']);
    assert.ok(rows.every(item => item.blob === blob));
}
const sealExists = fs.existsSync(path.join(root, 'capsule-file-hashes.json'));
if (sealExists || process.argv.includes('--require-seal'))
{
    const seal = read('capsule-file-hashes.json');
    for (const item of seal.files)
    {
        check(item.file, item.bytes, item.sha256);
    }
    function inventory(directory, relative = '')
    {
        return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
        {
            assert.equal(entry.isSymbolicLink(), false);
            const logical = relative ? relative + '/' + entry.name : entry.name;
            return entry.isDirectory() ? inventory(path.join(directory, entry.name), logical) : [logical];
        });
    }
    assert.deepEqual(inventory(root).filter(item => !['capsule-file-hashes.json', 'publication.json'].includes(item)).sort(),
        seal.files.map(item => item.file).sort());
}
console.log(JSON.stringify({
    findings: ['F240', 'F268'],
    copiedEvidenceFilesVerified: evidence.files.length,
    rawGitObjectsVerified: verified.objects,
    sourceMembershipsVerified: verified.memberships,
    sourceChecksPassed: 8,
    nativeBuildsTestsAndRuntimeProbes: 0,
    performanceComparisons: 0,
    candidateChanges: 0,
    offlineSourceOnly: true,
}));
