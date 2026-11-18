import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F047');
const root = 'C:\\src\\aspnetcore';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(read(path.join(run, 'diagnostic-budget.json')).authorized.length, 0);
const normalize = value => {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, next]) =>
    [key, key === 'PrerenderId' && next !== null ? '<per-render-id>' : normalize(next)]));
  return value;
};
let baseline;
const roles = ['Original', 'Default', 'Candidate'].map(variant => {
  const label = (variant === 'Default' ? 'default' : variant.toLowerCase()) + '-characterize-001';
  const directory = path.join(run, 'characterization-' + label);
  assert.equal(read(path.join(directory, 'verified-characterization.json')).actualPassed, true);
  assert.equal(read(path.join(run, 'validation', label, 'result.json')).exitCode, 0);
  const states = path.join(directory, 'states');
  const files = fs.readdirSync(states);
  const select = kind => files.filter(file => file.endsWith('-' + kind + '.json')).map(file => read(path.join(states, file)));
  const observed = normalize({
    boundaries: select('actual-renderer-boundary-characterized'),
    nested: select('actual-nested-fragment-characterized'),
    invalid: select('actual-invalid-delegate-contract'),
    disabled: select('actual-disabled-fragment-contract'),
    dictionary: select('actual-runtime-dictionary-contract')
  });
  assert.equal(observed.boundaries.length, 24);
  assert.equal(observed.invalid.length, 12);
  assert.equal(observed.disabled.length, 3);
  assert.equal(observed.nested.length, 1);
  if (baseline) assert.deepEqual(observed, baseline, 'Do not time a semantically mismatched renderer boundary.');
  else baseline = observed;
  assert.equal(select('selected-source-pdb-associations')[0].actualUniqueFrameworkDocuments, 8);
  return { variant, label, actualRendererProfiles: 24, actualInvalidDelegateCases: 12,
    actualDisabledFragmentFailures: 3, actualNestedFragmentCases: 1,
    stateHashes: files.map(file => ({ path: path.relative(run, path.join(states, file)).replaceAll('\\', '/'),
      sha256: sha(path.join(states, file)) })) };
});
const audits = [
  ['original', 'existing', 'original-existing-trx-audit.json', 98],
  ['original', 'multiple-fragments', 'original-multiple-fragments-trx-audit.json', 3],
  ['default', 'existing', 'default-existing-trx-audit.json', 98],
  ['candidate', 'all', 'candidate-trx-audit.json', 101],
  ['candidate', 'browser', 'selenium-candidate-001/all-trx-rows.json', 14]
].map(([variant, kind, file, count]) => {
  const auditPath = path.join(run, ...file.split('/'));
  const audit = read(auditPath);
  assert.equal(audit.actualPassed, count);
  assert.equal(audit.actualSkippedOrFailed, 0);
  assert.equal(audit.actualAllIndividualParameterizedRowsChecked, true);
  return { variant, kind, actualRows: count, actualXmlParsed: true, auditPath: file, auditSha256: sha(auditPath),
    trxPath: path.relative(run, audit.actualTrxPath).replaceAll('\\', '/'), trxSha256: sha(audit.actualTrxPath) };
});
const originalNames = [...read(path.join(run, 'original-existing-trx-audit.json')).actualRows,
  ...read(path.join(run, 'original-multiple-fragments-trx-audit.json')).actualRows].map(row => row.name).sort();
assert.deepEqual(originalNames, read(path.join(run, 'candidate-trx-audit.json')).actualRows.map(row => row.name).sort());
const samples = ['original', 'candidate'].map(variant => {
  const file = path.join(run, 'sample-' + variant, 'browser-result.json');
  const sample = read(file);
  assert.equal(sample.actualPassed, true);
  assert.equal(sample.actualCases.length, 6);
  assert.ok(sample.actualCases.every(item => item.actualPassed && item.actualRealClickCount === 1));
  assert.equal(sample.actualCleanup.actualAllCapturedOwnedHelpersGone, true);
  const closure = read(path.join(run, 'closure-' + variant + '.json'));
  assert.equal(sample.expectedOwnerSha256, closure.files.find(item => item.path === 'Microsoft.AspNetCore.Components.Endpoints.dll').sha256);
  return { variant, actualBrowserCases: 6, actualRealClicks: 6,
    path: path.relative(run, file).replaceAll('\\', '/'), sha256: sha(file) };
});
assert.equal(read(path.join(run, 'selenium-candidate-001', 'verified-result.json')).actualAllCapturedOwnedHelpersGone, true);
assert.equal(read(path.join(run, 'validation', 'candidate-source-whitespace-001', 'result.json')).exitCode, 0);
const intake = read(path.join(run, 'intake-completed.json'));
for (const item of intake.protectedFiles) assert.equal(sha(path.join(root, item.path)), item.sha256);
const git = spawnSync('git', ['--no-pager', 'diff', '--name-only'], { cwd: root, encoding: 'utf8' });
assert.equal(git.status, 0);
assert.deepEqual(git.stdout.trim().split(/\r?\n/).sort(), [
  'src/Components/Endpoints/src/Rendering/SSRRenderModeBoundary.cs',
  'src/Components/Endpoints/test/EndpointHtmlRendererTest.cs'
]);
write(path.join(run, 'diagnostic-budget-before-premeasurement-seal.json'), read(path.join(run, 'diagnostic-budget.json')));
const declaration = {
  candidate: 'F047', actualBeforeAnyTimingAuthorization: true, actualCreated: new Date().toISOString(),
  acceptancePlanSha256: sha(path.join(run, 'acceptance-plan.json')),
  actualSemanticallyIdenticalObservedBoundaryAcrossAllThreeVariants: true,
  actualCompleteCompilerProvenanceClaimed: false, actualApplicationThroughputMeasured: false,
  actualPerformancePreservationIsGreenGreenNotSemanticBugRedGreen: true,
  actualEarlierFixtureLimitation: 'The first new Auto row used the pre-existing unsupported explicit root-component-result Auto path and failed before the assertion. The final test uses the real nested render-mode producer, matching the canonical per-page sample; all three rows passed on untouched shipping code.',
  actualEarlierPostparserCorrection: 'The managed original characterization passed; the first controller audit overmatched the separate runtime-dictionary-contract record. Its filename selector was narrowed and the same completed run was audited without relaunch.',
  roles, audits, samples, protectedFiles: intake.protectedFiles
};
write(path.join(run, 'premeasurement-validation.json'), declaration);
console.log(JSON.stringify({ actualCharacterizedVariants: 3, actualRendererProfilesPerVariant: 24,
  actualOriginalOwningRows: 101, actualCandidateOwningRows: 101, actualExistingBrowserRows: 14,
  actualCanonicalBrowserCasesPerSource: 6, actualTimingAuthorizations: 0 }, null, 2));
