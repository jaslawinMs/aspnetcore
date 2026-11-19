import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F121');
const budgetPath = path.join(run, 'diagnostic-budget.json');
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex').toUpperCase();
const write = (filename, value) => fs.writeFileSync(filename, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const budget = read(budgetPath);
assert.equal(budget.maximum, 3);
assert.equal(budget.permanentlyClosed, false);
assert.equal(fs.existsSync(path.join(run, 'source-comparison.lock')), false);
assert.deepEqual(budget.authorized.map(item => item.attempt), [1, 2, 3]);
assert.ok(budget.authorized.every(item => item.state === 'completed'));
assert.deepEqual(budget.completed.map(item => item.attempt), [1, 2, 3]);
assert.deepEqual(budget.failedOrPartialAttempts, []);
assert.equal(budget.completed.reduce((sum, item) => sum + item.actualRetainedSamples, 0), 768);
assert.equal(sha(path.join(run, 'acceptance-plan.json')), budget.actualAcceptancePlanSha256);
assert.equal(sha(path.join(run, 'profile-definitions.json')), budget.actualProfileDefinitionsSha256);
write(path.join(run, 'diagnostic-budget-before-permanent-close.json'), budget);
budget.permanentlyClosed = true;
budget.state = 'permanently-closed';
budget.actualPermanentlyClosedAt = new Date().toISOString();
budget.actualNoFurtherTimingAllowed = true;
budget.actualClosureReason = 'All three authorized comparisons consumed. No additional timing or retuning.';
fs.writeFileSync(budgetPath, JSON.stringify(budget, null, 2) + '\n');
const receipt = {
  candidate: 'F121', actualAuthorizationsConsumed: 3, actualCompleteComparisons: 3,
  actualFailedAuthorizationNumbers: [], actualRetainedSamples: 768,
  actualNoFurtherTimingAllowed: true, closedBudgetSha256: sha(budgetPath)
};
write(path.join(run, 'permanent-budget-close.json'), receipt);
for (const name of ['verify', 'reproduce-untimed']) {
  const source = path.join(session, `F120-${name}.mjs`);
  const target = path.join(session, `F121-${name}.mjs`);
  const contents = fs.readFileSync(source, 'utf8').replaceAll('F120', 'F121')
    .replaceAll('Contains', 'CopyTo')
    .replaceAll('CopiedDefault5Miss', 'CopiedDefault5')
    .replaceAll('UnmodifiedDefault5Miss', 'UnmodifiedDefault5')
    .replaceAll('original-characterize-003', 'original-characterize-001')
    .replaceAll('candidate-characterize-002', 'candidate-characterize-001')
    .replaceAll('default-characterize-002', 'default-characterize-001')
    .replaceAll('actualAdditionalEqualityAndEnumerationContracts', 'actualAdditionalCopyAndEnumerationContracts');
  fs.writeFileSync(target, contents, { flag: 'wx' });
}
console.log(JSON.stringify(receipt, null, 2));
