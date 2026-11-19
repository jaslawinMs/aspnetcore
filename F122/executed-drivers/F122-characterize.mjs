import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F122');
const [variant, label] = process.argv.slice(2);
assert.ok(['Original', 'Default'].includes(variant));
assert.match(label ?? '', /^[a-z0-9-]+$/);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex').toUpperCase();
const budget = read(path.join(run, 'diagnostic-budget.json'));
assert.equal(budget.permanentlyClosed, false);
assert.ok(budget.authorized.every(item => ['completed', 'failed'].includes(item.state)),
  'Do not overlap untimed preparation and a running timing authorization.');
const profiles = read(path.join(run, 'profile-definitions.json'));
const suffix = variant === 'Default' ? 'current-default' : 'original';
const directory = path.join(run, 'characterization-' + label);
const states = path.join(directory, 'states');
assert.equal(fs.existsSync(directory), false);
fs.mkdirSync(states, { recursive: true });
const activationRoot = variant === 'Default' ? 'C:\\src\\autoperf-F042-default' : 'C:\\src\\aspnetcore';
const args = [path.join(session, 'F122-managed-command.mjs'), label, activationRoot,
  path.join(run, 'consumer-' + suffix, 'AutoPerf.Benchmarks.dll'), 'characterize', states,
  path.join(run, 'closure-' + suffix + '.json'), path.join(run, 'source-inputs-' + suffix + '.json'),
  path.join(run, 'source-files-' + suffix), path.join(directory, 'not-timed-reports'), variant, 'none'];
const result = spawnSync(process.execPath, args, { windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
fs.writeFileSync(path.join(directory, 'driver-stdout.txt'), result.stdout ?? '', { flag: 'wx' });
fs.writeFileSync(path.join(directory, 'driver-stderr.txt'), result.stderr ?? '', { flag: 'wx' });
console.log(result.stdout);
console.error(result.stderr);
assert.equal(result.status, 0, 'Retain the actual failed characterization and every original input.');
const records = fs.readdirSync(states).map(file => ({ file, data: read(path.join(states, file)) }));
const select = kind => records.filter(item => item.file.endsWith('-' + kind + '.json')).map(item => item.data);
const producers = select('actual-mvc-producer');
const contracts = select('actual-prepared-public-contract');
assert.equal(select('verified-image').length, 1);
assert.equal(select('verified-image')[0].actualEntries, 328);
const associations = select('selected-source-pdb-associations');
assert.equal(associations.length, 1);
assert.equal(associations[0].actualUniqueFrameworkDocuments, 7);
assert.equal(associations[0].actualSelectedInputs, 11);
assert.equal(associations[0].actualSourceBuiltOwners, 3);
assert.equal(select('benchmarkdotnet-discovery-preflight')[0].actualDiscoveredCases, 32);
assert.equal(producers.length, 24);
assert.equal(contracts.length, 16);
assert.equal(select('actual-prepared-collection-lifetime').length, 8);
const properties = select('actual-public-consumer-static-type');
assert.equal(properties.length, 2);
assert.deepEqual(properties.map(item => item.actualContext).sort(),
  ['Microsoft.AspNetCore.Mvc.ControllerContext', 'Microsoft.AspNetCore.Mvc.RazorPages.PageContext']);
assert.ok(properties.every(item => item.actualProperty === 'ValueProviderFactories'
  && item.actualDeclaredType === 'System.Collections.Generic.IList`1[Microsoft.AspNetCore.Mvc.ModelBinding.IValueProviderFactory]'
  && item.actualConcretePatternSelectableThroughProperty === false));
const callerRecords = select('bounded-shipping-il-audit');
assert.equal(callerRecords.length, 1);
const callers = callerRecords[0];
assert.ok(callers.actualModules > 0 && callers.actualIlBodies > 0 && callers.actualDecodedMethodOperands > 0);
assert.equal(callers.modules.length, callers.actualModules);
assert.equal(callers.modules.reduce((n, item) => n + item.actualIlBodies, 0), callers.actualIlBodies);
assert.equal(callers.modules.reduce((n, item) => n + item.actualMethodOperands, 0), callers.actualDecodedMethodOperands);
assert.ok(callers.actualMatchingConstructorSites >= 4);
assert.equal(callers.actualNonGenericForwardingOperands, 1);
assert.equal(callers.actualConcreteGetEnumeratorMethodOperands, callers.actualOtherConcreteGetEnumeratorOperands + 1);
assert.equal(callers.actualGenericInterfaceTargetsOriginalPublicMember, true);
assert.equal(callers.actualNonGenericInterfaceTargetsForwarder, true);
assert.equal(callers.actualFullRepositoryOrExternalDynamicCallerAbsenceClaimed, false);
const closure = read(path.join(run, 'closure-' + suffix + '.json'));
for (const module of callers.modules) {
  const file = closure.files.find(item => item.path === path.basename(module.actualPath));
  assert.ok(file, module.actualPath);
  assert.equal(file.sha256, module.actualSha256);
}
for (const profile of profiles) {
  const expected = profile.factoryCount === 'default-five' ? 5 : profile.factoryCount;
  const captures = producers.filter(item => item.actualProfile === profile.key);
  assert.equal(captures.length, 3);
  assert.equal(captures.filter(item => item.actualEnableActionInvokers).length, 1);
  for (const capture of captures) {
    assert.equal(capture.actualHttpRequests, 2);
    assert.equal(capture.actualConfiguredFactoryCount, expected);
    assert.equal(capture.actualDefaultFiveVerified, profile.factoryCount === 'default-five');
    for (const key of ['actualDistinctPerRequestWrappers', 'actualSameUntouchedSourceArray',
      'actualSecondRequestHasNoCopy', 'actualNoValueProviderFactoriesPropertyAssignment']) assert.equal(capture[key], true);
    assert.equal(capture.actualCompiledRazorPageRequestClaimed, false);
    assert.equal(capture.observations.length, 2);
    for (const [index, observation] of capture.observations.entries()) {
      const copied = index === 0 && profile.copied;
      assert.equal(observation.actualRawQueryReadByParameterlessAction, copied ? 'true' : 'false');
      assert.equal(observation.actualInitialCopyNull, true);
      assert.equal(observation.actualFinalCopied, copied);
      assert.equal(observation.actualPrivateCopyIsExactList, copied);
      assert.equal(observation.actualFactoryCount, expected);
      assert.equal(observation.actualFactoryTypes.length, expected);
      assert.equal(observation.actualSourceUnchanged, true);
    }
  }
  const checked = contracts.filter(item => item.actualProfile === profile.key);
  assert.equal(checked.length, 2);
  assert.deepEqual(checked.map(item => item.actualEnableActionInvokers).sort(), [false, true]);
  assert.ok(checked.every(item => item.actualCount === expected && item.actualGenericAndNonGenericReferencesAndOrderVerified
    && item.actualPreparedBenchmarkChecksumVerified && item.actualRetainedEnumeratorAcquiredAndDisposed && item.actualPassed));
}
for (const [kind, field] of [
  ['actual-enumeration-reference-isolation-contract', 'actualCopied'],
  ['actual-enumeration-cursor-contract', 'actualCopied'],
  ['actual-enumeration-capture-mutation-contract', 'actualNonGeneric'],
  ['actual-enumeration-source-forwarding-contract', 'actualNonGeneric'],
  ['actual-enumeration-early-disposal-contract', 'actualThrowFromBody']
]) {
  const cases = select(kind);
  assert.equal(cases.length, 2);
  assert.deepEqual(cases.map(item => item[field]).sort(), [false, true]);
  assert.ok(cases.every(item => item.actualPassed));
}
const completed = select('characterization-completed');
assert.equal(completed.length, 1);
assert.equal(completed[0].actualAllPassed, true);
assert.equal(completed[0].actualHttpRequests, 48);
assert.equal(completed[0].actualTimingRun, false);
const runtimes = records.filter(item => /-runtime-characterize-(before|after)\.json$/.test(item.file));
assert.equal(runtimes.length, 2);
assert.deepEqual(runtimes[0].data.settings, runtimes[1].data.settings);
const receipt = {
  candidate: 'F122', variant, label, actualPassed: true, actualPreparedPublicProfiles: 16,
  actualFreshBenchmarkProfiles: 8, actualRealMvcProducerCaptures: 24, actualRealHttpRequests: 48,
  actualControllerProducerModes: 2, actualAdditionalEnumerationContracts: 10,
  actualUniqueSourcePePdbDocuments: 7, actualRuntimeRecords: 2,
  actualInspectedShippingModules: callers.actualModules, actualDecodedIlBodies: callers.actualIlBodies,
  actualDecodedMethodOperands: callers.actualDecodedMethodOperands,
  actualOtherConcreteGetEnumeratorOperands: callers.actualOtherConcreteGetEnumeratorOperands,
  actualCandidateConcretePatternProductionFitDemonstrated: callers.actualCandidateConcretePatternProductionFitDemonstrated,
  actualCompiledRazorPageRequestClaimed: false, actualTiming: false,
  actualTimingAuthorizationsAlreadyConsumed: budget.authorized.length,
  actualStateHashes: records.map(item => ({ path: path.relative(run, path.join(states, item.file)).replaceAll('\\', '/'), sha256: sha(path.join(states, item.file)) })),
  actualProducedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(directory, 'verified-characterization.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ ...receipt, actualStateHashes: receipt.actualStateHashes.length }, null, 2));
