import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const directory = path.resolve(process.argv[2] ?? path.dirname(fileURLToPath(import.meta.url)));
const located = file => path.join(directory, ...file.split(/[\\/]/));
const read = file => JSON.parse(fs.readFileSync(located(file), 'utf8'));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const raw = file => read(path.join('raw', file));
const events = folder => fs.readFileSync(located(path.join('raw', folder, 'state', 'events.jsonl')), 'utf8')
  .trim().split(/\r?\n/).map(line => JSON.parse(line));
const only = (records, name) => {
  const found = records.filter(record => record.name === name);
  assert.equal(found.length, 1, name);
  return found[0].value;
};
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const close = (actual, expected, tolerance = 1e-5) =>
  assert.ok(Math.abs(actual - expected) <= Math.max(tolerance, Math.abs(expected) * 1e-11), `${actual} != ${expected}`);
const hashes = read('capsule-file-hashes.json');
for (const entry of hashes.files) assert.equal(sha(located(entry.path)), entry.sha256, entry.path);
const copies = read('authoritative-copy-manifest.json');
for (const entry of copies.files) assert.equal(sha(located(entry.destination)), entry.sha256, entry.destination);
const budget = raw('source-comparison-budget.json');
assert.equal(budget.closed, true);
assert.equal(budget.maximumPairs, 3);
assert.deepEqual(budget.attempts.map(attempt => attempt.status), ['failed', 'completed', 'completed']);
assert.equal(sha(located('raw/measurement-seal-v2.json')), budget.measurementSealSha256);
assert.equal(sha(located('raw/measurement-seal.json')), budget.actualInputSealHistory[0].sha256);
assert.equal(sha(located('raw/correction-v2/budget-before-correction.json')), raw('measurement-seal-v2.json').actualPriorBudgetSnapshotSha256);
assert.equal(raw('correction-v2/budget-before-correction.json').attempts.length, 1);
const failure = fs.readFileSync(located('raw/measure-original-001/stdout.log'), 'utf8') +
  fs.readFileSync(located('raw/measure-original-001/stderr.log'), 'utf8');
assert.match(failure, /non-sealed/);
assert.equal([...failure.matchAll(/^WorkloadResult\s+\d+:/gm)].length, 0);
assert.equal(raw('measure-original-001/completion.json').actualExitCode, -532462766);
assert.match(fs.readFileSync(located('raw/harness/TempDataContainsBenchmarks.cs'), 'utf8'), /public sealed class TempDataContainsBenchmarks/);
assert.match(fs.readFileSync(located('harness/TempDataContainsBenchmarks.cs'), 'utf8'), /public class TempDataContainsBenchmarks/);
const decision = raw('decision.json');
assert.equal(decision.actualAllApplicableAcceptanceChecksPassed, true);
assert.equal(decision.actualRawResultSamples, 1280);
assert.equal(decision.actualCompletedSourceComparisonPairs, 2);
assert.equal(decision.actualFailedSourceComparisonAttempts, 1);
const closures = ['original', 'candidate'].map(variant => raw(`preparation-${variant}-002/consumer-closure.json`));
assert.ok(closures.every(closure => closure.files.length === 197));
const changed = [];
for (const before of closures[0].files) {
  const after = closures[1].files.find(file => file.path === before.path);
  assert.ok(after, before.path);
  if (before.sha256 !== after.sha256) changed.push(before.path);
}
assert.deepEqual(changed.sort(), ['Microsoft.AspNetCore.Components.Endpoints.dll', 'Microsoft.AspNetCore.Components.Endpoints.pdb']);
const characterizationFolders = ['characterize-original-001', 'characterize-candidate-001',
  'characterize-original-002', 'characterize-candidate-002', 'reproduction-candidate-001'];
const baseline = raw(`${characterizationFolders[0]}/state/characterization.json`);
assert.equal(baseline.records.length, 15);
assert.equal(baseline.profiles.length, 40);
for (const folder of characterizationFolders.slice(1)) {
  const actual = raw(`${folder}/state/characterization.json`);
  assert.deepEqual(actual.records, baseline.records);
  assert.deepEqual(actual.profiles, baseline.profiles);
}
const discovery = { actualEligiblePublicNonSealedType: true, actualDiscoveredCases: 40, actualTimingRunByThisPreflight: false };
for (const folder of characterizationFolders.slice(2))
  assert.deepEqual(only(events(folder), 'benchmarkdotnet-discovery-preflight'), discovery);
const expectedSettings = only(events('characterize-original-002'), 'runtime-characterize-before').initialSettings;
const projectFiles = raw('preparation-original-002/harness-source-manifest.json').files;
assert.equal(projectFiles.length, 7);
for (const entry of projectFiles) for (const prefix of ['harness', 'raw/harness-v2', 'raw/reproduction-candidate-001/project'])
  assert.equal(sha(located(path.join(prefix, entry.file))), entry.sha256, entry.file);
const managedNames = [];
for (const [variant, folder] of [['original', 'Tests-original-2'], ['candidate', 'Tests-candidate-1']]) {
  const rows = raw(`validation/${folder}/all-trx-rows.json`);
  assert.equal(rows.length, 74);
  assert.ok(rows.every(row => row.outcome === 'Passed'));
  assert.equal(rows.filter(row => row.methodName === 'CollectionContains_PreservesValues_WhenFirstAccessTriggersLazyLoad').length, 8);
  assert.equal(rows.filter(row => row.methodName === 'CollectionContains_DoesNotRetainConsumedValue').length, 1);
  managedNames.push(rows.map(row => row.testName).sort());
  const browser = raw(`sample-${variant}/browser-result.json`);
  assert.equal(browser.actualPassed, true);
  assert.equal(browser.actualStepCount, 8);
  assert.equal(browser.pageErrors.length, 0);
  assert.equal(browser.consoleMessages.filter(message => message.type === 'error').length, 0);
  assert.equal(raw(`sample-${variant}/stop-verification.json`).actualOwnedProcessesStopped, true);
}
assert.deepEqual(managedNames[0], managedNames[1]);
const selenium = ['producer', 'remaining'].flatMap(phase => raw(`selenium-candidate-${phase}-001/all-trx-rows.json`));
assert.equal(selenium.length, 10);
assert.equal(new Set(selenium.map(row => row.methodName)).size, 10);
assert.ok(selenium.every(row => row.outcome === 'Passed' && row.methodName !== 'TempDataPersistWithoutAccessing'));
assert.equal(raw('reproduction-candidate-001/verified-reproduction.json').actualAdditionalTimingSamples, 0);
const aggregate = raw('audit-v2-through-003.json');
let samplesChecked = 0;
const primary = [];
for (const round of [2, 3]) {
  const members = {};
  for (const variant of ['original', 'candidate']) {
    const folder = `measure-${variant}-${String(round).padStart(3, '0')}`;
    const records = events(folder);
    records.forEach((record, index) => assert.equal(record.sequence, index + 1));
    const completion = raw(`${folder}/completion.json`);
    assert.equal(completion.actualExitCode, 0);
    assert.equal(completion.actualPidCapturedBeforeWait, true);
    const closure = closures[variant === 'original' ? 0 : 1];
    for (const name of ['runtime-measure-before', 'runtime-measure-after']) {
      const runtime = only(records, name);
      assert.equal(runtime.actualProcessId, completion.actualProcessId);
      assert.equal(runtime.runtime, '12.0.0');
      assert.equal(runtime.serverGc, true);
      assert.equal(runtime.sharedMachineNotIsolated, true);
      assert.deepEqual(runtime.initialSettings, expectedSettings);
      for (const name of ['AutoPerf.Benchmarks', 'Microsoft.AspNetCore.Components.Endpoints'])
        assert.equal(runtime.assemblies.find(assembly => assembly.name === name).sha256,
          closure.files.find(file => file.path === `${name}.dll`).sha256);
    }
    assert.deepEqual(only(records, 'benchmarkdotnet-discovery-preflight'), discovery);
    const pdb = only(records, 'source-pdb');
    assert.equal(pdb.actualPePdbBindingMatched, true);
    assert.equal(pdb.documents.length, 12);
    for (const phase of ['settings-before', 'settings-after']) {
      const values = records.filter(record => record.name === phase);
      assert.equal(values.length, 40);
      values.forEach(record => assert.deepEqual(record.value, expectedSettings));
    }
    for (const phase of ['benchmark-setup', 'benchmark-cleanup']) {
      const lifecycle = records.filter(record => record.name === phase).map(record => record.value);
      assert.equal(lifecycle.length, 40);
      assert.equal(new Set(lifecycle.map(value => value.profile)).size, 40);
      lifecycle.forEach(value => assert.equal(value.actualProviderLoads, 1));
    }
    assert.equal(only(records, 'completed').actualReports, 40);
    assert.equal(only(records, 'completed').actualAllSuccessful, true);
    const report = raw(`${folder}/reports/results/AutoPerf.TempDataContainsBenchmarks-report-full.json`);
    assert.equal(report.Benchmarks.length, 40);
    const stdout = fs.readFileSync(located(path.join('raw', folder, 'stdout.log')), 'utf8');
    const printed = [...stdout.matchAll(/^WorkloadResult\s+(\d+):\s+(\d+) op,\s+([\d.]+) ns,\s+([\d.]+) (ns|us|\u00b5s|\u03bcs|ms|s)\/op\s*$/gm)];
    assert.equal(printed.length, 320);
    let printedIndex = 0;
    const member = new Map();
    for (const row of report.Benchmarks) {
      assert.equal(row.Method, 'Contains');
      const parameters = new URLSearchParams(row.Parameters);
      const profile = `${parameters.get('Workload')}:${parameters.get('KeyLength')}:${parameters.get('Count')}`;
      const measurements = row.Measurements.filter(item => item.IterationMode === 'Workload' && item.IterationStage === 'Result');
      assert.equal(measurements.length, 8);
      assert.equal(row.Statistics.N, 8);
      const samples = measurements.map((measurement, index) => {
        const sample = measurement.Nanoseconds / measurement.Operations;
        const line = printed[printedIndex++];
        assert.equal(Number(line[1]), index + 1);
        assert.equal(Number(line[2]), measurement.Operations);
        close(Number(line[3]), measurement.Nanoseconds, 0.006);
        const scale = line[5] === 'ns' ? 1 : line[5] === 'ms' ? 1e6 : line[5] === 's' ? 1e9 : 1e3;
        close(Number(line[4]) * scale, sample, 0.00006 * scale);
        close(sample, row.Statistics.OriginalValues[index]);
        samplesChecked++;
        return sample;
      });
      const average = mean(samples);
      close(average, row.Statistics.Mean);
      close(Math.sqrt(samples.reduce((sum, value) => sum + (value - average) ** 2, 0) / 7), row.Statistics.StandardDeviation);
      const archived = aggregate.allRows.find(item => item.round === round && item.variant === variant && item.profile === profile);
      assert.ok(archived);
      close(average, archived.meanNs);
      assert.equal(row.Memory.BytesAllocatedPerOperation, archived.bytesPerOp);
      assert.equal(member.has(profile), false);
      member.set(profile, average);
    }
    assert.equal(member.size, 40);
    members[variant] = member;
  }
  const observed = 100 * (1 - members.candidate.get('Match:12:8') / members.original.get('Match:12:8'));
  close(observed, decision.actualPrimary.lessTimePercentByPair[round - 2]);
  primary.push(observed);
}
assert.equal(samplesChecked, 1280);
assert.ok(primary.every(value => value > 0));
close((primary[0] + primary[1]) / 2, decision.actualPrimary.medianLessTimePercent);
assert.ok(decision.actualPrimary.medianLessTimePercent >= 5);
console.log(JSON.stringify({ candidate: 'F039', actualCopiedFilesHashed: copies.files.length,
  actualImmutableFilesHashedExcludingThisHashManifest: hashes.files.length,
  actualAttemptsConsumed: 3, actualCompletedComparisons: 2, actualFailedBeforeTiming: 1,
  actualRows: 160, actualRawStdoutAndJsonSamplesRecomputed: samplesChecked,
  actualPrimaryLessTimePercent: primary, actualNativeBinaryBytesRehashed: false,
  limitation: 'Portable copied-text/statistics verification does not rehash omitted DLL/PDB/restore files or independently reproduce historical compilation/runtime execution.' }, null, 2));
