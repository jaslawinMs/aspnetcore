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
const median = values => [...values].sort((a, b) => a - b)[1];
const close = (actual, expected, tolerance = 1e-5) =>
  assert.ok(Math.abs(actual - expected) <= Math.max(tolerance, Math.abs(expected) * 1e-11), `${actual} != ${expected}`);
const hashes = read('capsule-file-hashes.json');
for (const entry of hashes.files) assert.equal(sha(located(entry.path)), entry.sha256, entry.path);
const copies = read('authoritative-copy-manifest.json');
for (const entry of copies.files) assert.equal(sha(located(entry.destination)), entry.sha256, entry.destination);
const budget = raw('source-comparison-budget.json');
assert.equal(budget.closed, true);
assert.equal(budget.maximumPairs, 3);
assert.deepEqual(budget.attempts.map(attempt => attempt.status), ['completed', 'completed', 'completed']);
assert.equal(sha(located('raw/measurement-seal.json')), budget.measurementSealSha256);
const decision = raw('decision.json');
assert.equal(decision.actualAllApplicableAcceptanceChecksPassed, true);
assert.equal(decision.actualRawResultSamples, 1920);
assert.equal(decision.actualCompletedSourceComparisonPairs, 3);
assert.equal(decision.actualFailedSourceComparisonAttempts, 0);
assert.equal(decision.actualNonemptyRestorationIncludedInTiming, true);
assert.equal(raw('validation/Tests-original-2/command.json').actualExitCode, 1);
assert.match(fs.readFileSync(located('raw/validation/Tests-original-2/stdout.log'), 'utf8') +
  fs.readFileSync(located('raw/validation/Tests-original-2/stderr.log'), 'utf8'), /CS8632/);
assert.equal(raw('validation/InitialManagedBuild-original-1/command.json').actualExitCode, 1);
const wider = raw('context/failed-initial-build-boundary.json');
assert.equal(wider.actualRepositoryWideOrPackagingBuildPassClaimed, false);
assert.equal(wider.actualGlobalInitializationSentinelCreated, false);
assert.ok(wider.actualWiderBuildErrors.some(error => error.includes('MSB4057')));
assert.ok(wider.actualWiderBuildErrors.some(error => error.includes('NETSDK1094')));
const closures = ['original', 'candidate'].map(variant => raw(`preparation-${variant}-001/consumer-closure.json`));
assert.ok(closures.every(closure => closure.files.length === 197));
assert.deepEqual(closures[0].files.map(file => file.path), closures[1].files.map(file => file.path));
const changed = closures[0].files.filter((file, index) => file.sha256 !== closures[1].files[index].sha256).map(file => file.path);
assert.deepEqual(changed.sort(), ['Microsoft.AspNetCore.Components.Endpoints.dll', 'Microsoft.AspNetCore.Components.Endpoints.pdb']);
const characterizationFolders = ['characterize-original-001', 'characterize-candidate-001', 'reproduction-candidate-001'];
const baseline = raw(`${characterizationFolders[0]}/state/characterization.json`);
assert.equal(baseline.records.length, 17);
assert.equal(baseline.profiles.length, 40);
const discovery = { actualEligiblePublicNonSealedType: true, actualDiscoveredCases: 40, actualTimingRunByThisPreflight: false };
for (const folder of characterizationFolders) {
  const actual = raw(`${folder}/state/characterization.json`);
  assert.deepEqual(actual.records, baseline.records);
  assert.deepEqual(actual.profiles, baseline.profiles);
  assert.deepEqual(only(events(folder), 'benchmarkdotnet-discovery-preflight'), discovery);
  assert.equal(events(folder).filter(event => event.name === 'public-owner-capture').length, 43);
}
const projectFiles = raw('preparation-original-001/harness-source-manifest.json').files;
assert.equal(projectFiles.length, 7);
for (const entry of projectFiles) for (const prefix of ['harness', 'raw/harness', 'raw/reproduction-candidate-001/project'])
  assert.equal(sha(located(path.join(prefix, entry.file))), entry.sha256, entry.file);
const managedNames = [], browserSteps = [];
for (const [variant, folder] of [['original', 'Tests-original-3'], ['candidate', 'Tests-candidate-1']]) {
  const rows = raw(`validation/${folder}/all-trx-rows.json`);
  assert.equal(rows.length, 73);
  assert.ok(rows.every(row => row.outcome === 'Passed'));
  assert.equal(new Set(rows.map(row => row.executionId)).size, 73);
  assert.equal(rows.filter(row => row.methodName === 'CollectionRemove_UpdatesRetainedValues_WhenFirstAccessTriggersLazyLoad').length, 8);
  managedNames.push(rows.map(row => row.testName).sort());
  const browser = raw(`sample-${variant}/browser-result.json`);
  assert.equal(browser.actualPassed, true);
  assert.equal(browser.actualStepCount, 8);
  assert.equal(browser.pageErrors.length, 0);
  assert.equal(browser.consoleMessages.filter(message => message.type === 'error').length, 0);
  assert.equal(raw(`sample-${variant}/stop-verification.json`).actualOwnedProcessesStopped, true);
  assert.equal(browser.actualOwnerSha256,
    closures[variant === 'original' ? 0 : 1].files.find(file => file.path === 'Microsoft.AspNetCore.Components.Endpoints.dll').sha256);
  browserSteps.push(browser.steps.map(step => Object.fromEntries(
    ['name', 'mode', 'message', 'removed', 'repeat', 'nullPresent', 'sibling', 'count'].map(key => [key, step[key]]))));
}
assert.deepEqual(managedNames[0], managedNames[1]);
assert.deepEqual(browserSteps[0], browserSteps[1]);
const selenium = ['producer', 'remaining'].flatMap(phase => {
  const verified = raw(`selenium-candidate-${phase}-001/verified-result.json`);
  assert.equal(verified.actualAllCapturedOwnedHelpersGone, true);
  assert.equal(verified.actualSkipped, 0);
  assert.equal(verified.actualStringKeyRemoveIsAdjacentNotDirectCollectionRemoveCoverage, true);
  return raw(`selenium-candidate-${phase}-001/all-trx-rows.json`);
});
assert.equal(selenium.length, 10);
assert.equal(new Set(selenium.map(row => row.methodName)).size, 10);
assert.ok(selenium.every(row => row.outcome === 'Passed' && row.methodName !== 'TempDataPersistWithoutAccessing'));
assert.equal(raw('reproduction-candidate-001/verified-reproduction.json').actualAdditionalTimingSamples, 0);
const expectedSettings = only(events('characterize-original-001'), 'runtime-characterize-before').initialSettings;
const aggregate = raw('audit-through-003.json');
const plan = raw('acceptance-plan.json');
const expectedProfiles = [];
for (const count of plan.benchmarkDesign.counts) for (const length of plan.benchmarkDesign.keyLengths)
  for (const workload of plan.benchmarkDesign.workloads) expectedProfiles.push(`${workload}:${length}:${count}`);
const pairedProfiles = new Map(expectedProfiles.map(profile => [profile, []]));
let samplesChecked = 0;
const primary = [];
for (const round of [1, 2, 3]) {
  const attempt = budget.attempts[round - 1];
  assert.equal(attempt.round, round);
  assert.deepEqual(attempt.order, plan.sourceComparisons.order[round - 1]);
  assert.equal(attempt.members.length, 2);
  const members = {};
  for (const variant of ['original', 'candidate']) {
    const folder = `measure-${variant}-${String(round).padStart(3, '0')}`;
    const records = events(folder);
    records.forEach((record, index) => assert.equal(record.sequence, index + 1));
    const completion = raw(`${folder}/completion.json`);
    assert.equal(completion.actualExitCode, 0);
    assert.equal(completion.actualPidCapturedBeforeWait, true);
    const memberReceipt = attempt.members.find(member => member.variant === variant);
    assert.equal(memberReceipt.processId, completion.actualProcessId);
    assert.equal(memberReceipt.status, 'completed');
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
    for (const document of pdb.documents) {
      assert.equal(document.checksum, document.sha256);
      assert.equal(sha(located(`raw/preparation-${variant}-001/sources/${document.source}`)), document.sha256);
    }
    for (const phase of ['settings-before', 'settings-after']) {
      const values = records.filter(record => record.name === phase);
      assert.equal(values.length, 40);
      values.forEach(record => assert.deepEqual(record.value, expectedSettings));
    }
    for (const phase of ['benchmark-setup', 'benchmark-cleanup']) {
      const lifecycle = records.filter(record => record.name === phase).map(record => record.value);
      assert.deepEqual(lifecycle.map(value => value.profile).sort(), [...expectedProfiles].sort());
      for (const state of lifecycle) {
        const [workload, length, count] = state.profile.split(':');
        assert.equal(state.actualProviderLoads, 1);
        assert.equal(state.actualCount, Number(count));
        assert.equal(state.actualExpected, Number(count) > 0 && ['Match', 'Null', 'ControlRemoveKey'].includes(workload));
        assert.equal(state.actualNonemptyRestorationInsideTiming, true);
        if (phase === 'benchmark-setup') assert.equal(state.actualKeyLength, Number(length));
      }
    }
    assert.equal(only(records, 'completed').actualReports, 40);
    assert.equal(only(records, 'completed').actualAllSuccessful, true);
    const report = raw(`${folder}/reports/results/AutoPerf.TempDataRemoveBenchmarks-report-full.json`);
    assert.equal(report.Benchmarks.length, 40);
    const stdout = fs.readFileSync(located(path.join('raw', folder, 'stdout.log')), 'utf8');
    const printed = [...stdout.matchAll(/^WorkloadResult\s+(\d+):\s+(\d+) op,\s+([\d.]+) ns,\s+([\d.]+) (ns|us|\u00b5s|\u03bcs|ms|s)\/op\s*$/gm)];
    assert.equal(printed.length, 320);
    let printedIndex = 0;
    const member = new Map();
    for (const row of report.Benchmarks) {
      assert.equal(row.Method, 'RemoveAndRestore');
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
      const deviation = Math.sqrt(samples.reduce((sum, value) => sum + (value - average) ** 2, 0) / 7);
      close(average, row.Statistics.Mean);
      close(deviation, row.Statistics.StandardDeviation);
      const archived = aggregate.allRows.find(item => item.round === round && item.variant === variant && item.profile === profile);
      assert.ok(archived);
      close(average, archived.meanNs);
      close(deviation, archived.standardDeviationNs);
      assert.equal(row.Memory.BytesAllocatedPerOperation, archived.bytesPerOp);
      assert.equal(member.has(profile), false);
      member.set(profile, average);
    }
    assert.deepEqual([...member.keys()].sort(), [...expectedProfiles].sort());
    members[variant] = member;
  }
  for (const profile of expectedProfiles) {
    const observed = 100 * (1 - members.candidate.get(profile) / members.original.get(profile));
    pairedProfiles.get(profile).push(observed);
    close(observed, aggregate.pairs.find(pair => pair.round === round).rows.find(row => row.profile === profile).lessTimePercent);
  }
  primary.push(pairedProfiles.get('Match:12:8').at(-1));
}
assert.equal(samplesChecked, 1920);
for (const [profile, observations] of pairedProfiles)
  close(median(observations), aggregate.summaryByProfile.find(row => row.profile === profile).medianLessTimePercent);
assert.ok(primary.every(value => value > 0));
close(median(primary), decision.actualPrimary.medianLessTimePercent);
assert.ok(decision.actualPrimary.medianLessTimePercent >= 5);
console.log(JSON.stringify({ candidate: 'F040', actualCopiedFilesHashed: copies.files.length,
  actualImmutableFilesHashedExcludingThisHashManifest: hashes.files.length,
  actualAttemptsConsumed: 3, actualCompletedComparisons: 3, actualFailedBeforeTiming: 0,
  actualRows: 240, actualRawStdoutAndJsonSamplesRecomputed: samplesChecked,
  actualPrimaryLessTimePercent: primary, actualNonemptyRestorationInsideTiming: true,
  actualNativeBinaryBytesRehashed: false,
  limitation: 'Portable copied-text/statistics verification does not rehash omitted DLL/PDB/restore files or independently reproduce historical compilation/runtime execution.' }, null, 2));
