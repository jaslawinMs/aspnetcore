import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F038');
const root = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(path.join(run, file), 'utf8'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const git = args => {
  const command = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
  assert.ifError(command.error);
  assert.equal(command.status, 0, command.stderr);
  return command.stdout.trim();
};
assert.equal(git(['rev-parse', 'HEAD']), '37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(git(['branch', '--show-current']), 'autoperf/F038-render-tree-keyed-lookup');
assert.equal(git(['--no-pager', 'status', '--porcelain', '--untracked-files=no']), '');
const events = fs.readFileSync(path.join(run, 'characterize-original-001', 'state', 'events.jsonl'), 'utf8')
  .trim().split(/\r?\n/).map(line => JSON.parse(line));
const only = name => {
  const matches = events.filter(event => event.name === name);
  assert.equal(matches.length, 1, name);
  return matches[0].value;
};
const semantics = only('semantic-records');
const lifecycles = only('benchmark-lifecycles');
assert.equal(semantics.length, 44);
assert.equal(lifecycles.length, 40);
assert.ok(lifecycles.every(record => record.actualPassed));
const runtimeBefore = only('runtime-characterize-before');
const runtimeAfter = only('runtime-characterize-after');
assert.deepEqual(runtimeBefore.initialSettings, runtimeAfter.initialSettings);
assert.equal(only('source-pdb').documents.length, 9);
const tests = read('validation/original-existing-1/verified-result.json');
const rows = read('validation/original-existing-1/all-trx-rows.json');
assert.equal(tests.actualPassed, 83);
assert.equal(rows.length, 83);
assert.ok(rows.every(row => row.outcome === 'Passed'));
const browser = read('sample-original/browser-result.json');
assert.equal(browser.actualPassed, true);
assert.equal(browser.actualStepCount, 5);
assert.equal(browser.actualInteractiveReadyObserved, true);
assert.equal(browser.pageErrors.length, 0);
assert.equal(browser.consoleMessages.filter(message => message.type === 'error').length, 0);
assert.ok(read('sample-original/stopped-owned-processes.json').every(process => !process.CurrentlyPresent));
const preparation = read('preparation-original-001/verified-preparation.json');
assert.equal(preparation.actualSuccessful, true);
assert.equal(preparation.actualConsumerFiles, 106);
assert.equal(preparation.actualOriginalOwnerSha256, browser.actualOwnerSha256);
const closure = read('preparation-original-001/consumer-closure.json');
for (const entry of closure.files) {
  assert.equal(hash(path.join(run, 'preparation-original-001', 'consumer', entry.path)), entry.sha256);
}
for (const entry of preparation.actualHarnessFiles) {
  assert.equal(hash(path.join(run, 'harness', entry.file)), entry.sha256);
}
const completion = read('characterize-original-001/completion.json');
assert.equal(completion.actualExitCode, 0);
assert.equal(completion.actualPidCapturedBeforeWait, true);
assert.equal(runtimeBefore.actualProcessId, completion.actualProcessId);
const witnesses = events.filter(event => event.name === 'untimed-probe-witness').map(event => event.value);
assert.deepEqual(witnesses.map(record => [record.count, record.actualHashCalls]), [[32, 128], [16, 64]]);
const receipt = {
  candidate: 'F038',
  actualBaselineValidationPassed: true,
  actualOwnerSha256: preparation.actualOriginalOwnerSha256,
  actualOwningRows: 83,
  actualOwningSkipped: 0,
  actualBrowserSteps: 5,
  actualBrowserOwnerProductConsumerMatched: true,
  actualSemanticRecords: semantics.length,
  actualBenchmarkLifecycles: lifecycles.length,
  actualConsumerFilesVerified: closure.files.length,
  actualSourcePdbDocuments: 9,
  actualUntimedProbeWitnesses: witnesses,
  actualSourceComparisonAttempts: 0,
  actualShippingChanges: 0,
  actualBaselineSemanticCollectionSha256: createHash('sha256').update(JSON.stringify(semantics)).digest('hex').toUpperCase(),
  actualBaselineLifecycleCollectionSha256: createHash('sha256').update(JSON.stringify(lifecycles)).digest('hex').toUpperCase(),
  actualAcceptancePlanSha256: hash(path.join(run, 'acceptance-plan.json')),
  actualHarnessFiles: preparation.actualHarnessFiles,
  currentDefaultLimit: 'Target and20/21selected files byte-identical; Renderer event-error/disposed-exception and global SDK/dependency drift explicitly excluded. Not a full-current-main build or measurement.',
  historicalPrototypeCredited: 'dotnet/aspnetcore#70133 removed new-tree ref experiment95837ac848beda6c84dc17f44be2298dd7414df2; no novelty claim.',
  actualInitialSettings: runtimeBefore.initialSettings,
  verifiedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(run, 'baseline-validation.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'source-comparison-plan.json'), JSON.stringify({
  candidate: 'F038',
  actualCreatedBeforeShippingEdit: true,
  baselineValidationSha256: hash(path.join(run, 'baseline-validation.json')),
  acceptancePlanSha256: receipt.actualAcceptancePlanSha256,
  hypothesis: 'Replace only the new-tree TryGetValue-plus-indexer pair with an immediately consumed CollectionsMarshal.GetValueRefOrAddDefault ref, retaining the existingEntry local and both branch bodies. A miss must immediately assign new KeyedItemInfo(-1,newIndex), not leave the default struct. Preserve exact duplicate guard and existing OldIndex. Ref never escapes or spans another dictionary insertion.',
  primary: 'KeyedStable:Integer:256',
  profiles: 40,
  pairsMaximum: 3,
  order: [['original', 'candidate'], ['candidate', 'original'], ['original', 'candidate']],
  harnessMustRemainByteIdentical: true,
  onlyPermittedConsumerDelta: ['Microsoft.AspNetCore.Components.dll', 'Microsoft.AspNetCore.Components.pdb'],
  actualSourceComparisonsStarted: 0,
  noGainClaimBeforeMeasurement: true,
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F038', actualBaselineValidationPassed: true, actualOwningRows: 83,
  actualBrowserSteps: 5, actualSemanticRecords: 44, actualBenchmarkLifecycles: 40,
  actualSourceComparisonAttempts: 0 }, null, 2));
