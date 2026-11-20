'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = __dirname;
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
function inventory(directory, relative = '') {
  const result = [];
  for (const item of fs.readdirSync(path.join(directory, relative), { withFileTypes: true })) {
    const next = path.join(relative, item.name);
    assert(!item.isSymbolicLink(), `No external symlink dependence in declared image: ${directory}\\${next}`);
    if (item.isDirectory()) result.push(...inventory(directory, next));
    else {
      const bytes = fs.readFileSync(path.join(directory, next));
      result.push({ path: next.replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) });
    }
  }
  return result.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
function union(original, current) {
  const a = new Map(original.map(file => [file.path, file])), b = new Map(current.map(file => [file.path, file]));
  return [...new Set([...a.keys(), ...b.keys()])].sort().map(name => ({
    path: name, original: a.get(name) ?? null, default: b.get(name) ?? null,
    relation: !a.has(name) ? 'default-only' : !b.has(name) ? 'original-only' : a.get(name).sha256 === b.get(name).sha256 ? 'same' : 'different'
  }));
}
function describe(directory, fields = {}) {
  const files = inventory(directory);
  return { ...fields, directory, count: files.length, bytes: files.reduce((total, file) => total + file.bytes, 0), files };
}
function save(name, value) {
  const file = path.join(root, name);
  assert(!fs.existsSync(file), `Frozen inventory ${name}`);
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
function native(stage) {
  const graphs = JSON.parse(fs.readFileSync(path.join(root, 'graph-creation.json')));
  const groups = {
    core: 'Microsoft.AspNetCore.Mvc.Core.Test',
    razor: 'Microsoft.AspNetCore.Mvc.Razor.Test',
    assets: 'RazorBuildWebSite.Views'
  };
  const images = {}, unions = {}, differences = {};
  for (const [kind, assembly] of Object.entries(groups)) {
    images[kind] = {};
    for (const role of ['original', 'default'])
      images[kind][role] = describe(path.join(graphs[`${role}Path`], 'artifacts', 'bin', assembly, 'Release', 'net12.0'), { kind, assembly, role, commit: graphs[`${role}Commit`] });
    unions[kind] = union(images[kind].original.files, images[kind].default.files);
    differences[kind] = unions[kind].filter(file => file.relation !== 'same');
  }
  save(stage === 'initial' ? 'native-images.json' : 'native-images-final.json', {
    boundary: 'Every file recursively in all three actual normal native output directories on each role, including helpers, JSON, EXE, PDB, refs, assets and non-DLL files; no filename/prefix exclusion. Only selected bytes are copied into capsule.',
    stage, images, unions, differences
  });
  console.log(JSON.stringify({ stage, images: Object.fromEntries(Object.entries(images).map(([kind, roles]) => [kind, Object.fromEntries(Object.entries(roles).map(([role, image]) => [role, image.count]))])) }));
}
if (require.main === module) native(process.argv[2]);
module.exports = { inventory, union, describe, sha };
