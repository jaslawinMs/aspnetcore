import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const local = file => {
    assert(!path.isAbsolute(file));
    assert(!file.split(/[\\/]/).includes('..'));
    return path.join(root, ...file.split(/[\\/]/));
};
const read = file => JSON.parse(fs.readFileSync(local(file), 'utf8').replace(/^\uFEFF/, ''));
const copies = read('authoritative-copies.json');
assert.equal(new Set(copies.map(item => item.file)).size, copies.length);
for (const item of copies) {
    const bytes = fs.readFileSync(local(item.file));
    assert.equal(bytes.length, item.bytes, item.file);
    assert.equal(hash(bytes), item.sha256, item.file);
}
const ownerCopies = copies.filter(item => item.file.startsWith('owner-handoff/'));
assert.equal(ownerCopies.length, 1342);
const owner = local('owner-handoff');
const result = spawnSync(process.execPath, ['--permission', '--allow-fs-read=' + owner, '--no-addons', path.join(owner, 'Audit.mjs')],
    { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
assert.ifError(result.error);
assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
const audit = JSON.parse(result.stdout);
assert.deepEqual(audit, read('coordinator-portable-audit.json'));
assert.equal(audit.actualAudit, 'PASS');
assert.equal(audit.actualPayloadFiles, 1341);
assert.equal(audit.actualPayloadBytes, 204293410);
assert.equal(audit.actualSelectedPePdbAssociations, 8);
assert.equal(audit.actualRawDocumentsVerified, 328);
assert.equal(audit.actualEmbeddedRawDocumentsVerified, 32);
assert.equal(audit.actualCompilerReferenceImages, 317);
assert.equal(audit.actualObservedManagedImageFiles, 139);
assert.equal(audit.actualGitMemberships, 308);
assert.equal(audit.actualRawGitObjects, 186);
assert.equal(audit.actualNativePassedExecutions, 18);
assert.equal(audit.actualCommonRows, 12);
assert.equal(audit.actualCommonChecks, 192);
const receipt = read('coordinator-audit-075/exit.json');
assert.equal(receipt.exit, 0);
assert.equal(receipt.actualRootTerminal, true);
assert.equal(receipt.actualStreamsDrained, true);
assert.equal(receipt.actualManifestSha256, '1ADCD10D302968101BA2420101F28192BD2040BF31F281EB26BE2B73D56E099B');
const budgets = read('closed-budgets.json');
assert.deepEqual(budgets.map(item => item.findingId), ['F237', 'F238']);
for (const budget of budgets) {
    assert.equal(budget.maximumComparisons, 3);
    assert.equal(budget.closed, true);
    assert.deepEqual(budget.authorizations, []);
    assert.equal(budget.actualUnusedAuthorizationsPermanentlyClosed, 3);
}
const acceptance = read('coordinator-acceptance.json');
assert.equal(acceptance.outcome, 'rejected');
assert.equal(acceptance.actualNotMeasuredNoGainOrZeroCost, true);
assert.equal(acceptance.actualPublicMvcCoreBuilderNotFullMvcAggregateBoundary, true);
assert.equal(acceptance.actualOriginalNativeRootZeroButWrapperOwnershipFailurePreserved, true);
assert.equal(acceptance.actualUnrelatedPrivateProcessArraysNotPublished, true);
assert.equal(acceptance.actualNoCandidateIndexOrAllocationEquivalenceEstablished, true);
assert.equal(acceptance.actualAllSelectedRawDocuments, 328);
if (process.argv.includes('--require-seal')) {
    for (const item of read('capsule-file-hashes.json').files) {
        const bytes = fs.readFileSync(local(item.file));
        assert.equal(bytes.length, item.bytes);
        assert.equal(hash(bytes), item.sha256);
    }
}
console.log(JSON.stringify({
    audit: 'PASS', actualCopiedFiles: copies.length, actualOwnerEnvelopeFiles: 1342,
    actualPermissionBoundedFreshOwnerAudit: audit,
    actualHistoricalWrapperAndCommonFailuresPreserved: true,
    actualNoUnrelatedProcessArraysOrCandidateEquivalenceOrPerformanceClaim: true,
    actualClosedZeroComparisonBudgets: 2
}, null, 2));
