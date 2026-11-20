import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { sha, record, pe, pdb, source, trx, differences } from './evidence.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const read = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const local = f => {
  const p = path.resolve(root, f);
  assert.ok(p.startsWith(root + path.sep), `Nonportable selected path: ${f}`);
  return p;
};
const manifest = read('manifest.json'), facts = read('facts.json'), inventories = read('inventories.json');
for (const item of manifest.files) assert.deepEqual(record(local(item.path)), { bytes: item.bytes, sha256: item.sha256 }, item.path);
for (const line of fs.readFileSync(local('SHA256SUMS.txt'), 'utf8').trim().split('\n')) {
  const [expected, relative] = line.split('  '); assert.equal(record(local(relative)).sha256, expected, relative);
}
function allFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? allFiles(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}
assert.equal(allFiles(root).length, manifest.files.length + 2, 'Unexpected/missing capsule payload');
assert.ok(allFiles(root).length <= 250);
let documentChecks = 0, selectedPePairs = 0;
const loaded = read('loaded-images.json');
assert.equal(loaded.hookErrors.length, 0);
for (const role of ['original37', 'default']) {
  const r = facts.roles[role];
  for (const [file, expected] of Object.entries(r.sources)) {
    const actual = source(local(`sources/${role}/${file}`));
    const { savedIndexBlobSha1, ...saved } = expected;
    assert.deepEqual(actual, saved, file);
    assert.equal(actual.gitLfBlobSha1, savedIndexBlobSha1, `Git LF blob ${file}`);
  }
  for (const image of r.images) {
    const actualPe = pe(local(image.dll)), actualPdb = pdb(local(image.pdb));
    assert.deepEqual(actualPe, image.image);
    assert.deepEqual(actualPdb, image.symbols);
    assert.ok(actualPe.codeView.some(c => c.guid === actualPdb.idGuid && c.stamp === actualPdb.idStamp && c.age === 1));
    selectedPePairs++;
  }
  for (const check of r.sourceDocumentChecks) {
    const actualPdb = pdb(local(check.pdb));
    const document = actualPdb.documents.find(d => d.row === check.documentRow);
    assert.equal(document.algorithm, '8829d00f-11b8-4213-878b-770e8597ac16');
    assert.equal(document.checksum, record(local(check.source)).sha256);
    assert.equal(document.checksum, check.rawSha256);
    documentChecks++;
  }
  for (const seam of ['MemberAssignment.cs', 'ResourceAssetCollection.cs', 'ImportMapDefinition.cs']) {
    assert.ok(r.sourceDocumentChecks.some(c => c.source.endsWith('/' + seam)), `Missing fresh PDB Document seam ${role}/${seam}`);
  }
  for (const group of ['components', 'endpoints']) {
    const witnesses = loaded.loaded.filter(x => x.file.startsWith(`identity/${role}/${group}/`) &&
      /testhost\.(exe|dll)/i.test(x.receipt.processPath + ' ' + x.receipt.commandLine));
    assert.ok(witnesses.length, `Actual testhost capture ${role}/${group}`);
    const owner = group === 'components' ? 'Microsoft.AspNetCore.Components' : 'Microsoft.AspNetCore.Components.Endpoints';
    const selected = r.images.find(i => i.project === owner);
    const test = r.images.find(i => i.project === owner + '.Tests');
    for (const image of [selected, test]) {
      assert.ok(witnesses.some(w => w.receipt.assemblies.some(a => a.name.startsWith(image.project + ',') &&
        a.sha256 === image.image.sha256 && a.mvid === image.image.mvid)), `Loaded selected owner/test identity ${role}/${image.project}`);
    }
    assert.ok(witnesses.some(w => w.receipt.assemblies.some(a => a.name.startsWith('System.Private.CoreLib,'))));
    assert.ok(witnesses.some(w => w.receipt.modules.some(m => m.name.toLowerCase() === 'coreclr.dll')));
    const wanted = role === 'original37' ? '12.0.0-alpha.1.26562.105' : '12.0.0-alpha.1.26569.107';
    assert.ok(witnesses.every(w => w.receipt.runtimeDirectory.includes(wanted)));
    assert.ok(witnesses.every(w => w.receipt.launchId === `040-${role}-${group}-loaded`));
  }
  const supplemental = facts.supplemental.find(s => s.commandId === `041-${role}-supplemental-public-contracts`);
  assert.equal(supplemental.exitCode, 0);
  assert.equal(supplemental.parsed.results.length, 7);
  assert.ok(supplemental.parsed.results.every(r => r.passed));
  const consoleWitnesses = loaded.loaded.filter(w => w.file.startsWith(`identity/${role}/supplement/`) &&
    w.receipt.pid === supplemental.parsed.pid && w.receipt.launchId === supplemental.commandId);
  assert.ok(consoleWitnesses.some(w => w.receipt.phase === 'supplemental-complete'));
  for (const owner of ['Microsoft.AspNetCore.Components', 'Microsoft.AspNetCore.Components.Endpoints']) {
    const selected = r.images.find(i => i.project === owner);
    assert.ok(consoleWitnesses.some(w => w.receipt.assemblies.some(a => a.name.startsWith(owner + ',') &&
      a.sha256 === selected.image.sha256 && a.mvid === selected.image.mvid)), `Supplemental actual ${role} owner identity`);
  }
}
for (const report of facts.reports) {
  const fresh = trx(local(report.file));
  assert.deepEqual(fresh, report.parsed);
  const executed = fresh.results.length;
  assert.equal(+fresh.counters.executed, executed);
  assert.equal(+fresh.counters.passed, fresh.results.filter(r => r.outcome === 'Passed').length);
  for (const row of fresh.results) {
    const definition = fresh.definitions.find(d => d.attributes.id === row.testId);
    assert.ok(definition, row.testId);
    assert.equal(definition.execution.id, row.executionId);
    assert.ok(fresh.entries.some(e => e.testId === row.testId && e.executionId === row.executionId));
  }
}
assert.equal(facts.nativePassed, 58);
assert.equal(facts.nativeFailed, 0);
assert.equal(facts.supplementalPassed, 14);
assert.equal(facts.commonSuccessfulCompilations, 1);
for (const [file, identity] of Object.entries(facts.common)) assert.deepEqual(record(local(file)), identity);
const commonPe = pe(local('common/ContractIdentity.dll')), commonPdb = pdb(local('common/ContractIdentity.pdb'));
assert.ok(commonPe.codeView.some(c => c.guid === commonPdb.idGuid && c.stamp === commonPdb.idStamp));
const commonDocument = commonPdb.documents.find(d => d.name.endsWith('Program.cs'));
assert.equal(commonDocument.checksum, record(local('common/Program.cs')).sha256);
for (const role of ['original37', 'default']) {
  assert.ok(loaded.loaded.some(w => w.file.startsWith(`identity/${role}/`) && w.receipt.assemblies.some(a =>
    a.name.startsWith('ContractIdentity,') && a.sha256 === commonPe.sha256)));
}
const commands = read('command-bundle.json');
for (const c of commands) {
  for (const stream of ['stdout', 'stderr']) {
    if (!c[stream].missing) assert.equal(sha(Buffer.from(c[stream].utf8)), c[stream].sha256, c.receipt.id + '/' + stream);
  }
  assert.equal(c.receipt.rootAwaited, true, c.receipt.id);
  assert.equal(c.receipt.stdoutAwaited, true, c.receipt.id);
  assert.equal(c.receipt.stderrAwaited, true, c.receipt.id);
}
assert.equal(commands.filter(c => c.receipt.id.includes('common') && c.receipt.arguments[0] === 'build' && c.receipt.exitCode === 0).length, 1);
assert.deepEqual(differences(inventories.original37, inventories.default), read('all-differences.json'));
const terminal = read('terminal-native-work.json');
assert.equal(terminal.actualOwnedNativeChildrenTerminal, true);
assert.equal(terminal.actualOwnedStreamsDrained, true);
console.log(JSON.stringify({
  result: 'PASS', selectedFiles: allFiles(root).length, nativePassed: 58, supplementalPassed: 14,
  actualAssertionRuntimeCount: 2, freshPePdbPairsIncludingCommon: selectedPePairs + 1,
  freshPdbDocumentRawSourceChecks: documentChecks + 1,
  savedDeclaredDifferences: read('all-differences.json').length,
  boundary: 'Freshly parsed selected PE/PDB/Documents/XML and capsule hashes only. Runtime observations and omitted-file hashes are saved receipts, not live recapture/full compiler-input attestation. No process/native/.NET launch or external path read.'
}, null, 2));
