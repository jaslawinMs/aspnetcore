import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F047');
const variant = process.argv[2];
assert.ok(['Original', 'Default', 'Candidate'].includes(variant));
const suffix = variant === 'Default' ? 'current-default' : variant.toLowerCase();
const root = variant === 'Default' ? 'C:\\src\\autoperf-F042-default' : 'C:\\src\\aspnetcore';
const destination = path.join(run, 'consumer-' + suffix);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const budget = read(path.join(run, 'diagnostic-budget.json'));
assert.equal(budget.authorized.length, 0);
assert.equal(budget.permanentlyClosed, false);
assert.equal(fs.existsSync(destination), false);
const intake = read(path.join(run, 'intake-completed.json'));
const inputs = read(path.join(run, 'harness-source-hashes.json'));
assert.equal(inputs.length, 8);
for (const input of inputs) {
  assert.equal(sha(fs.readFileSync(path.join(run, 'harness', input.path))), input.sha256);
}
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item =>
    item.isDirectory() ? files(path.join(directory, item.name)) : [path.join(directory, item.name)]);
}
const original = path.join(run, 'consumer-original');
fs.cpSync(variant === 'Candidate' ? original : path.join(run, 'harness', 'bin', 'Release', 'net12.0'), destination,
  { recursive: true, errorOnExist: true, force: false });
const replacements = [];
const owners = ['Microsoft.AspNetCore.Components.Endpoints', 'Microsoft.AspNetCore.Components', 'Microsoft.AspNetCore.Components.Web'];
if (variant === 'Default') {
  for (const target of files(destination).filter(file => /\.(dll|pdb)$/.test(file))) {
    const name = path.basename(target);
    const project = name.replace(/\.(dll|pdb)$/, '');
    const source = path.join(root, 'artifacts', 'bin', project, 'Release', 'net12.0', name);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, target);
      replacements.push({ path: path.relative(destination, target).replaceAll('\\', '/'), source });
    }
  }
}
if (variant === 'Candidate') {
  for (const extension of ['dll', 'pdb']) {
    const name = owners[0] + '.' + extension;
    const source = path.join(root, 'artifacts', 'bin', owners[0], 'Release', 'net12.0', name);
    fs.copyFileSync(source, path.join(destination, name));
    replacements.push({ path: name, source });
  }
}
const sourceInputs = intake.actualSelectedSources.map(item => {
  const relative = item.path;
  const bytes = fs.readFileSync(path.join(root, ...relative.split('/')));
  const target = path.join(run, 'source-files-' + suffix, ...relative.split('/'));
  if (fs.existsSync(target)) {
    assert.equal(sha(fs.readFileSync(target)), sha(bytes), 'Do not replace an earlier physical source snapshot: ' + relative);
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes, { flag: 'wx' });
  }
  const framework = /^(src\/Components\/Endpoints\/src\/Rendering\/|src\/Components\/Shared\/src\/|src\/Components\/Components\/src\/)/.test(relative)
    && relative.endsWith('.cs');
  return { path: relative, bytes: bytes.length, sha256: sha(bytes), pdbDocumentRequired: framework };
});
assert.equal(sourceInputs.length, 19);
assert.equal(sourceInputs.filter(item => item.pdbDocumentRequired).length, 8);
const sourceManifest = {
  candidate: 'F047', variant, actualPhysicalSourceRoot: root,
  actualMeasuredBuildGitHead: variant === 'Default' ? intake.actualCurrentDefault : intake.baseline,
  actualCandidateSourceUncommittedAtBuild: variant === 'Candidate',
  actualCompleteCompilerProvenanceClaimed: false, sourceFiles: sourceInputs
};
fs.writeFileSync(path.join(run, 'source-inputs-' + suffix + '.json'), JSON.stringify(sourceManifest, null, 2) + '\n', { flag: 'wx' });
const closure = files(destination).sort().map(file => {
  const bytes = fs.readFileSync(file);
  return { path: path.relative(destination, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) };
});
const runtime = read(path.join(destination, 'AutoPerf.Benchmarks.runtimeconfig.json')).runtimeOptions;
assert.equal(runtime.framework.name, 'Microsoft.NETCore.App');
assert.equal(runtime.framework.version, '12.0.0-alpha.1.26562.105');
assert.equal(runtime.rollForward, 'Disable');
assert.equal(runtime.frameworks, undefined);
for (const owner of owners) {
  for (const extension of ['dll', 'pdb']) {
    const name = owner + '.' + extension;
    assert.equal(sha(fs.readFileSync(path.join(destination, name))),
      sha(fs.readFileSync(path.join(root, 'artifacts', 'bin', owner, 'Release', 'net12.0', name))));
  }
}
fs.writeFileSync(path.join(run, 'closure-' + suffix + '.json'), JSON.stringify({
  candidate: 'F047', variant, actualHarnessInputs: inputs, actualReplacements: replacements, files: closure
}, null, 2) + '\n', { flag: 'wx' });
let changed = [];
if (variant === 'Candidate') {
  const before = read(path.join(run, 'closure-original.json')).files;
  assert.deepEqual(closure.map(item => item.path), before.map(item => item.path));
  changed = closure.filter(item => item.sha256 !== before.find(old => old.path === item.path).sha256).map(item => item.path);
  assert.deepEqual(changed, [owners[0] + '.dll', owners[0] + '.pdb'].sort());
}
const status = spawnSync('git', ['-c', 'core.longpaths=true', '--no-pager', 'status', '--short'], { cwd: root, encoding: 'utf8' });
assert.equal(status.status, 0);
const receipt = {
  candidate: 'F047', variant, actualFrozenFiles: closure.length, actualSourceInputs: sourceInputs.length,
  actualUniqueSourcePePdbDocumentsRequired: 8, actualSourceOwnerDllPdbCopiesMatchBuiltOutputs: true,
  actualRuntimeFramework: runtime.framework, actualOnlyChangedCandidateConsumerFiles: changed,
  actualIdenticalHarnessDllPdb: variant === 'Candidate' ? true : null,
  actualGitStatusAtFreeze: status.stdout, actualTimingAuthorizationsAtFreeze: 0, actualCreated: new Date().toISOString()
};
fs.writeFileSync(path.join(run, 'frozen-' + suffix + '.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt, null, 2));
