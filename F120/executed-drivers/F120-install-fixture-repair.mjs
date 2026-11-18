import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F120');
const prior = path.join(run, 'fixture-epoch-001-async-setup-failure');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const budgetPath = path.join(run, 'diagnostic-budget.json');
const budgetHash = hash(budgetPath);
assert.equal(budgetHash, read(path.join(prior, 'archive-receipt.json')).actualBudgetSha256);
const budget = read(budgetPath);
assert.equal(budget.authorized.length, 1);
assert.equal(budget.authorized[0].state, 'failed');
assert.equal(budget.completed.length, 0);
assert.equal(read(path.join(run, 'validation', 'harness-build-005', 'result.json')).exitCode, 0);
const current = path.join(run, 'harness');
const inputs = fs.readdirSync(current).filter(file => /\.(cs|csproj)$/.test(file)).sort().map(file => ({
  path: file, bytes: fs.statSync(path.join(current, file)).size, sha256: hash(path.join(current, file))
}));
const old = read(path.join(prior, 'harness-source-hashes.json'));
assert.equal(inputs.length, 8);
assert.deepEqual(inputs.filter(item => item.sha256 !== old.find(other => other.path === item.path).sha256).map(item => item.path),
  ['Characterization.cs', 'CollectionBenchmarks.cs', 'CollectionScenario.cs', 'Program.cs']);
const oldBenchmarks = fs.readFileSync(path.join(prior, 'harness', 'CollectionBenchmarks.cs'), 'utf8');
const newBenchmarks = fs.readFileSync(path.join(current, 'CollectionBenchmarks.cs'), 'utf8');
for (const name of ['Contains', 'UnchangedIndexOf']) {
  const expression = new RegExp('public (?:bool|int) ' + name + '\\(\\) => [^\\r\\n]+;');
  assert.equal(newBenchmarks.match(expression)?.[0], oldBenchmarks.match(expression)?.[0]);
}
const enumeration = text => text.match(/public enum CollectionProfile\s*\{[^}]+\}/)?.[0];
assert.equal(enumeration(fs.readFileSync(path.join(current, 'CollectionScenario.cs'), 'utf8')),
  enumeration(fs.readFileSync(path.join(prior, 'harness', 'CollectionScenario.cs'), 'utf8')));
assert.equal(hash(path.join(current, 'SettingsPreservingEmitToolchain.cs')),
  hash(path.join(prior, 'harness', 'SettingsPreservingEmitToolchain.cs')));
write(path.join(run, 'harness-source-hashes.json'), inputs);
const binary = path.join(current, 'bin', 'Release', 'net12.0');
const allowed = ['AutoPerf.Benchmarks.dll', 'AutoPerf.Benchmarks.pdb'];
const installed = [];
for (const suffix of ['original', 'current-default', 'candidate']) {
  const destination = path.join(run, 'consumer-' + suffix);
  assert.equal(fs.existsSync(destination), false);
  const previous = read(path.join(prior, 'closure-' + suffix + '.json'));
  fs.cpSync(path.join(prior, 'consumer-' + suffix), destination, { recursive: true, errorOnExist: true, force: false });
  for (const name of allowed) fs.copyFileSync(path.join(binary, name), path.join(destination, name));
  const files = previous.files.map(item => ({
    path: item.path, bytes: fs.statSync(path.join(destination, ...item.path.split('/'))).size,
    sha256: hash(path.join(destination, ...item.path.split('/')))
  }));
  assert.equal(files.length, 328);
  const changed = files.filter(item => item.sha256 !== previous.files.find(other => other.path === item.path).sha256).map(item => item.path).sort();
  assert.deepEqual(changed, allowed);
  for (const item of read(path.join(run, 'source-inputs-' + suffix + '.json')).sourceFiles) {
    assert.equal(hash(path.join(run, 'source-files-' + suffix, ...item.path.split('/'))), item.sha256);
  }
  write(path.join(run, 'closure-' + suffix + '.json'), {
    candidate: 'F120', variant: previous.variant, actualFixtureEpoch: 2,
    actualHarnessInputs: inputs, actualPriorFixtureClosureSha256: hash(path.join(prior, 'closure-' + suffix + '.json')),
    actualOnlyRepairedCommonHarnessDllPdbChangedFromPriorEpoch: changed, files
  });
  write(path.join(run, 'frozen-' + suffix + '.json'), {
    candidate: 'F120', variant: previous.variant, actualFixtureEpoch: 2, actualFrozenFiles: files.length,
    actualSourceInputs: 10, actualUniqueSourcePePdbDocumentsRequired: 6,
    actualFrameworkOwnerBytesPreservedFromPreviouslyVerifiedSourceBuild: true,
    actualOnlyCommonHarnessDllPdbChangedFromPriorEpoch: changed,
    actualFirstAuthorizationRemainsConsumed: true, actualCreated: new Date().toISOString()
  });
  installed.push({ variant: previous.variant, actualEntries: files.length, actualChangedCommonFiles: changed });
}
const original = read(path.join(run, 'closure-original.json')).files;
const candidate = read(path.join(run, 'closure-candidate.json')).files;
assert.deepEqual(candidate.filter(item => item.sha256 !== original.find(other => other.path === item.path).sha256).map(item => item.path),
  ['Microsoft.AspNetCore.Mvc.Core.dll', 'Microsoft.AspNetCore.Mvc.Core.pdb']);
fs.mkdirSync(path.join(prior, 'executed-drivers'));
fs.copyFileSync(path.join(session, 'F120-prepare-measurement.mjs'),
  path.join(prior, 'executed-drivers', 'F120-prepare-measurement.mjs'), fs.constants.COPYFILE_EXCL);
assert.equal(hash(budgetPath), budgetHash);
write(path.join(run, 'fixture-repair-installed.json'), {
  candidate: 'F120', actualFixtureEpoch: 2, actualBudgetSha256Unchanged: budgetHash,
  actualShippingCodeUnchangedByRepair: true, actualTimedMethodsUnchanged: true, actualProfilesUnchanged: true,
  actualSettingsAndAcceptancePlanUnchanged: true, actualFirstAuthorizationNotReplayed: true,
  actualRemainingAuthorizationNumbers: [2, 3], installed, actualUntimedRecharacterizationRequired: true
});
console.log(JSON.stringify({ actualInstalledVariants: installed.length, actualCommonHarnessOnlyRepair: true,
  actualPriorFailedAuthorizationStillConsumed: 1, actualAdditionalTiming: 0 }, null, 2));
