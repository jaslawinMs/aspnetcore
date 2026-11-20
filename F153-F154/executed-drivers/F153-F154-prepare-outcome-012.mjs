import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const published = path.join(session, 'autoperf-published-results');
const capsule = path.join(session, 'autoperf-parallelism', 'finding-F153-F154-010', 'payload');
const destination = path.join(published, 'F153-F154');
const run = path.join(session, 'autoperf-runs', 'F153-F154');
const previousIndex = 'd6fab1a61024b55f4d5cdcbd087dd4bbc3549e53';
const ids = ['F153', 'F154'];
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
assert.equal(hash(fs.readFileSync(path.join(capsule, 'MANIFEST.json'))),
    '99236168F4F2B34D4604E5B081DE0438FD089FAC9E9E75532D4781780F66EE47');
const verification = path.join(session, 'F153-F154-coordinator-owner-verification-011.json');
const metadataVerification = path.join(session, 'F153-F154-coordinator-selected-metadata-011.json');
const verified = read(verification), metadata = read(metadataVerification);
assert.equal(verified.actualExitCode, 0);
assert.equal(metadata.actualExitCode, 0);
assert.equal(verified.actualDistinctNativeTests, 12);
assert.equal(verified.actualProducerDistinctScenarios, 10);
assert.equal(verified.actualSelectedFiles, 242);
assert.equal(verified.actualSelectedBytes, 21604385);
assert.equal(verified.actualDefaultAssertionsReached, false);
const current = execute('git', ['-C', String.raw`C:\src\aspnetcore`, 'ls-remote', 'origin', 'refs/heads/main']).split(/\s+/)[0];
assert.match(current, /^[0-9a-f]{40}$/);
const target = JSON.parse(execute('gh', ['api',
    `repos/dotnet/aspnetcore/contents/src/Hosting/TestHost/src/AsyncStreamWrapper.cs?ref=${current}`]));
assert.equal(target.sha, '7754c45d1c7e43e6df35b38c3c44cbe3cc8e11b3');
const runtime69 = String.raw`C:\src\ap-F155-d010\.dotnet\shared\Microsoft.NETCore.App\12.0.0-alpha.1.26569.107\System.Private.CoreLib.dll`;
assert.equal(hash(fs.readFileSync(runtime69)), '09DC73D8B850905F8250C160732CEDEB532349827E59267BF04B0F59B0D55AF8');
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
assert.equal(copies.length, 242);
assert.equal(copies.reduce((sum, item) => sum + item.bytes, 0), 21604385);
copy(verification, 'coordinator-whole-payload-verification.json');
copy(metadataVerification, 'coordinator-independent-selected-metadata.json');
copy(path.join(published, 'F155-F159', 'owner-handoff', 'evidence.mjs'), 'metadata-reader.mjs');
copy(process.argv[1], 'executed-drivers/F153-F154-prepare-outcome-012.mjs');
copy(path.join(session, 'autoperf-publish-bounded-outcome-007.mjs'), 'executed-drivers/publisher-007.mjs');
write(path.join(destination, 'authoritative-copies.json'), copies);
const budgets = ids.map(findingId => ({ findingId, maximumComparisons: 3, authorizations: [], closed: true,
    actualComparisons: 0, actualCandidateWritten: false, actualUnusedAuthorizationsPermanentlyClosed: 3,
    closedAt: new Date().toISOString(), closingReason: findingId === 'F153'
        ? 'Real inherited byte-read fallback and sync gate characterized; material byte-read workload and beneficial contract-preserving candidate not established.'
        : 'Real wrapper is server request-only over a read-only PipeReaderStream; no successful byte-write workload established; sync-gate rejection order must remain.' }));
write(path.join(run, 'diagnostic-budgets.json'), budgets);
write(path.join(destination, 'closed-budgets.json'), budgets);
const acceptance = { findings: ids, outcome: 'rejected', subtype: 'testhost-byte-override-benefit-and-full-default-contract-unestablished',
    recordedAt: new Date().toISOString(), actualOwnerCapsuleManifestSha256: verified.actualManifestSha256,
    actualOwnerCapsuleFiles: 242, actualOwnerCapsuleBytes: 21604385, actualOriginalDistinctProducerScenarios: 10,
    actualOriginalNativeDistinctFacts: 12, actualOriginalNativePassingExecutions: 24,
    actualOriginalRuntime: '12.0.0-alpha.1.26562.105',
    actualProducer: 'TestServer.CreateClient/HttpClient/real ClientHandler/HttpContextBuilder -> AsyncStreamWrapper around PipeReader.AsStream -> server Request.Body.',
    actualCallerMemoryStreamDirectSendControlNotWrapperProducer: true,
    actualLoadedStreamFallbackIlContainsNewByteArrayLengthOneThenVirtualBulkOperation: true,
    actualHeapAllocationAmountOrJitElisionMeasured: false,
    actualSynchronousGatePrecedesInnerValidationOrUnsupportedWrite: true,
    actualRequestInnerReadableNotWritable: true, actualSuccessfulRequestByteWriteWorkload: false,
    actualResponseWriterAndClientResponseReadStreamAreDifferentTypes: true,
    actualMaterialByteReadFrequencyOrBeneficialCandidateEstablished: false,
    actualFullDefaultOwnerAssertionsReached: false, actualDefaultUnexecutedProducerScenarios: 10,
    actualHistoricalDefaultBlockers: ['HostFactoryResolver.Sources69 missing during restore after GenerateFiles succeeded', 'Exact runtime69 native host prerequisite failed before any assertion'],
    actualHistoricalRuntime69BlockerIsNotPermanent: true,
    actualPrivateRuntime69NowPresent: { actualPath: runtime69, actualCoreLibSha256: hash(fs.readFileSync(runtime69)),
        actualBuiltDefaultTestHostOrExecutionClaimed: false,
        actualIndependentCompletedDefaultRuntimeEvidence: 'https://github.com/jaslawinMs/aspnetcore/blob/4275d9e5586f0cf60997e7b9cc89ab1fdc77624a/F155-F159/owner-handoff/HANDOFF.md' },
    actualClosingTargetOnlyFreshness: { currentMain: current, targetGitBlob: target.sha, actualNewBuildOrTest: false },
    actualOldOwnerAuditUsesRegexXmlAndSavedDocumentAssociations: true,
    actualNewPortableVerifierFreshlyParsesAllThreeSelectedPePdbAndTenRawDocumentsAndStructuralXml: true,
    actualNoCandidateOrNewNativeExecutionOrComparisonOrPr: true,
    actualNotMeasuredNoGainOrZeroCost: true, actualFullCompilerInputAttestation: false };
write(path.join(destination, 'coordinator-acceptance.json'), acceptance);
write(path.join(run, 'preparation-commands.json'), commands);
write(path.join(run, 'publication-config.json'), { folder: 'F153-F154', run, expectedParentIndex: previousIndex,
    performancePrAuthorized: false, subtype: acceptance.subtype, authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F153-F154] TestHost byte overrides not admitted', issueSearch: '"F153-F154" in:title',
    evidenceCommitTitle: 'Publish bounded TestHost request byte-contract study',
    evidenceCommitDescription: 'Preserve242selected21604385byteOriginalproducerpayloadandindependentSystemXml/PythonPEPDBaudits. NewportableNodeparserfresh3PEPDB10rawDocumentchecksand24XMLrows/12Facts;oldregex/savedDocumentassociationauditretainedhonestly. ActualCreateClient/HttpClient/builder/requestPipeReaderStream andliveAllowSynchronousIOgate,10scenariosconfirmedtwice,realruntime62newarrbyte1fallbackILnotheapmeasurement. Readmaterialityunestablished;writeinnerread-only,notresponsewriter. FullDefault10scenarios/nativefilterunexecutedafterhistoricalpackage/runtimefailures;exact69nowprivatelyavailable,notpermanentblocker. Bothclosed0of3,no candidate/comparison/PR,notmeasuredno-gain. Preservefixedreport.',
    indexCommitTitle: 'Index two unestablished TestHost byte override opportunities',
    outcomes: ids.map(id => ({ id, status: 'rejected',
        note: (id === 'F153'
            ? 'RealTestServer.CreateClient/HttpClientrequestwrapperbyte/bulk/BinaryReaderproducerandlivesyncgateestablishedonOriginal62;actualloadedStream.ReadByteILnewarrbyte1thenvirtualRead,notmeasuredheapcost/JITelision. Finitepacketsnotmaterialinvocationfrequency;beneficialcontract-preservingbyte-readcandidateunestablished.'
            : 'RealAsyncStreamWrapperisserverRequest.Bodyoverread-onlyPipeReaderStream,notresponsewriter. SyncdisabledWriteBytefailsInvalidOperationfirst;enabledreachesNotSupported. Nosuccessfulrequestbyte-writeworkload;directinnerdelegationwithoutgatewouldnotpreserveobservedrejectionorder. Actualruntime62fallbackILnewarrbyte1notmeasuredbenefit.') +
            ' 10Originalproducerscenariosconfirmedtwice,12distinctnativeFacts24actualpasses,242files21604385bytes. Newportablefresh3PEPDB10rawdocs/structuralXMLpluspriorrealSystemXml/Pythonaudits. FullDefault10scenarios/nativefilterunexecutedafterhistoricalHostFactoryResolver69/runtime69failures;exact69nowavailableprivately,notpermanentavailabilityclaim. Ownclosed0of3,nocandidate/comparison,notmeasuredno-gain/zerocost/fullDefaultproof.',
        readmeRow: `| ${id} | Not admitted: ${id === 'F153' ? 'real request byte-read fallback/sync gate, but material workload and useful override unestablished' : 'request wrapper writes are unsupported after the sync gate; no successful byte-write workload established'}. Original-only execution; default limits explicit. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [Request-byte contract study](F153-F154/README.md), [verified publication](F153-F154/publication.json) |` })) });
console.log(JSON.stringify({ actualUnchangedCopiedFiles: copies.length, actualOwnerFiles: 242, actualOwnerBytes: 21604385,
    actualDefaultAssertionsReached: false, actualRuntime69NowPrivatelyAvailable: true,
    actualClosedFindingBudgets: 2, actualComparisons: 0 }, null, 2));
