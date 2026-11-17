import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const [rootArgument, operation] = process.argv.slice(2);
assert.ok(rootArgument && ['--finalize', '--verify'].includes(operation), 'Supply F030 root and --finalize or --verify.');
const root = path.resolve(rootArgument);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const at = file => path.join(root, ...file.split(/[\\/]/));
const relocate = original => {
  const marker = '/autoperf-runs/F030/';
  const normalized = original.replaceAll('\\', '/');
  const index = normalized.indexOf(marker);
  assert.ok(index >= 0, `Recorded path outside F030:${original}`);
  return at(normalized.slice(index + marker.length));
};
const same = (left, right) => assert.ok(Math.abs(left - right) <= Math.max(1e-8, Math.abs(right) * 1e-10), `${left} != ${right}`);
const profiles = ['Sync.Completed32', 'Async.Completed32', 'Sync.Completed4096', 'Async.Completed4096'];
const plan = read(at('measurement-plan.json'));
const budget = read(at('measurement-budget.json'));
assert.deepEqual(plan.profiles, profiles);
assert.equal(plan.definedBeforeTiming, true);
assert.equal(plan.maximumOriginalDiagnosticProfiles, 1);
assert.equal(budget.maximum_user_source_comparisons, 3);
assert.equal(budget.actual_source_comparisons_started, 0);
assert.equal(budget.source_comparison_budget_closed, true);
assert.equal(budget.original_diagnostic_budget_closed, true);
assert.equal(budget.actual_diagnostic_profiles_started, 1);
assert.equal(budget.actual_diagnostic_profiles_completed, 1);
assert.equal(budget.profilesStarted.length, 1);
assert.equal(budget.authoritative_preparation, 'preparation-002');
assert.equal(budget.authoritative_characterization, 'characterize-original');
const investigation = read(at('investigation.json'));
assert.equal(investigation.actualSelectedFilePairs, 16);
assert.equal(investigation.actualSelectedSourceParity, true);
assert.equal(investigation.actualRawSnapshots, 54);
assert.equal(investigation.actualSelectedInterveningHistory, '');
assert.equal(read(at('acceptance.json')).definedBeforeProductEditsOrTiming, true);
for (const [index, entry] of investigation.parity.entries()) {
  const prefix = `${String(index).padStart(2, '0')}-${path.basename(entry.file)}`;
  for (const [variant, expected] of [['baseline', entry.actualBaselineBlobBytesSha256],
    ['current', entry.actualCurrentBlobBytesSha256], ['working', entry.actualWorkingBytesSha256]]) {
    assert.equal(sha(at(`source-snapshots/${prefix}.${variant}`)), expected);
  }
  if (entry.core) {
    assert.equal(entry.actualBaselineAndCurrentBlobBytesEqual, true);
    assert.equal(entry.actualWorkingLfBytesMatchBaselineBlob, true);
  }
}
const testDirectory = at('validation/original-existing');
const owning = read(path.join(testDirectory, 'verified-result.json'));
const outcomes = read(path.join(testDirectory, 'actual-outcomes.json'));
assert.equal(owning.actualPassed, 34);
assert.equal(owning.actualSkipped, 0);
assert.equal(owning.actualFailures, 0);
assert.equal(outcomes.actualXmlSha256, sha(path.join(testDirectory, 'owning.trx')));
assert.equal(outcomes.actualOutcomeCount, 34);
assert.equal(outcomes.actualOutcomes.length, 34);
assert.equal(new Set(outcomes.actualOutcomes.map(row => row.executionId)).size, 34);
assert.ok(outcomes.actualOutcomes.every(row => row.outcome === 'Passed' &&
  row.name.startsWith('Microsoft.AspNetCore.Mvc.Rendering.HtmlHelperPartialExtensionsTest.')));
const xml = fs.readFileSync(path.join(testDirectory, 'owning.trx'), 'utf8');
const xmlDecode = value => value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const xmlRows = [...xml.matchAll(/<UnitTestResult\b([^>]*?)(?:\/>|>)/g)].map(match =>
  Object.fromEntries([...match[1].matchAll(/([\w:]+)="([^"]*)"/g)].map(([, key, value]) => [key, xmlDecode(value)])));
assert.equal(xmlRows.length, 34);
for (const row of outcomes.actualOutcomes) {
  assert.equal(xmlRows.filter(value => value.executionId === row.executionId && value.testId === row.testId &&
    value.testName === row.name && value.outcome === row.outcome).length, 1);
}
for (const [name, count] of [['RenderPartialMethods_DoesNotWrapThrownException', 4],
  ['RenderPartialMethods_CallHtmlHelperWithExpectedArguments', 3],
  ['RenderPartialAsyncMethods_CallHtmlHelperWithExpectedArguments', 3]]) {
  const prefix = 'Microsoft.AspNetCore.Mvc.Rendering.HtmlHelperPartialExtensionsTest.' + name;
  assert.equal(xmlRows.filter(row => row.testName === prefix || row.testName.startsWith(prefix + '(')).length, count);
}
const firstPreparation = read(at('preparation/actual-invocations.json'));
assert.deepEqual(firstPreparation.map(row => row.actualExitCode), [0, 0, 1]);
assert.match(fs.readFileSync(at('preparation/build.stdout'), 'utf8'), /error CS0136/);
const failedSources = read(at('preparation/failed-formatted-source-copy.json'));
assert.equal(failedSources.actualFiles, 6);
failedSources.mappings.forEach(row => assert.equal(sha(relocate(row.copy)), row.sha256));
const nativeLabels = fs.readdirSync(at('profiles'));
assert.deepEqual(nativeLabels.sort(), ['characterize-original', 'original-diagnostic', 'reproduction-characterized'].sort());
const native = nativeLabels.map(label => ({ label, invocation: read(at(`profiles/${label}/invocation.json`)) }));
assert.ok(native.every(row => row.invocation.actualExitCode === 0));
assert.equal(native.filter(row => row.invocation.actualTimingProfile).length, 1);
const original = read(at('preparation-002/prepared/capsule.json'));
const fresh = read(at('reproduction-preparation/prepared/capsule.json'));
for (const [label, capsule] of [['preparation-002', original], ['reproduction-preparation', fresh]]) {
  const commands = read(at(`${label}/actual-invocations.json`));
  assert.deepEqual(commands.map(row => row.actualExitCode), [0, 0, 0]);
  assert.equal(commands[1].arguments.includes('--folder'), true);
  assert.equal(commands[1].arguments.includes('--verify-no-changes'), true);
  assert.equal(commands[1].arguments.filter(value => value.endsWith('.cs')).length, 5);
  assert.match(fs.readFileSync(at(`${label}/build.stdout`), 'utf8'), /0 Warning\(s\)[\s\S]*0 Error\(s\)/);
  assert.equal(capsule.actualClosureFiles, 294);
  assert.equal(capsule.actualShippingChanges, 0);
  assert.equal(capsule.sourceComparison, false);
  assert.equal(capsule.actualWhitespaceVerifiedBeforeFreeze, true);
  assert.equal(capsule.actualRepoEditorConfigSha256, sha(at('.editorconfig')));
  assert.equal(capsule.actualSourceHeadAtBuild, '37e809ead5824bc753a1c3d56f11615bdb1296c5');
  assert.equal(capsule.actualSettingsExecutorSourceSha256, '02B69C0AA06612700D9DA122BA64081771EE333B126DABC08156C0BD118F115B');
  assert.deepEqual(capsule.actualOriginalOwners, owning.actualOriginalOwners);
  const closure = read(relocate(capsule.closurePath));
  assert.equal(closure.files.length, 294);
  assert.equal(new Set(closure.files.map(row => row.path)).size, 294);
  for (const source of capsule.sourceFiles) {
    assert.equal(sha(path.join(path.dirname(relocate(capsule.closurePath)), ...source.path.split(/[\\/]/))), source.sha256);
  }
}
const relocated = read(at('relocated-harness-copy.json'));
assert.equal(relocated.actualFiles, 6);
assert.equal(relocated.actualSourcesByteExact, true);
for (const row of relocated.mappings) {
  assert.equal(sha(relocate(row.original)), row.sha256);
  assert.equal(sha(relocate(row.copy)), row.sha256);
  assert.equal(sha(at('harness/' + path.basename(row.copy))), row.sha256);
}
const contracts = [];
const auditedProfiles = [];
let settingsCount = 0;
const runtimeBindings = [];
for (const [label, capsule, characterizing] of [
  ['characterize-original', original, true], ['original-diagnostic', original, false],
  ['reproduction-characterized', fresh, true],
]) {
  const directory = at(`profiles/${label}`);
  const invocation = read(path.join(directory, 'invocation.json'));
  const exit = read(path.join(directory, 'verified-native-exit.json'));
  assert.equal(exit.actualNativeExitCode, 0);
  assert.equal(exit.actualClosureBeforeAndAfterMatched, true);
  assert.equal(invocation.actualHarnessSha256, capsule.actualHarnessSha256);
  assert.equal(invocation.actualClosureFileCount, 294);
  assert.equal(invocation.actualClosureSha256, sha(relocate(capsule.closurePath)));
  const states = fs.readdirSync(path.join(directory, 'states')).filter(file => file.endsWith('.json')).map(file =>
    ({ file, value: read(path.join(directory, 'states', file)) }));
  const matching = ending => states.filter(row => row.file.endsWith(ending)).map(row => row.value);
  const single = ending => {
    const rows = matching(ending);
    assert.equal(rows.length, 1, `${label}:${ending}`);
    return rows[0];
  };
  const before = single(`-runtime-${invocation.mode}-before.json`);
  const after = single(`-runtime-${invocation.mode}-after.json`);
  assert.equal(before.processId, after.processId);
  for (const runtime of [before, after]) {
    assert.equal(runtime.serverGc, true);
    assert.equal(runtime.actualX64Process, true);
    assert.equal(runtime.sharedMachineNotIsolated, true);
    assert.equal(runtime.sourceComparison, false);
    assert.equal(runtime.actualClosureSha256, invocation.actualClosureSha256);
    assert.equal(runtime.initialSettings.processPriority, 'Normal');
    assert.equal(runtime.initialSettings.threadPriority, 'Normal');
    assert.equal(runtime.runtimeAssemblies.find(row => row.name === 'System.Private.CoreLib')?.sha256,
      '0CEBA028A838AFF170CFF9D03570B34F9F044D6A9597974088E58B9834DF74E4');
    assert.equal(runtime.runtimeAssemblies.find(row => row.name === 'AutoPerf.Benchmarks')?.sha256, capsule.actualHarnessSha256);
    for (const owner of capsule.actualOriginalOwners) {
      assert.equal(runtime.runtimeAssemblies.find(row => row.name === owner.assembly)?.sha256, owner.actualOwnerSha256);
    }
    runtimeBindings.push(...runtime.runtimeAssemblies.map(row => ({ profile: label, ...row })));
  }
  for (const [assembly, count] of [['Microsoft.AspNetCore.Mvc.ViewFeatures', 3],
    ['Microsoft.AspNetCore.Mvc.Razor', 3], ['AutoPerf.Benchmarks', 5]]) {
    const witness = single(`-source-pdb-${assembly}.json`);
    assert.equal(witness.actualPePdbBindingMatched, true);
    assert.equal(witness.codeViewGuid, witness.pdbGuid);
    assert.equal(witness.assemblySha256, before.runtimeAssemblies.find(row => row.name === assembly)?.sha256);
    assert.equal(witness.documents.length, count);
    for (const document of witness.documents) {
      const file = relocate(document.source);
      assert.equal(sha(file), document.sha256);
      const algorithm = document.algorithm.toLowerCase() === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256'
        : document.algorithm.toLowerCase() === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
      assert.ok(algorithm);
      assert.equal(createHash(algorithm).update(fs.readFileSync(file)).digest('hex').toUpperCase(), document.checksum);
    }
  }
  if (characterizing) {
    const summary = single('-characterization-completed.json');
    assert.equal(summary.actualCompletedWrappers, 4);
    assert.equal(summary.actualPendingProducerContracts, 6);
    assert.equal(summary.actualAllSuccessful, true);
    assert.equal(summary.actualRealParentRazorViewUsed, true);
    assert.equal(summary.directMockedHtmlHelperTask, false);
    const completed = matching('-completed-producer.json');
    assert.deepEqual(completed.map(row => row.label).sort(), [...profiles].sort());
    const pending = [...matching('-pending-sync-after-release.json'), ...matching('-pending-async-after-release.json')];
    assert.deepEqual(pending.map(row => row.label).sort(),
      ['Sync', 'Async'].flatMap(api => ['success', 'failure', 'cancellation'].map(outcome => `${api}.Pending.${outcome}`)).sort());
    for (const row of [...completed, ...pending]) {
      for (const property of ['actualLookupCalls', 'actualViewRenderCalls', 'actualViewDisposeCalls']) {
        assert.equal(row[property], 1);
      }
      assert.equal(row.actualModelAndViewDataContractsMatched, true);
      assert.equal(row.actualScopeImplementation, 'Microsoft.AspNetCore.Mvc.ViewFeatures.Buffers.MemoryPoolViewBufferScope');
      assert.equal(row.actualParentWriterType, 'Microsoft.AspNetCore.Mvc.ViewFeatures.Buffers.ViewBufferTextWriter');
      assert.equal(row.actualPartialProducerWriterType, row.actualParentWriterType);
      assert.equal(row.actualParentBeforeWritten, true);
      assert.equal(row.actualPublicCallFinished, true);
      assert.equal(row.actualRootWriterDisposed, false);
      assert.equal(row.actualCallerWriterRestored, true);
      assert.equal(row.actualPartialPageCompleted, row.success);
      assert.equal(row.actualParentAfterWritten, row.success);
      assert.equal(row.actualPublicCallSucceeded, row.success);
      assert.equal(row.actualRootWriterText, row.success ? row.expectedOnSuccess : '');
    }
    for (const api of ['sync', 'async']) {
      const rows = matching(`-pending-${api}-before-release.json`);
      assert.deepEqual(rows.map(row => row.outcome).sort(), ['cancellation', 'failure', 'success']);
      for (const row of rows) {
        assert.equal(row.actualPublicCallFinished, false);
        assert.equal(row.actualParentBeforeWritten, true);
        assert.equal(row.actualParentAfterWritten, false);
        assert.equal(row.actualRootWriterText, '');
        assert.equal(row.actualRootWriterDisposed, false);
        assert.equal(row.actualRealPartialRazorViewTaskCompleted, false);
        assert.equal(row.actualCallingThreadId, row.actualProducerThreadId);
        assert.equal(row.actualViewDisposeCalls, 0);
        assert.equal(row.directMockedHtmlHelperTask, false);
        assert.equal(row.actualOuterRenderTaskReturnedToHarness, api === 'async');
        if (api === 'sync') {
          assert.equal(row.actualObservedPendingWait, true);
          assert.ok(row.actualCallingThreadState.includes('WaitSleepJoin'));
          assert.equal(row.actualHarnessInvocationFinished, false);
          assert.equal(row.fixedSleepUsed, false);
        } else {
          assert.equal(row.actualPublicTaskReturnedToParent, true);
          assert.equal(row.actualPublicTaskCompleted, false);
          assert.equal(row.actualOuterRenderTaskCompleted, false);
        }
      }
    }
    const pendingOutcomes = matching('-pending-outcome.json');
    assert.equal(pendingOutcomes.length, 6);
    for (const row of pendingOutcomes) {
      assert.equal(row.actualExpectedOutcomeMatched, true);
      if (row.outcome === 'failure') {
        assert.equal(row.actualObservedExceptionType, 'System.InvalidOperationException');
        assert.equal(row.actualPublicBoundaryExceptionType, row.actualObservedExceptionType);
        assert.equal(row.actualOuterAndPublicExceptionReferenceMatched, true);
      } else if (row.outcome === 'cancellation') {
        assert.equal(row.actualCancellationTokensMatched, true);
      }
    }
    contracts.push({ label, actualCompletedWrappers: 4, actualPendingProducerContracts: 6, actualRealParentRazorViewUsed: true });
  } else {
    const setup = matching('-benchmark-setup.json');
    assert.deepEqual(setup.map(row => row.Profile).sort(), [...profiles].sort());
    for (const row of setup) {
      assert.equal(row.processId, before.processId);
      assert.equal(row.actualHarnessSha256, capsule.actualHarnessSha256);
      assert.equal(row.actualCompletedParentAndPartialWrapper, true);
      assert.equal(row.sourceComparison, false);
    }
    for (const ending of ['-settings-before.json', '-settings-after.json']) {
      const rows = matching(ending);
      assert.equal(rows.length, 4);
      rows.forEach(row => assert.deepEqual(row, before.initialSettings));
      settingsCount += rows.length;
    }
    assert.equal(single('-completed.json').originalOnlyDiagnostic, true);
    assert.equal(single('-completed.json').anOptimizationGain, false);
  }
  auditedProfiles.push({ label, nativeExit: 0, harnessSha256: capsule.actualHarnessSha256, sourcePdbDocuments: 11 });
}
const reportFile = at('profiles/original-diagnostic/results/AutoPerf.RenderPartialBenchmarks-report-full.json');
const report = read(reportFile);
assert.equal(report.Benchmarks.length, 4);
const rawStdout = fs.readFileSync(at('profiles/original-diagnostic/native.stdout'), 'utf8');
const stdoutSamples = [...rawStdout.matchAll(/^WorkloadResult\s+\d+:\s+(\d+) op,\s+([\d.]+) ns,/gm)]
  .map(([, operations, nanoseconds]) => ({ operations: Number(operations), nanoseconds: Number(nanoseconds) }));
assert.equal(stdoutSamples.length, 32);
let stdoutIndex = 0;
const results = report.Benchmarks.map(row => {
  const match = /^AutoPerf\.RenderPartialBenchmarks\.RenderAndConsume\(Profile: "([^"]+)"\)$/.exec(row.FullName);
  assert.ok(match, row.FullName);
  for (const setting of ['OutlierMode=DontRemove', 'IterationCount=8', 'UnrollFactor=1', 'WarmupCount=3']) {
    assert.ok(row.DisplayInfo.includes(setting));
  }
  const samples = row.Measurements.filter(value => value.IterationMode === 'Workload' && value.IterationStage === 'Result');
  assert.equal(samples.length, 8);
  assert.equal(row.Statistics.N, 8);
  assert.equal(row.Statistics.OriginalValues.length, 8);
  const values = samples.map(value => {
    assert.ok(value.Operations > 0 && value.Nanoseconds > 0);
    const raw = stdoutSamples[stdoutIndex++];
    assert.equal(raw.operations, value.Operations);
    same(raw.nanoseconds, value.Nanoseconds);
    return value.Nanoseconds / value.Operations;
  }).sort((left, right) => left - right);
  [...row.Statistics.OriginalValues].sort((left, right) => left - right).forEach((value, index) => same(value, values[index]));
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  same(mean, row.Statistics.Mean);
  same(variance, row.Statistics.Variance);
  same(Math.sqrt(variance), row.Statistics.StandardDeviation);
  same(Math.sqrt(variance / values.length), row.Statistics.StandardError);
  assert.ok(Number.isFinite(row.Memory.BytesAllocatedPerOperation) && row.Memory.BytesAllocatedPerOperation >= 0);
  return {
    profile: match[1], meanNanoseconds: mean, standardDeviationNanoseconds: Math.sqrt(variance),
    coefficientOfVariationPercent: 100 * Math.sqrt(variance) / mean,
    bytesPerOperation: row.Memory.BytesAllocatedPerOperation, retainedResults: values.length,
    confidenceInterval: row.Statistics.ConfidenceInterval, actualValuesNanoseconds: values,
  };
});
assert.deepEqual(results.map(row => row.profile).sort(), [...profiles].sort());
const audit = {
  candidate: 'F030', disposition: 'rejected', sourceComparisons: 0, originalOnlyDiagnosticProfiles: 1,
  retainedResultSamples: 32, actualStdoutResultSamplesMatchedToJson: stdoutIndex,
  originalOwningRows: 34, originalOwningSkips: 0, scopedCurrentDefaultFilePairs: 16, exactRawSourceSnapshots: 54,
  measuredImageFiles: 294, relocatedImageFiles: 294, authoritativeCharacterizations: contracts,
  auditedNativeProfiles: auditedProfiles, verifiedSettingsObservations: settingsCount,
  recordedLoadedAssemblyBindings: runtimeBindings.length, sourcePdbDocumentsPerAuditedProfile: 11,
  directWhitespaceVerifiedBeforeMeasuredSourceFreeze: true, passingBuildWarnings: 0, passingBuildErrors: 0,
  retainedFailedBuilds: 1, retainedFailedBuildErrorIds: ['CS0136'], failedBuildPreservedFormattedSources: 6,
  reportSha256: sha(reportFile), nativeStdoutSha256: sha(at('profiles/original-diagnostic/native.stdout')), results,
  maximumCoefficientOfVariationPercent: Math.max(...results.map(row => row.coefficientOfVariationPercent)),
  limitations: [
    'Original current APIs only;not a before/after optimization,API ranking or isolated blocking/awaiter-overhead experiment.',
    'Whole controlled wrapper includes real parent/partial RazorViews,CSharp pages,request-scoped DI buffers,model/helper/writer construction,prepared successful partial lookup,strict unused interfaces and output consumption.',
    'Before pending synchronous release,the outer renderer has not returned a task to the harness. The observed wait is inside the public method,not a harness-side GetResult. Parent writer is produced by real RazorView,not internal access.',
    'Controlled literal parent/partial producer,not HTTP,cshtml discovery/compilation,production frequency,throughput,starvation or deadlock proof.',
    'All eight results are retained on a shared Windows machine. No extra timing is authorized;all source comparison slots remain unused.',
    'Means,sample variance,SD and SE recomputed from32native stdout/JSON result samples. Reported allocation/CI values retained,not allocation-type tracing or independent CI-distribution/GC arithmetic.',
    'Portable audit rehashes copied textual sources/receipts,not omitted DLL/PDB/native bytes. Source/PDB receipts are associations,not complete compiler provenance or coverage.',
    'The first standalone build fails with two CS0136 pattern-variable scope collisions. Exact formatted failed sources and original logs remain;names corrected before any native run or timing.',
    'Existing four synchronous exception rows use immediate mocked failures. Both three-row expected-argument methods use async MemberData;neither is claimed as a real pending producer or synchronous-success test.',
  ],
};
const lines = [
  '# F030 unchanged original RenderPartial diagnostics', '',
  '**Rejected nonblocking replacement of a shipped synchronous writer-completion contract. No source optimization or measured gain.**',
  'One original-only profile;zero source comparisons. Completed real-parent/partial wrappers,not pending-I/O timings or isolated awaiter costs.', '',
  '| Existing API / payload characters | Mean us/op | StdDev us | CV% | Managed B/op | Retained N |',
  '|---|---:|---:|---:|---:|---:|',
  ...results.map(row => `| ${row.profile} | ${(row.meanNanoseconds / 1000).toFixed(3)} | ${(row.standardDeviationNanoseconds / 1000).toFixed(3)} | ${row.coefficientOfVariationPercent.toFixed(2)} | ${row.bytesPerOperation} | ${row.retainedResults} |`),
  '', 'Do not interpret existing-API row differences as a framework improvement,an async API ranking or isolated blocking overhead. Whole parent/partial/request/DI-scope/writer construction is included. All variability is retained without retiming.',
  '', 'Two independently built images each pass four completed wrappers and six real pending parent/partial producer contracts. Fresh existing owning tests pass34/34,0skipped.',
  '', ...audit.limitations.map(value => `- ${value}`), '',
].join('\n');
const decision = {
  candidate: 'F030', disposition: 'rejected',
  qualification: 'Contract-blocked nonblocking replacement,not zero original cost or a universal rejection of future compatible optimizations.',
  exactShippedEntryPointUnchanged: read(at('acceptance.json')).exactShippedEntryPoint,
  compatibilityReason: 'Already-compiled callers bind the exact void RenderPartial signature. A Task-returning replacement breaks that binding;returning before real rendering completes changes ordered writer output,error/cancellation timing and disposal.',
  actualProducerBoundary: 'Actual parent RazorView/CSharp page -> public RenderPartial/RenderPartialAsync -> actual HtmlHelper -> actual partial RazorView -> page-owned pending CSharp producer.',
  synchronousHarnessWaitExcluded: true, actualInternalBufferAccessAdded: false,
  existingSupportedAlternative: 'Existing RenderPartialAsync or PartialTagHelper caller migration,already documented by MVC1000;not an implemented framework optimization.',
  actualShippingChanges: 0, actualSourceComparisons: 0, originalOnlyDiagnosticProfiles: 1,
  originalResults: 4, retainedRawResults: 32, nativeStdoutSamplesMatchedToJson: stdoutIndex,
  originalOwningRows: 34, originalOwningSkips: 0, characterizedImageVariants: 2,
  actualCompletedWrappersPerImage: 4, actualPendingProducerContractsPerImage: 6,
  physicalConsumerFilesPerImage: 294, actualPassingBuildWarnings: 0, actualPassingBuildErrors: 0,
  actualWhitespaceVerifiedBeforeFreeze: true, actualFailedPreparationBuildsRetained: 1,
  actualMaximumDiagnosticCvPercent: audit.maximumCoefficientOfVariationPercent,
  comparisonAndDiagnosticBudgetsPermanentlyClosed: true, actualPerformancePrCreated: false,
  historicalMeasuredSourcesAndImagesUnmodified: true, noClaims: audit.limitations,
};
for (const [file, value] of [['measurement-audit.json', audit], ['decision.json', decision]]) {
  if (operation === '--finalize') {
    assert.equal(fs.existsSync(at(file)), false, 'Do not overwrite a finalized audit.');
    fs.writeFileSync(at(file), JSON.stringify(value, null, 2) + '\n');
  } else {
    assert.deepEqual(read(at(file)), value);
  }
}
if (operation === '--finalize') {
  assert.equal(fs.existsSync(at('original-profile.md')), false);
  fs.writeFileSync(at('original-profile.md'), lines);
} else {
  assert.equal(fs.readFileSync(at('original-profile.md'), 'utf8'), lines);
}
console.log(`F030:34exact owning rows,4means/32native stdout+JSON samples,2x4/6real parent/partial contracts,3source/PDB profiles and${settingsCount}settings observations verified;0source comparisons.`);
