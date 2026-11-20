import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const local = logical => {
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
assert.equal(hash(fs.readFileSync(local('owner-handoff/manifest.json'))),
    '3BBC7086B1A713D0E23450FDAB57FA06FA6F7BC3FA41BBBAB846C0B2AB979442');
const ownerCopies = copies.filter(item => item.file.startsWith('owner-handoff/'));
assert.equal(ownerCopies.length, 166);
assert.equal(ownerCopies.reduce((sum, item) => sum + item.bytes, 0), 32960208);
const child = spawnSync(process.execPath, ['--permission', '--allow-fs-read=' + local('owner-handoff'),
    local('owner-handoff/audit.mjs')], {
    cwd: local('owner-handoff'), encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024
});
assert.ifError(child.error);
assert.equal(child.status, 0, child.stderr + '\n' + child.stdout);
const audit = JSON.parse(child.stdout);
assert.equal(audit.result, 'PASS');
assert.equal(audit.selectedFiles, 166);
assert.equal(audit.nativePassed, 58);
assert.equal(audit.supplementalPassed, 14);
assert.equal(audit.freshPePdbPairsIncludingCommon, 9);
assert.equal(audit.freshPdbDocumentRawSourceChecks, 43);
assert.equal(audit.savedDeclaredDifferences, 2948);
const ids = ['F163', 'F164', 'F165'], acceptance = json('coordinator-acceptance.json');
assert.deepEqual(acceptance.findings, ids);
assert.equal(acceptance.outcome, 'rejected');
assert.equal(acceptance.actualF163CachedMetadataNotPerRenderEnumeration, true);
assert.equal(acceptance.actualF163LiveMetadataDeltaExecution, false);
assert.equal(acceptance.actualF164MixedCaseFinalFrozenLookupObserved, false);
assert.equal(acceptance.actualF165PublicScopedCollisionProducerAndExactJsonObserved, true);
assert.equal(acceptance.actualF165InternalConventionProducesNonemptyCollidingScopes, false);
assert.equal(acceptance.actualF165ScopedBranchUniversallyUnreachableClaimed, false);
assert.equal(acceptance.actualF165MaterialApplicationMergeFrequencyOrScopedDatasetEstablished, false);
const budgets = json('closed-budgets.json');
assert.deepEqual(budgets.map(budget => budget.findingId), ids);
for (const budget of budgets)
{
    assert.equal(budget.closed, true);
    assert.equal(budget.actualComparisons, 0);
    assert.deepEqual(budget.authorizations, []);
    assert.equal(budget.actualUnusedAuthorizationsPermanentlyClosed, 3);
}
const coordinator = json('coordinator-whole-payload-verification.json');
assert.equal(coordinator.actualNativePassedExecutions, 58);
assert.equal(coordinator.actualIndependentRealSystemXmlReports.length, 5);
assert.equal(coordinator.actualIndependentRealSystemXmlReports.reduce((sum, report) => sum + report.actualRows, 0), 58);
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
    actualOwnerCapsuleFiles: 166, actualOwnerCapsuleBytes: 32960208,
    actualFreshSelectedMetadataAndXmlAuditor: audit,
    actualHistoricalPassedExecutionsNotNewRuns: 58, actualDistinctNativeCasesPerSourceRole: 29,
    actualHistoricalSupplementalCompositeChecks: 14, actualClosedZeroComparisonBudgets: ids.length,
    actualOnlyPermissionBoundedNodeAuditChildStarted: true, actualNoNativeTargetOrCounterStarted: true,
    actualOmittedFullImagesRehashed: false, actualFullCompilerInputAttestation: false }, null, 2));
