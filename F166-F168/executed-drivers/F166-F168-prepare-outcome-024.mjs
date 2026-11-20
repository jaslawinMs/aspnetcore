import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const published = path.join(session, 'autoperf-published-results');
const owner = path.join(session, 'autoperf-parallelism', 'finding-F166-F168-012');
const destination = path.join(published, 'F166-F168');
const run = path.join(session, 'autoperf-runs', 'F166-F168');
const previousIndex = '8cb01448cd8c768534bcab6c231bfc14c1a00850';
const ids = ['F166', 'F167', 'F168'];
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
const manifestSha256 = '19D025B5AFB024746EE3D9D29A43940CE3406F8032BFF9CADB6B8C84174AA53B';
assert.equal(hash(fs.readFileSync(path.join(owner, 'manifest.json'))), manifestSha256);
const verification = path.join(session, 'F166-F168-coordinator-audit-022.json');
const xmlFile = path.join(session, 'F166-F168-independent-system-xml-023.json');
const audit = read(verification), xml = read(xmlFile);
assert.ok(audit.envelopeAuditPassed && audit.evidenceAuditPassed);
assert.deepEqual([audit.selectedFileCount, audit.selectedBytes, audit.nativeExecutionRows,
    audit.managedPePdbPairsFreshlyParsed, audit.successfulCommonCompilationsTotal], [248, 59953667, 84, 22, 2]);
assert.deepEqual(xml.files.map(item => item.results.length).sort((a, b) => a - b), [0, 9, 9, 9, 9, 9, 9, 15, 15]);
const sourceMap = read(path.join(owner, 'payload', 'evidence', 'source-map.json'));
const targetPaths = ids.map(id => campaign.candidates.find(item => item.id === id).finding.file);
const targets = targetPaths.map(file =>
{
    const row = sourceMap.find(item => item.role === 'original' && item.path.replaceAll('\\', '/') === file);
    const current = sourceMap.find(item => item.role === 'default' && item.path.replaceAll('\\', '/') === file);
    assert.ok(row && current);
    assert.equal(row.gitBlob, current.gitBlob);
    return { file, gitBlob: row.gitBlob };
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
tree(owner, 'owner-handoff');
assert.equal(copies.length, 252);
assert.equal(copies.reduce((sum, item) => sum + item.bytes, 0), 60174576);
copy(verification, 'coordinator-portable-audit.json');
copy(xmlFile, 'coordinator-independent-system-xml.json');
copy(process.argv[1], 'executed-drivers/F166-F168-prepare-outcome-024.mjs');
copy(path.join(session, 'autoperf-publish-bounded-outcome-007.mjs'), 'executed-drivers/publisher-007.mjs');
write(path.join(destination, 'authoritative-copies.json'), copies);
const reasons = {
    F166: 'Seven fixed configuration-time MIME mapping calls, six initially absent and existing .mjs retained; real middleware/file/negotiation contracts passed, but no material repeated registration workload or request-hot lookup optimization established.',
    F167: 'Retained-key/default-holder constructor contracts with actual manager inputs and all shipping-target builds passed; real construction frequency/cardinality and normal-filesystem omission producer not established. Older TryAdd absence does not rule out compatible alternatives.',
    F168: 'Actual write-once test helper reached by real dynamic binder/public JsonPatch with reference-valued properties; material test-suite or shipping workload benefit not established, and adjacent value-type rows belong to a different helper.'
};
const budgets = ids.map(findingId => ({ findingId, maximumComparisons: 3, authorizations: [], closed: true,
    actualComparisons: 0, actualCandidateWritten: false, actualUnusedAuthorizationsPermanentlyClosed: 3,
    closedAt: new Date().toISOString(), closingReason: reasons[findingId] }));
write(path.join(run, 'diagnostic-budgets.json'), budgets);
write(path.join(destination, 'closed-budgets.json'), budgets);
const acceptance = {
    findings: ids, outcome: 'rejected', subtype: 'configuration-constructor-test-support-material-workload-unestablished',
    recordedAt: new Date().toISOString(), actualReasons: reasons,
    actualOwnerEnvelopeFiles: 252, actualOwnerEnvelopeBytes: 60174576,
    actualOwnerSelectedPayloadFiles: 248, actualOwnerSelectedPayloadBytes: 59953667,
    actualOwnerPayloadManifestSha256: manifestSha256,
    actualF166SevenConfigurationMappingsNotRequestLookup: true,
    actualF166PublicMiddlewareRealPhysicalFilesNegotiationAndResponseChecked: true,
    actualF166NativeCompilerOnlyAssetBoundary: ['BuildNodeJS=false', 'StaticWebAssetsEnabled=false'],
    actualF166BrowserBootOrServerTransportVerified: false,
    actualF167RealManagerKeyInputsAndDistinctSameIdRetentionChecked: true,
    actualF167NormalFilesystemOmissionProducerVerified: false,
    actualF167AllShippingTargetsBuilt: ['net462', 'netstandard2.0', 'net12.0'],
    actualF167NativeTestTargetsExecuted: ['net472', 'net12.0'],
    actualF167ExactNetFramework462RuntimeExecuted: false,
    actualCompatibleOneProbeAlternativesRuledOut: false,
    actualF168ActualNativeHelperBinderAndPublicJsonPatchProducerChecked: true,
    actualF168WriteOnceValueTypeProducerVerified: false,
    actualNativePassedExecutionRows: 84, actualDistinctExpandedNativeCaseNames: 33,
    actualZeroRowDefaultRuntimePrerequisiteAborts: 1,
    actualAcceptedSupplementalRowsPerRole: 6, actualAcceptedSupplementalRowsTotal: 12,
    actualNet12AssertionRuntimes: ['12.0.0-alpha.1.26562.105', '12.0.0-alpha.1.26569.107'],
    actualAcceptedV4SuccessfulCompiles: 1, actualCommonSuccessfulCompilesTotal: 2,
    actualEarlierSuccessfulV3FailedFixtureMissingFileExpectationRetained: true,
    actualFreshSelectedPePdbPairs: 22, actualFreshRetainedTargetReferences: 5,
    actualSelectedRawSourceSnapshots: 80, actualImageUnionKeys: 178, actualImageDifferences: 141,
    actualNoCandidateOrComparisonOrSourcePrForTheseFindings: true,
    actualNotMeasuredNoGainOrZeroCost: true,
    actualFullCompilerInputOrExecutionClosureAttestation: false,
    actualClosingTargetOnlyFreshness: { currentMain: current, targets, actualNewBuildOrTest: false }
};
write(path.join(destination, 'coordinator-acceptance.json'), acceptance);
write(path.join(run, 'preparation-commands.json'), commands);
write(path.join(run, 'publication-config.json'), {
    folder: 'F166-F168', run, expectedParentIndex: previousIndex, performancePrAuthorized: false,
    subtype: acceptance.subtype, authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F166-F168] Configuration and test-helper lookup workload not established',
    issueSearch: '"F166-F168" in:title',
    evidenceCommitTitle: 'Publish bounded MIME key-map and JsonPatch lookup study',
    evidenceCommitDescription: 'Preserve252file60174576byteowner-envelope/248file59953667bytepayload,fresh22PEPDBpairs/5targetrefs/80rawsources,9realTRXs84passed33distinctexpandedcasesplus0rowruntimeabort.6acceptedV4rowspernormal62/69role;2totalcommonsuccessesincludingfailedV3fixtureexpectationretained. RealpublicMIMEmiddleware/files/negotiation,actualmanagerkeyinputs/retainedholders/allshippingTFMbuilds/net472tests,realbinder/publicJsonPatchtest-helpercontracts. Compiler-onlyF166assets,nobrowserboot;noF167normalfilesystemomissionproof/noexactnet462execution;F168referencevalues,otherhelpervalue-typerowsnotcoverage. Materialworkloadunestablished,compatiblealternativesnotruledout,eachclosed0of3/notmeasurednogain.Noimageprefixexemptions,fullomittedbytes/compiler/executionclosureunattested,fixedreportpreserved.',
    indexCommitTitle: 'Index three configuration and test-helper lookup assessments',
    outcomes: ids.map(id => ({
        id, status: 'rejected',
        note: reasons[id] + ' Bounded252file60174576byteenvelope/248selected59953667bytes,fresh22PEPDB5refs80rawsources,84nativepassed/33distinctcasesplus0rowabort,6acceptedconsolechecksperrole. Original/defaultnormalnet1262/69plusactualnet472native,allshippingF167TFMscompiled;acceptedV4once/2totalsuccessfulcompilesandallfailuresretained. No fullbrowser/nativeAOT/net462runtime/normalfilesystemomission/write-oncevaluetype/materialityclaim;noomittedbytes/compiler/executionclosureattestation. Ownclosed0of3,nocandidate/comparison,notmeasurednogainorzerocost.',
        readmeRow: `| ${id} | Not admitted: ${id === 'F166' ? 'fixed configuration-time MIME mapping' : id === 'F167' ? 'retained-key constructor map' : 'write-once dynamic test helper'}; material workload benefit not established. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [Real producer study](F166-F168/README.md), [verified publication](F166-F168/publication.json) |`
    }))
});
console.log(JSON.stringify({ actualUnchangedCopiedFiles: copies.length,
    actualOwnerEnvelopeFiles: 252, actualOwnerEnvelopeBytes: 60174576,
    actualHistoricalNativePassesNotNewExecutions: 84, actualHistoricalAcceptedConsoleRowsNotNewRuns: 12,
    actualClosedFindingBudgets: 3, actualComparisons: 0 }, null, 2));
