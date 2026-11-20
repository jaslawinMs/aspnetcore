import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F126');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
assert.equal(read(path.join(run, 'diagnostic-budget.json')).authorizations.length, 0);
const tests = read(path.join(run, 'validation', 'candidate-functional-tests-001', 'individual-results.audit.json'));
assert.equal(tests.actualPassed, 9);
assert.equal(tests.actualFocusedRows, 2);
assert.equal(tests.actualSkippedOrUnexpectedFailures, 0);
const values = {};
const bindings = [];
for (const role of ['Original', 'Default', 'Candidate']) {
  const directory = path.join(run, 'characterization', `${role.toLowerCase()}-characterization-001`);
  assert.equal(read(path.join(directory, 'execution.json')).actualExitCode, 0);
  const state = path.join(directory, 'state');
  const name = fs.readdirSync(state).find(name => name.endsWith('-characterization.json'));
  assert.ok(name);
  const file = path.join(state, name);
  values[role] = read(file);
  const value = values[role];
  assert.equal(value.actualTimingRun, false);
  assert.equal(value.actualProfiles.length, 2);
  for (const profile of value.actualProfiles) {
    const primary = profile.actualRequestCounts.primary;
    const disabled = profile.actualRequestCounts.disabled;
    assert.equal(primary.actualNamedCalls, role === 'Candidate' ? 1 : 2);
    assert.equal(primary.actualEffectiveFlag, role === 'Candidate');
    assert.equal(primary.actualForwardedOwnerFlag, role === 'Candidate');
    assert.equal(disabled.actualNamedCalls, 2);
    assert.equal(disabled.actualEffectiveFlag, false);
    assert.equal(disabled.actualForwardedOwnerFlag, role === 'Candidate');
    assert.equal(disabled.actualControlForcesFlagFalse, true);
    assert.equal(profile.actualDirectInstancesDiffer, true);
    assert.equal(profile.actualOlderSucceeds, true);
    assert.equal(profile.actualYoungerSucceeds, false);
  }
  bindings.push({ role, characterizationSha256: sha(file) });
}
function preserved(profile) {
  const copy = structuredClone(profile);
  for (const counts of Object.values(copy.actualRequestCounts)) {
    delete counts.actualNamedCalls;
    delete counts.actualEffectiveFlag;
    delete counts.actualForwardedOwnerFlag;
  }
  return copy;
}
for (const role of ['Default', 'Candidate']) {
  assert.deepEqual(values[role].actualProfiles.map(preserved), values.Original.actualProfiles.map(preserved));
  assert.deepEqual(values[role].actualCultureCases, values.Original.actualCultureCases);
  for (const field of ['actualConfiguredNamedDelegation', 'actualConfiguredMalformedNameDelegation',
    'actualConfiguredDefaultDelegation', 'actualConfiguredFallbackDelegation', 'actualUnknownAndOverflowRemainNull',
    'actualDirectCallsRemainUncached']) assert.equal(values[role][field], true);
}
const original = read(path.join(run, 'images', 'Original', 'closure.json')).files;
const candidate = read(path.join(run, 'images', 'Candidate', 'closure.json')).files;
assert.equal(original.length, 352);
assert.deepEqual(original.map(file => file.path), candidate.map(file => file.path));
const changes = original.filter((file, index) => file.sha256 !== candidate[index].sha256).map(file => file.path);
assert.deepEqual(changes, ['CustomPolicyProvider.dll', 'CustomPolicyProvider.pdb']);
const result = {
  candidate: 'F126', actualCompletedAt: new Date().toISOString(), actualBeforeAnyTiming: true,
  actualNewRealRequestRowsIndividuallyRedThenGreen: 2, actualCandidateHttpPassed: 9,
  actualAllExistingHttpCasesPreserved: true, actualOriginalDefaultCandidateDirectCultureCasesEach: 50,
  actualDirectNamedDefaultFallbackRequirementAndHandlerSemanticsPreserved: true,
  actualCommonImageEntries: original.length, actualIdenticalNonOwnerEntries: original.length - changes.length,
  actualOnlyChangedImageEntries: changes, actualBenchmarkDllAndPdbIdentical: true,
  actualRequiredLiveNoRestartControllerAttributeEditStillPending: true, bindings
};
fs.writeFileSync(path.join(run, 'candidate-correctness-completed.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
