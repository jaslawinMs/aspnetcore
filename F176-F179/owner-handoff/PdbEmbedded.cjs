'use strict';
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const { portablePdb, pdbAccess } = require('./Metadata.cjs');
const { streams, tables, indexAt, blobAt, guidAt } = pdbAccess;
// Portable PDB debug tables 0x30..0x37 and the standard EmbeddedSource custom-debug record.
// Table/heaps/index decoding is reused from the attributed Metadata.base.cjs implementation.
function embeddedSources(bytes) {
  const s = streams(bytes), t = tables(s), parsed = portablePdb(bytes);
  const external = t.rows.slice(), pdb = s['#Pdb'], mask = pdb.readBigUInt64LE(24);
  let at = 32;
  for (let table = 0; table < 48; table++) {
    if ((mask & (1n << BigInt(table))) !== 0n) {
      external[table] = pdb.readUInt32LE(at);
      at += 4;
    }
  }
  assert(t.rows.slice(56).every(count => count === 0));
  const size = table => external[table] >= 65536 ? 4 : 2;
  const customParents = [6, 4, 1, 2, 8, 9, 10, 0, 14, 23, 20, 17, 26, 27, 32, 35, 38, 39, 40, 42, 44, 43, 48, 50, 51, 52, 53];
  const customSize = Math.max(...customParents.map(table => external[table])) >= 2048 ? 4 : 2;
  const widths = {
    48: 2 * t.blob + 2 * t.guid,
    49: size(48) + t.blob,
    50: size(6) + size(53) + size(51) + size(52) + 8,
    51: 4 + t.str,
    52: t.str + t.blob,
    53: size(53) + t.blob,
    54: 2 * size(6),
    55: customSize + t.guid + t.blob
  };
  let cursor = t.cursor;
  for (let table = 48; table < 55; table++) cursor += t.rows[table] * widths[table];
  const found = new Map();
  for (let row = 0; row < t.rows[55]; row++) {
    let offset = cursor + row * widths[55];
    const parent = indexAt(t.b, offset, customSize); offset += customSize;
    const kind = guidAt(s, indexAt(t.b, offset, t.guid)); offset += t.guid;
    const body = blobAt(s, indexAt(t.b, offset, t.blob));
    if (kind !== '0e8a571b-6926-466e-b4ad-8ab04611f5fe') continue;
    assert.equal(parent & 31, 22, 'EmbeddedSource parent must be a Document');
    const index = (parent >>> 5) - 1;
    assert(index >= 0 && index < parsed.documents.length);
    assert(!found.has(index));
    assert(body.length >= 4);
    const uncompressedSize = body.readInt32LE(0);
    assert(uncompressedSize >= 0);
    const raw = uncompressedSize === 0 ? body.subarray(4) : zlib.inflateRawSync(body.subarray(4));
    if (uncompressedSize !== 0) assert.equal(raw.length, uncompressedSize);
    found.set(index, { documentIndex: index, documentName: parsed.documents[index].name, bytes: raw });
  }
  return found;
}
module.exports = { embeddedSources };
