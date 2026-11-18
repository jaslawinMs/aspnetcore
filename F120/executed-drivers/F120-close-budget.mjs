import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = path.join(path.dirname(fileURLToPath(import.meta.url)), 'autoperf-runs', 'F120');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const filename = path.join(run, 'diagnostic-budget.json');
const budget = read(filename);
assert.equal(fs.existsSync(path.join(run, 'source-comparison.lock')), false);
assert.equal(budget.maximum, 3);
assert.equal(budget.authorized.length, 3);
assert.equal(budget.permanentlyClosed, false);
assert.deepEqual(budget.authorized.map(item => item.state), ['failed', 'completed', 'completed']);
assert.deepEqual(budget.completed.map(item => item.attempt), [2, 3]);
assert.equal(budget.failedOrPartialAttempts.length, 1);
assert.equal(budget.failedOrPartialAttempts[0].actualTimingStarted, false);
assert.equal(sha(path.join(run, 'acceptance-plan.json')), budget.actualAcceptancePlanSha256);
for (const attempt of [2, 3]) {
  const receipt = read(path.join(run, 'comparison-' + String(attempt).padStart(3, '0'), 'execution-receipt.json'));
  assert.equal(receipt.actualCompletePairedSourceComparison, true);
  assert.equal(receipt.actualRetainedSamples, 256);
}
write(path.join(run, 'diagnostic-budget-before-permanent-close.json'), budget);
budget.permanentlyClosed = true;
budget.state = 'permanently-closed-three-authorizations-one-failed-two-complete';
budget.actualClosedAt = new Date().toISOString();
budget.actualFurtherTimingForbidden = true;
fs.writeFileSync(filename, JSON.stringify(budget, null, 2) + '\n');
const receipt = {
  candidate: 'F120', closedBudgetSha256: sha(filename), actualMaximum: 3,
  actualConsumedAuthorizations: 3, actualFailedAuthorizationNumbers: [1],
  actualCompletedComparisonNumbers: [2, 3], actualCompleteComparisons: 2,
  actualRetainedSamples: 512, actualNoFailedAuthorizationReplayed: true,
  actualNoFurtherTiming: true, actualClosedAt: budget.actualClosedAt
};
write(path.join(run, 'permanent-budget-close.json'), receipt);
console.log(JSON.stringify(receipt, null, 2));
