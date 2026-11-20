import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const published = path.join(session, 'autoperf-published-results');
const capsule = path.join(session, 'autoperf-parallelism', 'finding-F163-F165-011', 'capsule');
const destination = path.join(published, 'F163-F165');
const run = path.join(session, 'autoperf-runs', 'F163-F165');
const previousIndex = '6907fb2764c572f9c19e6bd59bcc224f47305c76';
const ids = ['F163', 'F164', 'F165'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const commands = [];
function execute(command, args)
{
    const result = spawnSync(command, args, { cwd: published, encoding: 'utf8', windowsHide: true });
    assert.ifError(result.error);
    commands.push({ command, arguments: args, actualExitCode: result.status, stdout: result.stdout, stderr: result.stderr });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
}
assert.equal(fs.existsSync(run), false);
assert.deepEqual(fs.readdirSync(destination).sort(), ['.gitattributes', 'README.md', 'verify.mjs']);
assert.equal(execute('git', ['--no-pager', 'rev-parse', 'HEAD']), previousIndex);
const campaign = read(path.join(session, 'autoperf-campaign.json'));
for (const id of ids) { assert.equal(campaign.candidates.find(item => item.id === id).status, 'pending'); }
assert.equal(hash(fs.readFileSync(path.join(capsule, 'manifest.json'))),
    '3BBC7086B1A713D0E23450FDAB57FA06FA6F7BC3FA41BBBAB846C0B2AB979442');
const verification = path.join(session, 'F163-F165-coordinator-owner-verification-012.json');
const verified = read(verification);
assert.equal(verified.actualReadOnlyNodePortableAudit.result, 'PASS');
assert.equal(verified.actualNativePassedExecutions, 58);
assert.equal(verified.actualIndependentRealSystemXmlReports.length, 5);
const facts = read(path.join(capsule, 'facts.json'));
const current = execute('git', ['-C', String.raw`C:\src\aspnetcore`, 'ls-remote', 'origin', 'refs/heads/main']).split(/\s+/)[0];
assert.match(current, /^[0-9a-f]{40}$/);
const targets = ['src/Components/Components/src/Reflection/MemberAssignment.cs',
    'src/Components/Components/src/ResourceAssetCollection.cs', 'src/Components/Endpoints/src/Assets/ImportMapDefinition.cs'];
const query = `{repository(owner:"dotnet",name:"aspnetcore"){${targets.map((file, index) =>
    `t${index}:object(expression:"${current}:${file}"){oid}`).join(' ')}}}`;
const fresh = JSON.parse(execute('gh', ['api', 'graphql', '-f', 'query=' + query])).data.repository;
const freshness = targets.map((file, index) => {
    const original = facts.roles.default.sources[path.posix.basename(file)];
    assert.ok(original, file);
    assert.equal(fresh[`t${index}`].oid, original.gitLfBlobSha1);
    return { file, currentGitBlob: fresh[`t${index}`].oid, actualNewBuildOrTest: false };
});
fs.mkdirSync(run);
const copies = [];
function copy(source, logical)
{
    const bytes = fs.readFileSync(source), file = path.join(destination, ...logical.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes, { flag: 'wx' });
    assert.equal(hash(fs.readFileSync(file)), hash(bytes));
    copies.push({ file: logical, actualSourcePath: source, bytes: bytes.length, sha256: hash(bytes) });
}
function tree(directory, logical)
{
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }))
    {
        assert.equal(entry.isSymbolicLink(), false);
        const source = path.join(directory, entry.name), relative = logical + '/' + entry.name;
        if (entry.isDirectory()) { tree(source, relative); }
        else { copy(source, relative); }
    }
}
tree(capsule, 'owner-handoff');
assert.equal(copies.length, 166);
assert.equal(copies.reduce((sum, item) => sum + item.bytes, 0), 32960208);
copy(verification, 'coordinator-whole-payload-verification.json');
copy(process.argv[1], 'executed-drivers/F163-F165-prepare-outcome-012.mjs');
copy(path.join(session, 'autoperf-publish-bounded-outcome-007.mjs'), 'executed-drivers/publisher-007.mjs');
write(path.join(destination, 'authoritative-copies.json'), copies);
const reasons = {
    F163: 'Cached per-Type writer metadata, genuine inherited-property union/list updates; material cache-miss workload and beneficial alternative unestablished.',
    F164: 'Initialization-time asset label staging and first-duplicate diagnostics established; material constructor workload and beneficial alternative unestablished.',
    F165: 'Public scoped Combine contract established, but real internal convention inputs both have null Scopes; material colliding scoped-map application workload unestablished.'
};
const budgets = ids.map(findingId => ({ findingId, maximumComparisons: 3, authorizations: [], closed: true,
    actualComparisons: 0, actualCandidateWritten: false, actualUnusedAuthorizationsPermanentlyClosed: 3,
    closedAt: new Date().toISOString(), closingReason: reasons[findingId] }));
write(path.join(run, 'diagnostic-budgets.json'), budgets);
write(path.join(destination, 'closed-budgets.json'), budgets);
const acceptance = { findings: ids, outcome: 'rejected', subtype: 'initialization-or-data-shape-material-benefit-unestablished',
    recordedAt: new Date().toISOString(), actualOwnerCapsuleFiles: 166, actualOwnerCapsuleBytes: 32960208,
    actualOwnerCapsuleManifestSha256: verified.actualManifestSha256, actualBoundedReasons: reasons,
    actualNativeDistinctMethodsPerRole: 29, actualNativePassedExecutions: 58,
    actualSupplementalCompositeChecksPerRole: 7, actualSupplementalPassedExecutions: 14,
    actualCommonSuccessfulCompilations: 1, actualAssertionRuntimes: ['12.0.0-alpha.1.26562.105', '12.0.0-alpha.1.26569.107'],
    actualVstestOwnerTestCorelibCoreclrObservationsKeptSeparateFromSupplementalConsole: true,
    actualF163MemberCollisionComparer: 'Ordinal', actualF163WriterComparer: 'OrdinalIgnoreCase',
    actualF163CachedMetadataNotPerRenderEnumeration: true,
    actualF163ExistingHotReloadCacheClearWiringSourceVisible: true, actualF163LiveMetadataDeltaExecution: false,
    actualF164StagingComparer: 'OrdinalIgnoreCase', actualF164FirstRecordedUrlAndIncomingSpellingDiagnosticObserved: true,
    actualF164DuplicateThroughManifestAndMultiResourceSortRuntimeObserved: false,
    actualF164MixedCaseFinalFrozenLookupObserved: false,
    actualF165PublicScopedCollisionProducerAndExactJsonObserved: true,
    actualF165InternalConventionProducesNonemptyCollidingScopes: false,
    actualF165ScopedBranchUniversallyUnreachableClaimed: false,
    actualF165MaterialApplicationMergeFrequencyOrScopedDatasetEstablished: false,
    actualNoAlternativeImplementationOrPerformanceComparison: true,
    actualNoCompatibleImprovementPossibleClaimed: false, actualNoBrowserAotOrLiveDeltaClaimed: true,
    actualClosingTargetOnlyFreshness: { currentMain: current, targets: freshness, actualNewBuildOrTest: false },
    actualNotMeasuredNoGainOrZeroCost: true, actualFullCompilerInputAttestation: false };
write(path.join(destination, 'coordinator-acceptance.json'), acceptance);
write(path.join(run, 'preparation-commands.json'), commands);
write(path.join(run, 'publication-config.json'), { folder: 'F163-F165', run, expectedParentIndex: previousIndex,
    performancePrAuthorized: false, subtype: acceptance.subtype, authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F163-F165] Metadata and scoped-map lookup benefit not established', issueSearch: '"F163-F165" in:title',
    evidenceCommitTitle: 'Publish bounded component metadata and import map study',
    evidenceCommitDescription: 'Preserve166selected32960208byteunchangedcapsuleplusindependentSystemXml58rows29methodsperroleandfresh9PEPDB43rawDocumentchecks2948alldeclaredscopedifferences. Seven supplemental real API contracts per role,onecommonCSharp13compile,normalOriginal62/default69withgenuineVSTestowner/test/runtimeobservationsseparateconsole. F163cachedperTypemetadataandexistingHotReloadwiring,no livedelta;F164realmanifest/constructorcontractsandfirstduplicate,notmixedcasefinalfrozenproof;F165publicscopedCombinevalidbutinternalcallerbothScopesnull,notuniversallyunreachable. No materialinitialization/scopedapplicationworkloadorbeneficialcandidateadmitted;eachclosed0of3,no measuredno-gain/zerocost/PR/browser. Preservefailures/fixedreport.',
    indexCommitTitle: 'Index three bounded component initialization opportunities',
    outcomes: ids.map(id => ({ id, status: 'rejected',
        note: reasons[id] +
            ' 166files32960208bytes,29actualdistinctnativecasesperrole58passesplus7supplementalcompositechecksperrole14passes;9PEPDB43rawdocs2948alldeclaredfilename/hashdifferences,noprefixexemptions/notcausalpair. GenuineVSTestowner/test/CoreLib/CoreCLRruntime62/69witnessesseparatefromsupplementalconsole. Onecommoncompile,initial0rowdefaultruntimeabortretained. RealboundedAPI/managedrender-treecontractsnotbrowser/AOT/livedelta;F165publicscopedbranchisvalid/notuniversallyunreachablebutinternalproductionmapsScopesnull. Ownclosed0of3,nocandidate/comparison,notmeasuredno-gain/zerocost/proofcompatiblealternativesimpossible.',
        readmeRow: `| ${id} | Not admitted: ${id === 'F163' ? 'cached per-Type collision metadata; material cache-miss optimization unestablished' : id === 'F164' ? 'asset-label initialization/first-duplicate contract; material constructor benefit unestablished' : 'valid public scoped merge, but internal convention supplies null scopes; material scoped workload unestablished'}. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [Metadata/import-map study](F163-F165/README.md), [verified publication](F163-F165/publication.json) |` })) });
console.log(JSON.stringify({ actualUnchangedCopiedFiles: copies.length, actualOwnerFiles: 166, actualOwnerBytes: 32960208,
    actualHistoricalNativePassesNotNewExecutions: 58, actualHistoricalSupplementalPasses: 14,
    actualClosedFindingBudgets: 3, actualComparisons: 0 }, null, 2));
