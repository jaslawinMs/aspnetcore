import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(process.argv[2] || path.dirname(fileURLToPath(import.meta.url)));
const normalize = name => name.replaceAll('\\', '/');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8').replace(/^\uFEFF/, ''));
const hash = name => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex').toUpperCase();
const acceptance = read('coordinator-acceptance.json'), budget = read('closed-budget.json');
assert.equal(acceptance.finalDisposition, 'rejected');
assert.equal(acceptance.subtype, 'sample-workload-pooling-benefit-unestablished');
assert.equal(acceptance.actualMeasuredNoGainClaimed, false);
assert.equal(acceptance.actualFullCompiledSampleOwner, false);
assert.equal(acceptance.actualWholeRepositoryMaterializationIdentityPassed, false);
assert.equal(acceptance.actualDefaultDiagnosticAnalyzersDisabledAfterRecordedFailure, true);
assert.equal(budget.findingId, 'F146');
assert.equal(budget.closed, true);
assert.deepEqual(budget.authorizations, []);
for (const item of read('authoritative-copies.json'))
{
    assert.equal(fs.statSync(path.join(root, item.file)).size, item.bytes);
    assert.equal(hash(item.file), item.sha256);
}
assert.equal(hash('owner-handoff/MANIFEST.json'), 'CA30BDD5CFF1E771C3CD48E0015BB183FE1721A60D116EEF7B7361C3E9CC4001');
const original = read('owner-handoff/MANIFEST.json'), originals = new Map(original.files.map(item => [normalize(item.path), item]));
assert.equal(originals.size, 632);
const complete = read('coordinator-whole-payload-verification.json');
assert.equal(complete.actualExitCode, 0);
assert.equal(complete.actualAudit.payloadFileCount, 632);
assert.equal(complete.actualAudit.original006PayloadFilesUnchanged, 100);
assert.equal(complete.actualAudit.allHashesMatch, true);
assert.equal(hash('older-preparation-manifest.json'), '24FE014F3A9DC99456169639E6F7C3CF3D8DC58301DBD2293AA238128460B0E2');
assert.equal(read('older-preparation-manifest.json').files.length, 100);
const omitted = read('omitted-file-hashes.json').files, omittedMap = new Map(omitted.map(item => [item.file, item]));
assert.equal(omitted.length, 452);
for (const item of omitted)
{
    assert.equal(item.sha256, originals.get(item.file).sha256.toUpperCase());
    assert.equal(item.bytes, originals.get(item.file).length);
}
const result = read('owner-handoff/EXECUTABLE-RESULTS.json');
assert.equal(result.actualCoreRuntimeVersionAssertedInsideAllSixRows, '12.0.0-alpha.1.26557.102');
assert.equal(result.privateF145Runtime268Used, false);
assert.equal(result.sourceExtractedHandlerNotCompiledSampleOwner, true);
assert.equal(result.managedProducerAndReceivedBehaviorVerified, true);
assert.equal(result.nativeQuicTlsBrowserFullSampleVerified, false);
assert.equal(result.poolingCandidateAppliedOrExecuted, false);
assert.equal(result.poolingUsefulOptimizationEstablished, false);
assert.equal(result.wholeRepositoryMaterializationIdentityPassed, false);
assert.equal(result.defaultDiagnosticAnalyzersDisabledAfterRecordedAD0001, true);
const maps = {};
for (const role of ['Original', 'ObservedDefault'])
{
    const after = read(`owner-handoff/${role}-complete-output-image-after-run.json`);
    const before = read(`owner-handoff/${role}-complete-output-image-before-run.json`);
    const map = new Map(after.map(item => [normalize(item.path), item]));
    assert.equal(map.size, 224);
    assert.equal(before.length, 224);
    for (const item of after)
    {
        const archived = omittedMap.get('verified-images/' + role + '/' + normalize(item.path));
        assert.equal(archived.sha256, item.sha256.toUpperCase());
        assert.equal(archived.bytes, item.bytes);
    }
    for (const item of before)
    {
        assert.equal(map.get(normalize(item.path)).sha256.toUpperCase(), item.sha256.toUpperCase());
        assert.equal(map.get(normalize(item.path)).bytes, item.bytes);
    }
    assert.equal(map.has('WebTransportInteractiveSampleApp.dll'), false);
    maps[role] = map;
}
const differences = [...new Set([...maps.Original.keys(), ...maps.ObservedDefault.keys()])]
    .filter(name => maps.Original.get(name)?.sha256 !== maps.ObservedDefault.get(name)?.sha256);
assert.equal(differences.length, 61);
const imageAudit = read('owner-handoff/COMPLETE-IMAGE-AUDIT.json');
assert.equal(imageAudit.nonSampleOwnerDifferenceCount, differences.length);
assert.equal(imageAudit.commonHarnessCompiledOnce, false);
assert.equal(imageAudit.compiledSampleOwnerPresent, false);
assert.equal(imageAudit.eligibleForPerformanceComparison, false);
const sources = read('raw-compiled-source-associations.json'), pdb = read('owner-handoff/PDB-SOURCE-OWNER-CHECKS.json');
assert.equal(sources.length, 12);
for (const item of sources)
{
    assert.equal(hash(item.file), item.sha256);
    assert.equal(item.sha256, item.pdbDocumentSha256);
    assert.equal(item.pdbHashAlgorithm, '8829d00f-11b8-4213-878b-770e8597ac16');
    const record = pdb.find(entry => entry.role === item.role);
    assert.equal(record.fullCompiledSampleOwner, false);
    const check = [...record.managedProducerSourceDocumentChecks, ...record.extractedBodyAndTestDocumentChecks]
        .find(entry => entry.source === item.actualHistoricalSourcePath);
    assert.equal(check.sha256, item.sha256);
    assert.equal(check.match, true);
}
for (const check of read('owner-handoff/TRX-ROW-CHECKS.json'))
{
    const relative = normalize(check.trx).split('/results/')[1];
    assert.equal(hash('owner-handoff/results/' + relative), check.trxSha256);
    assert.equal(check.rows.length, 3);
    assert.ok(check.rows.every(item => item.outcome === 'Passed'));
}
assert.equal(read('owner-handoff/FINAL-OWNED-PID-CHECK.json').allObservedOwnedPidsTerminal, true);
assert.equal(read('owner-handoff/EXACT-COMMANDS-AND-EXIT-CODES.json').allObservedOwnedPidsTerminalAtCommandCompletion, true);
const xml = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', path.join(root, 'audit-native-xml.ps1'), '-Root', root],
    { encoding: 'utf8', windowsHide: true });
assert.ifError(xml.error);
assert.equal(xml.status, 0, xml.stderr + '\n' + xml.stdout);
assert.equal(JSON.parse(xml.stdout).actualTotalNativeXmlRowsPassed, 6);
let sealedFiles = null;
if (fs.existsSync(path.join(root, 'capsule-file-hashes.json')))
{
    const files = read('capsule-file-hashes.json').files;
    for (const item of files)
    {
        assert.equal(fs.statSync(path.join(root, item.file)).size, item.bytes);
        assert.equal(hash(item.file), item.sha256);
    }
    const enumerate = (directory, relative = '') => fs.readdirSync(directory, { withFileTypes: true }).flatMap(item =>
    {
        assert.equal(item.isSymbolicLink(), false);
        const absolute = path.join(directory, item.name), name = path.join(relative, item.name);
        return item.isDirectory() ? enumerate(absolute, name) : [normalize(name)];
    });
    assert.deepEqual(enumerate(root).filter(name => !['capsule-file-hashes.json', 'publication.json'].includes(name)).sort(),
        files.map(item => item.file).sort());
    sealedFiles = files.length + 1;
}
else
{
    assert.equal(process.argv.includes('--require-seal'), false);
}
console.log(JSON.stringify({ candidate: 'F146', finalDisposition: 'rejected', subtype: 'sample-workload-pooling-benefit-unestablished',
    actualOriginalPayloadFilesVerified: 632, actualOlderFilesVerifiedUnchanged: 100,
    actualSelectedNativeXmlRowsPassed: 6, actualEveryManagedFrameTraceChecked: true,
    actualRealManagedProducerExercised: true, actualCompiledSampleOwnerOrNativeQuicExercised: false,
    actualRawCompiledSourceChecksumAssociations: 12, actualImageEntriesPerRole: 224,
    actualNonSampleOwnerPairDifferences: 61, actualCausalPerformancePairAdmitted: false,
    actualWholeRepositoryMaterializationIdentityClaimed: false, actualFullCiAnalyzerValidationClaimed: false,
    actualCandidateApplied: false, actualComparisons: 0, actualMeasuredNoGainOrZeroAllocationClaimed: false,
    actualFreshOmittedPePdbParsing: false, actualNativeBuildTestHostOrBenchmarkStarted: false, sealedFiles }));
