'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = __dirname;
const graphs = JSON.parse(fs.readFileSync(path.join(root, 'graph-creation.json')));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const outputName = 'AutoPerf.Identity.RoleNames';
const compileRoot = path.join(root, 'consumer');
assert(!fs.existsSync(path.join(compileRoot, 'inputs')), 'Do not overwrite compiler input attempt');
fs.mkdirSync(path.join(compileRoot, 'accepted'), { recursive: true });
const records = [];
function input(source, destination, kind) {
  const bytes = fs.readFileSync(source), filename = path.join(compileRoot, 'inputs', destination);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, bytes);
  const selected = path.relative(root, filename).replaceAll('\\', '/');
  records.push({ source, selected, bytes: bytes.length, sha256: sha(bytes), kind });
  return filename;
}
const compilerSource = path.join(root, 'reuse', 'capsule', 'consumer', 'inputs', 'compiler');
for (const name of ['csc.dll', 'csc.deps.json', 'csc.runtimeconfig.json', 'Microsoft.CodeAnalysis.dll', 'Microsoft.CodeAnalysis.CSharp.dll'])
  input(path.join(compilerSource, name), path.join('compiler', name), 'compiler-managed-closure');
const refSource = path.join(root, 'reuse', 'capsule', 'consumer', 'inputs', 'references', 'framework');
const references = fs.readdirSync(refSource).filter(n => n.endsWith('.dll')).sort()
  .map(name => input(path.join(refSource, name), path.join('references', 'framework', name), 'framework-reference'));
const ownerDir = path.join(root, '..', 'images', 'original');
for (const name of [
  'Microsoft.AspNetCore.Identity.InMemory.Test.dll',
  'Microsoft.Extensions.Identity.Core.dll',
  'Microsoft.Extensions.DependencyInjection.dll'
]) references.push(input(path.join(ownerDir, name), path.join('references', 'native-original', name), 'normal-original-reference'));
const source = path.join(compileRoot, 'Program.cs');
records.push({ selected: 'consumer/Program.cs', source, bytes: fs.statSync(source).size, sha256: sha(fs.readFileSync(source)), kind: 'source' });
const args = [
  '/nostdlib+', '/target:exe', '/main:Program', '/langversion:13',
  '/nullable:enable', '/deterministic+', '/optimize+', '/debug:portable', '/preferreduilang:en-US',
  `/out:"${path.join(compileRoot, 'accepted', `${outputName}.dll`)}"`,
  `/pdb:"${path.join(compileRoot, 'accepted', `${outputName}.pdb`)}"`,
  `/pathmap:"${compileRoot}=/_/autoperf-private"`,
  ...references.map(filename => `/reference:"${filename}"`),
  `"${source}"`
];
fs.writeFileSync(path.join(compileRoot, 'compile.rsp'), args.join('\n') + '\n');
const framework = '.NETCoreApp,Version=v12.0', identity = `${outputName}/1.0.0`;
const deps = {
  runtimeTarget: { name: framework, signature: '' },
  compilationOptions: {},
  targets: { [framework]: { [identity]: { runtime: { [`${outputName}.dll`]: {} } } } },
  libraries: { [identity]: { type: 'project', serviceable: false, sha512: '' } }
};
fs.writeFileSync(path.join(compileRoot, 'accepted', `${outputName}.deps.json`), JSON.stringify(deps, null, 2) + '\n');
fs.copyFileSync(path.join(ownerDir, 'Microsoft.AspNetCore.Identity.InMemory.Test.runtimeconfig.json'),
  path.join(compileRoot, 'accepted', `${outputName}.runtimeconfig.json`));
fs.writeFileSync(path.join(compileRoot, 'inputs.json'), JSON.stringify({
  acceptedAttempt: 'v1',
  languageVersion: '13',
  noConfig: true,
  noStandardLibrary: true,
  analyzers: [],
  additionalFiles: [],
  embeddedResources: [],
  compilerInputBoundary: 'All explicit source/response/reference inputs and csc managed compiler/deps/runtimeconfig/CodeAnalysis closure retained. Framework/compiler bytes reused from attributed sealed donor; Original native references from freshly hash-verified full private native image. SDK/native/OS loading not a complete toolchain closure.',
  frameworkReferencesVersion: '12.0.0-alpha.1.26562.105',
  compilerSdkVersion: '12.0.100-alpha.1.26557.102',
  originalNativeDirectory: ownerDir,
  commonRuntimeConfig: 'Original runtime62; each execution explicitly overrides with its actual role native owner runtimeconfig/deps.',
  records
}, null, 2) + '\n');
console.log(JSON.stringify({ records: records.length, referenceCount: references.length, compiler: path.join(compileRoot, 'inputs', 'compiler', 'csc.dll') }));
