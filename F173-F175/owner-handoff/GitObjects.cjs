'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
function objectId(type, bytes) {
  return crypto.createHash('sha1').update(Buffer.from(`${type} ${bytes.length}\0`)).update(bytes).digest('hex');
}
function treeEntries(bytes) {
  const rows = [];
  let at = 0;
  while (at < bytes.length) {
    const space = bytes.indexOf(32, at), end = bytes.indexOf(0, space + 1);
    assert(space > at && end > space);
    assert(end + 21 <= bytes.length);
    rows.push({ mode: bytes.toString('ascii', at, space), name: bytes.toString('utf8', space + 1, end), object: bytes.subarray(end + 1, end + 21).toString('hex') });
    at = end + 21;
  }
  assert.equal(at, bytes.length);
  return rows;
}
function commitTree(bytes) {
  const first = bytes.toString('utf8').split('\n', 1)[0];
  assert(/^tree [0-9a-f]{40}$/.test(first));
  return first.slice(5);
}
module.exports = { objectId, treeEntries, commitTree };
