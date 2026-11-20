import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const input = path.join(session, 'autoperf-parallelism', 'finding-F139-010', 'capsule');
const root = path.join(session, 'autoperf-published-results', 'F139');
const run = path.join(session, 'autoperf-runs', 'F139');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const local = (base, logical) => path.join(base, ...logical.replaceAll('\\', '/').split('/'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(fs.existsSync(run), false);
assert.deepEqual(fs.readdirSync(root).sort(), ['.gitattributes', 'README.md', 'verify.mjs']);
assert.equal(hash(path.join(input, 'MANIFEST.json')), '3E6124B7CB8F62B4C45C54DAF862C5B7E5B8CE7154B58388DC3F897C5C2666A3');
const auditPath = path.join(session, 'F139-coordinator-owner-verification-010.json');
const independent = read(auditPath);
assert.equal(independent.actualAuditorResult.audit, 'PASS');
assert.equal(independent.actualParsedXmlRows.length, 52);
assert.equal(independent.actualCiCleanlinessAccepted, false);
const current = execFileSync('gh', ['api', 'repos/dotnet/aspnetcore/commits/main', '--jq', '.sha'],
    { encoding: 'utf8', windowsHide: true }).trim();
assert.match(current, /^[a-f0-9]{40}$/);
const code = 'src/Mvc/Mvc.Razor.RuntimeCompilation/src/RuntimeViewCompiler.cs';
const identities = [];
for (const revision of [...new Set(['37e809ead5824bc753a1c3d56f11615bdb1296c5', '00560e2dd1954a2acf2bc54b35422b0f32484bf1', current])])
{
    const blob = execFileSync('gh', ['api', `repos/dotnet/aspnetcore/contents/${code}?ref=${revision}`, '--jq', '.sha'],
        { encoding: 'utf8', windowsHide: true }).trim();
    assert.equal(blob, 'b291f04441057c57092eb6e4731956b1be2d8bd6');
    identities.push({ revision, path: code, actualGitBlob: blob });
}
fs.mkdirSync(run);
const manifest = read(path.join(input, 'MANIFEST.json'));
assert.equal(manifest.files.length, 245);
const copies = [];
let bytes = 0;
for (const item of [...manifest.files, ...['MANIFEST.json', 'MANIFEST.sha256'].map(file => ({
    path: file, bytes: fs.statSync(path.join(input, file)).size, sha256: hash(path.join(input, file))
}))])
{
    const source = local(input, item.path), logical = 'owner-handoff/' + item.path.replaceAll('\\', '/');
    const destination = local(root, logical);
    assert.equal(fs.statSync(source).size, item.bytes);
    assert.equal(hash(source), item.sha256.toUpperCase());
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    assert.equal(hash(destination), item.sha256.toUpperCase());
    copies.push({ file: logical, bytes: item.bytes, sha256: item.sha256.toUpperCase(), actualSourcePath: source });
    bytes += item.bytes;
}
assert.equal(copies.length, 247);
assert.equal(bytes, 40207210);
fs.copyFileSync(auditPath, path.join(root, 'coordinator-owner-audit.json'), fs.constants.COPYFILE_EXCL);
copies.push({ file: 'coordinator-owner-audit.json', bytes: fs.statSync(auditPath).size,
    sha256: hash(auditPath), actualSourcePath: auditPath });
const child = spawnSync(process.execPath, [path.join(root, 'owner-handoff', 'audit.mjs')], {
    cwd: path.join(root, 'owner-handoff'), encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024
});
assert.ifError(child.error);
assert.equal(child.status, 0, child.stderr + '\n' + child.stdout);
const audited = JSON.parse(child.stdout.trim());
assert.equal(audited.audit, 'PASS');
const images = read(path.join(input, 'image-inventories.json'));
const first = new Map(images.find(item => item.role === 'original').files.map(item => [item.path, item.sha256]));
const second = new Map(images.find(item => item.role === 'default').files.map(item => [item.path, item.sha256]));
const entries = [...new Set([...first.keys(), ...second.keys()])].sort().map(file => ({
    path: file, originalSha256: first.get(file) ?? null, defaultSha256: second.get(file) ?? null,
    status: first.get(file) === second.get(file) ? 'same' : 'different'
}));
const target = ['Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.dll', 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.pdb'];
const comparison = { prefixExclusions: [], entries,
    counts: { same: entries.filter(item => item.status === 'same').length, different: entries.filter(item => item.status === 'different').length },
    nonTargetOwnerDifferences: entries.filter(item => item.status !== 'same' && !target.includes(item.path)),
    causalPerformancePairAdmitted: false, completeRuntimePackageRunnerOrAllFileClosureClaimed: false };
assert.deepEqual(comparison.counts, { same: 5, different: 54 });
assert.equal(comparison.nonTargetOwnerDifferences.length, 52);
write(path.join(root, 'coordinator-image-comparison.json'), comparison);
write(path.join(root, 'coordinator-acceptance.json'), {
    recordedAt: new Date().toISOString(), finalDisposition: 'rejected',
    subtype: 'runtime-compilation-material-benefit-and-loader-equivalence-unestablished',
    actualUnchangedSelectedFiles: 247, actualUnchangedSelectedBytes: bytes,
    actualCopiedAudit: { executable: process.execPath, executableSha256: hash(process.execPath),
        arguments: [path.join(root, 'owner-handoff', 'audit.mjs')], actualPid: child.pid, actualExitCode: child.status,
        actualTerminal: true, actualStdout: child.stdout, actualStderr: child.stderr, actualResult: audited },
    actualNativeTestsPerRole: 26, actualCommonConsumerAssertionsPerRole: 26, actualRealXmlRowsIndependentlyParsed: 52,
    actualFreshSelectedOwnerPePdbAssociations: 8, actualFreshSelectedRawDocumentsPerRole: 11,
    actualCommonProgramDocumentFreshlyParsed: true, actualRawAndGitSourceRecords: 40,
    actualCommonConsumerSuccessfullyCompiledOnce: true, actualCommonClosureReusedUnchanged: true,
    actualArtifactOnlyAspDepr003PragmaNecessityUnestablished: true, actualCiCleanlinessAccepted: false,
    actualPreservedCommonBuildWarnings: 11, actualContextMetadataLanguage: '8.0',
    actualNewArtifactCompilerLanguage: '13.0', actualCSharp13RazorRuntimeLanguageCompatibilityClaimed: false,
    actualOriginalRuntime: '12.0.0-alpha.1.26562.105', actualDefaultRuntime: '12.0.0-alpha.1.26568.110',
    actualRollForward: 'Disable', actualCompleteCopiedImageEntriesCompared: 59, actualDifferentImageEntries: 54,
    actualNonTargetOwnerImageDifferences: 52, actualImagePrefixExemptions: [],
    actualComparisonAuthorized: false, actualCandidateApplied: false, actualFullCompilerInputAttestation: false,
    actualWholeRuntimePackageRunnerOrAllFileClosureClaimed: false, actualExternalOmittedTreesFreshlyRehashed: false,
    actualBoundedTargetFreshness: identities, actualLaterObservedMain: current,
    actualLaterFullGraphRebuilt: false, actualRecordedNativeCommandsTerminal: 53,
    rationale: 'Real growable PE/optionalPDB streams and final copies observed through actual compile/render/diagnostics. Repeated cache identities established, but no representative expensive-edit cost, exact emitted stream length/capacity/trailing bytes, replacement loader context/dependency equivalence or material gain established. Existing Assembly.Load byte-array/context behavior must be preserved; no alternative attempted. Not measured no-gain, zero-copy/impossibility or universally cold execution proof.',
    exclusions: 'Unproven artifact pragma necessity, C#13 generated-Razor compatibility, full compiler inputs and omitted all-file/runtime/runner closure; replacement loader matrix, byte payload/capacity, change invalidation/unloading/long-run retention, hostedHTTP/browser/HotReload remain unverified.'
});
const budget = { findingId: 'F139', maximumAuthorizations: 3, authorizations: [], closed: true,
    closedAt: new Date().toISOString(), closureReason: 'No material byte/capacity/loader-equivalent optimization admitted. Existing stream copies are real and unmeasured. Explicit preparation warning/language/image limits; no candidate or comparison, not measured no-gain or zero cost.' };
write(path.join(run, 'diagnostic-budget.json'), budget);
write(path.join(root, 'closed-budget.json'), budget);
for (const file of ['F139-prepare-outcome-011.mjs', 'autoperf-publish-bounded-outcome-007.mjs'])
{
    const source = path.join(session, file), logical = 'executed-drivers/' + file;
    fs.mkdirSync(path.dirname(local(root, logical)), { recursive: true });
    fs.copyFileSync(source, local(root, logical), fs.constants.COPYFILE_EXCL);
    copies.push({ file: logical, bytes: fs.statSync(source).size, sha256: hash(source), actualSourcePath: source });
}
write(path.join(root, 'authoritative-copies.json'), copies);
write(path.join(run, 'publication-config.json'), {
    folder: 'F139', run, expectedParentIndex: '187837e6b7414d06cc4a34e0b6f329689751ba78',
    performancePrAuthorized: false, subtype: 'runtime-compilation-material-benefit-and-loader-equivalence-unestablished',
    authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F139] Razor emit buffer/loader optimization not established',
    issueSearch: 'F139 in:title',
    evidenceCommitTitle: 'Publish bounded real Razor compilation buffer study',
    evidenceCommitDescription: 'Preserve247selectedfiles40207210bytes. RealphysicalRazor/file/provider/Roslyn.Emit/unchangedAssembly.Load/emittedview/RenderAsync gives26materialassertionsperrole and26actualexistingnativepasses,52XMLrows parsed byrealSystem.Xml andIDs/counters. OneCSharp13commonclosurewithsupportedCSharp8Razorcontextsettings,11retainedwarnings;artifactASPDEPR003pragmanecessitynotdemonstrated,notCIclean. Selected8PEPDBproofs11rawdocsperrole+commonProgram,40GitLF/rawsources. All59copiedimageentries5same54different52nonowner,noexemptions;runtime62vs68notcausal/allfileclosure. Original37/defaultentry00560,closingc97unbuiltandlaterfreshnessfileonly. Realstreamgrowth/copiesnotmaterialbenefitorloaderequivalenceproof;closed0of3,no candidate/comparison,notno-gain/zerocost. Preserveinitialfailedlanguage/CRLF/dependencyattempts,fixedreport.',
    indexCommitTitle: 'Index unestablished Razor emit buffer optimization',
    outcomes: [{
        id: 'F139', status: 'rejected',
        note: 'ActualRazorcompile/file/provider/Roslyn.Emit/Assembly.Load/render producer established,notF137precompiledlookup.26commonmaterialchecks+26nativepassesperpin,52actualXMLrowsrealparser/definition/execution/counters. PortablePDBThrow.cshtmlline1vsnone,exactCS0103/RZ1006,repeatcompile/failurecacheidentity. GrowablePE/PDBstreams+ToArrayreal;no representative expensiveedit benefit/exactpayloadlengthcapacitytrailingbytes/replacementloadcontextdependencyequivalence established. OnecommonCSharp13compilewithCSharp8generatedRazorcontextmetadata;unsupported13attemptsandCRLFfailuresretained,4fixtureLFcorrectiononly. ArtifactASPDEPR003pragmanecessityunproven/notacceptedCIclean;11warningspreserved.247selected40207210bytes,8selectedPEPDBproofs11rawdocsperrole+commonProgram,40GitLF/rawsources. All59imageentries5same54diff52nonowner,noexemptions,notwholefile/runtime/package/runner/fullcompilerclosure. Original62/default68notcausal;defaultentry00560built,closingc97unbuilt,freshertarget-onlycheckexplicit. Closed0of3,nocandidate/comparison,notmeasuredno-gain/zerocost/impossibility.',
        readmeRow: '| F139 | Not admitted: real Razor emit/copies, but material benefit and loader-equivalent replacement unestablished;26 native+26 material checks per pin, explicit pragma/language/closure limits,0 comparisons/no PR. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [Real compiler study](F139/README.md), [verified publication](F139/publication.json) |'
    }]
});
console.log(JSON.stringify({ actualCopiedSelectedFiles: 247, actualCopiedSelectedBytes: bytes,
    actualCopiedDeepAuditPassed: true, actualNativeRowsRealXmlParsed: 52, actualCiCleanlinessAccepted: false,
    actualZeroComparisonBudgetPermanentlyClosed: true, actualTargetFreshness: identities }, null, 2));
