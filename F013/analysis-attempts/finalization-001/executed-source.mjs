import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(session, 'autoperf-runs', 'F013');
const json = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8').replace(/^\uFEFF/, ''));
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex').toUpperCase();
const budget = json('measurement-budget.json');
assert.deepEqual([budget.maximumComparisons, budget.usedComparisons, budget.originalProfiles,
  budget.candidateProfiles, budget.originalOnlyDiagnosticProfiles, budget.sourceCandidateShapes, budget.closed],
  [3, 3, 3, 3, 0, 2, true]);
assert.deepEqual(budget.attempts.map(value => [value.comparison, value.state, value.failed]),
  [[1, 'completed', false], [2, 'completed', false], [3, 'completed', false]]);
const comparisons = [1, 2, 3].map(index => json(`analysis-comparison-${index}.json`));
assert.deepEqual(comparisons.map(value => value.candidateVariant),
  ['native-specialization-001', 'native-specialization-002', 'native-specialization-002']);
const shapes = comparisons[0].cases.map(value => value.shape);
const cases = shapes.map(shape => {
  const rows = comparisons.map(value => value.cases.find(row => row.shape === shape));
  assert(rows.every(Boolean));
  return {
    shape,
    comparisons: rows.map((row, index) => ({
      comparison: index + 1, candidateVariant: comparisons[index].candidateVariant,
      originalMeanNs: row.before.reportedMeanNs, candidateMeanNs: row.after.reportedMeanNs,
      meanTimeChangePercent: row.meanTimeChangePercent, allEightUncompensatedRawTimeRatio: row.allEightUncompensatedRawTimeRatio,
      originalCvPercent: row.before.reportedCvPercent, candidateCvPercent: row.after.reportedCvPercent,
      originalAllocatedProcessBytesPerOperation: row.before.allocatedProcessBytesPerOperation,
      candidateAllocatedProcessBytesPerOperation: row.after.allocatedProcessBytesPerOperation,
      originalRetainedResults: row.before.reportedRetainedN, candidateRetainedResults: row.after.reportedRetainedN,
    })),
  };
});
const largeArray = cases.find(value => value.shape === 'C128Array256Miss');
assert(largeArray.comparisons.every(value => value.meanTimeChangePercent > 0));
const observedAllocationChanges = comparisons.flatMap(comparison => comparison.cases
  .filter(row => row.allocationChangeBytesPerOperation !== 0)
  .map(row => ({
    comparison: comparison.comparison, candidateVariant: comparison.candidateVariant, shape: row.shape,
    before: row.before.allocatedProcessBytesPerOperation, after: row.after.allocatedProcessBytesPerOperation,
  })));
const totals = {
  profiles: budget.attempts.reduce((sum, value) => sum + value.profiles.length, 0),
  reports: comparisons.reduce((sum, value) => sum + value.successfulReports, 0),
  raw: comparisons.reduce((sum, value) => sum + value.actualWorkloadIterations, 0),
  retained: comparisons.reduce((sum, value) => sum + value.actualRetainedResults, 0),
  warmups: comparisons.reduce((sum, value) => sum + value.actualWarmups, 0),
  overheads: comparisons.reduce((sum, value) => sum + value.actualOverheadIterations, 0),
};
totals.upperFiltered = totals.raw - totals.retained;
assert.deepEqual([totals.profiles, totals.reports, totals.raw, totals.warmups], [6, 84, 672, 252]);
const analysis = {
  candidate: 'F013', mode: 'measured-no-gain', comparisonCount: comparisons.length,
  sourceVersionsMeasured: 2, compiledHarnessVersionsMeasured: 1, budgetClosed: true, totals, cases,
  comparisons: comparisons.map(value => ({
    id: value.comparison, candidateVariant: value.candidateVariant,
    source: `analysis-comparison-${value.comparison}.json`,
    sha256: sha(path.join(root, `analysis-comparison-${value.comparison}.json`)), order: value.order,
  })),
  observedAllocationChanges, allocationBenefitSelected: false,
  ratioPolicy: 'All3 comparisons retained individually. Comparison1 tests exact List.Contains/Array.IndexOf; comparisons2/3 test array-only AsSpan().Contains. These are not3 replications of one implementation. Negative change means lower candidate time. No pooling, production weighting, universal win or confidence claim.',
  allocationBoundary: 'Actual BDN0.13/net12 process-wide GC allocation. All measured array-path allocations are unchanged. Comparison3 unchanged List fallback reports66->65B/op; that single process-wide1B observation is retained, not an isolated membership/serializer attribution or repeatable allocation win.',
  measuredBoundary: 'Warm actual public DefaultHubLifetimeManager.SendConnectionsAsync including real live connections, lazy cached JSON serialization and synchronous bounded transports with minimal frame/byte counters. Full recipient/frame checks, input/connection construction, network, handshake, stateful reconnect and application frequency are outside timing.',
  conclusion: 'No justified performance PR. Variant1 regresses large List/array cases. Array-only variant2 still regresses128-connections/256-array-miss time in both comparisons while32-array effects vary and untouched fallback/empty-store paths also move. No causal attribution of those control-path movements, no claim every possible compatible optimization is impossible.',
  currentDefaultBoundary: 'Fresh20 selected source triples/current-default49147673007a4b1d676694e2c5f85b83ad76c36f; actual changed JSON producer is independently characterized under each owner. Reused/rehashed F011 captured-default JSON bytes, not a new whole-current-default build or integration result.',
};
const evaluation = {
  candidate: 'F013', disposition: 'no-gain', performancePrJustified: false, recommendedShippingSourceChange: false,
  sourceCandidateShapesMeasured: 2, pairedComparisons: 3, originalProfiles: 3, candidateProfiles: 3,
  originalOnlyDiagnosticProfiles: 0, allThreeComparisonSlotsSpent: true, budgetClosed: true,
  actualFreshOwningTestRuns: 3, actualFreshOwningRows: 84,
  functionalPreservationNotBugFixRedGreen: true, snapshotsOnlyExplicitInputControls: true,
  originalFindingCostStillPresent: true, notClaimingEveryAlternativeImpossible: true,
  smallPathAndCustomDerivedDispatchPreserved: true, measuredArrayAllocationBenefitObserved: false,
  unmodifiedFallbackAllocationObservationRetained: observedAllocationChanges,
  analysis: 'analysis.json', budget: 'measurement-budget.json',
  reason: analysis.conclusion,
};
for (const [name, value] of [['analysis.json', analysis], ['final-evaluation.json', evaluation]]) {
  const destination = path.join(root, name);
  assert(!fs.existsSync(destination), `Preserve ${name}.`);
  fs.writeFileSync(destination, JSON.stringify(value, null, 2) + '\n');
}
const accounting = path.join(root, 'investigation', 'bdn-memory-accounting');
assert(!fs.existsSync(accounting));
fs.mkdirSync(accounting, { recursive: true });
const prior = path.join(session, 'autoperf-runs', 'F012', 'investigation', 'bdn-memory-accounting');
const priorProvenance = JSON.parse(fs.readFileSync(path.join(prior, 'provenance.json'), 'utf8').replace(/^\uFEFF/, ''));
assert.equal(sha(path.join(prior, 'GcStats.cs')), priorProvenance.source_sha256);
const manifest = json('manifest-comparison-original.json');
assert.equal(manifest.benchmarkDotNetSha256, priorProvenance.currentMeasuredBdnDllSha256);
for (const name of ['GcStats.cs', 'provenance.json']) fs.copyFileSync(path.join(prior, name), path.join(accounting, name));
fs.writeFileSync(path.join(accounting, 'borrowed-provenance.json'), JSON.stringify({
  candidate: 'F013', originalEvidence: 'F012/investigation/bdn-memory-accounting; preserves prior attribution/timestamps.',
  priorProvenanceSha256: sha(path.join(prior, 'provenance.json')),
  currentMeasuredBdnDllSha256: manifest.benchmarkDotNetSha256,
  sourceSha256: sha(path.join(prior, 'GcStats.cs')), newSourceFetchOrDelegateInstrumentation: false,
  qualification: 'Same actual BDN0.13 DLL verified across every F013 image. Reused source attribution is not independently rebuilt source-to-DLL binding.',
}, null, 2) + '\n');
const tools = path.join(root, 'analysis-tools');
fs.mkdirSync(tools, { recursive: true });
for (const name of ['extract-comparison', 'finalize-analysis']) {
  fs.copyFileSync(path.join(session, `F013-${name}.mjs`), path.join(tools, `${name}.mjs`));
}
console.log(`F013 no-gain: ${totals.profiles} profiles/${totals.reports} reports/${totals.raw} raw/${totals.retained} retained/${totals.upperFiltered} upper-filtered/${totals.warmups} warmups/${totals.overheads} overheads;2 source variants, permanently closed3-slot budget.`);
console.log(`Retained process-wide allocation changes: ${JSON.stringify(observedAllocationChanges)}`);
