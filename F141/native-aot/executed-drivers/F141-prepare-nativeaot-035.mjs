import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parsePe, parsePdb } from './autoperf-published-results/F169-F170/owner-handoff/evidence.mjs';

const session = path.dirname(fileURLToPath(import.meta.url)), parallel = path.join(session, 'autoperf-parallelism');
const root = path.join(parallel, 'finding-F141-nativeaot-035');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.deepEqual(fs.readdirSync(root), ['testassets']);
const policy = read(path.join(parallel, 'policy.json'));
assert.equal(policy.actualWorkerBuildHoldActive, false);
assert.equal(policy.workersMayBuildOrTest, true);
assert.equal(read(path.join(session, 'autoperf-campaign.json')).candidates.find(item => item.id === 'F141').status, 'pending');
const original = '37e809ead5824bc753a1c3d56f11615bdb1296c5', observed = '83d976704fa0f9aa4361327d1f9d929c93bd9256';
const git = args =>
{
    const result = spawnSync('git', ['--no-pager', ...args], { cwd: String.raw`C:\src\aspnetcore`, encoding: 'utf8' });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
};
const paths = ['src/SignalR/clients/csharp/Client.Core/src/HubConnection.cs',
    'src/SignalR/common/Shared/AsyncEnumerableAdapters.cs', 'src/SignalR/common/Shared/ReflectionHelper.cs'];
const sourceEquality = paths.map(file =>
{
    const originalBlob = git(['rev-parse', original + ':' + file]);
    const observedBlob = git(['rev-parse', observed + ':' + file]);
    assert.equal(originalBlob, observedBlob);
    return { file, originalBlob, observedBlob };
});
const implementation = path.join(parallel, 'finding-F140-implementation-019');
const imageReceipt = read(path.join(implementation, 'accepted-causal-images-before-functional-023.json'));
const baseline = imageReceipt.images.Original37.baseline;
const public140 = path.join(session, 'autoperf-published-results', 'F140');
const coreMetadata = read(path.join(public140, 'selected-metadata.json')).find(item =>
    item.phase === 'causal-functional' && item.role === 'Original37' && item.variant === 'baseline' &&
    item.owner === 'Microsoft.AspNetCore.SignalR.Client.Core');
const copies = [];
function copy(source, logical)
{
    const target = path.join(root, ...logical.split('/')), bytes = fs.readFileSync(source);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes, { flag: 'wx' });
    const record = { file: logical, actualSourcePath: source, bytes: bytes.length, sha256: hash(bytes) };
    assert.equal(hash(fs.readFileSync(target)), record.sha256);
    copies.push(record);
    return record;
}
const libraries = [];
for (const name of ['Microsoft.AspNetCore.SignalR.Client.Core', 'Microsoft.AspNetCore.SignalR.Common',
    'Microsoft.AspNetCore.SignalR.Protocols.Json'])
{
    const dll = path.join(baseline.directory, name + '.dll'), pdb = path.join(baseline.directory, name + '.pdb');
    for (const file of [name + '.dll', name + '.pdb'])
    {
        const expected = baseline.files.find(item => item.file === file);
        assert.equal(hash(fs.readFileSync(path.join(baseline.directory, file))), expected.sha256);
    }
    const pe = parsePe(fs.readFileSync(dll)), symbols = parsePdb(fs.readFileSync(pdb));
    assert.ok(pe.codeView.some(entry => entry.guid === symbols.guid && entry.stamp === symbols.stamp));
    if (name.endsWith('.Core')) { assert.equal(pe.mvid, coreMetadata.expectedMvid); }
    libraries.push({ name, dll: copy(dll, 'testassets/owner-inputs/' + name + '.dll'),
        pdb: copy(pdb, 'testassets/owner-inputs/' + name + '.pdb'), actualPe: pe,
        actualPortablePdbId: { guid: symbols.guid, stamp: symbols.stamp, documents: symbols.documents.length } });
}
for (const document of coreMetadata.documents)
{
    const bytes = fs.readFileSync(path.join(public140, ...document.raw.split('/')));
    const algorithm = document.algorithm === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256' : 'sha1';
    assert.equal(crypto.createHash(algorithm).update(bytes).digest('hex'), document.checksum);
    copy(path.join(public140, ...document.raw.split('/')), 'raw-sources/' + path.basename(document.name));
}
for (const file of ['Program.cs', 'NativeUploadProbe.csproj'])
{
    copy(path.join(root, 'testassets', 'NativeUploadProbe', file), 'frozen-before-first-publish/' + file);
}
for (const file of ['F141-prepare-nativeaot-035.mjs', 'F141-run-nativeaot-036.ps1'])
{
    copy(path.join(session, file), 'executed-drivers/' + file);
}
fs.mkdirSync(path.join(root, 'invocations'));
const graph = String.raw`C:\src\ap-F140-o013`;
const sdk = path.join(graph, '.dotnet', 'sdk', '12.0.100-alpha.1.26557.102');
const plan = {
    recordedAt: new Date().toISOString(), findingId: 'F141', actualPerformanceBenchmarkAuthorized: false,
    actualNoCandidateOrShippingChange: true, actualOriginalSource: original, observedDefaultSource: observed, sourceEquality,
    actualWholeObservedDefaultBuiltOrNativeExecuted: false,
    actualNativeAotRequired: true, actualNoForcedCoreClrRuntimeSwitchAuthorized: true,
    actualActivationGraph: graph, actualGraphF140SourcePatchNotProjectReferenced: true,
    actualOwnerIlInputs: libraries, actualCopiedInputs: copies,
    actualSdkDirectory: sdk,
    actualDotnetHost: path.join(graph, '.dotnet', 'dotnet.exe'),
    actualDotnetHostSha256: hash(fs.readFileSync(path.join(graph, '.dotnet', 'dotnet.exe'))),
    actualSdkDefaultAotAndFrameworkVersion: '12.0.0-alpha.1.26557.102',
    actualNativeAotIsNotTheEarlierNormalCoreClr62Or69AssertionRuntime: true,
    actualProject: path.join(root, 'testassets', 'NativeUploadProbe', 'NativeUploadProbe.csproj'),
    actualPublishDirectory: path.join(root, 'native-publish'),
    actualNugetConfigReadOnly: path.join(graph, 'NuGet.config'),
    actualCppSetup: String.raw`C:\Program Files\Microsoft Visual Studio\18\Enterprise\VC\Auxiliary\Build\vcvars64.bat`,
    actualMandatoryAcceptance: [
        'NativePEwithoutCLRheader;actualIsDynamicCodeSupportedandCompiledfalse',
        'PublicHubConnectionStartAsyncandactualJSONhandshakeonrealSystemIOPipelines',
        'PublicintIAsyncEnumerableactualuniquestreamIDs,entireinvocation/item/completionframes,enumeratoronce/disposeonce',
        'Actualcompilergeneratedintasynciteratorwithrealfinally',
        'Reference-typestringandvalue-typechannelindependentcontrols',
        'Actualconnectionandserviceproviderclosed;allownednativerootsandstreamsdrained',
        'Nohelperperfcount,allocation,Stopwatch,warmup,benchmark,candidateortimingclaim'
    ],
    actualF141FrequencyBound: 'Source-derivedonehelperlookupperReflectionAsyncEnumeratorconstruction,notperitem;producerfunctionalcountsarenothelperperformancecounts',
    actualMaterialApplicationSetupWorkloadEstablished: false,
    actualNoPerformanceDecisionFromPassingFunctionalProbe: true,
    actualCopiedBytes: copies.reduce((sum, item) => sum + item.bytes, 0),
    actualPriorF140BudgetRemainsPermanentlyClosed: true
};
write(path.join(root, 'acceptance-before-nativeaot-035.json'), plan);
console.log(JSON.stringify({ actualPreparedFinding: 'F141', actualOriginalClientInputMvid: coreMetadata.expectedMvid,
    actualFreshPePdbAssociations: libraries.length, actualTargetBlobsEqualAtObservedDefault: true,
    actualPerformanceBenchmarkAuthorized: false, actualNoDependenciesRestoredOrNativeProcessStarted: true }, null, 2));
