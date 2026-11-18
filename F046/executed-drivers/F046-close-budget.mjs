import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const run = path.join(path.dirname(fileURLToPath(import.meta.url)), 'autoperf-runs', 'F046');
const target = path.join(run, 'diagnostic-budget.json');
const before = fs.readFileSync(target);
const budget = JSON.parse(before);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
assert.equal(budget.permanentlyClosed, false);
assert.equal(budget.maximumSourceComparisons, 3);
assert.equal(budget.authorized.length, 3);
assert.ok(budget.authorized.every(item => ['completed', 'failed'].includes(item.state)));
assert.equal(budget.completed.length + budget.failedOrPartialAttempts.length, 3);
assert.equal(fs.existsSync(path.join(run, 'source-comparison.lock')), false);
fs.writeFileSync(path.join(run, 'budget-before-permanent-close.json'), before, { flag: 'wx' });
budget.permanentlyClosed = true;
budget.actualClosedAt = new Date().toISOString();
budget.state = 'permanently-closed-awaiting-independent-audit';
budget.actualClosureReason = 'All three authorized comparisons are consumed. No additional paired or standalone timing is permitted, including independent reconstruction.';
fs.writeFileSync(target, JSON.stringify(budget, null, 2) + '\n');
const receipt = {
  candidate: 'F046', actualClosedAt: budget.actualClosedAt, actualAuthorizationsConsumed: 3,
  actualCompletedComparisons: budget.completed.length, actualFailedOrPartialAttempts: budget.failedOrPartialAttempts.length,
  actualPermanentlyClosed: true, actualFurtherTimingPermitted: false,
  beforeSha256: hash(before), closedBudgetSha256: hash(fs.readFileSync(target))
};
fs.writeFileSync(path.join(run, 'permanent-budget-close.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt, null, 2));
