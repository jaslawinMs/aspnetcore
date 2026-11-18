import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F046');
const [variant] = process.argv.slice(2);
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
assert.equal(inputs.length, 9);
for (const item of inputs) {
  assert.equal(sha(fs.readFileSync(path.join(run, 'harness', item.path))), item.sha256);
}
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item =>
    item.isDirectory() ? files(path.join(directory, item.name)) : [path.join(directory, item.name)]);
}
const original = path.join(run, 'consumer-original');
fs.cpSync(variant === 'Candidate' ? original : path.join(run, 'harness', 'bin', 'Release', 'net12.0'), destination,
  { recursive: true, errorOnExist: true, force: false });
const replacements = [];
const owners = ['Microsoft.AspNetCore.Server.HttpSys', 'Microsoft.AspNetCore.Server.IIS'];
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
  for (const owner of owners) {
    for (const extension of ['dll', 'pdb']) {
      const source = path.join(root, 'artifacts', 'bin', owner, 'Release', 'net12.0', owner + '.' + extension);
      fs.copyFileSync(source, path.join(destination, owner + '.' + extension));
      replacements.push({ path: owner + '.' + extension, source });
    }
  }
}
const sourceFiles = intake.actualSelectedSources.map(item => item.path);
if (variant !== 'Default') {
  sourceFiles.push('src/Servers/HttpSys/test/Tests/HeaderCollectionTests.cs');
}
const pdbOwners = file => {
  if (file === 'src/Shared/HttpSys/RequestProcessing/HeaderCollection.cs' || file === 'src/Shared/ServerInfrastructure/HttpCharacters.cs') {
    return owners;
  }
  if (file === 'src/Servers/HttpSys/src/RequestProcessing/Response.cs') {
    return [owners[0]];
  }
  if (file === 'src/Servers/IIS/IIS/src/Core/IISHttpContext.cs') {
    return [owners[1]];
  }
  if (file === 'src/Http/Http.Abstractions/src/Extensions/HeaderDictionaryExtensions.cs') {
    return ['Microsoft.AspNetCore.Http.Abstractions'];
  }
  return [];
};
const snapshots = path.join(run, 'source-files-' + suffix);
const sourceInputs = sourceFiles.map(file => {
  const bytes = fs.readFileSync(path.join(root, ...file.split('/')));
  const target = path.join(snapshots, ...file.split('/'));
  if (fs.existsSync(target)) {
    assert.equal(sha(fs.readFileSync(target)), sha(bytes), 'Do not replace an earlier physical source snapshot: ' + file);
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes, { flag: 'wx' });
  }
  return { path: file, bytes: bytes.length, sha256: sha(bytes), pdbOwners: pdbOwners(file), pdbDocumentRequired: pdbOwners(file).length > 0 };
});
const sourceManifest = {
  candidate: 'F046', variant, actualPhysicalSourceRoot: root,
  actualMeasuredBuildGitHead: variant === 'Default' ? intake.actualCurrentDefault : intake.baseline,
  actualCandidateSourceUncommittedAtBuild: variant === 'Candidate',
  actualCompleteCompilerProvenanceClaimed: false,
  sourceFiles: sourceInputs
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
    assert.equal(sha(fs.readFileSync(path.join(destination, owner + '.' + extension))),
      sha(fs.readFileSync(path.join(root, 'artifacts', 'bin', owner, 'Release', 'net12.0', owner + '.' + extension))));
  }
}
const manifest = { candidate: 'F046', variant, actualHarnessInputs: inputs, actualReplacements: replacements, files: closure };
fs.writeFileSync(path.join(run, 'closure-' + suffix + '.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
let changed = [];
if (variant === 'Candidate') {
  const before = read(path.join(run, 'closure-original.json')).files;
  assert.deepEqual(closure.map(item => item.path), before.map(item => item.path));
  changed = closure.filter(item => item.sha256 !== before.find(old => old.path === item.path).sha256).map(item => item.path);
  assert.deepEqual(changed, owners.flatMap(owner => [owner + '.dll', owner + '.pdb']).sort());
  for (const name of ['AutoPerf.Benchmarks.dll', 'AutoPerf.Benchmarks.pdb']) {
    assert.equal(sha(fs.readFileSync(path.join(destination, name))), sha(fs.readFileSync(path.join(original, name))));
  }
}
const status = spawnSync('git', ['-c', 'core.longpaths=true', '--no-pager', 'status', '--short'], { cwd: root, encoding: 'utf8' });
assert.equal(status.status, 0);
const receipt = {
  candidate: 'F046', variant, actualFrozenFiles: closure.length, actualSourceInputs: sourceInputs.length,
  actualSourcePePdbDocumentAssociationsRequired: sourceInputs.reduce((sum, item) => sum + item.pdbOwners.length, 0),
  actualSourceOwnerDllPdbCopiesMatchBuiltOutputs: true, actualRuntimeFramework: runtime.framework,
  actualOnlyChangedCandidateConsumerFiles: changed,
  actualIdenticalHarnessDllPdb: variant === 'Candidate' ? true : null,
  actualGitStatusAtFreeze: status.stdout, actualTimingAuthorizationsAtFreeze: 0,
  actualCreated: new Date().toISOString()
};
fs.writeFileSync(path.join(run, 'frozen-' + suffix + '.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt, null, 2));
