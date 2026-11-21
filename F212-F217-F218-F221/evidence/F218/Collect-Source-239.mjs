import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitId, sha256, treeEntries, verifyMembership } from '../../autoperf-published-results/F240-F268/source-objects.mjs';

const root = import.meta.dirname, repo = String.raw`C:\src\aspnetcore`, session = path.resolve(root, '..', '..');
function write(relative, raw)
{
    const file = path.resolve(root, ...relative.split(/[\\/]/));
    assert.ok(file.startsWith(root + path.sep));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
const jsonWrite = (relative, value) => write(relative, JSON.stringify(value, null, 2) + '\n');
const commands = [];
function execute(label, executable, args)
{
    const startedUtc = new Date().toISOString();
    const result = spawnSync(executable, args, { cwd: repo, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
    const prefix = `commands/${String(commands.length + 1).padStart(3, '0')}-${label}`;
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
function policyObservation(label)
{
    const raw = fs.readFileSync(path.join(root, '..', 'policy.json'));
    const policy = JSON.parse(raw);
    const registry = policy.independentFindingPreparationWorkers;
    assert.deepEqual(Object.keys(registry).sort(), ['F209', 'F212', 'F217', 'F221']);
    jsonWrite(label + '.json', { observedUtc: new Date().toISOString(), policySha256: sha256(raw),
        actualRegisteredOwners: registry, actualScopes: policy.activeWorkerPreparationScopes,
        leaseExists: fs.existsSync(path.join(root, '..', 'benchmark-exclusive.lease.json')),
        actualWorkerBuildHoldActive: policy.actualWorkerBuildHoldActive,
        buildAndTestWorkQuiesced: policy.buildAndTestWorkQuiesced,
        boundary: 'Point source observation, not native admission, permanent quiescence or a registry retirement.' });
}
policyObservation('policy-before');
const previous = path.join(session, 'autoperf-published-results', 'F205-F207');
const previousIndexRaw = fs.readFileSync(path.join(previous, 'source-membership.json'));
const previousIndex = JSON.parse(previousIndexRaw);
const previousAudit = verifyMembership(previous, previousIndex);
const reusable = new Map(previousIndex.objects.map(item => [item.sha, item]));
const observed = api('upstream-default-initial', 'repos/dotnet/aspnetcore/commits/main');
assert.match(observed.sha, /^[a-f0-9]{40}$/);
const original = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const before = {
    head: git('reserved-head-before', ['rev-parse', 'HEAD']).toString('utf8'),
    status: git('reserved-status-before', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
};
const input = JSON.parse(fs.readFileSync(path.join(session, 'autoperf-campaign.json'), 'utf8'));
jsonWrite('finding.json', input.candidates.filter(item => item.id === 'F218'));
const paths = [
    ...['ComponentApplicationBuilder.cs', 'IRazorComponentApplication.cs', 'AssemblyComponentLibraryDescriptor.cs',
        'PageCollectionBuilder.cs', 'ComponentCollectionBuilder.cs'].map(file => 'src/Components/Endpoints/src/Discovery/' + file),
    ...['RazorComponentEndpointDataSourceFactory.cs', 'RazorComponentEndpointDataSource.cs',
        'RazorComponentsEndpointConventionBuilderExtensions.cs', 'RazorComponentsEndpointRouteBuilderExtensions.cs']
        .map(file => 'src/Components/Endpoints/src/Builder/' + file),
    'src/Components/Endpoints/src/DependencyInjection/HotReloadService.cs',
    'src/Components/Endpoints/test/Discovery/ComponentApplicationBuilderTests.cs',
    'src/Components/Endpoints/test/HotReloadServiceTests.cs',
    'src/Components/Samples/BlazorWebAppGlobal/Program.cs',
    'src/Components/Samples/BlazorWebAppPerPage/Program.cs',
    'eng/Version.Details.xml',
    'docs/BlazorComponentsGuidance.md',
    'docs/BuildFromSource.md',
];
const objects = new Map(), sources = [], external = [], reuse = [];
function object(type, sha)
{
    if (!objects.has(sha))
    {
        const old = reusable.get(sha);
        const raw = old ? fs.readFileSync(path.join(previous, ...old.file.split('/'))) :
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
        if (relative === 'eng/Version.Details.xml')
        {
            versions = blob.raw.toString('utf8');
        }
        sources.push({ finding: 'F218', role, commit, path: relative, blob: current, artifact, bytes: blob.bytes, sha256: blob.sha256 });
    }
    const dependency = versions.match(/<Dependency Name="Microsoft\.NETCore\.App\.Ref" Version="([^"]+)">([\s\S]*?)<\/Dependency>/);
    assert.ok(dependency);
    const dependencyCommit = dependency[2].match(/<Sha>([a-f0-9]{40})<\/Sha>/)[1];
    assert.match(dependency[2], /<Uri>https:\/\/github\.com\/dotnet\/dotnet<\/Uri>/);
    const runtimePath = 'src/runtime/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/HashSet.cs';
    const metadata = api('declared-' + role + '-HashSet', `repos/dotnet/dotnet/contents/${runtimePath}?ref=${dependencyCommit}`);
    assert.equal(metadata.encoding, 'base64');
    const raw = Buffer.from(metadata.content, 'base64');
    assert.equal(raw.length, metadata.size);
    assert.equal(gitId('blob', raw), metadata.sha);
    const artifact = `external/${role}/HashSet.cs`;
    write(artifact, raw);
    external.push({ role, repository: 'dotnet/dotnet', dependencyName: 'Microsoft.NETCore.App.Ref',
        declaredVersion: dependency[1], commit: dependencyCommit, path: runtimePath,
        artifact, bytes: raw.length, sha256: sha256(raw), gitBlob: metadata.sha, actualLoadedRuntimeObserved: false,
        boundary: 'Whole implementation at declared dependency revision, not external raw commit/tree archive, selected runtime/package/reference/IL or actual runtime operation count.' });
}
git('bounded-target-history', ['log', '-8', '--format=%H%n%aI%n%s', '--follow', observed.sha, '--', paths[0]]);
git('bounded-target-last-diff', ['log', '-1', '--format=fuller', '-p', observed.sha, '--', paths[0]]);
execute('bounded-related-pr-search', 'gh', ['search', 'prs', '--repo', 'dotnet/aspnetcore', '--limit', '8', '--json', 'number,title,url,state', 'ComponentApplicationBuilder']);
const final = api('upstream-default-final', 'repos/dotnet/aspnetcore/commits/main');
const after = {
    head: git('reserved-head-after', ['rev-parse', 'HEAD']).toString('utf8'),
    status: git('reserved-status-after', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
};
assert.deepEqual(after, before);
jsonWrite('raw-object-reuse.json', { previousCapsule: 'F205-F207',
    previousEvidenceCommit: '0eec2d36c5582aedd51d832fbe96f46f9460193c', previousSourceIndexSha256: sha256(previousIndexRaw),
    previousArchiveRevalidated: previousAudit, reused: reuse,
    boundary: 'Exact immutable raw object reuse only. Fresh Default observed independently; no repeated F205 analysis, old incident/compliance reset, native qualification or admission.' });
jsonWrite('source-roles.json', { Original: original, observedDefault: observed.sha, finalObservedDefault: final.sha,
    defaultMoved: final.sha !== observed.sha, before, after, noRefOrWorktreeChanges: true });
jsonWrite('source-membership.json', { objects: [...objects.values()].map(({ raw, ...item }) => item), sources });
jsonWrite('external-source.json', external);
jsonWrite('COMMANDS.json', commands);
policyObservation('policy-after');
jsonWrite('owned-terminal.json', { sourceCommands: commands.length, completedWaitedDrained: commands.length,
    nativeBuildTestRestoreServerRuntimeProbeStarts: 0, benchmarkTimingAllocationCounterProfilerStarts: 0,
    repositoryChanges: [], privateGraphsCreated: [], processStops: 0,
    boundary: 'Only synchronous Git/GitHub source reads and local immutable artifact hashing/copy; no unrelated process/machine-dedication or universal descendant claim.' });
console.log(JSON.stringify({ completeSourceMemberships: sources.length, rawGitObjects: objects.size,
    exactPriorRawObjectsReused: reuse.length, completeDeclaredDependencySources: external.length,
    sourceCommands: commands.length, nativeStarts: 0 }));
