import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const directory = path.resolve(process.argv[2] ?? path.dirname(fileURLToPath(import.meta.url)));
const located = file => path.join(directory, ...file.split(/[\\/]/));
const read = file => JSON.parse(fs.readFileSync(located(file), 'utf8').replace(/^\uFEFF/, ''));
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
for (const entry of hashes.files)
  assert.equal(sha(located(entry.path)), entry.sha256, entry.path);
const copies = read('authoritative-copy-manifest.json');
for (const entry of copies.files)
  assert.equal(sha(located(entry.destination)), entry.sha256, entry.destination);
const budget = raw('source-comparison-budget.json');
assert.equal(budget.closed, true);
assert.equal(budget.attempts.length, 3);
assert.ok(budget.attempts.every(attempt => attempt.status === 'completed'));
const decision = raw('decision.json');
assert.equal(decision.actualAllApplicableAcceptanceChecksPassed, true);
assert.equal(decision.actualRawResultSamples, 1920);
const closures = ['original', 'candidate'].map(variant => raw(`preparation-${variant}-001/consumer-closure.json`));
assert.ok(closures.every(closure => closure.files.length === 106));
const changed = [];
for (const before of closures[0].files) {
  const after = closures[1].files.find(file => file.path === before.path);
  assert.ok(after, before.path);
  if (before.sha256 !== after.sha256) changed.push(before.path);
}
assert.deepEqual(changed.sort(), ['Microsoft.AspNetCore.Components.dll', 'Microsoft.AspNetCore.Components.pdb']);
const characterizations = ['characterize-original-001', 'characterize-candidate-001', 'reproduction-candidate-001/native'];
const initial = events(characterizations[0]);
const baseline = {
  semantics: only(initial, 'semantic-records'),
  lifecycles: only(initial, 'benchmark-lifecycles'),
};
const expectedSettings = only(initial, 'runtime-characterize-before').initialSettings;
const semanticByProfile = new Map(baseline.semantics.map(record => [record.name, record]));
assert.equal(baseline.semantics.length, 44);
assert.equal(baseline.lifecycles.length, 40);
for (const folder of characterizations.slice(1)) {
  const recorded = events(folder);
  assert.deepEqual(only(recorded, 'semantic-records'), baseline.semantics);
  assert.deepEqual(only(recorded, 'benchmark-lifecycles'), baseline.lifecycles);
}
const projectFiles = raw('preparation-original-001/verified-preparation.json').actualHarnessFiles;
assert.equal(projectFiles.length, 7);
for (const entry of projectFiles) {
  for (const prefix of ['harness', 'raw/harness', 'raw/reproduction-candidate-001/project'])
    assert.equal(sha(located(path.join(prefix, entry.file))), entry.sha256, entry.file);
}
for (const variant of ['original', 'candidate']) {
  const rows = raw(`validation/${variant}-existing-1/all-trx-rows.json`);
  assert.equal(rows.length, 83);
  assert.ok(rows.every(row => row.outcome === 'Passed'));
  const browser = raw(`sample-${variant}/browser-result.json`);
  assert.equal(browser.actualPassed, true);
  assert.equal(browser.actualStepCount, 5);
  assert.equal(browser.pageErrors.length, 0);
  assert.equal(browser.consoleMessages.filter(message => message.type === 'error').length, 0);
}
const selenium = ['producer', 'remaining'].flatMap(phase => raw(`selenium-candidate-${phase}-001/all-trx-rows.json`));
assert.equal(selenium.length, 8);
assert.equal(new Set(selenium.map(row => row.methodName)).size, 8);
assert.ok(selenium.every(row => row.outcome === 'Passed'));
const aggregates = raw('audit-through-003.json');
let samplesChecked = 0;
const primary = [];
for (let round = 1; round <= 3; round++) {
  const members = {};
  for (const variant of ['original', 'candidate']) {
    const folder = `measure-${variant}-${String(round).padStart(3, '0')}`;
    const records = events(folder);
    const before = only(records, 'runtime-measure-before');
    const after = only(records, 'runtime-measure-after');
    const completion = raw(`${folder}/completion.json`);
    assert.equal(completion.actualExitCode, 0);
    assert.equal(completion.actualPidCapturedBeforeWait, true);
    const closure = closures[variant === 'original' ? 0 : 1];
    for (const runtime of [before, after]) {
      assert.equal(runtime.actualProcessId, completion.actualProcessId);
      assert.equal(runtime.runtime, '12.0.0');
      assert.equal(runtime.serverGc, true);
      assert.equal(runtime.sharedMachineNotIsolated, true);
      assert.deepEqual(runtime.initialSettings, expectedSettings);
      for (const name of ['AutoPerf.Benchmarks', 'Microsoft.AspNetCore.Components'])
        assert.equal(runtime.assemblies.find(assembly => assembly.name === name).sha256,
          closure.files.find(file => file.path === `${name}.dll`).sha256);
    }
    const pdb = only(records, 'source-pdb');
    assert.equal(pdb.actualPePdbBindingMatched, true);
    assert.equal(pdb.documents.length, 9);
    assert.equal(pdb.actualAssemblySha256, before.assemblies.find(assembly => assembly.name === 'Microsoft.AspNetCore.Components').sha256);
    for (const event of records.filter(event => event.name === 'settings-before' || event.name === 'settings-after'))
      assert.deepEqual(event.value, before.initialSettings);
    assert.equal(records.filter(event => event.name === 'settings-before').length, 40);
    assert.equal(records.filter(event => event.name === 'settings-after').length, 40);
    for (const phase of ['benchmark-setup', 'benchmark-cleanup']) {
      const observed = records.filter(event => event.name === phase).map(event => event.value);
      assert.equal(observed.length, 40);
      assert.equal(new Set(observed.map(item => item.profile)).size, 40);
      for (const item of observed) {
        assert.deepEqual(item.settings, expectedSettings);
        const allowed = semanticByProfile.get(item.profile);
        assert.ok(allowed);
        assert.ok([allowed.initial, allowed.first, allowed.second]
          .some(frames => JSON.stringify(frames) === JSON.stringify(item.actualFrames)));
        assert.ok(phase === 'benchmark-setup' ? item.actualBatches === 3 : item.actualBatches > 3);
      }
    }
    assert.equal(only(records, 'completed').actualReports, 40);
    assert.equal(only(records, 'completed').actualAllSuccessful, true);
    const report = raw(`${folder}/reports/results/AutoPerf.KeyedRenderBenchmarks-report-full.json`);
    assert.equal(report.Benchmarks.length, 40);
    const stdout = fs.readFileSync(located(path.join('raw', folder, 'stdout.log')), 'utf8');
    const printed = [...stdout.matchAll(/^WorkloadResult\s+(\d+):\s+(\d+) op,\s+([\d.]+) ns,\s+([\d.]+) (ns|us|\u00b5s|\u03bcs|ms|s)\/op\s*$/gm)];
    assert.equal(printed.length, 320);
    let printedIndex = 0;
    const member = new Map();
    for (const row of report.Benchmarks) {
      const parameters = new URLSearchParams(row.Parameters);
      const profile = `${parameters.get('Workload')}:${parameters.get('Keys')}:${parameters.get('Count')}`;
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
      const archived = aggregates.allRows.find(item => item.round === round && item.variant === variant && item.profile === profile);
      assert.ok(archived);
      close(average, archived.meanNs);
      assert.equal(row.Memory.BytesAllocatedPerOperation, archived.bytesPerOp);
      assert.equal(member.has(profile), false);
      member.set(profile, average);
    }
    assert.equal(member.size, 40);
    members[variant] = member;
  }
  const observed = 100 * (1 - members.candidate.get('KeyedStable:Integer:256') / members.original.get('KeyedStable:Integer:256'));
  close(observed, decision.actualPrimary.lessTimePercentByPair[round - 1]);
  primary.push(observed);
}
assert.equal(samplesChecked, 1920);
assert.ok(primary.every(value => value > 0));
console.log(JSON.stringify({ candidate: 'F038', actualCopiedFilesHashed: copies.files.length,
  actualImmutableFilesHashedExcludingThisHashManifest: hashes.files.length,
  actualRows: 240, actualRawStdoutAndJsonSamplesRecomputed: samplesChecked,
  actualPrimaryLessTimePercent: primary, actualNativeBinaryBytesRehashed: false,
  limitation: 'Portable text/statistics verification does not rehash omitted DLL/PDB/restore files or independently reproduce their historical compilation/runtime execution.' }, null, 2));
