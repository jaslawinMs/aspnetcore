import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const published = path.join(session, 'autoperf-published-results');
const capsule = path.join(session, 'autoperf-parallelism', 'finding-F160-F162-011', 'payload');
const destination = path.join(published, 'F160-F162');
const run = path.join(session, 'autoperf-runs', 'F160-F162');
const previousIndex = 'cdfb07867fb27355c97f868a91f571260c1d143a';
const ids = ['F160', 'F161', 'F162'];
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
    '6E85A131CD9045C579E72CC861D13AB9DB970B946B0DE96F6C9879B1328135FF');
const verification = path.join(session, 'F160-F162-coordinator-owner-verification-012.json');
const clarificationFile = path.join(session, 'F160-F162-membership-clarification-012.json');
const verified = read(verification), clarification = read(clarificationFile);
assert.equal(verified.actualReadOnlyNodePortableAudit.result, 'PASS');
assert.equal(verified.actualNativePassedExecutions, 30);
assert.equal(clarification.actualHashSetAddMethodPresent, true);
assert.equal(clarification.actualDictionaryTryAddInstanceMethodPresent, false);
assert.equal(clarification.actualF161AllVariableUsages.storedValuesRead, false);
assert.equal(clarification.actualF162AllVariableUsages.storedValuesRead, false);
const current = execute('git', ['-C', String.raw`C:\src\aspnetcore`, 'ls-remote', 'origin', 'refs/heads/main']).split(/\s+/)[0];
assert.match(current, /^[0-9a-f]{40}$/);
const targets = [{ file: 'src/Components/AI/gen/ToolBlockEmitter.cs', gitBlob: '4bacce8efe1e321e62c0154a12da135199171ccf' },
    { file: 'src/Components/AI/gen/ToolBlockParser.cs', gitBlob: '29813c83fa9cc951f9ce2d3de8024b97e1a25c91' }];
const query = `{repository(owner:"dotnet",name:"aspnetcore"){${targets.map((target, index) =>
    `t${index}:object(expression:"${current}:${target.file}"){oid}`).join(' ')}}}`;
const fresh = JSON.parse(execute('gh', ['api', 'graphql', '-f', 'query=' + query])).data.repository;
for (let index = 0; index < targets.length; index++) { assert.equal(fresh[`t${index}`].oid, targets[index].gitBlob); }
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
assert.equal(copies.length, 175);
assert.equal(copies.reduce((sum, item) => sum + item.bytes, 0), 51534666);
copy(verification, 'coordinator-whole-payload-verification.json');
copy(clarificationFile, 'coordinator-membership-clarification.json');
copy(process.argv[1], 'executed-drivers/F160-F162-prepare-outcome-012.mjs');
copy(path.join(session, 'autoperf-publish-bounded-outcome-007.mjs'), 'executed-drivers/publisher-007.mjs');
write(path.join(destination, 'authoritative-copies.json'), copies);
const reasons = {
    F160: 'Already TryGetValue: first candidate data is actually consumed by duplicate diagnostics; no material compiler-workload replacement established.',
    F161: 'Parameter collision dictionary values are never read; a set is a plausible declared-reference-compatible simplification, but material compiler benefit and a candidate were not established.',
    F162: 'Result collision dictionary values are never read; a set is a plausible declared-reference-compatible simplification, but material compiler benefit and a candidate were not established.'
};
const budgets = ids.map(findingId => ({ findingId, maximumComparisons: 3, authorizations: [], closed: true,
    actualComparisons: 0, actualCandidateWritten: false, actualUnusedAuthorizationsPermanentlyClosed: 3,
    closedAt: new Date().toISOString(), closingReason: reasons[findingId] }));
write(path.join(run, 'diagnostic-budgets.json'), budgets);
write(path.join(destination, 'closed-budgets.json'), budgets);
const acceptance = { findings: ids, outcome: 'rejected', subtype: 'generator-lookup-or-membership-simplification-material-benefit-unestablished',
    recordedAt: new Date().toISOString(), actualOwnerCapsuleFiles: 175, actualOwnerCapsuleBytes: 51534666,
    actualOwnerCapsuleManifestSha256: verified.actualReadOnlyNodePortableAudit.manifestSha256,
    actualReasons: reasons, actualF160AlreadyTryGetValueConsumesExistingClassName: true,
    actualF161F162StoredValuesNeverReadAndDictionariesDoNotEscape: true,
    actualDeclaredTarget: 'netstandard2.0', actualDeclaredReferenceDictionaryTryAddInstanceMethod: false,
    actualDeclaredReferenceHashSetAddMethod: true, actualCompatibleAlternativeRuledOut: false,
    actualSourceUsageClarificationIsSourceReceiptNotRuntimeValueDump: true,
    actualPerRequestOrPerRenderCollisionDictionaryLifetime: false,
    actualNativeOriginalRows: 15, actualNativeDefault69Rows: 15, actualNativeGeneratorRowsPerRole: 13,
    actualNativeFixtureRowsPerRole: 2, actualAllFiveNativeInvalidDeclarationTheoryValuesPassedPerRole: true,
    actualInitialDefaultRuntimeAbortRows: 0,
    actualPrivateProbeRowsPerRole: 4, actualDetailedDefaultPrivateProbeIsTargetOnlyUnderOriginalProducerRuntime62: true,
    actualDetailedPrivateWholeDefaultProbeExecuted: false,
    actualAcceptedV2SuccessfulCommonCompiles: 1, actualAllVersionsSuccessfulCommonCompiles: 2,
    actualStrictOneSuccessfulCompileAcrossAllAttemptsMet: false,
    actualGeneratedRegistrationStillContainsDuplicateCandidatesDespiteErrorDiagnostics: true,
    actualErrorBearingPrivateConsumerIsErrorFreeShippingAppProof: false,
    actualNativeDefaultModuleSnapshots: 17, actualNativeDefaultModuleFilePaths: 106,
    actualNativeDefaultGeneratorAndAiProducerObservedInSnapshots: false,
    actualNoCandidateOrNewNativeExecutionOrComparisonOrPr: true,
    actualNotMeasuredNoGainOrZeroCost: true, actualFullCompilerInputAttestation: false,
    actualClosingTargetOnlyFreshness: { currentMain: current, targets, actualNewBuildOrTest: false } };
write(path.join(destination, 'coordinator-acceptance.json'), acceptance);
write(path.join(run, 'preparation-commands.json'), commands);
write(path.join(run, 'publication-config.json'), { folder: 'F160-F162', run, expectedParentIndex: previousIndex,
    performancePrAuthorized: false, subtype: acceptance.subtype, authoredMarkdown: ['README.md'],
    issueTitle: '[AutoPerf F160-F162] Generator lookup and set benefit not established', issueSearch: '"F160-F162" in:title',
    evidenceCommitTitle: 'Publish bounded generator collision and membership study',
    evidenceCommitDescription: 'Preserve175selected51534666bytecapsuleandindependentSystemXml/8PEPDB26rawDocumentaudit. Native15perrole=13targetincludingall5theoryvalues+2fixture,actualOriginal62/default69plusretained0rowabort. Detailed4privateprobes/role useDefaultgeneratorunderOriginalproducer/runtime62,target-only. F160alreadyTryGetValueconsumesfirstcandidateClassName. F161/F162dictionaryvaluesonlywritten;actualnetstandardrefHashSet.Addpresent,missingDictionary.TryAdddoesnotexcludecompatiblealternative. No materialcompilerworkloadorimplementedsetcandidate;eachclosed0of3,no measuredno-gain/zerocost. AcceptedV2compiledonce,total2successesincludingfailedV1preserved. Fullmodule/closure/ephemeralconsumerlimits,fixedreportunchanged.',
    indexCommitTitle: 'Index three generator lookup and membership assessments',
    outcomes: ids.map(id => ({ id, status: 'rejected',
        note: reasons[id] +
            ' 175files51534666bytes,8freshPEPDB26rawdocs;native15perrole(13generatorincluding5BAIC001-005theoryrows+2fixture),30actualpassesandretained0rowinitialdefaultabort. Normalnative62/69;private4detailedrowsperroleDefaultTARGETONLYunderOriginalproducer/runtime62,notwholeDefault. AcceptedV2onecompile,total2successesincludingfailedV1ExternalFilelocationruntimeassertion;bothpreserved. Actualnetstandard2.0refDictionary.TryAddabsentbutHashSet.Addpresent;F161/F162valuesneverread,nocompatiblealternativeimpossibilityclaim. Errorbearingprivateemittedconsumerregistrationnoterrorfreeproductionapp. Ownclosed0of3,nocandidate/comparison,notmeasuredno-gain/zerocost.',
        readmeRow: `| ${id} | Not admitted: ${id === 'F160' ? 'already consumes TryGetValue result for first-candidate diagnostics' : 'membership-only dictionary admits a plausible set simplification, but material compiler benefit is unestablished'}. [Tracking jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}) | [Generator collision/TFM study](F160-F162/README.md), [verified publication](F160-F162/publication.json) |` })) });
console.log(JSON.stringify({ actualUnchangedCopiedFiles: copies.length, actualOwnerFiles: 175, actualOwnerBytes: 51534666,
    actualHistoricalNativePassesNotNewExecutions: 30, actualCompatibleSetAlternativeNotRuledOut: true,
    actualClosedFindingBudgets: 3, actualComparisons: 0 }, null, 2));
