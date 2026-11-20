'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { objectId, treeEntries, commitTree } = require('./GitObjects.cjs');
const root = __dirname;
const graphs = JSON.parse(fs.readFileSync(path.join(root, 'graph-creation.json')));
const sources = JSON.parse(fs.readFileSync(path.join(root, 'source-records.json')));
const selected = JSON.parse(fs.readFileSync(path.join(root, 'selected-records.json')));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
function write(name, bytes) {
  const destination = path.join(root, name);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (fs.existsSync(destination)) assert(fs.readFileSync(destination).equals(Buffer.from(bytes)));
  else fs.writeFileSync(destination, bytes);
}
function git(repo, args) {
  const result = cp.spawnSync('git', ['--no-optional-locks', '--no-pager', '-C', repo, ...args], { encoding: null, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
  assert.equal(result.status, 0, `git ${args.join(' ')} ${result.stderr}`);
  return result.stdout;
}
const additional = [];
for (const role of ['original', 'default']) {
  for (const source of [
    'src/Identity/testassets/Identity.DefaultUI.WebSite/Identity.DefaultUI.WebSite.csproj',
    'src/Identity/samples/IdentitySample.PasskeyConformance/InMemoryUserStore.cs',
    'src/Identity/samples/IdentitySample.PasskeyUI/InMemoryUserStore.cs',
    'src/Identity/Extensions.Core/src/UserLoginInfo.cs',
    '.gitattributes'
  ]) {
    const repo = graphs[`${role}Path`], commit = graphs[`${role}Commit`];
    const bytes = git(repo, ['show', `${commit}:${source}`]), blob = objectId('blob', bytes);
    const destination = `source/${role}/${source}`;
    write(destination, bytes);
    additional.push({ role, commit, source, blob, bytes: bytes.length, sha256: sha(bytes), selected: destination });
  }
}
write('additional-source-records.json', JSON.stringify({ records: additional, boundary: 'Linked testasset project and disambiguation of same-simple-name sample stores are source-only, not claimed executed.' }, null, 2) + '\n');
const objects = new Map(), proofs = [];
function capture(repo, type, id) {
  if (objects.has(id)) return objects.get(id).bytes;
  const bytes = git(repo, ['cat-file', type, id]);
  assert.equal(objectId(type, bytes), id);
  const destination = `git-objects/${id}.${type}`;
  write(destination, bytes);
  objects.set(id, { type, selected: destination, bytes });
  return bytes;
}
for (const role of ['original', 'default']) {
  const repo = graphs[`${role}Path`], commit = graphs[`${role}Commit`];
  const commitBytes = capture(repo, 'commit', commit), rootTree = commitTree(commitBytes);
  const requests = new Map();
  for (const record of [...sources.records, ...additional].filter(r => r.role === role))
    requests.set(record.source, { path: record.source, blob: record.blob ?? null, absent: record.absent ?? false, selected: record.selected ?? null });
  for (const document of selected.documents.filter(d => d.role === role && d.immutableSource)) {
    const source = document.immutableSource;
    if (!requests.has(source.source)) requests.set(source.source, { path: source.source, blob: source.blob, absent: false, selected: source.rawGitBlob });
  }
  for (const request of requests.values()) {
    let tree = rootTree, absent = false;
    const parts = request.path.split('/');
    for (let index = 0; index < parts.length; index++) {
      const entries = treeEntries(capture(repo, 'tree', tree)), entry = entries.find(e => e.name === parts[index]);
      if (!entry) {
        absent = true;
        break;
      }
      if (index === parts.length - 1) {
        assert(!request.absent);
        assert.equal(entry.object, request.blob, `Exact immutable source membership ${role} ${request.path}`);
        const bytes = fs.readFileSync(path.join(root, request.selected));
        assert.equal(objectId('blob', bytes), entry.object);
      }
      else {
        assert.equal(entry.mode, '40000', 'Directory tree entry');
        tree = entry.object;
      }
    }
    assert.equal(absent, request.absent);
    proofs.push({ role, commit, rootTree, ...request });
  }
}
write('git-source-proofs.json', JSON.stringify({
  boundary: 'Raw Git commit/tree Merkle membership for every selected pinned raw source and tracked selected PDB source. Current-default observation remains a separately recorded live observation, not an offline claim of current freshness.',
  objects: [...objects.entries()].map(([id, entry]) => ({ id, type: entry.type, selected: entry.selected, bytes: entry.bytes.length })),
  proofs
}, null, 2) + '\n');
console.log(JSON.stringify({ rawObjects: objects.size, sourceProofs: proofs.length, additionalSourceRecords: additional.length }));
