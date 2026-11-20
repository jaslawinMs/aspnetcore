'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), zlib = require('node:zlib');
const assert = require('node:assert/strict');
const metadata = require('./Metadata.cjs'), { parseXml, elements } = require('./Xml.cjs');
const root = __dirname, capsule = path.dirname(root), preseal = process.argv.includes('--preseal');
const envelope = process.argv.includes('--envelope');
assert(process.argv.slice(2).every(argument => ['--preseal', '--envelope'].includes(argument)), 'No external paths or actions accepted');
const hash = (data, algorithm = 'sha256') => crypto.createHash(algorithm).update(data).digest('hex').toUpperCase();
const sort = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort(sort).map(key => [key, canonical(value[key])])) : value;
const same = (left, right, message) => assert.deepEqual(canonical(left), canonical(right), message);
function safe(relative) {
  assert.equal(typeof relative, 'string');
  const parts = relative.split(/[\\/]/);
  assert(parts.length && parts.every(part => part && part !== '.' && part !== '..' && !part.includes(':')), 'Capsule-relative selected path');
  const result = path.resolve(root, ...parts);
  assert(result.startsWith(root + path.sep), 'Selected path stays inside payload');
  return result;
}
const read = relative => fs.readFileSync(safe(relative));
const parse = data => JSON.parse(data.toString('utf8').replace(/^\uFEFF/, ''));
const json = relative => parse(read(relative));
function physicalFiles(directory, base = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    assert(!entry.isSymbolicLink(), 'No selected path indirection');
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return physicalFiles(file, base);
    assert(entry.isFile());
    const data = fs.readFileSync(file);
    return [{ path: path.relative(base, file).split(path.sep).join('\\'), bytes: data.length, sha256: hash(data) }];
  }).sort((a, b) => sort(a.path, b.path));
}
let manifest = null, manifestSha256 = null;
if (!preseal) {
  const data = fs.readFileSync(path.join(capsule, 'manifest.json'));
  manifest = parse(data); manifestSha256 = hash(data);
  assert.equal(manifest.scope, 'payload');
  same(physicalFiles(root), manifest.files, 'Exact selected file set and freshly read bytes; no exclusions');
  assert.equal(manifest.selectedFileCount, manifest.files.length);
  assert.equal(manifest.selectedBytes, manifest.files.reduce((sum, file) => sum + file.bytes, 0));
  same(manifest.exclusions, []);
}
let archived = new Map();
if (fs.existsSync(safe('evidence\\all-attempts.json.gz'))) {
  const archive = parse(zlib.gunzipSync(read('evidence\\all-attempts.json.gz')));
  const index = json('evidence\\all-attempts-index.json');
  assert.equal(archive.format, 'exact-raw-bytes-base64-v1');
  for (const member of archive.members) {
    safe(member.path);
    assert(!archived.has(member.path), 'Unique raw evidence member');
    const data = Buffer.from(member.base64, 'base64');
    assert.equal(data.length, member.bytes); assert.equal(hash(data), member.sha256);
    archived.set(member.path, data);
  }
  same(index.members, archive.members.map(({ base64, ...member }) => member), 'Complete raw stream archive index');
}
const evidence = relative => archived.get(relative) ?? read(relative);
const evidenceJson = relative => parse(evidence(relative));
const failedSealAudits = [];
for (const name of fs.readdirSync(safe('evidence')).filter(name => /^failed-seal-\d+\.json\.gz$/.test(name) || /^failed-seal-v\d+\.json\.gz$/.test(name))) {
  const failure = parse(zlib.gunzipSync(read('evidence\\' + name))), members = new Map();
  assert.equal(failure.format, 'failed-seal-snapshot-v1');
  for (const member of failure.members) {
    safe(member.path);
    const data = Buffer.from(member.base64, 'base64');
    assert.equal(data.length, member.bytes); assert.equal(hash(data), member.sha256);
    assert(!members.has(member.path)); members.set(member.path, { ...member, data });
  }
  const receipt = parse(members.get('audit-execution.json').data), rejected = parse(members.get('manifest.json').data);
  assert(receipt.nativeExited && receipt.bothStreamsDrained);
  if (['terminal-identity-recording', 'post-seal-xml-verify-date-coercion'].includes(failure.failureStage)) {
    assert.equal(receipt.exitCode, 0);
    const passed = JSON.parse(receipt.stdout);
    assert(passed.evidenceAuditPassed && passed.exactSelectedFileSetPassed);
    assert.equal(passed.manifestSha256, hash(members.get('manifest.json').data));
    assert.equal(rejected.selectedBytes, rejected.files.reduce((sum, file) => sum + file.bytes, 0));
  } else {
    assert.notEqual(receipt.exitCode, 0);
    assert.equal(rejected.selectedBytes, 0); assert(rejected.files.reduce((sum, file) => sum + file.bytes, 0) > 0);
    assert(receipt.stderr.includes('ERR_ASSERTION'), 'Actual read-only verifier rejected the incorrect first byte total');
  }
  for (const [relative, member] of members) {
    if (!relative.startsWith('payload\\')) continue;
    const record = rejected.files.filter(file => file.path === relative.slice('payload\\'.length));
    assert.equal(record.length, 1); assert.equal(record[0].sha256, member.sha256); assert.equal(record[0].bytes, member.bytes);
  }
  if (failure.failureStage === 'post-seal-xml-verify-date-coercion') {
    const oldSeal = parse(members.get('seal.json').data);
    for (const name of ['manifest.json', 'audit-execution.json', 'terminal.json']) {
      assert.equal(oldSeal.files[name].sha256, hash(members.get(name).data));
      assert.equal(oldSeal.files[name].bytes, members.get(name).data.length);
    }
    assert(failure.characterization.realSystemXmlFreshSerializedBytesEquivalent);
    assert.equal(failure.characterization.savedDateAttributeAfterJsonConversionType, 'System.DateTime');
    for (const check of failure.postSealAudits) assert(check.nativeExited && check.bothStreamsDrained);
    const priorNode = failure.postSealAudits.find(check => check.exitCode === 0);
    assert(JSON.parse(priorNode.stdout).envelopeAuditPassed);
    const priorXml = failure.postSealAudits.find(check => check.exitCode !== 0);
    assert(priorXml.stderr.includes('Fresh System.Xml reconciliation differs from sealed receipt'));
  }
  failedSealAudits.push(receipt);
}
const attempts = [];
for (const [relative, data] of archived) {
  if (!relative.endsWith('.receipt.json')) continue;
  const record = parse(data), prefix = relative.slice(0, -'.receipt.json'.length);
  const started = evidenceJson(prefix + '.started.json');
  for (const key of ['label', 'checkout', 'executable', 'arguments', 'wrapperPid', 'nativePid', 'runnerSha256',
    'activatedExactCheckout', 'environment', 'startedAt'])
    same(started[key], record[key], `Started/final native execution identity: ${record.label}/${key}`);
  assert(record.nativeExited && record.bothStreamsDrained);
  assert.equal(record.exhaustiveDescendantCensus, false);
  assert(record.knownChildWaits.every(child => child.terminal));
  evidence(prefix + '.stdout.txt'); evidence(prefix + '.stderr.txt');
  if (record.executable.toLowerCase().endsWith('dotnet.exe')) {
    assert(record.activatedExactCheckout);
    for (const [name, value] of Object.entries({ DOTNET_GENERATE_ASPNET_CERTIFICATE: 'false',
      DOTNET_ADD_GLOBAL_TOOLS_TO_PATH: 'false', MSBUILDDISABLENODEREUSE: '1' }))
      assert.equal(record.environment[name], value, `Required exact-checkout .NET environment: ${record.label}`);
    assert(!record.environment.DOTNET_ROLL_FORWARD, 'No runtime roll-forward override');
    assert.equal(record.executable.toLowerCase(), (record.checkout + '\\.dotnet\\dotnet.exe').toLowerCase());
  }
  attempts.push(record);
}
const sources = json('evidence\\source-map.json');
for (const source of sources) {
  const data = read(source.snapshot);
  assert.equal(data.length, source.rawBytes); assert.equal(hash(data), source.rawSha256);
  const text = data.toString('utf8');
  assert(Buffer.from(text).equals(data), 'Selected physical source is losslessly UTF8');
  const lf = Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8');
  assert.equal(lf.length, source.lfBytes); assert.equal(hash(lf), source.lfSha256);
  assert.equal(hash(lf), source.gitBlobSha256); assert.equal(lf.length, source.gitBlobBytes);
  const object = hash(Buffer.concat([Buffer.from(`blob ${lf.length}\0`), lf]), 'sha1').toLowerCase();
  assert.equal(object, source.gitBlob); assert.equal(object, source.canonicalLfGitObjectSha1);
  if (source.gitSnapshot) assert(read(source.gitSnapshot).equals(lf), 'Actual retained Git blob bytes');
}
const provenance = json('SOURCE-PROVENANCE.json');
for (const parser of provenance.reusedParsers) assert.equal(hash(read(parser.selected)), parser.sha256, 'Attributed unchanged parser bytes');
const selected = json('evidence\\selected-metadata.json'), freshManaged = [];
for (const pair of selected.pairs) {
  const dll = read(pair.selectedDll), pdb = read(pair.selectedPdb), p = metadata.pe(dll), d = metadata.portablePdb(pdb);
  assert.equal(hash(dll), pair.peSha256); assert.equal(hash(pdb), pair.pdbSha256);
  assert.equal(p.mvid, pair.mvid); same(p.codeviews, pair.codeviews);
  assert.equal(d.guid, pair.pdbGuid); assert.equal(d.stamp, pair.pdbStamp);
  assert(p.codeviews.some(value => value.guid === d.guid && value.stamp === d.stamp && value.age === 1), 'Fresh actual CodeView GUID+stamp/portable PDB ID');
  same(d.documents, pair.documents, 'All raw portable PDB Document rows parsed afresh');
  for (const source of pair.selectedSources) {
    const found = d.documents.filter(document => document.name === source.document.name);
    assert.equal(found.length, 1); same(found[0], source.document);
    const algorithm = { '8829d00f-11b8-4213-878b-770e8597ac16': 'sha256', 'ff1816ec-aa5e-4d10-87f7-6f4963833460': 'sha1' }[found[0].algorithm];
    assert(algorithm, 'Explicit Document checksum algorithm');
    assert.equal(hash(read(source.snapshot), algorithm), found[0].checksum, 'Fresh raw physical source/PDB Document checksum association');
  }
  freshManaged.push({ path: pair.selectedDll, sha256: hash(dll), mvid: p.mvid, bytes: dll.length });
}
for (const image of selected.managedImages) {
  const data = read(image.selected), p = metadata.pe(data);
  assert.equal(hash(data), image.sha256); assert.equal(data.length, image.bytes); assert.equal(p.mvid, image.mvid); same(p.codeviews, image.codeviews);
  freshManaged.push({ path: image.selected, sha256: hash(data), mvid: p.mvid, bytes: data.length });
}
for (const image of selected.nativeImages) {
  const data = read(image.selected), start = data.readUInt32LE(0x3c);
  assert.equal(hash(data), image.sha256); assert.equal(data.length, image.bytes);
  assert.equal(data.readUInt32LE(start), 0x4550); assert.equal(data.readUInt16LE(start + 4), image.peMachine);
  assert.equal(data.readUInt16LE(start + 22), image.peCharacteristics);
}
for (const reference of selected.references) {
  const data = read(reference.selected), p = metadata.pe(data);
  assert.equal(data.length, reference.bytes); assert.equal(hash(data), reference.sha256); assert.equal(p.mvid, reference.mvid); same(p.codeviews, reference.codeviews);
  const methods = metadata.typeMethods(data, 'System.Collections.Generic', 'Dictionary`2');
  same(methods, reference.dictionaryMethods, 'Fresh actual retained-target reference MethodDef names');
  assert.equal(methods.includes('TryAdd'), reference.dictionaryTryAddInstanceMethodAvailable);
  const resolution = evidenceJson(`evidence\\${reference.observedResolutionLabel}.stdout.txt`);
  assert.equal(resolution.Items.ReferencePath.filter(entry => entry.Identity === reference.source).length, 1, 'Real MSBuild-resolved reference association');
  same(resolution.Properties, reference.properties);
}
const catalogs = parse(zlib.gunzipSync(read('evidence\\image-catalogs.json.gz')));
function catalogMap(catalog) {
  assert(catalog.allFileEntries && catalog.freshlyInventoriedAtPreparation);
  same(catalog.prefixExceptions, []);
  assert.equal(catalog.copiedAsWholeImage, false);
  assert.equal(catalog.omittedBytesFreshlyOfflineRehashed, false);
  const map = new Map();
  for (const file of catalog.files) {
    assert(!map.has(file.path), 'Every declared image key is unique');
    assert(file.bytes >= 0 && /^[0-9A-F]{64}$/.test(file.sha256));
    map.set(file.path, file);
  }
  return map;
}
const maps = {};
for (const [name, catalog] of Object.entries(catalogs.images)) maps[name] = catalogMap(catalog);
for (const catalog of [...Object.values(catalogs.omittedDistributions), ...catalogs.omittedPackages]) catalogMap(catalog);
for (const pair of selected.pairs) {
  const catalog = pair.id.startsWith('original-') ? maps.originalNativeAllBin : pair.id.startsWith('default-')
    ? maps.defaultNativeAllBin : pair.id.includes('v3') ? maps.CommonV3FailedRuntime : maps.CommonV4Accepted;
  for (const [relative, digest] of [[pair.selectedDll, pair.peSha256], [pair.selectedPdb, pair.pdbSha256]])
    assert([...catalog.values()].some(file => path.win32.basename(file.path) === path.win32.basename(relative) && file.sha256 === digest),
      'Selected actual native/common image bytes are associated with the complete preparation image catalog');
}
if (fs.existsSync(safe('evidence\\image-stability.json.gz'))) {
  const stability = parse(zlib.gunzipSync(read('evidence\\image-stability.json.gz')));
  same(Object.keys(stability.images).sort(sort), Object.keys(catalogs.images).sort(sort));
  for (const [name, after] of Object.entries(stability.images)) {
    same(after.files, catalogs.images[name].files, 'Saved second fresh read of every complete image key');
    same(after.prefixExceptions, []); assert(after.unchangedFromCollection);
  }
  same(stability.physicalSources, sources.map(source => ({
    role: source.role, path: source.path, bytes: source.rawBytes, sha256: source.rawSha256
  })), 'Selected raw physical sources unchanged in the collection-to-sealing window');
} else assert(preseal, 'Final capsule includes second-read image/source stability observations');
function union(left, right) {
  return [...new Set([...left.keys(), ...right.keys()])].sort(sort).map(key => {
    const l = left.get(key) ?? null, r = right.get(key) ?? null;
    return { key, left: l, right: r, equal: !!l && !!r && l.sha256 === r.sha256 && l.bytes === r.bytes };
  });
}
for (const [name, a, b] of [
  ['acceptedOriginalDefault', 'OriginalProbeV4', 'DefaultProbeV4'], ['failedOriginalDefaultV3', 'OriginalProbeV3', 'DefaultProbeV3'],
  ['commonV3V4', 'CommonV3FailedRuntime', 'CommonV4Accepted'], ['nativeAllBinOriginalDefault', 'originalNativeAllBin', 'defaultNativeAllBin']
]) {
  const rows = union(maps[a], maps[b]), saved = catalogs.unions[name];
  same(saved.prefixExceptions, []); assert(saved.includesFixtureHelperAndNonDllFiles);
  same(rows, saved.rows, 'Full keyed all-file image union recomputed from every catalog row');
  same(rows.filter(row => !row.equal), saved.differences, 'Every image difference, without any prefix exceptions');
}
const dllFixture = maps.OriginalProbeV4.get('PreparationProbe.dll');
assert(dllFixture && dllFixture.sha256 === maps.DefaultProbeV4.get('PreparationProbe.dll').sha256);
for (const name of ['PreparationProbe.pdb', 'PreparationProbe.deps.json', 'PreparationProbe.runtimeconfig.json'])
  assert(maps.OriginalProbeV4.get(name).sha256 === maps.DefaultProbeV4.get(name).sha256, 'Common fixture includes non-DLL inputs in union');
assert(maps.OriginalProbeV4.has('Microsoft.AspNetCore.JsonPatch.Tests.dll') && maps.DefaultProbeV4.has('Microsoft.AspNetCore.JsonPatch.Tests.dll'), 'Actual native helper DLL included');
const probeNames = ['F166_ActualProviderFactoryPreservesExistingMappings', 'F166_PublicMiddlewareServesRealFilesAndNegotiatedResponses',
  'F167_RealManagerInputsAndRetainedKeyDictionary', 'F168_RealDynamicBinderWriteOnceCaseAndNullSemantics',
  'F168_JsonPatchDocumentReplaceRemoveAndAdd', 'F168_JsonPatchMissingAndDuplicateControls'];
const probeSummaries = [];
for (const label of ['original-v3', 'default-v3', 'original-v4', 'default-v4']) {
  const observation = json(`evidence\\probe-${label}.json`), role = label.startsWith('original') ? 'original' : 'default';
  const version = label.endsWith('v4') ? 'v4' : 'v3';
  const image = catalogs.images[(role === 'original' ? 'Original' : 'Default') + 'Probe' + version.toUpperCase()];
  const imageFiles = maps[(role === 'original' ? 'Original' : 'Default') + 'Probe' + version.toUpperCase()];
  same(observation.rows.map(row => row.name).sort(sort), probeNames.slice().sort(sort));
  assert.equal(observation.allPassed, version === 'v4');
  assert.equal(observation.rows.filter(row => !row.passed).length, version === 'v4' ? 0 : 1);
  for (const loaded of observation.loadedAssemblies) {
    const selectedMatch = freshManaged.filter(file => file.sha256 === loaded.sha256);
    for (const match of selectedMatch) {
      assert.equal(match.mvid, loaded.mvid); assert.equal(match.bytes, loaded.bytes);
    }
    const relative = path.win32.relative(image.root, loaded.path);
    if (!relative.startsWith('..') && !path.win32.isAbsolute(relative)) {
      const file = imageFiles.get(relative); assert(file, 'Every in-image console-observed DLL has a full image key');
      assert.equal(file.sha256, loaded.sha256); assert.equal(file.bytes, loaded.bytes);
    }
    assert(catalogs.actualConsoleLoadedUnion.some(item => item.path === loaded.path && item.sha256 === loaded.sha256 && item.mvid === loaded.mvid), 'Saved actual console loaded identity union');
  }
  for (const required of ['Microsoft.AspNetCore.Components.WebAssembly.Server', 'Microsoft.AspNetCore.StaticFiles',
    'Microsoft.AspNetCore.DataProtection', 'Microsoft.AspNetCore.JsonPatch', 'Microsoft.AspNetCore.JsonPatch.Tests', 'PreparationProbe', 'System.Private.CoreLib']) {
    const loaded = observation.loadedAssemblies.filter(item => item.name === required);
    assert.equal(loaded.length, 1);
    assert(freshManaged.some(file => file.sha256 === loaded[0].sha256 && file.mvid === loaded[0].mvid), 'Selected actual loaded owner/helper/common/runtime bytes');
  }
  const runtimeConfig = json(`selected\\${role}-f167-native-tests\\Microsoft.AspNetCore.DataProtection.Tests.runtimeconfig.json`);
  const frameworkVersion = runtimeConfig.runtimeOptions.framework.version;
  assert(observation.framework.includes(frameworkVersion), 'Actual role runtime, not a substituted CoreCLR');
  const receipt = evidenceJson(`evidence\\probe-${label}.receipt.json`);
  assert.equal(receipt.exitCode, version === 'v4' ? 0 : 1);
  const option = receipt.arguments.indexOf('--runtimeconfig'); assert(option >= 0);
  const runtimePath = receipt.arguments[option + 1], bin = catalogs.images[role + 'NativeAllBin'];
  const configRow = maps[role + 'NativeAllBin'].get(path.win32.relative(bin.root, runtimePath));
  assert(configRow); assert.equal(configRow.sha256, hash(read(`selected\\${role}-f167-native-tests\\Microsoft.AspNetCore.DataProtection.Tests.runtimeconfig.json`)));
  probeSummaries.push({ role: label, allPassed: observation.allPassed, framework: observation.framework,
    rows: observation.rows.map(row => ({ name: row.name, passed: row.passed })) });
}
for (const image of selected.nativeImages) {
  assert(catalogs.actualConsoleObservedNativeModules.some(item => item.path === image.source && item.sha256 === image.sha256), 'Actual native module observation/selected byte association');
}
const commonResolution = evidenceJson('evidence\\common-v4-reference-paths.stdout.txt');
assert.equal(commonResolution.Properties.LangVersion, '13.0'); assert.equal(commonResolution.Properties.EnableNETAnalyzers, 'true');
assert.equal(commonResolution.Properties.UseSharedCompilation, 'false');
for (const entry of commonResolution.Items.ReferencePath) {
  const relative = path.win32.relative(catalogs.images.CommonReferenceInputs.root, entry.Identity);
  if (relative.startsWith('..') || path.win32.isAbsolute(relative)) continue;
  assert(maps.CommonReferenceInputs.has(relative), 'Actual common native reference input is cataloged');
}
const xmlReceipt = json('evidence\\xml-system-receipt.json'), freshXml = [];
const local = element => element.name.split(':').at(-1);
const children = (element, name) => element.children.filter(child => local(child) === name);
const trxPaths = physicalFiles(path.join(root, 'evidence')).filter(file => file.path.endsWith('.trx')).map(file => 'evidence\\' + file.path).sort(sort);
same(trxPaths, xmlReceipt.files.map(file => file.path).slice().sort(sort), 'Every actual TRX reconciled, including zero-row aborted run');
for (const relative of trxPaths) {
  const data = read(relative), doc = parseXml(data.toString('utf8')), summary = elements(doc, 'ResultSummary');
  assert.equal(summary.length, 1);
  const counters = children(summary[0], 'Counters'); assert.equal(counters.length, 1);
  const definitionRoots = elements(doc, 'TestDefinitions'), definitions = definitionRoots.flatMap(node => children(node, 'UnitTest')).map(node => {
    const methods = children(node, 'TestMethod'); assert.equal(methods.length, 1);
    return { attributes: node.attributes, executions: children(node, 'Execution').map(item => item.attributes), method: methods[0].attributes };
  });
  const results = elements(doc, 'UnitTestResult').map(node => node.attributes);
  const entries = elements(doc, 'TestEntries').flatMap(node => children(node, 'TestEntry')).map(node => node.attributes);
  const role = relative.includes('trx-original-') ? 'original' : 'default';
  for (const definition of definitions) {
    const storage = definition.attributes.storage;
    const key = path.win32.relative(catalogs.images[role + 'NativeAllBin'].root, storage).toLowerCase();
    const image = [...maps[role + 'NativeAllBin'].values()].filter(file => file.path.toLowerCase() === key);
    assert.equal(image.length, 1, 'Real TRX definition/storage points to declared native image');
    assert(selected.pairs.some(pair => pair.id.startsWith(role + '-') && pair.peSha256 === image[0].sha256),
      'TRX storage is associated with selected post-run native binary bytes, not a loader census');
  }
  for (const result of results) {
    const definition = definitions.filter(item => item.attributes.id === result.testId); assert.equal(definition.length, 1);
    assert.equal(definition[0].executions.filter(item => item.id === result.executionId).length, 1);
    assert.equal(entries.filter(item => item.testId === result.testId && item.executionId === result.executionId).length, 1);
  }
  assert.equal(entries.length, results.length); assert.equal(definitions.length, results.length);
  assert.equal(Number(counters[0].attributes.total), results.length);
  assert.equal(Number(counters[0].attributes.passed), results.filter(item => item.outcome === 'Passed').length);
  assert.equal(Number(counters[0].attributes.failed), results.filter(item => item.outcome === 'Failed').length);
  const messages = elements(doc, 'Message').map(node => { assert.equal(node.children.length, 0); return node.text; });
  const fresh = { path: relative, sha256: hash(data), rootAttributes: doc.attributes,
    summaryAttributes: summary[0].attributes, counters: counters[0].attributes, results, definitions, entries, messages };
  const saved = xmlReceipt.files.filter(file => file.path === relative); assert.equal(saved.length, 1);
  same(fresh, saved[0], 'Real XML rows/attributes/definitions/entries/executions/counters match fresh System.Xml reconciliation');
  freshXml.push(fresh);
}
const allResults = freshXml.flatMap(file => file.results);
assert.equal(allResults.length, 84); assert(allResults.every(result => result.outcome === 'Passed'));
assert.equal(new Set(allResults.map(result => result.testName)).size, 33);
for (const role of ['original', 'default']) {
  const rows = freshXml.filter(file => file.path.includes(`trx-${role}-f168`)).flatMap(file => file.results);
  for (const name of [
    'Microsoft.AspNetCore.JsonPatch.Internal.DynamicObjectAdapterTest.TryRemove_SetsPropertyToDefaultOrNull(value: 1, expectedValue: 0)',
    'Microsoft.AspNetCore.JsonPatch.Internal.DynamicObjectAdapterTest.TryRemove_SetsPropertyToDefaultOrNull(value: "new", expectedValue: null)'
  ]) assert.equal(rows.filter(row => row.testName === name && row.outcome === 'Passed').length, 1, 'Each real theory value passed for each role');
}
const results = json('RESULTS.json');
same(results.findingStatus, { F166: 'PENDING', F167: 'PENDING', F168: 'PENDING' });
const closing = json('evidence\\closing-state.json');
same(closing.rows.map(row => ({ id: row.id, status: row.status })), [
  { id: 'F166', status: 'pending' }, { id: 'F167', status: 'pending' }, { id: 'F168', status: 'pending' }
]);
assert.equal(closing.generatedKeyRepositoryDirectories.length, 0);
for (const role of ['original', 'default']) {
  assert.equal(evidence(`evidence\\closing-${role}-head.stdout.txt`).toString('utf8').trim(), results.sourcePins[role]);
  assert.equal(evidence(`evidence\\closing-${role}-status.stdout.txt`).toString('utf8').trim(), '## HEAD (no branch)');
  assert(sources.filter(source => source.role === role).every(source => source.pin === results.sourcePins[role]));
}
assert.equal(results.nativeExecutionRows, 84); assert.equal(results.distinctExpandedNativeCaseNames, 33);
same(results.privateProbeRoles, probeSummaries);
const successfulCompiles = attempts.filter(record => /^common-compile-v[1-4]$/.test(record.label) && record.exitCode === 0);
if (archived.size) {
  same(successfulCompiles.map(record => record.label).sort(sort), ['common-compile-v3', 'common-compile-v4'], 'Both successful common compilations, including failed-runtime V3, preserved');
  assert.equal(results.privateSuccessfulCompilationsTotal, 2); assert.equal(results.literalOneSuccessfulCompileTotalGoalMet, false);
  const aborted = attempts.find(record => record.label === 'default-f167-native-runtime-prerequisite');
  assert(aborted && aborted.exitCode !== 0, 'Actual initial exact-runtime prerequisite failure retained');
}
if (envelope) {
  assert(!preseal);
  const outerFiles = fs.readdirSync(capsule, { withFileTypes: true });
  same(outerFiles.filter(entry => entry.isFile()).map(entry => entry.name).sort(sort),
    ['audit-execution.json', 'manifest.json', 'seal.json', 'terminal.json']);
  same(outerFiles.filter(entry => entry.isDirectory()).map(entry => entry.name), ['payload']);
  assert(outerFiles.every(entry => !entry.isSymbolicLink()));
  const seal = parse(fs.readFileSync(path.join(capsule, 'seal.json')));
  for (const name of ['manifest.json', 'audit-execution.json', 'terminal.json']) {
    const data = fs.readFileSync(path.join(capsule, name));
    assert.equal(hash(data), seal.files[name].sha256); assert.equal(data.length, seal.files[name].bytes);
  }
  assert.equal(seal.selectedFileCount, manifest.selectedFileCount); assert.equal(seal.selectedBytes, manifest.selectedBytes);
  const audit = parse(fs.readFileSync(path.join(capsule, 'audit-execution.json')));
  assert(audit.nativeExited && audit.bothStreamsDrained && audit.exitCode === 0 && !audit.stderr);
  const savedResult = JSON.parse(audit.stdout); assert.equal(savedResult.manifestSha256, manifestSha256);
  assert(savedResult.evidenceAuditPassed && savedResult.exactSelectedFileSetPassed);
  const terminal = parse(fs.readFileSync(path.join(capsule, 'terminal.json')));
  assert(terminal.allRecordedRootsAndKnownChildrenTerminal && terminal.allRecordedStreamsDrained);
  assert.equal(terminal.exhaustiveDescendantCensus, false);
}
console.log(JSON.stringify({ evidenceAuditPassed: true, exactSelectedFileSetPassed: !preseal, envelopeAuditPassed: envelope,
  selectedFileCount: manifest?.selectedFileCount ?? null, selectedBytes: manifest?.selectedBytes ?? null, manifestSha256,
  physicalRawSourceSnapshots: sources.length, managedPePdbPairsFreshlyParsed: selected.pairs.length,
  retainedTargetReferenceImagesFreshlyParsed: selected.references.length,
  nativeTrxFilesFreshlyParsed: freshXml.length, nativeExecutionRows: allResults.length,
  distinctExpandedNativeCaseNames: 33, acceptedPrivateProbeRowsPerRole: 6,
  successfulCommonCompilationsTotal: 2, actualRawExecutionReceiptsPreserved: attempts.length,
  completedSupersededPreparationAuditReceiptsPreserved: failedSealAudits.length,
  acceptedAllFileImageUnionKeys: catalogs.unions.acceptedOriginalDefault.rows.length,
  acceptedAllFileImageDifferentKeys: catalogs.unions.acceptedOriginalDefault.differences.length,
  imagePrefixExceptions: [], findingStatus: results.findingStatus,
  boundaries: ['Saved console behavior is not rerun by this audit.', 'Only selected copied bytes are freshly rehashed.',
    'Omitted SDK/runtime/package/native-image file inventories are historical preparation observations, not copied bytes or fresh offline rehashes.',
    'No complete Git tree, compiler-input, physical-source, execution-closure, managed-module or descendant-process attestation.',
    'No candidate implementation, performance verdict, benchmark, timing/allocation counter or child/native process invocation.'] }));
