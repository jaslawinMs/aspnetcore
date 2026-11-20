'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = __dirname;
const graphs = JSON.parse(fs.readFileSync(path.join(root, 'graph-creation.json')));
const hash = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const copies = [];
for (const role of ['original', 'default']) {
  const directory = path.join(graphs[`${role}Path`], 'artifacts', 'bin', 'Microsoft.AspNetCore.Identity.InMemory.Test', 'Release', 'net12.0');
  for (const suffix of ['dll', 'pdb', 'deps.json', 'runtimeconfig.json']) {
    const source = `consumer/accepted/AutoPerf.Identity.Contracts.${suffix}`;
    const bytes = fs.readFileSync(path.join(root, source));
    const destination = path.join(directory, path.basename(source));
    assert(!fs.existsSync(destination), `Do not overwrite ${destination}`);
    fs.writeFileSync(destination, bytes);
    assert.equal(hash(fs.readFileSync(destination)), hash(bytes));
    copies.push({ role, source, destination, bytes: bytes.length, sha256: hash(bytes) });
  }
}
fs.writeFileSync(path.join(root, 'consumer', 'copies.json'), JSON.stringify({
  compiledAcceptedDllCount: 1,
  byteIdenticalFourFileImages: true,
  files: copies,
  execution: 'Each role uses its native owner deps and runtimeconfig explicitly with dotnet exec. Common deps/runtimeconfig bytes are unchanged but overridden, not mislabeled as normal Default config.'
}, null, 2) + '\n');
console.log(JSON.stringify({ copiedFiles: copies.length }));
