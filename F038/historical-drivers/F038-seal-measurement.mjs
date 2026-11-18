import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F038');
const root = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(path.join(run, file), 'utf8'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const sealFile = path.join(run, 'measurement-seal.json');
const budgetFile = path.join(run, 'source-comparison-budget.json');
assert.equal(fs.existsSync(sealFile), false);
assert.equal(fs.existsSync(budgetFile), false);
assert.equal(fs.readdirSync(run).some(name => /^measure-/.test(name)), false);
assert.equal(read('baseline-validation.json').actualBaselineValidationPassed, true);
assert.equal(read('formatting-candidate-001/command.json').actualExitCode, 0);
const equivalence = read('characterize-candidate-001/verified-characterization.json');
assert.equal(equivalence.actualExactSemanticCollectionEqual, true);
assert.equal(equivalence.actualExactBenchmarkLifecyclesEqual, true);
const sealedFiles = new Map();
function add(file) {
  const resolved = path.resolve(file);
  assert.ok(fs.statSync(resolved).isFile(), resolved);
  sealedFiles.set(resolved, {
    path: resolved, bytes: fs.statSync(resolved).size, sha256: hash(resolved),
  });
}
function tree(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) tree(file);
    else add(file);
  }
}
const originalPreparation = read('preparation-original-001/verified-preparation.json');
const originalClosure = read('preparation-original-001/consumer-closure.json');
const candidatePreparation = read('preparation-candidate-001/verified-preparation.json');
const candidateClosure = read('preparation-candidate-001/consumer-closure.json');
assert.equal(originalClosure.files.length, 106);
assert.equal(candidateClosure.files.length, 106);
const changed = [];
for (const before of originalClosure.files) {
  const after = candidateClosure.files.find(file => file.path === before.path);
  assert.ok(after, before.path);
  for (const [variant, entry] of [['original', before], ['candidate', after]]) {
    const file = path.join(run, `preparation-${variant}-001`, 'consumer', entry.path);
    assert.equal(hash(file), entry.sha256);
  }
  if (before.sha256 !== after.sha256) changed.push(before.path);
}
assert.deepEqual(changed.sort(), ['Microsoft.AspNetCore.Components.dll', 'Microsoft.AspNetCore.Components.pdb']);
const browserOwnerHashes = {};
for (const variant of ['original', 'candidate']) {
  const browser = read(`sample-${variant}/browser-result.json`);
  assert.equal(browser.actualPassed, true);
  assert.equal(browser.actualStepCount, 5);
  assert.equal(browser.actualInteractiveReadyObserved, true);
  assert.equal(browser.pageErrors.length, 0);
  assert.equal(browser.consoleMessages.filter(message => message.type === 'error').length, 0);
  assert.ok(read(`sample-${variant}/stopped-owned-processes.json`).every(process => !process.CurrentlyPresent));
  const tests = read(`validation/${variant}-existing-1/verified-result.json`);
  assert.equal(tests.actualPassed, 83);
  assert.equal(tests.actualSkipped, 0);
  const closure = variant === 'original' ? originalClosure : candidateClosure;
  assert.equal(browser.actualOwnerSha256,
    closure.files.find(file => file.path === 'Microsoft.AspNetCore.Components.dll').sha256);
  browserOwnerHashes[variant] = browser.actualOwnerSha256;
  tree(path.join(run, `preparation-${variant}-001`));
  tree(path.join(run, `characterize-${variant}-001`));
  tree(path.join(run, 'validation', `${variant}-existing-1`));
  for (const name of ['browser-result.json', 'final-keyed-dom.png', 'launch.json',
    'startup-owned-processes.json', 'startup-listener.json', 'stopped-owned-processes.json']) {
    add(path.join(run, `sample-${variant}`, name));
  }
}
for (const entry of originalPreparation.actualHarnessFiles) {
  const file = path.join(run, 'harness', entry.file);
  assert.equal(hash(file), entry.sha256);
  add(file);
}
for (const source of candidatePreparation.actualSelectedSourceFiles) {
  const file = path.join(root, source.path);
  assert.equal(hash(file), source.sha256);
  add(file);
}
for (const file of ['acceptance-plan.json', 'baseline-validation.json', 'source-comparison-plan.json',
  'investigation.json']) add(path.join(run, file));
tree(path.join(run, 'formatting-candidate-001'));
for (const file of ['F038-native.ps1', 'F038-measure-pair.ps1', 'F038-seal-measurement.mjs',
  'F038-prepare-candidate.ps1', 'F038-browser-probe.mjs']) add(path.join(session, file));
const acceptance = read('acceptance-plan.json');
const plan = read('source-comparison-plan.json');
assert.equal(plan.primary, 'KeyedStable:Integer:256');
assert.equal(plan.pairsMaximum, 3);
const contract = {
  candidate: 'F038',
  actualCreatedBeforeTiming: true,
  actualCreatedUtc: new Date().toISOString(),
  primary: plan.primary,
  actualProfilesPerMember: 40,
  actualResultSamplesPerProfile: 8,
  actualMaximumSourceComparisonAttemptsIncludingPartialTiming: 3,
  actualPairOrder: plan.order,
  actualExpectedSettings: acceptance.benchmarkDesign.settings,
  actualRetentionRule: acceptance.benchmarkDesign.minimumMeaningfulDraft,
  actualOther104ConsumerFilesAndMeasuredHarnessByteIdentical: true,
  actualOnlyConsumerDelta: changed,
  actualBrowserOwnerHashes: browserOwnerHashes,
  actualSemanticCollectionsMatched: 44,
  actualActualBenchmarkLifecyclesMatched: 40,
  actualActualOwningRowsPerVariant: 83,
  actualNoPriorityAffinityOrPowerChanges: true,
  actualSharedVmNotIsolated: true,
  actualNotFullCurrentMainOrWasmAotOrApplicationThroughput: true,
  sealedFiles: [...sealedFiles.values()].sort((a, b) => a.path.localeCompare(b.path)),
};
fs.writeFileSync(sealFile, JSON.stringify(contract, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(budgetFile, JSON.stringify({
  candidate: 'F038',
  maximumPairs: 3,
  closed: false,
  measurementSealSha256: hash(sealFile),
  attempts: [],
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F038', actualInputsSealedBeforeTiming: true,
  actualSealedFiles: sealedFiles.size, actualMeasurementSealSha256: hash(sealFile),
  actualSourceComparisonAttemptsStarted: 0, actualMaximumAttempts: 3 }, null, 2));
