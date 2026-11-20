import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const root = path.join(session, 'autoperf-parallelism', 'finding-F140-implementation-019');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const admissionFile = path.join(root, 'acceptance-before-candidate.json');
const admission = read(admissionFile);
const { parsePe, parsePdb } = await import(pathToFileURL(path.join(session, 'autoperf-published-results',
    'F169-F170', 'owner-handoff', 'evidence.mjs')).href);
const output = path.join(root, 'accepted-causal-images-before-functional-023.json');
assert.equal(fs.existsSync(output), false);
assert.equal(fs.existsSync(path.join(session, 'autoperf-parallelism', 'benchmark-exclusive.lease.json')), false);
assert.equal(read(path.join(session, 'autoperf-parallelism', 'policy.json')).actualWorkerBuildHoldActive, false);
assert.equal(read(path.join(root, 'invocations', 'Original37-baseline-build-common-afterrestore-022', 'completed.json')).exitCode, 0);
const clarification = path.join(root, 'pre-execution-dataset-clarification-021.json');
assert.equal(read(clarification).actualResultsOrCountersExistedAtClarification, false);
assert.equal(read(clarification).actualPriorAcceptanceSha256, hash(fs.readFileSync(admissionFile)));
function files(directory, relative = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en')).flatMap(item =>
    {
        assert.equal(item.isSymbolicLink(), false);
        const logical = relative ? path.join(relative, item.name) : item.name;
        return item.isDirectory() ? files(path.join(directory, item.name), logical) : [logical];
    });
}
function inventory(directory)
{
    return files(directory).map(file =>
    {
        const bytes = fs.readFileSync(path.join(directory, file));
        return { file, bytes: bytes.length, sha256: hash(bytes) };
    });
}
const images = {}, runtimeInputs = {}, toolInputs = [], selectedMetadata = [];
for (const role of admission.roles)
{
    const baseline = role.immutableBaselineImage, candidate = path.join(root, 'images', role.role, 'candidate');
    assert.deepEqual(inventory(baseline), role.allBaselineImageFiles);
    assert.equal(fs.existsSync(candidate), false);
    for (const item of role.allBaselineImageFiles)
    {
        const destination = path.join(candidate, item.file);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(path.join(baseline, item.file), destination, fs.constants.COPYFILE_EXCL);
    }
    for (const extension of ['dll', 'pdb'])
    {
        fs.copyFileSync(path.join(role.graph, 'artifacts', 'bin', 'Microsoft.AspNetCore.SignalR.Client.Core',
            'Release', 'net12.0', 'Microsoft.AspNetCore.SignalR.Client.Core.' + extension),
        path.join(candidate, 'Microsoft.AspNetCore.SignalR.Client.Core.' + extension));
    }
    const candidateFiles = inventory(candidate);
    assert.deepEqual(candidateFiles.map(item => item.file), role.allBaselineImageFiles.map(item => item.file));
    const differences = candidateFiles.filter((item, index) => item.sha256 !== role.allBaselineImageFiles[index].sha256);
    assert.deepEqual(differences.map(item => item.file).sort(), [
        'Microsoft.AspNetCore.SignalR.Client.Core.dll', 'Microsoft.AspNetCore.SignalR.Client.Core.pdb'
    ]);
    const dll = path.join(candidate, 'Microsoft.AspNetCore.SignalR.Client.Core.dll');
    const pdb = path.join(candidate, 'Microsoft.AspNetCore.SignalR.Client.Core.pdb');
    const pe = parsePe(fs.readFileSync(dll)), symbols = parsePdb(fs.readFileSync(pdb));
    assert.ok(pe.codeView.some(item => item.guid === symbols.guid && item.stamp === symbols.stamp));
    const source = path.join(role.graph, String.raw`src\SignalR\clients\csharp\Client.Core\src\HubConnection.cs`);
    const document = symbols.documents.find(item => item.name.toLowerCase() === source.toLowerCase());
    const raw = fs.readFileSync(source);
    assert.equal(document.checksum.toUpperCase(), hash(raw));
    const sourceCopy = path.join(root, 'candidate-source', role.role, 'HubConnection.cs');
    fs.mkdirSync(path.dirname(sourceCopy), { recursive: true });
    fs.writeFileSync(sourceCopy, raw, { flag: 'wx' });
    selectedMetadata.push({ role: role.role, variant: 'candidate', pe, symbols, sourceCopy,
        actualRawDocument: document, actualRawSourceSha256: hash(raw) });
    const runtimeDirectory = role.actualLoadedSnapshots.functional.runtimeDirectory;
    runtimeInputs[role.role] = { directory: runtimeDirectory, version: role.runtime, files: inventory(runtimeDirectory) };
    for (const file of [path.join(role.graph, '.dotnet', 'dotnet.exe'),
        ...role.actualLoadedSnapshots.functional.runtimeModules.filter(item => item.name === 'hostfxr.dll').map(item => item.path)])
    {
        const bytes = fs.readFileSync(file);
        toolInputs.push({ role: role.role, file, bytes: bytes.length, sha256: hash(bytes) });
    }
    images[role.role] = { baseline: { directory: baseline, files: role.allBaselineImageFiles },
        candidate: { directory: candidate, files: candidateFiles },
        causalDifferences: differences.map(item => item.file), imagePrefixExceptions: [] };
}
const commonDirectory = path.join(root, 'common-image'), commonFiles = inventory(commonDirectory);
assert.deepEqual(commonFiles.map(item => item.file).sort(), ['AutoPerf.SignalR.Probe.deps.json', 'AutoPerf.SignalR.Probe.dll',
    'AutoPerf.SignalR.Probe.exe', 'AutoPerf.SignalR.Probe.pdb', 'AutoPerf.SignalR.Probe.runtimeconfig.json']);
const commonPe = parsePe(fs.readFileSync(path.join(commonDirectory, 'AutoPerf.SignalR.Probe.dll')));
const commonPdb = parsePdb(fs.readFileSync(path.join(commonDirectory, 'AutoPerf.SignalR.Probe.pdb')));
assert.ok(commonPe.codeView.some(item => item.guid === commonPdb.guid && item.stamp === commonPdb.stamp));
const frozen = path.join(root, 'common-v2-before-functional-023');
assert.equal(fs.existsSync(frozen), false);
const commonInputs = [];
for (const input of ['AutoPerf.SignalR.Probe.csproj', 'Program.cs', 'StartupHook.cs'])
{
    const source = path.join(root, 'common-inputs', input), bytes = fs.readFileSync(source);
    const destination = path.join(frozen, 'inputs', input);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes, { flag: 'wx' });
    commonInputs.push({ source, copiedAs: destination, bytes: bytes.length, sha256: hash(bytes) });
}
for (const item of commonFiles)
{
    const destination = path.join(frozen, 'image', item.file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(commonDirectory, item.file), destination, fs.constants.COPYFILE_EXCL);
}
const commonDocuments = [];
for (const document of commonPdb.documents)
{
    assert.ok(document.name.startsWith(root));
    const bytes = fs.readFileSync(document.name);
    assert.equal(document.algorithm, '8829d00f-11b8-4213-878b-770e8597ac16');
    assert.equal(document.checksum.toUpperCase(), hash(bytes));
    const destination = path.join(frozen, 'raw-documents', String(commonDocuments.length + 1).padStart(3, '0') + '-' + path.basename(document.name));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes, { flag: 'wx' });
    commonDocuments.push({ ...document, actualCopiedAs: destination, actualSha256: hash(bytes) });
}
const record = {
    recordedAt: new Date().toISOString(), findingId: 'F140',
    preCandidateAcceptance: { file: admissionFile, sha256: hash(fs.readFileSync(admissionFile)) },
    preExecutionDatasetClarification: { file: clarification, sha256: hash(fs.readFileSync(clarification)) },
    actualAcceptedCommonVersion: 2, actualAcceptedV2SuccessfulCompiles: 1, actualCommonSuccessfulCompilesTotal: 2,
    actualV2MissingAssetsBuildFailedBeforeCompilation: true,
    actualSharedCommonFiveFileImageByteIdenticalForAllRolesAndVariants: true,
    common: { directory: commonDirectory, files: commonFiles, inputs: commonInputs, pe: commonPe,
        pdb: commonPdb, freshlyVerifiedAllPdbRawDocuments: commonDocuments },
    images, runtimeInputs, toolInputs, selectedCandidateMetadata: selectedMetadata,
    actualPerRoleRuntimeAndPhysicalHostAreIdenticalWithinEachFuturePair: true,
    actualNoCandidateFunctionalExecutionYet: true, actualNoPerformanceCounterOrWarmupOrComparisonYet: true,
    actualCompilerInputExecutionOrWholeToolchainClosureAttestation: false
};
fs.writeFileSync(output, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(frozen, 'frozen-common-v2.json'), JSON.stringify({
    actualVersion: 2, actualV2SuccessfulCompiles: 1, actualSuccessfulCompilesTotalIncludingV1: 2,
    actualBeforeAllV2FunctionalAndMeasurementExecution: true, image: commonFiles, inputs: commonInputs,
    actualCommonPe: commonPe, actualRawDocuments: commonDocuments
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualCausalPairs: Object.entries(images).map(([role, item]) => ({
    role, filesPerImage: item.baseline.files.length, differences: item.causalDifferences,
    actualRuntimeFiles: runtimeInputs[role].files.length
})), actualCommonFiles: commonFiles.length, actualCommonMvid: commonPe.mvid,
actualFreshCommonRawDocuments: commonDocuments.length, actualNoMetricsExecuted: true }, null, 2));
