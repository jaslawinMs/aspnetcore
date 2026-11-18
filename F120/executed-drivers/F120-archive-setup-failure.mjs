import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = path.join(path.dirname(fileURLToPath(import.meta.url)), 'autoperf-runs', 'F120');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const destination = path.join(run, 'fixture-epoch-001-async-setup-failure');
const budgetPath = path.join(run, 'diagnostic-budget.json');
const budgetHash = hash(budgetPath);
const budget = read(budgetPath);
assert.equal(budget.authorized.length, 1);
assert.equal(budget.authorized[0].state, 'failed');
assert.equal(budget.authorized[0].actualTimingStarted, false);
assert.equal(budget.completed.length, 0);
assert.equal(budget.permanentlyClosed, false);
assert.equal(fs.existsSync(destination), false);
const stdout = fs.readFileSync(path.join(run, 'comparison-001', 'Original', 'stdout.txt'), 'utf8');
assert.match(stdout, /System\.NullReferenceException/);
assert.match(stdout, /AutoPerf\.CollectionBenchmarks\.Contains/);
assert.equal(/^WorkloadActual\s/m.test(stdout), false);
assert.equal(/^WorkloadResult\s/m.test(stdout), false);
const inputs = read(path.join(run, 'harness-source-hashes.json'));
assert.equal(inputs.length, 8);
fs.mkdirSync(path.join(destination, 'harness'), { recursive: true });
for (const item of inputs) {
  const source = path.join(run, 'harness', item.path);
  assert.equal(hash(source), item.sha256);
  const target = path.join(destination, 'harness', item.path);
  fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
  assert.equal(hash(target), item.sha256);
}
const archived = [];
for (const suffix of ['original', 'current-default', 'candidate']) {
  for (const item of read(path.join(run, 'closure-' + suffix + '.json')).files) {
    assert.equal(hash(path.join(run, 'consumer-' + suffix, ...item.path.split('/'))), item.sha256);
  }
  for (const relative of ['consumer-' + suffix, 'closure-' + suffix + '.json', 'frozen-' + suffix + '.json']) {
    fs.renameSync(path.join(run, relative), path.join(destination, relative));
    archived.push(relative);
  }
}
for (const relative of ['harness-source-hashes.json', 'premeasurement-validation.json']) {
  fs.renameSync(path.join(run, relative), path.join(destination, relative));
  archived.push(relative);
}
fs.copyFileSync(budgetPath, path.join(destination, 'diagnostic-budget-after-failure.json'), fs.constants.COPYFILE_EXCL);
assert.equal(hash(budgetPath), budgetHash);
const receipt = {
  candidate: 'F120', actualArchived: archived, actualEightHarnessSourcesPreservedByteExact: true,
  actualThreeComplete328FileImagesVerifiedAndPreserved: true,
  actualFailedAuthorization: 1, actualAuthorizationRemainsConsumed: true,
  actualBudgetSha256: budgetHash, actualCompletedComparisons: 0, actualRetainedWorkloadSamples: 0,
  actualObservedFailure: 'The pinned in-process emit path invoked the workload before the asynchronous GlobalSetup task assigned its scenario. Untimed callers had awaited it correctly; the real engine exposed this fixture defect.',
  actualPlannedCorrection: 'Await all real HTTP producer preparation in async Main before running BDN, then use a synchronous GlobalSetup that only selects its immutable prepared profile. Keep the two timed methods, all eight profiles, shipping candidate, settings, orders and qualification gates unchanged.',
  actualNoSemanticBugInFrameworkClaimed: true,
  actualFailedCommandAndStreamsRemainAt: 'comparison-001/Original',
  actualFirstSourceOrderNotReplayed: true, actualRemainingAuthorizationNumbers: [2, 3],
  actualCreated: new Date().toISOString()
};
fs.writeFileSync(path.join(destination, 'archive-receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt, null, 2));
