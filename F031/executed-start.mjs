import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F031');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F031-template-completed-task';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const previous = read(path.join(session, 'F030-receipt-blob-verification.json'));
assert.equal(previous.length, 401);
assert.ok(previous.every(row => row.verified_remote_blob || row.verified_receipt_or_index));
const ledger = read(path.join(session, 'autoperf-campaign.json'));
const finding = ledger.candidates.find(row => row.id === 'F031');
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
  'src/Mvc/Mvc.ViewFeatures/src/TemplateRenderer.cs',
  'src/Mvc/Mvc.ViewFeatures/src/TemplateBuilder.cs',
  'src/Mvc/Mvc.ViewFeatures/src/HtmlHelper.cs',
  'src/Mvc/Mvc.ViewFeatures/src/Rendering/IHtmlHelper.cs',
  'src/Mvc/Mvc.ViewFeatures/src/Microsoft.AspNetCore.Mvc.ViewFeatures.csproj',
  'src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Shipped.txt',
  'src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Unshipped.txt',
  'src/Mvc/Mvc.ViewFeatures/test/TemplateRendererTest.cs',
  'src/Mvc/Mvc.ViewFeatures/test/DefaultDisplayTemplatesTest.cs',
  'src/Mvc/Mvc.ViewFeatures/test/DefaultEditorTemplatesTest.cs',
  'src/Mvc/Mvc.ViewFeatures/test/Rendering/HtmlHelperDisplayExtensionsTest.cs',
  'src/Mvc/Mvc.ViewFeatures/test/Rendering/HtmlHelperEditorExtensionsTest.cs',
  'src/Mvc/Mvc.ViewFeatures/test/Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj',
  'src/Mvc/Mvc.ViewFeatures/src/Buffers/MemoryPoolViewBufferScope.cs',
  'src/Mvc/Mvc.ViewFeatures/src/Buffers/ViewBuffer.cs',
  'src/Mvc/Mvc.ViewFeatures/src/Buffers/ViewBufferTextWriter.cs',
  'src/Mvc/Mvc.ViewFeatures/src/Buffers/PagedBufferedTextWriter.cs',
  'src/Mvc/Mvc.Razor/src/RazorView.cs',
  'src/Mvc/Mvc.Razor/src/RazorPage.cs',
  'src/Mvc/Mvc.Razor/src/RazorPageBase.cs',
  'src/Mvc/Mvc.Razor/src/Microsoft.AspNetCore.Mvc.Razor.csproj',
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
gh(`repos/dotnet/aspnetcore/commits?path=src/Mvc/Mvc.ViewFeatures/src/TemplateRenderer.cs&per_page=8&sha=${current}`,
  'actual-owner-history');
for (const [label, kind, query] of [
  ['owner', 'prs', 'TemplateRenderer'],
  ['async-template', 'issues', 'DisplayFor async'],
  ['completed-guard', 'prs', 'TemplateRenderer IsCompletedSuccessfully'],
]) {
  capture('gh', ['search', kind, query, '--repo', 'dotnet/aspnetcore', '--limit', '10',
    '--json', 'number,title,url,state,updatedAt'], `actual-upstream-search-${label}`);
}
const docsCommit = gh('repos/dotnet/AspNetCore.Docs/branches/main', 'actual-documentation-default').commit.sha;
for (const name of ['display-templates', 'editor-templates']) {
  capture('gh', ['api', '-H', 'Accept: application/vnd.github.raw+json',
    `repos/dotnet/AspNetCore.Docs/contents/aspnetcore/mvc/views/${name}.md?ref=${docsCommit}`],
  `actual-${name}-documentation`, true);
}
const acceptance = {
  candidate: 'F031', definedBeforeProductEditsOrTiming: true,
  exactPublicContracts: [
    'IHtmlContent IHtmlHelper.Display(string expression,string templateName,string htmlFieldName,object additionalViewData)',
    'IHtmlContent IHtmlHelper.Editor(string expression,string templateName,string htmlFieldName,object additionalViewData)',
  ],
  requirements: [
    'Independently exercise actual public Display and Editor through HtmlHelper,TemplateBuilder,TemplateRenderer and a real RazorView/CSharp template page. Do not reuse F029/F030 measurements or classify as a duplicate merely because a synchronous API waits.',
    'Preserve synchronous completed IHtmlContent,selected display/editor lookup,child ViewData/model/formatted value/prefix/additional values,output encoding,original exceptions/cancellation and view/writer/request-scope lifetime.',
    'Before any shipping edit, run fresh owning tests and a faithful pending template producer. The worker directly invokes the synchronous public helper with no harness task wait. Before release observe actual incomplete RazorView task,unfinished public invocation and no view disposal/output consumption;after release inspect actual output and exact exception or token.',
    'Nonblocking replacement is contract-blocked. Separately evaluate the compatible completed-success guard: keep renderTask local and existing branches,call GetAwaiter().GetResult() whenever !renderTask.IsCompletedSuccessfully. Never skip faults,cancellation or pending completion.',
    'Baseline and candidate use the byte-identical frozen benchmark harness and dependency closure except the actual ViewFeatures owner DLL/PDB. Verify source-to-PDB bindings,actual source hashes,loaded owner locations and every frozen consumer file before/after execution.',
    'Predeclare six completed profiles:Display/Editor custom Razor templates at32/4096 characters and unchanged built-in Display String controls at32/4096. Consume returned IHtmlContent before request-scope disposal. Include whole request/helper/template/scope/writer construction;no isolated awaiter/API-ranking claim.',
    'Exercise completed successful,already-faulted/already-canceled and pending success/failure/cancellation producer outcomes for both public APIs,plus FindView fallback and built-in display controls. No permanent tests that merely restate a successful-task branch.',
    'Maximum3 actual source-comparison slots,including partial/failed timing. One guard strategy unless actual evidence warrants a bounded change. Alternate paired order original/candidate,candidate/original,original/candidate;retain all raw samples,outliers and adverse/control outcomes.',
    'A small timing movement is not enough:seek material repeatable target benefit not explained by unchanged controls,without contract or material resource regressions. A clear >=50% primary gain may stop early;otherwise at most3 comparisons. No justified compatible measured benefit means restore original shipping source and publish no-gain rather than a speculative PR.',
    'Activate the pinned SDK,serialize heavy work,max2 build workers;use the byte-exact settings-preserving emitter without priority,affinity,power or unrelated-process changes on this shared machine.',
    'No public API,IVT,UnsafeAccessor,root global.json,package.json,package-lock.json or NuGet.config changes. Existing shipped baselines and manifests remain unchanged.',
  ],
  maximumActualComparisons: 3, actualComparisonsStarted: 0,
  noClaims: ['No HTTP,cshtml discovery/compilation,production frequency,throughput,starvation,deadlock or application-speedup proof.'],
};
fs.writeFileSync(path.join(run, 'acceptance.json'), JSON.stringify(acceptance, null, 2) + '\n');
const investigation = {
  candidate: 'F031', baseline, branch, actualCurrentDefault: current,
  actualRawSnapshots: parity.length * 3, actualSelectedFilePairs: selected.length, parity,
  actualSelectedInterveningHistory: history,
  actualSelectedSourceParity: parity.filter(row => row.core).every(row => row.actualBaselineAndCurrentBlobBytesEqual),
  actualDocumentationCommit: docsCommit, actualNewShippingEditPerformed: false, actualTimingPerformed: false,
  actualPriorArt: 'PagedBufferedTextWriter.WriteAsync uses IsCompletedSuccessfully guarded async continuation in this owning source tree;not a measurement of this proposed synchronous success guard.',
  existingRendererTestLimit: 'TemplateRendererTest has16 type-name rows only,not custom view completion/error/disposal coverage. Use actual helper/default-template suites and independent real Razor producer contracts.',
  codeIntelligenceLimit: 'Remote index targets msazure/One,not this GitHub checkout. Earlier GitHub resolution returned404. Local LSP found only same-file class references and no incoming calls;the actual cross-file TemplateBuilder/HtmlHelper chain was read directly,not claimed as graph-complete.',
  limit: 'Selected source/history parity only,not newer-default SDK integration. Bounded searches do not establish universal absence of other work;documentation fetch failures remain explicit.',
};
fs.writeFileSync(path.join(run, 'investigation.json'), JSON.stringify(investigation, null, 2) + '\n');
assert.ok(investigation.actualSelectedSourceParity && parity.filter(row => row.core).every(row =>
  row.actualWorkingLfBytesMatchBaselineBlob), 'Changed selected sources require an explicit current-default assessment.');
console.log(JSON.stringify({ branch, baseline, actualCurrentDefault: current,
  actualSelectedSourceParity: investigation.actualSelectedSourceParity,
  actualRawSnapshots: investigation.actualRawSnapshots, actualTimingPerformed: false }, null, 2));
