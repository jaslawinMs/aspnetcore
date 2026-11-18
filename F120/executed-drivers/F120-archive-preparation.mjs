import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = path.join(path.dirname(fileURLToPath(import.meta.url)), 'autoperf-runs', 'F120');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const destination = path.join(run, 'preparation-001-missing-hosting-server-dependency');
const budgetPath = path.join(run, 'diagnostic-budget.json');
const budgetHash = hash(budgetPath);
const budget = read(budgetPath);
assert.equal(budget.authorized.length, 0);
assert.equal(budget.permanentlyClosed, false);
assert.equal(fs.existsSync(destination), false);
const failure = read(path.join(run, 'validation', 'original-characterize-001', 'result.json'));
assert.notEqual(failure.exitCode, 0);
assert.match(fs.readFileSync(path.join(run, 'validation', 'original-characterize-001', 'stderr.txt'), 'utf8'),
  /Microsoft\.AspNetCore\.Hosting\.Server\.Abstractions/);
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
for (const suffix of ['original', 'current-default']) {
  const closure = read(path.join(run, 'closure-' + suffix + '.json'));
  for (const item of closure.files) {
    assert.equal(hash(path.join(run, 'consumer-' + suffix, ...item.path.split('/'))), item.sha256);
  }
  for (const relative of ['consumer-' + suffix, 'source-files-' + suffix, 'closure-' + suffix + '.json',
    'source-inputs-' + suffix + '.json', 'frozen-' + suffix + '.json']) {
    fs.renameSync(path.join(run, relative), path.join(destination, relative));
    archived.push(relative);
  }
}
fs.renameSync(path.join(run, 'harness-source-hashes.json'), path.join(destination, 'harness-source-hashes.json'));
archived.push('harness-source-hashes.json');
assert.equal(hash(budgetPath), budgetHash);
const receipt = {
  candidate: 'F120', actualArchivedBeforeDependencyCorrection: true, actualArchived: archived,
  actualEightHarnessSourcesPreservedByteExact: true, actualBothComplete313FileImagesVerifiedAndPreserved: true,
  actualFailure: 'Initial untimed characterization could not load Hosting.Server.Abstractions before source-owner verification completed or any HTTP request ran.',
  actualOriginalCharacterizationExitCode: failure.exitCode,
  actualSourceComparisonAuthorizations: 0, actualTimingRun: false, actualShippingEdits: 0,
  actualFailedCommandAndStreamsRemainAt: 'validation/original-characterize-001',
  actualFailedStateRecordsRemainAt: 'characterization-original-characterize-001',
  actualUnexecutedFrozenDefaultNotClaimedCharacterized: true, actualCreated: new Date().toISOString()
};
fs.writeFileSync(path.join(destination, 'archive-receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt, null, 2));
