'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = __dirname, excludedSelfFiles = ['MANIFEST.json', 'MANIFEST.sha256'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
function inventory(relative = '') {
  const rows = [];
  for (const item of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    const next = path.join(relative, item.name);
    assert(!item.isSymbolicLink(), 'No donor/symlink inputs in the portable capsule');
    if (item.isDirectory()) rows.push(...inventory(next));
    else {
      const name = next.replaceAll('\\', '/');
      if (excludedSelfFiles.includes(name)) continue;
      const bytes = fs.readFileSync(path.join(root, next));
      rows.push({ path: name, bytes: bytes.length, sha256: hash(bytes) });
    }
  }
  return rows.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
for (const name of excludedSelfFiles) assert(!fs.existsSync(path.join(root, name)), 'Preserve an earlier seal before resealing');
const files = inventory();
const manifest = {
  format: 'selected-file-capsule-v1',
  scope: 'NEW F182/F183/F184/F185/F186 one-class bounded untimed preparation; all remain PENDING; includes attributed immutable historical F173-F175 capsule',
  excludedSelfFiles, count: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0), files
};
const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n'), digest = hash(bytes);
fs.writeFileSync(path.join(root, 'MANIFEST.json'), bytes, { flag: 'wx' });
fs.writeFileSync(path.join(root, 'MANIFEST.sha256'), `${digest}  MANIFEST.json\n`, { flag: 'wx' });
console.log(JSON.stringify({ files: manifest.count, bytes: manifest.bytes, manifestBytes: bytes.length, manifestSha256: digest }));
