import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, sha256, requireThat, same } from './Checks.mjs';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const state = readJson(path.join(root, 'research', 'consumer-images.json'));
for (const image of state.images) {
  for (const file of image.finalInventory) {
    const bytes = fs.readFileSync(path.join(image.destination, file.path));
    requireThat(bytes.length === file.bytes && sha256(bytes) === file.sha256, `Prior image changed before refresh: ${file.path}`);
  }
  image.priorCompanions = image.companions;
  image.cohort = 2;
  image.companions = image.companions.map(file => {
    const bytes = fs.readFileSync(path.join(root, 'testassets', 'PreparationConsumer', 'bin', file.path));
    fs.writeFileSync(path.join(image.destination, file.path), bytes);
    const record = { path: file.path, bytes: bytes.length, sha256: sha256(bytes) };
    const slot = image.finalInventory.findIndex(item => item.path === file.path);
    requireThat(slot >= 0, 'Prior companion absent from inventory');
    image.finalInventory[slot] = record;
    return record;
  });
  image.bytes = image.finalInventory.reduce((sum, item) => sum + item.bytes, 0);
}
same(state.images[0].companions, state.images[1].companions, 'Accepted common companions must remain byte-identical across roles');
fs.writeFileSync(path.join(root, 'research', 'consumer-images.json'), JSON.stringify(state, null, 2) + '\n');
console.log(JSON.stringify({ result: 'PASS', cohort: 2, commonCompanionsByteIdentical: true, otherwiseImagesUnchanged: true }));
