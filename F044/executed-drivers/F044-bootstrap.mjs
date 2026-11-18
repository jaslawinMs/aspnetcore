import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F044');
const prior = path.join(session, 'autoperf-runs', 'F043', 'harness');
const harness = path.join(run, 'harness');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
assert.ok(fs.existsSync(path.join(run, 'intake-completed.json')));
assert.equal(fs.existsSync(harness), false);
const projectFiles = [
  'AutoPerf.Benchmarks.csproj', 'Evidence.cs', 'RegistrationScenario.cs',
  'SectionRegistrationBenchmarks.cs', 'Characterization.cs', 'Program.cs',
  'SettingsPreservingEmitToolchain.cs',
  ...['NoSections', 'One', 'Two', 'Eight', 'SixtyFour', 'EightLong'].map(name => path.join('Views', name + '.cshtml'))
];
const copied = [];
for (const file of projectFiles) {
  const bytes = fs.readFileSync(path.join(prior, file));
  const target = path.join(harness, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes, { flag: 'wx' });
  copied.push({ path: file, originalF043Sha256: hash(bytes) });
}
for (const name of ['managed-command', 'freeze', 'validate-untimed']) {
  const from = path.join(session, `F043-${name}.mjs`);
  const destination = path.join(session, `F044-${name}.mjs`);
  const source = fs.readFileSync(from, 'utf8');
  const transformed = source.replaceAll('F043', 'F044')
    .replaceAll('c5baf473f31fa3bbe9f8201e3411361c632f3a91', '31c15331c03714b7a602e1817e65881474c29e2e');
  assert.notEqual(source, transformed);
  fs.writeFileSync(destination, transformed, { flag: 'wx' });
}
fs.writeFileSync(path.join(run, 'bootstrap-copies.json'), JSON.stringify({
  candidate: 'F044', actualOnlyAuthoredInputsCopied: true, actualPriorTimingReused: false,
  actualPlanAlreadyDeclared: true, projectFiles: copied,
  note: 'These initial scaffold bytes require explicit F044 producer, authorization and direct-base validation edits before build.'
}, null, 2) + '\n', { flag: 'wx' });
console.log(`Copied ${projectFiles.length} authored files; no prior binaries, timing, closures or decisions copied.`);
