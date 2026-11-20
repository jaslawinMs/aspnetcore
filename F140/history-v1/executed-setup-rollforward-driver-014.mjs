import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const preparation = path.join(session, 'autoperf-parallelism', 'finding-F140-F141-010');
const output = path.join(session, 'autoperf-parallelism', 'finding-F140-F141-native-013');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const policy = read(path.join(session, 'autoperf-parallelism', 'policy.json'));
assert.equal(policy.actualWorkerBuildHoldActive, false);
assert.equal(policy.workersMayBuildOrTest, true);
assert.equal(fs.existsSync(path.join(session, 'autoperf-parallelism', 'benchmark-exclusive.lease.json')), false);
assert.equal(fs.existsSync(path.join(output, 'source-graphs.json')), false);
assert.equal(fs.existsSync(path.join(output, 'setup-rollforward-014.jsonl')), false);
const acceptance = read(path.join(output, 'acceptance-before-native.json'));
const upstream = read(path.join(preparation, 'fresh-default-source-013.json')).data.repository;
const failed = fs.readFileSync(path.join(output, 'setup-commands.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
assert.equal(failed.at(-1).status, 128);
assert.match(failed.at(-1).stderr, /unable to read tree/);
assert.equal(failed.filter(item => item.status !== 0).length, 1);
fs.copyFileSync(path.join(session, 'F140-F141-native-graphs-013.mjs'), path.join(output, 'failed-setup-driver-013.mjs'));
fs.writeFileSync(path.join(output, 'setup-failure-013.json'), JSON.stringify({
    recordedAt: new Date().toISOString(),
    driverSha256: sha(path.join(output, 'failed-setup-driver-013.mjs')),
    actualFailure: failed.at(-1),
    actualOriginalCloneAndSdkJunctionAlreadyCreated: true,
    actualDefaultCloneHadNoWorkingTreeCheckout: true,
    actualNativeCommandsStarted: 0,
    actualComparisons: 0,
    recovery: 'Fetch the exact already-observed upstream commit into the existing empty private default clone and complete checkout. Do not replay the failed setup or replace original/old graphs.'
}, null, 2) + '\n');
const commandFile = path.join(output, 'setup-rollforward-014.jsonl');
function git(cwd, args)
{
    const startedAt = new Date().toISOString();
    const child = spawnSync('git', ['--no-pager', '-c', 'core.longpaths=true', ...args], { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
    fs.appendFileSync(commandFile, JSON.stringify({ startedAt, endedAt: new Date().toISOString(), cwd, args, pid: child.pid, status: child.status, stdout: child.stdout, stderr: child.stderr, error: child.error?.message }) + '\n');
    assert.equal(child.status, 0, child.stderr || child.error?.message);
    return child.stdout.trim();
}
const original = acceptance.roles.find(item => item.role === 'Original37');
const current = acceptance.roles.find(item => item.role === 'Default90');
assert.equal(git(original.graph, ['rev-parse', 'HEAD']), original.revision);
assert.equal(git(original.graph, ['status', '--porcelain=v1', '-uno']), '');
assert.ok(fs.existsSync(path.join(original.graph, '.dotnet', 'dotnet.exe')));
assert.deepEqual(fs.readdirSync(current.graph).sort(), ['.git']);
git(current.graph, ['fetch', '--no-tags', 'https://github.com/dotnet/aspnetcore.git', current.revision]);
git(current.graph, ['switch', '--detach', current.revision]);
assert.equal(git(current.graph, ['status', '--porcelain=v1', '-uno']), '');
assert.equal(fs.existsSync(path.join(current.graph, '.dotnet')), false);
fs.symlinkSync(current.sdkRoot, path.join(current.graph, '.dotnet'), 'junction');
const roles = acceptance.roles.map(role =>
{
    assert.equal(git(role.graph, ['rev-parse', 'HEAD']), role.revision);
    const helperGitBlob = git(role.graph, ['rev-parse', 'HEAD:src/SignalR/common/Shared/ReflectionHelper.cs']);
    const clientGitBlob = git(role.graph, ['rev-parse', 'HEAD:src/SignalR/clients/csharp/Client.Core/src/HubConnection.cs']);
    assert.equal(helperGitBlob, upstream.helper.oid);
    if (role.role === 'Default90')
    {
        assert.equal(clientGitBlob, upstream.client.oid);
    }
    return {
        ...role,
        helperGitBlob,
        clientGitBlob,
        helperSha256: sha(path.join(role.graph, String.raw`src\SignalR\common\Shared\ReflectionHelper.cs`)),
        globalJsonSha256: sha(path.join(role.graph, 'global.json')),
        sdkHostSha256: sha(path.join(role.graph, '.dotnet', 'dotnet.exe')),
        nativeProject: String.raw`src\SignalR\clients\csharp\Client\test\UnitTests\Microsoft.AspNetCore.SignalR.Client.Tests.csproj`,
        generatedFilesProject: String.raw`eng\tools\GenerateFiles\GenerateFiles.csproj`,
        actualTrackedChangesAfterSetup: git(role.graph, ['status', '--porcelain=v1', '-uno'])
    };
});
fs.copyFileSync(path.join(preparation, 'original-build-no-restore-013.log'), path.join(output, 'old-original-build-no-restore-013.log'));
fs.copyFileSync(path.join(preparation, 'fresh-default-source-013.json'), path.join(output, 'fresh-default-source-013.json'));
fs.copyFileSync(import.meta.filename, path.join(output, 'executed-setup-rollforward-driver-014.mjs'));
const receipt = {
    recordedAt: new Date().toISOString(),
    roles,
    actualSeparateSourceAndArtifactsGraphs: true,
    actualNewNativeCommands: 0,
    actualCandidates: 0,
    actualComparisons: 0,
    actualOldGraphsPreserved: true,
    actualFailedSetupRetained: true,
    actualSourceObservationRefreshNotPerformanceRetry: true
};
fs.writeFileSync(path.join(output, 'source-graphs.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
