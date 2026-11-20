import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F126');
const file = path.join(run, 'diagnostic-budget.json');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const budget = read(file);
assert.equal(budget.maximumComparisonAuthorizations, 3);
assert.equal(budget.authorizations.length, 3);
assert.equal(budget.completed.length, 3);
assert.equal(budget.failedOrPartialAttempts.length, 0);
assert.equal(budget.permanentlyClosed, false);
assert.ok(budget.authorizations.every(entry => entry.state === 'completed'));
for (const pair of budget.completed) {
  const receipt = read(path.join(run, `comparison-${String(pair.attempt).padStart(3, '0')}`, 'execution-receipt.json'));
  assert.equal(receipt.actualCompletePairedSourceComparison, true);
  assert.equal(receipt.actualRetainedSamples, 96);
  for (const role of receipt.completed) assert.equal(sha(path.join(run, ...role.fullJson.split('/'))), role.fullJsonSha256);
}
const before = sha(file);
fs.copyFileSync(file, path.join(run, 'diagnostic-budget-before-close.json'), fs.constants.COPYFILE_EXCL);
budget.permanentlyClosed = true;
budget.actualClosedAt = new Date().toISOString();
budget.actualClosureReason = 'All three predeclared alternating source comparisons completed. No remaining authorization, tuning, primary substitution or historical replay.';
budget.actualClosedBeforeNumericalOutcomeSelection = true;
fs.writeFileSync(file, JSON.stringify(budget, null, 2) + '\n');
const result = { candidate: 'F126', actualConsumedAuthorizations: 3, actualCompletePairs: 3,
  actualRetainedObservations: budget.completed.reduce((sum, pair) => sum + pair.actualRetainedSamples, 0),
  actualPermanentlyClosed: true, actualRemainingAuthorizations: 0,
  actualBudgetBeforeCloseSha256: before, actualClosedBudgetSha256: sha(file) };
fs.writeFileSync(path.join(run, 'budget-closure.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
