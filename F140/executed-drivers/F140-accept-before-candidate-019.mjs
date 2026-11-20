import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const preparation = path.join(session, 'autoperf-parallelism', 'finding-F140-F141-native-013');
const output = path.join(session, 'autoperf-parallelism', 'finding-F140-implementation-019');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const parser = path.join(session, 'autoperf-published-results', 'F169-F170', 'owner-handoff', 'evidence.mjs');
const { parsePe, parsePdb } = await import(pathToFileURL(parser).href);
const policy = read(path.join(session, 'autoperf-parallelism', 'policy.json'));
assert.equal(policy.actualWorkerBuildHoldActive, false);
assert.equal(policy.workersMayBuildOrTest, true);
assert.equal(fs.existsSync(path.join(session, 'autoperf-parallelism', 'benchmark-exclusive.lease.json')), false);
assert.equal(fs.existsSync(output), false);
assert.equal(read(path.join(session, 'autoperf-campaign.json')).candidates.find(item => item.id === 'F140').status, 'pending');
const xml = read(path.join(preparation, 'native-system-xml-full-reconciliation-019.json'));
assert.equal(xml.actualPassedExecutions, 14);
assert.equal(xml.actualExactFactsAndDefinitionsEntriesExecutionsCountersReconciled, true);
const setup = read(path.join(preparation, 'source-graphs.json'));
const frozen = read(path.join(preparation, 'common-v1-before-functional-017', 'frozen-inputs-and-image.json'));
for (const item of frozen.files)
{
    const bytes = fs.readFileSync(path.join(preparation, item.file));
    assert.equal(bytes.length, item.bytes);
    assert.equal(hash(bytes), item.sha256);
}
assert.equal(frozen.actualSuccessfulCommonCompilesSoFar, 1);
fs.mkdirSync(output);
const metadata = [], sources = [], roles = [], incompleteObservations = [];
function walk(directory, relative = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en')).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const logical = relative ? path.join(relative, entry.name) : entry.name;
        return entry.isDirectory() ? walk(path.join(directory, entry.name), logical) : [logical];
    });
}
function inventory(directory)
{
    return walk(directory).map(file =>
    {
        const bytes = fs.readFileSync(path.join(directory, file));
        return { file, bytes: bytes.length, sha256: hash(bytes) };
    });
}
function copyTree(source, destination)
{
    const before = inventory(source);
    for (const item of before)
    {
        const file = path.join(destination, item.file);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.copyFileSync(path.join(source, item.file), file, fs.constants.COPYFILE_EXCL);
    }
    assert.deepEqual(inventory(destination), before);
    return before;
}
function inspectPair(dll, pdb, requiredSources, role)
{
    const peBytes = fs.readFileSync(dll), pdbBytes = fs.readFileSync(pdb);
    const pe = parsePe(peBytes), portable = parsePdb(pdbBytes);
    assert.ok(pe.codeView.some(item => item.guid === portable.guid && item.stamp === portable.stamp));
    const documents = [];
    for (const source of requiredSources)
    {
        const document = portable.documents.find(item => item.name.toLowerCase() === source.toLowerCase());
        assert.ok(document, `Actual raw source Document missing: ${source}`);
        const bytes = fs.readFileSync(source);
        const algorithm = document.algorithm === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256' :
            document.algorithm === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
        assert.ok(algorithm);
        assert.equal(crypto.createHash(algorithm).update(bytes).digest('hex'), document.checksum);
        const logical = path.join('raw-sources', role, source.startsWith(preparation) ? path.relative(preparation, source) :
            path.relative(setup.roles.find(item => item.role === role).graph, source));
        const destination = path.join(output, logical);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, bytes, { flag: 'wx' });
        sources.push({ source, copiedAs: logical, bytes: bytes.length, sha256: hash(bytes) });
        documents.push({ ...document, actualRawBytesSha256: hash(bytes), actualChecksumAlgorithm: algorithm, actualCopiedAs: logical });
    }
    metadata.push({ role, dll, pdb, peSha256: hash(peBytes), pdbSha256: hash(pdbBytes), pe, portablePdb: portable, freshlyVerifiedSelectedRawDocuments: documents });
    return pe;
}
for (const role of setup.roles)
{
    const git = args =>
    {
        const child = spawnSync('git', ['--no-pager', ...args], { cwd: role.graph, encoding: 'utf8', windowsHide: true });
        assert.equal(child.status, 0, child.stderr);
        return child.stdout.trim();
    };
    assert.equal(git(['rev-parse', 'HEAD']), role.revision);
    assert.equal(git(['status', '--porcelain=v1', '-uno']), '');
    const runtime = role.role === 'Original37' ? '12.0.0-alpha.1.26562.105' : '12.0.0-alpha.1.26569.107';
    const functional = read(path.join(preparation, `functional-${role.role}-017.json`));
    assert.equal(functional.passed.length, 5);
    assert.equal(functional.actualFramework, `.NET ${runtime}`);
    assert.equal(functional.actualDynamicCodeSupported, true);
    assert.equal(functional.actualF141NativeAotOrDisabledDynamicCodeProducerVerified, false);
    const image = path.join(role.graph, String.raw`artifacts\bin\Microsoft.AspNetCore.SignalR.Client.Tests\Release\net12.0`);
    const snapshots = {};
    for (const mode of ['native', 'functional'])
    {
        const complete = read(path.join(preparation, 'invocations', `${role.role}-${mode}-017`, 'completed.json'));
        assert.equal(complete.exitCode, 0);
        assert.ok(complete.actualRootAwaited && complete.actualStdoutAwaited && complete.actualStderrAwaited);
        const directory = path.join(preparation, 'identities', role.role, mode);
        const observations = walk(directory).flatMap(file =>
        {
            const fullPath = path.join(directory, file), bytes = fs.readFileSync(fullPath);
            if (bytes.length === 0)
            {
                assert.equal(mode, 'native');
                assert.equal(file, role.role === 'Original37' ? '44796-6-process-exit.json' : '29792-6-process-exit.json');
                incompleteObservations.push({ role: role.role, mode, file: fullPath, bytes: 0,
                    sha256: hash(bytes), actualValidIdentityObservation: false,
                    limitation: 'Zero-byte native testhost exit snapshot; cause unestablished. Earlier complete selected-owner-load snapshots are the bounded identity evidence, not execution closure.' });
                return [];
            }
            return [read(fullPath)];
        });
        const loaded = observations.filter(item => item.assemblies.some(assembly => assembly.name.startsWith('Microsoft.AspNetCore.SignalR.Client.Tests,')) &&
            item.assemblies.some(assembly => assembly.name.startsWith('Microsoft.AspNetCore.SignalR.Client.Core,')));
        assert.equal(new Set(loaded.map(item => item.pid)).size, 1);
        const last = loaded.sort((a, b) => a.observedUtc.localeCompare(b.observedUtc)).at(-1);
        assert.equal(last.framework, `.NET ${runtime}`);
        for (const name of ['Microsoft.AspNetCore.SignalR.Client.Tests', 'Microsoft.AspNetCore.SignalR.Client.Core', 'System.Private.CoreLib'])
        {
            const assembly = last.assemblies.find(item => item.name.startsWith(name + ','));
            assert.ok(assembly);
            assert.equal(assembly.sha256, hash(fs.readFileSync(assembly.location)));
        }
        for (const name of ['coreclr.dll', 'hostpolicy.dll'])
        {
            const module = last.runtimeModules.find(item => item.name.toLowerCase() === name);
            assert.ok(module.path.includes(runtime));
            assert.equal(module.sha256, hash(fs.readFileSync(module.path)));
        }
        snapshots[mode] = last;
    }
    assert.notEqual(snapshots.native.pid, snapshots.functional.pid);
    const corePe = inspectPair(path.join(image, 'Microsoft.AspNetCore.SignalR.Client.Core.dll'),
        path.join(image, 'Microsoft.AspNetCore.SignalR.Client.Core.pdb'), [
            String.raw`src\SignalR\clients\csharp\Client.Core\src\HubConnection.cs`,
            String.raw`src\SignalR\common\Shared\ReflectionHelper.cs`,
            String.raw`src\SignalR\common\Shared\AsyncEnumerableAdapters.cs`
        ].map(file => path.join(role.graph, file)), role.role);
    inspectPair(path.join(image, 'Microsoft.AspNetCore.SignalR.Client.Tests.dll'),
        path.join(image, 'Microsoft.AspNetCore.SignalR.Client.Tests.pdb'), [
            String.raw`src\SignalR\clients\csharp\Client\test\UnitTests\TestConnection.cs`,
            String.raw`src\SignalR\clients\csharp\Client\test\UnitTests\HubConnectionTests.Helpers.cs`,
            String.raw`src\SignalR\clients\csharp\Client\test\UnitTests\HubConnectionTests.cs`,
            String.raw`src\SignalR\clients\csharp\Client\test\UnitTests\HubConnectionTests.Protocol.cs`
        ].map(file => path.join(role.graph, file)), role.role);
    assert.equal(corePe.mvid, functional.actualClientMvid);
    const destination = path.join(output, 'images', role.role, 'baseline');
    const files = copyTree(image, destination);
    roles.push({ ...role, runtime, nativeImage: image, immutableBaselineImage: destination,
        allBaselineImageFiles: files, actualNativePassedFacts: 7, actualPublicProducerChecksPassed: 5,
        actualLoadedSnapshots: snapshots });
}
inspectPair(path.join(preparation, 'common-image', 'AutoPerf.SignalR.Probe.dll'),
    path.join(preparation, 'common-image', 'AutoPerf.SignalR.Probe.pdb'),
    [path.join(preparation, 'common-inputs', 'Program.cs'), path.join(preparation, 'common-inputs', 'StartupHook.cs')], 'CommonV1');
const performanceAcceptance = {
    frozenBeforeCandidateOrCounter: true,
    measurementFramework: 'Custom process-wide GC.GetTotalAllocatedBytes(precise:true) and Stopwatch, not BenchmarkDotNet.',
    boundary: 'Actual public HubConnection.SendCoreAsync and actual native test transport raw frame reader; exact entire serialized frame compared each operation, no socket/server/browser throughput claim.',
    primaryDataset: 'One fixed send with Guid00112233-4455-6677-8899-aabbccddeeff, Payload(7,payload), List<int>{3,5,8}, and object; all TypeCode.Object. No input substitution after results.',
    unchangedControlDataset: 'One fixed primitive/null/string/enum/DateTime/decimal send retaining the existing TypeCode guard.',
    changedPathNonregressionDataset: 'One fixed Payload(7,payload) plus object send; both runtime types have no implemented interfaces.',
    operationsPerObservationPerDataset: 8192,
    warmupOperationsPerDatasetPerFreshVariantProcess: 128,
    pairedObservationsPerSourceRole: 7,
    freshVariantProcessPerObservation: true,
    variantOrder: 'Alternate baseline/candidate by pair index.',
    datasetOrder: 'Rotate the fixed [primary,primitive-control,no-interface] dataset list by pairIndex modulo3, same order within each pair.',
    primaryAllocationGeomeanMaximumRatio: 0.95,
    primaryAllocationMinimumFavorablePairs: 6,
    minimumMeanAbsoluteAllocatedBytesSavedPerObservation: 1048576,
    absoluteSavingExplanation: 'At least128bytes saved per completed public send over8192sends, below the two representative interface-array copies; not a claim about all argument shapes.',
    primaryElapsedGeomeanMaximumRatio: 1.10,
    unchangedControlAllocationGeomeanRatioRange: [0.95, 1.05],
    unchangedControlElapsedGeomeanRatioRange: [0.90, 1.10],
    changedPathAllocationGeomeanMaximumRatio: 1.05,
    changedPathElapsedGeomeanMaximumRatio: 1.05,
    maximumComparisonsIncludingFailedOrPartial: 3,
    executeDefaultOnlyIfOriginalIndependentlyPasses: true,
    bothRolesMustIndependentlyQualify: true,
    noRolePoolingOrResultDrivenRetryOrTuning: true,
    noMetricsUntilFreshActualOwnerHoldAndGlobalGatewayAdmission: true,
    benchmarkEnvironment: { DOTNET_TieredCompilation: '0', actualPerProcessRuntimePinned: true, actualNormalPriorityAtSampleTimeClaimed: false },
    limitations: 'Steady-state type reuse only; no cold-type, unique-type-churn, network, startup, machine-idleness or universal app-speedup claim.'
};
const receipt = {
    recordedAt: new Date().toISOString(), findingId: 'F140', actualSourceCandidateNotYetWritten: true,
    actualNativeOriginalAndDefaultPassed: 14, actualCommonV1PublicProducerChecksPassed: 10,
    actualCommonV1SuccessfulCompiles: 1, actualCommonV1AllFilesStillFrozen: true,
    actualFreshPePdbPairs: metadata.length, actualFreshSelectedRawDocuments: sources.length,
    actualExpectedSourceTarget: 'HubConnection.PackageStreamingParams only; do not broaden to server/shared reflection helpers or F141.',
    proposedMinimalImplementation: 'Static ConditionalWeakTable<Type,StrongBox<bool>> in Client.Core; cache ReflectionHelper.IsStreamingType only after the existing nonnull TypeCode.Object guard. Weak Type keys; bool values cannot retain collectible types. Primitive/null shortcut and branch/argument behavior unchanged.',
    correctnessAcceptance: [
        'Same real public startup, exact ordinary payloads, async/channel stream IDs/items/completion/disposal/cancellation on all four baseline/candidate role images.',
        'A real collectible ALC type must be classified by the actual PackageStreamingParams producer on a real started connection, then unload after locals leave; direct CWT seeding is not sufficient.',
        'Build Client.Core net12/net462/netstandard2.0/netstandard2.1 using existing native defaults; preserve trimming annotations and public API.',
        'Causal image pairs differ only Client.Core DLL/PDB. All common fixture/helper inputs and bytes plus exact runtime remain identical within each pair.',
        'No Hot Reload handler: classified TypeCode/base/interface shape cannot change via supported in-place metadata edits; no live-edit claim.',
        'F141 actual NativeAOT producer remains unverified and is not implemented or closed by this admission.'
    ],
    performanceAcceptance, roles,
    freshSelectedMetadata: metadata, selectedRawSources: sources,
    actualIncompleteNativeExitIdentityObservations: incompleteObservations,
    actualKnownPidState: read(path.join(preparation, 'fresh-known-native-pid-state-019.json')),
    actualKnownPidStateLimitation: 'PID44448 is now an unrelated svchost.exe created after its earlier recorded SDK-runner exit; never stop it or infer an active owned native command from PID reuse.',
    actualPriorFailedAdmissionDriver: path.join(session, 'F140-accept-before-candidate-018.mjs'),
    actualPriorFailedAdmissionPreserved: path.join(session, 'autoperf-parallelism', 'finding-F140-implementation-018'),
    actualMetadataParserSource: parser, actualMetadataParserSha256: hash(fs.readFileSync(parser)),
    actualFullCompilerInputOrExecutionClosureAttestation: false,
    actualNoCandidateOrCounterOrComparisonExecutedByAdmission: true
};
fs.writeFileSync(path.join(output, 'acceptance-before-candidate.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
fs.copyFileSync(import.meta.filename, path.join(output, 'executed-admission-driver-019.mjs'));
console.log(JSON.stringify({ actualAdmittedForCandidateOnly: true, actualNativePassed: 14,
    actualPublicProducerChecksPassed: 10, actualFreshPePdbPairs: metadata.length,
    actualSelectedRawDocuments: sources.length, actualBaselines: roles.map(role => ({
        role: role.role, runtime: role.runtime, files: role.allBaselineImageFiles.length,
        bytes: role.allBaselineImageFiles.reduce((sum, item) => sum + item.bytes, 0)
    })), actualCandidates: 0, actualComparisons: 0 }, null, 2));
