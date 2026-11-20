import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const parallel = path.join(session, 'autoperf-parallelism');
const capsule = path.join(parallel, 'finding-F180-F204-046', 'capsule');
const root = path.join(session, 'autoperf-published-results', 'F180-F204');
const run = path.join(session, 'autoperf-runs', 'F180-F204');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.deepEqual(fs.readdirSync(root).sort(), ['.gitattributes', 'README.md', 'verify.mjs']);
assert(!fs.existsSync(run));
assert.equal(hash(fs.readFileSync(path.join(capsule, 'MANIFEST.json'))), '7DC103505ECF459908AA4C3FB072F6228D9C50B4E80859D8E34852CD645BB3FA');
const manifest = read(path.join(capsule, 'MANIFEST.json'));
assert.equal(manifest.actualPayloadFiles, 745);
assert.equal(manifest.actualPayloadBytes, 162473920);
const auditFile = path.join(parallel, 'F180-F204-offline-audit-053.stdout.txt');
const audit = read(auditFile);
assert.equal(audit.actualAudit, 'PASS');
assert.equal(audit.actualChecks, 144);
assert.equal(audit.actualOwnedNativeConsumerProcesses, 6);
const receipt = read(path.join(parallel, 'F180-F204-offline-audit-053.exit.json'));
assert.equal(receipt.exit, 0);
assert.equal(receipt.actualRootTerminal, true);
assert.equal(receipt.actualStreamsDrained, true);
const ids = ['F180', 'F204'];
const campaign = read(path.join(session, 'autoperf-campaign.json'));
for (const id of ids) assert.equal(campaign.candidates.find(item => item.id === id).status, 'pending');
fs.mkdirSync(run);
const copies = [];
function copy(source, logical) {
    const bytes = fs.readFileSync(source), destination = path.join(root, ...logical.split('/'));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes, { flag: 'wx' });
    assert.equal(hash(fs.readFileSync(destination)), hash(bytes));
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
tree(capsule, 'owner-handoff');
assert.equal(copies.length, 746);
const ownerEnvelopeBytes = copies.reduce((sum, item) => sum + item.bytes, 0);
for (const suffix of ['stdout.txt', 'stderr.txt', 'exit.json'])
    copy(path.join(parallel, 'F180-F204-offline-audit-053.' + suffix), 'coordinator-audit-053/' + suffix);
for (const name of ['F180-F204-prepare-publication-056.mjs', 'autoperf-publish-bounded-outcome-033.mjs'])
    copy(path.join(session, name), 'executed-drivers/' + name);
write(path.join(root, 'authoritative-copies.json'), copies);
write(path.join(root, 'coordinator-portable-audit.json'), audit);
const acceptance = {
    recordedAt: new Date().toISOString(), findings: ids, outcome: 'rejected',
    subtype: 'nonshipping-diagnostic-sample-material-workload-unestablished',
    actualInheritedOriginalNotFreshOriginal37Build: true,
    actualOriginalCompilerCommandAndFullHistoricalDependencySourceCohortUnreconstructed: true,
    actualOriginalTargetRawSourceBoundThroughOriginal37GitProof: '37e809ead5824bc753a1c3d56f11615bdb1296c5',
    actualWholePinnedDefaultSampleAndDependenciesBuiltAt: 'd3483989953ae3cccd773aea5ea04cb0c7198531',
    actualUnchangedTargetBlob: 'b70eccbc0a5358e5b3368f9752adefcd2e25a06d',
    actualNativeConfigureRequestDelegateOsEnvironmentAndRealLoggerFactoryReached: true,
    actualOneSuccessfulCSharp13CommonCompilationAndSameDllBothRoles: true,
    actualNativeConsumerProcesses: 6, actualNamedRows: 12, actualChecks: 144,
    actualEnvironmentFixtureCounts: [0, 1, 5], actualHostEnvironmentCopiedOrMutated: false,
    actualNativePePdbAssociations: 3, actualAllSelectedRawDocuments: 9,
    actualCopiedCompilerReferenceImages: 233, actualCopiedObservedManagedImageFiles: 81,
    actualRawGitObjects: 21, actualSourceMemberships: 16,
    actualEightNativePreparationCommandAttemptsAndTheirFailuresRetained: true,
    actualOriginal62AndDefault69ConsumerRuntimesObserved: true,
    actualCompilerRequestedConfigNotActualCompilerRuntimeObservationOrWholeCompilerClosure: true,
    actualRootExitsAndStreamsNotFullDescendantCensusOrSharedHostIsolation: true,
    actualManagedSnapshotsBeforeSerializationNotNativeModuleOrManagedExitClosure: true,
    actualInnerActivationConsoleMessagesNotAllByteExactPersisted: true,
    actualNoServerNetworkAzureIisDeploymentSampleMainOrBrowser: true,
    actualExistingEnabledDynamicOriginalFormatNotSilentlyChangedToStructuredTemplate: true,
    actualNoConditionalGuardCandidateEquivalenceOrAllocationMeasured: true,
    actualSourceAndCompleteCommonConsumerReviewed: true,
    actualDocumentedNonProductionInnerLoopSampleNotMaterialApplicationWorkloadEstablished: true,
    actualNotMeasuredNoGainOrZeroCost: true,
    actualOwnerPayloadFiles: 745, actualOwnerPayloadBytes: 162473920,
    actualOwnerEnvelopeFiles: 746, actualOwnerEnvelopeBytes: ownerEnvelopeBytes,
    actualCopiedFiles: copies.length, actualCopiedBytes: copies.reduce((sum, item) => sum + item.bytes, 0),
    actualNoCandidateTimingPerformancePrOrWindow: true
};
write(path.join(root, 'coordinator-acceptance.json'), acceptance);
const budgets = ids.map(findingId => ({
    findingId, maximumComparisons: 3, authorizations: [], closed: true,
    actualComparisons: 0, actualCandidateWritten: false, actualUnusedAuthorizationsPermanentlyClosed: 3,
    closedAt: new Date().toISOString(),
    closingReason: 'Documented non-production inner-loop diagnostic sample; faithful native request/environment/logging producer characterized, but material application workload unestablished. Not measured no gain or zero cost.'
}));
write(path.join(root, 'closed-budgets.json'), budgets);
for (const budget of budgets) {
    const directory = path.join(run, budget.findingId);
    fs.mkdirSync(directory);
    write(path.join(directory, 'diagnostic-budget.json'), budget);
}
write(path.join(run, 'publication-config.json'), {
    folder: 'F180-F204', run, expectedParentIndex: '8d6eddd383c4086c26e476d3bc37ed315b2411b5',
    performancePrAuthorized: false, subtype: acceptance.subtype, authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F180-F204] Diagnostic sample workload unestablished',
    issueSearch: '"AutoPerf F180-F204" in:title',
    evidenceCommitTitle: 'Preserve Azure diagnostic sample request-producer contracts',
    evidenceCommitDescription: 'ExistingnativeOriginal-sourceownerwithall4rawPDBdocsnotfreshOriginal37/historicalfullcompilerdependencycohort;freshwholeDefaultd348sample/dependencies.Targetb70eccunchanged. OneC13commonDLLactualnativeStartupConfigureRequestDelegate/OSenvironment/LoggerFactory;6ownedprocesses2rolesxempty0/singleton1/mixed5allowlistedchildenvironments,12rows144checks,actual62/69runtimes. Actualresponseandcase-insensitivesortedvaluepairedOSoutputunchanged,realDebugfactorydisabled0/enabled1dynamicOriginalFormatstateexplicit. 3PEPDBpairs9allselectedrawdocs233compilerrefs81observedmanagedimagefiles16Gitproofs21rawobjects. Eightnativeprereqattemptsincludingmissingrootbuildcmd/insufficientexit0bootstrap/imports/assetsretained;1successfulcommoncompile. ManagedsnapshotsbeforeJSONnotexit/nativeinventory;compilerfiles/confignotactualcompilerCLRobservation/fullclosure;rootexits/streamsnotuniversalcensusorhostisolation;inneractivationConsolemessagesnotallbyteexact. Nonproductioninnerloopdiagnosticsamplerejectedmaterialworkloadunestablished,notmeasurednogain;bothclosed0of3,nocandidate/benchmark/perfPR/window/fixedREPORTchange.',
    indexCommitTitle: 'Index two bounded diagnostic sample outcomes',
    outcomes: ids.map(id => ({
        id, status: 'rejected',
        note: 'Nonproductioninnerloopdiagnosticsample material-workload-unestablished, not measured no benefit. Real nativeStartupConfigureRequestDelegate/OSenv/LoggerFactory filter accepted;6processes12rows144checks,empty0/singleton1/mixed5owned-childenvonly,realresponse/environmentorder/valuepairing/nondestructivebehavior;Debugdisabled0/enabled1dynamicOriginalFormatnotstructuredcandidate. InheritedOriginal-sourceownerraw4docsnotfreshOriginal37/fullhistoricalcompilerdependencycohort;wholefreshDefaultd348built,targetb70eccunchanged,actual62/69runtime;oneC13DLL3PEPDB9rawdocs233refs81managedimages16Gitproofs21objects. Eightnativeprereqfailure/successattemptspreserved. Selectedcompilerfiles/confignotactualcompilerCLRobservation/fullclosure,managedsnapshotnotexit/nativeinventory,rootexits/streamsnotuniversalcensus/isolation,inneractivationConsolemessagesnotallbyteexact. NoHTTPserver/Azure/IIS/Main/browser/candidateguard-equivalence/allocation/performanceclaim;each0of3foreverclosed,noperfPR/window/fixedREPORTchange.',
        readmeRow: '| ' + id + ' | **Rejected:** non-production diagnostic sample; native request/environment/logging contracts accepted, material workload unestablished. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [Sample evidence](F180-F204/README.md), [verified publication](F180-F204/publication.json) |'
    }))
});
console.log(JSON.stringify({ actualPrepared: ids, actualOwnerEnvelopeFiles: 746, actualOwnerEnvelopeBytes: ownerEnvelopeBytes,
    actualCopiedFiles: copies.length, actualCopiedBytes: acceptance.actualCopiedBytes,
    actualEachBudgetPermanentlyClosed: '0of3', actualNoNativeOrPerformanceProcessStarted: true }, null, 2));
