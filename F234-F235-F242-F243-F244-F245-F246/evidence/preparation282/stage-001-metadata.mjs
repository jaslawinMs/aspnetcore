import assert from 'node:assert/strict';
import { guard, sourceRoot, gitArguments, parseTree, writeJson, original } from './source-core-v001.mjs';

writeJson('AUTHORIZATION-AND-LIMITS.json', {
    finding: 'F242', turn: 282, actualOwner: '0cc047c2-0858-4ee5-8cc3-b5742fe3d066',
    explicitGOReceived: true, maximumWholeLogicalInputsPerRole: 15, maximumDirectGitGhRootsIncludingFailures: 32,
    sourceRoles: ['Original immutable commit', 'fresh upstream observed Default immutable commit'],
    reservedRepository: { path: 'C:\\src\\aspnetcore', use: 'Navigation and Git object store only',
        expectedBranch: 'autoperf/F145-hoist-large-response-utf8-encoding',
        expectedHead: '24875ef5dabb55567870b39f6eb0002170435e2f' },
    acceptanceCriteria: [
        'Fresh registration/scope/no-lease/no-HOLD/nonquiesced/pending guard before every Git/gh root',
        'Fresh upstream default identity and whole raw Git captures with independent object hashes and tree modes',
        'Trace real website registration, removal names and framework descriptor producers/lifetimes from selected whole source bodies',
        'Assess retained actual cardinality, equality/order/duplicates/getters/exceptions without inventing workloads',
        'Source-only materiality disposition, actual test declarations/history, honest gaps and finite continuation if needed',
        'Inventory every produced artifact and report actual final tool return only after it returns'
    ],
    prohibited: 'SDK activation; dotnet; restore/build/test; product-native/scenario/host/server/browser; candidate or shipping source edits; timing/warmup/allocation/profiler/counters; remote; subagents; shared/policy/lease/ledger/publication/API/IVT/UnsafeAccessor/cleanup writes',
    skillCompatibility: 'common-anti-pattern-scan was loaded. Its prepare/finalize/Python/SDK/install/telemetry/publication/general-universe workflow is outside this explicit retained-finding SOURCE ONLY scope and will not be executed.',
    evidenceBoundary: 'Selected immutable source and metadata only; no runtime, binaries, executed tests or measured performance claims.',
    operationalTimestampsAreNotBenchmarks: true,
    bootstrapMetadataToolReceipt: { shellId: '4711', actualExitCode: 0,
        scope: 'Read-only PAR filename metadata; exact tool stdout remains in conversation, not claimed as source provenance.' }
});
guard('stage001-initial');
const reserved = await sourceRoot('reserved-checkout-identity', 'git', gitArguments('log', '-1', '--format=%H%n%D', 'HEAD'));
const reservedLines = reserved.stdout.toString('utf8').trim().split(/\r?\n/);
assert.equal(reservedLines[0], '24875ef5dabb55567870b39f6eb0002170435e2f');
assert.ok(reservedLines[1].includes('HEAD -> autoperf/F145-hoist-large-response-utf8-encoding'));
const repositoryMetadata = await sourceRoot('upstream-repository-metadata', 'gh', ['api', 'repos/dotnet/aspnetcore']);
const upstream = JSON.parse(repositoryMetadata.stdout);
assert.equal(upstream.full_name, 'dotnet/aspnetcore');
const branch = upstream.default_branch;
assert.ok(typeof branch === 'string' && branch.length > 0);
const ref = await sourceRoot('upstream-default-ref', 'gh', [
    'api', `repos/dotnet/aspnetcore/git/ref/heads/${branch.split('/').map(encodeURIComponent).join('/')}`
]);
const reference = JSON.parse(ref.stdout);
assert.equal(reference.ref, `refs/heads/${branch}`);
assert.equal(reference.object.type, 'commit');
const defaultCommit = reference.object.sha;
assert.match(defaultCommit, /^[0-9a-f]{40}$/);
writeJson('metadata\\roles.json', {
    Original: original, Default: defaultCommit, defaultBranch: branch,
    upstreamRepositoryRoot: repositoryMetadata.relative, upstreamReferenceRoot: ref.relative,
    observedSourceIdentityOnlyNotRuntime: true,
    reservedCheckoutNotUsedAsDefault: true
});
for (const [role, commit] of [['original', original], ['default', defaultCommit]]) {
    const result = await sourceRoot(`tree-${role}`, 'git', gitArguments('ls-tree', '-r', '-z', commit, '--',
        'AGENTS.md', '.github/instructions/cross-cutting-guidance.instructions.md', 'src/Mvc'));
    const tree = parseTree(result.stdout);
    writeJson(`metadata\\tree-${role}.json`, tree);
    console.log(JSON.stringify({ role, commit, treeEntries: tree.length,
        selectedFilenameMetadata: tree.filter(entry => /AGENTS\.md$|RoutingWebSite\/(?:[^/]+\.cs|[^/]+\.csproj)$|RoutingTests[^/]*\.cs$|ActionDescriptorCollectionProvider\.cs$|ControllerActionDescriptorProvider\.cs$|MvcTestFixture\.cs$/.test(entry.path)).map(entry => entry.path) }));
}
