import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const published = path.join(session, 'autoperf-published-results');
const capsule = path.join(session, 'autoperf-parallelism', 'finding-F155-F159-010', 'capsule');
const destination = path.join(published, 'F155-F159');
const run = path.join(session, 'autoperf-runs', 'F155-F159');
const previousIndex = 'd526eb061303faa0f913b343793daf4b2e4f4592';
const ids = ['F155', 'F156', 'F157', 'F158', 'F159'];
const methods = ['ReadXml_ReadsValidationProblemDetailsXml', 'ReadXml_ReadsValidationProblemDetailsXml_WithNoErrors',
    'ReadXml_ReadsValidationProblemDetailsXml_WithEmptyErrorsElement', 'WriteXml_WritesValidXml', 'WriteXml_WithNoValidationErrors'];
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
    'AA02831551402C3CC455BB6F5FB12CF26B9F975FE6B0D9007115E212F9DFEEDD');
const verification = path.join(session, 'F155-F159-coordinator-owner-verification-011.json');
const verified = read(verification);
assert.equal(verified.actualExitCode, 0);
assert.equal(verified.actualAuditorResult.result, 'PASS');
assert.equal(verified.actualAuditorResult.selectedFiles, 159);
assert.equal(verified.actualAuditorResult.selectedBytes, 86979281);
assert.equal(verified.actualXmlReports.reduce((sum, item) => sum + item.actualRows, 0), 25);
const current = execute('git', ['-C', String.raw`C:\src\aspnetcore`, 'ls-remote', 'origin', 'refs/heads/main']).split(/\s+/)[0];
assert.match(current, /^[0-9a-f]{40}$/);
const target = JSON.parse(execute('gh', ['api',
    `repos/dotnet/aspnetcore/contents/src/Mvc/Mvc.Formatters.Xml/test/ValidationProblemDetailsWrapperTest.cs?ref=${current}`]));
assert.equal(target.sha, 'e27b908379181fe06706b151c62205f9c6ec4639');
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
assert.equal(copies.length, 159);
assert.equal(copies.reduce((sum, item) => sum + item.bytes, 0), 86979281);
copy(verification, 'coordinator-whole-payload-verification.json');
copy(process.argv[1], 'executed-drivers/F155-F159-prepare-outcome-012.mjs');
copy(path.join(session, 'autoperf-publish-bounded-outcome-007.mjs'), 'executed-drivers/publisher-007.mjs');
write(path.join(destination, 'authoritative-copies.json'), copies);
const budgets = ids.map(findingId => ({ findingId, maximumComparisons: 3, authorizations: [], closed: true,
    actualComparisons: 0, actualCandidateWritten: false, actualUnusedAuthorizationsPermanentlyClosed: 3,
    closedAt: new Date().toISOString(), closingReason: 'One serializer construction for one operation per existing Fact; material suite benefit and appropriate reusable lifetime unestablished.' }));
write(path.join(run, 'diagnostic-budgets.json'), budgets);
write(path.join(destination, 'closed-budgets.json'), budgets);
const acceptance = { findings: ids, outcome: 'rejected', subtype: 'one-operation-test-serializer-reuse-benefit-unestablished',
    recordedAt: new Date().toISOString(), actualOwnerCapsuleManifestSha256: verified.actualManifestSha256,
    actualOwnerCapsuleFiles: 159, actualOwnerCapsuleBytes: 86979281, actualExistingMethods: methods,
    actualDistinctFactsPerSourceRole: 5, actualNativePassedExecutions: 25, actualRetainedInitialDefaultRuntimeAbortRows: 0,
    actualProducer: 'Actual existing Facts -> DataContractSerializer.ReadObject/WriteObject -> actual IXmlSerializable validation/base wrapper -> actual model or full XML text consumer.',
    actualSerializerConstructionsPerFactInvocation: 1, actualSerializerOperationsPerFactInvocation: 1,
    actualSerializerConstructionLoopOrSharedFixtureObserved: false,
    actualProductionInvocationFrequencyOrMaterialSuiteBenefitEstablished: false,
    actualReusableSerializerLifetimeOrIsolationEquivalenceVerified: false,
    actualConsoleLoadedIdentityPids: [42920, 42140], actualConsoleIdentitiesRelabeledAsVstestObservations: false,
    actualNormalSourceRuntimeRoles: { Original37: '12.0.0-alpha.1.26562.105', Default90: '12.0.0-alpha.1.26569.107' },
    actualRuntimeOverrideUsed: false, actualCausalPerformancePairClaimed: false,
    actualClosingTargetOnlyFreshness: { currentMain: current, targetGitBlob: target.sha, actualNewBuildOrTest: false },
    actualNoCandidateOrNewNativeExecutionOrComparisonOrPr: true,
    actualNotMeasuredNoGainOrZeroConstructionCost: true, actualFullCompilerInputAttestation: false };
write(path.join(destination, 'coordinator-acceptance.json'), acceptance);
write(path.join(run, 'preparation-commands.json'), commands);
write(path.join(run, 'publication-config.json'), { folder: 'F155-F159', run, expectedParentIndex: previousIndex,
    performancePrAuthorized: false, subtype: acceptance.subtype, authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F155-F159] Per-Fact XML serializer reuse not established', issueSearch: '"F155-F159" in:title',
    evidenceCommitTitle: 'Publish bounded one-operation XML serializer study',
    evidenceCommitDescription: 'Preserve159selected86979281byteunchangedownerfilesplusindependentcoordinatorXML/metadataaudit. FiveoriginaldistinctparameterlessFactsperrole reach actual DCS/IXmlSerializablewrapper/modelorfullXMLtextconsumer,25actualpassexecutions across6reports including0rowinitialdefaultabort. Normal source/runtime62/69,consoleloadedidentitiesnotVSTestattestation,onecommonidentitycompile;all1916declaredscopedifferences,no prefixexemptions/notcausalpair. EachlocalserializerusedonceperFact,norepresentativesuitebenefitorreuseisolation/lifetimeequivalenceestablished. Eachfindingclosed0of3,no candidate/comparison/PR,notmeasuredno-gainorzerocost. Preservefailuresandfixedreport.',
    indexCommitTitle: 'Index five unestablished test serializer reuse opportunities',
    outcomes: ids.map((id, index) => ({ id, status: 'rejected',
        note: `ExistingparameterlessFact${methods[index]} constructsoneDataContractSerializerforoneread/writeperinvocation;notproductionhotlooporsharedfixture. RealDCS/actualIXmlSerializablewrapperandmodel/fullXMLconsumer;5distinctFacts/role,25actualpassesacross6nativeXMLreportswithinitialdefault0rowruntimeabortpreserved. Original62/default69normalgraphs,nooverride;loadedconsolePIDs42920/42140notVSTestattestations. Onecommonidentityhookcompile,159selected86979281bytes,freshPEPDB/rawsources/XMLand1916allfilenamesdeclaredscopedifferences,notcausalpair/fullcompilerclosure. Materialsuitebenefitandappropriateretainedserializerlifetime/isolationnotestablished;ownclosed0of3,nocandidate/comparison,notmeasuredno-gain/zerocost.`,
        readmeRow: `| ${id} | Not admitted: ${methods[index]} uses one local serializer for one operation; material suite benefit and reusable lifetime/isolation unestablished. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [Per-Fact XML study](F155-F159/README.md), [verified publication](F155-F159/publication.json) |` })) });
console.log(JSON.stringify({ actualUnchangedCopiedFiles: copies.length,
    actualOwnerFiles: 159, actualOwnerBytes: 86979281, actualHistoricalPassingExecutionsNotNewRuns: 25,
    actualClosedFindingBudgets: ids.length, actualComparisons: 0 }, null, 2));
