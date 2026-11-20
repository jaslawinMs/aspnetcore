import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F126');
const root = 'C:\\src\\aspnetcore';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const relative = file => path.relative(run, file).replaceAll('\\', '/');
function hashes(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    assert.equal(entry.isSymbolicLink(), false);
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? hashes(file) : [{ path: relative(file), sha256: sha(file) }];
  });
}
const budget = read(path.join(run, 'diagnostic-budget.json'));
assert.equal(budget.authorizations.length, 0);
assert.equal(budget.permanentlyClosed, false);
assert.equal(budget.maximumComparisonAuthorizations, 3);
const intake = read(path.join(run, 'intake-completed.json'));
for (const input of intake.actualProtectedPrimaryInputs) assert.equal(sha(path.join(root, ...input.path.split('/'))), input.sha256);
const hotReload = read(path.join(run, 'hot-reload-verified.json'));
assert.equal(hotReload.actualNoRestart, true);
assert.equal(hotReload.actualSourceRestoredByteExactly, true);
assert.equal(hotReload.actualOwnedCleanupVerifiedAtStop, true);
assert.equal(hotReload.actualInPlaceUpdateBatches, 2);
assert.equal(read(path.join(run, 'candidate-correctness-completed.json')).actualNewRealRequestRowsIndividuallyRedThenGreen, 2);
assert.equal(read(path.join(run, 'validation', 'candidate-whitespace-check-001', 'result.json')).exitCode, 0);
const audits = [
  ['original-existing-functional-tests-001', 7, 0], ['original-cache-contract-tests-001', 9, 2],
  ['default-existing-functional-tests-001', 7, 0], ['candidate-functional-tests-001', 9, 0]
].map(([label, total, failures]) => {
  const file = path.join(run, 'validation', label, 'individual-results.audit.json');
  const value = read(file);
  const trx = path.join(run, 'validation', label, 'test-results', 'results.trx');
  assert.equal(value.actualParsedRows, total);
  assert.equal(value.actualExpectedOriginalCacheContractFailures, failures);
  assert.equal(value.actualSkippedOrUnexpectedFailures, 0);
  assert.equal(value.actualXmlSha256, sha(trx));
  return { label, actualRows: total, actualPassed: total - failures, actualExpectedOriginalFailures: failures,
    auditPath: relative(file), auditSha256: sha(file), trxPath: relative(trx), trxSha256: sha(trx) };
});
const roles = ['Original', 'Default', 'Candidate'].map(role => {
  const image = path.join(run, 'images', role);
  const closure = read(path.join(image, 'closure.json'));
  for (const file of closure.files) assert.equal(sha(path.join(image, 'image', ...file.path.split('/'))), file.sha256);
  const source = read(path.join(image, 'source-inputs.json'));
  for (const file of source.sourceFiles) {
    assert.equal(sha(path.join(image, 'source', ...file.path.split('/'))), file.sha256);
    if (role === 'Candidate') assert.equal(sha(path.join(root, ...file.path.split('/'))), file.sha256);
  }
  const state = path.join(run, 'characterization', `${role.toLowerCase()}-characterization-001`, 'state');
  return { role, actualImageEntries: closure.files.length, actualSelectedInputs: source.sourceFiles.length,
    closurePath: relative(path.join(image, 'closure.json')), closureSha256: sha(path.join(image, 'closure.json')),
    sourceInputsPath: relative(path.join(image, 'source-inputs.json')), sourceInputsSha256: sha(path.join(image, 'source-inputs.json')),
    stateHashes: hashes(state) };
});
const changed = spawnSync('git', ['--no-pager', 'diff', '--name-only'], { cwd: root, encoding: 'utf8', windowsHide: true });
assert.equal(changed.status, 0, changed.stderr);
assert.deepEqual(changed.stdout.trim().split(/\r?\n/).sort(), [
  'src/Security/samples/CustomPolicyProvider/Authorization/MinimumAgePolicyProvider.cs',
  'src/Security/samples/CustomPolicyProvider/readme.md',
  'src/Security/test/AuthSamples.FunctionalTests/CustomPolicyProviderTests.cs'
]);
const result = {
  candidate: 'F126', actualSealedAt: new Date().toISOString(), actualTimingAuthorizationsAtSeal: 0,
  actualExistingBehaviorAndDirectControlSemanticsPreserved: true,
  actualParsedXmlExecutions: audits.reduce((sum, item) => sum + item.actualRows, 0),
  actualParsedPassingXmlExecutions: audits.reduce((sum, item) => sum + item.actualPassed, 0),
  actualIndividuallyProvedExpectedOriginalFailures: 2, actualNewRowsIndividuallyRedThenGreen: 2,
  actualHotReloadSamePidNoRestartControllerAttributeDeltaVerified: true,
  actualProtectedFiles: intake.actualProtectedPrimaryInputs, roles, audits,
  acceptancePlanSha256: sha(path.join(run, 'acceptance-plan.json')),
  baselineValidationSha256: sha(path.join(run, 'baseline-completed.json')),
  candidateCorrectnessSha256: sha(path.join(run, 'candidate-correctness-completed.json')),
  hotReloadVerificationSha256: sha(path.join(run, 'hot-reload-verified.json')),
  profileDefinitionsSha256: sha(path.join(run, 'harness', 'profile-definitions.json')),
  commonInputManifestSha256: sha(path.join(run, 'common-inputs-prepared.json'))
};
fs.writeFileSync(path.join(run, 'premeasurement-validation.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualRoles: roles.length, actualXmlExecutions: result.actualParsedXmlExecutions,
  actualPassingRows: result.actualParsedPassingXmlExecutions, actualOriginalExpectedFailures: 2,
  actualNewRowsIndividuallyRedThenGreen: 2, actualNoRestartAttributeDelta: true, actualAuthorizationsConsumed: 0 }, null, 2));
