import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url)), parallel = path.join(session, 'autoperf-parallelism');
const preparation = path.join(parallel, 'finding-F182-F186-022'), capsule = path.join(preparation, 'capsule');
const root = path.join(session, 'autoperf-published-results', 'F182-F186');
const run = path.join(session, 'autoperf-runs', 'F182-F186');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.deepEqual(fs.readdirSync(root).sort(), ['.gitattributes', 'README.md', 'verify.mjs']);
assert.equal(fs.existsSync(run), false);
const seal = read(path.join(preparation, 'SEALED.json'));
assert.equal(seal.actualAgentId, 'd766df6d-0b55-44d6-846d-7050b83f2eea');
assert.equal(seal.manifestSha256, '47595CC253AD1A5FBF42ED633EB77D8A8CA38AEEC0BF78729E9084908BDC8959');
assert.equal(hash(fs.readFileSync(path.join(capsule, 'MANIFEST.json'))), seal.manifestSha256);
assert.equal(seal.actualRemainingOwnedNativeRootsOrObservedChildren, 0);
const xmlFile = path.join(parallel, 'F182-F186-coordinator-system-xml-039.json');
const xml = read(xmlFile);
assert.equal(xml.actualPassedExecutions, 18);
assert.equal(xml.actualUniqueFacts, 9);
const campaign = read(path.join(session, 'autoperf-campaign.json'));
const ids = ['F182', 'F183', 'F184', 'F185', 'F186'];
for (const id of ids) { assert.equal(campaign.candidates.find(item => item.id === id).status, 'pending'); }
fs.mkdirSync(run);
const copies = [];
function copy(source, logical)
{
    const bytes = fs.readFileSync(source), target = path.join(root, ...logical.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes, { flag: 'wx' });
    const record = { file: logical, actualSourcePath: source, bytes: bytes.length, sha256: hash(bytes) };
    assert.equal(hash(fs.readFileSync(target)), record.sha256);
    copies.push(record);
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
for (const entry of fs.readdirSync(preparation, { withFileTypes: true }).filter(item => item.isFile()))
{
    copy(path.join(preparation, entry.name), 'owner-closing/' + entry.name);
}
copy(xmlFile, 'coordinator-independent-system-xml.json');
for (const file of ['F182-F186-reconcile-native-039.ps1', 'F182-F186-prepare-publication-040.mjs', 'autoperf-publish-bounded-outcome-033.mjs'])
{
    copy(path.join(session, file), 'executed-drivers/' + file);
}
write(path.join(root, 'authoritative-copies.json'), copies);
const savedAuditText = fs.readFileSync(path.join(preparation, 'audit-attempt-002.stdout.txt'), 'utf8').trim();
const audits = savedAuditText.split(/\r?\n(?=\{)/).map(text => JSON.parse(text));
assert.equal(audits.length, 2);
assert.equal(audits[1].manifestSha256, seal.manifestSha256);
write(path.join(root, 'coordinator-portable-audit.json'), audits[1]);
const target = 'src/Identity/test/InMemory.Test/InMemoryStore.cs';
const fresh = spawnSync('git', ['--no-pager', 'rev-parse', '83d976704fa0f9aa4361327d1f9d929c93bd9256:' + target],
    { cwd: String.raw`C:\src\aspnetcore`, encoding: 'utf8' });
assert.ifError(fresh.error);
assert.equal(fresh.status, 0);
assert.equal(fresh.stdout.trim(), 'e5522d97b7fe906dca749215c6f01019bd5fb55b');
const acceptance = {
    recordedAt: new Date().toISOString(), findings: ids, outcome: 'rejected',
    subtype: 'test-support-reverse-index-material-workload-unestablished',
    actualHistoricalOwnerCapsulePath: capsule, actualOwnerManifestSha256: seal.manifestSha256,
    actualTestSupportNotShippingProductionStores: true, actualNoCandidateOrBenchmark: true,
    actualNotMeasuredNoGainOrZeroCost: true, actualNewNativeManagedReflectionMvidObserved: false,
    actualNativeModuleFileSnapshotsAndFreshSelectedPeMetadataObserved: true,
    actualSupplementalManagedOwnerAndManagerMvidObserved: true,
    actualNoNewSQLiteFixtureExecutionClaimed: true,
    actualWholeDefaultBuiltAndTested: 'adf2e9d22addd1461c6c25e8a8f411be28b81100',
    actualFreshTargetOnlyDefault: '83d976704fa0f9aa4361327d1f9d929c93bd9256',
    actualFreshTargetOnlyBlob: fresh.stdout.trim(), actualWholeFreshDefaultBuiltOrTested: false,
    actualNewNativeExecutions: 18, actualUniqueNativeFacts: 9,
    actualSupplementalRows: 18, actualSupplementalAssertions: 370,
    actualNewSuccessfulCommonCompiles: 1, actualFailedCommonCompiles: 0,
    actualPublicSetNameProducerPrecedesValidationAndMutatesStoredReference: true,
    actualDuplicateNullEmptyCaseReferenceOrderingAndAssociationBoundariesObserved: true,
    actualDifferentIdRecreationOnlyAfterOldAssociationCleanup: true,
    actualSpecificOwnedTerminalRootAndStreamChecksNotUniversalHostInactivity: true,
    actualCopiedFiles: copies.length, actualCopiedBytes: copies.reduce((sum, item) => sum + item.bytes, 0),
    actualNoOmittedImageRuntimeCompilerOrOsClosureAttestation: true
};
write(path.join(root, 'coordinator-acceptance.json'), acceptance);
const methods = ['AddToRoleAsync', 'RemoveFromRoleAsync', 'IsInRoleAsync', 'GetUsersInRoleAsync', 'IRoleStore.FindByNameAsync'];
const budgets = ids.map((findingId, index) => ({ findingId, maximumComparisons: 3, authorizations: [], closed: true,
    actualComparisons: 0, actualCandidateWritten: false, actualUnusedAuthorizationsPermanentlyClosed: 3,
    closedAt: new Date().toISOString(), closingReason: methods[index] +
        ': nonshipping live-reference test store; actual manager/DI/native contracts accepted, but no material setup/cardinality/test-suite workload established for a reverse index.' }));
write(path.join(root, 'closed-budgets.json'), budgets);
for (const budget of budgets)
{
    const directory = path.join(run, budget.findingId);
    fs.mkdirSync(directory);
    write(path.join(directory, 'diagnostic-budget.json'), budget);
}
write(path.join(run, 'publication-config.json'), {
    folder: 'F182-F186', run, expectedParentIndex: 'b75225902ee089b5603ea8e6c6b0483ef5002199',
    performancePrAuthorized: false, subtype: acceptance.subtype, authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F182-F186] Test-store reverse-name indexes lack a material workload',
    issueSearch: '"AutoPerf F182-F186" in:title',
    evidenceCommitTitle: 'Preserve real Identity role-name lifecycle contracts',
    evidenceCommitDescription: 'All5same nonshippingIDkeyedteststore.9nativeFactseachOriginal37/fullDefaultadf2e9normal62/69;9supplementalrows185assertionsperrole,onecommonC13compile,no candidates/timing. RealpublicDI/managers/singletonstore2scopes,presetter-beforeUpdate mutation,duplicate/null/empty names,case-sensitiveversusignore-case/instanceEquals,reference/order/delete/orphan/sameIDrebind/differentIDonlyaftercleanup. Freshselected15PE7PDB229allrawDocs262Gitproofs;204uniquePE11PDBincludingattributedunchangedF173historynotnewcoverage.18nativeexecutions9unique independentlySystemXmlreconciled.215124551byte2175payload/2177envelopeunchangedplusallfinalizer/auditfailures.12newdotnetroots/13closingCLIroots,final123PIDcreationobservations0owned. No newSQLitefixtureclaim,wholecurrentmain/notcopiedtool/runtimeexecutionclosure unverified. Each0of3permanentlyclosed,fixedreportpreserved.',
    indexCommitTitle: 'Index five bounded test-store reverse-lookup outcomes',
    outcomes: ids.map((id, index) => ({
        id, status: 'rejected',
        note: 'Test-support reverse-index material-workload-unestablished, not measured no benefit. ' + methods[index] +
            ' in nonshippingID-keyedlive-referenceInMemoryStore;actualpublicRole/UserManager+sameSingletonstore2scopes validated. Native9Facts/role18executions,9supplementalrows185assertions/role,one common C13compile. PublicSetRoleName mutatesstoredNormalizedName BEFOREvalidation and canproduceduplicate/null/empty;SingleOrDefault duplicate semantics,==/instanceEquals/OrdinalIgnoreCase differ,reference/update/delete/orphan/sameIDrebind/order preserved;different-IDonlyaftercleanup. WholeDefaultadf2e9 built/run normal69 vsOriginal37normal62;target83dblobunchanged notwholecurrentmainexecution. No newSQLitefixture/native managed-reflection MVIDclaim; native sampledmodule/file+freshPE bindings only,supplementalactualMVID. Completeowner2177files215578869B/manifest47595C plushistory includingfirstseal/auditpass+nullablefinalizerfailures unchanged,allnative/streams terminal,123boundedPIDobservationszeroowned notuniversalhostinactivity. Ownbudget0of3permanentlyclosed,no candidate/perf/PR/window;attributedF173history notnewcounts.',
        readmeRow: '| ' + id + ' | **Rejected:** nonshipping `' + methods[index] +
            '` reverse-index redesign; live mutation/comparer/duplicate contracts accepted, material workload unestablished. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [Role-name evidence](F182-F186/README.md), [verified publication](F182-F186/publication.json) |'
    }))
});
console.log(JSON.stringify({ actualPrepared: ids, actualOwnerEnvelopeFiles: 2177,
    actualCopiedFiles: copies.length, actualCopiedBytes: acceptance.actualCopiedBytes,
    actualEachBudgetPermanentlyClosed: '0of3', actualNoTargetOrCounterExecuted: true }, null, 2));
