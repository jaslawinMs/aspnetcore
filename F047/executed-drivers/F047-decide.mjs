import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = path.join(path.dirname(fileURLToPath(import.meta.url)), 'autoperf-runs', 'F047');
const read = name => JSON.parse(fs.readFileSync(path.join(run, name), 'utf8'));
const audit = read('measurement-audit.json');
assert.equal(read('diagnostic-budget.json').permanentlyClosed, true);
assert.equal(audit.actualRetainedSamples, 384);
assert.equal(audit.actualNumericalPrimaryTimingGateMet, false);
assert.equal(audit.actualPrimaryAllocationGateMet, true);
assert.deepEqual(audit.actualPrimaryManagedByteSavings, [56, 56, 56]);
assert.deepEqual(audit.actualPrimarySlowerComparisons, [2, 3]);
const decision = {
  candidate: 'F047', disposition: 'qualified', qualificationBasis: 'allocation-only-trade-off',
  numericalPrimaryTimingGateMet: audit.actualNumericalPrimaryTimingGateMet,
  allocationGateMet: audit.actualPrimaryAllocationGateMet,
  controlCredibilityGateMet: audit.actualControlCredibilityGateMet,
  medianPrimaryLessTimePercent: audit.actualMedianPrimaryLessTimePercent,
  actualPrimaryManagedBytesBefore: 1616, actualPrimaryManagedBytesAfter: 1560,
  actualPrimaryManagedBytesSavedEachPair: audit.actualPrimaryManagedByteSavings,
  actualPrimarySlowerComparisons: audit.actualPrimarySlowerComparisons,
  actualTimingSpeedupClaimed: false,
  actualStableAdversePrimaryTimingReviewedRatherThanHidden: true,
  qualification: 'Allocation-only draft: the predeclared one-scalar fresh-boundary primary saves 56 B/op in every pair (1616 -> 1560 B/op, 3.47%). It does not show a reproducible latency improvement. The primary is slower in pairs 2 and 3 (2.48% and 1.43%); its median paired less-time effect is -1.43%.',
  adverseTimingReview: [
    'Pair 1 apparent primary benefit is 51.20%, but the original has 42.69% CV and declines from 3969.80 to 1261.18 ns/op across its eight retained samples. This is not a credible 51% headline; all samples remain.',
    'The two later primary comparisons have modest slower candidate means, within the observed case variability. Neither a speedup nor a statistically established causal regression is claimed.',
    'The unchanged four-scalar nonprerender control swings -26.65%, +24.04%, -6.71%. Shared-box timing is visibly unstable and cannot establish application impact.',
    'The mixed-fragment case is 7.62% slower in pair 1, and the eight-fragment case 1.46% slower there. Their positive medians do not erase those adverse observations.'
  ],
  actualPredeclaredAlternativeAllocationGateUsedWithoutRetuning: true,
  actualNoApplicationHttpOrBrowserThroughputMeasured: true,
  actualNoGuaranteedLatencyNeutralityClaimed: true,
  actualCandidateRecommendedForMerge: false,
  actualMaximumComparisonsConsumed: 3,
  actualFurtherTimingAllowed: false,
  actualCreated: new Date().toISOString()
};
fs.writeFileSync(path.join(run, 'decision.json'), JSON.stringify(decision, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(decision, null, 2));
