import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F030');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F030-sync-render-partial-source';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const previous = read(path.join(session, 'F029-receipt-blob-verification.json'));
assert.equal(previous.length, 636);
assert.ok(previous.every(row => row.verified_remote_blob || row.verified_receipt_or_index));
const ledger = read(path.join(session, 'autoperf-campaign.json'));
const finding = ledger.candidates.find(row => row.id === 'F030');
assert.equal(finding.status, 'pending');
fs.mkdirSync(run);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(run, 'executed-start.mjs'));
fs.writeFileSync(path.join(run, 'finding.json'), JSON.stringify(finding, null, 2) + '\n');
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
const current = gh('repos/dotnet/aspnetcore/branches/main', 'actual-current-default').commit.sha;
if (capture('git', ['cat-file', '-e', `${current}^{commit}`], 'current-local-probe', true).status !== 0) {
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
  ['owner', 'prs', 'RenderPartial'],
  ['blocking', 'issues', 'RenderPartial synchronous'],
  ['diagnostic', 'prs', 'MVC1000'],
]) {
  capture('gh', ['search', kind, query, '--repo', 'dotnet/aspnetcore', '--limit', '10',
    '--json', 'number,title,url,state,updatedAt'], `actual-upstream-search-${label}`);
}
const docsCommit = '6dfdff09330bd75429991b46b97d340b07cc5d6a';
capture('gh', ['api', '-H', 'Accept: application/vnd.github.raw+json',
  `repos/dotnet/AspNetCore.Docs/contents/aspnetcore/diagnostics/mvc1000.md?ref=${docsCommit}`],
  'actual-mvc1000-documentation');
const acceptance = {
  candidate: 'F030', definedBeforeProductEditsOrTiming: true,
  exactShippedEntryPoint: 'void HtmlHelperPartialExtensions.RenderPartial(IHtmlHelper htmlHelper,string partialViewName,object model,ViewDataDictionary viewData)',
  requirements: [
    'Independently exercise RenderPartial,not Partial or a reused F029 observation. No duplicate classification merely because both synchronous APIs wait.',
    'Preserve the shipped void signature,complete writes to ViewContext.Writer before normal return,original unwrapped errors/cancellation and view disposal.',
    'Use actual public HtmlHelper.RenderPartial from a CSharp parent RazorPage executing under real RazorView;the actual partial RazorView executes its own page-owned pending producer.',
    'Resolve the real request-scoped MVC buffer service through public DI. Let real parent RazorView provide its buffered page writer;do not access internal buffer classes or add IVT/UnsafeAccessor.',
    'Before release,observe actual partial producer entry,incomplete real partial task,no finished synchronous public invocation,no parent-after marker,and waiting calling thread. Prove the outer render call has not returned a task to the harness,so a harness-side GetResult cannot be the observed wait.',
    'Async control uses existing RenderPartialAsync on the same real parent/partial producer. It must return incomplete real tasks without reaching the parent-after marker;caller migration is not a new framework optimization.',
    'After success verify ordered parent-before/partial/parent-after output,real child ViewData/model isolation,one GetView/render/disposal and an undisposed caller-owned root writer. After failures preserve exact exception identity or cancellation token at both parent public-call and external boundaries,without reaching the parent-after marker.',
    'Run fresh existing owning tests and inspect every actual theory outcome. Existing RenderPartialMethods_CallHtmlHelperWithExpectedArguments uses async MemberData;do not falsely count it as synchronous-success coverage.',
    'No shipping/API/root package/global.json/NuGet.config changes for an incompatible replacement. At most3 actual source comparisons;no manufactured fix or optimization draft.',
    'If contract-blocked,predeclare one original-only four-case completed diagnostic with all results retained,zero comparison/gain/API-ranking claims and no pending gates in timing.',
    'Activate the pinned SDK,serialize heavy work,max2 build workers;do not alter priority,affinity,power or unrelated processes on this shared machine.',
  ],
  noClaims: ['No HTTP,cshtml discovery/compilation,production frequency,throughput,starvation or application-speedup proof.'],
  maximumActualComparisons: 3, actualComparisonsStarted: 0,
};
fs.writeFileSync(path.join(run, 'acceptance.json'), JSON.stringify(acceptance, null, 2) + '\n');
const investigation = {
  candidate: 'F030', baseline, branch, actualCurrentDefault: current,
  actualRawSnapshots: parity.length * 3, actualSelectedFilePairs: selected.length, parity,
  actualSelectedInterveningHistory: history,
  actualSelectedSourceParity: parity.filter(row => row.core).every(row => row.actualBaselineAndCurrentBlobBytesEqual),
  actualDocumentationCommit: docsCommit, actualNewShippingEditPerformed: false, actualTimingPerformed: false,
  codeIntelligenceLimit: 'The available remote index targets msazure/One,not this GitHub checkout. Earlier GitHub repository resolution returned404. Local LSP supplies bounded syntax evidence only;known source/Git reads are not a complete resolved call graph.',
  limit: 'Selected source/history parity only,not newer-default SDK integration. Bounded searches do not establish universal absence of other work.',
};
fs.writeFileSync(path.join(run, 'investigation.json'), JSON.stringify(investigation, null, 2) + '\n');
assert.ok(investigation.actualSelectedSourceParity && parity.filter(row => row.core).every(row =>
  row.actualWorkingLfBytesMatchBaselineBlob), 'Changed selected sources require an explicit current-default assessment.');
console.log(JSON.stringify({ branch, baseline, actualCurrentDefault: current,
  actualSelectedSourceParity: investigation.actualSelectedSourceParity,
  actualRawSnapshots: investigation.actualRawSnapshots, actualTimingPerformed: false }, null, 2));
