import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F126');
const [role, suffix = '001'] = process.argv.slice(2);
assert.ok(['Original', 'Default', 'Candidate'].includes(role));
assert.match(suffix, /^[a-z0-9-]+$/);
const label = `${role.toLowerCase()}-characterization-${suffix}`;
const directory = path.join(run, 'characterization', label);
assert.equal(fs.existsSync(directory), false, 'Never overwrite an actual characterization.');
fs.mkdirSync(path.join(directory, 'state'), { recursive: true });
const imageDirectory = path.join(run, 'images', role);
const args = [path.join(session, 'F126-managed-command.mjs'), label, 'C:\\src\\aspnetcore',
  path.join(imageDirectory, 'image', 'AutoPerf.Benchmarks.dll'), 'characterize',
  path.join(directory, 'state'), path.join(imageDirectory, 'closure.json'),
  path.join(imageDirectory, 'source-inputs.json'), path.join(imageDirectory, 'source'),
  path.join(directory, 'reports-not-timed'), role, 'none'];
const result = spawnSync(process.execPath, args, { stdio: 'inherit', windowsHide: true });
assert.ifError(result.error);
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
fs.writeFileSync(path.join(directory, 'execution.json'), JSON.stringify({
  candidate: 'F126', role, actualLabel: label, actualExitCode: result.status,
  actualAnyTimingRequested: false, actualClosureSha256: sha(path.join(imageDirectory, 'closure.json')),
  actualSourceInputsSha256: sha(path.join(imageDirectory, 'source-inputs.json')),
  actualCommandArguments: args, actualDefaultSampleOwnerOnCommonBaselineFrameworkImage: role === 'Default'
}, null, 2) + '\n', { flag: 'wx' });
assert.equal(result.status, 0, 'Actual owner characterization did not complete.');
const names = fs.readdirSync(path.join(directory, 'state'));
assert.equal(names.filter(name => name.endsWith('-characterization.json')).length, 1);
assert.equal(names.filter(name => name.endsWith('-runtime-characterize-before.json')).length, 1);
assert.equal(names.filter(name => name.endsWith('-runtime-characterize-after.json')).length, 1);
assert.equal(names.filter(name => name.includes('-settings-')).length, 0);
console.log(`F126 ${role}: actual untimed owner, MVC metadata, two real redirects per route, direct/fallback/culture and handler characterization completed.`);
