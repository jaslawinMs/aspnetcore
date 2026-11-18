import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F040');
const variant = process.argv[2];
assert.ok(['original', 'candidate'].includes(variant));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const hash = file => sha(fs.readFileSync(file));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const plan = read(path.join(run, 'acceptance-plan.json'));
const context = read(path.join(run, 'context.json'));
const build = read(path.join(run, 'validation', 'HarnessBuild-original-1', 'command.json'));
assert.equal(build.actualExitCode, 0);
const originalBrowser = read(path.join(run, 'sample-original', 'browser-result.json'));
assert.equal(originalBrowser.actualPassed, true);
assert.equal(originalBrowser.actualStepCount, 8);
assert.equal(read(path.join(run, 'sample-original', 'stop-verification.json')).actualOwnedProcessesStopped, true);
const originalTests = read(path.join(run, 'validation', 'Tests-original-3', 'verified-result.json'));
assert.equal(originalTests.actualPassed, 73);
assert.equal(originalTests.actualSkipped, 0);
const ownerName = 'Microsoft.AspNetCore.Components.Endpoints';
const product = path.join(root, 'artifacts', 'bin', ownerName, 'Release', 'net12.0');
const testBin = path.join(root, 'artifacts', 'bin', ownerName + '.Tests', 'Release', 'net12.0');
const directory = path.join(run, `preparation-${variant}-001`);
assert.equal(fs.existsSync(directory), false);
const originalDirectory = path.join(run, 'preparation-original-001');
const original = variant === 'candidate' ? read(path.join(originalDirectory, 'preparation.json')) : null;
if (variant === 'candidate') {
  const tests = read(path.join(run, 'validation', 'Tests-candidate-1', 'verified-result.json'));
  assert.equal(tests.actualPassed, 73);
  assert.equal(tests.actualSkipped, 0);
}
const documents = [
  'TempData/TempData.cs',
  'TempData/TempDataProviderServiceCollectionExtensions.cs',
  'TempData/TempDataCascadingValueSupplier.cs',
  'DependencyInjection/TempDataService.cs',
  'TempData/CookieTempDataProvider.cs',
  'Results/RazorComponentResultExecutor.cs',
  'RazorComponentEndpointInvoker.cs',
  'Rendering/EndpointHtmlRenderer.cs',
  'Rendering/EndpointHtmlRenderer.Prerendering.cs',
  'DependencyInjection/RazorComponentsServiceCollectionExtensions.cs',
  'Results/RazorComponentResult.cs',
  'Results/RazorComponentResultOfT.cs',
];
const ownerRelative = 'src/Components/Endpoints/src/TempData/TempData.cs';
const ownerSource = path.join(root, ...ownerRelative.split('/'));
const oldStatement = 'if (ContainsKey(item.Key) && Equals(Peek(item.Key), item.Value))';
const newStatement = 'if (Data.TryGetValue(item.Key, out var value) && Equals(value, item.Value))';
if (variant === 'original') {
  assert.equal(hash(ownerSource), plan.actualOriginalOwnerSha256);
  assert.equal(hash(path.join(product, ownerName + '.dll')), originalBrowser.actualOwnerSha256);
} else {
  const oldBytes = fs.readFileSync(path.join(originalDirectory, 'sources', 'TempData.cs'));
  assert.equal(oldBytes.toString().split(oldStatement).length, 2);
  assert.equal(fs.readFileSync(ownerSource).toString(), oldBytes.toString().replace(oldStatement, newStatement));
}
const inputs = read(path.join(run, 'validation', 'HarnessBuild-original-1', 'harness-input-manifest.json'));
assert.equal(inputs.length, 7);
for (const input of inputs) assert.equal(hash(path.join(run, 'harness', input.file)), input.sha256);
fs.mkdirSync(directory);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(directory, 'executed-driver.mjs'));
fs.mkdirSync(path.join(directory, 'sources'));
fs.mkdirSync(path.join(directory, 'harness-source'));
const sources = documents.map(document => {
  const relative = 'src/Components/Endpoints/src/' + document;
  const source = path.join(root, ...relative.split('/'));
  const bytes = fs.readFileSync(source);
  const baseline = context.actualAllSelectedPairs.find(pair => pair.file === relative);
  assert.ok(baseline, 'Every witnessed document must be among the current-default source audit.');
  if (variant === 'original' || relative !== ownerRelative)
    assert.equal(sha(Buffer.from(bytes.toString().replaceAll('\r\n', '\n'))), baseline.actualBaselineBlobSha256);
  const name = path.basename(source);
  fs.copyFileSync(source, path.join(directory, 'sources', name), fs.constants.COPYFILE_EXCL);
  return { file: name, actualRootSource: source, sha256: sha(bytes),
    actualBaselineCanonicalSha256: baseline.actualBaselineBlobSha256 };
});
for (const input of inputs)
  fs.copyFileSync(path.join(run, 'harness', input.file), path.join(directory, 'harness-source', input.file), fs.constants.COPYFILE_EXCL);
const consumer = path.join(directory, 'consumer');
const binarySource = variant === 'original' ? path.join(run, 'harness', 'bin', 'Release', 'net12.0')
  : path.join(originalDirectory, 'consumer');
fs.cpSync(binarySource, consumer, { recursive: true, force: false, errorOnExist: true });
if (variant === 'candidate') {
  for (const extension of ['dll', 'pdb']) fs.copyFileSync(path.join(product, `${ownerName}.${extension}`), path.join(consumer, `${ownerName}.${extension}`));
}
for (const extension of ['dll', 'pdb'])
  assert.equal(hash(path.join(consumer, `${ownerName}.${extension}`)), hash(path.join(product, `${ownerName}.${extension}`)));
function files(directory, base = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0).flatMap(entry => {
    assert.equal(entry.isSymbolicLink(), false, 'No symlink-bound consumer inventory.');
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file, base) : [{ path: path.relative(base, file), bytes: fs.statSync(file).size, sha256: hash(file) }];
  });
}
const inventory = files(consumer);
const closure = { candidate: 'F040', variant, actualCompleteImageInventory: true, files: inventory };
const changed = [];
if (original) {
  const before = read(path.join(originalDirectory, 'consumer-closure.json')).files;
  assert.deepEqual(inventory.map(file => file.path), before.map(file => file.path));
  for (let index = 0; index < inventory.length; index++)
    if (inventory[index].sha256 !== before[index].sha256) changed.push(inventory[index].path);
  assert.deepEqual(changed.sort(), [`${ownerName}.dll`, `${ownerName}.pdb`].sort());
  for (const file of inventory) {
    if (file.path === path.basename(file.path) && !file.path.startsWith(ownerName + '.') &&
        (file.path.startsWith('Microsoft.') || ['Moq.dll', 'Castle.Core.dll'].includes(file.path)) &&
        fs.existsSync(path.join(testBin, file.path)))
      assert.equal(hash(path.join(testBin, file.path)), file.sha256, 'Unchanged frozen framework/helper must still match the candidate owning-test consumer: ' + file.path);
  }
}
const git = args => {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};
assert.equal(git(['branch', '--show-current']), 'autoperf/F040-tempdata-remove-lookup');
assert.equal(git(['rev-parse', 'HEAD']), plan.baseline);
write(path.join(directory, 'consumer-closure.json'), closure);
write(path.join(directory, 'source-manifest.json'), { candidate: 'F040', variant, documents: sources });
write(path.join(directory, 'harness-source-manifest.json'), { candidate: 'F040', variant, files: inputs });
const receipt = {
  candidate: 'F040', variant, actualCreatedUtc: new Date().toISOString(),
  actualRootHead: plan.baseline, actualRootWorkingDiff: git(['--no-pager', 'diff', '--stat']),
  actualMeasuredHarnessBuiltOnceForBothVariants: true,
  actualMeasuredHarnessSha256: hash(path.join(consumer, 'AutoPerf.Benchmarks.dll')),
  actualMeasuredHarnessPdbSha256: hash(path.join(consumer, 'AutoPerf.Benchmarks.pdb')),
  actualOwnerSha256: hash(path.join(consumer, ownerName + '.dll')),
  actualOwnerPdbSha256: hash(path.join(consumer, ownerName + '.pdb')),
  actualOwnerSourceSha256: hash(ownerSource),
  actualConsumerEntries: inventory.length, actualSelectedSourceDocuments: sources.length,
  actualInputFiles: 7, actualOriginalOwningTestRows: originalTests.actualPassed,
  actualCanonicalOriginalBrowserSteps: originalBrowser.actualStepCount,
  actualComparedConsumerDifferences: changed,
  actualAllOtherConsumerEntriesUnchanged: original ? inventory.length - changed.length : null,
  actualSourceComparisonAttempts: 0, actualFullCompilerInputProvenanceClaimed: false,
};
if (original) {
  assert.equal(receipt.actualMeasuredHarnessSha256, original.actualMeasuredHarnessSha256);
  assert.equal(receipt.actualMeasuredHarnessPdbSha256, original.actualMeasuredHarnessPdbSha256);
}
write(path.join(directory, 'preparation.json'), receipt);
console.log(JSON.stringify(receipt, null, 2));
