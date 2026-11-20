import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const local = logical =>
{
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
const ownerCopies = copies.filter(item => item.file.startsWith('owner-handoff/'));
assert.equal(ownerCopies.length, 252);
assert.equal(ownerCopies.reduce((sum, item) => sum + item.bytes, 0), 60174576);
assert.equal(hash(fs.readFileSync(local('owner-handoff/manifest.json'))),
    '19D025B5AFB024746EE3D9D29A43940CE3406F8032BFF9CADB6B8C84174AA53B');
const owner = local('owner-handoff');
const child = spawnSync(process.execPath, ['--permission', '--allow-fs-read=' + owner,
    path.join(owner, 'payload', 'Audit.cjs'), '--envelope'], {
    cwd: owner, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024
});
assert.ifError(child.error);
assert.equal(child.status, 0, child.stderr + '\n' + child.stdout);
const audit = JSON.parse(child.stdout);
assert.ok(audit.evidenceAuditPassed && audit.exactSelectedFileSetPassed && audit.envelopeAuditPassed);
assert.deepEqual([audit.selectedFileCount, audit.selectedBytes, audit.managedPePdbPairsFreshlyParsed,
    audit.retainedTargetReferenceImagesFreshlyParsed, audit.nativeTrxFilesFreshlyParsed,
    audit.nativeExecutionRows, audit.distinctExpandedNativeCaseNames, audit.acceptedPrivateProbeRowsPerRole,
    audit.successfulCommonCompilationsTotal, audit.acceptedAllFileImageUnionKeys, audit.acceptedAllFileImageDifferentKeys],
    [248, 59953667, 22, 5, 9, 84, 33, 6, 2, 178, 141]);
assert.deepEqual(audit.imagePrefixExceptions, []);
assert.deepEqual(json('coordinator-portable-audit.json'), audit);
const xml = json('coordinator-independent-system-xml.json');
assert.deepEqual(xml, json('owner-handoff/payload/evidence/xml-system-receipt.json'));
assert.deepEqual(xml.files.map(item => item.results.length).sort((a, b) => a - b), [0, 9, 9, 9, 9, 9, 9, 15, 15]);
const ids = ['F166', 'F167', 'F168'], acceptance = json('coordinator-acceptance.json');
assert.deepEqual(acceptance.findings, ids);
assert.equal(acceptance.outcome, 'rejected');
assert.equal(acceptance.actualNotMeasuredNoGainOrZeroCost, true);
assert.equal(acceptance.actualF167NormalFilesystemOmissionProducerVerified, false);
assert.equal(acceptance.actualF168WriteOnceValueTypeProducerVerified, false);
assert.equal(acceptance.actualCompatibleOneProbeAlternativesRuledOut, false);
const budgets = json('closed-budgets.json');
assert.deepEqual(budgets.map(item => item.findingId), ids);
for (const budget of budgets)
{
    assert.equal(budget.closed, true);
    assert.equal(budget.actualComparisons, 0);
    assert.deepEqual(budget.authorizations, []);
    assert.equal(budget.actualUnusedAuthorizationsPermanentlyClosed, 3);
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
    actualOwnerEnvelopeFiles: 252, actualOwnerEnvelopeBytes: 60174576,
    actualFreshPermissionBoundedMetadataAndXmlAudit: audit,
    actualHistoricalNativeExecutionsNotNewRuns: 84, actualHistoricalAcceptedConsoleRowsNotNewRuns: 12,
    actualClosedZeroComparisonBudgets: 3, actualNoNativeTargetOrCounterStarted: true,
    actualOmittedFullImagesRehashed: false, actualFullCompilerInputOrExecutionClosureAttestation: false }, null, 2));
