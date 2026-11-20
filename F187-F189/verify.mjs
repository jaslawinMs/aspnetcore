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
assert.equal(ownerCopies.length, 2282);
assert.equal(ownerCopies.reduce((sum, item) => sum + item.bytes, 0), 273471048);
const owner = local('owner-handoff');
const result = spawnSync(process.execPath, ['--permission', '--allow-fs-read=' + owner, '--no-addons', path.join(owner, 'Audit.mjs')],
    { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
assert.ifError(result.error);
assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
const audit = JSON.parse(result.stdout);
assert.deepEqual(audit, read('coordinator-portable-audit.json'));
assert.equal(audit.result, 'PASS');
assert.equal(audit.manifestSha256.toUpperCase(), '70CC382BF8830CE01DAA356D9D27960393CAFE75E0C67E3545513058CC0E567B');
assert.equal(audit.nativeRows, 38);
assert.equal(audit.acceptedCommonRows, 12);
assert.equal(audit.acceptedAssertions, 256);
assert.equal(audit.successfulCommonCompilations, 2);
assert.equal(audit.failedCommonCompilations, 0);
assert.equal(audit.selectedRawPdbDocumentChecks, 96);
const xml = read('coordinator-independent-system-xml.json');
assert.equal(xml.actualParser, 'System.Xml.XmlDocument');
assert.equal(xml.actualPassedExecutions, 38);
assert.equal(xml.actualUniqueSelectedCases, 19);
assert.equal(xml.actualUniqueNativeMethods, 16);
assert.equal(xml.actualDistinctCaseSensitiveTheoryCases, 4);
assert.equal(xml.actualTheoryExecutionsAcrossRoles, 8);
assert.equal(xml.actualNativeFrameworkAssertionCountUninstrumented, true);
for (const report of xml.runs) {
    assert.equal(hash(fs.readFileSync(local('owner-handoff/' + report.file))), report.sha256);
}
const seal = read('owner-closing/SEALED.json');
assert.equal(seal.agentId, 'a46e395c-3977-48fa-b406-4126e927dd1e');
assert.equal(seal.terminalBoundary.recordedCommands, 81);
assert.equal(seal.terminalBoundary.priorRecordedCreationsAlive, 0);
assert.equal(seal.terminalBoundary.allRecordedRootsExited, true);
assert.equal(seal.terminalBoundary.allRecordedStreamsDrained, true);
assert.equal(hash(fs.readFileSync(local('owner-closing/post-audit-identity.json'))), seal.terminalBoundary.postAuditSnapshot.sha256.toUpperCase());
const budgets = read('closed-budgets.json');
assert.deepEqual(budgets.map(item => item.findingId), ['F187', 'F188', 'F189']);
for (const budget of budgets) {
    assert.equal(budget.maximumComparisons, 3);
    assert.equal(budget.closed, true);
    assert.deepEqual(budget.authorizations, []);
    assert.equal(budget.actualUnusedAuthorizationsPermanentlyClosed, 3);
}
const acceptance = read('coordinator-acceptance.json');
assert.equal(acceptance.outcome, 'rejected');
assert.equal(acceptance.actualNotMeasuredNoGainOrZeroCost, true);
assert.equal(acceptance.actualNestedControllerExcludedInActualHostedFixtureTargetNeverInvoked, true);
assert.equal(acceptance.actualWholeLaterDefaultBuiltOrTested, false);
if (process.argv.includes('--require-seal')) {
    for (const item of read('capsule-file-hashes.json').files) {
        const bytes = fs.readFileSync(local(item.file));
        assert.equal(bytes.length, item.bytes);
        assert.equal(hash(bytes), item.sha256);
    }
}
console.log(JSON.stringify({
    audit: 'PASS', actualCopiedFiles: copies.length, actualOwnerEnvelopeFiles: 2282,
    actualOwnerEnvelopeBytes: 273471048, actualPermissionBoundedFreshOwnerAudit: audit,
    actualIndependentSavedNativeExecutions: 38, actualIndividualTheoryExecutions: 8,
    actualAcceptedCommonCases: 12, actualAcceptedAssertions: 256,
    actualNestedTargetNotInvokedOrMisrepresentedAsEmptyResultExecution: true,
    actualNoNativeRerunOrPerformanceClaim: true, actualClosedZeroComparisonBudgets: 3
}, null, 2));
