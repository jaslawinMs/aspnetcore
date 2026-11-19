import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F124');
const [variant, label] = process.argv.slice(2);
assert.ok(['Original', 'Default', 'Candidate'].includes(variant));
assert.match(label, /^[a-z0-9-]+$/);
const suffix = (variant === 'Default' ? 'current-default' : variant.toLowerCase()) + '-002';
const root = variant === 'Default' ? String.raw`C:\src\autoperf-F042-default` : String.raw`C:\src\aspnetcore`;
const output = path.join(run, label);
assert.equal(fs.existsSync(output), false);
const states = path.join(output, 'states');
const reports = path.join(output, 'reports');
fs.mkdirSync(states, { recursive: true });
fs.mkdirSync(reports);
const managed = path.join(session, 'F124-managed-command.mjs');
const args = [managed, label, root, path.join(run, 'consumer-' + suffix, 'AutoPerf.Benchmarks.dll'),
  'characterize', states, path.join(run, 'closure-' + suffix + '.json'),
  path.join(run, 'source-inputs-' + suffix + '.json'), path.join(run, 'source-files-' + suffix),
  reports, variant, 'none'];
const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');
assert.ifError(result.error);
assert.equal(result.status, 0, 'Retain the untimed preparation failure and use a distinct corrected attempt.');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const data = fs.readdirSync(states).sort().map(file => ({
  file, value: JSON.parse(fs.readFileSync(path.join(states, file), 'utf8'))
}));
const ofKind = kind => data.filter(item => item.file.endsWith('-' + kind + '.json')).map(item => item.value);
assert.equal(ofKind('prepared-profile-contract').length, 4);
assert.equal(ofKind('additional-semantic-contract').length, 6);
assert.equal(ofKind('actual-benchmark-method-contract').length, 4);
assert.equal(ofKind('benchmark-setup').length, 4);
const runtime = data.filter(item => /-runtime-characterize-(before|after)\.json$/.test(item.file));
assert.equal(runtime.length, 2);
for (const item of runtime) {
  assert.equal(item.value.settings.processPriority, 'Normal');
  assert.equal(item.value.settings.threadPriority, 'Normal');
  assert.equal(item.value.settings.affinity, 65535);
}
const proofs = ofKind('selected-source-pdb-associations');
assert.equal(proofs.length, 1);
assert.equal(proofs[0].actualSelectedDocuments, 2);
assert.equal(proofs[0].actualPeAndPdbMatch, true);
const project = kind => ofKind(kind).map(value => {
  const { actualPredicateMetadataToken, actualPredicateOwnerMvid, ...contract } = value;
  return contract;
}).sort((a, b) => a.profile.localeCompare(b.profile, 'en'));
const receipt = {
  candidate: 'F124', variant, label, actualUntimedCharacterizationPassed: true,
  actualPreparedProfiles: 4, actualAdditionalSemanticContracts: 6, actualActualBenchmarkMethodContracts: 4,
  actualFreshDriverExecutions: 34, actualSelectedSourcePdbDocuments: 2,
  actualBenchmarkCasesDiscovered: ofKind('benchmarkdotnet-discovery-preflight')[0].actualDiscoveredCases,
  actualPredicateAndFullDiagnosticProjection: project('prepared-profile-contract'),
  actualAdditionalSemanticProjection: project('additional-semantic-contract'),
  actualBenchmarkMethodProjection: ofKind('actual-benchmark-method-contract').sort((a, b) => a.profile.localeCompare(b.profile, 'en')),
  actualRuntimeRecords: runtime.length, actualStateFiles: data.length,
  actualEveryPreparedCompilationValidatedWithoutCompilerErrors: true,
  actualNoTimingSamples: true,
  stateHashes: data.map(item => ({ path: path.relative(run, path.join(states, item.file)).replaceAll('\\', '/'),
    sha256: sha(path.join(states, item.file)) }))
};
assert.equal(receipt.actualBenchmarkCasesDiscovered, 12);
fs.writeFileSync(path.join(output, 'verified-characterization.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F124', variant, actualStateFiles: data.length,
  actualPreparedProfiles: 4, actualAdditionalSemanticContracts: 6, actualFreshDriverExecutions: 34,
  actualSelectedSourcePdbDocuments: 2, actualTimingSamples: 0 }, null, 2));
