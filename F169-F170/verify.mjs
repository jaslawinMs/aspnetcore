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
    '15E091621FAF40F0CAF7AFE91D2BFE5B9D10C9BD9D451366FB49273C9AF53E3F');
const ownerCopies = copies.filter(item => item.file.startsWith('owner-handoff/'));
assert.equal(ownerCopies.length, 173);
assert.equal(ownerCopies.reduce((sum, item) => sum + item.bytes, 0), 66904424);
const child = spawnSync(process.execPath, ['--permission', '--allow-fs-read=' + local('owner-handoff'),
    local('owner-handoff/audit.mjs')], {
    cwd: local('owner-handoff'), encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024
});
assert.ifError(child.error);
assert.equal(child.status, 0, child.stderr + '\n' + child.stdout);
const audit = JSON.parse(child.stdout);
assert.equal(audit.auditPassed, true);
assert.deepEqual([audit.selectedFiles, audit.selectedBytes, audit.nativeSuccessfulExecutions,
    audit.supplementalSuccessfulExecutions, audit.freshlyParsedPEs, audit.freshlyParsedPDBs,
    audit.rawDocumentAssociations, audit.declaredImageUnionRows, audit.declaredImageDifferenceRows],
    [173, 66904424, 8, 24, 26, 11, 26, 1313, 831]);
assert.equal(audit.commonSuccessfulCompiles, 1);
assert.deepEqual(audit.nativeRuntimes, { original37: '.NET 12.0.0-alpha.1.26562.105', default: '.NET 12.0.0-alpha.1.26569.107' });
assert.equal(audit.supplementalRuntime, '.NET 12.0.0-alpha.1.26557.102');
const ids = ['F169', 'F170'], acceptance = json('coordinator-acceptance.json');
assert.deepEqual(acceptance.findings, ids);
assert.equal(acceptance.outcome, 'rejected');
assert.equal(acceptance.actualSourceHelpersArePrivateTestCodeNotShippedMiddleware, true);
assert.equal(acceptance.actualF169NativeExistingKeyIncrementBranchReached, false);
assert.equal(acceptance.actualF169DiagnosticSeededAndRepeatedStatesUseRealPublicPipeline, true);
assert.equal(acceptance.actualF169PresentKeyBranchUniversallyUnreachableClaimed, false);
assert.equal(acceptance.actualF170SourceDerivedNativeCountCallsNotPerformanceCounter, 8);
assert.equal(acceptance.actualNativeAndSupplementalProcessesAreDistinct, true);
assert.equal(acceptance.actualNotMeasuredNoGainOrZeroCost, true);
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
assert.equal(coordinator.actualNativePassedExecutions, 8);
assert.equal(coordinator.actualSupplementalPassedExecutions, 24);
const xml = json('coordinator-independent-system-xml.json');
assert.equal(xml.actualParser, 'System.Xml.XmlDocument');
assert.deepEqual(xml.runs.map(run => run.count), [0, 4, 4]);
const ownerRuns = json('owner-handoff/native-tests.json').runs;
for (const run of xml.runs)
{
    const owner = ownerRuns.find(item => item.path === run.path);
    assert.equal(run.sha256, hash(fs.readFileSync(local('owner-handoff/' + run.path))));
    assert.equal(run.outcome, owner.parsed.outcome);
    assert.equal(run.count, owner.parsed.rows.length);
    assert.deepEqual(run.rows.map(row => row.testName).sort(), owner.parsed.rows.map(row => row.testName).sort());
    assert.ok(run.rows.every(row => row.outcome === 'Passed'));
}
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
    actualOwnerCapsuleFiles: 173, actualOwnerCapsuleBytes: 66904424,
    actualFreshSelectedMetadataAndXmlAuditor: audit,
    actualHistoricalNativePassedExecutionsNotNewRuns: 8,
    actualHistoricalSupplementalChecksNotNewRuns: 24,
    actualClosedZeroComparisonBudgets: ids.length,
    actualOnlyPermissionBoundedNodeAuditChildStarted: true,
    actualNoNativeTargetOrCounterStarted: true,
    actualOmittedFullImagesRehashed: false, actualFullCompilerInputAttestation: false }, null, 2));
