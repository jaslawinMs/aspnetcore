import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const run = path.join(path.dirname(fileURLToPath(import.meta.url)), 'autoperf-runs', 'F120');
const root = 'C:\\src\\aspnetcore';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const relative = file => path.relative(run, file).replaceAll('\\', '/');
const budget = read(path.join(run, 'diagnostic-budget.json'));
assert.equal(budget.authorized.length, 0);
assert.equal(budget.maximum, 3);
assert.equal(budget.permanentlyClosed, false);
assert.equal(hash(path.join(run, 'acceptance-plan.json')), budget.actualAcceptancePlanSha256);
const intake = read(path.join(run, 'intake-completed.json'));
for (const item of intake.protectedFiles) assert.equal(hash(path.join(root, ...item.path.split('/'))), item.sha256);
const git = spawnSync('git', ['--no-pager', 'diff', '--name-only'], { cwd: root, encoding: 'utf8', windowsHide: true });
assert.equal(git.status, 0);
assert.equal(git.stdout.trim(), '', 'The actual original/default baseline must precede every shipping edit.');
const kinds = ['actual-mvc-producer', 'actual-prepared-public-contract', 'actual-null-and-reference-contract',
  'actual-object-equality-contract', 'actual-reentrant-enumeration-contract', 'actual-source-interface-contract',
  'actual-prepared-collection-lifetime', 'characterization-completed'];
let original;
const roles = [['Original', 'original-characterize-002'], ['Default', 'default-characterize-001']].map(([variant, label]) => {
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
  if (original) assert.deepEqual(observations, original, 'Do not optimize against a mismatched current-default boundary.');
  else original = observations;

  return { variant, label, actualRealHttpRequests: 48, actualPreparedPublicProfiles: 16,
    stateHashes: files.map(file => ({ path: relative(path.join(states, file)), sha256: hash(path.join(states, file)) })) };
});
const audits = [
  ['original-existing-tests-001', 28, 0],
  ['default-existing-tests-001', 28, 0],
  ['original-preservation-tests-002', 35, 7]
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
  assert.equal(hash(trxPath), audit.actualReportSha256);

  return { label, actualRows: total, actualPreservationRows: preservation, actualXmlParsed: true,
    auditPath: relative(auditPath), auditSha256: hash(auditPath), trxPath: relative(trxPath), trxSha256: hash(trxPath) };
});
const testPath = 'src/Mvc/Mvc.Core/test/Infrastructure/CopyOnWriteListTest.cs';
const testSource = path.join(root, ...testPath.split('/'));
const testSnapshot = path.join(run, 'preservation-source', ...testPath.split('/'));
fs.mkdirSync(path.dirname(testSnapshot), { recursive: true });
fs.copyFileSync(testSource, testSnapshot, fs.constants.COPYFILE_EXCL);
assert.equal(hash(testSource), hash(testSnapshot));
const testImage = path.join(root, 'artifacts', 'bin', 'Microsoft.AspNetCore.Mvc.Core.Test', 'Release', 'net12.0');
const result = {
  candidate: 'F120', actualSealedBeforeAnyShippingEdit: true, actualSourceComparisonAuthorizations: 0,
  actualAcceptancePlanSha256: budget.actualAcceptancePlanSha256,
  actualSemanticallyIdenticalOriginalAndCurrentDefault: true,
  actualRealMvcHttpRequestsPerVariant: 48, actualControllerProducerModes: 2,
  actualDefaultFactoryCountVerified: 5, actualCompiledRazorPageRequestClaimed: false,
  actualGreenGreenPreservationNotSemanticBugRedGreen: true,
  actualFocusedTestSource: { path: testPath, snapshot: relative(testSnapshot), sha256: hash(testSnapshot),
    actualUntouchedShippingTestAssemblySha256: hash(path.join(testImage, 'Microsoft.AspNetCore.Mvc.Core.Test.dll')),
    actualUntouchedShippingTestPdbSha256: hash(path.join(testImage, 'Microsoft.AspNetCore.Mvc.Core.Test.pdb')) },
  actualEarlierFixtureCorrections: [
    'Default Core.Test and TestHost initially lacked restore assets; exact failure, restore and clean rebuild commands are retained.',
    'The first default restore could not reach its metadata feed. A command-only restore property was used; no NuGet.config or SDK pin changed.',
    'The first new test build correctly rejected direct Contains assertions under xUnit2017. Explicit result locals preserve the actual method-under-test boundary.',
    'The first completed new test run was 34/35 because Moq recursively audited the returned enumerator before its interactions were marked verified. Explicit MoveNext/Current/Dispose verifications fixed the fixture; all seven final rows then passed on untouched shipping code.',
    'The first untimed fixture lacked Hosting.Server.Abstractions and failed before an HTTP request. Its complete images and eight inputs are archived; the corrected complete source-built dependency image passed every producer and characterization contract.'
  ],
  roles, audits, actualCreated: new Date().toISOString()
};
write(path.join(run, 'baseline-validation.json'), result);
console.log(JSON.stringify({ actualOriginalRows: 35, actualCurrentDefaultRows: 28,
  actualIndividuallyParsedHistoricalPassingRows: 91, actualFaithfulMvcRequestsPerVariant: 48,
  actualIdenticalObservedBoundary: true, actualShippingEdits: 0, actualTimingAuthorizations: 0 }, null, 2));
