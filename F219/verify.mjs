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
for (const item of json('authoritative-copies.json'))
{
    const bytes = fs.readFileSync(local(item.file));
    assert.equal(bytes.length, item.bytes);
    assert.equal(hash(bytes), item.sha256);
}
let documents = 0;
const metadata = json('selected-metadata.json');
assert.equal(metadata.length, 5);
for (const item of metadata)
{
    const pe = parsePe(fs.readFileSync(local(item.dll)));
    const pdb = parsePdb(fs.readFileSync(local(item.pdb)));
    assert.equal(pe.mvid, item.mvid);
    assert.ok(pe.codeView.some(entry => entry.guid === pdb.guid && entry.stamp === pdb.stamp));
    for (const document of item.documents)
    {
        const actual = pdb.documents.find(entry => entry.name === document.name);
        assert.ok(actual);
        const algorithm = actual.algorithm === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256' :
            actual.algorithm === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
        assert.ok(algorithm);
        assert.equal(hash(fs.readFileSync(local(document.raw)), algorithm).toLowerCase(), actual.checksum);
        documents++;
    }
}
assert.equal(documents, 6);
const expected = [
    'GetRequestBody_HandlesJsonBody',
    'GetRequestBody_HandlesJsonBodyWithAttribute',
    'GetRequestBody_HandlesJsonBodyWithConsumesAttribute',
    'GetRequestBody_HandlesJsonBodyWithAcceptsMetadata',
    'GetRequestBody_HandlesJsonBodyOptionality(isOptional: False)',
    'GetRequestBody_HandlesJsonBodyOptionality(isOptional: True)',
    'GetOpenApiRequestBody_SetsNullRequestBodyWithNoParameters',
    'GetRequestBody_HandlesIFormFile(withAttribute: False)',
    'GetRequestBody_HandlesIFormFile(withAttribute: True)',
    'GetRequestBody_HandlesIFormFileOptionality(isOptional: False)',
    'GetRequestBody_HandlesIFormFileOptionality(isOptional: True)',
    'GetRequestBody_HandlesIFormFileCollection(withAttribute: False)',
    'GetRequestBody_HandlesIFormFileCollection(withAttribute: True)',
    'GetRequestBody_HandlesIFormFileCollectionOptionality(isOptional: False)',
    'GetRequestBody_HandlesIFormFileCollectionOptionality(isOptional: True)'
].map(name => 'OpenApiDocumentServiceTests.' + name).sort();
let nativeRows = 0, helperRows = 0;
for (const role of ['Baseline', 'Candidate'])
{
    const trx = parseTrx(fs.readFileSync(local(`preparation/${role}/native/selected.trx`), 'utf8'));
    assert.equal(trx.rows.length, 15);
    assert.equal(trx.definitions.length, 15);
    assert.equal(trx.entries.length, 15);
    assert.ok(trx.rows.every(row => row.outcome === 'Passed'));
    assert.deepEqual(trx.rows.map(row => row.testName).sort(), expected);
    const native = json(`preparation/${role}/native/lifecycle.json`);
    assert.equal(native.actualExitCode, 0);
    assert.equal(native.actualChildAwaitedToExit, true);
    nativeRows += trx.rows.length;
    const inspection = json(`preparation/${role}/inspection/inspection.json`);
    assert.equal(inspection.NoMeasurementExecuted, true);
    assert.deepEqual(inspection.Helper.map(item => item.Name), ['Empty', 'QueryOnly', 'BodyOnly', 'BodyBetweenOtherSources',
        'TwoBodies', 'TwoBodiesWithOtherSources', 'FormsAreNotBody']);
    assert.ok(inspection.Helper.every(item => item.Passed));
    assert.deepEqual(inspection.Documents.map(item => item.EndpointCount), [10, 100, 1000]);
    assert.deepEqual(inspection.Documents.map(item => item.Paths), [12, 102, 1002]);
    assert.deepEqual(inspection.Documents.map(item => item.Operations), [34, 304, 3004]);
    assert.ok(inspection.Documents.every(item => item.ActualUnchangedBenchmarkMethodAlsoCompleted));
    assert.equal(json(`preparation/${role}/inspection/completion.json`).Passed, true);
    helperRows += inspection.Helper.length;
    const identity = json(`preparation/${role}/inspection/identity.json`);
    const owner = identity.Assemblies.find(item => item.FullName.startsWith('Microsoft.AspNetCore.OpenApi,'));
    const selected = metadata.find(item => item.id === role + '-Owner');
    assert.equal(owner.Mvid, selected.mvid);
    assert.equal(owner.Sha256, hash(fs.readFileSync(local(selected.dll))));
    const fixture = identity.Assemblies.find(item => item.FullName.startsWith('Microsoft.AspNetCore.OpenApi.Microbenchmarks,'));
    const selectedFixture = metadata.find(item => item.id === 'Unchanged-Fixture');
    assert.equal(fixture.Mvid, selectedFixture.mvid);
    assert.equal(fixture.Sha256, hash(fs.readFileSync(local(selectedFixture.dll))));
    assert.equal(identity.Runtime, '12.0.0-alpha.1.26562.105');
    assert.equal(identity.IsServerGC, true);
    assert.deepEqual(identity.NativeRuntime.map(item => item.ModuleName).sort(), ['clrjit.dll', 'coreclr.dll', 'hostpolicy.dll']);
}
assert.equal(hash(fs.readFileSync(local('run/plan.json'))), 'D83AC482C2A940298186EE421CE780ECC17A1A711E5514A3E4480FB24F66390C');
assert.equal(hash(fs.readFileSync(local('executed/F219-Original-compare.mjs'))), '23B8CFD070D7A4AD66CEF5C56968C3E193BA692152D442B4DFF91B8826244DB8');
assert.equal(hash(fs.readFileSync(local('run/diagnostic-budget.json'))), 'CACC3FE1D8AF95E0287CDBB2F63B39B7FEF8C433A098997AE73315C0A7B31B03');
const budget = json('run/diagnostic-budget.json');
assert.equal(budget.closed, true);
assert.equal(budget.authorizations.length, 1);
assert.equal(budget.authorizations[0].status, 'failed');
assert.equal(budget.authorizations[0].actualStartedNativeChildren, 1);
assert.equal(budget.authorizations[0].actualWarmupExecutions, 0);
assert.equal(budget.authorizations[0].actualCounterMeasurements, 0);
assert.equal(budget.authorizations[0].actualCandidateOrDefaultExecuted, false);
assert.equal(budget.performanceOrAllocationMeasurementsPerformed, false);
assert.equal(json('run/comparisons/001/diagnostic-budget-before-closure.json').authorizations[0].status, 'failed-or-partial');
const failure = fs.readFileSync(local('run/comparisons/001/block-1-BaselineBefore.stdout.txt'), 'utf8');
assert.equal([...failure.matchAll(/cannot be run in-process\./g)].length, 3);
assert.match(failure, /should be instance of InProcessEmitToolchain or InProcessNoEmitToolchain/);
assert.ok(!/^(WorkloadWarmup|WorkloadActual|WorkloadResult|OverheadActual|OverheadWarmup)/m.test(failure));
assert.equal(json('run/comparisons/001/block-1-BaselineBefore.lifecycle.json').actualExitCode, 1);
const retirement = json('run/comparisons/001/explicit-failed-slot-retirement.json');
assert.deepEqual(retirement.actualRecordedGateDriverAndNativePidsAbsent, [26060, 50900, 38660]);
assert.deepEqual(retirement.actualKnownFindingProcessesRemaining, []);
assert.equal(retirement.actualMutexAcquired, true);
assert.equal(retirement.actualLeaseArchivedBeforeRemoval, true);
assert.equal(retirement.actualAutomaticStaleRecovery, false);
assert.equal(retirement.actualNoProcessStopped, true);
assert.equal(json('coordinator-acceptance.json').actualPerformanceQualification, false);
if (process.argv.includes('--require-seal'))
{
    for (const item of json('capsule-file-hashes.json').files)
    {
        const bytes = fs.readFileSync(local(item.file));
        assert.equal(bytes.length, item.bytes);
        assert.equal(hash(bytes), item.sha256);
    }
}
console.log(JSON.stringify({ audit: 'PASS', actualNativeExecutions: nativeRows, actualDistinctNativeRows: 15,
    actualHelperChecks: helperRows, actualSelectedPePdbPairs: metadata.length, actualSelectedRawDocuments: documents,
    actualFailedAuthorizationsConsumed: 1, actualStartedMeasurementModeProcesses: 1,
    actualWarmupsCounterResultsPairsOrControls: 0, actualBudgetPermanentlyClosed: true,
    actualTargetOrCounterInvokedByAudit: false, actualOmittedWholeImagesOrRuntimeRehashed: false }, null, 2));
