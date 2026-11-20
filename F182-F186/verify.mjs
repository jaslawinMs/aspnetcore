import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const local = logical =>
{
    assert.ok(!path.isAbsolute(logical) && !logical.includes(':') && !logical.split(/[\\/]/).includes('..'));
    return path.join(root, ...logical.split(/[\\/]/));
};
const json = logical => JSON.parse(fs.readFileSync(local(logical), 'utf8').replace(/^\uFEFF/, ''));
const copies = json('authoritative-copies.json');
for (const item of copies)
{
    const bytes = fs.readFileSync(local(item.file));
    assert.equal(bytes.length, item.bytes);
    assert.equal(hash(bytes), item.sha256);
}
const ownerCopies = copies.filter(item => item.file.startsWith('owner-handoff/'));
assert.equal(ownerCopies.length, 2177);
assert.equal(ownerCopies.reduce((sum, item) => sum + item.bytes, 0), 215578869);
assert.equal(hash(fs.readFileSync(local('owner-handoff/MANIFEST.json'))),
    '47595CC253AD1A5FBF42ED633EB77D8A8CA38AEEC0BF78729E9084908BDC8959');
const owner = local('owner-handoff');
const child = spawnSync(process.execPath, ['--permission', '--allow-fs-read=' + owner, '--no-addons', path.join(owner, 'Audit.cjs')], {
    cwd: owner, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024
});
assert.ifError(child.error);
assert.equal(child.status, 0, child.stderr + '\n' + child.stdout);
// Both retained auditors deliberately print one top-level, pretty-printed JSON document.
const documents = child.stdout.trim().split(/\r?\n(?=\{)/).map(text => JSON.parse(text));
assert.equal(documents.length, 2);
const [historical, audit] = documents;
assert.equal(historical.result, 'PASS');
assert.equal(historical.manifestSha256, '7A1558B13701B99AFE1058C1D711A3CDDF67E8215FB562EA9F608E5C181C690D');
assert.equal(audit.result, 'PASS');
assert.equal(audit.readOnly, true);
assert.equal(audit.scope, 'NEW F182-F186 preparation; findings remain PENDING');
assert.deepEqual([audit.manifestFiles, audit.manifestBytes, audit.freshUniquePeImages,
    audit.freshUniquePortablePdbs, audit.associatedPdbPairs, audit.rawPdbDocuments, audit.gitMerkleSourceProofs,
    audit.newNativeReports, audit.newNativeRowExecutions, audit.newCommonConsumerCompilations, audit.newDotnetRoots],
    [2175, 215124551, 204, 11, 7, 229, 262, 2, 18, 1, 12]);
assert.deepEqual(audit.supplemental.map(item => [item.nativeRows, item.supplementalRows, item.assertions]), [[9, 9, 185], [9, 9, 185]]);
assert.deepEqual(json('coordinator-portable-audit.json'), audit);
const ids = ['F182', 'F183', 'F184', 'F185', 'F186'], acceptance = json('coordinator-acceptance.json');
assert.deepEqual(acceptance.findings, ids);
assert.equal(acceptance.outcome, 'rejected');
assert.equal(acceptance.actualTestSupportNotShippingProductionStores, true);
assert.equal(acceptance.actualNewNativeManagedReflectionMvidObserved, false);
assert.equal(acceptance.actualSupplementalManagedOwnerAndManagerMvidObserved, true);
assert.equal(acceptance.actualNotMeasuredNoGainOrZeroCost, true);
assert.equal(acceptance.actualNoNewSQLiteFixtureExecutionClaimed, true);
const xml = json('coordinator-independent-system-xml.json');
assert.equal(xml.actualParser, 'System.Xml.XmlDocument');
assert.equal(xml.actualAllExactNamesDefinitionsEntriesExecutionsCountersReconciled, true);
assert.equal(xml.actualPassedExecutions, 18);
assert.equal(xml.actualUniqueFacts, 9);
assert.equal(xml.runs.length, 2);
for (const run of xml.runs)
{
    const logical = path.win32.relative(acceptance.actualHistoricalOwnerCapsulePath, run.file).replaceAll('\\', '/');
    assert.equal(hash(fs.readFileSync(local('owner-handoff/' + logical))), run.sha256);
    assert.equal(run.actualRows, 9);
    assert.ok(run.rows.every(row => row.outcome === 'Passed'));
}
for (const budget of json('closed-budgets.json'))
{
    assert.ok(ids.includes(budget.findingId));
    assert.equal(budget.closed, true);
    assert.equal(budget.actualComparisons, 0);
    assert.deepEqual(budget.authorizations, []);
    assert.equal(budget.actualUnusedAuthorizationsPermanentlyClosed, 3);
}
assert.deepEqual(json('closed-budgets.json').map(item => item.findingId), ids);
const seal = json('owner-closing/SEALED.json');
assert.equal(seal.actualAgentId, 'd766df6d-0b55-44d6-846d-7050b83f2eea');
assert.equal(seal.actualRemainingOwnedNativeRootsOrObservedChildren, 0);
assert.equal(seal.allRecordedStreamsAndObservedDescendantsDrained, true);
if (process.argv.includes('--require-seal'))
{
    for (const item of json('capsule-file-hashes.json').files)
    {
        const bytes = fs.readFileSync(local(item.file));
        assert.equal(bytes.length, item.bytes);
        assert.equal(hash(bytes), item.sha256);
    }
}
console.log(JSON.stringify({ audit: 'PASS', actualUnchangedCopiedFiles: copies.length,
    actualOwnerEnvelopeFiles: 2177, actualOwnerEnvelopeBytes: 215578869,
    actualFreshPermissionBoundedMetadataSourceAndXmlAudit: audit,
    actualAttributedHistoricalAuditNotNewCoverage: historical.manifestSha256,
    actualHistoricalNewNativeExecutionsNotReruns: 18, actualUniqueNewNativeFacts: 9,
    actualHistoricalSupplementalRowsNotReruns: 18, actualHistoricalSupplementalAssertions: 370,
    actualClosedZeroComparisonBudgets: 5, actualNoNativeTargetOrCounterStarted: true,
    actualOmittedFullImagesRehashed: false, actualFullCompilerInputOrExecutionClosureAttestation: false }, null, 2));
