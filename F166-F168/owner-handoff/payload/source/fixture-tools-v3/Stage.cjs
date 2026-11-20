'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const payload = __dirname, common = 'C:\\src\\ap-F166-c012';
const roots = { original: 'C:\\src\\ap-F166-o012', default: 'C:\\src\\ap-F166-d012' };
const tests = ['Microsoft.AspNetCore.Components.WebAssembly.Server.Tests', 'Microsoft.AspNetCore.DataProtection.Tests', 'Microsoft.AspNetCore.JsonPatch.Tests'];
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
function union(role) {
  const bin = path.join(roots[role], 'artifacts', 'bin');
  const directories = [...tests.map(name => path.join(bin, name, 'Release', 'net12.0')),
    ...fs.readdirSync(bin, { withFileTypes: true }).filter(entry => entry.isDirectory())
      .map(entry => path.join(bin, entry.name, 'Release', 'net12.0'))].filter(directory => fs.existsSync(directory));
  const files = new Map();
  for (const directory of new Set(directories)) {
    for (const name of fs.readdirSync(directory).filter(name => /\.dll$/i.test(name))) {
      const source = path.join(directory, name), data = fs.readFileSync(source), sha256 = hash(data);
      if (files.has(name)) {
        assert.equal(files.get(name).sha256, sha256, `${role} native top-level name/content collision: ${name}`);
        files.get(name).sources.push(source);
      } else files.set(name, { name, source, sources: [source], bytes: data.length, sha256 });
    }
  }
  return [...files.values()].sort((a, b) => a.name.localeCompare(b.name));
}
function copyImages(files, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const file of files) {
    fs.copyFileSync(file.source, path.join(destination, file.name));
    const pdb = file.source.replace(/\.dll$/i, '.pdb');
    if (fs.existsSync(pdb)) fs.copyFileSync(pdb, path.join(destination, file.name.replace(/\.dll$/i, '.pdb')));
  }
}
const command = process.argv[2];
if (command === 'references') {
  const files = union('original'), destination = path.join(common, 'references');
  copyImages(files, destination);
  fs.writeFileSync(path.join(payload, 'evidence', 'common-reference-inputs.json'), JSON.stringify({
    root: destination, files,
    selection: 'All top-level actual Original net12 native source outputs plus native-test top-level dependency DLL union. Matching PDB copied when present. Duplicate-name hashes checked.',
    fullNativeTreeOrCompilerInputClosureClaim: false
  }, null, 2));
  console.log(JSON.stringify({ operation: command, dlls: files.length, destination }));
} else if (command === 'image') {
  const role = process.argv[3], destination = path.join(common, 'images', role);
  assert(roots[role], 'Known role'); assert(!fs.existsSync(destination), 'Fresh execution image');
  fs.mkdirSync(destination, { recursive: true });
  for (const name of ['PreparationProbe.dll', 'PreparationProbe.pdb', 'PreparationProbe.deps.json', 'PreparationProbe.runtimeconfig.json'])
    fs.copyFileSync(path.join(common, 'bin', name), path.join(destination, name));
  const files = union(role);
  copyImages(files, destination);
  fs.writeFileSync(path.join(payload, 'evidence', `${role}-probe-image-inputs.json`), JSON.stringify({
    role, destination, files, commonFiles: ['PreparationProbe.dll', 'PreparationProbe.pdb', 'PreparationProbe.deps.json', 'PreparationProbe.runtimeconfig.json'],
    executionRuntimeConfig: path.join(roots[role], 'artifacts', 'bin', tests[1], 'Release', 'net12.0', `${tests[1]}.runtimeconfig.json`),
    selection: 'Common fixture compiled once against Original references; each role image uses only that role native output/dependency DLL union plus matching PDBs. Actual native role runtimeconfig is supplied to dotnet exec.',
    fullExecutionClosureAttestation: false
  }, null, 2));
  console.log(JSON.stringify({ operation: command, role, dlls: files.length, destination }));
} else throw new Error('Expected references or image <role>');
