import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F036');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const receiptPath = path.join(run, 'measurement-plan-receipt.json');
const budgetPath = path.join(run, 'measurement-budget.json');
assert.equal(fs.existsSync(receiptPath), false);
assert.equal(fs.existsSync(budgetPath), false);
const preparation = 'preparation-original-001';
const characterization = 'characterize-original-001';
const prepared = path.join(run, preparation, 'prepared');
const capsuleFile = path.join(prepared, 'capsule.json');
const capsule = read(capsuleFile);
const closure = read(capsule.closurePath);
const profile = path.join(run, 'profiles', characterization);
const verified = read(path.join(profile, 'verified-native-exit.json'));
assert.equal(verified.actualMode, 'characterize');
assert.equal(verified.actualNativeExitCode, 0);
assert.equal(verified.actualClosureBeforeAndAfterMatched, true);
assert.equal(verified.actualHarnessSha256, capsule.actualHarnessSha256);
assert.equal(verified.actualHarnessPdbSha256, capsule.actualHarnessPdbSha256);
assert.equal(capsule.actualShippingChanges, 0);
assert.equal(capsule.variant, 'original');
assert.equal(closure.files.length, capsule.actualClosureFiles);
for (const file of closure.files) {
  assert.equal(sha(path.join(capsule.output, file.path)), file.sha256);
}
for (const file of capsule.sourceFiles) {
  assert.equal(sha(path.join(prepared, file.path)), file.sha256);
  if (file.path.startsWith('sources\\harness\\')) {
    assert.equal(sha(path.join(run, 'harness', path.basename(file.path))), file.sha256);
  }
}
const stateFiles = fs.readdirSync(path.join(profile, 'states')).filter(file => file.endsWith('.json')).sort()
  .map(file => path.join(profile, 'states', file));
const state = suffix => {
  const files = stateFiles.filter(file => file.endsWith('-' + suffix + '.json'));
  assert.equal(files.length, 1, suffix);
  return read(files[0]);
};
const completion = state('characterization-completed');
const contracts = state('contracts');
const lifecycles = state('benchmark-lifecycles');
assert.equal(completion.actualAllSuccessful, true);
assert.equal(completion.actualSemanticRecords, 33);
assert.equal(completion.actualBenchmarkLifecycleProfiles, 32);
assert.equal(completion.actualPublicBaseTypedCopyAndDerivedProducers, true);
assert.equal(contracts.records.length, 33);
assert.equal(new Set(contracts.records.map(row => row.name)).size, 33);
assert.equal(lifecycles.records.length, 32);
for (const row of lifecycles.records) {
  assert.equal(row.actualScore, row.expectedScore);
}
const plan = read(path.join(run, 'measurement-plan.json'));
const expected = plan.methods.flatMap(method => plan.counts.map(count => `${method}:${count}`)).sort();
assert.deepEqual(lifecycles.records.map(row => row.name).sort(), expected);
assert.equal(plan.sourceComparisonsPlanned, 0);
assert.equal(plan.profiles, 32);
const settings = stateFiles.map(file => read(file)).filter(row => row.actualSettings).map(row => row.actualSettings);
const initial = state('runtime-characterize-before');
const final = state('runtime-characterize-after');
assert.equal(settings.length, 64);
assert.equal(initial.serverGc, true);
assert.equal(initial.runtime, '12.0.0');
assert.equal(initial.processId, final.processId);
assert.deepEqual(initial.initialSettings, final.initialSettings);
assert.ok(settings.every(value => JSON.stringify(value) === JSON.stringify(initial.initialSettings)));
const witnesses = stateFiles.filter(file => path.basename(file).includes('-source-pdb-')).map(read);
assert.equal(witnesses.length, 3);
assert.equal(witnesses.reduce((sum, row) => sum + row.documents.length, 0), 9);
assert.ok(witnesses.every(row => row.actualPePdbBindingMatched));
for (const directory of fs.readdirSync(path.join(run, 'profiles'))) {
  const file = path.join(run, 'profiles', directory, 'invocation.json');
  if (fs.existsSync(file)) {
    assert.notEqual(read(file).mode, 'measure', 'Do not seal retroactively after timing.');
  }
}
const relativeFiles = ['acceptance.json', 'api-assessment.json', 'investigation.json', 'measurement-plan.json',
  'constructor-dependency-review\\verified-dependency-drift.json',
  'validation\\original-existing-1\\verified-result.json', 'validation\\original-existing-1\\actual-outcomes.json',
  'validation\\original-existing-1\\owning.trx'];
const sealed = [...relativeFiles.map(file => path.join(run, file)), capsuleFile, capsule.closurePath,
  ...capsule.sourceFiles.map(file => path.join(prepared, file.path)),
  ...fs.readdirSync(path.join(run, 'harness')).filter(file => /\.(cs|csproj)$/.test(file))
    .map(file => path.join(run, 'harness', file)),
  path.join(profile, 'invocation.json'), path.join(profile, 'verified-native-exit.json'),
  path.join(profile, 'native-process-started.json'), path.join(profile, 'native.stdout'),
  path.join(profile, 'native.stderr'), ...stateFiles];
assert.equal(new Set(sealed).size, sealed.length);
const receipt = {
  candidate: 'F036', actualSealedBeforeAnyNativeTiming: true, actualOriginalContractsAndLifecyclesPassed: true,
  actualSemanticRecords: 33, actualBenchmarkLifecycles: 32, actualCharacterizationSettingsObservations: 64,
  actualSelectedPePdbSourceDocumentAssociations: 9, actualSourceComparisonsStarted: 0,
  actualAuthoritativePreparation: preparation, actualAuthoritativeCharacterization: characterization,
  actualCurrentDefaultTemplateInfoDriftAcknowledged: true,
  actualFrozenConsumerFiles: closure.files.length, actualCreated: new Date().toISOString(),
  sealedFiles: sealed.map(file => ({ path: file, sha256: sha(file) })),
};
const budget = {
  candidate: 'F036', experiment: 'original-only-diagnostics', maximumActualSourceComparisons: 3,
  actualSourceComparisonsStarted: 0, actualSourceComparisonsCompleted: 0, actualSourceComparisonsConcluded: 0,
  sourceComparisonBudgetClosed: true, sourceComparisonClosureReason: 'No justified compatible implementation established;do not invent public API or gain.',
  maximumOriginalOnlyAttempts: 3, maximumSuccessfulOriginalOnlyRuns: 1,
  originalOnlyProfilesStarted: [], originalOnlyProfilesConcluded: [], originalOnlyBudgetClosed: false,
  authoritativePreparation: preparation, authoritativeCharacterization: characterization,
};
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(budgetPath, JSON.stringify(budget, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualSealedFiles: sealed.length, actualFrozenConsumerFiles: closure.files.length,
  actualSemanticRecords: 33, actualBenchmarkLifecycles: 32, actualSourceComparisonsStarted: 0,
  actualOriginalOnlyTimingAttempts: 0, actualPlanSha256: sha(path.join(run, 'measurement-plan.json')) }, null, 2));
