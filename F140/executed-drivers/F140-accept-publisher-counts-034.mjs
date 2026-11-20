import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(session, 'autoperf-published-results', 'F140');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const copiesFile = path.join(root, 'authoritative-copies.json'), copies = read(copiesFile);
const original = fs.readFileSync(path.join(session, 'autoperf-publish-bounded-outcome-012.mjs'), 'utf8');
const current = fs.readFileSync(path.join(session, 'autoperf-publish-bounded-outcome-033.mjs'), 'utf8');
const changes = [
    ["const completedComparisons = config.completedComparisons ?? [];",
        "const completedComparisons = config.completedComparisons ?? [];\nlet previouslyCompletedComparisonCount = 0;\nlet previouslyFailedAuthorizationCount = 0;"],
    ["    assert.ok(config.outcomes.some(item => item.id === comparison.findingId));",
        "    assert.ok(config.outcomes.some(item => item.id === comparison.findingId));\n    previouslyCompletedComparisonCount += budget.authorizations.filter(item => item.status === 'completed').length;\n    previouslyFailedAuthorizationCount += budget.authorizations.filter(item => item.status === 'failed').length;"],
    ["const previouslyCompletedComparisonCount = completedComparisons.reduce((sum, item) => sum + item.authorizations, 0);",
        "const previouslyConsumedAuthorizationCount = completedComparisons.reduce((sum, item) => sum + item.authorizations, 0);\nassert.equal(previouslyCompletedComparisonCount + previouslyFailedAuthorizationCount, previouslyConsumedAuthorizationCount);"],
    ["    actualPreviouslyCompletedComparisons: previouslyCompletedComparisonCount,",
        "    actualPreviouslyCompletedComparisons: previouslyCompletedComparisonCount,\n    actualPreviouslyFailedAuthorizations: previouslyFailedAuthorizationCount,\n    actualPreviouslyConsumedAuthorizations: previouslyConsumedAuthorizationCount,"],
    ["${previouslyCompletedComparisonCount} previously completed comparisons. Preserve",
        "${previouslyCompletedComparisonCount} previously completed comparisons,${previouslyFailedAuthorizationCount} failed authorizations,${previouslyConsumedAuthorizationCount} consumed authorizations. Preserve"]
];
let expected = original.replaceAll('\r\n', '\n');
for (const [before, after] of changes)
{
    assert.equal(expected.split(before).length, 2);
    expected = expected.replace(before, after);
}
assert.equal(current.replaceAll('\r\n', '\n'), expected);
assert.equal(hash(Buffer.from(original)), '3FF3761761ACA7D7593A0106F8DD0007CB2204868612D887BAFD6168EAE38707');
assert.equal(copies.length, 292);
for (const name of ['autoperf-publish-bounded-outcome-033.mjs', 'F140-accept-publisher-counts-034.mjs'])
{
    const source = path.join(session, name), bytes = fs.readFileSync(source), logical = 'executed-drivers/' + name;
    fs.writeFileSync(path.join(root, ...logical.split('/')), bytes, { flag: 'wx' });
    copies.push({ file: logical, actualSourcePath: source, bytes: bytes.length, sha256: hash(bytes) });
}
const budget = read(path.join(root, 'run', 'diagnostic-budget.json'));
const statuses = budget.authorizations.map(item => item.status);
assert.deepEqual(statuses, ['failed']);
assert.equal(budget.closed, true);
const actualCounts = { completed: statuses.filter(value => value === 'completed').length,
    failed: statuses.filter(value => value === 'failed').length, consumed: statuses.length };
assert.deepEqual(actualCounts, { completed: 0, failed: 1, consumed: 1 });
fs.writeFileSync(copiesFile, JSON.stringify(copies, null, 2) + '\n');
const acceptanceFile = path.join(root, 'coordinator-acceptance.json'), acceptance = read(acceptanceFile);
acceptance.actualCopiedFiles = copies.length;
acceptance.actualCopiedBytes = copies.reduce((sum, item) => sum + item.bytes, 0);
acceptance.actualPublisherRevision = '033';
acceptance.actualPublisherCountSemantics = actualCounts;
fs.writeFileSync(acceptanceFile, JSON.stringify(acceptance, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'publisher-counts-034.json'), JSON.stringify({
    recordedAt: new Date().toISOString(), actualOnlyFiveCountReportingEditsFrom012: true,
    actualNewDriverSha256: hash(Buffer.from(current)),
    actualBudgetAndFrozenBenchmarkCodeUnchanged: true, actualNoBenchmarkReplay: true,
    actualCounts, actualCapsuleCopiedFilesAfterAdditions: copies.length
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualPublisherOnlyCountReportingChanged: true, actualCounts, actualNoNewMeasurements: true }, null, 2));
