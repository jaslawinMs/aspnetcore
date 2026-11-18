import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const same = (left, right) => assert.ok(Number.isFinite(left) && Number.isFinite(right) &&
  Math.abs(left - right) <= Math.max(1e-9, Math.abs(right) * 1e-9), `${left} != ${right}`);

export function auditStatistics(run) {
  const plan = read(path.join(run, 'measurement-plan.json'));
  const budget = read(path.join(run, 'measurement-budget.json'));
  assert.equal(budget.actualSourceComparisonsStarted, 0);
  assert.equal(budget.actualSourceComparisonsCompleted, 0);
  assert.equal(budget.actualSourceComparisonsConcluded, 0);
  assert.equal(budget.sourceComparisonBudgetClosed, true);
  assert.equal(budget.originalOnlyBudgetClosed, true);
  const successful = budget.originalOnlyProfilesConcluded.filter(row => row.actualPostExecutionVerificationPassed);
  assert.equal(successful.length, 1);
  assert.ok(budget.originalOnlyProfilesStarted.length <= 3);
  assert.equal(budget.originalOnlyProfilesStarted.length, budget.originalOnlyProfilesConcluded.length);
  const profile = path.join(run, 'profiles', successful[0].label);
  const invocation = read(path.join(profile, 'invocation.json'));
  const verified = read(path.join(profile, 'verified-native-exit.json'));
  const capsule = read(path.join(run, invocation.preparation, 'prepared', 'capsule.json'));
  assert.equal(invocation.actualExitCode, 0);
  assert.equal(invocation.mode, 'measure');
  assert.equal(invocation.variant, 'original');
  assert.equal(invocation.actualOriginalOnlyTiming, true);
  assert.equal(invocation.actualSourceComparisons, 0);
  assert.equal(verified.actualNativeExitCode, 0);
  assert.equal(verified.actualClosureBeforeAndAfterMatched, true);
  assert.equal(invocation.preparation, budget.authoritativePreparation);
  assert.equal(invocation.actualHarnessSha256, capsule.actualHarnessSha256);
  assert.equal(invocation.actualHarnessPdbSha256, capsule.actualHarnessPdbSha256);
  const reportFile = path.join(profile, 'results', 'AutoPerf.EnumerationBenchmarks-report-full.json');
  const report = read(reportFile);
  assert.equal(report.Benchmarks.length, plan.profiles);
  const stdoutFile = path.join(profile, 'native.stdout');
  const stdout = fs.readFileSync(stdoutFile, 'utf8');
  const printed = [...stdout.matchAll(/^WorkloadResult\s+\d+:\s+(\d+) op,\s+([\d.]+) ns,/gm)]
    .map(([, operations, nanoseconds]) => ({ operations: Number(operations), nanoseconds: Number(nanoseconds) }));
  assert.equal(printed.length, 256);
  const elapsed = /Global total time:[^\r\n]*\(([\d.]+) sec\)/.exec(stdout);
  assert.ok(elapsed);
  const rows = [];
  let index = 0;
  for (const row of report.Benchmarks) {
    assert.ok(plan.methods.includes(row.Method));
    const count = /^Count=(\d+)$/.exec(row.Parameters);
    assert.ok(count && plan.counts.includes(Number(count[1])));
    const key = `${row.Method}:${count[1]}`;
    assert.equal(row.FullName, `AutoPerf.EnumerationBenchmarks.${row.Method}(Count: ${count[1]})`);
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
    const original = [...row.Statistics.OriginalValues].sort((left, right) => left - right);
    assert.equal(original.length, 8);
    original.forEach((value, sample) => same(value, values[sample]));
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
    same(mean, row.Statistics.Mean);
    same(variance, row.Statistics.Variance);
    same(Math.sqrt(variance), row.Statistics.StandardDeviation);
    same(Math.sqrt(variance / values.length), row.Statistics.StandardError);
    assert.ok(Number.isFinite(row.Memory.BytesAllocatedPerOperation) && row.Memory.BytesAllocatedPerOperation >= 0);
    rows.push({
      key, method: row.Method, count: Number(count[1]), actualSamples: values,
      actualMeanNanoseconds: mean, actualSampleVariance: variance,
      actualStandardDeviationNanoseconds: Math.sqrt(variance),
      actualStandardErrorNanoseconds: Math.sqrt(variance / values.length),
      actualCoefficientOfVariationPercent: mean > 0 ? 100 * Math.sqrt(variance) / mean : null,
      actualBytesPerOperation: row.Memory.BytesAllocatedPerOperation,
      actualReportedConfidenceInterval: row.Statistics.ConfidenceInterval,
      actualReportSha256: sha(reportFile), actualStdoutSha256: sha(stdoutFile),
    });
  }
  assert.equal(index, 256);
  assert.deepEqual(rows.map(row => row.key).sort(),
    plan.methods.flatMap(method => plan.counts.map(count => `${method}:${count}`)).sort());
  return {
    candidate: 'F036', experiment: 'original-only-diagnostics', actualTimingEvidenceAudited: true,
    actualSourceComparisonsStarted: 0, actualSourceComparisonsCompleted: 0, actualSourceComparisonsConcluded: 0,
    actualOriginalOnlyAttemptsStarted: budget.originalOnlyProfilesStarted.length,
    actualOriginalOnlySuccessfulRuns: successful.length, actualAllTimingBudgetsClosed: true,
    actualResultRows: rows.length, actualSamplesRecomputedAndMatchedToStdout: index,
    actualReportedGlobalTimedSeconds: Number(elapsed[1]),
    actualMaximumCoefficientOfVariationPercent: Math.max(...rows.map(row => row.actualCoefficientOfVariationPercent).filter(value => value !== null)),
    actualDeclaredDiagnosticPrimary: plan.diagnosticPrimary,
    actualDeclaredDiagnosticPrimaryRow: rows.find(row => row.key === plan.diagnosticPrimary),
    actualEveryDiagnosticRow: rows,
    actualSourceOptimizationOrGainClaimed: false,
    limitations: [
      'No candidate,paired source comparison,gain or allocation reduction. Different receiver/control rows are not source optimizations.',
      'Independent37e809e;TemplateInfo current-default drift retained. All construction,copying,detachment,writes outside timing. Not full-current-main construction or application performance.',
      'Shared non-isolated Hyper-V VM;uncontrolled unrelated load. Empty/subnanosecond overhead-subtracted figures and CV retained without precision/throughput extrapolation.',
      'All256stdout/JSONresult samples matched;mean,sample variance,SD,SE recomputed. Confidence intervals and MemoryDiagnoser allocations retained as reported,not independent counter/distribution derivations.',
      'No hosted Razor/HTTP/browser,workload prevalence or native JIT/disassembly-causation proof.',
    ],
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const session = path.dirname(fileURLToPath(import.meta.url));
  const run = path.resolve(process.argv[2] ?? path.join(session, 'autoperf-runs', 'F036'));
  const audit = auditStatistics(run);
  fs.writeFileSync(path.join(run, 'statistics-audit.json'), JSON.stringify(audit, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ actualRows: audit.actualResultRows, actualSamplesMatchedAndRecomputed: audit.actualSamplesRecomputedAndMatchedToStdout,
    actualPrimary: audit.actualDeclaredDiagnosticPrimaryRow,
    actualMaximumCvPercent: audit.actualMaximumCoefficientOfVariationPercent,
    actualEveryRow: audit.actualEveryDiagnosticRow.map(row => ({ key: row.key,
      ns: row.actualMeanNanoseconds, bytes: row.actualBytesPerOperation })) }, null, 2));
}
