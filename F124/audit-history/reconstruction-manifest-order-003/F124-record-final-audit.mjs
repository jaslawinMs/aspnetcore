import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F124');
const verifier = path.join(session, 'F124-verify.mjs');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
assert.equal(sha(verifier), sha(path.join(run, 'F124-verify.mjs')));
const args = [verifier, run, '--live-images', '--output', path.join(run, 'audit-summary.json')];
const startedAt = new Date().toISOString();
const result = spawnSync(process.execPath, args, {
  cwd: String.raw`C:\src\aspnetcore`, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024
});
for (const [name, content] of [['stdout', result.stdout], ['stderr', result.stderr]]) {
  fs.writeFileSync(path.join(run, 'full-live-audit.' + name + '.txt'), content ?? '', { flag: 'wx' });
}
const command = {
  candidate: 'F124', executable: process.execPath, arguments: args,
  workingDirectory: String.raw`C:\src\aspnetcore`, actualVerifierSha256: sha(verifier),
  actualStartedAt: startedAt, actualCompletedAt: new Date().toISOString(),
  actualExitCode: result.status, actualLaunchError: result.error?.message ?? null,
  actualAdditionalTimingSamples: 0,
  actualStdoutSha256: sha(path.join(run, 'full-live-audit.stdout.txt')),
  actualStderrSha256: sha(path.join(run, 'full-live-audit.stderr.txt'))
};
fs.writeFileSync(path.join(run, 'full-live-audit.command.json'), JSON.stringify(command, null, 2) + '\n', { flag: 'wx' });
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
assert.ifError(result.error);
assert.equal(result.status, 0);
