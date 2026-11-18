import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F044');
const variant = process.argv[2];
const variants = {
  Original: { suffix: 'original', root: String.raw`C:\src\aspnetcore`, label: 'original-characterization-001' },
  Default: { suffix: 'current-default', root: String.raw`C:\src\autoperf-F042-default`, label: 'current-default-characterization-001' },
  Candidate: { suffix: 'candidate', root: String.raw`C:\src\aspnetcore`, label: 'candidate-characterization-001' }
};
assert.ok(Object.hasOwn(variants, variant ?? ''));
const selected = variants[variant];
const budget = JSON.parse(fs.readFileSync(path.join(run, 'diagnostic-budget.json'), 'utf8'));
assert.equal(budget.consumed, 0);
assert.equal(budget.closed, false);
const target = path.join(run, `characterization-${selected.suffix}-001`);
assert.equal(fs.existsSync(target), false);
fs.mkdirSync(path.join(target, 'states'), { recursive: true });
fs.mkdirSync(path.join(target, 'reports'));
const result = spawnSync(process.execPath, [
  path.join(session, 'F044-managed-command.mjs'), selected.label, selected.root,
  path.join(run, 'consumer-' + selected.suffix, 'AutoPerf.Benchmarks.dll'),
  'characterize', path.join(target, 'states'),
  path.join(run, 'consumer-' + selected.suffix + '-closure.json'),
  path.join(run, 'source-inputs-' + selected.suffix + '.json'),
  path.join(run, 'source-files-' + selected.suffix),
  path.join(target, 'reports'), variant, 'none'
], { cwd: selected.root, stdio: 'inherit', windowsHide: true });
assert.equal(result.status, 0, `Actual ${variant} direct-base characterization failed; retain its unique state and raw command.`);
