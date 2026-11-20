const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = __dirname;
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const copiesFile = path.join(root, 'evidence', 'input-copies.json');
const copies = JSON.parse(fs.readFileSync(copiesFile));
for (const variant of ['original', 'default']) {
  const stage = variant === 'original' ? 'runtime-003' : 'runtime-default-004';
  const accepted = JSON.parse(fs.readFileSync(path.join(root, 'evidence', `${stage}-F134.json`))).sourceOwnerPePdbAndSource;
  const document = accepted.matchingSourceDocuments.find(x => x.name.replaceAll('\\', '/').endsWith('/src/Hosting/TestHost/src/WebSocketClient.cs'));
  if (!document || !document.matched || !accepted.pdbGuidMatchesOwningPe) throw Error(`Missing accepted owner/source proof ${variant}`);
  const folder = path.join(root, 'inputs', variant);
  for (const [from, file, expected] of [
    [accepted.sourcePdb, 'owner.pdb', accepted.pdbSha256],
    [document.name, 'owner-source.cs', document.actualPhysicalHash]
  ]) {
    const to = path.join(folder, file);
    if (fs.existsSync(to)) throw Error(`Refusing to overwrite ${to}`);
    fs.copyFileSync(from, to);
    if (hash(to) !== expected.toLowerCase()) throw Error(`Accepted owner proof input changed ${from}`);
    copies.push({ from, to: path.relative(root, to), sha256: hash(to), bytes: fs.statSync(to).size });
  }
  const payloadPath = path.join(folder, 'payload.json');
  const payload = JSON.parse(fs.readFileSync(payloadPath));
  Object.assign(payload, {
    ownerPdbPath: path.join(folder, 'owner.pdb'),
    ownerSourcePath: path.join(folder, 'owner-source.cs'),
    ownerPeSha256: accepted.owningPeSha256,
    ownerPdbSha256: accepted.pdbSha256,
    ownerSourceSha256: document.actualPhysicalHash
  });
  fs.writeFileSync(payloadPath, JSON.stringify(payload, null, 2) + '\n');
}
fs.writeFileSync(copiesFile, JSON.stringify(copies, null, 2) + '\n');
console.log('Copied accepted portable-PDB and physical source proof inputs for both variants.');
