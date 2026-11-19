import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F121');
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
assert.equal(budget.authorized.length, 0);
assert.equal(budget.maximum, 3);
assert.equal(budget.permanentlyClosed, false);
assert.equal(sha(path.join(run, 'acceptance-plan.json')), budget.actualAcceptancePlanSha256);
assert.equal(sha(path.join(run, 'profile-definitions.json')), budget.actualProfileDefinitionsSha256);
assert.equal(git(['rev-parse', 'HEAD']), intake.actualBaseline);
assert.equal(git(['branch', '--show-current']), 'autoperf/F121-copy-on-write-copyto');
for (const item of intake.actualProtectedPrimaryInputs) {
  assert.equal(sha(path.join(root, ...item.path.split('/'))), item.sha256);
}
const kinds = ['actual-mvc-producer', 'actual-prepared-public-contract', 'actual-null-reference-offset-contract',
  'actual-invalid-destination-contract', 'actual-source-interface-contract',
  'actual-prepared-collection-lifetime', 'characterization-completed'];
const roleDefinitions = [['Original', 'original-characterize-001'], ['Default', 'default-characterize-001']];
if (phase === 'measurement') roleDefinitions.push(['Candidate', 'candidate-characterize-001']);
let original;
const roles = roleDefinitions.map(([variant, label]) => {
  const directory = path.join(run, 'characterization-' + label);
  const receipt = read(path.join(directory, 'verified-characterization.json'));
  assert.equal(receipt.actualPassed, true);
  assert.equal(receipt.actualRealHttpRequests, 48);
  assert.equal(receipt.actualPreparedPublicProfiles, 16);
  assert.equal(read(path.join(run, 'validation', label, 'result.json')).exitCode, 0);
  const states = path.join(directory, 'states');
  const files = fs.readdirSync(states).sort();
  const observations = Object.fromEntries(kinds.map(kind => [kind,
    files.filter(file => file.endsWith('-' + kind + '.json')).map(file => read(path.join(states, file)))]));
  if (original) assert.deepEqual(observations, original, 'Do not optimize or measure mismatched producer/CopyTo contracts.');
  else original = observations;
  return {
    variant, label, actualRealHttpRequests: 48, actualPreparedPublicProfiles: 16,
    actualAdditionalCopyAndEnumerationContracts: 6,
    stateHashes: files.map(file => ({ path: relative(path.join(states, file)), sha256: sha(path.join(states, file)) }))
  };
});
const auditDefinitions = [['original-preservation-tests-001', 40, 12], ['default-existing-tests-001', 28, 0]];
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
  return {
    label, actualRows: total, actualPreservationRows: preservation, actualXmlParsed: true,
    auditPath: relative(auditPath), auditSha256: sha(auditPath), trxPath: relative(trxPath), trxSha256: sha(trxPath)
  };
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
  focused = {
    path: testPath, snapshot: relative(testSnapshot), sha256: sha(testSnapshot),
    actualUntouchedShippingTestAssemblySha256: sha(path.join(testImage, 'Microsoft.AspNetCore.Mvc.Core.Test.dll')),
    actualUntouchedShippingTestPdbSha256: sha(path.join(testImage, 'Microsoft.AspNetCore.Mvc.Core.Test.pdb'))
  };
} else {
  const baseline = read(path.join(run, 'baseline-validation.json'));
  assert.equal(baseline.actualSealedBeforeAnyShippingEdit, true);
  focused = baseline.actualFocusedTestSource;
  assert.equal(git(['diff', '--name-only']), 'src/Mvc/Mvc.Core/src/Infrastructure/CopyOnWriteList.cs');
  assert.equal(git(['diff', '--numstat']).split(/\s+/).slice(0, 2).join(' '), '10 0');
  assert.equal(git(['diff', '--check']), '');
  const names = label => read(path.join(run, 'validation', label, 'test-row-audit.json')).rows.map(row => row.testName).sort();
  assert.deepEqual(names('original-preservation-tests-001'), names('candidate-core-tests-001'));
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
  candidate: 'F121', actualCreated: new Date().toISOString(),
  actualSealedBeforeAnyShippingEdit: phase === 'baseline',
  actualBeforeAnyTimingAuthorization: true, actualFixtureEpoch: 1,
  actualPreviouslyConsumedFailedAuthorizations: [], actualSourceComparisonAuthorizations: 0,
  actualAcceptancePlanSha256: budget.actualAcceptancePlanSha256,
  acceptancePlanSha256: budget.actualAcceptancePlanSha256,
  profileDefinitionsSha256: budget.actualProfileDefinitionsSha256,
  actualSemanticallyIdenticalOriginalAndCurrentDefault: true,
  actualSemanticallyIdenticalObservedBoundaryAcrossAllThreeVariants: phase === 'measurement',
  actualGreenGreenPreservationNotSemanticBugRedGreen: true,
  actualCompleteCompilerProvenanceClaimed: false, actualApplicationThroughputMeasured: false,
  actualRealMvcHttpRequestsPerVariant: 48, actualControllerProducerModes: 2,
  actualDefaultFactoryCountVerified: 5, actualCompiledRazorPageRequestClaimed: false,
  actualHistoricalPassingIndividualXmlRows: audits.reduce((sum, item) => sum + item.actualRows, 0),
  actualSourceInsertions: phase === 'baseline' ? 0 : 10, actualSourceDeletions: 0,
  actualFrozenImageEntries: 328, actualFocusedTestSource: focused,
  actualEarlierPreparationCorrections: [
    'The first broad original Core.Test graph build stopped on the unrelated missing native ANCM DLL. The documented existing command-only UseIisNativeAssets=false, BuildNodeJS=false and StaticWebAssetsEnabled=false scope completed the managed graph and all forty selected original rows. No IIS/native or static-web-assets coverage is claimed.'
  ],
  roles, audits, protectedFiles: intake.actualProtectedPrimaryInputs
};
if (phase === 'measurement') {
  result.baselineValidationSha256 = sha(path.join(run, 'baseline-validation.json'));
  result.actualOnlyChangedCandidateConsumerFiles = ['Microsoft.AspNetCore.Mvc.Core.dll', 'Microsoft.AspNetCore.Mvc.Core.pdb'];
}
write(path.join(run, phase === 'baseline' ? 'baseline-validation.json' : 'premeasurement-validation.json'), result);
console.log(JSON.stringify({
  phase, actualCharacterizedVariants: roles.length, actualHttpRequestsPerVariant: 48,
  actualIndividuallyParsedPassingRows: result.actualHistoricalPassingIndividualXmlRows,
  actualShippingInsertions: result.actualSourceInsertions, actualTimingAuthorizations: 0
}, null, 2));
