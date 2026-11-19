import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F124');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const budgetPath = path.join(run, 'diagnostic-budget.json');
const budget = read(budgetPath);
assert.equal(budget.maximum, 3);
assert.equal(budget.permanentlyClosed, false);
assert.deepEqual(budget.authorized.map(item => item.attempt), [1, 2, 3]);
assert.deepEqual(budget.completed.map(item => item.attempt), [1, 2, 3]);
assert.deepEqual(budget.failedOrPartialAttempts, []);
for (const item of budget.authorized) {
  assert.equal(item.state, 'completed');
  assert.equal(item.actualTimingStarted, true);
  assert.equal(item.actualDriverSha256, sha(path.join(run, 'F124-compare.mjs')));
  const receipt = read(path.join(run, 'comparison-' + String(item.attempt).padStart(3, '0'), 'execution-receipt.json'));
  assert.equal(receipt.actualCompletePairedSourceComparison, true);
  assert.equal(receipt.actualRetainedSamples, 192);
  assert.deepEqual(receipt.completed, item.completed);
}
const before = sha(budgetPath);
write(path.join(run, 'budget-before-permanent-close.json'), budget);
budget.permanentlyClosed = true;
budget.state = 'permanently-closed';
budget.actualClosedAt = new Date().toISOString();
budget.actualNoFurtherTimingRetuningOrPrimarySubstitution = true;
fs.writeFileSync(budgetPath, JSON.stringify(budget, null, 2) + '\n');
const receipt = {
  candidate: 'F124', actualAuthorizedComparisons: 3, actualCompletedComparisons: 3,
  actualRetainedSamples: budget.completed.reduce((total, item) => total + item.actualRetainedSamples, 0),
  actualAllPredeclaredOrdersExecuted: true, actualFailedOrPartialTimingComparisons: 0,
  actualBudgetBeforeCloseSha256: before, closedBudgetSha256: sha(budgetPath),
  actualPermanentlyClosed: true, actualFurtherTimingAllowed: false,
  actualUntimedEvidenceAuditAndReconstructionAllowed: true
};
write(path.join(run, 'permanent-budget-close.json'), receipt);
console.log(JSON.stringify(receipt, null, 2));
