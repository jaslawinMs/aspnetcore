import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const input = path.join(session, 'autoperf-parallelism', 'finding-F138-009', 'handoff');
const run = path.join(session, 'autoperf-runs', 'F138');
const target = path.join(session, 'autoperf-published-results', 'F138');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const physical = (base, logical) => path.join(base, ...logical.replaceAll('\\', '/').split('/'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(fs.existsSync(run), false);
assert.deepEqual(fs.readdirSync(target).sort(), ['.gitattributes', 'README.md', 'verify.mjs']);
assert.equal(hash(path.join(input, 'MANIFEST.json')), 'D0273C0482DF6B7F1C78917C678EAA5A4BF9BDDEA2EFE72D12844112355DCD19');
const priorAuditPath = path.join(session, 'F138-coordinator-owner-verification-010.json');
const priorAudit = read(priorAuditPath);
assert.equal(priorAudit.actualAuditorResult.pass, true);
assert.equal(priorAudit.selectedActualFileCount, 243);
assert.equal(priorAudit.selectedActualBytes, 11730526);
assert.deepEqual(priorAudit.actualAuditorResult.ownerMetadataAssociations.map(item => item.selectedRawSourcesMatched.length), [6, 6]);
const codePath = 'src/OpenApi/src/Extensions/ApiDescriptionExtensions.cs';
const live = execFileSync('gh', ['api', 'repos/dotnet/aspnetcore/commits/main', '--jq', '.sha'],
    { encoding: 'utf8', windowsHide: true }).trim();
assert.match(live, /^[a-f0-9]{40}$/);
const identities = [];
for (const revision of [...new Set(['37e809ead5824bc753a1c3d56f11615bdb1296c5', '00560e2dd1954a2acf2bc54b35422b0f32484bf1', live])])
{
    const blob = execFileSync('gh', ['api', `repos/dotnet/aspnetcore/contents/${codePath}?ref=${revision}`, '--jq', '.sha'],
        { encoding: 'utf8', windowsHide: true }).trim();
    assert.equal(blob, '6758d349fbaf281f093656ad7d6560c4ba9ce46f', 'Reconsider the bounded verdict if the live target changed.');
    identities.push({ revision, path: codePath, actualGitBlob: blob });
}
fs.mkdirSync(run);
const manifest = read(path.join(input, 'MANIFEST.json'));
assert.equal(manifest.files.length, 241);
const copies = [];
let total = 0;
for (const item of [...manifest.files, ...['MANIFEST.json', 'MANIFEST.sha256'].map(file => ({
    path: file, bytes: fs.statSync(path.join(input, file)).size, sha256: hash(path.join(input, file))
}))])
{
    const source = physical(input, item.path), logical = 'owner-handoff/' + item.path.replaceAll('\\', '/');
    const destination = physical(target, logical);
    assert.equal(fs.statSync(source).size, item.bytes);
    assert.equal(hash(source), item.sha256.toUpperCase());
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    assert.equal(hash(destination), item.sha256.toUpperCase());
    copies.push({ file: logical, bytes: item.bytes, sha256: item.sha256.toUpperCase(), actualSourcePath: source });
    total += item.bytes;
}
assert.equal(total, 11730526);
assert.equal(copies.length, 243);
fs.copyFileSync(priorAuditPath, path.join(target, 'coordinator-owner-audit.json'), fs.constants.COPYFILE_EXCL);
copies.push({ file: 'coordinator-owner-audit.json', bytes: fs.statSync(priorAuditPath).size,
    sha256: hash(priorAuditPath), actualSourcePath: priorAuditPath });
const python = priorAudit.exactExecutable;
assert.equal(hash(python), priorAudit.executableSha256);
const environment = { ...process.env, PYTHONDONTWRITEBYTECODE: '1' };
delete environment.PYTHONOPTIMIZE;
const audit = spawnSync(python, ['-B', 'audit_capsule.py', '.'], {
    cwd: path.join(target, 'owner-handoff'), env: environment, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024
});
assert.ifError(audit.error);
assert.equal(audit.status, 0, audit.stderr + '\n' + audit.stdout);
const audited = JSON.parse(audit.stdout.trim());
assert.equal(audited.pass, true);
write(path.join(target, 'coordinator-acceptance.json'), {
    recordedAt: new Date().toISOString(), actualSelectedCapsuleFilesIndependentlyRehashed: 243,
    actualSelectedCapsuleBytes: total, actualSelectedCapsuleManifestSha256: hash(path.join(input, 'MANIFEST.json')),
    actualSelectedCapsuleNotEdited: true,
    actualCopiedCapsuleDeepAudit: { actualExecutable: python, actualExecutableSha256: hash(python),
        actualArguments: ['-B', 'audit_capsule.py', '.'], actualCwd: path.join(target, 'owner-handoff'),
        actualPid: audit.pid, actualExitCode: audit.status, actualTerminal: true,
        actualStdout: audit.stdout, actualStderr: audit.stderr, actualResult: audited },
    actualExistingNativeRowsPerRole: 107, actualExistingPassedPerRole: 105, actualPreexistingSkippedPerRole: 2,
    actualUnverifiedSkippedNames: ['OpenApiDocumentServiceTests.GetOpenApiRequestBody_HandlesFormWithMultipleMixedTypes_MvcAction',
        'OpenApiDocumentServiceTests.GetOpenApiRequestBody_HandlesStreamAndPipeReader_MvcAction'],
    actualCommonAssertionsPerRole: 29, actualGenuineProducerAssertionsPerRole: 28, actualIsolatedMultiplicityControlPerRole: 1,
    actualCommonProducerRuntimeBothRoles: '12.0.0-alpha.1.26568.110',
    actualExistingTestRuntimes: { Original37: '12.0.0-alpha.1.26562.105', observed00560: '12.0.0-alpha.1.26568.110' },
    actualCharacterizationConfiguration: 'Debug', actualNoReleaseCandidateOrComparisonBuilt: true,
    actualFreshOpenApiPePdbRawDocumentChecksPerRole: 6, actualFreshCommonRawDocuments: 4,
    actualPhysicalAndGitSourceRows: 66, actualInventoriedExecutableImageEntries: 626,
    actualEqualImageEntries: 330, actualDifferentImageEntries: 296, actualNonTargetOwnerImageDifferences: 295,
    actualImagePrefixExemptions: [], actualCausalPerformancePairAdmitted: false,
    actualCompleteExistingTestLoadedImageCensusClaimed: false, actualCompleteAllFileClosureClaimed: false,
    actualExternalOmittedTreesFreshlyRehashed: false, fullCompilerInputAttestation: false,
    actualCommonConsumerSuccessfulCompilations: 1,
    commonIdentityBoundary: 'Actual canonical DLL SHA/MVID observed in both processes; PDB/deps/runtimeconfig hashes collected after both runs, not separately before the first.',
    boundedTargetGitIdentities: identities, actualLaterObservedMain: live,
    targetFreshnessBoundary: 'Target file identity only. Existing separately characterized graphs remain Original37 and observed00560; no complete later framework rebuild.',
    finalDisposition: 'rejected', subtype: 'uniqueness-preserving-metadata-benefit-unestablished',
    actualNoCandidateAppliedOrComparisonAuthorized: true, actualNoMeasuredNoGainOrZeroCostClaim: true,
    rationale: 'Real Count()==1/Single uniqueness query over usually short document metadata lists, not an Any check or perbusinessrequest path. Actual lists0–3, realRDF rejects twoBody beforehelper;isolated2Bodyguard only downstreamsemantics. Onepassalternative unadopted; no representative materialdocument generation benefit established, not disproved or measuredno-gain.',
    boundary: 'Selected copied OpenAPI/common PE/PDB/raw documents and all214actual nativeXMLrows independently parsed. Broader omitted owner/source/compiler inputs, two named skipped scenarios, buildtime/nativeAOT/domainbody/concurrentextension-provider paths remain unverified.'
});
const budget = { findingId: 'F138', maximumAuthorizations: 3, authorizations: [], closed: true,
    closedAt: new Date().toISOString(),
    closureReason: 'No material uniqueness-preserving optimization established for observed short OpenAPI document metadata. Any and SingleOrDefault are not equivalent, no candidate/comparison admitted. Not measured no-gain, zero-cost or a false-positive repeated-query claim.' };
write(path.join(run, 'diagnostic-budget.json'), budget);
write(path.join(target, 'closed-budget.json'), budget);
for (const file of ['F138-prepare-outcome-010.mjs', 'autoperf-publish-bounded-outcome-007.mjs'])
{
    const source = path.join(session, file), logical = 'executed-drivers/' + file;
    const destination = physical(target, logical);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    copies.push({ file: logical, bytes: fs.statSync(source).size, sha256: hash(source), actualSourcePath: source });
}
write(path.join(target, 'authoritative-copies.json'), copies);
write(path.join(run, 'publication-config.json'), {
    folder: 'F138', run, expectedParentIndex: '6346d8e8da5b97e2fb73e46a48fd1304ffaf3f83',
    performancePrAuthorized: false, subtype: 'uniqueness-preserving-metadata-benefit-unestablished',
    authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F138] No material uniqueness-preserving OpenAPI query benefit established',
    issueSearch: 'F138 in:title',
    evidenceCommitTitle: 'Publish bounded OpenAPI body uniqueness study',
    evidenceCommitDescription: 'Preserve243-file11730526-byte untimedDebugcapsule. RealApiExplorer/RDF/controllers/TestServer MapOpenApi yields28producer/output/cache/rejection+1isolatedmultiplicitycontrol perpin;105existingpassed2named#55349skipsperpin. Originalexistingruntime62/default68,commonHTTPboth68distinguished. Onecommoncompile,6freshOpenApi rawdocchecksperpin+4commonrawdocs,66GitLF/rawsources. All626executableimageentries330same296different295nonowner,noexemptions;notallfileclosure oractualbaselineexistingtestloadedimagecensus. ActualCount==1uniquenessnotAny;RDFrejectsmultipleBodybeforehelper. No representative materialdocumentworkload benefit/candidate/comparison,notno-gain/zerocost. Retainfailures3CS0436warnings,omitted/fullcompilerlimits,fixedreport.',
    indexCommitTitle: 'Index unestablished OpenAPI body query modernization',
    outcomes: [{
        id: 'F138', status: 'rejected',
        note: 'No material uniqueness-preserving OpenAPI document metadata benefit established. Count()==1thenSingle repeatedselectionreal;Anyadmitsmultiple,SingleOrDefaultthrowsnotfalse/null. RealRDF/ApiExplorer/MVC/TestServerMapOpenApi helper/output/cache/rejection28rows+1isolatedpublicmetadata2Bodyguardperpin;real2Bodyendpointrejectedbeforehelper. ObservedList0–3,nobusinessrequesthotpath/frequency/materialsavingsmeasured.105nativepassed2preexisting#55349skipsperpin(namesinREADME),107actualTRXrowsallparsed;skippedmixedform/streampipereaderscenariosnotverifiedbyothercases. UntimedDebugonly,noReleasecandidate;Originalnative62/default68,bothcommonHTTP68notconflated. Commonconsumeronce3CS0436warnings,canonicalDLLSHA/MVIDobservedboth,other3hashespostruns.243selectedfiles11730526bytesindependentlyaudited/copied;6freshOpenApiPEPDBrawdocsperpin+4common,66GitLF/rawsourceidentities.626DLL/EXEentries330same296different295nonowner,noexemptions,notallfileclosure/fullbaselineexistingtestloadedcensus;no causalpair/fullcompilerattestation. Closed0of3,no candidate/measurement;notmeasuredno-gain/zerocost/falsepositivemechanism.',
        readmeRow: '| F138 | Not admitted: real uniqueness query in short OpenAPI document metadata; Any/SingleOrDefault are not equivalent and material one-pass benefit is unmeasured.105 native passes+2 named pre-existing skips and28 producer+1 isolated control per pin;0 comparisons/no PR. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [Body-selection study](F138/README.md), [verified publication](F138/publication.json) |'
    }]
});
console.log(JSON.stringify({ actualCopiedSelectedFiles: 243, actualSelectedBytes: total,
    actualAuthoritativeCopies: copies.length, actualCopiedDeepAuditPassed: audited.pass,
    actualZeroComparisonBudgetPermanentlyClosed: true, actualTargetIdentities: identities }, null, 2));
