import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F013');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const output = path.join(run, 'candidate-selection.json');
assert(!fs.existsSync(output));
const evidence = [];
for (const role of ['original', 'captured-default-json']) {
  const directory = path.join(run, 'characterization', role, 'states');
  const files = fs.readdirSync(directory);
  const records = files.filter(name => name.endsWith('-producer.json')).map(name => ({
    file: path.join('characterization', role, 'states', name), value: read(path.join(directory, name)),
  }));
  assert.equal(records.length, 18);
  assert(records.every(row => row.value.passed));
  const get = name => records.find(row => row.value.caseName === name).value.observation;
  for (const shape of ['Array', 'List', 'ReadOnlyWrapper']) {
    const live = get('Live' + shape + 'MutationAtJsonGetter');
    const copy = get('SnapshotInputControl' + shape);
    assert.equal(live.originalCount, 17);
    assert.equal(live.finalCount, 17);
    assert.equal(live.getterReads, 1);
    assert.equal(live.actual.actualRecipients.length, 1);
    assert.equal(copy.originalCount, 17);
    assert.equal(copy.getterReads, 1);
    assert.equal(copy.actual.actualRecipients.length, 8);
  }
  const derived = get('DerivedListRetainsCustomContainsDispatch');
  assert.equal(derived.targetCount, 17);
  assert.equal(derived.ContainsCalls, 2);
  assert.deepEqual(derived.actual.actualRecipients, ['CONNECTION']);
  const custom = get('CustomCollectionContainsDispatch');
  assert.equal(custom.ContainsCalls, 2);
  assert.equal(custom.EnumeratorCalls, 0);
  for (const [connections, targets] of [[1, 17], [8, 32], [32, 64]]) {
    const row = get(`RepeatedMissEnumerationC${connections}T${targets}`);
    assert.equal(row.EnumeratorCalls, connections);
    assert.equal(row.ValuesYielded, connections * targets);
    assert.equal(row.CountReads, 1);
    assert.equal(row.IndexerReads, 0);
  }
  const completion = read(path.join(directory, files.find(name => name.endsWith('-characterization-completed.json'))));
  assert.equal(completion.contractChecks, 18);
  assert.equal(completion.actualChecks, 32);
  assert.equal(completion.actualTimedSetupsPreflighted, 14);
  assert(completion.passed);
  evidence.push(...records.map(row => ({
    path: row.file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(run, row.file))).digest('hex').toUpperCase(),
  })));
}
fs.writeFileSync(output, JSON.stringify({
  candidate: 'F013', selectedVariant: 'native-specialization-001',
  implementationSelectedForEvaluation: true, shippingImplementationAppliedAtSelection: false,
  naiveSnapshotProposalRejected: true, snapshotInputControlsAreCompiledIndex: false,
  algorithmicLinearCostEliminated: false, performancePrJustifiedBeforeMeasurement: false,
  selection: 'Evaluate allocation-free per-send predicate selection for exact built-in List<string> and string[] only. Direct List.Contains/Array.IndexOf preserve native membership and live storage; exact List runtime-type guard leaves derived/custom ICollection.Contains dispatch on the unchanged original fallback. <=16 path untouched.',
  limitations: 'Still O(all connections*requested IDs); no target-sized snapshot/index. Additional compiler-cached delegates are not zero-startup-allocation proof. No gain, production-frequency or whole-current-default integration claim.',
  originalNativeEvidence: evidence,
  originalExecutedProducerVersions: 2, originalChecksPerProducer: 18, originalTimedWrappersPerProducer: 14,
  explicitPriorOwningTestEvidenceOnlyForPreparation: 'F011 unchanged original27rows; a selected source candidate now requires fresh owning rows including new derived-list preservation Fact and all four16/17 Theory cases.',
  pairedComparisonBudget: 3, profilesOrComparisonsStartedAtSelection: 0,
}, null, 2) + '\n');
console.log('F013 native evidence permits narrow exact-built-in-type specialization for measurement, not a snapshot/index or claimed performance win.');
