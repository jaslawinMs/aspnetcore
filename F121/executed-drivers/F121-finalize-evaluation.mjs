import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F121');
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex').toUpperCase();
const write = (filename, value) => fs.writeFileSync(filename, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const audit = read(path.join(run, 'measurement-audit.json'));
const budget = read(path.join(run, 'diagnostic-budget.json'));
assert.equal(budget.permanentlyClosed, true);
assert.equal(audit.actualAuthorizationsConsumed, 3);
assert.equal(audit.actualRetainedSamples, 768);
assert.equal(audit.actualNumericalPrimaryTimingGateMet, false);
assert.equal(audit.actualPrimaryAllocationGateMet, false);
assert.ok(audit.primary.every(item => item.lessTimePercent < 0 && item.actualManagedBytesSaved === 0));
const decision = {
  candidate: 'F121', disposition: 'no-gain',
  actualCreatedAt: new Date().toISOString(),
  numericalPrimaryTimingGateMet: audit.actualNumericalPrimaryTimingGateMet,
  allocationGateMet: audit.actualPrimaryAllocationGateMet,
  controlCredibilityGateMet: audit.actualControlCredibilityGateMet,
  ordinaryPathRejectsAllocationOnly: audit.actualOrdinaryPathRejectsAllocationOnly,
  medianPrimaryLessTimePercent: audit.actualMedianPrimaryLessTimePercent,
  actualPrimary: 'CopyTo / CopiedDefault5',
  actualEachPrimaryLessTimePercent: audit.primary.map(item => item.lessTimePercent),
  actualPrimaryManagedBytesSaved: audit.actualPrimaryManagedByteSavings,
  actualCompleteComparisons: 3, actualRetainedSamples: 768,
  actualFailedAuthorizationNumbers: [], actualAuthorizationsConsumed: 3,
  actualClosedBudgetSha256: sha(path.join(run, 'diagnostic-budget.json')),
  actualNoFurtherTimingAllowed: true,
  actualDiagnosticCandidateRecommendedForMerge: false,
  actualPerformancePullRequestWarranted: false,
  actualNoPublicApiShapeChange: true,
  actualShippingChange: 'Ten insertions only in CopyTo; original source-backed loop left untouched.',
  actualPositiveAndAdverseProfilesAllRetained: true,
  actualPrimaryNotRetargeted: true,
  actualJitDisassemblyCollected: false,
  actualJitCauseClaimed: false,
  actualManagedAllocationWording: 'BenchmarkDotNet reports 0 B/op for both copied-store variants in all three pairs; this is rounded per-operation reporting, not proof of no allocation anywhere.',
  actualReason: 'The declared copied-five-factory primary is slower in every pair (16.03%, 5.06%, 18.84%), with no reported allocation saving. Favorable ordinary-source and empty observations do not replace the predeclared copied-store primary.',
  actualPreservationBoundary: 'Forty original and forty candidate Core rows, twenty-eight current-default producer rows and nine candidate PageInvokerProvider rows are individually parsed. Three actual producer/CopyTo characterization matrices and both independently rebuilt variants match.',
  actualExcludedClaims: ['normal request or application throughput', 'representative call frequency', 'compiled page/browser validation', 'AOT/trimming', 'packaging', 'merge readiness']
};
write(path.join(run, 'decision.json'), decision);
fs.copyFileSync(path.join(session, 'F121-verify.mjs'), path.join(run, 'F121-verify.mjs'), fs.constants.COPYFILE_EXCL);
const args = [path.join(run, 'F121-verify.mjs'), run, '--live-images', '--write-summary'];
const result = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
fs.writeFileSync(path.join(run, 'full-live-audit.stdout.txt'), result.stdout ?? '', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'full-live-audit.stderr.txt'), result.stderr ?? '', { flag: 'wx' });
write(path.join(run, 'full-live-audit.command.json'), {
  executable: process.execPath, arguments: args, actualExitCode: result.status,
  actualVerifierSha256: sha(path.join(run, 'F121-verify.mjs')),
  actualHistoricalTimingRerun: false, actualCompletedAt: new Date().toISOString()
});
console.log(result.stdout);
assert.equal(result.status, 0, result.stderr);
console.log(JSON.stringify({ actualDisposition: decision.disposition, actualVerifiedCompleteComparisons: 3,
  actualVerifiedRetainedSamples: 768, actualNoPerformancePrWarranted: true }, null, 2));
