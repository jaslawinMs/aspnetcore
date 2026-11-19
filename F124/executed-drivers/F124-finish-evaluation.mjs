import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F124');
const read = file => JSON.parse(fs.readFileSync(path.join(run, file), 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(run, file))).digest('hex').toUpperCase();
const audit = read('audit-summary.json');
const budget = read('diagnostic-budget.json');
assert.equal(budget.permanentlyClosed, true);
assert.deepEqual(budget.completed.map(item => item.attempt), [1, 2, 3]);
assert.equal(audit.actualPrimaryQualificationMet, true);
assert.equal(audit.actualRetainedSamples, 576);
assert.equal(audit.actualRuntimeRecordsChecked, 22);
assert.equal(audit.actualPartialPreparationRuntimeRecordsChecked, 1);
assert.equal(audit.actualPerBenchmarkSettingsRecordsChecked, 216);
assert.equal(audit.actualParsedIndividualTestRows, 63);
assert.equal(read('full-live-audit-002.command.json').actualExitCode, 0);
const profile = (method, name) => audit.profileSummaries.find(item => item.method === method && item.profile === name);
const decision = {
  candidate: 'F124', disposition: 'qualified', subtype: 'bounded-analyzer-predicate-time-trade-off',
  qualificationBasis: 'predeclared-private-predicate-primary-only', mergeReady: false,
  actualAcceptedAt: new Date().toISOString(),
  actualAcceptancePlanSha256: sha('acceptance-plan.json'),
  actualClosedBudgetSha256: sha('diagnostic-budget.json'),
  actualAuditSha256: sha('audit-summary.json'),
  actualPrimaryMethod: 'Predicate', actualPrimaryProfile: 'MinimalProgram',
  actualMedianPrimaryLessTimePercent: audit.actualMedianPrimaryLessTimePercent,
  actualEachPrimaryLessTimePercent: audit.primary.map(item => item.lessTimePercent),
  numericalPrimaryTimingGateMet: audit.actualNumericalPrimaryTimingGateMet,
  controlCredibilityGateMet: audit.actualPrimaryControlCrediblePairs.length >= 2,
  actualPrimaryControlCrediblePairs: audit.actualPrimaryControlCrediblePairs,
  allocationGateMet: audit.actualPrimaryAllocationGateMet,
  actualOrdinaryGuardRejectsQualification: audit.actualOrdinaryGuardRejectsQualification,
  actualPrimaryAllocation: profile('Predicate', 'MinimalProgram'),
  actualFullDriverPrimary: profile('AnalyzeCompilation', 'MinimalProgram'),
  actualLoneDeclaration: profile('Predicate', 'LoneDeclaration'),
  actualUnchangedEarlyGuard: profile('Predicate', 'EarlyGuard'),
  actualUnchangedEarlyGuardLocationControl: profile('UnchangedGetLocation', 'EarlyGuard'),
  actualImportantLimitations: [
    'Only the private predicate qualifies. The real fresh-driver MinimalProgram secondary shows no demonstrated improvement: median 1.7909382007% more time, with both favorable and adverse pairs retained.',
    'Primary allocation increases from 112 to 168 reported B/op in every pair; the allocation gate fails. LoneDeclaration is 13.8291442887% slower at the predicate boundary.',
    'The unchanged EarlyGuard is highly unstable: paired less-time -522.2439257921%, -8.9350042244%, +83.3430115744%. Median slowdown 8.9350042244% narrowly misses the predeclared 10% rejection threshold. No neutrality or causal explanation is claimed.',
    'LargeProgram is an explicit 128-registration scaling probe, not the primary or representative workload frequency. No full build, IDE, request throughput, cold parsing, packaging, native/browser or merge-readiness claim.',
    'Original/current-default/candidate source checks, 63 passing XML executions and independent rebuilt common harness characterization establish the observed boundary, not complete compiler provenance or fresh-clone byte-identical replay.'
  ],
  actualAllAdverseAllocationScalingAndUnchangedControlsRetained: true,
  actualGreenGreenPreservationNotSemanticBugRedGreen: true,
  actualCompletedComparisons: 3, actualRetainedSamples: 576,
  actualAdditionalTimingPermitted: false, actualNoRetuningPrimarySubstitutionOrReplay: true,
  actualDraftProposalWarrantedWithinExplicitLimitations: true,
  actualSourceChangesArePrivateAndPublicApiShapeUnchanged: true
};
fs.writeFileSync(path.join(run, 'decision.json'), JSON.stringify(decision, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(decision, null, 2));
