'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), zlib = require('node:zlib');
const assert = require('node:assert/strict');
const metadata = require('./Metadata.cjs'), { parseXml, elements } = require('./Xml.cjs');
assert(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--preflight'), 'Read-only audit only');
const preflight = process.argv[2] === '--preflight', root = __dirname;
const local = relative => {
  assert(!/^(?:[a-z]:|[\\/])/i.test(relative) && !relative.split(/[\\/]/).includes('..'), 'Selected relative files only');
  return path.join(root, ...relative.split(/[\\/]/));
};
const bytes = relative => fs.readFileSync(local(relative));
const text = relative => bytes(relative).toString('utf8').replace(/^\uFEFF/, '');
const json = relative => JSON.parse(text(relative));
const zipJson = relative => JSON.parse(zlib.gunzipSync(bytes(relative)).toString('utf8'));
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const walk = directory => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
let manifest = null;
if (!preflight) {
  const raw = bytes('MANIFEST.json');
  assert.equal(hash(raw), text('MANIFEST.sha256').trim());
  manifest = JSON.parse(raw);
  const expected = manifest.files.map(file => file.path).sort();
  const actual = walk(root).map(file => path.relative(root, file).split(path.sep).join('\\'))
    .filter(file => !['MANIFEST.json', 'MANIFEST.sha256'].includes(file)).sort();
  assert.deepEqual(actual, expected, 'Complete selected payload file set');
  for (const file of manifest.files) {
    const data = bytes(file.path); assert.equal(data.length, file.bytes); assert.equal(hash(data), file.sha256, file.path);
  }
  assert.equal(manifest.totalFiles, manifest.files.length + 2);
  assert.equal(manifest.payloadBytes, manifest.files.reduce((sum, file) => sum + file.bytes, 0));
  assert.equal(manifest.totalBytes, manifest.payloadBytes + raw.length + bytes('MANIFEST.sha256').length);
  assert(manifest.totalFiles <= 250, 'Compact selected file cap');
}
const pairs = json('evidence\\pe-pdb-source.json');
let documentsChecked = 0;
for (const pair of pairs) {
  const peBytes = bytes(pair.selectedDll), pdbBytes = bytes(pair.selectedPdb);
  const pe = metadata.pe(peBytes), pdb = metadata.portablePdb(pdbBytes);
  assert.equal(hash(peBytes), pair.peSha256); assert.equal(hash(pdbBytes), pair.pdbSha256);
  assert.equal(pe.mvid, pair.mvid); assert.deepEqual(pe.codeviews, pair.codeviews);
  assert.equal(pdb.guid, pair.pdbGuid); assert.equal(pdb.stamp, pair.pdbStamp);
  assert(pe.codeviews.some(item => item.guid === pdb.guid && item.stamp === pdb.stamp && item.age === 1));
  assert.deepEqual(pdb.documents, pair.documents, 'PDB Document table freshly parsed, not trusted from a saved receipt');
  for (const selected of pair.selectedSources) {
    const parsed = pdb.documents.find(document => document.name === selected.document.name);
    assert.deepEqual(parsed, selected.document);
    assert.equal(parsed.algorithm, '8829d00f-11b8-4213-878b-770e8597ac16');
    assert.equal(hash(bytes(selected.snapshot)), parsed.checksum, selected.snapshot);
    documentsChecked++;
  }
  assert.equal(pair.fullCompilerInputAttestation, false);
}
assert.equal(pairs.length, 8);
for (const source of json('evidence\\git-raw-source.json')) {
  const raw = bytes(source.snapshot), lf = Buffer.from(raw.toString('utf8').replaceAll('\r\n', '\n'), 'utf8');
  assert.equal(hash(raw), source.rawSha256); assert.equal(hash(lf), source.lfSha256);
  const actualGit = crypto.createHash('sha1').update(Buffer.from(`blob ${lf.length}\0`)).update(lf).digest('hex');
  assert.equal(actualGit, source.gitBlob);
  assert.equal(source.crlfPairs, raw.toString('utf8').split('\r\n').length - 1);
}
const methods = metadata.typeMethods(bytes('selected\\reference\\netstandard.dll'), 'System.Collections.Generic', 'Dictionary`2');
assert(!methods.includes('TryAdd'), 'Actual declared netstandard2.0 reference Dictionary has no TryAdd instance API');
const xmlReceipt = json('evidence\\real-xml-parse.json'), xmlSummary = [];
for (const role of ['original', 'default', 'default69']) {
  const file = `evidence\\native-${role}.trx`, document = parseXml(text(file)), expected = xmlReceipt.find(item => item.role === role);
  assert.equal(hash(bytes(file)), expected.reportSha256);
  assert.equal(document.attributes.xmlns, 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010');
  const rows = elements(document, 'UnitTestResult').map(row => ({
    testName: row.attributes.testName, testId: row.attributes.testId, executionId: row.attributes.executionId, outcome: row.attributes.outcome
  }));
  const definitions = elements(document, 'UnitTest'), entries = elements(document, 'TestEntry');
  assert.deepEqual(rows, expected.rows.map(({ testName, testId, executionId, outcome }) => ({ testName, testId, executionId, outcome })));
  assert.equal(new Set(rows.map(row => row.testId)).size, rows.length);
  assert.equal(new Set(rows.map(row => row.executionId)).size, rows.length);
  assert.equal(definitions.length, expected.definitions.length);
  for (const row of rows) {
    const definition = definitions.find(item => item.attributes.id === row.testId);
    assert(definition); assert.equal(definition.attributes.name, row.testName);
    assert.equal(elements(definition, 'Execution')[0].attributes.id, row.executionId);
    assert(entries.some(item => item.attributes.testId === row.testId && item.attributes.executionId === row.executionId));
  }
  const counters = elements(document, 'Counters')[0].attributes;
  assert.deepEqual(counters, Object.fromEntries(expected.counters.map(item => [item.name, item.value])));
  assert.equal(Number(counters.total), rows.length);
  assert.equal(Number(counters.passed), rows.filter(row => row.outcome === 'Passed').length);
  assert.equal(elements(document, 'ResultSummary')[0].attributes.outcome, expected.runOutcome);
  if (role !== 'default') {
    assert.equal(rows.length, 15); assert(rows.every(row => row.outcome === 'Passed'));
    for (const id of ['BAIC001', 'BAIC002', 'BAIC003', 'BAIC004', 'BAIC005'])
      assert.equal(rows.filter(row => row.testName.includes('InvalidBlock_ReportsDeclarationDiagnostic') && row.testName.includes(`"${id}"`)).length, 1);
    assert.equal(rows.filter(row => row.testName.startsWith('AlwaysTestTests.')).length, 2, 'Fixture rows retained, not silently counted as target behaviors');
  } else {
    assert.equal(rows.length, 0); assert.equal(expected.runOutcome, 'Failed');
    assert(text(file).includes('12.0.0-alpha.1.26569.107'));
  }
  xmlSummary.push({ role, rows: rows.length, outcomes: rows.map(row => row.outcome), runOutcome: expected.runOutcome });
}
const catalogs = zipJson('evidence\\complete-image-catalogs.json.gz');
function difference(a, b) {
  const left = new Map(a.files.map(file => [file.path, file])), right = new Map(b.files.map(file => [file.path, file]));
  return [...new Set([...left.keys(), ...right.keys()])].sort()
    .map(key => ({ path: key, left: left.get(key) ?? null, right: right.get(key) ?? null }))
    .filter(row => !row.left || !row.right || row.left.sha256 !== row.right.sha256 || row.left.bytes !== row.right.bytes);
}
for (const [name, before] of Object.entries(catalogs.before)) {
  assert.deepEqual(difference(before, catalogs.after[name]), [], `Complete image stability: ${name}`);
}
for (const image of [...Object.values(catalogs.after), ...catalogs.omittedPackages]) {
  assert(image.allEntries); assert.deepEqual(image.prefixExceptions, []); assert.equal(image.copiedAsWholeImage, false);
  assert.equal(new Set(image.files.map(file => file.path)).size, image.files.length);
}
const differences = json('evidence\\image-differences.json');
assert.deepEqual(difference(catalogs.after.Common, catalogs.after.ProjectedDefault), differences.commonVsProjectedDefault);
assert.deepEqual(difference(catalogs.after.OriginalNative, catalogs.after.DefaultNative), differences.originalNativeVsDefaultNative);
assert.deepEqual(differences.commonVsProjectedDefault.map(item => item.path), [
  'Microsoft.AspNetCore.Components.AI.SourceGenerators.dll', 'Microsoft.AspNetCore.Components.AI.SourceGenerators.pdb'
]);
assert.equal(differences.differentSourceRuntimeClosuresAreNotCausalPerformancePair, true);
const original = json('evidence\\probe-original-v2\\result.json'), projected = json('evidence\\probe-projected-default-v2\\result.json');
for (const probe of [original, projected]) {
  assert.equal(probe.completed, true); assert.equal(probe.rows.length, 4); assert(probe.rows.every(row => row.passed));
  assert.equal(probe.runtime, '.NET 12.0.0-alpha.1.26562.105');
  assert.equal(probe.fullCompilerInputAttestation, false); assert.equal(probe.performanceMeasurement, false);
  assert.deepEqual([...probe.declaredReference.dictionaryMethods].sort(), [...methods].sort(), 'Declared reference method inventory; ordering culture is not API identity');
  assert.equal(probe.declaredReference.sha256, hash(bytes('selected\\reference\\netstandard.dll')));
  for (const identity of [probe.owner, probe.producer, probe.common]) {
    const pair = pairs.find(item => item.peSha256 === identity.sha256); assert(pair); assert.equal(pair.mvid, identity.mvid);
  }
  const core = probe.loadedAssemblies.find(item => item.name.startsWith('System.Private.CoreLib,'));
  assert(core); assert.equal(core.sha256, hash(bytes('selected\\runtime62\\System.Private.CoreLib.dll')));
  assert.equal(core.mvid, metadata.pe(bytes('selected\\runtime62\\System.Private.CoreLib.dll')).mvid);
  for (const item of [...probe.loadedAssemblies, ...probe.modules])
    assert(catalogs.actualLoadedUnion.some(record => record.path === item.path && record.sha256 === item.sha256));
  for (const name of ['hostfxr.dll', 'hostpolicy.dll', 'coreclr.dll', 'clrjit.dll']) {
    const item = probe.modules.find(record => record.path.toLowerCase().endsWith('\\' + name)); assert(item);
    assert.equal(item.sha256, hash(bytes(`selected\\host\\${name}`)));
  }
  assert.deepEqual(probe.findings, { F160: 'PENDING', F161: 'PENDING', F162: 'PENDING' });
}
assert.equal(original.common.sha256, projected.common.sha256); assert.equal(original.producer.sha256, projected.producer.sha256);
assert.notEqual(original.owner.sha256, projected.owner.sha256);
assert(projected.scope.includes('NOT a whole-default graph'));
assert.deepEqual(original.rows, projected.rows, 'Actual diagnostics/semantic properties/generated registrations match across explicitly bounded roles');
for (const row of original.rows) {
  assert.equal(row.generatedCompilationErrors, 0);
  assert.equal(row.actualRegistrationCountAfterTwoCalls, 2 * row.exactRegistrationOrder.length);
  const folder = `evidence\\probe-original-v2\\${row.name}`;
  const input = text(`${folder}\\input.cs`);
  for (let index = 0; index < row.diagnostics.length; index++) {
    const diagnostic = row.diagnostics[index];
    if (diagnostic.id === 'BAIC008') {
      assert.equal(diagnostic.locationKind, 'None'); assert.equal(diagnostic.length, 0);
    } else {
      assert.equal(diagnostic.locationKind, 'ExternalFile'); assert.equal(diagnostic.path, `${row.name}.cs`);
      const property = ['Second', 'Third', 'FallbackDuplicate', 'Unusable'][index];
      assert.equal(input.slice(diagnostic.start, diagnostic.start + diagnostic.length), property, 'Exact real diagnostic property identifier span');
      const preceding = input.slice(0, diagnostic.start).split(/\r\n|\r|\n/);
      assert.equal(diagnostic.startLine, preceding.length); assert.equal(diagnostic.startColumn, preceding.at(-1).length + 1);
    }
  }
  for (const hint of row.generatedHintNames)
    assert.deepEqual(bytes(`${folder}\\${hint}`), bytes(`evidence\\probe-projected-default-v2\\${row.name}\\${hint}`));
  const registration = text(`${folder}\\GeneratedToolBlockRegistrations.g.cs`);
  let cursor = 0;
  for (const type of row.exactRegistrationOrder) {
    const statement = `options.AddBlockHandler(new ${type}());`, at = registration.indexOf(statement, cursor);
    assert(at >= cursor, 'Exact emitted registration order'); cursor = at + statement.length;
  }
}
for (const [prefix, block, lookup] of [
  ['F161', 'ParameterBlock', 'args.TryGetValue'],
  ['F162', 'ResultBlock', '__resultObj.TryGetProperty']
]) {
  const row = original.rows.find(item => item.name.startsWith(prefix)), generated = text(`evidence\\probe-original-v2\\${row.name}\\${block}Handler.g.cs`);
  assert.deepEqual(row.diagnostics.map(item => item.id), prefix === 'F161'
    ? ['BAIC006', 'BAIC006', 'BAIC006', 'BAIC007'] : ['BAIC010', 'BAIC010', 'BAIC010', 'BAIC007']);
  for (const key of ['key', 'KEY', 'Fallback', 'EmptyName', 'NullName', 'setter'])
    assert(generated.includes(`${lookup}("${key}"`), `Actual emitted key identity ${prefix}/${key}`);
  for (const property of ['Second', 'Third', 'FallbackDuplicate', 'Unusable'])
    assert(!generated.includes(`state.${property} =`), `Duplicate/unusable property must not be emitted ${property}`);
}
const attempts = zipJson('evidence\\all-attempts.json.gz');
for (const entry of attempts) {
  const data = Buffer.from(entry.utf8, 'utf8'); assert.equal(data.length, entry.bytes); assert.equal(hash(data), entry.sha256);
}
const state = json('RESULTS.json');
assert.deepEqual(state.findings, { F160: 'PENDING', F161: 'PENDING', F162: 'PENDING' });
assert.equal(state.fullDefaultNativeExecution, true); assert.equal(state.nativeDefaultRowsExecuted, 15);
assert.equal(state.nativeDefaultInitialAbortedRowsExecuted, 0); assert.equal(state.fullCompilerInputAttestation, false);
assert.equal(state.finalCommonSuccessfulCompiles, 1); assert.equal(state.totalSuccessfulVerifierCompilesIncludingFailedV1, 2);
const native69 = json('evidence\\native-default69-identities.json'), observations = json('evidence\\default69-native-module-observations.json');
assert.equal(native69.completeManagedAssemblyCensus, false); assert.equal(native69.generatorAndAiProducerPresentInModuleSnapshots, false);
assert.equal(observations.observations.length, 17); assert.equal(observations.files.length, 106);
assert.deepEqual([...new Set(observations.observations.map(item => item.pid))], native69.testhostPids);
for (const item of observations.files)
  assert(catalogs.actualLoadedUnion.some(record => record.path === item.path && record.sha256 === item.sha256 && record.bytes === item.bytes));
assert(observations.observations.some(item => item.modulePaths.includes(native69.consumer.path)));
assert.equal(native69.consumer.sha256, hash(bytes(native69.consumer.selected)));
assert.equal(native69.consumer.mvid, metadata.pe(bytes(native69.consumer.selected)).mvid);
for (const item of native69.runtime69) {
  assert.equal(hash(bytes(item.selected)), item.sha256); assert.equal(bytes(item.selected).length, item.bytes);
  assert(item.path.includes('12.0.0-alpha.1.26569.107'));
  assert(observations.files.some(file => file.path === item.path && file.sha256 === item.sha256));
  if (item.mvid) {
    const pe = metadata.pe(bytes(item.selected)); assert.equal(pe.mvid, item.mvid); assert.deepEqual(pe.codeviews, item.codeviews);
  }
}
assert.equal(native69.hostfxr.sha256, hash(bytes('selected\\host\\hostfxr.dll')));
const configuration = json('selected\\default-native-tests\\Microsoft.AspNetCore.Components.AI.SourceGenerators.Tests.runtimeconfig.json');
assert.equal(configuration.runtimeOptions.framework.version, '12.0.0-alpha.1.26569.107');
const terminal = json('TERMINAL-RECEIPT.json');
assert(terminal.nativeReceipts.every(item => item.nativeExited && item.bothStreamsDrained && !item.sameInvocationStillAlive));
assert.equal(terminal.nativeReceipts.length, 32);
assert.equal(terminal.exhaustiveDescendantCensus, false);
console.log(JSON.stringify({ result: 'PASS', mode: preflight ? 'read-only-preflight' : 'read-only-portable-selected-file-audit',
  manifestSha256: manifest ? hash(bytes('MANIFEST.json')) : null, selectedFiles: manifest?.totalFiles ?? null,
  selectedBytes: manifest?.totalBytes ?? null, freshlyParsedPePdbPairs: pairs.length, freshlyParsedRawPdbDocuments: documentsChecked,
  nativeXml: xmlSummary, privateProbeRowsPerExplicitRole: original.rows.length, exactCommonImageDifferences: differences.commonVsProjectedDefault.map(item => item.path),
  nativeImageDifferences: differences.originalNativeVsDefaultNative.length,
  xmlBoundary: 'Bounded structural XML parser, cross-checked against preserved real System.Xml.XmlDocument receipts; not a validating general-purpose XML implementation.',
  noDotnetOrChildProcess: true, noExternalGraphReads: true, fullCompilerInputAttestation: false, findings: state.findings }, null, 2));
