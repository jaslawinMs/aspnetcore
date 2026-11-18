import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F039');
const read = file => JSON.parse(fs.readFileSync(path.join(run, file), 'utf8'));
const write = (file, value) => fs.writeFileSync(path.join(run, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const budget = read('source-comparison-budget.json');
assert.equal(budget.closed, false);
assert.equal(budget.maximumPairs, 3);
assert.equal(budget.attempts.length, 3);
assert.deepEqual(budget.attempts.map(attempt => attempt.status), ['failed', 'completed', 'completed']);
const audit = read('audit-v2-through-003.json');
assert.equal(audit.actualPairs, 2);
assert.equal(audit.actualFailedAttempts.length, 1);
assert.equal(audit.actualFailedAttempts[0].actualRawResultSamples, 0);
assert.equal(audit.actualRows, 160);
assert.equal(audit.actualRawResultSamples, 1280);
assert.equal(audit.actualRawStdoutAndJsonSamplesCrossChecked, true);
assert.equal(audit.actualMeansAndSampleStandardDeviationsRecomputed, true);
assert.equal(audit.actualSealedFilesReverified, 1186);
assert.equal(hash(path.join(run, 'measurement-seal-v2.json')), budget.measurementSealSha256);
const paired = audit.pairs.flatMap(pair => pair.rows);
const isMissOrControl = row => row.profile.startsWith('MissingNull:') ||
  row.profile.startsWith('ControlContainsKey:') || row.profile.endsWith(':0');
const actualAllAdverseProfiles = audit.summaryByProfile.filter(row => row.medianLessTimePercent < 0);
const assessment = {
  candidate: 'F039', actualTimingConcludedUtc: new Date().toISOString(),
  actualSourceComparisonAttemptsConsumed: 3, actualCompletedSourceComparisonPairs: 2,
  actualFailedSourceComparisonAttempts: 1, actualFailedAttemptBeforeTiming: 1,
  actualNativeMeasurementMembersStartedIncludingFailure: 5, actualCompletedTimedNativeMembers: 4,
  actualRows: 160, actualRawResultSamples: 1280,
  actualBudgetPermanentlyClosed: true, actualNoFourthAttemptAuthorized: true,
  actualOriginalFailedBudgetEntryRetained: true, actualBothSealsAndHarnessEpochsRetained: true,
  actualMeasurementSealSha256: budget.measurementSealSha256,
  actualPrimary: audit.primary,
  actualPrimaryPositiveInEveryCompletedPair: audit.actualPrimaryPositiveInEveryPair,
  actualPrimaryMedianAtLeastFivePercent: audit.actualPrimaryMedianAtLeastFivePercent,
  actualPrimaryMeasurementCriterionPassed: audit.actualPrimaryPositiveInEveryPair && audit.actualPrimaryMedianAtLeastFivePercent,
  actualMaximumProfileCvPercent: Math.max(...audit.allRows.map(row => row.coefficientOfVariationPercent)),
  actualPairedAllocationReports: paired.length,
  actualEqualPairedAllocationReports: paired.filter(row => row.originalBytesPerOp === row.candidateBytesPerOp).length,
  actualAllMeasuredAllocationReportsZero: audit.allRows.every(row => row.bytesPerOp === 0),
  actualMissOrControlMedianRegressionsAtLeastFivePercent: audit.summaryByProfile
    .filter(row => isMissOrControl(row) && row.medianLessTimePercent <= -5),
  actualAllAdverseProfiles,
  actualWorstIndividualPairedRows: [...paired].sort((a, b) => a.lessTimePercent - b.lessTimePercent).slice(0, 8),
  actualAllFortyProfilesAndBothCompletedComparisonsRetained: true,
  actualNoFinalDispositionUntilRemainingValidation: true,
};
budget.closed = true;
budget.actualClosedUtc = assessment.actualTimingConcludedUtc;
budget.actualCloseReason = 'All three permitted attempts consumed: one failed before timing and two completed source comparisons. No replacement or fourth attempt.';
write('measurement-assessment.json', assessment);
write('measurement-closure-budget.json', budget);
fs.writeFileSync(path.join(run, 'source-comparison-budget.json'), JSON.stringify(budget, null, 2) + '\n');
console.log(JSON.stringify(assessment, null, 2));
