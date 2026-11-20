'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.dirname(__dirname);
const digest = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const excluded = new Set(['manifest.json', 'manifest.sha256']);
const files = [];
function walk(folder = root) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    const relative = path.relative(root, full).replaceAll('\\', '/');
    if (folder === root && excluded.has(entry.name)) continue;
    if (entry.isSymbolicLink()) throw new Error('Capsule must not contain external links.');
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile()) {
      const bytes = fs.readFileSync(full);
      files.push({ path: relative, bytes: bytes.length, sha256: digest(bytes) });
    } else throw new Error('Unsupported file entry ' + relative);
  }
}
walk();
files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
if (files.length + 2 > 250) throw new Error('Small publication file cap exceeded.');
if (fs.existsSync(path.join(root, 'manifest.json'))) throw new Error('Never overwrite a prior capsule seal.');
const manifest = {
  schemaVersion: 1, finding: 'F135', purpose: 'Portable historical evidence selection; not a new source/runtime execution.',
  selfReceiptExclusions: [...excluded], externalLinks: [], files
};
const bytes = Buffer.from(JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(root, 'manifest.json'), bytes);
const sha256 = digest(bytes);
fs.writeFileSync(path.join(root, 'manifest.sha256'), sha256 + '  manifest.json\n');
console.log(JSON.stringify({ sealed: true, filesIncludingManifestReceipts: files.length + 2, bytesIncludingManifest: files.reduce((total, file) => total + file.bytes, 0) + bytes.length, manifestSha256: sha256 }));
