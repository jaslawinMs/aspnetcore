import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F022');
const label = process.argv[2];
if (!/^[a-z0-9-]+$/.test(label ?? '')) throw new Error('Provide one explicit fresh capsule label.');
const root = String.raw`C:\src\aspnetcore`;
const capsule = path.join(run, 'prepared', label);
if (fs.existsSync(capsule)) throw new Error('Do not overwrite a prepared native consumer/source closure.');
const buildLabel = process.argv[3] ?? label;
if (!/^[a-z0-9-]+$/.test(buildLabel)) throw new Error('Provide the actual fresh harness build label.');
const actualBuild = JSON.parse(fs.readFileSync(path.join(run, 'validation', 'build-harness-' + buildLabel, 'build.invocation.json')));
if (actualBuild.actualExitCode !== 0) throw new Error('A failed harness build is not a prepared closure.');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const output = path.join(run, 'harness', 'bin', 'Release', 'net12.0');
const ownerName = 'Microsoft.AspNetCore.Mvc.ViewFeatures';
const product = path.join(root, 'src', 'Mvc', 'Mvc.ViewFeatures', 'src');
const sources = ['ExpressionHelper.cs', 'ModelExpressionProvider.cs', 'ExpressionMetadataProvider.cs',
  'CachedExpressionCompiler.cs', 'LambdaExpressionComparer.cs', 'ModelExplorer.cs'];
const harnessNames = ['Program.cs', 'ExpressionFixture.cs', 'ExpressionBenchmarks.cs', 'FirstUse.cs',
  'SettingsPreservingEmitToolchain.cs', 'AutoPerf.Benchmarks.csproj'];
const enumerate = directory => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? enumerate(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
const selected = JSON.parse(fs.readFileSync(path.join(run, 'validation', 'selected-callers', 'verified-result.json')));
if (hash(path.join(product, 'ExpressionHelper.cs')) !== selected.actualSourceSha256 ||
  hash(path.join(output, ownerName + '.dll')) !== selected.actualOwnerSha256) {
  throw new Error('Require the selected source and exact96-case-green actual consumer owner.');
}
fs.mkdirSync(capsule, { recursive: true });
const rows = enumerate(output).map(file => ({ path: path.relative(output, file), sha256: hash(file), length: fs.statSync(file).size }))
  .sort((a, b) => a.path.localeCompare(b.path));
const variants = {};
for (const variant of ['original', 'selected']) {
  const directory = path.join(capsule, variant);
  const ownerSources = path.join(directory, 'sources', 'owner');
  const harnessSources = path.join(directory, 'sources', 'harness');
  fs.mkdirSync(ownerSources, { recursive: true });
  fs.mkdirSync(harnessSources, { recursive: true });
  for (const name of sources) {
    const from = name === 'ExpressionHelper.cs'
      ? path.join(run, 'owner-snapshots', variant, name) : path.join(product, name);
    fs.copyFileSync(from, path.join(ownerSources, name));
  }
  for (const name of harnessNames) fs.copyFileSync(path.join(run, 'harness', name), path.join(harnessSources, name));
  const owners = ['dll', 'pdb'].map(extension => {
    const name = ownerName + '.' + extension;
    const source = path.join(run, 'owner-snapshots', variant, 'Release', name);
    return { name, source, sha256: hash(source), length: fs.statSync(source).size };
  });
  const files = rows.map(row => {
    const replacement = owners.find(owner => owner.name === row.path);
    return replacement ? { path: row.path, sha256: replacement.sha256, length: replacement.length } : row;
  });
  const closurePath = path.join(directory, 'closure.json');
  fs.writeFileSync(closurePath, JSON.stringify({ candidate: 'F022', variant, files }, null, 2) + '\n');
  variants[variant] = { directory, sources: path.join(directory, 'sources'), closurePath,
    closureSha256: hash(closurePath), owners, sourceFiles: enumerate(path.join(directory, 'sources')).map(file =>
      ({ path: path.relative(directory, file), sha256: hash(file), length: fs.statSync(file).size })) };
}
const originalRows = JSON.parse(fs.readFileSync(variants.original.closurePath)).files;
const selectedRows = JSON.parse(fs.readFileSync(variants.selected.closurePath)).files;
const differences = originalRows.filter((row, index) => row.sha256 !== selectedRows[index].sha256).map(row => row.path).sort();
if (JSON.stringify(differences) !== JSON.stringify([ownerName + '.dll', ownerName + '.pdb'].sort())) {
  throw new Error('The one built harness closure differs beyond the actual owning DLL and PDB.');
}
const manifest = { candidate: 'F022', preparedAt: new Date().toISOString(), label, root, output,
  actualSourceHeadAtBuild: actualBuild.sourceHead,
  actualClosureFilesPerVariant: rows.length, actualOnlyClosureDifferences: differences,
  actualHarnessSha256: hash(path.join(output, 'AutoPerf.Benchmarks.dll')),
  variants, timingProfiles: 0 };
fs.writeFileSync(path.join(capsule, 'capsule.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(capsule, 'executed-prepare.mjs'));
console.log(JSON.stringify({ capsule, actualClosureFilesPerVariant: rows.length, actualOnlyClosureDifferences: differences,
  actualHarnessSha256: manifest.actualHarnessSha256 }, null, 2));
