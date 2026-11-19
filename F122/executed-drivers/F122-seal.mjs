import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F122');
const root = String.raw`C:\src\aspnetcore`;
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, ''));
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex').toUpperCase();
const write = (filename, value) => fs.writeFileSync(filename, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function git(args) {
  const result = spawnSync('git', ['--no-pager', ...args], { cwd: root, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
const intake = read(path.join(run, 'intake-completed.json'));
const budget = read(path.join(run, 'diagnostic-budget.json'));
assert.equal(budget.authorized.length, 0);
assert.equal(budget.permanentlyClosed, false);
assert.equal(git(['rev-parse', 'HEAD']), intake.actualBaseline);
assert.equal(git(['branch', '--show-current']), 'autoperf/F122-copy-on-write-enumerator');
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
const files = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(item =>
  item.isDirectory() ? files(path.join(directory, item.name)) : [path.join(directory, item.name)]);
const inputHashes = read(path.join(run, 'harness-source-hashes.json'));
assert.equal(inputHashes.length, 8);
for (const item of inputHashes) assert.equal(sha(path.join(run, 'harness', item.path)), item.sha256);
for (const item of intake.actualProtectedPrimaryInputs) assert.equal(sha(path.join(root, item.path)), item.sha256);
const commands = [];
for (const label of fs.readdirSync(path.join(run, 'validation')).sort()) {
  const directory = path.join(run, 'validation', label);
  const command = read(path.join(directory, 'command.json'));
  const result = read(path.join(directory, 'result.json'));
  assert.equal(result.exitCode, 0, 'Inspect and explicitly reconcile every failed preparation: ' + label);
  assert.equal(result.protectedPinUnchanged, true);
  assert.equal(sha(path.join(directory, 'command.ps1')), result.actualCommandSha256);
  assert.equal(sha(path.join(directory, 'stdout.txt')), result.stdoutSha256);
  assert.equal(sha(path.join(directory, 'stderr.txt')), result.stderrSha256);
  commands.push({ label, actualExitCode: result.exitCode, command: command.arguments,
    resultSha256: sha(path.join(directory, 'result.json')) });
}
const audits = [];
for (const [label, expected, focused] of [
  ['original-preservation-tests-001', 40, 12], ['default-existing-tests-001', 28, 0]
]) {
  const auditPath = 'validation/' + label + '/test-row-audit.json';
  const audit = read(path.join(run, ...auditPath.split('/')));
  const trxPath = 'validation/' + label + '/test-results/' + audit.actualReport;
  assert.equal(audit.actualPassed, expected);
  assert.equal(audit.actualPreservationRows, focused);
  assert.equal(audit.actualEveryConfiguredRowParsed, true);
  assert.equal(audit.actualFailed, 0);
  assert.equal(audit.actualSkipped, 0);
  assert.equal(audit.rows.length, expected);
  assert.ok(audit.rows.every(item => item.outcome === 'Passed'));
  assert.equal(sha(path.join(run, ...trxPath.split('/'))), audit.actualReportSha256);
  assert.equal(sha(path.join(run, 'F122-audit-trx.ps1')), audit.actualParserSha256);
  audits.push({ label, actualRows: expected, actualFocusedRows: focused, actualXmlParsed: true,
    auditPath, auditSha256: sha(path.join(run, ...auditPath.split('/'))),
    trxPath, trxSha256: audit.actualReportSha256 });
}
const roles = [];
for (const [variant, label, suffix] of [
  ['Original', 'original-characterize-001', 'original'],
  ['Default', 'default-characterize-001', 'current-default']
]) {
  const prefix = 'characterization-' + label;
  const role = read(path.join(run, prefix, 'verified-characterization.json'));
  assert.equal(role.actualPassed, true);
  assert.equal(role.actualTiming, false);
  assert.equal(role.actualRealHttpRequests, 48);
  assert.equal(role.actualPreparedPublicProfiles, 16);
  assert.equal(role.actualOtherConcreteGetEnumeratorOperands, 0,
    'A non-forwarding concrete caller requires investigation before selecting the planned no-candidate boundary.');
  assert.equal(role.actualCandidateConcretePatternProductionFitDemonstrated, false);
  for (const item of role.actualStateHashes) assert.equal(sha(path.join(run, ...item.path.split('/'))), item.sha256);
  const closurePath = 'closure-' + suffix + '.json';
  const sourcePath = 'source-inputs-' + suffix + '.json';
  const closure = read(path.join(run, closurePath));
  assert.equal(closure.files.length, 328);
  assert.equal(read(path.join(run, sourcePath)).sourceFiles.length, 11);
  for (const item of closure.files) {
    assert.equal(sha(path.join(run, 'consumer-' + suffix, ...item.path.split('/'))), item.sha256);
  }
  roles.push({ variant, actualRealHttpRequests: 48, actualPreparedPublicProfiles: 16,
    actualAdditionalEnumerationContracts: 10, actualOtherConcreteGetEnumeratorOperands: 0,
    characterizationPath: prefix + '/verified-characterization.json',
    characterizationSha256: sha(path.join(run, prefix, 'verified-characterization.json')),
    closurePath, closureSha256: sha(path.join(run, closurePath)),
    sourcePath, sourceSha256: sha(path.join(run, sourcePath)),
    stateHashes: role.actualStateHashes });
}
const focusedPath = 'src/Mvc/Mvc.Core/test/Infrastructure/CopyOnWriteListTest.cs';
const snapshot = 'preservation-source/' + focusedPath;
fs.mkdirSync(path.dirname(path.join(run, ...snapshot.split('/'))), { recursive: true });
fs.copyFileSync(path.join(root, ...focusedPath.split('/')), path.join(run, ...snapshot.split('/')), fs.constants.COPYFILE_EXCL);
const testAssembly = path.join(root, 'artifacts', 'bin', 'Microsoft.AspNetCore.Mvc.Core.Test', 'Release', 'net12.0');
const actualFocusedTestSource = {
  path: focusedPath, snapshot, sha256: sha(path.join(root, ...focusedPath.split('/'))),
  actualTestAssemblySha256: sha(path.join(testAssembly, 'Microsoft.AspNetCore.Mvc.Core.Test.dll')),
  actualTestPdbSha256: sha(path.join(testAssembly, 'Microsoft.AspNetCore.Mvc.Core.Test.pdb'))
};
const result = {
  candidate: 'F122', actualSealedAt: new Date().toISOString(),
  acceptancePlanSha256: sha(path.join(run, 'acceptance-plan.json')),
  profileDefinitionsSha256: sha(path.join(run, 'profile-definitions.json')),
  actualHarnessInputs: inputHashes, actualProtectedPrimaryInputs: intake.actualProtectedPrimaryInputs,
  actualShippingEdits: 0, actualCandidateSelected: false, actualPerformanceComparisonSelected: false,
  actualBoundedProductionFitGateMet: false, actualOriginalOnlyProfileJustified: true,
  actualNoConcretePatternCallerEstablishedInInspectedCohort: true,
  actualFullRepositoryOrExternalAbsenceClaimed: false,
  actualParsedIndividualPassingXmlRows: 68, actualFocusedTestSource, commands, audits, roles,
  actualCurrentDefaultAndOriginalPublicEnumerationContractsPass: true,
  actualFileState: files(path.join(run, 'harness')).filter(filename => /\.(cs|csproj)$/.test(filename))
    .map(filename => ({ path: path.relative(run, filename).replaceAll('\\', '/'), sha256: sha(filename) }))
};
write(path.join(run, 'baseline-validation.json'), result);
console.log(JSON.stringify({ candidate: 'F122', actualShippingEdits: 0,
  actualOriginalAndDefaultCharacterizationsPass: true, actualParsedPassingXmlRows: 68,
  actualNonForwardingConcreteCallOperandsInEachCohort: 0, actualOriginalOnlyProfileReady: true }, null, 2));
