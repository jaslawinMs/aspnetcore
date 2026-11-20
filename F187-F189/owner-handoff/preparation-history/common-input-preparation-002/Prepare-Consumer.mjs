import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parsePe } from './evidence.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const consumer = path.join(root, 'testassets', 'PreparationConsumer');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const json = filename => JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, ''));
const outputName = 'AutoPerf.Mvc.HelperPreparation';
const sdkVersion = '12.0.100-alpha.1.26557.102';
const roles = [
  { role: 'original', checkout: 'C:\\src\\ap-F187-o038' },
  { role: 'default', checkout: 'C:\\src\\ap-F187-d038' }
];
const nativePath = (checkout, name) => path.join(checkout, 'artifacts', 'bin', name, 'Release', 'net12.0');
const runtimeName = 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test';
const functionalName = 'Microsoft.AspNetCore.Mvc.FunctionalTests';
const inputRecords = [];
const referenceChoices = [];
const copy = (origin, destination, kind) => {
  const bytes = fs.readFileSync(origin);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (fs.existsSync(destination)) throw Error(`Refusing existing preparation output: ${destination}`);
  fs.writeFileSync(destination, bytes);
  const record = {
    kind, origin, path: path.relative(root, destination).replaceAll('\\', '/'),
    bytes: bytes.length, sha256: sha(bytes)
  };
  if (/\.(dll|exe)$/i.test(origin)) record.pe = parsePe(bytes);
  inputRecords.push(record);
  return record;
};
const compilerOrigin = path.join(roles[0].checkout, '.dotnet', 'sdk', sdkVersion, 'Roslyn', 'bincore');
for (const name of ['csc.dll', 'csc.deps.json', 'csc.runtimeconfig.json', 'Microsoft.CodeAnalysis.dll', 'Microsoft.CodeAnalysis.CSharp.dll']) {
  copy(path.join(compilerOrigin, name), path.join(consumer, 'inputs', 'compiler', name), 'explicit-managed-compiler-input');
}
const refOrigin = path.join(roles[0].checkout, '.dotnet', 'packs', 'Microsoft.NETCore.App.Ref', '12.0.0-alpha.1.26557.102', 'ref', 'net12.0');
const references = [];
for (const name of fs.readdirSync(refOrigin).filter(name => name.endsWith('.dll')).sort()) {
  const destination = path.join(consumer, 'inputs', 'framework', name);
  copy(path.join(refOrigin, name), destination, 'SDK57-BCL-reference-not-assertion-runtime');
  references.push(destination);
}
const required = [
  'Microsoft.AspNetCore.Mvc.Views.TestCommon.dll',
  'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.dll',
  'Microsoft.AspNetCore.Mvc.Razor.dll',
  'Microsoft.AspNetCore.Mvc.ViewFeatures.dll',
  'Microsoft.AspNetCore.Mvc.Core.dll',
  'Microsoft.AspNetCore.Mvc.Abstractions.dll',
  'Microsoft.AspNetCore.Mvc.dll',
  'Microsoft.AspNetCore.Razor.Runtime.dll',
  'Microsoft.AspNetCore.Hosting.Abstractions.dll',
  'Microsoft.AspNetCore.Hosting.dll',
  'Microsoft.AspNetCore.Http.Abstractions.dll',
  'Microsoft.AspNetCore.Http.Features.dll',
  'Microsoft.AspNetCore.Http.dll',
  'Microsoft.AspNetCore.Routing.Abstractions.dll',
  'Microsoft.AspNetCore.Routing.dll',
  'Microsoft.AspNetCore.TestHost.dll',
  'Microsoft.AspNetCore.Mvc.Testing.dll',
  'Microsoft.AspNetCore.Mvc.FunctionalTests.dll',
  'ControllersFromServicesClassLibrary.dll',
  'ControllersFromServicesWebSite.dll',
  'Microsoft.Extensions.DependencyInjection.Abstractions.dll',
  'Microsoft.Extensions.DependencyInjection.dll',
  'Microsoft.Extensions.Hosting.Abstractions.dll',
  'Microsoft.Extensions.Logging.Abstractions.dll',
  'Microsoft.Extensions.Logging.dll',
  'Microsoft.Extensions.Options.dll',
  'Microsoft.Extensions.FileProviders.Abstractions.dll',
  'Microsoft.Extensions.Primitives.dll',
  'Microsoft.Extensions.Caching.Abstractions.dll',
  'Microsoft.Extensions.Caching.Memory.dll',
  'Microsoft.AspNetCore.Razor.Language.dll',
  'Moq.dll'
];
const originalDirectories = [nativePath(roles[0].checkout, functionalName), nativePath(roles[0].checkout, runtimeName)];
for (const name of required) {
  const candidates = originalDirectories.map(directory => path.join(directory, name)).filter(filename => fs.existsSync(filename));
  if (!candidates.length) throw Error(`Actual normal reference absent: ${name}`);
  const hashes = [...new Set(candidates.map(filename => sha(fs.readFileSync(filename))))];
  referenceChoices.push({
    name,
    selected: candidates[0],
    candidates: candidates.map(filename => ({ path: filename, sha256: sha(fs.readFileSync(filename)) })),
    byteDifferentOverlap: hashes.length !== 1,
    policy: 'Successful native Functional graph is explicit primary. The earlier native RuntimeCompilation cohort is retained independently, never equated by source pin alone.'
  });
  const destination = path.join(consumer, 'inputs', 'owners', name);
  copy(candidates[0], destination, 'actual-Original-native-reference');
  references.push(destination);
}
const bin = path.join(consumer, 'bin');
fs.mkdirSync(bin, { recursive: true });
const source = path.join(consumer, 'Program.cs');
const response = [
  '/noconfig', '/nostdlib+', '/target:exe', '/langversion:13', '/nullable:enable',
  '/deterministic+', '/optimize+', '/debug:portable', '/nowarn:ASPDEPR003',
  `/out:"${path.join(bin, outputName + '.dll')}"`,
  `/pdb:"${path.join(bin, outputName + '.pdb')}"`,
  `/pathmap:"${consumer}=/_/testassets/PreparationConsumer"`,
  ...references.map(filename => `/reference:"${filename}"`),
  `"${source}"`
].join('\r\n') + '\r\n';
fs.writeFileSync(path.join(consumer, 'compile.rsp'), response);
const originalRuntimeConfig = path.join(originalDirectories[0], functionalName + '.runtimeconfig.json');
fs.copyFileSync(originalRuntimeConfig, path.join(bin, outputName + '.runtimeconfig.json'));
fs.writeFileSync(path.join(bin, outputName + '.deps.json'), JSON.stringify({
  runtimeTarget: { name: '.NETCoreApp,Version=v12.0', signature: '' },
  compilationOptions: {},
  targets: { '.NETCoreApp,Version=v12.0': { [outputName + '/1.0.0']: { runtime: { [outputName + '.dll']: {} } } } },
  libraries: { [outputName + '/1.0.0']: { type: 'project', serviceable: false, sha512: '' } }
}, null, 2) + '\n');
const result = {
  sdkVersion,
  languageVersion: '13',
  noAnalyzersOrAdditionalFilesOrResources: true,
  compilationInvoked: false,
  inputRecords,
  referenceChoices,
  source: { path: path.relative(root, source).replaceAll('\\', '/'), sha256: sha(fs.readFileSync(source)), bytes: fs.statSync(source).size },
  response: { path: path.relative(root, path.join(consumer, 'compile.rsp')).replaceAll('\\', '/'), sha256: sha(Buffer.from(response)), arguments: response.split('\r\n').filter(Boolean) },
  frameworkReferences: references.length - required.length,
  ownerReferences: required.length,
  boundary: 'Explicit common managed compiler inputs, SDK57 BCL references and actual Original native implementation references retained. Not the complete SDK/compiler/runtime/OS closure. Common companion configs are retained identically; actual executions override them with explicit same-role native union deps/runtimeconfig.'
};
fs.writeFileSync(path.join(root, 'research', 'consumer-inputs.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ result: 'PASS', frameworkReferences: result.frameworkReferences, ownerReferences: required.length, compilerInputs: 5, compilationInvoked: false }));
