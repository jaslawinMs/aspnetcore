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
assert.equal(acceptance.subtype, 'cold-initialization-modernization-unestablished');
assert.equal(acceptance.actualMeasuredNoGainClaimed, false);
assert.equal(acceptance.actualKnownWrongProbePreserved, 'EmptyCompilePath_NormalizerRejects');
assert.equal(acceptance.actualWrongProbeCountedAsPass, false);
assert.equal(budget.findingId, 'F137');
assert.equal(budget.closed, true);
assert.deepEqual(budget.authorizations, []);
for (const item of read('authoritative-copies.json'))
{
    assert.equal(fs.statSync(path.join(root, item.file)).size, item.bytes);
    assert.equal(hash(item.file), item.sha256);
}
const manifestName = 'owner-handoff/seal-finalization-002/frozen-files.json';
assert.equal(hash(manifestName), '62E19CAD97C1C282FD30310462E402D07CAFC95F1298091E7DCE97FD043ECED1');
const original = read(manifestName), originals = new Map(original.files.map(item => [normalize(item.path), item]));
assert.equal(originals.size, 3998);
assert.equal(original.payloadBytes, 364216896);
const complete = read('coordinator-whole-payload-verification.json');
assert.equal(complete.frozenPayloadFiles, originals.size);
assert.equal(complete.independentEveryByteVerificationPassed, true);
assert.equal(complete.payloadBytes, original.payloadBytes);
const omitted = read('omitted-image-hashes.json').files;
assert.equal(omitted.length, 3592);
const omittedMap = new Map(omitted.map(item => [item.file, item]));
for (const item of omitted)
{
    assert.equal(item.sha256, originals.get(item.file).sha256.toUpperCase());
    assert.equal(item.bytes, originals.get(item.file).length);
}
const images = read('owner-handoff/evidence/complete-image-audit.json');
let entries = 0;
for (const [image, files] of Object.entries(images.imageInventories))
{
    for (const [name, value] of Object.entries(files))
    {
        const selected = omittedMap.get('images/' + image + '/' + normalize(name));
        assert.ok(selected);
        assert.equal(selected.sha256, value.sha256.toUpperCase());
        assert.equal(selected.bytes, value.length);
        entries++;
    }
}
assert.equal(entries, 3592);
assert.equal(images.commonCompiledConsumerByteIdentity.length, 28);
for (const common of images.commonCompiledConsumerByteIdentity)
{
    for (const image of common.images)
    {
        assert.equal(omittedMap.get('images/' + image + '/' + normalize(common.file)).sha256, common.sha256.toUpperCase());
    }
}
assert.equal(images.originalDefaultRealFullImageGate.ownerOnlyImageContractSatisfied, false);
assert.equal(images.originalDefaultRealFullImageGate.sameRuntimeIdentity, false);
assert.equal(images.originalDefaultRealFullImageGate.rejectedDifferenceCount, 367);
assert.equal(images.gateSelfTests.length, 11);
assert.ok(images.gateSelfTests.every(item => item.outcome === 'Passed'));
let selectedAssociations = 0;
for (const [role, runtime] of [['original', '12.0.0-alpha.1.26562.105'], ['default', '12.0.0-alpha.1.26568.110']])
{
    const main = read(`owner-handoff/results/${role}-complete/producer.json`);
    const edge = read(`owner-handoff/results/${role}-empty-edge/producer.json`);
    assert.equal(main.candidateApplied, false);
    assert.equal(main.performanceMeasured, false);
    assert.equal(main.runtime.frameworkDescription, '.NET ' + runtime);
    assert.equal(main.runtime.rollForward, 'Disable');
    assert.equal(main.rows.length, 18);
    assert.equal(main.rows.filter(item => item.outcome === 'Passed').length, 17);
    const failures = main.rows.filter(item => item.outcome === 'Failed');
    assert.equal(failures.length, 1);
    assert.equal(failures[0].name, 'EmptyCompilePath_NormalizerRejects');
    assert.equal(main.assertions, 97);
    assert.equal(edge.name, 'EmptyCompilePath_RealProjectFileSystemRejectsEmptyPath');
    assert.equal(edge.outcome, 'Passed');
    assert.equal(edge.assertions, 5);
    assert.equal(main.assertions + edge.assertions - 1, 101);
    assert.equal(main.ownerIdentities.length, 4);
    for (const owner of main.ownerIdentities)
    {
        for (const [absolute, sha] of [[owner.location, owner.sha256], [owner.pdbPath, owner.pdbSha256]])
        {
            const relative = 'images/' + normalize(absolute).split('/images/')[1];
            assert.equal(omittedMap.get(relative).sha256, sha.toUpperCase());
        }
        const relative = normalize(owner.selectedDocument.physical).split(`/scratch/${role}/`)[1];
        assert.ok(relative);
        assert.equal(hash(`owner-handoff/source/${role}/${relative}`), owner.selectedDocument.physicalSha256.toUpperCase());
        assert.equal(owner.selectedDocument.checksumMatches, true);
        assert.equal(owner.peCodeView.Guid, owner.pdbId.guid);
        assert.equal(owner.peCodeView.Stamp, owner.pdbId.stamp);
        selectedAssociations++;
    }
}
const terminal = read('owner-handoff/evidence/native-process-terminal-audit.json');
assert.equal(terminal.recordedNativeCommands, 65);
assert.equal(terminal.everyObservedNativePidTerminal, true);
assert.ok(terminal.nativeCommandReceipts.flatMap(item => item.observedProcesses).every(item => item.terminalObserved));
const xml = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', path.join(root, 'audit-native-xml.ps1'), '-Root', root],
    { encoding: 'utf8', windowsHide: true });
assert.ifError(xml.error);
assert.equal(xml.status, 0, xml.stderr + '\n' + xml.stdout);
const parsed = JSON.parse(xml.stdout);
assert.equal(parsed.actualTotalNativeXmlRowsPassed, 20);
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
console.log(JSON.stringify({ candidate: 'F137', finalDisposition: 'rejected', subtype: 'cold-initialization-modernization-unestablished',
    actualWholeOriginalPayloadIndependentlyVerified: 3998, actualOriginalPayloadBytes: 364216896,
    actualNativeXmlRowsPassed: 20, actualEveryTheoryValueReconciled: true,
    actualAcceptedProducerCasesPerRole: 18, actualValidChecksPerRole: 101, actualWrongProbePreservedAndNotCountedAsPass: true,
    actualHistoricalSelectedPePdbSourceAssociations: selectedAssociations, actualIndividuallyHashedOmittedImageFiles: entries,
    actualCommonCompiledConsumerFiles: 28, actualNonOwnerPairDifferences: 367, actualCausalPerformancePairAdmitted: false,
    actualRuntimeMismatchPreserved: true, actualCandidateApplied: false, actualComparisons: 0,
    actualMeasuredNoGainOrZeroCostClaimed: false, actualFreshBinaryParsing: false,
    actualNativeBuildTestHostOrBenchmarkStarted: false, sealedFiles }));
