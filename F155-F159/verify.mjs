import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const local = logical => {
    assert.ok(!path.isAbsolute(logical) && !logical.includes(':') && !logical.split(/[\\/]/).includes('..'));
    return path.join(root, ...logical.split(/[\\/]/));
};
const json = logical => JSON.parse(fs.readFileSync(local(logical), 'utf8').replace(/^\uFEFF/, ''));
const copies = json('authoritative-copies.json');
for (const item of copies)
{
    const bytes = fs.readFileSync(local(item.file));
    assert.equal(bytes.length, item.bytes);
    assert.equal(hash(bytes), item.sha256);
}
assert.equal(hash(fs.readFileSync(local('owner-handoff/manifest.json'))),
    'AA02831551402C3CC455BB6F5FB12CF26B9F975FE6B0D9007115E212F9DFEEDD');
const ownerCopies = copies.filter(item => item.file.startsWith('owner-handoff/'));
assert.equal(ownerCopies.length, 159);
assert.equal(ownerCopies.reduce((sum, item) => sum + item.bytes, 0), 86979281);
const child = spawnSync(process.execPath, [local('owner-handoff/audit.mjs')], {
    cwd: local('owner-handoff'), encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024
});
assert.ifError(child.error);
assert.equal(child.status, 0, child.stderr + '\n' + child.stdout);
const audit = JSON.parse(child.stdout);
assert.equal(audit.result, 'PASS');
assert.equal(audit.selectedFiles, 159);
assert.equal(audit.selectedBytes, 86979281);
assert.equal(audit.differencesEnumerated, 1916);
assert.equal(audit.reports.length, 6);
assert.equal(audit.reports.reduce((sum, report) => sum + report.rows, 0), 25);
assert.equal(audit.reports.filter(report => report.rows === 0 && report.outcome === 'Failed').length, 1);
const ids = ['F155', 'F156', 'F157', 'F158', 'F159'];
const acceptance = json('coordinator-acceptance.json');
assert.deepEqual(acceptance.findings, ids);
assert.equal(acceptance.outcome, 'rejected');
assert.equal(acceptance.actualProductionInvocationFrequencyOrMaterialSuiteBenefitEstablished, false);
assert.equal(acceptance.actualReusableSerializerLifetimeOrIsolationEquivalenceVerified, false);
assert.equal(acceptance.actualConsoleIdentitiesRelabeledAsVstestObservations, false);
const budgets = json('closed-budgets.json');
assert.deepEqual(budgets.map(budget => budget.findingId), ids);
for (const budget of budgets)
{
    assert.equal(budget.closed, true);
    assert.equal(budget.actualComparisons, 0);
    assert.deepEqual(budget.authorizations, []);
    assert.equal(budget.actualUnusedAuthorizationsPermanentlyClosed, 3);
}
const coordinator = json('coordinator-whole-payload-verification.json');
assert.equal(coordinator.actualExitCode, 0);
assert.equal(coordinator.actualXmlReports.reduce((sum, report) => sum + report.actualRows, 0), 25);
assert.ok(coordinator.actualXmlReports.every(report => report.actualRealXmlParsed));
if (process.argv.includes('--require-seal'))
{
    for (const item of json('capsule-file-hashes.json').files)
    {
        const bytes = fs.readFileSync(local(item.file));
        assert.equal(bytes.length, item.bytes);
        assert.equal(hash(bytes), item.sha256);
    }
}
console.log(JSON.stringify({ audit: 'PASS', actualUnchangedCopiedFiles: copies.length,
    actualOwnerCapsuleFiles: 159, actualOwnerCapsuleBytes: 86979281,
    actualFreshSelectedMetadataAndXmlAuditor: audit,
    actualHistoricalPassedExecutionsNotNewRuns: 25, actualDistinctFactsPerSourceRole: 5,
    actualClosedZeroComparisonBudgets: ids.length, actualOnlyNodeAuditChildStarted: true,
    actualNoNativeTargetOrCounterStarted: true, actualOmittedFullImagesRehashed: false,
    actualFullCompilerInputAttestation: false }, null, 2));
