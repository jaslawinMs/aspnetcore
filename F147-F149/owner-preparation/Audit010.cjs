'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const root = __dirname;
const preflight = process.argv.length === 3 && process.argv[2] === '--workspace-preflight';
if (process.argv.length > 2 && !(process.argv.length === 3 && process.argv[2] === 'verify-only') && !preflight) {
  throw new Error('Read-only portable verification only. No build, test, absolute-path, or native execution mode exists.');
}
const assert = (condition, message) => { if (!condition) { throw new Error(message); } };
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const local = relative => {
  assert(!path.isAbsolute(relative) && !relative.split(/[\\/]/).includes('..'), `Nonportable payload path: ${relative}`);
  return path.join(root, ...relative.split(/[\\/]/));
};
const bytes = relative => fs.readFileSync(local(relative));
const text = relative => bytes(relative).toString('utf8').replace(/^\uFEFF/, '');
const json = relative => JSON.parse(text(relative));
const walk = directory => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
const manifestBytes = preflight ? null : bytes('MANIFEST.json');
if (!preflight) {
  assert(hash(manifestBytes) === text('MANIFEST.sha256').trim().toUpperCase(), 'Manifest checksum mismatch');
}
const manifest = preflight ? { files: [] } : JSON.parse(manifestBytes.toString('utf8').replace(/^\uFEFF/, ''));
for (const file of manifest.files) {
  const actual = bytes(file.path);
  assert(actual.length === file.bytes && hash(actual) === file.sha256, `Payload mismatch: ${file.path}`);
}
if (!preflight) {
  const actualNames = walk(root).map(file => path.relative(root, file).replaceAll('/', '\\'))
    .filter(name => !['MANIFEST.json', 'MANIFEST.sha256'].includes(name)).sort();
  assert(JSON.stringify(actualNames) === JSON.stringify(manifest.files.map(file => file.path).sort()), 'Missing or unmanifested payload file');
  assert(manifest.files.length + 2 <= 250, 'Payload exceeds the requested compact capsule size');
  const payloadBytes = manifest.files.reduce((total, file) => total + file.bytes, 0);
  assert(manifest.payloadFiles === manifest.files.length && manifest.totalFiles === manifest.files.length + 2 &&
    manifest.payloadBytes === payloadBytes &&
    manifest.totalBytesWithEnvelopes === payloadBytes + manifestBytes.length + bytes('MANIFEST.sha256').length,
  'Manifest file/byte totals mismatch');
}

function pdbId(buffer) {
  assert(buffer.readUInt32LE(0) === 0x424A5342, 'Not a portable metadata/PDB file');
  let cursor = (16 + buffer.readUInt32LE(12) + 3) & ~3;
  const streams = buffer.readUInt16LE(cursor + 2);
  cursor += 4;
  for (let i = 0; i < streams; i++) {
    const offset = buffer.readUInt32LE(cursor);
    const nameStart = cursor + 8;
    const end = buffer.indexOf(0, nameStart);
    const name = buffer.toString('utf8', nameStart, end);
    cursor = (end + 4) & ~3;
    if (name === '#Pdb') { return buffer.subarray(offset, offset + 20); }
  }
  throw new Error('Portable PDB ID stream missing');
}
function codeViews(buffer) {
  const pe = buffer.readUInt32LE(0x3c);
  assert(buffer.readUInt32LE(pe) === 0x00004550, 'Not a PE image');
  const sections = buffer.readUInt16LE(pe + 6);
  const optionalSize = buffer.readUInt16LE(pe + 20);
  const optional = pe + 24;
  const magic = buffer.readUInt16LE(optional);
  assert(magic === 0x20b || magic === 0x10b, 'Unknown PE optional header');
  const directory = optional + (magic === 0x20b ? 112 : 96) + 6 * 8;
  const debugRva = buffer.readUInt32LE(directory);
  const debugSize = buffer.readUInt32LE(directory + 4);
  const rvaToRaw = rva => {
    for (let i = 0; i < sections; i++) {
      const section = optional + optionalSize + i * 40;
      const start = buffer.readUInt32LE(section + 12);
      const size = Math.max(buffer.readUInt32LE(section + 8), buffer.readUInt32LE(section + 16));
      if (rva >= start && rva < start + size) {
        return buffer.readUInt32LE(section + 20) + rva - start;
      }
    }
    throw new Error('PE debug RVA is not mapped');
  };
  const start = rvaToRaw(debugRva);
  const result = [];
  for (let offset = start; offset < start + debugSize; offset += 28) {
    if (buffer.readUInt32LE(offset + 12) === 2) {
      const raw = buffer.readUInt32LE(offset + 24);
      assert(buffer.toString('ascii', raw, raw + 4) === 'RSDS', 'Unsupported CodeView record');
      result.push({ guidBytes: buffer.subarray(raw + 4, raw + 20), stamp: buffer.readUInt32LE(offset + 4), age: buffer.readUInt32LE(raw + 20) });
    }
  }
  return result;
}
const metadata = json('evidence\\PDB-PE-SOURCE-RECEIPTS.json');
let sourceChecks = 0;
for (const receipt of metadata) {
  const pe = bytes(receipt.selectedDll);
  const pdb = bytes(receipt.selectedPdb);
  assert(hash(pe) === receipt.metadata.peSha256 && hash(pdb) === receipt.metadata.pdbSha256, `Selected PE/PDB receipt mismatch: ${receipt.id}`);
  const id = pdbId(pdb);
  const matches = codeViews(pe).filter(record => record.guidBytes.equals(id.subarray(0, 16)) && record.stamp === id.readUInt32LE(16) && record.age === 1);
  assert(matches.length === 1, `Independent PE/PDB GUID+stamp check failed: ${receipt.id}`);
  for (const source of receipt.selectedRawSourceChecks) {
    assert(hash(bytes(source.snapshot)) === source.sha256 && source.sha256 === source.pdbDocument.checksum, `Raw source/PDB checksum failed: ${source.snapshot}`);
    sourceChecks++;
  }
  assert(receipt.fullCompilerInputAttestation === false, 'Selected documents cannot imply full compiler-input attestation');
}
assert(metadata.length === 5 && sourceChecks === 10, 'Unexpected selected PE/PDB/source evidence boundary');

const decodeXml = value => value.replace(/&(?:quot|apos|lt|gt|amp);|&#(?:x[0-9a-f]+|\d+);/gi, entity => {
  const known = { '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&amp;': '&' };
  return known[entity] ?? String.fromCodePoint(entity[2].toLowerCase() === 'x' ? parseInt(entity.slice(3, -1), 16) : parseInt(entity.slice(2, -1), 10));
});
const rowReceipts = json('evidence\\ALL-ACTUAL-TEST-ROWS.json');
const summary = [];
for (const role of ['Original', 'CurrentDefault']) {
  const trx = text(`results\\${role}\\attempt1\\${role}-attempt1.trx`);
  const rows = [...trx.matchAll(/<UnitTestResult\b([^>]*?)>([\s\S]*?)<\/UnitTestResult>/g)].map(match => {
    const attribute = name => decodeXml(new RegExp(`\\b${name}="([^"]*)"`).exec(match[1])?.[1] ?? '');
    return { name: attribute('testName'), outcome: attribute('outcome'), output: decodeXml(match[2]) };
  });
  assert(rows.length === 13 && rows.every(row => row.outcome === 'Passed'), `${role}: not all 13 real XML rows passed`);
  assert(new Set(rows.map(row => row.name)).size === rows.length, `${role}: duplicate test rows`);
  const ownerRows = rows.filter(row => row.name.includes('.CompiledSampleProducerTests.'));
  assert(ownerRows.length === 10, `${role}: actual sample row count mismatch`);
  for (const method of [
    'ActualSample_SeparateWritesRetainStringsAndEchoOriginalBytes',
    'ActualSample_PayloadAbove4096TraversesRealReads',
    'ActualSample_IndependentStreamIdsAndHandlerOwnership',
    'ActualSample_ExactInitiateCommandProducesRealOutboundStream',
    'ActualSample_ExactAbortCommandRemovesRealSession'
  ]) {
    for (const value of ['False', 'True']) {
      assert(rows.some(row => row.name.endsWith(`${method}(bidirectional: ${value})`)), `${role}: missing theory row ${method}/${value}`);
    }
    assert(rows.some(row => row.name.endsWith('.WebTransportSession_CanOpenNewStream')), `${role}: missing native open-stream row`);
    for (const value of ['False', 'True']) {
      assert(rows.some(row => row.name.endsWith(`.WebTransportSession_Closed_RemovedFromConnection(abortSession: ${value})`)),
        `${role}: missing native session-close theory row ${value}`);
    }
  }
  const sample = metadata.find(item => item.id === `${role}Sample`);
  const consumer = metadata.find(item => item.id === 'CommonConsumer');
  const core = metadata.find(item => item.id === 'CommonKestrelCore');
  const helper = metadata.find(item => item.id === 'CommonInternalTesting');
  for (const row of ownerRows) {
    for (const identity of [sample, consumer, core, helper]) {
      assert(row.output.includes(identity.metadata.peSha256) && row.output.includes(identity.metadata.mvid), `${role}: loaded PE identity missing: ${identity.id}/${row.name}`);
    }
    assert(row.output.includes('ACTUAL_SAMPLE') && row.output.includes('ACTUAL_HOST module=hostfxr.dll') &&
      row.output.includes('12.0.0-alpha.1.26557.102') && row.output.includes('rollForward=Disable') &&
      /SETTINGS|Settings/.test(row.output), `${role}: actual owner/runtime/producer evidence missing`);
  }
  for (const row of rows) {
    assert(rowReceipts.some(receipt => receipt.role === role && receipt.testName === row.name && receipt.outcome === row.outcome), `${role}: XML/row receipt mismatch`);
  }
  summary.push({ role, actualSampleRows: ownerRows.length, nativeExistingRows: rows.length - ownerRows.length, passedRows: rows.length });
}

const images = json('evidence\\COMPLETE-IMAGE-HASH-MAPS.json');
const canonical = image => JSON.stringify(image.files.map(file => [file.path, file.bytes, file.sha256])
  .sort((left, right) => left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0));
for (const name of Object.keys(images)) {
  assert(images[name].completeFileInventory && images[name].prefixExclusions.length === 0, `Incomplete/exempted image: ${name}`);
  for (const file of images[name].files) {
    if (file.selectedPortablePath) {
      assert(hash(bytes(file.selectedPortablePath)) === file.sha256, `Selected image hash mismatch: ${file.path}`);
    }
  }
}
const compatibility = json('evidence\\IMAGE-COMPATIBILITY-BOUNDARY.json');
assert(compatibility.commonOnce === true && compatibility.originalAndDefaultAreCausalPerformancePair === false &&
  compatibility.currentDefaultWholeKestrelRuntimeGraphClaimed === false, 'Invalid characterization/compatibility claim');
for (const check of compatibility.allCommonFileChecks) {
  assert(check.identicalToCommonOnceImage && canonical(json(check.map)) === canonical(images.CommonConsumer), `Common-once byte mismatch: ${check.map}`);
}
for (const role of ['Original', 'CurrentDefault']) {
  const catalog = preflight
    ? json(`evidence\\${role}-complete-git-source-map.json`)
    : JSON.parse(zlib.gunzipSync(bytes(`evidence\\${role}-complete-git-source-map.json.gz`)).toString('utf8'));
  assert(catalog.files.length === catalog.summary.trackedEntries && catalog.summary.fullCompilerInputAttestation === false, `${role}: source catalog boundary mismatch`);
  const samplePath = 'src\\Servers\\Kestrel\\samples\\WebTransportInteractiveSampleApp\\Program.cs';
  const source = bytes(`evidence\\raw-source\\${role}\\${samplePath}`);
  const canonicalSource = Buffer.from(source.toString('utf8').replaceAll('\r\n', '\n'), 'utf8');
  const gitBlob = crypto.createHash('sha1').update(Buffer.from(`blob ${canonicalSource.length}\0`)).update(canonicalSource).digest('hex');
  const sourceEntry = catalog.files.find(file => file.path === samplePath);
  assert(sourceEntry.rawSha256 === hash(source) && gitBlob === sourceEntry.expectedGitBlob &&
    gitBlob === '2fa999a73fc8ce4e4d1c7a7cc7185f8723727696', `${role}: raw/CRLF-to-Git-LF sample identity mismatch`);
}
const state = json('RESULTS.json');
assert(state.findings.F147 === 'PENDING' && state.findings.F149 === 'PENDING' &&
  state.actualCompiledSampleOwnerReached === true && state.candidateApplied === false &&
  state.performanceMeasurement === false && state.fullCompilerInputAttestation === false, 'Invalid finding status or preparation scope');
const terminal = json('evidence\\FINAL-OWNED-PROCESSES.json');
assert(terminal.observations.every(item => !item.originalProcessStillRunning), 'An observed original owned native process was not terminal');
console.log(JSON.stringify({
  result: 'PASS', mode: preflight ? 'read-only-workspace-preflight-not-a-freeze-audit' : 'read-only-portable-metadata',
  manifestVerified: !preflight,
  payloadFiles: preflight ? null : manifest.files.length, envelopes: preflight ? null : 2,
  payloadBytes: preflight ? null : manifest.files.reduce((total, file) => total + file.bytes, 0),
  manifestSha256: preflight ? null : hash(manifestBytes), selectedPePdbPairs: metadata.length,
  rawSourceChecks: sourceChecks, realXmlRows: summary,
  commonOnceAllFileChecks: compatibility.allCommonFileChecks.length,
  fullCompilerInputAttestation: false, findings: state.findings,
  executionPrerequisitesNotBundled: true, nativeOrDotnetExecution: false
}, null, 2));
