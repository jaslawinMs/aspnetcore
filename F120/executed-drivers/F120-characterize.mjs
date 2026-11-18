import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F120');
const [variant, label] = process.argv.slice(2);
assert.ok(['Original', 'Default', 'Candidate'].includes(variant));
assert.match(label ?? '', /^[a-z0-9-]+$/);
const auditExisting = process.argv[4] === '--audit-existing';
assert.ok(process.argv.length === 4 || (process.argv.length === 5 && auditExisting));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const budget = read(path.join(run, 'diagnostic-budget.json'));
assert.equal(budget.permanentlyClosed, false);
assert.ok(budget.authorized.every(item => ['completed', 'failed'].includes(item.state)),
  'Do not overlap untimed preparation with a running source comparison.');
const plan = read(path.join(run, 'acceptance-plan.json'));
const suffix = variant === 'Default' ? 'current-default' : variant.toLowerCase();
const directory = path.join(run, 'characterization-' + label);
const states = path.join(directory, 'states');
if (auditExisting) {
  assert.equal(fs.existsSync(states), true);
  assert.equal(read(path.join(run, 'validation', label, 'result.json')).exitCode, 0);
} else {
  assert.equal(fs.existsSync(directory), false);
  fs.mkdirSync(states, { recursive: true });
  const activationRoot = variant === 'Default' ? 'C:\\src\\autoperf-F042-default' : 'C:\\src\\aspnetcore';
  const command = [path.join(session, 'F120-managed-command.mjs'), label, activationRoot,
    path.join(run, 'consumer-' + suffix, 'AutoPerf.Benchmarks.dll'), 'characterize', states,
    path.join(run, 'closure-' + suffix + '.json'), path.join(run, 'source-inputs-' + suffix + '.json'),
    path.join(run, 'source-files-' + suffix), path.join(directory, 'not-timed-reports'), variant, 'none'];
  const result = spawnSync(process.execPath, command, { windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  fs.writeFileSync(path.join(directory, 'driver-stdout.txt'), result.stdout ?? '', { flag: 'wx' });
  fs.writeFileSync(path.join(directory, 'driver-stderr.txt'), result.stderr ?? '', { flag: 'wx' });
  console.log(result.stdout);
  console.error(result.stderr);
  assert.equal(result.status, 0, 'Actual characterization failed; preserve every input and state.');
}
const records = fs.readdirSync(states).map(file => ({ file, data: read(path.join(states, file)) }));
const select = kind => records.filter(item => item.file.endsWith('-' + kind + '.json')).map(item => item.data);
const producers = select('actual-mvc-producer');
const contracts = select('actual-prepared-public-contract');
assert.equal(producers.length, 24);
assert.equal(contracts.length, 16);
assert.equal(select('actual-null-and-reference-contract').length, 2);
assert.equal(select('actual-object-equality-contract').length, 1);
assert.equal(select('actual-reentrant-enumeration-contract').length, 2);
assert.equal(select('actual-source-interface-contract').length, 1);
assert.equal(select('actual-prepared-collection-lifetime').length, 8);
assert.equal(select('benchmarkdotnet-discovery-preflight')[0].actualDiscoveredCases, 16);
assert.equal(select('selected-source-pdb-associations')[0].actualUniqueFrameworkDocuments, 6);
assert.equal(select('selected-source-pdb-associations')[0].actualSelectedInputs, 10);
assert.equal(select('selected-source-pdb-associations')[0].actualSourceBuiltOwners, 3);
for (const profile of plan.profiles) {
  const expectedCount = profile.factoryCount === 'default-five' ? 5 : profile.factoryCount;
  const expectedIndex = profile.match === 'first' ? 0 : profile.match === 'last' ? expectedCount - 1 : -1;
  const actual = producers.filter(item => item.actualProfile === profile.key);
  assert.equal(actual.length, 3);
  assert.equal(actual.filter(item => item.actualEnableActionInvokers).length, 1);
  for (const item of actual) {
    assert.equal(item.actualHttpRequests, 2);
    assert.equal(item.actualConfiguredFactoryCount, expectedCount);
    assert.equal(item.actualDefaultFiveVerified, profile.factoryCount === 'default-five');
    assert.equal(item.actualDistinctPerRequestWrappers, true);
    assert.equal(item.actualSameUntouchedSourceArray, true);
    assert.equal(item.actualSecondRequestHasNoCopy, true);
    assert.equal(item.actualNoValueProviderFactoriesPropertyAssignment, true);
    assert.equal(item.actualCompiledRazorPageRequestClaimed, false);
    assert.equal(item.observations.length, 2);
    for (const [index, observation] of item.observations.entries()) {
      const copied = index === 0 && profile.copied;
      assert.equal(observation.actualRawQueryReadByParameterlessAction, copied ? 'true' : 'false');
      assert.equal(observation.actualInitialCopyNull, true);
      assert.equal(observation.actualFinalCopied, copied);
      assert.equal(observation.actualPrivateCopyIsExactList, copied);
      assert.equal(observation.actualFactoryCount, expectedCount);
      assert.equal(observation.actualFactoryTypes.length, expectedCount);
      assert.equal(observation.actualSourceUnchanged, true);
    }
  }
  const results = contracts.filter(item => item.actualProfile === profile.key);
  assert.equal(results.length, 2);
  assert.deepEqual(results.map(item => item.actualEnableActionInvokers).sort(), [false, true]);
  assert.ok(results.every(item => item.actualCount === expectedCount && item.actualContains === (expectedIndex >= 0)
    && item.actualIndexOf === expectedIndex && item.actualExpectedIndex === expectedIndex && item.actualPassed));
}
const completed = select('characterization-completed');
assert.equal(completed.length, 1);
assert.equal(completed[0].actualAllPassed, true);
assert.equal(completed[0].actualHttpRequests, 48);
assert.equal(completed[0].actualTimingRun, false);
const runtimes = records.filter(item => /-runtime-characterize-(before|after)\.json$/.test(item.file));
assert.equal(runtimes.length, 2);
assert.deepEqual(runtimes[0].data.settings, runtimes[1].data.settings);
const receipt = {
  candidate: 'F120', variant, label, actualPassed: true, actualPreparedPublicProfiles: 16,
  actualFreshBenchmarkProfiles: 8, actualRealMvcProducerCaptures: 24, actualRealHttpRequests: 48,
  actualControllerProducerModes: 2, actualAdditionalEqualityAndEnumerationContracts: 6,
  actualUniqueSourcePePdbDocuments: 6, actualRuntimeRecords: 2,
  actualCompiledRazorPageRequestClaimed: false, actualTiming: false,
  actualSourceComparisonAuthorizationsAlreadyConsumed: budget.authorized.length,
  actualReusedCompletedManagedRunWithoutRelaunch: auditExisting, actualProducedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(directory, 'verified-characterization.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt, null, 2));
