const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = __dirname;
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const receipt = JSON.parse(fs.readFileSync(path.join(root, 'evidence', 'input-copies.json')));
for (const file of receipt) {
  if (hash(file.from) !== file.sha256 || hash(path.join(root, file.to)) !== file.sha256) throw Error(`Immutable input changed: ${file.from}`);
}
const result = {
  recordedUtc: new Date().toISOString(),
  copiedInputCount: receipt.length,
  archivedInputsStillMatch: true,
  copiedInputsStillMatch: true,
  inputFilesMutated: 0,
  boundary: 'Hashes cover every copied input in input-copies.json. The complete worker-a archive is not re-inventoried or changed.'
};
if (process.argv[2]) fs.writeFileSync(path.resolve(root, process.argv[2]), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
