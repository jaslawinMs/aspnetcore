import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F039');
const root = String.raw`C:\src\aspnetcore`;
const mode = process.argv[2];
assert.ok(['archive-sample', 'seal'].includes(mode));
const read = file => JSON.parse(fs.readFileSync(path.join(run, file), 'utf8'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(path.join(run, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(fs.existsSync(path.join(run, 'measurement-seal.json')), false);
assert.equal(fs.existsSync(path.join(run, 'source-comparison-budget.json')), false);
assert.equal(fs.readdirSync(run).some(name => /^measure-/.test(name)), false);
const plan = read('acceptance-plan.json');
assert.equal(read('baseline-validation.json').actualBaselineValidationPassed, true);
assert.equal(read('validation/Format-candidate-1/command.json').actualExitCode, 0);
const equivalent = read('characterize-candidate-001/verified-characterization.json');
assert.equal(equivalent.actualExactSemanticCollectionEqual, true);
assert.equal(equivalent.actualExactBenchmarkLifecyclesEqual, true);
const originalClosure = read('preparation-original-001/consumer-closure.json');
const candidateClosure = read('preparation-candidate-001/consumer-closure.json');
assert.equal(originalClosure.files.length, 197);
assert.equal(candidateClosure.files.length, 197);
const changed = [];
for (const before of originalClosure.files) {
  const after = candidateClosure.files.find(file => file.path === before.path);
  assert.ok(after, before.path);
  for (const [variant, file] of [['original', before], ['candidate', after]])
    assert.equal(hash(path.join(run, `preparation-${variant}-001`, 'consumer', file.path)), file.sha256);
  if (before.sha256 !== after.sha256) changed.push(before.path);
}
assert.deepEqual(changed.sort(), ['Microsoft.AspNetCore.Components.Endpoints.dll', 'Microsoft.AspNetCore.Components.Endpoints.pdb']);
const browsers = {};
for (const variant of ['original', 'candidate']) {
  const browser = read(`sample-${variant}/browser-result.json`);
  assert.equal(browser.actualPassed, true);
  assert.equal(browser.actualStepCount, 8);
  assert.equal(browser.pageErrors.length, 0);
  assert.equal(browser.consoleMessages.filter(message => message.type === 'error').length, 0);
  assert.equal(read(`sample-${variant}/stop-verification.json`).actualOwnedProcessesStopped, true);
  const tests = read(`validation/Tests-${variant}-${variant === 'original' ? 2 : 1}/verified-result.json`);
  assert.equal(tests.actualPassed, 74);
  assert.equal(tests.actualSkipped, 0);
  const closure = variant === 'original' ? originalClosure : candidateClosure;
  assert.equal(browser.actualOwnerSha256,
    closure.files.find(file => file.path === 'Microsoft.AspNetCore.Components.Endpoints.dll').sha256);
  browsers[variant] = browser;
}
const semanticSteps = browser => browser.steps.map(step => Object.fromEntries(
  ['name', 'mode', 'message', 'contains', 'nullPresent', 'nullMissing'].map(key => [key, step[key]])));
assert.deepEqual(semanticSteps(browsers.original), semanticSteps(browsers.candidate));
const owner = path.join(root, 'src', 'Components', 'Endpoints', 'src', 'TempData', 'TempData.cs');
const tests = path.join(root, 'src', 'Components', 'Endpoints', 'test', 'TempData', 'TempDataTest.cs');
const sample = path.join(root, 'src', 'Components', 'Samples', 'BlazorWebAppPerPage', 'Components', 'Pages', 'F039TempDataProbe.razor');
assert.equal(hash(owner), read('preparation-candidate-001/preparation.json').actualOwnerSourceSha256);
if (mode === 'archive-sample') {
  const directory = path.join(run, 'sample-source');
  fs.mkdirSync(directory);
  fs.copyFileSync(sample, path.join(directory, path.basename(sample)), fs.constants.COPYFILE_EXCL);
  const proposed = path.join(run, 'proposed-source');
  fs.mkdirSync(proposed);
  fs.copyFileSync(owner, path.join(proposed, 'TempData.cs'), fs.constants.COPYFILE_EXCL);
  fs.copyFileSync(tests, path.join(proposed, 'TempDataTest.cs'), fs.constants.COPYFILE_EXCL);
  const diff = spawnSync('git', ['--no-pager', 'diff', '--',
    'src/Components/Endpoints/src/TempData/TempData.cs',
    'src/Components/Endpoints/test/TempData/TempDataTest.cs'], { cwd: root, windowsHide: true });
  assert.equal(diff.status, 0, diff.stderr.toString());
  fs.writeFileSync(path.join(proposed, 'candidate.patch'), diff.stdout, { flag: 'wx' });
  write('permanent-test-handoff.json', {
    candidate: 'F039', actualRecordedBeforeTiming: true,
    actualBehaviorOwner: plan.workflow.permanentBoundary.behaviorOwner,
    actualProducer: plan.workflow.permanentBoundary.producer,
    actualObservable: plan.workflow.permanentBoundary.observable,
    actualSelectedSurface: 'Microsoft.AspNetCore.Components.Endpoints.TempDataTest',
    actualLowerBoundaryFalsePassRisk: plan.workflow.permanentBoundary.lowerBoundaryFalsePassRisk,
    actualMethods: ['CollectionContains_PreservesValues_WhenFirstAccessTriggersLazyLoad', 'CollectionContains_DoesNotRetainConsumedValue'],
    actualTheoryRowsPerVariant: 8, actualOtherFactRowsPerVariant: 1,
    actualCompleteTempDataRowsPerVariant: 74,
    actualOriginalAndCandidateBothPreserveExistingSemanticsNotSemanticBugRedGreen: true,
    actualCookieBrowserStepsPerVariant: 8, actualCookieBrowserSemanticStepsEqual: true,
    actualTemporarySampleSourceSha256: hash(sample),
    actualTemporarySampleMayNowBeRemoved: true,
    actualAdjacentSeleniumStillPending: true,
    actualNoFullCurrentDefaultBuildOrApplicationSpeedupClaimed: true,
  });
  console.log(JSON.stringify({ candidate: 'F039', actualOriginalAndCandidatePreservationAccepted: true,
    actualSampleArchivedBeforeRemoval: true, actualNewPermanentRowsPerVariant: 9,
    actualBrowserStepsPerVariant: 8, actualSourceComparisonsStarted: 0 }, null, 2));
} else {
  assert.equal(fs.existsSync(sample), false, 'Remove only the archived task-created sample before sealing.');
  assert.equal(hash(path.join(run, 'sample-source', path.basename(sample))),
    read('permanent-test-handoff.json').actualTemporarySampleSourceSha256);
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
  for (const directory of ['investigation', 'context', 'validation', 'sample-source', 'proposed-source',
    'preparation-original-001', 'preparation-candidate-001', 'characterize-original-001', 'characterize-candidate-001'])
    tree(path.join(run, directory));
  for (const variant of ['original', 'candidate'])
    for (const name of ['browser-result.json', 'final-cookie-state.png', 'launch.json', 'startup-listener.json',
      'stop-verification.json', 'stdout.log']) add(path.join(run, `sample-${variant}`, name));
  for (const input of read('preparation-original-001/harness-source-manifest.json').files) {
    const file = path.join(run, 'harness', input.file);
    assert.equal(hash(file), input.sha256);
    add(file);
  }
  for (const file of ['acceptance-plan.json', 'baseline-validation.json', 'investigation.json', 'context.json',
    'permanent-test-handoff.json']) add(path.join(run, file));
  for (const file of ['F039-native.ps1', 'F039-measure-pair.ps1', 'F039-seal-measurement.mjs',
    'F039-prepare.mjs', 'F039-check-characterization.mjs', 'F039-browser-probe.mjs',
    'F039-readiness.ps1', 'F039-run-sample.ps1', 'F039-validate.ps1', 'F039-audit-measurement.mjs']) add(path.join(session, file));
  add(owner);
  add(tests);
  const seal = {
    candidate: 'F039', actualCreatedBeforeTiming: true, actualCreatedUtc: new Date().toISOString(),
    primary: plan.benchmarkDesign.primary, actualProfilesPerMember: 40, actualResultSamplesPerProfile: 8,
    actualMaximumSourceComparisonAttemptsIncludingPartialTiming: 3, actualPairOrder: plan.sourceComparisons.order,
    actualConsumerEntriesPerVariant: 197, actualOnlyConsumerDelta: changed,
    actualUnchanged195EntriesIncludeMeasuredHarnessDllAndPdb: true,
    actualOtherUnchangedEntriesExcludingMeasuredHarnessDllAndPdb: 193,
    actualOwnerPdbBoundSourceDocumentsPerVariant: 12, actualSemanticRecordsMatched: 15,
    actualBenchmarkLifecyclesMatched: 40, actualOwningRowsPerVariant: 74,
    actualNewPermanentRowsPerVariant: 9, actualCookieBrowserStepsPerVariant: 8,
    actualSourceAllocationSavingClaimed: false, actualNoPriorityAffinityOrPowerChanges: true,
    actualSharedVmNotIsolated: true, actualTemporarySampleArchivedAndRemoved: true,
    actualAdjacentSeleniumStillPending: true, actualNotFullCurrentMainOrWasmAotOrApplicationThroughput: true,
    sealedFiles: [...sealed.values()].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
  };
  write('measurement-seal.json', seal);
  write('source-comparison-budget.json', { candidate: 'F039', maximumPairs: 3, closed: false,
    measurementSealSha256: hash(path.join(run, 'measurement-seal.json')), attempts: [] });
  console.log(JSON.stringify({ candidate: 'F039', actualInputsSealedBeforeTiming: true,
    actualSealedFiles: sealed.size, actualMeasurementSealSha256: hash(path.join(run, 'measurement-seal.json')),
    actualSourceComparisonAttemptsStarted: 0, actualMaximumAttempts: 3 }, null, 2));
}
