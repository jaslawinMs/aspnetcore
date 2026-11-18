import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F039');
const directory = path.join(run, 'reproduction-candidate-001');
const preparation = path.join(run, 'preparation-candidate-002');
const mode = process.argv[2];
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(path.join(directory, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const sourceInputs = read(path.join(preparation, 'harness-source-manifest.json')).files;
assert.equal(sourceInputs.length, 7);
for (const input of sourceInputs) assert.equal(hash(path.join(directory, 'project', input.file)), input.sha256);
const originalClosure = read(path.join(preparation, 'consumer-closure.json')).files;
if (mode === 'prepare') {
  const commands = read(path.join(directory, 'build-commands.json'));
  assert.equal(commands.length, 2);
  commands.forEach(command => assert.equal(command.actualExitCode, 0));
  fs.cpSync(path.join(directory, 'project', 'bin', 'Release', 'net12.0'), path.join(directory, 'consumer'),
    { recursive: true, force: false, errorOnExist: true });
  fs.cpSync(path.join(preparation, 'sources'), path.join(directory, 'sources'),
    { recursive: true, force: false, errorOnExist: true });
  const inventory = (folder, base = folder) => fs.readdirSync(folder, { withFileTypes: true })
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0).flatMap(entry => {
      assert.equal(entry.isSymbolicLink(), false);
      const file = path.join(folder, entry.name);
      return entry.isDirectory() ? inventory(file, base) :
        [{ path: path.relative(base, file), bytes: fs.statSync(file).size, sha256: hash(file) }];
    });
  const files = inventory(path.join(directory, 'consumer'));
  assert.equal(files.length, 197);
  assert.deepEqual(files.map(file => file.path), originalClosure.map(file => file.path));
  const changed = files.filter((file, index) => file.sha256 !== originalClosure[index].sha256).map(file => file.path);
  assert.deepEqual(changed.sort(), ['AutoPerf.Benchmarks.dll', 'AutoPerf.Benchmarks.pdb']);
  write('consumer-closure.json', { candidate: 'F039', actualIndependentRelocatedProject: true, files });
  write('preparation.json', { candidate: 'F039', actualSourceFilesIdenticalToCorrectedTimedHarness: 7,
    actualConsumerEntries: 197, actualOnlyDifferentFilesFromMeasuredCandidateImage: changed,
    actualSame195EntriesIncludeOwningEndpointsDllAndPdb: true,
    actualIndependentlyCompiledHarnessSha256: hash(path.join(directory, 'consumer', 'AutoPerf.Benchmarks.dll')) });
  console.log('F039: independently relocated exact seven-file project rebuilt; only its independently compiled harness DLL/PDB differ.');
} else {
  assert.equal(mode, 'verify');
  const receipt = read(path.join(directory, 'characterize-command.json'));
  assert.equal(receipt.actualExitCode, 0);
  assert.equal(receipt.actualTimed, false);
  assert.equal(receipt.actualPidCapturedBeforeWait, true);
  const records = fs.readFileSync(path.join(directory, 'state', 'events.jsonl'), 'utf8')
    .trim().split(/\r?\n/).map(line => JSON.parse(line));
  records.forEach((record, index) => assert.equal(record.sequence, index + 1));
  const only = name => {
    const matches = records.filter(record => record.name === name);
    assert.equal(matches.length, 1, name);
    return matches[0].value;
  };
  assert.deepEqual(only('benchmarkdotnet-discovery-preflight'), {
    actualEligiblePublicNonSealedType: true, actualDiscoveredCases: 40, actualTimingRunByThisPreflight: false,
  });
  const closure = read(path.join(directory, 'consumer-closure.json')).files;
  const baseline = read(path.join(run, 'characterize-candidate-002', 'state', 'characterization.json'));
  const actual = read(path.join(directory, 'state', 'characterization.json'));
  assert.deepEqual(actual.records, baseline.records);
  assert.deepEqual(actual.profiles, baseline.profiles);
  assert.equal(actual.records.length, 15);
  assert.equal(actual.profiles.length, 40);
  for (const phase of ['runtime-characterize-before', 'runtime-characterize-after']) {
    const runtime = only(phase);
    assert.equal(runtime.actualProcessId, receipt.actualProcessId);
    assert.equal(runtime.runtime, '12.0.0');
    assert.equal(runtime.serverGc, true);
    for (const name of ['AutoPerf.Benchmarks', 'Microsoft.AspNetCore.Components.Endpoints']) {
      const assembly = runtime.assemblies.find(assembly => assembly.name === name);
      assert.equal(assembly.sha256, closure.find(file => file.path === `${name}.dll`).sha256);
      assert.equal(hash(assembly.path), assembly.sha256);
    }
  }
  const witness = only('source-pdb');
  assert.equal(witness.actualPePdbBindingMatched, true);
  assert.equal(witness.documents.length, 12);
  assert.equal(records.filter(record => record.name === 'public-owner-capture').length, 43);
  assert.equal([...fs.readFileSync(path.join(directory, 'characterize.stdout.log'), 'utf8').matchAll(/^WorkloadResult\s+\d+:/gm)].length, 0);
  write('verified-reproduction.json', { candidate: 'F039', actualNativeExitCode: 0,
    actualSourceFilesIdenticalToCorrectedTimedHarness: 7, actualRealBdnDiscoveryCases: 40,
    actualSemanticRecordsExactlyEqual: 15, actualLifecycleProfilesExactlyEqual: 40,
    actualPublicOwnerCaptures: 43, actualSourcePdbDocuments: 12, actualAllEventsParsed: records.length,
    actualIndependentlyCompiledHarness: true, actualSamePeIdentityAsTimedHarnessClaimed: false,
    actualAdditionalTimingSamples: 0, actualNativeProcessId: receipt.actualProcessId,
    actualSourceComparisonAttemptBudgetUnchanged: true });
  console.log('F039: independent rebuild/real BDN discovery/15 semantic records/40 lifecycles passed; no extra timing.');
}
