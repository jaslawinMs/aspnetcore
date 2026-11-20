import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(process.argv[2] ?? '.');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex').toUpperCase();
if (process.argv.includes('--require-seal'))
{
    for (const file of read('capsule-file-hashes.json').files)
    {
        assert.equal(fs.statSync(path.join(root, file.file)).size, file.bytes);
        assert.equal(hash(file.file), file.sha256);
    }
}
for (const file of read('authoritative-copies.json')) { assert.equal(hash(file.file), file.sha256); }
const acceptance = read('coordinator-acceptance.json');
assert.equal(acceptance.actualFrozenPayloadFilesIndependentlyRehashed, 837);
assert.equal(acceptance.actualFrozenPayloadBytes, 53887295);
assert.equal(acceptance.finalDisposition, 'rejected');
assert.equal(acceptance.subtype, 'material-optimization-unestablished');
assert.equal(acceptance.actualNoMeasuredNoGainOrJitEquivalenceClaim, true);
assert.equal(new Set(acceptance.boundedTargetGitIdentities.map(row => row.actualGitBlob)).size, 1);
const compared = read('owner-handoff/evidence/verify-only-comparison.json');
assert.equal(compared.originalAndDefaultObservedEqual, true);
assert.equal(compared.actualPassedEachVariant, 10); assert.equal(compared.skippedEachVariant, 0);
assert.equal(compared.commonHarnessCompiledExactlyOnce, true); assert.equal(compared.refusalExitCode, 2);
for (const role of ['original', 'default'])
{
    const observed = compared.outputs[role];
    assert.equal(observed.runtime, '.NET 12.0.0-alpha.1.26565.104');
    assert.equal(observed.linqSha256, '3ABB77BBE12F449B1EB633F8B772E4858D4CEBE3DD98AC9C669FF0C2A3849501');
    assert.equal(observed.sourceProof.pePdbGuidAndStampMatch, true);
    assert.equal(observed.sourceProof.pdbSourceChecksumMatches, true);
    assert.deepEqual(observed.rows.map(row => row.id).sort(), [...compared.expectedCaseIds].sort());
    for (const row of observed.rows) { assert.equal(row.passed, true, row.id); }
}
assert.equal(Object.keys(compared.commonFilesByteIdentical).length, 4);
const gate = read('owner-handoff/evidence/image-pair-audit.json');
assert.equal(gate.wholeImageHashedWithoutPrefixExclusions, true);
assert.equal(gate.commonFilesByteIdentical, true);
assert.equal(gate.eligibleForFutureOwnerOnlyPerformancePair, false);
assert.equal(gate.nonOwnerDifferenceCount, 47);
const tests = read('owner-handoff/evidence/existing-test-outcomes.json');
assert.equal(tests.sourceRevision, 'ae89581dfd24c6277b4267a9779d05f7b9f047f1');
assert.equal(tests.passed, 6); assert.equal(tests.skipped, 0); assert.equal(tests.failed, 0);
const budget = read('closed-budget.json');
assert.equal(budget.findingId, 'F134'); assert.equal(budget.closed, true); assert.deepEqual(budget.authorizations, []);
const xml = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', path.join(root, 'audit-trx.ps1'), '-CapsuleRoot', root],
    { encoding: 'utf8', windowsHide: true, maxBuffer: 1024 * 1024 });
assert.equal(xml.status, 0, xml.stderr ?? 'XML audit failed.');
console.log(JSON.stringify({ actualPortableHistoricalAuditPassed: true, actualGenuineProducerRowsPerPin: 10,
    actualCommonConsumerCompiledOnce: true, actualNonOwnerImageDifferencesPreventingCausalTiming: 47,
    actualNoCandidateComparisonOrNativeDotnetExecuted: true, actualNoMeasuredNoGainZeroCostOrJitEquivalenceClaim: true,
    actualBudgetClosedAtZeroComparisons: true, actualXmlAudit: JSON.parse(xml.stdout.replace(/^\uFEFF/, '')) }, null, 2));
