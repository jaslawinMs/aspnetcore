import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const preparation = path.join(session, 'autoperf-parallelism', 'finding-F140-F141-010');
const output = path.join(session, 'autoperf-parallelism', 'finding-F140-F141-native-013');
const repository = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const policy = read(path.join(session, 'autoperf-parallelism', 'policy.json'));
assert.equal(policy.actualWorkerBuildHoldActive, false);
assert.equal(policy.workersMayBuildOrTest, true);
assert.equal(fs.existsSync(path.join(session, 'autoperf-parallelism', 'benchmark-exclusive.lease.json')), false);
for (const id of ['F140', 'F141'])
{
    assert.equal(read(path.join(session, 'autoperf-campaign.json')).candidates.find(item => item.id === id).status, 'pending');
}
assert.equal(fs.existsSync(output), false, 'Never replay a graph setup with retained state.');
const observedDefault = read(path.join(preparation, 'fresh-default-source-013.json')).data.repository;
assert.equal(observedDefault.defaultBranchRef.name, 'main');
assert.equal(observedDefault.defaultBranchRef.target.oid, '90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d');
assert.equal(observedDefault.helper.oid, '5cdf12c4b49b48e00861c18ccf942f53f6225177');
const roles = [
    { role: 'Original37', graph: String.raw`C:\src\ap-F140-o013`, revision: '37e809ead5824bc753a1c3d56f11615bdb1296c5', sdkRoot: path.join(repository, '.dotnet') },
    { role: 'Default90', graph: String.raw`C:\src\ap-F140-d013`, revision: observedDefault.defaultBranchRef.target.oid, sdkRoot: String.raw`C:\src\ap-F155-d010\.dotnet` }
];
for (const role of roles)
{
    assert.equal(fs.existsSync(role.graph), false, `Refuse to replace ${role.graph}.`);
    assert.ok(fs.existsSync(path.join(role.sdkRoot, 'dotnet.exe')));
}
fs.mkdirSync(output);
const commandFile = path.join(output, 'setup-commands.jsonl');
function git(cwd, args)
{
    const startedAt = new Date().toISOString();
    const child = spawnSync('git', ['--no-pager', '-c', 'core.longpaths=true', ...args], { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
    fs.appendFileSync(commandFile, JSON.stringify({ startedAt, endedAt: new Date().toISOString(), cwd, args, pid: child.pid, status: child.status, stdout: child.stdout, stderr: child.stderr, error: child.error?.message }) + '\n');
    assert.equal(child.status, 0, child.stderr || child.error?.message);
    return child.stdout.trim();
}
const oldGraphs = [];
for (const name of ['original', 'default'])
{
    const graph = String.raw`C:\src\autoperf-finding-F140-${name}-010`;
    oldGraphs.push({ graph, head: git(graph, ['rev-parse', 'HEAD']), trackedStatusPreserved: git(graph, ['status', '--porcelain=v1', '-uno']), actualNoCheckoutResetOrSourceEdits: true });
}
fs.writeFileSync(path.join(output, 'acceptance-before-native.json'), JSON.stringify({
    recordedAt: new Date().toISOString(),
    findingIds: ['F140', 'F141'],
    actualNativeOrBenchmarkStartedBySetup: false,
    actualCandidateApplied: false,
    oldGraphs,
    rationaleForNewShortGraphs: 'Both old source-only graphs have two unrelated tracked Validation snapshot modifications. Preserve them exactly and use independent short graphs; the cause is not established.',
    criteria: [
        'Use source-built Client.Core and real public HubConnection startup, wire handshake, serialized public sends and upload lifecycle; no extracted helper substitute.',
        'Nonstream Guid, ordinary object and collection payloads must retain exact values and absence of stream IDs through repeated real sends. Existing primitive shortcut remains a separate control.',
        'IAsyncEnumerable value-type uploads must originate from the public send/invoke path and establish exact stream IDs, items, completion and enumerator disposal.',
        'Execute the selected native tests separately on normal Original and actual default graphs. Skipped tests and each parameterized row remain explicit.',
        'Compile any common CSharp13 private consumer once, retain all compiler inputs and compare complete declared image inventories without prefix exclusions.',
        'A forced CoreCLR feature switch or a direct reflection adapter does not prove actual NativeAOT producer reachability. NativeAotTests.cs uses such a switch and must be described as simulation.',
        'No source implementation or comparisons before correctness, material workload and lifetime/TFM admission. No performance counter or native runtime execution in this setup.',
        'A future cache must preserve collectible assembly lifetimes, interface selection/order and all linked consumers/TFMs. Interface-shape Hot Reload edits are rude edits, not an invented invalidation defect.'
    ],
    actualAvailableNativeToolObservation: String.raw`vswhere reported C:\Program Files\Microsoft Visual Studio\18\Enterprise for Microsoft.VisualStudio.Component.VC.Tools.x86.x64; no native compilation has run.`,
    roles
}, null, 2) + '\n');
const completed = [];
for (const role of roles)
{
    git(repository, ['clone', '--shared', '--no-checkout', '--quiet', repository, role.graph]);
    git(role.graph, ['config', 'core.longpaths', 'true']);
    git(role.graph, ['switch', '--detach', role.revision]);
    assert.equal(git(role.graph, ['status', '--porcelain=v1', '-uno']), '');
    assert.equal(git(role.graph, ['rev-parse', 'HEAD']), role.revision);
    const link = path.join(role.graph, '.dotnet');
    assert.equal(fs.existsSync(link), false);
    fs.symlinkSync(role.sdkRoot, link, 'junction');
    const target = String.raw`src\SignalR\common\Shared\ReflectionHelper.cs`;
    assert.equal(git(role.graph, ['rev-parse', `HEAD:${target.replaceAll('\\', '/')}`]), observedDefault.helper.oid);
    const source = {
        ...role,
        helperGitBlob: observedDefault.helper.oid,
        helperSha256: sha(path.join(role.graph, target)),
        clientGitBlob: git(role.graph, ['rev-parse', 'HEAD:src/SignalR/clients/csharp/Client.Core/src/HubConnection.cs']),
        globalJsonSha256: sha(path.join(role.graph, 'global.json')),
        sdkHostSha256: sha(path.join(link, 'dotnet.exe')),
        nativeProject: String.raw`src\SignalR\clients\csharp\Client\test\UnitTests\Microsoft.AspNetCore.SignalR.Client.Tests.csproj`,
        generatedFilesProject: String.raw`eng\tools\GenerateFiles\GenerateFiles.csproj`,
        actualTrackedChangesAfterSetup: git(role.graph, ['status', '--porcelain=v1', '-uno'])
    };
    completed.push(source);
}
fs.copyFileSync(path.join(preparation, 'original-build-no-restore-013.log'), path.join(output, 'old-original-build-no-restore-013.log'));
fs.copyFileSync(path.join(preparation, 'fresh-default-source-013.json'), path.join(output, 'fresh-default-source-013.json'));
fs.copyFileSync(import.meta.filename, path.join(output, 'executed-setup-driver.mjs'));
const receipt = { recordedAt: new Date().toISOString(), roles: completed, actualSeparateSourceAndArtifactsGraphs: true, actualNewNativeCommands: 0, actualCandidates: 0, actualComparisons: 0, actualOldGraphsPreserved: true };
fs.writeFileSync(path.join(output, 'source-graphs.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
