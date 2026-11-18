import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F036');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const receiptPath = path.join(run, 'source-comparison-contracts.json');
const budgetPath = path.join(run, 'source-comparison-budget.json');
assert.equal(fs.existsSync(receiptPath), false);
assert.equal(fs.existsSync(budgetPath), false);
const originalOnly = read(path.join(run, 'measurement-plan-receipt.json'));
for (const file of originalOnly.sealedFiles) {
  assert.equal(sha(file.path), file.sha256, 'Original-only phase seal must remain unchanged.');
}
const diagnostic = read(path.join(run, 'statistics-audit.json'));
assert.equal(diagnostic.actualSamplesRecomputedAndMatchedToStdout, 256);
assert.equal(diagnostic.actualDeclaredDiagnosticPrimaryRow.actualBytesPerOperation, 56);
assert.equal(diagnostic.actualSourceComparisonsStarted, 0);
const planFile = path.join(run, 'source-comparison-plan.json');
const plan = read(planFile);
assert.equal(plan.maximumActualSourceComparisonsIncludingFailedOrPartialStarts, 3);
assert.equal(plan.diagnosticPrimaryRetainedAsComparisonPrimary, 'ReadCopy:1');
const preparations = { original: 'comparison-preparation-original', candidate: 'comparison-preparation-candidate' };
const characterizations = { original: 'characterize-comparison-original', candidate: 'characterize-comparison-candidate' };
const images = {};
const sealFiles = [planFile, path.join(run, 'acceptance.json'), path.join(run, 'measurement-plan-receipt.json'),
  path.join(run, 'measurement-budget.json'), path.join(run, 'statistics-audit.json'),
  path.join(run, 'constructor-dependency-review', 'verified-dependency-drift.json'),
  path.join(session, 'F036-comparison-run-profile.ps1'),
  path.join(session, 'F036-freeze-candidate.ps1'),
  fileURLToPath(import.meta.url)];
for (const variant of ['original', 'candidate']) {
  const capsuleFile = path.join(run, preparations[variant], 'prepared', 'capsule.json');
  const capsule = read(capsuleFile);
  const closure = read(capsule.closurePath);
  const prepared = path.dirname(capsule.closurePath);
  assert.equal(capsule.variant, variant);
  assert.equal(closure.files.length, 289);
  for (const file of closure.files) {
    assert.equal(sha(path.join(capsule.output, file.path)), file.sha256);
  }
  for (const file of capsule.sourceFiles) {
    const full = path.join(prepared, file.path);
    assert.equal(sha(full), file.sha256);
    sealFiles.push(full);
  }
  const profile = path.join(run, 'profiles', characterizations[variant]);
  const verified = read(path.join(profile, 'verified-native-exit.json'));
  assert.equal(verified.actualNativeExitCode, 0);
  assert.equal(verified.actualMode, 'characterize');
  assert.equal(verified.actualHarnessSha256, capsule.actualHarnessSha256);
  assert.equal(verified.actualHarnessPdbSha256, capsule.actualHarnessPdbSha256);
  const states = fs.readdirSync(path.join(profile, 'states')).filter(file => file.endsWith('.json')).sort()
    .map(file => path.join(profile, 'states', file));
  const state = suffix => {
    const files = states.filter(file => file.endsWith('-' + suffix + '.json'));
    assert.equal(files.length, 1, suffix);
    return read(files[0]);
  };
  const completion = state('characterization-completed');
  assert.equal(completion.actualAllSuccessful, true);
  assert.equal(completion.actualSemanticRecords, 33);
  assert.equal(completion.actualBenchmarkLifecycleProfiles, 32);
  const contracts = state('contracts');
  const lifecycles = state('benchmark-lifecycles');
  assert.equal(contracts.records.length, 33);
  assert.equal(lifecycles.records.length, 32);
  const initial = state('runtime-characterize-before');
  const final = state('runtime-characterize-after');
  assert.equal(initial.variant, variant);
  assert.equal(initial.runtime, '12.0.0');
  assert.equal(initial.serverGc, true);
  assert.deepEqual(initial.initialSettings, final.initialSettings);
  const settings = states.map(read).filter(row => row.actualSettings).map(row => row.actualSettings);
  assert.equal(settings.length, 64);
  assert.ok(settings.every(value => JSON.stringify(value) === JSON.stringify(initial.initialSettings)));
  const unitDirectory = path.join(run, 'validation', `${variant}-existing-1`);
  const unit = read(path.join(unitDirectory, 'verified-result.json'));
  assert.equal(unit.actualPassed, 19);
  assert.equal(unit.actualSkipped, 0);
  assert.equal(unit.actualFailures, 0);
  sealFiles.push(capsuleFile, capsule.closurePath, ...states,
    ...['invocation.json', 'verified-native-exit.json', 'native-process-started.json', 'native.stdout', 'native.stderr']
      .map(file => path.join(profile, file)),
    ...['verified-result.json', 'actual-outcomes.json', 'owning.trx', 'selection.json']
      .map(file => path.join(unitDirectory, file)));
  images[variant] = { capsule, closure, contracts, lifecycles, methods: state('actual-methods') };
}
const before = images.original;
const after = images.candidate;
assert.equal(before.capsule.actualHarnessSha256, after.capsule.actualHarnessSha256);
assert.equal(before.capsule.actualHarnessPdbSha256, after.capsule.actualHarnessPdbSha256);
assert.deepEqual(before.contracts, after.contracts);
assert.deepEqual(before.lifecycles, after.lifecycles);
assert.deepEqual(before.methods.actualNongenericOwner.instructions, after.methods.actualNongenericOwner.instructions);
assert.equal(before.methods.actualNoPublicPatternEnumerator, true);
assert.equal(after.methods.actualNoPublicPatternEnumerator, true);
const afterMap = new Map(after.closure.files.map(file => [file.path, file.sha256]));
const differences = before.closure.files.filter(file => afterMap.get(file.path) !== file.sha256);
assert.deepEqual(differences.map(file => file.path).sort(),
  ['Microsoft.AspNetCore.Mvc.ViewFeatures.dll', 'Microsoft.AspNetCore.Mvc.ViewFeatures.pdb']);
const priorContracts = path.join(run, 'profiles', 'characterize-original-001', 'states', '0006-contracts.json');
assert.deepEqual(before.contracts, read(priorContracts));
for (const name of fs.readdirSync(path.join(run, 'profiles'))) {
  assert.equal(/^comparison-[1-3]-(original|candidate)$/.test(name), false, 'Seal before any source comparison timing.');
}
assert.equal(new Set(sealFiles).size, sealFiles.length);
const receipt = {
  candidate: 'F036', phase: 'same-signature-source-comparison', actualSealedBeforeSourceComparisonTiming: true,
  actualAllConcreteRecordsIdentical: true, actualSemanticRecordsPerImage: 33,
  actualBenchmarkLifecyclesPerImage: 32, actualSameHarnessAndOnlyOwnerPairChanged: true,
  actualNongenericResolvedInstructionsUnchanged: true, actualNoPublicPatternEnumeratorEitherVariant: true,
  actualFrozenFilesPerImage: 289, actualChangedOwnerFiles: differences.map(file => file.path),
  actualUnchangedFilesIncludingTwoHarnessFiles: 287, actualOtherUnchangedFilesExcludingHarnessPair: 285,
  actualOriginalOnlyPhaseUnmodified: true, actualOriginalOnlyTimingNotReusedAsPairedMember: true,
  actualSourceComparisonAttemptsBeforeSeal: 0, actualCreated: new Date().toISOString(),
  sealedFiles: sealFiles.map(file => ({ path: file, sha256: sha(file) })),
};
const budget = {
  candidate: 'F036', phase: 'same-signature-source-comparison', maximumActualSourceComparisons: 3,
  actualSourceComparisonsStarted: 0, actualSourceComparisonsCompleted: 0, actualSourceComparisonsConcluded: 0,
  sourceComparisonBudgetClosed: false, pairedOrder: plan.pairedOrder,
  authoritativePreparations: preparations, authoritativeCharacterizations: characterizations,
  nativeProfilesStarted: [], nativeProfilesCompleted: [], comparisonsSettled: [],
  originalOnlyDiagnosticPhaseRemainsSeparatelyClosed: true, originalOnlyDiagnosticSourceComparisons: 0,
};
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(budgetPath, JSON.stringify(budget, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualIdenticalSemanticRecords: 33, actualIdenticalBenchmarkLifecycles: 32,
  actualUnchangedConsumerFiles: 287, actualChangedOwnerFiles: 2, actualSealedFiles: sealFiles.length,
  actualSourceComparisonsStarted: 0 }, null, 2));
