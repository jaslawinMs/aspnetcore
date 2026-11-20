'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = __dirname, payload = path.join(root, 'payload');
assert(fs.existsSync(path.join(payload, 'HANDOFF.md')), 'Preparation wrapper requires its own existing payload');
assert(!fs.existsSync(path.join(payload, 'MANIFEST.json')), 'Never modify an already sealed payload');
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  assert(!entry.isSymbolicLink(), 'Only physically selected regular capsule files');
  return entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)];
});
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
for (const name of ['HANDOFF.md', 'RESULTS.json', 'TERMINAL-RECEIPT.json', 'Freeze.cjs'])
  fs.copyFileSync(path.join(root, name), path.join(payload, name));
const preflight = {
  command: ['node', 'payload\\Audit.cjs', '--preflight'], exitCode: 0, childPidCaptured: false,
  stdout: fs.readFileSync(path.join(root, 'audit-preflight-001.stdout.txt'), 'utf8'),
  stderr: fs.readFileSync(path.join(root, 'audit-preflight-001.stderr.txt'), 'utf8'),
  boundary: 'Actual completed tool invocation exited0. Individual metadata-collector/preflight PIDs were not captured; the final portable audit PID is captured separately.'
};
assert.equal(JSON.parse(preflight.stdout).result, 'PASS');
write(path.join(payload, 'evidence', 'audit-preflight.json'), preflight);
const files = walk(payload).map(file => {
  const data = fs.readFileSync(file);
  return { path: path.relative(payload, file).split(path.sep).join('\\'), bytes: data.length, sha256: hash(data) };
}).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const manifest = {
  schema: 'factual-preparation-selected-file-manifest-v1', sealedAt: new Date().toISOString(),
  findings: { F160: 'PENDING', F161: 'PENDING', F162: 'PENDING' },
  original: '37e809ead5824bc753a1c3d56f11615bdb1296c5',
  entryObservedAndBuiltDefault: '90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d',
  fullCompilerInputAttestation: false, copiedAsCompleteRuntimeOrPackageOrBuildClosure: false,
  totalFiles: files.length + 2, payloadBytes: files.reduce((sum, file) => sum + file.bytes, 0), totalBytes: 0, files
};
assert(manifest.totalFiles <= 180, 'Essential selected-file target');
let raw;
for (let index = 0; index < 10; index++) {
  raw = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  const total = manifest.payloadBytes + raw.length + 65;
  if (total === manifest.totalBytes) break;
  manifest.totalBytes = total;
}
assert.equal(manifest.totalBytes, manifest.payloadBytes + raw.length + 65);
const manifestSha256 = hash(raw);
fs.writeFileSync(path.join(payload, 'MANIFEST.json'), raw);
fs.writeFileSync(path.join(payload, 'MANIFEST.sha256'), manifestSha256 + '\n');
const startedAt = new Date().toISOString();
const audit = spawnSync(process.execPath, [path.join(payload, 'Audit.cjs')], {
  cwd: 'C:\\src\\aspnetcore', encoding: 'utf8', windowsHide: true
});
fs.writeFileSync(path.join(root, 'audit-final.stdout.txt'), audit.stdout ?? '');
fs.writeFileSync(path.join(root, 'audit-final.stderr.txt'), audit.stderr ?? '');
const auditReceipt = { executable: process.execPath, arguments: [path.join(payload, 'Audit.cjs')],
  workingDirectory: 'C:\\src\\aspnetcore', payloadRelativeAuditFromUnrelatedCwd: true, pid: audit.pid,
  exitCode: audit.status, startedAt, completedAt: new Date().toISOString(),
  bothStreamsDrained: audit.status !== null, error: audit.error?.message ?? null };
write(path.join(root, 'audit-final.receipt.json'), auditReceipt);
assert.equal(audit.status, 0, audit.stderr);
const result = JSON.parse(audit.stdout);
assert.equal(result.result, 'PASS');
write(path.join(root, 'FREEZE-RECEIPT.json'), {
  manifestSha256, selectedFiles: manifest.totalFiles, selectedBytes: manifest.totalBytes,
  capsule: payload, handoff: path.join(payload, 'HANDOFF.md'), handoffSha256: hash(fs.readFileSync(path.join(payload, 'HANDOFF.md'))),
  audit: auditReceipt, result, findings: manifest.findings, nativeInvocationsTerminalAndDrained: 32,
  shippingChanges: false, candidate: false, performanceMeasurement: false, performanceVerdict: null,
  fullCompilerInputAttestation: false, defaultDetailedPrivateRowsStillTargetOnlyProjection: true,
  strictOneSuccessfulVerifierCompileAcrossAllAttemptsMet: false,
  mutationAfterManifest: false, exhaustiveHistoricalDescendantCensus: false, remoteHelpers: []
});
console.log(JSON.stringify({ result: 'SEALED_AND_AUDITED', manifestSha256, selectedFiles: manifest.totalFiles,
  selectedBytes: manifest.totalBytes, auditPid: audit.pid, auditExitCode: audit.status, findings: manifest.findings,
  handoff: path.join(payload, 'HANDOFF.md') }, null, 2));
