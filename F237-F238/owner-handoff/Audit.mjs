import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const metadata = require('./Metadata.cjs');
const checks = require('./ArtifactChecks.cjs');
assert(Number(process.versions.node.split('.')[0]) >= 26);
assert(process.execArgv.includes('--permission'));
assert(process.execArgv.includes('--no-addons'));
assert(process.execArgv.includes(`--allow-fs-read=${root}`));
assert(!process.execArgv.some(item => item.startsWith('--allow-') && item !== `--allow-fs-read=${root}`));
for (const permission of ['child', 'worker', 'addons']) assert.equal(process.permission.has(permission), false);
assert.equal(process.permission.has('fs.write', root), false);
assert.equal(process.permission.has('fs.read', path.dirname(root)), false);
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const local = logical => {
    assert.equal(typeof logical, 'string');
    assert(!path.isAbsolute(logical) && !logical.includes('/') && !logical.includes(':'));
    assert(logical.split('\\').every(part => part && part !== '.' && part !== '..'));
    return path.join(root, logical);
};
const read = logical => fs.readFileSync(local(logical));
const json = logical => JSON.parse(read(logical).toString('utf8').replace(/^\uFEFF/, ''));
const manifest = json('MANIFEST.json'), declared = new Set();
let total = 0;
for (const item of manifest.files) {
    assert(!declared.has(item.file) && item.file !== 'MANIFEST.json');
    declared.add(item.file);
    const bytes = read(item.file);
    assert.equal(bytes.length, item.bytes, item.file);
    assert.equal(hash(bytes), item.sha256, item.file);
    total += bytes.length;
}
const actualFiles = [];
function inventory(directory, relative = '') {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
        assert(!item.isSymbolicLink());
        const logical = path.join(relative, item.name), file = path.join(directory, item.name);
        if (item.isDirectory()) inventory(file, logical);
        else {
            assert(item.isFile());
            actualFiles.push(logical);
        }
    }
}
inventory(root);
assert.deepEqual(actualFiles.sort(), [...declared, 'MANIFEST.json'].sort());
assert.equal(manifest.actualPayloadFiles, declared.size);
assert.equal(manifest.actualPayloadBytes, total);
for (const item of json('authoritative-copies.json')) {
    assert.equal(read(item.file).length, item.bytes);
    assert.equal(hash(read(item.file)), item.sha256);
}
const entry = json('entry\\entry-plan.json');
assert.equal(entry.actualOriginal, '37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(entry.actualPinnedDefault, 'd3483989953ae3cccd773aea5ea04cb0c7198531');
const nativeXml = json('entry\\coordinator-system-xml-072.json');
assert.equal(nativeXml.actualPassedExecutions, 18);
assert.equal(nativeXml.actualDistinctNativeCases, 9);
const nativeReceipts = json('native-scoped-receipts.json');
assert.equal(nativeReceipts.length, 10);
let prerequisiteFailures = 0;
for (const item of nativeReceipts) {
    const actual = json(item.file);
    assert.equal(actual.actualScopedDerivativeNotByteExactPrivateReceipt, true);
    assert.equal(actual.actualDescendantArraysAndCommandLinesOmitted, true);
    assert.equal(actual.actualRootTerminal, true);
    assert.equal(actual.actualStdoutDrained, true);
    assert.equal(actual.actualStderrDrained, true);
    assert.equal(Object.hasOwn(actual, 'actualObservedDescendants'), false);
    const expectedExit = actual.attempt === 'initial-no-restore' ||
        actual.attempt === 'after-generated-imports-no-restore' ? 1 : 0;
    assert.equal(actual.actualExitCode, expectedExit);
    if (expectedExit !== 0) prerequisiteFailures++;
    const isOldWarning = actual.role === 'Original' && actual.attempt === 'native-after-restored-assets';
    assert.equal(actual.actualOriginalNativeTestWrapperFailedPostRootOwnershipGuard, isOldWarning);
    assert.equal(actual.actualCertainPreexistingIdentityCount, isOldWarning ? 11 : 0);
}
assert.equal(prerequisiteFailures, 4);
for (const run of nativeXml.runs) {
    const bytes = read(run.file);
    assert.equal(hash(bytes), run.sha256);
    const fresh = checks.trx(bytes, run.rows.map(item => item.method), run.rows[0].codeBase);
    assert.deepEqual(fresh.cases.map(item => item.name).sort(), run.rows.map(item => item.name).sort());
}
const adoption = json('ownership\\exact-block-regressions.json');
assert.equal(adoption.actualExtractedCodeExecutedNotAReimplementedProxy, true);
assert.equal(adoption.actualSyntheticSnapshotRowsNotLiveProcessOwnershipEvidence, true);
assert.equal(adoption.actualCases.length, 7);
assert.equal(adoption.actualCases.filter(item => !item.actualLegacyMatchesExpectation).length, 2);
assert(adoption.actualCases.every(item => item.actualFutureMatchesExpectation &&
    item.actualLegacyMatchesExpectation === item.expectedLegacyMatch));
const chronology = json('ownership\\scoped-chronology-summary.json');
assert.equal(chronology.actualCertainPreexistingIdentities, 11);
assert(chronology.actualRepresentativeChildSecondsBeforeRoot > 24000);
assert.equal(chronology.actualTimestampInversionNotOwnedAncestry, true);
const exclusions = json('private-observation-exclusions.json');
assert.equal(exclusions.length, 12);
assert(exclusions.every(item => item.actualRawBytesNotIncluded && /^[A-F0-9]{64}$/.test(item.sha256)));
const selected = json('selected-metadata.json');
assert.equal(selected.length, 8);
let documents = 0, embedded = 0;
for (const item of selected) {
    const image = read(item.image), pdb = read(item.pdb);
    assert.equal(hash(image), item.imageSha256);
    assert.equal(hash(pdb), item.pdbSha256);
    const fresh = metadata.associate(image, pdb);
    assert.equal(fresh.image.managed.mvid, item.actualMvid);
    assert.equal(fresh.symbols.guid, item.actualPdbGuid);
    assert.equal(fresh.symbols.stamp, item.actualPdbStamp);
    assert.equal(fresh.symbols.documents.length, item.documents.length);
    for (const document of item.documents) {
        const original = fresh.symbols.documents.find(value => value.row === document.row);
        assert.equal(original.name, document.name);
        assert.equal(original.algorithm, document.algorithm);
        assert.equal(original.checksum, document.checksum);
        const bytes = read(document.raw);
        metadata.documentHash(original, bytes);
        assert.equal(bytes.length, document.actualRawBytes);
        assert.equal(hash(bytes), document.actualRawSha256);
        assert.equal(original.embedded !== null, document.actualEmbedded);
        if (original.embedded !== null) {
            assert(original.embedded.equals(bytes));
            embedded++;
        }
        documents++;
    }
}
assert.equal(documents, 328);
assert.equal(embedded, 32);
const refs = json('compiler-references.json');
assert.equal(refs.length, 317);
for (const item of refs) {
    const bytes = read(item.copiedImage);
    assert.equal(hash(bytes), item.sha256);
    assert.equal(bytes.length, item.bytes);
    assert.equal(metadata.pe(bytes).managed.mvid, item.parsedPe.mvid);
}
const git = json('git-proofs.json'), objects = new Map(git.objects.map(item => [item.id, item]));
for (const item of git.objects) {
    const bytes = read(item.file);
    assert.equal(hash(bytes), item.sha256);
    assert.equal(bytes.length, item.bytes);
    assert.equal(crypto.createHash('sha1').update(`${item.type} ${bytes.length}\0`).update(bytes).digest('hex'), item.id);
}
function entries(bytes) {
    const values = [];
    for (let cursor = 0; cursor < bytes.length;) {
        const space = bytes.indexOf(32, cursor), zero = bytes.indexOf(0, space);
        assert(space > cursor && zero > space);
        values.push({ mode: bytes.toString('ascii', cursor, space),
            name: bytes.toString('utf8', space + 1, zero), id: bytes.subarray(zero + 1, zero + 21).toString('hex') });
        cursor = zero + 21;
    }
    return values;
}
for (const [index, proof] of git.proofs.entries()) {
    const commit = objects.get(proof.commit);
    assert.equal(commit.type, 'commit');
    const tree = /^tree ([a-f0-9]{40})\n/.exec(read(commit.file).toString('utf8'))?.[1];
    assert.equal(tree, proof.rootTree);
    assert.equal(proof.commit, proof.role === 'Original' ? entry.actualOriginal : entry.actualPinnedDefault);
    let current = tree;
    const names = [];
    for (const step of proof.chain) {
        assert.equal(step.tree, current);
        const object = objects.get(current);
        assert.equal(object.type, 'tree');
        const found = entries(read(object.file)).filter(value => value.name === step.name);
        assert.equal(found.length, 1);
        assert.deepEqual(found[0], { mode: step.mode, name: step.name, id: step.id });
        names.push(step.name);
        current = step.id;
    }
    assert.equal(names.join('\\'), proof.relative);
    assert.equal(current, proof.blob);
    assert.equal(objects.get(current).type, 'blob');
    for (const relation of proof.rawRelations) {
        const raw = read(relation.raw), tracked = read(objects.get(current).file);
        if (relation.relation === 'byte-identical-to-Git-blob') assert(raw.equals(tracked));
        else {
            assert.equal(relation.relation, 'raw-compiler-CRLF-to-Git-LF-only');
            assert(Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'), 'utf8').equals(tracked));
        }
        const document = selected.flatMap(item => item.documents).find(item => item.raw === relation.raw);
        assert.equal(document.gitMembership, index);
    }
}
const owners = git.proofs.filter(item => item.relative ===
    'src\\Mvc\\Mvc.Razor.RuntimeCompilation\\src\\RazorProjectPageRouteModelProvider.cs');
assert.equal(owners.length, 2);
assert(owners.every(item => item.blob === '07bc493e7b0cebf8930f03aef0211ea29f8b8ac6'));
const managed = new Map(json('observed-managed-images.json').map(item => [item.sha256.toUpperCase(), item]));
for (const item of managed.values()) {
    const bytes = read(item.copiedImage);
    assert.equal(hash(bytes), item.sha256);
    assert.equal(metadata.pe(bytes).managed.mvid, item.mvid);
}
const fixtures = json('common-070\\fixture-plan.json');
const fixtureFiles = json('common-070\\fixture-input-inventory.json');
assert.equal(fixtures.length, 6);
assert.equal(fixtureFiles.length, 32);
for (const file of fixtureFiles) {
    const bytes = read(path.join('common-070', 'fixture-inputs', file.fixture, file.relative));
    assert.equal(bytes.length, file.bytes);
    assert.equal(hash(bytes), file.sha256);
}
const commonHash = hash(read('common-070\\RuntimePageDiscovery.CommonProbe.dll'));
assert.equal(commonHash, 'EE2FE4DC7E540FE28605F697A0FDE264418036A63EDCC1FEDCA012583E1088E6');
let commonRows = 0, commonChecks = 0;
for (const result of json('results-index.json')) {
    const actual = json(result.file);
    assert.equal(actual.actualStatus, 'PASS');
    assert.equal(actual.actualRole, result.role);
    assert.equal(actual.actualConsumer.sha256, commonHash);
    assert.equal(actual.actualRuntime, result.role === 'Original' ?
        '.NET 12.0.0-alpha.1.26562.105' : '.NET 12.0.0-alpha.1.26569.107');
    assert.equal(actual.actualRows.length, 6);
    assert.equal(actual.actualPublicRegistrationBoundary,
        'AddMvcCore().AddRazorPages(...).AddRazorRuntimeCompilation(); not the broader IServiceCollection.AddRazorPages() aggregate');
    assert.equal(actual.actualCompiledPageProducerCaseInsensitiveCompiledModelOverlapAndEndpointHttpBoundaryNotEstablished, true);
    assert.equal(actual.actualNoCandidateTimingAllocationCounterOrPerformanceAuthorization, true);
    for (const image of actual.actualLoadedManagedImages) {
        const copied = managed.get(image.sha256.toUpperCase());
        assert(copied);
        assert.equal(metadata.pe(read(copied.copiedImage)).managed.mvid, image.mvid);
    }
    for (const [index, row] of actual.actualRows.entries()) {
        const fixture = fixtures[index];
        assert.equal(row.name, fixture.Name);
        assert.equal(row.actualStatus, 'PASS');
        assert.equal(row.actualChecks.length, 10 + fixture.Models.length * 2);
        assert.equal(new Set(row.actualChecks).size, row.actualChecks.length);
        assert.equal(row.actualModels.length, fixture.Models.length);
        for (const expected of fixture.Models) {
            const models = row.actualModels.filter(item => item.RelativePath === expected.RelativePath);
            assert.equal(models.length, 1);
            assert.deepEqual(models[0], expected);
        }
        assert.equal(new Set(row.actualModels.map(item => item.RelativePath.toLowerCase())).size, row.actualModels.length);
        assert.equal(row.actualAreaRazorItems.length, fixture.ExpectedAreaItems);
        assert.equal(row.actualNormalRazorItems.length, fixture.ExpectedPageItems);
        const frozenFiles = fixtureFiles.filter(item => item.fixture === fixture.Name)
            .map(item => ({ Path: '/' + item.relative.replaceAll('\\', '/'), Sha256: item.sha256 }))
            .sort((a, b) => a.Path < b.Path ? -1 : a.Path > b.Path ? 1 : 0);
        assert.deepEqual(row.actualPhysicalFiles, frozenFiles);
        for (const item of [...row.actualAreaRazorItems, ...row.actualNormalRazorItems]) {
            assert.equal(item.Exists, true);
            assert(frozenFiles.some(file => file.Path.toLowerCase() === item.CombinedPath.toLowerCase()));
        }
        const area = new Set(fixture.Models.filter(item => item.AreaName !== null).map(item => item.RelativePath));
        const normal = new Set(fixture.Models.filter(item => item.AreaName === null).map(item => item.RelativePath));
        const order = row.actualAreaRazorItems.filter(item => area.has(item.CombinedPath))
            .concat(row.actualNormalRazorItems.filter(item => normal.has(item.CombinedPath))).map(item => item.CombinedPath);
        assert.deepEqual(row.actualModels.map(item => item.RelativePath), order);
        assert.equal(row.actualFirstPassLogs.filter(item => item.EventId === 1).length, fixture.ExpectedUnsupportedAreaWarnings);
        assert.equal(row.actualFirstPassLogs.filter(item => item.EventId === 104).length, fixture.ExpectedMalformedWarnings);
        assert.equal(row.actualFirstPassLogs.length, fixture.ExpectedUnsupportedAreaWarnings + fixture.ExpectedMalformedWarnings);
        assert(row.actualFirstPassLogs.every(item => item.Level === 3));
        for (const observed of [row.actualNativeProvider, row.actualNativeFactoryModels]) {
            assert(selected.some(item => item.role === result.role && item.imageSha256 === observed.sha256 &&
                item.actualMvid === observed.mvid));
        }
        commonRows++;
        commonChecks += row.actualChecks.length;
    }
}
assert.equal(commonRows, 12);
assert.equal(commonChecks, 192);
for (const role of ['Original', 'Default']) {
    const failed = json(`common-${role}-Run-first-066\\exit.json`);
    assert.equal(failed.actualExitCode, -532462766);
    assert(read(`common-${role}-Run-first-066\\stderr.txt`).toString('utf8').includes('Microsoft.AspNetCore.Authorization.Policy'));
    assert.equal(read(`common-${role}-Run-first-066\\stdout.txt`).length, 0);
    const accepted = json(`common-${role}-Run-first-070\\exit.json`);
    assert.equal(accepted.actualExitCode, 0);
    assert.equal(accepted.actualInputConsumerSha256, commonHash);
    assert.equal(accepted.actualOutputConsumerSha256, commonHash);
}
assert.equal(json('common-Original-Compile-first-062\\exit.json').actualExitCode, 1);
for (const cohort of ['066', '070']) {
    assert.equal(json(`common-Original-Compile-first-${cohort}\\exit.json`).actualExitCode, 0);
    assert(read(`common-Original-Compile-first-${cohort}\\stdout.txt`).toString('utf8').includes('warning CS1701:'));
}
const closing = json('source-closing.json');
assert.equal(closing.actualNoRetargeting, true);
for (const role of closing.roles) {
    assert.equal(role.actualTrackedStatus, '');
    assert.equal(role.actualHead, role.role === 'Original' ? entry.actualOriginal : entry.actualPinnedDefault);
    assert.equal(role.actualNoAlternates, true);
}
console.log(JSON.stringify({
    actualAudit: 'PASS', actualNode: process.version,
    actualPayloadFiles: declared.size, actualPayloadBytes: total, actualManifestEnvelopeFiles: 1,
    actualSelectedPePdbAssociations: selected.length, actualRawDocumentsVerified: documents,
    actualEmbeddedRawDocumentsVerified: embedded, actualCompilerReferenceImages: refs.length,
    actualObservedManagedImageFiles: managed.size,
    actualGitMemberships: git.proofs.length, actualRawGitObjects: objects.size,
    actualNativePassedExecutions: 18, actualCommonRows: commonRows, actualCommonChecks: commonChecks,
    actualLegacyNativePrerequisiteFailuresRetained: prerequisiteFailures,
    actualOriginalNativeWrapperOwnershipFailureAndPrivateExclusionsPreserved: true,
    actualNoNativeReplayOrProcessStopOrBudgetAuthorization: true,
    actualPermissionBoundary: { exactCapsuleReadOnly: true, writes: false, children: false, workers: false, addons: false }
}, null, 2));
