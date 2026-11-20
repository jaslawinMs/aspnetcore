import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F132');
const root = String.raw`C:\src\aspnetcore`;
const current = String.raw`C:\src\autoperf-F042-default`;
const published = path.join(session, 'autoperf-published-results');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const actualDefault = 'ae89581dfd24c6277b4267a9779d05f7b9f047f1';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
function git(cwd, ...args)
{
    const result = spawnSync('git', ['--no-pager', ...args], { cwd, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
}
assert.equal(fs.existsSync(run), false, 'Do not overwrite a case intake');
assert.equal(git(root, 'rev-parse', 'HEAD'), baseline);
assert.equal(git(root, 'status', '--porcelain', '--untracked-files=no'), '');
assert.equal(git(current, 'rev-parse', 'HEAD'), actualDefault);
assert.equal(git(current, 'status', '--porcelain', '--untracked-files=no'), '');
assert.equal(git(published, 'rev-parse', 'HEAD'), '4795a202fcd943b0c435bcabb38e98e0e79cb1ec');
assert.equal(git(published, 'rev-parse', 'HEAD:REPORT.md'), '73abf142464b1f81676e03a1eebc766c279cb47b');
const privateLedger = fs.readFileSync(path.join(session, 'autoperf-campaign.json'));
assert.ok(privateLedger.equals(fs.readFileSync(path.join(published, 'campaign.json'))));
const campaign = JSON.parse(privateLedger);
assert.equal(campaign.candidates.filter(entry => entry.status !== 'pending').length, 131);
const entry = campaign.candidates.find(entry => entry.id === 'F132');
assert.equal(entry.status, 'pending');
fs.mkdirSync(path.join(run, 'research'), { recursive: true });
const write = (file, value) => fs.writeFileSync(path.join(run, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function capture(name, executable, args, cwd = root)
{
    const startedAt = new Date().toISOString();
    const result = spawnSync(executable, args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
    fs.writeFileSync(path.join(run, 'research', name + '.stdout.txt'), result.stdout ?? '', { flag: 'wx' });
    fs.writeFileSync(path.join(run, 'research', name + '.stderr.txt'), result.stderr ?? '', { flag: 'wx' });
    write(path.join('research', name + '.command.json'), { executable, arguments: args, cwd, startedAt, completedAt: new Date().toISOString(), actualExitCode: result.status });
    assert.equal(result.status, 0, `${name}: ${result.stderr}`);
    return result.stdout;
}
const defaultResponse = JSON.parse(capture('upstream-default', 'gh', ['api', 'repos/dotnet/aspnetcore/commits/main']));
assert.equal(defaultResponse.sha, actualDefault);
capture('subscription-key-history', 'git', ['--no-pager', 'log', '--follow', '--name-status', '--format=%H %cI %s', '--', 'src/Components/Components/src/ComponentSubscriptionKey.cs']);
capture('subscription-key-introduction', 'git', ['--no-pager', 'show', '--format=fuller', '52ea66758edf951e2dfd7f103d6868b8d8a0b73c', '--', 'src/Components/Components/src/ComponentSubscriptionKey.cs']);
capture('generic-provider-history', 'git', ['--no-pager', 'log', '--follow', '--name-status', '--format=%H %cI %s', '--', 'src/Components/Components/src/CascadingParameterValueProvider.cs']);
capture('generic-provider-introduction', 'git', ['--no-pager', 'show', '--format=fuller', '319e87fd950a99f3baae2aa79db3d4fb68783d85', '--', 'src/Components/Components/src/CascadingParameterValueProvider.cs', 'src/Components/Components/src/CascadingValueServiceCollectionExtensions.cs']);
for (const [label, repo] of [['upstream', 'dotnet/aspnetcore'], ['fork', 'jaslawinMs/aspnetcore']])
{
    for (const [queryLabel, query] of [['identifier', 'ComponentSubscriptionKey'], ['concept', 'cascading subscription hash']])
    {
        capture(`${label}-open-${queryLabel}-prs`, 'gh', ['search', 'prs', query, '--repo', repo, '--state', 'open', '--json', 'number,title,url', '--limit', '30']);
    }
}
capture('fork-existing-tracking', 'gh', ['issue', 'list', '--repo', 'jaslawinMs/aspnetcore', '--state', 'all', '--search', 'F132 in:title', '--json', 'number,title,url', '--limit', '30']);
const docsCommit = '1f1f858829b6e63555546c1e30e5d7f3b9b57e47';
capture('cascading-values-docs', 'gh', ['api', '-H', 'Accept: application/vnd.github.raw+json', `repos/dotnet/AspNetCore.Docs/contents/aspnetcore/blazor/components/cascading-values-and-parameters.md?ref=${docsCommit}`]);
const selected = [
    String.raw`src\Components\Components\src\ComponentSubscriptionKey.cs`,
    String.raw`src\Components\Components\src\CascadingParameterInfo.cs`,
    String.raw`src\Components\Components\src\CascadingParameterValueProvider.cs`,
    String.raw`src\Components\Components\src\PersistentState\PersistentStateValueProvider.cs`,
    String.raw`src\Components\Components\src\CascadingParameterState.cs`,
    String.raw`src\Components\Components\src\CascadingValueSource.cs`,
    String.raw`src\Components\Components\src\CascadingValueServiceCollectionExtensions.cs`,
    String.raw`src\Components\Components\src\CascadingParameterSubscription.cs`,
    String.raw`src\Components\Components\src\Rendering\ComponentState.cs`,
    String.raw`src\Components\Components\src\Rendering\RenderTreeBuilder.cs`,
    String.raw`src\Components\Components\src\ParameterView.cs`,
    String.raw`src\Components\Components\src\Microsoft.AspNetCore.Components.csproj`,
    String.raw`src\Components\Web\src\HtmlRendering\HtmlRenderer.cs`,
    String.raw`src\Components\Components\test\Microsoft.AspNetCore.Components.Tests.csproj`,
    String.raw`src\Components\Components\test\CascadingParameterTest.cs`,
    String.raw`src\Components\Components\test\CascadingParameterStateTest.cs`,
    String.raw`src\Components\Components\test\PersistentStateValueProviderTests.cs`,
    String.raw`src\Components\Components\test\PersistentValueProviderComponentSubscriptionTests.cs`,
    String.raw`src\Components\Components\test\PersistentStateValueProviderKeyResolverTests.cs`,
];
const snapshots = [];
for (const [role, directory] of [['Original', root], ['Default', current]])
{
    for (const relative of selected)
    {
        const bytes = fs.readFileSync(path.join(directory, relative));
        const destination = path.join(run, 'selected-source', role, relative);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, bytes, { flag: 'wx' });
        const gitPath = relative.replaceAll('\\', '/');
        const normalize = value => value.replaceAll('\r\n', '\n').trimEnd();
        assert.equal(normalize(bytes.toString('utf8')), normalize(git(directory, 'show', `${role === 'Original' ? baseline : actualDefault}:${gitPath}`)));
        snapshots.push({ role, file: relative, bytes: bytes.length, sha256: sha(bytes), originalPath: path.join(directory, relative) });
    }
}
assert.equal(git(root, 'diff', baseline, actualDefault, '--', ...selected.map(file => file.replaceAll('\\', '/'))), '');
write('selected-source-manifest.json', snapshots);
const protectedFiles = [
    'global.json', 'package.json', 'package-lock.json', 'NuGet.config',
    'autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
    'autoperf-scan-report.md', 'performance-antipattern-findings.md',
].map(file => ({ file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
write('preservation-baseline.json', {
    recordedAt: new Date().toISOString(), root, current, published, rootHead: baseline,
    rootBranch: git(root, 'branch', '--show-current'), rootStatus: git(root, 'status', '--porcelain'),
    currentHead: actualDefault, protectedFiles, privateLedgerSha256: sha(privateLedger),
    publishedHead: git(published, 'rev-parse', 'HEAD'), fixedReportBlob: git(published, 'rev-parse', 'HEAD:REPORT.md'),
});
const plan = {
    findingId: 'F132', sealedAt: new Date().toISOString(), originalFinding: entry.finding,
    baselineCommit: baseline, actualDefaultCommit: actualDefault, docsCommit,
    sourceBranch: 'autoperf/F132-evaluate-cached-cascading-name-hashes',
    scope: 'Research and one throwaway metadata-prehash prototype; not an approved shipping implementation.',
    hypothesis: 'Compute the ordinal name hash once in existing per-type cascading metadata and carry that int in the subscription key. Prehashing a freshly constructed lookup key alone would not amortize anything.',
    prototype: [
        'Add only an internal cached PropertyNameHashCode to existing CascadingParameterInfo; compute it in its existing internal constructor.',
        'ComponentSubscriptionKey keeps its existing subscriber/name equality, takes the existing in CascadingParameterInfo instead of a string, and hashes its cached name int.',
        'Update only the dependent key constructions in CascadingParameterValueProvider and PersistentStateValueProvider. Preserve explanatory locals and branch structure.',
        'Do not add a separate static cache, public API, IVT, UnsafeAccessor, new provider abstraction or altered lifetime.',
    ],
    changedShippingFiles: selected.slice(0, 4),
    acceptance: [
        'Run existing CascadingParameterTest, CascadingParameterStateTest and the three persistent-provider test classes on unchanged original and actual default before prototype edits; parse every individual XML result.',
        'Use actual public TryAddCascadingValueSupplier registration and public HtmlRenderer: 64 retained child components, real reflection-produced cascading metadata, normal renderer-created subscriptions, changed direct Generation parameters and actual rendered HTML.',
        'Never invoke a provider GetCurrentValue, subscription callback, framework render method or metadata-change event directly as producer-reachability proof.',
        'Observe real subscription creation, every producer-owned GetCurrentValue call, retained component parameter values/HTML and actual renderer-driven unsubscribe/disposal; check exact counts, not merely nonzero.',
        'Run RegisteredShort4, RegisteredLong4 and PlainShort4, each three untimed lifetime repetitions on original/default/candidate; same compiled C#13 harness in every image.',
        'Use actual captured component/metadata inputs for additional direct key contract checks: equal different string references, ordinal case distinctions, different property/subscriber, default key and null-name default metadata. Distinguish those checks from render-producer proof.',
        'Measure actual struct sizes, including the metadata, cascading-state and dictionary-key storage trade-offs; no claim that caching is free.',
        'Preserve existing hash formula exactly within each process and all equality/disposal behavior. Existing focused tests also run on candidate and restored original if rejected.',
        'Freeze source-built owners, complete consumer inventories, actual PE/PDB/source associations, common harness identity and protected files before timing. Only actual Components owner DLL/PDB may differ between original/candidate consumers.',
        'Independently rebuild the exact common project and repeat untimed lifetime checks against the frozen owner images; no historical timing replay.',
    ],
    metadataRefresh: 'CascadingParameterState already owns the per-type metadata cache and subscribes to HotReloadManager.ClearCache. Retained ComponentState rebuilds parameter bindings/subscriptions on metadata update. The new derived name int is created with each replacement metadata record, not a new independent cache. Existing refresh tests are diagnostic regression coverage, not live-delta proof.',
    validationBoundary: {
        owner: 'Actual CascadingParameterValueProvider/ComponentSubscriptionKey and persistent-provider keys in Microsoft.AspNetCore.Components.',
        producer: 'Public DI registration plus real HtmlRenderer component construction, reflected custom attributes and changed parent-to-child direct parameters.',
        observable: 'Assigned cascading values, exact rendered HTML, exact get/subscribe/dispose counts and unchanged key equality/hash invariants.',
        shippingFollowupIfQualified: 'Before retaining a shipping change, satisfy applicable sample/browser/permanent-test and architecture requirements and live-delta metadata validation. No performance qualification alone grants shipping readiness.',
        exclusions: 'No browser/native DOM, Server/WASM/Auto, real Session/TempData I/O, persistence navigation, AOT/trimming, complete compiler-input provenance or whole-application performance claim.',
    },
    benchmark: {
        primary: 'RegisteredShort4: four 10/11-character property names, 64 retained components, one changed direct generation per parent tick.',
        profiles: ['RegisteredShort4', 'RegisteredLong4', 'PlainShort4'],
        unchangedMatchedControl: 'PlainShort4: same public rendering/update shape and four ordinary CascadingParameter values through CascadingValueSource, without ComponentSubscriptionKey.',
        primaryOperation: 'One synchronous parent tick delivering four cascading values to each of 64 retained children and completing their renders.',
        warmupBatches: 3, retainedBatches: 8, parentTicksPerBatch: 256,
        maximumAuthorizations: 3, beforeAfterRoleOrders: [['Original', 'Candidate'], ['Candidate', 'Original'], ['Original', 'Candidate']],
        failedOrPartialComparisonConsumesAuthorization: true, outliersRemoved: false,
        timing: 'Stopwatch.GetTimestamp around the fixed synchronous dispatcher-owned loop; report raw elapsed ticks and per-parent-tick nanoseconds.',
        allocations: 'GC.GetAllocatedBytesForCurrentThread around that same synchronous loop; report raw bytes and B/parent-tick.',
        processOverrides: { DOTNET_TieredCompilation: '0', DOTNET_TieredPGO: '0', DOTNET_ReadyToRun: '0' },
        machineSettings: 'No affinity, priority, power, firewall or machine-setting changes; shared-box limitations remain.',
        qualification: 'Primary median less-time >=10%, faster in at least 2 of 3 completed pairs and greater than absolute same-pair matched-control movement in at least 2 pairs. Allocation-only qualification requires >=32 primary B/tick saved in at least 2 pairs with matched control savings at least32 B/tick smaller. No secondary-primary substitution.',
        adverseGuard: 'No qualification if plain matched-control median slowdown>=10% in at least2 pairs, or equality, lifecycle, actual producer counts, original restoration or provenance checks fail.',
        noPostTimingTuning: true, noHistoricalReplay: true,
    },
};
write('plan.json', plan);
write('plan-seal.json', { file: 'plan.json', sha256: sha(fs.readFileSync(path.join(run, 'plan.json'))), sealedAt: new Date().toISOString() });
write('diagnostic-budget.json', { findingId: 'F132', maximumAuthorizations: 3, authorizations: [], closed: false, timingRequiresFrozenAcceptedImages: true });
assert.equal(git(root, 'status', '--porcelain', '--untracked-files=no'), '');
git(root, 'switch', '-c', plan.sourceBranch, baseline);
console.log(JSON.stringify({ run, sealedPlanSha256: sha(fs.readFileSync(path.join(run, 'plan.json'))), snapshots: snapshots.length,
    allSelectedOriginalAndDefaultGitTextIdentical: true, actualDefault, finalizedUnchanged: 131, sourceBranch: plan.sourceBranch }, null, 2));
