import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(session, 'autoperf-runs', 'F029');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const output = path.join(root, 'live-frozen-closure-audit.json');
assert.ok(!fs.existsSync(output), 'Do not overwrite an actual physical closure audit.');
const checked = new Map();
const bindings = [];
function verify(file, expected, role) {
  const actual = sha(file);
  assert.equal(actual, expected, file);
  const previous = checked.get(file.toLowerCase());
  if (previous) {
    assert.equal(previous.sha256, expected);
  } else {
    checked.set(file.toLowerCase(), { file, sha256: expected, bytes: fs.statSync(file).size });
  }
  bindings.push({ file, sha256: expected, role });
}
for (const label of ['preparation-005', 'reproduction-preparation']) {
  const capsule = read(path.join(root, label, 'prepared', 'capsule.json'));
  const closure = read(capsule.closurePath);
  for (const entry of closure.files) {
    verify(path.join(capsule.output, entry.path), entry.sha256, label + ':consumer');
  }
  for (const entry of capsule.sourceFiles) {
    verify(path.join(path.dirname(capsule.closurePath), entry.path), entry.sha256, label + ':source');
  }
  for (const owner of capsule.actualOriginalOwners) {
    verify(owner.actualProductPath, owner.actualOwnerSha256, label + ':rebuilt-owner');
    verify(owner.actualProductPath.replace(/\.dll$/, '.pdb'), owner.actualOwnerPdbSha256, label + ':rebuilt-owner-pdb');
  }
}
let runtimeBindings = 0;
for (const label of ['characterize-original-004', 'original-diagnostic', 'reproduction-characterized']) {
  const states = path.join(root, 'profiles', label, 'states');
  for (const file of fs.readdirSync(states).filter(name => /-runtime-.+-(before|after)\.json$/.test(name))) {
    for (const entry of read(path.join(states, file)).runtimeAssemblies) {
      verify(entry.path, entry.sha256, label + ':' + file);
      runtimeBindings++;
    }
  }
}
const investigation = read(path.join(root, 'investigation.json'));
for (const entry of investigation.parity.filter(row => row.core)) {
  verify(path.join(String.raw`C:\src\aspnetcore`, entry.file), entry.actualWorkingBytesSha256, 'unchanged-source');
}
const calls = [];
for (const args of [['status', '--porcelain', '--untracked-files=no'], ['rev-parse', 'HEAD'],
  ['branch', '--show-current'], ['diff', '--check']]) {
  const result = spawnSync('git', args, { cwd: String.raw`C:\src\aspnetcore` });
  assert.equal(result.status, 0, String(result.stderr));
  calls.push({ executable: 'git', arguments: args, actualExitCode: result.status, stdout: String(result.stdout).trim() });
}
assert.equal(calls[0].stdout, '');
assert.equal(calls[1].stdout, '37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(calls[2].stdout, 'autoperf/F029-sync-partial-source');
assert.equal(calls[3].stdout, '');
fs.writeFileSync(output, JSON.stringify({
  candidate: 'F029', actualUniquePhysicalFilesRehashed: checked.size, actualBindingsRehashed: bindings.length,
  actualConsumerBindings: 588, actualLoadedRuntimeBindings: runtimeBindings, actualSourceComparisons: 0,
  actualShippingChanges: 0, actualPhysicalFiles: [...checked.values()], actualBindings: bindings,
  actualGitCalls: calls, aPortableRehashOfOmittedNativeFiles: false,
}, null, 2) + '\n');
console.log(`F029:physically rehashed${checked.size}unique files/${bindings.length}bindings,588consumer bindings and${runtimeBindings}loaded assembly bindings;shipping tree unchanged.`);
