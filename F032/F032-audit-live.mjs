import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(session, 'autoperf-runs', 'F032');
const repository = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const output = path.join(root, 'live-frozen-closure-audit.json');
assert.equal(fs.existsSync(output), false, 'Do not overwrite a physical closure audit.');
assert.equal(read(path.join(root, 'measurement-budget.json')).sourceComparisonBudgetClosed, true);
assert.equal(read(path.join(root, 'decision.json')).disposition, 'no-gain');
const audit = read(path.join(root, 'measurement-audit.json'));
const checked = new Map(), bindings = [];
function verify(file, expected, role) {
  const key = file.toLowerCase();
  let actual = checked.get(key);
  if (!actual) {
    actual = { file, sha256: sha(file), bytes: fs.statSync(file).size };
    checked.set(key, actual);
  }
  assert.equal(actual.sha256, expected, file);
  bindings.push({ file, sha256: expected, role });
}
let consumerBindings = 0;
for (const label of audit.actualPreparationLabels) {
  const capsule = read(path.join(root, label, 'prepared', 'capsule.json'));
  const closure = read(capsule.closurePath);
  assert.equal(fs.readdirSync(capsule.output, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile()).length, closure.files.length);
  for (const entry of closure.files) {
    verify(path.join(capsule.output, entry.path), entry.sha256, label + ':consumer');
    consumerBindings++;
  }
  for (const entry of capsule.sourceFiles) {
    verify(path.join(path.dirname(capsule.closurePath), entry.path), entry.sha256, label + ':source');
  }
  for (const owner of capsule.actualTestedOwners) {
    verify(path.join(capsule.output, owner.assembly + '.dll'), owner.actualOwnerSha256, label + ':matching-frozen-tested-owner');
    verify(path.join(capsule.output, owner.assembly + '.pdb'), owner.actualOwnerPdbSha256, label + ':matching-frozen-tested-owner-pdb');
  }
}
let runtimeBindings = 0;
for (const label of fs.readdirSync(path.join(root, 'profiles'))) {
  const states = path.join(root, 'profiles', label, 'states');
  for (const file of fs.readdirSync(states).filter(name => name.includes('-runtime-') && name.endsWith('.json'))) {
    for (const entry of read(path.join(states, file)).runtimeAssemblies) {
      verify(entry.path, entry.sha256, label + ':' + file);
      runtimeBindings++;
    }
  }
}
assert.equal(runtimeBindings, audit.actualRecordedLoadedAssemblyBindings);
const original = read(path.join(root, 'validation', 'original-existing-1', 'verified-result.json'));
for (const owner of original.actualOwners) {
  verify(owner.actualProductPath, owner.actualOwnerSha256, 'current-restored-original-product');
  verify(owner.actualProductPath.replace(/\.dll$/, '.pdb'), owner.actualOwnerPdbSha256, 'current-restored-original-product-pdb');
}
const investigation = read(path.join(root, 'investigation.json'));
for (const entry of investigation.parity.filter(row => row.core)) {
  verify(path.join(repository, entry.file), entry.actualWorkingBytesSha256, 'restored-unchanged-source');
}
const calls = [];
for (const args of [['status', '--porcelain', '--untracked-files=no'], ['rev-parse', 'HEAD'],
  ['branch', '--show-current'], ['diff', '--check']]) {
  const result = spawnSync('git', args, { cwd: repository });
  assert.equal(result.status, 0, String(result.stderr));
  calls.push({ executable: 'git', arguments: args, actualExitCode: result.status, stdout: String(result.stdout).trim() });
}
assert.equal(calls[0].stdout, '');
assert.equal(calls[1].stdout, '37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(calls[2].stdout, 'autoperf/F032-httpsys-flush-start');
assert.equal(calls[3].stdout, '');
assert.equal(consumerBindings, 1116);
fs.writeFileSync(output, JSON.stringify({
  candidate: 'F032', actualUniquePhysicalFilesRehashed: checked.size, actualBindingsRehashed: bindings.length,
  actualConsumerBindings: consumerBindings, actualLoadedRuntimeBindings: runtimeBindings,
  actualSourceComparisonAttempts: 3, actualCompletedSourceComparisonPairs: 2, actualFailedSetupAttemptsRetained: 1,
  actualShippingChanges: 0, actualPhysicalFiles: [...checked.values()], actualBindings: bindings,
  actualGitCalls: calls, aPortableRehashOfOmittedNativeFiles: false,
  historicalProductPathsNotAssumedToHoldBothVariantHashes: true,
  variantOwnerBytesRehashedInTheirMatchingFrozenConsumers: true,
}, null, 2) + '\n');
console.log(`F032:physically rehashed${checked.size}unique files/${bindings.length}bindings,${consumerBindings}consumer and${runtimeBindings}loaded assembly bindings;original source/product restored.`);
