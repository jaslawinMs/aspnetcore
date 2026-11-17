import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { auditStatistics } from './F035-statistics.mjs';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.resolve(process.argv[2] ?? path.join(session, 'autoperf-runs', 'F035'));
const verify = process.argv.includes('--verify');
const join = (...parts) => path.join(run, ...parts.flatMap(part => part.split(/[\\/]/)));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const text = file => fs.readFileSync(file, 'utf8');
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const budget = read(join('measurement-budget.json'));
const statistics = auditStatistics(run);
assert.deepEqual(statistics, read(join('statistics-audit.json')));
assert.equal(statistics.actualResultRows, 120);
assert.equal(statistics.actualSamplesRecomputedAndMatchedToStdout, 960);
assert.equal(statistics.actualBudgetClosed, true);
assert.equal(statistics.actualAllStartedNativeMembersCompleted, true);
assert.equal(statistics.actualNativeTimedMembersCompleted, 6);
assert.equal(budget.actualSourceComparisonsStarted, 3);
assert.equal(budget.actualSourceComparisonsCompleted, 3);
assert.equal(budget.actualSourceComparisonsConcluded, 3);
assert.equal(budget.comparisonsSettled.length, 3);
assert.ok(budget.comparisonsSettled.every(row => row.actualCompletedPair));
const plan = read(join('measurement-plan.json'));
const planReceipt = read(join('measurement-plan-receipt.json'));
assert.equal(sha(join('measurement-plan.json')), planReceipt.actualPlanSha256);
assert.equal(plan.actualSealedBeforeShippingEditAndAnyTiming, true);
const compared = read(join('premeasurement-contract-comparison.json'));
assert.equal(compared.actualAllConcreteObservationsIdentical, true);
assert.equal(compared.actualSameHarnessAndOnlyOwnerPairChanged, true);
assert.equal(compared.actualConcreteObservationsPerImage, 61);
assert.equal(compared.actualSourceComparisonsStartedAtVerification, 0);
const investigation = read(join('investigation.json'));
assert.equal(investigation.actualSelectedFilePairs, 12);
assert.equal(investigation.actualRawSnapshots, 45);
const selected = investigation.parity.filter(row => row.core);
assert.equal(selected.length, 12);
for (const row of selected) {
  assert.equal(row.actualBaselineAndCurrentBlobBytesEqual, true);
  assert.equal(row.actualWorkingLfBytesMatchBaselineBlob, true);
  assert.equal(row.actualBaselineBlobBytesSha256, row.actualCurrentBlobBytesSha256);
}
const live = read(join('live-file-audit.json'));
assert.equal(live.actualReadOnlyLiveFileAndProcessAuditPassed, true);
assert.equal(live.actualFrozenConsumerFileChecks, 1216);
assert.equal(live.actualRuntimeRecords, 18);
assert.equal(live.actualLoadedAssemblyBindingObservations, 834);
assert.equal(live.actualUniqueRehashedFiles, 1318);
assert.equal(live.actualKnownSuccessfulNativeProcesses.length, 9);
assert.ok(live.actualKnownSuccessfulNativeProcesses.every(row => row.actualRecordedPidAbsent || row.actualPidReusedAfterNativeCompletion));
assert.equal(live.actualFailedUntimedMetadataRuntimePidCaptured, false);
assert.equal(live.actualOriginalShippingSourceRestored, true);
assert.equal(live.actualOriginalProductAndTestBinOwnerRestored, true);
assert.equal(live.actualTrackedSourceDiff, '');
assert.equal(live.actualStagedSourceDiff, '');
const images = {};
for (const label of ['preparation-original-002', 'preparation-original-003', 'preparation-candidate', 'preparation-reproduction-original']) {
  const capsule = read(join(label, 'prepared', 'capsule.json'));
  const closure = read(join(label, 'prepared', 'closure.json'));
  assert.equal(capsule.actualClosureFiles, 304);
  assert.equal(closure.files.length, 304);
  assert.equal(new Set(closure.files.map(file => file.path)).size, 304);
  assert.equal(capsule.actualSourceHeadAtBuild, investigation.baseline);
  assert.equal(capsule.actualSettingsExecutorSourceSha256, '02B69C0AA06612700D9DA122BA64081771EE333B126DABC08156C0BD118F115B');
  for (const file of capsule.sourceFiles) {
    assert.equal(sha(join(label, 'prepared', file.path)), file.sha256);
  }
  images[label] = { capsule, closure, actualClosureSha256: sha(join(label, 'prepared', 'closure.json')) };
}
const original = images['preparation-original-003'];
const candidate = images['preparation-candidate'];
const relocated = images['preparation-reproduction-original'];
assert.equal(original.capsule.actualHarnessSha256, candidate.capsule.actualHarnessSha256);
assert.equal(original.capsule.actualHarnessPdbSha256, candidate.capsule.actualHarnessPdbSha256);
assert.equal(candidate.capsule.actualHarnessRebuilt, false);
const changed = original.closure.files.filter(file => {
  const match = candidate.closure.files.filter(row => row.path === file.path);
  assert.equal(match.length, 1);
  return match[0].sha256 !== file.sha256;
}).map(row => row.path).sort();
assert.deepEqual(changed, ['Microsoft.AspNetCore.Mvc.Abstractions.dll', 'Microsoft.AspNetCore.Mvc.Abstractions.pdb']);
const beforeSource = text(join('preparation-original-003', 'prepared', 'sources', 'owner', 'ValueProviderResult.cs'));
const afterSource = text(join('preparation-candidate', 'prepared', 'sources', 'owner', 'ValueProviderResult.cs'));
assert.equal(beforeSource.replace('return ((IEnumerable<string>)Values).GetEnumerator();',
  'return (IEnumerator<string>)Values.GetEnumerator();'), afterSource);
assert.ok(beforeSource.includes('public IEnumerator<string> GetEnumerator()'));
assert.ok(afterSource.includes('public IEnumerator<string> GetEnumerator()'));
const relocatedCopies = read(join('reproduction-source-copy.json'));
assert.equal(relocatedCopies.length, 6);
for (const file of relocatedCopies) {
  assert.equal(file.actualOriginalSha256, file.actualRelocatedSha256);
  for (const label of ['preparation-original-003', 'preparation-candidate', 'preparation-reproduction-original']) {
    assert.equal(sha(join(label, 'prepared', 'sources', 'harness', file.name)), file.actualOriginalSha256);
  }
}
const reproduction = read(join('reproduction-verification.json'));
assert.equal(reproduction.actualEveryConcreteObservationMatches, true);
assert.equal(reproduction.actualConcreteObservationCount, 61);
assert.equal(reproduction.actualBenchmarkLifecyclesIncluded, 20);
assert.equal(reproduction.actualComparativeRetiming, false);
assert.equal(reproduction.actualRebuiltHarnessPePdbByteIdentityClaim, false);
const unescape = value => value.replaceAll('&quot;', '"').replaceAll('&apos;', "'")
  .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
const attributes = value => Object.fromEntries([...value.matchAll(/\b(\w+)="([^"]*)"/g)]
  .map(([, key, content]) => [key, unescape(content)]));
const testNames = {};
for (const variant of ['original', 'candidate']) {
  const validation = read(join('validation', `${variant}-existing-1`, 'verified-result.json'));
  assert.equal(validation.actualPassed, 34);
  assert.equal(validation.actualSkipped, 0);
  assert.equal(validation.actualFailures, 0);
  assert.equal(validation.aFunctionalRedGreenVerification, false);
  const image = variant === 'original' ? original : candidate;
  assert.equal(validation.actualOwnerSha256, image.capsule.actualTestedOwners[0].actualOwnerSha256);
  assert.equal(validation.actualOwnerPdbSha256, image.capsule.actualTestedOwners[0].actualOwnerPdbSha256);
  assert.equal(validation.actualSourceSha256, sha(join(budget.authoritativePreparations[variant], 'prepared', 'sources', 'owner', 'ValueProviderResult.cs')));
  const observed = [];
  for (const scope of ['abstractions', 'core']) {
    const directory = join('validation', `${variant}-existing-1`, scope);
    const xmlFile = path.join(directory, 'owning.trx');
    const xml = text(xmlFile);
    const outcomes = read(path.join(directory, 'actual-outcomes.json'));
    const selection = read(path.join(directory, 'selection.json'));
    assert.equal(sha(xmlFile), outcomes.actualXmlSha256);
    const rows = [...xml.matchAll(/<UnitTestResult\b([^>]*?)(?:\/>|>[\s\S]*?<\/UnitTestResult>)/g)].map(([, value]) => attributes(value));
    const expected = scope === 'abstractions' ? 29 : 5;
    assert.equal(rows.length, expected);
    assert.equal(new Set(rows.map(row => row.executionId)).size, expected);
    assert.ok(rows.every(row => row.outcome === 'Passed'));
    const counters = /<Counters\b([^>]*?)(?:\/>|>)/.exec(xml);
    assert.ok(counters);
    assert.equal(Number(attributes(counters[1]).executed), expected);
    assert.equal(Number(attributes(counters[1]).passed), expected);
    assert.deepEqual(rows.map(row => [row.testName, row.testId, row.executionId, row.outcome]),
      outcomes.actualOutcomes.map(row => [row.name, row.testId, row.executionId, row.outcome]));
    for (const item of selection) {
      const cases = rows.filter(row => row.testName === item.method || row.testName.startsWith(item.method + '('));
      assert.equal(cases.length, item.rows);
      if (scope === 'core' && item.rows === 2) {
        assert.ok(cases.some(row => /isReadOnly:\s*false/i.test(row.testName)));
        assert.ok(cases.some(row => /isReadOnly:\s*true/i.test(row.testName)));
      }
    }
    observed.push(...rows.map(row => row.testName));
    const invocation = read(path.join(directory, 'invocation.json'));
    assert.equal(invocation.actualExitCode, 0);
    if (variant === 'candidate') {
      assert.ok(Date.parse(invocation.started) > Date.parse(plan.actualCreated));
    }
  }
  assert.equal(observed.length, 34);
  testNames[variant] = observed.sort();
}
assert.deepEqual(testNames.original, testNames.candidate);
const profiles = ['characterize-original', 'characterize-original-002', 'characterize-candidate',
  'characterize-reproduction-original', ...budget.nativeProfilesCompleted.map(row => row.label)].sort();
const actualProfiles = fs.readdirSync(join('profiles')).sort();
assert.deepEqual(actualProfiles, profiles);
let selectedDocumentWitnesses = 0;
let settingsObservations = 0;
const contracts = {};
const actualMethods = {};
for (const label of profiles) {
  const directory = join('profiles', label);
  const invocation = read(path.join(directory, 'invocation.json'));
  const image = images[invocation.preparation];
  assert.ok(image);
  assert.equal(invocation.actualClosureFileCount, 304);
  assert.equal(invocation.actualClosureSha256, image.actualClosureSha256);
  const states = fs.readdirSync(path.join(directory, 'states')).map(file => ({
    file, record: read(path.join(directory, 'states', file)),
  }));
  const witnesses = states.filter(row => row.file.includes('-source-pdb-'));
  assert.equal(witnesses.length, 3);
  assert.equal(witnesses.reduce((sum, row) => sum + row.record.documents.length, 0), 10);
  for (const { file, record } of witnesses) {
    assert.equal(record.actualPePdbBindingMatched, true);
    assert.equal(record.codeViewGuid, record.pdbGuid);
    const name = file.replace(/^\d+-source-pdb-/, '').replace(/\.json$/, '');
    assert.equal(record.assemblySha256, image.closure.files.find(row => row.path === name + '.dll').sha256);
    assert.equal(record.pdbSha256, image.closure.files.find(row => row.path === name + '.pdb').sha256);
    for (const document of record.documents) {
      const matching = image.capsule.sourceFiles.filter(row => path.win32.basename(row.path) === path.win32.basename(document.source));
      assert.equal(matching.length, 1);
      const source = join(invocation.preparation, 'prepared', matching[0].path);
      assert.equal(sha(source), document.sha256);
      const algorithm = document.algorithm === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256'
        : document.algorithm === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
      assert.ok(algorithm);
      assert.equal(createHash(algorithm).update(fs.readFileSync(source)).digest('hex').toUpperCase(), document.checksum);
      selectedDocumentWitnesses++;
    }
  }
  const runtimes = states.filter(row => row.record.runtimeAssemblies !== undefined);
  if (label === 'characterize-original') {
    assert.equal(invocation.actualExitCode, -532462766);
    assert.equal(runtimes.length, 0);
    assert.equal(states.filter(row => row.file.endsWith('-characterization-completed.json')).length, 0);
    continue;
  }
  assert.equal(invocation.actualExitCode, 0);
  assert.equal(runtimes.length, 2);
  const methods = states.filter(row => row.file.endsWith('-actual-methods.json'));
  assert.equal(methods.length, 1);
  const method = methods[0].record;
  assert.equal(method.actualShippedReturnTypePreserved, true);
  assert.equal(method.actualCollectionBinderMethodImplementation, 'Async');
  assert.equal(method.actualCollectionBinderCallsShippedEnumerator, true);
  assert.equal(method.reflectionMetadataReadOnlyNoPrivateInvocationOrUnsafeAccessor, true);
  actualMethods[label] = method;
  if (invocation.mode === 'characterize') {
    const observations = states.filter(row => row.record.key !== undefined).map(row => row.record).sort((a, b) => a.key.localeCompare(b.key));
    assert.equal(observations.length, 61);
    assert.equal(new Set(observations.map(row => row.key)).size, 61);
    const completion = states.filter(row => row.file.endsWith('-characterization-completed.json'));
    assert.equal(completion.length, 1);
    assert.equal(completion[0].record.actualConcreteSemanticObservations, 61);
    assert.equal(completion[0].record.actualBenchmarkLifecycleProfiles, 20);
    assert.equal(completion[0].record.actualAllSuccessful, true);
    assert.equal(completion[0].record.actualOwnedNativeOrExternalResources, 0);
    contracts[label] = observations;
  } else {
    assert.ok(Date.parse(invocation.started) > Date.parse(plan.actualCreated));
    const completed = states.filter(row => row.file.endsWith('-completed.json'));
    assert.equal(completed.length, 1);
    assert.equal(completed[0].record.actualReports, 20);
    assert.equal(completed[0].record.actualAllSuccessful, true);
    for (const suffix of ['-settings-before.json', '-settings-after.json']) {
      const settings = states.filter(row => row.file.endsWith(suffix));
      assert.equal(settings.length, 20);
      for (const setting of settings) {
        assert.deepEqual(setting.record, runtimes[0].record.initialSettings);
        assert.equal(setting.record.processPriority, 'Normal');
        assert.equal(setting.record.threadPriority, 'Normal');
        settingsObservations++;
      }
    }
  }
}
assert.equal(selectedDocumentWitnesses, 100);
assert.equal(settingsObservations, 240);
assert.deepEqual(contracts['characterize-candidate'], contracts['characterize-original-002']);
assert.deepEqual(contracts['characterize-reproduction-original'], contracts['characterize-original-002']);
const originalMethod = actualMethods['characterize-original-002'];
const candidateMethod = actualMethods['characterize-candidate'];
assert.equal(originalMethod.actualOwner.method, candidateMethod.actualOwner.method);
assert.ok(originalMethod.actualOwner.instructions.some(row => row.opcode === 'box' && row.operand.name === 'StringValues'));
assert.ok(!candidateMethod.actualOwner.instructions.some(row => row.opcode === 'box' && row.operand.name === 'StringValues'));
assert.ok(candidateMethod.actualOwner.instructions.some(row => row.opcode === 'box' && row.operand.name === 'Enumerator'));
for (const method of Object.values(actualMethods)) {
  assert.deepEqual(method.actualStringValuesDirect, originalMethod.actualStringValuesDirect);
  assert.deepEqual(method.actualStringValuesInterface, originalMethod.actualStringValuesInterface);
  assert.deepEqual(method.actualCollectionBinderAsyncBody, originalMethod.actualCollectionBinderAsyncBody);
}
const compiler = read(join('actual-collection-compiler-metadata.json'));
assert.equal(compiler.actualCoreDllSha256, original.capsule.actualTestedOwners[1].actualOwnerSha256);
const collection = compiler.actualReadOnlyPeMetadata.find(row => row.name === 'CollectionModelBinder`1');
assert.equal(collection.methods.find(row => row.name === 'BindSimpleCollection').implementation, 'Async');
assert.ok(collection.nestedTypes.every(name => !name.includes('<BindSimpleCollection>')));
const firstBuild = read(join('preparation-original', 'actual-invocations.json'));
assert.equal(firstBuild.at(-1).actualExitCode, 1);
assert.ok(text(join('preparation-original', 'build.stdout')).includes('2 Warning(s)'));
assert.ok(text(join('preparation-original', 'build.stdout')).includes('1 Error(s)'));
for (const label of ['preparation-original-002', 'preparation-original-003', 'preparation-reproduction-original']) {
  const invocations = read(join(label, 'actual-invocations.json'));
  assert.ok(invocations.every(row => row.actualExitCode === 0));
  assert.ok(text(join(label, 'build.stdout')).includes('0 Warning(s)'));
  assert.ok(text(join(label, 'build.stdout')).includes('0 Error(s)'));
}
for (const variant of ['candidate', 'original']) {
  const forced = read(join('validation', `forced-${variant}-owner`, 'verified-result.json'));
  assert.equal(forced.actualExactEarlierSourceDllPdbMatched, true);
  assert.equal(forced.actualCoreUnchanged, true);
  assert.equal(forced.actualRetiming, false);
}
const primary = statistics.actualDeclaredPrimaryPairs;
assert.ok(primary.some(row => row.actualLessTimePercent < 0));
assert.ok(primary.some(row => row.actualLessTimePercent > 0));
assert.ok(primary.every(row => row.actualOriginalBytesPerOperation === 1456 && row.actualCandidateBytesPerOperation === 1456));
for (const key of ['PreparedConcrete:8', 'PreparedConcrete:64']) {
  assert.ok(statistics.actualEveryPair.filter(row => row.key === key).every(row => row.actualLessTimePercent < 0));
}
const decision = {
  candidate: 'F035', disposition: 'no-gain', actualAuditPassed: true,
  actualSourceComparisons: 3, actualCompletedSourceComparisonPairs: 3, actualFailedTimedSourceComparisons: 0,
  actualStrategyVariants: 1, actualTimedNativeMembers: 6, actualResultRows: 120, actualRawResultSamples: 960,
  actualSettingsObservations: 240, actualSelectedPePdbSourceDocumentAssociations: 100,
  actualKnownSuccessfulNativeProcessesChecked: 9, actualFailedUntimedMetadataPidCaptured: false,
  actualOriginalAndCandidateOwningRowsEach: 34, actualOwningSkippedRows: 0,
  actualConcreteObservationsPerSuccessfulCharacterization: 61, actualBenchmarkLifecyclesIncludedPerImage: 20,
  actualSuccessfulCharacterizations: 3, actualAllConcreteObservationsIdentical: true,
  actualOriginalCandidateMeasuredConsumerFilesEach: 304, actualChangedOwnerFiles: changed,
  actualUnchangedMeasuredConsumerFilesIncludingHarness: 302, actualIncludedHarnessFiles: 2,
  actualOtherUnchangedMeasuredConsumerFiles: 300, actualMeasuredHarnessDllPdbIdentical: true,
  actualIndependentRelocatedProjectSourceFiles: 6, actualOwnerForcedRebuildsByteMatched: 2,
  actualFailedInitialStandaloneBuildsRetained: 1, actualInitialStandaloneWarnings: 2, actualInitialStandaloneErrors: 1,
  actualFailedUntimedCharacterizationsRetained: 1, actualPassingStandaloneWarnings: 0,
  actualOriginalSourceAndProductRestored: true, actualFinalShippingChangedFiles: 0,
  actualNativeJitCausationProven: false, actualPrimaryPairs: primary,
  actualMaximumCvPercent: statistics.actualMaximumCoefficientOfVariationPercent,
  actualLiveAuditSha256: sha(join('live-file-audit.json')),
  actualPremeasurementComparisonSha256: sha(join('premeasurement-contract-comparison.json')),
  actualStatisticsAuditSha256: sha(join('statistics-audit.json')),
  actualSourceHeadDuringOwnerBuild: investigation.baseline,
  compatibility: 'Kept IEnumerator<string> ValueProviderResult.GetEnumerator() unchanged because already-compiled consumers bind to that exact return signature and would throw MissingMethodException if replaced with StringValues.Enumerator. Tested only a same-signature internal cast,then withdrew it;existing Values.GetEnumerator() remains available without new API.',
  limitations: [
    ...statistics.limitations,
    'No-gain means the tested compatible cast is not justified,not that every possible implementation/runtime is equivalent. Primary reverses;prepared8/64 regress. Query8/64 small consistent positives are retained,not promoted over adverse target/control evidence.',
    'Primary1456B/op unchanged. All other allocations match except round2 Count64 collection binding reports13392->13393B/op;no structural allocation saving. A nominal IL box removal does not prove a native allocation ever survived.',
    '61 concrete records comprise41cursor/query/binder observations plus20 actual benchmark setup/workload/cleanup lifecycle observations,not61additional E2E cases. Zero-value binding intentionally bypasses the changed method.',
    'Initial standalone build fails one context-type assumption with2warnings/1error. First untimed metadata inspection fails its generated-state-machine assumption;actual consumer uses runtime Async IL. Failed process lacks runtime/PID capture;negative exit and available source witnesses retained.',
    'Native PE/PDB associations cover10selected documents per process,including failed metadata profile;not complete compiler provenance or method coverage. Portable audit rehashes copied text/receipts,not omitted native binaries;separate live audit rehashes1216frozen consumer files and834loaded bindings/1318unique files.',
    'Both forced owner-only --no-incremental rebuilds match earlier tested source/DLL/PDB. Original test-bin restoration reuses those exact previously tested bytes,not a new unit-test execution. Relocated source/project bytes match;path-dependent rebuilt harness PE/PDB need not.',
    'Captured current main f2484a6b matches12selected files plus separately checked SimpleTypeModelBinder;campaign SDK/runtime pinned,not full latest-main integration. Bounded history/existing-work/LSP checks are not complete graph coverage.',
    'Two postmeasurement PowerShell/generation probes initially fail and are corrected;they do not consume additional timing slots or alter historical results. See postmeasurement-probe-limitations.json.',
  ],
};
const lines = [
  '# F035 complete audited comparisons', '',
  'Positive less-time percentages favor the candidate;negative values are regressions. Three complete alternating pairs,N=8 per row. All profiles,controls,allocation residuals and raw samples retained. Shared VM,not application throughput.', '',
  '| Profile | Round1 original->candidate ns | Less time % | Round2 original->candidate ns | Less time % | Round3 original->candidate ns | Less time % | B/op original->candidate rounds1/2/3 |',
  '|---|---:|---:|---:|---:|---:|---:|---|',
];
for (const key of [...new Set(statistics.actualEveryPair.map(row => row.key))].sort()) {
  const rows = statistics.actualEveryPair.filter(row => row.key === key).sort((a, b) => a.round - b.round);
  assert.equal(rows.length, 3);
  const cells = rows.flatMap(row => [
    `${row.actualOriginalMeanNanoseconds.toFixed(3)}->${row.actualCandidateMeanNanoseconds.toFixed(3)}`,
    row.actualLessTimePercent === null ? 'undefined:zero baseline' : row.actualLessTimePercent.toFixed(2),
  ]);
  lines.push(`| ${key} | ${cells.join(' | ')} | ${rows.map(row => `${row.actualOriginalBytesPerOperation}->${row.actualCandidateBytesPerOperation}`).join(' / ')} |`);
}
lines.push('', 'Declared primary:CollectionBinding:1. Prepared8/64 regress in all three pairs;Query8/64 have small consistent positives but no consistent ordinary binding gain. Primary1456B/op unchanged;Count64 round2+1B/op residual retained. Unchanged direct-Values controls move materially,particularly subnanosecond Count1. No fourth comparison;original source/product restored;no performance PR.', '');
const comparison = lines.join('\n');
if (verify) {
  assert.deepEqual(read(join('decision.json')), decision);
  assert.equal(text(join('comparison-results.md')), comparison);
  if (fs.existsSync(join('authoritative-copy-manifest.json'))) {
    for (const copy of read(join('authoritative-copy-manifest.json'))) {
      assert.equal(sha(join(copy.destination)), copy.sha256);
    }
  }
} else {
  fs.writeFileSync(join('decision.json'), JSON.stringify(decision, null, 2) + '\n', { flag: 'wx' });
  fs.writeFileSync(join('comparison-results.md'), comparison, { flag: 'wx' });
}
console.log(`F035:no-gain;120rows/960samples,68owning rows,3x61exact observations including3x20lifecycles,240settings,100selected source associations;${verify ? 'copied text verified' : 'audit finalized'}.`);
