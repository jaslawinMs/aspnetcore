import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const published = path.join(session, 'autoperf-published-results');
const owner = path.join(session, 'autoperf-parallelism', 'finding-F173-F175-013');
const capsule = path.join(owner, 'capsule');
const destination = path.join(published, 'F173-F175');
const run = path.join(session, 'autoperf-runs', 'F173-F175');
const previousIndex = 'fd893e7cf649e890a85dd171eca206d13fcdd673';
const ids = ['F173', 'F174', 'F175'];
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
const priorPublication = read(path.join(session, 'autoperf-runs', 'F166-F168', 'verified-final-publication.json'));
assert.equal(priorPublication.actualFinalIndexCommit, previousIndex);
const campaign = read(path.join(session, 'autoperf-campaign.json'));
for (const id of ids) { assert.equal(campaign.candidates.find(item => item.id === id).status, 'pending'); }
const manifestSha256 = '7A1558B13701B99AFE1058C1D711A3CDDF67E8215FB562EA9F608E5C181C690D';
assert.equal(hash(fs.readFileSync(path.join(capsule, 'MANIFEST.json'))), manifestSha256);
const verification = path.join(session, 'F173-F175-coordinator-audit-022.json');
const xmlFile = path.join(session, 'F173-F175-independent-system-xml-023.json');
const audit = read(verification), xml = read(xmlFile);
assert.equal(audit.result, 'PASS');
assert.deepEqual([audit.manifestFiles, audit.manifestBytes, audit.freshUniquePeImages,
    audit.associatedPdbPairs, audit.rawPdbDocuments, audit.gitMerkleSourceProofs,
    audit.nativeRowExecutions, audit.commonConsumerCompilations], [1114, 125036802, 199, 7, 229, 262, 44, 1]);
assert.equal(xml.actualAllExactNamesDefinitionsEntriesExecutionsCountersReconciled, true);
assert.equal(xml.actualPassedExecutions, 44);
const records = read(path.join(capsule, 'source-records.json')).records;
const targetPaths = [...new Set(ids.map(id => campaign.candidates.find(item => item.id === id).finding.file))];
const targets = targetPaths.map(file =>
{
    const original = records.find(item => item.role === 'original' && item.source === file);
    const current = records.find(item => item.role === 'default' && item.source === file);
    assert.ok(original && current);
    assert.equal(original.blob, current.blob);
    return { file, gitBlob: original.blob };
});
const current = execute('git', ['-C', String.raw`C:\src\aspnetcore`, 'ls-remote', 'origin', 'refs/heads/main']).split(/\s+/)[0];
assert.match(current, /^[0-9a-f]{40}$/);
const fields = targets.map((target, index) => `f${index}:object(expression:"${current}:${target.file}"){oid}`).join(' ');
const fresh = JSON.parse(execute('gh', ['api', 'graphql', '-f',
    `query={repository(owner:"dotnet",name:"aspnetcore"){${fields}}}`])).data.repository;
targets.forEach((target, index) => assert.equal(fresh['f' + index].oid, target.gitBlob));
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
assert.equal(copies.length, 1116);
assert.equal(copies.reduce((sum, item) => sum + item.bytes, 0), 125264656);
copy(verification, 'coordinator-portable-audit.json');
copy(xmlFile, 'coordinator-independent-system-xml.json');
copy(process.argv[1], 'executed-drivers/F173-F175-prepare-outcome-026.mjs');
copy(path.join(session, 'autoperf-publish-bounded-outcome-007.mjs'), 'executed-drivers/publisher-007.mjs');
write(path.join(destination, 'authoritative-copies.json'), copies);
const reasons = {
    F173: 'Actual public role-manager lifecycle preserves case-sensitive ID lookup and stored/replacement identity on the singleton test store; no material test-suite or shipping workload for the repeated probe established.',
    F174: 'Actual base/inherited public-manager login lifecycle includes composed-key equality, duplicate handling, existing-key/null removal and re-add; compatible one-probe cleanup is plausible, but material test-support workload benefit unestablished.',
    F175: 'Actual base/inherited public user-manager lifecycle preserves equal-string/case/identity/missing/update/deletion behavior; no material test-suite or shipping workload for the repeated ID lookup established.'
};
const budgets = ids.map(findingId => ({ findingId, maximumComparisons: 3, authorizations: [], closed: true,
    actualComparisons: 0, actualCandidateWritten: false, actualUnusedAuthorizationsPermanentlyClosed: 3,
    closedAt: new Date().toISOString(), closingReason: reasons[findingId] }));
write(path.join(run, 'diagnostic-budgets.json'), budgets);
write(path.join(destination, 'closed-budgets.json'), budgets);
const acceptance = {
    findings: ids, outcome: 'rejected', subtype: 'test-support-id-login-probe-material-workload-unestablished',
    recordedAt: new Date().toISOString(), actualReasons: reasons,
    actualHistoricalOwnerCapsulePath: capsule,
    actualOwnerEnvelopeFiles: 1116, actualOwnerEnvelopeBytes: 125264656,
    actualManifestSelectedFiles: 1114, actualManifestSelectedBytes: 125036802, actualManifestSha256: manifestSha256,
    actualTestSupportNotShippingProductionStores: true,
    actualRealPublicManagersNativeFactoryAndSupplementalSingletonScopeReuse: true,
    actualRealNativeSqliteFixtureOpened: true,
    actualF173RoleIdEqualityCaseReferenceUpdateDeletionChecked: true,
    actualF174BaseInheritedManagerLoginLifecycleExistingKeyNullReaddChecked: true,
    actualF174ComposedKeyAliasAndBothEmptyInputsAreBoundedDiagnostics: true,
    actualF175BaseInheritedManagerUserIdLifecycleChecked: true,
    actualNativePassedExecutionRows: 44, actualUniqueNativeFacts: 11, actualNativeReports: 4,
    actualSameElevenFactsTwicePerRoleNotFortyFourUniqueTests: true,
    actualSupplementalRowsPerRole: 6, actualSupplementalAssertionsPerRole: 156, actualSupplementalAssertionsTotal: 312,
    actualNativeAndSupplementalRuntimes: ['12.0.0-alpha.1.26562.105', '12.0.0-alpha.1.26569.107'],
    actualCommonSuccessfulCompilations: 1,
    actualNativeManagedOwnerMvidObserved: false,
    actualSupplementalManagedOwnerAndManagerMvidObserved: true,
    actualNativeUnhookedReplayObservedCoreClrCoreLibAndTesthostModules: true,
    actualInitialSdkOnlyIdentityGapPreserved: true,
    actualFreshUniquePeImages: 199, actualFreshAssociatedPdbPairs: 7, actualFreshRawPdbDocuments: 229,
    actualSelectedImmutableSourceMembershipAndAbsenceProofs: 262,
    actualNoCandidateOrComparisonOrSourcePrForTheseFindings: true,
    actualNotMeasuredNoGainOrZeroCost: true,
    actualHostedBrowserNativeAotConcurrencyUnicodeBroadCardinalityExecuted: false,
    actualFullCompilerInputOrExecutionClosureAttestation: false,
    actualClosingTargetOnlyFreshness: { currentMain: current, targets, actualNewBuildOrTest: false }
};
write(path.join(destination, 'coordinator-acceptance.json'), acceptance);
write(path.join(run, 'preparation-commands.json'), commands);
write(path.join(run, 'publication-config.json'), {
    folder: 'F173-F175', run, expectedParentIndex: previousIndex, performancePrAuthorized: false,
    subtype: acceptance.subtype, authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F173-F175] In-memory test-store lookup workload not established',
    issueSearch: '"F173-F175" in:title',
    evidenceCommitTitle: 'Publish bounded Identity test-store lookup study',
    evidenceCommitDescription: 'Preserve1116file125264656byteenvelope/1114selected125036802bytes;fresh199uniquePE7associatedPDBpairs229rawDocuments262immutable-sourceproofs,independentrealSystemXml44nativeexecutions11Facts(2perrole). Realpublicmanager/DI/nativestoreSQLitefactory/singletonscope/equal-string-case-reference/update-delete/loginremoval-null-readd/composed-keydiagnostics;6supplementalrows156assertionspernormal62/69role,oneCSharp13commoncompile. SDK-onlyinitialidentitygapretained;actualunhookednativeCoreCLR/CoreLib/testhostmodulesnotnativeownerMVID,separateconsoleowner/managerMVIDs. No shippingstore/materialworkload/candidate;eachclosed0of3,notmeasurednogainorzerocost. All-fileunions,noprefixexemptions,noomitteddistribution/compiler/executionclosureclaim,fixedreportpreserved.',
    indexCommitTitle: 'Index three in-memory test-store lookup assessments',
    outcomes: ids.map(id => ({
        id, status: 'rejected',
        note: reasons[id] + ' Bounded1116file125264656byteenvelope/1114selected125036802bytes,fresh199PE7PEPDBpairs229rawdocs262sourceproofs;44nativeexecutions11uniqueFacts2perrole,6consolerows156assertionsperrole,oneCSharp13commoncompile. WholeDefault/Originalnormal69/62publicmanager/storegraphs;actualnativeCoreCLRtesthostmodulesnotmanagedownerMVID,separateconsolemanagedidentities;initialSDKidentitygapandallprerequisitefailuresretained. Hosted/UI/browser/AOT/broadnull-Unicode-concurrency/cardinalityunverified,noomittedbyte/compiler/executionclosureclaim. Ownclosed0of3,nocandidate/comparison,notmeasurednogainorzerocost.',
        readmeRow: `| ${id} | Not admitted: ${id === 'F173' ? 'role-ID' : id === 'F174' ? 'composed-login' : 'user-ID'} lookup in a test-support store; real manager lifecycle preserved, material workload benefit not established. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [Real test-store study](F173-F175/README.md), [verified publication](F173-F175/publication.json) |`
    }))
});
console.log(JSON.stringify({ actualUnchangedCopiedFiles: copies.length,
    actualOwnerEnvelopeFiles: 1116, actualOwnerEnvelopeBytes: 125264656,
    actualHistoricalNativePassesNotNewExecutions: 44, actualHistoricalAcceptedConsoleRowsNotNewRuns: 12,
    actualHistoricalAcceptedConsoleAssertions: 312, actualClosedFindingBudgets: 3, actualComparisons: 0 }, null, 2));
