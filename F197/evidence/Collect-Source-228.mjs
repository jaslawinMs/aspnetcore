import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitId, sha256, treeEntries } from '../../autoperf-published-results/F240-F268/source-objects.mjs';

const root = import.meta.dirname;
const repo = String.raw`C:\src\aspnetcore`;
function write(relative, data)
{
    const file = path.join(root, ...relative.split(/[\\/]/));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data, { flag: 'wx' });
}
const jsonWrite = (relative, value) => write(relative, JSON.stringify(value, null, 2) + '\n');
const commands = [];
function execute(label, executable, args, maxBuffer = 8 * 1024 * 1024)
{
    const startedUtc = new Date().toISOString();
    const result = spawnSync(executable, args, { cwd: repo, windowsHide: true, maxBuffer });
    const endedUtc = new Date().toISOString();
    const prefix = `commands/${String(commands.length + 1).padStart(3, '0')}-${label}`;
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
const observed = JSON.parse(execute('upstream-default-initial', 'gh', ['api', '--method', 'GET', 'repos/dotnet/aspnetcore/commits/main']).toString('utf8'));
assert.match(observed.sha, /^[a-f0-9]{40}$/);
const original = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const before = {
    head: git('reserved-head-before', ['rev-parse', 'HEAD']).toString('utf8'),
    status: git('reserved-status-before', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
};
const input = JSON.parse(fs.readFileSync(path.join(root, '..', '..', 'autoperf-campaign.json'), 'utf8'));
jsonWrite('finding.json', input.candidates.find(item => item.id === 'F197'));
const paths = [
    'src/ProjectTemplates/test/Templates.Tests/BaselineTest.cs',
    'src/ProjectTemplates/test/Templates.Tests/template-baselines.json',
    'src/ProjectTemplates/test/Templates.Tests/Templates.Tests.csproj',
    'src/ProjectTemplates/Shared/ProjectFactoryFixture.cs',
    'src/ProjectTemplates/Shared/Project.cs',
    'src/ProjectTemplates/Shared/TemplatePackageInstaller.cs',
    'src/ProjectTemplates/TestInfrastructure/PrepareForTest.targets',
    'src/ProjectTemplates/README.md',
    'src/ProjectTemplates/build.cmd',
];
const objects = new Map(), sources = [], facts = [];
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
        const blob = object('blob', current);
        const artifact = `source/${role}/${relative}`;
        write(artifact, blob.raw);
        captured.set(relative, blob.raw.toString('utf8'));
        sources.push({ finding: 'F197', role, commit, path: relative, blob: current, artifact, bytes: blob.bytes, sha256: blob.sha256 });
    }
    const target = captured.get(paths[0]);
    const site = 'var filesInFolder = Directory.EnumerateFiles(Project.TemplateOutputDir, "*", SearchOption.AllDirectories).ToArray();';
    assert.equal(target.split(site).length, 2);
    assert.ok(target.indexOf('await Project.RunDotNetNewRawAsync(arguments);') < target.indexOf(site));
    assert.ok(target.indexOf('foreach (var file in filesInFolder)') > target.indexOf(site));
    assert.ok(target.includes('Assert.Contains(relativePath, expectedFiles);'));
    const definitions = JSON.parse(captured.get(paths[1]));
    const cases = Object.entries(definitions).flatMap(([template, scenarios]) => Object.entries(scenarios).map(([scenario, value]) =>
    {
        assert.equal(typeof value.Arguments, 'string');
        assert.ok(Array.isArray(value.Files) && value.Files.every(item => typeof item === 'string'));
        return { template, scenario, arguments: value.Arguments, expectedNamesCount: value.Files.length };
    }));
    facts.push({ role, commit, retainedSourceSiteLine: target.slice(0, target.indexOf(site)).split('\n').length,
        site, cases, caseCount: cases.length, expectedNameCountMin: Math.min(...cases.map(item => item.expectedNamesCount)),
        expectedNameCountMax: Math.max(...cases.map(item => item.expectedNamesCount)),
        actualGeneratedFileCountsObserved: false, actualDirectoryEnumerationOrRuntimeTypesObserved: false,
        nativeProjectOrDotnetNewExecuted: false,
        typedDataArrayIsNotRetainedSite: true, expectedFilesIsReusedAndNotRetainedSite: true });
}
git('bounded-target-history', ['log', '-8', '--format=%H%n%aI%n%s%n%b', '--follow', observed.sha, '--', paths[0]]);
git('bounded-target-last-diff', ['log', '-1', '--format=fuller', '-p', observed.sha, '--', paths[0]]);
execute('bounded-related-pr-search', 'gh', ['search', 'prs', '--repo', 'dotnet/aspnetcore', '--limit', '10', '--json', 'number,title,url,state', 'BaselineTest ToArray']);
const final = JSON.parse(execute('upstream-default-final', 'gh', ['api', '--method', 'GET', 'repos/dotnet/aspnetcore/commits/main']).toString('utf8'));
const after = {
    head: git('reserved-head-after', ['rev-parse', 'HEAD']).toString('utf8'),
    status: git('reserved-status-after', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
};
assert.deepEqual(after, before);
jsonWrite('source-roles.json', { Original: original, observedDefault: observed.sha, finalObservedDefault: final.sha,
    defaultMoved: final.sha !== observed.sha, noRefOrWorktreeChanges: true, noGeneratedApplicationClaim: true });
jsonWrite('source-facts.json', facts);
jsonWrite('source-membership.json', { objects: [...objects.values()].map(({ raw, ...item }) => item), sources });
jsonWrite('COMMANDS.json', commands);
jsonWrite('owned-terminal.json', { sourceCommands: commands.length, completedWaitedDrained: commands.length,
    nativeBuildTestRestoreStarts: 0, benchmarkTimingAllocationCounterProfilerStarts: 0,
    repositoryChanges: [], privateGraphsCreated: [], processStops: 0,
    boundary: 'Only synchronous Git/GitHub source reads; no unrelated process or machine-wide quiescence claim.' });
console.log(JSON.stringify({ sources: sources.length, rawGitObjects: objects.size, sourceCommands: commands.length,
    roles: facts.map(({ cases, ...item }) => item), nativeStarts: 0 }));
