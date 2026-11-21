import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gitId, sha256, verifyMembership } from './source-objects.mjs';

const root = path.resolve(process.argv[2] ?? import.meta.dirname);
function content(relative)
{
    const file = path.resolve(root, ...relative.split(/[\\/]/));
    assert.ok(file.startsWith(root + path.sep), relative);
    return fs.readFileSync(file);
}
const json = relative => JSON.parse(content(relative).toString('utf8').replace(/^\uFEFF/, ''));
function checked(file, bytes, hash)
{
    const raw = content(file);
    assert.equal(raw.length, bytes, file);
    assert.equal(sha256(raw), hash, file);
    return raw;
}
function files(directory, relative = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const name = relative ? relative + '/' + entry.name : entry.name;
        return entry.isDirectory() ? files(path.join(directory, entry.name), name) : [name];
    });
}
const evidence = json('evidence-index.json');
assert.equal(new Set(evidence.files.map(x => x.file)).size, evidence.files.length);
for (const item of evidence.files) checked(item.file, item.bytes, item.sha256);
const ownerSpecs = [
    ['F150', 'seal-005.json', 295, ['seal-005.json', 'seal-005-launch.stdout.bin', 'seal-005-launch.stderr.bin', 'seal-005-launch.result.json']],
    ['F206', 'WHOLE-SEAL-v1.json', 331, ['WHOLE-SEAL-v1.json']],
    ['F215', 'HASHES.json', 144, ['HASHES.json', 'HANDOFF.json']],
    ['F220', 'HASHES.json', 1365, ['HASHES.json', 'HASHES.sha256']],
];
for (const [id, file, count, envelopes] of ownerSpecs)
{
    const prefix = 'evidence/' + id + '/', entries = json(prefix + file).files;
    assert.equal(entries.length, count);
    for (const item of entries) checked(prefix + item.path, item.bytes, item.sha256);
    assert.deepEqual(files(path.join(root, 'evidence', id)).sort(),
        [...new Set([...entries.map(x => x.path.replaceAll('\\', '/').replace(/^\.\//, '')), ...envelopes])].sort());
}
assert.equal(evidence.ownerCopies.reduce((sum, x) => sum + x.completeCopiedFiles, 0), 2144);
const membership = json('source-membership.json'), graph = verifyMembership(root, membership);
assert.equal(graph.memberships, 334);
const counts = Object.fromEntries(['F150', 'F206', 'F215', 'F220']
    .map(id => [id, membership.sources.filter(x => x.finding === id).length]));
assert.deepEqual(counts, { F150: 110, F206: 60, F215: 38, F220: 126 });
for (const item of membership.sources)
{
    assert.ok(['100644', '100755'].includes(item.mode));
    assert.equal(gitId('blob', checked(item.artifact, item.bytes, item.sha256)), item.blob);
}
const external = json('external-source.json');
assert.equal(external.length, 39);
for (const item of external)
{
    const raw = checked(item.artifact, item.bytes, item.sha256);
    if (item.gitBlob) assert.equal(gitId('blob', raw), item.gitBlob);
}
const a150 = json('evidence/F150/audit-004/source-audit.json');
assert.equal(a150.verifiedWholeSourceEntries.length, 131);
for (const item of a150.verifiedWholeSourceEntries) checked('evidence/F150/' + item.path, item.bytes, item.sha256);
assert.equal(a150.correctedRolePairs.length, 55);
assert.equal(a150.correctedRolePairs.filter(x => x.identical).length, 50);
const t150 = json('evidence/F150/seal-005-launch.result.json');
assert.equal(t150.sealerRootExitCode, 0);
assert.equal(t150.sealerRootWaitReturned, true);
assert.equal(t150.stdoutCopyAwaited, true);
assert.equal(t150.stderrCopyAwaited, true);
assert.equal(json('evidence/F150/HANDOFF-F150-246.json').scopeCompliance.productNativeStarts, 0);
const h206 = json('evidence/F206/assessment-v1.json');
assert.equal(h206.disposition, 'SOURCE_ONLY_MATERIALITY_UNESTABLISHED_NO_CANDIDATE');
assert.equal(h206.cardinalityAndMateriality.materiality, 'UNESTABLISHED');
assert.equal(json('evidence/F206/sealer-observed-exit-v1.json').childObservation.observedChildExitCode, 0);
const h215 = json('evidence/F215/HANDOFF.json');
assert.equal(sha256(content('evidence/F215/HASHES.json')), h215.indexSha256);
assert.equal(h215.nativeProductBuildTestRestoreServerRuntimeProbeStarts, 0);
assert.equal(h215.candidateEdits, 0);
const late215 = json('evidence/parent/finding-F215-terminal-251/enclosing-tool-result.json');
assert.equal(late215.actualReturnedResult.completed, true);
assert.equal(late215.actualReturnedResult.exitCode, 0);
const h220 = json('evidence/F220/HANDOFF.json');
assert.equal(h220.disposition, 'bounded-source-only-no-material-candidate');
assert.equal(h220.productBuildTestApplicationStarts, 0);
assert.equal(h220.sourceAudit.checksPassed, 765);
assert.equal(h220.sourceAudit.notProductTests, true);
assert.equal(h220.nodeChildObservedActualTerminal.childExitCodeAfterWait, 0);
const sourceRoots220 = json('evidence/F220/source-root-terminal-index-009.json');
assert.equal(sourceRoots220.length, 215);
assert.equal(sourceRoots220.filter(x => x.status === 1).length, 2);
assert(sourceRoots220.every(x => x.rootAndBothStreamsReturned));
const parentAcceptance = json('evidence/parent/accepted-terminals-255.json');
assert.equal(parentAcceptance.F150.finalSealerExit, 0);
assert.equal(parentAcceptance.F206.finalSealerExit, 0);
assert.equal(parentAcceptance.previousFailure.actualTool, 'autoperf-accept-terminals-254 completed with exit code 1');
assert.equal(json('evidence/parent/accepted-F220-258.json').nodeExit, 0);
const archive = json('evidence/parent264/ARCHIVE.json'), commands = json('evidence/parent264/COMMANDS.json');
assert.equal(archive.rawGitVerification.memberships, graph.memberships);
assert.equal(archive.rawGitVerification.objects, graph.objects);
assert.equal(archive.productNativeOrComparisonStarts, 0);
assert.equal(commands.length, archive.sourceUtilityRoots);
assert(commands.every(x => x.exitCode === 0 && x.rootWaited && x.redirectedStreamsDrained));
const qualification = json('evidence/qualification263/QUALIFICATION.json');
assert.equal(qualification.actualRawMemberships, 334);
assert.equal(qualification.rawGitObjects, 285);
assert.equal(qualification.exactRetainedCaptures, 226);
assert.equal(qualification.mismatchingRetainedCaptures, 108);
const sourceCommands = json('evidence/qualification263/COMMANDS.json');
assert.equal(sourceCommands.length, 13);
assert(sourceCommands.every(x => x.exitCode === 0 && x.rootWaited && x.bothStreamsReturned));
const corrections = { Original: 0, Default: 0 };
for (const item of membership.sources)
{
    const old = item.retainedCapture, raw = checked(item.retainedCaptureArtifact, old.bytes, old.sha256);
    assert.equal(gitId('blob', raw), old.blob);
    const actual = content(item.artifact);
    assert.equal(raw.equals(actual), item.retainedCaptureMatchesImmutableSource);
    if (!item.retainedCaptureMatchesImmutableSource)
    {
        assert.equal(item.finding, 'F150');
        const oldText = raw.toString('utf8'), newText = actual.toString('utf8');
        assert.ok(Buffer.from(oldText).equals(raw) && Buffer.from(newText).equals(actual));
        assert.equal(oldText.replaceAll('\r\n', '\n'), newText.replaceAll('\r\n', '\n'));
        corrections[item.role]++;
    }
}
assert.deepEqual(corrections, { Original: 54, Default: 54 });
const qualificationTool = json('evidence/parent264/actual-qualification-263-tool.json');
assert.equal(qualificationTool.actualToolCompleted, true);
assert.equal(qualificationTool.actualToolExitCode, 0);
assert.equal(qualificationTool.previousFailure.helperReplayedOrEdited, false);
assert.equal(qualificationTool.previousFailure.noPublicationOrFinalization, true);
const preparation = json('preparation-terminal.json');
assert.equal(preparation.actualToolCompleted, true);
assert.equal(preparation.actualToolExitCode, 0);
assert.equal(preparation.actualCollectorReplayedOrEdited, false);
if (fs.existsSync(path.join(root, 'capsule-file-hashes.json')) || process.argv.includes('--require-seal'))
{
    const seal = json('capsule-file-hashes.json');
    for (const item of seal.files) checked(item.file, item.bytes, item.sha256);
    assert.deepEqual(files(root).filter(x => !['capsule-file-hashes.json', 'publication.json'].includes(x)).sort(),
        seal.files.map(x => x.file).sort());
}
console.log(JSON.stringify({ findings: ['F150', 'F206', 'F215', 'F220'],
    completeOwnerFiles: 2144, completeCopiedEvidenceFiles: evidence.files.length,
    sourceMemberships: graph.memberships, rawGitObjects: graph.objects, sourceMembershipCounts: counts,
    executableSourceFiles: membership.sources.filter(x => x.mode === '100755').length,
    externalWholeSourceOrPackageXmlFingerprints: external.length, sourceOnly: true,
    retainedF150CaptureCrlfOnlyDiscrepancies: 108, canonicalMembershipCapturesUseExactRawBytes: true,
    candidateEdits: 0, productBuildTestBrowserOrComparisonStarts: 0,
    externalCommitTreeGraphsOrSelectedImagesQualified: false, sourceAndOuterStreamLimitsRetained: true }));
