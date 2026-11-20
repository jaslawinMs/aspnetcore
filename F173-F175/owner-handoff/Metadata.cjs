'use strict';
const assert = require('node:assert/strict');
const guid = b => `${b.readUInt32LE(0).toString(16).padStart(8, '0')}-${b.readUInt16LE(4).toString(16).padStart(4, '0')}-${b.readUInt16LE(6).toString(16).padStart(4, '0')}-${b.subarray(8, 10).toString('hex')}-${b.subarray(10, 16).toString('hex')}`;
const align = n => (n + 3) & ~3;
function streams(b, base = 0) {
  assert.equal(b.readUInt32LE(base), 0x424a5342, 'CLI metadata signature');
  let cursor = align(base + 16 + b.readUInt32LE(base + 12));
  const count = b.readUInt16LE(cursor + 2), result = {};
  cursor += 4;
  for (let index = 0; index < count; index++) {
    const offset = base + b.readUInt32LE(cursor), size = b.readUInt32LE(cursor + 4);
    const end = b.indexOf(0, cursor + 8), name = b.toString('ascii', cursor + 8, end);
    result[name] = b.subarray(offset, offset + size);
    cursor = align(end + 1);
  }
  return result;
}
function tables(s) {
  const b = s['#~'] ?? s['#-'];
  assert(b, 'Metadata table stream');
  const heap = b[6], valid = b.readBigUInt64LE(8), rows = Array(64).fill(0);
  let cursor = 24;
  for (let index = 0; index < 64; index++) {
    if ((valid & (1n << BigInt(index))) !== 0n) {
      rows[index] = b.readUInt32LE(cursor); cursor += 4;
    }
  }
  return { b, rows, cursor, str: heap & 1 ? 4 : 2, guid: heap & 2 ? 4 : 2, blob: heap & 4 ? 4 : 2 };
}
const indexAt = (b, cursor, size) => size === 2 ? b.readUInt16LE(cursor) : b.readUInt32LE(cursor);
function compressed(b, cursor) {
  const first = b[cursor];
  if ((first & 0x80) === 0) return [first, cursor + 1];
  if ((first & 0xc0) === 0x80) return [((first & 0x3f) << 8) | b[cursor + 1], cursor + 2];
  assert.equal(first & 0xe0, 0xc0, 'Compressed integer prefix');
  return [((first & 0x1f) * 0x1000000) + b[cursor + 1] * 0x10000 + b[cursor + 2] * 0x100 + b[cursor + 3], cursor + 4];
}
function blobAt(s, index) {
  const [length, cursor] = compressed(s['#Blob'], index);
  return s['#Blob'].subarray(cursor, cursor + length);
}
const guidAt = (s, index) => guid(s['#GUID'].subarray((index - 1) * 16, index * 16));
const stringAt = (s, index) => s['#Strings'].toString('utf8', index, s['#Strings'].indexOf(0, index));
function portablePdb(b) {
  const s = streams(b), t = tables(s), documents = [];
  assert(s['#Pdb'], 'Portable PDB ID stream');
  assert(t.rows.slice(0, 48).every(count => count === 0), 'Unexpected non-debug rows in portable PDB');
  let cursor = t.cursor;
  for (let row = 0; row < t.rows[48]; row++) {
    const nameHandle = indexAt(t.b, cursor, t.blob); cursor += t.blob;
    const algorithmHandle = indexAt(t.b, cursor, t.guid); cursor += t.guid;
    const checksumHandle = indexAt(t.b, cursor, t.blob); cursor += t.blob;
    const languageHandle = indexAt(t.b, cursor, t.guid); cursor += t.guid;
    const nameBlob = blobAt(s, nameHandle), separator = String.fromCharCode(nameBlob[0]), parts = [];
    for (let p = 1; p < nameBlob.length;) {
      let handle; [handle, p] = compressed(nameBlob, p);
      parts.push(blobAt(s, handle).toString('utf8'));
    }
    documents.push({ name: parts.join(separator), algorithm: guidAt(s, algorithmHandle),
      checksum: blobAt(s, checksumHandle).toString('hex').toUpperCase(), language: guidAt(s, languageHandle) });
  }
  return { guid: guid(s['#Pdb'].subarray(0, 16)), stamp: s['#Pdb'].readUInt32LE(16), documents };
}
function pe(b) {
  const start = b.readUInt32LE(0x3c);
  assert.equal(b.readUInt32LE(start), 0x4550, 'PE signature');
  const optional = start + 24, sections = b.readUInt16LE(start + 6), optionalSize = b.readUInt16LE(start + 20);
  const magic = b.readUInt16LE(optional);
  assert(magic === 0x10b || magic === 0x20b, 'PE optional header');
  const directories = optional + (magic === 0x20b ? 112 : 96);
  function raw(rva) {
    for (let index = 0; index < sections; index++) {
      const section = optional + optionalSize + index * 40, address = b.readUInt32LE(section + 12);
      if (rva >= address && rva < address + Math.max(b.readUInt32LE(section + 8), b.readUInt32LE(section + 16)))
        return b.readUInt32LE(section + 20) + rva - address;
    }
    throw new Error(`Unmapped PE RVA ${rva}`);
  }
  const codeviews = [], debugRva = b.readUInt32LE(directories + 6 * 8), debugSize = b.readUInt32LE(directories + 6 * 8 + 4);
  if (debugRva) {
    const debugStart = raw(debugRva);
    for (let cursor = debugStart; cursor < debugStart + debugSize; cursor += 28) {
      if (b.readUInt32LE(cursor + 12) === 2) {
        const data = b.readUInt32LE(cursor + 24);
        assert.equal(b.toString('ascii', data, data + 4), 'RSDS');
        codeviews.push({ guid: guid(b.subarray(data + 4, data + 20)), stamp: b.readUInt32LE(cursor + 4), age: b.readUInt32LE(data + 20) });
      }
    }
  }
  const cli = raw(b.readUInt32LE(directories + 14 * 8)), s = streams(b, raw(b.readUInt32LE(cli + 8))), t = tables(s);
  assert.equal(t.rows[0], 1, 'One Module row');
  const mvidHandle = indexAt(t.b, t.cursor + 2 + t.str, t.guid);
  return { mvid: guidAt(s, mvidHandle), codeviews, streams: s, tableInfo: t };
}
function typeMethods(b, namespaceName, typeName) {
  const p = pe(b), s = p.streams, t = p.tableInfo;
  const tableIndexSize = table => t.rows[table] >= 65536 ? 4 : 2;
  const coded = (bits, ids) => Math.max(...ids.map(id => t.rows[id])) >= 2 ** (16 - bits) ? 4 : 2;
  const sizes = [2 + t.str + 3 * t.guid, coded(2, [0, 26, 35, 1]) + 2 * t.str,
    4 + 2 * t.str + coded(2, [2, 1, 27]) + tableIndexSize(4) + tableIndexSize(6),
    tableIndexSize(4), 2 + t.str + t.blob, tableIndexSize(6), 8 + t.str + t.blob + tableIndexSize(8)];
  const starts = [t.cursor];
  for (let index = 0; index < 6; index++) starts.push(starts[index] + t.rows[index] * sizes[index]);
  for (let row = 0; row < t.rows[2]; row++) {
    const at = starts[2] + row * sizes[2], name = stringAt(s, indexAt(t.b, at + 4, t.str));
    const ns = stringAt(s, indexAt(t.b, at + 4 + t.str, t.str));
    if (ns !== namespaceName || name !== typeName) continue;
    const methodOffset = sizes[2] - tableIndexSize(6);
    const first = indexAt(t.b, at + methodOffset, tableIndexSize(6));
    const last = row + 1 < t.rows[2] ? indexAt(t.b, at + sizes[2] + methodOffset, tableIndexSize(6)) : t.rows[6] + 1;
    const methods = [];
    for (let method = first; method < last; method++)
      methods.push(stringAt(s, indexAt(t.b, starts[6] + (method - 1) * sizes[6] + 8, t.str)));
    return [...new Set(methods)].sort();
  }
  throw new Error(`Type not found ${namespaceName}.${typeName}`);
}
module.exports = { pe, portablePdb, typeMethods };
