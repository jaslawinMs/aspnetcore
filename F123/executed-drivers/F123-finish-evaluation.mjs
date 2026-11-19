import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F123');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function node(args) {
  const started = new Date().toISOString();
  const result = spawnSync(process.execPath, args, {
    encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024
  });
  fs.appendFileSync(path.join(run, 'evaluation-driver-invocations.jsonl'), JSON.stringify({
    executable: process.execPath, arguments: args, actualStartedAt: started,
    actualCompletedAt: new Date().toISOString(), exitCode: result.status,
    launchError: result.error?.message ?? null, stdout: result.stdout ?? '', stderr: result.stderr ?? ''
  }) + '\n');
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  assert.ifError(result.error);
  assert.equal(result.status, 0);
}
const budgetPath = path.join(run, 'diagnostic-budget.json');
const budget = read(budgetPath);
assert.equal(budget.permanentlyClosed, false);
assert.equal(budget.maximum, 3);
assert.equal(budget.authorized.length, 3);
assert.ok(budget.authorized.every(item => item.state === 'completed'));
assert.deepEqual(budget.completed.map(item => item.attempt), [1, 2, 3]);
assert.deepEqual(budget.failedOrPartialAttempts, []);
assert.equal(fs.existsSync(path.join(run, 'source-comparison.lock')), false);
node([path.join(session, 'F123-verify.mjs'), run, '--open-budget', '--measurement-only', '--write-summary', '--live-images']);
const provisional = read(path.join(run, 'measurement-audit-after-attempt-003.json'));
assert.equal(provisional.actualRetainedSamples, 1152);
assert.equal(provisional.actualNumericalPrimaryTimingGateMet, false,
  'This finalizer is only for a measured no-gain result; never misclassify a qualifying candidate.');
assert.equal(provisional.actualPrimaryAllocationGateMet, false);
budget.permanentlyClosed = true;
budget.state = 'permanently-closed-no-gain';
budget.actualClosedAt = new Date().toISOString();
budget.actualReason = 'All three predeclared source comparisons completed. The declared copied-five IndexOf primary did not meet its timing or allocation gate. No retuning, replay or primary substitution.';
fs.writeFileSync(budgetPath, JSON.stringify(budget, null, 2) + '\n');
write(path.join(run, 'permanent-budget-close.json'), {
  candidate: 'F123', actualClosedAt: budget.actualClosedAt, closedBudgetSha256: sha(budgetPath),
  actualConsumedAuthorizations: 3, actualCompleteComparisons: 3, actualFailedAuthorizationNumbers: [],
  actualRetainedObservations: 1152, actualUnusedTimingSlotsPermanentlyClosed: 0,
  actualNeverReopenRetuneOrReplay: true
});
node([path.join(session, 'F123-verify.mjs'), run, '--measurement-only', '--write-summary', '--live-images']);
const audit = read(path.join(run, 'measurement-audit.json'));
write(path.join(run, 'decision.json'), {
  candidate: 'F123', disposition: 'no-gain', mergeReady: false,
  actualDeclaredPrimary: 'IndexOf/CopiedDefault5',
  actualUnchangedSameProfileControl: 'UnchangedContains/CopiedDefault5',
  actualOrdinarySourceControl: 'IndexOf/UnmodifiedDefault5',
  numericalPrimaryTimingGateMet: audit.actualNumericalPrimaryTimingGateMet,
  allocationGateMet: audit.actualPrimaryAllocationGateMet,
  controlCredibilityGateMet: audit.actualControlCredibilityGateMet,
  ordinaryPathRejectsAllocationOnly: audit.actualOrdinaryPathRejectsAllocationOnly,
  medianPrimaryLessTimePercent: audit.actualMedianPrimaryLessTimePercent,
  actualPrimaryEachLessTimePercent: audit.primary.map(item => item.lessTimePercent),
  actualPrimaryEachOriginalNs: audit.primary.map(item => item.original.meanNs),
  actualPrimaryEachCandidateNs: audit.primary.map(item => item.candidate.meanNs),
  actualPrimaryEachManagedBytesSaved: audit.actualPrimaryManagedByteSavings,
  actualEveryProfileSummary: audit.profileSummaries,
  actualCasesPerSource: 24, actualCompleteComparisons: 3, actualConsumedAuthorizations: 3,
  actualFailedAuthorizationNumbers: [], actualRetainedObservations: 1152,
  actualTimingBudgetPermanentlyClosed: true, actualNoRetuningOrPrimarySubstitution: true,
  actualFavorableAdverseShortCircuitAndUnchangedControlResultsRetained: true,
  actualNoPerformancePrWarranted: true, actualPerformancePrUrl: null,
  actualSourceBranchOnlyForDiagnosticPreservation: true,
  actualCandidatePreservesLegacyObjectEqualityAndCompleteSourceFallback: true,
  actualBothReferenceAndValueTypeEqualityCovered: true,
  actualCorrectnessEvidenceIsGreenGreenNotSemanticBugRedGreen: true,
  actualSourceInputs: 11, actualPdbDocuments: 7, actualCommonHarnessInputs: 8,
  actualCandidateChangesOnlyCoreDllAndPdbIn328EntryImage: true,
  actualAcceptedIndividuallyParsedPassingXmlExecutions: 117,
  actualOriginalCandidatePreservationRows: [12, 12],
  actualPreparationCorrections: read(path.join(run, 'preparation-correction.json')),
  actualInterpretation: 'The interface-typed foreach syntax did not establish a measured copied-store allocation tax. The original and candidate report no primary managed allocation saving, and the declared copied-five IndexOf timing gate fails. Favorable ordinary-source or other-profile rows do not replace the declared primary.',
  actualNotDropInListIndexOf: 'List<T>.IndexOf can use IEquatable<T>; the existing method uses object.Equals with the stored element as receiver. The independent preserved reference/value, order, mutation and disposal contracts forbid that semantic substitution.',
  excludedClaims: [
    'normal request or application throughput gain', 'representative IndexOf frequency', 'specific JIT cause',
    'isolated machine or stable hardware', 'compiled Razor Page/browser', 'AOT/trimming', 'packaging',
    'complete compiler provenance', 'merge recommendation'
  ]
});
node([path.join(session, 'F123-reproduce-untimed.mjs'), run]);
node([path.join(session, 'F123-verify.mjs'), run, '--write-summary', '--live-images']);
assert.equal(read(path.join(run, 'audit-summary.json')).actualDisposition, 'no-gain');
assert.equal(read(path.join(run, 'audit-summary.json')).actualRuntimeRecordsChecked, 22);
assert.equal(read(path.join(run, 'audit-summary.json')).actualPerBenchmarkSettingsRecordsChecked, 288);
console.log('F123 evaluation is independently audited and permanently closed: no-gain, no performance PR, no extra timing.');
