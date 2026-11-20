import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F126');
const read = file => JSON.parse(fs.readFileSync(path.join(run, file), 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(run, file))).digest('hex').toUpperCase();
const analysis = read('analysis.json');
const numbers = read('independent-numerical-audit.json');
const validation = read('premeasurement-validation.json');
const reproduction = read('reconstruction-paired-001\\verified-reproduction.json');
assert.equal(analysis.actualVerdict, 'qualified');
assert.equal(analysis.actualGates.allocationQualified, true);
assert.equal(analysis.actualGates.timingQualified, false);
assert.equal(analysis.actualGates.guardRejects, false);
assert.equal(analysis.actualRetainedObservations, 288);
assert.equal(numbers.actualAnalysisSha256, sha('analysis.json'));
assert.equal(numbers.actualClosedBudgetSha256, sha('diagnostic-budget.json'));
assert.equal(numbers.actualAllSixProfilesAgree, true);
assert.equal(validation.actualParsedXmlExecutions, 32);
assert.equal(validation.actualParsedPassingXmlExecutions, 30);
assert.equal(validation.actualNewRowsIndividuallyRedThenGreen, 2);
assert.equal(validation.actualHotReloadSamePidNoRestartControllerAttributeDeltaVerified, true);
assert.equal(reproduction.actualByteExactCommonInputs, 8);
assert.equal(reproduction.actualAdditionalTimingSamples, 0);
assert.equal(reproduction.actualClosedBudgetSha256, sha('diagnostic-budget.json'));
assert.equal(reproduction.actualVariants.length, 2);
const primary = analysis.aggregates.find(item => item.key === 'WarmRequest/MinimumAge10');
const result = {
  candidate: 'F126', disposition: 'qualified', subtype: 'deterministic-sample-endpoint-cache-allocation',
  classification: 'Focused allocation reduction using the existing endpoint cache; educational sample only',
  mergeReady: false, actualAcceptedAt: new Date().toISOString(),
  qualificationBasis: 'predeclared-alternative-allocation-gate-only',
  actualDraftProposalWarrantedWithinExplicitLimitations: true,
  actualMedianPrimaryReportedBytesSaved: primary.medianReportedBytesSaved,
  actualEachPrimaryReportedBytesSaved: primary.pairedReportedBytesSaved,
  actualMedianPrimaryLessTimePercent: primary.medianLessTimePercent,
  actualEachPrimaryLessTimePercent: primary.pairedLessTimePercent,
  allocationGateMet: true, numericalPrimaryTimingGateMet: false, actualOrdinaryGuardRejectsQualification: false,
  actualCompletedComparisons: 3, actualRetainedSamples: 288,
  actualParsedIndividualXmlExecutions: 32, actualPassingXmlExecutions: 30,
  actualExpectedOriginalCacheContractFailures: 2, actualUnexpectedFailuresOrSkips: 0,
  actualNewRowsIndividuallyRedThenGreen: ['MinimumAge10', 'MinimumAge50'],
  actualSourceChangesAreInternalSampleOnlyAndPublicFrameworkApiShapeUnchanged: true,
  actualAcceptancePlanSha256: sha('acceptance-plan.json'), actualClosedBudgetSha256: sha('diagnostic-budget.json'),
  actualPremeasurementValidationSha256: sha('premeasurement-validation.json'), actualAnalysisSha256: sha('analysis.json'),
  actualIndependentNumericalAuditSha256: sha('independent-numerical-audit.json'),
  actualReconstructionSha256: sha('reconstruction-paired-001\\verified-reproduction.json'),
  actualHotReloadSha256: sha('hot-reload-verified.json'),
  actualImportantLimitations: [
    'Only allocation qualifies: primary saves 1246/1258/1269 reported B/op; paired matched-control-adjusted savings are 1801/1277/634 B/op. These are reported whole-request measurements, not exact isolated policy-object sizes.',
    'No demonstrated speedup: primary less-time is +0.9722%/+5.7096%/-0.0366%; same-profile disabled-cache control moves +26.7334%/+23.7586%/-38.6916%. Timing fails both the 10% and control-credibility gates.',
    'The second real route saves 1315/1292/1291 reported B/op, but does not replace the primary. DirectGetPolicy/MinimumAge50 median time increases 4.6254%; every adverse and unchanged control observation is retained.',
    'The real source-built sample Startup/MVC/cookie pipeline runs in TestServer with logging disabled, ephemeral data protection and a documented lightweight Interlocked lookup observer included in timing. This is not a socket/network, general framework or general application throughput claim.',
    'Current-default functional tests use its genuine complete source-built graph; default-owner characterization uses the common baseline framework image. Some unchanged Microsoft.Extensions abstractions resolve from the pinned Microsoft.NETCore.App runtime; actual paths and bytes are preserved, not described as source-built ASP.NET Core owners.',
    'Eight exact common inputs were rebuilt in a new directory and both measured owners characterized without timing. Measured owner/framework bytes are reused; selected source/PDB evidence is not complete compiler provenance or fresh-clone byte-identical replay.',
    'Actual supported controller-attribute Hot Reload age10->11->10 applied twice with the same app PID and one startup. This proves that specific edit on this runtime, not every possible metadata delta.',
    'Direct provider calls remain uncached, cold concurrent misses need not construct once, and providers whose policies change independently of endpoint/startup metadata must retain the existing default false. No new public framework API, private name cache, parser change or merge-readiness claim.'
  ],
  actualAllAdverseAllocationAndUnchangedControlsRetained: true,
  actualAdditionalTimingPermitted: false, actualNoRetuningPrimarySubstitutionOrReplay: true
};
fs.writeFileSync(path.join(run, 'decision.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: result.candidate, disposition: result.disposition, qualificationBasis: result.qualificationBasis,
  actualMedianPrimaryReportedBytesSaved: result.actualMedianPrimaryReportedBytesSaved, actualTimingQualified: false,
  actualRetainedSamples: 288, actualIndividuallyRedThenGreenRows: result.actualNewRowsIndividuallyRedThenGreen,
  actualRealHotReloadWithoutRestartVerified: true, actualAdditionalTimingPermitted: false }, null, 2));
