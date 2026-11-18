import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F040');
const variant = process.argv[2];
assert.ok(['original', 'candidate'].includes(variant));
const read = file => JSON.parse(fs.readFileSync(path.join(run, file), 'utf8'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(path.join(run, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const prepName = `preparation-${variant}-001`;
const nativeName = `characterize-${variant}-001`;
const prep = read(`${prepName}/preparation.json`);
const completion = read(`${nativeName}/completion.json`);
const launch = read(`${nativeName}/launch.json`);
const result = read(`${nativeName}/state/characterization.json`);
const plan = read('acceptance-plan.json');
assert.equal(completion.actualExitCode, 0);
assert.equal(completion.actualPidCapturedBeforeWait, true);
assert.equal(completion.actualProcessId, launch.actualProcessId);
assert.equal(result.actualAllPassed, true);
assert.equal(result.actualCookiePersistenceClaimedByThisMemoryResponseHarness, false);
assert.equal(result.records.length, 17);
assert.equal(result.profiles.length, 40);
const events = fs.readFileSync(path.join(run, nativeName, 'state', 'events.jsonl'), 'utf8')
  .trim().split(/\r?\n/).map(line => JSON.parse(line));
events.forEach((event, index) => assert.equal(event.sequence, index + 1));
const named = name => events.filter(event => event.name === name).map(event => event.value);
const discovery = named('benchmarkdotnet-discovery-preflight');
assert.equal(discovery.length, 1);
assert.equal(discovery[0].actualEligiblePublicNonSealedType, true);
assert.equal(discovery[0].actualDiscoveredCases, 40);
assert.equal(discovery[0].actualTimingRunByThisPreflight, false);
const witness = named('source-pdb');
assert.equal(witness.length, 1);
assert.equal(witness[0].actualPePdbBindingMatched, true);
assert.equal(witness[0].actualAssemblySha256, prep.actualOwnerSha256);
assert.equal(witness[0].actualPdbSha256, prep.actualOwnerPdbSha256);
assert.equal(witness[0].documents.length, 12);
const sources = read(`${prepName}/source-manifest.json`).documents;
for (const source of sources) {
  assert.equal(hash(path.join(run, prepName, 'sources', source.file)), source.sha256);
  assert.equal(witness[0].documents.find(document => document.source === source.file)?.sha256, source.sha256);
}
assert.equal(named('runtime-characterize-before').length, 1);
assert.equal(named('runtime-characterize-after').length, 1);
for (const runtime of [...named('runtime-characterize-before'), ...named('runtime-characterize-after')]) {
  assert.equal(runtime.actualProcessId, launch.actualProcessId);
  assert.equal(runtime.serverGc, true);
  assert.equal(runtime.runtime, '12.0.0');
  assert.equal(runtime.sharedMachineNotIsolated, true);
  assert.ok(runtime.assemblies.find(assembly => assembly.name === 'System.Private.CoreLib')
    .informationalVersion.startsWith(plan.benchmarkDesign.runtime));
  assert.equal(runtime.assemblies.find(assembly => assembly.name === 'Microsoft.AspNetCore.Components.Endpoints')
    .sha256, prep.actualOwnerSha256);
  assert.equal(runtime.assemblies.find(assembly => assembly.name === 'AutoPerf.Benchmarks')
    .sha256, prep.actualMeasuredHarnessSha256);
}
const captures = named('public-owner-capture');
assert.equal(captures.length, 43);
for (const capture of captures) {
  assert.equal(capture.actualOwnerAssemblySha256, prep.actualOwnerSha256);
  assert.equal(capture.actualCaptures, 1);
  assert.equal(capture.actualProviderLoadEventsBeforeAccess, 0);
  assert.equal(capture.actualResponseStatus, 200);
}
assert.equal(named('benchmark-setup').length, 40);
assert.equal(named('benchmark-cleanup').length, 40);
const expectedProfiles = plan.benchmarkDesign.counts.flatMap(count => plan.benchmarkDesign.keyLengths.flatMap(length =>
  plan.benchmarkDesign.workloads.map(workload => ({ profile: `${workload}:${length}:${count}`,
    expected: count > 0 && ['Match', 'Null', 'ControlRemoveKey'].includes(workload) }))));
assert.deepEqual(result.profiles.map(profile => profile.profile), expectedProfiles.map(profile => profile.profile));
for (const [index, profile] of result.profiles.entries()) {
  assert.equal(profile.actualExpected, expectedProfiles[index].expected);
  assert.equal(profile.actualCalls, 16);
  assert.equal(profile.actualAdditionalSetupAndCleanupValidationCalls, 2);
  assert.equal(profile.actualResults.length, 16);
  assert.ok(profile.actualResults.every(value => value === expectedProfiles[index].expected));
  assert.equal(profile.actualRestoredCardinalityCheckedAfterEveryRepeatedCall, true);
  assert.equal(profile.actualNonemptyRestorationIncludedInTiming, true);
  for (const phase of ['benchmark-setup', 'benchmark-cleanup']) {
    const state = named(phase).filter(event => event.profile === profile.profile);
    assert.equal(state.length, 1);
    assert.equal(state[0].actualExpected, profile.actualExpected);
    assert.equal(state[0].actualProviderLoads, 1);
    assert.equal(state[0].actualCount, Number(profile.profile.split(':')[2]));
    assert.equal(state[0].actualNonemptyRestorationInsideTiming, true);
  }
}
const cold = result.records.find(record => record.name === 'cold-real-provider');
assert.deepEqual(cold.actualProviderEvents.map(event => [event.EventId, event.EventName]), [[1, 'TempDataCookieNotFound']]);
assert.equal(cold.first, false);
assert.equal(cold.second, false);
const reentrant = result.records.find(record => record.name === 'in-memory-only-reentrant-removal');
assert.equal(reentrant.actualResult, false);
assert.equal(reentrant.actualKeyRemains, false);
assert.equal(reentrant.actualEqualityCalls, 1);
let equalSemantics = null, equalLifecycles = null;
if (variant === 'candidate') {
  const original = read('characterize-original-001/state/characterization.json');
  assert.deepEqual(result.records, original.records);
  assert.deepEqual(result.profiles, original.profiles);
  equalSemantics = true;
  equalLifecycles = true;
  const before = read('validation/Tests-original-3/all-trx-rows.json');
  const after = read('validation/Tests-candidate-1/all-trx-rows.json');
  assert.equal(before.length, 73);
  assert.equal(after.length, 73);
  assert.deepEqual(after.map(row => row.testName).sort(), before.map(row => row.testName).sort());
  assert.ok(after.every(row => row.outcome === 'Passed'));
}
const verified = {
  candidate: 'F040', variant, actualVerifiedUtc: new Date().toISOString(),
  actualExitCode: completion.actualExitCode, actualNativeProcessId: launch.actualProcessId,
  actualAllEventSequencesChecked: events.length, actualPublicOwnerCaptures: captures.length,
  actualPublicBdnEligibleFixtureAndFortyCaseDiscoveryPassed: true,
  actualPdbBoundSourceDocuments: sources.length, actualSemanticRecords: result.records.length,
  actualBenchmarkLifecycleProfiles: result.profiles.length, actualRepeatedBenchmarkCalls: result.profiles.length * 16,
  actualAdditionalSetupAndCleanupValidationCalls: result.profiles.length * 2,
  actualRestoredCardinalityVerifiedAfterEveryRepeatedCall: true,
  actualNonemptyRestorationInsideTimedOperation: true,
  actualSourceOwnerSha256: prep.actualOwnerSha256, actualPinnedServerGcRuntimeChecked: true,
  actualExactSemanticCollectionEqual: equalSemantics, actualExactBenchmarkLifecyclesEqual: equalLifecycles,
  actualNoCookiePersistenceClaimFromDirectResult: true,
};
write(`${nativeName}/verified-characterization.json`, verified);
if (variant === 'original') {
  assert.equal(read('sample-original/browser-result.json').actualPassed, true);
  assert.equal(read('sample-original/browser-result.json').actualStepCount, 8);
  assert.equal(read('sample-original/stop-verification.json').actualOwnedProcessesStopped, true);
  const oldRows = read('validation/Tests-original-1/all-trx-rows.json');
  assert.equal(oldRows.length, 65);
  const tests = read('validation/Tests-original-3/all-trx-rows.json');
  assert.equal(tests.length, 73);
  assert.ok(tests.every(row => row.outcome === 'Passed'));
  const newRows = tests.filter(row => row.methodName.startsWith('CollectionRemove_'));
  assert.equal(newRows.length, 8);
  assert.equal(newRows.filter(row => row.methodName === 'CollectionRemove_UpdatesRetainedValues_WhenFirstAccessTriggersLazyLoad').length, 8);
  assert.deepEqual(tests.filter(row => !newRows.includes(row)).map(row => row.testName).sort(),
    oldRows.map(row => row.testName).sort());
  assert.equal(hash(String.raw`C:\src\aspnetcore\src\Components\Endpoints\src\TempData\TempData.cs`), plan.actualOriginalOwnerSha256);
  assert.equal(fs.readdirSync(run).some(name => /^measure-/.test(name)), false);
  write('baseline-validation.json', { ...verified,
    actualBaselineValidationPassed: true, actualOriginalOwningRows: tests.length,
    actualOriginalPreservationRows: newRows, actualNewRowsPreserveExistingBehaviorNotSemanticBugRedGreen: true,
    actualCanonicalCookieBrowserSteps: 8, actualOriginalOwnerUnmodified: true,
    actualBeforeOwnerEditsAndSourceComparisons: true, actualSourceComparisons: 0 });
}
console.log(JSON.stringify(verified, null, 2));
