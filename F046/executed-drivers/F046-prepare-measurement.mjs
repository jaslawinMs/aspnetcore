import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F046');
const root = 'C:\\src\\aspnetcore';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
assert.equal(read(path.join(run, 'diagnostic-budget.json')).authorized.length, 0);
const expected = [
  ['Original', 'original-native-characterization-001'],
  ['Default', 'default-native-characterization-001'],
  ['Candidate', 'candidate-native-characterization-001']
];
let baseline;
const roles = expected.map(([variant, label]) => {
  const directory = path.join(run, 'characterization-' + label);
  const receipt = read(path.join(directory, 'verified-characterization.json'));
  assert.equal(receipt.actualPassed, true);
  assert.equal(receipt.actualNativeProducerProfiles, 6);
  assert.equal(receipt.actualSourcePePdbAssociations, 7);
  assert.equal(read(path.join(run, 'validation', label, 'result.json')).exitCode, 0);
  const states = path.join(directory, 'states');
  const records = fs.readdirSync(states).map(file => ({ file, data: read(path.join(states, file)) }));
  const select = kind => records.filter(item => item.file.endsWith('-' + kind + '.json')).map(item => item.data);
  const contracts = select('actual-shared-owner-contracts').sort((a, b) => a.actualOwner.localeCompare(b.actualOwner));
  assert.equal(contracts.length, 2);
  assert.ok(contracts.every(item => item.actualPassed.length === 10));
  const edges = select('compiled-shipping-owner-append-references');
  const http = edges.find(item => item.actualOwner === 'Microsoft.AspNetCore.Server.HttpSys');
  const iis = edges.find(item => item.actualOwner === 'Microsoft.AspNetCore.Server.IIS');
  assert.equal(http.actualComputeHeaderCalls, 1);
  assert.equal(http.actualReferences.length, 1);
  assert.equal(http.actualReferences[0].callerType, 'Microsoft.AspNetCore.Server.HttpSys.Response');
  assert.equal(http.actualReferences[0].callerMethod, 'ComputeHeaders');
  assert.equal(http.actualReferences[0].actualCall, true);
  assert.equal(iis.actualReferences.length, 0);
  const native = select('actual-native-connection-producer').map(item => {
    const { HeaderOwner, ...state } = item.actualManaged;
    assert.ok(HeaderOwner.endsWith('Microsoft.AspNetCore.Server.HttpSys.dll'));
    assert.equal(item.actualProducerOrHeaderCollectionSubstituted, false);
    assert.equal(item.actualIsThroughputMeasurement, false);
    return { profile: item.profile, request: item.actualRequestVersion, requestClose: item.actualRequestClose,
      actualExpectedInstanceAppend: item.actualExpectedInstanceAppend, state, status: item.actualClientStatus,
      version: item.actualClientVersion, connection: item.actualClientConnection,
      bodyBytes: item.actualClientBodyBytes, contentLength: item.actualClientContentLength };
  }).sort((a, b) => a.profile.localeCompare(b.profile));
  assert.equal(native.length, 6);
  assert.equal(native.filter(item => item.actualExpectedInstanceAppend).length, 4);
  assert.equal(select('actual-listener-disposed')[0].actualRemainingRequests, 0);
  const fresh = select('fresh-append-boundary-characterized').sort((a, b) =>
    (a.profile + a.method).localeCompare(b.profile + b.method));
  assert.equal(fresh.length, 12);
  const normalized = { contracts, native, fresh };
  if (baseline) {
    assert.deepEqual(normalized, baseline, 'Do not time a semantically mismatched source/default boundary.');
  } else {
    baseline = normalized;
  }
  return { variant, label, actualContractsPerOwner: 10, actualOwners: 2, actualNativeProfiles: 6,
    actualProducerAppendProfiles: 4, actualProducerBypassControls: 2, actualFreshBoundaries: 12,
    actualHttpSysCompiledAppendCalls: 1, actualIisCompiledAppendReferences: 0,
    stateHashes: records.map(item => ({ path: path.relative(run, path.join(states, item.file)).replaceAll('\\', '/'),
      sha256: sha(path.join(states, item.file)) })) };
});
const audits = [];
for (const kind of ['unit', 'functional']) {
  let names;
  for (const variant of ['original', 'candidate']) {
    const file = path.join(run, variant + '-' + kind + '-trx-audit.json');
    const audit = read(file);
    assert.equal(audit.actualPassed, kind === 'unit' ? 10 : 5);
    assert.equal(audit.actualSkippedOrFailed, 0);
    const actual = audit.actualRows.map(item => item.name).sort();
    if (names) {
      assert.deepEqual(actual, names);
    } else {
      names = actual;
    }
    audits.push({ variant, kind, actualRows: audit.actualPassed, actualXmlParsed: audit.actualXmlParsed,
      auditPath: path.relative(run, file).replaceAll('\\', '/'), auditSha256: sha(file),
      trxPath: path.relative(run, audit.actualTrxPath).replaceAll('\\', '/'), trxSha256: sha(audit.actualTrxPath) });
  }
}
assert.equal(read(path.join(run, 'validation', 'candidate-source-whitespace-001', 'result.json')).exitCode, 0);
const intake = read(path.join(run, 'intake-completed.json'));
for (const item of intake.protectedFiles) {
  assert.equal(sha(path.join(root, item.path)), item.sha256);
}
const git = spawnSync('git', ['--no-pager', 'diff', '--name-only'], { cwd: root, encoding: 'utf8' });
assert.equal(git.status, 0);
assert.equal(git.stdout.trim(), 'src/Shared/HttpSys/RequestProcessing/HeaderCollection.cs');
const budgetPath = path.join(run, 'diagnostic-budget.json');
write(path.join(run, 'diagnostic-budget-before-premeasurement-seal.json'), read(budgetPath));
const declaration = {
  candidate: 'F046', actualBeforeAnyTimingAuthorization: true, actualCreated: new Date().toISOString(),
  acceptancePlanSha256: sha(path.join(run, 'acceptance-plan.json')),
  actualSemanticallyIdenticalObservedBoundaryAcrossAllThreeVariants: true,
  actualObservedNativeThroughput: false, actualCompleteCompilerProvenanceClaimed: false,
  roles, audits, protectedFiles: intake.protectedFiles
};
write(path.join(run, 'premeasurement-validation.json'), declaration);
console.log(JSON.stringify({ actualCharacterizedVariants: 3, actualContractsPerVariant: 20,
  actualNativeProfilesPerVariant: 6, actualFreshBoundariesPerVariant: 12,
  actualOwningTestRowsPerSource: 15, actualAllIndividualXmlRowsPassed: true,
  actualByteExactAcceptancePlanSealed: declaration.acceptancePlanSha256, actualTimingAuthorizations: 0 }, null, 2));
