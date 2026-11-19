import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F123');
const root = String.raw`C:\src\aspnetcore`;
const phase = process.argv[2];
assert.ok(['baseline', 'measurement'].includes(phase));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const relative = file => path.relative(run, file).replaceAll('\\', '/');
function git(args) {
  const result = spawnSync('git', ['--no-pager', ...args], { cwd: root, encoding: 'utf8', windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
const intake = read(path.join(run, 'intake-completed.json'));
const budget = read(path.join(run, 'diagnostic-budget.json'));
const plan = read(path.join(run, 'acceptance-plan.json'));
const profiles = read(path.join(run, 'profile-definitions.json'));
assert.equal(budget.authorized.length, 0);
assert.equal(budget.maximum, 3);
assert.equal(budget.permanentlyClosed, false);
assert.equal(sha(path.join(run, 'acceptance-plan.json')), budget.actualAcceptancePlanSha256);
assert.equal(sha(path.join(run, 'profile-definitions.json')), intake.actualProfileDefinitionsSha256);
assert.deepEqual(profiles.map(item => item.key), plan.profileKeys);
assert.equal(git(['rev-parse', 'HEAD']), intake.actualBaseline);
assert.equal(git(['branch', '--show-current']), 'autoperf/F123-copy-on-write-indexof');
for (const item of intake.actualProtectedPrimaryInputs) {
  assert.equal(sha(path.join(root, ...item.path.split('/'))), item.sha256);
}
const semanticKinds = [
  'actual-indexof-reference-null-isolation-contract', 'actual-indexof-object-equality-contract',
  'actual-indexof-equality-order-contract', 'actual-indexof-mutation-contract',
  'actual-indexof-source-disposal-contract', 'actual-indexof-failure-disposal-contract'
];
const kinds = ['actual-mvc-producer', 'actual-public-indexof-contract', 'actual-benchmark-method-contract',
  'actual-prepared-collection-lifetime', ...semanticKinds, 'characterization-completed'];
const roleDefinitions = [['Original', 'original-characterize-001'], ['Default', 'default-characterize-001']];
if (phase === 'measurement') roleDefinitions.push(['Candidate', 'candidate-characterize-001']);
let original;
let expectedSettings;
const roles = roleDefinitions.map(([variant, label]) => {
  assert.equal(read(path.join(run, 'validation', label, 'result.json')).exitCode, 0);
  const directory = path.join(run, 'characterization-' + label);
  const states = path.join(directory, 'states');
  const files = fs.readdirSync(states).sort();
  assert.equal(files.length, 105);
  const records = kind => files.filter(file => file.endsWith('-' + kind + '.json')).map(file => read(path.join(states, file)));
  const one = kind => {
    const values = records(kind);
    assert.equal(values.length, 1, kind);
    return values[0];
  };
  const suffix = variant === 'Default' ? 'current-default' : variant.toLowerCase();
  const closure = read(path.join(run, 'closure-' + suffix + '.json'));
  const image = new Map(closure.files.map(item => [item.path, item]));
  assert.equal(image.size, 328);
  assert.equal(one('verified-image').actualEntries, 328);
  assert.equal(one('verified-image').actualEveryEntryVerified, true);
  const sourceProof = one('selected-source-pdb-associations');
  assert.equal(sourceProof.actualSelectedInputs, 11);
  assert.equal(sourceProof.actualSelectedDocuments, 7);
  assert.equal(sourceProof.actualUniqueFrameworkDocuments, 7);
  assert.equal(sourceProof.actualSourceBuiltOwners, 3);
  assert.equal(sourceProof.actualCompleteCompilerProvenanceClaimed, false);
  const selected = read(path.join(run, 'source-inputs-' + suffix + '.json')).sourceFiles;
  for (const owner of sourceProof.ownerProofs) {
    assert.equal(owner.actualPeAndPdbMatch, true);
    assert.equal(owner.actualOwnerSha256, image.get(owner.actualOwner + '.dll').sha256);
    assert.equal(owner.actualPdbSha256, image.get(owner.actualOwner + '.pdb').sha256);
    for (const proof of owner.proofs) {
      assert.equal(proof.sha256, selected.find(item => item.path === proof.source && item.pdbDocumentRequired).sha256);
    }
  }
  for (const when of ['before', 'after']) {
    const runtime = one('runtime-characterize-' + when);
    assert.equal(runtime.framework, '.NET 12.0.0-alpha.1.26562.105');
    expectedSettings ??= runtime.settings;
    assert.deepEqual(runtime.settings, expectedSettings);
    assert.equal(runtime.settings.processPriority, 'Normal');
    assert.equal(runtime.settings.threadPriority, 'Normal');
    assert.equal(runtime.settings.affinity, 65535);
    for (const name of ['AutoPerf.Benchmarks', 'Microsoft.AspNetCore.Mvc.Core', 'Microsoft.AspNetCore.Mvc.RazorPages', 'Microsoft.AspNetCore.TestHost']) {
      assert.equal(runtime.assemblies.find(item => item.name === name).sha256, image.get(name + '.dll').sha256);
    }
  }
  const discovery = one('benchmarkdotnet-discovery-preflight');
  assert.equal(discovery.actualDiscoveredCases, 24);
  assert.equal(discovery.actualVariant, variant);
  assert.equal(discovery.actualTimingRunByThisPreflight, false);
  const properties = records('actual-public-property-contract');
  assert.equal(properties.length, 2);
  assert.deepEqual(properties.map(item => item.actualContext).sort(),
    ['Microsoft.AspNetCore.Mvc.ControllerContext', 'Microsoft.AspNetCore.Mvc.RazorPages.PageContext']);
  assert.ok(properties.every(item => item.actualProperty === 'ValueProviderFactories' && item.actualIListIndexOfAvailable));
  assert.equal(one('actual-indexof-interface-map').actualTargetMatchesOwnerPublicIndexOf, true);
  assert.equal(one('actual-indexof-interface-map').actualNormalFrameworkCallFrequencyClaimed, false);
  const observations = Object.fromEntries(kinds.map(kind => [kind, records(kind)]));
  for (const [kind, count] of [['actual-mvc-producer', 36], ['actual-public-indexof-contract', 24],
    ['actual-benchmark-method-contract', 12], ['actual-prepared-collection-lifetime', 12],
    ...semanticKinds.map(kind => [kind, 2]), ['characterization-completed', 1]]) {
    assert.equal(observations[kind].length, count, kind);
  }
  for (const profile of profiles) {
    const count = profile.factoryCount === 'default-five' ? 5 : profile.factoryCount;
    const index = profile.probe === 'first' ? 0 : profile.probe === 'last' ? count - 1 : -1;
    const producers = observations['actual-mvc-producer'].filter(item => item.actualProfile === profile.key);
    assert.equal(producers.length, 3);
    assert.equal(producers.filter(item => item.actualEnableActionInvokers).length, 1);
    for (const producer of producers) {
      assert.equal(producer.actualHttpRequests, 2);
      assert.equal(producer.actualConfiguredFactoryCount, count);
      assert.equal(producer.actualDefaultFiveVerified, profile.factoryCount === 'default-five');
      for (const field of ['actualDistinctPerRequestWrappers', 'actualSameUntouchedSourceArray',
        'actualSecondRequestHasNoCopy', 'actualNoValueProviderFactoriesPropertyAssignment',
        'actualReflectedFieldsObservedOnlyOutsideTiming']) assert.equal(producer[field], true);
      assert.equal(producer.actualCompiledRazorPageRequestClaimed, false);
      assert.equal(producer.observations.length, 2);
      for (const [position, observation] of producer.observations.entries()) {
        const copied = position === 0 && profile.copied;
        assert.equal(observation.actualRawQueryReadByParameterlessAction, copied ? 'true' : 'false');
        assert.equal(observation.actualInitialCopyNull, true);
        assert.equal(observation.actualFinalCopied, copied);
        assert.equal(observation.actualPrivateCopyIsExactList, copied);
        assert.equal(observation.actualFactoryCount, count);
        assert.equal(observation.actualFactoryTypes.length, count);
        assert.equal(observation.actualSourceUnchanged, true);
        assert.equal(observation.actualIndexOfExecutedThroughActualPublicProperty, true);
        assert.equal(observation.actualExpectedIndex, index);
        assert.equal(observation.actualIndex, index);
      }
    }
    const contracts = observations['actual-public-indexof-contract'].filter(item => item.actualProfile === profile.key);
    assert.equal(contracts.length, 2);
    assert.deepEqual(contracts.map(item => item.actualEnableActionInvokers), [false, true]);
    assert.ok(contracts.every(item => item.actualIndex === index && item.actualExpectedIndex === index
      && item.actualContains === (index >= 0) && item.actualCount === count && item.actualPublicIListIndexOfInvoked));
    const method = observations['actual-benchmark-method-contract'].find(item => item.actualProfile === profile.key);
    assert.equal(method.actualIndex, index);
    assert.equal(method.actualContains, index >= 0);
    assert.equal(method.actualMethodsInvoked, 2);
    assert.equal(method.actualTimingPerformed, false);
    const lifetime = observations['actual-prepared-collection-lifetime'].find(item => item.actualProfile === profile.key);
    assert.equal(lifetime.actualFactoryCount, count);
    assert.equal(lifetime.actualExpectedIndex, index);
    assert.equal(lifetime.actualExpectedContains, index >= 0);
    assert.ok(lifetime.actualHostAndHttpClientDisposedBeforeTiming && lifetime.actualCreationAndFirstWriteOutsideTiming
      && lifetime.actualStableIndexOfAndContains);
  }
  for (const kind of semanticKinds) {
    const flag = kind.includes('mutation') || kind.includes('source-disposal') ? 'actualMatch'
      : kind.includes('failure-disposal') ? 'actualEqualityFailure' : 'actualCopied';
    assert.deepEqual(observations[kind].map(item => item[flag]), [false, true]);
  }
  for (const item of observations['actual-indexof-reference-null-isolation-contract']) {
    assert.equal(item.actualFirstRemainingIndex, item.actualCopied ? 0 : 3);
    assert.equal(item.actualReplacementIndex, item.actualCopied ? -1 : 0);
    assert.equal(item.actualEmptyMissingIndex, -1);
    assert.equal(item.actualAllReferenceNullDuplicateChecksPassed, true);
  }
  for (const item of observations['actual-indexof-object-equality-contract']) {
    assert.ok(item.actualReferenceAndValueTypeObjectEqualityVerified && item.actualTypedEqualityWouldThrowDistinctProbeException);
  }
  for (const item of observations['actual-indexof-equality-order-contract']) {
    assert.equal(item.actualIndex, 1);
    assert.deepEqual(item.actualEqualityOrder, [1, 2]);
    assert.equal(item.actualLaterElementAndProbeReceiversNotEvaluated, true);
  }
  for (const item of observations['actual-indexof-mutation-contract']) {
    assert.equal(item.actualEqualityCalls, 1);
    assert.equal(item.actualMutationCount, 3);
    assert.equal(item.actualInvalidOperationException, !item.actualMatch);
    assert.equal(item.actualIndex, item.actualMatch ? 0 : null);
    assert.equal(item.actualSourceUnchanged, true);
  }
  for (const item of observations['actual-indexof-source-disposal-contract']) {
    assert.equal(item.actualIndex, item.actualMatch ? 1 : -1);
    assert.equal(item.actualGetEnumeratorCalls, 1);
    assert.equal(item.actualMoveNextCalls, item.actualMatch ? 2 : 3);
    assert.equal(item.actualCurrentCalls, 2);
    assert.equal(item.actualDisposeCalls, 1);
    assert.equal(item.actualCountAndIndexerReads, 0);
  }
  for (const item of observations['actual-indexof-failure-disposal-contract']) {
    assert.equal(item.actualEqualityCalls, item.actualEqualityFailure ? 1 : 0);
    assert.equal(item.actualSameFailurePropagated, true);
    assert.equal(item.actualMoveNextCalls, 1);
    assert.equal(item.actualCurrentCalls, 1);
    assert.equal(item.actualDisposeCalls, 1);
    assert.equal(item.actualCountAndIndexerReads, 0);
  }
  const completed = one('characterization-completed');
  assert.equal(completed.actualProfiles, 12);
  assert.equal(completed.actualPublicProducerContracts, 24);
  assert.equal(completed.actualBenchmarkMethodChecks, 24);
  assert.equal(completed.actualLegacySemanticContracts, 12);
  assert.equal(completed.actualApplicationIndexOfResultObservedInHttpResponse, true);
  assert.equal(completed.actualRequestThroughputOrTypicalCallFrequencyClaimed, false);
  if (original) assert.deepEqual(observations, original, 'Never measure mismatched source/IndexOf contracts.');
  else original = observations;
  const receipt = {
    candidate: 'F123', variant, actualPassed: true, actualRealHttpRequests: 72,
    actualPreparedPublicProfiles: 24, actualAdditionalIndexOfContracts: 12, actualTimingRun: false
  };
  const receiptPath = path.join(directory, 'verified-characterization.json');
  if (fs.existsSync(receiptPath)) assert.deepEqual(read(receiptPath), receipt);
  else write(receiptPath, receipt);
  return { ...receipt, label, stateHashes: files.map(file => ({
    path: relative(path.join(states, file)), sha256: sha(path.join(states, file))
  })) };
});
const auditDefinitions = [['original-preservation-tests-003', 40, 12], ['default-existing-tests-001', 28, 0]];
if (phase === 'measurement') auditDefinitions.push(['candidate-core-tests-001', 40, 12], ['candidate-pages-tests-001', 9, 0]);
const audits = auditDefinitions.map(([label, total, preservation]) => {
  const directory = path.join(run, 'validation', label);
  const auditPath = path.join(directory, 'test-row-audit.json');
  const audit = read(auditPath);
  assert.equal(audit.actualPassed, total);
  assert.equal(audit.actualPreservationRows, preservation);
  assert.equal(audit.actualFailed, 0);
  assert.equal(audit.actualSkipped, 0);
  assert.equal(audit.actualEveryConfiguredRowParsed, true);
  const trxPath = path.join(directory, 'test-results', audit.actualReport);
  assert.equal(sha(trxPath), audit.actualReportSha256);
  return { label, actualRows: total, actualPreservationRows: preservation, actualXmlParsed: true,
    auditPath: relative(auditPath), auditSha256: sha(auditPath), trxPath: relative(trxPath), trxSha256: sha(trxPath) };
});
const testPath = 'src/Mvc/Mvc.Core/test/Infrastructure/CopyOnWriteListTest.cs';
const testSource = path.join(root, ...testPath.split('/'));
const testSnapshot = path.join(run, 'preservation-source', ...testPath.split('/'));
let focused;
if (phase === 'baseline') {
  assert.equal(git(['diff', '--name-only']), '', 'Require untouched shipping code before baseline acceptance.');
  fs.mkdirSync(path.dirname(testSnapshot), { recursive: true });
  fs.copyFileSync(testSource, testSnapshot, fs.constants.COPYFILE_EXCL);
  const testImage = path.join(root, 'artifacts', 'bin', 'Microsoft.AspNetCore.Mvc.Core.Test', 'Release', 'net12.0');
  focused = { path: testPath, snapshot: relative(testSnapshot), sha256: sha(testSnapshot),
    actualUntouchedShippingTestAssemblySha256: sha(path.join(testImage, 'Microsoft.AspNetCore.Mvc.Core.Test.dll')),
    actualUntouchedShippingTestPdbSha256: sha(path.join(testImage, 'Microsoft.AspNetCore.Mvc.Core.Test.pdb')) };
} else {
  const baseline = read(path.join(run, 'baseline-validation.json'));
  assert.equal(baseline.actualSealedBeforeAnyShippingEdit, true);
  focused = baseline.actualFocusedTestSource;
  assert.equal(git(['diff', '--name-only']), 'src/Mvc/Mvc.Core/src/Infrastructure/CopyOnWriteList.cs');
  assert.equal(git(['diff', '--numstat']).split(/\s+/).slice(0, 2).join(' '), '15 0');
  assert.equal(git(['diff', '--check']), '');
  const names = label => read(path.join(run, 'validation', label, 'test-row-audit.json')).rows.map(row => row.testName).sort();
  assert.deepEqual(names('original-preservation-tests-003'), names('candidate-core-tests-001'));
  assert.equal(read(path.join(run, 'validation', 'candidate-source-whitespace-001', 'result.json')).exitCode, 0);
  const before = read(path.join(run, 'closure-original.json')).files;
  const after = read(path.join(run, 'closure-candidate.json')).files;
  assert.equal(before.length, 328);
  assert.deepEqual(before.map(item => item.path), after.map(item => item.path));
  assert.deepEqual(after.filter(item => item.sha256 !== before.find(old => old.path === item.path).sha256).map(item => item.path),
    ['Microsoft.AspNetCore.Mvc.Core.dll', 'Microsoft.AspNetCore.Mvc.Core.pdb']);
}
assert.equal(sha(testSource), focused.sha256);
assert.equal(sha(testSnapshot), focused.sha256);
for (const item of read(path.join(run, 'harness-source-hashes.json'))) {
  assert.equal(sha(path.join(run, 'harness', item.path)), item.sha256);
}
const result = {
  candidate: 'F123', actualCreated: new Date().toISOString(),
  actualSealedBeforeAnyShippingEdit: phase === 'baseline', actualBeforeAnyTimingAuthorization: true,
  actualFixtureEpoch: 1, actualPreviouslyConsumedFailedAuthorizations: [], actualSourceComparisonAuthorizations: 0,
  actualAcceptancePlanSha256: budget.actualAcceptancePlanSha256, acceptancePlanSha256: budget.actualAcceptancePlanSha256,
  profileDefinitionsSha256: intake.actualProfileDefinitionsSha256,
  actualSemanticallyIdenticalOriginalAndCurrentDefault: true,
  actualSemanticallyIdenticalObservedBoundaryAcrossAllThreeVariants: phase === 'measurement',
  actualGreenGreenPreservationNotSemanticBugRedGreen: true, actualCompleteCompilerProvenanceClaimed: false,
  actualApplicationThroughputMeasured: false, actualRealMvcHttpRequestsPerVariant: 72,
  actualControllerProducerModes: 2, actualDefaultFactoryCountVerified: 5, actualCompiledRazorPageRequestClaimed: false,
  actualHistoricalPassingIndividualXmlRows: audits.reduce((sum, item) => sum + item.actualRows, 0),
  actualSourceInsertions: phase === 'baseline' ? 0 : 15, actualSourceDeletions: 0,
  actualFrozenImageEntries: 328, actualFocusedTestSource: focused,
  actualEarlierPreparationCorrections: read(path.join(run, 'preparation-correction.json')),
  roles, audits, protectedFiles: intake.actualProtectedPrimaryInputs
};
if (phase === 'measurement') {
  result.baselineValidationSha256 = sha(path.join(run, 'baseline-validation.json'));
  result.actualOnlyChangedCandidateConsumerFiles = ['Microsoft.AspNetCore.Mvc.Core.dll', 'Microsoft.AspNetCore.Mvc.Core.pdb'];
}
write(path.join(run, phase === 'baseline' ? 'baseline-validation.json' : 'premeasurement-validation.json'), result);
console.log(JSON.stringify({ phase, actualCharacterizedVariants: roles.length, actualHttpRequestsPerVariant: 72,
  actualIndividuallyParsedPassingRows: result.actualHistoricalPassingIndividualXmlRows,
  actualShippingInsertions: result.actualSourceInsertions, actualTimingAuthorizations: 0 }, null, 2));
