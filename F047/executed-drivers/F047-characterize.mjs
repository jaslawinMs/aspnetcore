import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F047');
const [variant, label] = process.argv.slice(2);
assert.ok(['Original', 'Default', 'Candidate'].includes(variant));
assert.match(label ?? '', /^[a-z0-9-]+$/);
const auditExisting = process.argv[4] === '--audit-existing';
assert.ok(process.argv.length === 4 || (process.argv.length === 5 && auditExisting));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
assert.equal(read(path.join(run, 'diagnostic-budget.json')).authorized.length, 0);
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
  const command = [path.join(session, 'F047-managed-command.mjs'), label, activationRoot,
    path.join(run, 'consumer-' + suffix, 'AutoPerf.Benchmarks.dll'), 'characterize', states,
    path.join(run, 'closure-' + suffix + '.json'), path.join(run, 'source-inputs-' + suffix + '.json'),
    path.join(run, 'source-files-' + suffix), path.join(directory, 'not-timed-reports'), variant, 'none'];
  const result = spawnSync(process.execPath, command, { windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  fs.writeFileSync(path.join(directory, 'driver-stdout.txt'), result.stdout ?? '');
  fs.writeFileSync(path.join(directory, 'driver-stderr.txt'), result.stderr ?? '');
  console.log(result.stdout);
  console.error(result.stderr);
  assert.equal(result.status, 0, 'Actual characterization failed; preserve every input and state.');
}
const records = fs.readdirSync(states).map(file => ({ file, data: read(path.join(states, file)) }));
const select = kind => records.filter(item => item.file.endsWith('-' + kind + '.json'));
assert.equal(select('actual-renderer-boundary-characterized').length, 24);
assert.equal(select('actual-invalid-delegate-contract').length, 12);
assert.equal(select('actual-disabled-fragment-contract').length, 3);
assert.equal(select('actual-nested-fragment-characterized').length, 1);
assert.equal(select('actual-runtime-dictionary-contract').length, 1);
assert.equal(select('benchmarkdotnet-discovery-preflight')[0].data.actualDiscoveredCases, 8);
assert.equal(select('selected-source-pdb-associations')[0].data.actualUniqueFrameworkDocuments, 8);
assert.equal(select('characterization-completed')[0].data.actualPassed, true);
const runtimes = records.filter(item => /-runtime-characterize-(before|after)\.json$/.test(item.file));
assert.equal(runtimes.length, 2);
assert.deepEqual(runtimes[0].data.settings, runtimes[1].data.settings);
const receipt = {
  candidate: 'F047', variant, label, actualPassed: true, actualRendererProfiles: 24,
  actualFreshBenchmarkProfiles: 8, actualInvalidDelegateCases: 12, actualDisabledFragmentFailures: 3,
  actualNestedFragmentCases: 1, actualUniqueSourcePePdbDocuments: 8, actualRuntimeRecords: 2,
  actualTiming: false, actualReusedCompletedManagedRunWithoutRelaunch: auditExisting,
  actualProducedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(directory, 'verified-characterization.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt, null, 2));
