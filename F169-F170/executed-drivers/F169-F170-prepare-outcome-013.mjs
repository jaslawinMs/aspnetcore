import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const published = path.join(session, 'autoperf-published-results');
const owner = path.join(session, 'autoperf-parallelism', 'finding-F169-F170-012');
const capsule = path.join(owner, 'capsule');
const destination = path.join(published, 'F169-F170');
const run = path.join(session, 'autoperf-runs', 'F169-F170');
const previousIndex = '14caa64d5b78ef48127a6bc46ca0d90b11059ae1';
const ids = ['F169', 'F170'];
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
    '15E091621FAF40F0CAF7AFE91D2BFE5B9D10C9BD9D451366FB49273C9AF53E3F');
const verification = path.join(session, 'F169-F170-coordinator-owner-verification-013.json');
const xmlFile = path.join(session, 'F169-F170-independent-system-xml-013.json');
const verified = read(verification), xml = read(xmlFile), audit = verified.actualReadOnlyNodePortableAudit;
assert.equal(audit.auditPassed, true);
assert.deepEqual([audit.selectedFiles, audit.selectedBytes, audit.nativeSuccessfulExecutions,
    audit.supplementalSuccessfulExecutions, audit.freshlyParsedPEs, audit.freshlyParsedPDBs, audit.rawDocumentAssociations],
    [173, 66904424, 8, 24, 26, 11, 26]);
assert.deepEqual(xml.runs.map(item => item.count), [0, 4, 4]);
const current = execute('git', ['-C', String.raw`C:\src\aspnetcore`, 'ls-remote', 'origin', 'refs/heads/main']).split(/\s+/)[0];
assert.match(current, /^[0-9a-f]{40}$/);
const target = { file: 'src/Http/Http.Abstractions/test/UseWhenExtensionsTests.cs', gitBlob: 'b39f603e1bb068551cc57d62ff5f657682408ebf' };
const query = `{repository(owner:"dotnet",name:"aspnetcore"){target:object(expression:"${current}:${target.file}"){oid}}}`;
const fresh = JSON.parse(execute('gh', ['api', 'graphql', '-f', 'query=' + query])).data.repository;
assert.equal(fresh.target.oid, target.gitBlob);
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
assert.equal(copies.length, 173);
assert.equal(copies.reduce((sum, item) => sum + item.bytes, 0), 66904424);
copy(path.join(owner, 'seal.json'), 'owner-selection-seal.json');
copy(verification, 'coordinator-whole-payload-verification.json');
copy(xmlFile, 'coordinator-independent-system-xml.json');
copy(process.argv[1], 'executed-drivers/F169-F170-prepare-outcome-013.mjs');
copy(path.join(session, 'autoperf-publish-bounded-outcome-007.mjs'), 'executed-drivers/publisher-007.mjs');
write(path.join(destination, 'authoritative-copies.json'), copies);
const reasons = {
    F169: 'Private test middleware helper: the three native pipeline Facts use new contexts and increment each reached key once; the extra present-key read is not reached there. Seeded/repeated diagnostic states are real pipeline characterizations, not an established material suite workload.',
    F170: 'Private post-execution assertion reader: the three native pipeline Facts contain eight source-derived Count calls total. A one-probe cleanup is plausible, but a material suite or production workload benefit was not established.'
};
const budgets = ids.map(findingId => ({ findingId, maximumComparisons: 3, authorizations: [], closed: true,
    actualComparisons: 0, actualCandidateWritten: false, actualUnusedAuthorizationsPermanentlyClosed: 3,
    closedAt: new Date().toISOString(), closingReason: reasons[findingId] }));
write(path.join(run, 'diagnostic-budgets.json'), budgets);
write(path.join(destination, 'closed-budgets.json'), budgets);
const acceptance = {
    findings: ids, outcome: 'rejected', subtype: 'test-helper-lookup-simplification-material-suite-benefit-unestablished',
    recordedAt: new Date().toISOString(), actualReasons: reasons,
    actualOwnerCapsuleFiles: 173, actualOwnerCapsuleBytes: 66904424,
    actualOwnerCapsuleManifestSha256: audit.manifestSha256,
    actualSourceHelpersArePrivateTestCodeNotShippedMiddleware: true,
    actualF169NativeExistingKeyIncrementBranchReached: false,
    actualF169DiagnosticSeededAndRepeatedStatesUseRealPublicPipeline: true,
    actualF169PresentKeyBranchUniversallyUnreachableClaimed: false,
    actualF170SourceDerivedNativeCountCallsNotPerformanceCounter: 8,
    actualItemsDefaultProducerAndComparerObserved: true,
    actualCustomItemsDictionaryOrConcurrentMutationExecuted: false,
    actualNullKeyChecksAreInvalidInputDiagnosticNotHttpProducerProof: true,
    actualNativeOriginalFacts: 4, actualNativeDefault69Facts: 4, actualNativePassedExecutions: 8,
    actualSupplementalChecksPerRole: 12, actualSupplementalPassedExecutions: 24,
    actualSupplementalAndSdkRunnerRuntime: '12.0.0-alpha.1.26557.102',
    actualNativeAssertionRuntimes: ['12.0.0-alpha.1.26562.105', '12.0.0-alpha.1.26569.107'],
    actualNativeAndSupplementalProcessesAreDistinct: true,
    actualInitialDefaultRuntimeAbortRows: 0, actualSuccessfulCommonCompiles: 1,
    actualFreshParsedPeImages: 26, actualFreshParsedPdbImages: 11,
    actualFreshSelectedRawPdbDocumentAssociations: 26,
    actualDeclaredImageUnionRows: 1313, actualDeclaredImageDifferences: 831,
    actualNativeAncillaryIisAssetExclusion: 'UseIisNativeAssets=false after actual ANCM build gate; no native IIS boundary exercised',
    actualNoCandidateOrNewNativeExecutionOrComparisonOrPr: true,
    actualNotMeasuredNoGainOrZeroCost: true,
    actualFullCompilerInputOrRunnableWholeImageAttestation: false,
    actualClosingTargetOnlyFreshness: { currentMain: current, target, actualNewBuildOrTest: false }
};
write(path.join(destination, 'coordinator-acceptance.json'), acceptance);
write(path.join(run, 'preparation-commands.json'), commands);
write(path.join(run, 'publication-config.json'), {
    folder: 'F169-F170', run, expectedParentIndex: previousIndex, performancePrAuthorized: false,
    subtype: acceptance.subtype, authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F169-F170] UseWhen test-helper lookup benefit not established', issueSearch: '"F169-F170" in:title',
    evidenceCommitTitle: 'Publish bounded UseWhen test-helper lookup study',
    evidenceCommitDescription: 'Preserve173selected66904424bytes;fresh26PE11PDB26rawDocumentchecks,independentrealSystemXml8nativeFacts/24supplementalchecks. NativeOriginal62/default69distinctfromsupplemental/SDK57;onecommonCSharp13compileandallfailedprops/ANCM/assets/default0rowruntimeattemptsretained. RealApplicationBuilder/UseWhen/Itemsdictionarycontracts,seededint/null/wrongtype/repeat/case/terminationandinvalidnullkeyboundaries. F169currentnativeFactsneverpresentkeyincrement,F170eightstaticCountcallsnotperformancecounter. Plausibleoneprobeprivate-testcleanup,nomaterialworkload/candidate;eachclosed0of3,notmeasurednogain/zerocost. Fullunion1313/differences831,noprefixexemptions,norunnableclosureclaim,fixedreportpreserved.',
    indexCommitTitle: 'Index two conditional-pipeline test-helper assessments',
    outcomes: ids.map(id => ({
        id, status: 'rejected',
        note: reasons[id] + ' 173files66904424bytes,fresh26PE11PDB26rawdocs;8nativepasses(4Factsperrole)normal62/69and24supplementalchecks(12perrole)separateconsole57,oneCSharp13compile. ActualpublicApplicationBuilder/UseWhen/Itemsproducer;nativeexisting-keyincrementnotreached,seeded/repeatedstatesdiagnosticonly;F170eightstaticCountcallsnotperformancecounter. Declared1313union/831differences,noomittedbyte/runnableclosureclaim. Missingprops/ANCM/assetsanddefault0rowruntime69abortretained. Ownclosed0of3,nocandidate/comparison,notmeasuredno-gainorzerocost.',
        readmeRow: `| ${id} | Not admitted: private test-helper one-probe cleanup; ${id === 'F169' ? 'existing native tests never take the present-key increment branch' : 'eight source-derived assertion-reader calls, no material suite benefit established'}. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [Real conditional-pipeline study](F169-F170/README.md), [verified publication](F169-F170/publication.json) |`
    }))
});
console.log(JSON.stringify({ actualUnchangedCopiedFiles: copies.length, actualOwnerFiles: 173,
    actualOwnerBytes: 66904424, actualHistoricalNativePassesNotNewExecutions: 8,
    actualHistoricalSupplementalChecksNotNewExecutions: 24, actualClosedFindingBudgets: 2,
    actualComparisons: 0 }, null, 2));
