import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F033');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const budget = read(path.join(run, 'measurement-budget.json'));
assert.equal(budget.actualSourceComparisonsStarted, 0);
const original = read(path.join(run, budget.authoritativePreparations.original, 'prepared', 'capsule.json'));
const candidate = read(path.join(run, budget.authoritativePreparations.candidate, 'prepared', 'capsule.json'));
assert.equal(original.actualHarnessSha256, candidate.actualHarnessSha256);
assert.equal(original.actualHarnessPdbSha256, candidate.actualHarnessPdbSha256);
const a = read(original.closurePath).files;
const b = read(candidate.closurePath).files;
assert.equal(a.length, b.length);
const byPath = new Map(b.map(row => [row.path, row]));
const changes = a.filter(row => row.sha256 !== byPath.get(row.path)?.sha256).map(row => row.path).sort();
assert.deepEqual(changes, ['Microsoft.AspNetCore.Server.HttpSys.dll', 'Microsoft.AspNetCore.Server.HttpSys.pdb']);
const beforeSource = fs.readFileSync(path.join(original.sources, 'httpsys', 'ResponseStream.cs'), 'utf8').replaceAll('\r\n', '\n');
const afterSource = fs.readFileSync(path.join(candidate.sources, 'httpsys', 'ResponseStream.cs'), 'utf8').replaceAll('\r\n', '\n');
const seam = '    public override void Write(byte[] buffer, int offset, int count)\n    {\n        _onStart().GetAwaiter().GetResult();\n';
const guarded = '    public override void Write(byte[] buffer, int offset, int count)\n    {\n        var startTask = _onStart();\n        if (!startTask.IsCompletedSuccessfully)\n        {\n            startTask.GetAwaiter().GetResult();\n        }\n\n';
assert.ok(beforeSource.includes(seam));
assert.equal(afterSource, beforeSource.replace(seam, guarded), 'Only the predeclared synchronous Write seam may change.');
const comparedEvents = new Set(['completed-profile', 'completed-live-before-release',
  'pending-before-release', 'pending-after-release', 'already-failed-producer', 'default-sync-disabled',
  'completed-async-control', 'no-callback-async-control', 'invalid-arguments-observed',
  'invalid-arguments-after-start', 'zero-first-write', 'benchmark-lifecycle-characterized']);
function stripOwner(value) {
  if (Array.isArray(value)) {
    return value.map(stripOwner);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'actualStreamOwner')
      .map(([key, item]) => [key, stripOwner(item)]));
  }
  return value;
}
function collect(label, manifest) {
  const directory = path.join(run, 'profiles', label, 'states');
  const observations = new Map();
  let sourceDocuments = 0;
  for (const name of fs.readdirSync(directory).sort()) {
    const event = name.replace(/^\d+-/, '').replace(/\.json$/, '');
    const record = read(path.join(directory, name));
    if (event.startsWith('source-pdb-')) {
      assert.equal(record.actualPePdbBindingMatched, true);
      sourceDocuments += record.documents.length;
    }
    if (!comparedEvents.has(event)) {
      continue;
    }
    const key = event + ':' + (record.profile ?? record.actualPlan?.profile);
    assert.ok(!observations.has(key), 'Unique actual semantic observation required: ' + key);
    const owner = record.actualStreamOwner ?? record.actualPlan?.actualStreamOwner;
    if (owner !== undefined) {
      assert.equal(owner, path.join(manifest.output, 'Microsoft.AspNetCore.Server.HttpSys.dll'));
    }
    observations.set(key, stripOwner(record));
  }
  assert.equal(sourceDocuments, 9);
  assert.equal([...observations.keys()].filter(key => key.startsWith('completed-profile:')).length, 6);
  assert.equal([...observations.keys()].filter(key => key.startsWith('pending-before-release:')).length, 10);
  assert.equal([...observations.keys()].filter(key => key.startsWith('invalid-arguments-observed:')).length, 6);
  assert.equal([...observations.keys()].filter(key => key.startsWith('benchmark-lifecycle-characterized:')).length, 6);
  return observations;
}
const originalObservations = collect(budget.authoritativeCharacterizations.original, original);
const candidateObservations = collect(budget.authoritativeCharacterizations.candidate, candidate);
assert.deepEqual([...candidateObservations.keys()], [...originalObservations.keys()]);
const compared = [];
for (const [key, record] of originalObservations) {
  assert.deepEqual(candidateObservations.get(key), record, 'Actual producer/error/parameter/header/order/data/wire/lifecycle differs: ' + key);
  compared.push(key);
}
const bounds = originalObservations.get('invalid-arguments-observed:Arguments.PastEnd.Enabled');
assert.equal(bounds.actualPublicErrorType, 'System.ArgumentOutOfRangeException');
assert.equal(bounds.actualArgumentParameter, 'count');
const report = {
  candidate: 'F033', actualBeforeAnyNativeTiming: true, actualComparisonSlotsStarted: 0,
  actualComparedSemanticObservations: compared.length, actualComparedKeys: compared,
  actualCompletedProfilesPerVariant: 6, actualAdditionalRealProducerContractsPerVariant: 22,
  actualBenchmarkLifecyclesPerVariant: 6, actualPendingProducerCasesPerVariant: 10,
  actualSourcePdbDocumentsPerVariant: 9,
  actualConsumerFilesPerVariant: a.length, actualChangedOwnerFiles: changes,
  actualUnchangedConsumerFilesIncludingHarnessPair: a.length - changes.length,
  actualOtherUnchangedFilesExcludingHarnessPair: a.length - changes.length - 2,
  actualHarnessDllAndPdbIdentical: true, actualOnlySynchronousWriteGuardChanged: true,
  actualConcreteErrorsParametersOrderHeadersAndWireMatched: true,
  actualPlanSha256: hash(path.join(run, 'measurement-plan.json')),
  qualification: 'Only frozen owner absolute path is normalized,and each real path is separately required to equal its frozen consumer owner. Everything else in these producer/error/argument/header/byte-hash/wire/lifecycle observations matches exactly.',
};
fs.writeFileSync(path.join(run, 'premeasurement-contract-comparison.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`F033:${compared.length}actual semantic observations match;only2owner files differ in${a.length}-file consumers;all concrete error/parameter/data/wire/lifecycle evidence matched before timing.`);
