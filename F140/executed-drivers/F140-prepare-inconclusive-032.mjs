import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const parallel = path.join(session, 'autoperf-parallelism');
const implementation = path.join(parallel, 'finding-F140-implementation-019');
const preparation = path.join(parallel, 'finding-F140-F141-native-013');
const published = path.join(session, 'autoperf-published-results'), destination = path.join(published, 'F140');
const run = path.join(session, 'autoperf-runs', 'F140');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.deepEqual(fs.readdirSync(destination).sort(), ['.gitattributes', 'README.md', 'verify.mjs']);
assert.equal(fs.existsSync(path.join(run, 'publication-config.json')), false);
assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
const campaign = read(path.join(session, 'autoperf-campaign.json'));
for (const id of ['F140', 'F141']) { assert.equal(campaign.candidates.find(item => item.id === id).status, 'pending'); }
const budget = read(path.join(run, 'diagnostic-budget.json'));
assert.equal(budget.closed, true);
assert.equal(budget.authorizations.length, 1);
assert.equal(budget.authorizations[0].status, 'failed');
assert.deepEqual(fs.readdirSync(path.join(run, 'executions')), []);
assert.equal(read(path.join(run, 'failed-admission-closure-031.json')).actualNativeDotnetOrWarmupOrAllocationOrStopwatchExecuted, false);
const copies = [], metadata = [];
function copy(source, logical)
{
    const existing = copies.find(item => item.file === logical);
    const bytes = fs.readFileSync(source), sha256 = hash(bytes);
    if (existing)
    {
        assert.equal(existing.sha256, sha256);
        return logical;
    }
    const target = path.join(destination, ...logical.split(/[\\/]/));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes, { flag: 'wx' });
    assert.equal(hash(fs.readFileSync(target)), sha256);
    copies.push({ file: logical.replaceAll('\\', '/'), actualSourcePath: source, bytes: bytes.length, sha256 });
    return logical.replaceAll('\\', '/');
}
function tree(directory, logical)
{
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }))
    {
        assert.equal(entry.isSymbolicLink(), false);
        if (entry.isDirectory()) { tree(path.join(directory, entry.name), logical + '/' + entry.name); }
        else { copy(path.join(directory, entry.name), logical + '/' + entry.name); }
    }
}
for (const entry of fs.readdirSync(implementation, { withFileTypes: true }).filter(item => item.isFile()))
{
    copy(path.join(implementation, entry.name), 'implementation/' + entry.name);
}
for (const directory of ['invocations', 'raw-sources', 'candidate-source'])
{
    tree(path.join(implementation, directory), 'implementation/' + directory);
}
for (const entry of fs.readdirSync(preparation, { withFileTypes: true }).filter(item => item.isFile()))
{
    copy(path.join(preparation, entry.name), 'history-v1/' + entry.name);
}
tree(path.join(preparation, 'invocations'), 'history-v1/invocations');
tree(path.join(parallel, 'finding-F140-implementation-018'), 'failed-admission-018');
const admission = read(path.join(implementation, 'acceptance-before-candidate.json'));
const accepted = read(path.join(implementation, 'accepted-causal-images-before-functional-023.json'));
const targets = read(path.join(implementation, 'all-four-target-frameworks-fresh-metadata-020.json'));
for (const invalid of admission.actualIncompleteNativeExitIdentityObservations)
{
    copy(invalid.file, 'invalid-observations/' + invalid.role + '/' + path.basename(invalid.file));
}
function document(record, raw)
{
    const logical = copies.find(item => item.actualSourcePath.toLowerCase() === raw.toLowerCase())?.file;
    assert.ok(logical, raw);
    return { name: record.name, checksum: record.checksum, algorithm: record.algorithm, raw: logical };
}
function addPair(item, dll, pdb, expectedMvid, documents)
{
    const prefix = 'selected-binaries/' + String(metadata.length + 1).padStart(3, '0') + '/';
    metadata.push({ ...item, dll: copy(dll, prefix + path.basename(dll)), pdb: copy(pdb, prefix + path.basename(pdb)),
        peSha256: hash(fs.readFileSync(dll)), pdbSha256: hash(fs.readFileSync(pdb)), expectedMvid, documents });
}
for (const item of admission.freshSelectedMetadata)
{
    assert.equal(hash(fs.readFileSync(item.dll)), item.peSha256);
    assert.equal(hash(fs.readFileSync(item.pdb)), item.pdbSha256);
    addPair({ phase: 'pre-candidate', role: item.role }, item.dll, item.pdb, item.pe.mvid,
        item.freshlyVerifiedSelectedRawDocuments.map(record =>
            document(record, path.join(implementation, record.actualCopiedAs))));
}
for (const item of targets.rows)
{
    assert.equal(hash(fs.readFileSync(item.dll)), item.peSha256);
    assert.equal(hash(fs.readFileSync(item.pdb)), item.pdbSha256);
    const source = accepted.selectedCandidateMetadata.find(record => record.role === item.role).sourceCopy;
    addPair({ phase: 'candidate-tfm', role: item.role, tfm: item.tfm }, item.dll, item.pdb, item.actualPe.mvid,
        [document(item.actualRawHubDocument, source)]);
}
for (const role of ['Original37', 'Default90'])
{
    for (const variant of ['baseline', 'candidate'])
    {
        for (const owner of ['Microsoft.AspNetCore.SignalR.Client.Core', 'Microsoft.AspNetCore.SignalR.Client.Tests'])
        {
            const image = accepted.images[role][variant];
            const baseline = admission.freshSelectedMetadata.find(item =>
                item.role === role && path.basename(item.dll) === owner + '.dll');
            const source = accepted.selectedCandidateMetadata.find(item => item.role === role);
            const documents = baseline.freshlyVerifiedSelectedRawDocuments.map(record =>
                variant === 'candidate' && owner.endsWith('.Core') && record.name.endsWith('\\HubConnection.cs')
                    ? document(source.actualRawDocument, source.sourceCopy)
                    : document(record, path.join(implementation, record.actualCopiedAs)));
            const functional = read(path.join(implementation, 'invocations', `${role}-${variant}-functional-022`, 'functional-result.json'));
            addPair({ phase: 'causal-functional', role, variant, owner },
                path.join(image.directory, owner + '.dll'), path.join(image.directory, owner + '.pdb'),
                owner.endsWith('.Core') ? functional.actualClientMvid : functional.actualTestProducerMvid, documents);
        }
    }
}
for (const item of accepted.common.files) { copy(path.join(accepted.common.directory, item.file), 'common-v2/image/' + item.file); }
for (const item of accepted.common.inputs) { copy(item.source, 'common-v2/inputs/' + path.basename(item.source)); }
for (const item of accepted.common.freshlyVerifiedAllPdbRawDocuments)
{
    copy(item.actualCopiedAs, 'common-v2/raw-documents/' + path.basename(item.actualCopiedAs));
}
addPair({ phase: 'common-v2', role: 'CommonV2' },
    path.join(accepted.common.directory, 'AutoPerf.SignalR.Probe.dll'),
    path.join(accepted.common.directory, 'AutoPerf.SignalR.Probe.pdb'), accepted.common.pe.mvid,
    accepted.common.freshlyVerifiedAllPdbRawDocuments.map(item => document(item, item.actualCopiedAs)));
assert.equal(metadata.length, 22);
write(path.join(destination, 'selected-metadata.json'), metadata);
for (const entry of fs.readdirSync(run, { withFileTypes: true }).filter(item => item.isFile()))
{
    copy(path.join(run, entry.name), 'run/' + entry.name);
}
tree(path.join(run, 'comparisons'), 'run/comparisons');
for (const file of ['F140-local-quiescence-030.json', 'policy-before-F140-HOLD-028.json',
    'policy-before-F140-admission-030.json', 'policy-before-F140-release-031.json', 'Invoke-AutoPerfBenchmark.ps1'])
{
    copy(path.join(parallel, file), 'control/' + file);
}
for (const file of ['F140-accept-before-candidate-018.mjs', 'F140-accept-before-candidate-019.mjs',
    'F140-build-all-targets-020.ps1', 'F140-run-untimed-022.ps1', 'F140-seal-causal-images-023.mjs',
    'F140-reconcile-native-024.ps1', 'F140-accept-functional-025.mjs', 'F140-run-variant-027.ps1',
    'F140-compare-027.mjs', 'F140-prepare-measurement-027.mjs', 'F140-request-hold-028.mjs',
    'F140-review-owned-processes-029.ps1', 'F140-admit-quiescence-030.mjs', 'F140-close-failed-admission-031.ps1',
    'F140-prepare-inconclusive-032.mjs', 'autoperf-publish-bounded-outcome-012.mjs'])
{
    copy(path.join(session, file), 'executed-drivers/' + file);
}
copy(path.join(published, 'F169-F170', 'owner-handoff', 'evidence.mjs'), 'metadata-reader.mjs');
write(path.join(destination, 'authoritative-copies.json'), copies);
const acceptance = {
    recordedAt: new Date().toISOString(), findingId: 'F140', disposition: 'inconclusive-before-counter-admission',
    campaignAdministrativeBucket: 'no-gain', actualMeasuredNoBenefitClaimed: false,
    actualPerformanceQualification: false, actualCandidateNotMergedNoSourceCommitOrImplementationPr: true,
    actualNativeOrWarmupOrAllocationOrStopwatchExecution: false, actualConsumedFailedAuthorization: 1,
    actualCompletedPairs: 0, actualDefaultAuthorization: false, actualBudgetPermanentlyClosed: true,
    actualUnusedAuthorizationsPermanentlyClosed: 2, actualIndividualAncestrySubcheckCauseEstablished: false,
    actualV2FunctionalChecks: 36, actualV2NativeExecutionRows: 28, actualNativeDistinctFacts: 7,
    actualSourceRoleRuntimes: ['12.0.0-alpha.1.26562.105', '12.0.0-alpha.1.26569.107'],
    actualAllFourShippingTfmsBuiltPerRole: true, actualLegacyRuntimeExecuted: false,
    actualCommonV2SuccessfulCompiles: 1, actualCommonSuccessfulCompilesIncludingV1: 2,
    actualCopiedFiles: copies.length, actualCopiedBytes: copies.reduce((sum, item) => sum + item.bytes, 0),
    actualSelectedPePdbAssociations: metadata.length,
    actualSelectedRawDocumentAssociations: metadata.reduce((sum, item) => sum + item.documents.length, 0),
    actualOnlyV2CommonPdbAllDocumentsClaimed: true,
    actualOnlyF140FinalizedF141StillPending: true,
    actualSelectedBytesNotWholeImageRuntimeCompilerOrExecutionClosure: true,
    actualNoNewBenchmarkOrNativeWorkByPublication: true
};
write(path.join(destination, 'coordinator-acceptance.json'), acceptance);
write(path.join(run, 'publication-config.json'), {
    folder: 'F140', run, expectedParentIndex: '1a3cc5cc5fababe5d9b73ce75b7f35afb3c37812',
    performancePrAuthorized: false, subtype: acceptance.disposition, authoredMarkdown: ['README.md'],
    completedComparisons: [{ findingId: 'F140', authorizations: 1, closedBudgetFile: path.join(run, 'diagnostic-budget.json'),
        closedBudgetSha256: hash(fs.readFileSync(path.join(run, 'diagnostic-budget.json'))) }],
    issueTitle: '[AutoPerf F140] SignalR weak-cache timing admission inconclusive',
    issueSearch: '"AutoPerf F140" in:title',
    evidenceCommitTitle: 'Preserve SignalR cache study with failed timing admission',
    evidenceCommitDescription: 'Allfourcausal273fileimagespassed36realpublicclientchecksand28nativeFactexecutions7unique;all4shippingTFMsperrolecompile,realcollectibleALC/typeunloadwithliveHub,no cache seeding. Original37/default90normal62/69,commonV2once/V1plusV2two compiles. Frozenmixedprimary/primitive/clarifiedplainzerointerfacegatesunchanged. OneOriginalgatewayauthorizationfailedatlauncherancestry/creationidentityguardBEFOREdotnet/warmup/counter/firstpair;zeroexecutiondirs,individualsubcheckcauseunestablished. Ownbudgetpermanentlyclosed1of3,noDefault/retry/reopening/sourcecommit/PR. Actual2ownerHOLD,697boundedworkerPIDobservations/exactterminalgate-driver-launcher,failedleasearchived/explicitlyremovedandownersreleased. FreshselectedPEPDB/rawsources/XMLandallfailurespreserved,omittedwholeimages/runtimes/toolchainsnotattested. F141actualNativeAOTremainsseparatepending,fixedreportpreserved.',
    indexCommitTitle: 'Index inconclusive SignalR cache timing admission',
    outcomes: [{
        id: 'F140', status: 'no-gain',
        note: 'Inconclusive-before-counter-admission,NOTmeasurednogain/zerobenefit:oneOriginalgatewayauthorizationconsumedthenlauncherancestry/creationidentityguardfailedbeforeexecutiondir/dotnet/warmup/counters;0pairs0measurementprocesses,noDefault,exactsubcheckcausenotcaptured.36V2publicchecks/28nativeexecutions7Factsall4causalimagespassednormal62/69;all4shippingTFMs/rolebuilt. RealweakTypeALCunloadliveconnection,nocacheseeding,fullrawframes. CommonV2once/2totalV1V2compiles,allfailurespreserved,complete273filepairs2ownerDLLPDBdiff/common5/runtime197-198privatelyaccepted;publicselectedmetadata/rawsourcesonly,noomittedbyte/compiler/executionclosureclaim. Frozencriteriaandpre-executionplainclasscorrectionunchanged. Budgetpermanentlyclosed1of3,no retry/reopening/sourcecommit/PR/window;exactfailedleaseexplicitlyarchived/removedafterterminalchecks/2ownersreleased. F141actualNativeAOTstillpendingseparate.',
        readmeRow: '| F140 | **Inconclusive before counters:** weak-cache correctness passed, but launcher identity admission failed before dotnet/warmup. Failed authorization1of3 permanently closed;0pairs, not measured no benefit. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [SignalR study](F140/README.md), [verified publication](F140/publication.json) |'
    }]
});
console.log(JSON.stringify({ actualSelectedCopiedFiles: copies.length,
    actualSelectedCopiedBytes: acceptance.actualCopiedBytes, actualMetadataAssociations: metadata.length,
    actualRawDocumentAssociations: acceptance.actualSelectedRawDocumentAssociations,
    actualFailedAuthorizations: 1, actualNativeMeasurementProcesses: 0, actualNoNewNativeWork: true }, null, 2));
