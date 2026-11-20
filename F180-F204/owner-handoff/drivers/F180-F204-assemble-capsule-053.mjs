import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const preparation = path.join(session, 'autoperf-parallelism', 'finding-F180-F204-046');
const root = path.join(preparation, 'capsule');
const { parsePe, parsePdb } = await import(pathToFileURL(path.join(preparation, 'portable-metadata.mjs')).href);
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
assert(!fs.existsSync(root), 'Preserve an existing capsule and failed assembly.');
assert(!fs.existsSync(path.join(session, 'autoperf-parallelism', 'benchmark-exclusive.lease.json')));
fs.mkdirSync(root);
const write = (logical, data) => {
    const file = path.join(root, ...logical.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.isBuffer(data) || typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
};
const copies = [];
function copy(source, logical, expectedHash) {
    const bytes = fs.readFileSync(source);
    if (expectedHash) assert.equal(hash(bytes), expectedHash.toUpperCase(), source);
    write(logical, bytes);
    copies.push({ file: logical, actualSourcePath: source, bytes: bytes.length, sha256: hash(bytes) });
}
function tree(directory, logical) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        assert(!entry.isSymbolicLink());
        const source = path.join(directory, entry.name), target = logical + '/' + entry.name;
        if (entry.isDirectory()) tree(source, target);
        else copy(source, target);
    }
}
for (const name of ['commands', 'inherited-pdb-raw', 'common-049', 'execution-050-OriginalSource', 'execution-050-Default'])
    tree(path.join(preparation, name), name);
for (const entry of fs.readdirSync(preparation, { withFileTypes: true })) {
    if (entry.isFile()) copy(path.join(preparation, entry.name), 'entry/' + entry.name);
    else if (entry.isDirectory() && entry.name.startsWith('native-')) tree(path.join(preparation, entry.name), entry.name);
}
for (const name of ['F180-F204-prepare-046.mjs', 'F180-F204-native-command-046.ps1', 'F180-F204-prepare-common-049.mjs',
    'F180-F204-compile-common-049.ps1', 'F180-F204-run-common-050.ps1', 'F180-F204-assemble-capsule-053.mjs'])
    copy(path.join(session, name), 'drivers/' + name);
copy(path.join(session, 'F180-F204-audit-capsule-053.mjs'), 'Audit.mjs');
copy(path.join(preparation, 'portable-metadata.mjs'), 'portable-metadata.mjs');
const references = read(path.join(preparation, 'common-049', 'reference-inputs.json'));
const referenceCopies = references.actualReferences.map(item => {
    const logical = 'compiler-reference-images/' + path.basename(item.file);
    copy(item.file, logical, item.sha256);
    return { ...item, copiedImage: logical };
});
write('compiler-references.json', referenceCopies);
const tool = String.raw`C:\src\aspnetcore\.dotnet\sdk\12.0.100-alpha.1.26557.102\Roslyn\bincore`;
for (const name of ['csc.dll', 'csc.deps.json', 'csc.runtimeconfig.json', 'Microsoft.CodeAnalysis.dll', 'Microsoft.CodeAnalysis.CSharp.dll'])
    copy(path.join(tool, name), 'selected-compiler-files/' + name);
const metadata = [];
for (const [id, image, pdbFile] of [
    ['OriginalSource-owner', 'execution-050-OriginalSource/bin/AzureAppServicesSample.dll', 'execution-050-OriginalSource/bin/AzureAppServicesSample.pdb'],
    ['Default-owner', 'execution-050-Default/bin/AzureAppServicesSample.dll', 'execution-050-Default/bin/AzureAppServicesSample.pdb'],
    ['Common-consumer', 'common-049/AzureSample.CommonProbe.dll', 'common-049/AzureSample.CommonProbe.pdb']
]) {
    const pe = parsePe(fs.readFileSync(path.join(root, image)));
    const pdb = parsePdb(fs.readFileSync(path.join(root, pdbFile)));
    assert(pe.codeView.some(item => item.guid === pdb.guid && item.stamp === pdb.stamp));
    const documents = pdb.documents.map(document => {
        assert.equal(document.algorithm, '8829d00f-11b8-4213-878b-770e8597ac16');
        const logical = `documents/${id}/${document.row}-${path.basename(document.name)}`;
        copy(document.name, logical, document.checksum);
        return { ...document, raw: logical };
    });
    metadata.push({ id, image, pdbFile, pe, pdb: { ...pdb, documents } });
}
write('selected-metadata.json', metadata);
const objects = new Map(), proofs = [];
function gitObject(id, type) {
    if (objects.has(id)) {
        assert.equal(objects.get(id).type, type);
        return fs.readFileSync(path.join(root, objects.get(id).file));
    }
    const result = spawnSync('git', ['--no-pager', '-C', String.raw`C:\src\aspnetcore`, 'cat-file', type, id],
        { windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr?.toString('utf8'));
    const bytes = result.stdout;
    assert.equal(crypto.createHash('sha1').update(`${type} ${bytes.length}\0`).update(bytes).digest('hex'), id);
    const file = `git-objects/${id}.${type}`;
    write(file, bytes);
    objects.set(id, { id, type, file, bytes: bytes.length, sha256: hash(bytes) });
    return bytes;
}
function entries(bytes) {
    const result = [];
    for (let cursor = 0; cursor < bytes.length;) {
        const space = bytes.indexOf(32, cursor), zero = bytes.indexOf(0, space);
        assert(space > cursor && zero > space);
        result.push({ mode: bytes.toString('ascii', cursor, space), name: bytes.toString('utf8', space + 1, zero), id: bytes.subarray(zero + 1, zero + 21).toString('hex') });
        cursor = zero + 21;
    }
    return result;
}
for (const commit of ['37e809ead5824bc753a1c3d56f11615bdb1296c5', 'd3483989953ae3cccd773aea5ea04cb0c7198531']) {
    const commitBytes = gitObject(commit, 'commit');
    const rootTree = /^tree ([a-f0-9]{40})\n/.exec(commitBytes.toString('utf8'))?.[1];
    assert(rootTree);
    for (const file of ['src/Azure/samples/AzureAppServicesSample/Startup.cs', 'src/Azure/samples/AzureAppServicesSample/AzureAppServicesSample.csproj',
        'src/Azure/README.md', 'src/Azure/samples/README.md', 'global.json', 'Directory.Build.props', 'Directory.Build.targets', 'eng/Versions.props']) {
        const parts = file.split('/');
        let current = rootTree, blob;
        const chain = [];
        for (let index = 0; index < parts.length; index++) {
            const found = entries(gitObject(current, 'tree')).filter(item => item.name === parts[index]);
            assert.equal(found.length, 1, file);
            chain.push({ tree: current, name: parts[index], ...found[0] });
            if (index === parts.length - 1) {
                blob = found[0].id;
                gitObject(blob, 'blob');
            } else {
                assert.equal(found[0].mode, '40000');
                current = found[0].id;
            }
        }
        proofs.push({ commit, rootTree, path: file, chain, blob });
    }
}
write('git-proofs.json', { objects: [...objects.values()], proofs });
const managedCopies = new Map();
const results = [];
for (const role of ['OriginalSource', 'Default']) {
    for (const fixture of ['empty', 'singleton', 'mixed']) {
        const logical = `execution-050-${role}/${fixture}/stdout.json`;
        const result = read(path.join(root, logical));
        assert.equal(result.actualStatus, 'PASS');
        for (const image of result.actualLoadedManagedImages) {
            const key = image.sha256.toUpperCase();
            if (!managedCopies.has(key)) {
                const copiedImage = `observed-managed-images/${key}/${path.basename(image.location)}`;
                copy(image.location, copiedImage, key);
                assert.equal(parsePe(fs.readFileSync(path.join(root, copiedImage))).mvid, image.mvid);
                managedCopies.set(key, { ...image, copiedImage });
            }
        }
        results.push({ role, fixture, result: logical, actualPid: result.actualPid, actualRuntime: result.actualRuntime });
    }
}
write('observed-managed-images.json', [...managedCopies.values()]);
write('results-index.json', results);
write('authoritative-copies.json', copies);
write('limits.json', {
    actualInheritedOriginalSourceNativeOwnerPePdbAndAllFourRawDocumentsVerified: true,
    actualInheritedOriginalHistoricalCompilerCommandAndFullDependencySourceCohortNotReconstructed: true,
    actualOriginalSourceNotAFreshOriginal37Build: true,
    actualFreshDefaultWholeSampleAndDependenciesBuiltAt: 'd3483989953ae3cccd773aea5ea04cb0c7198531',
    actualSampleConfigureRequestDelegateAndOsEnvironmentAndRealLoggerFactoryExecuted: true,
    actualNoServerNetworkAzureIisDeploymentSampleMainOrBrowserExecutionClaim: true,
    actualNoCandidateTimingAllocationComparisonOrBudgetAuthorization: true,
    actualCompilerFilesAndRuntimeConfigurationCopiedNotCompilerManagedRuntimeObservationOrCompleteExecutionClosure: true,
    actualManagedSnapshotsBeforeConsoleSerializationNotManagedExitOrNativeModuleInventories: true,
    actualRootExitsAndStreamsNotUniversalDescendantOrUnrelatedHostInactivity: true,
    actualActivationConsoleHostMessagesNotByteExactPersistedByInnerActivationRedirections: true
});
const manifest = [];
function inventory(directory, relative = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        assert(!entry.isSymbolicLink());
        const name = relative ? relative + '/' + entry.name : entry.name;
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) inventory(file, name);
        else {
            const bytes = fs.readFileSync(file);
            manifest.push({ file: name, bytes: bytes.length, sha256: hash(bytes) });
        }
    }
}
inventory(root);
manifest.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
write('MANIFEST.json', { files: manifest, actualPayloadFiles: manifest.length, actualPayloadBytes: manifest.reduce((sum, item) => sum + item.bytes, 0) });
console.log(JSON.stringify({ actualAssembled: true, root, actualPayloadFiles: manifest.length,
    actualPayloadBytes: manifest.reduce((sum, item) => sum + item.bytes, 0),
    actualSelectedPairs: metadata.length, actualSelectedRawDocs: metadata.reduce((sum, item) => sum + item.pdb.documents.length, 0),
    actualGitProofs: proofs.length, actualGitObjects: objects.size, actualManagedImageFiles: managedCopies.size,
    actualNoNewNativeExecutionOrBudgetClosure: true }, null, 2));
