'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const root = __dirname;
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const read = name => fs.readFileSync(path.join(root, name));
const preflight = process.argv.includes('--preflight');
const manifestBytes = preflight ? null : read('MANIFEST.json');
const manifestHash = preflight ? null : sha(manifestBytes);
if (!preflight && read('MANIFEST.sha256').toString('utf8').trim().split(/\s+/)[0] !== manifestHash) throw Error('Manifest hash mismatch');
const manifest = preflight ? { entries: fs.readdirSync(path.join(root, 'evidence')).map(name => ({ path: `evidence\\${name}` })) } : JSON.parse(manifestBytes);
if (!preflight) {
  for (const entry of manifest.entries) {
    const bytes = read(entry.path);
    if (bytes.length !== entry.bytes || sha(bytes) !== entry.sha256) throw Error(`Payload mismatch: ${entry.path}`);
  }
  const actual = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) actual.push(path.relative(root, full));
      else throw Error(`Unexpected non-file payload entry ${full}`);
    }
  }
  walk(root);
  const expected = new Set([...manifest.entries.map(e => e.path), 'MANIFEST.json', 'MANIFEST.sha256']);
  if (actual.length !== expected.size || actual.some(name => !expected.has(name))) throw Error('Payload file set differs from manifest');
}
function guid(bytes) {
  return `${bytes.readUInt32LE(0).toString(16).padStart(8, '0')}-${bytes.readUInt16LE(4).toString(16).padStart(4, '0')}-${bytes.readUInt16LE(6).toString(16).padStart(4, '0')}-${bytes.subarray(8, 10).toString('hex')}-${bytes.subarray(10, 16).toString('hex')}`;
}
function peCodeViews(bytes) {
  const nt = bytes.readUInt32LE(0x3c), coff = nt + 4, optional = coff + 20;
  const pe32plus = bytes.readUInt16LE(optional) === 0x20b;
  const data = optional + (pe32plus ? 112 : 96);
  const debugRva = bytes.readUInt32LE(data + 6 * 8), debugSize = bytes.readUInt32LE(data + 6 * 8 + 4);
  const sections = optional + bytes.readUInt16LE(coff + 16);
  function offset(rva) {
    for (let i = 0; i < bytes.readUInt16LE(coff + 2); i++) {
      const s = sections + i * 40, start = bytes.readUInt32LE(s + 12);
      if (rva >= start && rva < start + Math.max(bytes.readUInt32LE(s + 8), bytes.readUInt32LE(s + 16)))
        return bytes.readUInt32LE(s + 20) + rva - start;
    }
    throw Error('RVA not found');
  }
  const result = [], debug = offset(debugRva);
  for (let at = debug; at < debug + debugSize; at += 28) {
    if (bytes.readUInt32LE(at + 12) !== 2) continue;
    const p = bytes.readUInt32LE(at + 24);
    if (bytes.subarray(p, p + 4).toString('ascii') !== 'RSDS') throw Error('Not RSDS CodeView');
    result.push({ guid: guid(bytes.subarray(p + 4, p + 20)), stamp: bytes.readUInt32LE(at + 4) });
  }
  return result;
}
function pdbId(bytes) {
  if (bytes.subarray(0, 4).toString('ascii') !== 'BSJB') throw Error('Not portable PDB');
  const versionLength = bytes.readUInt32LE(12);
  let at = (16 + versionLength + 3) & ~3;
  const streams = bytes.readUInt16LE(at + 2);
  at += 4;
  for (let i = 0; i < streams; i++) {
    const start = bytes.readUInt32LE(at);
    const nameStart = at + 8, end = bytes.indexOf(0, nameStart);
    const name = bytes.subarray(nameStart, end).toString('ascii');
    at = (end + 4) & ~3;
    if (name === '#Pdb') return { guid: guid(bytes.subarray(start, start + 16)), stamp: bytes.readUInt32LE(start + 16) };
  }
  throw Error('Portable PDB ID missing');
}
const proofs = JSON.parse(read('evidence\\selected-proofs.json'));
for (const proof of proofs) {
  const id = pdbId(read(proof.selectedPdb));
  const cv = peCodeViews(read(proof.selectedDll));
  if (!cv.some(c => c.guid === id.guid && c.stamp === id.stamp)) throw Error(`PE/PDB mismatch ${proof.name}`);
  for (const source of proof.selectedRawSources) {
    if (sha(read(source.snapshot)) !== source.checksum) throw Error(`Raw PDB source mismatch: ${source.snapshot}`);
  }
}
const producer = JSON.parse(read('evidence\\producer-original.json'));
if (!producer.completed || producer.rows.some(r => !r.passed)) throw Error('Producer did not complete successfully');
for (const [name, identity] of [['owner', producer.owner], ['common', producer.common]]) {
  const proof = proofs.find(p => p.name === name);
  if (sha(read(proof.selectedDll)) !== identity.sha256) throw Error(`Selected binary differs from actually loaded ${name}`);
}
const confirmation = JSON.parse(read('evidence\\producer-original-confirmation.json'));
if (!confirmation.completed || confirmation.rows.some(r => !r.passed) || confirmation.common.sha256 !== producer.common.sha256 || confirmation.owner.sha256 !== producer.owner.sha256) throw Error('Producer closure confirmation failed');
const rows = JSON.parse(read('evidence\\native-test-rows.json'));
if (rows.some(r => r.outcome !== 'Passed')) throw Error('A selected actual native test did not pass');
const decodeXml = value => value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
for (const file of new Set(rows.map(r => r.runnerXml))) {
  const xml = read(file).toString('utf8');
  const actual = [...xml.matchAll(/<UnitTestResult\b([^>]*?)\/?>/g)].map(match =>
    Object.fromEntries([...match[1].matchAll(/(\w+)="([^"]*)"/g)].map(m => [m[1], decodeXml(m[2])])));
  const selected = rows.filter(r => r.runnerXml === file);
  if (actual.length !== selected.length || actual.some(r => !selected.some(s => s.testId === r.testId && s.executionId === r.executionId && s.testName === r.testName && s.outcome === r.outcome))) throw Error(`TRX rows differ from parsed catalog: ${file}`);
}
for (const label of ['native-owner', 'native-tests', 'common', 'runtime62', 'sdk57']) {
  const before = JSON.parse(zlib.gunzipSync(read(`evidence\\all-image-${label}-before.json.gz`)));
  const after = JSON.parse(zlib.gunzipSync(read(`evidence\\all-image-${label}-after.json.gz`)));
  const left = new Map(before.entries.map(e => [e.path, JSON.stringify(e)]));
  if (before.prefixExclusions.length || after.prefixExclusions.length || left.size !== after.entries.length || after.entries.some(e => left.get(e.path) !== JSON.stringify(e))) throw Error(`Complete image metadata changed: ${label}`);
}
const catalogs = manifest.entries.filter(e => /source-.*-after\.json\.gz$/.test(e.path)).map(entry => {
  const catalog = JSON.parse(zlib.gunzipSync(read(entry.path)));
  return { role: catalog.role, entries: catalog.entries.length, missing: catalog.entries.filter(e => e.status === 'missing-physical-path').length, gitlinks: catalog.entries.filter(e => e.status === 'external-gitlink').length, lfMismatches: catalog.entries.filter(e => e.lfMatches === false).length };
});
console.log(JSON.stringify({ audit: 'PASS', preflight, metadataOnly: true, nativeWorkStarted: false, manifestSha256: manifestHash, manifestEntries: preflight ? null : manifest.entries.length, selectedPePdbPairs: proofs.length, producerRows: producer.rows.length, sameProducerScenariosConfirmed: confirmation.rows.length, nativeRows: rows.length, catalogs, limits: 'Node independently parses selected PE/PDB IDs and checks selected raw documents against the common verifier document associations, not an independent document-table parse; no full compiler-input or performance attestation; blocked default owner is not silently replaced.' }, null, 2));
