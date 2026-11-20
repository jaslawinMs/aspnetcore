import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const input = path.join(session, 'autoperf-parallelism', 'finding-F137-008');
const run = path.join(session, 'autoperf-runs', 'F137');
const target = path.join(session, 'autoperf-published-results', 'F137');
const normalize = name => name.replaceAll('\\', '/');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(fs.existsSync(run), false);
assert.deepEqual(fs.readdirSync(target).sort(), ['README.md', 'audit-native-xml.ps1', 'verify.mjs']);
const manifestFile = path.join(input, 'seal-finalization-002', 'frozen-files.json');
const manifestHash = '62E19CAD97C1C282FD30310462E402D07CAFC95F1298091E7DCE97FD043ECED1';
assert.equal(hash(manifestFile), manifestHash);
const original = read(manifestFile);
assert.equal(original.files.length, 3998);
assert.equal(original.payloadBytes, 364216896);
const verified = read(path.join(session, 'F137-coordinator-owner-verification-009.json'));
assert.equal(verified.manifestSha256.toUpperCase(), manifestHash);
assert.equal(verified.independentEveryByteVerificationPassed, true);
assert.equal(verified.frozenPayloadFiles, 3998);
assert.equal(verified.payloadBytes, original.payloadBytes);
fs.mkdirSync(run);
fs.writeFileSync(path.join(target, '.gitattributes'), '* -text\n', { flag: 'wx' });
const copies = [], omitted = [];
function copy(source, relative)
{
    const destination = path.join(target, relative), info = { file: normalize(relative),
        bytes: fs.statSync(source).size, sha256: hash(source), actualSourcePath: source };
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    assert.equal(hash(destination), info.sha256);
    copies.push(info);
}
for (const item of original.files)
{
    const relative = normalize(item.path);
    if (relative.startsWith('images/'))
    {
        omitted.push({ file: relative, bytes: item.length, sha256: item.sha256.toUpperCase() });
        continue;
    }
    const source = path.join(input, item.path);
    assert.equal(fs.statSync(source).size, item.length);
    assert.equal(hash(source), item.sha256.toUpperCase());
    copy(source, 'owner-handoff/' + relative);
}
assert.equal(omitted.length, 3592);
assert.equal(copies.length, 406);
for (const name of ['frozen-files.json', 'frozen-files.sha256', 'verification.json'])
{
    copy(path.join(input, 'seal-finalization-002', name), 'owner-handoff/seal-finalization-002/' + name);
}
copy(path.join(session, 'F137-coordinator-owner-verification-009.json'), 'coordinator-whole-payload-verification.json');
for (const name of ['F137-prepare-outcome-009.mjs', 'autoperf-publish-bounded-outcome-007.mjs'])
{
    copy(path.join(session, name), 'executed-drivers/' + name);
}
const live = execFileSync('gh', ['api', 'repos/dotnet/aspnetcore/commits/main', '--jq', '.sha'], { encoding: 'utf8', windowsHide: true }).trim();
assert.match(live, /^[a-f0-9]{40}$/);
const codePath = 'src/Mvc/Mvc.Razor.RuntimeCompilation/src/RuntimeViewCompiler.cs', identities = [];
for (const revision of [...new Set(['37e809ead5824bc753a1c3d56f11615bdb1296c5', '00560e2dd1954a2acf2bc54b35422b0f32484bf1', live])])
{
    const blob = execFileSync('gh', ['api', `repos/dotnet/aspnetcore/contents/${codePath}?ref=${revision}`, '--jq', '.sha'],
        { encoding: 'utf8', windowsHide: true }).trim();
    identities.push({ revision, path: codePath, actualGitBlob: blob });
}
assert.equal(new Set(identities.map(item => item.actualGitBlob)).size, 1, 'Reconsider cold-path scope if current source changed.');
write(path.join(target, 'coordinator-acceptance.json'), { recordedAt: new Date().toISOString(), finalDisposition: 'rejected',
    subtype: 'cold-initialization-modernization-unestablished', actualOriginalPayloadFilesRehashed: 3998,
    actualOriginalPayloadBytesRehashed: original.payloadBytes, actualOriginalManifestSha256: manifestHash,
    actualCopiedOriginalMetadataFilesIncludingEnvelopes: 409, actualIndividuallyHashedOmittedImageFiles: omitted.length,
    actualProducerCasesAcceptedPerRole: 18, actualValidChecksPerRole: 101, actualExistingXmlRowsPerRole: 10,
    actualKnownWrongProbePreserved: 'EmptyCompilePath_NormalizerRejects', actualWrongProbeCountedAsPass: false,
    actualPassingSupplementalEdge: 'EmptyCompilePath_RealProjectFileSystemRejectsEmptyPath',
    actualCausalPerformancePairAdmitted: false, actualNonOwnerPairDifferences: 367,
    actualRuntimeMismatchPreserved: true, actualNewCandidateOrComparison: false, actualMeasuredNoGainClaimed: false,
    boundedTargetGitIdentities: identities, actualLaterObservedMain: live,
    targetFreshnessBoundary: 'Target identity only, not a complete later framework rebuild.',
    rationale: 'Repeated dictionary probes are real but occur in precompiled-view insertion during retained runtime-compiler initialization, not per rendering operation. TryAdd is an existing API modernization with no established material startup/resource workload or measured benefit. No semantic change or performance proposal admitted.',
    limits: 'Not a disproven mechanism, zero-cost or no-gain result. Selected loaded PE/PDB/raw-source associations are historical receipts, not complete compiler attestation; no Razor-SDK-generated fixtures, dynamic recompilation or HTTP/browser validation.' });
const budget = { findingId: 'F137', maximumAuthorizations: 3, authorizations: [], closed: true,
    closedAt: new Date().toISOString(), closureReason: 'Cold-initialization API modernization without an established material startup/resource workload. Repeated probes are real; no candidate or comparison admitted, no measured no-gain claim.' };
write(path.join(run, 'diagnostic-budget.json'), budget);
write(path.join(target, 'closed-budget.json'), budget);
write(path.join(target, 'omitted-image-hashes.json'), { files: omitted,
    boundary: 'All3592 actual image files were included in the independent3998-file coordinator byte verification. Public selection retains exact individual hashes and all metadata/raw tests, not image binaries or fresh portable PE/PDB re-parsing.' });
write(path.join(target, 'authoritative-copies.json'), copies);
write(path.join(run, 'publication-config.json'), { folder: 'F137', run,
    expectedParentIndex: '47668ec14f395a06dd8ef6554d62dffd5e1dd392', performancePrAuthorized: false,
    subtype: 'cold-initialization-modernization-unestablished', authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F137] Retain informational precompiled-view initialization probes',
    issueSearch: 'F137 in:title', evidenceCommitTitle: 'Publish bounded precompiled-view initialization study',
    evidenceCommitDescription: 'Independent3998-file/364216896-byte verification,20exactnativeXMLtheoryrows,18acceptedproducercases/101validchecks perrole throughregisteredassemblymetadata/feature/provider/compiler/realrendering. Preservewrongempty-pathprobe and separatelypassingedge,sourceownerreceipts,65terminalnativecommands/444observations,HOLD/RELEASE,failedfirstseal and correctedadditiveseal. All3592imagehashes retained;28commonfiles identical,367nonownerdifferences plus62/68mismatch rejectcausalpair. Real repeatedprobes are coldinitialization;no materialworkload/benefit established,no measurednogain/candidate/timing. Fixedreport unchanged.',
    indexCommitTitle: 'Index informational cold-initialization modernization outcome',
    outcomes: [{ id: 'F137', status: 'rejected',
        note: 'Cold-initialization modernization not admitted for performance: actual ContainsKey/Add doubleprobe is real but occurs while retained runtimecompiler initializes precompiledviews,not perrender. ExistingTryAdd API couldexpresskeepfirst but materialstartup/resourceworkload or gain not established;not zero-cost/no-gain ordisprovedmechanism.3998frozenpayloadfiles/364216896bytes independentlyrehashed;20exactnativeXMLtheoryrows pass and18acceptedrealproducer cases/101validchecks perrole inclassemblymetadata/registeredfeature/provider/compiler/actualRazorViewrendering,precedence/case/slash/culture/rejections. KnownwrongEmptyCompilePath_NormalizerRejects keptfailed,additivesharededge5checks passes;17+1accepted,not18originalpasses.4loadedownerPEPDBsources/pin historicalreceipts;3592imagehashes/28commonfiles,367nonownerdifferences plusOriginal62/Default68 correctlyrejectcausaltiming. Failedfirstseal preserved;corrected62e19...seal accepted. No fullcompiler/SDKRazorfixture/dynamiccompile/HTTPbrowserclaim. Zero candidate/comparison,closed0of3budget.',
        readmeRow: '| F137 | Informational cold-initialization modernization, not admitted: real dictionary double probe, but no material startup/resource workload or gain established; not measured no-gain.20 exact native XML rows and18 real accepted producer cases/pin; wrong probe preserved,367 non-owner differences/runtime mismatch reject causal timing;0 comparisons/no PR. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [Precompiled-view initialization evidence](F137/README.md), [verified publication](F137/publication.json) |' }] });
console.log(JSON.stringify({ actualWholePayloadVerified: verified.frozenPayloadFiles, actualWholePayloadBytes: verified.payloadBytes,
    actualMetadataOriginalsCopied: 409, actualAuthoritativeCopiesIncludingReceiptAndDrivers: copies.length,
    actualIndividuallyHashedOmittedImageFiles: omitted.length, actualRepeatedProbeNotDisproved: true,
    actualNoCandidateOrTiming: true, actualBoundedTargetIdentities: identities }, null, 2));
