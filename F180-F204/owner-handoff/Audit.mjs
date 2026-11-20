import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parsePe, parsePdb } from './portable-metadata.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
function local(file) {
    assert(!path.isAbsolute(file));
    assert(!file.split(/[\\/]/).includes('..'));
    return path.join(root, ...file.split('/'));
}
const bytes = file => fs.readFileSync(local(file));
const read = file => JSON.parse(bytes(file).toString('utf8').replace(/^\uFEFF/, ''));
const manifest = read('MANIFEST.json');
assert.equal(new Set(manifest.files.map(item => item.file)).size, manifest.files.length);
for (const item of manifest.files) {
    const raw = bytes(item.file);
    assert.equal(raw.length, item.bytes, item.file);
    assert.equal(hash(raw), item.sha256, item.file);
}
assert.equal(manifest.actualPayloadFiles, manifest.files.length);
assert.equal(manifest.actualPayloadBytes, manifest.files.reduce((sum, item) => sum + item.bytes, 0));
for (const item of read('authoritative-copies.json')) {
    assert.equal(bytes(item.file).length, item.bytes);
    assert.equal(hash(bytes(item.file)), item.sha256);
}
const metadata = read('selected-metadata.json');
assert.equal(metadata.length, 3);
let documentsChecked = 0;
for (const item of metadata) {
    const pe = parsePe(bytes(item.image)), pdb = parsePdb(bytes(item.pdbFile));
    assert.deepEqual(pe, item.pe);
    assert(pe.codeView.some(value => value.guid === pdb.guid && value.stamp === pdb.stamp));
    assert.equal(pdb.guid, item.pdb.guid);
    assert.equal(pdb.stamp, item.pdb.stamp);
    assert.equal(pdb.documents.length, item.pdb.documents.length);
    for (let index = 0; index < pdb.documents.length; index++) {
        const document = pdb.documents[index], saved = item.pdb.documents[index];
        const { raw, ...declared } = saved;
        assert.deepEqual(document, declared);
        assert.equal(document.algorithm, '8829d00f-11b8-4213-878b-770e8597ac16');
        assert.equal(hash(bytes(raw)), document.checksum.toUpperCase());
        documentsChecked++;
    }
}
assert.equal(documentsChecked, 9);
const references = read('compiler-references.json');
assert.equal(references.length, 233);
for (const item of references) {
    assert.equal(hash(bytes(item.copiedImage)), item.sha256.toUpperCase());
    assert.deepEqual(parsePe(bytes(item.copiedImage)), item.parsedPe);
}
const git = read('git-proofs.json');
const objects = new Map(git.objects.map(item => [item.id, item]));
assert.equal(objects.size, git.objects.length);
const object = (id, type) => {
    const entry = objects.get(id);
    assert(entry);
    assert.equal(entry.type, type);
    const raw = bytes(entry.file);
    assert.equal(hash(raw), entry.sha256);
    assert.equal(crypto.createHash('sha1').update(`${type} ${raw.length}\0`).update(raw).digest('hex'), id);
    return raw;
};
function treeEntries(raw) {
    const values = [];
    for (let cursor = 0; cursor < raw.length;) {
        const space = raw.indexOf(32, cursor), zero = raw.indexOf(0, space);
        assert(space > cursor && zero > space);
        values.push({ mode: raw.toString('ascii', cursor, space), name: raw.toString('utf8', space + 1, zero), id: raw.subarray(zero + 1, zero + 21).toString('hex') });
        cursor = zero + 21;
    }
    return values;
}
for (const entry of git.objects) object(entry.id, entry.type);
assert.equal(git.proofs.length, 16);
for (const proof of git.proofs) {
    assert.equal(/^tree ([a-f0-9]{40})\n/.exec(object(proof.commit, 'commit').toString('utf8'))?.[1], proof.rootTree);
    let current = proof.rootTree;
    for (const [index, segment] of proof.chain.entries()) {
        assert.equal(segment.tree, current);
        const found = treeEntries(object(current, 'tree')).filter(value => value.name === segment.name);
        assert.equal(found.length, 1);
        assert.equal(found[0].id, segment.id);
        assert.equal(found[0].mode, segment.mode);
        current = segment.id;
        if (index < proof.chain.length - 1) assert.equal(segment.mode, '40000');
    }
    assert.equal(proof.chain.map(item => item.name).join('/'), proof.path);
    assert.equal(current, proof.blob);
    object(proof.blob, 'blob');
}
for (const [id, commit] of [
    ['OriginalSource-owner', '37e809ead5824bc753a1c3d56f11615bdb1296c5'],
    ['Default-owner', 'd3483989953ae3cccd773aea5ea04cb0c7198531']
]) {
    const owner = metadata.find(item => item.id === id);
    const document = owner.pdb.documents.find(item => item.name.endsWith('\\AzureAppServicesSample\\Startup.cs'));
    assert(document);
    const proof = git.proofs.find(item => item.commit === commit && item.path === 'src/Azure/samples/AzureAppServicesSample/Startup.cs');
    assert.equal(proof.blob, 'b70eccbc0a5358e5b3368f9752adefcd2e25a06d');
    assert.deepEqual(Buffer.from(bytes(document.raw).toString('utf8').replaceAll('\r\n', '\n')), object(proof.blob, 'blob'));
}
const compiler = read('common-049/compiler.exit.json');
assert.equal(compiler.actualExitCode, 0);
assert.equal(compiler.actualRootTerminal, true);
assert.equal(compiler.actualStdoutDrained, true);
assert.equal(compiler.actualStderrDrained, true);
assert.equal(hash(bytes('common-049/compile.rsp')), compiler.actualResponseFileSha256);
assert.equal(hash(bytes('selected-compiler-files/csc.dll')), compiler.actualCompilerDllSha256);
assert.equal(read('native-native-build-after-restored-assets/exit.json').actualExitCode, 0);
const required = [
    'ActualLoggerFactoryDebugFilterMatchesFixture',
    'ActualNativeHandlerWritesSuccessfulPlainTextResponse',
    'ActualGreetingContainsParseableCurrentCultureTimestamp',
    'AddressSectionPreservesActualRequestProperties',
    'ConnectionSectionPreservesActualConnectionProperties',
    'UserSectionPreservesPublicIdentityInput',
    'ActualNativeHandlerEmitsHeadersBeforeEnvironment',
    'HeaderValuesPreserveActualHeaderDictionaryValuesWithoutClaimingHeaderOrdering',
    'ActualOsEnvironmentSnapshotIsCompleteValuePairedAndOrdinalIgnoreCaseOrdered',
    'HandlerDoesNotMutateTheOwnedChildEnvironment',
    'RealLoggerFactoryEnabledAndDisabledFilterProducesExactRecordCount'
];
const imageRecords = read('observed-managed-images.json');
const images = new Map(imageRecords.map(item => [item.sha256.toUpperCase(), item]));
for (const item of imageRecords) {
    assert.equal(hash(bytes(item.copiedImage)), item.sha256.toUpperCase());
    assert.equal(parsePe(bytes(item.copiedImage)).mvid, item.mvid);
}
const results = read('results-index.json');
assert.equal(results.length, 6);
assert.equal(new Set(results.map(item => item.role + '/' + item.fixture)).size, 6);
let checks = 0;
const commonHash = hash(bytes('common-049/AzureSample.CommonProbe.dll'));
for (const item of results) {
    const prefix = `execution-050-${item.role}/${item.fixture}`;
    const result = read(item.result), exit = read(prefix + '/exit.json'), environment = read(prefix + '/expected-process-environment.json');
    assert(['OriginalSource', 'Default'].includes(item.role));
    assert(['empty', 'singleton', 'mixed'].includes(item.fixture));
    assert.equal(result.actualPid, exit.actualRootPid);
    assert.equal(exit.actualExitCode, 0);
    assert.equal(exit.actualRootTerminal, true);
    assert.equal(exit.actualStdoutDrained, true);
    assert.equal(exit.actualStderrDrained, true);
    assert.deepEqual(result.actualEnvironment, environment);
    assert.equal(Object.keys(environment).length, { empty: 0, singleton: 1, mixed: 5 }[item.fixture]);
    assert.equal(result.actualRuntime, item.role === 'OriginalSource' ? '.NET 12.0.0-alpha.1.26562.105' : '.NET 12.0.0-alpha.1.26569.107');
    assert.equal(result.actualConsumer.sha256, commonHash);
    assert.equal(result.actualOwner.sha256, hash(bytes(`execution-050-${item.role}/bin/AzureAppServicesSample.dll`)));
    assert.equal(result.actualRows.length, 2);
    for (const [index, row] of result.actualRows.entries()) {
        const enabled = index === 1;
        assert.equal(row.name, enabled ? 'RequestPipeline_DebugEnabled' : 'RequestPipeline_DebugDisabled');
        assert.equal(row.actualDebugEnabled, enabled);
        assert.equal(row.actualStatus, 'PASS');
        const expected = [...required, ...(enabled ? [
            'EnabledRecordPreservesActualCategoryLevelEventAndRenderedMessage',
            'EnabledRecordDocumentsCurrentDynamicallyConcatenatedOriginalFormat'
        ] : [])];
        assert.deepEqual(row.actualChecks, expected);
        checks += row.actualChecks.length;
        const keys = Object.keys(environment).sort((a, b) => a.toUpperCase() < b.toUpperCase() ? -1 : a.toUpperCase() > b.toUpperCase() ? 1 : 0);
        const marker = 'Environment Variables:\r\n';
        assert(row.actualResponse.includes(marker));
        assert.equal(row.actualResponse.slice(row.actualResponse.indexOf(marker) + marker.length),
            [...keys.map(key => key + ': ' + environment[key]), '', ''].join('\r\n'));
        assert.equal(row.actualLoggingRecords.length, enabled ? 1 : 0);
        if (enabled) {
            assert.deepEqual(row.actualLoggingRecords[0], {
                Category: 'Requests', Level: 1, EventId: 0, EventName: null, ExceptionType: null,
                Message: 'Received request: POST /probe/request',
                State: [{ Key: '{OriginalFormat}', Value: 'Received request: POST /probe/request' }]
            });
        }
    }
    assert.equal(result.actualRows[0].actualResponse.split('\r\n').slice(1).join('\r\n'),
        result.actualRows[1].actualResponse.split('\r\n').slice(1).join('\r\n'));
    for (const image of result.actualLoadedManagedImages) assert(images.has(image.sha256.toUpperCase()));
}
assert.equal(checks, 144);
assert.equal(read('limits.json').actualOriginalSourceNotAFreshOriginal37Build, true);
console.log(JSON.stringify({
    actualAudit: 'PASS', actualPayloadFiles: manifest.files.length, actualPayloadBytes: manifest.actualPayloadBytes,
    actualPePdbAssociations: metadata.length, actualRawDocumentChecksums: documentsChecked,
    actualCopiedCompilerReferenceImages: references.length, actualRawGitObjects: objects.size, actualGitProofs: git.proofs.length,
    actualOwnedNativeConsumerProcesses: results.length, actualDebugAndEnvironmentRows: 12, actualChecks: checks,
    actualCommonConsumerMvid: parsePe(bytes('common-049/AzureSample.CommonProbe.dll')).mvid,
    actualCopiedObservedManagedImages: images.size,
    actualNoNativeReplayOrWritesOrChildrenRequired: true,
    actualOriginalHistoricalDependencyCohortAndCompilerNativeRuntimeClosureNotAttested: true,
    actualNoCandidateOrPerformanceOrOutcomeAuthorizedByThisAudit: true
}, null, 2));
