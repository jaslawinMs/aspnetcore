import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const root = String.raw`C:\src\aspnetcore`;
const current = String.raw`C:\src\autoperf-F042-default`;
const published = path.join(session, 'autoperf-published-results');
const run = path.join(session, 'autoperf-runs', 'F129');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const defaultCommit = 'ae89581dfd24c6277b4267a9779d05f7b9f047f1';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const write = (name, value) => fs.writeFileSync(path.join(run, name), JSON.stringify(value, null, 2) + '\n');
const git = (cwd, ...args) =>
{
    const result = spawnSync('git', ['--no-pager', ...args], { cwd, encoding: 'utf8', windowsHide: true });
    assert(result.status === 0, `git ${args.join(' ')} failed: ${result.stderr}`);
    return result.stdout.trim();
};

assert(!fs.existsSync(run), 'F129 already exists; do not overwrite an intake');
assert(git(root, 'rev-parse', 'HEAD') === '906bf66c821a57490f2a0e1e50ef676221a744c5', 'Unexpected source checkout');
assert(git(root, 'diff', '--name-only') === '' && git(root, 'diff', '--cached', '--name-only') === '', 'Tracked source changes exist');
assert(git(current, 'rev-parse', 'HEAD') === defaultCommit, 'Actual-default checkout is not the selected new default');
assert(git(current, 'status', '--porcelain', '--untracked-files=no') === '', 'Actual-default tracked changes exist');
assert(git(published, 'rev-parse', 'HEAD:REPORT.md') === '73abf142464b1f81676e03a1eebc766c279cb47b', 'Fixed report changed');
assert(git(published, 'status', '--porcelain', '--untracked-files=no') === '', 'Published checkout has tracked changes');
const privateLedger = fs.readFileSync(path.join(session, 'autoperf-campaign.json'));
const publicLedger = fs.readFileSync(path.join(published, 'campaign.json'));
assert(privateLedger.equals(publicLedger), 'Campaign ledgers differ');
const campaign = JSON.parse(privateLedger);
const finding = campaign.candidates.find(item => item.id === 'F129');
assert(finding?.status === 'pending', 'F129 is not pending');
assert(campaign.candidates.filter(item => item.status !== 'pending').length === 130, 'Unexpected progress');
fs.mkdirSync(path.join(run, 'research'), { recursive: true });

function capture(name, executable, args, cwd = root)
{
    const started = new Date().toISOString();
    const result = spawnSync(executable, args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
    fs.writeFileSync(path.join(run, 'research', `${name}.stdout.txt`), result.stdout ?? '');
    fs.writeFileSync(path.join(run, 'research', `${name}.stderr.txt`), result.stderr ?? '');
    write(path.join('research', `${name}.command.json`), { executable, args, cwd, started, completed: new Date().toISOString(), exitCode: result.status, error: result.error?.message ?? null });
    assert(result.status === 0, `${name} failed; preserve its streams and inspect the actual prerequisite`);
    return result.stdout;
}

const selected = [
    String.raw`src\Components\Media\src\FileDownload.cs`,
    String.raw`src\Components\Media\src\MediaComponentBase.cs`,
    String.raw`src\Components\Media\src\MediaSource.cs`,
    String.raw`src\Components\Media\src\MediaContext.cs`,
    String.raw`src\Components\Media\src\Image.cs`,
    String.raw`src\Components\Media\src\Video.cs`,
    String.raw`src\Components\Media\src\Microsoft.AspNetCore.Components.Media.csproj`,
    String.raw`src\Components\Media\test\FileDownloadTest.cs`,
    String.raw`src\Components\Media\test\Microsoft.AspNetCore.Components.Media.Tests.csproj`,
    String.raw`src\Components\Components\src\Rendering\RenderTreeBuilder.cs`,
    String.raw`src\Components\Web\src\HtmlRendering\HtmlRenderer.cs`,
];
const snapshots = [];
for (const [role, directory] of [['Original', root], ['Default', current]])
{
    for (const relative of selected)
    {
        const bytes = fs.readFileSync(path.join(directory, relative));
        const destination = path.join(run, 'selected-source', role, relative);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, bytes);
        snapshots.push({ role, file: relative, bytes: bytes.length, sha256: sha(bytes), originalPath: path.join(directory, relative) });
    }
}
for (const relative of selected)
{
    const normalize = value => value.replaceAll('\r\n', '\n');
    const old = git(root, 'show', `${baseline}:${relative.replaceAll('\\', '/')}`);
    const now = fs.readFileSync(path.join(root, relative), 'utf8').trim();
    assert(normalize(old) === normalize(now), `Selected baseline source changed: ${relative}`);
}
capture('renamed-history', 'git', ['--no-pager', 'log', '--follow', '--name-status', '-3', '--format=%H %cI %s', '--', 'src/Components/Media/src/FileDownload.cs']);
capture('original-introduction', 'git', ['--no-pager', 'show', '--format=fuller', '43b81a989650398c4971456562488bed8a00783a', '--', 'src/Components/Web/src/Media/FileDownload.cs']);
capture('current-selected-diff', 'git', ['--no-pager', 'diff', baseline, defaultCommit, '--', 'src/Components/Media/src', 'src/Components/Media/test', 'src/Components/Components/src/Rendering/RenderTreeBuilder.cs', 'src/Components/Web/src/HtmlRendering/HtmlRenderer.cs']);
const actualDefault = JSON.parse(capture('upstream-default', 'gh', ['api', 'repos/dotnet/aspnetcore/commits/main']));
assert(actualDefault.sha === defaultCommit, 'Upstream default moved again; inspect before proceeding');
capture('upstream-issues', 'gh', ['search', 'issues', 'FileDownload', '--repo', 'dotnet/aspnetcore', '--state', 'open', '--limit', '30', '--json', 'number,title,url,updatedAt']);
capture('upstream-open-prs', 'gh', ['pr', 'list', '--repo', 'dotnet/aspnetcore', '--state', 'open', '--search', 'FileDownload', '--limit', '30', '--json', 'number,title,url']);
capture('fork-open-prs', 'gh', ['pr', 'list', '--repo', 'jaslawinMs/aspnetcore', '--state', 'open', '--search', 'FileDownload', '--limit', '30', '--json', 'number,title,url']);
capture('media-api-context', 'gh', ['issue', 'view', '66391', '--repo', 'dotnet/aspnetcore', '--json', 'number,title,body,labels,url']);
capture('attribute-splatting-docs', 'gh', ['api', '-H', 'Accept: application/vnd.github.raw+json', 'repos/dotnet/AspNetCore.Docs/contents/aspnetcore/blazor/components/splat-attributes-and-arbitrary-parameters.md?ref=7e6be970565b61d251d839555bec7cf0a1a20a53']);

const protectedFiles = [
    'global.json', 'package.json', 'package-lock.json', 'NuGet.config',
    'autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
    'autoperf-scan-report.md', 'performance-antipattern-findings.md',
].map(file => ({ file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
const plan = {
    schemaVersion: 1, findingId: 'F129', sealedAt: new Date().toISOString(),
    kind: 'Managed semantic investigation with one explicitly throwaway unbuffered-filter prototype; not a shipping implementation',
    baselineCommit: baseline, actualDefaultCommit: defaultCommit,
    sourceBranch: 'autoperf/F129-characterize-download-attribute-snapshot',
    finding: finding.finding,
    question: 'Does replacing conditional dictionary materialization with a lazy ordinal href filter preserve actual FileDownload rendering?',
    prototype: 'Change only the contents of the existing href-present branch to attributesToRender = AdditionalAttributes.Where(static kvp => kvp.Key != "href");. Keep the branch condition, all other rendering, and source-provided comparer behavior.',
    acceptance: [
        'Use the actual source-built FileDownload, MediaComponentBase, RenderTreeBuilder and public HtmlRenderer through normal component parameter delivery.',
        'Verify the unchanged baseline and the genuine actual-default test dependency graph before any prototype edit.',
        'Run all seven existing FileDownloadTest cases on original, actual default, prototype and restored original, preserving every XML result.',
        'Use one compiled common private C# 13 harness for all source images. Record actual loaded assembly locations, hashes and MVIDs.',
        'Run the nine declared profiles three times each using fresh components, fresh MediaSource streams, actual rendering and actual object-value ToString dispatch.',
        'Require exact inert-href/class behavior in ordinary cases, actual mutation reachability, and the same final HTML or exception behavior in the mutation cases. Do not invoke ToString or BuildRenderTree directly.',
        'For a rejected prototype, restore the exact original bytes, rebuild, and rerun the same assertions. Do not retain shipping edits, permanent tests or a source PR.',
    ],
    profiles: [
        'NoAttributes', 'OrdinaryNoHref', 'OrdinaryWithHref', 'UppercaseHrefOrdinalIgnoreCase',
        'ReplaceValueWithHref', 'ReplaceValueWithoutHref', 'AddKeyWithHref', 'AddKeyWithoutHref',
        'ChildContentWithHref',
    ],
    repetitions: 3,
    baselineExpectations: {
        ReplaceValueWithHref: 'Real ToString updates the supplied source dictionary, but the rendered data-after remains before, from the eager copy.',
        ReplaceValueWithoutHref: 'Nearest opposite: no conditional copy; rendered data-after becomes after.',
        AddKeyWithHref: 'Real ToString inserts a new source key; original still finishes rendering its detached snapshot and omits the late key.',
        AddKeyWithoutHref: 'Nearest opposite: the direct source enumeration reports InvalidOperationException after the real insertion.',
        ChildContentWithHref: 'Custom content bypasses default attribute processing; the mutating value must not be converted.',
    },
    dispositionRules: [
        'If a declared ordinary or snapshot assertion differs, reject this unbuffered recommendation without timing or publishing an optimization PR.',
        'A rejection does not establish that all buffered/list/array/pooling/constructor optimizations are impossible; those are not established or measured by this case.',
        'If every assertion is equivalent, do not improvise timing: seal a separate fixed benchmark plan and accepted source before consuming any comparison authorization.',
    ],
    validationBoundary: {
        behaviorOwner: 'FileDownload.BuildRenderTree plus RenderTreeBuilder.AddMultipleAttributes and AddAttribute(object)',
        productionProducer: 'Normal renderer parameter assignment followed by actual element-attribute value.ToString conversion; the application-owned value performs the source-dictionary mutation.',
        finalObservable: 'Actual HtmlRenderer HTML output or actual renderer exception, plus observed ToString call and dictionary mutation counts.',
        permanentSurface: 'None for a research rejection. Any later shipping implementation must follow the Components sample and permanent coverage workflow.',
        excluded: 'No browser download, JS interop, DOM/layout, Server/WASM/Auto lifecycle, latency, throughput, memory-savings or general application safety claim.',
        falsePassRisk: 'A copied render loop, string-only attributes, a callback invoked directly by the probe, or unchanged ordinary tests alone would not establish actual conversion reachability or snapshot equivalence.',
    },
    timingBudget: { maximumAuthorizations: 3, authorizations: [], performed: 0, timingPermittedForThisSemanticPlan: false },
    machinePolicy: 'Shared box; no power, affinity, priority, firewall, URL ACL or other machine setting changes; no concurrent overlapping builds.',
};
write('selected-source-manifest.json', snapshots);
write('preservation-baseline.json', {
    recordedAt: new Date().toISOString(), root, current, published,
    rootHead: git(root, 'rev-parse', 'HEAD'), rootBranch: git(root, 'branch', '--show-current'),
    rootStatus: git(root, 'status', '--porcelain'), currentHead: defaultCommit,
    protectedFiles, privateLedgerSha256: sha(privateLedger), publicLedgerSha256: sha(publicLedger),
    publishedHead: git(published, 'rev-parse', 'HEAD'),
    reportBlob: git(published, 'rev-parse', 'HEAD:REPORT.md'),
});
write('plan.json', plan);
write('plan-seal.json', { sealedAt: new Date().toISOString(), file: 'plan.json', sha256: sha(fs.readFileSync(path.join(run, 'plan.json'))) });
console.log(JSON.stringify({ run, sealedPlan: sha(fs.readFileSync(path.join(run, 'plan.json'))), selectedSnapshots: snapshots.length, defaultCommit }, null, 2));
