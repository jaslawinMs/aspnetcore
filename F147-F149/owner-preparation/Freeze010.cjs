'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const root = __dirname;
const capsule = path.join(root, 'capsule');
if (fs.existsSync(capsule) || fs.existsSync(path.join(root, 'MANIFEST.json'))) {
  throw new Error('Refusing to overwrite or mutate an existing selected capsule.');
}
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const walk = directory => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
function copy(relative) {
  const target = path.join(capsule, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, relative), target);
}
for (const name of [
  'START.json', 'ACCEPTANCE.md', 'HANDOFF.md', 'RESULTS.json',
  'Invoke-Native010.ps1', 'Build010.ps1', 'Test010.ps1', 'Inspect010.ps1',
  'Inventory010.cjs', 'CollectFinal010.ps1', 'Audit010.cjs', 'Freeze010.cjs'
]) { copy(name); }
for (const directory of ['prepared', 'logs', 'evidence', 'results']) {
  for (const file of walk(path.join(root, directory))) {
    const relative = path.relative(root, file);
    if (/^(Original|CurrentDefault)-complete-git-source-map\.json$/.test(path.basename(file)) ||
        path.basename(file) === 'SOURCE-GRAPH-BOUNDARY.json') {
      const target = path.join(capsule, relative + '.gz');
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, zlib.gzipSync(fs.readFileSync(file), { level: 9 }));
    } else {
      copy(relative);
    }
  }
}
const files = walk(capsule).sort().map(file => {
  const data = fs.readFileSync(file);
  return { path: path.relative(capsule, file).replaceAll('/', '\\'), bytes: data.length, sha256: hash(data) };
});
if (files.length + 2 > 250) { throw new Error(`Essential selected files exceed target: ${files.length + 2}`); }
const manifest = {
  format: 'F147-F149-010-selected-historical-payload-v1',
  findings: { F147: 'PENDING', F149: 'PENDING' },
  payloadFiles: files.length, envelopeFiles: 2, totalFiles: files.length + 2,
  payloadBytes: files.reduce((total, file) => total + file.bytes, 0),
  totalBytesWithEnvelopes: 0,
  fullCompilerInputAttestation: false, performanceOrCampaignSeal: false,
  intentionallyExcluded: [
    'graphs (fresh source trees, intermediates, source tar files, complete binaries and shared SDK junctions)',
    'local-work (scratch/cache state)',
    'full image files not selected; each omitted file retains its individual path, byte count and hash in image maps',
    'SDK/runtime/toolchain binaries; exact observed identities and runtime image map retained'
  ],
  files
};
let serialized;
for (;;) {
  serialized = JSON.stringify(manifest, null, 2) + '\n';
  const total = manifest.payloadBytes + Buffer.byteLength(serialized) + 65;
  if (total === manifest.totalBytesWithEnvelopes) { break; }
  manifest.totalBytesWithEnvelopes = total;
}
fs.writeFileSync(path.join(capsule, 'MANIFEST.json'), serialized);
const digest = hash(Buffer.from(serialized));
fs.writeFileSync(path.join(capsule, 'MANIFEST.sha256'), digest + '\n');
console.log(JSON.stringify({ capsule, totalFiles: manifest.totalFiles, totalBytes: manifest.totalBytesWithEnvelopes,
  payloadFiles: files.length, manifestSha256: digest }, null, 2));
