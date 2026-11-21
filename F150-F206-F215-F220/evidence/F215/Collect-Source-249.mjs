import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitId, sha256, treeEntries, verifyMembership } from '../../autoperf-published-results/F240-F268/source-objects.mjs';

const root = import.meta.dirname, parallel = path.dirname(root), session = path.dirname(parallel);
const repo = String.raw`C:\src\aspnetcore`, prior = path.join(session, 'autoperf-published-results', 'F212-F217-F218-F221');
function write(relative, raw)
{
    const file = path.resolve(root, ...relative.split(/[\\/]/));
    assert.ok(file.startsWith(root + path.sep));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
const jsonWrite = (relative, value) => write(relative, JSON.stringify(value, null, 2) + '\n');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const priorIndex = read(path.join(prior, 'source-membership.json')), oldExternal = read(path.join(prior, 'external-source.json'));
const priorVerified = verifyMembership(prior, priorIndex);
const reusable = new Map(priorIndex.objects.map(item => [item.sha, item]));
const commands = [];
function execute(label, executable, args)
{
    const startedUtc = new Date().toISOString();
    const result = spawnSync(executable, args, { cwd: repo, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
    const prefix = 'commands/' + String(commands.length + 1).padStart(3, '0') + '-' + label;
    write(prefix + '.stdout', result.stdout ?? Buffer.alloc(0));
    write(prefix + '.stderr', result.stderr ?? Buffer.alloc(0));
    const record = { label, executable, argv: args, cwd: repo, pid: result.pid, startedUtc, endedUtc: new Date().toISOString(),
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
const policyRaw = fs.readFileSync(path.join(parallel, 'policy.json')), policy = JSON.parse(policyRaw);
assert.deepEqual(Object.keys(policy.independentFindingPreparationWorkers).sort(), ['F150', 'F206', 'F209', 'F220']);
jsonWrite('policy-observation.json', { observedUtc: new Date().toISOString(), policySha256: sha256(policyRaw),
    actualRegisteredOwners: policy.independentFindingPreparationWorkers, actualScopes: policy.activeWorkerPreparationScopes,
    leaseExists: fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')),
    HOLD: policy.actualWorkerBuildHoldActive, quiesced: policy.buildAndTestWorkQuiesced,
    boundary: 'Point read-only source observation only, not native product/timing admission or perpetual registry/idleness.' });
const observed = api('upstream-default-initial', 'repos/dotnet/aspnetcore/commits/main');
assert.match(observed.sha, /^[a-f0-9]{40}$/);
const original = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const before = {
    head: git('reserved-head-before', ['rev-parse', 'HEAD']).toString('utf8'),
    status: git('reserved-status-before', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
};
jsonWrite('finding.json', read(path.join(session, 'autoperf-campaign.json')).candidates.filter(item => item.id === 'F215'));
const base = 'src/Components/Testing/';
const paths = [
    base + 'gen/ServiceOverrideCallsite.cs', base + 'gen/StartupHookGenerator.cs',
    base + 'gen/Microsoft.AspNetCore.Components.Testing.Generators.csproj',
    ...['ServerStartOptions.cs', 'IE2EServiceOverrideResolver.cs', 'TestReadinessHostingStartup.cs',
        'TestServiceOverrideObserver.cs', 'ServerInstance.cs'].map(file => base + 'src/Infrastructure/' + file),
    base + 'test/Generators/StartupHookGeneratorTests.cs',
    base + 'test/Microsoft.AspNetCore.Components.Testing.Tests.csproj',
    base + 'src/Microsoft.AspNetCore.Components.Testing.csproj',
    base + 'testassets/Directory.Build.props',
    base + 'testassets/TestApp.E2E.Tests/TestApp.E2E.Tests.csproj',
    base + 'testassets/TestApp.E2E.Tests/Tests/WeatherServiceOverrideTests.cs',
    base + 'testassets/TestApp.E2E.Tests/ServiceOverrides/TestOverrides.cs',
    base + 'testassets/TestApp.E2E.Tests/Tests/AsyncStateTests.cs',
    'eng/Version.Details.xml', 'docs/BlazorComponentsGuidance.md', 'docs/BuildFromSource.md',
];
const objects = new Map(), sources = [], external = [], reuse = [];
function object(type, sha)
{
    if (!objects.has(sha))
    {
        const old = reusable.get(sha);
        const raw = old ? fs.readFileSync(path.join(prior, ...old.file.split('/'))) :
            git('raw-' + type + '-' + sha, ['cat-file', type, sha]);
        assert.equal(gitId(type, raw), sha);
        if (old)
        {
            assert.equal(old.type, type);
            assert.equal(raw.length, old.bytes);
            assert.equal(sha256(raw), old.sha256);
            reuse.push({ sha, type, previousFile: old.file, bytes: raw.length, sha256: old.sha256 });
        }
        const file = `raw-git/objects/${sha}.payload`;
        write(file, raw);
        objects.set(sha, { type, sha, file, bytes: raw.length, sha256: sha256(raw), raw });
    }
    assert.equal(objects.get(sha).type, type);
    return objects.get(sha);
}
for (const [role, commit] of [['Original', original], ['Default', observed.sha]])
{
    let versions;
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
        sources.push({ finding: 'F215', role, commit, path: relative, blob: current, artifact, bytes: blob.bytes, sha256: blob.sha256 });
        if (relative === 'eng/Version.Details.xml')
        {
            versions = blob.raw.toString('utf8');
        }
    }
    const dependency = versions.match(/<Dependency Name="Microsoft\.NETCore\.App\.Ref" Version="([^"]+)">([\s\S]*?)<\/Dependency>/);
    assert.ok(dependency);
    const dependencyCommit = dependency[2].match(/<Sha>([a-f0-9]{40})<\/Sha>/)[1];
    for (const [name, runtimePath] of [
        ['HashSet.cs', 'src/runtime/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/HashSet.cs'],
        ['Distinct.cs', 'src/runtime/src/libraries/System.Linq/src/System/Linq/Distinct.cs'],
    ])
    {
        const old = oldExternal.find(item => item.finding === 'F218' && item.role === role &&
            item.commit === dependencyCommit && item.path === runtimePath);
        const metadata = old ? null : api('declared-' + role + '-' + name.replace('.', '-'),
            `repos/dotnet/dotnet/contents/${runtimePath}?ref=${dependencyCommit}`);
        const raw = old ? fs.readFileSync(path.join(prior, ...old.artifact.split('/'))) : Buffer.from(metadata.content, 'base64');
        const blob = old ? old.gitBlob : metadata.sha;
        assert.equal(gitId('blob', raw), blob);
        if (old)
        {
            assert.equal(raw.length, old.bytes);
            assert.equal(sha256(raw), old.sha256);
        }
        else
        {
            assert.equal(metadata.encoding, 'base64');
            assert.equal(raw.length, metadata.size);
        }
        const artifact = `external/${role}/${name}`;
        write(artifact, raw);
        external.push({ role, repository: 'dotnet/dotnet', dependencyName: 'Microsoft.NETCore.App.Ref',
            declaredVersion: dependency[1], commit: dependencyCommit, path: runtimePath,
            artifact, bytes: raw.length, sha256: sha256(raw), gitBlob: blob, actualLoadedRuntimeObserved: false,
            exactQualifiedPreviousCaptureReused: Boolean(old),
            boundary: 'Whole implementation at declared dependency, not full external Git tree/archive or selected compiler-host/netstandard execution runtime. No hash/probe/count/performance result.' });
    }
}
git('bounded-target-history', ['log', '-8', '--format=%H%n%aI%n%s', '--follow', observed.sha, '--', paths[0]]);
git('bounded-target-last-diff', ['log', '-1', '--format=fuller', '-p', observed.sha, '--', paths[0]]);
execute('bounded-related-pr-search', 'gh', ['search', 'prs', '--repo', 'dotnet/aspnetcore', '--limit', '8',
    '--json', 'number,title,url,state', 'ServiceOverrideCallsite']);
const final = api('upstream-default-final', 'repos/dotnet/aspnetcore/commits/main');
const after = {
    head: git('reserved-head-after', ['rev-parse', 'HEAD']).toString('utf8'),
    status: git('reserved-status-after', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
};
assert.deepEqual(after, before);
jsonWrite('source-roles.json', { Original: original, observedDefault: observed.sha, finalObservedDefault: final.sha,
    defaultMoved: observed.sha !== final.sha, before, after, noReservedChanges: true });
jsonWrite('raw-object-reuse.json', { previousCapsule: 'F212-F217-F218-F221',
    previousEvidenceCommit: '2b055a41e3479aaba66f2bb748be971c149de7f3', previousArchiveRevalidated: priorVerified, reused: reuse,
    boundary: 'Exact raw-object reuse only; F221 outcome explicitly excluded this separate F215 hash site. No reused native/performance acceptance.' });
jsonWrite('source-membership.json', { objects: [...objects.values()].map(({ raw, ...item }) => item), sources });
jsonWrite('external-source.json', external);
jsonWrite('COMMANDS.json', commands);
jsonWrite('owned-terminal.json', { sourceCommands: commands.length, completedWaitedDrained: commands.length,
    nativeProductBuildTestRestoreServerRuntimeProbeStarts: 0, candidateEdits: 0, privateGraphsCreated: [],
    benchmarkWarmupTimingAllocationCounterProfilerStarts: 0, reservedChanges: [], processStops: 0,
    boundary: 'Actual direct synchronous git/gh utility roots only; no universal descendant/machine-idleness or selected compiler/runtime claim.' });
const verified = verifyMembership(root, read(path.join(root, 'source-membership.json')));
console.log(JSON.stringify({ completeSourceMemberships: verified.memberships, rawGitObjects: verified.objects,
    exactPriorRawObjectsReused: reuse.length, wholeDeclaredDependencySources: external.length,
    sourceCommands: commands.length, nativeProductOrComparisonStarts: 0 }));
