#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = __dirname;
const preparationSeal = '52CF17772FB82EC9E18C81E50924C753818771D6BEBB84D91E72B623821F6C09';
const pins = { original: '37e809ead5824bc753a1c3d56f11615bdb1296c5', default: '00560e2dd1954a2acf2bc54b35422b0f32484bf1' };
const runtime68 = '12.0.0-alpha.1.26568.110';
const runtime62 = '12.0.0-alpha.1.26562.105';
const norm = value => value.replaceAll('\\', '/');
const file = relative => path.join(root, ...relative.split('/'));
const bytes = relative => fs.readFileSync(file(relative));
const text = relative => bytes(relative).toString('utf8').replace(/^\uFEFF/, '');
const json = relative => JSON.parse(text(relative));
const sha = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const same = (actual, expected, message) => assert.deepEqual(actual, expected, message);
const ordinal = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const selection = json('selection.json');
same(sha(bytes('manifests/preparation-007.json')), preparationSeal, 'immutable original manifest');
same(text('manifests/preparation-007.sha256').trim().split(/\s+/)[0], preparationSeal);
const originalManifest = json('manifests/preparation-007.json');
same(originalManifest.files.length, 38648);
const oldFiles = new Map(originalManifest.files.map(item => [norm(item.path), item]));
const selected = new Map(selection.copiedFiles.map(item => [item.original, item]));
const historicalRelative = absolute => norm(path.win32.relative(selection.originalRoot, absolute));
const copiedBytes = original => {
  const item = selected.get(norm(original));
  assert.ok(item, 'required selected evidence: ' + original);
  return bytes(item.copied);
};
for (const item of selection.copiedFiles) {
  const content = bytes(item.copied);
  same(content.length, item.bytes, item.copied);
  same(sha(content), item.sha256, item.copied);
  if (item.originalManifestEntry) {
    const sealed = oldFiles.get(item.original);
    assert.ok(sealed, item.original);
    same(item.bytes, sealed.bytes);
    same(item.sha256, sealed.sha256);
  } else {
    assert.ok(['manifest.json', 'manifest.sha256', 'manifest-verification.json'].includes(item.original));
  }
  assert.ok(!/\.(dll|pdb|exe|nupkg|zip|binlog)$/i.test(item.copied), 'binary was copied');
}
const chosen = new Set(selection.copiedFiles.filter(item => item.originalManifestEntry).map(item => item.original));
const omitted = originalManifest.files.filter(item => !chosen.has(norm(item.path)))
  .map(item => ({ path: norm(item.path), bytes: item.bytes, sha256: item.sha256 }))
  .sort((a, b) => ordinal(a.path, b.path));
const omissions = json('omissions.json');
same(omissions.omittedFileCount, omitted.length);
same(omissions.selectedSealedOriginalFiles, chosen.size);
same(omissions.omittedSetSha256, sha(Buffer.from(JSON.stringify(omitted))));
for (const item of omissions.importantOmittedBinaries) same(item, omitted.find(other => other.path === item.path));
same(text('pins/original-head.txt').trim(), pins.original);
same(text('pins/main-head.txt').trim(), pins.default);
same(json('facts/main-initial.json').sha, pins.default);
same(json('facts/main-recheck.json').sha, pins.default);
same(text('facts/original-tracked-status.txt').trim(), '');
same(text('facts/main-tracked-status.txt').trim(), '');
const handoff = json('facts/preparation-handoff.json');
same(handoff.sourcePins.fullCompilerInputAttestation, false);
same(handoff.sourcePins.original, pins.original);
same(handoff.sourcePins.observedCurrentDefault, pins.default);
const sourceAssociations = json('facts/source-associations.json');
same(sourceAssociations.length, 36);
for (const item of sourceAssociations) {
  same(item.pin, pins[item.role]);
  const physical = copiedBytes('sources/' + item.role + '/' + norm(item.relative));
  const git = copiedBytes('sources/' + item.role + '-git-blobs/' + norm(item.relative));
  same(sha(physical), item.physicalSha256);
  same(sha(git), item.gitBytesSha256);
  same(physical.toString().replaceAll('\r\n', '\n'), git.toString().replaceAll('\r\n', '\n'));
  const gitObject = Buffer.concat([Buffer.from('blob ' + git.length + '\0'), git]);
  same(crypto.createHash('sha1').update(gitObject).digest('hex'), item.gitBlob);
}
const scenarios = ['uninitialized', 'initialized-empty', 'one-policy-dynamic', 'two-policy-values-unsorted', 'cleared-after-policy', 'duplicate-policy-key'];
function checkRows(report) {
  same(report.passedRows, 27);
  same(report.rows.length, 27);
  same(report.runtime, '.NET ' + runtime68);
  same(report.timed, false);
  same(report.candidateExecuted, false);
  same(report.directHelperInvocations, 0);
  const expectedRows = [];
  for (const scenario of scenarios) {
    const inputs = scenario === 'one-policy-dynamic'
      ? [['first', 'tenant', 'blue'], ['same-key-and-value', 'tenant', 'blue'], ['different-key-same-value', 'other', 'blue'], ['same-key-different-value', 'tenant', 'red'], ['return-to-original', 'tenant', 'blue'], ['value-case-control', 'tenant', 'Blue'], ['empty-value', 'tenant', '']]
      : [['first', 'tenant', 'blue'], ['same-key-and-value', 'tenant', 'blue'], ['different-value', 'tenant', 'red'], ['return-to-original', 'tenant', 'blue']];
    const responses = new Map();
    for (const [request, keyPart, value] of inputs) {
      let key = 'GET\u001eHTTP\u001eEXAMPLE.TEST\u001e/PRODUCTS';
      if (scenario === 'one-policy-dynamic') key += '\u001eV\u001e' + keyPart + '\u001d' + value;
      if (scenario === 'two-policy-values-unsorted') key += '\u001eV\u001ea\u001dfirst\u001ez\u001dlast';
      if (scenario === 'duplicate-policy-key') key += '\u001eV\u001etenant\u001d' + value;
      const cacheHit = responses.has(key);
      const body = responses.get(key) || 'response-' + (responses.size + 1);
      responses.set(key, body);
      const storageCount = scenario === 'uninitialized' ? null : ['initialized-empty', 'cleared-after-policy'].includes(scenario) ? 0 : scenario === 'two-policy-values-unsorted' ? 2 : 1;
      const events = [{ Operation: 'get', Key: key, Hit: cacheHit }];
      if (!cacheHit) events.push({ Operation: 'set', Key: key, Hit: false });
      expectedRows.push({ scenario, request, key, cacheHit, body, endpointCalls: responses.size, storageWasNull: storageCount === null, storageCount, dictionaryIdentityPreserved: true, events });
    }
  }
  report.rows.forEach((row, index) => {
    same(row.passed, true);
    const { passed, dictionaryType, ...observed } = row;
    same(observed, expectedRows[index], report.role + ': row ' + index);
    if (row.storageWasNull) same(dictionaryType, null);
    else {
      assert.ok(dictionaryType.startsWith('System.Collections.Generic.Dictionary`2[['));
      same((dictionaryType.match(/System\.String, System\.Private\.CoreLib/g) || []).length, 2);
    }
  });
}
const original = json('facts/rows-original.json');
const main = json('facts/rows-main.json');
checkRows(original);
checkRows(main);
same(original.rows, main.rows);
const commandIndex = json('command-index.json');
same(commandIndex.length, 18);
const command = alias => json('runs/' + alias + '/command.json');
for (const item of commandIndex) {
  const record = command(item.alias);
  same(record.terminal, true);
  same(record.certificateGeneration, 'false');
  same(record.globalToolPath, 'false');
  same(record.nodeReuse, '1');
  same(record.performanceInstrumentation, 'none');
}
const tests = [
  'Microsoft.AspNetCore.OutputCaching.Tests.OutputCacheKeyProviderTests.OutputCachingKeyProvider_CreateStorageKey_ReturnsCachedVaryByGuid_IfVaryByRulesIsEmpty',
  'Microsoft.AspNetCore.OutputCaching.Tests.OutputCacheKeyProviderTests.OutputCachingKeyProvider_CreateStorageKey_ValuesAreSorted',
  'Microsoft.AspNetCore.OutputCaching.Tests.OutputCachePolicyBuilderTests.BuildPolicy_CreatesVaryByValuePolicy'
];
function checkHost(alias, expectedRuntime, expectedConfig) {
  const host = text('runs/' + alias + '/host-resolution.txt');
  const choices = [...host.matchAll(/^Chose FX version \[([^\r\n]+)\]/gm)];
  assert.ok(choices.length, alias + ': no actual host choice');
  assert.ok(choices.at(-1)[1].endsWith('\\Microsoft.NETCore.App\\' + expectedRuntime), alias + ': actual final host runtime');
  const tail = host.slice(choices.at(-1).index);
  assert.ok(tail.includes(expectedConfig), alias + ': actual runtimeconfig boundary');
  assert.ok(tail.includes('\\' + expectedRuntime + '\\System.Private.CoreLib.dll'), alias + ': actual runtime image');
}
for (const [role, alias, runtime] of [['original', 'tests-original', runtime62], ['default', 'tests-main', runtime68]]) {
  const record = command(alias);
  same(record.exitCode, 0);
  same(record.runtimeRollForward, 'Disable');
  const output = text('runs/' + alias + '/stdout.txt');
  const actual = [...output.matchAll(/^\s*Passed\s+(\S+)\s+\[[^\r\n]*\]\s*$/gm)].map(item => item[1]);
  same(actual.sort(), [...tests].sort(), alias + ': exact individual console rows');
  assert.match(output, /Test Run Successful\./);
  assert.match(output, /Total tests: 3/);
  assert.match(output, /Passed: 3/);
  assert.doesNotMatch(output, /^\s*(Failed|Skipped)\s+\S+/m);
  tests.forEach(name => assert.ok(record.arguments.some(arg => arg.includes(name))));
  const config = json('test-config/' + role + '/Microsoft.AspNetCore.OutputCaching.Tests.runtimeconfig.json');
  same(config.runtimeOptions.framework.version, runtime);
  checkHost(alias, runtime, 'Microsoft.AspNetCore.OutputCaching.Tests.runtimeconfig.json');
}
for (const [alias, report] of [['producer-original', original], ['producer-main', main]]) {
  same(command(alias).exitCode, 0);
  same(command(alias).pid, report.pid);
  same(command(alias).runtimeRollForward, 'Disable');
  assert.ok(command(alias).arguments.includes(runtime68));
  checkHost(alias, runtime68, 'F135.MiddlewareProbe.runtimeconfig.json');
  const console = JSON.parse(text('runs/' + alias + '/stdout.txt').trim());
  same(console.passedRows, 27);
  same(console.runtime, '.NET ' + runtime68);
}
const images = json('facts/images-original-main.json');
const allowed = ['Microsoft.AspNetCore.OutputCaching.dll', 'Microsoft.AspNetCore.OutputCaching.pdb'];
same(images.exclusions, []);
same(images.permittedPairDifferences, allowed);
same(images.comparedEveryEntry, true);
same(images.characterizationOnly, true);
same(images.baselineManifest.length, 193);
same(images.otherManifest.length, 193);
function imageMap(rows, prefix) {
  const result = new Map();
  for (const item of rows) {
    assert.ok(!result.has(item.path));
    result.set(item.path, item);
    const sealed = oldFiles.get(prefix + '/' + norm(item.path));
    assert.ok(sealed, prefix + '/' + item.path);
    same(item.sha256, sealed.sha256);
    same(item.length, sealed.bytes);
  }
  return result;
}
const imageOriginal = imageMap(images.baselineManifest, 'images/original');
const imageMain = imageMap(images.otherManifest, 'images/default');
const differences = [...new Set([...imageOriginal.keys(), ...imageMain.keys()])]
  .filter(name => imageOriginal.get(name)?.sha256 !== imageMain.get(name)?.sha256);
same(differences.length, 69);
const nonOwner = differences.filter(name => !allowed.includes(name));
same(nonOwner.length, images.forbiddenPairDifferences);
assert.ok(nonOwner.length > 0, 'original/main must not be accepted as a causal performance pair');
same(images.strictImageCompatibilityPassed, false);
same([...images.differences.map(item => item.path)].sort(), differences.sort());
const common = json('facts/common-consumer.json');
same(common.recompiledBetweenRoles, false);
same(common.files.length, 4);
for (const item of common.files) {
  same(imageOriginal.get(item.name).sha256, item.sha256);
  same(imageMain.get(item.name).sha256, item.sha256);
  same(item.identical, true);
}
const originalCopy = json('facts/image-original-copy.json');
same(originalCopy.differences.length, 0);
same(originalCopy.baselineFiles, 193);
same(originalCopy.otherFiles, 193);
for (const [rows, prefix] of [[originalCopy.baselineManifest, 'harness/bin/Release/net12.0'], [originalCopy.otherManifest, 'images/original']]) imageMap(rows, prefix);
for (const [role, report, image] of [['original', original, imageOriginal], ['default', main, imageMain]]) {
  const owner = report.loadedAssemblies.find(item => item.name === 'Microsoft.AspNetCore.OutputCaching');
  same(owner.sha256, image.get(allowed[0]).sha256);
  same(owner.pdbSha256, image.get(allowed[1]).sha256);
  same(report.ownerSourceBindings.length, 5);
  for (const binding of report.ownerSourceBindings) {
    const source = sourceAssociations.find(item => item.role === role && item.physicalPath === binding.PhysicalSource);
    assert.ok(source);
    same(binding.PdbDocumentSha256, source.physicalSha256);
    same(binding.ActualSourceSha256, source.physicalSha256);
    same(binding.SourceMatched, true);
    same(binding.PePdbGuidMatched, true);
    assert.match(binding.PdbGuid, /^[0-9a-f-]{36}$/);
  }
}
const loadedAssociations = json('facts/loaded-assemblies.json');
same(loadedAssociations.length, 118);
for (const edge of loadedAssociations) {
  const recorded = (edge.role === 'original' ? original : main).loadedAssemblies.find(item => item.name === edge.name);
  assert.ok(recorded);
  same(edge.matched, true);
  same(edge.loaded, recorded.path);
  same(edge.sha256, recorded.sha256);
  const relative = historicalRelative(edge.expected);
  if (!relative.startsWith('../')) {
    same(oldFiles.get(relative)?.sha256, edge.sha256, edge.name + ': sealed historical dependency');
  } else {
    assert.ok(edge.expected.includes('\\Microsoft.NETCore.App\\' + runtime68 + '\\'), edge.name + ': exact external producer runtime');
  }
}
const il = json('facts/runtime-any-il.json');
same(il.runtime, '.NET ' + runtime68);
same(il.dictionaryImplementsGenericCollection, true);
for (const report of [original, main]) {
  const loaded = report.loadedAssemblies.find(item => item.name === 'System.Linq');
  same(loaded.sha256, il.systemLinq.sha256);
  same(loaded.mvid, il.systemLinq.mvid);
  same(loaded.informationalVersion, il.systemLinq.informationalVersion);
}
same(sha(Buffer.from(il.ilHex, 'hex')), il.ilSha256);
assert.ok(il.instructions.find(item => item.offset === 11 && item.opcode === 'isinst').operand.member.includes('ICollection`1'));
same(il.instructions.find(item => item.offset === 21).operand.member, 'Int32 get_Count()');
same(il.instructions.find(item => item.offset === 27).opcode, 'cgt.un');
same(il.instructions.find(item => item.offset === 29).opcode, 'ret');
for (const name of ['extra-fixture', 'missing-owner']) {
  const data = json('facts/image-' + name + '.json');
  same(data.strictImageCompatibilityPassed, false);
  same(data.forbiddenPairDifferences, 1);
}
const failureChecks = [
  ['missing-import', 1, /MSB4019/],
  ['prototype-failure', -532462766, /Unable to resolve service for type 'System.String'/],
  ['main-missing-runtime', 1, /26568\.110/],
  ['original-runtime-mismatch', 1, /26562\.105/]
];
for (const [alias, code, pattern] of failureChecks) {
  same(command(alias).exitCode, code);
  assert.match(text('runs/' + alias + '/stdout.txt') + text('runs/' + alias + '/stderr.txt'), pattern);
}
same(json('facts/runtime-source-404.json').status, '404');
assert.ok(json('facts/failed-prerequisites.json').some(item => item.label === 'python-evidence-script-prerequisite' && item.exitCode === 9009));
same(text('runs/runner-help/stdout.txt').trim(), '');
same(text('runs/runner-help/stderr.txt').trim(), '');
const unadopted = json('facts/unadopted.json');
same(unadopted.candidateApplied, false);
same(unadopted.candidateExecuted, false);
same(unadopted.suggestionsAdopted, false);
same(unadopted.suggestionsSealed, false);
same(unadopted.campaignVerdict, null);
same(json('handoff.json').disposition, 'PENDING');
same(json('facts/terminal-processes.json').noOwnedNativeProcessSurvives, true);
const report = {
  audit: 'PASS', method: 'Deterministic historical metadata-only audit; no child process, producer rerun, timing or omitted-binary access.',
  originalPreparationManifestSha256: preparationSeal,
  copiedOriginalFilesVerified: selection.copiedFiles.length,
  omittedOriginalFilesAccountedFor: omitted.length,
  sourcePins: pins, physicalAndGitSourceAssociationsVerified: 36,
  actualMiddlewareRowsVerified: { original: 27, observedMain: 27, producerRuntime: runtime68 },
  exactExistingTestExecutionsVerified: { total: 6, uniqueNamesPerPin: tests, originalRuntime: runtime62, mainRuntime: runtime68, evidence: 'Actual console rows and final host resolution; no manufactured XML.' },
  sourceOwnerPePdbAssociationsChecked: 10,
  imageInventoriesChecked: { entriesPerRole: 193, commonConsumerFilesIdentical: 4, differences: 69, nonOwnerDifferences: nonOwner.length, originalMainNotAnIsolatedPerformancePair: true },
  selectedLoadedLinqImageCountFastPath: 'IL ICollection<T>.Count path and genuine owned Dictionary interface are recorded; residual cost remains unmeasured.',
  fullCompilerInputAttestation: false, disposition: 'PENDING',
  noNewDotnetStarted: true, proposedEditUsefulGateAndPrAdopted: false,
  limitation: 'Binary/source/PDB associations are historical sealed receipts. Omitted PE/PDB/SDK/runtime bytes are not freshly parsed or rehashed; all original exclusions remain.'
};
if (process.argv.includes('--prepare-report')) {
  assert.ok(!fs.existsSync(file('manifest.json')), 'Do not rewrite a sealed capsule report.');
  fs.writeFileSync(file('audit-result.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ audit: 'PASS', phase: 'preseal historical checks', copiedFiles: selection.copiedFiles.length, rows: 54, exactExistingTestExecutions: 6 }));
  process.exit(0);
}
const manifest = json('manifest.json');
const manifestHash = sha(bytes('manifest.json'));
same(manifestHash, text('manifest.sha256').trim().split(/\s+/)[0]);
const listed = new Set();
for (const item of manifest.files) {
  assert.ok(!listed.has(item.path));
  listed.add(item.path);
  same(bytes(item.path).length, item.bytes);
  same(sha(bytes(item.path)), item.sha256, item.path);
}
function enumerate(folder = root, result = []) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    assert.ok(!entry.isSymbolicLink(), 'No external link may be followed by the portable capsule.');
    if (entry.isDirectory()) enumerate(full, result);
    else if (entry.isFile()) result.push(norm(path.relative(root, full)));
    else assert.fail('Unsupported entry');
  }
  return result;
}
same(enumerate().filter(name => !['manifest.json', 'manifest.sha256'].includes(name)).sort(), [...listed].sort(), 'exact capsule file inventory');
assert.ok(listed.size + 2 <= 250, 'publication file cap');
same(json('audit-result.json'), report, 'stored audit report');
if (process.argv.includes('--self-test')) {
  const bad = structuredClone(original);
  bad.rows[0].body = 'wrong-body';
  assert.throws(() => checkRows(bad), 'changed cache result must reject');
  assert.throws(() => checkHost('tests-original', runtime68, 'Microsoft.AspNetCore.OutputCaching.Tests.runtimeconfig.json'), 'runtime62 must not be conflated with68');
}
console.log(JSON.stringify({ audit: 'PASS', capsuleFilesIncludingManifestReceipts: listed.size + 2, manifestSha256: manifestHash, copiedFiles: selection.copiedFiles.length, producerRows: 54, exactExistingTestExecutions: 6, nonOwnerPairDifferences: nonOwner.length, selfTests: process.argv.includes('--self-test') ? 'PASS' : 'not requested' }));
