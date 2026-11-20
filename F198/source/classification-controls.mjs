import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const session = path.resolve(root, '..', '..', '..');
const source = fs.readFileSync(path.join(session, 'autoperf-publish-bounded-outcome-174.mjs'), 'utf8');
const start = source.indexOf('function classifyAuthorization(');
const end = source.indexOf('\nconst completedComparisons', start);
assert.ok(start > 0 && end > start);
const classify = new Function('assert', 'crypto', 'fs', source.slice(start, end) + '\nreturn classifyAuthorization;')(assert, crypto, fs);
const outcomeFile = path.join(root, '..', 'Original-comparison-173', 'outcome.json');
const comparison = {
    findingId: 'F198', actualOutcomeFile: outcomeFile,
    actualOutcomeSha256: '32552182F0DE4C75616CC86FB952475498260A90119124D97D46C1FD1CC1E9A2'
};
const budget = JSON.parse(fs.readFileSync(path.join(root, '..', 'diagnostic-budget.json'), 'utf8'));
const authorization = budget.authorizations[0];
const cases = [];
function check(name, action) { action(); cases.push({ name, passed: true }); }

check('ActualClosedFullyCompletedControlInconclusiveComparisonCountsAsCompletedNotFailed', () =>
    assert.equal(classify(comparison, budget, authorization), 'completed'));
check('LegacyCompletedClassificationUnchanged', () =>
    assert.equal(classify({}, {}, { status: 'completed' }), 'completed'));
check('LegacyFailedClassificationUnchanged', () =>
    assert.equal(classify({}, {}, { status: 'failed' }), 'failed'));
check('WrongFindingCannotUseF198TerminalSchema', () =>
    assert.throws(() => classify({ ...comparison, findingId: 'F199' }, budget, authorization)));
check('UnknownAuthorizationStatusRejected', () =>
    assert.throws(() => classify(comparison, budget, { ...authorization, status: 'authorized' })));
check('DefaultAuthorizationCannotUseOriginalCompletionProof', () =>
    assert.throws(() => classify(comparison, budget, { ...authorization, sourceRole: 'ObservedDefault' })));
check('MultipleAuthorizationsCannotUseSingleCompletedComparisonProof', () =>
    assert.throws(() => classify(comparison, { ...budget, authorizations: [authorization, authorization] }, authorization)));
check('MismatchedActualOutcomeHashRejected', () =>
    assert.throws(() => classify({ ...comparison, actualOutcomeSha256: '0'.repeat(64) }, budget, authorization)));

const record = {
    actualExtractedPublisherFunctionControls: cases,
    actualCleanCases: cases.length,
    publisherSha256: crypto.createHash('sha256').update(source).digest('hex').toUpperCase(),
    actualClosedBudgetBytesUnchanged: crypto.createHash('sha256')
        .update(fs.readFileSync(path.join(root, '..', 'diagnostic-budget.json'))).digest('hex').toUpperCase() ===
        '0BFA4006C3EA313F10E5035CA6AF7C09131EED5EC10A18AE2A529C5535690F12',
    actualNoGitGitHubOrBenchmarkExecution: true
};
assert.equal(record.actualClosedBudgetBytesUnchanged, true);
fs.writeFileSync(path.join(root, 'classification-control-result.json'), JSON.stringify(record, null, 2), { flag: 'wx' });
console.log(JSON.stringify(record));
