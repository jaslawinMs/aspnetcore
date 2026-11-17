import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F024');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const capsule = read(path.join(run, 'prepared', 'capsule.json'));
const bindings = [];
for (const variant of ['original', 'selected']) {
  const record = capsule.variants[variant];
  const closure = read(record.closurePath);
  for (const entry of closure.files) {
    const owner = record.owners.find(value => value.name === entry.path);
    const physical = owner?.source ?? path.join(capsule.output, entry.path);
    assert.equal(hash(physical), entry.sha256);
    bindings.push({ variant, relativePath: entry.path, actualPhysicalPath: physical, actualSha256: entry.sha256 });
  }
  for (const entry of record.sourceFiles) {
    assert.equal(hash(path.join(record.directory, entry.path)), entry.sha256);
  }
}
const runtimeBindings = [];
for (const profile of fs.readdirSync(path.join(run, 'profiles'))) {
  const stateDirectory = path.join(run, 'profiles', profile, 'states');
  for (const file of fs.readdirSync(stateDirectory).filter(name => name.endsWith('-runtime.json'))) {
    const runtime = read(path.join(stateDirectory, file));
    for (const assembly of runtime.runtimeAssemblies) {
      assert.equal(hash(assembly.path), assembly.sha256);
      runtimeBindings.push({ profile, name: assembly.name, actualPhysicalPath: assembly.path, actualSha256: assembly.sha256 });
    }
  }
}
const fresh = read(path.join(run, 'reproduction-characterized', 'verified-fresh-consumer.json'));
assert.equal(fresh.mode, 'Characterize');
assert.equal(fresh.actualTimingPerformed, false);
assert.equal(fresh.historicalF024BudgetReadOrWritten, false);
assert.equal(fresh.actualClosureFiles, 98);
assert.equal(fresh.actualSourceSha256, capsule.actualSelectedSourceSha256);
assert.ok(fresh.actualInvocations.every(invocation => invocation.actualExitCode === 0));
const budget = read(path.join(run, 'measurement-budget.json'));
assert.equal(budget.comparison_budget_closed, true);
assert.equal(budget.actual_comparisons_started, 3);
assert.equal(budget.actual_timing_profiles_started, 18);
const original = read(path.join(run, 'validation', 'original-resource-characterization', 'actual-outcomes.json'));
const selected = read(path.join(run, 'validation', 'selected-owning', 'actual-outcomes.json'));
assert.equal(original.actualOutcomeCount, 34);
assert.equal(original.actualPassed, 32);
assert.equal(original.actualNonPassed, 2);
assert.equal(selected.actualOutcomeCount, 34);
assert.equal(selected.actualPassed, 34);
assert.equal(selected.actualNonPassed, 0);
const expectedRed = original.actualOutcomes.filter(row => row.outcome !== 'Passed');
assert.equal(expectedRed.length, 2);
for (const [modified, bytes] of [['True', 142336], ['False', 87552]]) {
  const row = expectedRed.find(value => value.name === `Microsoft.AspNetCore.Session.DistributedSessionCommitTests.CommitAsync_InfiniteTimeoutAvoidsTimerAllocation(modified: ${modified})`);
  assert.ok(row);
  assert.equal(row.message, `Infinite timeout commit allocation must be below finite timeout allocation. Modified:${modified};Infinite:${bytes};finite:${bytes}.`);
}
for (const before of original.actualOutcomes.filter(row => row.outcome === 'Passed')) {
  assert.equal(selected.actualOutcomes.find(row => row.name === before.name)?.outcome, 'Passed');
}
const output = {
  candidate: 'F024', actualRehashedClosureBindings: bindings.length,
  actualDistinctNativePhysicalPaths: new Set(bindings.map(row => row.actualPhysicalPath)).size,
  actualRuntimeBindings: runtimeBindings.length,
  actualDistinctRuntimePhysicalPaths: new Set(runtimeBindings.map(row => row.actualPhysicalPath)).size,
  actualAllRecordedSourceHashesMatched: true, actualAllRecordedNativeHashesMatched: true,
  actualSourcePePdbAndAllRawMeanAudit: 'measurement-audit.json',
  actualFreshStandaloneCharacterizeSucceeded: true, actualFreshComparisonPerformed: false,
  actualOriginalSpecificResourceReds: expectedRed,
  actualSelectedOwningRowsPassed: 34, actualOriginalPreservationRowsStillPassed: 32,
  comparisonBudgetPermanentlyClosed: true, bindings, runtimeBindings,
  limit: 'Live native files were actually rehashed here. A copied-text audit does not reproduce this physical rehash after binaries are omitted from publication.',
};
fs.writeFileSync(path.join(run, 'live-frozen-closure-audit.json'), JSON.stringify(output, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualRehashedClosureBindings: bindings.length,
  actualDistinctNativePhysicalPaths: output.actualDistinctNativePhysicalPaths,
  actualRuntimeBindings: runtimeBindings.length, actualFreshStandaloneCharacterizeSucceeded: true,
  actualSelectedOwningRowsPassed: 34, historicalComparisons: 3, historicalTimingProfiles: 18 }, null, 2));
