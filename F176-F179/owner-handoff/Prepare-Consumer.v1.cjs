'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = __dirname, compileRoot = path.join(root, 'consumer');
const graphs = JSON.parse(fs.readFileSync(path.join(root, 'graph-creation.json')));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const outputName = 'AutoPerf.Mvc.Initialization.Contracts', records = [];
assert(!fs.existsSync(path.join(compileRoot, 'inputs')), 'Do not replace an earlier compiler input history.');
fs.mkdirSync(path.join(compileRoot, 'accepted'), { recursive: true });
function input(source, destination, kind) {
  const bytes = fs.readFileSync(source), target = path.join(compileRoot, 'inputs', destination);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
  records.push({ source, selected: path.relative(root, target).replaceAll('\\', '/'), kind, bytes: bytes.length, sha256: sha(bytes) });
  return target;
}
const compilerSource = path.join(graphs.originalPath, '.dotnet', 'sdk', '12.0.100-alpha.1.26557.102', 'Roslyn', 'bincore');
for (const name of ['csc.dll', 'csc.deps.json', 'csc.runtimeconfig.json', 'Microsoft.CodeAnalysis.dll', 'Microsoft.CodeAnalysis.CSharp.dll'])
  input(path.join(compilerSource, name), path.join('compiler', name), 'compiler-managed-closure');
const frameworkVersion = '12.0.0-alpha.1.26562.105';
const refSource = path.join('C:\\.tools\\.nuget\\packages\\microsoft.netcore.app.ref', frameworkVersion, 'ref', 'net12.0');
const references = fs.readdirSync(refSource).filter(name => name.endsWith('.dll')).sort()
  .map(name => input(path.join(refSource, name), path.join('references', 'framework', name), 'framework-reference'));
const ownerDir = path.join(graphs.originalPath, 'artifacts', 'bin', 'Microsoft.AspNetCore.Mvc.Razor.Test', 'Release', 'net12.0');
const nativeNames = [
  'Microsoft.AspNetCore.Mvc.Core', 'Microsoft.AspNetCore.Mvc.Abstractions', 'Microsoft.AspNetCore.Mvc.Razor',
  'Microsoft.AspNetCore.Mvc.ViewFeatures', 'Microsoft.AspNetCore.Mvc', 'Microsoft.AspNetCore.Components',
  'Microsoft.AspNetCore.Hosting.Abstractions', 'Microsoft.AspNetCore.Http', 'Microsoft.AspNetCore.Http.Abstractions',
  'Microsoft.AspNetCore.Http.Features', 'Microsoft.AspNetCore.Routing', 'Microsoft.AspNetCore.Routing.Abstractions',
  'Microsoft.AspNetCore.Razor', 'Microsoft.AspNetCore.Razor.Runtime', 'Microsoft.AspNetCore.Html.Abstractions',
  'Microsoft.Extensions.DependencyInjection', 'Microsoft.Extensions.DependencyInjection.Abstractions',
  'Microsoft.Extensions.Logging', 'Microsoft.Extensions.Logging.Abstractions', 'Microsoft.Extensions.Options',
  'Microsoft.Extensions.FileProviders.Abstractions', 'Microsoft.Extensions.Hosting.Abstractions'
];
for (const name of nativeNames)
  references.push(input(path.join(ownerDir, name + '.dll'), path.join('references', 'native-original', name + '.dll'), 'normal-original-reference'));
const source = path.join(compileRoot, 'Program.cs');
records.push({ source, selected: 'consumer/Program.cs', kind: 'source', bytes: fs.statSync(source).size, sha256: sha(fs.readFileSync(source)) });
const args = [
  '/nostdlib+', '/target:exe', '/main:Program', '/langversion:13', '/nullable:enable',
  '/deterministic+', '/optimize+', '/debug:portable', '/preferreduilang:en-US',
  `/out:"${path.join(compileRoot, 'accepted', outputName + '.dll')}"`,
  `/pdb:"${path.join(compileRoot, 'accepted', outputName + '.pdb')}"`,
  `/pathmap:"${compileRoot}=/_/autoperf-private"`,
  ...references.map(filename => `/reference:"${filename}"`), `"${source}"`
];
fs.writeFileSync(path.join(compileRoot, 'compile.rsp'), args.join('\n') + '\n');
const framework = '.NETCoreApp,Version=v12.0', identity = outputName + '/1.0.0';
fs.writeFileSync(path.join(compileRoot, 'accepted', outputName + '.deps.json'), JSON.stringify({
  runtimeTarget: { name: framework, signature: '' }, compilationOptions: {},
  targets: { [framework]: { [identity]: { runtime: { [outputName + '.dll']: {} } } } },
  libraries: { [identity]: { type: 'project', serviceable: false, sha512: '' } }
}, null, 2) + '\n');
fs.copyFileSync(path.join(ownerDir, 'Microsoft.AspNetCore.Mvc.Razor.Test.runtimeconfig.json'),
  path.join(compileRoot, 'accepted', outputName + '.runtimeconfig.json'));
fs.writeFileSync(path.join(compileRoot, 'inputs.json'), JSON.stringify({
  acceptedAttempt: 'v1', outputName, languageVersion: '13', noConfig: true, noStandardLibrary: true,
  analyzers: [], additionalFiles: [], embeddedResources: [],
  compilerSdkVersion: '12.0.100-alpha.1.26557.102', frameworkReferencesVersion: frameworkVersion,
  originalNativeDirectory: ownerDir, records,
  compilerInputBoundary: 'All explicit source/response/reference inputs and csc managed compiler/deps/runtimeconfig/CodeAnalysis closure retained. Not the full native compiler-toolchain, SDK, OS or acquisition closure.',
  runtimeCompanions: 'Identical prepared four-file consumer copied to both roles; execution explicitly uses each role own unchanged native Razor test deps/runtimeconfig and normal runtime, not these Original companions.'
}, null, 2) + '\n');
console.log(JSON.stringify({ records: records.length, references: references.length, compiler: path.join(compileRoot, 'inputs', 'compiler', 'csc.dll') }));
