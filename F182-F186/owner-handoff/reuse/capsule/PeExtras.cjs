'use strict';
const assert = require('node:assert/strict');
const align = n => (n + 3) & ~3;
const guid = b => `${b.readUInt32LE(0).toString(16).padStart(8, '0')}-${b.readUInt16LE(4).toString(16).padStart(4, '0')}-${b.readUInt16LE(6).toString(16).padStart(4, '0')}-${b.subarray(8, 10).toString('hex')}-${b.subarray(10, 16).toString('hex')}`;
function inspectPe(b) {
  assert.equal(b.toString('ascii', 0, 2), 'MZ');
  const start = b.readUInt32LE(0x3c);
  assert.equal(b.readUInt32LE(start), 0x4550);
  const optional = start + 24, sectionCount = b.readUInt16LE(start + 6), optionalSize = b.readUInt16LE(start + 20);
  const magic = b.readUInt16LE(optional);
  assert(magic === 0x10b || magic === 0x20b);
  const directories = optional + (magic === 0x20b ? 112 : 96);
  function raw(rva) {
    for (let index = 0; index < sectionCount; index++) {
      const section = optional + optionalSize + index * 40, address = b.readUInt32LE(section + 12);
      if (rva >= address && rva < address + Math.max(b.readUInt32LE(section + 8), b.readUInt32LE(section + 16)))
        return b.readUInt32LE(section + 20) + rva - address;
    }
    throw new Error(`Unmapped PE RVA ${rva}`);
  }
  const codeviews = [], debugRva = b.readUInt32LE(directories + 6 * 8), debugSize = b.readUInt32LE(directories + 6 * 8 + 4);
  if (debugRva) {
    const first = raw(debugRva);
    for (let at = first; at < first + debugSize; at += 28) {
      if (b.readUInt32LE(at + 12) !== 2) continue;
      const data = b.readUInt32LE(at + 24);
      assert.equal(b.toString('ascii', data, data + 4), 'RSDS');
      codeviews.push({ guid: guid(b.subarray(data + 4, data + 20)), stamp: b.readUInt32LE(at + 4), age: b.readUInt32LE(data + 20) });
    }
  }
  let version = null;
  const resourceRva = b.readUInt32LE(directories + 2 * 8);
  if (resourceRva) {
    const base = raw(resourceRva);
    function entries(offset) {
      const at = base + offset, count = b.readUInt16LE(at + 12) + b.readUInt16LE(at + 14), found = [];
      for (let index = 0; index < count; index++) {
        const row = at + 16 + index * 8, name = b.readUInt32LE(row), child = b.readUInt32LE(row + 4);
        found.push({ id: name & 0x80000000 ? null : name, directory: Boolean(child & 0x80000000), offset: child & 0x7fffffff });
      }
      return found;
    }
    const versionType = entries(0).find(e => e.id === 16);
    if (versionType) {
      let leaf = versionType;
      for (let depth = 0; leaf.directory; depth++) {
        assert(depth < 5);
        const children = entries(leaf.offset);
        assert(children.length > 0);
        leaf = children[0];
      }
      const dataEntry = base + leaf.offset;
      const bytes = b.subarray(raw(b.readUInt32LE(dataEntry)), raw(b.readUInt32LE(dataEntry)) + b.readUInt32LE(dataEntry + 4));
      const strings = {};
      function block(at) {
        const length = bytes.readUInt16LE(at), valueLength = bytes.readUInt16LE(at + 2), type = bytes.readUInt16LE(at + 4);
        assert(length >= 6 && at + length <= bytes.length);
        let end = at + 6;
        while (bytes.readUInt16LE(end) !== 0) end += 2;
        const key = bytes.toString('utf16le', at + 6, end), valueAt = align(end + 2);
        if (type === 1 && valueLength) strings[key] = bytes.toString('utf16le', valueAt, valueAt + valueLength * 2).replace(/\0+$/, '');
        let child = align(valueAt + valueLength * (type === 1 ? 2 : 1));
        while (child + 6 <= at + length) {
          if (bytes.readUInt16LE(child) === 0) break;
          const next = block(child);
          child = align(child + next);
        }
        return length;
      }
      block(0);
      version = { fileVersion: strings.FileVersion ?? null, productVersion: strings.ProductVersion ?? null };
    }
  }
  return { machine: b.readUInt16LE(start + 4), managed: b.readUInt32LE(directories + 14 * 8) !== 0, codeviews, version };
}
module.exports = { inspectPe };
