import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const [rootArgument, operation] = process.argv.slice(2);
assert.ok(rootArgument && ['--finalize', '--verify'].includes(operation), 'Supply F029 root and --finalize or --verify.');
const root = path.resolve(rootArgument);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const at = file => path.join(root, ...file.split(/[\\/]/));
const relocate = original => {
  const marker = '/autoperf-runs/F029/';
  const normalized = original.replaceAll('\\', '/');
  const index = normalized.indexOf(marker);
  assert.ok(index >= 0, `Recorded path outside F029:${original}`);
  return at(normalized.slice(index + marker.length));
};
const same = (left, right) => assert.ok(Math.abs(left - right) <= Math.max(1e-8, Math.abs(right) * 1e-10), `${left} != ${right}`);
const profiles = ['Sync.Completed32', 'Async.Completed32', 'Sync.Completed4096', 'Async.Completed4096'];
const plan = read(at('measurement-plan.json'));
const budget = read(at('measurement-budget.json'));
assert.deepEqual(plan.profiles, profiles);
assert.equal(plan.definedBeforeAnyTiming, true);
assert.equal(budget.maximum_user_source_comparisons, 3);
assert.equal(budget.actual_source_comparisons_started, 0);
assert.equal(budget.source_comparison_budget_closed, true);
assert.equal(budget.actual_diagnostic_profiles_started, 1);
assert.equal(budget.maximum_original_diagnostic_profiles, 1);
assert.equal(budget.profilesStarted.length, 1);
assert.equal(budget.original_diagnostic_budget_closed, operation === '--verify');
assert.equal(budget.authoritative_preparation, 'preparation-005');
assert.equal(budget.authoritative_characterization, 'characterize-original-004');
const investigation = read(at('investigation.json'));
assert.equal(investigation.actualSelectedFilePairs, 16);
assert.equal(investigation.actualSelectedSourceParity, true);
assert.equal(investigation.actualRawSnapshots, 54);
assert.equal(investigation.actualSelectedInterveningHistory, '');
assert.equal(investigation.actualExactRuntimeSourceFetchExitCode, 1);
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
  const matches = xmlRows.filter(value => value.executionId === row.executionId && value.testId === row.testId &&
    value.testName === row.name && value.outcome === row.outcome);
  assert.equal(matches.length, 1);
}
const nativeLabels = fs.readdirSync(at('profiles'));
assert.deepEqual(nativeLabels.filter(label => label !== 'formatted-reproduction-characterized').sort(), [
  'characterize-original', 'characterize-original-002', 'characterize-original-003', 'characterize-original-004',
  'original-diagnostic', 'reproduction-characterized',
].sort());
const native = nativeLabels.map(label => ({ label, invocation: read(at(`profiles/${label}/invocation.json`)) }));
assert.equal(native.filter(row => row.invocation.actualTimingProfile).length, 1);
assert.deepEqual(native.filter(row => row.invocation.actualExitCode !== 0).map(row => [row.label, row.invocation.actualExitCode]).sort(),
  [['characterize-original', -532462766], ['characterize-original-003', -532462766]]);
const original = read(at('preparation-005/prepared/capsule.json'));
const fresh = read(at('reproduction-preparation/prepared/capsule.json'));
for (const capsule of [original, fresh]) {
  assert.equal(capsule.actualClosureFiles, 294);
  assert.equal(capsule.actualShippingChanges, 0);
  assert.equal(capsule.sourceComparison, false);
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
const copied = read(at('relocated-harness-copy.json'));
assert.equal(copied.length, 6);
for (const entry of copied) {
  assert.equal(sha(relocate(entry.Source)), entry.Sha256);
  assert.equal(sha(relocate(entry.Target)), entry.Sha256);
}
const contracts = [];
const auditedProfiles = [];
let settingsCount = 0;
const runtimeBindings = [];
for (const [label, capsule, characterizing] of [
  ['characterize-original-004', original, true], ['original-diagnostic', original, false],
  ['reproduction-characterized', fresh, true],
]) {
  const directory = at(`profiles/${label}`);
  const invocation = read(path.join(directory, 'invocation.json'));
  const exit = read(path.join(directory, 'verified-native-exit.json'));
  assert.equal(invocation.actualExitCode, 0);
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
    assert.deepEqual(single('-characterization-completed.json'), {
      actualCompletedWrappers: 4, actualPendingProducerContracts: 6, actualAllSuccessful: true,
      directMockedHtmlHelperTask: false, sourceComparison: false,
    });
    const completed = matching('-completed-producer.json');
    assert.deepEqual(completed.map(row => row.label).sort(), [...profiles].sort());
    const pending = [...matching('-pending-sync-after-release.json'), ...matching('-pending-async-after-release.json')];
    assert.deepEqual(pending.map(row => row.label).sort(),
      ['Sync', 'Async'].flatMap(api => ['success', 'failure', 'cancellation'].map(outcome => `${api}.Pending.${outcome}`)).sort());
    for (const row of [...completed, ...pending]) {
      assert.equal(row.actualLookupCalls, 1);
      assert.equal(row.actualViewRenderCalls, 1);
      assert.equal(row.actualViewDisposeCalls, 1);
      assert.equal(row.actualModelAndViewDataContractsMatched, true);
      assert.equal(row.actualScopeImplementation, 'Microsoft.AspNetCore.Mvc.ViewFeatures.Buffers.MemoryPoolViewBufferScope');
      assert.equal(row.actualPageCompleted, row.success);
      assert.equal(row.actualConsumed, row.expected);
    }
    for (const [api, expectedReturn] of [['sync', false], ['async', true]]) {
      const rows = matching(`-pending-${api}-before-release.json`);
      assert.deepEqual(rows.map(row => row.outcome).sort(), ['cancellation', 'failure', 'success']);
      for (const row of rows) {
        assert.equal(row.actualPublicCallReturned, expectedReturn);
        assert.equal(row.actualProducerTaskCompleted, false);
        assert.equal(row.actualRealRazorViewTaskCompleted, false);
        assert.equal(row.actualCallingThreadId, row.actualProducerThreadId);
        assert.equal(row.actualViewDisposed, 0);
        assert.equal(row.directMockedHtmlHelperTask, false);
        if (api === 'sync') {
          assert.equal(row.actualObservedPendingWait, true);
          assert.ok(row.actualCallingThreadState.includes('WaitSleepJoin'));
          assert.equal(row.fixedSleepUsed, false);
        }
      }
    }
    const outcomes = matching('-pending-outcome.json');
    assert.equal(outcomes.length, 6);
    for (const row of outcomes) {
      assert.equal(row.actualExpectedOutcomeMatched, true);
      if (row.outcome === 'failure') {
        assert.equal(row.actualObservedExceptionType, 'System.InvalidOperationException');
        assert.equal(row.actualReferenceMatched, true);
      } else if (row.outcome === 'cancellation') {
        assert.equal(row.actualCancellationTokenMatched, true);
      }
    }
    contracts.push({ label, actualCompletedWrappers: 4, actualPendingProducerContracts: 6 });
  } else {
    const setup = matching('-benchmark-setup.json');
    assert.deepEqual(setup.map(row => row.Profile).sort(), [...profiles].sort());
    for (const row of setup) {
      assert.equal(row.processId, before.processId);
      assert.equal(row.actualHarnessSha256, capsule.actualHarnessSha256);
      assert.equal(row.actualCompletedPublicWrapper, true);
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
const reportFile = at('profiles/original-diagnostic/results/AutoPerf.PartialBenchmarks-report-full.json');
const report = read(reportFile);
assert.equal(report.Benchmarks.length, 4);
const results = report.Benchmarks.map(row => {
  const match = /^AutoPerf\.PartialBenchmarks\.RenderAndConsume\(Profile: "([^"]+)"\)$/.exec(row.FullName);
  assert.ok(match, row.FullName);
  const samples = row.Measurements.filter(value => value.IterationMode === 'Workload' && value.IterationStage === 'Result');
  assert.equal(samples.length, 8);
  assert.equal(row.Statistics.N, 8);
  assert.equal(row.Statistics.OriginalValues.length, 8);
  const values = samples.map(value => {
    assert.ok(value.Operations > 0 && value.Nanoseconds > 0);
    return value.Nanoseconds / value.Operations;
  }).sort((left, right) => left - right);
  [...row.Statistics.OriginalValues].sort((left, right) => left - right).forEach((value, index) => same(value, values[index]));
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  same(mean, row.Statistics.Mean);
  same(variance, row.Statistics.Variance);
  same(Math.sqrt(variance), row.Statistics.StandardDeviation);
  same(Math.sqrt(variance / values.length), row.Statistics.StandardError);
  assert.ok(row.Memory.BytesAllocatedPerOperation >= 0 && Number.isFinite(row.Memory.BytesAllocatedPerOperation));
  return {
    profile: match[1], meanNanoseconds: mean, standardDeviationNanoseconds: Math.sqrt(variance),
    coefficientOfVariationPercent: 100 * Math.sqrt(variance) / mean,
    bytesPerOperation: row.Memory.BytesAllocatedPerOperation, retainedResults: values.length,
    confidenceInterval: row.Statistics.ConfidenceInterval, actualValuesNanoseconds: values,
  };
});
assert.deepEqual(results.map(row => row.profile).sort(), [...profiles].sort());
const audit = {
  candidate: 'F029', disposition: 'rejected', sourceComparisons: 0, originalOnlyDiagnosticProfiles: 1,
  retainedResultSamples: 32, originalOwningRows: 34, originalOwningSkips: 0,
  scopedCurrentDefaultFilePairs: 16, exactRawSourceSnapshots: 54, measuredImageFiles: 294, relocatedImageFiles: 294,
  authoritativeCharacterizations: contracts, auditedNativeProfiles: auditedProfiles,
  verifiedSettingsObservations: settingsCount, recordedLoadedAssemblyBindings: runtimeBindings.length,
  sourcePdbDocumentsPerAuditedProfile: 11, reportSha256: sha(reportFile), results,
  maximumCoefficientOfVariationPercent: Math.max(...results.map(row => row.coefficientOfVariationPercent)),
  limitations: [
    'Original current APIs only;not a before/after optimization or an isolated waiter-overhead/API-ranking experiment.',
    'Full controlled render wrapper includes per-call DI scope/helper/page/model/writer/view lookup,strict unused mocks and output consumption.',
    'Pending gates characterize reachable producer and completion/error semantics,not application frequency,HTTP,cshtml discovery/compilation,starvation or deadlock.',
    'All eight results are retained. Shared machine/high variability and all original costs are preserved.',
    'Means,sample variance,standard deviation and standard error recomputed from native result samples. Reported allocation/CI values retained,not allocation-type tracing or independent CI-distribution/GC arithmetic.',
    'Portable audit rehashes copied textual sources/receipts,not omitted DLL/PDB/native bytes. Source/PDB receipts are associations,not complete build provenance or coverage.',
    'Initial compile error/warnings,missing dependency failure,EventLog warning and later unsampled thread-state assertion failure remain. The exact failed conjunction was not captured;the mutable-state resampling flaw was removed before timing.',
    'Exact runtime TaskAwaiter source ref returned404;no new completed-task-guard or JIT mechanism claim.',
  ],
};
const lines = [
  '# F029 unchanged original Partial diagnostics', '',
  '**Rejected nonblocking replacement of a shipped synchronous contract. No source optimization or measured gain.**',
  'One original-only profile;zero source comparisons. Completed render wrappers,not pending-I/O timings or isolated awaiter costs.', '',
  '| Existing API / payload characters | Mean us/op | StdDev us | CV% | Managed B/op | Retained N |',
  '|---|---:|---:|---:|---:|---:|',
  ...results.map(row => `| ${row.profile} | ${(row.meanNanoseconds / 1000).toFixed(3)} | ${(row.standardDeviationNanoseconds / 1000).toFixed(3)} | ${row.coefficientOfVariationPercent.toFixed(2)} | ${row.bytesPerOperation} | ${row.retainedResults} |`),
  '', 'Do not interpret the existing-API row differences as a framework improvement,an async API ranking or isolated blocking overhead. All request/helper/page/DI-scope/output construction is included. High variability is retained without rerunning.',
  '', 'Two successful authoritative images each pass four completed wrappers and six real pending Razor success/failure/cancellation producer contracts. The original owner suite passes34/34,0skipped.',
  '', ...audit.limitations.map(value => `- ${value}`), '',
].join('\n');
const auditFile = at('measurement-audit.json');
const tableFile = at('original-profile.md');
if (operation === '--finalize') {
  assert.ok(!fs.existsSync(auditFile) && !fs.existsSync(tableFile), 'Do not overwrite a finalized audit.');
  fs.writeFileSync(auditFile, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(tableFile, lines);
  budget.original_diagnostic_budget_closed = true;
  budget.actual_diagnostic_profiles_completed = 1;
  budget.remaining_source_slots_permanently_unused = 3;
  budget.final_disposition = 'rejected-shipped-synchronous-completion-contract';
  fs.writeFileSync(at('measurement-budget.json'), JSON.stringify(budget, null, 2) + '\n');
} else {
  assert.deepEqual(read(auditFile), audit);
  assert.equal(fs.readFileSync(tableFile, 'utf8'), lines);
}
console.log(`F029:34exact owning rows,4means/32raw result samples with variance/SE,2x4/6real producer contracts,3native source/PDB profiles and${settingsCount}settings observations verified;0source comparisons.`);
