import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const parallel = path.join(session, 'autoperf-parallelism');
const preparation = path.join(parallel, 'finding-F194-F195-042');
const capsule = path.join(preparation, 'capsule');
const root = path.join(session, 'autoperf-published-results', 'F194-F195');
const run = path.join(session, 'autoperf-runs', 'F194-F195');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.deepEqual(fs.readdirSync(root).sort(), ['.gitattributes', 'README.md', 'verify.mjs']);
assert(!fs.existsSync(run));
const seal = read(path.join(preparation, 'SEALED-HANDOFF.json'));
assert.equal(seal.manifestSHA256, '6BFC9D59D36188571CB66A0B2283707A374F9CA577A6A4C2E2D48C4C5582C128');
assert.equal(hash(fs.readFileSync(path.join(capsule, 'MANIFEST.json'))), seal.manifestSHA256);
assert.equal(seal.nativeRootsAndStreams.sameIdentitiesStillObserved, 0);
const auditFile = path.join(parallel, 'F194-F195-coordinator-audit-047.stdout.txt');
const audit = read(auditFile);
assert.equal(audit.status, 'PASS');
assert.equal(audit.manifestSHA256, seal.manifestSHA256);
const xmlFile = path.join(parallel, 'F194-F195-coordinator-system-xml-051.json');
const xml = read(xmlFile);
assert.equal(xml.actualPassedExecutions, 22);
assert.equal(xml.actualNativeTesthostExitCodesStillUnknown, true);
const ids = ['F194', 'F195'];
const campaign = read(path.join(session, 'autoperf-campaign.json'));
for (const id of ids) assert.equal(campaign.candidates.find(item => item.id === id).status, 'pending');
const sourceObservation = spawnSync('git', ['--no-pager', '-C', String.raw`C:\src\aspnetcore`, 'rev-parse',
    'd3483989953ae3cccd773aea5ea04cb0c7198531:src/FileProviders/Embedded/test/Manifest/TestEntry.cs'], { encoding: 'utf8' });
assert.ifError(sourceObservation.error);
assert.equal(sourceObservation.status, 0);
assert.equal(sourceObservation.stdout.trim(), '178e2f54d4ae50c400538120ad4dde08c8581936');
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
assert.equal(copies.length, 565);
assert.equal(copies.reduce((sum, item) => sum + item.bytes, 0), 173121037);
for (const entry of fs.readdirSync(preparation, { withFileTypes: true }).filter(item => item.isFile()))
    copy(path.join(preparation, entry.name), 'owner-closing/' + entry.name);
tree(path.join(preparation, 'node-attempts'), 'owner-node-attempts');
tree(path.join(preparation, 'seal-attempts'), 'owner-seal-attempts');
copy(xmlFile, 'coordinator-independent-system-xml.json');
for (const suffix of ['stdout.txt', 'stderr.txt', 'exit.json'])
    copy(path.join(parallel, 'F194-F195-coordinator-audit-047.' + suffix), 'coordinator-audit-047/' + suffix);
for (const file of ['F194-F195-reconcile-native-051.ps1', 'F194-F195-prepare-publication-052.mjs', 'autoperf-publish-bounded-outcome-033.mjs'])
    copy(path.join(session, file), 'executed-drivers/' + file);
write(path.join(root, 'authoritative-copies.json'), copies);
write(path.join(root, 'coordinator-portable-audit.json'), audit);
write(path.join(root, 'coordinator-later-target-observation.json'), {
    actualCommit: 'd3483989953ae3cccd773aea5ea04cb0c7198531', actualBlob: sourceObservation.stdout.trim(),
    actualExitCode: sourceObservation.status, actualStdout: sourceObservation.stdout, actualStderr: sourceObservation.stderr,
    actualSourceOnlyNotWholeLaterDefaultBuildOrTest: true
});
const acceptance = {
    recordedAt: new Date().toISOString(), findings: ids, outcome: 'rejected',
    subtype: 'nonshipping-manifest-test-support-material-workload-unestablished',
    actualOriginalSource: '37e809ead5824bc753a1c3d56f11615bdb1296c5',
    actualWholeEntryDefaultBuiltAndTested: 'e26532d156ed19f66c88aca8f4374e081bcd5d72',
    actualLaterTargetOnlyObservation: 'd3483989953ae3cccd773aea5ea04cb0c7198531',
    actualWholeLaterDefaultBuiltOrTested: false,
    actualParentReadNativeOwnerAndRealTestAssemblyConstructorAndCompleteCommonConsumer: true,
    actualNativeReports: 2, actualNativeExecutions: 22, actualUniqueCases: 11, actualNativeMethods: 10,
    actualIndividualCaseSensitiveTheoryCases: 2, actualTheoryExecutions: 4, actualCommonCasesPerRole: 12,
    actualOneSuccessfulCommonCompilationSameDllBothRolesAndHooks: true,
    actualHelperFactoriesAndTestAssemblyManifestAndPublicProviderReached: true,
    actualEagerShallowMembershipSnapshotAndResourceStringSnapshotDistinguished: true,
    actualFlatteningOrderDiffersFromXmlAndPublicProviderOrder: true,
    actualInvalidDirectHelperDiagnosticsNotPublicProviderScenarios: true,
    actualTestAssemblyResourceStreamsAreNativeEmptyFixtureResourcesNotProductionContent: true,
    actualSelectedPePdbAssociations: 5, actualSelectedRawDocumentChecksums: 70,
    actualGitMemberships: 90, actualRawGitObjects: 75,
    actualNativeTesthostExitCodesUnknown: true,
    actualManagedMvidObservationsInCommonConsumerNotPromotedToNativeTesthostLoad: true,
    actualSavedRoots: 16, actualFinalObservedPidCreationChecks: 65, actualNoMatchingRecordedOwner: true,
    actualNoFullCompilerRuntimeOsOrUniversalProcessClosureClaim: true,
    actualOwnerPayloadFiles: 563, actualOwnerPayloadBytes: 173003876,
    actualOwnerEnvelopeFiles: 565, actualOwnerEnvelopeBytes: 173121037,
    actualExternalFailedAuditorAndSealingHistoriesPreserved: true,
    actualNoMaterialFixtureFrequencyCardinalityOrPerformanceEstablished: true,
    actualNotMeasuredNoGainOrZeroCost: true,
    actualCopiedFiles: copies.length, actualCopiedBytes: copies.reduce((sum, item) => sum + item.bytes, 0),
    actualNoCandidateTimingPerformancePrOrWindow: true
};
write(path.join(root, 'coordinator-acceptance.json'), acceptance);
const budgets = ids.map(findingId => ({
    findingId, maximumComparisons: 3, authorizations: [], closed: true,
    actualComparisons: 0, actualCandidateWritten: false, actualUnusedAuthorizationsPermanentlyClosed: 3,
    closedAt: new Date().toISOString(),
    closingReason: 'Nonshipping native manifest-test helper; real producer contracts accepted, but no material fixture construction workload established. Not a measured no-gain or zero-cost outcome.'
}));
write(path.join(root, 'closed-budgets.json'), budgets);
for (const budget of budgets) {
    const directory = path.join(run, budget.findingId);
    fs.mkdirSync(directory);
    write(path.join(directory, 'diagnostic-budget.json'), budget);
}
write(path.join(run, 'publication-config.json'), {
    folder: 'F194-F195', run, expectedParentIndex: 'a63eb4aced1d7622468f3841bee76003ec7e3e30',
    performancePrAuthorized: false, subtype: acceptance.subtype, authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F194-F195] Manifest test-helper workload unestablished',
    issueSearch: '"AutoPerf F194-F195" in:title',
    evidenceCommitTitle: 'Preserve embedded manifest test-helper producer contracts',
    evidenceCommitDescription: 'Original37/full independently observed entryDefaulte265 native62/69, laterd348 targetblob178e2f54unchanged notwholelatertest. NativeTestEntryfactories eagerdirectfiles+recursiveflatteningorder/shallowmembershipreference snapshots and invalidhelper synchronous exceptions distinctly labelednotlegalpublicprovider. RealTestAssemblyconstructor writesXMLbefore resourcepathsnapshot; realpublicManifestEmbeddedFileProvider parser/order/6nativeemptyfixtureresourcestreams reached. SameonecompiledcommonDLLbothrolesandhooks;12cases/role24total;2actualTRXs22executions11case-sensitivecases10methods2differentcasingtheoryrows4executionsindependentlySystemXml.5PEPDBpairs70selectedrawdocs75rawGitobjects90memberships,563payload173003876B/565envelope173121037B unchanged. NativeTesthostexithooksabsent/exitsunknown;actualmanagedMVIDsincommonconsumerdistinctfromnativeearlyentry/filesamples.16savedrootsrealexitsdrainedstreams65observedPIDcreationchecks0recordedownersnotuniversalcensus. Failedprereqs/PDBchecksumassumption/Teeemptydiff/assembly/externalnodeandsealinghistoriespreserved. Bothrejectednonshippingtestsupportmaterialworkloadunestablished,notmeasurednogain;each0of3foreverclosed,nocandidate/benchmark/perfPR/window/fixedREPORTchange.',
    indexCommitTitle: 'Index two bounded manifest-test helper outcomes',
    outcomes: ids.map(id => ({
        id, status: 'rejected',
        note: 'Nonshippingmanifest-test-support material-workload-unestablished, not measured no benefit. ActualTestEntry factories/GetFiles eagerorder/shallowreference snapshots;realTestAssemblyXMLthenresourcepathstringsandpublicManifestEmbeddedFileProvider/emptyfixtureresourcestreams accepted,invaliddirecthelpercasesexplicitnotpublicnormal. Original37/fullentryDefaulte265 normal62/69/laterd348 targetunchangednotwholelatertest.2TRXs22exec11case-sensitivecases10methods2theoryrows4exec/12commoncasesperroleonecompiledDLL.5PEPDB70rawdocchecks75Gitobjects90memberships;565ownerenvelope173121037B andallouterfailednode/sealinghistoryretained.16savedrootexitsdrained/65boundedPIDcreationchecks0ownersnotuniversal;nativeTesthostexitsunknownandcommonmanagedMVIDsnotpromotedtothosehosts. No materialfixturefrequency/cardinality/candidateequivalence/performanceestablished,0of3permanentlyclosed,nocandidate/perfPR/window/fixedREPORTchange.',
        readmeRow: '| ' + id + ' | **Rejected:** nonshipping manifest `TestEntry` materialization; real producer/snapshot/order contracts accepted, material workload unestablished. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [Manifest helper evidence](F194-F195/README.md), [verified publication](F194-F195/publication.json) |'
    }))
});
console.log(JSON.stringify({ actualPrepared: ids, actualOwnerEnvelopeFiles: 565,
    actualCopiedFiles: copies.length, actualCopiedBytes: acceptance.actualCopiedBytes,
    actualEachBudgetPermanentlyClosed: '0of3', actualNoNativeOrPerformanceProcessStarted: true }, null, 2));
