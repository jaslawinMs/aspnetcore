import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const owner = path.join(session, 'autoperf-parallelism', 'finding-F136-009');
const input = path.join(owner, 'capsule');
const run = path.join(session, 'autoperf-runs', 'F136');
const target = path.join(session, 'autoperf-published-results', 'F136');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const physical = (base, logical) => path.join(base, ...logical.replaceAll('\\', '/').split('/'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(fs.existsSync(run), false);
assert.deepEqual(fs.readdirSync(target).sort(), ['.gitattributes', 'README.md', 'verify.mjs']);
assert.equal(hash(path.join(input, 'manifest.json')), 'E614D6939FBAF342933B3F624AE5B08C9563DF061A5C2ADE994A756CF80B19B2');
assert.equal(hash(path.join(input, 'CHECKSUMS.sha256')), '8E45B240288F01B49E3D9685C27EAA59497D0C8191DCC431E9B0FA514F69D208');
const priorAudit = read(path.join(session, 'F136-coordinator-owner-verification-010.json'));
assert.equal(priorAudit.actualAuditorResult.status, 'passed');
assert.equal(priorAudit.selectedActualFileCount, 235);
assert.equal(priorAudit.selectedActualBytes, 20121654);
const codePath = 'src/Components/Endpoints/test/Builder/TestFileProvider/TestFileProvider.cs';
const live = execFileSync('gh', ['api', 'repos/dotnet/aspnetcore/commits/main', '--jq', '.sha'],
    { encoding: 'utf8', windowsHide: true }).trim();
assert.match(live, /^[a-f0-9]{40}$/);
const identities = [];
for (const revision of [...new Set(['37e809ead5824bc753a1c3d56f11615bdb1296c5', '00560e2dd1954a2acf2bc54b35422b0f32484bf1', live])])
{
    const blob = execFileSync('gh', ['api', `repos/dotnet/aspnetcore/contents/${codePath}?ref=${revision}`, '--jq', '.sha'],
        { encoding: 'utf8', windowsHide: true }).trim();
    assert.equal(blob, '6d161a062f4825d3c77fbfdae790cbe210fc888e', 'Reconsider the bounded verdict if the live target changed.');
    identities.push({ revision, path: codePath, actualGitBlob: blob });
}
fs.mkdirSync(run);
const manifest = read(path.join(input, 'manifest.json'));
assert.equal(manifest.files.length, 233);
const copies = [];
let total = 0;
for (const item of [...manifest.files, ...['manifest.json', 'CHECKSUMS.sha256'].map(file => ({
    path: file, bytes: fs.statSync(path.join(input, file)).size, sha256: hash(path.join(input, file))
}))])
{
    const source = physical(input, item.path);
    const logical = 'owner-handoff/' + item.path.replaceAll('\\', '/');
    const destination = physical(target, logical);
    assert.equal(fs.statSync(source).size, item.bytes);
    assert.equal(hash(source), item.sha256.toUpperCase());
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    assert.equal(hash(destination), item.sha256.toUpperCase());
    copies.push({ file: logical, bytes: item.bytes, sha256: item.sha256.toUpperCase(), actualSourcePath: source });
    total += item.bytes;
}
assert.equal(copies.length, 235);
assert.equal(total, 20121654);
for (const [source, logical] of [
    [path.join(session, 'F136-coordinator-owner-verification-010.json'), 'coordinator-owner-audit.json'],
    [path.join(owner, 'HANDOFF.json'), 'original-owner-handoff.json']
])
{
    const destination = physical(target, logical);
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    assert.equal(hash(destination), hash(source));
    copies.push({ file: logical, bytes: fs.statSync(source).size, sha256: hash(source), actualSourcePath: source });
}
const python = path.join(owner, 'tools', 'python', 'python.exe');
assert.equal(hash(python), priorAudit.executableSha256);
const environment = { ...process.env, PYTHONDONTWRITEBYTECODE: '1' };
delete environment.PYTHONOPTIMIZE;
const audit = spawnSync(python, ['-B', 'audit.py'], {
    cwd: path.join(target, 'owner-handoff'), env: environment, encoding: 'utf8', windowsHide: true
});
assert.ifError(audit.error);
assert.equal(audit.status, 0, audit.stderr + '\n' + audit.stdout);
const audited = JSON.parse(audit.stdout.trim());
assert.equal(audited.status, 'passed');
assert.equal(audited.sealedFiles, 233);
write(path.join(target, 'coordinator-acceptance.json'), {
    recordedAt: new Date().toISOString(), actualSelectedCapsuleFilesIndependentlyRehashed: 235,
    actualSelectedCapsuleBytes: total, actualSelectedCapsuleManifestSha256: hash(path.join(input, 'manifest.json')),
    actualSelectedCapsuleNotEdited: true,
    actualCopiedCapsuleDeepAudit: { actualExecutable: python, actualExecutableSha256: hash(python),
        actualArguments: ['-B', 'audit.py'], actualCwd: path.join(target, 'owner-handoff'),
        actualPid: audit.pid, actualExitCode: audit.status, actualTerminal: true,
        actualStdout: audit.stdout, actualStderr: audit.stderr, actualResult: audited },
    actualExistingNativeRows: 10, actualUntimedProducerCases: 10,
    actualConsumingSetupReachedWatch: false, actualConsumingProviderOperations: ['GetFileInfo:TestApplication.modules.json'],
    actualPublicChangedStateProducer: 'TestFileChangeToken.HasChanged setter, not filesystem/browser notifications',
    actualSelectedNativeRawDocumentAssociations: 16, actualCommonProgramSourceAssociation: true,
    actualPhysicalAndGitSourceAssociations: 62, actualAllImageEntriesCompared: 292,
    actualEqualImageEntries: 185, actualDifferentImageEntries: 107, actualImagePrefixExemptions: [],
    actualCommonConsumerSuccessfulCompilations: 1, actualCommonDllPdbDepsRuntimeconfigIdentical: true,
    actualCausalPerformancePairAdmitted: false, actualExternalOmittedTreesFreshlyRehashed: false,
    boundedTargetGitIdentities: identities, actualLaterObservedMain: live,
    targetFreshnessBoundary: 'Target file identity only. Native characterized graphs remain Original37 and observed00560; no complete later framework rebuild.',
    finalDisposition: 'rejected', subtype: 'test-infrastructure-material-workload-unestablished',
    actualNoCandidateAppliedOrComparisonAuthorized: true, actualNoMeasuredNoGainOrZeroCostClaim: true,
    rationale: 'Real TryGetValue followed by conditional replacement write in test scaffolding; unchanged token path already has one probe. The actual exercised MapStaticAssets/MapRazorComponents/options consumer read a file, not Watch. A materially repeated Watch workload and worthwhile compatible optimization are unestablished, not disproved for every possible caller.',
    fullCompilerInputAttestation: false,
    boundary: 'Copied historical selected PE/PDB/raw-source and actual TRX parsed by independent portable Python auditor; Node verifier checks copied hashes and saved facts, not fresh binary/XML parsing. Omitted complete graph/runtime/package/SDK/tool trees not freshly rehashed; broader caller/browser/concurrency/candidate/performance boundaries remain excluded.'
});
const budget = { findingId: 'F136', maximumAuthorizations: 3, authorizations: [], closed: true,
    closedAt: new Date().toISOString(),
    closureReason: 'No material repeated Watch workload or useful compatible optimization established for the actual test provider. No candidate/comparison admitted; conditional write and changed-token replacement retained. Not measured no-gain, zero cost, or a universal unused-Watch conclusion.' };
write(path.join(run, 'diagnostic-budget.json'), budget);
write(path.join(target, 'closed-budget.json'), budget);
for (const file of ['F136-prepare-outcome-010.mjs', 'autoperf-publish-bounded-outcome-007.mjs'])
{
    const source = path.join(session, file);
    const logical = 'executed-drivers/' + file;
    const destination = physical(target, logical);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    copies.push({ file: logical, bytes: fs.statSync(source).size, sha256: hash(source), actualSourcePath: source });
}
write(path.join(target, 'authoritative-copies.json'), copies);
write(path.join(run, 'publication-config.json'), {
    folder: 'F136', run, expectedParentIndex: '5d7be7530cfe6f5789cf1ee8523fb35a8c7f0876',
    performancePrAuthorized: false, subtype: 'test-infrastructure-material-workload-unestablished',
    authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F136] No material test-file trigger probe optimization established',
    issueSearch: 'F136 in:title',
    evidenceCommitTitle: 'Publish bounded test-file trigger probe study',
    evidenceCommitDescription: 'Preserve235-file20121654-byte preparation capsule unchanged;5real nativeTRXcases and5untimedhelper/consumer cases perOriginal37/observed00560. Actual publicHasChangedsetter replaces tokens;file mutations do not signal,no-opcallbacks do not run. Real MapStaticAssets/MapRazorComponents/optionsfixture readsmodulesmetadata,notWatch. Onecommonconsumercompile,16selectednative rawdocument bindings+commonProgram,62physical/Git associations. All292imageentries185same107different,no exemptions;62/68runtime distinction prohibitscausal timing. Retainfailures,submodule statusboundary andinitialPIDgaps. No candidate/comparison;not no-gain/zerocost/universalunusedclaim;fullcompilerattestationfalse;fixedreportunchanged.',
    indexCommitTitle: 'Index unestablished test-provider trigger micro-optimization',
    outcomes: [{
        id: 'F136', status: 'rejected',
        note: 'No material repeated Watch workload or useful compatible single-probe optimization established in Components.Endpoints test infrastructure. Actual source isTryGetValue+conditional replacement WRITE;unchangedtokenalreadyoneprobe.5nativeTRXcases+5untimedproducer/consumercasesperOriginal37/observed00560 pass;soleopaque-redirecttheoryrowinspected. PublicHasChangedsetterisrealtest-helperproducer,notOS/browserwatch;old/new/late-oldcallbacksnoop,filemutationsdonotsignal. ActualregisteredMapStaticAssets/MapRazorComponents/optionsconsumerproducedroute/resourceandonlyGetFileInfo:TestApplication.modules.json,notWatch;boundedthreefixturetrace,notuniversalcensus.16selectednativePE/PDB/rawdocassociations+commonProgram,62physical/Git sourceidentities;235selectedfiles20121654bytesindependentlyauditedandcopiedunchanged. OnecommonDLL/PDB/deps/runtimeconfigcompile;all292imageentries185same107different,noexemptions;Original62/default68notcausalpair. Failedprereqs/submoduleMvsownclean/PIDcapturegapsretained. Closed0of3,no candidate/measurement;notmeasuredno-gain/zerocost/unused-everywhere,fullcompilerattestationfalse.',
        readmeRow: '| F136 | Not admitted: conditional trigger replacement in test scaffolding; actual endpoint fixture read files, not Watch, and no material repeated-watch workload established.5 native+5 untimed cases per pin;292 image entries/107 differences reject causal pairing;0 comparisons/no PR. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [Provider study](F136/README.md), [verified publication](F136/publication.json) |'
    }]
});
console.log(JSON.stringify({ actualCopiedSelectedFiles: 235, actualSelectedBytes: total,
    actualAuthoritativeCopies: copies.length, actualCopiedDeepAudit: audited,
    actualZeroComparisonBudgetPermanentlyClosed: true, actualTargetIdentities: identities }, null, 2));
