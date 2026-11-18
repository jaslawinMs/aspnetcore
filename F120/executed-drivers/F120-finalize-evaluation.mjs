import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F120');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const audit = read(path.join(run, 'measurement-audit.json'));
const budgetPath = path.join(run, 'diagnostic-budget.json');
const budgetHash = sha(budgetPath);
assert.equal(read(budgetPath).permanentlyClosed, true);
assert.deepEqual(audit.actualCompletedComparisonNumbers, [2, 3]);
assert.equal(audit.actualRetainedSamples, 512);
assert.equal(audit.actualNumericalPrimaryTimingGateMet, false);
assert.equal(audit.actualPrimaryAllocationGateMet, false);
assert.deepEqual(audit.actualPrimaryManagedByteSavings, [0, 0]);
assert.deepEqual(audit.actualPrimarySlowerComparisons, [2, 3]);
assert.equal(read(path.join(run, 'reconstruction-paired-001', 'verified-reproduction.json')).actualClosedBudgetSha256, budgetHash);
const patch = spawnSync('git', ['--no-pager', 'diff', '--no-ext-diff', '--',
  'src\\Mvc\\Mvc.Core\\src\\Infrastructure\\CopyOnWriteList.cs'],
{ cwd: 'C:\\src\\aspnetcore', encoding: 'utf8', windowsHide: true });
assert.equal(patch.status, 0);
assert.ok(patch.stdout.includes('if (_copy is not null)'));
fs.writeFileSync(path.join(run, 'candidate.patch'), patch.stdout, { flag: 'wx' });
const decision = {
  candidate: 'F120', disposition: 'no-gain', candidateRecommendedForMerge: false,
  classification: 'Private copied-store specialization not supported by the predeclared primary; retain the experiment, not a performance proposal.',
  numericalPrimaryTimingGateMet: audit.actualNumericalPrimaryTimingGateMet,
  allocationGateMet: audit.actualPrimaryAllocationGateMet,
  controlCredibilityGateMet: audit.actualControlCredibilityGateMet,
  ordinaryPathRejectsAllocationOnly: audit.actualOrdinaryPathRejectsAllocationOnly,
  medianPrimaryLessTimePercent: audit.actualMedianPrimaryLessTimePercent,
  primaryFasterComparisons: 0, actualPrimarySlowerComparisons: [2, 3],
  actualPrimaryManagedByteSavings: [0, 0],
  actualConsumedAuthorizations: 3, actualCompleteComparisons: 2, actualFailedAuthorizationNumbers: [1],
  actualRetainedSamples: 512, actualComparisonBudgetPermanentlyClosed: true, actualClosedBudgetSha256: budgetHash,
  actualFailedFirstAuthorization: 'The pinned BDN0.13 in-process emitter invoked the workload before async GlobalSetup completed. It produced no WorkloadActual or WorkloadResult samples. Preserve the complete failed fixture epoch; its slot remains consumed and is not replayed.',
  actualCommonFixtureRepair: 'Await all eight real HTTP producer setups in async Main before BDN. Each synchronous GlobalSetup selects its prepared immutable profile; Contains and UnchangedIndexOf share that same profile. Both timed method bodies, profiles, source candidate, orders, settings and acceptance gates are unchanged.',
  actualNoRetargetingToFavorableSecondaryOrOrdinaryPath: true,
  actualObservedBoundary: 'One public IList<IValueProviderFactory>.Contains call on a real HTTP-produced, already-copied MVC collection; neither a request nor first-write cost.',
  actualAllocationObservation: 'BDN reports0B/op for both original and candidate copied primary in both complete comparisons; ordinary source-array controls report32B/op in both variants. No inferred40B saving is claimed. Tiny raw amortized bookkeeping counts and midpoint-to-even rounding remain auditable.',
  actualJitDisassemblyCollected: false,
  actualNoSpecificJitCauseClaimed: true,
  actualPreservation: 'Original and candidate each pass the same35 selected XML rows including seven new preservation rows; actual current default passes28 existing rows. Candidate Pages producer suite passes9. All three source variants and both exact-input rebuild variants pass48 real HTTP requests,16 prepared public contracts,six equality/enumeration contracts and eight benchmark lifecycles per successful characterization.',
  actualGreenGreenPerformancePreservationNotBugFixRedGreen: true,
  actualSourceBranchMayRetainDiagnosticCandidate: true,
  actualNewPerformancePullRequestWarranted: false,
  actualExcludedClaims: read(path.join(run, 'acceptance-plan.json')).excludedClaims,
  actualCreated: new Date().toISOString()
};
write(path.join(run, 'decision.json'), decision);
const result = spawnSync(process.execPath, [path.join(run, 'F120-verify.mjs'), run, '--live-images', '--write-summary'],
  { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
fs.writeFileSync(path.join(run, 'full-live-audit.stdout.txt'), result.stdout ?? '', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'full-live-audit.stderr.txt'), result.stderr ?? '', { flag: 'wx' });
write(path.join(run, 'full-live-audit-command.json'), { executable: process.execPath,
  arguments: [path.join(run, 'F120-verify.mjs'), run, '--live-images', '--write-summary'],
  actualExitCode: result.status, actualAdditionalTiming: 0 });
assert.equal(result.status, 0, result.stderr || result.stdout);
assert.equal(sha(budgetPath), budgetHash);
console.log(result.stdout);
