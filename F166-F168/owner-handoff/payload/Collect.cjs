'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), zlib = require('node:zlib');
const assert = require('node:assert/strict'), { execFileSync } = require('node:child_process');
const metadata = require('./Metadata.cjs');
const root = __dirname, common = 'C:\\src\\ap-F166-c012';
const roles = {
  original: { checkout: 'C:\\src\\ap-F166-o012', pin: '37e809ead5824bc753a1c3d56f11615bdb1296c5' },
  default: { checkout: 'C:\\src\\ap-F166-d012', pin: '90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d' }
};
const read = file => fs.readFileSync(file);
const hash = (data, algorithm = 'sha256') => crypto.createHash(algorithm).update(data).digest('hex').toUpperCase();
const json = file => JSON.parse(read(file).toString('utf8').replace(/^\uFEFF/, ''));
const full = relative => path.join(root, ...relative.split(/[\\/]/));
const sort = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const git = (checkout, args) => execFileSync('git', ['-C', checkout, ...args], { windowsHide: true });
function write(relative, data) {
  const file = full(relative), bytes = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) assert(read(file).equals(bytes), `Refusing to overwrite differing collected bytes: ${relative}`);
  else fs.writeFileSync(file, bytes);
  return relative;
}
const writeJson = (relative, value) => write(relative, JSON.stringify(value, null, 2));
const copy = (source, relative) => write(relative, read(source));
if (fs.existsSync(full('MANIFEST.json'))) throw new Error('Already sealed');
if (fs.existsSync(full('evidence\\source-map.json'))) throw new Error('Collection already completed');
const targetPaths = [
  'src\\Components\\WebAssembly\\Server\\src\\ComponentsWebAssemblyApplicationBuilderExtensions.cs',
  'src\\DataProtection\\DataProtection\\src\\KeyManagement\\KeyRing.cs',
  'src\\Features\\JsonPatch\\test\\WriteOnceDynamicTestObject.cs'
];
const f166 = [
  targetPaths[0], 'src\\Components\\WebAssembly\\Server\\src\\ContentEncodingNegotiator.cs',
  'src\\Components\\WebAssembly\\Server\\test\\ContentEncodingNegotiatorTests.cs',
  'src\\Middleware\\StaticFiles\\src\\FileExtensionContentTypeProvider.cs',
  'src\\Middleware\\StaticFiles\\src\\StaticFileMiddleware.cs', 'src\\Middleware\\StaticFiles\\src\\StaticFileContext.cs',
  'src\\Components\\WebAssembly\\Server\\src\\Microsoft.AspNetCore.Components.WebAssembly.Server.csproj',
  'src\\Components\\WebAssembly\\Server\\test\\Microsoft.AspNetCore.Components.WebAssembly.Server.Tests.csproj'
];
const f167 = [
  targetPaths[1], 'src\\DataProtection\\DataProtection\\src\\KeyManagement\\Internal\\CacheableKeyRing.cs',
  'src\\DataProtection\\DataProtection\\src\\KeyManagement\\KeyRingProvider.cs',
  'src\\DataProtection\\DataProtection\\src\\KeyManagement\\KeyRingBasedDataProtector.cs',
  'src\\DataProtection\\DataProtection\\src\\KeyManagement\\KeyManagementOptions.cs',
  'src\\DataProtection\\DataProtection\\src\\KeyManagement\\IKey.cs',
  'src\\DataProtection\\DataProtection\\src\\KeyManagement\\IKeyManager.cs',
  'src\\DataProtection\\DataProtection\\src\\KeyManagement\\Key.cs',
  'src\\DataProtection\\DataProtection\\src\\KeyManagement\\XmlKeyManager.cs',
  'src\\DataProtection\\DataProtection\\src\\Repositories\\FileSystemXmlRepository.cs',
  'src\\DataProtection\\DataProtection\\test\\Microsoft.AspNetCore.DataProtection.Tests\\KeyManagement\\KeyRingTests.cs',
  'src\\DataProtection\\DataProtection\\test\\Microsoft.AspNetCore.DataProtection.Tests\\KeyManagement\\CacheableKeyRingTests.cs',
  'src\\DataProtection\\DataProtection\\test\\Microsoft.AspNetCore.DataProtection.Tests\\KeyManagement\\KeyRingProviderTests.cs',
  'src\\DataProtection\\DataProtection\\src\\Microsoft.AspNetCore.DataProtection.csproj',
  'src\\DataProtection\\DataProtection\\test\\Microsoft.AspNetCore.DataProtection.Tests\\Microsoft.AspNetCore.DataProtection.Tests.csproj'
];
const f168 = [
  targetPaths[2], 'src\\Features\\JsonPatch\\test\\TestObjectModels\\DynamicTestObject.cs',
  'src\\Features\\JsonPatch\\test\\Internal\\DynamicObjectAdapterTest.cs',
  'src\\Features\\JsonPatch\\src\\Internal\\DynamicObjectAdapter.cs',
  'src\\Features\\JsonPatch\\src\\Internal\\ObjectVisitor.cs',
  'src\\Features\\JsonPatch\\src\\Adapters\\AdapterFactory.cs',
  'src\\Features\\JsonPatch\\src\\Adapters\\ObjectAdapter.cs',
  'src\\Features\\JsonPatch\\src\\Operations\\Operation.cs',
  'src\\Features\\JsonPatch\\src\\JsonPatchDocument.cs',
  'src\\Features\\JsonPatch\\src\\Microsoft.AspNetCore.JsonPatch.csproj',
  'src\\Features\\JsonPatch\\test\\Microsoft.AspNetCore.JsonPatch.Tests.csproj'
];
const configuration = ['global.json', 'eng\\Versions.props', 'Directory.Build.props', 'Directory.Build.targets',
  'docs\\BuildFromSource.md', 'docs\\BuildErrors.md'];
for (const data of Object.values(roles))
  for (const relative of [...f166, ...f167, ...f168, ...configuration])
    assert(fs.existsSync(path.join(data.checkout, relative)), `Actual source path exists: ${relative}`);
const sourceMap = [], snapshots = {};
function source(role, relative) {
  const data = roles[role], sourceFile = path.join(data.checkout, relative), raw = read(sourceFile);
  const snapshot = copy(sourceFile, `source\\${role}\\${relative}`);
  const lf = Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  const blob = git(data.checkout, ['rev-parse', `${data.pin}:${relative.replaceAll('\\', '/')}`]).toString('utf8').trim();
  const gitBytes = git(data.checkout, ['cat-file', 'blob', blob]);
  const objectHash = hash(Buffer.concat([Buffer.from(`blob ${gitBytes.length}\0`), gitBytes]), 'sha1').toLowerCase();
  assert.equal(objectHash, blob, `Actual Git object bytes: ${relative}`);
  assert(gitBytes.equals(lf), `Actual Git blob/LF bytes differ: ${relative}`);
  const gitSnapshot = targetPaths.includes(relative) ? write(`source\\git-lf\\${role}\\${relative}`, gitBytes) : null;
  const item = { role, pin: data.pin, path: relative, snapshot, rawBytes: raw.length, rawSha256: hash(raw),
    lfBytes: lf.length, lfSha256: hash(lf), gitBlob: blob, gitBlobBytes: gitBytes.length, gitBlobSha256: hash(gitBytes),
    canonicalLfGitObjectSha1: objectHash, gitSnapshot, crlfPairs: raw.toString('utf8').split('\r\n').length - 1,
    fullPhysicalSourceOrCompilerInputAttestation: false };
  sourceMap.push(item);
  return snapshot;
}
for (const [role, data] of Object.entries(roles)) {
  assert.equal(git(data.checkout, ['rev-parse', 'HEAD']).toString('utf8').trim(), data.pin);
  assert.equal(git(data.checkout, ['status', '--porcelain=v1']).toString('utf8'), '', 'Unmodified native checkout');
  assert(!fs.existsSync(path.join(data.checkout, '.git', 'objects', 'info', 'alternates')), 'Independent clone object store');
  snapshots[role] = {};
  for (const relative of [...new Set([...f166, ...f167, ...f168, ...configuration])])
    snapshots[role][relative] = source(role, relative);
}
const guidancePaths = ['.github\\instructions\\cross-cutting-guidance.instructions.md', '.github\\instructions\\build.instructions.md',
  '.github\\instructions\\components.instructions.md', '.github\\instructions\\components.server.instructions.md',
  'src\\Components\\AGENTS.md', 'docs\\CrossCuttingGuidance.md', 'docs\\BlazorComponentsGuidance.md'];
const guidance = guidancePaths.map(relative => ({ path: relative, snapshot: copy(path.join('C:\\src\\aspnetcore', relative), `guidance\\${relative}`),
  provenance: 'Instructions/docs read from unchanged coordinator checkout; not labeled as either immutable source pin.' }));
const pairs = [], managedImages = [], nativeImages = [], references = [];
function pair(id, base, associations) {
  const selectedDll = copy(base + '.dll', `selected\\${id}\\${path.basename(base)}.dll`);
  const selectedPdb = copy(base + '.pdb', `selected\\${id}\\${path.basename(base)}.pdb`);
  const p = metadata.pe(read(base + '.dll')), pdb = metadata.portablePdb(read(base + '.pdb'));
  assert(p.codeviews.some(value => value.guid === pdb.guid && value.stamp === pdb.stamp && value.age === 1), `PE/portable PDB ID: ${id}`);
  const selectedSources = associations.map(item => {
    const suffix = item.suffix.replaceAll('\\', '/').toLowerCase();
    const matches = pdb.documents.filter(document => document.name.replaceAll('\\', '/').toLowerCase().endsWith(suffix));
    assert.equal(matches.length, 1, `Unique raw PDB document: ${id}/${suffix}`);
    const document = matches[0], algorithms = { '8829d00f-11b8-4213-878b-770e8597ac16': 'sha256', 'ff1816ec-aa5e-4d10-87f7-6f4963833460': 'sha1' };
    assert(algorithms[document.algorithm], 'Supported raw document checksum');
    assert.equal(hash(read(full(item.snapshot)), algorithms[document.algorithm]), document.checksum, `Raw source checksum: ${id}/${suffix}`);
    return { snapshot: item.snapshot, document };
  });
  pairs.push({ id, selectedDll, selectedPdb, peSha256: hash(read(base + '.dll')), pdbSha256: hash(read(base + '.pdb')),
    mvid: p.mvid, codeviews: p.codeviews, pdbGuid: pdb.guid, pdbStamp: pdb.stamp,
    documents: pdb.documents, selectedSources, fullCompilerInputOrExecutionClosureAttestation: false });
  return selectedDll;
}
const projects = { f166: 'Microsoft.AspNetCore.Components.WebAssembly.Server.Tests', f167: 'Microsoft.AspNetCore.DataProtection.Tests', f168: 'Microsoft.AspNetCore.JsonPatch.Tests' };
const nativeInputs = [];
for (const [role, data] of Object.entries(roles)) {
  const bin = path.join(data.checkout, 'artifacts', 'bin');
  const associations = relatives => relatives.map(relative => ({ suffix: relative, snapshot: snapshots[role][relative] }));
  pair(`${role}-f166-owner`, path.join(bin, 'Microsoft.AspNetCore.Components.WebAssembly.Server', 'Release', 'net12.0', 'Microsoft.AspNetCore.Components.WebAssembly.Server'),
    associations(f166.slice(0, 2)));
  pair(`${role}-staticfiles-owner`, path.join(bin, 'Microsoft.AspNetCore.StaticFiles', 'Release', 'net12.0', 'Microsoft.AspNetCore.StaticFiles'),
    associations(f166.slice(3, 6)));
  for (const tfm of ['net12.0', 'net462', 'netstandard2.0'])
    pair(`${role}-f167-owner-${tfm}`, path.join(bin, 'Microsoft.AspNetCore.DataProtection', 'Release', tfm, 'Microsoft.AspNetCore.DataProtection'),
      associations(tfm === 'net12.0' ? [f167[0], f167[1], f167[2], f167[3], f167[7], f167[8], f167[9]] : [f167[0]]));
  pair(`${role}-f168-owner`, path.join(bin, 'Microsoft.AspNetCore.JsonPatch', 'Release', 'net12.0', 'Microsoft.AspNetCore.JsonPatch'),
    associations(f168.slice(3, 9)));
  for (const [finding, project] of Object.entries(projects)) {
    const base = path.join(bin, project, 'Release', 'net12.0', project);
    const relatives = finding === 'f166' ? [f166[2]] : finding === 'f167' ? f167.slice(10, 13) : f168.slice(0, 3);
    pair(`${role}-${finding}-native-tests`, base, associations(relatives));
    const copied = [];
    for (const extension of ['.deps.json', '.runtimeconfig.json', '.runtimeconfig.dev.json', '.dll.config', '.exe.config'])
      if (fs.existsSync(base + extension)) copied.push(copy(base + extension, `selected\\${role}-${finding}-native-tests\\${project}${extension}`));
    const obj = path.join(data.checkout, 'artifacts', 'obj', project);
    const assets = copy(path.join(obj, 'project.assets.json'), `evidence\\restore\\${role}\\${project}.assets.json`);
    const spec = path.join(obj, `${project}.csproj.nuget.dgspec.json`);
    const dgspec = fs.existsSync(spec) ? copy(spec, `evidence\\restore\\${role}\\${project}.dgspec.json`) : null;
    nativeInputs.push({ role, finding, project, tfm: 'net12.0', selectedConfiguration: copied, assets, dgspec });
  }
  const project = projects.f167, base = path.join(bin, project, 'Release', 'net472', project);
  pair(`${role}-f167-net472-native-tests`, base, associations(f167.slice(10, 13)));
  const config = ['.deps.json', '.runtimeconfig.json', '.runtimeconfig.dev.json', '.dll.config', '.exe.config']
    .filter(extension => fs.existsSync(base + extension))
    .map(extension => copy(base + extension, `selected\\${role}-f167-net472-native-tests\\${project}${extension}`));
  nativeInputs.push({ role, finding: 'f167', project, tfm: 'net472', productTfm: 'net462', selectedConfiguration: config });
}
pair('common-v3-runtime-failed', path.join(common, 'bin', 'PreparationProbe'),
  [{ suffix: 'fixture\\Program.cs', snapshot: 'fixture\\successful-v3-runtime-failed\\Program.cs' }]);
pair('common-v4-accepted', path.join(common, 'bin-v4', 'PreparationProbe'),
  [{ suffix: 'fixture\\Program.cs', snapshot: 'fixture\\Program.cs' }]);
for (const version of ['v3', 'v4']) {
  const base = path.join(common, version === 'v3' ? 'bin' : 'bin-v4');
  for (const name of ['PreparationProbe.deps.json', 'PreparationProbe.runtimeconfig.json'])
    copy(path.join(base, name), `selected\\common-${version === 'v3' ? 'v3-runtime-failed' : 'v4-accepted'}\\${name}`);
}
const referenceRequests = [
  ['original', 'net462', 'original-f167-net462-reference-paths', /\\mscorlib\.dll$/i],
  ['original', 'netstandard2.0', 'original-f167-netstandard2.0-reference-paths', /\\netstandard\.dll$/i],
  ['original', 'net12.0', 'original-f167-net12.0-reference-paths', /\\System\.Collections\.dll$/i],
  ['default', 'net12.0', 'default-f167-net12-reference-paths', /\\System\.Collections\.dll$/i],
  ['common', 'net12.0', 'common-v4-reference-paths', /\\System\.Collections\.dll$/i]
];
for (const [role, tfm, label, pattern] of referenceRequests) {
  const resolution = json(full(`evidence\\${label}.stdout.txt`));
  const entries = resolution.Items.ReferencePath.filter(entry => pattern.test(entry.Identity));
  assert.equal(entries.length, 1, `Actual resolved reference selection: ${label}`);
  const source = entries[0].Identity, selected = copy(source, `selected\\reference-${role}-${tfm}\\${path.basename(source)}`);
  const data = read(source), p = metadata.pe(data), dictionaryMethods = metadata.typeMethods(data, 'System.Collections.Generic', 'Dictionary`2');
  references.push({ role, tfm, observedResolutionLabel: label, properties: resolution.Properties,
    source, selected, bytes: data.length, sha256: hash(data), mvid: p.mvid, codeviews: p.codeviews,
    dictionaryMethods, dictionaryTryAddInstanceMethodAvailable: dictionaryMethods.includes('TryAdd') });
}
const probes = ['original-v3', 'default-v3', 'original-v4', 'default-v4'].map(role => ({ role, observation: json(full(`evidence\\probe-${role}.json`)) }));
const loadedUnion = new Map(), observedModules = new Map();
for (const probe of probes) {
  for (const item of probe.observation.loadedAssemblies) {
    const data = read(item.path);
    assert.equal(hash(data), item.sha256, `Unchanged console-observed image ${item.path}`);
    assert.equal(data.length, item.bytes);
    assert.equal(metadata.pe(data).mvid, item.mvid, `Actual recorded loaded MVID ${item.path}`);
    const existing = loadedUnion.get(item.path);
    if (existing) existing.observedBy.push(probe.role);
    else loadedUnion.set(item.path, { ...item, observedBy: [probe.role], omittedBytesAreNotFreshlyOfflineRehashed: true });
  }
  for (const item of probe.observation.nativeModules) {
    const data = read(item.path);
    assert.equal(hash(data), item.sha256, `Unchanged observed native module ${item.path}`);
    const existing = observedModules.get(item.path);
    if (existing) existing.observedBy.push(probe.role);
    else observedModules.set(item.path, { ...item, observedBy: [probe.role], observationBoundary: 'Actual console PID Process.Modules snapshot, not VSTest observations or exhaustive census.' });
  }
}
function managed(source, selected, purpose) {
  copy(source, selected);
  const data = read(source), p = metadata.pe(data);
  managedImages.push({ source, selected, purpose, bytes: data.length, sha256: hash(data), mvid: p.mvid, codeviews: p.codeviews });
}
function native(source, selected, purpose) {
  copy(source, selected);
  const data = read(source), start = data.readUInt32LE(0x3c);
  assert.equal(data.readUInt32LE(start), 0x4550);
  nativeImages.push({ source, selected, purpose, bytes: data.length, sha256: hash(data),
    peMachine: data.readUInt16LE(start + 4), peCharacteristics: data.readUInt16LE(start + 22) });
}
for (const role of ['original', 'default']) {
  const observation = probes.find(probe => probe.role === `${role}-v4`).observation;
  const corelib = observation.loadedAssemblies.find(item => item.name === 'System.Private.CoreLib');
  managed(corelib.path, `selected\\${role}-runtime\\System.Private.CoreLib.dll`, `Actual ${role} console-loaded CoreLib`);
  const policy = observation.nativeModules.find(item => item.name.toLowerCase() === 'hostpolicy.dll');
  native(policy.path, `selected\\${role}-runtime\\hostpolicy.dll`, `Actual ${role} console-loaded hostpolicy`);
}
const fxr = probes[0].observation.nativeModules.find(item => item.name.toLowerCase() === 'hostfxr.dll');
native(fxr.path, 'selected\\hostfxr65\\hostfxr.dll', 'Actual shared console-loaded hostfxr; not a CoreCLR version claim');
const reuseOrigin = 'C:\\Users\\jaslawin\\.copilot\\session-state\\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\\files\\autoperf-parallelism\\finding-F160-F162-011\\payload';
const reusedParsers = ['Metadata.cjs', 'Xml.cjs'].map(name => {
  assert(read(path.join(reuseOrigin, name)).equals(read(full(name))), `Byte-identical attributed parser reuse: ${name}`);
  return { selected: name, origin: path.join(reuseOrigin, name), sha256: hash(read(full(name))),
    attribution: 'Reused byte-for-byte, with user authorization, from audited F160-F162 preparation 011. Origin is historical provenance only, never an offline audit dependency.' };
});
writeJson('SOURCE-PROVENANCE.json', { reusedParsers, guidance, rootAgentsAbsence: json(full('entry.json')).rootAgentsAbsent,
  sourcePins: roles, sourcePinAssociationBoundary: 'Live git rev-parse and cat-file observations. Offline checks reconstruct selected raw/LF/Git object identities, not an entire commit/tree or compiler closure.' });
function catalog(directory) {
  assert(fs.existsSync(directory), `Inventory root exists: ${directory}`);
  const files = [], links = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name), relative = path.relative(directory, file);
      if (entry.isSymbolicLink()) links.push({ path: relative, target: fs.readlinkSync(file), kind: 'link-not-followed' });
      else if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) {
        const data = read(file);
        files.push({ path: relative, bytes: data.length, sha256: hash(data), kind: 'file' });
      } else throw new Error(`Unexpected inventory entry: ${file}`);
    }
  }
  walk(directory);
  files.sort((a, b) => sort(a.path, b.path)); links.sort((a, b) => sort(a.path, b.path));
  return { root: directory, files, links, allFileEntries: true, prefixExceptions: [], freshlyInventoriedAtPreparation: true,
    copiedAsWholeImage: false, omittedBytesFreshlyOfflineRehashed: false, fullExecutionOrCompilerInputClosureAttestation: false };
}
function keyedUnion(left, right) {
  assert.equal(left.links.length + right.links.length, 0, 'Compared execution image roots contain only physical files');
  const a = new Map(left.files.map(file => [file.path, file])), b = new Map(right.files.map(file => [file.path, file]));
  const rows = [...new Set([...a.keys(), ...b.keys()])].sort(sort).map(key => {
    const l = a.get(key) ?? null, r = b.get(key) ?? null;
    return { key, left: l, right: r, equal: !!l && !!r && l.sha256 === r.sha256 && l.bytes === r.bytes };
  });
  return { rows, differences: rows.filter(row => !row.equal), prefixExceptions: [], includesFixtureHelperAndNonDllFiles: true,
    boundary: 'Byte-image inventory only, not a causal or performance comparison.' };
}
const images = {};
for (const [role, data] of Object.entries(roles)) images[`${role}NativeAllBin`] = catalog(path.join(data.checkout, 'artifacts', 'bin'));
for (const [name, directory] of Object.entries({
  CommonV3FailedRuntime: path.join(common, 'bin'), CommonV4Accepted: path.join(common, 'bin-v4'),
  OriginalProbeV3: path.join(common, 'images', 'original'), DefaultProbeV3: path.join(common, 'images', 'default'),
  OriginalProbeV4: path.join(common, 'images', 'original-v4'), DefaultProbeV4: path.join(common, 'images', 'default-v4'),
  CommonReferenceInputs: path.join(common, 'references'), CommonFinalObj: path.join(common, 'obj')
})) images[name] = catalog(directory);
const unions = {
  acceptedOriginalDefault: keyedUnion(images.OriginalProbeV4, images.DefaultProbeV4),
  failedOriginalDefaultV3: keyedUnion(images.OriginalProbeV3, images.DefaultProbeV3),
  commonV3V4: keyedUnion(images.CommonV3FailedRuntime, images.CommonV4Accepted),
  nativeAllBinOriginalDefault: keyedUnion(images.originalNativeAllBin, images.defaultNativeAllBin)
};
const sdkRoot = path.join(roles.original.checkout, '.dotnet', 'sdk', '12.0.100-alpha.1.26557.102');
const runtime62 = path.dirname(probes.find(probe => probe.role === 'original-v4').observation.loadedAssemblies.find(item => item.name === 'System.Private.CoreLib').path);
const runtime69 = path.dirname(probes.find(probe => probe.role === 'default-v4').observation.loadedAssemblies.find(item => item.name === 'System.Private.CoreLib').path);
const omittedDistributions = { Sdk57: catalog(sdkRoot), Runtime62: catalog(runtime62), Runtime69: catalog(runtime69), HostFxr65: catalog(path.dirname(fxr.path)) };
const packageDirectories = new Set(), projectGraphs = [];
for (const input of nativeInputs.filter(input => input.assets)) {
  const data = json(full(input.assets));
  projectGraphs.push({ role: input.role, project: input.project, snapshot: input.assets, targetNames: Object.keys(data.targets ?? {}),
    packageFolders: Object.keys(data.packageFolders ?? {}), restore: data.project.restore, frameworks: data.project.frameworks });
  for (const library of Object.values(data.libraries ?? {})) {
    if (library.type !== 'package') continue;
    for (const directory of Object.keys(data.packageFolders ?? {})) {
      const candidate = path.join(directory, library.path);
      if (fs.existsSync(candidate)) packageDirectories.add(candidate);
    }
  }
}
for (const data of Object.values(roles)) {
  const global = json(path.join(data.checkout, 'global.json'));
  for (const [name, version] of Object.entries(global['msbuild-sdks'])) {
    const candidate = path.join('C:\\.tools\\.nuget\\packages', name.toLowerCase(), version.toLowerCase());
    if (fs.existsSync(candidate)) packageDirectories.add(candidate);
  }
}
const omittedPackages = [...packageDirectories].sort(sort).map(catalog);
write('evidence\\image-catalogs.json.gz', zlib.gzipSync(JSON.stringify({ images, unions, omittedDistributions, omittedPackages, projectGraphs,
  actualConsoleLoadedUnion: [...loadedUnion.values()], actualConsoleObservedNativeModules: [...observedModules.values()],
  boundary: 'Saved preparation-time inventories include every file/non-DLL key under each declared image root, with no prefix exceptions. Omitted bytes are not copied, rehashed or read by the offline audit; no whole-source/compiler-input/execution-closure attestation.' })));
writeJson('evidence\\selected-metadata.json', { pairs, managedImages, nativeImages, references, nativeInputs });
writeJson('evidence\\source-map.json', sourceMap);
const xml = json(full('evidence\\xml-system-receipt.json'));
const accepted = probes.filter(probe => probe.role.endsWith('v4'));
assert(accepted.every(probe => probe.observation.allPassed && probe.observation.rows.length === 6 && probe.observation.rows.every(row => row.passed)));
const results = {
  findingStatus: { F166: 'PENDING', F167: 'PENDING', F168: 'PENDING' },
  sourcePins: Object.fromEntries(Object.entries(roles).map(([role, data]) => [role, data.pin])),
  nativeTrx: xml.files.map(file => ({ path: file.path, resultRows: file.results.length, definitionRows: file.definitions.length,
    summary: file.summaryAttributes, counters: file.counters })),
  nativeExecutionRows: xml.files.flatMap(file => file.results).length,
  distinctExpandedNativeCaseNames: new Set(xml.files.flatMap(file => file.results.map(result => result.testName))).size,
  privateProbeRoles: probes.map(probe => ({ role: probe.role, allPassed: probe.observation.allPassed,
    framework: probe.observation.framework, rows: probe.observation.rows.map(row => ({ name: row.name, passed: row.passed })) })),
  privateSuccessfulCompilationsTotal: 2,
  acceptedV4SuccessfulCompilations: 1,
  literalOneSuccessfulCompileTotalGoalMet: false,
  successfulV3RuntimeFailurePreserved: true,
  acceptedPrivateFixtureBoundary: 'One common C#13 V4 DLL/PDB/deps compiled against actual Original native references and SDK57 BCL references; role images use their actual independent native owner/dependency output union and actual native test runtimeconfig (Original62/Default69). Not target-only substitution, a full-repo build, a full-default-compiled fixture or a performance pair.',
  f166Boundary: 'Compiler-only native build with BuildNodeJS=false and StaticWebAssetsEnabled=false after actual unrelated assets failures. Private public middleware path uses real physical files and response stream; no browser, transport, client boot or production assets validation.',
  f167Boundary: 'All three shipping targets built for both roles; net12 native suite plus actual declared net472 suite against net462 product passed. Real filesystem/XmlKeyManager key objects and retained constructor map exercised; old snapshot supplied directly to actual constructor, not proof normal provider loses persisted keys. Native provider omission scenario uses mocked manager/resolver inputs.',
  f168Boundary: 'Actual native test helper DLL, actual C# binder and public JsonPatchDocument producer exercised for reference-valued properties. Native theory value=1/expected=0 uses DynamicTestObject, not WriteOnceDynamicTestObject. No value-type write-once replacement claim.',
  sourceAndImageBoundary: 'Selected PE/PDB/raw sources and XML are copied and freshly audited offline; whole SDK/runtime/package/native image trees are only inventoried and not copied or freshly offline rehashed.',
  nativeModuleObservationBoundary: 'Console probe PID snapshots only; not VSTest module observations, not exhaustive managed/native process census.',
  noBenchmarksOrTimingAllocationCounters: true,
  noCandidateImplementationOrVerdict: true,
  noShippingPermanentTestSourceCommitOrPublishingChanges: true
};
writeJson('RESULTS.json', results);
console.log(JSON.stringify({ collected: true, sourceSnapshots: sourceMap.length, managedPePdbPairs: pairs.length,
  selectedReferences: references.length, nativeTrx: xml.files.length, nativeExecutionRows: results.nativeExecutionRows,
  distinctExpandedNativeCaseNames: results.distinctExpandedNativeCaseNames, omittedPackageDirectories: omittedPackages.length,
  acceptedProbeImageUnionKeys: unions.acceptedOriginalDefault.rows.length, acceptedProbeImageDifferentKeys: unions.acceptedOriginalDefault.differences.length }));
