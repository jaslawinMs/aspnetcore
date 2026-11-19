import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F123');
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const write = (filename, value) => fs.writeFileSync(filename, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex').toUpperCase();
assert.equal(read(path.join(run, 'validation', 'original-preservation-tests-003', 'test-row-audit.json')).actualPassed, 40);
assert.equal(read(path.join(run, 'validation', 'default-existing-tests-001', 'test-row-audit.json')).actualPassed, 28);
assert.equal(read(path.join(run, 'validation', 'preservation-format-001', 'result.json')).exitCode, 0);
write(path.join(run, 'diagnostic-budget.json'), {
  candidate: 'F123', maximum: 3, authorized: [], completed: [], failedOrPartialAttempts: [],
  permanentlyClosed: false, state: 'untimed-baseline-preparation',
  actualCreatedAt: new Date().toISOString(),
  actualAcceptancePlanSha256: sha(path.join(run, 'acceptance-plan.json')),
  actualSettingsExecutorSha256: sha(path.join(run, 'harness', 'SettingsPreservingEmitToolchain.cs')),
  actualRetainedSamplesPerCompleteComparison: 384,
  actualMachineSettingsChangesAuthorized: false, actualFailedOrPartialAuthorizationsRemainConsumed: true
});
function node(args) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(process.execPath, args, {
    encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024
  });
  fs.appendFileSync(path.join(run, 'preparation-driver-invocations.jsonl'), JSON.stringify({
    executable: process.execPath, arguments: args, actualStartedAt: startedAt,
    actualCompletedAt: new Date().toISOString(), exitCode: result.status,
    launchError: result.error?.message ?? null, stdout: result.stdout ?? '', stderr: result.stderr ?? ''
  }) + '\n');
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  assert.ifError(result.error);
  assert.equal(result.status, 0);
}
function managed(prior, label) {
  const old = read(path.join(session, 'autoperf-runs', 'F122', 'validation', prior, 'command.json'));
  const args = old.arguments.map(value => value.replaceAll('F122', 'F123').replaceAll(prior, label));
  if (args[1] === 'characterize') {
    fs.mkdirSync(args[2], { recursive: true });
    fs.mkdirSync(args[6], { recursive: true });
  }
  node([path.join(session, 'F123-managed-command.mjs'), label, old.cwd, ...args]);
}
managed('harness-restore-001', 'harness-restore-001');
managed('harness-build-002', 'harness-build-001');
node([path.join(session, 'F123-freeze.mjs'), 'Original']);
node([path.join(session, 'F123-freeze.mjs'), 'Default']);
managed('original-characterize-001', 'original-characterize-001');
managed('default-characterize-001', 'default-characterize-001');
assert.equal(read(path.join(run, 'diagnostic-budget.json')).authorized.length, 0);
console.log('F123 original/default actual-producer characterization completed without timing or shipping changes.');
