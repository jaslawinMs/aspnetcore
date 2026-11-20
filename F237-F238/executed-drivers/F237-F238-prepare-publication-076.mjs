import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const parallel = path.join(session, 'autoperf-parallelism');
const capsule = path.join(parallel, 'finding-F237-F238-059', 'capsule-074');
const root = path.join(session, 'autoperf-published-results', 'F237-F238');
const run = path.join(session, 'autoperf-runs', 'F237-F238');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.deepEqual(fs.readdirSync(root).sort(), ['.gitattributes', 'README.md', 'verify.mjs']);
assert(!fs.existsSync(run));
assert(!fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')));
assert.equal(hash(fs.readFileSync(path.join(capsule, 'MANIFEST.json'))),
    '1ADCD10D302968101BA2420101F28192BD2040BF31F281EB26BE2B73D56E099B');
const manifest = read(path.join(capsule, 'MANIFEST.json'));
assert.equal(manifest.actualPayloadFiles, 1341);
assert.equal(manifest.actualPayloadBytes, 204293410);
const audit = read(path.join(parallel, 'F237-F238-offline-audit-075.stdout.txt'));
assert.equal(audit.actualAudit, 'PASS');
assert.equal(audit.actualNativePassedExecutions, 18);
assert.equal(audit.actualCommonRows, 12);
assert.equal(audit.actualCommonChecks, 192);
const receipt = read(path.join(parallel, 'F237-F238-offline-audit-075.exit.json'));
assert.equal(receipt.exit, 0);
assert.equal(receipt.actualRootTerminal, true);
assert.equal(receipt.actualStreamsDrained, true);
const ids = ['F237', 'F238'];
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
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
        assert(!item.isSymbolicLink());
        const source = path.join(directory, item.name), target = logical + '/' + item.name;
        if (item.isDirectory()) tree(source, target);
        else {
            assert(item.isFile());
            copy(source, target);
        }
    }
}
tree(capsule, 'owner-handoff');
assert.equal(copies.length, 1342);
const envelopeBytes = copies.reduce((sum, item) => sum + item.bytes, 0);
for (const suffix of ['stdout.txt', 'stderr.txt', 'exit.json']) {
    copy(path.join(parallel, 'F237-F238-offline-audit-075.' + suffix), 'coordinator-audit-075/' + suffix);
}
for (const name of ['F237-F238-prepare-publication-076.mjs', 'autoperf-publish-bounded-outcome-033.mjs']) {
    copy(path.join(session, name), 'executed-drivers/' + name);
}
write(path.join(root, 'authoritative-copies.json'), copies);
write(path.join(root, 'coordinator-portable-audit.json'), audit);
const acceptance = {
    recordedAt: new Date().toISOString(), findings: ids, outcome: 'rejected',
    subtype: 'obsolete-runtime-discovery-material-workload-unestablished',
    actualOriginalWholeNativeGraphBuiltAt: '37e809ead5824bc753a1c3d56f11615bdb1296c5',
    actualDefaultWholeNativeGraphBuiltAt: 'd3483989953ae3cccd773aea5ea04cb0c7198531',
    actualUnchangedTargetBlob: '07bc493e7b0cebf8930f03aef0211ea29f8b8ac6',
    actualNativePassedExecutions: 18, actualExactNativeFactsPerRole: 9,
    actualOriginalSelectionClassFilterFrozenBeforeCompile: true,
    actualNineNameSetReconciledAfterExecutionNotRetroactivelyFrozen: true,
    actualIndependentSystemXmlAndFreshNodeXmlIdentityReconciliationPassed: true,
    actualRealPhysicalFileSystemNativeRazorDirectiveFactoryAndPublicRegistrationReached: true,
    actualPublicMvcCoreBuilderNotFullMvcAggregateBoundary: true,
    actualAcceptedCSharp13CommonSha256: 'EE2FE4DC7E540FE28605F697A0FDE264418036A63EDCC1FEDCA012583E1088E6',
    actualCommonRows: 12, actualChecks: 192, actualModelCountsPerRole: [0, 1, 1, 5, 7, 4],
    actualRelativePathOrdinalIgnoreCaseNotViewEnginePath: true,
    actualAreaBeforeNormalOverlapFromRealPhysicalFilesystemNotInjectedDuplicates: true,
    actualUnsupportedAreaMayBecomeLaterNormalPageAndNonPageNotPremarkedRegistered: true,
    actualModelSelectorsRouteValuesOrderWarningsRepeatedDiscoveryAndNoFileMutationVerified: true,
    actualCommonOriginal62AndDefault69ClrDirectlyObserved: true,
    actualNativeTesthostAndCompilerManagedRuntimesNotDirectlyObserved: true,
    actualOneFailedAndTwoSuccessfulCommonCompilationsAllPreserved: true,
    actualCs1701VisibleWarningNotRuntimeCompatibilityAssertion: true,
    actualTwoCommon066RunsFailedBeforeAssertionsAtMissingFullAggregateDependency: true,
    actualCommon069CrLfPreparationFailureNotCompilerExecution: true,
    actualOriginalNativeRootZeroButWrapperOwnershipFailurePreserved: true,
    actualElevenPreexistingLegacyNumericParentCandidatesNotOwned: true,
    actualUnrelatedPrivateProcessArraysNotPublished: true,
    actualRawProcessReceiptFingerprintsAndExplicitScopedDerivativesPublished: true,
    actualHistoricalChronologicalAncestryNotRetrospectivelyAttested: true,
    actualSevenExactSourceSyntheticRegressionsPassAndTwoLegacyFalseAdoptionsReproduced: true,
    actualOriginalRootIdentityToleranceUnchanged: true,
    actualNoProcessStoppedOrNativeTestRerunToEraseFailure: true,
    actualNativePePdbAssociations: 8, actualAllSelectedRawDocuments: 328, actualEmbeddedRawDocuments: 32,
    actualCopiedCompilerReferenceImages: 317, actualCopiedObservedManagedImageFiles: 139,
    actualRawGitObjects: 186, actualSourceMemberships: 308,
    actualFourNativeMissingImportAssetsFailuresAndRepairsRetained: true,
    actualMalformedDirectiveCompiledPagePrepopulatedModelAndFullHttpBoundariesUnestablished: true,
    actualCompilerFilesNotCompilerClrOrCompleteNativeCompilerInputClosure: true,
    actualManagedSnapshotsBeforeSerializationNotExitPhase: true,
    actualRootExitsAndStreamsNotUniversalDescendantOrSharedHostIsolation: true,
    actualInnerActivationConsoleMessagesNotAllByteExactPersisted: true,
    actualSourceAndCompleteCommonConsumerReviewed: true,
    actualPublicRegistrationSaysObsoleteNotRecommendedProductionAndDevelopmentUseHotReload: true,
    actualNoMaterialSupportedDiscoveryWorkloadEstablished: true,
    actualNoCandidateIndexOrAllocationEquivalenceEstablished: true,
    actualNotMeasuredNoGainOrZeroCost: true,
    actualOwnerPayloadFiles: 1341, actualOwnerPayloadBytes: 204293410,
    actualOwnerEnvelopeFiles: 1342, actualOwnerEnvelopeBytes: envelopeBytes,
    actualCopiedFiles: copies.length, actualCopiedBytes: copies.reduce((sum, item) => sum + item.bytes, 0),
    actualNoCandidateTimingPerformancePrOrWindow: true
};
write(path.join(root, 'coordinator-acceptance.json'), acceptance);
const budgets = ids.map(findingId => ({
    findingId, maximumComparisons: 3, authorizations: [], closed: true,
    actualComparisons: 0, actualCandidateWritten: false, actualUnusedAuthorizationsPermanentlyClosed: 3,
    closedAt: new Date().toISOString(),
    closingReason: 'Obsolete runtime-compilation lifecycle discovery; real physical producer characterized, but representative material supported workload unestablished. Not measured no gain or zero cost; no candidate-equivalence claim.'
}));
write(path.join(root, 'closed-budgets.json'), budgets);
for (const budget of budgets) {
    const directory = path.join(run, budget.findingId);
    fs.mkdirSync(directory);
    write(path.join(directory, 'diagnostic-budget.json'), budget);
}
write(path.join(run, 'publication-config.json'), {
    folder: 'F237-F238', run, expectedParentIndex: '2577d764a1215a739eefa6767939c7b4dcddd80c',
    performancePrAuthorized: false, subtype: acceptance.subtype, authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F237-F238] Obsolete runtime discovery workload unestablished',
    issueSearch: '"AutoPerf F237-F238" in:title',
    evidenceCommitTitle: 'Preserve Razor runtime-discovery producer contracts and bounded failures',
    evidenceCommitDescription: 'Fresh independent Original37 and Defaultd348 native graphs; provider blob07bc493 unchanged. Eighteen real native facts reconciled by System.Xml and fresh offline XML. Same accepted C#13 consumer byte-used across real native physical Razor filesystem/directive/factory/public MvcCoreBuilder registration:12 rows192 checks,real case-variant overlap,area-first RelativePath.OrdinalIgnoreCase,invalid-area fallback,selectors/logging/order/repeated-discovery/file stability. Direct common CLR62/69,not native testhost/compiler CLR. Eight PE/PDB associations328 raw docs32 embedded317 refs139 managed files308 Git memberships186 raw objects. Preserve four native prereq failures,Original native0/wrapper ownership failure,eleven invalid preexisting sampler rows privately fingerprinted/public scoped derivatives,exact-source synthetic chronology red/green,all common compile/dependency/CRLF failures. Full MVC aggregate/compiled/malformed/HTTP and complete native compiler/OS closure unestablished. Obsolete lifecycle workload gate only,not measured no gain; both permanently closed0of3,no candidate/benchmark/performance PR/window or fixed REPORT change.',
    indexCommitTitle: 'Index two bounded Razor runtime-discovery outcomes',
    outcomes: ids.map(id => ({
        id, status: 'rejected',
        note: 'Obsolete runtime-compilation lifecycle discovery: material representative supported workload unestablished,not measured no gain or zero cost. Fresh Original37/Defaultd348 native graphs,target07bc493 unchanged;18 exact native facts with independent XML,real public MvcCoreBuilder/physical Razor/directive/factory consumer12rows192checks,sameC13DLL,actualCLR62/69 not native testhost/compiler CLR. Real area-first RelativePath.OrdinalIgnoreCase overlap/case-variant-root,unsupported-area normal fallback,model/selector/route/order/log/file/repeated-discovery contracts. Four native prereq failures,Original native0/wrapper post-root ownership failure,eleven preexisting numeric-parent false candidates retained privately with explicit fingerprints/scoped derivatives,no stops/rerun;seven exact-source synthetic guard cases/two old failures,unchanged identity tolerance. All common compile/dependency/CRLF failures retained. EightPEPDB328rawdocs32embedded317refs139managedfiles308Gitproofs186objects. FullMVCaggregate/HTTP/compiled/malformed/whole-native-compiler/universal-OS boundaries unestablished. No candidate index equivalence,performance claim,PR/window/fixedREPORTchange;each0of3permanentlyclosed.',
        readmeRow: '| ' + id + ' | **Rejected:** obsolete runtime-compilation lifecycle; real physical discovery contracts accepted, material workload unestablished. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [Razor evidence](F237-F238/README.md), [verified publication](F237-F238/publication.json) |'
    }))
});
console.log(JSON.stringify({ actualPrepared: ids, actualOwnerEnvelopeFiles: 1342,
    actualOwnerEnvelopeBytes: envelopeBytes, actualCopiedFiles: copies.length,
    actualCopiedBytes: acceptance.actualCopiedBytes, actualEachBudgetPermanentlyClosed: '0of3',
    actualNoNativeOrPerformanceProcessStarted: true }, null, 2));
