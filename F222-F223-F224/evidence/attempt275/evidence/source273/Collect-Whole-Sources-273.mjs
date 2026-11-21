import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitId, sha256, treeEntries, verifyMembership } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const root = import.meta.dirname, parallel = path.dirname(root), session = path.dirname(parallel);
const repo = String.raw`C:\src\aspnetcore`, original = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const externalCommit = 'cac8b688c193c0f244a0bedf3bb60feeb32d377a';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
function write(file, raw)
{
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
const jsonWrite = (file, value) => write(path.join(root, file), JSON.stringify(value, null, 2) + '\n');
const commands = [];
function guard()
{
    const raw = fs.readFileSync(path.join(parallel, 'policy.json')), policy = JSON.parse(raw);
    assert.deepEqual(Object.keys(policy.independentFindingPreparationWorkers).sort(), ['F209', 'F231', 'F234', 'F239']);
    assert.equal(policy.actualWorkerBuildHoldActive, false);
    assert.equal(policy.buildAndTestWorkQuiesced, false);
    assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
    return { observedUtc: new Date().toISOString(), policySha256: sha256(raw),
        owners: policy.independentFindingPreparationWorkers, leaseAbsent: true, HOLD: false, quiesced: false,
        boundary: 'Coordinator source preparation point only, not product/timing or machine-idleness admission.' };
}
function native(executable, label, argv, input, allowed = [0])
{
    assert.ok(commands.length < 32);
    const observation = guard(), startedUtc = new Date().toISOString();
    const args = executable === 'git' ? ['--no-pager', '-C', repo, ...argv] : argv;
    const result = spawnSync(executable, args, { cwd: repo, input, windowsHide: true, timeout: 90000,
        maxBuffer: 64 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0',
            GIT_TERMINAL_PROMPT: '0', GIT_PAGER: '', GH_PROMPT_DISABLED: '1' } });
    const prefix = 'commands/' + String(commands.length + 1).padStart(3, '0') + '-' + label;
    write(path.join(root, prefix + '.stdout'), result.stdout ?? Buffer.alloc(0));
    write(path.join(root, prefix + '.stderr'), result.stderr ?? Buffer.alloc(0));
    if (input) write(path.join(root, prefix + '.stdin'), input);
    const record = { executable, argv: args, label, cwd: repo, pid: result.pid, observation, startedUtc,
        endedUtc: new Date().toISOString(), exitCode: result.status, error: result.error?.message ?? null,
        stdout: prefix + '.stdout', stderr: prefix + '.stderr', stdin: input ? prefix + '.stdin' : null,
        allowedSourceExitCodes: allowed, rootWaited: result.status !== null && !result.error,
        bothRawStreamsReturned: !result.error, rootCreationAndUniversalDescendantCensusNotClaimed: true };
    commands.push(record);
    jsonWrite(prefix + '.json', record);
    assert.ifError(result.error);
    assert.ok(allowed.includes(result.status), (result.stderr ?? Buffer.alloc(0)).toString('utf8'));
    return result.stdout;
}
const git = (label, argv, input, allowed) => native('git', label, argv, input, allowed);
const gh = (label, endpoint) => native('gh', label, ['api', '--method', 'GET', endpoint]);
const before = {
    head: git('reserved-head-before', ['rev-parse', 'HEAD']).toString('utf8'),
    status: git('reserved-status-before', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
    globalSha256: sha256(fs.readFileSync(path.join(repo, 'global.json'))),
};
const metadata = JSON.parse(gh('upstream-repository', 'repos/dotnet/aspnetcore').toString('utf8'));
const branch = JSON.parse(gh('upstream-default-immutable', 'repos/dotnet/aspnetcore/branches/' + encodeURIComponent(metadata.default_branch)).toString('utf8'));
const current = branch.commit.sha;
assert.match(current, /^[a-f0-9]{40}$/);
jsonWrite('roles.json', { Original: original, Default: current, defaultBranch: metadata.default_branch,
    observedUtc: new Date().toISOString(), reservedNavigationNotDefault: true });
const targets = [
    ['Common', 'eng/Versions.props'],
    ['F222', 'src/DataProtection/DataProtection/test/Microsoft.AspNetCore.DataProtection.Tests/XmlAssert.cs'],
    ['F222', 'src/DataProtection/DataProtection/test/Microsoft.AspNetCore.DataProtection.Tests/Repositories/EphemeralXmlRepositoryTests.cs'],
    ['F222', 'src/DataProtection/DataProtection/src/Repositories/EphemeralXmlRepository.cs'],
    ['F222', 'src/DataProtection/DataProtection/test/Microsoft.AspNetCore.DataProtection.Tests/Microsoft.AspNetCore.DataProtection.Tests.csproj'],
    ['F223-F224', 'src/Analyzers/Microsoft.AspNetCore.Analyzer.Testing/src/DiagnosticAnalyzerRunner.cs'],
    ['F223-F224', 'src/Analyzers/Microsoft.AspNetCore.Analyzer.Testing/src/DiagnosticProject.cs'],
    ['F223-F224', 'src/Analyzers/Microsoft.AspNetCore.Analyzer.Testing/src/Microsoft.AspNetCore.Analyzer.Testing.csproj'],
    ['F223-F224', 'src/Components/Analyzers/test/ComponentAnalyzerDiagnosticAnalyzerRunner.cs'],
    ['F223-F224', 'src/Components/Analyzers/test/ComponentInternalUsageDiagnosticsAnalyzerTest.cs'],
    ['F223-F224', 'src/Components/Analyzers/src/ComponentInternalUsageDiagnosticAnalzyer.cs'],
    ['F223-F224', 'src/Components/Analyzers/src/InternalUsageAnalyzer.cs'],
    ['F223-F224', 'src/Components/Analyzers/src/DiagnosticDescriptors.cs'],
    ['F223-F224', 'src/Tools/SDK-Analyzers/Components/test/ComponentAnalyzerDiagnosticAnalyzerRunner.cs'],
    ['F223-F224', 'src/Tools/SDK-Analyzers/Components/src/ComponentInternalUsageDiagnosticAnalzyer.cs'],
    ['F223-F224', 'src/Tools/SDK-Analyzers/Components/src/InternalUsageAnalyzer.cs'],
    ['F223-F224', 'src/Tools/SDK-Analyzers/Components/src/DiagnosticDescriptors.cs'],
    ['F223-F224', 'src/Framework/AspNetCoreAnalyzers/test/TestDiagnosticAnalyzer.cs'],
    ['F223-F224', 'src/Framework/AspNetCoreAnalyzers/test/RouteHandlers/DisallowReturningActionResultsFromMapMethodsTest.cs'],
    ['F223-F224', 'src/Framework/AspNetCoreAnalyzers/src/Analyzers/RouteHandlers/RouteHandlerAnalyzer.cs'],
    ['F223-F224', 'src/Framework/AspNetCoreAnalyzers/src/Analyzers/DiagnosticDescriptors.cs'],
    ['F223-F224', 'src/Components/Analyzers/test/TestFiles/ComponentInternalUsageDiagnosticsAnalyzerTest/UsesRendererTypesInDeclarations.cs'],
    ['F223-F224', 'src/Components/Analyzers/test/TestFiles/ComponentInternalUsageDiagnosticsAnalyzerTest/UsersRendererTypesInMethodBody.cs'],
];
assert.equal(targets.length, 23);
const requests = [{ type: 'commit', expression: original }, { type: 'commit', expression: current }];
for (const [role, commit] of [['Original', original], ['Default', current]])
    for (const [finding, file] of targets) requests.push({ type: 'blob', expression: commit + ':' + file, finding, role, commit, path: file });
const rawBatch = git('whole-immutable-roles', ['cat-file', '--batch'], Buffer.from(requests.map(x => x.expression).join('\n') + '\n'));
const objects = new Map(), sources = [], reusable = new Map();
function save(type, sha, raw)
{
    assert.equal(gitId(type, raw), sha);
    if (objects.has(sha))
    {
        assert.equal(objects.get(sha).type, type);
        assert.ok(objects.get(sha).raw.equals(raw));
        return;
    }
    const file = `raw-git/objects/${sha}.payload`;
    write(path.join(root, file), raw);
    objects.set(sha, { type, sha, file, bytes: raw.length, sha256: sha256(raw), raw });
}
function parseBatch(raw, expected, consume)
{
    let offset = 0;
    for (const item of expected)
    {
        const end = raw.indexOf(10, offset);
        assert.ok(end >= offset);
        const header = raw.subarray(offset, end).toString('ascii').match(/^([a-f0-9]{40}) (commit|tree|blob) (\d+)$/);
        assert.ok(header, item.expression ?? item.sha);
        assert.equal(header[2], item.type);
        if (item.sha) assert.equal(header[1], item.sha);
        if (item.type === 'commit') assert.equal(header[1], item.expression);
        const length = Number(header[3]), start = end + 1;
        assert.equal(raw[start + length], 10);
        const body = raw.subarray(start, start + length);
        save(item.type, header[1], body);
        consume(item, header[1], body);
        offset = start + length + 1;
    }
    assert.equal(offset, raw.length);
}
parseBatch(rawBatch, requests, (item, blob, raw) =>
{
    if (item.type !== 'blob') return;
    const artifact = `source/${item.finding}/${item.role}/${item.path}`;
    write(path.join(root, artifact), raw);
    sources.push({ finding: item.finding, role: item.role, commit: item.commit, path: item.path,
        blob, artifact, bytes: raw.length, sha256: sha256(raw) });
});
assert.equal(sources.length, 46);
const prior = path.join(session, 'autoperf-published-results', 'F150-F206-F215-F220'), priorIndex = read(path.join(prior, 'source-membership.json'));
verifyMembership(prior, priorIndex);
for (const item of priorIndex.objects) reusable.set(item.sha, item);
function ensureTrees(hashes)
{
    const missing = [];
    for (const sha of new Set(hashes))
    {
        if (objects.has(sha))
        {
            assert.equal(objects.get(sha).type, 'tree');
            continue;
        }
        if (reusable.has(sha))
        {
            const item = reusable.get(sha), raw = fs.readFileSync(path.join(prior, item.file));
            assert.equal(item.type, 'tree');
            assert.equal(raw.length, item.bytes);
            assert.equal(sha256(raw), item.sha256);
            save('tree', sha, raw);
        }
        else missing.push(sha);
    }
    if (missing.length)
    {
        const raw = git('raw-ancestor-trees-' + commands.length, ['cat-file', '--batch'], Buffer.from(missing.join('\n') + '\n'));
        parseBatch(raw, missing.map(sha => ({ sha, type: 'tree' })), () => {});
    }
}
const walkers = sources.map(item => ({ item, parts: item.path.split('/'), position: 0,
    current: objects.get(item.commit).raw.toString('utf8').match(/^tree ([a-f0-9]{40})$/m)[1] }));
while (walkers.some(x => x.position < x.parts.length))
{
    const active = walkers.filter(x => x.position < x.parts.length);
    ensureTrees(active.map(x => x.current));
    for (const state of active)
    {
        const entry = treeEntries(objects.get(state.current).raw).get(state.parts[state.position]);
        assert.ok(entry, state.item.path);
        const last = state.position === state.parts.length - 1;
        assert.ok(last ? ['100644', '100755'].includes(entry.mode) : entry.mode === '40000');
        if (last)
        {
            assert.equal(entry.sha, state.item.blob, `${state.item.role}/${state.item.path}`);
            state.item.mode = entry.mode;
        }
        state.current = entry.sha;
        state.position++;
    }
}
const membership = { sources, objects: [...objects.values()].map(({ raw, ...item }) => item) };
jsonWrite('source-membership.json', membership);
const verified = verifyMembership(root, membership);
git('xml-target-history', ['log', '-6', '--format=fuller', '-p', current, '--', targets[1][1]]);
git('analyzer-target-history', ['log', '-6', '--format=fuller', '-p', current, '--', targets[5][1]]);
git('xml-comparer-consumer-leads', ['grep', '-n', '-F', 'XmlAssert.EqualityComparer', current, '--', 'src/DataProtection'], undefined, [0, 1]);
git('analyzer-derived-class-leads', ['grep', '-n', '-E', ':[[:space:]]*DiagnosticAnalyzerRunner', current, '--', 'src'], undefined, [0, 1]);
const externalTree = JSON.parse(gh('xunit-declared-source-tree', `repos/xunit/assert.xunit/git/trees/${externalCommit}?recursive=1`).toString('utf8'));
assert.equal(externalTree.truncated, false);
const external = [];
for (const file of ['EqualityAsserts.cs', 'Sdk/AssertEqualityComparer.cs', 'Sdk/AssertEqualityComparerAdapter.cs',
    'Sdk/CollectionTracker.cs', 'Sdk/CollectionTrackerExtensions.cs'])
{
    const entry = externalTree.tree.find(x => x.path === file);
    assert.equal(entry.type, 'blob');
    const response = JSON.parse(gh('xunit-' + path.basename(file, '.cs'), `repos/xunit/assert.xunit/git/blobs/${entry.sha}`).toString('utf8'));
    assert.equal(response.encoding, 'base64');
    const raw = Buffer.from(response.content, 'base64'), artifact = 'external/xunit-assert-2.9.2/' + file;
    assert.equal(raw.length, response.size);
    assert.equal(raw.length, entry.size);
    assert.equal(gitId('blob', raw), entry.sha);
    write(path.join(root, artifact), raw);
    external.push({ repository: 'xunit/assert.xunit', commit: externalCommit, path: file, blob: entry.sha,
        artifact, bytes: raw.length, sha256: sha256(raw), wholeFile: true,
        boundary: 'Declared2.9.2 source fingerprint via pinned API tree/blob response, not raw external commit/tree graph or selected executing assertion binary.' });
}
jsonWrite('external-source.json', external);
const guidance = [];
for (const file of ['src/Components/AGENTS.md', '.github/instructions/components.instructions.md',
    '.github/instructions/cross-cutting-guidance.instructions.md', 'docs/BuildFromSource.md', 'docs/BlazorComponentsGuidance.md'])
{
    const raw = fs.readFileSync(path.join(repo, file)), artifact = 'navigation-guidance/' + file;
    write(path.join(root, artifact), raw);
    guidance.push({ path: file, artifact, bytes: raw.length, sha256: sha256(raw), role: 'NavigationOnly',
        navigationHead: before.head.trim(), notImmutableRoleSource: true });
}
jsonWrite('guidance-navigation.json', guidance);
const after = {
    head: git('reserved-head-after', ['rev-parse', 'HEAD']).toString('utf8'),
    status: git('reserved-status-after', ['status', '--porcelain', '--untracked-files=normal']).toString('utf8'),
    globalSha256: sha256(fs.readFileSync(path.join(repo, 'global.json'))),
};
assert.deepEqual(after, before);
jsonWrite('COMMANDS.json', commands);
jsonWrite('COLLECTION.json', { observedUtc: new Date().toISOString(), findings: ['F222', 'F223', 'F224'],
    Original: original, Default: current, defaultBranch: metadata.default_branch, rawGitVerification: verified,
    wholeAspNetPathsPerRole: targets.length, commonExternalWholeFingerprints: external.length,
    navigationGuidanceWholeFiles: guidance.length, directGitGhSourceRoots: commands.length,
    allDirectSourceRootsWaitedAndStreamsReturned: true, before, after, reservedStateUnchanged: true,
    productNativeActivationBuildTestBrowserCandidateOrComparisonStarts: 0,
    assessmentOrMaterialityConclusionNotYetWritten: true, actualEnclosingToolExitNotSelfAttested: true,
    navigationLimitations: 'Prior semantic GitHub search returned404; C# LSP symbol/definition misses were not absence proof. Exact bounded filename/known-file navigation was used, never relabelled Default.' });
console.log(JSON.stringify({ rawMemberships: verified.memberships, rawGitObjects: verified.objects,
    original, currentDefault: current, sourceRoots: commands.length, externalWholeFingerprints: external.length,
    guidanceSnapshots: guidance.length, productNativeTestsCandidatesOrComparisons: 0,
    sourceAssessmentPending: true }));
