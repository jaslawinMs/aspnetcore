import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
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
assert.equal(hash(fs.readFileSync(local('owner-handoff/MANIFEST.json'))),
    '6E85A131CD9045C579E72CC861D13AB9DB970B946B0DE96F6C9879B1328135FF');
const ownerCopies = copies.filter(item => item.file.startsWith('owner-handoff/'));
assert.equal(ownerCopies.length, 175);
assert.equal(ownerCopies.reduce((sum, item) => sum + item.bytes, 0), 51534666);
const child = spawnSync(process.execPath, [local('owner-handoff/Audit.cjs')], {
    cwd: local('owner-handoff'), encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024
});
assert.ifError(child.error);
assert.equal(child.status, 0, child.stderr + '\n' + child.stdout);
const audit = JSON.parse(child.stdout);
assert.equal(audit.result, 'PASS');
assert.equal(audit.selectedFiles, 175);
assert.equal(audit.selectedBytes, 51534666);
assert.equal(audit.freshlyParsedPePdbPairs, 8);
assert.equal(audit.freshlyParsedRawPdbDocuments, 26);
assert.deepEqual(audit.nativeXml.map(report => report.rows), [15, 0, 15]);
assert.equal(audit.nativeImageDifferences, 48);
const require = createRequire(import.meta.url), metadata = require(local('owner-handoff/Metadata.cjs'));
const reference = fs.readFileSync(local('owner-handoff/selected/reference/netstandard.dll'));
const dict = metadata.typeMethods(reference, 'System.Collections.Generic', 'Dictionary`2');
const set = metadata.typeMethods(reference, 'System.Collections.Generic', 'HashSet`1');
assert.equal(dict.includes('TryAdd'), false);
assert.equal(set.includes('Add'), true);
const clarification = json('coordinator-membership-clarification.json');
assert.equal(hash(reference), clarification.actualReferenceSha256);
assert.deepEqual(set, clarification.actualFreshlyDecodedHashSetMethodNames);
assert.equal(clarification.actualF161AllVariableUsages.storedValuesRead, false);
assert.equal(clarification.actualF162AllVariableUsages.storedValuesRead, false);
assert.equal(clarification.actualMissingDictionaryTryAddDoesNotExcludeCompatibleSetAlternative, true);
const ids = ['F160', 'F161', 'F162'], acceptance = json('coordinator-acceptance.json');
assert.deepEqual(acceptance.findings, ids);
assert.equal(acceptance.outcome, 'rejected');
assert.equal(acceptance.actualF160AlreadyTryGetValueConsumesExistingClassName, true);
assert.equal(acceptance.actualCompatibleAlternativeRuledOut, false);
assert.equal(acceptance.actualAllVersionsSuccessfulCommonCompiles, 2);
assert.equal(acceptance.actualStrictOneSuccessfulCompileAcrossAllAttemptsMet, false);
assert.equal(acceptance.actualDetailedDefaultPrivateProbeIsTargetOnlyUnderOriginalProducerRuntime62, true);
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
assert.equal(coordinator.actualNativePassedExecutions, 30);
assert.equal(coordinator.actualIndependentRealSystemXmlReports.reduce((sum, report) => sum + report.actualRows, 0), 30);
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
    actualOwnerCapsuleFiles: 175, actualOwnerCapsuleBytes: 51534666,
    actualFreshSelectedMetadataAndXmlAuditor: audit,
    actualDeclaredReferenceDictionaryTryAdd: false, actualDeclaredReferenceHashSetAdd: true,
    actualCompatibleAlternativeNotRuledOut: true, actualHistoricalNativePassesNotNewRuns: 30,
    actualGeneratorRowsPerNativeRole: 13, actualFixtureRowsPerNativeRole: 2,
    actualAcceptedV2SuccessfulCompiles: 1, actualAllVersionsSuccessfulCompiles: 2,
    actualDetailedDefaultProbeIsTargetOnly: true, actualClosedZeroComparisonBudgets: ids.length,
    actualOnlyNodeAuditChildStarted: true, actualNoNativeTargetOrCounterStarted: true,
    actualOmittedFullImagesRehashed: false, actualFullCompilerInputAttestation: false }, null, 2));
