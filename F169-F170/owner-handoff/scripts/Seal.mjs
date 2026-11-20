import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, readJson } from './capsule/evidence.mjs';

const root = path.dirname(fileURLToPath(import.meta.url)), capsule = path.join(root, 'capsule');
const final = process.argv.includes('--final');
if (fs.existsSync(path.join(root, 'seal.json'))) throw Error('Already sealed');
function walk(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en')).flatMap(entry => {
    const relative = prefix ? `${prefix}\\${entry.name}` : entry.name;
    return entry.isDirectory() ? walk(path.join(directory, entry.name), relative) : [relative];
  });
}
const full = relative => path.join(capsule, ...relative.split('\\'));
if (!final) {
  const paths = walk(capsule).filter(relative => !['manifest.json', 'SHA256SUMS.txt'].includes(relative));
  const files = paths.map(relative => {
    const buffer = fs.readFileSync(full(relative));
    return { path: relative, bytes: buffer.length, sha256: hash(buffer) };
  });
  const manifest = {
    schema: 'F169-F170-selected-capsule-v1',
    boundary: 'All selected payloads except this manifest and its hash list. No whole-image/compiler/execution closure claim.',
    files
  };
  fs.writeFileSync(full('manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const hashes = [...files.map(file => ({ path: file.path, sha256: file.sha256 })),
    { path: 'manifest.json', sha256: hash(fs.readFileSync(full('manifest.json'))) }]
    .sort((a, b) => a.path.localeCompare(b.path, 'en'));
  fs.writeFileSync(full('SHA256SUMS.txt'), `${hashes.map(file => `${file.sha256}  ${file.path}`).join('\n')}\n`);
  console.log(JSON.stringify({ manifestPrepared: true, files: walk(capsule).length, manifestSha256: hash(fs.readFileSync(full('manifest.json'))) }));
} else {
  const auditReceipt = readJson(path.join(root, 'commands', '072-portable-audit-final.json'));
  if (auditReceipt.exitCode !== 0 || !auditReceipt.rootAwaited || !auditReceipt.stdoutAwaited || !auditReceipt.stderrAwaited) throw Error('Successful awaited portable audit required');
  const audited = JSON.parse(fs.readFileSync(path.join(root, 'commands', '072-portable-audit-final.stdout.txt'), 'utf8'));
  if (!audited.auditPassed) throw Error('Portable audit did not pass');
  const paths = walk(capsule), bytes = paths.reduce((sum, relative) => sum + fs.statSync(full(relative)).size, 0);
  const manifestSha256 = hash(fs.readFileSync(full('manifest.json')));
  if (audited.selectedFiles !== paths.length || audited.selectedBytes !== bytes || audited.manifestSha256 !== manifestSha256) throw Error('Selection changed after audit');
  const terminal = readJson(full('terminal-native-work.json'));
  if (!terminal.noOwnedNativeWorkRemaining) throw Error('Native terminal receipt missing');
  const seal = {
    root, capsule, selectedFiles: paths.length, selectedBytes: bytes,
    manifestSha256, hashListSha256: hash(fs.readFileSync(full('SHA256SUMS.txt'))),
    handoffSha256: hash(fs.readFileSync(full('HANDOFF.md'))),
    terminalNativeReceiptSha256: hash(fs.readFileSync(full('terminal-native-work.json'))),
    auditReceiptSha256: hash(fs.readFileSync(path.join(root, 'commands', '072-portable-audit-final.json'))),
    auditOutputSha256: hash(fs.readFileSync(path.join(root, 'commands', '072-portable-audit-final.stdout.txt'))),
    auditStderrSha256: hash(fs.readFileSync(path.join(root, 'commands', '072-portable-audit-final.stderr.txt'))),
    audit: audited, state: { F169: 'PENDING', F170: 'PENDING' },
    readonly: 'Every selected capsule file is marked read-only after audit; no payload changes are allowed after this seal.',
    packagingReceipts: 'commands\\069-build-capsule.*, commands\\070-prepare-manifest.*, commands\\072-portable-audit-final.*, commands\\073-final-seal.* remain outside selected capsule to avoid self-including audit receipts.'
  };
  fs.writeFileSync(path.join(root, 'seal.json'), `${JSON.stringify(seal, null, 2)}\n`);
  for (const relative of paths) fs.chmodSync(full(relative), 0o444);
  fs.chmodSync(path.join(root, 'seal.json'), 0o444);
  console.log(JSON.stringify({ sealed: true, selectedFiles: paths.length, selectedBytes: bytes, manifestSha256, state: seal.state }));
}
