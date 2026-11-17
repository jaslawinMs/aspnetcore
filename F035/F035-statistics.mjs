import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const same = (left, right) => assert.ok(Number.isFinite(left) && Number.isFinite(right) &&
  Math.abs(left - right) <= Math.max(1e-9, Math.abs(right) * 1e-9), `${left} != ${right}`);
const methods = ['PreparedConcrete', 'PreparedPreboxedGeneric', 'UnchangedValuesControl', 'QueryProducer', 'CollectionBinding'];
const counts = [0, 1, 8, 64];
const expected = methods.flatMap(method => counts.map(count => `${method}:${count}`)).sort();

export function auditStatistics(run) {
  const budget = read(path.join(run, 'measurement-budget.json'));
  assert.equal(budget.maximumActualSourceComparisons, 3);
  assert.ok(budget.actualSourceComparisonsStarted >= 1 && budget.actualSourceComparisonsStarted <= 3);
  assert.deepEqual(budget.pairedOrder, [['original', 'candidate'], ['candidate', 'original'], ['original', 'candidate']]);
  const rows = [];
  let seconds = 0;
  for (const completed of budget.nativeProfilesCompleted) {
    const directory = path.join(run, 'profiles', completed.label);
    const invocation = read(path.join(directory, 'invocation.json'));
    const verified = read(path.join(directory, 'verified-native-exit.json'));
    const capsule = read(path.join(run, invocation.preparation, 'prepared', 'capsule.json'));
    assert.equal(invocation.actualExitCode, 0);
    assert.equal(invocation.mode, 'measure');
    assert.equal(invocation.actualTimingProfile, true);
    assert.equal(verified.actualNativeExitCode, 0);
    assert.equal(verified.actualClosureBeforeAndAfterMatched, true);
    assert.equal(invocation.variant, completed.variant);
    assert.equal(invocation.round, completed.round);
    assert.equal(invocation.preparation, budget.authoritativePreparations[completed.variant]);
    assert.equal(invocation.actualHarnessSha256, capsule.actualHarnessSha256);
    assert.equal(invocation.actualHarnessPdbSha256, capsule.actualHarnessPdbSha256);
    const reportFile = path.join(directory, 'results', 'AutoPerf.EnumerationBenchmarks-report-full.json');
    const report = read(reportFile);
    assert.equal(report.Benchmarks.length, 20);
    const stdoutFile = path.join(directory, 'native.stdout');
    const stdout = fs.readFileSync(stdoutFile, 'utf8');
    const printed = [...stdout.matchAll(/^WorkloadResult\s+\d+:\s+(\d+) op,\s+([\d.]+) ns,/gm)]
      .map(([, operations, nanoseconds]) => ({ operations: Number(operations), nanoseconds: Number(nanoseconds) }));
    assert.equal(printed.length, 160);
    const elapsed = /Global total time:[^\r\n]*\(([\d.]+) sec\)/.exec(stdout);
    assert.ok(elapsed);
    seconds += Number(elapsed[1]);
    const observed = [];
    let index = 0;
    for (const row of report.Benchmarks) {
      assert.ok(methods.includes(row.Method));
      const count = /^Count=(\d+)$/.exec(row.Parameters);
      assert.ok(count && counts.includes(Number(count[1])));
      const key = `${row.Method}:${count[1]}`;
      assert.equal(row.FullName, `AutoPerf.EnumerationBenchmarks.${row.Method}(Count: ${count[1]})`);
      observed.push(key);
      for (const setting of ['OutlierMode=DontRemove', 'IterationCount=8', 'UnrollFactor=1', 'WarmupCount=3',
        'IterationTime=100.0000 ms', 'Toolchain=SettingsPreservingEmitToolchain',
        'PowerPlanMode=00000000-0000-0000-0000-000000000000']) {
        assert.ok(row.DisplayInfo.includes(setting));
      }
      const samples = row.Measurements.filter(sample => sample.IterationMode === 'Workload' && sample.IterationStage === 'Result');
      assert.equal(samples.length, 8);
      assert.equal(row.Statistics.N, 8);
      const values = samples.map(sample => {
        assert.ok(sample.Operations > 0 && sample.Nanoseconds >= 0);
        const text = printed[index++];
        assert.equal(text.operations, sample.Operations);
        same(text.nanoseconds, sample.Nanoseconds);
        return sample.Nanoseconds / sample.Operations;
      }).sort((left, right) => left - right);
      const originalValues = [...row.Statistics.OriginalValues].sort((left, right) => left - right);
      assert.equal(originalValues.length, 8);
      originalValues.forEach((value, sample) => same(value, values[sample]));
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
      same(mean, row.Statistics.Mean);
      same(variance, row.Statistics.Variance);
      same(Math.sqrt(variance), row.Statistics.StandardDeviation);
      same(Math.sqrt(variance / values.length), row.Statistics.StandardError);
      assert.ok(Number.isFinite(row.Memory.BytesAllocatedPerOperation) && row.Memory.BytesAllocatedPerOperation >= 0);
      rows.push({
        label: completed.label, round: completed.round, variant: completed.variant, method: row.Method,
        count: Number(count[1]), key, actualSamples: values,
        actualMeanNanoseconds: mean, actualSampleVariance: variance, actualStandardDeviationNanoseconds: Math.sqrt(variance),
        actualStandardErrorNanoseconds: Math.sqrt(variance / values.length),
        actualCoefficientOfVariationPercent: mean > 0 ? 100 * Math.sqrt(variance) / mean : null,
        actualBytesPerOperation: row.Memory.BytesAllocatedPerOperation,
        actualReportedConfidenceInterval: row.Statistics.ConfidenceInterval,
        actualReportSha256: sha(reportFile), actualStdoutSha256: sha(stdoutFile),
      });
    }
    assert.equal(index, 160);
    assert.deepEqual(observed.sort(), expected);
  }
  const pairs = [];
  for (const settled of budget.comparisonsSettled.filter(slot => slot.actualCompletedPair)) {
    for (const key of expected) {
      const original = rows.filter(row => row.round === settled.round && row.variant === 'original' && row.key === key);
      const candidate = rows.filter(row => row.round === settled.round && row.variant === 'candidate' && row.key === key);
      assert.equal(original.length, 1);
      assert.equal(candidate.length, 1);
      pairs.push({
        round: settled.round, key, method: original[0].method, count: original[0].count,
        actualOriginalMeanNanoseconds: original[0].actualMeanNanoseconds,
        actualCandidateMeanNanoseconds: candidate[0].actualMeanNanoseconds,
        actualLessTimePercent: original[0].actualMeanNanoseconds > 0
          ? 100 * (1 - candidate[0].actualMeanNanoseconds / original[0].actualMeanNanoseconds) : null,
        actualNanosecondsSaved: original[0].actualMeanNanoseconds - candidate[0].actualMeanNanoseconds,
        actualOriginalBytesPerOperation: original[0].actualBytesPerOperation,
        actualCandidateBytesPerOperation: candidate[0].actualBytesPerOperation,
      });
    }
  }
  return {
    candidate: 'F035', actualTimingEvidenceAudited: true,
    actualSourceComparisonsStarted: budget.actualSourceComparisonsStarted,
    actualSourceComparisonsCompleted: budget.actualSourceComparisonsCompleted,
    actualSourceComparisonsConcluded: budget.actualSourceComparisonsConcluded,
    actualBudgetClosed: budget.sourceComparisonBudgetClosed,
    actualAllStartedNativeMembersCompleted: budget.nativeProfilesStarted.length === budget.nativeProfilesCompleted.length,
    actualNativeTimedMembersCompleted: budget.nativeProfilesCompleted.length,
    actualResultRows: rows.length, actualSamplesRecomputedAndMatchedToStdout: rows.length * 8,
    actualReportedGlobalTimedSeconds: seconds,
    actualMaximumCoefficientOfVariationPercent: Math.max(...rows.map(row => row.actualCoefficientOfVariationPercent).filter(value => value !== null)),
    actualDeclaredPrimary: 'CollectionBinding:1',
    actualDeclaredPrimaryPairs: pairs.filter(row => row.key === 'CollectionBinding:1'),
    actualControlPairs: pairs.filter(row => row.method === 'UnchangedValuesControl' || row.key === 'CollectionBinding:0'),
    actualEveryPair: pairs, actualEveryResultRow: rows,
    limitations: [
      'Shared Hyper-V VM;not dedicated or isolated;unrelated system load is not controlled.',
      'Stdout/result samples and mean,sample variance,SD,SE independently matched/recomputed. Confidence intervals and MemoryDiagnoser allocations retained as reported,not independent distribution/allocation-counter derivations.',
      'Subnanosecond prepared/control values are overhead-subtracted microbenchmarks,not request throughput. No per-method native disassembly/JIT-causation proof.',
      'Collection binding includes real binders/fresh contexts but excludes hosting/network/query parsing;Count64 is synthetic scaling,not prevalence evidence.',
    ],
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const session = path.dirname(fileURLToPath(import.meta.url));
  const run = path.resolve(process.argv[2] ?? path.join(session, 'autoperf-runs', 'F035'));
  const output = path.resolve(process.argv[3] ?? path.join(run, 'statistics-audit.json'));
  const audit = auditStatistics(run);
  fs.writeFileSync(output, JSON.stringify(audit, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({
    actualRows: audit.actualResultRows, actualSamplesMatchedAndRecomputed: audit.actualSamplesRecomputedAndMatchedToStdout,
    actualPrimary: audit.actualDeclaredPrimaryPairs, actualMaximumCvPercent: audit.actualMaximumCoefficientOfVariationPercent,
    actualBudgetClosed: audit.actualBudgetClosed,
  }, null, 2));
}
