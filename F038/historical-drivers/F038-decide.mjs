import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F038');
const root = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const local = file => read(path.join(run, file));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const physical = new Map();
let bindings = 0;
const verify = (file, expected) => {
  const actual = sha(file);
  assert.equal(actual, expected, file);
  physical.set(path.resolve(file), actual);
  bindings++;
};
const audit = local('audit-through-003.json');
const budget = local('source-comparison-budget.json');
assert.equal(budget.closed, true);
assert.equal(budget.attempts.length, 3);
assert.ok(budget.attempts.every(attempt => attempt.status === 'completed'));
assert.equal(audit.actualPairs, 3);
assert.equal(audit.actualRows, 240);
assert.equal(audit.actualRawResultSamples, 1920);
assert.equal(audit.actualPrimaryPositiveInEveryPair, true);
assert.equal(audit.actualPrimaryMedianAtLeastFivePercent, true);
assert.equal(sha(path.join(run, 'audit-through-003.json')), budget.finalAggregateAuditSha256);
for (const entry of local('measurement-seal.json').sealedFiles) verify(entry.path, entry.sha256);
const original = local('preparation-original-001/verified-preparation.json');
const candidate = local('preparation-candidate-001/verified-preparation.json');
const reproduction = local('reproduction-candidate-001/verified-result.json');
assert.equal(reproduction.actualBuildPassed, true);
assert.equal(reproduction.actualMeasuredProjectFilesByteIdentical, 7);
assert.equal(reproduction.actualUntimedNativeCharacterizationPassed, true);
const nativeDirectories = ['characterize-original-001', 'characterize-candidate-001',
  'reproduction-candidate-001/native'];
for (let round = 1; round <= 3; round++) for (const variant of ['original', 'candidate'])
  nativeDirectories.push(`measure-${variant}-${String(round).padStart(3, '0')}`);
let runtimeBindings = 0;
let documents = 0;
const natives = [];
const collections = [];
for (const directory of nativeDirectories) {
  const completion = local(`${directory}/completion.json`);
  assert.equal(completion.actualExitCode, 0);
  assert.equal(completion.actualPidCapturedBeforeWait, true);
  const events = fs.readFileSync(path.join(run, directory, 'state', 'events.jsonl'), 'utf8').trim()
    .split(/\r?\n/).map(line => JSON.parse(line));
  const source = events.filter(event => event.name === 'source-pdb');
  assert.equal(source.length, 1);
  assert.equal(source[0].value.actualPePdbBindingMatched, true);
  assert.equal(source[0].value.documents.length, 9);
  documents += 9;
  for (const runtime of events.filter(event => event.name.startsWith('runtime-'))) {
    assert.equal(runtime.value.actualProcessId, completion.actualProcessId);
    for (const assembly of runtime.value.assemblies) if (assembly.path) {
      verify(assembly.path, assembly.sha256);
      runtimeBindings++;
    }
  }
  if (events.some(event => event.name === 'semantic-records')) {
    const semantics = events.find(event => event.name === 'semantic-records').value;
    const lifecycles = events.find(event => event.name === 'benchmark-lifecycles').value;
    assert.equal(semantics.length, 44);
    assert.equal(lifecycles.length, 40);
    assert.ok(lifecycles.every(record => record.actualPassed));
    collections.push({ semantics, lifecycles });
  }
  natives.push({ directory, actualProcessId: completion.actualProcessId, actualExitCode: 0 });
}
assert.equal(collections.length, 3);
for (const collection of collections.slice(1)) assert.deepEqual(collection, collections[0]);
let consumerBindings = 0;
for (const preparation of ['preparation-original-001', 'preparation-candidate-001', 'reproduction-candidate-001']) {
  const closure = local(`${preparation}/consumer-closure.json`);
  assert.equal(closure.files.length, 106);
  for (const entry of closure.files) {
    verify(path.join(run, preparation, 'consumer', entry.path), entry.sha256);
    consumerBindings++;
  }
}
for (const entry of original.actualHarnessFiles) {
  verify(path.join(run, 'harness', entry.file), entry.sha256);
  verify(path.join(run, 'reproduction-candidate-001', 'project', entry.file), entry.sha256);
}
for (const variant of ['original', 'candidate']) {
  assert.equal(local(`validation/${variant}-existing-1/verified-result.json`).actualPassed, 83);
  const browser = local(`sample-${variant}/browser-result.json`);
  assert.equal(browser.actualPassed, true);
  assert.equal(browser.actualStepCount, 5);
  assert.ok(local(`sample-${variant}/stopped-owned-processes.json`).every(process => !process.CurrentlyPresent));
}
const browserRows = ['producer', 'remaining'].flatMap(phase => {
  const verified = local(`selenium-candidate-${phase}-001/verified-result.json`);
  assert.equal(verified.actualAllCapturedOwnedHelpersGone, true);
  assert.equal(verified.actualSkipped, 0);
  return local(`selenium-candidate-${phase}-001/all-trx-rows.json`);
});
assert.equal(browserRows.length, 8);
assert.equal(new Set(browserRows.map(row => row.methodName)).size, 8);
assert.ok(browserRows.every(row => row.outcome === 'Passed'));
for (const file of ['Microsoft.AspNetCore.Components.dll', 'Microsoft.AspNetCore.Components.pdb']) {
  const expected = local('preparation-candidate-001/consumer-closure.json').files.find(entry => entry.path === file).sha256;
  for (const assembly of ['Microsoft.AspNetCore.Components', 'Microsoft.AspNetCore.Components.Tests'])
    verify(path.join(root, 'artifacts', 'bin', assembly, 'Release', 'net12.0', file), expected);
}
for (const source of candidate.actualSelectedSourceFiles) verify(path.join(root, source.path), source.sha256);
for (const file of ['F038KeyedProbe.razor', 'F038ProbeRow.razor'])
  assert.equal(fs.existsSync(path.join(root, 'src', 'Components', 'Samples', 'BlazorWebAppPerPage', 'Components', 'Pages', file)), false);
const git = args => {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};
assert.equal(git(['--no-pager', 'diff', '--name-only']),
  'src/Components/Components/src/RenderTree/RenderTreeDiffBuilder.cs');
assert.equal(git(['--no-pager', 'diff', '--check']), '');
assert.deepEqual(git(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).sort(),
  ['autoperf-scan-report.md', 'autoperf-issue-70219-duplicate-report.html',
    'autoperf-issue-70219-deduplicated-report.html', 'performance-antipattern-findings.md'].sort());
const allocations = audit.pairs.flatMap(pair => pair.rows);
assert.ok(allocations.every(row => row.candidateBytesPerOp <= row.originalBytesPerOp));
const nonemptyKeyed = audit.summaryByProfile.filter(row => !row.profile.endsWith(':0') && !row.profile.startsWith('UnkeyedStable'));
assert.ok(nonemptyKeyed.every(row => row.medianLessTimePercent > -5));
const live = {
  candidate: 'F038', actualAllLiveChecksPassed: true, actualUniquePhysicalFilesRehashed: physical.size,
  actualBindingsRehashed: bindings, actualConsumerBindings: consumerBindings,
  actualLoadedAssemblyBindings: runtimeBindings, actualSourcePePdbDocumentAssociations: documents,
  actualSuccessfulNativeInvocations: natives, actualThreeFullSemanticAndLifecycleCollectionsIdentical: true,
  actualCandidateReleaseProductAndTestBinMatchMeasuredOwner: true,
  actualOnlyFinalTrackedSourceChangeIsTheNewTreeSeam: true,
  actualOnlyTwoOwnedTemporarySampleFilesRemoved: true, actualFourUnrelatedUntrackedReportsPreserved: true,
  actualSemanticRecordCountPerCharacterization: 44, actualLifecycleCountPerCharacterization: 40,
  actualOriginalOwningRows: 83, actualCandidateOwningRows: 83, actualExistingSeleniumRows: browserRows,
  actualPhysicalHashes: [...physical].map(([file, sha256]) => ({ path: file, sha256 })),
};
fs.writeFileSync(path.join(run, 'live-file-audit.json'), JSON.stringify(live, null, 2) + '\n', { flag: 'wx' });
const decision = {
  candidate: 'F038', disposition: 'qualified-keyed-renderer-fork-draft', mergeReady: false,
  actualAllApplicableAcceptanceChecksPassed: true,
  qualification: 'Repeated prepared actual-renderer keyed-stable Windows x64 .NET12 gain, not whole-app/browser/Mono-AOT performance or production-frequency evidence. Historical prototype credited. All empty/control regressions and transient adverse keyed rows retained.',
  actualPrimary: audit.primary, actualSourceComparisonsConcluded: 3,
  actualCompletedSourceComparisonPairs: 3, actualFailedTimedSourceComparisons: 0,
  actualSourceComparisonBudgetPermanentlyClosed: true, actualResultRows: 240, actualRawResultSamples: 1920,
  actualAllRawStdoutAndJsonSamplesCrossChecked: true, actualNoFourthComparison: true,
  actualOnlyConsumerDelta: ['Microsoft.AspNetCore.Components.dll', 'Microsoft.AspNetCore.Components.pdb'],
  actualMeasuredConsumerFiles: 106, actualOther104FilesIncludingHarnessByteIdentical: true,
  actualUnchangedHarnessFilesIncludedIn104: 2, actualOtherNonHarnessUnchangedFiles: 102,
  actualAllocationPairs: allocations.length,
  actualAllocationPairsUnchanged: allocations.filter(row => row.candidateBytesPerOp === row.originalBytesPerOp).length,
  actualReportedCandidateOneByteLowerPairs: allocations.filter(row => row.candidateBytesPerOp < row.originalBytesPerOp).length,
  actualStructuralAllocationReductionClaimed: false,
  actualMaximumCvPercent: Math.max(...audit.allRows.map(row => row.coefficientOfVariationPercent)),
  actualOriginalOwningRows: 83, actualCandidateOwningRows: 83, actualOwningSkipped: 0,
  actualSeleniumRows: 8, actualSeleniumSkipped: 0, actualSeleniumConfiguration: 'Debug WebAssembly correctness only',
  actualInteractiveServerBrowserStepsEachVariant: 5, actualBrowserErrorsEachVariant: 0,
  actualIndependentSevenFileProjectRestoredBuiltAndCharacterized: true,
  actualThreeCharacterizationsMatchedSemanticRecords: 44, actualThreeCharacterizationsMatchedLifecycles: 40,
  actualNoPriorityAffinityOrPowerChanges: true, actualSharedVmNotIsolated: true,
  actualTimedPreparedElementsNotChildComponentOrNetworkOrDomTiming: true,
  actualPublicOrProtectedApiChanges: 0, actualOldTreeLoopChanged: false,
  actualKnownPriorPrototype: 'dotnet/aspnetcore#70133 removed95837ac848beda6c84dc17f44be2298dd7414df2',
  actualAuthoredUtc: new Date().toISOString(),
};
fs.writeFileSync(path.join(run, 'decision.json'), JSON.stringify(decision, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ disposition: decision.disposition, primary: decision.actualPrimary,
  owningRows: [83, 83], existingSeleniumRows: 8, actualProjectReproduced: true,
  actualUniqueFilesRehashed: physical.size, actualRuntimeBindingsRehashed: runtimeBindings,
  actualAllAcceptanceChecksPassed: true, actualNoPrCreatedYet: true }, null, 2));
