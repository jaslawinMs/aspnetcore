'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { sha } = require('./Inventories.cjs');
const root = __dirname, policy = JSON.parse(fs.readFileSync(path.join(root, '..', '..', 'policy.json')));
assert(!policy.actualWorkerBuildHoldActive && policy.workersMayBuildOrTest);
function walk(directory = '') {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(item => {
    const name = directory ? directory + '/' + item.name : item.name;
    assert(!item.isSymbolicLink());
    if (item.isDirectory()) return walk(name);
    if (['MANIFEST.json', 'MANIFEST.sha256'].includes(name)) return [];
    const bytes = fs.readFileSync(path.join(root, name));
    return [{ path: name, bytes: bytes.length, sha256: sha(bytes) }];
  });
}
const files = walk().sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const manifest = { schema: 'F176-F179-selected-portable-evidence-v1', createdAtUtc: new Date().toISOString(),
  status: 'PENDING', findings: ['F176', 'F177', 'F178', 'F179'], candidates: 0, comparisons: 0,
  excludedExactly: ['MANIFEST.json', 'MANIFEST.sha256'], fileCount: files.length, totalBytes: files.reduce((total, file) => total + file.bytes, 0), files,
  boundary: 'Every capsule file except the manifest and its digest, no other filename/prefix exemption. Complete declared native/runtime inventories are not copies or independent replay attestations of their uncopied files. Read-only auditor and portable selected bytes are included.' };
const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n'), digest = sha(bytes);
fs.writeFileSync(path.join(root, 'MANIFEST.json'), bytes);
fs.writeFileSync(path.join(root, 'MANIFEST.sha256'), digest + '  MANIFEST.json\n');
console.log(JSON.stringify({ manifestSha256: digest, selectedFiles: files.length, selectedBytes: manifest.totalBytes }));
