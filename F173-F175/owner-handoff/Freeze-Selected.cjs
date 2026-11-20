'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const { pe, portablePdb } = require('./Metadata.cjs');
const { reconcile } = require('./Reconcile.cjs');
const root = __dirname;
const graphs = JSON.parse(fs.readFileSync(path.join(root, 'graph-creation.json')));
const initialImages = JSON.parse(fs.readFileSync(path.join(root, 'native-images.json')));
const selection = JSON.parse(fs.readFileSync(path.join(root, 'native-selection.json')));
const sha = (bytes, algorithm = 'sha256') => crypto.createHash(algorithm).update(bytes).digest('hex').toUpperCase();
const read = p => fs.readFileSync(path.join(root, p));
const readJson = p => JSON.parse(read(p));
function write(filename, bytes) {
  const destination = path.join(root, filename);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (fs.existsSync(destination)) assert(fs.readFileSync(destination).equals(Buffer.from(bytes)), `Never replace different frozen bytes ${filename}`);
  else fs.writeFileSync(destination, bytes);
}
const json = (filename, value) => write(filename, JSON.stringify(value, null, 2) + '\n');
const files = [], images = [], pairs = [], documents = [], runtimes = [], nativeReports = [], graphsDeclared = [];
function select(source, selected, role, purpose) {
  const bytes = fs.readFileSync(source);
  write(selected, bytes);
  const record = { source, selected, role, purpose, bytes: bytes.length, sha256: sha(bytes) };
  files.push(record);
  return record;
}
function managed(source, selected, role, purpose) {
  const file = select(source, selected, role, purpose), parsed = pe(read(selected));
  images.push({ ...file, mvid: parsed.mvid, codeviews: parsed.codeviews });
  return { file, parsed };
}
function git(repo, args) {
  const result = cp.spawnSync('git', ['--no-pager', '-C', repo, ...args], { encoding: null, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  assert.equal(result.status, 0, `git ${args.join(' ')} ${result.stderr}`);
  return result.stdout;
}
const blobCache = new Map(), trees = {};
function tree(role) {
  if (trees[role]) return trees[role];
  const bytes = git(graphs[`${role}Path`], ['ls-tree', '-r', graphs[`${role}Commit`]]);
  const entries = new Map();
  for (const line of bytes.toString('utf8').trim().split('\n')) {
    const [head, name] = line.split('\t');
    if (!name) continue;
    const [mode, type, blob] = head.split(' ');
    if (type === 'blob') entries.set(name, { mode, blob });
  }
  trees[role] = entries;
  return entries;
}
function immutableDoc(role, source, bytes) {
  const repo = graphs[`${role}Path`];
  if (!source.toLowerCase().startsWith(`${repo}\\`.toLowerCase())) return null;
  const relative = source.slice(repo.length + 1).replaceAll('\\', '/'), item = tree(role).get(relative);
  if (!item) return null;
  let gitBytes = blobCache.get(item.blob);
  if (!gitBytes) {
    gitBytes = git(repo, ['cat-file', 'blob', item.blob]);
    blobCache.set(item.blob, gitBytes);
    write(`source/blobs/${item.blob}.blob`, gitBytes);
  }
  const normalized = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
  assert(gitBytes.equals(bytes) || gitBytes.equals(normalized), `Tracked compiler source must equal its exact pinned Git blob modulo checkout CRLF: ${source}`);
  return { commit: graphs[`${role}Commit`], source: relative, blob: item.blob, rawGitBlob: `source/blobs/${item.blob}.blob`, checkoutRelation: gitBytes.equals(bytes) ? 'byte-identical' : 'git-LF-vs-compiler-CRLF' };
}
function pair(sourceStem, selectedStem, role, purpose) {
  const image = managed(`${sourceStem}.dll`, `${selectedStem}.dll`, role, purpose);
  const pdbFile = select(`${sourceStem}.pdb`, `${selectedStem}.pdb`, role, 'Selected complete portable PDB document set');
  const pdb = portablePdb(read(pdbFile.selected));
  assert(image.parsed.codeviews.some(c => c.guid === pdb.guid && c.stamp === pdb.stamp && c.age === 1), `PE/portable PDB association ${selectedStem}`);
  const ids = [];
  for (const [index, document] of pdb.documents.entries()) {
    const source = role === 'common' && document.name === '/_/autoperf-private/Program.cs'
      ? path.join(root, 'consumer', 'Program.cs') : document.name;
    const bytes = fs.readFileSync(source);
    const algorithm = document.algorithm === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256'
      : document.algorithm === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
    assert(algorithm, `Known PDB checksum ${document.algorithm}`);
    assert.equal(sha(bytes, algorithm), document.checksum, document.name);
    const selected = `selected/pdb-documents/${role}/${path.basename(selectedStem)}/${String(index + 1).padStart(3, '0')}-${path.win32.basename(document.name)}`;
    write(selected, bytes);
    const id = documents.length;
    documents.push({
      id, role, pair: selectedStem, ...document, selected,
      bytes: bytes.length, sha256: sha(bytes),
      immutableSource: role === 'common' ? null : immutableDoc(role, source, bytes),
      sourceKind: role === 'common' ? 'private-common-consumer' : source.toLowerCase().startsWith(graphs[`${role}Path`].toLowerCase()) ? 'own-role-source-or-generated' : 'package-generated-entry-point'
    });
    ids.push(id);
  }
  pairs.push({ role, image: image.file.selected, pdb: pdbFile.selected, guid: pdb.guid, stamp: pdb.stamp, documents: ids, allPdbDocumentsSelected: true });
}
function inventory(directory, relative = '') {
  const result = [];
  for (const item of fs.readdirSync(path.join(directory, relative), { withFileTypes: true })) {
    const next = path.join(relative, item.name);
    if (item.isDirectory()) result.push(...inventory(directory, next));
    else {
      const bytes = fs.readFileSync(path.join(directory, next));
      result.push({ path: next.replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) });
    }
  }
  return result.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
const finalImages = { boundary: 'Every file recursively under each actual native output after the identical four-file common consumer augmentation; no filename/prefix exclusion.', images: {} };
for (const role of ['original', 'default']) {
  const directory = initialImages.images[role].directory, repo = graphs[`${role}Path`], commit = graphs[`${role}Commit`];
  const finalFiles = inventory(directory), finalByName = new Map(finalFiles.map(f => [f.path, f]));
  for (const old of initialImages.images[role].files) assert.deepEqual(finalByName.get(old.path), old, `Normal image bytes preserved ${role} ${old.path}`);
  const additions = finalFiles.filter(f => !initialImages.images[role].files.some(old => old.path === f.path));
  assert.deepEqual(additions.map(f => f.path).sort(), ['deps.json', 'dll', 'pdb', 'runtimeconfig.json'].map(suffix => `AutoPerf.Identity.Contracts.${suffix}`).sort());
  finalImages.images[role] = { sourceRole: role, commit, directory, files: finalFiles, count: finalFiles.length, bytes: finalFiles.reduce((sum, f) => sum + f.bytes, 0) };
  for (const name of ['Microsoft.AspNetCore.Identity.InMemory.Test', 'Microsoft.AspNetCore.Identity.Specification.Tests', 'Microsoft.Extensions.Identity.Core'])
    pair(path.join(directory, name), `selected/${role}/${name}`, role, name.includes('InMemory') ? 'Actual source-built nonshipping native test/store owner' : name.includes('Specification') ? 'Actual inherited native test producer' : 'Actual source-built public UserManager/RoleManager producer');
  for (const name of ['Microsoft.AspNetCore.Identity.dll', 'testhost.dll', 'Microsoft.Extensions.DependencyInjection.dll'])
    managed(path.join(directory, name), `selected/${role}/${name}`, role, name === 'testhost.dll' ? 'Native testhost managed image; package PDB not selected' : 'Normal native dependency PE only; PDB not selected');
  select(path.join(directory, 'testhost.exe'), `selected/${role}/testhost.exe`, role, 'Actual native testhost apphost');
  for (const suffix of ['deps.json', 'runtimeconfig.json'])
    select(path.join(directory, `${selection.assembly}.${suffix}`), `selected/${role}/${selection.assembly}.${suffix}`, role, 'Normal role native owner configuration/dependency declaration');
  for (const name of ['Microsoft.AspNetCore.Identity.InMemory.Test', 'Microsoft.AspNetCore.Identity.Specification.Tests', 'Microsoft.Extensions.Identity.Core'])
    select(path.join(repo, 'artifacts', 'obj', name, 'project.assets.json'), `selected/${role}/assets/${name}.project.assets.json`, role, 'Actual normal restore declaration; not full native compiler-input closure');
  for (const name of ['Directory.Build.props', 'Directory.Build.targets'])
    select(path.join(repo, 'artifacts', 'bin', 'GenerateFiles', name), `selected/${role}/generated-imports/${name}`, role, 'Unchanged normal generated build imports');
  const nativeDeps = JSON.parse(fs.readFileSync(path.join(directory, `${selection.assembly}.deps.json`)));
  graphsDeclared.push({
    role, commit, target: nativeDeps.runtimeTarget,
    sourceBuiltProjects: Object.entries(nativeDeps.libraries).filter(([, v]) => v.type === 'project').map(([name, value]) => ({ name, ...value })),
    packages: Object.entries(nativeDeps.libraries).filter(([, v]) => v.type === 'package').map(([name, value]) => ({ name, ...value })),
    configuration: `selected/${role}/${selection.assembly}.runtimeconfig.json`,
    completeDependencyDeclaration: `selected/${role}/${selection.assembly}.deps.json`,
    completeNativeAssets: `selected/${role}/assets/${selection.assembly}.project.assets.json`
  });
  for (const kind of ['selected', 'modules']) {
    const report = `evidence/native-${role}-${kind}/${role}-${kind}.trx`;
    nativeReports.push({ role, report, invocation: `${role}-native-${kind}`, ...reconcile(read(report).toString('utf8'), selection, directory) });
  }
  const moduleObservation = readJson(`evidence/${role}-native-modules.modules.json`);
  assert(moduleObservation.completed);
  const coreClr = moduleObservation.files.find(f => path.win32.basename(f.path).toLowerCase() === 'coreclr.dll');
  const coreLib = moduleObservation.files.find(f => path.win32.basename(f.path).toLowerCase() === 'system.private.corelib.dll');
  assert(coreClr && coreLib, 'Actual native testhost CoreCLR and CoreLib paths observed');
  const runtimeDirectory = path.win32.dirname(coreClr.path), runtimeFiles = inventory(runtimeDirectory);
  const runtimeRecord = { role, directory: runtimeDirectory, boundary: 'Entire normal Microsoft.NETCore.App shared runtime directory recursively; no prefix exclusion. Not a complete SDK/OS graph.', count: runtimeFiles.length, bytes: runtimeFiles.reduce((sum, f) => sum + f.bytes, 0), files: runtimeFiles, selected: [] };
  for (const name of ['coreclr.dll', 'System.Private.CoreLib.dll', 'hostpolicy.dll', 'hostfxr.dll']) {
    const observed = moduleObservation.files.find(f => path.win32.basename(f.path).toLowerCase() === name.toLowerCase());
    if (!observed) continue;
    const destination = `selected/${role}/runtime/${name}`;
    const file = name === 'System.Private.CoreLib.dll'
      ? managed(observed.path, destination, role, 'Actually sampled native testhost CoreLib; runtime PDB not selected').file
      : select(observed.path, destination, role, 'Actually sampled native testhost native runtime/host module');
    assert.equal(file.sha256, observed.sha256);
    runtimeRecord.selected.push({ ...observed, selected: destination });
  }
  runtimes.push(runtimeRecord);
}
pair(path.join(root, 'consumer', 'accepted', 'AutoPerf.Identity.Contracts'), 'selected/common/AutoPerf.Identity.Contracts', 'common', 'One accepted C#13 consumer and SDK-process identity hook');
for (const suffix of ['deps.json', 'runtimeconfig.json'])
  select(path.join(root, 'consumer', 'accepted', `AutoPerf.Identity.Contracts.${suffix}`), `selected/common/AutoPerf.Identity.Contracts.${suffix}`, 'common', 'Byte-identical prepared common companion; role-specific native configs explicitly override execution');
function difference(a, b) {
  const first = new Map(a.map(f => [f.path, f])), second = new Map(b.map(f => [f.path, f]));
  return [...new Set([...first.keys(), ...second.keys()])].sort()
    .filter(name => first.get(name)?.sha256 !== second.get(name)?.sha256)
    .map(name => ({ path: name, original: first.get(name) ?? null, default: second.get(name) ?? null }));
}
finalImages.differences = difference(finalImages.images.original.files, finalImages.images.default.files);
json('native-images-final.json', finalImages);
json('runtime-images.json', { images: runtimes, differences: difference(runtimes[0].files, runtimes[1].files) });
json('native-declarations.json', graphsDeclared);
json('selected-records.json', { boundary: 'Selected PE/PDB bytes, all documents in every selected PDB, selected normal deps/config/assets, complete declared native/runtime image filename/hash inventories. Not all native dependency bytes or all native compiler inputs.', files, images, pairs, documents });
json('native-reconciliation.json', { parser: 'Structural XML with Results/Definitions/Entries IDs/names/role-codebase and exact selected rows reconciled, not regex/count-only.', reports: nativeReports });
console.log(JSON.stringify({ selectedFiles: files.length, managedImages: images.length, pdbPairs: pairs.length, rawPdbDocuments: documents.length, nativeReports: nativeReports.length, nativeRowExecutions: nativeReports.reduce((sum, r) => sum + r.rows.length, 0), runtimeInventories: runtimes.map(r => ({ role: r.role, count: r.count, bytes: r.bytes })) }));
