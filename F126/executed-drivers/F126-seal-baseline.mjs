import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F126');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const budget = read(path.join(run, 'diagnostic-budget.json'));
assert.equal(budget.authorizations.length, 0);
assert.equal(budget.permanentlyClosed, false);
assert.equal(sha(path.join(run, 'acceptance-plan.json')), budget.actualAcceptancePlanSha256);
const original = read(path.join(run, 'validation', 'original-existing-functional-tests-001', 'individual-results.audit.json'));
const red = read(path.join(run, 'validation', 'original-cache-contract-tests-001', 'individual-results.audit.json'));
const actualDefault = read(path.join(run, 'validation', 'default-existing-functional-tests-001', 'individual-results.audit.json'));
assert.equal(original.actualPassed, 7);
assert.equal(red.actualPassed, 7);
assert.equal(red.actualExpectedOriginalCacheContractFailures, 2);
assert.equal(actualDefault.actualPassed, 7);
const characterizations = {};
const bindings = [];
for (const role of ['Original', 'Default']) {
  const directory = path.join(run, 'characterization', `${role.toLowerCase()}-characterization-001`);
  assert.equal(read(path.join(directory, 'execution.json')).actualExitCode, 0);
  const state = path.join(directory, 'state');
  const names = fs.readdirSync(state);
  const find = suffix => path.join(state, names.find(name => name.endsWith(suffix))
    ?? assert.fail(`Missing actual ${role} ${suffix}`));
  const file = find('-characterization.json');
  const value = read(file);
  assert.equal(value.actualTimingRun, false);
  assert.equal(value.actualProfiles.length, 2);
  assert.equal(value.actualCultureCases.length, 5);
  assert.equal(value.actualCultureCases.flatMap(item => item.actualCases).length, 50);
  assert.ok(value.actualProfiles.every(profile => profile.actualOlderSucceeds && !profile.actualYoungerSucceeds
    && profile.actualDirectInstancesDiffer && profile.actualRequestCounts.primary.actualNamedCalls === 2
    && profile.actualRequestCounts.disabled.actualNamedCalls === 2));
  const associations = read(find('-selected-source-pdb-associations.json'));
  assert.equal(associations.actualSelectedDocuments, 6);
  assert.equal(associations.actualSelectedInputs, 26);
  assert.equal(associations.actualPeAndPdbMatch, true);
  for (const phase of ['before', 'after']) {
    const runtime = read(find(`-runtime-characterize-${phase}.json`));
    const framework = runtime.assemblies.filter(assembly => assembly.name.startsWith('Microsoft.AspNetCore'));
    if (phase === 'after') {
      for (const required of ['Microsoft.AspNetCore.Authorization', 'Microsoft.AspNetCore.Authorization.Policy',
        'Microsoft.AspNetCore.Authentication.Cookies', 'Microsoft.AspNetCore.Hosting', 'Microsoft.AspNetCore.Http',
        'Microsoft.AspNetCore.Mvc.Core', 'Microsoft.AspNetCore.Routing', 'Microsoft.AspNetCore.TestHost']) {
        assert.ok(framework.some(assembly => assembly.name === required), `Missing actually exercised owner: ${required}`);
      }
    }
    const imageRoot = path.join(run, 'images', role, 'image') + path.sep;
    for (const assembly of framework) {
      assert.ok(assembly.location.toLowerCase().startsWith(imageRoot.toLowerCase()), assembly.name);
      assert.equal(sha(assembly.location), assembly.sha256);
    }
  }
  characterizations[role] = value;
  bindings.push({ role, characterizationSha256: sha(file),
    closureSha256: sha(path.join(run, 'images', role, 'closure.json')),
    sourceInputsSha256: sha(path.join(run, 'images', role, 'source-inputs.json')) });
}
assert.deepEqual(characterizations.Original.actualProfiles, characterizations.Default.actualProfiles);
assert.deepEqual(characterizations.Original.actualCultureCases, characterizations.Default.actualCultureCases);
assert.equal(fs.existsSync(path.join(run, 'images', 'Candidate')), false);
const intake = read(path.join(run, 'intake-completed.json'));
const ownerPath = 'src/Security/samples/CustomPolicyProvider/Authorization/MinimumAgePolicyProvider.cs';
assert.equal(sha(path.join('C:\\src\\aspnetcore', ...ownerPath.split('/'))),
  intake.actualSelectedInputs.find(input => input.path === ownerPath).originalPhysicalSha256);
const result = {
  candidate: 'F126', actualSealedAt: new Date().toISOString(), actualBeforeShippingEditsAndAnyTiming: true,
  actualComparisonAuthorizations: 0, actualExistingOriginalHttpPassed: 7,
  actualOriginalWithFocusedRows: { passed: 7, expectedFailuresIndividuallyAudited: 2 },
  actualFullCurrentDefaultHttpPassed: 7, actualOriginalDefaultOwnerCharacterizationMatches: true,
  actualEachOwnerSelectedSourcePdbDocuments: 6, actualEachOwnerSelectedInputs: 26,
  actualEachOwnerDirectCultureCases: 50, actualEachOwnerRealRoutedRequests: 8,
  actualDefaultCharacterizationUsesDefaultSampleOwnerOnCommonBaselineFrameworkImage: true,
  actualDefaultFullGraphBuiltAndValidatedSeparately: true,
  actualSourceOwnerUnmodified: true, bindings,
  actualPreservedPreparationFailures: ['default-existing-functional-build-001: NETSDK1004 missing assets',
    'default-existing-functional-build-002: NETSDK1005 restore TFM incorrectly propagated to netstandard manifest task',
    'original-common-harness-build-001: NETSDK1004 new harness assets missing'],
  actualPreservedSupersededFourWarningBuild: 'original-common-harness-build-002',
  actualCorrectedCommonBuild: 'original-common-harness-build-003: exit0, zero warnings/errors'
};
fs.writeFileSync(path.join(run, 'baseline-completed.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
