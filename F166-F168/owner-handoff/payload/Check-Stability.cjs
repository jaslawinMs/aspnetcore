'use strict';
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = __dirname, read = file => fs.readFileSync(file);
const json = file => JSON.parse(read(file).toString('utf8').replace(/^\uFEFF/, ''));
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const sort = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const before = JSON.parse(zlib.gunzipSync(read(path.join(root, 'evidence', 'image-catalogs.json.gz'))));
const images = {};
function inventory(directory, base = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    assert(!entry.isSymbolicLink(), 'No untracked image indirection');
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return inventory(file, base);
    const data = read(file);
    return [{ path: path.relative(base, file), bytes: data.length, sha256: hash(data), kind: 'file' }];
  }).sort((a, b) => sort(a.path, b.path));
}
for (const [name, catalog] of Object.entries(before.images)) {
  assert.equal(catalog.links.length, 0);
  const after = inventory(catalog.root);
  assert.deepEqual(after, catalog.files, `All files, including helper/fixture/non-DLL entries: ${name}`);
  images[name] = { root: catalog.root, files: after, prefixExceptions: [], unchangedFromCollection: true };
}
const physicalSources = json(path.join(root, 'evidence', 'source-map.json')).map(source => {
  const checkout = source.role === 'original' ? 'C:\\src\\ap-F166-o012' : 'C:\\src\\ap-F166-d012';
  const data = read(path.join(checkout, source.path));
  assert.equal(hash(data), source.rawSha256); assert.equal(data.length, source.rawBytes);
  return { role: source.role, path: source.path, bytes: data.length, sha256: hash(data) };
});
const destination = path.join(root, 'evidence', 'image-stability.json.gz');
assert(!fs.existsSync(destination));
fs.writeFileSync(destination, zlib.gzipSync(JSON.stringify({ images, physicalSources,
  boundary: 'Fresh second preparation-time read compared every file key/byte under declared owned native/fixture/reference/obj image roots and selected live physical sources. This is collection-to-sealing-window stability, not a pre-execution image attestation. Omitted SDK/runtime/package distributions are not reread here or by offline audit.' })));
console.log(JSON.stringify({ allDeclaredImageRootsUnchanged: true, imageRoots: Object.keys(images).length, selectedPhysicalSourcesUnchanged: physicalSources.length }));
