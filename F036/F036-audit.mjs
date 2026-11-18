import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { auditStatistics as auditDiagnostic } from './F036-statistics.mjs';
import { auditStatistics as auditComparisons } from './F036-comparison-statistics.mjs';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.resolve(process.argv[2] ?? path.join(session, 'autoperf-runs', 'F036'));
const verify = process.argv.includes('--verify');
const join = (...parts) => path.join(run, ...parts.flatMap(part => part.split(/[\\/]/)));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const text = file => fs.readFileSync(file, 'utf8');
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const diagnostic = auditDiagnostic(run);
const statistics = auditComparisons(run);
assert.deepEqual(diagnostic, read(join('statistics-audit.json')));
assert.deepEqual(statistics, read(join('comparison-statistics-audit.json')));
assert.equal(diagnostic.actualResultRows, 32);
assert.equal(diagnostic.actualSamplesRecomputedAndMatchedToStdout, 256);
assert.equal(statistics.actualResultRows, 192);
assert.equal(statistics.actualSamplesRecomputedAndMatchedToStdout, 1536);
assert.equal(statistics.actualBudgetClosed, true);
assert.equal(statistics.actualAllStartedNativeMembersCompleted, true);
assert.equal(statistics.actualNativeTimedMembersCompleted, 6);
const budget = read(join('source-comparison-budget.json'));
assert.equal(budget.actualSourceComparisonsStarted, 3);
assert.equal(budget.actualSourceComparisonsCompleted, 3);
assert.equal(budget.actualSourceComparisonsConcluded, 3);
assert.equal(budget.comparisonsSettled.length, 3);
assert.ok(budget.comparisonsSettled.every(row => row.actualCompletedPair));
const oldPlanReceipt = read(join('measurement-plan-receipt.json'));
const sealedPlan = oldPlanReceipt.sealedFiles.filter(row => path.win32.basename(row.path) === 'measurement-plan.json');
assert.equal(sealedPlan.length, 1);
assert.equal(sha(join('measurement-plan.json')), sealedPlan[0].sha256);
const compared = read(join('source-comparison-contracts.json'));
assert.equal(compared.actualAllConcreteRecordsIdentical, true);
assert.equal(compared.actualSameHarnessAndOnlyOwnerPairChanged, true);
assert.equal(compared.actualSemanticRecordsPerImage, 33);
assert.equal(compared.actualBenchmarkLifecyclesPerImage, 32);
assert.equal(compared.actualSourceComparisonAttemptsBeforeSeal, 0);
const plan = read(join('source-comparison-plan.json'));
assert.equal(plan.definedBeforeShippingEditAndAnySourceComparisonTiming, true);
assert.equal(plan.diagnosticPrimaryRetainedAsComparisonPrimary, 'ReadCopy:1');
const investigation = read(join('investigation.json'));
assert.equal(investigation.actualSelectedFilePairs, 12);
assert.equal(investigation.actualRawSnapshots, 45);
const selected = investigation.parity.filter(row => row.core);
assert.equal(selected.length, 12);
assert.ok(selected.every(row => row.actualBaselineAndCurrentBlobBytesEqual && row.actualWorkingLfBytesMatchBaselineBlob));
const live = read(join('live-file-audit.json'));
assert.equal(live.actualReadOnlyLiveFileAndProcessAuditPassed, true);
assert.equal(live.actualFrozenConsumerFileChecks, 1156);
assert.equal(live.actualRuntimeRecords, 22);
assert.equal(live.actualLoadedAssemblyBindingObservations, 824);
assert.equal(live.actualUniqueRehashedFiles, 1255);
assert.equal(live.actualKnownSuccessfulNativeProcesses.length, 11);
assert.ok(live.actualKnownSuccessfulNativeProcesses.every(row => row.actualRecordedPidAbsent || row.actualPidReusedAfterNativeCompletion));
assert.equal(live.actualOriginalShippingSourceRestored, true);
assert.equal(live.actualOriginalProductAndTestBinOwnerRestored, true);
assert.equal(live.actualRestorationIncludesFreshNineteenRowTestExecution, true);
const images = {};
for (const label of ['preparation-original-001', 'preparation-reproduction-original',
  'comparison-preparation-original', 'comparison-preparation-candidate']) {
  const capsule = read(join(label, 'prepared', 'capsule.json'));
  const closure = read(join(label, 'prepared', 'closure.json'));
  assert.equal(closure.files.length, 289);
  assert.equal(new Set(closure.files.map(file => file.path)).size, 289);
  assert.equal(capsule.actualSourceHeadAtBuild, investigation.baseline);
  assert.equal(capsule.actualSettingsExecutorSourceSha256, '02B69C0AA06612700D9DA122BA64081771EE333B126DABC08156C0BD118F115B');
  for (const file of capsule.sourceFiles) {
    assert.equal(sha(join(label, 'prepared', file.path)), file.sha256);
  }
  images[label] = { capsule, closure, actualClosureSha256: sha(join(label, 'prepared', 'closure.json')) };
}
const original = images['comparison-preparation-original'];
const candidate = images['comparison-preparation-candidate'];
const originalRun = path.win32.dirname(path.win32.dirname(original.capsule.output));
const originalSession = path.win32.dirname(path.win32.dirname(originalRun));
for (const receipt of [oldPlanReceipt, compared]) {
  for (const file of receipt.sealedFiles) {
    const local = file.path.startsWith(originalRun + '\\') ? join(path.win32.relative(originalRun, file.path))
      : path.win32.dirname(file.path) === originalSession
        ? run.toLowerCase() === originalRun.toLowerCase() ? file.path : join(path.win32.basename(file.path))
        : null;
    assert.ok(local, 'Every sealed textual input must have a portable copied equivalent:' + file.path);
    assert.equal(sha(local), file.sha256);
  }
}
assert.equal(original.capsule.actualHarnessSha256, candidate.capsule.actualHarnessSha256);
assert.equal(original.capsule.actualHarnessPdbSha256, candidate.capsule.actualHarnessPdbSha256);
assert.equal(candidate.capsule.actualHarnessRebuilt, false);
const changes = original.closure.files.filter(file => {
  const matching = candidate.closure.files.filter(row => row.path === file.path);
  assert.equal(matching.length, 1);
  return matching[0].sha256 !== file.sha256;
}).map(row => row.path).sort();
assert.deepEqual(changes, ['Microsoft.AspNetCore.Mvc.ViewFeatures.dll', 'Microsoft.AspNetCore.Mvc.ViewFeatures.pdb']);
const beforeSource = text(join('comparison-preparation-original', 'prepared', 'sources', 'owner', 'ViewDataDictionary.cs'));
const afterSource = text(join('comparison-preparation-candidate', 'prepared', 'sources', 'owner', 'ViewDataDictionary.cs'));
const newline = beforeSource.includes('\r\n') ? '\r\n' : '\n';
assert.equal(beforeSource.replace('        return _data.GetEnumerator();', [
  "        // Preserve the interface enumerator's behavior for empty dictionaries.",
  '        if (_data is Dictionary<string, object?> { Count: > 0 } dictionary)',
  '        {',
  '            return dictionary.GetEnumerator();',
  '        }', '',
  '        return _data.GetEnumerator();',
].join(newline)), afterSource);
const oldHarness = join('preparation-original-001', 'prepared', 'sources', 'harness');
const newHarness = join('comparison-preparation-original', 'prepared', 'sources', 'harness');
for (const file of ['AutoPerf.Benchmarks.csproj', 'Contracts.cs', 'Scenario.cs', 'SettingsPreservingEmitToolchain.cs']) {
  assert.equal(sha(path.join(oldHarness, file)), sha(path.join(newHarness, file)));
}
assert.equal(text(path.join(newHarness, 'EnumerationBenchmarks.cs')).replaceAll('Evidence.Variant', '"original"'),
  text(path.join(oldHarness, 'EnumerationBenchmarks.cs')));
const reproduction = read(join('reproduction-verification.json'));
assert.equal(reproduction.actualIndependentRelocatedRebuildCompleted, true);
assert.equal(reproduction.actualSixSourceProjectFilesByteExact, true);
assert.equal(reproduction.actualSemanticRecords, 33);
assert.equal(reproduction.actualBenchmarkLifecycleProfiles, 32);
assert.equal(reproduction.actualNativeTimingRerun, false);
assert.equal(reproduction.actualRelocatedHarnessPePdbByteIdentityClaimed, false);
for (const file of reproduction.actualFiles) {
  assert.equal(file.actualOriginalSha256, file.actualReproductionSha256);
  assert.equal(sha(path.join(oldHarness, file.file)), file.actualOriginalSha256);
  assert.equal(sha(join('preparation-reproduction-original', 'prepared', 'sources', 'harness', file.file)), file.actualOriginalSha256);
}
const unescape = value => value.replaceAll('&quot;', '"').replaceAll('&apos;', "'")
  .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
const attributes = value => Object.fromEntries([...value.matchAll(/\b(\w+)="([^"]*)"/g)]
  .map(([, key, content]) => [key, unescape(content)]));
const testNames = [];
for (const label of ['original-existing-1', 'candidate-existing-1', 'original-existing-2']) {
  const directory = join('validation', label);
  const validation = read(path.join(directory, 'verified-result.json'));
  assert.equal(validation.actualPassed, 19);
  assert.equal(validation.actualSkipped, 0);
  assert.equal(validation.actualFailures, 0);
  assert.equal(validation.aFunctionalRedGreenVerification, false);
  const xmlFile = path.join(directory, 'owning.trx');
  const xml = text(xmlFile);
  const outcomes = read(path.join(directory, 'actual-outcomes.json'));
  assert.equal(sha(xmlFile), outcomes.actualXmlSha256);
  const rows = [...xml.matchAll(/<UnitTestResult\b([^>]*?)(?:\/>|>[\s\S]*?<\/UnitTestResult>)/g)].map(([, value]) => attributes(value));
  assert.equal(rows.length, 19);
  assert.equal(new Set(rows.map(row => row.executionId)).size, 19);
  assert.ok(rows.every(row => row.outcome === 'Passed'));
  const counters = /<Counters\b([^>]*?)(?:\/>|>)/.exec(xml);
  assert.ok(counters);
  assert.equal(Number(attributes(counters[1]).executed), 19);
  assert.equal(Number(attributes(counters[1]).passed), 19);
  assert.deepEqual(rows.map(row => [row.testName, row.testId, row.executionId, row.outcome]),
    outcomes.actualOutcomes.map(row => [row.name, row.testId, row.executionId, row.outcome]));
  for (const item of read(path.join(directory, 'selection.json'))) {
    const cases = rows.filter(row => row.testName === item.method || row.testName.startsWith(item.method + '('));
    assert.equal(cases.length, item.rows);
    if (item.rows === 2) {
      assert.ok(cases.some(row => /model:\s*null/.test(row.testName)));
      assert.ok(cases.some(row => /model:\s*23/.test(row.testName)));
    }
  }
  const image = label === 'candidate-existing-1' ? candidate : original;
  assert.deepEqual(validation.actualTestBinOwners, image.capsule.actualTestedOwners);
  if (validation.actualSourceSha256) {
    assert.equal(validation.actualSourceSha256,
      sha(join(label === 'candidate-existing-1' ? 'comparison-preparation-candidate' : 'comparison-preparation-original',
        'prepared', 'sources', 'owner', 'ViewDataDictionary.cs')));
  }
  assert.equal(read(path.join(directory, 'invocation.json')).actualExitCode, 0);
  testNames.push(rows.map(row => row.testName).sort());
}
assert.deepEqual(testNames[0], testNames[1]);
assert.deepEqual(testNames[0], testNames[2]);
const profiles = ['characterize-original-001', 'diagnostic-original-001', 'characterize-reproduction-original',
  'characterize-comparison-original', 'characterize-comparison-candidate',
  ...budget.nativeProfilesCompleted.map(row => row.label)].sort();
assert.deepEqual(fs.readdirSync(join('profiles')).sort(), profiles);
let documentWitnesses = 0;
let executorSettings = 0;
let benchmarkSettings = 0;
const contracts = {};
const lifecycles = {};
const methods = {};
for (const label of profiles) {
  const directory = join('profiles', label);
  const invocation = read(path.join(directory, 'invocation.json'));
  const image = images[invocation.preparation];
  assert.ok(image);
  assert.equal(invocation.actualExitCode, 0);
  assert.equal(invocation.actualClosureFileCount, 289);
  assert.equal(invocation.actualClosureSha256, image.actualClosureSha256);
  const records = fs.readdirSync(path.join(directory, 'states')).map(file => ({
    file, record: read(path.join(directory, 'states', file)),
  }));
  const state = suffix => {
    const matches = records.filter(row => row.file.endsWith('-' + suffix + '.json'));
    assert.equal(matches.length, 1, label + ':' + suffix);
    return matches[0].record;
  };
  const before = state('runtime-' + invocation.mode + '-before');
  const after = state('runtime-' + invocation.mode + '-after');
  assert.equal(before.runtime, '12.0.0');
  assert.equal(before.serverGc, true);
  assert.equal(before.sharedMachineNotIsolated, true);
  assert.deepEqual(before.initialSettings, after.initialSettings);
  assert.equal(before.initialSettings.processPriority, 'Normal');
  assert.equal(before.initialSettings.threadPriority, 'Normal');
  const witnesses = records.filter(row => row.file.includes('-source-pdb-'));
  assert.equal(witnesses.length, 3);
  assert.equal(witnesses.reduce((sum, row) => sum + row.record.documents.length, 0), 9);
  for (const { file, record } of witnesses) {
    assert.equal(record.actualPePdbBindingMatched, true);
    assert.equal(record.codeViewGuid, record.pdbGuid);
    const name = file.replace(/^\d+-source-pdb-/, '').replace(/\.json$/, '');
    assert.equal(record.assemblySha256, image.closure.files.find(row => row.path === name + '.dll').sha256);
    assert.equal(record.pdbSha256, image.closure.files.find(row => row.path === name + '.pdb').sha256);
    for (const document of record.documents) {
      const matching = image.capsule.sourceFiles.filter(row => path.win32.basename(row.path) === path.win32.basename(document.source));
      assert.equal(matching.length, 1);
      const file = join(invocation.preparation, 'prepared', matching[0].path);
      assert.equal(sha(file), document.sha256);
      const algorithm = document.algorithm === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256'
        : document.algorithm === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
      assert.ok(algorithm);
      assert.equal(createHash(algorithm).update(fs.readFileSync(file)).digest('hex').toUpperCase(), document.checksum);
      documentWitnesses++;
    }
  }
  methods[label] = state('actual-methods');
  assert.equal(methods[label].actualNoPublicPatternEnumerator, true);
  assert.equal(methods[label].reflectionMetadataReadOnlyNoPrivateInvocationOrUnsafeAccessor, true);
  for (const row of records.filter(row => row.file.endsWith('-benchmark-setup.json') || row.file.endsWith('-benchmark-cleanup.json'))) {
    assert.deepEqual(row.record.actualSettings, before.initialSettings);
    benchmarkSettings++;
  }
  if (invocation.mode === 'characterize') {
    contracts[label] = state('contracts');
    lifecycles[label] = state('benchmark-lifecycles');
    assert.equal(contracts[label].records.length, 33);
    assert.equal(lifecycles[label].records.length, 32);
    assert.equal(state('characterization-completed').actualAllSuccessful, true);
  } else {
    assert.equal(state('completed').actualReports, 32);
    assert.equal(state('completed').actualAllSuccessful, true);
    for (const suffix of ['-settings-before.json', '-settings-after.json']) {
      const settings = records.filter(row => row.file.endsWith(suffix));
      assert.equal(settings.length, 32);
      for (const row of settings) {
        assert.deepEqual(row.record, before.initialSettings);
        executorSettings++;
      }
    }
  }
}
assert.equal(documentWitnesses, 99);
assert.equal(executorSettings, 448);
assert.equal(benchmarkSettings, 704);
const first = 'characterize-original-001';
for (const label of Object.keys(contracts)) {
  assert.deepEqual(contracts[label], contracts[first]);
  assert.deepEqual(lifecycles[label], lifecycles[first]);
}
const originalMethods = methods['characterize-comparison-original'];
const candidateMethods = methods['characterize-comparison-candidate'];
assert.equal(originalMethods.actualGenericOwner.method, candidateMethods.actualGenericOwner.method);
assert.notEqual(originalMethods.actualGenericOwner.ilBytes, candidateMethods.actualGenericOwner.ilBytes);
assert.ok(candidateMethods.actualGenericOwner.instructions.some(row => row.opcode === 'box'));
for (const method of Object.values(methods)) {
  assert.deepEqual(method.actualNongenericOwner.instructions, originalMethods.actualNongenericOwner.instructions);
  assert.deepEqual(method.actualProtectedCopyConstructor.instructions, originalMethods.actualProtectedCopyConstructor.instructions);
  assert.deepEqual(method.actualCopyOnWriteEnumerator.instructions, originalMethods.actualCopyOnWriteEnumerator.instructions);
}
const primary = statistics.actualDeclaredPrimaryPairs;
assert.ok(primary.every(row => row.actualLessTimePercent < 0));
assert.ok(primary.every(row => row.actualOriginalBytesPerOperation === 56 && row.actualCandidateBytesPerOperation === 56));
assert.ok(statistics.actualEveryPair.every(row => row.actualOriginalBytesPerOperation === row.actualCandidateBytesPerOperation));
for (const key of ['TopLevelConcrete:0', 'TopLevelInterface:0', 'TypedConcrete:0', 'ReadCopy:0', 'NestedCopy:0', 'MaterializedCopy:0']) {
  assert.ok(statistics.actualEveryPair.filter(row => row.key === key).every(row => row.actualLessTimePercent < 0));
}
for (const label of ['preparation-original-001', 'preparation-reproduction-original', 'comparison-preparation-original']) {
  const invocations = read(join(label, 'actual-invocations.json'));
  assert.ok(invocations.every(row => row.actualExitCode === 0));
  assert.ok(text(join(label, 'build.stdout')).includes('0 Warning(s)'));
  assert.ok(text(join(label, 'build.stdout')).includes('0 Error(s)'));
}
const decision = {
  candidate: 'F036', disposition: 'no-gain', actualAuditPassed: true,
  actualSourceComparisons: 3, actualCompletedSourceComparisonPairs: 3, actualFailedTimedSourceComparisons: 0,
  actualStrategyVariants: 1, actualTimedComparisonMembers: 6, actualPairedResultRows: 192, actualPairedRawSamples: 1536,
  actualSeparateOriginalOnlyRuns: 1, actualOriginalOnlyRows: 32, actualOriginalOnlyRawSamples: 256,
  actualAllTimedRows: 224, actualAllRawSamples: 1792, actualAllSuccessfulNativeInvocations: 11,
  actualExecutorSettingsObservations: executorSettings, actualBenchmarkSettingsObservations: benchmarkSettings,
  actualSelectedPePdbSourceDocumentAssociations: documentWitnesses,
  actualOriginalCandidateAndRestoredOwningRowsEach: 19, actualTotalFreshOwningRows: 57, actualOwningSkippedRows: 0,
  actualSemanticRecordsPerCharacterization: 33, actualBenchmarkLifecyclesPerCharacterization: 32,
  actualSuccessfulCharacterizations: 4, actualAllConcreteRecordsIdentical: true,
  actualOriginalCandidateMeasuredConsumerFilesEach: 289, actualChangedOwnerFiles: changes,
  actualUnchangedMeasuredConsumerFilesIncludingHarness: 287, actualIncludedHarnessFiles: 2,
  actualOtherUnchangedMeasuredConsumerFiles: 285, actualMeasuredHarnessDllPdbIdentical: true,
  actualIndependentOriginalOnlyRelocatedSourceProjectFiles: 6, actualNewComparisonHarnessSeparatelyRelocated: false,
  actualTimedBodiesUnchangedAcrossPhases: true, actualOriginalSourceAndProductRestored: true,
  actualFinalShippingChangedFiles: 0, actualPublicApiChange: false, actualPerformancePrCreated: false,
  actualFailedBuildsOrNativeProfiles: 0, actualPassingStandaloneWarnings: 0, actualNativeJitCausationProven: false,
  actualPrimaryPairs: primary, actualMaximumPairedCvPercent: statistics.actualMaximumCoefficientOfVariationPercent,
  actualLiveAuditSha256: sha(join('live-file-audit.json')),
  actualDiagnosticStatisticsSha256: sha(join('statistics-audit.json')),
  actualComparisonStatisticsSha256: sha(join('comparison-statistics-audit.json')),
  actualSourceHeadDuringOwnerBuild: investigation.baseline,
  compatibility: 'Kept all existing public/interface signatures. Tested only a generic nonempty actual-Dictionary fast path,retaining the empty singleton and copy-on-write/derived interface fallback;then withdrew it. Nongeneric method and public API baselines unchanged.',
  limitations: [
    ...statistics.limitations,
    'Primary candidate uses1.93/7.54/10.66%more time;56B/op unchanged. Generic empty rows regress in all three pairs. Favorable scaled rows and unchanged-control movement retained;no convincing compatible gain.',
    'All96paired allocation observations match exactly. This does not establish that every future implementation/runtime is equivalent or every nominal IL box becomes a heap allocation.',
    'Original-only32rows/256samples are a separate historical diagnostic,not a paired comparison or extra optimization attempt. Its closed budget and earlier provisional API assessment remain unmodified.',
    'Original-only six-file relocation was independently rebuilt and reproduced33semantic+32lifecycle records byte-for-byte. The new comparison harness was not separately relocated;its measured variants use identical PE/PDB bytes and allfourcharacterizations match. Timed bodies and four other source/project files are byte-equivalent across phases;Program variant/job/closure metadata differs.',
    'Portable audit rehashes copied text,selected source documents and raw statistics,not omitted native binaries. Separate live audit rehashes1156frozen consumer files,824loaded bindings and1255unique files;all11actual native runtime PIDs checked.',
    'Selected source/PE/PDB associations cover9documents per invocation,99total;not complete compiler provenance,method coverage or application integration. No fresh full-current-main construction,Razor/HTTP or prevalence evidence.',
    'All19existing rows pass on original,candidate and restored original,including8metadata and both nullable integer theory rows. Preservation work,not a semantic bug-fix red/green claim.',
    'Non-timing authoring patch and statistics-entry guard observations are retained. The valid first-pair statistics file was renamed byte-exactly before final auditing;no additional native timing or source-comparison slot was consumed.',
  ],
};
const lines = [
  '# F036 complete audited comparisons', '',
  'Positive less-time percentages favor the candidate;negative values are regressions. Three complete alternating pairs,N=8 per row. All profiles,controls and allocations retained. Shared VM,not application throughput. Original-only diagnostic is separate.', '',
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
lines.push('', 'Declared primary:ReadCopy:1. Candidate takes1.93/7.54/10.66%more time;56B/opunchanged. All generic empty profiles regress. Small favorable scaled observations and unchanged Dictionary/nongeneric controls remain visible. No fourth comparison;original source/product restored;no performance PR.', '');
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
console.log(`F036:no-gain;192paired rows/1536samples plus32diagnostic rows/256samples;57owning rows,four33+32characterizations,448executor+704benchmark settings,99source associations;${verify ? 'copied text verified' : 'audit finalized'}.`);
