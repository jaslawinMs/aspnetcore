'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { pe, portablePdb } = require('./Metadata.cjs');
const { embeddedSources } = require('./PdbEmbedded.cjs');
const { inspectPe } = require('./PeExtras.cjs');
const { objectId, treeEntries, commitTree } = require('./GitObjects.cjs');
const { reconcile } = require('./Reconcile.cjs');
const { union, sha } = require('./Inventories.cjs');
const root = __dirname, win = path.win32, cache = new Map(), inspected = new Map();
function filename(name) {
  assert(!path.isAbsolute(name) && !win.isAbsolute(name));
  const resolved = path.resolve(root, name);
  assert(resolved.startsWith(root + path.sep), `Capsule-only read ${name}`);
  return resolved;
}
function raw(name) {
  if (!cache.has(name)) cache.set(name, fs.readFileSync(filename(name)));
  return cache.get(name);
}
function json(name) { return JSON.parse(raw(name).toString('utf8').replace(/^\uFEFF/, '')); }
function list(directory = '') {
  return fs.readdirSync(directory ? filename(directory) : root, { withFileTypes: true }).flatMap(item => {
    const name = directory ? directory + '/' + item.name : item.name;
    assert(!item.isSymbolicLink(), 'Portable capsule has no external symlinks/junctions');
    return item.isDirectory() ? list(name) : [name];
  }).sort();
}
function image(name) {
  if (!inspected.has(name)) inspected.set(name, pe(raw(name)));
  return inspected.get(name);
}
function checksum(bytes, algorithm) {
  const names = { '8829d00f-11b8-4213-878b-770e8597ac16': 'sha256', 'ff1816ec-aa5e-4d10-87f7-6f4963833460': 'sha1' };
  assert(names[algorithm]);
  return crypto.createHash(names[algorithm]).update(bytes).digest('hex').toUpperCase();
}
const manifestBytes = fs.readFileSync(path.join(root, 'MANIFEST.json'));
const manifestHash = sha(manifestBytes);
assert.equal(fs.readFileSync(path.join(root, 'MANIFEST.sha256'), 'utf8').trim().split(/\s+/)[0], manifestHash);
const manifest = JSON.parse(manifestBytes);
const files = list();
assert.deepEqual(files.filter(name => !['MANIFEST.json', 'MANIFEST.sha256'].includes(name)), manifest.files.map(file => file.path).sort());
assert.equal(new Set(manifest.files.map(file => file.path.toLowerCase())).size, manifest.files.length);
for (const file of manifest.files) {
  const bytes = fs.readFileSync(filename(file.path));
  assert.equal(bytes.length, file.bytes, file.path);
  assert.equal(sha(bytes), file.sha256, file.path);
}
assert.equal(manifest.fileCount, manifest.files.length);
assert.equal(manifest.totalBytes, manifest.files.reduce((sum, file) => sum + file.bytes, 0));
const graphs = json('graph-creation.json'), selection = json('native-selection.json'), selected = json('selected-records.json');
assert.equal(graphs.originalCommit, '37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(graphs.defaultCommit, 'adf2e9d22addd1461c6c25e8a8f411be28b81100');
assert.notEqual(graphs.originalPath, graphs.defaultPath);
const acceptance = json('ACCEPTANCE.json');
assert.deepEqual(acceptance.findings, ['F176', 'F177', 'F178', 'F179']);
assert.equal(acceptance.status, 'PENDING'); assert.equal(acceptance.candidates, 0); assert.equal(acceptance.comparisons, 0);
const helpers = json('HELPER-ATTRIBUTION.json');
for (const helper of helpers) assert.equal(sha(raw(helper.name === 'Metadata.cjs' ? 'Metadata.base.cjs' : helper.name)), helper.sha256);
assert.equal(raw('Metadata.cjs').toString('utf8'), raw('Metadata.base.cjs').toString('utf8').replace(
  'module.exports = { pe, portablePdb, typeMethods };',
  'module.exports = { pe, portablePdb, typeMethods, pdbAccess: { streams, tables, indexAt, blobAt, guidAt } };'));
const proofData = json('git-source-proofs.json'), objects = new Map(proofData.objects.map(object => [object.id, object]));
for (const object of proofData.objects) {
  assert.equal(objectId(object.type, raw(object.selected)), object.id);
  assert.equal(raw(object.selected).length, object.bytes);
  assert.equal(sha(raw(object.selected)), object.sha256);
}
const proofMap = new Map();
for (const proof of proofData.proofs) {
  assert.equal(proof.commit, graphs[proof.role + 'Commit']);
  const commit = objects.get(proof.commit); assert(commit && commit.type === 'commit');
  let tree = commitTree(raw(commit.selected)), absent = false;
  assert.equal(tree, proof.rootTree);
  const parts = proof.path.split('/');
  for (const [index, component] of parts.entries()) {
    const object = objects.get(tree); assert(object && object.type === 'tree');
    const entry = treeEntries(raw(object.selected)).find(entry => entry.name === component);
    if (!entry) { absent = true; break; }
    if (index === parts.length - 1) {
      assert(!proof.absent);
      assert.equal(entry.object, proof.blob);
      assert.equal(objectId('blob', raw(proof.selected)), entry.object);
    } else { assert.equal(entry.mode, '40000'); tree = entry.object; }
  }
  assert.equal(absent, proof.absent);
  proofMap.set(`${proof.role}:${proof.path}`, proof);
}
function pinned(source) {
  const proof = proofMap.get(`${source.role}:${source.source}`);
  assert(proof && !proof.absent);
  assert.equal(proof.blob, source.blob);
  assert.equal(objectId('blob', raw(source.rawGitBlob ?? source.selected)), source.blob);
}
for (const source of [...json('source-records.json').records, ...json('additional-source-records.json').records, ...selected.immutableSources]) {
  if (source.absent) { assert(proofMap.get(`${source.role}:${source.source}`).absent); continue; }
  pinned(source);
}
for (const role of ['original', 'default']) for (const [source, expected] of [
  ['src/Mvc/Mvc.Core/src/Builder/ControllerEndpointRouteBuilderExtensions.cs', 'df6d1f42affe726840a5ad7a7fee6e397e654afd'],
  ['src/Mvc/Mvc.Razor/src/Compilation/DefaultViewCompiler.cs', '162da5dfaad6234ae31ad50fd2085c806fa1fdc3']
]) assert.equal(proofMap.get(`${role}:${source}`).blob, expected);
let rawDocuments = 0, embeddedDocuments = 0, logicalDocuments = 0;
const usedDocumentIndices = new Set();
const logicalChecksums = new Map([
  ['D:\\k\\Mvc\\test\\WebSites\\RazorBuildWebSite\\Pages\\Rzc\\Page.cshtml', '994150B02CE31B2E2BC6F6E84A5B2018C2517527'],
  ['D:\\k\\Mvc\\test\\WebSites\\RazorBuildWebSite\\Views\\Common\\CommonView.cshtml', '56260F24A80AE2B8854FD2C9A1005BAE485882CC'],
  ['D:\\k\\Mvc\\test\\WebSites\\RazorBuildWebSite\\Views\\Rzc\\View.cshtml', '56260F24A80AE2B8854FD2C9A1005BAE485882CC']
]);
for (const [pairIndex, pair] of selected.pairs.entries()) {
  const metadata = image(pair.image), pdbBytes = raw(pair.pdb), debug = portablePdb(pdbBytes), embedded = embeddedSources(pdbBytes);
  assert.equal(sha(raw(pair.image)), pair.imageSha256); assert.equal(sha(pdbBytes), pair.pdbSha256);
  assert.equal(metadata.mvid, pair.mvid); assert.deepEqual(metadata.codeviews, pair.codeviews);
  assert(metadata.codeviews.some(view => view.guid === debug.guid && view.stamp === debug.stamp && view.age === 1));
  assert.equal(debug.guid, pair.guid); assert.equal(debug.stamp, pair.stamp);
  assert.equal(debug.documents.length, pair.documentIndices.length);
  for (const [index, native] of debug.documents.entries()) {
    const global = pair.documentIndices[index], record = selected.documents[global];
    assert(!usedDocumentIndices.has(global)); usedDocumentIndices.add(global);
    assert.equal(record.pair, pairIndex); assert.equal(record.index, index); assert.equal(record.role, pair.role);
    for (const key of ['name', 'algorithm', 'checksum']) assert.equal(record[key], native[key]);
    if (record.selected) {
      const bytes = raw(record.selected); rawDocuments++;
      assert.equal(checksum(bytes, native.algorithm), native.checksum);
      assert.equal(sha(bytes), record.sha256); assert.equal(bytes.length, record.bytes);
      if (embedded.has(index)) { assert(embedded.get(index).bytes.equals(bytes)); embeddedDocuments++; }
      if (record.immutableSource) {
        pinned(record.immutableSource);
        const git = raw(record.immutableSource.rawGitBlob);
        assert(bytes.equals(git) || Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n')).equals(git), 'Actual raw/CRLF compiler source agrees with pinned Git blob');
      }
    } else {
      logicalDocuments++;
      assert.equal(pair.name, 'RazorBuildWebSite.Views');
      assert(['original', 'default'].includes(pair.role));
      assert.equal(logicalChecksums.get(native.name), native.checksum);
      assert.equal(native.algorithm, 'ff1816ec-aa5e-4d10-87f7-6f4963833460');
      assert(!embedded.has(index));
      assert(record.directiveWitnesses.length > 0);
      for (const witness of record.directiveWitnesses) {
        pinned(witness.immutableSource);
        const line = raw(witness.immutableSource.rawGitBlob).toString('utf8').split('\n')[witness.line - 1].trim();
        assert.equal(line, witness.directive);
        assert(line.startsWith('#pragma checksum '));
        const parts = line.split('"'); assert.equal(parts.length, 7);
        assert.equal(parts[1], native.name);
        assert.equal(parts[3].replaceAll('{', '').replaceAll('}', '').toLowerCase(), native.algorithm);
        assert.equal(parts[5].toUpperCase(), native.checksum);
      }
    }
  }
}
assert.equal(usedDocumentIndices.size, selected.documents.length);
assert.equal(selected.pairs.length, 24); assert.equal(selected.documents.length, 3946); assert.equal(logicalDocuments, 6);
function nativePair(role, name) {
  const pair = selected.pairs.find(pair => pair.role === role && pair.name === name && pair.kind === 'unchanged-normal-native');
  assert(pair); return pair;
}
const acceptedPair = selected.pairs.find(pair => pair.kind === 'common-compile-05');
assert(acceptedPair);
function inventory(image_) {
  assert.equal(image_.count, image_.files.length);
  assert.equal(image_.bytes, image_.files.reduce((sum, file) => sum + file.bytes, 0));
  assert.equal(new Set(image_.files.map(file => file.path.toLowerCase())).size, image_.files.length);
  for (const file of image_.files) { assert(file.path && file.bytes >= 0 && file.sha256.length === 64); assert(!file.path.startsWith('/') && !file.path.includes('../')); }
}
function inventories(name) {
  const result = json(name);
  for (const [kind, roles] of Object.entries(result.images)) {
    inventory(roles.original); inventory(roles.default);
    const all = union(roles.original.files, roles.default.files);
    assert.deepEqual(result.unions[kind], all);
    assert.deepEqual(result.differences[kind], all.filter(file => file.relation !== 'same'));
  }
  return result;
}
const before = inventories('native-images.json'), after = inventories('native-images-final.json');
const supplementary = inventories('supplemental-native-images.json'), runtime = inventories('runtime-images.json');
const common = json('common-images.json');
inventory(common.accepted); inventory(common.failedPreparation);
assert.equal(common.accepted.count, 4);
for (const file of common.accepted.files) {
  assert.equal(sha(raw('consumer/accepted/' + file.path)), file.sha256);
  assert.equal(sha(raw('consumer/compile-history/common-compile-05/' + file.path)), file.sha256);
}
for (const role of ['original', 'default']) {
  for (const kind of ['core', 'razor', 'assets']) {
    const change = union(before.images[kind][role].files, after.images[kind][role].files).filter(file => file.relation !== 'same');
    if (kind !== 'razor') assert.equal(change.length, 0, 'No native image substitutions');
    else {
      assert.equal(change.length, 4);
      assert(change.every(file => file.relation === 'default-only' && common.accepted.files.some(accepted => accepted.path === file.path && accepted.sha256 === file.default.sha256)));
    }
  }
  const sources = [...Object.values(before.images).map(roles => roles[role]), supplementary.images.staticAssets[role]];
  for (const pair of selected.pairs.filter(pair => pair.role === role && pair.kind === 'unchanged-normal-native')) {
    const matches = sources.flatMap(source => source.files.filter(file => file.path === pair.name + '.dll'));
    assert(matches.length > 0); assert(matches.every(file => file.sha256 === pair.imageSha256));
  }
  for (const copy of common.copies[role].files) {
    const file = common.accepted.files.find(file => file.path === copy.name);
    assert(file && file.sha256 === copy.sha256 && file.bytes === copy.bytes);
    assert.equal(after.images.razor[role].files.find(file => file.path === copy.name).sha256, copy.sha256);
  }
  const config = selected.declarations.find(record => record.role === role && record.assembly === 'Microsoft.AspNetCore.Mvc.Razor.Test' && record.selected.endsWith('.runtimeconfig.json'));
  assert.equal(json(config.selected).runtimeOptions.framework.version, runtime.images.assertion[role].version);
  for (const group of selection.groups) {
    const evaluation = json(`evidence/${role}-${group.kind}-evaluation.stdout.txt`).Properties;
    assert.equal(evaluation.TargetFramework, 'net12.0');
    assert(['', runtime.images.assertion[role].version].includes(evaluation.RuntimeFrameworkVersion),
      'Plain evaluation may precede runtime-resolution targets; generated config and actual loaded runtime are checked independently');
    assert.equal(evaluation.IsTestProject, 'true');
  }
}
assert.deepEqual(common.union, union(common.copies.original.files.map(file => ({ ...file, path: file.name })), common.copies.default.files.map(file => ({ ...file, path: file.name }))));
assert(common.union.every(file => file.relation === 'same'));
const nativeRuns = [];
for (const mode of ['modules', 'hooked']) {
  const saved = json(`native-reconciled-${mode}.json`);
  for (const role of ['original', 'default']) for (const group of selection.groups) {
    const label = `${role}-${group.kind}-${mode}`, directory = win.join(graphs[role + 'Path'], 'artifacts', 'bin', group.assembly, 'Release', 'net12.0');
    const actual = reconcile(raw(`evidence/native-${label}/${label}.trx`).toString('utf8'), group, directory);
    const record = saved.runs.find(run => run.role === role && run.kind === group.kind && run.mode === mode);
    for (const key of ['runId', 'summaryOutcome', 'counters', 'rows']) assert.deepEqual(actual[key], record[key]);
    assert.equal(actual.rows.length, group.kind === 'core' ? 3 : 8);
    nativeRuns.push({ role, kind: group.kind, mode, rows: actual.rows.length });
  }
}
const inputs = json('consumer/inputs.json'), references = inputs.records.filter(record => record.kind.endsWith('reference'));
assert.equal(inputs.languageVersion, '13'); assert.equal(inputs.acceptedAttempt, 'common-compile-05');
assert.equal(inputs.records.length, 199); assert.equal(references.length, 193);
assert.equal(new Set(references.map(record => win.basename(record.source).toLowerCase())).size, references.length);
const originCapsule = win.dirname(win.dirname(inputs.records.find(record => record.kind === 'source').source));
for (const record of inputs.records) {
  assert.equal(raw(record.selected).length, record.bytes); assert.equal(sha(raw(record.selected)), record.sha256);
  if (record.selected.endsWith('.dll')) assert(image(record.selected).mvid, 'Actual managed compiler/reference PE parsed');
  if (record.kind === 'normal-original-reference') assert(record.source.toLowerCase().startsWith(graphs.originalPath.toLowerCase() + '\\'));
}
const response = raw('consumer/compile.rsp').toString('utf8').trim().split('\n');
for (const flag of ['/nostdlib+', '/target:exe', '/main:Program', '/langversion:13', '/nullable:enable', '/deterministic+', '/optimize+', '/debug:portable']) assert(response.includes(flag));
const rspReferences = response.filter(line => line.startsWith('/reference:"')).map(line => line.slice('/reference:"'.length, -1)).sort();
assert.deepEqual(rspReferences, references.map(record => win.join(originCapsule, record.selected.replaceAll('/', '\\'))).sort());
const compilerAttempts = [];
for (const number of ['01', '02', '03', '04', '05']) {
  const label = `common-compile-${number}`, directory = `consumer/compile-history/${label}`, attempt = json(directory + '/attempt.json');
  assert.equal(sha(raw(directory + '/Program.cs')), attempt.sourceSha256);
  assert.equal(sha(raw(directory + '/compile.rsp')), attempt.responseSha256);
  for (const output of attempt.outputs) assert.equal(sha(raw(directory + '/' + output.name)), output.sha256);
  const native = manifest.files.some(file => file.path === `evidence/${label}.receipt.json`);
  if (number === '01') {
    assert(!native); assert.equal(json(directory + '/classification.json').actualCompilerStarted, false);
    assert(raw(`evidence/${label}.wrapper.stderr.txt`).toString('utf8').includes('ArgumentsJson'));
  } else {
    assert(native);
    const receipt = json(`evidence/${label}.receipt.json`);
    assert.equal(receipt.checkout, graphs.originalPath);
    assert.equal(receipt.arguments[0], 'exec');
    assert(receipt.arguments.includes('/noconfig'));
    assert.equal(receipt.exitCode, ['04', '05'].includes(number) ? 0 : 1);
    if (number === '02') assert(raw(`evidence/${label}.stdout.txt`).toString('utf8').includes('CS0104'));
    if (number === '03') assert(raw(`evidence/${label}.stdout.txt`).toString('utf8').includes('CS0117'));
  }
  compilerAttempts.push({ label, actualCompilerStarted: native, wrapperExitCode: attempt.exitCode, successful: attempt.successful });
}
assert.equal(compilerAttempts.filter(attempt => attempt.actualCompilerStarted).length, 4);
assert.equal(compilerAttempts.filter(attempt => attempt.successful).length, 2);
const index = json('identity-index.json'), hosts = index.processes.filter(process => process.classification === 'actual-native-assertion-testhost');
assert.equal(hosts.length, 4);
for (const process of index.processes) {
  const receipt = json(process.receipt), initialize = json(process.initialize);
  assert.equal(initialize.processId, process.processId); assert.equal(initialize.processCreationUtc, process.creationUtc);
  assert(receipt.observedProcesses.some(record => record.processId === process.processId && record.creationUtc === process.creationUtc));
  const classification = process.classification === 'actual-native-assertion-testhost' ? 'assertion' : 'sdk';
  assert.equal(initialize.coreLib.sha256, runtime.selectedModules.find(module => module.classification === classification && module.role === process.role && module.name === 'System.Private.CoreLib.dll').sha256);
  if (classification === 'assertion') {
    assert.equal(process.exit, null); assert.equal(process.completeProcessExitSnapshotAvailable, false);
    const required = process.kind === 'core' ? ['Microsoft.AspNetCore.Mvc.Core', 'Microsoft.AspNetCore.Mvc.Core.Test'] :
      ['Microsoft.AspNetCore.Mvc.Core', 'Microsoft.AspNetCore.Mvc.Razor', 'Microsoft.AspNetCore.Mvc.Razor.Test'];
    const events = process.ownerEvents.map(json);
    for (const name of required) assert(events.some(event => event.assembly.name === name));
    for (const event of events) {
      assert.equal(event.processId, process.processId); assert.equal(event.processCreationUtc, process.creationUtc);
      const pair = nativePair(process.role, event.assembly.name);
      assert.equal(event.assembly.sha256, pair.imageSha256); assert.equal(event.assembly.mvid, image(pair.image).mvid);
      assert.equal(event.coreLib.sha256, initialize.coreLib.sha256);
    }
    assert(!process.allIdentityFiles.some(file => file.selected.endsWith(`/${process.processId}-exit.json`)), 'Missing native ProcessExit is disclosed, never filled from SDK');
  } else {
    assert.equal(runtime.images.sdk[process.role].version, '12.0.0-alpha.1.26557.102');
    if (process.exit) {
      const exit = json(process.exit);
      assert.equal(exit.processId, process.processId); assert.equal(exit.processCreationUtc, process.creationUtc);
      assert.equal(exit.coreLib.sha256, initialize.coreLib.sha256);
    }
  }
}
assert.equal(runtime.images.assertion.original.version, '12.0.0-alpha.1.26562.105');
assert.equal(runtime.images.assertion.default.version, '12.0.0-alpha.1.26569.107');
for (const module of runtime.selectedModules) {
  assert.equal(sha(raw(module.selected)), module.sha256); assert.equal(raw(module.selected).length, module.bytes);
  const extra = inspectPe(raw(module.selected));
  assert.deepEqual(extra.version, module.version); assert.equal(extra.managed, module.managed);
  if (extra.managed) assert.equal(image(module.selected).mvid, module.mvid);
  if (module.snapshot) {
    const snapshot = json(module.snapshot);
    if (module.name === 'System.Private.CoreLib.dll') {
      assert.equal(snapshot.coreLib.sha256, module.sha256); assert.equal(snapshot.coreLib.mvid, module.mvid);
    } else assert(snapshot.nativeModules.some(observed => observed.path === module.source && observed.sha256 === module.sha256));
  }
}
for (const run of index.moduleRuns) {
  const data = json(run.selected), receipt = json(run.receipt);
  assert(data.completed); assert(data.observations.length > 0); assert.equal(data.files.length, run.fileCount);
  const host = receipt.observedProcesses.find(process => process.name === 'testhost.exe'); assert(host);
  const paths = new Set(data.observations.flatMap(observation => {
    assert.equal(observation.processId, host.processId); assert.equal(observation.creationUtc, host.creationUtc);
    return observation.modulePaths;
  }));
  assert(data.files.every(file => paths.has(file.path)));
  if (data.transientErrors.length === 0) assert.equal(paths.size, data.files.length, 'No module filename/prefix exemption');
  const observedCoreLib = data.files.find(file => win.basename(file.path).toLowerCase() === 'system.private.corelib.dll');
  const actual = runtime.selectedModules.find(module => module.role === run.role && module.classification === 'assertion' && module.name === 'System.Private.CoreLib.dll');
  assert.equal(observedCoreLib.sha256, actual.sha256);
  const clr = data.files.find(file => win.basename(file.path).toLowerCase() === 'coreclr.dll');
  assert.equal(clr.sha256, runtime.selectedModules.find(module => module.role === run.role && module.classification === 'assertion' && module.name === 'coreclr.dll').sha256);
}
const expectedSupplemental = [
  ['F176', 'MapControllers_RealRegistration_ReusesDefaultBuilderAndItems', 12],
  ['F177', 'MapDefaultControllerRoute_RepeatedRoutes_ReturnFreshRouteBuilders', 16],
  ['F178', 'MapControllerRoute_NamedRoutes_KeepGlobalAndRouteConventions', 11],
  ['F176', 'MapControllers_SharedDataSource_PreservesFirstRealBuilder', 9],
  ['F177', 'MapDefaultControllerRoute_SharedDataSource_PreservesFirstRealBuilder', 9],
  ['F178', 'MapControllerRoute_SharedDataSource_PreservesFirstRealBuilder', 9],
  ['F179', 'NativePrecompiledViews_CompilerCache_Case_Normalization_Miss_AndPageFactory', 14],
  ['F179', 'NativePrecompiledParts_DuplicatePaths_FirstPartWins_Forward', 7],
  ['F179', 'NativePrecompiledParts_DuplicatePaths_FirstPartWins_Reversed', 7]
];
const originalSupplementalRows = json('evidence/original-producer-02.result.json').rows;
for (const run of index.supplemental) {
  const result = json(run.result), snapshot = json(run.identity), receipt = json(run.receipt);
  assert.equal(result.exitCode, 0); assert.equal(result.failure, null); assert.equal(result.rows.length, 9);
  assert.equal(receipt.exitCode, 0); assert.equal(snapshot.processId, receipt.nativePid); assert.equal(snapshot.processCreationUtc, receipt.nativeCreationUtc);
  const nativeDirectory = win.join(graphs[run.role + 'Path'], 'artifacts', 'bin', 'Microsoft.AspNetCore.Mvc.Razor.Test', 'Release', 'net12.0');
  assert.deepEqual(receipt.arguments.slice(0, 5), ['exec', '--runtimeconfig', win.join(nativeDirectory, 'Microsoft.AspNetCore.Mvc.Razor.Test.runtimeconfig.json'),
    '--depsfile', win.join(nativeDirectory, 'Microsoft.AspNetCore.Mvc.Razor.Test.deps.json')]);
  assert.equal(receipt.arguments[5], win.join(nativeDirectory, 'AutoPerf.Mvc.Initialization.Contracts.dll'));
  assert.equal(receipt.arguments[6], run.role);
  assert.equal(result.consumer.sha256, acceptedPair.imageSha256); assert.equal(result.consumer.mvid, image(acceptedPair.image).mvid);
  for (const [field, name] of [['ownerCore', 'Microsoft.AspNetCore.Mvc.Core'], ['ownerRazor', 'Microsoft.AspNetCore.Mvc.Razor'], ['downstream', 'Microsoft.AspNetCore.Mvc.ViewFeatures']]) {
    const pair = nativePair(run.role, name);
    assert.equal(result[field].sha256, pair.imageSha256); assert.equal(result[field].mvid, image(pair.image).mvid);
  }
  assert.equal(result.nativeAsset.sha256, nativePair(run.role, 'RazorBuildWebSite.Views').imageSha256);
  const staticAssets = snapshot.assemblies.find(assembly => assembly.name === 'Microsoft.AspNetCore.StaticAssets');
  assert(staticAssets);
  assert.equal(staticAssets.sha256, nativePair(run.role, 'Microsoft.AspNetCore.StaticAssets').imageSha256);
  assert.equal(staticAssets.mvid, image(nativePair(run.role, 'Microsoft.AspNetCore.StaticAssets').image).mvid);
  assert.equal(staticAssets.location, receipt.arguments.at(-1), 'Role-own normally built supplemental dependency, no native image substitution');
  for (const [index_, row] of result.rows.entries()) {
    const [finding, name, count] = expectedSupplemental[index_];
    assert.equal(row.finding, finding); assert.equal(row.name, name); assert.equal(row.outcome, 'Passed'); assert.equal(row.checks.length, count);
    assert(row.checks.every(check => typeof check.name === 'string' && check.name.length > 0));
    assert.deepEqual(row.checks.map(check => check.name), originalSupplementalRows[index_].checks.map(check => check.name),
      'Same ordered real checks on both roles; repeated pre/post ItemsContract labels are intentional');
    assert(row.checks.every(check => check.passed === true));
  }
  assert.equal(result.rows.reduce((sum, row) => sum + row.checks.length, 0), 94);
}
const failedProducer = json('evidence/original-producer-01.result.json');
assert.equal(failedProducer.exitCode, 1); assert.equal(failedProducer.rows[0].outcome, 'Failed');
assert(failedProducer.failure.includes('Microsoft.AspNetCore.StaticAssets'));
const terminal = json('TERMINAL.json'), closing = json('closing.json');
const receipts = manifest.files.filter(file => file.path.startsWith('evidence/') && file.path.endsWith('.receipt.json')).map(file => ({ selected: file.path, value: json(file.path) }));
assert.equal(terminal.nativeCommandCount, receipts.length);
assert.equal(terminal.nativeSuccesses, receipts.filter(receipt => receipt.value.exitCode === 0).length);
assert.equal(terminal.nativeFailuresPreserved, receipts.filter(receipt => receipt.value.exitCode !== 0).length);
for (const { selected: name, value: receipt } of receipts) {
  assert(receipt.nativeExited && receipt.bothStreamsDrained && receipt.observedDescendantsDrained);
  assert.equal(receipt.policyHoldActive, false);
  assert.equal(receipt.environment.DOTNET_GENERATE_ASPNET_CERTIFICATE, 'false');
  assert.equal(receipt.environment.DOTNET_ADD_GLOBAL_TOOLS_TO_PATH, 'false');
  assert.equal(receipt.environment.MSBUILDDISABLENODEREUSE, '1');
  assert.equal(receipt.activation, '. .\\activate.ps1');
  for (const stream of ['stdout', 'stderr']) {
    const file = `evidence/${receipt.label}.${stream}.txt`, state = terminal.commandStates.find(state => state.receipt === name);
    assert(state); assert.equal(state[stream].selected, file); assert.equal(state[stream].bytes, raw(file).length);
  }
  for (const observed of receipt.observedProcesses) {
    const state = terminal.processObservations.find(state => state.processId === observed.processId && state.creationUtc === observed.creationUtc);
    assert(state && ['not-running', 'pid-reused-not-owned'].includes(state.terminalState));
  }
}
assert.equal(terminal.actualRemainingOwnedNativeRoots.length, 0); assert.equal(terminal.actualRemainingObservedChildren.length, 0);
assert.equal(terminal.actualRemainingOwnedWrappers.length, 0);
for (const process of terminal.processObservations) {
  assert(['not-running', 'pid-reused-not-owned'].includes(process.terminalState));
  if (process.terminalState === 'pid-reused-not-owned') assert.notEqual(process.creationUtc, process.observedCreationUtc);
}
assert.equal(closing.privateGraphs.length, 2);
for (const graph of closing.privateGraphs) {
  assert.equal(graph.head, graphs[graph.role + 'Commit']); assert.equal(graph.trackedStatus.length, 0); assert.equal(graph.alternatesExist, false);
}
assert.equal(closing.candidates.length, 4); assert(closing.candidates.every(candidate => candidate.status === 'pending'));
const hold = json('control/F140-HOLD-027-ack.json'), release = json('control/F140-RELEASE-027-observed.json');
assert.equal(hold.holdId, 'F140-027'); assert.equal(hold.actualNativeAndSourceHeavyIoQuiesced, true);
assert.equal(hold.actualRemainingOwnedNativeRootCount, 0); assert.equal(hold.actualRemainingObservedChildCount, 0);
assert.equal(release.holdId, 'F140-027'); assert.equal(release.explicitReleaseReceived, true);
assert.equal(release.priorHoldAckSha256, sha(raw('control/F140-HOLD-027-ack.json')));
console.log(JSON.stringify({
  result: 'PASS', status: 'PENDING', findings: acceptance.findings, candidates: 0, comparisons: 0,
  manifestSha256: manifestHash, selectedFiles: manifest.fileCount, selectedBytes: manifest.totalBytes,
  pePdbPairs: selected.pairs.length, pdbDocuments: selected.documents.length, actualRawDocumentsChecked: rawDocuments,
  embeddedSourceDocumentsChecked: embeddedDocuments, historicalLogicalDocumentsWithoutRawBytes: logicalDocuments,
  pinnedSourceProofs: proofData.proofs.length, rawCommitTreeObjects: proofData.objects.length,
  nativeRuns, supplemental: index.supplemental.map(run => ({ role: run.role, rows: run.rows.length, checks: run.totalChecks })),
  compilerAttempts, nativeAssertionRuntime: { original: runtime.images.assertion.original.version, default: runtime.images.assertion.default.version },
  nativeTesthostExitSnapshotsMissing: hosts.filter(process => !process.exit).length,
  recordedNativeCommands: receipts.length, knownProcessIdentities: terminal.processObservations.length, remainingKnownOwnedNative: 0,
  boundary: 'Read-only offline reparse of selected bytes/XML/identities/commit-tree membership and complete declared inventories. No fresh native execution, performance/candidate verdict, complete native managed-exit closure, missing historical logical-source attestation, uncopied SDK/runtime/distribution replay or exhaustive process census.'
}, null, 2));
