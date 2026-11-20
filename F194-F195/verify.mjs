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
    return path.join(root, ...file.split('/'));
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
assert.equal(ownerCopies.length, 565);
assert.equal(ownerCopies.reduce((sum, item) => sum + item.bytes, 0), 173121037);
const owner = local('owner-handoff');
const result = spawnSync(process.execPath, ['--permission', '--allow-fs-read=' + owner, '--no-addons', path.join(owner, 'Audit.cjs')],
    { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
assert.ifError(result.error);
assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
const audit = JSON.parse(result.stdout);
assert.deepEqual(audit, read('coordinator-portable-audit.json'));
assert.equal(audit.status, 'PASS');
assert.equal(audit.manifestSHA256, '6BFC9D59D36188571CB66A0B2283707A374F9CA577A6A4C2E2D48C4C5582C128');
assert.equal(audit.selectedPEPDBPairs, 5);
assert.equal(audit.parsedRawDocumentChecksums, 70);
assert.equal(audit.rawGitObjects, 75);
assert.equal(audit.rawGitMemberships, 90);
assert.deepEqual(audit.roles.map(item => [item.role, item.native, item.supplemental, item.testHostExitCode]),
    [['Original', 11, 12, null], ['Default', 11, 12, null]]);
const xml = read('coordinator-independent-system-xml.json');
assert.equal(xml.actualParser, 'System.Xml.XmlDocument');
assert.equal(xml.actualPassedExecutions, 22);
assert.equal(xml.actualUniqueSelectedCases, 11);
assert.equal(xml.actualUniqueNativeMethods, 10);
assert.equal(xml.actualDistinctCaseSensitiveTheoryCases, 2);
assert.equal(xml.actualTheoryExecutionsAcrossRoles, 4);
assert.equal(xml.actualNativeTesthostExitCodesStillUnknown, true);
for (const report of xml.runs) {
    assert.equal(hash(fs.readFileSync(local('owner-handoff/' + report.file))), report.sha256);
}
const seal = read('owner-closing/SEALED-HANDOFF.json');
assert.equal(seal.actualCurrentOwnerId, 'bb4c15c7-3a8e-4145-b72f-7da74cfea243');
assert.equal(seal.nativeRootsAndStreams.sameIdentitiesStillObserved, 0);
assert.equal(seal.nativeRootsAndStreams.missingIdentities, 0);
assert.equal(seal.nativeRootsAndStreams.allSavedRootStreamsDrained, true);
assert.equal(seal.nativeRootsAndStreams.nativeTestHostExitCodes.Original, null);
assert.equal(seal.nativeRootsAndStreams.nativeTestHostExitCodes.Default, null);
const budgets = read('closed-budgets.json');
assert.deepEqual(budgets.map(item => item.findingId), ['F194', 'F195']);
for (const budget of budgets) {
    assert.equal(budget.maximumComparisons, 3);
    assert.equal(budget.closed, true);
    assert.deepEqual(budget.authorizations, []);
    assert.equal(budget.actualUnusedAuthorizationsPermanentlyClosed, 3);
}
const acceptance = read('coordinator-acceptance.json');
assert.equal(acceptance.outcome, 'rejected');
assert.equal(acceptance.actualNotMeasuredNoGainOrZeroCost, true);
assert.equal(acceptance.actualWholeLaterDefaultBuiltOrTested, false);
assert.equal(acceptance.actualNativeTesthostExitCodesUnknown, true);
if (process.argv.includes('--require-seal')) {
    for (const item of read('capsule-file-hashes.json').files) {
        const bytes = fs.readFileSync(local(item.file));
        assert.equal(bytes.length, item.bytes);
        assert.equal(hash(bytes), item.sha256);
    }
}
console.log(JSON.stringify({
    audit: 'PASS', actualCopiedFiles: copies.length, actualOwnerEnvelopeFiles: 565,
    actualOwnerEnvelopeBytes: 173121037, actualPermissionBoundedFreshOwnerAudit: audit,
    actualIndependentSavedNativeExecutions: 22, actualSavedSupplementalCases: 24,
    actualTwoNativeTesthostExitsStillUnknown: true, actualNoNativeRerunOrPerformanceClaim: true,
    actualClosedZeroComparisonBudgets: 2
}, null, 2));
