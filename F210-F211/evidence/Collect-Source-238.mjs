import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitId, sha256, treeEntries } from '../../autoperf-published-results/F240-F268/source-objects.mjs';

const root = import.meta.dirname, repo = String.raw`C:\src\aspnetcore`;
function write(relative, raw)
{
    const file = path.join(root, ...relative.split(/[\\/]/));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
const jsonWrite = (relative, value) => write(relative, JSON.stringify(value, null, 2) + '\n');
const commands = [];
function execute(label, executable, args)
{
    const startedUtc = new Date().toISOString();
    const result = spawnSync(executable, args, { cwd: repo, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
    const endedUtc = new Date().toISOString(), prefix = `commands/${String(commands.length + 1).padStart(3, '0')}-${label}`;
    write(prefix + '.stdout', result.stdout ?? Buffer.alloc(0));
    write(prefix + '.stderr', result.stderr ?? Buffer.alloc(0));
    const record = { label, executable, argv: args, cwd: repo, pid: result.pid, startedUtc, endedUtc,
        exitCode: result.status, signal: result.signal, launchError: result.error?.message ?? null,
        stdout: prefix + '.stdout', stderr: prefix + '.stderr', rootWaited: true, redirectedStreamsDrained: true };
    commands.push(record);
    jsonWrite(prefix + '.json', record);
    assert.ifError(result.error);
    assert.equal(result.status, 0, (result.stderr ?? Buffer.alloc(0)).toString('utf8'));
    return result.stdout;
}
const git = (label, args) => execute(label, 'git', ['--no-pager', '-C', repo, ...args]);
const api = (label, endpoint) => JSON.parse(execute(label, 'gh', ['api', '--method', 'GET', endpoint]).toString('utf8'));
const observed = api('upstream-default-initial', 'repos/dotnet/aspnetcore/commits/main');
assert.match(observed.sha, /^[a-f0-9]{40}$/);
const original = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const before = {
    head: git('reserved-head-before', ['rev-parse', 'HEAD']).toString('utf8'),
    status: git('reserved-status-before', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
};
const input = JSON.parse(fs.readFileSync(path.join(root, '..', '..', 'autoperf-campaign.json'), 'utf8'));
jsonWrite('findings.json', input.candidates.filter(item => ['F210', 'F211'].includes(item.id)));
const paths = [
    'src/Servers/Kestrel/samples/http2cat/Program.cs',
    'src/Servers/Kestrel/samples/http2cat/http2cat.csproj',
    ...['Http2Utilities.cs', 'Http2CatOptions.cs', 'Http2CatIServiceCollectionExtensions.cs', 'Http2CatIHostBuilderExtensions.cs', 'Http2CatHostedService.cs', 'HPackHeaderWriter.cs'].map(file => 'src/Shared/Http2cat/' + file),
    'src/Shared/ServerInfrastructure/Http2/Http2PeerSettings.cs',
    'src/Shared/ServerInfrastructure/Http2/Http2FrameReader.cs',
    'src/Servers/Kestrel/samples/README.md',
    'src/Servers/Kestrel/README.md',
    'eng/Version.Details.xml',
    'Directory.Build.props',
];
const objects = new Map(), sources = [], external = [];
function object(type, sha)
{
    if (!objects.has(sha))
    {
        const raw = git('raw-' + type + '-' + sha, ['cat-file', type, sha]);
        assert.equal(gitId(type, raw), sha);
        const file = `raw-git/objects/${sha}.payload`;
        write(file, raw);
        objects.set(sha, { type, sha, file, bytes: raw.length, sha256: sha256(raw), raw });
    }
    assert.equal(objects.get(sha).type, type);
    return objects.get(sha);
}
const dependencies = [
    ['Microsoft.NETCore.App.Ref', 'src/runtime/src/libraries/System.Diagnostics.TraceSource/src/System/Diagnostics/Trace.cs'],
    ['Microsoft.NETCore.App.Ref', 'src/runtime/src/libraries/System.Private.CoreLib/src/System/Memory.cs'],
    ['Microsoft.Extensions.Hosting', 'src/runtime/src/libraries/Microsoft.Extensions.Hosting/src/HostingHostBuilderExtensions.cs'],
    ['Microsoft.Extensions.Logging.Console', 'src/runtime/src/libraries/Microsoft.Extensions.Logging/src/LoggingServiceCollectionExtensions.cs'],
    ['Microsoft.Extensions.Logging.Console', 'src/runtime/src/libraries/Microsoft.Extensions.Logging/src/LoggerFilterOptions.cs'],
    ['Microsoft.Extensions.Logging.Abstractions', 'src/runtime/src/libraries/Microsoft.Extensions.Logging.Abstractions/src/LoggerExtensions.cs'],
    ['Microsoft.Extensions.Logging.Console', 'src/runtime/src/libraries/Microsoft.Extensions.Logging.Console/src/ConsoleLogger.cs'],
    ['Microsoft.Extensions.Logging.Console', 'src/runtime/src/libraries/Microsoft.Extensions.Logging.Console/src/ConsoleLoggerExtensions.cs'],
];
for (const [role, commit] of [['Original', original], ['Default', observed.sha]])
{
    const captured = new Map();
    for (const relative of paths)
    {
        let current = object('commit', commit).raw.toString('utf8').match(/^tree ([a-f0-9]{40})$/m)[1];
        const parts = relative.split('/');
        for (const [index, part] of parts.entries())
        {
            const entry = treeEntries(object('tree', current).raw).get(part);
            assert.ok(entry, relative);
            assert.equal(entry.mode, index === parts.length - 1 ? '100644' : '40000');
            current = entry.sha;
        }
        const blob = object('blob', current), artifact = `source/${role}/${relative}`;
        write(artifact, blob.raw);
        captured.set(relative, blob.raw.toString('utf8'));
        sources.push({ finding: 'F210-F211', role, commit, path: relative, blob: current, artifact, bytes: blob.bytes, sha256: blob.sha256 });
    }
    const versions = captured.get('eng/Version.Details.xml');
    for (const [dependencyName, runtimePath] of dependencies)
    {
        const name = dependencyName.replaceAll('.', '\\.');
        const dependency = versions.match(new RegExp(`<Dependency Name="${name}" Version="([^"]+)">([\\s\\S]*?)<\\/Dependency>`));
        assert.ok(dependency, dependencyName);
        const dependencyCommit = dependency[2].match(/<Sha>([a-f0-9]{40})<\/Sha>/)[1];
        assert.match(dependency[2], /<Uri>https:\/\/github\.com\/dotnet\/dotnet<\/Uri>/);
        const metadata = api('declared-' + role + '-' + path.posix.basename(runtimePath), `repos/dotnet/dotnet/contents/${runtimePath}?ref=${dependencyCommit}`);
        assert.equal(metadata.encoding, 'base64');
        const raw = Buffer.from(metadata.content, 'base64');
        assert.equal(raw.length, metadata.size);
        assert.equal(gitId('blob', raw), metadata.sha);
        const artifact = `external/${role}/${path.posix.basename(runtimePath)}`;
        write(artifact, raw);
        external.push({ role, repository: 'dotnet/dotnet', dependencyName, declaredVersion: dependency[1],
            commit: dependencyCommit, path: runtimePath, artifact, bytes: raw.length, sha256: sha256(raw),
            gitBlob: metadata.sha, actualLoadedRuntimeObserved: false,
            boundary: 'Whole implementation at declared dependency tree; not external commit/tree archive, evaluated compiler/TRACE flags, exact selected transitive package or loaded CLR/logger evidence.' });
    }
}
git('bounded-target-history', ['log', '-8', '--format=%H%n%aI%n%s', '--follow', observed.sha, '--', paths[0]]);
git('bounded-target-last-diff', ['log', '-1', '--format=fuller', '-p', observed.sha, '--', paths[0]]);
execute('bounded-related-pr-search', 'gh', ['search', 'prs', '--repo', 'dotnet/aspnetcore', '--limit', '10', '--json', 'number,title,url,state', 'http2cat logging']);
const final = api('upstream-default-final', 'repos/dotnet/aspnetcore/commits/main');
const after = {
    head: git('reserved-head-after', ['rev-parse', 'HEAD']).toString('utf8'),
    status: git('reserved-status-after', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
};
assert.deepEqual(after, before);
jsonWrite('source-roles.json', { Original: original, observedDefault: observed.sha, finalObservedDefault: final.sha,
    defaultMoved: final.sha !== observed.sha, noRefOrWorktreeChanges: true });
jsonWrite('source-membership.json', { objects: [...objects.values()].map(({ raw, ...item }) => item), sources });
jsonWrite('external-source.json', external);
jsonWrite('COMMANDS.json', commands);
jsonWrite('owned-terminal.json', { sourceCommands: commands.length, completedWaitedDrained: commands.length,
    nativeBuildTestRestoreServerRuntimeProbeStarts: 0, benchmarkTimingAllocationCounterProfilerStarts: 0,
    repositoryChanges: [], privateGraphsCreated: [], processStops: 0,
    boundary: 'Only synchronous Git/GitHub source reads; no unrelated process/machine-dedication or universal descendant claim.' });
console.log(JSON.stringify({ completeSourceMemberships: sources.length, rawGitObjects: objects.size,
    completeDeclaredDependencySources: external.length, sourceCommands: commands.length, nativeStarts: 0 }));
