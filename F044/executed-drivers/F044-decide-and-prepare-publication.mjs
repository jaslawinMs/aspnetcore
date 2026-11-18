import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F044');
const read = file => JSON.parse(fs.readFileSync(path.join(run, file), 'utf8'));
const audit = read('measurement-audit.json');
assert.equal(read('diagnostic-budget.json').closed, true);
assert.equal(audit.actualNumericalPrimaryTimingGateMet, true);
assert.deepEqual(audit.actualPrimaryNoGreaterThanControlComparisons, []);
assert.equal(audit.actualRetainedSamples, 576);
assert.equal(read('reproduction-paired-001/verified-reproduction.json').actualAdditionalTimingSamples, 0);
const decision = {
  candidate: 'F044', disposition: 'qualified', subtype: 'workload-dependent-custom-base-local-gain',
  actualMeasuredScope: 'SDK-compiled content fixtures explicitly deriving directly from RazorPageBase; excludes the ordinary RazorPage override and custom layout implementations.',
  numericalPrimaryTimingGateMet: audit.actualNumericalPrimaryTimingGateMet,
  allocationGateMet: audit.actualPrimaryAllocationGateMet,
  controlCredibilityGateMet: true,
  primaryNoGreaterThanControlComparisons: audit.actualPrimaryNoGreaterThanControlComparisons,
  medianPrimaryLessTimePercent: audit.actualMedianPrimaryLessTimePercent,
  actualMedianUnchangedControlLessTimePercent: audit.actualMedianUnchangedRegistrationControlLessTimePercent,
  actualEachPrimaryLessTimePercent: audit.primary.map(row => row.lessTimePercent),
  actualPrimaryBytesPerOperation: 704, actualPrimaryManagedByteSavings: audit.actualPrimaryManagedByteSavings,
  actualVariabilityReviewed: 'All three primary pairs are faster, and exceed their corresponding unchanged control. The effect varies2.40 to14.14%; the unchanged control varies-10.38 to5.18%, and primary CV reaches11.56%. This is a qualified local draft result, not a precision or broad throughput claim.',
  actualAdverseOutcomesProminent: [
    'RegisterFreshPage/One median3.17% more time, including pair3 40.06% more time; no one-section win.',
    'RenderFullView/Eight median6.74% more time, including pair2 8.25% more time; do not claim a uniform full-render gain.',
    'RenderFullView/One median0.35% more time.',
    'RenderFullView/Two median0.30% less time is not a material full-view result.',
    'Mixed few-byte full-view differences are not structural allocation savings.'
  ],
  actualSecondaryResultsNotReplacementPrimary: true,
  actualNoNormalRazorPageSpeedupClaimed: true, actualNoApplicationSpeedupClaimed: true,
  actualNoAllocationSavingClaimed: true, actualNoProductionFrequencyClaimed: true,
  actualMergeReady: false, actualDispositionAuthorizesForkResearchDraftOnly: true,
  actualAllThreeComparisonsPermanentlyClosed: true, actualMaximumComparisonsConsumed: 3
};
fs.writeFileSync(path.join(run, 'decision.json'), JSON.stringify(decision, null, 2) + '\n', { flag: 'wx' });
let publish = fs.readFileSync(path.join(session, 'F043-publish-source.mjs'), 'utf8').replaceAll('F043', 'F044');
const replacements = [
  ["autoperf/F044-razor-section-try-add", "autoperf/F044-razor-base-section-try-add"],
  ["const owner = 'src\\\\Mvc\\\\Mvc.Razor\\\\src\\\\RazorPage.cs';", "const owner = 'src\\\\Mvc\\\\Mvc.Razor\\\\src\\\\RazorPageBase.cs';"],
  ["assert.equal(disposition.disposition, 'no-gain');", "assert.equal(disposition.disposition, 'qualified');"],
  ["assert.equal(disposition.controlCredibilityGateMet, false);", "assert.equal(disposition.controlCredibilityGateMet, true);"],
  ["read(path.join(run, 'intake-completed.json')).protectedFiles", "read(path.join(run, 'premeasurement-protected-inputs.json')).protectedFiles"],
  ["Record F044 single-probe Razor section experiment", "Avoid duplicate base Razor section registration lookups"],
  ["Preserve the concrete Dictionary.TryAdd candidate and focused green/green section-contract coverage on an independent research branch. Three source comparisons show scaled registration gains, but the small declared primary does not clear the unchanged-control credibility gate. Retain the complete evidence without recommending a performance pull request or merge.",
    "Use concrete Dictionary.TryAdd only in RazorPageBase.DefineSection and add two focused original/candidate preservation rows. The SDK-compiled custom-base primary uses a median10.22% less time at unchanged704 B/op across three permanently closed source comparisons. Retain noisy and adverse one-section/full-view results; no normal RazorPage, application-throughput or merge-ready claim."],
  ["Scaled gains are retained; the declared small primary fails the predeclared control/variability credibility review despite meeting the raw numerical timing threshold.",
    "Qualified workload-dependent custom-base registration result only: primary10.22% less time, unchanged704 B/op; preserve all adverse one-section/full-view outcomes and shared-machine uncertainty. A source publication is not itself a pull-request or merge recommendation."]
];
for (const [before, after] of replacements) {
  assert.ok(publish.includes(before), 'Missing exact source-publication seam: ' + before);
  publish = publish.replace(before, after);
}
fs.writeFileSync(path.join(session, 'F044-publish-source.mjs'), publish, { flag: 'wx' });
console.log('Qualified only the declared custom-base local result; adverse and ordinary-path exclusions are explicit.');
