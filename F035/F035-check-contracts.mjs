import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F035');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const budget = read(path.join(run, 'measurement-budget.json'));
assert.equal(budget.actualSourceComparisonsStarted, 0);
assert.equal(budget.nativeProfilesStarted.length, 0);
const planFile = path.join(run, 'measurement-plan.json');
const receipt = read(path.join(run, 'measurement-plan-receipt.json'));
const plan = read(planFile);
assert.equal(hash(planFile), receipt.actualPlanSha256);
assert.equal(plan.actualSealedBeforeShippingEditAndAnyTiming, true);
const results = {};
const images = {};
for (const variant of ['original', 'candidate']) {
  const preparation = path.join(run, budget.authoritativePreparations[variant], 'prepared');
  const image = read(path.join(preparation, 'capsule.json'));
  images[variant] = { image, closure: read(image.closurePath) };
  assert.equal(image.actualHarnessSha256, plan.actualOriginalHarnessSha256);
  assert.equal(image.actualHarnessPdbSha256, plan.actualOriginalHarnessPdbSha256);
  for (const source of image.sourceFiles) {
    assert.equal(hash(path.join(preparation, source.path)), source.sha256);
  }
  for (const file of images[variant].closure.files) {
    assert.equal(hash(path.join(image.output, file.path)), file.sha256);
  }
  const profile = path.join(run, 'profiles', budget.authoritativeCharacterizations[variant]);
  const exit = read(path.join(profile, 'verified-native-exit.json'));
  assert.equal(exit.actualNativeExitCode, 0);
  assert.equal(exit.actualMode, 'characterize');
  const states = fs.readdirSync(path.join(profile, 'states')).map(file => read(path.join(profile, 'states', file)));
  const completion = states.find(row => row.actualConcreteSemanticObservations !== undefined);
  assert.equal(completion.actualConcreteSemanticObservations, 61);
  assert.equal(completion.actualBenchmarkLifecycleProfiles, 20);
  const observations = states.filter(row => row.key !== undefined).sort((a, b) => a.key.localeCompare(b.key));
  assert.equal(observations.length, 61);
  assert.equal(new Set(observations.map(row => row.key)).size, 61);
  results[variant] = observations;
  const native = states.find(row => row.mode === 'characterize-before');
  assert.equal(native.initialSettings.processPriority, 'Normal');
  assert.equal(native.initialSettings.threadPriority, 'Normal');
  const methods = states.find(row => row.actualOwner !== undefined);
  assert.equal(methods.actualShippedReturnTypePreserved, true);
  assert.equal(methods.actualCollectionBinderCallsShippedEnumerator, true);
  const tests = read(path.join(run, 'validation', `${variant}-existing-1`, 'verified-result.json'));
  assert.equal(tests.actualPassed, 34);
  assert.equal(tests.actualSkipped, 0);
  for (const scope of ['abstractions', 'core']) {
    const invoke = read(path.join(run, 'validation', `${variant}-existing-1`, scope, 'invocation.json'));
    assert.equal(invoke.actualExitCode, 0);
    if (variant === 'candidate') {
      assert.ok(Date.parse(invoke.started) > Date.parse(plan.actualCreated));
    }
  }
}
assert.deepEqual(results.candidate, results.original);
const before = images.original.closure.files;
const after = images.candidate.closure.files;
assert.equal(before.length, 304);
assert.deepEqual(after.map(row => row.path).sort(), before.map(row => row.path).sort());
const differences = before.filter(row => after.find(other => row.path === other.path).sha256 !== row.sha256).map(row => row.path);
assert.deepEqual(differences.sort(), ['Microsoft.AspNetCore.Mvc.Abstractions.dll', 'Microsoft.AspNetCore.Mvc.Abstractions.pdb']);
const report = {
  candidate: 'F035', actualConcreteObservationsPerImage: 61, actualBenchmarkLifecycleProfilesPerImage: 20,
  actualAllConcreteObservationsIdentical: true, actualSameHarnessAndOnlyOwnerPairChanged: true,
  actualConsumerFilesPerImage: 304, actualChangedOwnerFiles: differences,
  actualUnchangedConsumerFilesIncludingHarness: 302, actualUnchangedHarnessFilesIncludedIn302: 2,
  actualOtherUnchangedConsumerFiles: 300, actualObservations: results.original,
  actualPlanSha256: receipt.actualPlanSha256, actualPlanPrecedesCandidateTest: true,
  actualSourceComparisonsStartedAtVerification: 0, actualComparativeTimingPerformed: false,
};
fs.writeFileSync(path.join(run, 'premeasurement-contract-comparison.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log('F035:all61 concrete observations match;identical harness/304-file consumers differ only in2tested owner files;0timing slots started.');
