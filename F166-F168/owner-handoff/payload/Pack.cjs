'use strict';
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = __dirname, directory = path.join(root, 'evidence'), active = process.argv[2];
assert(active && /^[a-z0-9-]+$/.test(active), 'Explicit active wrapper label');
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const bulk = name => /\.(started|receipt)\.json$|\.(stdout|stderr)\.txt$/.test(name) ||
  ['collect-script-v1.cjs', 'reconcile-script-v1.ps1', 'xml-system-receipt-v1.json'].includes(name);
const files = fs.readdirSync(directory).filter(name => bulk(name) && !name.startsWith(active + '.')).sort();
const members = files.map(name => {
  const data = fs.readFileSync(path.join(directory, name));
  return { path: 'evidence\\' + name, bytes: data.length, sha256: hash(data), base64: data.toString('base64') };
});
const lookup = new Map(members.map(member => [member.path, member]));
for (const member of members.filter(member => member.path.endsWith('.started.json'))) {
  const prefix = member.path.slice(0, -'.started.json'.length);
  const receipt = lookup.get(prefix + '.receipt.json');
  assert(receipt, 'Every started attempt retains its real final receipt');
  const record = JSON.parse(Buffer.from(receipt.base64, 'base64').toString('utf8').replace(/^\uFEFF/, ''));
  assert(record.nativeExited && record.bothStreamsDrained, 'Actual native wait and both streams drained');
  assert(lookup.has(prefix + '.stdout.txt') && lookup.has(prefix + '.stderr.txt'), 'Both full raw streams, including empty streams');
  assert(record.knownChildWaits.every(child => child.terminal), 'Observed known-child waits completed');
}
const archive = Buffer.from(JSON.stringify({ format: 'exact-raw-bytes-base64-v1', members }));
const file = path.join(directory, 'all-attempts.json.gz');
assert(!fs.existsSync(file), 'Fresh archive');
fs.writeFileSync(file, zlib.gzipSync(archive));
const restored = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'));
assert.equal(restored.members.length, members.length);
for (const member of restored.members) {
  const data = Buffer.from(member.base64, 'base64');
  assert.equal(data.length, member.bytes);
  assert.equal(hash(data), member.sha256);
  assert(data.equals(fs.readFileSync(path.join(root, ...member.path.split('\\')))), 'Byte-complete compression before removal');
}
const index = { format: restored.format, members: members.map(({ base64, ...record }) => record),
  nativeAttempts: members.filter(member => member.path.endsWith('.receipt.json')).length,
  activeWrapperFilesRetainedIndependently: active,
  boundary: 'Every archived raw stdout/stderr/started/final receipt is preserved byte-for-byte, including failed/superseded attempts. This archive is evidence, not an instruction to rerun anything.' };
fs.writeFileSync(path.join(directory, 'all-attempts-index.json'), JSON.stringify(index, null, 2));
for (const name of files) fs.unlinkSync(path.join(directory, name));
console.log(JSON.stringify({ compressedMembers: members.length, nativeAttempts: index.nativeAttempts,
  rawMemberBytes: members.reduce((sum, member) => sum + member.bytes, 0), archiveBytes: fs.statSync(file).size }));
