import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePe, parsePdb, parseTrx } from './metadata-reader.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const hash = (bytes, algorithm = 'sha256') => crypto.createHash(algorithm).update(bytes).digest('hex').toUpperCase();
const local = logical =>
{
    assert.ok(!path.isAbsolute(logical) && !logical.includes(':') && !logical.split(/[\\/]/).includes('..'));
    return path.join(root, ...logical.split(/[\\/]/));
};
const json = logical => JSON.parse(fs.readFileSync(local(logical), 'utf8').replace(/^\uFEFF/, ''));
const copies = json('authoritative-copies.json');
const copiedSource = source =>
{
    const records = copies.filter(item => item.actualSourcePath.toLowerCase() === source.toLowerCase());
    assert.ok(records.length > 0, source);
    return local(records[0].file);
};
for (const item of copies)
{
    const bytes = fs.readFileSync(local(item.file));
    assert.equal(bytes.length, item.bytes);
    assert.equal(hash(bytes), item.sha256);
}
const metadata = json('selected-metadata.json'), uniquePe = new Set(), uniquePdb = new Set();
let rawAssociations = 0;
for (const item of metadata)
{
    const peBytes = fs.readFileSync(local(item.dll)), pdbBytes = fs.readFileSync(local(item.pdb));
    assert.equal(hash(peBytes), item.peSha256);
    assert.equal(hash(pdbBytes), item.pdbSha256);
    const pe = parsePe(peBytes), pdb = parsePdb(pdbBytes);
    assert.equal(pe.mvid, item.expectedMvid);
    assert.ok(pe.codeView.some(entry => entry.guid === pdb.guid && entry.stamp === pdb.stamp));
    for (const document of item.documents)
    {
        const actual = pdb.documents.find(entry => entry.name.toLowerCase() === document.name.toLowerCase());
        assert.ok(actual, document.name);
        assert.equal(actual.checksum, document.checksum);
        assert.equal(actual.algorithm, document.algorithm);
        const algorithm = actual.algorithm === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256' :
            actual.algorithm === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
        assert.ok(algorithm);
        assert.equal(hash(fs.readFileSync(local(document.raw)), algorithm).toLowerCase(), actual.checksum);
        rawAssociations++;
    }
    if (item.phase === 'common-v2') { assert.equal(item.documents.length, pdb.documents.length); }
    uniquePe.add(item.peSha256);
    uniquePdb.add(item.pdbSha256);
}
assert.equal(metadata.length, 22);
assert.equal(rawAssociations, 57);
const expectedFacts = [
    'Microsoft.AspNetCore.SignalR.Client.Tests.HubConnectionTests+Protocol.ClientSendsHandshakeMessageWhenStartingConnection',
    'Microsoft.AspNetCore.SignalR.Client.Tests.HubConnectionTests+Protocol.SendAsyncSendsANonBlockingInvocationMessage',
    'Microsoft.AspNetCore.SignalR.Client.Tests.HubConnectionTests.StreamIntsToServer',
    'Microsoft.AspNetCore.SignalR.Client.Tests.HubConnectionTests.UploadStreamCancellationSendsStreamComplete',
    'Microsoft.AspNetCore.SignalR.Client.Tests.HubConnectionTests.UploadStreamErrorSendsStreamComplete',
    'Microsoft.AspNetCore.SignalR.Client.Tests.HubConnectionTests.ActiveUploadStreamWhenConnectionClosesObservesException',
    'Microsoft.AspNetCore.SignalR.Client.Tests.HubConnectionTests.InvocationCanCompleteBeforeStreamCompletes'
].sort();
let v2Native = 0;
for (const run of json('implementation/native-real-system-xml-024.json').runs)
{
    const file = copiedSource(run.file), bytes = fs.readFileSync(file);
    assert.equal(hash(bytes), run.sha256);
    const trx = parseTrx(bytes.toString('utf8'));
    assert.equal(trx.rows.length, 7);
    assert.ok(trx.rows.every(row => row.outcome === 'Passed'));
    assert.deepEqual(trx.rows.map(row => row.testName).sort(), expectedFacts);
    assert.equal(trx.definitions.length, 7);
    assert.equal(trx.entries.length, 7);
    for (const row of run.rows)
    {
        const actual = trx.rows.find(entry => entry.testId === row.testId);
        assert.equal(actual.executionId, row.executionId);
        assert.equal(actual.testName, row.testName);
    }
    v2Native += trx.rows.length;
}
assert.equal(v2Native, 28);
const checks = [
    'PublicSend.PrimitiveNullStringEnumDateTimeDecimalControl',
    'PublicSend.RepeatedGuidPocoListAndObjectRetainExactArguments',
    'PublicSend.IAsyncEnumerableTwoUploadsExactIdsValuesCompletionAndDisposal',
    'PublicSend.ChannelReaderExactItemsAndCompletionControl',
    'PublicSend.IAsyncEnumerableCancellationCompletesAndDisposesProducer',
    'ActualStartedConnection.CollectibleArgumentTypeClassifiedBeforeSerializationAndUnloads',
    'PublicSend.ExactRawNativeFrame.primary',
    'PublicSend.ExactRawNativeFrame.primitive-control',
    'PublicSend.ExactRawNativeFrame.no-interface'
];
let functionalChecks = 0;
for (const role of ['Original37', 'Default90'])
{
    for (const variant of ['baseline', 'candidate'])
    {
        const report = json(`implementation/invocations/${role}-${variant}-functional-022/functional-result.json`);
        assert.deepEqual(report.passed, checks);
        assert.equal(report.actualCollectibleLifetime.actualClassifierCachePresent, variant === 'candidate');
        assert.equal(report.actualCollectibleLifetime.actualEntryObservedOnlyAfterRealProducer, variant === 'candidate');
        assert.ok(report.actualCollectibleLifetime.actualContextAndTypeCollected &&
            report.actualCollectibleLifetime.actualRealConnectionKeptAliveThroughCollection &&
            report.actualCollectibleLifetime.actualNoPrivateCacheEntrySeeded);
        assert.equal(report.actualF141NativeAotOrDisabledDynamicCodeProducerVerified, false);
        const core = metadata.find(item => item.phase === 'causal-functional' && item.role === role &&
            item.variant === variant && item.owner === 'Microsoft.AspNetCore.SignalR.Client.Core');
        assert.equal(report.actualClientMvid, core.expectedMvid);
        functionalChecks += report.passed.length;
    }
}
const budget = json('run/diagnostic-budget.json'), closure = json('run/failed-admission-closure-031.json');
assert.equal(budget.closed, true);
assert.equal(budget.authorizations.length, 1);
assert.equal(budget.authorizations[0].status, 'failed');
assert.equal(budget.authorizations[0].windows.length, 1);
assert.equal(budget.actualUnusedAuthorizationsPermanentlyClosed, 2);
assert.equal(closure.actualNativeDotnetOrWarmupOrAllocationOrStopwatchExecuted, false);
assert.equal(closure.actualEmptyExecutionsDirectoryObserved, true);
assert.equal(closure.actualIndividualAncestrySubcheckFailureCauseEstablished, false);
assert.equal(closure.actualDefaultAuthorizationAttempted, false);
assert.ok(closure.actualKnownOwnerTerminalChecks.every(item => !item.actualSameOrPossiblyOwnedCreationIdentityLive));
assert.equal(closure.actualFailedLeaseExplicitlyRemovedOnlyAfterTerminalOwnerReview, true);
const nativeRunner = fs.readFileSync(local('executed-drivers/F140-run-variant-027.ps1'));
assert.equal(hash(nativeRunner), budget.authorizations[0].runnerSha256);
assert.ok(nativeRunner.toString('utf8').indexOf("throw 'The actual native ancestry") <
    nativeRunner.toString('utf8').indexOf('[Diagnostics.Process]::Start'));
assert.match(fs.readFileSync(local('run/comparisons/authorization-1-Original37/measure-F140-Original37-baseline-a1-pair0.stderr.txt'), 'utf8'),
    /The actual native ancestry or gateway process-creation identity differs/);
const admission = json('implementation/acceptance-before-candidate.json');
assert.equal(hash(fs.readFileSync(local('implementation/acceptance-before-candidate.json'))),
    'F87E6F884C3D528F7D3833D229C90781D2B41DCFF53D6C5455213030DB35B98B');
assert.deepEqual(json('run/plan.json').protocol, admission.performanceAcceptance);
assert.equal(json('coordinator-acceptance.json').actualPerformanceQualification, false);
assert.equal(json('coordinator-acceptance.json').actualOnlyF140FinalizedF141StillPending, true);
assert.equal(json('implementation/all-four-target-frameworks-fresh-metadata-020.json').actualFreshPePdbPairs, 8);
for (const invalid of admission.actualIncompleteNativeExitIdentityObservations)
{
    assert.equal(fs.readFileSync(copiedSource(invalid.file)).length, 0);
    assert.equal(invalid.actualValidIdentityObservation, false);
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
console.log(JSON.stringify({ audit: 'PASS', actualCopiedFiles: copies.length,
    actualFreshPePdbAssociations: metadata.length, actualUniqueSelectedPeImages: uniquePe.size,
    actualUniqueSelectedPortablePdbs: uniquePdb.size, actualSelectedRawDocumentAssociations: rawAssociations,
    actualV2HistoricalNativeExecutionsNotNewRuns: v2Native, actualV2HistoricalFunctionalChecks: functionalChecks,
    actualFailedAuthorizationsConsumed: 1, actualMeasuredDotnetProcessesOrPairsOrCounterResults: 0,
    actualBudgetPermanentlyClosed: true, actualNoNativeTargetOrCounterInvokedByAudit: true,
    actualOmittedWholeImagesRuntimesOrToolchainRehashed: false }, null, 2));
