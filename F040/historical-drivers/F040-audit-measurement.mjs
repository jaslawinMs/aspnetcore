import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F040');
const through = Number(process.argv[2]);
assert.ok(Number.isInteger(through) && through >= 1 && through <= 3);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const events = directory => fs.readFileSync(path.join(directory, 'state', 'events.jsonl'), 'utf8')
  .trim().split(/\r?\n/).map(line => JSON.parse(line));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
};
const close = (actual, expected, message, absoluteTolerance = 1e-5) =>
  assert.ok(Math.abs(actual - expected) <= Math.max(absoluteTolerance, Math.abs(expected) * 1e-11),
    `${message}: ${actual} != ${expected}`);
const only = (records, name) => {
  const matches = records.filter(record => record.name === name);
  assert.equal(matches.length, 1, name);
  return matches[0].value;
};
const plan = read(path.join(run, 'acceptance-plan.json'));
const spec = plan.benchmarkDesign;
const budget = read(path.join(run, 'source-comparison-budget.json'));
const sealFile = path.join(run, 'measurement-seal.json');
const seal = read(sealFile);
assert.equal(hash(sealFile), budget.measurementSealSha256);
for (const entry of seal.sealedFiles) assert.equal(hash(entry.path), entry.sha256, entry.path);
const expected = [];
for (const count of spec.counts) for (const length of spec.keyLengths) for (const workload of spec.workloads)
  expected.push(`${workload}:${length}:${count}`);
const expectedSettings = only(events(path.join(run, 'characterize-original-001')), 'runtime-characterize-before').initialSettings;
const pairs = [], allRows = [], receipts = [];
for (let round = 1; round <= through; round++) {
  const attempt = budget.attempts.find(attempt => attempt.round === round);
  assert.ok(attempt);
  assert.equal(attempt.status, 'completed');
  assert.deepEqual(attempt.order, plan.sourceComparisons.order[round - 1]);
  assert.equal(attempt.members.length, 2);
  const members = {};
  for (const variant of ['original', 'candidate']) {
    const directory = path.join(run, `measure-${variant}-${String(round).padStart(3, '0')}`);
    const completion = read(path.join(directory, 'completion.json'));
    assert.equal(completion.actualExitCode, 0);
    assert.equal(completion.actualPidCapturedBeforeWait, true);
    const recorded = attempt.members.find(member => member.variant === variant);
    assert.equal(recorded.processId, completion.actualProcessId);
    assert.equal(recorded.status, 'completed');
    const records = events(directory);
    records.forEach((record, index) => assert.equal(record.sequence, index + 1));
    const before = only(records, 'runtime-measure-before'), after = only(records, 'runtime-measure-after');
    const closure = read(path.join(run, `preparation-${variant}-001`, 'consumer-closure.json'));
    for (const runtime of [before, after]) {
      assert.equal(runtime.actualProcessId, completion.actualProcessId);
      assert.equal(runtime.runtime, '12.0.0');
      assert.equal(runtime.serverGc, true);
      assert.equal(runtime.sharedMachineNotIsolated, true);
      assert.deepEqual(runtime.initialSettings, expectedSettings);
      for (const name of ['AutoPerf.Benchmarks', 'Microsoft.AspNetCore.Components.Endpoints']) {
        const assembly = runtime.assemblies.find(assembly => assembly.name === name);
        assert.ok(assembly);
        assert.equal(assembly.sha256, closure.files.find(file => file.path === `${name}.dll`).sha256);
      }
      for (const assembly of runtime.assemblies) if (assembly.path) assert.equal(hash(assembly.path), assembly.sha256, assembly.path);
      assert.ok(runtime.assemblies.find(assembly => assembly.name === 'System.Private.CoreLib').informationalVersion.startsWith(spec.runtime));
    }
    const source = only(records, 'source-pdb');
    assert.equal(source.actualPePdbBindingMatched, true);
    assert.equal(source.documents.length, 12);
    assert.equal(source.actualAssemblySha256, before.assemblies.find(assembly => assembly.name === 'Microsoft.AspNetCore.Components.Endpoints').sha256);
    for (const name of ['settings-before', 'settings-after', 'benchmark-setup', 'benchmark-cleanup', 'public-owner-capture'])
      assert.equal(records.filter(record => record.name === name).length, 40, name);
    for (const record of records.filter(record => record.name === 'settings-before' || record.name === 'settings-after'))
      assert.deepEqual(record.value, expectedSettings);
    for (const phase of ['benchmark-setup', 'benchmark-cleanup']) {
      const lifecycle = records.filter(record => record.name === phase).map(record => record.value);
      assert.deepEqual(lifecycle.map(record => record.profile).sort(), [...expected].sort());
      for (const state of lifecycle) {
        const [workload, length, count] = state.profile.split(':');
        assert.equal(state.actualCount, Number(count));
        assert.equal(state.actualProviderLoads, 1);
        assert.equal(state.actualExpected, Number(count) > 0 && ['Match', 'Null', 'ControlRemoveKey'].includes(workload));
        if (phase === 'benchmark-setup') assert.equal(state.actualKeyLength, Number(length));
      }
    }
    const discovery = only(records, 'benchmarkdotnet-discovery-preflight');
    assert.equal(discovery.actualEligiblePublicNonSealedType, true);
    assert.equal(discovery.actualDiscoveredCases, 40);
    assert.equal(discovery.actualTimingRunByThisPreflight, false);
    for (const phase of ['benchmark-setup', 'benchmark-cleanup'])
      for (const state of records.filter(record => record.name === phase))
        assert.equal(state.value.actualNonemptyRestorationInsideTiming, true);
    assert.equal(only(records, 'completed').actualReports, 40);
    assert.equal(only(records, 'completed').actualAllSuccessful, true);
    const reportFile = path.join(directory, 'reports', 'results', 'AutoPerf.TempDataRemoveBenchmarks-report-full.json');
    const report = read(reportFile);
    assert.equal(report.Benchmarks.length, 40);
    const stdout = fs.readFileSync(path.join(directory, 'stdout.log'), 'utf8');
    const printed = [...stdout.matchAll(/^WorkloadResult\s+(\d+):\s+(\d+) op,\s+([\d.]+) ns,\s+([\d.]+) (ns|us|\u00b5s|\u03bcs|ms|s)\/op\s*$/gm)];
    assert.equal(printed.length, 320, `${variant}/${round} actual raw stdout result samples`);
    const rowMap = new Map();
    let printedIndex = 0;
    for (const row of report.Benchmarks) {
      assert.equal(row.Method, 'RemoveAndRestore');
      const parameters = new URLSearchParams(row.Parameters);
      const profile = `${parameters.get('Workload')}:${parameters.get('KeyLength')}:${parameters.get('Count')}`;
      assert.ok(expected.includes(profile), profile);
      assert.equal(rowMap.has(profile), false);
      const measurements = row.Measurements.filter(measurement => measurement.IterationMode === 'Workload' && measurement.IterationStage === 'Result');
      assert.equal(measurements.length, 8);
      assert.equal(row.Statistics.N, 8);
      const samples = measurements.map((measurement, index) => {
        assert.equal(measurement.IterationIndex, index + 1);
        assert.ok(measurement.Operations > 0 && measurement.Nanoseconds > 0);
        const sample = measurement.Nanoseconds / measurement.Operations;
        const line = printed[printedIndex++];
        assert.equal(Number(line[1]), index + 1);
        assert.equal(Number(line[2]), measurement.Operations);
        close(Number(line[3]), measurement.Nanoseconds, 'actual raw stdout nanoseconds', 0.006);
        const unit = line[5], scale = unit === 'ns' ? 1 : unit === 'ms' ? 1e6 : unit === 's' ? 1e9 : 1e3;
        close(Number(line[4]) * scale, sample, 'actual raw stdout per-operation rounding', 0.00006 * scale);
        close(sample, row.Statistics.OriginalValues[index], 'raw JSON sample');
        return sample;
      });
      const average = mean(samples);
      const standardDeviation = Math.sqrt(samples.reduce((sum, sample) => sum + (sample - average) ** 2, 0) / 7);
      close(average, row.Statistics.Mean, 'recomputed mean');
      close(standardDeviation, row.Statistics.StandardDeviation, 'recomputed sample standard deviation');
      assert.ok(Number.isFinite(row.Memory.BytesAllocatedPerOperation) && row.Memory.BytesAllocatedPerOperation >= 0);
      const result = { round, variant, profile, meanNs: average, standardDeviationNs: standardDeviation,
        coefficientOfVariationPercent: 100 * standardDeviation / average, samplesNs: samples,
        bytesPerOp: row.Memory.BytesAllocatedPerOperation,
        actualFinalGcMeasurementOperations: row.Memory.TotalOperations, confidenceInterval: row.Statistics.ConfidenceInterval };
      rowMap.set(profile, result);
      allRows.push(result);
    }
    assert.deepEqual([...rowMap.keys()].sort(), [...expected].sort());
    members[variant] = rowMap;
    receipts.push({ round, variant, actualNativeProcessId: completion.actualProcessId, actualProfiles: 40,
      actualRawResultSamples: 320, actualAllSettingsChecksPassed: true, actualPePdbDocuments: 12,
      actualAllPreparedRemovalRestorationAndProviderLifecycleChecksPassed: true,
      actualFullJsonSha256: hash(reportFile), actualStdoutSha256: hash(path.join(directory, 'stdout.log')) });
  }
  const rows = expected.map(profile => {
    const original = members.original.get(profile), candidate = members.candidate.get(profile);
    return { profile, originalMeanNs: original.meanNs, candidateMeanNs: candidate.meanNs,
      lessTimePercent: 100 * (1 - candidate.meanNs / original.meanNs),
      originalBytesPerOp: original.bytesPerOp, candidateBytesPerOp: candidate.bytesPerOp };
  });
  pairs.push({ round, order: attempt.order, primary: rows.find(row => row.profile === spec.primary), rows });
}
const summaryByProfile = expected.map(profile => {
  const rows = pairs.map(pair => pair.rows.find(row => row.profile === profile));
  return { profile, lessTimePercentByPair: rows.map(row => row.lessTimePercent),
    medianLessTimePercent: median(rows.map(row => row.lessTimePercent)),
    originalBytesPerOpByPair: rows.map(row => row.originalBytesPerOp), candidateBytesPerOpByPair: rows.map(row => row.candidateBytesPerOp) };
});
const primary = summaryByProfile.find(row => row.profile === spec.primary);
const result = {
  candidate: 'F040', actualPairs: through, actualRows: allRows.length, actualRawResultSamples: allRows.length * 8,
  actualRawStdoutAndJsonSamplesCrossChecked: true, actualMeansAndSampleStandardDeviationsRecomputed: true,
  actualSealedFilesReverified: seal.sealedFiles.length, actualSettingsUnchanged: true,
  actualSourcePdbDocumentsPerNativeMember: 12, actualSharedVmNotIsolated: true,
  primary, actualPrimaryPositiveInEveryPair: primary.lessTimePercentByPair.every(value => value > 0),
  actualPrimaryMedianAtLeastFivePercent: primary.medianLessTimePercent >= 5,
  actualAllThreeComparisonsComplete: through === 3, actualNoFinalDispositionClaimed: true,
  summaryByProfile, pairs, receipts, allRows,
};
const output = path.join(run, `audit-through-${String(through).padStart(3, '0')}.json`);
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F040', actualPairs: through, actualRows: allRows.length,
  actualRawResultSamples: allRows.length * 8, actualRawStdoutAndJsonSamplesCrossChecked: true, primary,
  ordinaryKeys: summaryByProfile.filter(row => row.profile.endsWith(':12:8')),
  actualDispositionNotYetFinalized: true }, null, 2));
