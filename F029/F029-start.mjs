import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F029');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F029-sync-partial-source';
fs.mkdirSync(run);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(run, 'executed-start.mjs'));
const calls = [];
function capture(command, args, label, allowFailure = false) {
  const started = new Date().toISOString();
  const result = spawnSync(command, args, { cwd: root, maxBuffer: 16 * 1024 * 1024 });
  fs.writeFileSync(path.join(run, `${label}.stdout`), result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(path.join(run, `${label}.stderr`), result.stderr ?? Buffer.alloc(0));
  calls.push({ command, args, workingDirectory: root, started, completed: new Date().toISOString(),
    actualExitCode: result.status, stdout: `${label}.stdout`, stderr: `${label}.stderr` });
  fs.writeFileSync(path.join(run, 'initial-actual-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  if (!allowFailure) {
    assert.equal(result.status, 0, `${label}:${result.stderr}`);
  }
  return { ...result, text: (result.stdout ?? Buffer.alloc(0)).toString().trim() };
}
const git = (args, label) => capture('git', args, label).text;
const gh = (endpoint, label) => JSON.parse(capture('gh', ['api', endpoint], label).text);
const digest = value => createHash('sha256').update(value).digest('hex').toUpperCase();
assert.equal(git(['status', '--porcelain', '--untracked-files=no'], 'initial-tracked-status'), '');
assert.deepEqual(git(['ls-files', '--others', '--exclude-standard'], 'initial-untracked').split('\n').sort(), [
  'autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md',
].sort());
const ledger = JSON.parse(fs.readFileSync(path.join(session, 'autoperf-campaign.json'), 'utf8').replace(/^\uFEFF/, ''));
const finding = ledger.candidates.find(row => row.id === 'F029');
assert.equal(finding.status, 'pending');
fs.writeFileSync(path.join(run, 'finding.json'), JSON.stringify(finding, null, 2) + '\n');
const current = gh('repos/dotnet/aspnetcore/branches/main', 'actual-current-default').commit.sha;
const exists = capture('git', ['cat-file', '-e', `${current}^{commit}`], 'current-local-probe', true);
if (exists.status !== 0) {
  git(['fetch', '--no-tags', 'origin', current], 'fetch-actual-current');
}
assert.equal(capture('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`],
  'new-local-branch-probe', true).status, 1);
assert.equal(git(['ls-remote', '--heads', 'autoperf', `refs/heads/${branch}`], 'new-fork-branch-probe'), '');
git(['switch', '--create', branch, baseline], 'create-independent-branch');
assert.equal(git(['rev-parse', 'HEAD'], 'actual-independent-parent'), baseline);
const selected = [
  'src/Mvc/Mvc.ViewFeatures/src/Rendering/HtmlHelperPartialExtensions.cs',
  'src/Mvc/Mvc.ViewFeatures/src/HtmlHelper.cs',
  'src/Mvc/Mvc.ViewFeatures/src/Rendering/IHtmlHelper.cs',
  'src/Mvc/Mvc.ViewFeatures/src/Microsoft.AspNetCore.Mvc.ViewFeatures.csproj',
  'src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Shipped.txt',
  'src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Unshipped.txt',
  'src/Mvc/Mvc.ViewFeatures/test/Rendering/HtmlHelperPartialExtensionsTest.cs',
  'src/Mvc/Mvc.ViewFeatures/test/Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj',
  'src/Mvc/Mvc.ViewFeatures/src/Buffers/MemoryPoolViewBufferScope.cs',
  'src/Mvc/Mvc.ViewFeatures/src/Buffers/IViewBufferScope.cs',
  'src/Mvc/Mvc.Razor/src/RazorView.cs',
  'src/Mvc/Mvc.Razor/src/RazorPage.cs',
  'src/Mvc/Mvc.Razor/src/RazorPageBase.cs',
  'src/Mvc/Mvc.Razor/src/Microsoft.AspNetCore.Mvc.Razor.csproj',
  'src/Mvc/Mvc.Analyzers/src/AvoidHtmlPartialAnalyzer.cs',
  'src/Mvc/Mvc.Analyzers/test/AvoidHtmlPartialAnalyzerTest.cs',
];
const snapshots = path.join(run, 'source-snapshots');
fs.mkdirSync(snapshots);
const parity = [];
for (const [index, file] of [...selected, 'global.json', 'eng/Versions.props'].entries()) {
  const before = capture('git', ['show', `${baseline}:${file}`], `snapshot-${index}-baseline`).stdout;
  const after = capture('git', ['show', `${current}:${file}`], `snapshot-${index}-current`).stdout;
  const working = fs.readFileSync(path.join(root, ...file.split('/')));
  const prefix = String(index).padStart(2, '0') + '-' + path.basename(file);
  for (const [variant, bytes] of [['baseline', before], ['current', after], ['working', working]]) {
    fs.writeFileSync(path.join(snapshots, `${prefix}.${variant}`), bytes);
  }
  parity.push({ file, core: selected.includes(file), actualBaselineBlobBytesSha256: digest(before),
    actualCurrentBlobBytesSha256: digest(after), actualWorkingBytesSha256: digest(working),
    actualBaselineAndCurrentBlobBytesEqual: before.equals(after),
    actualWorkingLfBytesMatchBaselineBlob: Buffer.from(working.toString().replaceAll('\r\n', '\n')).equals(before) });
}
const history = git(['--no-pager', 'log', '--format=%H %s', `${baseline}..${current}`, '--', ...selected],
  'selected-intervening-history');
gh(`repos/dotnet/aspnetcore/commits?path=src/Mvc/Mvc.ViewFeatures/src/Rendering/HtmlHelperPartialExtensions.cs&per_page=8&sha=${current}`,
  'actual-owner-history');
for (const [label, kind, query] of [
  ['owner', 'prs', 'HtmlHelperPartialExtensions'],
  ['blocking', 'issues', 'Partial synchronous async'],
  ['diagnostic', 'prs', 'MVC1000'],
]) {
  capture('gh', ['search', kind, query, '--repo', 'dotnet/aspnetcore', '--limit', '10',
    '--json', 'number,title,url,state,updatedAt'], `actual-upstream-search-${label}`);
}
const docsCommit = '6dfdff09330bd75429991b46b97d340b07cc5d6a';
capture('gh', ['api', '-H', 'Accept: application/vnd.github.raw+json',
  `repos/dotnet/AspNetCore.Docs/contents/aspnetcore/diagnostics/mvc1000.md?ref=${docsCommit}`],
  'actual-mvc1000-documentation');
const runtimeCommit = 'dfd6ac738610ea05f42e704be82b386e71052e12';
const runtime = capture('gh', ['api', '-H', 'Accept: application/vnd.github.raw+json',
  `repos/dotnet/runtime/contents/src/libraries/System.Private.CoreLib/src/System/Runtime/CompilerServices/TaskAwaiter.cs?ref=${runtimeCommit}`],
  'actual-runtime-taskawaiter-source', true);
const acceptance = {
  candidate: 'F029', definedBeforeProductEditsOrTiming: true,
  scope: 'Investigate the shipped synchronous Partial contract independently. A compatible change must still return completed IHtmlContent and synchronously propagate the original rendering result/failure. Do not remove the wait by changing API,returning incomplete content,fire-and-forget,Task.Run or inventing a synchronous IView path.',
  requirements: [
    'Verify original owning Partial extension rows on the actual source owner;preserve per-row results and unwrapped errors.',
    'Exercise actual HtmlHelper.Partial -> HtmlHelper.PartialAsync -> RenderPartialCoreAsync -> real RazorView.RenderAsync -> controlled CSharp RazorPage.ExecuteAsync,not a mocked IHtmlHelper returning a task.',
    'Use a real pending page-owned task gate and observe both source reachability and material completion boundary:the synchronous calling thread waits until producer release,complete output or exact failure appears only afterward.',
    'Contrast the existing async API on the same real producer without describing a caller migration as a framework optimization or source before/after.',
    'Preserve real request-scoped view-buffer ownership and source/API baselines;no new IVT or UnsafeAccessor.',
    'Completed tasks already use TaskAwaiter.GetResult;do not assume an unconditional wait or overhead that has not been measured. Exact runtime source availability is recorded separately.',
    'At most3actual source comparisons. If the only nonblocking replacement changes the shipped contract,record rejected/design-blocked with runnable original-only diagnostics and no manufactured fix or optimization draft.',
    'Any original-only diagnostic profile must be explicitly predeclared,run once,keep every row,not be counted as a source comparison or improvement.',
    'Activate the pinned SDK;serialize heavy work,max2buildworkers;never alter priority,affinity or power on this shared machine.',
  ],
  noClaims: ['No full HTTP request,cshtml discovery/compilation,production frequency,throughput,starvation or application-speedup proof from a controlled render gate.'],
  maximumActualComparisons: 3, actualComparisonsStarted: 0,
};
fs.writeFileSync(path.join(run, 'acceptance.json'), JSON.stringify(acceptance, null, 2) + '\n');
const investigation = {
  candidate: 'F029', baseline, branch, actualCurrentDefault: current,
  actualRawSnapshots: parity.length * 3, actualSelectedFilePairs: selected.length, parity,
  actualSelectedInterveningHistory: history,
  actualSelectedSourceParity: parity.filter(row => row.core).every(row => row.actualBaselineAndCurrentBlobBytesEqual),
  actualDocumentationCommit: docsCommit, actualRuntimeSourceCommit: runtimeCommit,
  actualExactRuntimeSourceFetchExitCode: runtime.status, actualNewShippingEditPerformed: false, actualTimingPerformed: false,
  codeIntelligenceLimit: 'GitHub semantic repository resolution returned404. Local LSP supplied syntax symbols;bounded outgoing evidence exposed only a field,not a complete call graph. Known local/Git source is read without graph-completeness claims.',
  actualInstructionScope: 'MVC AGENTS.md and cross-cutting source instructions apply. No shipping API/project/baseline/source changes are authorized by an incompatible optimization.',
  limit: 'Selected source/history parity only,not newer-default SDK integration. Bounded searches do not establish universal absence of other work.',
};
fs.writeFileSync(path.join(run, 'investigation.json'), JSON.stringify(investigation, null, 2) + '\n');
console.log(JSON.stringify({
  branch, baseline, actualCurrentDefault: current, actualSelectedSourceParity: investigation.actualSelectedSourceParity,
  actualChangedSelectedFiles: parity.filter(row => row.core && !row.actualBaselineAndCurrentBlobBytesEqual).map(row => row.file),
  actualRawSnapshots: investigation.actualRawSnapshots, actualExactRuntimeSourceFetchExitCode: runtime.status,
  actualTimingPerformed: false,
}, null, 2));
