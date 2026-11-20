'use strict';
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const assert = require('node:assert/strict');

function hash(bytes, algorithm = 'sha256') {
  return crypto.createHash(algorithm).update(bytes).digest('hex').toUpperCase();
}
function slice(bytes, offset, length) {
  assert(Number.isSafeInteger(offset) && Number.isSafeInteger(length) && offset >= 0 && length >= 0 && offset + length <= bytes.length, `Out-of-bounds span ${offset}+${length}/${bytes.length}`);
  return bytes.subarray(offset, offset + length);
}
function u16(bytes, offset) { return slice(bytes, offset, 2).readUInt16LE(); }
function u32(bytes, offset) { return slice(bytes, offset, 4).readUInt32LE(); }
function guid(bytes) {
  assert.equal(bytes.length, 16);
  return `${bytes.readUInt32LE(0).toString(16).padStart(8, '0')}-${bytes.readUInt16LE(4).toString(16).padStart(4, '0')}-${bytes.readUInt16LE(6).toString(16).padStart(4, '0')}-${bytes.subarray(8, 10).toString('hex')}-${bytes.subarray(10).toString('hex')}`;
}
function zeroString(bytes, offset) {
  const end = bytes.indexOf(0, offset);
  assert(end >= offset, 'Unterminated string');
  return { text: bytes.toString('utf8', offset, end), next: end + 1 };
}
function compressed(bytes, cursor) {
  const first = slice(bytes, cursor.offset++, 1)[0];
  if ((first & 0x80) === 0) return first;
  if ((first & 0xC0) === 0x80) return ((first & 0x3F) << 8) | slice(bytes, cursor.offset++, 1)[0];
  assert.equal(first & 0xE0, 0xC0, 'Invalid compressed integer');
  const tail = slice(bytes, cursor.offset, 3);
  cursor.offset += 3;
  return ((first & 0x1F) * 0x1000000) + (tail[0] << 16) + (tail[1] << 8) + tail[2];
}
function metadata(bytes) {
  assert.equal(u32(bytes, 0), 0x424A5342, 'Expected metadata BSJB');
  const versionLength = u32(bytes, 12);
  let position = (16 + versionLength + 3) & ~3;
  const count = u16(bytes, position + 2);
  position += 4;
  const streams = {};
  for (let index = 0; index < count; index++) {
    const offset = u32(bytes, position), length = u32(bytes, position + 4);
    const name = zeroString(bytes, position + 8);
    assert(!Object.hasOwn(streams, name.text), 'Duplicate metadata stream');
    streams[name.text] = { offset, length, bytes: slice(bytes, offset, length) };
    position = (name.next + 3) & ~3;
  }
  const table = (streams['#~'] ?? streams['#-'])?.bytes;
  assert(table, 'Missing metadata tables');
  const heaps = table[6];
  const widths = { string: (heaps & 1) ? 4 : 2, guid: (heaps & 2) ? 4 : 2, blob: (heaps & 4) ? 4 : 2 };
  const valid = table.readBigUInt64LE(8), rows = Array(64).fill(0);
  let cursor = 24;
  for (let index = 0; index < 64; index++) {
    if ((valid & (1n << BigInt(index))) !== 0n) {
      rows[index] = u32(table, cursor);
      cursor += 4;
    }
  }
  function indexAt(offset, width) { return width === 2 ? u16(table, offset) : u32(table, offset); }
  function blob(index) {
    if (index === 0) return Buffer.alloc(0);
    const data = streams['#Blob']?.bytes;
    assert(data, 'Missing Blob heap');
    const cursor = { offset: index }, length = compressed(data, cursor);
    return slice(data, cursor.offset, length);
  }
  function getGuid(index) {
    if (index === 0) return '00000000-0000-0000-0000-000000000000';
    return guid(slice(streams['#GUID'].bytes, (index - 1) * 16, 16));
  }
  function string(index) { return zeroString(streams['#Strings'].bytes, index).text; }
  return { bytes, streams, table, widths, rows, dataOffset: cursor, indexAt, blob, getGuid, string };
}
function pe(bytes) {
  assert.equal(bytes.toString('ascii', 0, 2), 'MZ', 'Expected PE MZ');
  const header = u32(bytes, 0x3C);
  assert.equal(u32(bytes, header), 0x4550, 'Expected PE signature');
  const sectionCount = u16(bytes, header + 6), optionalSize = u16(bytes, header + 20);
  const optional = header + 24, magic = u16(bytes, optional);
  assert(magic === 0x10B || magic === 0x20B, 'Unsupported optional header');
  const directoryOffset = optional + (magic === 0x20B ? 112 : 96);
  const sectionTable = optional + optionalSize;
  const sections = [];
  for (let index = 0; index < sectionCount; index++) {
    const offset = sectionTable + index * 40;
    sections.push({ virtualSize: u32(bytes, offset + 8), rva: u32(bytes, offset + 12), rawSize: u32(bytes, offset + 16), raw: u32(bytes, offset + 20) });
  }
  function fromRva(rva, size) {
    const section = sections.find(s => rva >= s.rva && rva + size <= s.rva + Math.max(s.rawSize, s.virtualSize));
    assert(section, `Unmapped RVA ${rva}`);
    return slice(bytes, section.raw + rva - section.rva, size);
  }
  const debugRva = u32(bytes, directoryOffset + 6 * 8), debugSize = u32(bytes, directoryOffset + 6 * 8 + 4);
  const debug = [];
  if (debugRva !== 0) {
    assert.equal(debugSize % 28, 0);
    const entries = fromRva(debugRva, debugSize);
    for (let offset = 0; offset < entries.length; offset += 28) {
      const type = u32(entries, offset + 12), size = u32(entries, offset + 16);
      const data = slice(bytes, u32(entries, offset + 24), size);
      const item = { type, stamp: u32(entries, offset + 4), size };
      if (type === 2) {
        assert.equal(data.toString('ascii', 0, 4), 'RSDS');
        item.guid = guid(slice(data, 4, 16));
        item.age = u32(data, 20);
        item.path = zeroString(data, 24).text;
      } else if (type === 19) {
        const algorithm = zeroString(data, 0);
        item.algorithm = algorithm.text;
        item.checksum = data.subarray(algorithm.next).toString('hex').toUpperCase();
      }
      debug.push(item);
    }
  }
  const cliRva = u32(bytes, directoryOffset + 14 * 8), cliSize = u32(bytes, directoryOffset + 14 * 8 + 4);
  let managed = null;
  if (cliRva !== 0) {
    const cli = fromRva(cliRva, cliSize);
    const md = metadata(fromRva(u32(cli, 8), u32(cli, 12)));
    assert.equal(md.rows[0], 1, 'Expected one Module row');
    let position = md.dataOffset + 2;
    const nameIndex = md.indexAt(position, md.widths.string);
    position += md.widths.string;
    const mvidIndex = md.indexAt(position, md.widths.guid);
    managed = { moduleName: md.string(nameIndex), mvid: md.getGuid(mvidIndex) };
  }
  return { machine: u16(bytes, header + 4), optionalMagic: magic, debug, managed };
}
function pdb(bytes) {
  const md = metadata(bytes);
  const pdbStream = md.streams['#Pdb'];
  assert(pdbStream && pdbStream.length >= 32, 'Expected portable #Pdb stream');
  const contentId = slice(pdbStream.bytes, 0, 20), external = Array(64).fill(0);
  const mask = pdbStream.bytes.readBigUInt64LE(24);
  let offset = 32;
  for (let index = 0; index < 64; index++) {
    if ((mask & (1n << BigInt(index))) !== 0n) {
      external[index] = u32(pdbStream.bytes, offset);
      offset += 4;
    }
  }
  const tableIndexWidth = id => Math.max(md.rows[id], external[id]) < 0x10000 ? 2 : 4;
  const cdiTables = [6, 4, 1, 2, 8, 9, 10, 0, 14, 23, 20, 17, 26, 27, 32, 35, 38, 39, 40, 42, 44, 43, 48, 50, 51, 52, 53];
  const cdiWidth = Math.max(...cdiTables.map(id => Math.max(md.rows[id], external[id]))) < 0x800 ? 2 : 4;
  const w = md.widths;
  const widths = {
    48: w.blob * 2 + w.guid * 2,
    49: tableIndexWidth(48) + w.blob,
    50: tableIndexWidth(6) + tableIndexWidth(53) + tableIndexWidth(51) + tableIndexWidth(52) + 8,
    51: 4 + w.string,
    52: w.string + w.blob,
    53: tableIndexWidth(53) + w.blob,
    54: tableIndexWidth(6) * 2,
    55: cdiWidth + w.guid + w.blob
  };
  const starts = {};
  let position = md.dataOffset;
  for (let id = 0; id < 64; id++) {
    if (md.rows[id] === 0) continue;
    assert(Object.hasOwn(widths, id), `Unexpected portable PDB table ${id}`);
    starts[id] = position;
    position += widths[id] * md.rows[id];
  }
  assert(position <= md.table.length, 'Portable PDB rows overrun table stream');
  const documents = [];
  for (let row = 1; row <= md.rows[48]; row++) {
    let at = starts[48] + (row - 1) * widths[48];
    const name = md.blob(md.indexAt(at, w.blob)); at += w.blob;
    assert(name.length > 0, 'Missing document name');
    const cursor = { offset: 1 }, components = [];
    while (cursor.offset < name.length) components.push(md.blob(compressed(name, cursor)).toString('utf8'));
    const algorithm = md.getGuid(md.indexAt(at, w.guid)); at += w.guid;
    const checksum = md.blob(md.indexAt(at, w.blob)); at += w.blob;
    documents.push({ row, name: components.join(String.fromCharCode(name[0])), algorithm, checksum: checksum.toString('hex').toUpperCase(), language: md.getGuid(md.indexAt(at, w.guid)), embedded: null });
  }
  for (let row = 0; row < md.rows[55]; row++) {
    let at = starts[55] + row * widths[55];
    const parent = md.indexAt(at, cdiWidth); at += cdiWidth;
    const kind = md.getGuid(md.indexAt(at, w.guid)); at += w.guid;
    const value = md.blob(md.indexAt(at, w.blob));
    if (kind === '0e8a571b-6926-466e-b4ad-8ab04611f5fe') {
      assert.equal(cdiTables[parent & 31], 48, 'Embedded source parent must be Document');
      const document = documents[(parent >>> 5) - 1];
      assert(document && !document.embedded, 'Invalid duplicate embedded source');
      const length = u32(value, 0);
      document.embedded = length === 0 ? value.subarray(4) : zlib.inflateRawSync(value.subarray(4), { maxOutputLength: length });
      if (length !== 0) assert.equal(document.embedded.length, length);
    }
  }
  return { guid: guid(contentId.subarray(0, 16)), stamp: u32(contentId, 16), contentId: contentId.toString('hex').toUpperCase(), idOffset: pdbStream.offset, documents };
}
function associate(peBytes, pdbBytes) {
  const image = pe(peBytes), symbols = pdb(pdbBytes);
  const entries = image.debug.filter(d => d.type === 2);
  assert.equal(entries.length, 1, 'Expected one CodeView record');
  const codeView = entries[0];
  assert.equal(codeView.guid, symbols.guid, 'PE/PDB GUID mismatch');
  assert.equal(codeView.stamp, symbols.stamp, 'PE/PDB stamp mismatch');
  assert.equal(codeView.age, 1, 'Portable PDB age must be 1');
  const checksums = image.debug.filter(d => d.type === 19);
  for (const checksum of checksums) {
    assert.equal(checksum.algorithm.toUpperCase(), 'SHA256', 'Unsupported PE PDB checksum algorithm');
    const zeroContentId = Buffer.from(pdbBytes);
    zeroContentId.fill(0, symbols.idOffset, symbols.idOffset + 20);
    assert.equal(checksum.checksum, hash(zeroContentId), 'Deterministic portable PDB checksum (zero content ID) mismatch');
    checksum.validation = 'SHA256 over portable PDB with its 20-byte content ID zeroed; raw PDB SHA256 is separately inventoried';
  }
  return { image, symbols };
}
function documentHash(document, bytes) {
  const algorithm = document.algorithm === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256'
    : document.algorithm === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
  assert(algorithm, `Unsupported document checksum algorithm ${document.algorithm}`);
  assert.equal(hash(bytes, algorithm), document.checksum, `PDB document checksum mismatch: ${document.name}`);
}
module.exports = { hash, pe, pdb, associate, documentHash, guid, slice };
