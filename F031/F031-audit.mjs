import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const [rootArgument, operation] = process.argv.slice(2);
assert.ok(rootArgument && ['--finalize', '--verify'].includes(operation), 'Supply F031 root and --finalize or --verify.');
const root = path.resolve(rootArgument);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const at = file => path.join(root, ...file.split(/[\\/]/));
const leaf = file => file.split(/[\\/]/).at(-1);
const relocate = original => {
  const marker = '/autoperf-runs/F031/';
  const normalized = original.replaceAll('\\', '/');
  const index = normalized.indexOf(marker);
  assert.ok(index >= 0, `Recorded path outside F031: ${original}`);
  return at(normalized.slice(index + marker.length));
};
const same = (left, right) => assert.ok(Math.abs(left - right) <= Math.max(1e-8, Math.abs(right) * 1e-10), `${left} != ${right}`);
const profiles = ['Display.Completed32', 'Display.Default32', 'Editor.Completed32',
  'Display.Completed4096', 'Display.Default4096', 'Editor.Completed4096'];
const plan = read(at('measurement-plan.json'));
const budget = read(at('measurement-budget.json'));
assert.equal(plan.definedBeforeTiming, true);
assert.equal(plan.strategyCount, 1);
assert.equal(plan.maximumActualSourceComparisons, 3);
assert.deepEqual(budget.profiles, profiles);
assert.equal(budget.maximumActualSourceComparisons, 3);
assert.equal(budget.actualSourceComparisonsStarted, 3);
assert.equal(budget.actualSourceComparisonsCompleted, 3);
assert.equal(budget.sourceComparisonBudgetClosed, true);
assert.equal(budget.nativeProfilesStarted.length, 6);
assert.equal(budget.nativeProfilesCompleted.length, 6);
const timedOrder = budget.pairedOrder.flatMap((order, index) => order.map(variant =>
  ({ round: index + 1, variant, label: `round-${index + 1}-${variant}` })));
for (const [index, expected] of timedOrder.entries()) {
  for (const list of [budget.nativeProfilesStarted, budget.nativeProfilesCompleted]) {
    for (const key of ['round', 'variant', 'label']) {
      assert.equal(list[index][key], expected[key]);
    }
  }
}
assert.equal(read(at('acceptance.json')).definedBeforeProductEditsOrTiming, true);
const investigation = read(at('investigation.json'));
assert.equal(investigation.actualSelectedFilePairs, 21);
assert.equal(investigation.actualSelectedSourceParity, true);
assert.equal(investigation.actualRawSnapshots, 69);
assert.equal(investigation.actualSelectedInterveningHistory, '');
for (const [index, entry] of investigation.parity.entries()) {
  const prefix = `${String(index).padStart(2, '0')}-${leaf(entry.file)}`;
  for (const [variant, expected] of [['baseline', entry.actualBaselineBlobBytesSha256],
    ['current', entry.actualCurrentBlobBytesSha256], ['working', entry.actualWorkingBytesSha256]]) {
    assert.equal(sha(at(`source-snapshots/${prefix}.${variant}`)), expected);
  }
  if (entry.core) {
    assert.equal(entry.actualBaselineAndCurrentBlobBytesEqual, true);
    assert.equal(entry.actualWorkingLfBytesMatchBaselineBlob, true);
  }
}
const testResults = new Map();
const xmlDecode = value => value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
for (const variant of ['original', 'candidate']) {
  const directory = at(`validation/${variant}-existing`);
  const verified = read(path.join(directory, 'verified-result.json'));
  const outcomes = read(path.join(directory, 'actual-outcomes.json'));
  const invocation = read(path.join(directory, 'invocation.json'));
  assert.equal(invocation.actualExitCode, 0);
  assert.equal(verified.actualPassed, 525);
  assert.equal(verified.actualSkipped, 0);
  assert.equal(verified.actualFailures, 0);
  assert.deepEqual(verified.actualClassCounts.map(row => row.actualExecutedPassed), [16, 30, 456, 19, 4]);
  assert.equal(outcomes.actualXmlSha256, sha(path.join(directory, 'owning.trx')));
  assert.equal(outcomes.actualOutcomes.length, 525);
  assert.equal(new Set(outcomes.actualOutcomes.map(row => row.executionId)).size, 525);
  assert.ok(outcomes.actualOutcomes.every(row => row.outcome === 'Passed'));
  const xml = fs.readFileSync(path.join(directory, 'owning.trx'), 'utf8');
  const xmlRows = [...xml.matchAll(/<UnitTestResult\b([^>]*?)(?:\/>|>)/g)].map(match =>
    Object.fromEntries([...match[1].matchAll(/([\w:]+)="([^"]*)"/g)].map(([, key, value]) => [key, xmlDecode(value)])));
  assert.equal(xmlRows.length, 525);
  for (const row of outcomes.actualOutcomes) {
    assert.equal(xmlRows.filter(value => value.executionId === row.executionId && value.testId === row.testId &&
      value.testName === row.name && value.outcome === row.outcome).length, 1);
  }
  assert.equal(sha(path.join(directory, 'TemplateRenderer.cs.executed-source')), verified.actualTemplateRendererSourceSha256);
  testResults.set(variant, { verified, outcomes });
}
assert.deepEqual(testResults.get('original').outcomes.actualOutcomes.map(row => row.name).sort(),
  testResults.get('candidate').outcomes.actualOutcomes.map(row => row.name).sort());
const reverified = read(at('validation/original-existing/postprocessing-reverification.json'));
assert.equal(reverified.actualOriginalDriverExitCode, 1);
assert.equal(reverified.actualOriginalTestRunnerExitCode, 0);
assert.equal(reverified.actualFreshTestRuns, 1);
assert.equal(reverified.actualTestRerunPerformed, false);
assert.equal(reverified.actualOriginalLogsTrxAndOutcomeBytesPreserved, true);
const originalSource = fs.readFileSync(at('validation/original-existing/TemplateRenderer.cs.executed-source'), 'utf8').replaceAll('\r\n', '\n');
const candidateSource = fs.readFileSync(at('validation/candidate-existing/TemplateRenderer.cs.executed-source'), 'utf8').replaceAll('\r\n', '\n');
const seam = '                        renderTask.GetAwaiter().GetResult();\n                        return viewBuffer;';
assert.equal(originalSource.split(seam).length, 2);
assert.equal(candidateSource, originalSource.replace(seam,
  '                        if (!renderTask.IsCompletedSuccessfully)\n                        {\n' +
  '                            renderTask.GetAwaiter().GetResult();\n                        }\n\n                        return viewBuffer;'));
assert.equal(read(at('candidate-shipping-whitespace.json')).actualExitCode, 0);
assert.equal(read(at('restored-owner-build/invocation.json')).actualExitCode, 0);
assert.equal(read(at('restored-owner-build/verified-restoration.json')).actualRestoredProductDllAndPdbMatchOriginallyTestedOwners, true);
const capsules = new Map();
for (const label of ['preparation-original', 'preparation-candidate', 'reproduction-preparation']) {
  const capsule = read(at(`${label}/prepared/capsule.json`));
  assert.equal(capsule.actualClosureFiles, 294);
  assert.equal(capsule.actualSourceHeadAtBuild, '37e809ead5824bc753a1c3d56f11615bdb1296c5');
  assert.equal(capsule.actualSettingsExecutorSourceSha256, '02B69C0AA06612700D9DA122BA64081771EE333B126DABC08156C0BD118F115B');
  assert.equal(capsule.actualWhitespaceVerifiedBeforeFreeze, true);
  assert.equal(capsule.actualRepoEditorConfigSha256, sha(at('.editorconfig')));
  assert.deepEqual(capsule.actualTestedOwners, testResults.get(capsule.variant).verified.actualOwners);
  const closure = read(relocate(capsule.closurePath));
  assert.equal(closure.files.length, 294);
  assert.equal(new Set(closure.files.map(row => row.path)).size, 294);
  for (const source of capsule.sourceFiles) {
    assert.equal(sha(path.join(path.dirname(relocate(capsule.closurePath)), ...source.path.split(/[\\/]/))), source.sha256);
  }
  if (label !== 'preparation-candidate') {
    const commands = read(at(`${label}/actual-invocations.json`));
    assert.deepEqual(commands.map(row => row.actualExitCode), [0, 0, 0]);
    assert.equal(commands[1].arguments.includes('--verify-no-changes'), true);
    assert.equal(commands[1].arguments.filter(value => value.endsWith('.cs')).length, 5);
    assert.match(fs.readFileSync(at(`${label}/build.stdout`), 'utf8'), /0 Warning\(s\)[\s\S]*0 Error\(s\)/);
  } else {
    const patch = read(at(`${label}/identical-harness-owner-patch.json`));
    assert.equal(patch.actualHarnessRebuilt, false);
    assert.equal(patch.actualChangedConsumerFiles.length, 2);
  }
  capsules.set(label, { ...capsule, closure });
}
const original = capsules.get('preparation-original');
const candidate = capsules.get('preparation-candidate');
assert.equal(original.actualHarnessSha256, candidate.actualHarnessSha256);
assert.equal(original.actualHarnessPdbSha256, candidate.actualHarnessPdbSha256);
const originalFiles = new Map(original.closure.files.map(row => [row.path, row.sha256]));
const differingFiles = candidate.closure.files.filter(row => row.sha256 !== originalFiles.get(row.path));
assert.deepEqual(differingFiles.map(row => row.path).sort(),
  ['Microsoft.AspNetCore.Mvc.ViewFeatures.dll', 'Microsoft.AspNetCore.Mvc.ViewFeatures.pdb']);
for (const file of original.sourceFiles.filter(row => row.path.replaceAll('\\', '/').startsWith('sources/harness/'))) {
  assert.equal(candidate.sourceFiles.find(row => row.path === file.path)?.sha256, file.sha256);
  assert.equal(sha(at('harness/' + leaf(file.path))), file.sha256);
}
const relocated = read(at('relocated-harness-copy.json'));
assert.equal(relocated.actualFiles, 6);
assert.equal(relocated.actualSourcesByteExact, true);
for (const row of relocated.mappings) {
  assert.equal(sha(relocate(row.original)), row.sha256);
  assert.equal(sha(relocate(row.copy)), row.sha256);
}
const nativeLabels = ['characterize-original', 'characterize-candidate', 'reproduction-characterized',
  ...timedOrder.map(row => row.label)];
assert.deepEqual(fs.readdirSync(at('profiles')).sort(), [...nativeLabels].sort());
const contracts = [];
const auditedProfiles = [];
const results = [];
const runtimeBindings = [];
let settingsCount = 0;
let matchedStdoutSamples = 0;
let totalTimedSeconds = 0;
function verifyCapture(row) {
  const control = row.label.startsWith('Display.Default');
  assert.equal(row.actualPublicCallFinished, true);
  assert.equal(row.actualPublicCallSucceeded, row.success);
  assert.equal(row.actualRootWriterText, row.success ? row.expectedOnSuccess : 'before|');
  assert.equal(row.actualRootWriterDisposed, false);
  assert.equal(row.actualCallerWriterRestored, true);
  assert.equal(row.actualLookupCalls, 1);
  assert.equal(row.actualFindViewCalls, control || row.label.endsWith('.FindView') ? 1 : 0);
  assert.equal(row.actualCustomViewSelected, !control);
  assert.equal(row.actualModelAndViewDataContractsMatched, true);
  assert.equal(row.actualScopeImplementation, 'Microsoft.AspNetCore.Mvc.ViewFeatures.Buffers.MemoryPoolViewBufferScope');
  if (!control) {
    assert.equal(row.actualTemplateViewRenderCalls, 1);
    assert.equal(row.actualTemplateViewDisposeCalls, 1);
    assert.equal(row.actualTemplateTaskCompleted, true);
    assert.equal(row.actualTemplateTaskSucceeded, row.success);
    assert.equal(row.actualTemplateWriterType, 'Microsoft.AspNetCore.Mvc.ViewFeatures.Buffers.ViewBufferTextWriter');
  } else {
    assert.equal(row.actualTemplateViewRenderCalls, null);
    assert.equal(row.actualTemplateViewDisposeCalls, null);
  }
}
for (const label of nativeLabels) {
  const directory = at(`profiles/${label}`);
  const invocation = read(path.join(directory, 'invocation.json'));
  const exit = read(path.join(directory, 'verified-native-exit.json'));
  const capsule = capsules.get(invocation.preparation);
  assert.ok(capsule);
  const characterizing = invocation.mode === 'characterize';
  assert.equal(invocation.actualExitCode, 0);
  assert.equal(exit.actualNativeExitCode, 0);
  assert.equal(exit.actualClosureBeforeAndAfterMatched, true);
  assert.equal(invocation.variant, capsule.variant);
  assert.equal(invocation.actualHarnessSha256, capsule.actualHarnessSha256);
  assert.equal(invocation.actualHarnessPdbSha256, capsule.actualHarnessPdbSha256);
  assert.equal(invocation.actualClosureFileCount, 294);
  assert.equal(invocation.actualClosureSha256, sha(relocate(capsule.closurePath)));
  const states = fs.readdirSync(path.join(directory, 'states')).filter(file => file.endsWith('.json')).map(file =>
    ({ file, value: read(path.join(directory, 'states', file)) }));
  const matching = ending => states.filter(row => row.file.endsWith(ending)).map(row => row.value);
  const single = ending => {
    const rows = matching(ending);
    assert.equal(rows.length, 1, `${label}: ${ending}`);
    return rows[0];
  };
  const before = single(`-runtime-${invocation.mode}-before.json`);
  const after = single(`-runtime-${invocation.mode}-after.json`);
  assert.equal(before.processId, after.processId);
  const runtimes = states.filter(row => row.file.includes('-runtime-')).map(row => row.value);
  assert.equal(runtimes.length, characterizing ? 2 : 8);
  for (const runtime of runtimes) {
    assert.equal(runtime.processId, before.processId);
    assert.equal(runtime.variant, capsule.variant);
    assert.equal(runtime.serverGc, true);
    assert.equal(runtime.actualX64Process, true);
    assert.equal(runtime.sharedMachineNotIsolated, true);
    assert.equal(runtime.actualClosureSha256, invocation.actualClosureSha256);
    assert.equal(runtime.initialSettings.processPriority, 'Normal');
    assert.equal(runtime.initialSettings.threadPriority, 'Normal');
    assert.deepEqual(runtime.initialSettings, before.initialSettings);
    assert.equal(runtime.runtimeAssemblies.find(row => row.name === 'System.Private.CoreLib')?.sha256,
      '0CEBA028A838AFF170CFF9D03570B34F9F044D6A9597974088E58B9834DF74E4');
    assert.equal(runtime.runtimeAssemblies.find(row => row.name === 'AutoPerf.Benchmarks')?.sha256, capsule.actualHarnessSha256);
    for (const owner of capsule.actualTestedOwners) {
      assert.equal(runtime.runtimeAssemblies.find(row => row.name === owner.assembly)?.sha256, owner.actualOwnerSha256);
    }
    runtimeBindings.push(...runtime.runtimeAssemblies.map(row => ({ profile: label, ...row })));
  }
  for (const [assembly, count] of [['Microsoft.AspNetCore.Mvc.ViewFeatures', 4],
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
    assert.equal(summary.actualCompletedProfiles, 6);
    assert.equal(summary.actualAdditionalProducerContracts, 12);
    assert.equal(summary.actualAllSuccessful, true);
    assert.equal(summary.directMockedHtmlHelperTask, false);
    const completed = matching('-completed-producer.json');
    assert.deepEqual(completed.map(row => row.label).sort(), [...profiles].sort());
    const fallback = matching('-lookup-fallback.json');
    assert.deepEqual(fallback.map(row => row.label).sort(), ['Display.FindView', 'Editor.FindView']);
    const already = matching('-already-completed-failure.json');
    assert.equal(already.length, 4);
    const pending = matching('-pending-after-release.json');
    assert.deepEqual(pending.map(row => row.label).sort(),
      ['Display', 'Editor'].flatMap(api => ['success', 'failure', 'cancellation'].map(outcome => `${api}.Pending.${outcome}`)).sort());
    [...completed, ...fallback, ...already, ...pending].forEach(verifyCapture);
    const beforeRelease = matching('-pending-before-release.json');
    assert.equal(beforeRelease.length, 6);
    for (const row of beforeRelease) {
      assert.equal(row.actualObservedPendingWait, true);
      assert.ok(row.actualCallingThreadState.includes('WaitSleepJoin'));
      assert.equal(row.actualCallingThreadId, row.actualProducerThreadId);
      assert.equal(row.actualPublicCallFinished, false);
      assert.equal(row.actualReturnedContentType, null);
      assert.equal(row.actualRootWriterText, 'before|');
      assert.equal(row.actualRootWriterDisposed, false);
      assert.equal(row.actualProducerTaskCompleted, false);
      assert.equal(row.actualRealRazorViewTaskCompleted, false);
      assert.equal(row.actualViewDisposeCalls, 0);
      assert.equal(row.actualHarnessInvocationFinished, false);
      assert.equal(row.harnessContainsTaskWait, false);
      assert.equal(row.fixedSleepUsed, false);
    }
    const outcomes = matching('-producer-outcome.json');
    assert.equal(outcomes.length, 10);
    for (const row of outcomes) {
      assert.equal(row.actualExpectedOutcomeMatched, true);
      if (row.outcome === 'failure') {
        assert.equal(row.actualExceptionReferenceMatched, true);
        assert.equal(row.actualObservedExceptionType, 'System.InvalidOperationException');
      } else if (row.outcome === 'cancellation') {
        assert.equal(row.actualCancellationTokensMatched, true);
      }
    }
    contracts.push({ label, actualCompletedProfiles: 6, actualAdditionalRealProducerContracts: 12 });
  } else {
    const reached = matching('-benchmark-reached.json');
    assert.deepEqual(reached.map(row => row.label).sort(), [...profiles].sort());
    reached.forEach(verifyCapture);
    for (const ending of ['-settings-before.json', '-settings-after.json']) {
      const rows = matching(ending);
      assert.equal(rows.length, 6);
      rows.forEach(row => assert.deepEqual(row, before.initialSettings));
      settingsCount += rows.length;
    }
    assert.equal(single('-completed.json').actualReports, 6);
    const reportFile = path.join(directory, 'results', 'AutoPerf.TemplateBenchmarks-report-full.json');
    const report = read(reportFile);
    assert.equal(report.Benchmarks.length, 6);
    const stdout = fs.readFileSync(path.join(directory, 'native.stdout'), 'utf8');
    const stdoutSamples = [...stdout.matchAll(/^WorkloadResult\s+\d+:\s+(\d+) op,\s+([\d.]+) ns,/gm)]
      .map(([, operations, nanoseconds]) => ({ operations: Number(operations), nanoseconds: Number(nanoseconds) }));
    assert.equal(stdoutSamples.length, 48);
    const elapsed = /Global total time:[^\r\n]*\(([\d.]+) sec\)/.exec(stdout);
    assert.ok(elapsed);
    totalTimedSeconds += Number(elapsed[1]);
    let stdoutIndex = 0;
    const observedProfiles = [];
    for (const row of report.Benchmarks) {
      const match = /^AutoPerf\.TemplateBenchmarks\.RenderAndConsume\(Profile: "([^"]+)"\)$/.exec(row.FullName);
      assert.ok(match, row.FullName);
      assert.ok(profiles.includes(match[1]));
      observedProfiles.push(match[1]);
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
      results.push({
        label, round: invocation.round, variant: capsule.variant, profile: match[1],
        meanNanoseconds: mean, standardDeviationNanoseconds: Math.sqrt(variance),
        coefficientOfVariationPercent: 100 * Math.sqrt(variance) / mean,
        bytesPerOperation: row.Memory.BytesAllocatedPerOperation, retainedResults: values.length,
        actualValuesNanoseconds: values, reportedConfidenceInterval: row.Statistics.ConfidenceInterval,
        reportSha256: sha(reportFile), nativeStdoutSha256: sha(path.join(directory, 'native.stdout')),
      });
    }
    assert.deepEqual(observedProfiles.sort(), [...profiles].sort());
    matchedStdoutSamples += stdoutIndex;
  }
  auditedProfiles.push({ label, actualNativeExit: 0, variant: capsule.variant,
    actualHarnessSha256: capsule.actualHarnessSha256, sourcePdbDocuments: 12 });
}
assert.equal(matchedStdoutSamples, 288);
assert.equal(results.length, 36);
assert.equal(settingsCount, 72);
const pairs = [1, 2, 3].flatMap(round => profiles.map(profile => {
  const before = results.find(row => row.round === round && row.variant === 'original' && row.profile === profile);
  const after = results.find(row => row.round === round && row.variant === 'candidate' && row.profile === profile);
  assert.ok(before && after);
  return { round, profile, unchangedControl: profile.startsWith('Display.Default'),
    originalMeanNanoseconds: before.meanNanoseconds, candidateMeanNanoseconds: after.meanNanoseconds,
    lessTimePercent: 100 * (1 - after.meanNanoseconds / before.meanNanoseconds),
    originalBytesPerOperation: before.bytesPerOperation, candidateBytesPerOperation: after.bytesPerOperation,
    fewerBytesPerOperation: before.bytesPerOperation - after.bytesPerOperation,
    originalCvPercent: before.coefficientOfVariationPercent, candidateCvPercent: after.coefficientOfVariationPercent };
}));
const targets = pairs.filter(row => !row.unchangedControl);
const controls = pairs.filter(row => row.unchangedControl);
assert.ok(targets.some(row => row.lessTimePercent < 0));
assert.ok(controls.some(row => row.lessTimePercent > 0) && controls.some(row => row.lessTimePercent < 0));
assert.ok(pairs.filter(row => row.profile === 'Display.Completed4096').every(row => row.lessTimePercent > 0));
const maximumCv = Math.max(...results.map(row => row.coefficientOfVariationPercent));
const limitations = [
  'No-gain means no convincing overall compatible benefit from this one success guard, not zero original cost or proof that all future optimizations are impossible.',
  'Long Display custom-template means improve in all3pairs, but only2.93% in one pair; other targets reverse/regress, controls also move and within-profile CV reaches the reported maximum. Retain the favorable and adverse outcomes without interpreting small differences as reliable framework gains.',
  'Managed allocation observations are not all identical:128B first-case drift,55B long-Display reversals and1-2B residuals remain. No structural allocation reduction or resource gain is claimed.',
  'Whole prepared helper/template/request-scope/output wrapper, not isolated GetResult cost. Root service/metadata providers are prebuilt/warmed; lookup, literal CSharp activation and unused interfaces are controlled seams.',
  'Actual HtmlHelper/TemplateBuilder/TemplateRenderer, scoped MVC buffer, RazorView/page-owned pending producer and consumed IHtmlContent; not HTTP,cshtml discovery/compilation,production frequency/throughput,request-abort producer,starvation or deadlock proof.',
  'Identical measured harness DLL/PDB and consumer dependencies except actual tested ViewFeatures DLL/PDB. The separately rebuilt relocated harness may have path-dependent PE/PDB bytes; its source is byte-exact and untimed.',
  'All288 Workload.Result stdout/JSON samples retained and means,sample variance,SD,SE recomputed. Allocation and confidence-interval values are reported evidence, not independent allocation tracing,GC arithmetic or CI-distribution derivation.',
  'Portable audit rehashes copied text and receipts, not omitted native binary bytes. Selected source/PDB document associations are not complete compiler provenance or coverage.',
  'Original native owning tests pass525/525, but initial wrapper exits1 due a null ordered-dictionary Measure-Object Sum. Retain the failed wrapper and raw outputs; corrected value aggregation reverified that same native invocation without rerunning tests.',
  'BDN Parameters abbreviates Display.Completed4096. The audit uses unabridged FullName plus actual setup labels, not the truncated presentation value retained in the interim two-comparison snapshot.',
  'Three actual source comparisons are permanently closed; no tuning, fourth comparison or unfavorable-sample removal is authorized.',
];
const audit = {
  candidate: 'F031', disposition: 'no-gain', actualSourceComparisons: 3, actualStrategyVariants: 1,
  actualTimedNativeProfiles: 6, actualRetainedResultSamples: matchedStdoutSamples,
  actualNativeStdoutSamplesMatchedToJson: matchedStdoutSamples, actualReportedRows: results.length,
  actualOwningRowsPerVariant: 525, actualOwningSkippedPerVariant: 0,
  scopedCurrentDefaultFilePairs: 21, exactRawSourceSnapshots: 69,
  actualMeasuredImagesUseIdenticalHarnessDllAndPdb: true, actualConsumerDifferences: differingFiles,
  actualConsumerFilesPerImage: 294, actualCharacterizations: contracts, actualAuditedNativeProfiles: auditedProfiles,
  actualSettingsObservations: settingsCount, actualRecordedLoadedAssemblyBindings: runtimeBindings.length,
  actualSourcePdbDocumentsPerNativeProfile: 12, actualMaximumCvPercent: maximumCv,
  actualTimedGlobalSeconds: totalTimedSeconds, actualPassingStandaloneBuildWarnings: 0, actualPassingStandaloneBuildErrors: 0,
  actualFailedNativeTestRuns: 0, actualFailedTestPostprocessingWrappers: 1,
  actualFinalShippingChanges: 0, actualTimingBudgetPermanentlyClosed: true, pairs, results, limitations,
};
const decision = {
  candidate: 'F031', disposition: 'no-gain',
  qualification: 'Compatible successful-task guard measured in3pairs; no convincing overall benefit established. Nonblocking replacement remains contract-blocked.',
  actualSourceComparisons: 3, actualStrategyVariants: 1, actualTimedNativeProfiles: 6,
  actualSourceComparisonBudgetPermanentlyClosed: true, actualFinalShippingChanges: 0,
  actualPerformancePrCreated: false, actualOptimizationCommitCreated: false,
  actualOwningRowsPerVariant: 525, actualCompletedProfilesPerImage: 6, actualAdditionalProducerContractsPerImage: 12,
  actualCharacterizedImageVariants: 3, actualRawResultSamples: matchedStdoutSamples,
  actualIdenticalMeasuredHarnessDllAndPdb: true, actualOnlyChangedMeasuredConsumerFiles: differingFiles.map(row => row.path),
  actualMaximumCvPercent: maximumCv, actualSettingsObservations: settingsCount,
  actualTimedGlobalSeconds: totalTimedSeconds, actualPublicApiAndBaselineChanges: 0,
  actualPassingStandaloneBuildWarnings: 0, actualPassingStandaloneBuildErrors: 0,
  actualFailedTestPostprocessingWrappersRetained: 1, actualTestRerunForOriginalPostprocessing: false,
  actualRestoredProductMatchesOriginallyTestedOwner: true,
  actualFavorableLongDisplayPairs: pairs.filter(row => row.profile === 'Display.Completed4096'),
  actualAdverseTargetPairs: targets.filter(row => row.lessTimePercent < 0),
  actualUnchangedControlPairs: controls, actualAllMeasuredSourcesAndImagesRetained: true,
  noClaims: limitations,
};
const table = [
  '| Profile | Round | Original us/op | Guard us/op | Less time % | Original B/op | Guard B/op | Original CV% | Guard CV% |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
  ...pairs.map(row => `| ${row.profile} | ${row.round} | ${(row.originalMeanNanoseconds / 1000).toFixed(3)} | ${(row.candidateMeanNanoseconds / 1000).toFixed(3)} | ${row.lessTimePercent.toFixed(2)} | ${row.originalBytesPerOperation} | ${row.candidateBytesPerOperation} | ${row.originalCvPercent.toFixed(2)} | ${row.candidateCvPercent.toFixed(2)} |`),
].join('\n');
const markdown = [
  '# F031 completed-success template guard comparisons', '',
  '**No-gain: original source restored; no optimization commit or performance PR.**',
  'One compatible guard,3closed source comparisons,6timed native profiles,36reported rows,all288result samples retained.',
  'Positive less-time values favor the guard; negative values are regressions. Built-in Display.Default rows are unchanged controls.', '',
  table, '',
  `Maximum within-profile CV: ${maximumCv.toFixed(2)}%. Actual cumulative reported global timing: ${totalTimedSeconds.toFixed(2)}seconds.`,
  'Long Display is favorable in all3pairs; do not omit it. Its smallest mean change is2.93%, while target reversals,control movement and large within-profile variability prevent a convincing overall win. Allocations are not uniformly identical and no structural reduction is claimed.', '',
  ...limitations.map(value => `- ${value}`), '',
].join('\n');
for (const [file, value] of [['measurement-audit.json', audit], ['decision.json', decision]]) {
  if (operation === '--finalize') {
    assert.equal(fs.existsSync(at(file)), false, 'Do not overwrite a finalized audit.');
    fs.writeFileSync(at(file), JSON.stringify(value, null, 2) + '\n');
  } else {
    assert.deepEqual(read(at(file)), value);
  }
}
if (operation === '--finalize') {
  assert.equal(fs.existsSync(at('comparison-results.md')), false);
  fs.writeFileSync(at('comparison-results.md'), markdown);
} else {
  assert.equal(fs.readFileSync(at('comparison-results.md'), 'utf8'), markdown);
}
console.log(`F031: 2x525 exact owning rows,3x6/12 real-template contracts,3paired comparisons/288stdout+JSON samples,${settingsCount}settings observations; identical measured harness; no-gain.`);
