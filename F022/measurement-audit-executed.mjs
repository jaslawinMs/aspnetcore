import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F022');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const names = [
  'Name.List.Constant', 'Name.List.Captured', 'Name.Dictionary.Captured', 'Name.Nested.TwoIndexers',
  'Name.List.NewExpression', 'Name.Member.Control', 'Name.Array.Control', 'Name.Method.Control',
  'Model.Indexer.RuntimeType', 'Model.Indexer.Value', 'Model.Member.Control', 'Model.Array.Control',
  'Classifier.Indexer.Helper', 'Classifier.Method.Control',
];
const primary = ['Name.List.Captured', 'Name.List.NewExpression'];
const budgetPath = path.join(run, 'measurement-budget.json');
const budget = read(budgetPath);
assert.equal(budget.maximum_actual_comparisons, 3);
assert.equal(budget.actual_comparisons_started, 3);
assert.equal(budget.actual_comparisons_completed, 3);
assert.equal(budget.actual_timing_profiles_started, 24);
assert.equal(budget.attempts.length, 3);
assert.equal(budget.comparison_budget_closed, false);
const samples = [];
const cold = [];
const profiles = [];
for (const attempt of budget.attempts) {
  assert.equal(attempt.status, 'completed');
  assert.equal(attempt.actualFailure, null);
  assert.equal(attempt.profilesStarted.length, 8);
  assert.equal(attempt.profilesCompleted.length, 8);
  assert.deepEqual(attempt.warmVariantOrder, attempt.number % 2 ? ['original', 'selected'] : ['selected', 'original']);
  const capsule = read(path.join(run, 'prepared', attempt.capsule, 'capsule.json'));
  const closures = Object.fromEntries(['original', 'selected'].map(variant =>
    [variant, read(capsule.variants[variant].closurePath)]));
  const differences = closures.original.files.filter(before =>
    closures.selected.files.find(after => after.path === before.path)?.sha256 !== before.sha256).map(file => file.path).sort();
  assert.deepEqual(differences, ['Microsoft.AspNetCore.Mvc.ViewFeatures.dll', 'Microsoft.AspNetCore.Mvc.ViewFeatures.pdb']);
  assert.equal(closures.original.files.length, 179);
  assert.equal(closures.selected.files.length, 179);
  for (const started of attempt.profilesStarted) {
    const directory = path.join(run, 'profiles', started.label);
    const invocationPath = path.join(directory, 'invocation.json');
    const invocation = read(invocationPath);
    const completed = attempt.profilesCompleted.find(value => value.label === started.label);
    assert.ok(completed);
    assert.equal(completed.actualInvocationSha256, hash(invocationPath));
    assert.equal(completed.actualNativeExitCode, 0);
    assert.equal(invocation.actualExitCode, 0);
    assert.equal(invocation.actualComparisonAttempt, attempt.number);
    assert.equal(invocation.variant, started.variant);
    assert.equal(invocation.mode, started.mode);
    assert.equal(invocation.actualHarnessSha256, capsule.actualHarnessSha256);
    assert.equal(invocation.actualClosureFileCount, 179);
    const variant = capsule.variants[started.variant];
    assert.equal(hash(variant.closurePath), variant.closureSha256);
    assert.equal(invocation.actualClosureSha256, variant.closureSha256);
    const nativeExit = read(path.join(directory, 'verified-native-exit.json'));
    assert.equal(nativeExit.actualNativeExitCode, 0);
    assert.equal(nativeExit.actualClosureBeforeAndAfterMatched, true);
    assert.equal(nativeExit.actualCommonHarnessSha256, capsule.actualHarnessSha256);
    const stateDirectory = path.join(directory, 'states');
    const states = fs.readdirSync(stateDirectory).filter(file => file.endsWith('.json')).map(file =>
      ({ file, value: read(path.join(stateDirectory, file)) }));
    const matching = suffix => states.filter(row => row.file.endsWith(suffix)).map(row => row.value);
    const single = suffix => {
      const actual = matching(suffix);
      assert.equal(actual.length, 1, `${started.label}:${suffix}`);
      return actual[0];
    };
    const runtime = single('-runtime.json');
    assert.equal(runtime.context, started.variant);
    assert.equal(runtime.mode, started.mode);
    assert.equal(runtime.actualMetadataUpdatesSupported, false);
    assert.equal(runtime.actualX64Process, true);
    assert.equal(runtime.sharedMachineNotIsolated, true);
    assert.equal(runtime.ownerSha256, invocation.actualOwnerSha256);
    assert.equal(runtime.harnessSha256, invocation.actualHarnessSha256);
    assert.equal(runtime.actualClosureSha256, invocation.actualClosureSha256);
    assert.deepEqual(runtime.initialSettings, { processPriority: 'Normal', threadPriority: 'Normal', affinity: 65535 });
    for (const [assembly, expectedDocuments] of [
      ['Microsoft.AspNetCore.Mvc.ViewFeatures', attempt.number === 1 ? 5 : 6], ['AutoPerf.Benchmarks', 5],
    ]) {
      const witness = single(`-source-pdb-${assembly}.json`);
      assert.equal(witness.actualPePdbBindingMatched, true);
      assert.equal(witness.codeViewGuid, witness.pdbGuid);
      assert.equal(witness.assemblySha256, assembly === 'AutoPerf.Benchmarks' ? runtime.harnessSha256 : runtime.ownerSha256);
      assert.equal(witness.documents.length, expectedDocuments);
      for (const document of witness.documents) {
        assert.equal(hash(document.source), document.sha256);
      }
    }
    if (started.mode === 'measure') {
      assert.equal(single('-completed.json').actualReports, 14);
      assert.equal(single('-completed.json').allSuccessful, true);
      for (const suffix of ['-settings-before.json', '-settings-setup.json', '-settings-after.json']) {
        const settings = matching(suffix);
        assert.equal(settings.length, 14);
        settings.forEach(setting => assert.deepEqual(setting, runtime.initialSettings));
      }
      const owners = matching('-executing-owner.json');
      assert.equal(owners.length, 14);
      owners.forEach(owner => assert.equal(owner.ownerSha256, runtime.ownerSha256));
      const contracts = matching('-profile-contract.json');
      assert.equal(contracts.length, 28);
      contracts.forEach(contract => assert.equal(contract.observedChecksum, contract.expectedChecksum));
      if (attempt.number > 1) {
        const runtimeTypeContracts = contracts.filter(contract => contract.shape === 'Model.Indexer.RuntimeType');
        assert.equal(runtimeTypeContracts.length, 2);
        runtimeTypeContracts.forEach(contract => {
          assert.equal(contract.modelConsumedInTimedWrapper, true);
          assert.equal(contract.modelNameConsumedInTimedWrapper, false);
          assert.equal(contract.runtimeModelTypeResolvedInTimedWrapper, true);
        });
      }
      const report = read(path.join(directory, 'results', 'AutoPerf.ExpressionBenchmarks-report-full.json'));
      assert.equal(report.Benchmarks.length, 14);
      const observedNames = [];
      for (const row of report.Benchmarks) {
        const match = /^AutoPerf\.ExpressionBenchmarks\.Exercise\(Case: "([^"]+)"\)$/.exec(row.FullName);
        assert.ok(match, row.FullName);
        const rawName = match[1];
        const name = attempt.number === 1 && rawName === 'Model.Indexer.Metadata' ? 'Model.Indexer.RuntimeType' : rawName;
        observedNames.push(name);
        assert.ok(Number.isFinite(row.Statistics.Mean) && row.Statistics.Mean > 0);
        assert.ok(row.Statistics.N > 0);
        assert.equal(row.Statistics.OriginalValues.length, row.Statistics.N);
        const measured = row.Measurements.filter(value => value.IterationMode === 'Workload' && value.IterationStage === 'Result');
        assert.equal(measured.length, row.Statistics.N);
        assert.ok(measured.every(value => value.Operations > 0 && value.Nanoseconds > 0));
        assert.ok(Number.isFinite(row.Memory.BytesAllocatedPerOperation) && row.Memory.BytesAllocatedPerOperation >= 0);
        samples.push({
          comparison: attempt.number, variant: started.variant, name, actualRawName: rawName,
          actualMeanNs: row.Statistics.Mean, actualBytesPerOperation: row.Memory.BytesAllocatedPerOperation,
          actualRetainedMeasurementCount: row.Statistics.N, actualConfidenceInterval: row.Statistics.ConfidenceInterval,
          report: path.relative(run, path.join(directory, 'results', 'AutoPerf.ExpressionBenchmarks-report-full.json')),
          actualHarnessSha256: invocation.actualHarnessSha256,
        });
      }
      assert.deepEqual(observedNames.sort(), [...names].sort());
    } else {
      assert.equal(started.mode, 'first-use');
      const record = single('-first-observed-public-call.json');
      assert.equal(record.context, started.variant);
      assert.equal(record.observed.Shape, started.firstCase);
      assert.ok(record.actualElapsedTicks > 0 && record.stopwatchFrequency > 0 && record.actualAllocatedBytes > 0);
      cold.push({
        comparison: attempt.number, variant: started.variant, name: record.observed.Shape,
        actualMilliseconds: record.actualElapsedTicks * 1000 / record.stopwatchFrequency,
        actualAllocatedBytes: record.actualAllocatedBytes, actualObservedResult: record.observed,
        boundary: record.boundary, stateDirectory: path.relative(run, stateDirectory),
      });
    }
    profiles.push({ label: started.label, actualInvocationSha256: hash(invocationPath), actualNativeExitCode: 0 });
  }
}
assert.equal(samples.length, 84);
assert.equal(cold.length, 18);
assert.equal(profiles.length, 24);
const pairs = (rows, metric) => [1, 2, 3].map(comparison => {
  const original = rows.find(row => row.comparison === comparison && row.variant === 'original');
  const selected = rows.find(row => row.comparison === comparison && row.variant === 'selected');
  assert.ok(original && selected);
  return { comparison, original: original[metric], selected: selected[metric],
    improvementPercent: 100 * (1 - selected[metric] / original[metric]) };
});
const summaries = names.map(name => {
  const rows = samples.filter(row => row.name === name);
  const timing = pairs(rows, 'actualMeanNs');
  const allocation = pairs(rows, 'actualBytesPerOperation');
  return {
    name, primary: primary.includes(name), timing, allocation,
    medianPairedTimeImprovementPercent: median(timing.map(pair => pair.improvementPercent)),
    minimumPairedTimeImprovementPercent: Math.min(...timing.map(pair => pair.improvementPercent)),
    maximumPairedTimeImprovementPercent: Math.max(...timing.map(pair => pair.improvementPercent)),
    medianOriginalBytes: median(allocation.map(pair => pair.original)),
    medianSelectedBytes: median(allocation.map(pair => pair.selected)),
    minimumRetainedMeasurementCount: Math.min(...rows.map(row => row.actualRetainedMeasurementCount)),
    comparison1RawSecondaryLabelCorrection: name === 'Model.Indexer.RuntimeType'
      ? 'Raw Model.Indexer.Metadata is retained;the operation resolves runtime ModelType and materializes the lazy model in all three comparisons. Not metadata-only.'
      : null,
  };
});
const coldSummaries = ['Name.List.Constant', 'Name.Member.Control', 'Model.Indexer.Value'].map(name => {
  const rows = cold.filter(row => row.name === name);
  return { name, timing: pairs(rows, 'actualMilliseconds'), allocation: pairs(rows, 'actualAllocatedBytes'),
    interpretation: 'Three single observations per variant,including fixture,JIT and metadata. No cold-start speedup or isolated cache-entry conclusion.' };
});
const output = {
  candidate: 'F022', actualComparedProductImplementations: 1, actualCompletedComparisons: 3,
  actualTimingProfiles: 24, actualNativeWarmRows: 84, actualFirstObservedRows: 18, profiles,
  actualWarmSamples: samples, warmSummaries: summaries, firstObservedSamples: cold, firstObservedSummaries: coldSummaries,
  limits: [
    'Shared Windows VM;normal priority,thread priority and affinity remained unchanged;no power policy changes.',
    'Public microbenchmark timing is not request latency,rendering throughput or production-frequency evidence.',
    'No pooling of samples or independent-process confidence claim across the two explicitly witnessed harness labels.',
    'Comparison1 secondary metadata label/consumption flag was wrong;raw artifacts remain unchanged and later evidence corrects the interpretation.',
    'Configured eight actual iterations;report the native retained N after BenchmarkDotNet outlier treatment instead of inventing missing measurements.',
    'Allocation savings and helper timings do not establish end-to-end application gains.',
  ],
};
write(path.join(run, 'measurement-audit.json'), output);
const n = value => value.toFixed(2);
const markdown = [
  '# F022 measured comparison',
  '',
  'Three actual comparisons;84 native warm rows and18 first-observed observations. Positive percentage means less time.',
  'The two primary indexed-name profiles are unchanged. Shared VM noise and controls limit timing attribution;allocation savings are the stronger result.',
  '',
  '| Actual public/helper profile | Before ns/op, comparisons1/2/3 | After ns/op, comparisons1/2/3 | Paired improvement %,1/2/3 | Median before/after B/op |',
  '|---|---:|---:|---:|---:|',
  ...summaries.map(row => `| ${row.name}${row.primary ? ' (primary)' : ''} | ${row.timing.map(pair => n(pair.original)).join(' / ')} | ${row.timing.map(pair => n(pair.selected)).join(' / ')} | ${row.timing.map(pair => n(pair.improvementPercent)).join(' / ')} | ${row.medianOriginalBytes} / ${row.medianSelectedBytes} |`),
  '',
  'The original raw `Model.Indexer.Metadata` row is the runtime-type operation,not metadata-only. Reading `ModelExplorer.ModelType` evaluates its lazy model accessor for this reference model. Comparisons2/3 correct the label/flags without changing the timed operations.',
  '',
  '## First observed calls:fixture,JIT and metadata included',
  '',
  '| Public profile | Original ms,1/2/3 | Selected ms,1/2/3 | Original bytes,1/2/3 | Selected bytes,1/2/3 |',
  '|---|---:|---:|---:|---:|',
  ...coldSummaries.map(row => `| ${row.name} | ${row.timing.map(pair => n(pair.original)).join(' / ')} | ${row.timing.map(pair => n(pair.selected)).join(' / ')} | ${row.allocation.map(pair => pair.original).join(' / ')} | ${row.allocation.map(pair => pair.selected).join(' / ')} |`),
  '',
  'These are single observations,not a cold-start performance conclusion. Keep unfavorable/control observations.',
  '',
];
fs.writeFileSync(path.join(run, 'comparison.md'), markdown.join('\n'), { flag: 'wx' });
budget.comparison_budget_closed = true;
budget.closed_reason = 'All three authorized comparisons consumed and completed;no further comparative timing authorized for F022.';
budget.final_measurement_audit_sha256 = hash(path.join(run, 'measurement-audit.json'));
fs.writeFileSync(budgetPath, JSON.stringify(budget, null, 2) + '\n');
console.log(JSON.stringify({
  actualWarmRows: samples.length, actualFirstObservedRows: cold.length, actualNativeTimingProfiles: profiles.length,
  primaryResults: summaries.filter(row => row.primary), firstObserved: coldSummaries,
  comparisonBudgetClosed: budget.comparison_budget_closed,
}, null, 2));
