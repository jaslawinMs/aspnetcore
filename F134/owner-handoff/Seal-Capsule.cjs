const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = __dirname;
const manifestPath = path.join(root, 'manifest.json');
const checksumPath = path.join(root, 'manifest.sha256');
if (fs.existsSync(manifestPath) || fs.existsSync(checksumPath)) throw Error('A frozen capsule cannot be resealed or modified in place.');
const files = [], links = [];
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function walk(directory, relative = '') {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const name = relative ? path.join(relative, entry.name) : entry.name;
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      links.push({ path: name, target: fs.readlinkSync(full), treatment: 'Read-only external toolchain, not traversed or owned by this capsule. Selected file identities are recorded separately.' });
    } else if (entry.isDirectory()) walk(full, name);
    else files.push({ path: name, bytes: fs.statSync(full).size, sha256: digest(full) });
  }
}
walk(root);
const handoff = JSON.parse(fs.readFileSync(path.join(root, 'HANDOFF.json')));
const manifest = {
  findingId: 'F134',
  sealedUtc: new Date().toISOString(),
  status: handoff.finalStatus,
  regularFilesCoveredExcludingManifestFiles: files.length,
  totalRegularArtifactFilesAfterSeal: files.length + 2,
  hashAlgorithm: 'SHA256',
  selfReferenceBoundary: 'manifest.json inventories every regular artifact file except itself and manifest.sha256. manifest.sha256 hashes each inventoried file and manifest.json; only the checksum file itself is necessarily excluded.',
  externalLinks: links,
  files
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
const manifestHash = digest(manifestPath);
const entries = [...files, { path: 'manifest.json', sha256: manifestHash }].sort((a, b) => a.path.localeCompare(b.path));
fs.writeFileSync(checksumPath, entries.map(file => `${file.sha256} *${file.path}`).join('\r\n') + '\r\n');
for (const file of entries) if (digest(path.join(root, file.path)) !== file.sha256) throw Error(`Post-seal verification failed: ${file.path}`);
console.log(JSON.stringify({ root, regularArtifactFileCount: files.length + 2, checkedSha256Entries: entries.length, manifestSha256: manifestHash, allMatched: true, externalLinks: links.length }));
