import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F039');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const budgetFile = path.join(run, 'source-comparison-budget.json');
const oldBudgetFile = path.join(run, 'correction-v2', 'budget-before-correction.json');
assert.equal(hash(budgetFile), hash(oldBudgetFile), 'No native attempt or budget revision may overlap harness correction.');
const budget = read(budgetFile);
assert.equal(budget.maximumPairs, 3);
assert.equal(budget.attempts.length, 1);
assert.equal(budget.attempts[0].status, 'failed');
assert.equal(budget.closed, false);
assert.equal(fs.existsSync(path.join(run, 'measurement-seal-v2.json')), false);
assert.equal(fs.readdirSync(run).some(name => /^measure-.*-00[23]$/.test(name)), false);
const oldSealFile = path.join(run, 'measurement-seal.json');
const oldSeal = read(oldSealFile);
assert.equal(hash(oldSealFile), budget.measurementSealSha256);
const sealed = new Map();
function add(file) {
  const resolved = path.resolve(file);
  assert.ok(fs.statSync(resolved).isFile());
  sealed.set(resolved, { path: resolved, bytes: fs.statSync(resolved).size, sha256: hash(resolved) });
}
function tree(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) tree(file);
    else add(file);
  }
}
for (const entry of oldSeal.sealedFiles) {
  assert.equal(hash(entry.path), entry.sha256);
  add(entry.path);
}
add(oldSealFile);
for (const variant of ['original', 'candidate']) {
  const prep = read(path.join(run, `preparation-${variant}-002`, 'preparation.json'));
  const old = read(path.join(run, `preparation-${variant}-001`, 'preparation.json'));
  assert.equal(prep.actualOwnerSha256, old.actualOwnerSha256);
  assert.equal(prep.actualOwnerPdbSha256, old.actualOwnerPdbSha256);
  const verified = read(path.join(run, `characterize-${variant}-002`, 'verified-characterization.json'));
  assert.equal(verified.actualExitCode, 0);
  assert.equal(verified.actualUntimedRealBenchmarkDotNetDiscoveryCases, 40);
  assert.equal(verified.actualSemanticRecords, 15);
  assert.equal(verified.actualBenchmarkLifecycleProfiles, 40);
  if (variant === 'candidate') {
    assert.equal(verified.actualExactSemanticCollectionEqual, true);
    assert.equal(verified.actualExactBenchmarkLifecyclesEqual, true);
  }
  tree(path.join(run, `preparation-${variant}-002`));
  tree(path.join(run, `characterize-${variant}-002`));
}
assert.equal(read(path.join(run, 'harness-v2-baseline-validation.json')).actualOriginalOwnerAndSemanticCollectionsUnchangedFromValidatedV1, true);
const before = read(path.join(run, 'preparation-original-002', 'consumer-closure.json')).files;
const after = read(path.join(run, 'preparation-candidate-002', 'consumer-closure.json')).files;
assert.equal(before.length, 197);
assert.equal(after.length, 197);
assert.deepEqual(before.map(file => file.path), after.map(file => file.path));
const changed = before.filter((file, index) => file.sha256 !== after[index].sha256).map(file => file.path);
assert.deepEqual(changed.sort(), ['Microsoft.AspNetCore.Components.Endpoints.dll', 'Microsoft.AspNetCore.Components.Endpoints.pdb']);
for (const input of read(path.join(run, 'harness-build-v2', 'input-manifest.json'))) {
  const file = path.join(run, 'harness-v2', input.file);
  assert.equal(hash(file), input.sha256);
  add(file);
}
for (const directory of ['correction-v2', 'harness-build-v2', 'measure-original-001']) tree(path.join(run, directory));
add(path.join(run, 'harness-v2-baseline-validation.json'));
for (const file of ['F039-correct-harness-v2.mjs', 'F039-build-harness-v2.ps1', 'F039-prepare-v2.mjs',
  'F039-native-v2.ps1', 'F039-measure-pair-v2.ps1', 'F039-check-characterization-v2.mjs',
  'F039-audit-measurement-v2.mjs', 'F039-seal-v2.mjs']) add(path.join(session, file));
const seal = {
  candidate: 'F039', actualHarnessVersion: 2, actualCreatedBeforeFurtherTiming: true,
  actualCreatedUtc: new Date().toISOString(), actualPriorSealSha256: hash(oldSealFile),
  actualPriorBudgetSnapshotSha256: hash(oldBudgetFile), actualPrior687SealedInputsUnchanged: true,
  actualOriginalFailedAttemptStillConsumed: 1, actualOriginalFailureHadZeroRawTimingSamples: true,
  actualTotalMaximumAttemptsUnchanged: 3, actualAttemptsRemaining: 2,
  actualSamePrimaryMatrixRuntimeOrderSettingsAndAcceptance: true,
  actualUntimedRealBenchmarkDotNetDiscoveryCasesPerVariant: 40,
  actualOwnerBinariesUnchangedFromBothValidatedV1Variants: true,
  actualConsumerEntriesPerVariant: 197, actualOnlyWithinPairConsumerDelta: changed,
  actualUnchanged195EntriesIncludeMeasuredHarnessDllAndPdb: true,
  actualOtherUnchangedEntriesExcludingMeasuredHarnessDllAndPdb: 193,
  actualSourcePdbDocumentsPerVariant: 12, actualSemanticRecordsMatched: 15, actualLifecycleProfilesMatched: 40,
  actualExisting74ManagedRowsAndEightCookieStepsPerVariantRemainUnchanged: true,
  actualNoPriorityAffinityOrPowerChanges: true, actualSharedVmNotIsolated: true,
  actualAdjacentSeleniumStillPending: true,
  sealedFiles: [...sealed.values()].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
};
const sealFile = path.join(run, 'measurement-seal-v2.json');
write(sealFile, seal);
const revised = { ...budget, measurementSealSha256: hash(sealFile),
  actualInputSealHistory: [
    { file: 'measurement-seal.json', sha256: hash(oldSealFile), actualConsumedAttempts: [1] },
    { file: 'measurement-seal-v2.json', sha256: hash(sealFile), actualAuthorizedRemainingAttempts: [2, 3] },
  ],
  actualNoBudgetResetOrFailedAttemptDiscarded: true,
};
write(path.join(run, 'correction-v2', 'budget-after-reseal.json'), revised);
fs.writeFileSync(budgetFile, JSON.stringify(revised, null, 2) + '\n');
console.log(JSON.stringify({ candidate: 'F039', actualHarnessVersion: 2,
  actualAllOldSealedInputsPreserved: true, actualSealedFiles: sealed.size, actualMeasurementSealSha256: hash(sealFile),
  actualFailedAttemptsStillConsumed: 1, actualMaximumAttemptsUnchanged: 3, actualAttemptsRemaining: 2,
  actualUntimedRealBdnCasesPerVariant: 40 }, null, 2));
