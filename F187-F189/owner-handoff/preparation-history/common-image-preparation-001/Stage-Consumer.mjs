import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const json = filename => JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, ''));
const runtimeName = 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test';
const functionalName = 'Microsoft.AspNetCore.Mvc.FunctionalTests';
const commonName = 'AutoPerf.Mvc.HelperPreparation';
const common = path.join(root, 'testassets', 'PreparationConsumer', 'bin');
const roles = [
  { role: 'original', checkout: 'C:\\src\\ap-F187-o038' },
  { role: 'default', checkout: 'C:\\src\\ap-F187-d038' }
];
const walk = (directory, prefix = '') => fs.readdirSync(path.join(directory, prefix), { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? walk(directory, path.join(prefix, entry.name)) : [path.join(prefix, entry.name)]);
const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])])) : value;
const equal = (left, right) => JSON.stringify(ordered(left)) === JSON.stringify(ordered(right));
const images = [];
for (const role of roles) {
  const sources = [functionalName, runtimeName].map(name => ({
    name,
    directory: path.join(role.checkout, 'artifacts', 'bin', name, 'Release', 'net12.0')
  }));
  const destination = path.join(root, 'images', role.role);
  if (fs.existsSync(destination)) throw Error(`Image already exists: ${destination}`);
  fs.mkdirSync(destination, { recursive: true });
  const collisions = [], origins = [], inventory = new Map();
  for (const source of sources) {
    for (const relative of walk(source.directory).sort()) {
      const origin = path.join(source.directory, relative), bytes = fs.readFileSync(origin);
      const digest = sha(bytes);
      origins.push({ source: source.name, path: relative.replaceAll('\\', '/'), bytes: bytes.length, sha256: digest });
      if (inventory.has(relative)) {
        const prior = inventory.get(relative);
        if (prior.sha256 !== digest) {
          collisions.push({ path: relative.replaceAll('\\', '/'), retainedSource: prior.origin, otherSource: origin, retainedSha256: prior.sha256, otherSha256: digest, binary: /\.(dll|pdb|exe)$/i.test(relative), policy: 'Successful native Functional graph is the explicit primary for every overlap. Earlier native RuntimeCompilation images are a separate retained cohort; no byte equivalence is inferred.' });
        }
        continue;
      }
      const output = path.join(destination, relative);
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, bytes);
      inventory.set(relative, { path: relative.replaceAll('\\', '/'), origin, bytes: bytes.length, sha256: digest });
    }
  }
  const dependencySources = sources.map(source => ({
    name: source.name,
    filename: path.join(source.directory, source.name + '.deps.json'),
    value: json(path.join(source.directory, source.name + '.deps.json'))
  }));
  const merged = structuredClone(dependencySources[0].value);
  for (const dependency of dependencySources.slice(1)) {
    if (!equal(merged.runtimeTarget, dependency.value.runtimeTarget)) throw Error('Same-role runtime target mismatch');
    for (const [name, value] of Object.entries(dependency.value.libraries)) {
      if (merged.libraries[name] && !equal(merged.libraries[name], value)) throw Error(`Same-role dependency library metadata collision: ${name}`);
      merged.libraries[name] ??= value;
    }
    for (const [target, libraries] of Object.entries(dependency.value.targets)) {
      merged.targets[target] ??= {};
      for (const [name, value] of Object.entries(libraries)) {
        if (merged.targets[target][name] && !equal(merged.targets[target][name], value)) throw Error(`Same-role dependency target collision: ${name}`);
        merged.targets[target][name] ??= value;
      }
    }
  }
  const target = merged.runtimeTarget.name;
  const commonKey = commonName + '/1.0.0';
  merged.libraries[commonKey] = { type: 'project', serviceable: false, sha512: '' };
  merged.targets[target][commonKey] = { runtime: { [commonName + '.dll']: {} } };
  const mergedPath = path.join(destination, 'consumerGraph.deps.json');
  fs.writeFileSync(mergedPath, JSON.stringify(merged, null, 2) + '\n');
  const companions = [];
  for (const extension of ['dll', 'pdb', 'deps.json', 'runtimeconfig.json']) {
    const name = commonName + '.' + extension;
    const bytes = fs.readFileSync(path.join(common, name));
    fs.writeFileSync(path.join(destination, name), bytes);
    companions.push({ path: name, bytes: bytes.length, sha256: sha(bytes) });
  }
  const finalInventory = walk(destination).sort().map(relative => {
    const bytes = fs.readFileSync(path.join(destination, relative));
    return { path: relative.replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) };
  });
  images.push({
    ...role,
    destination,
    boundary: 'Private same-role union of the two actual source-built native outputs plus one byte-identical common consumer; not a controlled performance pair or stock shared-framework deployment.',
    origins,
    collisions,
    nativeUnion: [...inventory.values()],
    dependencySources: dependencySources.map(({ value, ...record }) => ({ ...record, bytes: fs.statSync(record.filename).size, sha256: sha(fs.readFileSync(record.filename)) })),
    mergedDeps: { path: mergedPath, sha256: sha(fs.readFileSync(mergedPath)), libraries: Object.keys(merged.libraries).length },
    runtimeConfig: path.join(destination, functionalName + '.runtimeconfig.json'),
    companions,
    finalInventory,
    files: finalInventory.length,
    bytes: finalInventory.reduce((sum, item) => sum + item.bytes, 0)
  });
}
if (!equal(images[0].companions, images[1].companions)) throw Error('Common companions are not byte-identical across roles');
fs.writeFileSync(path.join(root, 'research', 'consumer-images.json'), JSON.stringify({ images }, null, 2) + '\n');
console.log(JSON.stringify({ result: 'PASS', images: images.map(image => ({ role: image.role, files: image.files, bytes: image.bytes, differingNonbinaryCollisions: image.collisions.length })), commonCompanionsByteIdentical: true }));
