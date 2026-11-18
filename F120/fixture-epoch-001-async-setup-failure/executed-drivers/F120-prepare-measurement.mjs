import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F120');
const root = 'C:\\src\\aspnetcore';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const relative = file => path.relative(run, file).replaceAll('\\', '/');
const budget = read(path.join(run, 'diagnostic-budget.json'));
assert.equal(budget.authorized.length, 0);
assert.equal(budget.maximum, 3);
assert.equal(budget.permanentlyClosed, false);
assert.equal(sha(path.join(run, 'acceptance-plan.json')), budget.actualAcceptancePlanSha256);
const baseline = read(path.join(run, 'baseline-validation.json'));
assert.equal(baseline.actualSealedBeforeAnyShippingEdit, true);
assert.equal(baseline.actualSemanticallyIdenticalOriginalAndCurrentDefault, true);
assert.equal(baseline.actualAcceptancePlanSha256, budget.actualAcceptancePlanSha256);
const kinds = ['actual-mvc-producer', 'actual-prepared-public-contract', 'actual-null-and-reference-contract',
  'actual-object-equality-contract', 'actual-reentrant-enumeration-contract', 'actual-source-interface-contract',
  'actual-prepared-collection-lifetime', 'characterization-completed'];
let original;
const roles = [['Original', 'original-characterize-002'], ['Default', 'default-characterize-001'],
  ['Candidate', 'candidate-characterize-001']].map(([variant, label]) => {
  const directory = path.join(run, 'characterization-' + label);
  const receipt = read(path.join(directory, 'verified-characterization.json'));
  assert.equal(receipt.actualPassed, true);
  assert.equal(receipt.actualRealHttpRequests, 48);
  assert.equal(receipt.actualPreparedPublicProfiles, 16);
  assert.equal(receipt.actualAdditionalEqualityAndEnumerationContracts, 6);
  assert.equal(read(path.join(run, 'validation', label, 'result.json')).exitCode, 0);
  const states = path.join(directory, 'states');
  const files = fs.readdirSync(states).sort();
  const observations = Object.fromEntries(kinds.map(kind => [kind,
    files.filter(file => file.endsWith('-' + kind + '.json')).map(file => read(path.join(states, file)))]));
  if (original) assert.deepEqual(observations, original, 'Do not time a semantically mismatched collection/producer boundary.');
  else original = observations;

  return { variant, label, actualRealHttpRequests: 48, actualPreparedPublicProfiles: 16,
    actualAdditionalEqualityAndEnumerationContracts: 6,
    stateHashes: files.map(file => ({ path: relative(path.join(states, file)), sha256: sha(path.join(states, file)) })) };
});
const audits = [
  ['original-existing-tests-001', 28, 0], ['default-existing-tests-001', 28, 0],
  ['original-preservation-tests-002', 35, 7], ['candidate-core-tests-001', 35, 7],
  ['candidate-pages-tests-001', 9, 0]
].map(([label, total, preservation]) => {
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
function names(label) {
  return read(path.join(run, 'validation', label, 'test-row-audit.json')).rows.map(row => row.testName).sort();
}
assert.deepEqual(names('original-preservation-tests-002'), names('candidate-core-tests-001'));
assert.equal(read(path.join(run, 'validation', 'candidate-source-whitespace-001', 'result.json')).exitCode, 0);
const test = baseline.actualFocusedTestSource;
assert.equal(sha(path.join(root, ...test.path.split('/'))), test.sha256);
assert.equal(sha(path.join(run, ...test.snapshot.split('/'))), test.sha256);
for (const item of read(path.join(run, 'harness-source-hashes.json'))) {
  assert.equal(sha(path.join(run, 'harness', item.path)), item.sha256);
}
const intake = read(path.join(run, 'intake-completed.json'));
for (const item of intake.protectedFiles) assert.equal(sha(path.join(root, ...item.path.split('/'))), item.sha256);
function git(args) {
  const result = spawnSync('git', ['--no-pager', ...args], { cwd: root, encoding: 'utf8', windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
assert.equal(git(['rev-parse', 'HEAD']), intake.baseline);
assert.equal(git(['branch', '--show-current']), intake.branch);
assert.equal(git(['diff', '--name-only']), 'src/Mvc/Mvc.Core/src/Infrastructure/CopyOnWriteList.cs');
assert.equal(git(['diff', '--numstat']).split(/\s+/).slice(0, 2).join(' '), '13 0');
assert.equal(git(['diff', '--check']), '');
const sourceBefore = read(path.join(run, 'source-inputs-original.json')).sourceFiles;
const sourceAfter = read(path.join(run, 'source-inputs-candidate.json')).sourceFiles;
assert.equal(sourceBefore.length, 10);
assert.equal(sourceAfter.length, 10);
assert.deepEqual(sourceAfter.filter(item => item.sha256 !== sourceBefore.find(old => old.path === item.path).sha256).map(item => item.path),
  ['src/Mvc/Mvc.Core/src/Infrastructure/CopyOnWriteList.cs']);
const before = read(path.join(run, 'closure-original.json')).files;
const after = read(path.join(run, 'closure-candidate.json')).files;
assert.equal(before.length, 328);
assert.deepEqual(before.map(item => item.path), after.map(item => item.path));
const changed = after.filter(item => item.sha256 !== before.find(old => old.path === item.path).sha256).map(item => item.path);
assert.deepEqual(changed, ['Microsoft.AspNetCore.Mvc.Core.dll', 'Microsoft.AspNetCore.Mvc.Core.pdb']);
const dependencyAudit = read(path.join(run, 'binary-dependency-preflight.json'));
assert.equal(dependencyAudit.actualMissingCount, 0);
write(path.join(run, 'diagnostic-budget-before-premeasurement-seal.json'), budget);
const declaration = {
  candidate: 'F120', actualBeforeAnyTimingAuthorization: true, actualCreated: new Date().toISOString(),
  acceptancePlanSha256: sha(path.join(run, 'acceptance-plan.json')),
  baselineValidationSha256: sha(path.join(run, 'baseline-validation.json')),
  actualSemanticallyIdenticalObservedBoundaryAcrossAllThreeVariants: true,
  actualCompleteCompilerProvenanceClaimed: false, actualApplicationThroughputMeasured: false,
  actualPerformancePreservationIsGreenGreenNotSemanticBugRedGreen: true,
  actualRealMvcHttpRequestsPerVariant: 48, actualControllerProducerModes: 2,
  actualCompiledRazorPageRequestClaimed: false, actualExistingManagedPageProducerRows: 9,
  actualHistoricalPassingIndividualXmlRows: audits.reduce((sum, item) => sum + item.actualRows, 0),
  actualSourceInsertions: 13, actualSourceDeletions: 0,
  actualFrozenImageEntries: 328, actualOnlyChangedCandidateConsumerFiles: changed,
  actualPreparedCollectionTimedRatherThanFirstWriteOrRequest: true,
  actualPrimaryAndOrdinaryPathQualificationNotRetuned: true,
  actualFocusedTestSource: test, roles, audits, protectedFiles: intake.protectedFiles
};
write(path.join(run, 'premeasurement-validation.json'), declaration);
console.log(JSON.stringify({ actualCharacterizedVariants: 3, actualHttpRequestsPerVariant: 48,
  actualPreparedProfilesPerVariant: 16, actualAllIndividualXmlRows: declaration.actualHistoricalPassingIndividualXmlRows,
  actualIdenticalCommonImageEntries: before.length - changed.length, actualTimingAuthorizations: 0 }, null, 2));
