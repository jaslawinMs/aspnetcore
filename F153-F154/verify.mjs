import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parsePe, parsePdb, parseTrx } from './metadata-reader.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const local = logical => {
    assert.ok(!path.isAbsolute(logical) && !logical.includes(':') && !logical.split(/[\\/]/).includes('..'));
    return path.join(root, ...logical.split(/[\\/]/));
};
const json = logical => JSON.parse(fs.readFileSync(local(logical), 'utf8').replace(/^\uFEFF/, ''));
const payload = logical => local('owner-handoff/' + logical);
const payloadJson = logical => JSON.parse(fs.readFileSync(payload(logical), 'utf8').replace(/^\uFEFF/, ''));
const copies = json('authoritative-copies.json');
for (const item of copies)
{
    const bytes = fs.readFileSync(local(item.file));
    assert.equal(bytes.length, item.bytes);
    assert.equal(hash(bytes), item.sha256);
}
assert.equal(hash(fs.readFileSync(payload('MANIFEST.json'))),
    '99236168F4F2B34D4604E5B081DE0438FD089FAC9E9E75532D4781780F66EE47');
const ownerCopies = copies.filter(item => item.file.startsWith('owner-handoff/'));
assert.equal(ownerCopies.length, 242);
assert.equal(ownerCopies.reduce((sum, item) => sum + item.bytes, 0), 21604385);
const child = spawnSync(process.execPath, [payload('Audit.cjs')], {
    cwd: payload('.'), encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024
});
assert.ifError(child.error);
assert.equal(child.status, 0, child.stderr + '\n' + child.stdout);
const historicalAudit = JSON.parse(child.stdout);
assert.equal(historicalAudit.audit, 'PASS');
assert.equal(historicalAudit.nativeRows, 24);
assert.equal(historicalAudit.producerRows, 10);
const proofs = payloadJson('evidence/selected-proofs.json');
assert.equal(proofs.length, 3);
let documentsChecked = 0;
const freshMvids = new Map();
for (const proof of proofs)
{
    const pe = parsePe(fs.readFileSync(payload(proof.selectedDll)));
    const pdb = parsePdb(fs.readFileSync(payload(proof.selectedPdb)));
    assert.ok(pe.codeView.some(item => item.guid === pdb.guid && item.stamp === pdb.stamp && item.age === 1));
    freshMvids.set(proof.name, pe.mvid);
    for (const source of proof.selectedRawSources)
    {
        const document = pdb.documents.find(item => item.name === source.pdbDocument);
        assert.ok(document, source.pdbDocument);
        assert.equal(document.algorithm, source.algorithm);
        assert.equal(document.checksum.toUpperCase(), source.checksum);
        assert.equal(hash(fs.readFileSync(payload(source.snapshot))), source.checksum);
        documentsChecked++;
    }
}
assert.equal(documentsChecked, 10);
const producer = payloadJson('evidence/producer-original.json');
assert.equal(freshMvids.get('owner'), producer.owner.mvid);
assert.equal(freshMvids.get('common'), producer.common.mvid);
const rows = payloadJson('evidence/native-test-rows.json');
const reports = [...new Set(rows.map(row => row.runnerXml))];
assert.equal(reports.length, 2);
const names = new Set();
let nativeRows = 0;
for (const file of reports)
{
    const actual = parseTrx(fs.readFileSync(payload(file), 'utf8'));
    assert.equal(actual.rows.length, 12);
    assert.ok(actual.rows.every(row => row.outcome === 'Passed'));
    const expected = rows.filter(row => row.runnerXml === file);
    for (const row of actual.rows)
    {
        assert.equal(expected.filter(item => ['testName', 'testId', 'executionId', 'outcome'].every(key => item[key] === row[key])).length, 1);
        names.add(row.testName);
    }
    nativeRows += actual.rows.length;
}
assert.equal(nativeRows, 24);
assert.equal(names.size, 12);
const ids = ['F153', 'F154'], acceptance = json('coordinator-acceptance.json');
assert.deepEqual(acceptance.findings, ids);
assert.equal(acceptance.outcome, 'rejected');
assert.equal(acceptance.actualFullDefaultOwnerAssertionsReached, false);
assert.equal(acceptance.actualDefaultUnexecutedProducerScenarios, 10);
assert.equal(acceptance.actualHistoricalRuntime69BlockerIsNotPermanent, true);
assert.equal(acceptance.actualPrivateRuntime69NowPresent.actualBuiltDefaultTestHostOrExecutionClaimed, false);
assert.equal(acceptance.actualSuccessfulRequestByteWriteWorkload, false);
assert.equal(acceptance.actualMaterialByteReadFrequencyOrBeneficialCandidateEstablished, false);
const budgets = json('closed-budgets.json');
assert.deepEqual(budgets.map(budget => budget.findingId), ids);
for (const budget of budgets)
{
    assert.equal(budget.closed, true);
    assert.equal(budget.actualComparisons, 0);
    assert.deepEqual(budget.authorizations, []);
    assert.equal(budget.actualUnusedAuthorizationsPermanentlyClosed, 3);
}
assert.equal(json('coordinator-whole-payload-verification.json').actualExitCode, 0);
assert.equal(json('coordinator-independent-selected-metadata.json').actualExitCode, 0);
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
    actualOwnerCapsuleFiles: 242, actualOwnerCapsuleBytes: 21604385,
    actualFreshPePdbPairs: proofs.length, actualFreshPdbRawDocumentChecks: documentsChecked,
    actualStructuralXmlRows: nativeRows, actualDistinctNativeFacts: names.size,
    actualHistoricalProducerScenarios: 10, actualOriginalOnlyExecution: true,
    actualHistoricalOwnerAuditorHadNarrowerParserBoundary: true,
    actualDefaultAssertionsReached: false, actualRuntime69PermanentUnavailabilityClaimed: false,
    actualClosedZeroComparisonBudgets: ids.length, actualOnlyNodeAuditChildStarted: true,
    actualNoNativeTargetOrCounterStarted: true, actualOmittedFullImagesRehashed: false,
    actualFullCompilerInputAttestation: false }, null, 2));
