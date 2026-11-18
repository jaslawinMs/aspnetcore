import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const run = path.join(path.dirname(fileURLToPath(import.meta.url)), 'autoperf-runs', 'F044');
const target = path.join(run, 'diagnostic-budget.json');
const before = fs.readFileSync(target);
const budget = JSON.parse(before);
if (budget.closed || budget.maximumSourceComparisons !== 3 || budget.consumed !== 3
  || budget.completed !== 3 || budget.authorizations.length !== 3
  || budget.authorizations.some(item => item.state !== 'completed')
  || fs.existsSync(path.join(run, 'source-comparison.lock'))) {
  throw new Error('Require all three completed authorizations and no active comparison; never reopen a closed budget.');
}
fs.writeFileSync(path.join(run, 'budget-before-permanent-close.json'), before, { flag: 'wx' });
budget.closed = true;
budget.closedAt = new Date().toISOString();
budget.state = 'permanently-closed-three-completed-awaiting-independent-audit';
budget.closureReason = 'All three source-comparison authorizations are consumed. No additional paired or standalone timing is permitted, including during independent untimed rebuilds.';
fs.writeFileSync(target, JSON.stringify(budget, null, 2) + '\n');
const record = {
  candidate: 'F044', closedAt: budget.closedAt, consumed: budget.consumed, completed: budget.completed,
  closed: true, furtherTimingPermitted: false,
  beforeSha256: crypto.createHash('sha256').update(before).digest('hex').toUpperCase(),
  closedBudgetSha256: crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex').toUpperCase()
};
fs.writeFileSync(path.join(run, 'permanent-budget-close.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(record, null, 2));
