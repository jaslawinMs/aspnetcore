'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { hash } = require('./Metadata.cjs');
const capsule = path.join(__dirname, 'capsule');
assert(!fs.existsSync(path.join(capsule, 'MANIFEST.json')), 'Never overwrite a sealed manifest');
assert(!fs.existsSync(path.join(capsule, 'MANIFEST.sha256')), 'Never overwrite a sealed manifest hash');
function walk(directory, relative = '') {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    assert(!entry.isSymbolicLink(), 'Capsule must not contain links');
    const name = relative ? path.join(relative, entry.name) : entry.name;
    if (entry.isDirectory()) result.push(...walk(path.join(directory, entry.name), name));
    else {
      assert(entry.isFile());
      const bytes = fs.readFileSync(path.join(capsule, name));
      result.push({ path: name, bytes: bytes.length, sha256: hash(bytes) });
    }
  }
  return result;
}
const files = walk(capsule).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const closure = JSON.parse(fs.readFileSync(path.join(capsule, 'evidence', 'final-process-closure.json'), 'utf8').replace(/^\uFEFF/, ''));
assert.equal(closure.unavailableIdentities, 0);
assert.equal(closure.sameIdentityStillObserved, 0);
const payloadSetSHA256 = hash(Buffer.from(files.map(f => `${f.path}\0${f.bytes}\0${f.sha256}\n`).join(''), 'utf8'));
const manifest = {
  schema: 1,
  ownerId: 'bb4c15c7-3a8e-4145-b72f-7da74cfea243',
  frozenUtc: new Date().toISOString(),
  payloadFileCount: files.length,
  payloadBytes: files.reduce((sum, f) => sum + f.bytes, 0),
  payloadSetSHA256,
  envelopeFilesExcludedFromPayload: ['MANIFEST.json', 'MANIFEST.sha256'],
  files
};
const bytes = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');
const manifestSHA256 = hash(bytes);
fs.writeFileSync(path.join(capsule, 'MANIFEST.json'), bytes, { flag: 'wx' });
fs.writeFileSync(path.join(capsule, 'MANIFEST.sha256'), `${manifestSHA256}  MANIFEST.json\r\n`, { flag: 'wx' });
console.log(JSON.stringify({ status: 'FROZEN', capsule, payloadFiles: files.length, payloadBytes: manifest.payloadBytes, payloadSetSHA256, manifestSHA256, envelopeFiles: 2 }));
