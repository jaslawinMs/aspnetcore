import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F039');
const root = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const local = file => read(path.join(run, file));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const physical = new Map();
let bindings = 0;
const verify = (file, expected) => {
  const resolved = path.resolve(file);
  if (!physical.has(resolved)) physical.set(resolved, sha(resolved));
  assert.equal(physical.get(resolved), expected, file);
  bindings++;
};
const audit = local('audit-v2-through-003.json');
const assessment = local('measurement-assessment.json');
const budget = local('source-comparison-budget.json');
assert.equal(budget.closed, true);
assert.equal(budget.maximumPairs, 3);
assert.deepEqual(budget.attempts.map(attempt => attempt.status), ['failed', 'completed', 'completed']);
assert.equal(audit.actualPairs, 2);
assert.equal(audit.actualRows, 160);
assert.equal(audit.actualRawResultSamples, 1280);
assert.equal(assessment.actualPrimaryMeasurementCriterionPassed, true);
assert.equal(assessment.actualBudgetPermanentlyClosed, true);
verify(path.join(run, 'measurement-seal-v2.json'), budget.measurementSealSha256);
for (const name of ['measurement-seal.json', 'measurement-seal-v2.json'])
  for (const entry of local(name).sealedFiles) verify(entry.path, entry.sha256);
const reproduction = local('reproduction-candidate-001/verified-reproduction.json');
assert.equal(reproduction.actualNativeExitCode, 0);
assert.equal(reproduction.actualSourceFilesIdenticalToCorrectedTimedHarness, 7);
assert.equal(reproduction.actualRealBdnDiscoveryCases, 40);
assert.equal(reproduction.actualSemanticRecordsExactlyEqual, 15);
assert.equal(reproduction.actualLifecycleProfilesExactlyEqual, 40);
assert.equal(reproduction.actualAdditionalTimingSamples, 0);
const nativeDirectories = [
  { directory: 'characterize-original-001', preparation: 'preparation-original-001' },
  { directory: 'characterize-candidate-001', preparation: 'preparation-candidate-001' },
  { directory: 'characterize-original-002', preparation: 'preparation-original-002' },
  { directory: 'characterize-candidate-002', preparation: 'preparation-candidate-002' },
  { directory: 'measure-original-001', preparation: 'preparation-original-001', expectedFailed: true },
  { directory: 'reproduction-candidate-001', preparation: 'reproduction-candidate-001', relocated: true },
];
for (const round of [2, 3]) for (const variant of ['original', 'candidate'])
  nativeDirectories.push({ directory: `measure-${variant}-${String(round).padStart(3, '0')}`, preparation: `preparation-${variant}-002` });
let runtimeBindings = 0, documentAssociations = 0;
const natives = [], collections = [];
for (const item of nativeDirectories) {
  const completion = local(`${item.directory}/${item.relocated ? 'characterize-command.json' : 'completion.json'}`);
  assert.equal(completion.actualPidCapturedBeforeWait, true);
  if (item.expectedFailed) assert.equal(completion.actualExitCode, -532462766);
  else assert.equal(completion.actualExitCode, 0);
  const events = fs.readFileSync(path.join(run, item.directory, 'state', 'events.jsonl'), 'utf8').trim()
    .split(/\r?\n/).map(line => JSON.parse(line));
  events.forEach((event, index) => assert.equal(event.sequence, index + 1));
  const sources = events.filter(event => event.name === 'source-pdb');
  assert.equal(sources.length, 1);
  const witness = sources[0].value;
  assert.equal(witness.actualPePdbBindingMatched, true);
  assert.equal(witness.documents.length, 12);
  verify(path.join(run, item.preparation, 'consumer', 'Microsoft.AspNetCore.Components.Endpoints.dll'), witness.actualAssemblySha256);
  verify(path.join(run, item.preparation, 'consumer', 'Microsoft.AspNetCore.Components.Endpoints.pdb'), witness.actualPdbSha256);
  for (const document of witness.documents) {
    assert.equal(document.checksum, document.sha256);
    verify(path.join(run, item.preparation, 'sources', document.source), document.sha256);
    documentAssociations++;
  }
  for (const event of events.filter(event => event.name.startsWith('runtime-'))) {
    assert.equal(event.value.actualProcessId, completion.actualProcessId);
    assert.equal(event.value.runtime, '12.0.0');
    assert.equal(event.value.serverGc, true);
    for (const assembly of event.value.assemblies) if (assembly.path) {
      verify(assembly.path, assembly.sha256);
      runtimeBindings++;
    }
  }
  if (item.directory.startsWith('characterize-') || item.relocated) {
    const collection = local(`${item.directory}/state/characterization.json`);
    assert.equal(collection.records.length, 15);
    assert.equal(collection.profiles.length, 40);
    collections.push({ records: collection.records, profiles: collection.profiles });
  }
  natives.push({ directory: item.directory, actualProcessId: completion.actualProcessId, actualExitCode: completion.actualExitCode });
}
assert.equal(collections.length, 5);
for (const collection of collections.slice(1)) assert.deepEqual(collection, collections[0]);
let consumerBindings = 0;
for (const preparation of ['preparation-original-001', 'preparation-candidate-001',
  'preparation-original-002', 'preparation-candidate-002', 'reproduction-candidate-001']) {
  const closure = local(`${preparation}/consumer-closure.json`);
  assert.equal(closure.files.length, 197);
  for (const entry of closure.files) {
    verify(path.join(run, preparation, 'consumer', entry.path), entry.sha256);
    consumerBindings++;
  }
}
const projectFiles = local('preparation-original-002/harness-source-manifest.json').files;
assert.equal(projectFiles.length, 7);
for (const entry of projectFiles) {
  verify(path.join(run, 'harness-v2', entry.file), entry.sha256);
  verify(path.join(run, 'reproduction-candidate-001', 'project', entry.file), entry.sha256);
}
const owningRows = [];
for (const [variant, folder] of [['original', 'Tests-original-2'], ['candidate', 'Tests-candidate-1']]) {
  const rows = local(`validation/${folder}/all-trx-rows.json`);
  assert.equal(rows.length, 74);
  assert.ok(rows.every(row => row.outcome === 'Passed'));
  assert.equal(rows.filter(row => row.methodName === 'CollectionContains_PreservesValues_WhenFirstAccessTriggersLazyLoad').length, 8);
  assert.equal(rows.filter(row => row.methodName === 'CollectionContains_DoesNotRetainConsumedValue').length, 1);
  owningRows.push(rows.map(row => row.testName).sort());
  const browser = local(`sample-${variant}/browser-result.json`);
  assert.equal(browser.actualPassed, true);
  assert.equal(browser.actualStepCount, 8);
  assert.equal(browser.pageErrors.length, 0);
  assert.equal(browser.consoleMessages.filter(message => message.type === 'error').length, 0);
  assert.equal(local(`sample-${variant}/stop-verification.json`).actualOwnedProcessesStopped, true);
}
assert.deepEqual(owningRows[0], owningRows[1]);
assert.equal(local('validation/Format-candidate-1/command.json').actualExitCode, 0);
assert.equal(local('selenium-build-candidate-001/command.json').actualExitCode, 0);
const browserRows = ['producer', 'remaining'].flatMap(phase => {
  const verified = local(`selenium-candidate-${phase}-001/verified-result.json`);
  assert.equal(verified.actualAllCapturedOwnedHelpersGone, true);
  assert.equal(verified.actualSkipped, 0);
  assert.equal(verified.actualPreQuarantinedExcludedTest, 'TempDataPersistWithoutAccessing');
  return local(`selenium-candidate-${phase}-001/all-trx-rows.json`);
});
assert.equal(browserRows.length, 10);
assert.equal(new Set(browserRows.map(row => row.methodName)).size, 10);
assert.ok(browserRows.every(row => row.outcome === 'Passed' && row.methodName !== 'TempDataPersistWithoutAccessing'));
for (const file of ['Microsoft.AspNetCore.Components.Endpoints.dll', 'Microsoft.AspNetCore.Components.Endpoints.pdb']) {
  const expected = local('preparation-candidate-002/consumer-closure.json').files.find(entry => entry.path === file).sha256;
  for (const assembly of ['Microsoft.AspNetCore.Components.Endpoints', 'Microsoft.AspNetCore.Components.Endpoints.Tests'])
    verify(path.join(root, 'artifacts', 'bin', assembly, 'Release', 'net12.0', file), expected);
}
for (const document of local('preparation-candidate-002/source-manifest.json').documents)
  verify(document.actualRootSource, document.sha256);
for (const name of ['TempData.cs', 'TempDataTest.cs'])
  verify(path.join(run, 'proposed-source', name), sha(path.join(root, 'src', 'Components', 'Endpoints',
    name === 'TempData.cs' ? 'src' : 'test', 'TempData', name)));
assert.equal(fs.existsSync(path.join(root, 'src', 'Components', 'Samples', 'BlazorWebAppPerPage', 'Components', 'Pages', 'F039TempDataProbe.razor')), false);
const git = args => {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};
assert.deepEqual(git(['--no-pager', 'diff', '--name-only']).split(/\r?\n/).sort(),
  ['src/Components/Endpoints/src/TempData/TempData.cs', 'src/Components/Endpoints/test/TempData/TempDataTest.cs'].sort());
assert.equal(git(['--no-pager', 'diff', '--check']), '');
assert.deepEqual(git(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).sort(),
  ['autoperf-scan-report.md', 'autoperf-issue-70219-duplicate-report.html',
    'autoperf-issue-70219-deduplicated-report.html', 'performance-antipattern-findings.md'].sort());
const live = {
  candidate: 'F039', actualAllLiveChecksPassed: true, actualUniquePhysicalFilesRehashed: physical.size,
  actualBindingsRehashed: bindings, actualConsumerBindings: consumerBindings,
  actualLoadedAssemblyBindings: runtimeBindings, actualSourcePePdbDocumentAssociations: documentAssociations,
  actualNativeInvocationsIncludingPreservedFailure: natives,
  actualFiveCompleteSemanticAndLifecycleCollectionsIdentical: true,
  actualCandidateReleaseProductAndTestBinMatchMeasuredOwner: true,
  actualOnlyFinalTrackedSourceChangesAreContainsAndFocusedPreservationTests: true,
  actualOwnedTemporarySampleFileRemoved: true, actualFourUnrelatedUntrackedReportsPreserved: true,
  actualExistingSeleniumRows: browserRows,
  actualPhysicalHashes: [...physical].map(([file, sha256]) => ({ path: file, sha256 })),
};
fs.writeFileSync(path.join(run, 'live-file-audit.json'), JSON.stringify(live, null, 2) + '\n', { flag: 'wx' });
const decision = {
  candidate: 'F039', disposition: 'qualified-tempdata-contains-fork-draft', mergeReady: false,
  actualAllApplicableAcceptanceChecksPassed: true,
  qualification: 'Two completed prepared actual-owner ICollection.Contains comparisons on shared Windows x64 .NET12; first of three authorized attempts failed before timing and stays consumed. Not cookie/DI/rendering/whole-app/Mono/AOT performance. All miss/control/adverse rows retained.',
  actualPrimary: audit.primary, actualSourceComparisonsConcluded: 3,
  actualCompletedSourceComparisonPairs: 2, actualFailedSourceComparisonAttempts: 1,
  actualFailedAttemptHadZeroTimingSamples: true, actualSourceComparisonBudgetPermanentlyClosed: true,
  actualTimedNativeMembersCompleted: 4, actualNativeMeasurementMembersStartedIncludingFailure: 5,
  actualResultRows: 160, actualRawResultSamples: 1280,
  actualAllRawStdoutAndJsonSamplesCrossChecked: true, actualNoFourthComparison: true,
  actualBothHarnessEpochsAndSealsPreserved: true,
  actualOnlyConsumerDelta: ['Microsoft.AspNetCore.Components.Endpoints.dll', 'Microsoft.AspNetCore.Components.Endpoints.pdb'],
  actualMeasuredConsumerFiles: 197, actualOther195FilesIncludingHarnessByteIdentical: true,
  actualUnchangedHarnessFilesIncludedIn195: 2, actualOtherNonHarnessUnchangedFiles: 193,
  actualAllocationPairs: assessment.actualPairedAllocationReports,
  actualAllocationPairsUnchanged: assessment.actualEqualPairedAllocationReports,
  actualAllAllocationReportsZero: assessment.actualAllMeasuredAllocationReportsZero,
  actualStructuralAllocationReductionClaimed: false,
  actualMaximumCvPercent: assessment.actualMaximumProfileCvPercent,
  actualMissOrControlMedianRegressionsAtLeastFivePercent: assessment.actualMissOrControlMedianRegressionsAtLeastFivePercent,
  actualOriginalOwningRows: 74, actualCandidateOwningRows: 74, actualOwningSkipped: 0,
  actualNewPreservationTheoryRows: 8, actualNewPreservationFacts: 1, actualSemanticBugRedGreenClaimed: false,
  actualSeleniumRows: 10, actualSeleniumSkipped: 0, actualSeleniumConfiguration: 'Debug static-SSR cookie persistence correctness only',
  actualPreQuarantinedExcludedCase: 'TempDataCookieTest.TempDataPersistWithoutAccessing; dotnet/aspnetcore#70085',
  actualStaticSsrBrowserStepsEachVariant: 8, actualBrowserErrorsEachVariant: 0,
  actualIndependentSevenFileProjectRestoredBuiltAndCharacterized: true,
  actualFiveCharacterizationsMatchedSemanticRecords: 15, actualFiveCharacterizationsMatchedLifecycles: 40,
  actualNoPriorityAffinityOrPowerChanges: true, actualSharedVmNotIsolated: true,
  actualPublicOrProtectedApiChanges: 0, actualF040CollectionRemoveChanged: false,
  actualFullCurrentDefaultBuildOrDependencyEquivalenceClaimed: false,
  actualAuthoredUtc: new Date().toISOString(),
};
fs.writeFileSync(path.join(run, 'decision.json'), JSON.stringify(decision, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ disposition: decision.disposition, primary: decision.actualPrimary,
  actualConsumedAttempts: 3, actualCompletedPairs: 2, actualFailedBeforeTiming: 1, actualRawSamples: 1280,
  owningRows: [74, 74], existingSeleniumRows: 10, actualProjectReproduced: true,
  actualUniqueFilesRehashed: physical.size, actualRuntimeBindingsRehashed: runtimeBindings,
  actualAllAcceptanceChecksPassed: true, actualNoPrCreatedYet: true }, null, 2));
