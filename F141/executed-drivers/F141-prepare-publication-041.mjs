import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const preparation = path.join(session, 'autoperf-parallelism', 'finding-F141-nativeaot-035');
const root = path.join(session, 'autoperf-published-results', 'F141');
const run = path.join(session, 'autoperf-runs', 'F141');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = (bytes, algorithm = 'sha256') => crypto.createHash(algorithm).update(bytes).digest('hex').toUpperCase();
const gitHash = (type, bytes) => hash(Buffer.concat([Buffer.from(`${type} ${bytes.length}\0`), bytes]), 'sha1').toLowerCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.deepEqual(fs.readdirSync(root).sort(), ['.gitattributes', 'README.md', 'verify.mjs']);
assert.equal(fs.existsSync(run), false);
const campaign = read(path.join(session, 'autoperf-campaign.json'));
const finding = campaign.candidates.find(item => item.id === 'F141');
assert.equal(finding.status, 'pending');
const plan = read(path.join(preparation, 'acceptance-before-nativeaot-035.json'));
const preexecution = read(path.join(preparation, 'native-preexecution-037.json'));
for (const item of plan.actualCopiedInputs)
{
    assert.equal(hash(fs.readFileSync(path.join(preparation, ...item.file.split('/')))), item.sha256);
}
for (const file of ['Program.cs', 'NativeUploadProbe.csproj'])
{
    assert.deepEqual(fs.readFileSync(path.join(preparation, 'testassets', 'NativeUploadProbe', file)),
        fs.readFileSync(path.join(preparation, 'frozen-before-first-publish', file)));
}
fs.mkdirSync(run);
const copies = [];
function copy(source, logical)
{
    const bytes = fs.readFileSync(source), target = path.join(root, ...logical.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes, { flag: 'wx' });
    copies.push({ file: logical, actualSourcePath: source, bytes: bytes.length, sha256: hash(bytes) });
}
function tree(source, logical)
{
    for (const entry of fs.readdirSync(source, { withFileTypes: true }))
    {
        assert.equal(entry.isSymbolicLink(), false);
        const from = path.join(source, entry.name), to = logical + '/' + entry.name;
        if (entry.isDirectory()) { tree(from, to); }
        else { copy(from, to); }
    }
}
for (const file of ['acceptance-before-nativeaot-035.json', 'native-preexecution-037.json', 'original-aot-pr-56583.json'])
{
    copy(path.join(preparation, file), 'native-aot/' + file);
}
for (const directory of ['frozen-before-first-publish', 'executed-drivers', 'invocations', 'native-publish', 'raw-sources'])
{
    tree(path.join(preparation, directory), 'native-aot/' + directory);
}
tree(path.join(preparation, 'testassets', 'owner-inputs'), 'native-aot/testassets/owner-inputs');
for (const file of ['Program.cs', 'NativeUploadProbe.csproj'])
{
    copy(path.join(preparation, 'testassets', 'NativeUploadProbe', file), 'native-aot/testassets/NativeUploadProbe/' + file);
}
for (const file of ['F141-prepare-publication-041.mjs', 'F141-native-preexecution-037.mjs', 'autoperf-publish-bounded-outcome-033.mjs'])
{
    copy(path.join(session, file), 'executed-drivers/' + file);
}
const helper = path.join(session, 'autoperf-published-results', 'F169-F170', 'owner-handoff', 'evidence.mjs');
copy(helper, 'portable-metadata.mjs');
const { parsePe, parsePdb } = await import(pathToFileURL(helper));
const project = path.join(preparation, 'testassets', 'NativeUploadProbe');
const intermediate = path.join(project, 'obj', 'x64', 'Release', 'net12.0', 'win-x64');
const binary = path.join(project, 'bin', 'x64', 'Release', 'net12.0', 'win-x64');
for (const extension of ['dll', 'pdb'])
{
    const file = 'AutoPerf.SignalR.NativeUploadProbe.' + extension;
    assert.deepEqual(fs.readFileSync(path.join(intermediate, file)), fs.readFileSync(path.join(binary, file)));
    copy(path.join(intermediate, file), 'consumer-intermediate/' + file);
}
for (const file of ['AutoPerf.SignalR.NativeUploadProbe.deps.json', 'AutoPerf.SignalR.NativeUploadProbe.runtimeconfig.json'])
{
    copy(path.join(binary, file), 'consumer-intermediate/' + file);
}
copy(path.join(project, 'obj', 'project.assets.json'), 'consumer-intermediate/project.assets.json');
copy(path.join(intermediate, 'NativeUploadProbe.csproj.FileListAbsolute.txt'), 'consumer-intermediate/FileListAbsolute.txt');
for (const response of preexecution.actualResponseFiles)
{
    assert.equal(hash(fs.readFileSync(response.file)), response.sha256);
    copy(response.file, 'native-compiler/' + path.basename(response.file));
}
const pairs = [];
function pair(name, dll, pdb, expectedMvid, documents)
{
    const pe = parsePe(fs.readFileSync(path.join(root, ...dll.split('/'))));
    const symbols = parsePdb(fs.readFileSync(path.join(root, ...pdb.split('/'))));
    assert.equal(pe.mvid, expectedMvid);
    assert.ok(pe.codeView.some(item => item.guid === symbols.guid && item.stamp === symbols.stamp && item.age === 1));
    const selected = documents.map(({ suffix, file }) =>
    {
        const matches = symbols.documents.filter(item => item.name.replaceAll('\\', '/').endsWith(suffix));
        assert.equal(matches.length, 1, suffix);
        const document = matches[0], bytes = fs.readFileSync(path.join(root, ...file.split('/')));
        assert.equal(document.algorithm, '8829d00f-11b8-4213-878b-770e8597ac16');
        assert.equal(hash(bytes).toLowerCase(), document.checksum);
        return { name: document.name, algorithm: document.algorithm, checksum: document.checksum, file };
    });
    pairs.push({ name, dll, pdb, mvid: pe.mvid, guid: symbols.guid, stamp: symbols.stamp,
        documents: symbols.documents.length, selectedDocuments: selected,
        unselectedDocuments: symbols.documents.length - selected.length });
}
for (const owner of plan.actualOwnerIlInputs)
{
    const selected = owner.name === 'Microsoft.AspNetCore.SignalR.Client.Core'
        ? plan.sourceEquality.map(item => ({ suffix: item.file, file: 'native-aot/raw-sources/' + path.basename(item.file) }))
        : [];
    pair(owner.name, 'native-aot/' + owner.dll.file, 'native-aot/' + owner.pdb.file, owner.actualPe.mvid, selected);
}
const consumerDocuments = ['Program.cs', 'NativeUploadProbe.GlobalUsings.g.cs',
    '.NETCoreApp,Version=v12.0.AssemblyAttributes.cs', 'NativeUploadProbe.AssemblyInfo.cs'];
for (const file of consumerDocuments)
{
    copy(file === 'Program.cs' ? path.join(project, file) : path.join(intermediate, file), 'consumer-raw-documents/' + file);
}
pair('AutoPerf.SignalR.NativeUploadProbe', 'consumer-intermediate/AutoPerf.SignalR.NativeUploadProbe.dll',
    'consumer-intermediate/AutoPerf.SignalR.NativeUploadProbe.pdb', '7cc8746d-a38f-4845-9094-7698e651986a',
    consumerDocuments.map(file => ({ suffix: '/' + file, file: 'consumer-raw-documents/' + file })));
write(path.join(root, 'selected-metadata.json'), pairs);

const objects = new Map(), proofs = [];
function object(type, id)
{
    if (objects.has(id)) { return objects.get(id); }
    const result = spawnSync('git', ['--no-pager', 'cat-file', type, id], { cwd: String.raw`C:\src\aspnetcore` });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr.toString());
    assert.equal(gitHash(type, result.stdout), id);
    const logical = 'source-provenance/objects/' + type + '-' + id;
    const file = path.join(root, ...logical.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, result.stdout, { flag: 'wx' });
    const value = { type, id, file: logical, bytes: result.stdout };
    objects.set(id, value);
    return value;
}
const sourceFiles = [...plan.sourceEquality.map(item => item.file),
    'src/SignalR/server/Core/src/Internal/HubMethodDescriptor.cs',
    'src/SignalR/server/SignalR/test/Microsoft.AspNetCore.SignalR.Tests/NativeAotTests.cs'];
for (const commit of [plan.actualOriginalSource, plan.observedDefaultSource])
{
    const commitObject = object('commit', commit);
    const treeMatch = /^tree ([a-f0-9]{40})$/m.exec(commitObject.bytes.toString('utf8'));
    assert.ok(treeMatch);
    for (const source of sourceFiles)
    {
        let current = treeMatch[1];
        const steps = [], parts = source.split('/');
        for (const [index, name] of parts.entries())
        {
            const treeObject = object('tree', current);
            let offset = 0, entry;
            while (offset < treeObject.bytes.length)
            {
                const space = treeObject.bytes.indexOf(32, offset), zero = treeObject.bytes.indexOf(0, space);
                assert.ok(space > offset && zero > space);
                const candidate = { mode: treeObject.bytes.toString('ascii', offset, space),
                    name: treeObject.bytes.toString('utf8', space + 1, zero),
                    id: treeObject.bytes.subarray(zero + 1, zero + 21).toString('hex') };
                if (candidate.name === name) { assert.equal(entry, undefined); entry = candidate; }
                offset = zero + 21;
            }
            assert.ok(entry, source);
            steps.push({ tree: current, file: treeObject.file, name, mode: entry.mode, id: entry.id });
            if (index < parts.length - 1) { assert.equal(entry.mode, '40000'); }
            else { assert.equal(entry.mode, '100644'); }
            current = entry.id;
        }
        const blob = object('blob', current);
        const target = plan.sourceEquality.find(item => item.file === source);
        if (target) { assert.equal(current, target.originalBlob); assert.equal(current, target.observedBlob); }
        proofs.push({ commit, commitObject: commitObject.file, source, steps, blob: current, blobFile: blob.file,
            actualExecutedSourceScope: commit === plan.actualOriginalSource && Boolean(target) });
    }
}
write(path.join(root, 'source-provenance', 'proofs.json'), proofs);
write(path.join(root, 'authoritative-copies.json'), copies);
const budget = { findingId: 'F141', maximumComparisons: 3, authorizations: [], closed: true,
    actualComparisons: 0, actualCandidateWritten: false, actualUnusedAuthorizationsPermanentlyClosed: 3,
    closedAt: new Date().toISOString(),
    closingReason: 'Actual unchanged NativeAOT public value-type uploads accepted; target scans once per reflection-enumerator construction, not per item. No material application stream-setup frequency/cardinality or net cache benefit established. Informational finding rejected at the workload gate, not measured no gain.' };
write(path.join(root, 'closed-budgets.json'), [budget]);
write(path.join(run, 'diagnostic-budget.json'), budget);
const acceptance = {
    recordedAt: new Date().toISOString(), findingId: 'F141', outcome: 'rejected',
    subtype: 'nativeaot-stream-setup-material-workload-unestablished',
    actualBeforeFirstPublishSourceAndInputsUnchanged: true,
    actualOriginalSource: plan.actualOriginalSource, actualObservedDefaultTargetOnly: plan.observedDefaultSource,
    actualWholeObservedDefaultNativeBuiltOrRun: false, actualServerNativeAotExecuted: false,
    actualSdkAotAndFramework: '12.0.0-alpha.1.26557.102',
    actualEarlierCoreClrAssertion62Or69ResultsNotRelabeledNativeAot: true,
    actualSuccessfulConsumerCompiles: 1, actualPrecompilerMissingAssetsFailures: 1,
    actualRuntimeCapabilityChecks: 2, actualFunctionalCheckNames: 7, actualCompleteWireFrames: 21,
    actualParentReviewedCompleteConsumerSource: true, actualPublicProducerNotPrivateAdapterInjection: true,
    actualHelperCallFrequencyPerAdapterSourceDerivedNotRuntimeCounted: true,
    actualCompilerIteratorMoveNextCounterObserved: false,
    actualCompilerIteratorRawZeroIsUninstrumentedPlaceholderNotObservedCount: true,
    actualNativeManagedMvidReflectionObservationClaimed: false,
    actualNativeClientAssemblyFullNameObserved: true,
    actualNativeAmd64Pe32PlusNoClrDirectoryIndependentlyRequired: true,
    actualSelectedManagedPePdbPairs: 4, actualSelectedRawDocumentAssociations: 7,
    actualConsumerRawDocumentAssociations: 4, actualConsumerUncopiedSourceGeneratorDocuments: 12,
    actualNoFullPortablePdbDocumentOrCompilerInputClosureClaim: true,
    actualOuterCppSetupDiagnostic: 'Bare vswhere.exe was not recognized by the outer vcvars/cmd setup. The setup nevertheless populated usable cl/link paths; the real native publish succeeded. No machine-wide PATH repair was performed.',
    actualOuterCppSetupDiagnosticEvidenceBoundary: 'Observed interactive tool output, not a byte-exact persisted outer cmd stream. Saved runner stdout/stderr cover the owned inner dotnet/native roots, not all outer vcvars/cmd diagnostic streams.',
    actualSpecificOwnedRootTerminalObservedChildrenAndDrainedStreamsNotUniversalInactivity: true,
    actualCopiedFiles: copies.length, actualCopiedBytes: copies.reduce((sum, item) => sum + item.bytes, 0),
    actualNoCandidateTimingPerformanceClaimPrOrWindow: true
};
write(path.join(root, 'coordinator-acceptance.json'), acceptance);
write(path.join(run, 'publication-config.json'), {
    folder: 'F141', run, expectedParentIndex: '0a000ed30e550f008f54cc1a3f41b9ed2c0212e0',
    performancePrAuthorized: false, subtype: acceptance.subtype, authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F141] NativeAOT enumerator setup lacks a material workload',
    issueSearch: '"AutoPerf F141" in:title',
    evidenceCommitTitle: 'Preserve actual NativeAOT SignalR upload characterization',
    evidenceCommitDescription: 'Unchanged frozen Original37 Core/Common/Json inputs, actual C13 NativeAOT consumer on SDK/ILCompiler/BCL57; AMD64PE32+noCLRdirectory, actualruntimebothdynamicflagsfalse. PublicHubConnection+realPipelines+sourcegeneratedJson: exacthandshake, class/asynciteratorintuploads,string/channelcontrols,21wholeframes,7checks,lifetimes/disposal. Helperfrequencyperadapterisderivedfromsource,notinstrumented,notperitem. Original/CoreCLR62/69notrelabeled,wholeDefault/serverAOTnotrun. InitialNETSDK1004beforecompilepreserved;restorethenoneactualcompile/nativeexecution;all4ownedroots/observedchildren terminalandinnerstreamdrains. Fresh4PEPDBpairs7rawDocs;consumer16docs4raw/12generatorrawomitted;GitMerkleproofs3targetsplus2sourceonlypathsat37/83d. RawcompileriteratorMoveNext0explicitlyuninstrumentednotobservedzero. Outervcvarsbarevswherewarningobservedbutnotbyte-exactpersisted;notmachinefixed. Materialapplicationstreamsetupfrequencyunestablished,rejectednotmeasurednogain;0of3permanentlyclosed,nocandidate/perfPR/window,fixedreportpreserved.',
    indexCommitTitle: 'Index bounded NativeAOT enumerator workload outcome',
    outcomes: [{
        id: 'F141', status: 'rejected',
        note: 'NativeAOT stream-setup material-workload-unestablished; not measured no benefit. Actual unchangedOriginal37publicHubConnection/realpipes/sourcegenJson nativeAMD64noCLRexe,SDK/ILCompiler/BCL57notnormal62/69;bothdynamicflagsfalse.7checks21entireframes forclassint/compilerasyncint/string/channel controls+handshake/disposal. TargetGetIAsyncEnumeratorInterface calledonceperReflectionAsyncEnumeratorconstruction source-derivednotruntime-counted,notperitem;serverconversiondelegatecachedoesnotcachethislookup,serverAOTsourceonly.3targetblobs37/83didentical,wholeDefaultnativeunrun.4freshmanagedPEPDBpairs7selectedrawDocs;consumer16docs4raw12generatornotcopied;GitMerkleproofs. InitialNETSDK1004precompilerpreserved,restorethenonecompile/nativeexecution;4ownedroots/observedchildrenterminal,innerstreamsdrainednotfullOSclosure. CompileriteratorrawMoveNext0isuninstrumentedplaceholdernotmeasuredzero. Outervcvarsbarevswherewarningtool-observednotpersistedexactouterstreams;actualnativepublishsuccess,no machine-wide repair. Own0of3permanentlyclosed,nocandidate/performanceclaim/PR/window.',
        readmeRow: '| F141 | **Rejected:** actual NativeAOT enumerator setup reached; material stream-setup workload unestablished. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [NativeAOT producer evidence](F141/README.md), [verified publication](F141/publication.json) |'
    }]
});
console.log(JSON.stringify({ actualPrepared: 'F141', actualCopiedFiles: copies.length,
    actualGitProofs: proofs.length, actualGitObjects: objects.size, actualManagedPairs: pairs.length,
    actualSelectedRawDocuments: pairs.reduce((sum, item) => sum + item.selectedDocuments.length, 0),
    actualClosedBudget: '0of3', actualNoNativeTargetOrCounterStarted: true }, null, 2));
