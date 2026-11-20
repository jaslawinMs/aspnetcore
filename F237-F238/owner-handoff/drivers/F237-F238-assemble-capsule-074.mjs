import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const parallel = path.join(session, 'autoperf-parallelism');
const preparation = path.join(parallel, 'finding-F237-F238-059');
const root = path.join(preparation, 'capsule-074');
const priorTools = path.join(parallel, 'finding-F198-F199-048', 'capsule');
const require = createRequire(import.meta.url);
const metadata = require(path.join(priorTools, 'Metadata.cjs'));
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const read = file => fs.readFileSync(file);
const json = file => JSON.parse(read(file).toString('utf8').replace(/^\uFEFF/, ''));
const entry = json(path.join(preparation, 'entry-plan.json'));
const preflight = json(path.join(preparation, 'selected-metadata-preflight-073.json'));
assert(!fs.existsSync(root), 'Preserve an existing or failed capsule.');
assert(!fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')));
fs.mkdirSync(root);
const write = (logical, data) => {
    const destination = path.join(root, logical);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, Buffer.isBuffer(data) || typeof data === 'string' ? data :
        JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
};
const copies = [];
function copy(source, logical, expected) {
    const bytes = read(source);
    if (expected) assert.equal(hash(bytes), expected.toUpperCase(), source);
    write(logical, bytes);
    copies.push({ file: logical, actualSourcePath: source, bytes: bytes.length, sha256: hash(bytes) });
}
function tree(source, logical) {
    for (const item of fs.readdirSync(source, { withFileTypes: true })) {
        assert(!item.isSymbolicLink());
        const from = path.join(source, item.name), to = path.join(logical, item.name);
        if (item.isDirectory()) tree(from, to);
        else {
            assert(item.isFile());
            copy(from, to);
        }
    }
}
for (const name of ['entry-plan.json', 'executed-prepare-059.mjs', 'independent-github-default-observation.json',
    'Original-git-provider.cs', 'Default-git-provider.cs', 'Original-global.json.snapshot', 'Default-global.json.snapshot',
    'bounded-provider-history.txt', 'area-AGENTS.md', 'BuildFromSource.md', 'PageDirectiveFeature.cs',
    'PageRouteModelFactory.cs', 'registration-and-obsolescence.cs', 'commands.json',
    'selected-metadata-preflight-073.json', 'coordinator-system-xml-072.json']) {
    copy(path.join(preparation, name), path.join('entry', name));
}
tree(path.join(preparation, 'commands'), 'commands');
for (const item of fs.readdirSync(preparation, { withFileTypes: true })) {
    if (item.isDirectory() && item.name.startsWith('common-')) tree(path.join(preparation, item.name), item.name);
}
tree(path.join(preparation, 'preparation-failure-069'), 'preparation-failure-069');
const scoped = [], privateExclusions = [];
for (const item of fs.readdirSync(preparation, { withFileTypes: true }).filter(item =>
    item.isDirectory() && item.name.startsWith('native-'))) {
    const native = path.join(preparation, item.name);
    for (const name of fs.readdirSync(native)) {
        if (name === 'exit.json') continue;
        const source = path.join(native, name), logical = path.join(item.name, name);
        if (fs.statSync(source).isDirectory()) {
            assert.equal(name, 'results', 'Only the native selected-results directory is in scope.');
            tree(source, logical);
        } else {
            assert(['executed-native-command-060.ps1', 'activation.stdout.txt', 'activation.stderr.txt',
                'stdout.txt', 'stderr.txt'].includes(name), `Unreviewed native artifact ${name}`);
            copy(source, logical);
        }
    }
    const derivative = path.join(preparation, 'ownership-063', item.name + '.scoped-receipt.json');
    const receipt = json(derivative);
    assert.equal(receipt.actualScopedDerivativeNotByteExactPrivateReceipt, true);
    assert.equal(receipt.actualDescendantArraysAndCommandLinesOmitted, true);
    assert.equal(hash(read(path.join(native, 'exit.json'))), receipt.actualPrivateReceipt.sha256);
    copy(derivative, path.join(item.name, 'scoped-receipt.json'));
    scoped.push({ directory: item.name, file: path.join(item.name, 'scoped-receipt.json') });
    privateExclusions.push({ category: 'Legacy numeric-parent-only process receipt; unrelated ancestry arrays not public',
        ...receipt.actualPrivateReceipt, actualRawBytesNotIncluded: true });
}
assert.equal(scoped.length, 10);
for (const name of ['exact-block-regressions.json', 'followup-scoped-summary.json', 'executed-reconciliation-063.ps1']) {
    copy(path.join(preparation, 'ownership-063', name), path.join('ownership', name));
}
const oldReconciliation = json(path.join(preparation, 'ownership-063', 'private-chronology-reconciliation.json'));
const invalidAttempt = oldReconciliation.actualAttempts.filter(item => item.actualCertainPreexistingIdentities !== 0);
assert.equal(invalidAttempt.length, 1);
assert.equal(invalidAttempt[0].actualCertainPreexistingIdentities, 11);
const representative = invalidAttempt[0].actualCertainInvalidNumericChains[0];
write('ownership\\scoped-chronology-summary.json', {
    actualNativeAttempt: invalidAttempt[0].attempt,
    actualNativeRootCreationUtc: invalidAttempt[0].actualRootCreationUtc,
    actualNativeRootExitCode: invalidAttempt[0].actualRootExit,
    actualCertainPreexistingIdentities: 11,
    actualRepresentativeChildSecondsBeforeRoot: representative.actualSecondsBeforeRecordedRoot,
    actualLegacyNumericParentChainReachedRecordedRoot: representative.actualNumericChainBoundary === 'RecordedRootNumericPidReached',
    actualTimestampInversionNotOwnedAncestry: true,
    actualHistoricalWrapperFailurePreservedNotRerun: true,
    actualNoUnrelatedPidsExecutableNamesOrCommandLinesPublishedByThisSummary: true,
    actualNoProcessStopOrNativeRerun: true
});
for (const name of ['original-post-root-identity-check-061.json',
    'ownership-063\\private-chronology-reconciliation.json']) {
    const source = path.join(preparation, name), bytes = read(source);
    privateExclusions.push({ category: 'Private original process observation; public bounded summary instead',
        file: source, bytes: bytes.length, sha256: hash(bytes), actualRawBytesNotIncluded: true });
}
write('private-observation-exclusions.json', privateExclusions);
write('native-scoped-receipts.json', scoped);
for (const name of ['F237-F238-prepare-059.mjs', 'F237-F238-native-command-060.ps1',
    'F237-F238-prepare-common-062.mjs', 'F237-F238-ownership-reconcile-063.ps1',
    'F237-F238-common-command-064.ps1', 'F237-F238-prepare-common-066.mjs',
    'F237-F238-prepare-common-069.mjs', 'F237-F238-reconcile-native-072.ps1',
    'F237-F238-preflight-metadata-073.mjs', 'F237-F238-assemble-capsule-074.mjs']) {
    copy(path.join(session, name), path.join('drivers', name));
}
copy(path.join(session, 'F237-F238-audit-capsule-075.mjs'), 'Audit.mjs');
for (const name of ['Metadata.cjs', 'ArtifactChecks.cjs', 'Xml.cjs']) copy(path.join(priorTools, name), name);
const refs = json(path.join(preparation, 'common-070', 'reference-inputs.json'));
const referenceCopies = refs.actualReferences.map(item => {
    const logical = path.join('compiler-reference-images', path.basename(item.file));
    copy(item.file, logical, item.sha256);
    return { ...item, copiedImage: logical };
});
assert.equal(referenceCopies.length, 317);
write('compiler-references.json', referenceCopies);
const compiler = path.dirname(json(path.join(preparation, 'common-Original-Compile-first-070', 'exit.json')).actualArguments[1]);
for (const name of ['csc.dll', 'csc.deps.json', 'csc.runtimeconfig.json',
    'Microsoft.CodeAnalysis.dll', 'Microsoft.CodeAnalysis.CSharp.dll']) {
    copy(path.join(compiler, name), path.join('selected-compiler-files', name));
}
const selected = [];
for (const item of preflight.actualSelectedPairs) {
    const imageBytes = read(item.image), pdbBytes = read(item.pdb);
    assert.equal(hash(imageBytes), item.actualImageSha256);
    assert.equal(hash(pdbBytes), item.actualPdbSha256);
    const fresh = metadata.associate(imageBytes, pdbBytes);
    const image = path.join('selected-images', item.id, path.basename(item.image));
    const pdb = path.join('selected-images', item.id, path.basename(item.pdb));
    copy(item.image, image, item.actualImageSha256);
    copy(item.pdb, pdb, item.actualPdbSha256);
    const documents = fresh.symbols.documents.map(document => {
        const pre = item.actualDocuments.find(value => value.row === document.row);
        assert(pre && pre.name === document.name);
        const raw = document.embedded ?? read(document.name);
        metadata.documentHash(document, raw);
        assert.equal(hash(raw), pre.actualRawSha256);
        const logical = path.join('raw-documents', item.id, document.row + '-' + path.basename(document.name));
        write(logical, raw);
        return { ...pre, raw: logical, gitMembership: null };
    });
    selected.push({ id: item.id, role: item.role, actualGraph: item.graph, image, pdb,
        imageSha256: item.actualImageSha256, pdbSha256: item.actualPdbSha256,
        actualMvid: fresh.image.managed.mvid, actualPdbGuid: fresh.symbols.guid,
        actualPdbStamp: fresh.symbols.stamp, documents });
}
const objects = new Map(), proofs = [];
function gitObject(id, type) {
    if (objects.has(id)) {
        assert.equal(objects.get(id).type, type);
        return read(path.join(root, objects.get(id).file));
    }
    const process = spawnSync('git', ['--no-pager', '-C', String.raw`C:\src\aspnetcore`, 'cat-file', type, id],
        { windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
    assert.ifError(process.error);
    assert.equal(process.status, 0, process.stderr?.toString('utf8'));
    const bytes = process.stdout;
    assert.equal(crypto.createHash('sha1').update(`${type} ${bytes.length}\0`).update(bytes).digest('hex'), id);
    const file = path.join('git-objects', id + '.' + type);
    write(file, bytes);
    objects.set(id, { id, type, file, bytes: bytes.length, sha256: hash(bytes) });
    return bytes;
}
function entries(bytes) {
    const result = [];
    for (let cursor = 0; cursor < bytes.length;) {
        const space = bytes.indexOf(32, cursor), zero = bytes.indexOf(0, space);
        assert(space > cursor && zero > space);
        result.push({ mode: bytes.toString('ascii', cursor, space),
            name: bytes.toString('utf8', space + 1, zero), id: bytes.subarray(zero + 1, zero + 21).toString('hex') });
        cursor = zero + 21;
    }
    return result;
}
for (const role of ['Original', 'Default']) {
    const graph = entry.actualIndependentGraphs[role];
    const commit = role === 'Original' ? entry.actualOriginal : entry.actualPinnedDefault;
    const rootTree = /^tree ([a-f0-9]{40})\n/.exec(gitObject(commit, 'commit').toString('utf8'))?.[1];
    assert(rootTree);
    const related = selected.filter(item => item.role === role).flatMap(item =>
        item.documents.map(document => ({ document, relative: path.relative(graph, document.name) })));
    const paths = new Set(related.filter(item => !item.relative.startsWith('..') &&
        !path.isAbsolute(item.relative)).map(item => item.relative));
    for (const relative of ['global.json', 'Directory.Build.props', 'Directory.Build.targets',
        'eng\\Versions.props', 'src\\Mvc\\Directory.Build.props', 'src\\Mvc\\Directory.Build.targets',
        'src\\Mvc\\Mvc.Razor.RuntimeCompilation\\src\\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.csproj',
        'src\\Mvc\\Mvc.Razor.RuntimeCompilation\\test\\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.csproj',
        'src\\Mvc\\Mvc.RazorPages\\src\\Microsoft.AspNetCore.Mvc.RazorPages.csproj',
        'src\\Mvc\\Mvc.RazorPages\\src\\DependencyInjection\\MvcRazorPagesMvcCoreBuilderExtensions.cs']) paths.add(relative);
    for (const relative of [...paths].sort()) {
        let current = rootTree, blob = null;
        const parts = relative.split(path.sep), chain = [];
        for (let index = 0; index < parts.length; index++) {
            const found = entries(gitObject(current, 'tree')).filter(item => item.name === parts[index]);
            if (found.length === 0) break;
            assert.equal(found.length, 1);
            chain.push({ tree: current, ...found[0] });
            if (index === parts.length - 1) {
                blob = found[0].id;
                gitObject(blob, 'blob');
            } else {
                assert.equal(found[0].mode, '40000');
                current = found[0].id;
            }
        }
        const rawDocuments = related.filter(item => item.relative === relative).map(item => item.document);
        if (!blob) {
            assert(rawDocuments.length === 0 || !relative.startsWith('src\\'),
                `An expected tracked native source document is absent: ${relative}`);
            for (const document of rawDocuments) document.actualGitAbsence = 'Generated/untracked compiler document; no tracked-source membership asserted.';
            continue;
        }
        const rawRelations = [];
        for (const document of rawDocuments) {
            const raw = read(path.join(root, document.raw)), tracked = gitObject(blob, 'blob');
            const relation = raw.equals(tracked) ? 'byte-identical-to-Git-blob' : 'raw-compiler-CRLF-to-Git-LF-only';
            if (!raw.equals(tracked)) assert(Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'), 'utf8').equals(tracked));
            rawRelations.push({ raw: document.raw, relation });
            document.gitMembership = proofs.length;
        }
        proofs.push({ role, commit, rootTree, relative, chain, blob, rawRelations });
    }
}
const ownerProofs = proofs.filter(item => item.relative ===
    'src\\Mvc\\Mvc.Razor.RuntimeCompilation\\src\\RazorProjectPageRouteModelProvider.cs');
assert.equal(ownerProofs.length, 2);
assert(ownerProofs.every(item => item.blob === entry.actualEqualTargetBlob));
write('selected-metadata.json', selected);
write('git-proofs.json', { objects: [...objects.values()], proofs });
const managed = new Map(), results = [];
for (const role of ['Original', 'Default']) {
    const logical = `common-${role}-Run-first-070\\stdout.txt`;
    const actual = json(path.join(root, logical));
    assert.equal(actual.actualStatus, 'PASS');
    assert.equal(actual.actualRole, role);
    for (const image of actual.actualLoadedManagedImages) {
        const key = image.sha256.toUpperCase();
        if (!managed.has(key)) {
            const logical = path.join('observed-managed-images', key, path.basename(image.location));
            copy(image.location, logical, key);
            assert.equal(metadata.pe(read(path.join(root, logical))).managed.mvid, image.mvid);
            managed.set(key, { ...image, copiedImage: logical });
        }
    }
    results.push({ role, file: logical, actualRuntime: actual.actualRuntime, actualPid: actual.actualPid,
        actualRows: actual.actualRows.length, actualChecks: actual.actualRows.reduce((sum, item) => sum + item.actualChecks.length, 0) });
    const graph = entry.actualIndependentGraphs[role];
    const bin = path.join(graph, 'artifacts', 'bin', 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test', 'Release', 'net12.0');
    for (const suffix of ['deps.json', 'runtimeconfig.json']) {
        copy(path.join(bin, 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.' + suffix),
            path.join('native-host-inputs', role, 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.' + suffix));
    }
}
write('observed-managed-images.json', [...managed.values()]);
write('results-index.json', results);
const closing = [];
for (const [role, graph] of Object.entries(entry.actualIndependentGraphs)) {
    const expected = role === 'Original' ? entry.actualOriginal : entry.actualPinnedDefault;
    const head = spawnSync('git', ['--no-pager', '-C', graph, 'rev-parse', 'HEAD'], { windowsHide: true, encoding: 'utf8' });
    const status = spawnSync('git', ['--no-pager', '-C', graph, 'status', '--porcelain', '--untracked-files=no'], { windowsHide: true, encoding: 'utf8' });
    assert.equal(head.status, 0); assert.equal(status.status, 0);
    assert.equal(head.stdout.trim(), expected); assert.equal(status.stdout, '');
    assert(!fs.existsSync(path.join(graph, '.git', 'objects', 'info', 'alternates')));
    closing.push({ role, actualGraph: graph, actualHead: expected, actualTrackedStatus: '',
        actualNoAlternates: true, actualGlobalJsonSha256: hash(read(path.join(graph, 'global.json'))) });
}
const gh = spawnSync('gh', ['api', 'repos/dotnet/aspnetcore/commits/main', '--jq', '.sha'],
    { windowsHide: true, encoding: 'utf8' });
assert.equal(gh.status, 0, gh.stderr);
write('closing-github-default.stdout.txt', gh.stdout);
write('closing-github-default.stderr.txt', gh.stderr);
write('source-closing.json', { actualRecordedAt: new Date().toISOString(), roles: closing,
    actualDefaultPinnedAtEntry: entry.actualPinnedDefault, actualIndependentClosingDefault: gh.stdout.trim(),
    actualNoRetargeting: true, actualNoNativeTestRerun: true });
write('limits.json', {
    actualCharacterizationOnlyNotCandidateOrPerformanceVerdict: true,
    actualNativeTests18AndCommonCases12Checks192Passed: true,
    actualOriginalNativeRootExitZeroButOuterWrapperPostRootOwnershipFailurePreserved: true,
    actualHistoricalNumericParentOnlyAncestryNotReattested: true,
    actualPrivateUnrelatedProcessArraysNotPublishedAndExclusionsFingerprintOriginalBytes: true,
    actualOldAndNewExactSourceSyntheticAdoptionRegressionsAreNotLiveAncestryClosure: true,
    actualAllRootsAndStreamsNotUniversalDescendantOrUnrelatedHostInactivity: true,
    actualNoProcessStoppedOrNativeTestRerunToEraseFailure: true,
    actualOneFailedAndTwoSuccessfulCommonCompilationsAllPreserved: true,
    actualTwoCommon066RunsFailedBeforeAssertionsAtMissingAggregateDependency: true,
    actualCommon069PreparationSourceLineEndingAssertionFailurePreservedNotNativeExecution: true,
    actualAcceptedCommon070UsesActualPublicMvcCoreBuilderRegistrationNotFullMvcAggregate: true,
    actualMalformedDirectiveCompiledPagePrepopulatedModelAndFullHttpBoundariesUnestablished: true,
    actualCommonManagedSnapshotsBeforeSerializationNotNativeTesthostOrManagedExitObservations: true,
    actualCopiedCompilerFilesAndReferencesNotCompilerClrOrCompleteNativeCompilerInputClosure: true,
    actualNoMaterialSupportedDiscoveryWorkloadOrPerformanceBenefitEstablished: true,
    actualActivationConsoleHostMessagesNotByteExactPersistedByInnerActivationRedirections: true
});
write('authoritative-copies.json', copies);
const manifest = [];
function inventory(directory, relative = '') {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
        assert(!item.isSymbolicLink());
        const logical = path.join(relative, item.name), file = path.join(directory, item.name);
        if (item.isDirectory()) inventory(file, logical);
        else {
            assert(item.isFile());
            const bytes = read(file);
            manifest.push({ file: logical, bytes: bytes.length, sha256: hash(bytes) });
        }
    }
}
inventory(root);
manifest.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
write('MANIFEST.json', { files: manifest, actualPayloadFiles: manifest.length,
    actualPayloadBytes: manifest.reduce((sum, item) => sum + item.bytes, 0) });
console.log(JSON.stringify({ actualAssembled: true, actualRoot: root, actualPayloadFiles: manifest.length,
    actualPayloadBytes: manifest.reduce((sum, item) => sum + item.bytes, 0),
    actualSelectedPairs: selected.length, actualRawDocuments: selected.reduce((sum, item) => sum + item.documents.length, 0),
    actualCompilerReferenceImages: referenceCopies.length, actualManagedImageFiles: managed.size,
    actualGitMemberships: proofs.length, actualGitObjects: objects.size,
    actualNoBudgetClosureOrCandidateOrNativeRerun: true }, null, 2));
