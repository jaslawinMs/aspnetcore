import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F039');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(read(path.join(run, 'harness-build-v2', 'build-command.json')).actualExitCode, 0);
const budget = read(path.join(run, 'source-comparison-budget.json'));
assert.equal(budget.attempts.length, 1);
assert.equal(budget.attempts[0].status, 'failed');
const sourceInputs = read(path.join(run, 'harness-build-v2', 'input-manifest.json'));
assert.equal(sourceInputs.length, 7);
const rootDiff = spawnSync('git', ['--no-pager', 'diff', '--stat'], { cwd: String.raw`C:\src\aspnetcore`, encoding: 'utf8', windowsHide: true });
assert.equal(rootDiff.status, 0, rootDiff.stderr);
function inventory(directory, base = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
    .flatMap(entry => {
      assert.equal(entry.isSymbolicLink(), false);
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? inventory(file, base) : [{ path: path.relative(base, file), bytes: fs.statSync(file).size, sha256: hash(file) }];
    });
}
const preparations = [];
for (const variant of ['original', 'candidate']) {
  const old = path.join(run, `preparation-${variant}-001`);
  const directory = path.join(run, `preparation-${variant}-002`);
  fs.mkdirSync(directory);
  fs.copyFileSync(fileURLToPath(import.meta.url), path.join(directory, 'executed-driver.mjs'));
  fs.cpSync(path.join(old, 'sources'), path.join(directory, 'sources'), { recursive: true, force: false, errorOnExist: true });
  fs.mkdirSync(path.join(directory, 'harness-source'));
  for (const input of sourceInputs) {
    const file = path.join(run, 'harness-v2', input.file);
    assert.equal(hash(file), input.sha256);
    fs.copyFileSync(file, path.join(directory, 'harness-source', input.file), fs.constants.COPYFILE_EXCL);
  }
  const consumer = path.join(directory, 'consumer');
  fs.cpSync(path.join(run, 'harness-v2', 'bin', 'Release', 'net12.0'), consumer, { recursive: true, force: false, errorOnExist: true });
  for (const extension of ['dll', 'pdb']) fs.copyFileSync(path.join(old, 'consumer', `Microsoft.AspNetCore.Components.Endpoints.${extension}`),
    path.join(consumer, `Microsoft.AspNetCore.Components.Endpoints.${extension}`));
  const files = inventory(consumer);
  assert.equal(files.length, 197);
  const previous = read(path.join(old, 'consumer-closure.json')).files;
  assert.deepEqual(files.map(file => file.path), previous.map(file => file.path));
  const changedFromV1 = files.filter((file, index) => file.sha256 !== previous[index].sha256).map(file => file.path);
  assert.deepEqual(changedFromV1.sort(), ['AutoPerf.Benchmarks.dll', 'AutoPerf.Benchmarks.pdb']);
  const previousPreparation = read(path.join(old, 'preparation.json'));
  const preparation = { ...previousPreparation, actualHarnessVersion: 2, actualCreatedUtc: new Date().toISOString(),
    actualRootWorkingDiff: rootDiff.stdout.trim(), actualHistoricalV1Preparation: path.join(old, 'preparation.json'),
    actualSourceComparisonAttempts: 1,
    actualOriginalOwnerLoadedFromValidatedFrozenImage: true,
    actualMeasuredHarnessSha256: hash(path.join(consumer, 'AutoPerf.Benchmarks.dll')),
    actualMeasuredHarnessPdbSha256: hash(path.join(consumer, 'AutoPerf.Benchmarks.pdb')),
    actualPriorFailedAttemptPreservedAndConsumed: true, actualAttemptsAlreadyConsumed: 1,
    actualChangedFromSameVariantV1: changedFromV1 };
  write(path.join(directory, 'consumer-closure.json'), { candidate: 'F039', variant, actualHarnessVersion: 2,
    actualCompleteImageInventory: true, files });
  fs.copyFileSync(path.join(old, 'source-manifest.json'), path.join(directory, 'source-manifest.json'), fs.constants.COPYFILE_EXCL);
  write(path.join(directory, 'harness-source-manifest.json'), { candidate: 'F039', variant, actualHarnessVersion: 2, files: sourceInputs });
  write(path.join(directory, 'preparation.json'), preparation);
  preparations.push({ preparation, files });
}
assert.equal(preparations[0].preparation.actualMeasuredHarnessSha256, preparations[1].preparation.actualMeasuredHarnessSha256);
assert.equal(preparations[0].preparation.actualMeasuredHarnessPdbSha256, preparations[1].preparation.actualMeasuredHarnessPdbSha256);
const changed = preparations[0].files.filter((file, index) => file.sha256 !== preparations[1].files[index].sha256).map(file => file.path);
assert.deepEqual(changed.sort(), ['Microsoft.AspNetCore.Components.Endpoints.dll', 'Microsoft.AspNetCore.Components.Endpoints.pdb']);
console.log(JSON.stringify({ candidate: 'F039', actualHarnessVersion: 2, actualConsumerEntriesPerVariant: 197,
  actualByteIdenticalMeasuredHarnessSha256: preparations[0].preparation.actualMeasuredHarnessSha256,
  actualOnlyConsumerDifferences: changed, actualPriorFailedAttemptStillConsumed: true, actualAttemptsRemaining: 2 }, null, 2));
