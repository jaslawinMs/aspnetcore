import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const input = path.join(session, 'autoperf-parallelism', 'finding-F146-executable-007');
const run = path.join(session, 'autoperf-runs', 'F146');
const target = path.join(session, 'autoperf-published-results', 'F146');
const normalize = name => name.replaceAll('\\', '/');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(fs.existsSync(run), false);
assert.deepEqual(fs.readdirSync(target).sort(), ['README.md', 'audit-native-xml.ps1', 'verify.mjs']);
const manifestHash = 'CA30BDD5CFF1E771C3CD48E0015BB183FE1721A60D116EEF7B7361C3E9CC4001';
assert.equal(hash(path.join(input, 'MANIFEST.json')), manifestHash);
const original = read(path.join(input, 'MANIFEST.json'));
assert.equal(original.files.length, 632);
const verification = read(path.join(session, 'F146-coordinator-owner-verification-009-fixed-envelope.json'));
assert.equal(verification.actualExitCode, 0);
assert.equal(verification.actualAudit.manifestSha256.toUpperCase(), manifestHash);
assert.equal(verification.actualAudit.payloadFileCount, 632);
assert.equal(verification.actualAudit.original006PayloadFilesUnchanged, 100);
assert.equal(verification.actualAudit.allHashesMatch, true);
fs.mkdirSync(run);
fs.writeFileSync(path.join(target, '.gitattributes'), '* -text\n', { flag: 'wx' });
const copies = [], omitted = [], raw = [];
function copy(source, relative)
{
    const destination = path.join(target, relative), info = { file: normalize(relative),
        bytes: fs.statSync(source).size, sha256: hash(source), actualSourcePath: source };
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    assert.equal(hash(destination), info.sha256);
    copies.push(info);
    return info;
}
for (const item of original.files)
{
    const relative = normalize(item.path);
    if (relative.startsWith('verified-images/') || relative.startsWith('cli-home/') || relative.endsWith('.source.tar'))
    {
        omitted.push({ file: relative, bytes: item.length, sha256: item.sha256.toUpperCase() });
        continue;
    }
    const source = path.join(input, item.path);
    assert.equal(fs.statSync(source).size, item.length);
    assert.equal(hash(source), item.sha256.toUpperCase());
    copy(source, 'owner-handoff/' + relative);
}
assert.equal(omitted.length, 452);
assert.equal(copies.length, 180);
for (const name of ['MANIFEST.json', 'MANIFEST.sha256']) { copy(path.join(input, name), 'owner-handoff/' + name); }
copy(path.join(session, 'F146-coordinator-owner-verification-009-fixed-envelope.json'), 'coordinator-whole-payload-verification.json');
copy(path.join(session, 'F146-coordinator-owner-verification-009.json'), 'coordinator-receipt-original-invalid-envelope.txt');
const olderManifest = path.join(session, 'autoperf-parallelism', 'finding-F146-006', 'MANIFEST.json');
assert.equal(hash(olderManifest), '24FE014F3A9DC99456169639E6F7C3CF3D8DC58301DBD2293AA238128460B0E2');
copy(olderManifest, 'older-preparation-manifest.json');
for (const record of read(path.join(input, 'PDB-SOURCE-OWNER-CHECKS.json')))
{
    let index = 0;
    for (const check of [...record.managedProducerSourceDocumentChecks, ...record.extractedBodyAndTestDocumentChecks])
    {
        assert.equal(check.match, true);
        assert.equal(check.sha256, check.pdbDocument.checksum);
        assert.equal(hash(check.source), check.sha256);
        const selected = copy(check.source, `raw-compiled-source/${record.role}/${index++}-${path.win32.basename(check.source)}`);
        raw.push({ role: record.role, file: selected.file, actualHistoricalSourcePath: check.source,
            sha256: selected.sha256, pdbDocumentSha256: check.pdbDocument.checksum,
            pdbHashAlgorithm: check.pdbDocument.hashAlgorithm,
            actualRawBytesMatchHistoricalCompiledDocumentChecksum: true,
            actualCompleteCompilerInputAttestation: false, actualFullCompiledSampleOwner: record.fullCompiledSampleOwner });
    }
}
assert.equal(raw.length, 12);
for (const name of ['F146-prepare-outcome-009.mjs', 'autoperf-publish-bounded-outcome-007.mjs'])
{
    copy(path.join(session, name), 'executed-drivers/' + name);
}
const live = execFileSync('gh', ['api', 'repos/dotnet/aspnetcore/commits/main', '--jq', '.sha'], { encoding: 'utf8', windowsHide: true }).trim();
assert.match(live, /^[a-f0-9]{40}$/);
const codePath = 'src/Servers/Kestrel/samples/WebTransportInteractiveSampleApp/Program.cs', identities = [];
for (const revision of [...new Set(['37e809ead5824bc753a1c3d56f11615bdb1296c5', 'ae89581dfd24c6277b4267a9779d05f7b9f047f1', live])])
{
    const blob = execFileSync('gh', ['api', `repos/dotnet/aspnetcore/contents/${codePath}?ref=${revision}`, '--jq', '.sha'],
        { encoding: 'utf8', windowsHide: true }).trim();
    identities.push({ revision, path: codePath, actualGitBlob: blob });
}
assert.equal(new Set(identities.map(item => item.actualGitBlob)).size, 1, 'Reconsider sample scope if current source changed.');
write(path.join(target, 'coordinator-acceptance.json'), { recordedAt: new Date().toISOString(), finalDisposition: 'rejected',
    subtype: 'sample-workload-pooling-benefit-unestablished', actualOriginalPayloadFilesRehashed: 632,
    actualOriginalManifestSha256: manifestHash, actualOlderPayloadFilesRehashedAndUnchanged: 100,
    actualCopiedOriginalMetadataFilesIncludingEnvelopes: 182, actualIndividuallyHashedOmittedFiles: 452,
    actualFreshRawCompiledSourceFilesMatchedToHistoricalPdbChecksums: raw.length,
    actualNativeXmlRowsPassed: 6, actualRuntimeVersionAssertedInsideTests: '12.0.0-alpha.1.26557.102',
    actualRealManagedHttp3Producer: true, actualFullCompiledSampleOwner: false,
    actualInvalidOriginalCoordinatorReceiptRetained: true, actualReceiptEnvelopeCorrectionReranAuditOrMeasurements: false,
    actualDefaultDiagnosticAnalyzersDisabledAfterRecordedFailure: true, actualWholeRepositoryMaterializationIdentityPassed: false,
    actualImagesPerRole: 224, actualNonSampleOwnerDifferences: 61, actualCommonHarnessCompiledOnce: false,
    actualCausalPerformancePairAdmitted: false, actualNewCandidateOrComparison: false, actualMeasuredNoGainClaimed: false,
    boundedTargetGitIdentities: identities, actualLaterObservedMain: live,
    targetFreshnessBoundary: 'Target file identity only; full characterized graphs remain Original37/observedDefaultae, not a later complete default rebuild.',
    rationale: 'Real managed stream production and receipt reach the exact extracted handler, whose4KB source allocation is once per accepted handler and reused across reads. This sample-only study establishes neither material real-client stream churn nor useful pooling/lifetime equivalence, and does not execute the compiled sample owner. No pooling proposal admitted; not measured no-gain or proof pooling cannot help.',
    limits: 'No nativeQUIC/TLS/browser/full sample, cancellation/EOF/error/pool-return semantics or fullCI claim. Raw selected source checksum associations are not complete compiler attestation or fresh portable PE/PDB parsing.' });
const budget = { findingId: 'F146', maximumAuthorizations: 3, authorizations: [], closed: true,
    closedAt: new Date().toISOString(), closureReason: 'Sample-only per-handler4KB scratch reuse; material real-client churn and useful pooling/lifetime equivalence not established. No candidate/comparison admitted; no measured no-gain claim.' };
write(path.join(run, 'diagnostic-budget.json'), budget);
write(path.join(target, 'closed-budget.json'), budget);
write(path.join(target, 'raw-compiled-source-associations.json'), raw);
write(path.join(target, 'omitted-file-hashes.json'), { files: omitted,
    boundary: 'Independently verified632-file payload retained by exact manifest. Public selection omits448 executed image binaries,2 source archives and2 machine-local CLI-home cache files, with every individual hash retained. Graphs remain excluded; no full-tree identity claim.' });
write(path.join(target, 'authoritative-copies.json'), copies);
const f137 = read(path.join(session, 'autoperf-runs', 'F137', 'verified-final-publication.json'));
assert.equal(f137.actualFinalIndexCommit, '7f0e8f9330ab58912bd8b7ac0980a22e6b160529');
write(path.join(run, 'publication-config.json'), { folder: 'F146', run, expectedParentIndex: f137.actualFinalIndexCommit,
    performancePrAuthorized: false, subtype: 'sample-workload-pooling-benefit-unestablished', authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F146] No useful pooling established for the WebTransport sample buffer',
    issueSearch: 'F146 in:title', evidenceCommitTitle: 'Publish bounded WebTransport sample buffer study',
    evidenceCommitDescription: 'Independent632-payload and unchanged100-file priorseal verification;6actualXMLrows on57 through real managedHTTP3settings/CONNECT/streamparsing/session/accept/pipe receipt into exact extractedhandler.12currentrawsourcefiles match historicalcompiledPDBchecksums;samplecompiledowner/nativeQUIC/TLS/browser not exercised. Source4KB allocationonceperacceptedhandler,notpermessage;materialchurn/poolingbenefit/lifetime equivalence unestablished.224imagefiles/pin,61nonSampleownerdifferences and independentlycompiledharness prohibit causalpair. Preserveallprerequisite/analyzer-profile/fulltreelimits,omitbinaries/sourcearchives/CLIcachewith452individualhashes. Zero candidate/comparison,nomeasurednogain/fixedreportchange.',
    indexCommitTitle: 'Index unestablished sample-stream pooling proposal',
    outcomes: [{ id: 'F146', status: 'rejected',
        note: 'Sample-workload poolingbenefit unestablished: real4KB scratch allocation isonceperacceptedunidirectionalhandler,outsideand reusedthroughreadloop,notpermessage.6exactnativeXMLrows(3perOriginal37/observedDefaultae) onexplicit57 pass throughactualmanagedHTTP3frames/pendingstream/parser/session/AcceptStreamAsync/pipe intoextractedhandler;two-writes/9000characrossreads/independentstreamIDs. Source-extractedmethod compiledintoInMemory.FunctionalTests,notWebTransportInteractiveSampleAppowner;nativeQUIC/TLS/browser/fullstartup/pool lifetime/cancellation/EOF/errorbenefit unverified.632payloadfiles and old100seal independentlyverified;12freshrawcompiledsources matchhistoricalPDBchecksums,notfullcompilerattestation.224files/pin/61nonSampleownerdiffs plusindependentlycompiledharness prohibitcausalpair. DefaultdiagnosticanalyzersdisabledafterretainedAD0001;wholegrapharchiveauditincomplete/Unicodeoutofscopemismatch retained,no fullCI/materializationclaim.2sourcearchives/448binaries/2CLIcacheomittedwithindividualhashes. Targetblob2fa999unchangedthroughlaterdefault;no laterfullgraphrebuild. No materialrealclientchurn or usefulpoolingestablished,notnogain/proofpoolingbad. Zero candidate/comparison,closed0of3budget.',
        readmeRow: '| F146 | Sample/workload-specific pooling not admitted:4KB source buffer is once per accepted handler and reused across reads; material churn/benefit unestablished, not measured no-gain.6 real managed HTTP3 XML rows; extracted handler, not compiled sample/nativeQUIC/browser;12 raw source/PDB checksum checks,61 non-owner differences reject causal timing;0 comparisons/no PR. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [WebTransport sample-buffer evidence](F146/README.md), [verified publication](F146/publication.json) |' }] });
console.log(JSON.stringify({ actualOriginalPayloadFilesVerified: 632, actualCopiedOriginalMetadataFilesIncludingEnvelopes: 182,
    actualAuthoritativeCopiesIncludingRawSourcesAndDrivers: copies.length, actualIndividuallyHashedOmittedFiles: omitted.length,
    actualRawCompiledSourceChecks: raw.length, actualNativeProducerXmlRows: 6, actualCompiledSampleOwnerExercised: false,
    actualNoCandidateOrTiming: true, actualBoundedTargetIdentities: identities }, null, 2));
