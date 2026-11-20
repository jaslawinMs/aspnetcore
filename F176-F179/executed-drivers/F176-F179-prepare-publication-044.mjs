import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url)), parallel = path.join(session, 'autoperf-parallelism');
const preparation = path.join(parallel, 'finding-F176-F179-022'), capsule = path.join(preparation, 'capsule');
const root = path.join(session, 'autoperf-published-results', 'F176-F179');
const run = path.join(session, 'autoperf-runs', 'F176-F179');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.deepEqual(fs.readdirSync(root).sort(), ['.gitattributes', 'README.md', 'verify.mjs']);
assert.equal(fs.existsSync(run), false);
const seal = read(path.join(preparation, 'SEALED-HANDOFF.json'));
assert.equal(seal.agentId, '06005641-57b2-4fa5-856c-b2bf4bf642e9');
assert.equal(seal.manifest.sha256, 'CF26CE886CDEF8494E699A471FDE7A086E4007AD4F1E8184ACFB25D7FFAA4F6F');
assert.equal(hash(fs.readFileSync(path.join(capsule, 'MANIFEST.json'))), seal.manifest.sha256);
assert.equal(seal.finalTerminal.remainingRecordedOwned, 0);
assert.equal(seal.finalTerminal.bothStreamsDrained, true);
const xmlFile = path.join(parallel, 'F176-F179-coordinator-system-xml-043.json'), xml = read(xmlFile);
assert.equal(xml.actualPassedExecutions, 44);
assert.equal(xml.actualUniqueSelectedCases, 11);
assert.equal(xml.actualMissingHistoricalNativeManagedExitSnapshots, 4);
const audit = read(path.join(preparation, 'offline-audit-04.stdout.txt'));
assert.equal(audit.result, 'PASS');
assert.equal(audit.manifestSha256, seal.manifest.sha256);
const campaign = read(path.join(session, 'autoperf-campaign.json')), ids = ['F176', 'F177', 'F178', 'F179'];
for (const id of ids) { assert.equal(campaign.candidates.find(item => item.id === id).status, 'pending'); }
for (const [file, blob] of [
    ['src/Mvc/Mvc.Core/src/Builder/ControllerEndpointRouteBuilderExtensions.cs', 'df6d1f42affe726840a5ad7a7fee6e397e654afd'],
    ['src/Mvc/Mvc.Razor/src/Compilation/DefaultViewCompiler.cs', '162da5dfaad6234ae31ad50fd2085c806fa1fdc3']
])
{
    const observed = spawnSync('git', ['--no-pager', 'rev-parse', '83d976704fa0f9aa4361327d1f9d929c93bd9256:' + file],
        { cwd: String.raw`C:\src\aspnetcore`, encoding: 'utf8' });
    assert.ifError(observed.error);
    assert.equal(observed.status, 0);
    assert.equal(observed.stdout.trim(), blob);
}
fs.mkdirSync(run);
const copies = [];
function copy(source, logical)
{
    const bytes = fs.readFileSync(source), target = path.join(root, ...logical.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes, { flag: 'wx' });
    assert.equal(hash(fs.readFileSync(target)), hash(bytes));
    copies.push({ file: logical, actualSourcePath: source, bytes: bytes.length, sha256: hash(bytes) });
}
function tree(directory, logical)
{
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }))
    {
        assert.equal(entry.isSymbolicLink(), false);
        const source = path.join(directory, entry.name), target = logical + '/' + entry.name;
        if (entry.isDirectory()) { tree(source, target); }
        else { copy(source, target); }
    }
}
tree(capsule, 'owner-handoff');
assert.equal(copies.length, 4770);
assert.equal(copies.reduce((sum, item) => sum + item.bytes, 0), 212441232);
for (const entry of fs.readdirSync(preparation, { withFileTypes: true }).filter(item => item.isFile()))
{
    copy(path.join(preparation, entry.name), 'owner-closing/' + entry.name);
}
copy(xmlFile, 'coordinator-independent-system-xml.json');
for (const file of ['F176-F179-reconcile-native-043.ps1', 'F176-F179-prepare-publication-044.mjs', 'autoperf-publish-bounded-outcome-033.mjs'])
{
    copy(path.join(session, file), 'executed-drivers/' + file);
}
write(path.join(root, 'authoritative-copies.json'), copies);
write(path.join(root, 'coordinator-portable-audit.json'), audit);
const acceptance = {
    recordedAt: new Date().toISOString(), findings: ids, outcome: 'rejected',
    subtype: 'startup-scoped-dictionary-probes-material-workload-unestablished',
    actualOwnerManifestSha256: seal.manifest.sha256,
    actualOwnerPayloadFiles: 4768, actualOwnerPayloadBytes: 211453517,
    actualOwnerEnvelopeFiles: 4770, actualOwnerEnvelopeBytes: 212441232,
    actualOriginalSource: '37e809ead5824bc753a1c3d56f11615bdb1296c5',
    actualWholeDefaultBuiltAndTested: 'adf2e9d22addd1461c6c25e8a8f411be28b81100',
    actualClosingObservedTargetOnlyDefault: '83d976704fa0f9aa4361327d1f9d929c93bd9256',
    actualWholeClosingDefaultBuiltOrTested: false,
    actualParentReviewedUnchangedTargetSeamsAndAcceptedCommonConsumer: true,
    actualNativeReports: 8, actualNativeRowExecutions: 44,
    actualUniqueNativeMethods: 9, actualUniqueSelectedNativeCases: 11,
    actualDistinctTheoryCases: 3, actualTheoryCaseExecutionsAcrossRolesAndModes: 12,
    actualSupplementalRowsPerRole: 9, actualSupplementalChecksPerRole: 94,
    actualCscInvocations: 4, actualFailedCscInvocations: 2, actualSuccessfulCscInvocations: 2,
    actualSuccessfulSupersededCscArtifacts: 1, actualAcceptedCommonCscArtifacts: 1,
    actualPreNativeWrapperFailure: 1, actualFailedProducerMissingDependency: 1,
    actualCommonConsumerAcceptedMvid: 'c2b66361-f731-4a4d-8d68-6a62d16de1b8',
    actualCommonConsumerSameFourAcceptedFilesForBothRoles: true,
    actualSampledNativeModuleFilesNotManagedReflectionMvidClaim: true,
    actualSupplementalAndHookManagedIdentityEvidenceSeparatelyAttributed: true,
    actualMissingHistoricalNativeManagedExitSnapshots: 4,
    actualNoFullNativeManagedExitClosureAttestation: true,
    actualFreshManagedPePdbAssociations: 24, actualPdbDocumentRecords: 3946,
    actualRawDocumentAssociations: 3940, actualEmbeddedSourceChecks: 162,
    actualHistoricalLogicalDocumentsWithoutRawBytes: 6,
    actualHistoricalMissingRawBytesNotReconstructedOrAttested: true,
    actualSourceGitMerkleProofs: 2762, actualRawCommitTreeObjects: 154,
    actualDoubleProbeOnRouteKeyMissingBranchOnlyNotEachRequest: true,
    actualRepeatedMappingRetainsFirstRealBuilderAndResolver: true,
    actualFreshConventionalRouteItemsDistinctFromDefaultBuilderItems: true,
    actualViewCacheOrdinalIgnoreCaseAndFirstDescriptorTaskIdentity: true,
    actualDuplicateGuardSkipsTaskFromResultEvaluation: true,
    actualConstructedCrossPartAlcTopologyNotApplicationPrevalence: true,
    actualNoHttpServerBrowserConcurrentMappingAlcCollectionOrHotReloadClaim: true,
    actualNoMaterialApplicationFrequencyCardinalityOrPerformanceEstablished: true,
    actualNotMeasuredNoGainOrZeroCost: true,
    actualHistoricalHold591ExactUtcIdentitiesReconciledNotNewObservation: true,
    actualFinalRecordedPidCreationIdentities: 646,
    actualOwnedKnownTerminalAndStreamsDrainedNotUniversalHostInactivity: true,
    actualNoOmittedImageRuntimeCompilerOrOsClosureAttestation: true,
    actualCopiedFiles: copies.length, actualCopiedBytes: copies.reduce((sum, item) => sum + item.bytes, 0),
    actualNoCandidateTimingPerformancePrOrWindow: true
};
write(path.join(root, 'coordinator-acceptance.json'), acceptance);
const methods = ['MapControllers', 'MapDefaultControllerRoute', 'MapControllerRoute', 'DefaultViewCompiler.EnsureCompiledViews'];
const budgets = ids.map((findingId, index) => ({ findingId, maximumComparisons: 3, authorizations: [], closed: true,
    actualComparisons: 0, actualCandidateWritten: false, actualUnusedAuthorizationsPermanentlyClosed: 3,
    closedAt: new Date().toISOString(), closingReason: methods[index] +
        ': unchanged real public startup/initialization producer contracts accepted; no material application registration/cache-build workload established. Not a measured no-gain or zero-cost outcome.' }));
write(path.join(root, 'closed-budgets.json'), budgets);
for (const budget of budgets)
{
    const directory = path.join(run, budget.findingId);
    fs.mkdirSync(directory);
    write(path.join(directory, 'diagnostic-budget.json'), budget);
}
write(path.join(run, 'publication-config.json'), {
    folder: 'F176-F179', run, expectedParentIndex: 'db7fcc17a091c5b33ad90ef0022b06007a9097e5',
    performancePrAuthorized: false, subtype: acceptance.subtype, authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F176-F179] Startup dictionary probes lack a material workload',
    issueSearch: '"AutoPerf F176-F179" in:title',
    evidenceCommitTitle: 'Preserve MVC registration and precompiled-view identity contracts',
    evidenceCommitDescription: 'UnchangedOriginal37/wholeentryDefaultadf2e9normal62/69,closing83d2targetblobsunchangednotwholeclosingtest. RealAddControllersWithViews/discovery/UseRoutingpublicbuilders/repeated3mappingmethods/sharednativeDataSource/retainedfirstbuilder+resolver/materializedendpointconventions+staticmetadata. DefaultItemsconcretecase-sensitiveDictionary,conventionalreturnedItemsdistinct. NativeRazorBuildWebSite.Viewsrealparts/loaders/compiler/pagefactory/ExecuteAsync;OrdinalIgnoreCasecachefirsttask/descriptor;twocollectibleALCsconstructedcrosspartduplicatesbothordersnotprevalence. TargetguardavoidsduplicateTask.FromResultevaluation.8TRXs44executions11cases9methods/3theoryrows12executions independentlySystemXml;9consumerrows94checksperrole.4cscattempts2failed2successesoneaccepted05one superseded04pluspre-nativewrapper/dependencyfailuresallretained. Fresh24PEPDBpairs3946docs3940raw162embeddedchecks6historicalrawmissingnotfabricated;2762Gitproofs154objects.4768payload211453517B/4770envelope212441232B unchanged. Fourmissinghistoricalmanagedexit snapshotsno full native managed exitclosure;55nativecommands40success15failures,646knownPIDcreationidentitiesfinalzeroowned/streamsdrainednotcensus. HOLD591UTCidentitycorrectionrawackunchanged,threepriorfailedauditsallpreserved. Own4budgets0of3foreverclosed,rejectedstartupworkloadunestablishednotmeasurednogain;nocandidate/perfPR/window/fixedREPORTunchanged.',
    indexCommitTitle: 'Index four bounded MVC startup-probe outcomes',
    outcomes: ids.map((id, index) => ({
        id, status: 'rejected',
        note: 'Startup-scoped dictionary-probe material-workload-unestablished, not measured no benefit. ' + methods[index] +
            ';actualpublicMVCregistration+firstnativeDefaultBuilder/Items/resolveridentity/convention/staticmetadataandrealprecompiledRazorpart/compiler/pagefactory/ExecuteAsynccase/order/taskidentityaccepted. Targetdoubleprobeisconfiguration/cacheinitializationnotrequestdispatch;duplicateviewguardalsoavoidsTask.FromResultevaluation.8TRXs44executions11cases9methods3distincttheoryrows12executions;9supplementalrows94checks/role.4actualcsc2failed2success(oneaccepted05/one superseded04)+pre-nativewrapper/dependencyfailuresretained. Original37/fullDefaultadf2e9normal62/69;closing83dtargetblobsunchangednotwholefreshdefaulttest.24PEPDB3946docs3940raw162embeddedchecks6historicalrawmissingnotfabricated,2762Gitproofs154objects.4770ownerfiles212441232B unchangedallhistory.4historicalmanagedexit snapshotsmissingexplicitno complete native managed exitclosure;646boundedknownPIDcreationsfinal0owned/allrecordedstreamsdrainednotuniversalabsence. OriginalHOLDackunchanged591exactUTCidentitiesindependentlyreconciled,prior3failedauditsretained. NoHTTP/browser/concurrentmapping/ALCcollection/hotreload/performanceclaim;each0of3permanentlyclosed,nocandidate/PR/window.',
        readmeRow: '| ' + id + ' | **Rejected:** startup/initialization `' + methods[index] +
            '` dictionary probes; real identity/order contracts accepted, material workload unestablished. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [MVC startup evidence](F176-F179/README.md), [verified publication](F176-F179/publication.json) |'
    }))
});
console.log(JSON.stringify({ actualPrepared: ids, actualOwnerEnvelopeFiles: 4770, actualOwnerEnvelopeBytes: 212441232,
    actualCopiedFiles: copies.length, actualCopiedBytes: acceptance.actualCopiedBytes,
    actualEachBudgetPermanentlyClosed: '0of3', actualNoNativeTargetOrCounterStarted: true }, null, 2));
