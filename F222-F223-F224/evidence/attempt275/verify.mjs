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
const json = file => JSON.parse(content(file).toString('utf8').replace(/^\uFEFF/, ''));
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
assert.deepEqual(inventory(path.join(root, 'evidence'), 'evidence').sort(), evidence.files.map(x => x.file).sort());
for (const item of evidence.files) checked(item.file, item.bytes, item.sha256);
const membership = json('source-membership.json'), graph = verifyMembership(root, membership);
assert.deepEqual(graph, { objects: 63, memberships: 46 });
for (const item of membership.sources)
{
    assert.ok(item.finding && ['Original', 'Default'].includes(item.role));
    assert.equal(gitId('blob', checked(item.artifact, item.bytes, item.sha256)), item.blob);
}
const original = json('evidence/source273/source-membership.json');
assert.deepEqual(original.objects, membership.objects);
assert.deepEqual(original.sources.map(x => ({ ...x, artifact: 'evidence/source273/' + x.artifact })), membership.sources);
for (const role of ['Original', 'Default'])
{
    const rows = membership.sources.filter(x => x.role === role);
    assert.equal(rows.length, 23);
    const versions = rows.find(x => x.path === 'eng/Versions.props');
    assert.match(content(versions.artifact).toString('utf8'), /<XunitVersion>2\.9\.2<\/XunitVersion>/);
}
const external = json('external-source.json');
assert.equal(external.length, 7);
assert.equal(new Set(external.map(x => x.path)).size, 7);
for (const item of external)
{
    assert.equal(item.commit, 'cac8b688c193c0f244a0bedf3bb60feeb32d377a');
    assert.equal(gitId('blob', checked(item.artifact, item.bytes, item.sha256)), item.blob);
}
const release = json('evidence/source274/commands/003-xunit-release-v2-2.9.2.stdout');
assert.equal(release.truncated, false);
const binding = release.tree.find(x => x.path === 'src/xunit.assert/Asserts');
assert.equal(binding.type, 'commit');
assert.equal(binding.mode, '160000');
assert.equal(binding.sha, external[0].commit);
const collection = json('evidence/source273/COLLECTION.json'), entry = json('evidence/source274/ASSERTION-ENTRY.json');
assert.deepEqual(collection.before, collection.after);
assert.equal(collection.productNativeActivationBuildTestBrowserCandidateOrComparisonStarts, 0);
assert.equal(entry.productNativeActivationBuildTestBrowserCandidateOrComparisonStarts, 0);
assert.equal(entry.conservativeInputsPerRole, 35);
for (const [prefix, file, roots] of [['source273', 'actual-collection-tool-273.json', 22],
    ['source274', 'actual-assertion-tool-274.json', 3]])
{
    const commands = json('evidence/' + prefix + '/COMMANDS.json');
    assert.equal(commands.length, roots);
    assert.ok(commands.every(x => x.exitCode === 0 && x.rootWaited && x.bothRawStreamsReturned));
    assert.equal(json('evidence/' + prefix + '/' + file).actualReturnedExitCode, 0);
}
const archive = json('evidence/parent275/ARCHIVE.json'), commands = json('evidence/parent275/COMMANDS.json');
assert.equal(commands.length, 6);
assert.ok(commands.every(x => x.exitCode === 0 && x.rootWaited && x.bothRawStreamsReturned));
assert.deepEqual(archive.before, archive.after);
assert.equal(archive.aggregateSourceAndPackagingGitGhRoots, 31);
assert.equal(archive.productNativeTestsCandidatesOrComparisons, 0);
const assessment = json('evidence/parent275/ASSESSMENT.json');
assert.deepEqual(assessment.proposedStatuses, { F222: 'rejected', F223: 'rejected', F224: 'rejected' });
assert.equal(assessment.runtimeTestsCandidateComparisonsStarted, 0);
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
console.log(JSON.stringify({ findings: ['F222', 'F223', 'F224'], copiedEvidenceFiles: evidence.files.length,
    sourceMemberships: graph.memberships, rawGitObjects: graph.objects, externalWholeFingerprints: external.length,
    conservativeInputsPerRole: 35, sourceAndPackagingGitGhRoots: 31, sourceOnly: true,
    productNativeTestsCandidatesOrComparisons: 0, selectedRuntimeOrExternalRawGraphQualified: false }));
