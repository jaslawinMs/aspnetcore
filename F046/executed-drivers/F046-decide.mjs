import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const run = path.join(path.dirname(fileURLToPath(import.meta.url)), 'autoperf-runs', 'F046');
const read = file => JSON.parse(fs.readFileSync(path.join(run, file), 'utf8').replace(/^\uFEFF/, ''));
const audit = read('measurement-audit.json');
const reconstruction = read('reconstruction-paired-001/verified-reproduction.json');
assert.equal(read('diagnostic-budget.json').permanentlyClosed, true);
assert.equal(audit.actualCompletedComparisons, 3);
assert.equal(audit.actualRetainedSamples, 576);
assert.equal(reconstruction.actualByteExactProjectFiles, 9);
assert.equal(reconstruction.actualAdditionalTimingSamples, 0);
const qualified = (audit.actualNumericalPrimaryTimingGateMet || audit.actualPrimaryAllocationGateMet)
  && audit.actualControlCredibilityGateMet;
const decision = {
  candidate: 'F046',
  disposition: qualified ? 'qualified' : 'no-gain',
  classification: 'Focused allocation-neutral lookup reduction',
  actualClaimedScope: 'Fresh default-store HTTP.sys response preparation ending in one Connection: close append, with collection setup, Content-Length indexer write, delegate invocation and count readback included.',
  actualObservedProducer: 'The compiled Response.ComputeHeaders body has one shared HeaderCollection.Append call site, taken for closing responses without an already-close response header.',
  actualNotGeneralApplicationOrRequestHeaderAppend: true,
  actualNativeHttpSysIisOrApplicationThroughputMeasured: false,
  actualProductionFrequencyMeasured: false,
  actualCandidateRecommendedForMerge: false,
  numericalPrimaryTimingGateMet: audit.actualNumericalPrimaryTimingGateMet,
  allocationGateMet: audit.actualPrimaryAllocationGateMet,
  controlCredibilityGateMet: audit.actualControlCredibilityGateMet,
  medianPrimaryLessTimePercent: audit.actualMedianPrimaryLessTimePercent,
  medianUnchangedControlLessTimePercent: audit.actualMedianUnchangedControlLessTimePercent,
  primaryNoGreaterThanControlComparisons: audit.actualPrimaryNoGreaterThanControlComparisons,
  actualPrimaryPairs: audit.primary.map(item => ({
    attempt: item.attempt, originalNs: item.original.meanNs, candidateNs: item.candidate.meanNs,
    lessTimePercent: item.lessTimePercent, actualManagedBytesSaved: item.actualManagedBytesSaved
  })),
  actualNoManagedAllocationSaving: audit.actualPrimaryManagedByteSavings.every(value => value === 0),
  actualPrimaryAllocatedBytesBeforeAndAfter: 384,
  actualImportantQualifications: [
    'This saves a second dictionary lookup only for the exact concrete Dictionary runtime type. Wrappers and subclasses retain their original interface read/write operations.',
    'Only the narrow primary meets the declared qualification claim; secondary scaled values do not establish production frequency or end-to-end benefit.',
    'The unchanged KeepAlive public-extension control appeared 27.437536149691866% faster in comparison2, exceeding the corresponding21.841356458836923% native secondary effect. This is explicit shared-machine drift evidence, not an additional optimization.',
    'The WrappedStore fallback has a2.8543514688403437% median apparent benefit but regresses2.311780152266074% in comparison3. No fallback improvement is claimed.',
    'The largest single-case coefficient of variation is13.460390324859006%. Three sequential AB/BA/AB pairs on shared hardware are not an application-throughput or formal statistical-significance result.',
    'IIS compiles the changed shared class and passes actual managed contracts; no IIS call edge to this instance Append was found in the complete inspected managed owner IL, and native IIS is not validated.',
    'Green/green preservation checks cover the optimization. Three initially incorrect fixture assumptions were corrected before any shipping edit or timing; they are not semantic-bug red/green evidence.',
    'The measured candidate was built before its later publication commit. Physical source/PDB checksums bind the actual measured body; no complete compiler-provenance claim is made.'
  ],
  actualIndependentProjectRebuilt: true,
  actualAdditionalReconstructionTimingSamples: 0,
  actualTimingBudgetPermanentlyClosed: true,
  actualClosedBudgetSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(run, 'diagnostic-budget.json'))).digest('hex').toUpperCase(),
  actualFixedClassifiedReportUpdated: false,
  actualDecidedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(run, 'decision.json'), JSON.stringify(decision, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(decision, null, 2));
