import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const runRoot = path.join(session, 'autoperf-runs', 'F043');
const root = String.raw`C:\src\aspnetcore`;
const defaultRoot = String.raw`C:\src\autoperf-F042-default`;
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const defaultHead = 'c5baf473f31fa3bbe9f8201e3411361c632f3a91';
const mode = process.argv[2];
const variants = {
  Original: { suffix: 'original', root, head: baseline },
  Default: { suffix: 'current-default', root: defaultRoot, head: defaultHead },
  Candidate: { suffix: 'candidate', root, head: baseline }
};
function require(condition, message) {
  if (!condition) throw new Error(message);
}
function sha(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
}
function canonical(bytes) {
  return Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n'));
}
function git(args, cwd = root) {
  const result = spawnSync('git', ['-c', 'core.longpaths=true', ...args], { cwd, encoding: null, windowsHide: true });
  require(result.status === 0, `Git failed: ${args.join(' ')}`);
  return result.stdout;
}
function files(directory, relative = '') {
  return fs.readdirSync(path.join(directory, relative), { withFileTypes: true })
    .flatMap(entry => {
      const next = path.join(relative, entry.name);
      require(!entry.isSymbolicLink(), 'Do not traverse image/source symlinks.');
      return entry.isDirectory() ? files(directory, next) : [next];
    }).sort();
}
function write(filename, value) {
  fs.writeFileSync(path.join(runRoot, filename), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
require(Object.hasOwn(variants, mode ?? ''), 'Usage: F043-freeze.mjs Original|Default|Candidate');
const variant = variants[mode];
const budget = JSON.parse(fs.readFileSync(path.join(runRoot, 'diagnostic-budget.json'), 'utf8'));
require(budget.consumed === 0 && !budget.closed, 'Freeze all images before any timed comparison.');
require(git(['rev-parse', 'HEAD'], variant.root).toString().trim() === variant.head, 'Unexpected source revision.');
const suffix = variant.suffix;
const destination = path.join(runRoot, 'consumer-' + suffix);
const sourceDestination = path.join(runRoot, 'source-files-' + suffix);
const closureName = 'consumer-' + suffix + '-closure.json';
const sourceManifestName = 'source-inputs-' + suffix + '.json';
require(!fs.existsSync(destination) && !fs.existsSync(sourceDestination)
  && !fs.existsSync(path.join(runRoot, closureName)) && !fs.existsSync(path.join(runRoot, sourceManifestName)),
  'Never overwrite a historical frozen image or source manifest.');
const commonOutput = path.join(runRoot, 'harness', 'bin', 'Release', 'net12.0');
require(fs.existsSync(path.join(commonOutput, 'AutoPerf.Benchmarks.dll')), 'Build the actual common Razor harness first.');
const originals = mode === 'Candidate'
  ? path.join(runRoot, 'consumer-original') : commonOutput;
require(fs.existsSync(originals), 'Freeze the original first.');
fs.cpSync(originals, destination, { recursive: true, errorOnExist: true, force: false });
const replacements = [];
for (const relative of files(destination)) {
  if (path.dirname(relative) !== '.' || !/\.(dll|pdb)$/i.test(relative)) continue;
  const assembly = path.basename(relative, path.extname(relative));
  if (mode === 'Candidate' && assembly !== 'Microsoft.AspNetCore.Mvc.Razor') continue;
  const actual = path.join(variant.root, 'artifacts', 'bin', assembly, 'Release', 'net12.0', path.basename(relative));
  if (!fs.existsSync(actual)) continue;
  const before = sha(fs.readFileSync(path.join(destination, relative)));
  const bytes = fs.readFileSync(actual);
  fs.writeFileSync(path.join(destination, relative), bytes);
  replacements.push({ path: relative.replaceAll('\\', '/'), actualProjectOutput: actual,
    previousSha256: before, sha256: sha(bytes), bytes: bytes.length });
}
const critical = [
  'Microsoft.AspNetCore.Mvc.Razor', 'Microsoft.AspNetCore.Mvc.Core', 'Microsoft.AspNetCore.Mvc.ViewFeatures',
  'Microsoft.AspNetCore.Http', 'Microsoft.AspNetCore.Http.Abstractions',
  'Microsoft.AspNetCore.Razor', 'Microsoft.AspNetCore.Razor.Runtime'
];
const requiredBindings = mode === 'Candidate' ? ['Microsoft.AspNetCore.Mvc.Razor'] : critical;
for (const name of requiredBindings) {
  require(replacements.some(item => item.path === name + '.dll')
    && replacements.some(item => item.path === name + '.pdb'), `Missing actual source-built critical DLL/PDB: ${name}`);
}
const intake = JSON.parse(fs.readFileSync(path.join(runRoot, 'intake-source-inputs.json'), 'utf8'));
const sourceFiles = [];
for (const selected of intake.sourceFiles) {
  const bytes = fs.readFileSync(path.join(variant.root, selected.path));
  const logical = selected.path.replaceAll('\\', '/');
  if (mode === 'Default' || (mode === 'Original' && !selected.path.endsWith('\\test\\RazorPageTest.cs'))) {
    const expected = git(['show', `${variant.head}:${logical}`], variant.root);
    require(sha(canonical(bytes)) === sha(canonical(expected)), `Unexpected source edit: ${logical}`);
  }
  const target = path.join(sourceDestination, selected.path);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes, { flag: 'wx' });
  sourceFiles.push({ path: selected.path, sha256: sha(bytes), bytes: bytes.length,
    pdbDocumentRequired: selected.pdbDocumentRequired });
}
if (mode === 'Candidate') {
  const originalSources = JSON.parse(fs.readFileSync(path.join(runRoot, 'source-inputs-original.json'), 'utf8')).sourceFiles;
  const changed = sourceFiles.filter(item => item.sha256 !== originalSources.find(before => before.path === item.path)?.sha256);
  require(changed.length === 1 && changed[0].path.endsWith('\\src\\RazorPage.cs'), 'Candidate must change exactly the selected shipping owner, not the common tests or producer.');
}
write(sourceManifestName, {
  candidate: 'F043', variant: mode, observedSourceRoot: variant.root, observedHead: variant.head,
  copiedAt: new Date().toISOString(), selectedExecutableDocuments: 3,
  completeCompilerProvenanceClaimed: false,
  testSnapshotRole: mode === 'Default' ? 'Unmodified current-default test source, not a test execution claim.'
    : 'Baseline plus focused green/green preservation coverage; test source is not an owner PDB document.',
  sourceFiles
});
const inventory = files(destination).map(relative => {
  const bytes = fs.readFileSync(path.join(destination, relative));
  return { path: relative.replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) };
});
let pairedIdentity = null;
if (mode === 'Candidate') {
  const original = JSON.parse(fs.readFileSync(path.join(runRoot, 'consumer-original-closure.json'), 'utf8')).files;
  require(inventory.length === original.length && inventory.every(item => original.some(before => before.path === item.path)), 'Paired image entry inventories differ.');
  const differences = inventory.filter(item => item.sha256 !== original.find(before => before.path === item.path).sha256);
  require(differences.length === 2 && differences.every(item => ['Microsoft.AspNetCore.Mvc.Razor.dll', 'Microsoft.AspNetCore.Mvc.Razor.pdb'].includes(item.path)),
    'Only the actual shipping owner DLL/PDB may differ across compared images.');
  pairedIdentity = { differingFiles: differences.map(item => item.path), identicalEntries: inventory.length - differences.length,
    actualHarnessDllAndPdbIdentical: true };
}
write(closureName, {
  candidate: 'F043', variant: mode, createdAt: new Date().toISOString(), completePhysicalImage: true,
  imageDirectory: destination, sourceBuiltProjectBindings: replacements, pairedIdentity, files: inventory
});
const harness = path.join(runRoot, 'harness');
const authored = files(harness).filter(relative => !relative.startsWith('obj' + path.sep) && !relative.startsWith('bin' + path.sep))
  .map(relative => ({ path: relative, sha256: sha(fs.readFileSync(path.join(harness, relative))) }));
require(authored.length === 13, 'Require the exact seven-file common project plus six compiler fixtures.');
write('freeze-' + suffix + '.json', {
  candidate: 'F043', variant: mode, completedAt: new Date().toISOString(),
  imageEntries: inventory.length, actualProjectBindings: replacements.length,
  sourceInputs: sourceFiles.length, authoredHarnessFiles: authored,
  closureSha256: sha(fs.readFileSync(path.join(runRoot, closureName))),
  sourceManifestSha256: sha(fs.readFileSync(path.join(runRoot, sourceManifestName))),
  pairedIdentity, timingConsumed: budget.consumed,
  boundary: 'Actual selected managed Razor owner/producer build and complete observed image; JS/static asset, native IIS, whole-repository and complete compiler-provenance claims excluded.'
});
console.log(JSON.stringify({ variant: mode, imageEntries: inventory.length, actualProjectBindings: replacements.length,
  sourceInputs: sourceFiles.length, authoredHarnessFiles: authored.length, pairedIdentity, timingConsumed: budget.consumed }, null, 2));
