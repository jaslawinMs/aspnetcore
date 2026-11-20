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
assert.equal(ownerCopies.length, 1116);
assert.equal(ownerCopies.reduce((sum, item) => sum + item.bytes, 0), 125264656);
assert.equal(hash(fs.readFileSync(local('owner-handoff/MANIFEST.json'))),
    '7A1558B13701B99AFE1058C1D711A3CDDF67E8215FB562EA9F608E5C181C690D');
const owner = local('owner-handoff');
const child = spawnSync(process.execPath, ['--permission', '--allow-fs-read=' + owner, path.join(owner, 'Audit.cjs')], {
    cwd: owner, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024
});
assert.ifError(child.error);
assert.equal(child.status, 0, child.stderr + '\n' + child.stdout);
const audit = JSON.parse(child.stdout);
assert.equal(audit.result, 'PASS');
assert.equal(audit.readOnly, true);
assert.deepEqual([audit.manifestFiles, audit.manifestBytes, audit.freshUniquePeImages,
    audit.freshUniquePortablePdbs, audit.associatedPdbPairs, audit.rawPdbDocuments, audit.gitMerkleSourceProofs,
    audit.nativeReports, audit.nativeRowExecutions, audit.commonConsumerCompilations, audit.dotnetInvocations],
    [1114, 125036802, 199, 7, 7, 229, 262, 4, 44, 1, 23]);
assert.deepEqual(audit.supplemental.map(item => [item.rows, item.checks]), [[6, 156], [6, 156]]);
assert.deepEqual(json('coordinator-portable-audit.json'), audit);
const ids = ['F173', 'F174', 'F175'], acceptance = json('coordinator-acceptance.json');
assert.deepEqual(acceptance.findings, ids);
assert.equal(acceptance.outcome, 'rejected');
assert.equal(acceptance.actualTestSupportNotShippingProductionStores, true);
assert.equal(acceptance.actualNativeManagedOwnerMvidObserved, false);
assert.equal(acceptance.actualSupplementalManagedOwnerAndManagerMvidObserved, true);
assert.equal(acceptance.actualNotMeasuredNoGainOrZeroCost, true);
const xml = json('coordinator-independent-system-xml.json');
assert.equal(xml.actualParser, 'System.Xml.XmlDocument');
assert.equal(xml.actualAllExactNamesDefinitionsEntriesExecutionsCountersReconciled, true);
assert.equal(xml.actualPassedExecutions, 44);
assert.equal(xml.actualUniqueFacts, 11);
assert.equal(xml.runs.length, 4);
for (const run of xml.runs)
{
    const logical = path.win32.relative(acceptance.actualHistoricalOwnerCapsulePath, run.file).replaceAll('\\', '/');
    assert.equal(hash(fs.readFileSync(local('owner-handoff/' + logical))), run.sha256);
    assert.equal(run.actualRows, 11);
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
    actualOwnerEnvelopeFiles: 1116, actualOwnerEnvelopeBytes: 125264656,
    actualFreshPermissionBoundedMetadataSourceAndXmlAudit: audit,
    actualHistoricalNativeExecutionsNotNewRuns: 44, actualUniqueNativeFacts: 11,
    actualHistoricalSupplementalRowsNotNewRuns: 12, actualHistoricalSupplementalAssertions: 312,
    actualClosedZeroComparisonBudgets: 3, actualNoNativeTargetOrCounterStarted: true,
    actualOmittedFullImagesRehashed: false, actualFullCompilerInputOrExecutionClosureAttestation: false }, null, 2));
