import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F046');
const [variant, label] = process.argv.slice(2);
assert.ok(['Original', 'Default', 'Candidate'].includes(variant));
assert.match(label ?? '', /^[a-z0-9-]+$/);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
assert.equal(read(path.join(run, 'diagnostic-budget.json')).authorized.length, 0);
const suffix = variant === 'Default' ? 'current-default' : variant.toLowerCase();
const directory = path.join(run, 'characterization-' + label);
assert.equal(fs.existsSync(directory), false);
const states = path.join(directory, 'states');
fs.mkdirSync(states, { recursive: true });
const activationRoot = variant === 'Default' ? 'C:\\src\\autoperf-F042-default' : 'C:\\src\\aspnetcore';
const command = [path.join(session, 'F046-managed-command.mjs'), label, activationRoot,
  path.join(run, 'consumer-' + suffix, 'AutoPerf.Benchmarks.dll'), 'characterize', states,
  path.join(run, 'closure-' + suffix + '.json'), path.join(run, 'source-inputs-' + suffix + '.json'),
  path.join(run, 'source-files-' + suffix), path.join(directory, 'not-timed-reports'), variant, 'none'];
const result = spawnSync(process.execPath, command, { windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
fs.writeFileSync(path.join(directory, 'driver-stdout.txt'), result.stdout ?? '');
fs.writeFileSync(path.join(directory, 'driver-stderr.txt'), result.stderr ?? '');
console.log(result.stdout);
console.error(result.stderr);
assert.equal(result.status, 0, 'Actual characterization failed; preserve every input and state.');
const records = fs.readdirSync(states).map(file => ({ file, data: read(path.join(states, file)) }));
const select = kind => records.filter(item => item.file.endsWith('-' + kind + '.json'));
const contracts = select('actual-shared-owner-contracts');
assert.equal(contracts.length, 2);
assert.ok(contracts.every(item => item.data.actualPassed.length === 10));
assert.equal(select('fresh-append-boundary-characterized').length, 12);
assert.equal(select('actual-native-connection-producer').length, 6);
assert.equal(select('compiled-shipping-owner-append-references').length, 2);
assert.equal(select('actual-listener-started').length, 1);
assert.equal(select('actual-listener-disposed').length, 1);
assert.equal(select('selected-source-pdb-associations')[0].data.actualSelectedDocuments, 7);
const runtimes = records.filter(item => /-runtime-/.test(item.file));
assert.equal(runtimes.length, 2);
assert.deepEqual(runtimes[0].data.settings, runtimes[1].data.settings);
const receipt = {
  candidate: 'F046', variant, label, actualPassed: true,
  actualSharedOwnerContracts: contracts.map(item => ({ owner: item.data.actualOwner, passed: item.data.actualPassed.length })),
  actualFreshBenchmarkBoundaries: 12, actualNativeProducerProfiles: 6,
  actualCompiledShippingOwnersInspected: 2, actualSourcePePdbAssociations: 7,
  actualNativeHostStartedAndDisposed: true, actualRuntimeRecords: 2,
  actualTiming: false, actualProducedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(directory, 'verified-characterization.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt, null, 2));
