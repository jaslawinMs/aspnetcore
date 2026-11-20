'use strict';
// Adapted from the read-only F173-F175-013 capsule Seal-GitProofs.cjs recipe.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const { objectId, treeEntries, commitTree } = require('./GitObjects.cjs');
const { sha } = require('./Inventories.cjs');
const root = __dirname, graphs = JSON.parse(fs.readFileSync(path.join(root, 'graph-creation.json')));
const policy = JSON.parse(fs.readFileSync(path.join(root, '..', '..', 'policy.json')));
assert(!policy.actualWorkerBuildHoldActive && policy.workersMayBuildOrTest);
const sources = JSON.parse(fs.readFileSync(path.join(root, 'source-records.json')));
const additional = JSON.parse(fs.readFileSync(path.join(root, 'additional-source-records.json')));
const selected = JSON.parse(fs.readFileSync(path.join(root, 'selected-records.json')));
const objects = new Map(), proofs = [];
function capture(repo, type, id) {
  if (objects.has(id)) return objects.get(id).bytes;
  const result = cp.spawnSync('git', ['--no-pager', '-C', repo, 'cat-file', type, id], { encoding: null, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  assert.equal(result.status, 0, String(result.stderr));
  assert.equal(objectId(type, result.stdout), id);
  const name = `git-objects/${id}.${type}`, file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, result.stdout);
  objects.set(id, { type, selected: name, bytes: result.stdout });
  return result.stdout;
}
for (const role of ['original', 'default']) {
  const repo = graphs[`${role}Path`], commit = graphs[`${role}Commit`], tree = commitTree(capture(repo, 'commit', commit));
  const requests = new Map();
  for (const record of [...sources.records, ...additional.records, ...selected.immutableSources].filter(record => record.role === role))
    requests.set(record.source, { path: record.source, blob: record.blob ?? null, absent: record.absent ?? false, selected: record.selected ?? record.rawGitBlob ?? null });
  for (const request of requests.values()) {
    let current = tree, absent = false;
    const parts = request.path.split('/');
    for (const [index, component] of parts.entries()) {
      const entry = treeEntries(capture(repo, 'tree', current)).find(entry => entry.name === component);
      if (!entry) { absent = true; break; }
      if (index === parts.length - 1) {
        assert(!request.absent);
        assert.equal(entry.object, request.blob);
        assert.equal(objectId('blob', fs.readFileSync(path.join(root, request.selected))), entry.object);
      } else {
        assert.equal(entry.mode, '40000');
        current = entry.object;
      }
    }
    assert.equal(absent, request.absent);
    proofs.push({ role, commit, rootTree: tree, ...request });
  }
}
const result = { boundary: 'Raw commit/tree Merkle membership for every retained pinned source, immutable PDB-source bridge and checksum-directive witness. Git blob hashes establish LF bytes and their exact CRLF/raw-PDB relation; no assertion of missing historical logical-source bytes. Online Default observation is separate from this offline pin.', objects: [...objects.entries()].map(([id, value]) => ({ id, type: value.type, selected: value.selected, bytes: value.bytes.length, sha256: sha(value.bytes) })), proofs };
fs.writeFileSync(path.join(root, 'git-source-proofs.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ rawObjects: objects.size, sourceProofs: proofs.length }));
