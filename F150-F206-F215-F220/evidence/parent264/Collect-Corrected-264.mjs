import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gitId, sha256, verifyMembership } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const root = import.meta.dirname, parallel = path.dirname(root), session = path.dirname(parallel);
const capsule = path.join(session, 'autoperf-published-results', 'F150-F206-F215-F220');
const qualification = path.join(parallel, 'source-qualification-263');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const logical = text => text.replaceAll('\\', '/').replace(/^\.\//, '');
function write(file, raw)
{
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
const jsonWrite = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
function inventory(directory, relative = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const name = relative ? relative + '/' + entry.name : entry.name;
        return entry.isDirectory() ? inventory(path.join(directory, entry.name), name) : [name];
    });
}
const policyRaw = fs.readFileSync(path.join(parallel, 'policy.json')), policy = JSON.parse(policyRaw);
assert.deepEqual(Object.keys(policy.independentFindingPreparationWorkers).sort(), ['F209', 'F225', 'F227', 'F229']);
assert.equal(policy.actualWorkerBuildHoldActive, false);
assert.equal(policy.buildAndTestWorkQuiesced, false);
assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
jsonWrite(path.join(root, 'policy-observation.json'), { observedUtc: new Date().toISOString(),
    policySha256: sha256(policyRaw), owners: policy.independentFindingPreparationWorkers,
    scopes: policy.activeWorkerPreparationScopes, leaseAbsent: true, HOLD: false, quiesced: false,
    boundary: 'Byte-only source packaging point, not native/comparison admission or machine idleness.' });
assert.equal(fs.existsSync(path.join(capsule, 'evidence-index.json')), false);
assert.equal(sha256(fs.readFileSync(path.join(parallel, 'source-outcomes-260', 'Collect-And-Package-260.mjs'))),
    'DFC6BA6E14750A1DE9BD0AB782470B7AF52600635105ABB84DE828BBE7199A08');
jsonWrite(path.join(root, 'actual-qualification-263-tool.json'), {
    actualTool: 'autoperf-source-qualification-263 completed with exit code 0',
    actualToolCompleted: true, actualToolExitCode: 0,
    collectorHelperReplayedOrEdited: false, sourceGate: '334 raw memberships/285 objects; all108 capture discrepancies require explicit review.',
    previousFailure: { actualTool: 'autoperf-source-package-260 completed with exit code 1',
        failedAt: 'Exact raw tree/blob equality assertion for F150 Original docs/BlazorComponentsGuidance.md',
        noPublicationOrFinalization: true, helperReplayedOrEdited: false },
    ownerFollowup: {
        agent: '0e68af4c-282e-499c-824b-253a9e5d389b', turn: 2,
        observedResponse: 'Original was a requested-role label, not proven Git membership. Collector003 used ls-tree --name-only and extracted git archive --format=zip; it never checked extracted content against tree blob IDs. Audits004/005 rehashed captures against their own manifests. Navigation-copy destination was separate; cause not established. Original provenance claim retracted, F150 remains pending.',
        boundary: 'Response observed after real completion notification, not independent source-byte qualification. Parent263 subsequently qualified exact raw sources and found108 CRLF/LF-only discrepancies.'
    },
    ownFinalToolExit: 'Actual enclosing qualification tool result observed by parent, not a self-attested exit.'
});
const evidence = [], copied = new Set(), ownerCopies = [];
function copy(file, raw, reuseExisting = false)
{
    assert.equal(copied.has(file), false, file);
    copied.add(file);
    const destination = path.join(capsule, ...file.split('/'));
    if (reuseExisting)
    {
        assert.ok(fs.existsSync(destination));
        assert.ok(fs.readFileSync(destination).equals(raw), file);
    }
    else write(destination, raw);
    evidence.push({ file, bytes: raw.length, sha256: sha256(raw) });
}
const owners = [
    { finding: 'F150', folder: 'finding-F150-246', index: 'seal-005.json', indexed: 295,
        hash: '98ACDFC4D0378A1DA5981A9CE240B6AF5863E06AC9567C81297DD39FF5F88264',
        envelopes: ['seal-005.json', 'seal-005-launch.stdout.bin', 'seal-005-launch.stderr.bin', 'seal-005-launch.result.json'] },
    { finding: 'F206', folder: 'finding-F206-245', index: 'WHOLE-SEAL-v1.json', indexed: 331,
        hash: '6A0A5162A3B6BDF7E312025842E6C1EC1DECFFCC9477E3242E3A057B74F690EC',
        envelopes: ['WHOLE-SEAL-v1.json'] },
    { finding: 'F215', folder: 'finding-F215-249', index: 'HASHES.json', indexed: 144,
        hash: '2444E822B24D98CEDA4A36F2FCAE4854DC718AE0DDD293217DDE4397FE90E900',
        envelopes: ['HASHES.json', 'HANDOFF.json'] },
    { finding: 'F220', folder: 'finding-F220-243', index: 'HASHES.json', indexed: 1365,
        hash: 'E57279DEF6F66F198738746B814EB433347B69A2BDCE72A06F623E03DA180737',
        envelopes: ['HASHES.json', 'HASHES.sha256'] },
];
for (const owner of owners)
{
    const directory = path.join(parallel, owner.folder), rawIndex = fs.readFileSync(path.join(directory, owner.index));
    assert.equal(sha256(rawIndex), owner.hash);
    const entries = JSON.parse(rawIndex).files;
    assert.equal(entries.length, owner.indexed);
    for (const item of entries)
    {
        const raw = fs.readFileSync(path.join(directory, item.path));
        assert.equal(raw.length, item.bytes);
        assert.equal(sha256(raw), item.sha256);
    }
    const complete = inventory(directory).sort();
    assert.deepEqual(complete, [...new Set([...entries.map(x => logical(x.path)), ...owner.envelopes])].sort());
    for (const file of complete) copy('evidence/' + owner.finding + '/' + file,
        fs.readFileSync(path.join(directory, file)), true);
    ownerCopies.push({ finding: owner.finding, indexedPayloads: entries.length, completeCopiedFiles: complete.length,
        preservedExisting260CopyWithoutEdits: true, disposition: 'source-qualified-no-material-candidate' });
}
assert.equal(ownerCopies.reduce((sum, item) => sum + item.completeCopiedFiles, 0), 2144);
const originalMembership = read(path.join(qualification, 'source-membership.json'));
const rawVerification = verifyMembership(qualification, originalMembership), qualified = read(path.join(qualification, 'QUALIFICATION.json'));
assert.equal(rawVerification.memberships, 334);
assert.equal(rawVerification.objects, 285);
assert.equal(qualified.exactRetainedCaptures, 226);
assert.equal(qualified.mismatchingRetainedCaptures, 108);
const mismatchCounts = { Original: 0, Default: 0 };
for (const item of originalMembership.sources)
{
    const retained = item.retainedCapture, oldRaw = fs.readFileSync(path.join(parallel, retained.folder, retained.path));
    assert.equal(sha256(oldRaw), retained.sha256);
    assert.equal(gitId('blob', oldRaw), retained.blob);
    const actual = fs.readFileSync(path.join(qualification, item.artifact));
    assert.equal(oldRaw.equals(actual), item.retainedCaptureMatchesImmutableSource);
    if (!item.retainedCaptureMatchesImmutableSource)
    {
        assert.equal(item.finding, 'F150');
        const oldText = oldRaw.toString('utf8'), newText = actual.toString('utf8');
        assert.ok(Buffer.from(oldText).equals(oldRaw) && Buffer.from(newText).equals(actual));
        assert.equal(oldText.replaceAll('\r\n', '\n'), newText.replaceAll('\r\n', '\n'));
        mismatchCounts[item.role]++;
    }
}
assert.deepEqual(mismatchCounts, { Original: 54, Default: 54 });
for (const file of inventory(qualification))
    copy('evidence/qualification263/' + file, fs.readFileSync(path.join(qualification, file)));
const membership = { ...originalMembership, sources: originalMembership.sources.map(item => ({
    ...item, artifact: 'evidence/qualification263/' + item.artifact,
    retainedCaptureArtifact: 'evidence/' + item.finding + '/' + item.retainedCapture.path
})) };
for (const item of membership.objects) copy(item.file, fs.readFileSync(path.join(qualification, item.file)));
copy('source-membership.json', Buffer.from(JSON.stringify(membership, null, 2) + '\n'));
const verified = verifyMembership(capsule, membership);
const external = [{ finding: 'F206', role: 'DeclaredPackageContract', package: 'xunit.assert', version: '2.9.2',
    path: 'xunit.assert-2.9.2.xml', artifact: 'evidence/F206/source/ExternalContract/xunit.assert-2.9.2.xml',
    bytes: 279602, sha256: 'B54F3EBB1456B497ADAA27E7FD4AA879109A32430D9D46F63503FC1AA5DEC829',
    representation: 'Whole existing package XML fingerprint, not external tree membership or executing overload/binary proof.' }];
for (const item of read(path.join(parallel, 'finding-F215-249', 'external-source.json')))
    external.push({ ...item, finding: 'F215', artifact: 'evidence/F215/' + item.artifact });
for (const file of ['dependency-source-bindings-005.json', 'dependency-source-bindings-006.json', 'dependency-source-bindings-007.json'])
    for (const item of read(path.join(parallel, 'finding-F220-243', file)))
        external.push({ finding: 'F220', role: item.role, repository: item.repository, commit: item.commit,
            path: logical(item.repositoryPath), artifact: 'evidence/F220/' + logical(item.artifact),
            bytes: item.bytes, sha256: item.sha256, gitBlob: item.gitBlob,
            representation: 'Whole declared-version source fingerprint, not external commit/tree membership or executing image proof.' });
assert.equal(external.length, 39);
for (const item of external)
{
    const raw = fs.readFileSync(path.join(capsule, item.artifact));
    assert.equal(raw.length, item.bytes);
    assert.equal(sha256(raw), item.sha256);
    if (item.gitBlob) assert.equal(gitId('blob', raw), item.gitBlob);
}
copy('external-source.json', Buffer.from(JSON.stringify(external, null, 2) + '\n'));
for (const file of inventory(path.join(parallel, 'source-outcomes-260')))
    copy('evidence/failed-parent260/' + file, fs.readFileSync(path.join(parallel, 'source-outcomes-260', file)));
for (const file of ['Accept-Terminals-254.mjs', 'Accept-Terminals-255.mjs', 'accepted-terminals-255.json',
    'owner-retirements-255.json', 'Accept-F220-258.mjs', 'accepted-F220-258.json', 'owner-retirement-F220-258.json',
    'finding-F215-terminal-251/enclosing-tool-result.json'])
    copy('evidence/parent/' + file, fs.readFileSync(path.join(parallel, file)));
jsonWrite(path.join(root, 'COMMANDS.json'), []);
jsonWrite(path.join(root, 'ARCHIVE.json'), {
    findings: owners.map(x => x.finding), ownerCopies, rawGitVerification: verified,
    sourceUtilityRoots: 0, qualification263SourceUtilityRoots: qualified.sourceUtilityRoots,
    priorFailed260SourceUtilityRoots: 2, priorFailed260ReplayedOrEdited: false,
    retainedCaptureCorrections: { F150: mismatchCounts, allDifferencesStrictlyCrlfLfOnly: true,
        actualCanonicalCapturesUseRawBytesNotNormalization: true, oldOwnerFilesUnedited: true,
        transformationProducerNotEstablished: true },
    externalWholeSourceFingerprints: external.length, productNativeOrComparisonStarts: 0,
    finalizationRequiresIndependentPublisher: true, rejectedIsNotMeasuredNoGain: true
});
for (const file of inventory(root))
    copy('evidence/parent264/' + file, fs.readFileSync(path.join(root, file)));
for (const file of ['README.md', 'verify.mjs', 'source-objects.mjs', '.gitattributes'])
{
    const raw = fs.readFileSync(path.join(capsule, file));
    evidence.push({ file, bytes: raw.length, sha256: sha256(raw) });
}
jsonWrite(path.join(capsule, 'evidence-index.json'), { files: evidence, ownerCopies,
    boundary: 'All old owner bytes and failed260 retained; exact raw sources freshly qualified by263, with actual264 tool completion added only after return.' });
console.log(JSON.stringify({ completeOwnerFiles: 2144, completeCopiedEvidenceFiles: evidence.length,
    sourceMemberships: verified.memberships, rawGitObjects: verified.objects,
    retainedCaptureCrlfOnlyDiscrepancies: 108, actualRawBytesUsedForAllMemberships: true,
    externalWholeSourceFingerprints: external.length, newSourceUtilityOrProductNativeOrComparisonStarts: 0,
    ownToolExitNotSelfAttested: true }));
