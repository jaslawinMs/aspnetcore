'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const payload = path.dirname(__dirname);
const root = path.dirname(payload);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
if (fs.existsSync(path.join(payload, 'MANIFEST.json')) || fs.existsSync(path.join(payload, 'MANIFEST.sha256'))) throw Error('Refusing to replace an existing freeze');
const entries = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile()) {
      const bytes = fs.readFileSync(full);
      entries.push({ path: path.relative(payload, full), bytes: bytes.length, sha256: sha(bytes) });
    } else throw Error('Unexpected non-file payload entry');
  }
}
walk(payload);
entries.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
if (entries.length + 2 > 250) throw Error(`Too many payload files: ${entries.length + 2}`);
const manifest = {
  format: 'AutoPerf F153/F154 bounded preparation metadata capsule 010',
  findingsStatus: 'PENDING',
  unadopted: true,
  unmeasured: true,
  fullCompilerInputAttestation: false,
  payloadScope: 'Selected evidence only; worktrees, full images, runtime/SDK/packages/tools binaries and source archives are not in this capsule',
  createdUtc: new Date().toISOString(),
  hashedPayloadFiles: entries.length,
  hashedPayloadBytes: entries.reduce((sum, e) => sum + e.bytes, 0),
  entries
};
const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2));
const hash = sha(manifestBytes);
fs.writeFileSync(path.join(payload, 'MANIFEST.json'), manifestBytes, { flag: 'wx' });
const shaBytes = Buffer.from(`${hash}  MANIFEST.json\n`);
fs.writeFileSync(path.join(payload, 'MANIFEST.sha256'), shaBytes, { flag: 'wx' });
const receipt = {
  handoff: path.join(payload, 'HANDOFF.md'),
  payload,
  totalFiles: entries.length + 2,
  totalBytes: manifest.hashedPayloadBytes + manifestBytes.length + shaBytes.length,
  manifestSha256: hash,
  status: 'PENDING',
  unadopted: true,
  unmeasured: true,
  freezeCount: 1,
  frozenUtc: manifest.createdUtc
};
fs.writeFileSync(path.join(root, 'FREEZE-RECEIPT.json'), JSON.stringify(receipt, null, 2), { flag: 'wx' });
console.log(JSON.stringify(receipt, null, 2));
