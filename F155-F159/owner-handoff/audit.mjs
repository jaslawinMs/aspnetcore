import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { hash, readJson, parsePe, parsePdb, parseTrx, parseXunit, parseXml } from './evidence.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const resolve = relative => {
  assert(!path.isAbsolute(relative) && !relative.includes(':') && !relative.split(/[\\/]/).includes('..'), 'Nonrelative capsule path');
  return path.join(root, ...relative.split(/[\\/]/));
};
const json = relative => readJson(resolve(relative)), bytes = relative => fs.readFileSync(resolve(relative));
const manifest = json('manifest.json'), manifestNames = new Set(manifest.files.map(f => f.path));
for (const file of manifest.files) {
  const data = bytes(file.path);
  assert.equal(data.length, file.bytes, `Length ${file.path}`);
  assert.equal(hash(data), file.sha256, `SHA256 ${file.path}`);
}
const walk = directory => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(directory, e.name)) : [path.join(directory, e.name)]);
const actualFiles = walk(root).map(p => path.relative(root, p).split(path.sep).join('\\')).sort();
assert.deepEqual(actualFiles, [...manifestNames, 'manifest.json', 'SHA256SUMS.txt'].sort(), 'Unmanifested or missing selected files');
const shaLines = bytes('SHA256SUMS.txt').toString('utf8').trimEnd().split('\n');
assert.equal(shaLines.length, manifest.files.length + 1);
for (const line of shaLines) {
  const separator = line.indexOf('  '), digest = line.slice(0, separator), filename = line.slice(separator + 2).replace(/\r$/, '');
  assert.equal(hash(bytes(filename)), digest, `Hash list ${filename}`);
}
const requirements = json('requirements-and-assertion-receipts.json'), stable = json('stable-findings.json');
assert.deepEqual(Object.keys(stable).sort(), ['F155', 'F156', 'F157', 'F158', 'F159']);
for (const finding of requirements.findings) {
  assert.equal(finding.status, 'PENDING'); assert.equal(stable[finding.id].status, 'pending');
  assert.equal(stable[finding.id].finding.line_start, finding.originalLine);
}
const common = json('common-verifier.json');
for (const file of common.files) assert.equal(hash(bytes(`identity\\${file.name}`)), file.sha256);
const identityProject = parseXml(bytes('identity\\Identity.csproj').toString('utf8'));
assert(identityProject.children.some(g => g.children.some(n => n.name === 'LangVersion' && n.text === '13.0')));
const reports = [], inventories = [], factsList = [];
for (const role of json('roles.json')) {
  const facts = json(`${role.name}\\facts.json`), inventory = json(`${role.name}\\inventory.json`);
  factsList.push(facts); inventories.push(inventory);
  assert.equal(facts.role.commit, role.commit);
  for (const source of facts.sourceRows) {
    const raw = bytes(source.capsulePath), lf = Buffer.from(raw.toString('utf8').replaceAll('\r\n', '\n'));
    assert.equal(hash(raw), source.physicalSha256);
    assert.equal(raw.length, source.physicalBytes);
    assert.equal(hash(lf), source.gitLfSha256);
    assert.equal(hash(Buffer.concat([Buffer.from(`blob ${lf.length}\0`), lf]), 'sha1'), source.gitBlob);
    assert.equal(raw.toString('utf8').split('\r\n').length - 1, source.crlfCount);
  }
  const testSource = bytes(facts.sourceRows.find(s => s.filename.endsWith('/ValidationProblemDetailsWrapperTest.cs')).capsulePath).toString('utf8');
  assert.equal((testSource.match(/\[Fact\]/g) ?? []).length, 5);
  assert.equal((testSource.match(/new DataContractSerializer\(/g) ?? []).length, 5);
  assert.equal((testSource.match(/\.ReadObject\(/g) ?? []).length, 3);
  assert.equal((testSource.match(/\.WriteObject\(/g) ?? []).length, 2);
  for (const finding of requirements.findings) {
    assert(testSource.includes(`public void ${finding.method}()`));
    const lines = testSource.split(/\r?\n/);
    assert(lines[finding.originalLine - 1].includes('new DataContractSerializer('), `${finding.id} original site`);
  }
  for (const owner of facts.pePdb) {
    const pe = parsePe(bytes(owner.dllPath)), pdb = parsePdb(bytes(owner.pdbPath));
    assert.deepEqual(pe, owner.pe);
    assert.equal(pe.codeView[0].guid, pdb.guid); assert.equal(pe.codeView[0].stamp, pdb.stamp);
    assert.equal(pdb.guid, owner.pdb.guid); assert.equal(pdb.stamp, owner.pdb.stamp);
    assert.equal(pdb.documentCount, owner.pdb.documentCount);
    for (const document of owner.pdb.documents) {
      const parsed = pdb.documents.find(d => d.row === document.row);
      const { sourcePath, ...saved } = document;
      assert.deepEqual(parsed, saved);
      assert.equal(parsed.checksum, hash(bytes(sourcePath)));
    }
  }
  for (const report of facts.reports) {
    const parsed = report.kind === 'trx' ? parseTrx(bytes(report.capsulePath).toString('utf8')) : parseXunit(bytes(report.capsulePath).toString('utf8'));
    assert.deepEqual(parsed, report.parsed);
    if (parsed.rows.length) {
      assert.equal(parsed.rows.length, 5);
      for (const finding of requirements.findings) {
        const row = parsed.rows.find(r => (r.testName ?? r.name) === finding.fullyQualifiedName);
        assert(row); assert(['Passed', 'Pass'].includes(row.outcome ?? row.result));
      }
    }
    reports.push({ file: report.capsulePath, rows: parsed.rows.length, outcome: parsed.outcome ?? parsed.assembly.passed });
  }
  const loaded = json(facts.consoleIdentityPath);
  assert.equal(loaded.pid, facts.consoleIdentityPid);
  assert(loaded.commandLine.includes('xunit.console.dll'));
  assert.equal(loaded.errors.length, 0);
  assert(loaded.framework.includes(facts.runtimeconfig.runtimeOptions.framework.version));
  for (const binary of facts.binaries) {
    const raw = bytes(binary.capsulePath), pe = parsePe(raw);
    assert.equal(hash(raw), binary.sha256); assert.deepEqual(pe, binary.pe);
    if (binary.mvid) assert.equal(pe.mvid, binary.mvid);
    assert([...loaded.assemblies, ...loaded.modules].some(i => i.path === binary.sourcePath && i.sha256 === binary.sha256));
  }
  for (const requiredName of ['Microsoft.AspNetCore.Mvc.Formatters.Xml.Test.dll', 'Microsoft.AspNetCore.Mvc.Formatters.Xml.dll', 'System.Private.CoreLib.dll', 'System.Private.DataContractSerialization.dll', 'dotnet.exe', 'hostfxr.dll', 'hostpolicy.dll', 'coreclr.dll']) {
    assert(facts.binaries.some(b => b.sourcePath.split(/[\\/]/).at(-1) === requiredName), `Missing loaded ${requiredName}`);
  }
  for (const file of inventory.allBinFiles) {
    assert(/^[0-9a-f]{64}$/.test(file.sha256));
    if (file.selectedPath) assert.equal(hash(bytes(file.selectedPath)), file.sha256);
  }
}
const differences = json('all-differences.json').differences, expectedDifferences = [];
function compare(scope, a, b, key) {
  const left = new Map(a.map(r => [key(r), r])), right = new Map(b.map(r => [key(r), r]));
  for (const name of [...new Set([...left.keys(), ...right.keys()])].sort()) {
    const l = left.get(name), r = right.get(name);
    if (l?.sha256 !== r?.sha256 || !l || !r) expectedDifferences.push({ scope, name, original37: l ?? null, observedDefault: r ?? null });
  }
}
const roles = json('roles.json'), [a, b] = inventories;
const win = p => p.replaceAll('/', '\\').toLowerCase();
const normalize = origin => {
  const role = roles.find(r => win(origin).startsWith(win(r.path) + '\\'));
  if (role) return 'checkout\\' + origin.slice(role.path.length + 1);
  const packages = 'C:\\.tools\\.nuget\\packages\\';
  return win(origin).startsWith(win(packages)) ? 'nuget\\' + origin.slice(packages.length) : origin;
};
compare('artifacts-bin-complete', a.allBinFiles, b.allBinFiles, r => r.relative);
compare('resolved-reference-and-analyzer-images', a.resolvedInputImages, b.resolvedInputImages, r => `${r.kind}\\${normalize(r.path)}`);
compare('actual-console-loaded-images', a.loadedFiles, b.loadedFiles, r => normalize(r.path));
compare('restore-assets-graphs', a.restoreGraphs, b.restoreGraphs, r => r.relative);
compare('selected-raw-sources', factsList[0].sourceRows.map(r => ({ ...r, sha256: r.physicalSha256 })), factsList[1].sourceRows.map(r => ({ ...r, sha256: r.physicalSha256 })), r => r.filename);
assert.deepEqual(differences, expectedDifferences, 'Incomplete cross-role difference enumeration');
for (const file of json('command-bundle.json').files) {
  const raw = Buffer.from(file.base64, 'base64');
  assert.equal(raw.length, file.bytes); assert.equal(hash(raw), file.sha256);
  if (file.relative.endsWith('.json')) {
    const receipt = JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, ''));
    if (receipt.state) { assert.equal(receipt.state, 'terminal'); assert.equal(receipt.streamsTerminal, true); }
  }
}
console.log(JSON.stringify({
  result: 'PASS',
  selectedFiles: actualFiles.length,
  selectedBytes: actualFiles.reduce((sum, p) => sum + bytes(p).length, 0),
  manifestSha256: hash(bytes('manifest.json')),
  reports,
  differencesEnumerated: differences.length,
  pending: requirements.findings.map(f => f.id),
  verifiedBoundary: 'Capsule-relative selected hashes, raw physical/Git-LF source, PE/MVID/CodeView/PDB Document checksums, native XML rows/IDs/counters and selected loaded-image receipts. No .NET startup, subprocess, external graph access, benchmark or performance conclusion.',
  savedReceiptBoundary: 'Omitted binary/reference/runtime-package files and historical loaded-image events are saved hash receipts, not newly witnessed execution or omitted-file byte attestation. Assertion-ownership descriptions are saved source receipts, not runtime value dumps.'
}, null, 2));
