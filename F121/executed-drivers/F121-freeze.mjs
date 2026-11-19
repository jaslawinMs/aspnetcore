import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F121');
const variant = process.argv[2];
assert.ok(['Original', 'Default', 'Candidate'].includes(variant));
const suffix = variant === 'Default' ? 'current-default' : variant.toLowerCase();
const root = variant === 'Default' ? 'C:\\src\\autoperf-F042-default' : 'C:\\src\\aspnetcore';
const destination = path.join(run, 'consumer-' + suffix);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const hash = file => sha(fs.readFileSync(file));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const budget = read(path.join(run, 'diagnostic-budget.json'));
assert.equal(budget.authorized.length, 0);
assert.equal(budget.permanentlyClosed, false);
assert.equal(fs.existsSync(destination), false);
const intake = read(path.join(run, 'intake-completed.json'));
function git(args) {
  const result = spawnSync('git', ['-c', 'core.longpaths=true', '--no-pager', ...args],
    { cwd: root, encoding: 'utf8', windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
assert.equal(git(['rev-parse', 'HEAD']), variant === 'Default' ? intake.actualCurrentDefault : intake.actualBaseline);
if (variant !== 'Default') {
  for (const file of intake.actualProtectedPrimaryInputs) assert.equal(hash(path.join(root, ...file.path.split('/'))), file.sha256);
}
if (variant !== 'Candidate') assert.equal(git(['diff', '--name-only']), '', 'No tracked shipping edit before baseline freeze.');
const harnessDirectory = path.join(run, 'harness');
const currentInputs = fs.readdirSync(harnessDirectory).filter(file => /\.(cs|csproj)$/.test(file)).sort().map(file => ({
  path: file, bytes: fs.statSync(path.join(harnessDirectory, file)).size, sha256: hash(path.join(harnessDirectory, file))
}));
assert.equal(currentInputs.length, 8);
assert.equal(hash(path.join(harnessDirectory, 'SettingsPreservingEmitToolchain.cs')),
  hash(path.join(session, 'autoperf-runs', 'F047', 'harness', 'SettingsPreservingEmitToolchain.cs')));
const inputsPath = path.join(run, 'harness-source-hashes.json');
if (!fs.existsSync(inputsPath)) write(inputsPath, currentInputs);
const inputs = read(inputsPath);
assert.deepEqual(currentInputs, inputs);
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    assert.equal(item.isSymbolicLink(), false);
    return item.isDirectory() ? files(path.join(directory, item.name)) : [path.join(directory, item.name)];
  });
}
const original = path.join(run, 'consumer-original');
fs.cpSync(variant === 'Candidate' ? original : path.join(harnessDirectory, 'bin', 'Release', 'net12.0'), destination,
  { recursive: true, errorOnExist: true, force: false });
const replacements = [];
const owners = ['Microsoft.AspNetCore.Mvc.Core', 'Microsoft.AspNetCore.Mvc.RazorPages', 'Microsoft.AspNetCore.TestHost'];
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
const sourceInputs = intake.actualSelectedInputs.map(item => {
  const relative = item.path;
  const bytes = fs.readFileSync(path.join(root, ...relative.split('/')));
  const target = path.join(run, 'source-files-' + suffix, ...relative.split('/'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes, { flag: 'wx' });
  const framework = /^src\/Mvc\/(Mvc.Core|Mvc.RazorPages)\/src\//.test(relative) && relative.endsWith('.cs');

  return { path: relative, bytes: bytes.length, sha256: sha(bytes), pdbDocumentRequired: framework };
});
assert.equal(sourceInputs.length, 10);
assert.equal(sourceInputs.filter(item => item.pdbDocumentRequired).length, 6);
write(path.join(run, 'source-inputs-' + suffix + '.json'), {
  candidate: 'F121', variant, actualPhysicalSourceRoot: root,
  actualMeasuredBuildGitHead: variant === 'Default' ? intake.actualCurrentDefault : intake.actualBaseline,
  actualCandidateSourceUncommittedAtBuild: variant === 'Candidate',
  actualCompleteCompilerProvenanceClaimed: false, sourceFiles: sourceInputs
});
const closure = files(destination).sort().map(file => ({
  path: path.relative(destination, file).replaceAll('\\', '/'), bytes: fs.statSync(file).size, sha256: hash(file)
}));
const runtime = read(path.join(destination, 'AutoPerf.Benchmarks.runtimeconfig.json')).runtimeOptions;
assert.equal(runtime.framework.name, 'Microsoft.NETCore.App');
assert.equal(runtime.framework.version, '12.0.0-alpha.1.26562.105');
assert.equal(runtime.rollForward, 'Disable');
assert.equal(runtime.frameworks, undefined);
for (const owner of owners) {
  for (const extension of ['dll', 'pdb']) {
    const name = owner + '.' + extension;
    assert.equal(hash(path.join(destination, name)), hash(path.join(root, 'artifacts', 'bin', owner, 'Release', 'net12.0', name)));
  }
}
write(path.join(run, 'closure-' + suffix + '.json'), {
  candidate: 'F121', variant, actualHarnessInputs: inputs, actualReplacements: replacements, files: closure
});
let changed = [];
if (variant === 'Candidate') {
  const before = read(path.join(run, 'closure-original.json')).files;
  assert.deepEqual(closure.map(item => item.path), before.map(item => item.path));
  changed = closure.filter(item => item.sha256 !== before.find(old => old.path === item.path).sha256).map(item => item.path);
  assert.deepEqual(changed, [owners[0] + '.dll', owners[0] + '.pdb'].sort());
}
const receipt = {
  candidate: 'F121', variant, actualFrozenFiles: closure.length, actualSourceInputs: sourceInputs.length,
  actualUniqueSourcePePdbDocumentsRequired: 6, actualSourceOwnerDllPdbCopiesMatchBuiltOutputs: true,
  actualRuntimeFramework: runtime.framework, actualOnlyChangedCandidateConsumerFiles: changed,
  actualIdenticalHarnessDllPdb: variant === 'Candidate' ? true : null,
  actualGitStatusAtFreeze: git(['status', '--short']), actualTimingAuthorizationsAtFreeze: 0,
  actualCreated: new Date().toISOString()
};
write(path.join(run, 'frozen-' + suffix + '.json'), receipt);
console.log(JSON.stringify(receipt, null, 2));
