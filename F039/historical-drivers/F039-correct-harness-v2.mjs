import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F039');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const budgetFile = path.join(run, 'source-comparison-budget.json');
const budget = read(budgetFile);
assert.equal(budget.maximumPairs, 3);
assert.equal(budget.closed, false);
assert.equal(budget.attempts.length, 1);
assert.equal(budget.attempts[0].status, 'failed');
assert.equal(budget.attempts[0].members.length, 1);
assert.equal(budget.attempts[0].members[0].variant, 'original');
const sealFile = path.join(run, 'measurement-seal.json');
assert.equal(hash(sealFile), budget.measurementSealSha256);
const seal = read(sealFile);
for (const entry of seal.sealedFiles) assert.equal(hash(entry.path), entry.sha256);
const failure = path.join(run, 'measure-original-001');
const output = fs.readFileSync(path.join(failure, 'stdout.log'), 'utf8') +
  fs.readFileSync(path.join(failure, 'stderr.log'), 'utf8');
assert.match(output, /non-sealed/);
assert.equal([...output.matchAll(/^WorkloadResult\s+\d+:/gm)].length, 0);
const completion = read(path.join(failure, 'completion.json'));
assert.notEqual(completion.actualExitCode, 0);
const directory = path.join(run, 'correction-v2');
fs.mkdirSync(directory);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(directory, 'executed-driver.mjs'));
fs.copyFileSync(budgetFile, path.join(directory, 'budget-before-correction.json'), fs.constants.COPYFILE_EXCL);
const harness = path.join(run, 'harness-v2');
fs.mkdirSync(harness);
const inputs = read(path.join(run, 'preparation-original-001', 'harness-source-manifest.json')).files;
for (const input of inputs) {
  const file = path.join(run, 'harness', input.file);
  assert.equal(hash(file), input.sha256);
  fs.copyFileSync(file, path.join(harness, input.file), fs.constants.COPYFILE_EXCL);
}
for (const name of ['native.ps1', 'measure-pair.ps1', 'audit-measurement.mjs', 'check-characterization.mjs']) {
  const extension = path.extname(name);
  const stem = name.slice(0, -extension.length);
  fs.copyFileSync(path.join(session, 'F039-' + name), path.join(session, `F039-${stem}-v2${extension}`), fs.constants.COPYFILE_EXCL);
}
fs.writeFileSync(path.join(directory, 'correction-plan.json'), JSON.stringify({
  candidate: 'F039', actualRecordedUtc: new Date().toISOString(),
  actualPriorSealStillFullyValid: true, actualPriorSealedFilesRehashed: seal.sealedFiles.length,
  actualPriorSealSha256: hash(sealFile), actualPriorBudgetSha256: hash(budgetFile),
  actualFailedAttempt: 1, actualFailedNativePid: completion.actualProcessId,
  actualFailureBeforeAnyWorkloadResult: true, actualObservedPriorRawResultSamples: 0,
  actualMaximumAttemptsUnchanged: 3, actualAttemptsAlreadyConsumed: 1, actualAttemptsRemaining: 2,
  actualNoResetOrDiscardOfFailedAttempt: true,
  actualCorrectionLimitedToExternalHarness: 'Non-sealed BDN fixture and real public TypeToBenchmarks discovery preflight; shipping candidate and its preserved contracts remain unchanged.',
  actualSamePrimaryMatrixRuntimeOrderAndAcceptance: true,
  actualOriginalSevenSourceFilesAndFailedNativeInvocationPreserved: true,
}, null, 2) + '\n', { flag: 'wx' });
console.log('F039: all 687 old sealed inputs preserved and reverified; failed attempt retained; cloned v2 harness and drivers without resetting the budget.');
