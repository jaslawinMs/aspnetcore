'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { pe, portablePdb } = require('./Metadata.cjs');
const { embeddedSources } = require('./PdbEmbedded.cjs');
const { objectId } = require('./GitObjects.cjs');
const { describe, union, sha } = require('./Inventories.cjs');
const root = __dirname, graphs = JSON.parse(fs.readFileSync(path.join(root, 'graph-creation.json')));
const policy = JSON.parse(fs.readFileSync(path.join(root, '..', '..', 'policy.json')));
assert(!policy.actualWorkerBuildHoldActive && policy.workersMayBuildOrTest, 'No new source-heavy work during an active HOLD');
function write(name, bytes) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) assert(fs.readFileSync(file).equals(Buffer.from(bytes)), `Frozen selected bytes ${name}`);
  else fs.writeFileSync(file, bytes);
}
function json(name, value) { write(name, JSON.stringify(value, null, 2) + '\n'); }
function git(repo, args) {
  const result = cp.spawnSync('git', ['--no-pager', '-C', repo, ...args], { encoding: null, windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}
const trees = {}, blobCache = new Map(), immutable = new Map();
for (const role of ['original', 'default']) {
  const bytes = git(graphs[`${role}Path`], ['ls-tree', '-r', '-z', graphs[`${role}Commit`]]);
  const entries = bytes.toString('utf8').split('\0').filter(Boolean).map(row => {
    const tab = row.indexOf('\t'), [mode, type, blob] = row.slice(0, tab).split(' ');
    return { mode, type, blob, source: row.slice(tab + 1) };
  });
  trees[role] = new Map(entries.filter(entry => entry.type === 'blob').map(entry => [entry.source.toLowerCase(), entry]));
}
function pinned(role, source, possibleCheckout) {
  const entry = trees[role].get(source.replaceAll('\\', '/').toLowerCase());
  if (!entry) return null;
  const key = `${role}:${entry.source}`;
  if (immutable.has(key)) return immutable.get(key);
  let bytes = blobCache.get(entry.blob);
  if (!bytes) {
    if (possibleCheckout && objectId('blob', possibleCheckout) === entry.blob) bytes = possibleCheckout;
    else if (possibleCheckout) {
      const lf = Buffer.from(possibleCheckout.toString('utf8').replaceAll('\r\n', '\n'));
      if (objectId('blob', lf) === entry.blob) bytes = lf;
    }
    if (!bytes) bytes = git(graphs[`${role}Path`], ['cat-file', 'blob', entry.blob]);
    assert.equal(objectId('blob', bytes), entry.blob);
    blobCache.set(entry.blob, bytes);
  }
  const selected = `source/blobs/${entry.blob}.blob`;
  write(selected, bytes);
  const value = { role, commit: graphs[`${role}Commit`], source: entry.source, blob: entry.blob,
    rawGitBlob: selected, bytes: bytes.length, sha256: sha(bytes) };
  immutable.set(key, value);
  return value;
}
function checksum(bytes, algorithm) {
  const names = { '8829d00f-11b8-4213-878b-770e8597ac16': 'sha256', 'ff1816ec-aa5e-4d10-87f7-6f4963833460': 'sha1' };
  assert(names[algorithm], `Known PDB Document checksum algorithm ${algorithm}`);
  return crypto.createHash(names[algorithm]).update(bytes).digest('hex').toUpperCase();
}
function directiveWitnesses(role, document) {
  const result = [];
  for (const entry of trees[role].values()) {
    if (!entry.source.startsWith('src/Mvc/test/WebSites/RazorBuildWebSite.Views/') || !entry.source.endsWith('.cs')) continue;
    const source = pinned(role, entry.source), bytes = fs.readFileSync(path.join(root, source.rawGitBlob));
    for (const [index, line] of bytes.toString('utf8').split('\n').entries()) {
      const text = line.trim();
      if (!text.startsWith('#pragma checksum ')) continue;
      const parts = text.split('"');
      if (parts.length !== 7 || parts[1] !== document.name) continue;
      assert.equal(parts[3].replaceAll('{', '').replaceAll('}', '').toLowerCase(), document.algorithm);
      assert.equal(parts[5].toUpperCase(), document.checksum);
      result.push({ immutableSource: source, line: index + 1, directive: text });
    }
  }
  assert(result.length > 0, `Pinned checksum-directive witnesses for unavailable historical logical document ${document.name}`);
  return result;
}
const pairs = [], documents = [];
function pair(role, kind, name, imageSource, pdbSource, prefix, overrides = null, privateSource = null) {
  const imageBytes = fs.readFileSync(imageSource), pdbBytes = fs.readFileSync(pdbSource);
  const image = `${prefix}/${name}.dll`, pdb = `${prefix}/${name}.pdb`;
  write(image, imageBytes); write(pdb, pdbBytes);
  const metadata = pe(imageBytes), debug = portablePdb(pdbBytes), embedded = embeddedSources(pdbBytes);
  assert(metadata.codeviews.some(view => view.guid === debug.guid && view.stamp === debug.stamp && view.age === 1), `PE/portable PDB identity ${role} ${name}`);
  const documentIndices = [];
  for (const [index, document] of debug.documents.entries()) {
    let bytes = null, sourceKind = null, source = null, witnesses = null;
    if (privateSource) { bytes = fs.readFileSync(privateSource); sourceKind = 'actual-private-common-source-snapshot'; }
    else if (overrides) {
      assert.equal(overrides[index].name, document.name);
      bytes = fs.readFileSync(path.join(root, overrides[index].selected)); sourceKind = 'preserved-earlier-native-compiler-document';
    } else if (fs.existsSync(document.name)) {
      bytes = fs.readFileSync(document.name); sourceKind = 'actual-existing-compiler-document';
    } else if (embedded.has(index)) {
      bytes = embedded.get(index).bytes; sourceKind = 'actual-portable-pdb-EmbeddedSource';
    } else {
      assert.equal(name, 'RazorBuildWebSite.Views');
      sourceKind = 'unavailable-historical-logical-document-declared-by-pinned-pragma-checksum';
      witnesses = directiveWitnesses(role, document);
    }
    let selected = null;
    if (bytes) {
      assert.equal(checksum(bytes, document.algorithm), document.checksum, `Actual raw PDB document ${document.name}`);
      if (embedded.has(index)) assert(embedded.get(index).bytes.equals(bytes), 'EmbeddedSource agrees with retained actual document bytes');
      selected = `selected/documents/${sha(bytes)}.source`;
      write(selected, bytes);
      if (role !== 'common') {
        const repo = graphs[`${role}Path`];
        if (document.name.toLowerCase().startsWith(repo.toLowerCase() + '\\'))
          source = pinned(role, document.name.slice(repo.length + 1), bytes);
      }
    }
    documentIndices.push(documents.length);
    documents.push({ role, kind, assembly: name, pair: pairs.length, index, ...document,
      sourceKind, selected, bytes: bytes?.length ?? null, sha256: bytes ? sha(bytes) : null,
      immutableSource: source, directiveWitnesses: witnesses,
      boundary: bytes ? null : 'This is a user-authored logical debug Document from checked-in precompiled C# checksum directives, not a file read by this csc build. Original D:\\k source bytes are not retained, reconstructed or claimed checksum-verified. All actual selected checked-in C# inputs and their PDB checksums are retained.' });
  }
  pairs.push({ role, kind, name, image, pdb, imageSource, pdbSource, imageSha256: sha(imageBytes), pdbSha256: sha(pdbBytes),
    imageBytes: imageBytes.length, pdbBytes: pdbBytes.length, mvid: metadata.mvid, codeviews: metadata.codeviews,
    guid: debug.guid, stamp: debug.stamp, documentIndices });
}
const nativeNames = [
  'Microsoft.AspNetCore.Mvc.Core', 'Microsoft.AspNetCore.Mvc.Razor', 'Microsoft.AspNetCore.Mvc.ViewFeatures',
  'Microsoft.AspNetCore.Mvc', 'Microsoft.AspNetCore.Routing', 'Microsoft.AspNetCore.StaticAssets',
  'Microsoft.AspNetCore.Razor.Runtime', 'Microsoft.AspNetCore.Mvc.Core.Test', 'Microsoft.AspNetCore.Mvc.Razor.Test',
  'RazorBuildWebSite.Views'
];
const declarations = [];
for (const role of ['original', 'default']) {
  for (const name of nativeNames) {
    const directory = path.join(graphs[`${role}Path`], 'artifacts', 'bin', name, 'Release', 'net12.0');
    pair(role, 'unchanged-normal-native', name, path.join(directory, name + '.dll'), path.join(directory, name + '.pdb'), `selected/native/${role}`);
    for (const suffix of ['.deps.json', '.runtimeconfig.json', '.runtimeconfig.dev.json']) {
      const filename = name + suffix, file = path.join(directory, filename);
      if (!fs.existsSync(file)) continue;
      const bytes = fs.readFileSync(file), selected = `selected/native-declarations/${role}/${filename}`;
      write(selected, bytes);
      declarations.push({ role, assembly: name, source: file, selected, bytes: bytes.length, sha256: sha(bytes) });
    }
  }
}
const partial = JSON.parse(fs.readFileSync(path.join(root, 'compile-history', 'native-partial.json')));
for (const item of partial.history)
  pair(item.role, 'preserved-owner-success-in-failed-parent-build', 'Microsoft.AspNetCore.Mvc.Core', path.join(root, item.image), path.join(root, item.pdb),
    `selected/native-partial/${item.role}`, item.documents);
const commonName = 'AutoPerf.Mvc.Initialization.Contracts';
for (const label of ['common-compile-04', 'common-compile-05']) {
  const directory = path.join(root, 'consumer', 'compile-history', label);
  pair('common', label, commonName, path.join(directory, commonName + '.dll'), path.join(directory, commonName + '.pdb'),
    `selected/${label}`, null, path.join(directory, 'Program.cs'));
}
const additional = [];
for (const request of JSON.parse(fs.readFileSync(path.join(root, 'additional-source-requests.json'))))
  additional.push(pinned(request.role, request.source));
for (const role of ['original', 'default'])
  additional.push(pinned(role, 'src/Components/Components/src/ResourceAssetCollection.cs'));
json('additional-source-records.json', { records: additional, boundary: 'Exact pinned additional public-producer/reference/prerequisite source; no new execution claim.' });
json('selected-records.json', {
  boundary: 'Actual selected native/common PE/PDB bytes. Every PDB Document is parsed and listed. All present/generated/embedded actual raw documents are retained and checksum-checked; exactly three historical D:\\k Razor logical documents per role have pinned C# checksum-directive witnesses but no original raw bytes. This is not a full native/toolchain/runtime source closure.',
  pairs, documents, declarations, immutableSources: [...immutable.values()],
  logicalOnlyDocuments: documents.filter(document => !document.selected).map(document => ({ role: document.role, assembly: document.assembly, index: document.index, name: document.name, checksum: document.checksum }))
});
const supplementary = { staticAssets: {}, javascript: {} }, unions = {}, differences = {};
for (const role of ['original', 'default']) {
  supplementary.staticAssets[role] = describe(path.join(graphs[`${role}Path`], 'artifacts', 'bin', 'Microsoft.AspNetCore.StaticAssets', 'Release', 'net12.0'), { role });
  supplementary.javascript[role] = describe(path.join(graphs[`${role}Path`], 'src', 'Components', 'Web.JS', 'dist'), { role });
}
for (const [kind, images] of Object.entries(supplementary)) {
  unions[kind] = union(images.original.files, images.default.files);
  differences[kind] = unions[kind].filter(file => file.relation !== 'same');
}
json('supplemental-native-images.json', { boundary: 'Full all-file native StaticAssets output and actual role-own JavaScript prerequisite dist; no prefix/extension exclusions. StaticAssets is explicitly loaded from its own unchanged normal build because native Razor.Test.deps does not declare this transitive PrivateAssets dependency. No native deps/runtimeconfig was modified.', images: supplementary, unions, differences });
const failedPreparation = describe(path.join(root, 'consumer', 'precompile-inputs-attempt01'));
const accepted = describe(path.join(root, 'consumer', 'accepted')), copies = {};
for (const role of ['original', 'default']) {
  copies[role] = JSON.parse(fs.readFileSync(path.join(root, 'consumer', `${role}-copies.json`)));
  assert.equal(copies[role].files.length, accepted.files.length);
  for (const file of copies[role].files) {
    const actual = fs.readFileSync(file.destination);
    assert.equal(sha(actual), file.sha256);
    assert.equal(file.sha256, accepted.files.find(item => item.path === file.name).sha256);
  }
}
json('common-images.json', { boundary: 'Every accepted common file and both actual native-output copies, plus every preserved failed input-preparation file. One accepted compile05 artifact is reused unchanged on both roles; superseded successful compile04 and failed/pre-native attempts remain selected separately.', accepted, copies, union: union(copies.original.files.map(file => ({ ...file, path: file.name })), copies.default.files.map(file => ({ ...file, path: file.name }))), failedPreparation });
console.log(JSON.stringify({ pairs: pairs.length, documentRecords: documents.length, logicalOnlyDocuments: documents.filter(document => !document.selected).length,
  immutableSources: immutable.size, nativeDeclarationFiles: declarations.length, acceptedCommonFiles: accepted.count }));
