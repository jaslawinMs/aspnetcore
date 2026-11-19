import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F122');
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex').toUpperCase();
const filename = path.join(run, 'diagnostic-budget.json');
const budget = read(filename);
assert.equal(budget.permanentlyClosed, false);
assert.equal(budget.authorized.length, 1);
assert.equal(budget.authorized[0].kind, 'original-only-profile');
assert.equal(budget.authorized[0].state, 'completed');
assert.equal(budget.completed.length, 1);
assert.equal(budget.failedOrPartialAttempts.length, 0);
assert.equal(budget.completed[0].actualRetainedSamples, 256);
assert.equal(fs.existsSync(path.join(run, 'original-profile.lock')), false);
assert.equal(fs.existsSync(path.join(run, 'permanent-budget-close.json')), false);
const seal = read(path.join(run, 'baseline-validation.json'));
assert.equal(seal.actualCandidateSelected, false);
assert.equal(seal.actualBoundedProductionFitGateMet, false);
for (const item of seal.actualProtectedPrimaryInputs) {
  assert.equal(sha(path.join('C:\\src\\aspnetcore', item.path)), item.sha256);
}
const report = read(path.join(run, ...budget.authorized[0].completed[0].fullJson.split('/')));
assert.equal(report.Benchmarks.length, 32);
assert.ok(report.Benchmarks.every(item => item.Statistics.N === 8 && item.Statistics.OriginalValues.length === 8));
budget.permanentlyClosed = true;
budget.state = 'permanently-closed-production-fit-rejection-original-profile-complete';
budget.actualClosedAt = new Date().toISOString();
budget.actualUnusedAuthorizationsPermanentlyClosed = 2;
budget.actualReason = 'The predeclared concrete-pattern production-fit gate is not met. The one original-only profile completed all 32 cases; no candidate or comparison was selected. Do not spend remaining authorizations on an invented concrete caller or a different optimization.';
fs.writeFileSync(filename, JSON.stringify(budget, null, 2) + '\n');
const receipt = {
  candidate: 'F122', actualClosedAt: budget.actualClosedAt, closedBudgetSha256: sha(filename),
  actualConsumedTimingAuthorizations: 1, actualOriginalOnlyProfilesCompleted: 1,
  actualUnusedAuthorizationsPermanentlyClosed: 2, actualFailedOrPartialTimingAuthorizations: 0,
  actualRetainedSamples: 256, actualSourceComparisons: 0, actualCandidateSelected: false,
  actualReason: budget.actualReason
};
fs.writeFileSync(path.join(run, 'permanent-budget-close.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt, null, 2));
