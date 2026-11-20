import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePe, parsePdb } from './portable-metadata.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
function local(file)
{
    assert.equal(path.isAbsolute(file), false);
    assert.equal(file.split(/[\\/]/).includes('..'), false);
    return path.join(root, ...file.split('/'));
}
const bytes = file => fs.readFileSync(local(file));
const text = file => bytes(file).toString('utf8');
const read = file => JSON.parse(text(file).replace(/^\uFEFF/, ''));
const hash = (buffer, algorithm = 'sha256') => crypto.createHash(algorithm).update(buffer).digest('hex').toUpperCase();
const gitHash = (type, buffer) => hash(Buffer.concat([Buffer.from(`${type} ${buffer.length}\0`), buffer]), 'sha1').toLowerCase();
const copies = read('authoritative-copies.json');
assert.equal(new Set(copies.map(item => item.file)).size, copies.length);
for (const item of copies)
{
    const buffer = bytes(item.file);
    assert.equal(buffer.length, item.bytes, item.file);
    assert.equal(hash(buffer), item.sha256, item.file);
}
const prefix = 'native-aot/';
const plan = read(prefix + 'acceptance-before-nativeaot-035.json');
const preexecution = read(prefix + 'native-preexecution-037.json');
assert.equal(plan.actualPerformanceBenchmarkAuthorized, false);
assert.equal(plan.actualOriginalSource, '37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(plan.observedDefaultSource, '83d976704fa0f9aa4361327d1f9d929c93bd9256');
for (const item of plan.actualCopiedInputs)
{
    assert.equal(hash(bytes(prefix + item.file)), item.sha256);
}
for (const file of ['Program.cs', 'NativeUploadProbe.csproj'])
{
    assert.deepEqual(bytes(prefix + 'testassets/NativeUploadProbe/' + file), bytes(prefix + 'frozen-before-first-publish/' + file));
}
const pairs = read('selected-metadata.json');
assert.equal(pairs.length, 4);
let rawDocuments = 0;
for (const pair of pairs)
{
    const pe = parsePe(bytes(pair.dll)), pdb = parsePdb(bytes(pair.pdb));
    assert.equal(pe.mvid, pair.mvid);
    assert.equal(pdb.guid, pair.guid);
    assert.equal(pdb.stamp, pair.stamp);
    assert.ok(pe.codeView.some(item => item.guid === pdb.guid && item.stamp === pdb.stamp && item.age === 1));
    assert.equal(pdb.documents.length, pair.documents);
    assert.equal(pair.documents - pair.selectedDocuments.length, pair.unselectedDocuments);
    for (const document of pair.selectedDocuments)
    {
        const matches = pdb.documents.filter(item => item.name === document.name);
        assert.equal(matches.length, 1);
        assert.equal(matches[0].algorithm, '8829d00f-11b8-4213-878b-770e8597ac16');
        assert.equal(matches[0].checksum, document.checksum);
        assert.equal(hash(bytes(document.file)).toLowerCase(), document.checksum);
        rawDocuments++;
    }
}
assert.equal(rawDocuments, 7);
assert.equal(pairs[0].mvid, 'fa9377d4-6e2d-45dd-b9cf-11366b22f336');
assert.equal(pairs[3].mvid, '7cc8746d-a38f-4845-9094-7698e651986a');
assert.equal(pairs[3].documents, 16);
assert.equal(pairs[3].unselectedDocuments, 12);
const proofs = read('source-provenance/proofs.json');
assert.equal(proofs.length, 10);
for (const proof of proofs)
{
    const commit = bytes(proof.commitObject);
    assert.equal(gitHash('commit', commit), proof.commit);
    const rootTree = /^tree ([a-f0-9]{40})$/m.exec(commit.toString('utf8'));
    assert.ok(rootTree);
    let current = rootTree[1];
    assert.deepEqual(proof.steps.map(item => item.name), proof.source.split('/'));
    for (const step of proof.steps)
    {
        assert.equal(step.tree, current);
        const buffer = bytes(step.file);
        assert.equal(gitHash('tree', buffer), current);
        let offset = 0;
        const matches = [];
        while (offset < buffer.length)
        {
            const space = buffer.indexOf(32, offset), zero = buffer.indexOf(0, space);
            assert.ok(space > offset && zero > space && zero + 21 <= buffer.length);
            const name = buffer.toString('utf8', space + 1, zero);
            if (name === step.name)
            {
                matches.push({ mode: buffer.toString('ascii', offset, space), id: buffer.subarray(zero + 1, zero + 21).toString('hex') });
            }
            offset = zero + 21;
        }
        assert.deepEqual(matches, [{ mode: step.mode, id: step.id }]);
        current = step.id;
    }
    assert.equal(current, proof.blob);
    assert.equal(gitHash('blob', bytes(proof.blobFile)), proof.blob);
}
for (const source of plan.sourceEquality)
{
    for (const commit of [plan.actualOriginalSource, plan.observedDefaultSource])
    {
        const matches = proofs.filter(item => item.commit === commit && item.source === source.file);
        assert.equal(matches.length, 1);
        assert.equal(matches[0].blob, source.originalBlob);
        assert.equal(matches[0].blob, source.observedBlob);
        const raw = bytes(prefix + 'raw-sources/' + path.posix.basename(source.file));
        const normalized = Buffer.from(raw.toString('utf8').replaceAll('\r\n', '\n'));
        assert.ok(gitHash('blob', raw) === source.originalBlob || gitHash('blob', normalized) === source.originalBlob);
    }
}
const executableFile = prefix + 'native-publish/AutoPerf.SignalR.NativeUploadProbe.exe';
const executable = bytes(executableFile), peOffset = executable.readUInt32LE(0x3c), optional = peOffset + 24;
assert.equal(executable.toString('ascii', 0, 2), 'MZ');
assert.equal(executable.readUInt32LE(peOffset), 0x4550);
assert.equal(executable.readUInt16LE(peOffset + 4), 0x8664);
assert.equal(executable.readUInt16LE(optional), 0x20b);
assert.equal(executable.readUInt32LE(optional + 112 + 14 * 8), 0);
assert.equal(executable.readUInt32LE(optional + 112 + 14 * 8 + 4), 0);
assert.equal(hash(executable), preexecution.actualNativeExecutableSha256);
assert.equal(executable.length, preexecution.actualNativeExecutableBytes);
assert.ok(bytes(prefix + 'native-publish/AutoPerf.SignalR.NativeUploadProbe.pdb').subarray(0, 24).toString('ascii').startsWith('Microsoft C/C++ MSF 7.00'));
const ilc = text('native-compiler/AutoPerf.SignalR.NativeUploadProbe.ilc.rsp').split(/\r?\n/);
assert.equal(ilc[0], String.raw`obj\x64\Release\net12.0\win-x64\AutoPerf.SignalR.NativeUploadProbe.dll`);
for (const owner of plan.actualOwnerIlInputs)
{
    const input = path.win32.join(path.win32.dirname(plan.actualProject), '..', 'owner-inputs', owner.name + '.dll');
    assert.equal(ilc.filter(line => line === '-r:' + input).length, 1);
}
for (const response of preexecution.actualResponseFiles)
{
    assert.equal(hash(bytes('native-compiler/' + path.win32.basename(response.file))), response.sha256);
}
const assets = read('consumer-intermediate/project.assets.json');
for (const packageName of ['Microsoft.DotNet.ILCompiler', 'Microsoft.NET.ILLink.Tasks', 'runtime.win-x64.Microsoft.DotNet.ILCompiler'])
{
    assert.ok(Object.hasOwn(assets.libraries, packageName + '/12.0.0-alpha.1.26557.102'));
}
for (const [mode, expectedExit] of [['publish-no-restore', 1], ['restore', 0], ['publish-after-restore', 0], ['native', 0]])
{
    const base = prefix + 'invocations/' + mode + '-036/';
    const start = read(base + 'started.json'), exit = read(base + 'exit.json');
    assert.ok(start.processId > 0 && Number.isFinite(Date.parse(start.actualProcessStartTimeUtc)));
    assert.equal(start.mode, mode);
    assert.equal(start.actualNoBenchmark, true);
    assert.equal(exit.actualExitCode, expectedExit);
    assert.equal(exit.actualRootTerminal, true);
    assert.equal(exit.actualStdoutDrained, true);
    assert.equal(exit.actualStderrDrained, true);
    assert.equal(exit.actualNoBenchmarkWarmupAllocationOrStopwatch, true);
    assert.equal(exit.actualObservedDescendantTerminalChecks.filter(item => item.actualSameCreationLive).length, 0);
    if (mode === 'publish-no-restore') { assert.match(text(base + 'stdout.txt') + text(base + 'stderr.txt'), /NETSDK1004/); }
    if (mode === 'publish-after-restore')
    {
        assert.match(text(base + 'stdout.txt'), /Generating native code/);
        assert.ok(exit.actualObservedDescendantSnapshots.some(item => /\\ilc\.exe$/i.test(item.executablePath ?? '')));
    }
    if (mode === 'native') { assert.equal(start.executableSha256, hash(executable)); }
}
const nativeStart = read(prefix + 'invocations/native-036/started.json');
const report = read(prefix + 'invocations/native-036/native-result.json');
assert.equal(report.SourceRole, 'Original37');
assert.equal(report.ActualProcessId, nativeStart.processId);
assert.equal(report.ActualExecutablePath, nativeStart.executable);
assert.equal(report.ActualFrameworkDescription, '.NET 12.0.0-alpha.1.26557.102');
assert.equal(report.ActualClientAssemblyFullName, 'Microsoft.AspNetCore.SignalR.Client.Core, Version=42.42.42.42, Culture=neutral, PublicKeyToken=adb9793829ddae60');
assert.equal(report.ActualDynamicCodeSupported, false);
assert.equal(report.ActualDynamicCodeCompiled, false);
assert.equal(report.ActualFunctionalProducerCountsNotHelperPerformanceCounters, true);
assert.equal(report.ActualF141HelperCallPerReflectionEnumeratorIsSourceDerivedNotRuntimeCounted, true);
assert.deepEqual(report.Passed, [
    'NativeAot.DynamicCodeUnsupportedAndNotCompiled',
    'PublicConnection.ActualJsonHandshakeAndStartedState',
    'PublicSend.IAsyncEnumerableIntExactFramesEnumeratedOnceDisposed',
    'PublicSend.CompilerAsyncIteratorIntExactFramesAndFinally',
    'PublicSend.IAsyncEnumerableStringReferenceTypeControlExactFrames',
    'PublicSend.ChannelReaderIntValueTypeDistinctReflectionControlExactFrames',
    'PublicConnection.ActualTransportAndServiceProviderDisposed'
]);
assert.equal(report.Frames.length, 21);
const frames = report.Frames.filter(item => item.Scenario !== 'verified-ping-control');
assert.deepEqual(report.Frames.filter(item => item.Scenario === 'verified-ping-control'),
    [{ Scenario: 'verified-ping-control', EntireFrame: '{"type":6}' }]);
const expected = [{ Scenario: 'handshake', EntireFrame: '{"protocol":"json","version":1}' }], ids = new Set();
for (const [target, items] of [['ClassIntUpload', [42, -7, 0]], ['CompilerIntUpload', [11, 13, 17]],
    ['ReferenceControl', ['alpha', 'omega']], ['ChannelControl', [3, 1, -2]]])
{
    const invocation = frames[expected.length];
    assert.equal(invocation.Scenario, target + ':invocation');
    const data = JSON.parse(invocation.EntireFrame);
    assert.equal(data.streamIds.length, 1);
    const id = data.streamIds[0];
    assert.equal(typeof id, 'string');
    assert.ok(id.length > 0 && !ids.has(id));
    ids.add(id);
    expected.push({ Scenario: target + ':invocation', EntireFrame: JSON.stringify({ type: 1, target, arguments: [], streamIds: [id] }) });
    for (const item of items)
    {
        expected.push({ Scenario: target + ':item', EntireFrame: JSON.stringify({ type: 2, invocationId: id, item }) });
    }
    expected.push({ Scenario: target + ':completion', EntireFrame: JSON.stringify({ type: 3, invocationId: id }) });
}
assert.deepEqual(frames, expected);
assert.deepEqual(report.Sequences, [
    { Scenario: 'class-int', EnumerationsOrBodyEntries: 1, MoveNextCalls: 4, DisposalsOrFinallyEntries: 1 },
    { Scenario: 'compiler-int-body-and-finally', EnumerationsOrBodyEntries: 1, MoveNextCalls: 0, DisposalsOrFinallyEntries: 1 },
    { Scenario: 'class-string-control', EnumerationsOrBodyEntries: 1, MoveNextCalls: 3, DisposalsOrFinallyEntries: 1 }
]);
const acceptance = read('coordinator-acceptance.json'), budgets = read('closed-budgets.json');
assert.equal(acceptance.actualCompilerIteratorMoveNextCounterObserved, false);
assert.equal(acceptance.actualCompilerIteratorRawZeroIsUninstrumentedPlaceholderNotObservedCount, true);
assert.equal(acceptance.actualWholeObservedDefaultNativeBuiltOrRun, false);
assert.equal(acceptance.actualServerNativeAotExecuted, false);
assert.equal(budgets.length, 1);
assert.equal(budgets[0].findingId, 'F141');
assert.equal(budgets[0].maximumComparisons, 3);
assert.equal(budgets[0].closed, true);
assert.deepEqual(budgets[0].authorizations, []);
assert.equal(budgets[0].actualUnusedAuthorizationsPermanentlyClosed, 3);
if (process.argv.includes('--require-seal'))
{
    for (const item of read('capsule-file-hashes.json').files)
    {
        const buffer = bytes(item.file);
        assert.equal(buffer.length, item.bytes);
        assert.equal(hash(buffer), item.sha256);
    }
}
console.log(JSON.stringify({
    audit: 'PASS', actualCopiedFiles: copies.length, actualFreshManagedPePdbPairs: pairs.length,
    actualSelectedRawDocumentAssociations: rawDocuments, actualConsumerUncopiedSourceGeneratorDocuments: 12,
    actualFreshGitMerkleProofs: proofs.length, actualNativeExecutableSha256: hash(executable),
    actualNativeAmd64Pe32PlusWithNoClrDirectory: true,
    actualSavedNativeFunctionalChecks: report.Passed.length, actualSavedCompleteFrames: report.Frames.length,
    actualSavedRootReceipts: 4, actualNoNativeTargetOrCounterStartedByAudit: true,
    actualCompilerIteratorMoveNextCount: null, actualHelperFrequencyRuntimeCounted: false,
    actualNoWholeDefaultServerOrCompleteCompilerRuntimeClosureClaim: true,
    actualClosedBudget: '0of3'
}, null, 2));
