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
function inventory(directory, relative = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const name = relative ? relative + '/' + entry.name : entry.name;
        return entry.isDirectory() ? inventory(path.join(directory, entry.name), name) : [name];
    });
}
const evidence = json('evidence-index.json');
assert.equal(new Set(evidence.files.map(x => x.file)).size, evidence.files.length);
for (const item of evidence.files) checked(item.file, item.bytes, item.sha256);
const specs = [
    ['F225-F226', 'index.json', 'entries', 154, ['index.json', 'seal.json']],
    ['F227', 'WHOLE-SEAL-v1.json', 'files', 190, ['WHOLE-SEAL-v1.json']],
    ['F229-F230', 'EVIDENCE-INDEX-259.json', 'entries', 165, ['EVIDENCE-INDEX-259.json', 'SEAL-259.json']],
];
for (const [group, file, list, count, envelopes] of specs)
{
    const prefix = 'evidence/' + group + '/', entries = json(prefix + file)[list];
    assert.equal(entries.length, count);
    for (const item of entries) checked(prefix + (item.path ?? item.relativePath), item.bytes ?? item.byteLength, item.sha256);
    assert.deepEqual(inventory(path.join(root, 'evidence', group)).sort(),
        [...new Set([...entries.map(x => (x.path ?? x.relativePath).replaceAll('\\', '/')), ...envelopes])].sort());
}
assert.equal(evidence.ownerCopies.reduce((sum, x) => sum + x.completeCopiedFiles, 0), 514);
const membership = json('qualified-source-membership-271.json'), graph = verifyMembership(root, membership);
assert.equal(graph.memberships, 78);
const groups = Object.fromEntries(['F225-F226', 'F227', 'F229-F230']
    .map(group => [group, membership.sources.filter(x => x.group === group).length]));
assert.deepEqual(groups, { 'F225-F226': 30, F227: 18, 'F229-F230': 30 });
for (const item of membership.sources)
{
    assert.ok(['100644', '100755'].includes(item.mode));
    assert.equal(gitId('blob', checked(item.artifact, item.bytes, item.sha256)), item.blob);
}
const external = json('external-source.json');
assert.equal(external.length, 4);
for (const item of external)
{
    assert.equal(gitId('blob', checked(item.artifact, item.bytes, item.sha256)), item.computedBlob);
    assert.equal(item.notSelectedRoleRuntime, true);
}
const h225 = json('evidence/F225-F226/handoff.json'), s225 = json('evidence/F225-F226/seal.json');
assert.equal(h225.zeroExecutionAndMutation.sdkActivations, 0);
assert.equal(h225.zeroExecutionAndMutation.candidateOrShippingSourceEdits, 0);
assert.equal(s225.allSourceRootsWaitedAndStreamsAwaited, true);
assert.equal(s225.actualNativeSourceRoots, 13);
assert.equal(s225.failedBeforeStart, 1);
const h227 = json('evidence/F227/assessment-v1.json'), s227 = json('evidence/F227/WHOLE-SEAL-v1.json');
assert.equal(h227.decision, 'SOURCE_ONLY_MATERIALITY_UNESTABLISHED_NO_CANDIDATE');
assert.equal(h227.scopeCompliance.sdkActivations, 0);
assert.equal(h227.scopeCompliance.measurementsOrProfiling, 0);
assert.equal(s227.sourceOnly, true);
assert.equal(s227.nativeRootCount, 25);
const h229 = json('evidence/F229-F230/HANDOFF-259.json'), s229 = json('evidence/F229-F230/SEAL-259.json');
assert.equal(h229.mode, 'source-only');
assert.equal(h229.counts.runtimeTestBuildRestoreOrTimingStarts, 0);
assert.equal(h229.counts.productSourceOrCandidateEdits, 0);
assert.equal(s229.rootWaitsBothStreamsAndObservedChildrenTerminal, true);
assert.equal(s229.nativeRootCount, 12);
assert.equal(s229.observedNativeChildCount, 14);
const acceptance = json('evidence/parent/accepted-preparations-265.json');
assert.equal(acceptance.indexedPayloadsRehashed, 544);
assert.equal(acceptance.completeFilesRehashed, 556);
assert.equal(acceptance.sourceBindings.length, 78);
assert.equal(acceptance.productNativeSourceUtilityOrComparisonStarts, 0);
const archive = json('evidence/parent271/ARCHIVE.json'), commands = json('evidence/parent271/COMMANDS.json');
assert.equal(archive.rawGitVerification.memberships, graph.memberships);
assert.equal(archive.rawGitVerification.objects, graph.objects);
assert.equal(archive.productNativeOrComparisonStarts, 0);
assert.equal(commands.length, archive.sourceUtilityRoots);
assert(commands.every(x => x.exitCode === 0 && x.rootWaited && x.redirectedStreamsDrained));
const uncorrected = json('source-membership.json');
assert.equal(uncorrected.sources.length, membership.sources.length);
assert.deepEqual(uncorrected.objects, membership.objects);
for (const [index, item] of membership.sources.entries())
{
    assert.equal(uncorrected.sources[index].finding, undefined);
    assert.deepEqual(item, { ...uncorrected.sources[index], finding: uncorrected.sources[index].group });
}
assert.equal(archive.previousFailure.failedCollectorOrOriginalOutputsEditedOrReplayed, false);
const completion = json('preparation-terminal.json');
assert.equal(completion.actualToolCompleted, true);
assert.equal(completion.actualToolExitCode, 0);
assert.equal(completion.actualCollectorReplayedOrEdited, false);
if (fs.existsSync(path.join(root, 'capsule-file-hashes.json')) || process.argv.includes('--require-seal'))
{
    const seal = json('capsule-file-hashes.json');
    for (const item of seal.files) checked(item.file, item.bytes, item.sha256);
    assert.deepEqual(inventory(root).filter(x => !['capsule-file-hashes.json', 'publication.json'].includes(x)).sort(),
        seal.files.map(x => x.file).sort());
}
console.log(JSON.stringify({ findings: ['F225', 'F226', 'F227', 'F229', 'F230'],
    completeOwnerFiles: 514, copiedEvidenceFiles: evidence.files.length, sourceMemberships: graph.memberships,
    rawGitObjects: graph.objects, sourceGroupCounts: groups, externalWholeReferenceFingerprints: external.length,
    sourceOnly: true, productNativeTestsCandidatesOrComparisons: 0,
    original266MetadataAndFailurePreserved: true,
    selectedRuntimeOrExternalTreeQualified: false, actualOuterCompletionRetained: true }));
