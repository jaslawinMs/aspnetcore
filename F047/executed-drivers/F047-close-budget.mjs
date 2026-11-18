import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = path.join(path.dirname(fileURLToPath(import.meta.url)), 'autoperf-runs', 'F047');
const file = path.join(run, 'diagnostic-budget.json');
const budget = JSON.parse(fs.readFileSync(file, 'utf8'));
assert.equal(budget.permanentlyClosed, false);
assert.equal(budget.authorized.length, 3);
assert.equal(budget.completed.length, 3);
assert.equal(budget.failedOrPartialAttempts.length, 0);
assert.ok(budget.authorized.every(item => item.state === 'completed'));
fs.writeFileSync(path.join(run, 'diagnostic-budget-before-permanent-close.json'), fs.readFileSync(file), { flag: 'wx' });
budget.permanentlyClosed = true;
budget.state = 'three-source-comparisons-completed-permanently-closed';
budget.actualPermanentlyClosedAt = new Date().toISOString();
budget.actualNoFurtherTimingAuthorized = true;
fs.writeFileSync(file, JSON.stringify(budget, null, 2) + '\n');
const closedBudgetSha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
fs.writeFileSync(path.join(run, 'permanent-budget-close.json'), JSON.stringify({
  candidate: 'F047', closedBudgetSha256, actualCompletedComparisons: 3, actualRetainedSamples: 384,
  actualFurtherTimingAllowed: false, actualClosedAt: budget.actualPermanentlyClosedAt
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F047', actualPermanentlyClosed: true, closedBudgetSha256 }, null, 2));
