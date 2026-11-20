import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const hash = (data, algorithm = 'sha256') => crypto.createHash(algorithm).update(data).digest('hex').toUpperCase();
const fileHash = (p, algorithm = 'sha256') => hash(fs.readFileSync(p), algorithm);
const normalized = p => p.replaceAll('\\', '/').toLowerCase();
const portableRelative = p => p.replaceAll('\\', '/');
const local = p => path.join(root, ...p.split(/[\\/]/));
const relativeFiles = directory => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? relativeFiles(path.join(directory, entry.name)).map(p => path.join(entry.name, p)) : [entry.name]);
const u16 = (b, p) => b.readUInt16LE(p);
const u32 = (b, p) => b.readUInt32LE(p);

function guid(b, p = 0) {
  const h = b.subarray(p, p + 16).toString('hex');
  const reverse = text => text.match(/../g).reverse().join('');
  return `${reverse(h.slice(0, 8))}-${reverse(h.slice(8, 12))}-${reverse(h.slice(12, 16))}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function streams(b, base = 0) {
  assert.equal(b.toString('ascii', base, base + 4), 'BSJB');
  let cursor = (base + 16 + u32(b, base + 12) + 3) & ~3;
  const count = u16(b, cursor + 2);
  cursor += 4;
  const result = {};
  for (let i = 0; i < count; i++) {
    const offset = u32(b, cursor);
    const size = u32(b, cursor + 4);
    const end = b.indexOf(0, cursor + 8);
    const name = b.toString('ascii', cursor + 8, end);
    result[name] = b.subarray(base + offset, base + offset + size);
    cursor = (end + 4) & ~3;
  }
  return result;
}

function tableHeader(b) {
  const heaps = b[6];
  const valid = b.readBigUInt64LE(8);
  let cursor = 24;
  const rows = {};
  for (let number = 0; number < 64; number++) {
    if ((valid & (1n << BigInt(number))) !== 0n) {
      rows[number] = u32(b, cursor);
      cursor += 4;
    }
  }
  return { heaps, rows, cursor };
}

function compressed(b, cursor) {
  const first = b[cursor];
  if (first < 0x80) return [first, cursor + 1];
  if (first < 0xc0) return [((first & 0x3f) << 8) | b[cursor + 1], cursor + 2];
  assert(first < 0xe0, 'Invalid compressed integer');
  return [((first & 0x1f) * 0x1000000) + b.readUIntBE(cursor + 1, 3), cursor + 4];
}

function blob(heap, index) {
  const [length, cursor] = compressed(heap, index);
  return heap.subarray(cursor, cursor + length);
}

function index(b, cursor, size) {
  return size === 4 ? u32(b, cursor) : u16(b, cursor);
}

function pdbMetadata(file) {
  const s = streams(fs.readFileSync(file));
  const id = { guid: guid(s['#Pdb']), stamp: u32(s['#Pdb'], 16) };
  const tables = s['#~'] ?? s['#-'];
  let { heaps, rows, cursor } = tableHeader(tables);
  for (const [table, count] of Object.entries(rows)) assert(Number(table) >= 48 || count === 0, 'Unexpected portable-PDB table before Document');
  const blobSize = (heaps & 4) ? 4 : 2;
  const guidSize = (heaps & 2) ? 4 : 2;
  const documents = [];
  for (let i = 0; i < (rows[48] ?? 0); i++) {
    const values = [];
    for (const size of [blobSize, guidSize, blobSize, guidSize]) {
      values.push(index(tables, cursor, size));
      cursor += size;
    }
    const nameBlob = blob(s['#Blob'], values[0]);
    const separator = String.fromCharCode(nameBlob[0]);
    const parts = [];
    let position = 1;
    while (position < nameBlob.length) {
      const next = compressed(nameBlob, position);
      parts.push(blob(s['#Blob'], next[0]).toString('utf8'));
      position = next[1];
    }
    documents.push({
      name: parts.join(separator),
      algorithm: guid(s['#GUID'], (values[1] - 1) * 16),
      checksum: blob(s['#Blob'], values[2]).toString('hex').toUpperCase()
    });
  }
  return { id, documents };
}

function peMetadata(file) {
  const b = fs.readFileSync(file);
  const pe = u32(b, 0x3c);
  assert.equal(b.toString('binary', pe, pe + 4), 'PE\0\0');
  const count = u16(b, pe + 6);
  const optional = pe + 24;
  const sectionStart = optional + u16(b, pe + 20);
  const directory = optional + (u16(b, optional) === 0x20b ? 112 : 96);
  const offset = rva => {
    for (let i = 0; i < count; i++) {
      const p = sectionStart + i * 40;
      const va = u32(b, p + 12);
      if (rva >= va && rva < va + Math.max(u32(b, p + 8), u32(b, p + 16))) return u32(b, p + 20) + rva - va;
    }
    throw new Error(`Unmapped PE RVA ${rva}`);
  };
  const debugRva = u32(b, directory + 48);
  const debugSize = u32(b, directory + 52);
  const codeView = [];
  if (debugRva) {
    const debugStart = offset(debugRva);
    for (let p = debugStart; p < debugStart + debugSize; p += 28) {
      const data = u32(b, p + 24);
      if (u32(b, p + 12) === 2 && b.toString('ascii', data, data + 4) === 'RSDS') {
        const end = b.indexOf(0, data + 24);
        codeView.push({ guid: guid(b, data + 4), stamp: u32(b, p + 4), age: u32(b, data + 20), path: b.toString('utf8', data + 24, end) });
      }
    }
  }
  const cli = offset(u32(b, directory + 14 * 8));
  const s = streams(b, offset(u32(b, cli + 8)));
  const tables = s['#~'] ?? s['#-'];
  const { heaps, rows, cursor } = tableHeader(tables);
  assert.equal(rows[0], 1);
  const stringSize = (heaps & 1) ? 4 : 2;
  const guidSize = (heaps & 2) ? 4 : 2;
  const mvidIndex = index(tables, cursor + 2 + stringSize, guidSize);
  return { mvid: guid(s['#GUID'], (mvidIndex - 1) * 16), codeView };
}

function main() {
  const manifestPath = path.join(root, 'MANIFEST.json');
  const sealed = fs.readFileSync(path.join(root, 'MANIFEST.sha256'), 'utf8').trim().split(/\s+/)[0];
  assert.equal(fileHash(manifestPath), sealed);
  const manifest = readJson(manifestPath);
  const actual = relativeFiles(root).filter(p => !['MANIFEST.json', 'MANIFEST.sha256'].includes(p)).map(portableRelative).sort();
  const declared = manifest.files.map(entry => portableRelative(entry.path)).sort();
  assert.deepEqual(actual, declared, 'Manifest covers every payload file');
  for (const entry of manifest.files) {
    const file = local(entry.path);
    assert.equal(fs.statSync(file).size, entry.bytes, entry.path);
    assert.equal(fileHash(file), entry.sha256, entry.path);
  }
  assert(actual.length + 2 <= 250, 'Essential file limit');
  const facts = readJson(path.join(root, 'facts.json'));
  assert.equal(facts.officialState, 'PENDING');
  assert.equal(facts.performanceMeasurements, false);
  assert.equal(facts.candidateAdopted, false);
  assert.equal(facts.fullCompilerInputAttestation, false);
  const sources = readJson(path.join(root, 'source-catalog.json'));
  for (const source of sources) {
    const raw = fs.readFileSync(local(source.snapshot));
    const lf = Buffer.from(raw.toString('utf8').replaceAll('\r\n', '\n'));
    assert.equal(hash(raw), source.rawSha256, source.relativePath);
    assert.equal(hash(lf), source.gitLfSha256, source.relativePath);
    const gitBlob = hash(Buffer.concat([Buffer.from(`blob ${lf.length}\0`), lf]), 'sha1').toLowerCase();
    assert.equal(gitBlob, source.gitBlobSha1, `${source.role}:${source.relativePath}`);
  }
  const proofs = [];
  for (const proof of facts.ownerProofs) {
    const pe = peMetadata(local(proof.image));
    const pdb = pdbMetadata(local(proof.pdb));
    assert.equal(pe.mvid, proof.mvid);
    assert.equal(fileHash(local(proof.image)), proof.sha256);
    assert(pe.codeView.some(entry => entry.guid === pdb.id.guid && entry.stamp === pdb.id.stamp), `${proof.role}:${proof.name} PE/PDB identity`);
    const documents = new Map(pdb.documents.map(document => [normalized(document.name), document]));
    let selected = 0;
    for (const source of sources.filter(source => source.role === proof.role)) {
      const document = documents.get(normalized(source.originalPath));
      if (!document) continue;
      const algorithm = document.algorithm === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256' :
        document.algorithm === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
      assert(algorithm, 'Known document checksum algorithm');
      assert.equal(fileHash(local(source.snapshot), algorithm), document.checksum, source.relativePath);
      selected++;
    }
    assert(selected > 0, `${proof.name}: at least one selected raw document`);
    proofs.push({ role: proof.role, name: proof.name, selectedDocuments: selected });
  }
  const common = facts.commonConsumer;
  assert.deepEqual(relativeFiles(path.join(root, 'common')).map(portableRelative).sort(), common.files.map(file => file.name).sort(), 'Every common image entry inventoried');
  for (const file of common.files) assert.equal(fileHash(path.join(root, 'common', file.name)), file.sha256, file.name);
  const fixtureInventory = readJson(path.join(root, 'fixture-inventory.json'));
  assert.deepEqual(relativeFiles(path.join(root, 'fixtures')).map(portableRelative).sort(), fixtureInventory.map(file => portableRelative(file.path)).sort(), 'Every fixture entry inventoried');
  for (const file of fixtureInventory) assert.equal(fileHash(path.join(root, 'fixtures', ...file.path.split(/[\\/]/))), file.sha256);
  const commonPe = peMetadata(path.join(root, 'common', 'F139.EmitProbe.dll'));
  const commonPdb = pdbMetadata(path.join(root, 'common', 'F139.EmitProbe.pdb'));
  assert(commonPe.codeView.some(entry => entry.guid === commonPdb.id.guid && entry.stamp === commonPdb.id.stamp));
  const commonSource = fs.readFileSync(path.join(root, 'consumer-source', 'Program.cs'));
  assert.equal(common.localObsoleteApiPragma, commonSource.toString('utf8').includes('#pragma warning disable ASPDEPR003'), 'Local pragma limitation disclosed');
  const programDocument = commonPdb.documents.find(document => normalized(document.name).endsWith('/consumer/program.cs'));
  assert(programDocument);
  assert.equal(hash(commonSource), programDocument.checksum);
  for (const role of facts.roles) {
    const loaded = readJson(path.join(root, 'results', role + '-producer', 'loaded-assemblies.json'));
    const verifier = loaded.find(entry => entry.name === 'F139.EmitProbe');
    assert.equal(verifier.sha256, fileHash(path.join(root, 'common', 'F139.EmitProbe.dll')));
    assert.equal(verifier.mvid, commonPe.mvid);
    for (const proof of facts.ownerProofs.filter(proof => proof.role === role && proof.loaded)) {
      const owner = loaded.find(entry => entry.name === proof.name);
      assert(owner, proof.name);
      assert.equal(owner.sha256, proof.sha256);
      assert.equal(owner.mvid, proof.mvid);
    }
    const rows = readJson(path.join(root, 'results', role + '-producer', 'rows.json'));
    assert(rows.length >= 26 && rows.every(row => row.passes), `${role}: actual material-consumer rows`);
    for (const mode of ['portable', 'none']) {
      assert(rows.some(row => row.mode === mode && row.name === 'KnownRenderedOutput' && row.passes));
      assert(rows.some(row => row.mode === mode && row.name === 'ActualLoadedPdbStackFrame' && row.passes));
      assert(rows.some(row => row.mode === mode && row.name === 'InvalidCSharp.cshtml-ExactDiagnostic' && row.passes));
      assert(rows.some(row => row.mode === mode && row.name === 'InvalidRazor.cshtml-ExactDiagnostic' && row.passes));
      for (const [file, code, message, span, generated] of [
        ['InvalidCSharp.cshtml', 'CS0103', "The name 'F139MissingSymbol' does not exist in the current context", [1, 16, 1, 33], true],
        ['InvalidRazor.cshtml', 'RZ1006', 'The code block is missing a closing "}" character.  Make sure you have a matching "}" character for all the "{" characters within this block, and that none of the "}" characters are being interpreted as markup.', [1, 1, 1, 2], false]
      ]) {
        const diagnostics = readJson(path.join(root, 'results', role + '-producer', `${mode}-${file}-diagnostics.json`));
        assert(diagnostics.exception.startsWith('Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.CompilationFailedException:'));
        assert.equal(diagnostics.failures.length, 1);
        const failure = diagnostics.failures[0];
        assert.equal(failure.SourceFileContent, fs.readFileSync(path.join(root, 'fixtures', 'Views', 'F139', file), 'utf8'));
        assert(normalized(failure.SourceFilePath).endsWith('/fixtures/views/f139/' + file.toLowerCase()));
        assert.equal(Boolean(failure.CompiledContent), generated);
        assert.equal(failure.Messages.length, 1);
        const actualMessage = failure.Messages[0];
        assert.equal(actualMessage.Message, message);
        assert(actualMessage.FormattedMessage.includes(code));
        assert.deepEqual([actualMessage.StartLine, actualMessage.StartColumn, actualMessage.EndLine, actualMessage.EndColumn], span);
      }
    }
    const inventory = readJson(path.join(root, 'image-inventories.json')).find(entry => entry.role === role);
    const imageRoot = path.join(root, 'images', role);
    const actualEntries = relativeFiles(imageRoot).map(portableRelative).sort();
    assert.deepEqual(actualEntries, inventory.files.map(entry => portableRelative(entry.path)).sort());
    for (const entry of inventory.files) {
      const file = path.join(imageRoot, ...entry.path.split(/[\\/]/));
      assert.equal(fileHash(file), entry.sha256);
      assert.equal(fs.statSync(file).size, entry.bytes);
    }
  }
  const testRows = readJson(path.join(root, 'native-test-rows.json'));
  const decodeXml = value => value.replace(/&#x([0-9a-f]+);|&#([0-9]+);|&(quot|apos|amp|lt|gt);/gi, (match, hex, dec, name) =>
    hex ? String.fromCodePoint(parseInt(hex, 16)) : dec ? String.fromCodePoint(Number(dec)) :
      ({ quot: '"', apos: "'", amp: '&', lt: '<', gt: '>' })[name]);
  const attributes = text => Object.fromEntries([...text.matchAll(/([A-Za-z_:][-\w:.]*)="([^"]*)"/g)]
    .map(match => [match[1], decodeXml(match[2])]));
  for (const role of facts.roles) {
    const actual = testRows.filter(row => row.role === role);
    const xml = fs.readFileSync(path.join(root, 'native-tests', role + '.trx'), 'utf8');
    const native = [...xml.matchAll(/<UnitTestResult\b([^>]*?)\/?>/g)].map(match => attributes(match[1]));
    assert.equal(native.length, 26, `${role}: actual XML row count`);
    assert.equal(actual.length, native.length);
    for (const row of native) {
      const reported = actual.find(entry => entry.executionId === row.executionId);
      assert(reported, `${role}: XML execution ID retained`);
      assert.equal(reported.testId, row.testId);
      assert.equal(reported.testName, row.testName);
      assert.equal(reported.outcome, row.outcome);
      assert.equal(row.outcome, 'Passed');
    }
    const counters = attributes(xml.match(/<Counters\b([^>]*?)\/?>/)[1]);
    assert.equal(Number(counters.total), native.length);
    assert.equal(Number(counters.passed), native.length);
    assert.equal(Number(counters.failed), 0);
  }
  const commands = readJson(path.join(root, 'commands.json'));
  assert(commands.every(command => command.receipt.terminal && command.receipt.streamsTerminal), 'Owned direct native commands and streams terminal');
  const entryObservation = commands.find(command => command.receipt.id === '001-fresh-upstream').stdout.trim().split(/\s+/)[0];
  const closingObservation = commands.find(command => command.receipt.id === '045-closing-upstream-observation').stdout.trim().split(/\s+/)[0];
  assert.equal(facts.startOfPreparationDefaultObservation.commit, entryObservation);
  assert.equal(facts.freshlyObservedDefaultCommit, entryObservation);
  assert.equal(facts.closingUpstreamObservation.commit, closingObservation);
  assert.equal(facts.closingUpstreamObservation.actualSourceBuilt, false);
  assert(sources.filter(source => source.role === 'default').every(source => source.revision === entryObservation));
  console.log(JSON.stringify({
    audit: 'PASS',
    startsDotnet: false,
    requiresOriginalAbsoluteGraphs: false,
    officialState: 'PENDING',
    unmeasured: true,
    files: actual.length + 2,
    bytes: manifest.files.reduce((sum, entry) => sum + entry.bytes, 0) + fs.statSync(manifestPath).size + fs.statSync(path.join(root, 'MANIFEST.sha256')).size,
    ownerProofs: proofs,
    nativeRows: testRows.length,
    manifestSha256: sealed
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.stack);
  process.exitCode = 1;
}
