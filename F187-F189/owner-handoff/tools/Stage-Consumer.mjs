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
const inputs = json(path.join(root, 'research', 'consumer-inputs.json'));
const walk = (directory, prefix = '') => fs.readdirSync(path.join(directory, prefix), { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? walk(directory, path.join(prefix, entry.name)) : [path.join(prefix, entry.name)]);
const images = [];
for (const role of [
  { role: 'original', checkout: 'C:\\src\\ap-F187-o038' },
  { role: 'default', checkout: 'C:\\src\\ap-F187-d038' }
]) {
  const native = name => path.join(role.checkout, 'artifacts', 'bin', name, 'Release', 'net12.0');
  const functional = native(functionalName), supplemental = native(runtimeName);
  const destination = path.join(root, 'images', role.role);
  if (fs.existsSync(destination)) throw Error(`Image already exists: ${destination}`);
  fs.mkdirSync(destination, { recursive: true });
  const origins = [], overlaps = [], additions = [], frameworkProvided = [], dependencyChecks = [];
  const copy = (origin, relative, kind) => {
    const bytes = fs.readFileSync(origin), output = path.join(destination, relative);
    if (fs.existsSync(output)) {
      if (!fs.readFileSync(output).equals(bytes)) throw Error(`Unexpected write collision: ${relative}`);
      return;
    }
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, bytes);
    origins.push({ kind, origin, path: relative.replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) });
  };
  for (const relative of walk(functional).sort()) copy(path.join(functional, relative), relative, 'exact-successful-native-Functional-output');
  const dependencySources = [functionalName, runtimeName].map(name => {
    const filename = path.join(native(name), name + '.deps.json');
    return { name, filename, bytes: fs.statSync(filename).size, sha256: sha(fs.readFileSync(filename)) };
  });
  const merged = json(dependencySources[0].filename), other = json(dependencySources[1].filename);
  const target = merged.runtimeTarget.name;
  if (other.runtimeTarget.name !== target) throw Error('Normal target frameworks differ');
  const sourceLibraries = other.targets[target];
  const runtimeConfig = path.join(destination, functionalName + '.runtimeconfig.json');
  const frameworkVersion = json(runtimeConfig).runtimeOptions.framework.version;
  const framework = path.join(role.checkout, '.dotnet', 'shared', 'Microsoft.NETCore.App', frameworkVersion);
  const adding = new Set();
  const addLibrary = key => {
    if (merged.libraries[key]) return;
    if (adding.has(key)) throw Error(`Unexpected helper dependency cycle: ${key}`);
    const slash = key.lastIndexOf('/'), name = key.slice(0, slash);
    const selectedVersions = Object.keys(merged.libraries).filter(existing => existing.startsWith(name + '/'));
    if (selectedVersions.length) throw Error(`Required helper conflicts with actual Functional selection: ${key}`);
    const value = sourceLibraries[key], library = other.libraries[key];
    if (!value || !library) throw Error(`Required helper library absent: ${key}`);
    adding.add(key);
    for (const [dependency, version] of Object.entries(value.dependencies ?? {})) {
      const dependencyKey = dependency + '/' + version;
      dependencyChecks.push({ owner: key, dependencyKey, alreadyInFunctional: !!merged.libraries[dependencyKey] });
      addLibrary(dependencyKey);
    }
    for (const relative of Object.keys(value.runtime ?? {})) {
      const filename = path.basename(relative);
      copy(path.join(supplemental, filename), filename, 'minimal-absent-helper-runtime');
      const pdb = filename.replace(/\.dll$/i, '.pdb');
      if (pdb !== filename && fs.existsSync(path.join(supplemental, pdb))) copy(path.join(supplemental, pdb), pdb, 'minimal-absent-helper-pdb');
    }
    if (value.native || value.runtimeTargets || value.resources) throw Error(`Unexpected nontrivial helper runtime assets require explicit handling: ${key}`);
    merged.libraries[key] = library;
    merged.targets[target][key] = value;
    adding.delete(key);
    additions.push(key);
  };
  for (const choice of inputs.referenceChoices) {
    const name = choice.name, actual = path.join(destination, name), secondary = path.join(supplemental, name);
    if (fs.existsSync(actual)) {
      if (fs.existsSync(secondary)) {
        const selectedHash = sha(fs.readFileSync(actual)), earlierHash = sha(fs.readFileSync(secondary));
        if (selectedHash !== earlierHash) overlaps.push({ name, selected: actual, earlierNative: secondary, selectedSha256: selectedHash, earlierSha256: earlierHash, policy: 'Exact successful Functional image remains selected; earlier native cohort is not equated.' });
      }
      continue;
    }
    const normalFramework = path.join(framework, name);
    if (fs.existsSync(normalFramework)) {
      frameworkProvided.push({ name, path: normalFramework, sha256: sha(fs.readFileSync(normalFramework)) });
      continue;
    }
    const keys = Object.entries(sourceLibraries).filter(([, value]) => Object.keys(value.runtime ?? {}).some(relative => path.basename(relative) === name)).map(([key]) => key);
    if (keys.length !== 1) throw Error(`Actual absent direct helper owner cannot be resolved uniquely: ${name}`);
    addLibrary(keys[0]);
    if (!fs.existsSync(actual)) throw Error(`Declared helper not staged: ${name}`);
  }
  const commonKey = commonName + '/1.0.0';
  merged.libraries[commonKey] = { type: 'project', serviceable: false, sha512: '' };
  merged.targets[target][commonKey] = {
    dependencies: Object.fromEntries(additions.map(key => [key.slice(0, key.lastIndexOf('/')), key.slice(key.lastIndexOf('/') + 1)])),
    runtime: { [commonName + '.dll']: {} }
  };
  const mergedPath = path.join(destination, 'consumerGraph.deps.json');
  fs.writeFileSync(mergedPath, JSON.stringify(merged, null, 2) + '\n');
  const companions = [];
  for (const extension of ['dll', 'pdb', 'deps.json', 'runtimeconfig.json']) {
    const name = commonName + '.' + extension, bytes = fs.readFileSync(path.join(common, name));
    fs.writeFileSync(path.join(destination, name), bytes);
    companions.push({ path: name, bytes: bytes.length, sha256: sha(bytes) });
  }
  const finalInventory = walk(destination).sort().map(relative => {
    const bytes = fs.readFileSync(path.join(destination, relative));
    return { path: relative.replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) };
  });
  images.push({
    ...role, destination,
    boundary: 'Exact successful same-role native Functional output/dependency selection, augmented only with absent direct common helper owners and their conflict-free minimal dependency closure, plus one byte-identical common. Earlier native RuntimeCompilation graphs remain separate evidence, not a fully merged dependency graph or performance pair.',
    origins, overlaps, additions, frameworkProvided, dependencyChecks, dependencySources,
    mergedDeps: { path: mergedPath, sha256: sha(fs.readFileSync(mergedPath)), libraries: Object.keys(merged.libraries).length },
    runtimeConfig, frameworkVersion, companions, finalInventory,
    files: finalInventory.length, bytes: finalInventory.reduce((sum, item) => sum + item.bytes, 0)
  });
}
if (JSON.stringify(images[0].companions) !== JSON.stringify(images[1].companions)) throw Error('Common companions differ across roles');
fs.writeFileSync(path.join(root, 'research', 'consumer-images.json'), JSON.stringify({ images }, null, 2) + '\n');
console.log(JSON.stringify({ result: 'PASS', images: images.map(image => ({ role: image.role, files: image.files, bytes: image.bytes, differingBinaryOverlaps: image.overlaps.length, additions: image.additions })), commonCompanionsByteIdentical: true }));
