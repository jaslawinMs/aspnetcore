'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = __dirname;
const graphs = JSON.parse(fs.readFileSync(path.join(root, 'graph-creation.json')));
const hash = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
function inventory(directory, relative = '') {
  const rows = [];
  for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const item = path.join(relative, entry.name);
    if (entry.isDirectory()) rows.push(...inventory(directory, item));
    else {
      const bytes = fs.readFileSync(path.join(directory, item));
      rows.push({ path: item.replaceAll('\\', '/'), bytes: bytes.length, sha256: hash(bytes) });
    }
  }
  return rows.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
const result = { boundary: 'Every file recursively under each actual native test output, before copying the four common supplemental files. No filename or prefix exclusion.', images: {} };
for (const role of ['original', 'default']) {
  const directory = path.join(graphs[`${role}Path`], 'artifacts', 'bin', 'Microsoft.AspNetCore.Identity.InMemory.Test', 'Release', 'net12.0');
  const files = inventory(directory);
  assert(files.length > 0);
  result.images[role] = { sourceRole: role, commit: graphs[`${role}Commit`], directory, files, count: files.length, bytes: files.reduce((total, f) => total + f.bytes, 0) };
}
const original = new Map(result.images.original.files.map(f => [f.path, f]));
const current = new Map(result.images.default.files.map(f => [f.path, f]));
result.differences = [...new Set([...original.keys(), ...current.keys()])].sort()
  .filter(name => original.get(name)?.sha256 !== current.get(name)?.sha256)
  .map(name => ({ path: name, original: original.get(name) ?? null, default: current.get(name) ?? null }));
const filename = path.join(root, 'native-images.json');
assert(!fs.existsSync(filename), 'Do not overwrite initial full declared native images');
fs.writeFileSync(filename, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ original: { count: result.images.original.count, bytes: result.images.original.bytes }, default: { count: result.images.default.count, bytes: result.images.default.bytes }, differences: result.differences.length }));
