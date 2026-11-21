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
function checked(relative, bytes, hash)
{
    const raw = content(relative);
    assert.equal(raw.length, bytes, relative);
    assert.equal(sha256(raw), hash.toUpperCase(), relative);
    return raw;
}
const evidence = json('evidence-index.json');
assert.equal(new Set(evidence.files.map(item => item.file)).size, evidence.files.length);
for (const item of evidence.files)
{
    checked(item.file, item.bytes, item.sha256);
}
const handoff = json('evidence/HANDOFF.json');
const index = json('evidence/HASHES.json');
assert.equal(sha256(content('evidence/HASHES.json')), handoff.indexSha256);
for (const item of index.files)
{
    checked('evidence/' + item.path, item.bytes, item.sha256);
}
assert.equal(index.files.length + 2, evidence.files.length);
assert.equal(handoff.decision, 'bounded-source-only-no-material-candidate');
assert.equal(handoff.nativeStarts, 0);
assert.equal(handoff.comparisonsAuthorized, 0);
const original = json('evidence/source-membership.json');
const sourceIndex = json('evidence/source-completion-230.json');
assert.deepEqual(sourceIndex.sources.slice(0, 14), original.sources);
assert.deepEqual(sourceIndex.objects.slice(0, original.objects.length), original.objects);
verifyMembership(path.join(root, 'evidence'), original);
const objects = verifyMembership(path.join(root, 'evidence'), sourceIndex);
assert.equal(sourceIndex.sources.length, 16);
for (const item of sourceIndex.sources)
{
    const raw = checked('evidence/' + item.artifact, item.bytes, item.sha256);
    assert.equal(gitId('blob', raw), item.blob);
}
for (const role of ['Original', 'Default'])
{
    const base = `evidence/source/${role}/src/Servers/Kestrel/Core/src/Internal/Infrastructure/`;
    const target = content(base + 'TransportConnectionManager.cs').toString('utf8');
    assert.equal(target.split('Task.WhenAll(abortTasks.ToArray())').length, 2);
    assert.ok(target.includes('var abortTasks = new List<Task>();'));
    assert.ok(target.includes('abortTasks.Add(connection.ExecutionTask);'));
    assert.ok(target.includes('Task.WhenAny(allAbortedTask, Task.Delay(1000))'));
    const producer = content(base + 'TransportManager.cs').toString('utf8');
    assert.ok(producer.includes('if (!await transport.TransportConnectionManager.CloseAllConnectionsAsync(cancellationToken)'));
    assert.ok(producer.includes('await transport.TransportConnectionManager.AbortAllConnectionsAsync()'));
    assert.ok(producer.includes('public Task StopEndpointsAsync('));
    assert.ok(content(base + 'ConnectionManager.cs').toString('utf8').includes('connection.Complete();'));
    const external = json('evidence/external-source.json').find(item => item.role === role);
    assert.equal(external.actualLoadedRuntimeObserved, false);
    assert.equal(external.commit, role === 'Original' ? 'dfd6ac738610ea05f42e704be82b386e71052e12' : '4f30608f5e5220a5671e61f4bd5dece130657f47');
    const runtime = checked('evidence/' + external.artifact, external.bytes, external.sha256);
    assert.equal(gitId('blob', runtime), external.gitBlob);
    assert.equal(external.gitBlob, '575a9a2051d65c09236c83bafdd8485e446ab062');
    assert.ok(runtime.toString('utf8').includes('return WhenAll(CollectionsMarshal.AsSpan(taskList));'));
    const versions = content(`evidence/source/${role}/eng/Version.Details.xml`).toString('utf8');
    const dependency = versions.match(/<Dependency Name="Microsoft\.NETCore\.App\.Ref" Version="([^"]+)">([\s\S]*?)<\/Dependency>/);
    assert.equal(dependency[1], external.declaredVersion);
    assert.ok(dependency[2].includes('<Sha>' + external.commit + '</Sha>'));
}
const commands = [...json('evidence/COMMANDS.json'), ...json('evidence/completion-230-commands.json')];
assert.equal(commands.length, 40);
assert.ok(commands.every(item => item.exitCode === 0 && item.rootWaited === true && item.redirectedStreamsDrained === true));
const terminal = json('evidence/owned-terminal.json');
assert.equal(terminal.sourceCommands, 39);
assert.equal(terminal.completedWaitedDrained, 39);
assert.equal(terminal.nativeBuildTestRestoreStarts, 0);
assert.equal(terminal.benchmarkTimingAllocationCounterProfilerStarts, 0);
assert.deepEqual(terminal.repositoryChanges, []);
assert.deepEqual(terminal.privateGraphsCreated, []);
if (fs.existsSync(path.join(root, 'capsule-file-hashes.json')) || process.argv.includes('--require-seal'))
{
    const seal = json('capsule-file-hashes.json');
    for (const item of seal.files)
    {
        checked(item.file, item.bytes, item.sha256);
    }
    function files(directory, relative = '')
    {
        return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
        {
            assert.equal(entry.isSymbolicLink(), false);
            const logical = relative ? relative + '/' + entry.name : entry.name;
            return entry.isDirectory() ? files(path.join(directory, entry.name), logical) : [logical];
        });
    }
    assert.deepEqual(files(root).filter(item => !['capsule-file-hashes.json', 'publication.json'].includes(item)).sort(),
        seal.files.map(item => item.file).sort());
}
console.log(JSON.stringify({ finding: 'F199', completeCopiedEvidenceFiles: evidence.files.length,
    sourceMemberships: objects.memberships, rawGitObjects: objects.objects, completeExternalTaskBlobs: 2,
    sourceCommandsTerminal: commands.length, actualLoadedRuntimeObserved: false,
    candidateChanges: 0, nativeBuildsTestsServerProbesOrComparisons: 0, sourceOnly: true }));
