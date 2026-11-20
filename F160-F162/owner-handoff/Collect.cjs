'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');
const metadata = require('./Metadata.cjs');
const root = __dirname, payload = path.join(root, 'payload');
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const read = file => fs.readFileSync(file);
const json = file => JSON.parse(read(file).toString('utf8').replace(/^\uFEFF/, ''));
const full = relative => path.join(root, relative);
const walk = directory => fs.existsSync(directory) ? fs.readdirSync(directory, { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() && !entry.isSymbolicLink() ? walk(path.join(directory, entry.name)) :
    entry.isFile() ? [path.join(directory, entry.name)] : []) : [];
function write(relative, data) {
  const file = path.join(payload, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data);
}
const writeJson = (relative, value) => write(relative, JSON.stringify(value, null, 2));
function copy(source, relative) { write(relative, read(source)); return relative; }
function catalog(directory) {
  return { root: directory, allEntries: true, prefixExceptions: [], freshlyInventoried: true, copiedAsWholeImage: false,
    fullExecutionClosureAttestation: false, files: walk(directory).map(file => {
      const bytes = read(file); return { path: path.relative(directory, file), bytes: bytes.length, sha256: hash(bytes) };
    }).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0) };
}
function differences(left, right) {
  const a = new Map(left.files.map(file => [file.path, file])), b = new Map(right.files.map(file => [file.path, file]));
  return [...new Set([...a.keys(), ...b.keys()])].sort().map(key => ({ path: key, left: a.get(key) ?? null, right: b.get(key) ?? null }))
    .filter(row => !row.left || !row.right || row.left.sha256 !== row.right.sha256 || row.left.bytes !== row.right.bytes);
}
if (fs.existsSync(path.join(payload, 'MANIFEST.json'))) throw new Error('Already frozen');
const probes = ['probe-original-v2', 'probe-projected-default-v2'].map(name => json(full(`evidence\\${name}\\result.json`)));
const before = JSON.parse(zlib.gunzipSync(read(full('evidence\\images-before.json.gz'))));
const images = {};
for (const [name, image] of Object.entries(before)) images[name] = catalog(full(image.root));
const stability = Object.keys(before).map(name => ({ name, differences: differences(before[name], images[name]) }));
const unionDifferences = {
  commonVsProjectedDefault: differences(images.Common, images.ProjectedDefault),
  originalNativeVsDefaultNative: differences(images.OriginalNative, images.DefaultNative),
  prefixExceptions: [],
  differentSourceRuntimeClosuresAreNotCausalPerformancePair: true
};
const dotnet = full('work\\original\\.dotnet');
images.Runtime62 = catalog(path.join(dotnet, 'shared\\Microsoft.NETCore.App\\12.0.0-alpha.1.26562.105'));
images.Sdk57 = catalog(path.join(dotnet, 'sdk\\12.0.100-alpha.1.26557.102'));
images.HostFxr65 = catalog(path.join(dotnet, 'host\\fxr\\12.0.0-alpha.1.26565.104'));
images.Runtime69 = catalog(full('work\\default\\.dotnet\\shared\\Microsoft.NETCore.App\\12.0.0-alpha.1.26569.107'));
images.Runtime69Package = catalog(full('work\\runtime69\\package'));
images.FailedCommonV1 = catalog(full('work\\verifier\\bin\\Release\\net12.0'));
images.FailedProjectedV1 = catalog(full('work\\projected-default'));
const packages = new Set(), projectGraphs = {};
for (const role of ['original', 'default']) {
  images[`${role}FullBin`] = catalog(full(`work\\${role}\\artifacts\\bin`));
  const global = json(full(`work\\${role}\\global.json`));
  for (const [name, version] of Object.entries(global['msbuild-sdks'])) {
    const directory = path.join('C:\\.tools\\.nuget\\packages', name.toLowerCase(), version.toLowerCase());
    if (fs.existsSync(directory)) packages.add(directory);
  }
  const obj = full(`work\\${role}\\artifacts\\obj`);
  images[`${role}Obj`] = catalog(obj);
  const assets = walk(obj).filter(file => path.basename(file) === 'project.assets.json');
  projectGraphs[role] = assets.map(file => {
    const data = json(file);
    for (const [key, library] of Object.entries(data.libraries ?? {})) {
      if (library.type === 'package') {
        for (const packageRoot of Object.keys(data.packageFolders ?? {})) {
          const directory = path.join(packageRoot, library.path ?? key.toLowerCase());
          if (fs.existsSync(directory)) packages.add(directory);
        }
      }
    }
    return { assetsPath: path.relative(full(`work\\${role}`), file), sha256: hash(read(file)), project: data.project,
      libraries: data.libraries, targets: Object.keys(data.targets ?? {}) };
  });
  const spec = path.join(obj, 'Microsoft.AspNetCore.Components.AI.SourceGenerators.Tests', 'Microsoft.AspNetCore.Components.AI.SourceGenerators.Tests.csproj.nuget.dgspec.json');
  copy(spec, `evidence\\${role}-native-restore-graph.json`);
}
images.CommonObj = catalog(full('work\\verifier-v2\\obj'));
const packageCatalogs = [...packages].sort().map(directory => catalog(directory));
const loadedImages = {};
for (const probe of probes) {
  for (const item of [...probe.loadedAssemblies, ...probe.modules]) {
    const bytes = read(item.path);
    if (hash(bytes) !== item.sha256) throw new Error(`Loaded image changed ${item.path}`);
    loadedImages[item.path] = { path: item.path, bytes: bytes.length, sha256: hash(bytes), mvid: item.mvid ?? null };
  }
}
const native69 = json(full('evidence\\default69-native-module-observations.json'));
for (const item of native69.files) {
  const data = read(item.path);
  if (hash(data) !== item.sha256 || data.length !== item.bytes) throw new Error(`Native observed module changed ${item.path}`);
  loadedImages[item.path] = { path: item.path, bytes: data.length, sha256: item.sha256, mvid: null,
    observedBy: 'Actual Default native testhost Process.Modules snapshots; not an exhaustive managed-assembly census.' };
}
write('evidence\\complete-image-catalogs.json.gz', zlib.gzipSync(JSON.stringify({ before, after: images, stability, unionDifferences,
  omittedPackages: packageCatalogs, actualLoadedUnion: Object.values(loadedImages), projectGraphs,
  boundary: 'Catalogs freshly hash files at collection; omitted complete outputs/runtime/SDK/packages/obj are not copied or fully execution/compiler-input attested.' })));
const sourceMap = [], pairs = [];
const genSources = ['DiagnosticDescriptors.cs', 'ToolBlockCandidate.cs', 'ToolBlockEmitter.cs', 'ToolBlockGenerator.cs', 'ToolBlockParser.cs']
  .map(name => `src\\Components\\AI\\gen\\${name}`);
const producerSources = ['Attributes\\ToolBlockAttribute.cs', 'Attributes\\ToolParameterAttribute.cs', 'Attributes\\ToolResultAttribute.cs',
  'Pipeline\\UIAgentOptions.cs', 'Pipeline\\BlockMappingPipeline.cs', 'Pipeline\\HandlerEntry.cs']
  .map(name => `src\\Components\\AI\\src\\${name}`);
function source(role, relative) {
  const checkout = full(`work\\${role}`), sourceFile = path.join(checkout, relative), raw = read(sourceFile);
  const snapshot = copy(sourceFile, `source\\${role}\\${relative}`);
  const lf = Buffer.from(raw.toString('utf8').replaceAll('\r\n', '\n'), 'utf8');
  const blob = execFileSync('git', ['-C', checkout, 'rev-parse', `HEAD:${relative.replaceAll('\\', '/')}`], { encoding: 'utf8' }).trim();
  const actualBlob = crypto.createHash('sha1').update(Buffer.from(`blob ${lf.length}\0`)).update(lf).digest('hex');
  if (actualBlob !== blob) throw new Error(`Git/LF identity mismatch ${relative}`);
  sourceMap.push({ role, path: relative, snapshot, rawBytes: raw.length, rawSha256: hash(raw), lfSha256: hash(lf), gitBlob: blob,
    canonicalLfGitBlob: actualBlob, crlfPairs: raw.toString('utf8').split('\r\n').length - 1, fullCompilerInputAttestation: false });
  return snapshot;
}
function pair(id, base, sources) {
  const selectedDll = copy(base + '.dll', `selected\\${id}\\${path.basename(base)}.dll`);
  const selectedPdb = copy(base + '.pdb', `selected\\${id}\\${path.basename(base)}.pdb`);
  const pe = metadata.pe(read(base + '.dll')), pdb = metadata.portablePdb(read(base + '.pdb'));
  if (!pe.codeviews.some(item => item.guid === pdb.guid && item.stamp === pdb.stamp && item.age === 1)) throw new Error(`CodeView mismatch ${id}`);
  const selectedSources = sources.map(item => {
    const doc = pdb.documents.find(document => document.name.toLowerCase().endsWith(item.suffix.toLowerCase()));
    if (!doc) throw new Error(`Missing selected PDB document ${id}/${item.suffix}`);
    const raw = read(path.join(payload, item.snapshot)), actual = hash(raw);
    if (doc.algorithm !== '8829d00f-11b8-4213-878b-770e8597ac16' || actual !== doc.checksum) throw new Error(`Raw PDB checksum ${id}/${item.suffix}`);
    return { snapshot: item.snapshot, document: doc };
  });
  pairs.push({ id, selectedDll, selectedPdb, peSha256: hash(read(base + '.dll')), pdbSha256: hash(read(base + '.pdb')),
    mvid: pe.mvid, codeviews: pe.codeviews, pdbGuid: pdb.guid, pdbStamp: pdb.stamp, documents: pdb.documents,
    selectedSources, fullCompilerInputAttestation: false });
}
for (const role of ['original', 'default']) {
  const selectedGen = genSources.map(relative => ({ suffix: relative, snapshot: source(role, relative) }));
  const selectedProducer = producerSources.map(relative => ({ suffix: relative, snapshot: source(role, relative) }));
  const test = 'src\\Components\\AI\\gen\\test\\ToolBlockGeneratorTests.cs';
  const selectedTests = [{ suffix: test, snapshot: source(role, test) }];
  const base = full(`work\\${role}\\artifacts\\bin`);
  pair(`${role}-generator`, path.join(base, 'Microsoft.AspNetCore.Components.AI.SourceGenerators\\Release\\netstandard2.0\\Microsoft.AspNetCore.Components.AI.SourceGenerators'), selectedGen);
  pair(`${role}-producer`, path.join(base, 'Microsoft.AspNetCore.Components.AI\\Release\\net12.0\\Microsoft.AspNetCore.Components.AI'), selectedProducer);
  pair(`${role}-native-tests`, path.join(base, 'Microsoft.AspNetCore.Components.AI.SourceGenerators.Tests\\Release\\net12.0\\Microsoft.AspNetCore.Components.AI.SourceGenerators.Tests'), selectedTests);
  for (const relative of ['global.json', 'eng\\Versions.props', 'src\\Components\\AI\\gen\\Microsoft.AspNetCore.Components.AI.SourceGenerators.csproj',
    'src\\Components\\AI\\gen\\test\\Microsoft.AspNetCore.Components.AI.SourceGenerators.Tests.csproj', 'src\\Components\\AI\\src\\Microsoft.AspNetCore.Components.AI.csproj']) source(role, relative);
}
copy(full('work\\verifier-v2\\Program.cs'), 'source\\common-v2\\Program.cs');
copy(full('work\\verifier-v2\\Verifier.csproj'), 'source\\common-v2\\Verifier.csproj');
copy(full('work\\verifier\\Program.cs'), 'source\\failed-common-v1\\Program.cs');
copy(full('work\\verifier\\Verifier.csproj'), 'source\\failed-common-v1\\Verifier.csproj');
pair('common-v2', full('work\\verifier-v2\\bin\\Release\\net12.0\\Verifier'), [{ suffix: 'verifier-v2\\Program.cs', snapshot: 'source\\common-v2\\Program.cs' }]);
pair('failed-common-v1', full('work\\verifier\\bin\\Release\\net12.0\\Verifier'), [{ suffix: 'verifier\\Program.cs', snapshot: 'source\\failed-common-v1\\Program.cs' }]);
for (const name of ['Verifier.deps.json', 'Verifier.runtimeconfig.json']) copy(full(`work\\verifier-v2\\bin\\Release\\net12.0\\${name}`), `selected\\common-v2\\${name}`);
copy('C:\\.tools\\.nuget\\packages\\netstandard.library\\2.0.3\\build\\netstandard2.0\\ref\\netstandard.dll', 'selected\\reference\\netstandard.dll');
copy(path.join(dotnet, 'shared\\Microsoft.NETCore.App\\12.0.0-alpha.1.26562.105\\System.Private.CoreLib.dll'), 'selected\\runtime62\\System.Private.CoreLib.dll');
for (const name of ['hostfxr.dll', 'hostpolicy.dll', 'coreclr.dll', 'clrjit.dll']) {
  const module = probes[0].modules.find(item => path.basename(item.path).toLowerCase() === name);
  copy(module.path, `selected\\host\\${name}`);
}
const runtime69 = [];
for (const name of ['System.Private.CoreLib.dll', 'hostpolicy.dll', 'coreclr.dll', 'clrjit.dll']) {
  const observed = native69.files.find(item => path.basename(item.path).toLowerCase() === name.toLowerCase());
  if (!observed || !observed.path.includes('12.0.0-alpha.1.26569.107')) throw new Error(`Runtime69 module not genuinely observed ${name}`);
  const selected = copy(observed.path, `selected\\runtime69\\${name}`);
  const identity = name === 'System.Private.CoreLib.dll' ? metadata.pe(read(observed.path)) : null;
  runtime69.push({ ...observed, selected, mvid: identity?.mvid ?? null, codeviews: identity?.codeviews ?? null });
}
const testPair = pairs.find(item => item.id === 'default-native-tests');
const consumer = native69.files.find(item => path.basename(item.path) === 'Microsoft.AspNetCore.Components.AI.SourceGenerators.Tests.dll');
if (!consumer || consumer.sha256 !== testPair.peSha256) throw new Error('Actual observed native consumer identity does not match selected PE/PDB');
writeJson('evidence\\native-default69-identities.json', {
  testhostPids: [...new Set(native69.observations.map(item => item.pid))],
  consumer: { ...consumer, mvid: metadata.pe(read(consumer.path)).mvid, selected: testPair.selectedDll },
  runtime69, hostfxr: native69.files.find(item => path.basename(item.path).toLowerCase() === 'hostfxr.dll'),
  completeManagedAssemblyCensus: false, fullCompilerInputAttestation: false,
  generatorAndAiProducerPresentInModuleSnapshots: false,
  boundary: 'Actual test-consumer/CoreLib/native-host identity witnesses. Generator and AI producer were not observed in these bounded snapshots; their independently built PE/PDB/dependency identities are not relabeled as native loaded-assembly witnesses.'
});
copy(full('work\\default\\artifacts\\bin\\Microsoft.AspNetCore.Components.AI.SourceGenerators.Tests\\Release\\net12.0\\Microsoft.AspNetCore.Components.AI.SourceGenerators.Tests.runtimeconfig.json'),
  'selected\\default-native-tests\\Microsoft.AspNetCore.Components.AI.SourceGenerators.Tests.runtimeconfig.json');
writeJson('evidence\\pe-pdb-source.json', pairs);
writeJson('evidence\\git-raw-source.json', sourceMap);
writeJson('evidence\\image-differences.json', { stability, ...unionDifferences });
for (const name of ['entry.json', 'retained-records.json', 'ACCEPTANCE.json', 'Run-Native.ps1', 'Metadata.cjs', 'Xml.cjs', 'Collect.cjs', 'Audit.cjs', 'Capture-NativeModules.ps1']) copy(full(name), name);
const attempts = walk(full('evidence')).filter(file => !file.includes(`${path.sep}probe-`) && !file.endsWith('.gz') && !file.endsWith('.trx'));
write('evidence\\all-attempts.json.gz', zlib.gzipSync(JSON.stringify(attempts.map(file => ({ path: path.relative(full('evidence'), file),
  bytes: read(file).length, sha256: hash(read(file)), utf8: read(file).toString('utf8') })))));
for (const name of ['real-xml-parse.json', 'history.txt', 'introduction.txt', 'target-diff.txt', 'registration-consumers.txt', 'graphs.json', 'verifier-v1-failure.json',
  'source-status.json', 'runtime69-staging.json', 'default69-native-module-observations.json']) copy(full(`evidence\\${name}`), `evidence\\${name}`);
for (const role of ['original', 'default']) copy(full(`evidence\\native-${role}\\${role}-native.trx`), `evidence\\native-${role}.trx`);
copy(full('evidence\\native-default69\\default-native69.trx'), 'evidence\\native-default69.trx');
for (const name of ['probe-original-v2', 'probe-projected-default-v2', 'probe-original', 'probe-projected-default'])
  for (const file of walk(full(`evidence\\${name}`))) copy(file, `evidence\\${name}\\${path.relative(full(`evidence\\${name}`), file)}`);
writeJson('evidence\\collection-summary.json', { selectedPePdbPairs: pairs.length, selectedRawPdbDocuments: pairs.reduce((sum, item) => sum + item.selectedSources.length, 0),
  imageFileCounts: Object.fromEntries(Object.entries(images).map(([name, value]) => [name, value.files.length])),
  packageDirectoriesInventoried: packageCatalogs.length, omittedPackageFiles: packageCatalogs.reduce((sum, item) => sum + item.files.length, 0),
  actualLoadedImageUnion: Object.values(loadedImages).length,
  rawSourceFiles: sourceMap.length, fullCompilerInputAttestation: false, separateRuntimeClosuresAreCausalPerformancePair: false });
console.log(JSON.stringify({ files: walk(payload).length, bytes: walk(payload).reduce((sum, file) => sum + fs.statSync(file).size, 0),
  selectedPePdbPairs: pairs.length, stabilityDifferences: stability.map(item => [item.name, item.differences.length]),
  commonRoleDifferences: unionDifferences.commonVsProjectedDefault.map(item => item.path) }, null, 2));
