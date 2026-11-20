import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { hash, readJson } from './evidence.mjs';
const root = path.dirname(fileURLToPath(import.meta.url)), capsule = path.join(root, 'capsule');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(directory, e.name)) : [path.join(directory, e.name)]);
const relative = filename => path.relative(capsule, filename).split(path.sep).join('\\');
if (process.argv[2] === 'manifest') {
  assert(!fs.existsSync(path.join(capsule, 'manifest.json')), 'Manifest already exists');
  assert(!fs.existsSync(path.join(capsule, 'SHA256SUMS.txt')), 'Hash list already exists');
  const files = walk(capsule).sort().map(filename => {
    const bytes = fs.readFileSync(filename);
    return { path: relative(filename), bytes: bytes.length, sha256: hash(bytes) };
  });
  const manifest = { format: 1, purpose: 'Read-only F155-F159 preparation; all five PENDING', fileCount: files.length, payloadBytes: files.reduce((sum, f) => sum + f.bytes, 0), files };
  const manifestPath = path.join(capsule, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  const lines = [...files.map(f => `${f.sha256}  ${f.path}`), `${hash(fs.readFileSync(manifestPath))}  manifest.json`];
  fs.writeFileSync(path.join(capsule, 'SHA256SUMS.txt'), lines.join('\n') + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ manifestCreated: true, payloadFileCount: files.length, finalSelectedFileCount: files.length + 2, manifestSha256: hash(fs.readFileSync(manifestPath)) }, null, 2));
} else if (process.argv[2] === 'seal') {
  assert(!fs.existsSync(path.join(root, 'seal.json')), 'Seal already exists');
  const audit = readJson(path.join(root, 'commands', '084-portable-capsule-audit.json'));
  assert.equal(audit.state, 'terminal'); assert.equal(audit.streamsTerminal, true); assert.equal(audit.exitCode, 0);
  const files = walk(capsule), manifest = fs.readFileSync(path.join(capsule, 'manifest.json'));
  const seal = {
    preparedAtUtc: new Date().toISOString(),
    capsulePath: capsule,
    handoffPath: path.join(capsule, 'HANDOFF.md'),
    manifestPath: path.join(capsule, 'manifest.json'),
    hashListPath: path.join(capsule, 'SHA256SUMS.txt'),
    selectedFileCount: files.length,
    selectedBytes: files.reduce((sum, p) => sum + fs.statSync(p).size, 0),
    manifestSha256: hash(manifest),
    hashListSha256: hash(fs.readFileSync(path.join(capsule, 'SHA256SUMS.txt'))),
    handoffSha256: hash(fs.readFileSync(path.join(capsule, 'HANDOFF.md'))),
    portableAuditReceipt: 'commands\\084-portable-capsule-audit.json',
    portableAuditStdoutSha256: hash(fs.readFileSync(path.join(root, 'commands', '084-portable-capsule-audit.stdout.txt'))),
    pending: ['F155', 'F156', 'F157', 'F158', 'F159'],
    boundaries: ['Preparation only; no finding outcome or campaign finalization.', 'Selected capsule now immutable; no subsequent edits.', 'Native terminal-state and process-observation limits are explicit in capsule.']
  };
  assert(seal.selectedFileCount <= 180, 'Essential file target exceeded');
  fs.writeFileSync(path.join(root, 'seal.json'), JSON.stringify(seal, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(seal, null, 2));
} else throw Error('Use manifest or seal');
