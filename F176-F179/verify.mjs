import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
function local(file)
{
    assert.equal(path.isAbsolute(file), false);
    assert.equal(file.split(/[\\/]/).includes('..'), false);
    return path.join(root, ...file.split('/'));
}
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const read = file => JSON.parse(fs.readFileSync(local(file), 'utf8').replace(/^\uFEFF/, ''));
const copies = read('authoritative-copies.json'), ids = ['F176', 'F177', 'F178', 'F179'];
assert.equal(new Set(copies.map(item => item.file)).size, copies.length);
for (const item of copies)
{
    const bytes = fs.readFileSync(local(item.file));
    assert.equal(bytes.length, item.bytes, item.file);
    assert.equal(hash(bytes), item.sha256, item.file);
}
const ownerFiles = copies.filter(item => item.file.startsWith('owner-handoff/'));
assert.equal(ownerFiles.length, 4770);
assert.equal(ownerFiles.reduce((sum, item) => sum + item.bytes, 0), 212441232);
const owner = local('owner-handoff');
const result = spawnSync(process.execPath, ['--permission', '--allow-fs-read=' + owner, '--no-addons', path.join(owner, 'Audit.cjs')],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
assert.ifError(result.error);
assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
const audit = JSON.parse(result.stdout.trim());
assert.deepEqual(audit, read('coordinator-portable-audit.json'));
assert.equal(audit.result, 'PASS');
assert.equal(audit.manifestSha256, 'CF26CE886CDEF8494E699A471FDE7A086E4007AD4F1E8184ACFB25D7FFAA4F6F');
assert.equal(audit.selectedFiles, 4768);
assert.equal(audit.selectedBytes, 211453517);
assert.equal(audit.pePdbPairs, 24);
assert.equal(audit.pdbDocuments, 3946);
assert.equal(audit.actualRawDocumentsChecked, 3940);
assert.equal(audit.embeddedSourceDocumentsChecked, 162);
assert.equal(audit.historicalLogicalDocumentsWithoutRawBytes, 6);
assert.equal(audit.pinnedSourceProofs, 2762);
assert.equal(audit.rawCommitTreeObjects, 154);
assert.equal(audit.nativeRuns.length, 8);
assert.equal(audit.nativeRuns.reduce((sum, item) => sum + item.rows, 0), 44);
assert.equal(audit.nativeTesthostExitSnapshotsMissing, 4);
assert.equal(audit.compilerAttempts.length, 5);
assert.equal(audit.compilerAttempts.filter(item => item.actualCompilerStarted).length, 4);
assert.equal(audit.compilerAttempts.filter(item => item.successful).length, 2);
assert.equal(audit.remainingKnownOwnedNative, 0);
assert.equal(audit.historicalHoldExactIdentitiesReconciled, 591);
assert.deepEqual(audit.supplemental, [{ role: 'original', rows: 9, checks: 94 }, { role: 'default', rows: 9, checks: 94 }]);
const xml = read('coordinator-independent-system-xml.json'), results = read('owner-handoff/RESULTS.json');
assert.equal(xml.actualParser, 'System.Xml.XmlDocument');
assert.equal(xml.actualPassedExecutions, 44);
assert.equal(xml.actualUniqueSelectedCases, 11);
assert.equal(xml.actualUniqueNativeMethods, 9);
assert.equal(xml.actualDistinctParameterizedCases, 3);
assert.equal(xml.actualParameterizedExecutionsAcrossRolesAndModes, 12);
assert.equal(xml.actualMissingHistoricalNativeManagedExitSnapshots, 4);
assert.equal(xml.actualXmlPassDoesNotSubstituteForMissingManagedExitSnapshots, true);
for (const report of xml.runs)
{
    const matches = results.nativeRuns.filter(item => item.role === report.role && item.kind === report.kind && item.mode === report.mode);
    assert.equal(matches.length, 1);
    assert.equal(hash(fs.readFileSync(local('owner-handoff/' + matches[0].trx))), report.sha256);
}
const seal = read('owner-closing/SEALED-HANDOFF.json'), terminal = read('owner-closing/FINAL-TERMINAL.json');
assert.equal(seal.agentId, '06005641-57b2-4fa5-856c-b2bf4bf642e9');
assert.equal(seal.finalTerminal.finalKnownNativeClosingAndOfflineAuditorIdentities, 646);
assert.equal(seal.finalTerminal.remainingRecordedOwned, 0);
assert.equal(seal.finalTerminal.bothStreamsDrained, true);
assert.equal(hash(fs.readFileSync(local('owner-closing/FINAL-TERMINAL.json'))), seal.finalTerminal.sha256);
for (const key of ['actualRemainingRecordedOwnedProcesses', 'actualRemainingOwnedNativeRoots',
    'actualRemainingObservedChildren', 'actualRemainingSourceHeavyAuditors'])
{
    assert.deepEqual(terminal[key], []);
}
assert.equal(terminal.bothStreamsDrained, true);
const budgets = read('closed-budgets.json');
assert.deepEqual(budgets.map(item => item.findingId), ids);
for (const budget of budgets)
{
    assert.equal(budget.maximumComparisons, 3);
    assert.equal(budget.closed, true);
    assert.deepEqual(budget.authorizations, []);
    assert.equal(budget.actualUnusedAuthorizationsPermanentlyClosed, 3);
}
const acceptance = read('coordinator-acceptance.json');
assert.equal(acceptance.actualMissingHistoricalNativeManagedExitSnapshots, 4);
assert.equal(acceptance.actualHistoricalLogicalDocumentsWithoutRawBytes, 6);
assert.equal(acceptance.actualNoFullNativeManagedExitClosureAttestation, true);
assert.equal(acceptance.actualWholeClosingDefaultBuiltOrTested, false);
if (process.argv.includes('--require-seal'))
{
    for (const item of read('capsule-file-hashes.json').files)
    {
        const bytes = fs.readFileSync(local(item.file));
        assert.equal(bytes.length, item.bytes);
        assert.equal(hash(bytes), item.sha256);
    }
}
console.log(JSON.stringify({
    audit: 'PASS', actualCopiedFiles: copies.length, actualOwnerEnvelopeFiles: 4770, actualOwnerEnvelopeBytes: 212441232,
    actualFreshPermissionBoundedMetadataSourceAndXmlAudit: audit,
    actualSavedNativeExecutions: 44, actualUniqueSelectedNativeCases: 11,
    actualSavedSupplementalRows: 18, actualSavedSupplementalChecks: 188,
    actualFourHistoricalManagedExitSnapshotsStillMissing: true,
    actualSixHistoricalRawDocumentsStillUnattested: true,
    actualFinalKnownIdentities: 646, actualKnownOwnedRemaining: 0,
    actualNoNewNativeTargetOrCounterStarted: true,
    actualNoWholeClosingDefaultOrCompleteCompilerRuntimeExecutionClosureClaim: true,
    actualClosedZeroComparisonBudgets: 4
}, null, 2));
