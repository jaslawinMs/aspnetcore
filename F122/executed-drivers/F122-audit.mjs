import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F122');
const [label, target = run, ...flags] = process.argv.slice(2);
assert.match(label ?? '', /^[a-z0-9-]+$/);
assert.ok(flags.every(flag => ['--measurement-only', '--live-images', '--write-summary', '--require-seal'].includes(flag)));
const directory = path.join(run, 'audit-executions', label);
assert.equal(fs.existsSync(directory), false, 'Preserve every failed and successful independent audit.');
fs.mkdirSync(directory, { recursive: true });
const filename = path.join(session, 'F122-verify.mjs');
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex').toUpperCase();
const args = [filename, target, ...flags];
const started = new Date().toISOString();
const result = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
for (const stream of ['stdout', 'stderr']) fs.writeFileSync(path.join(directory, stream + '.txt'), result[stream] ?? '', { flag: 'wx' });
const receipt = {
  candidate: 'F122', label, executable: process.execPath, arguments: args, actualStartedAt: started,
  actualCompletedAt: new Date().toISOString(), actualVerifierSha256: sha(filename),
  actualExitCode: result.status, actualLaunchError: result.error?.message ?? null,
  actualStdoutSha256: sha(path.join(directory, 'stdout.txt')), actualStderrSha256: sha(path.join(directory, 'stderr.txt'))
};
fs.writeFileSync(path.join(directory, 'command.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(result.stdout);
console.error(result.stderr);
assert.equal(result.status, 0, 'Inspect and retain this audit failure; never alter measured inputs to satisfy an audit.');
