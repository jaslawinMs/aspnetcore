import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F040');
const read = file => JSON.parse(fs.readFileSync(path.join(run, file), 'utf8'));
const write = (file, value) => fs.writeFileSync(path.join(run, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const budget = read('source-comparison-budget.json');
const audit = read('audit-through-003.json');
const seal = read('measurement-seal.json');
assert.equal(budget.closed, false);
assert.equal(budget.maximumPairs, 3);
assert.deepEqual(budget.attempts.map(attempt => attempt.status), ['completed', 'completed', 'completed']);
for (const attempt of budget.attempts) {
  assert.equal(attempt.members.length, 2);
  for (const member of attempt.members) {
    assert.equal(member.status, 'completed');
    assert.equal(member.exitCode, 0);
    assert.ok(Number.isInteger(member.processId) && member.processId > 0);
  }
}
assert.equal(audit.actualPairs, 3);
assert.equal(audit.actualRows, 240);
assert.equal(audit.actualRawResultSamples, 1920);
assert.equal(audit.actualAllThreeComparisonsComplete, true);
assert.equal(audit.actualRawStdoutAndJsonSamplesCrossChecked, true);
assert.equal(audit.actualMeansAndSampleStandardDeviationsRecomputed, true);
assert.equal(audit.actualSealedFilesReverified, seal.sealedFiles.length);
assert.equal(hash(path.join(run, 'measurement-seal.json')), budget.measurementSealSha256);
for (const entry of seal.sealedFiles) assert.equal(hash(entry.path), entry.sha256, entry.path);
const paired = audit.pairs.flatMap(pair => pair.rows.map(row => ({ round: pair.round, ...row })));
assert.equal(paired.length, 120);
const isMissOrControl = row => row.profile.startsWith('MissingNull:') ||
  row.profile.startsWith('ControlRemoveKey:') || row.profile.endsWith(':0');
const assessment = {
  candidate: 'F040',
  actualTimingConcludedUtc: new Date().toISOString(),
  actualSourceComparisonAttemptsConsumed: 3,
  actualCompletedSourceComparisonPairs: 3,
  actualFailedSourceComparisonAttempts: 0,
  actualNativeMeasurementMembersStartedIncludingFailure: 6,
  actualCompletedTimedNativeMembers: 6,
  actualRows: 240,
  actualRawResultSamples: 1920,
  actualBudgetPermanentlyClosed: true,
  actualNoFourthAttemptAuthorized: true,
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
  actualAllAdverseProfiles: audit.summaryByProfile.filter(row => row.medianLessTimePercent < 0),
  actualWorstIndividualPairedRows: [...paired].sort((a, b) => a.lessTimePercent - b.lessTimePercent).slice(0, 8),
  actualAllFortyProfilesAndAllCompletedComparisonsRetained: true,
  actualNonemptyRestorationInsideTiming: true,
  actualNotIsolatedRemoveNanosecondsOrApplicationThroughput: true,
  actualUntimedFailuresDoNotBecomeTimingAttempts: [
    'Original preservation-test compilation CS8632; failed source and command preserved before nullable-disabled style correction.',
    'Broader initial managed build failed in unchanged Framework.App.Runtime packaging; focused build fallback retained.',
  ],
  actualNoFinalDispositionUntilRemainingValidation: true,
};
budget.closed = true;
budget.actualClosedUtc = assessment.actualTimingConcludedUtc;
budget.actualCloseReason = 'All three permitted source comparisons completed and audited. No fourth attempt or replacement run.';
write('measurement-assessment.json', assessment);
write('measurement-closure-budget.json', budget);
fs.writeFileSync(path.join(run, 'source-comparison-budget.json'), JSON.stringify(budget, null, 2) + '\n');
console.log(JSON.stringify(assessment, null, 2));
