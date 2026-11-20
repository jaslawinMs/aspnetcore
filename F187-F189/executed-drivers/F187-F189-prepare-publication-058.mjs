import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const parallel = path.join(session, 'autoperf-parallelism');
const preparation = path.join(parallel, 'finding-F187-F189-038');
const capsule = path.join(preparation, 'capsule');
const root = path.join(session, 'autoperf-published-results', 'F187-F189');
const run = path.join(session, 'autoperf-runs', 'F187-F189');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.deepEqual(fs.readdirSync(root).sort(), ['.gitattributes', 'README.md', 'verify.mjs']);
assert(!fs.existsSync(run));
const seal = read(path.join(preparation, 'SEALED.json'));
assert.equal(seal.capsule.manifestSha256.toUpperCase(), '70CC382BF8830CE01DAA356D9D27960393CAFE75E0C67E3545513058CC0E567B');
assert.equal(hash(fs.readFileSync(path.join(capsule, 'MANIFEST.json'))), seal.capsule.manifestSha256.toUpperCase());
assert.equal(seal.terminalBoundary.recordedCommands, 81);
assert.equal(seal.terminalBoundary.allRecordedRootsExited, true);
assert.equal(seal.terminalBoundary.allRecordedStreamsDrained, true);
assert.equal(seal.terminalBoundary.priorRecordedCreationsAlive, 0);
const auditFile = path.join(parallel, 'F187-F189-coordinator-audit-055.stdout.txt');
const audit = read(auditFile);
assert.equal(audit.result, 'PASS');
assert.equal(audit.manifestSha256, seal.capsule.manifestSha256);
const auditReceipt = read(path.join(parallel, 'F187-F189-coordinator-audit-055.exit.json'));
assert.equal(auditReceipt.exit, 0);
assert.equal(auditReceipt.actualRootTerminal, true);
assert.equal(auditReceipt.actualStreamsDrained, true);
const xmlFile = path.join(parallel, 'F187-F189-coordinator-system-xml-057.json');
const xml = read(xmlFile);
assert.equal(xml.actualPassedExecutions, 38);
assert.equal(xml.actualTheoryExecutionsAcrossRoles, 8);
const ids = ['F187', 'F188', 'F189'];
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
assert.equal(copies.length, 2282);
assert.equal(copies.reduce((sum, item) => sum + item.bytes, 0), 273471048);
for (const entry of fs.readdirSync(preparation, { withFileTypes: true }).filter(item => item.isFile()))
    copy(path.join(preparation, entry.name), 'owner-closing/' + entry.name);
tree(path.join(preparation, 'audit-commands'), 'owner-audit-commands');
copy(xmlFile, 'coordinator-independent-system-xml.json');
for (const suffix of ['stdout.txt', 'stderr.txt', 'exit.json'])
    copy(path.join(parallel, 'F187-F189-coordinator-audit-055.' + suffix), 'coordinator-audit-055/' + suffix);
for (const name of ['F187-F189-reconcile-native-057.ps1', 'F187-F189-prepare-publication-058.mjs', 'autoperf-publish-bounded-outcome-033.mjs'])
    copy(path.join(session, name), 'executed-drivers/' + name);
write(path.join(root, 'authoritative-copies.json'), copies);
write(path.join(root, 'coordinator-portable-audit.json'), audit);
const acceptance = {
    recordedAt: new Date().toISOString(), findings: ids, outcome: 'rejected',
    subtype: 'nonshipping-helper-workload-and-nested-fixture-unreachability',
    actualOriginalWholeNativeGraphsBuiltAndTested: '37e809ead5824bc753a1c3d56f11615bdb1296c5',
    actualWholeEntryDefaultBuiltAndTested: '83d976704fa0f9aa4361327d1f9d929c93bd9256',
    actualClosingTargetOnlyObservation: 'd3483989953ae3cccd773aea5ea04cb0c7198531',
    actualWholeLaterDefaultBuiltOrTested: false,
    actualNativeReports: 4, actualNativeExecutions: 38, actualUniqueCases: 19, actualNativeMethods: 16,
    actualIndividualCaseSensitiveTheoryCases: 4, actualTheoryExecutions: 8,
    actualAcceptedCommonCasesPerRole: 6, actualAcceptedCommonAssertionsPerRole: 128,
    actualSuccessfulCommonCompilations: 2, actualFailedCommonCompilations: 0,
    actualEarlierCohortRows: 12, actualEarlierFailedRows: 2,
    actualEarlierPassedAssertions: 236, actualEarlierAssertions: 238,
    actualEarlierDiagnosticAssumptionFailureAndCorrectedAfterContextObservationPreserved: true,
    actualTwoInputPreparationFailuresAndRejectedImageMergePreserved: true,
    actualHelperPrivateThrowingNotFoundContractAndOrdinalMutableLookupPreserved: true,
    actualPublicRazorEnumerationCompilerNegativeCacheAndFileVersionCacheProducersReached: true,
    actualHelperHasChangedMutationNotClaimedAsPhysicalFilesystemNotificationProducer: true,
    actualNestedControllerExcludedInActualHostedFixtureTargetNeverInvoked: true,
    actualNestedHostedRoute404AndDiscoveredRealTransientActivationReturnedContentResultControls: true,
    actualCustomDiscoveryHostsOutsideBoundary: true,
    actualSelectedPePdbAssociations: 36, actualSelectedRawDocumentChecksums: 96,
    actualPdbMetadataDocumentRowsNotAllRawVerified: 3930,
    actualAdditionalRetainedCompilerReferencePeRecords: 211,
    actualNativeMvidFileParsesNotPromotedToInProcessNativeReflection: true,
    actualSavedCommandRoots: 81, actualFrozenPreSealRoots: 77, actualOutsideClosingRoots: 4,
    actualSnapshotRecordedCreationChecks: 1702, actualPriorRecordedCreationsStillAlive: 0,
    actualRootExitsDrainedStreamsAndBoundedObservedDescendantsNotUniversalOsOrToolchainClosure: true,
    actualOwnerPayloadFiles: 2280, actualOwnerPayloadBytes: 272976572,
    actualOwnerEnvelopeFiles: 2282, actualOwnerEnvelopeBytes: 273471048,
    actualCopiedFiles: copies.length, actualCopiedBytes: copies.reduce((sum, item) => sum + item.bytes, 0),
    actualNoMaterialTestFixtureFrequencyCardinalityOrPerformanceEstablished: true,
    actualNotMeasuredNoGainOrZeroCost: true, actualNoCandidateTimingPerformancePrOrWindow: true
};
write(path.join(root, 'coordinator-acceptance.json'), acceptance);
const reasons = {
    F187: 'Nonshipping directory-miss test helper; actual state/enumeration/recursive Razor producer characterized, but material fixture workload unestablished. Not measured no gain.',
    F188: 'Nonshipping private throwing file-miss test helper; ordinal mutable lookup and real cache consumers characterized, but material fixture workload unestablished. Not measured no gain.',
    F189: 'Actual owning hosted fixture excludes nested controller; real nested route404 and positive discovered activation/ContentResult controls established, target Index/EmptyResult not invoked. Other custom discovery hosts excluded. Not measured no gain.'
};
const budgets = ids.map(findingId => ({
    findingId, maximumComparisons: 3, authorizations: [], closed: true,
    actualComparisons: 0, actualCandidateWritten: false, actualUnusedAuthorizationsPermanentlyClosed: 3,
    closedAt: new Date().toISOString(), closingReason: reasons[findingId]
}));
write(path.join(root, 'closed-budgets.json'), budgets);
for (const budget of budgets) {
    const directory = path.join(run, budget.findingId);
    fs.mkdirSync(directory);
    write(path.join(directory, 'diagnostic-budget.json'), budget);
}
write(path.join(run, 'publication-config.json'), {
    folder: 'F187-F189', run, expectedParentIndex: '9b047ee80dd5ab3b37a9a17974106c91a6affde8',
    performancePrAuthorized: false, subtype: acceptance.subtype, authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F187-F189] Test-helper scope and unreachable nested action',
    issueSearch: '"AutoPerf F187-F189" in:title',
    evidenceCommitTitle: 'Preserve MVC helper and real nested-controller discovery contracts',
    evidenceCommitDescription: 'FreshOriginal37/wholepinnedDefault83d976nativegraphs,closingd348targetonlynotwholelatertest;actualnormal62/69distinctsampledhostfxr65/compiler57. ActualprivatemissingfileExistsfalse/6throwingmembersandordinalmutablelookup;realdirectory/Razorenumeration/compilernegativecache/FileVersionProvidercachereached;HasChangedhelpermutationnotOSnotificationproducer. Actualhostingexcludesnestedcontroller/action/services,targetroute404,targetEmptyResultneverinvoked;discoveredrealtransientcontrols/actualContentResultandHTTPbodies.4nativeTRXs38exec19cases16methods4discoverytheorycases8execparentSystemXmlreconciled. Accepted12commoncases256assertions;2successfulC13compiles,earlier12rows2failed236of238assertionsdiagnosticAfterControllercontextassumptioncorrectednotshippingcode;2inputprepfailures/rejecteddependencymergeallpreserved.36selectedPEPDB96rawdocsnotall3930PDBdocs/211additionalreferencePEs;nativefileMVIDnotpromotedinprocessreflection.2280payload272976572B/2282envelope273471048B,81recordedroots77preseal4closing/1702boundedcreationchecks0oldowner;exits/streamsnotuniversalOS/toolchainclosure. F187F188rejectedmaterialtestworkloadunestablished;F189rejectedowningproducerunreachable,notmeasurednogain;each0of3foreverclosed,nocandidate/benchmark/perfPR/window/fixedREPORTchange.',
    indexCommitTitle: 'Index three bounded MVC test-fixture outcomes',
    outcomes: ids.map(id => ({
        id, status: 'rejected',
        note: reasons[id] + ' FreshOriginal37/wholepinnedDefault83d976/laterd348targetonly;actual62/69.4nativeTRXs38executions19case-sensitivecases16methods4individualdiscoverytheorycases8executionsparentSystemXml;accepted12commoncases256assertions2successfulC13compiles,earlier12rows2failed236of238assertions/diagnosticAfterControllercontextassumptioncorrectednotshippingcode,input/imagepreparationfailuresretained.36PEPDB96selectedrawchecksnotall3930docs/211additionalreferencePEs;nativeparsedMVIDnotinprocessreflection. ActualhelperprivateThrowingNotFound/ordinalstate/realRazornegativeandversioncacheproducers;HasChangednotOSwatcher,nestedhost404/discoveredtransientContentResultcontrolsnotEmptyResultexecution.2282envelope273471048B+outsideclosing/failures,81roots1702boundedcreationchecks0priorownersnotuniversalclosure.0of3foreverclosed,nocandidate/performancePR/window/fixedREPORTchange.',
        readmeRow: '| ' + id + ' | **Rejected:** ' + (id === 'F189' ? 'actual owning fixture excludes nested controller; target allocation not reached.' : 'nonshipping missing-result test helper; material fixture workload unestablished.') + ' [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [MVC fixture evidence](F187-F189/README.md), [verified publication](F187-F189/publication.json) |'
    }))
});
console.log(JSON.stringify({ actualPrepared: ids, actualOwnerEnvelopeFiles: 2282,
    actualCopiedFiles: copies.length, actualCopiedBytes: acceptance.actualCopiedBytes,
    actualEachBudgetPermanentlyClosed: '0of3', actualNoNativeOrPerformanceProcessStarted: true }, null, 2));
