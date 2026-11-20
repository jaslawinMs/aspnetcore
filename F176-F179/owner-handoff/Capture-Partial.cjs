'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { pe, portablePdb } = require('./Metadata.cjs');
const { embeddedSources } = require('./PdbEmbedded.cjs');
const root = __dirname, graphs = JSON.parse(fs.readFileSync(path.join(root, 'graph-creation.json')));
const sha = (bytes, algorithm = 'sha256') => crypto.createHash(algorithm).update(bytes).digest('hex').toUpperCase();
function write(name, bytes) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  assert(!fs.existsSync(file));
  fs.writeFileSync(file, bytes);
}
const history = [];
for (const role of ['original', 'default']) {
  const directory = path.join(graphs[`${role}Path`], 'artifacts', 'bin', 'Microsoft.AspNetCore.Mvc.Core', 'Release', 'net12.0');
  const stem = path.join(directory, 'Microsoft.AspNetCore.Mvc.Core');
  const target = `compile-history/native-partial/${role}/Microsoft.AspNetCore.Mvc.Core`;
  const image = fs.readFileSync(stem + '.dll'), pdbBytes = fs.readFileSync(stem + '.pdb');
  write(target + '.dll', image); write(target + '.pdb', pdbBytes);
  const parsed = pe(image), pdb = portablePdb(pdbBytes), embedded = embeddedSources(pdbBytes), documents = [];
  assert(parsed.codeviews.some(codeview => codeview.guid === pdb.guid && codeview.stamp === pdb.stamp && codeview.age === 1));
  for (const [index, document] of pdb.documents.entries()) {
    const kind = fs.existsSync(document.name) ? 'existing-raw-compiler-document' : 'portable-pdb-embedded-source';
    const bytes = kind === 'existing-raw-compiler-document' ? fs.readFileSync(document.name) : embedded.get(index)?.bytes;
    assert(bytes, `Actual raw document available: ${document.name}`);
    const algorithm = document.algorithm === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256' : 'sha1';
    assert.equal(sha(bytes, algorithm), document.checksum);
    const selected = `compile-history/documents/${sha(bytes)}.source`;
    if (!fs.existsSync(path.join(root, selected))) write(selected, bytes);
    documents.push({ ...document, documentIndex: index, selected, bytes: bytes.length, sha256: sha(bytes), kind });
  }
  history.push({ role, commit: graphs[`${role}Commit`], invocation: `${role}-core-build`, outcome: 'Parent build failed on missing JS/ANCM after this selected owner successfully compiled',
    image: target + '.dll', pdb: target + '.pdb', sourceStem: stem, imageSha256: sha(image), pdbSha256: sha(pdbBytes),
    mvid: parsed.mvid, codeviews: parsed.codeviews, guid: pdb.guid, stamp: pdb.stamp, documents });
}
write('compile-history/native-partial.json', JSON.stringify({ boundary: 'Actual selected owner success within each retained failed normal build, preserved before repair. All 538 documents per owner retained, including actual logger-generator EmbeddedSource bytes. Not all transient dependency/toolchain bytes.', history }, null, 2) + '\n');
console.log(JSON.stringify(history.map(item => ({ role: item.role, documents: item.documents.length, imageSha256: item.imageSha256 }))));
