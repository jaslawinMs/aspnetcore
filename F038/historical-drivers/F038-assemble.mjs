import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F038');
const results = path.join(session, 'autoperf-published-results');
const destination = path.join(results, 'F038');
const root = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const git = args => {
  const result = spawnSync('git', args, { cwd: results, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};
assert.equal(git(['rev-parse', 'HEAD']), '3bfcf464394f94446a60fd3aa33cf0f35cdaf203');
assert.equal(git(['status', '--porcelain']), '');
assert.equal(git(['branch', '--show-current']), 'autoperf-results');
assert.equal(fs.existsSync(destination), false);
const decision = read(path.join(run, 'decision.json'));
const audit = read(path.join(run, 'audit-through-003.json'));
const live = read(path.join(run, 'live-file-audit.json'));
const source = read(path.join(run, 'source-publication', 'verified-source-publication.json'));
assert.equal(decision.actualAllApplicableAcceptanceChecksPassed, true);
assert.equal(source.actualAllSourceRefChecksPassed, true);
assert.equal(decision.actualSourceComparisonBudgetPermanentlyClosed, true);
fs.mkdirSync(destination);
const copies = [];
const omitted = [];
const write = (file, value) => {
  const target = path.join(destination, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value, { flag: 'wx' });
};
function copy(input, relative) {
  const bytes = fs.readFileSync(input);
  write(relative, bytes);
  assert.equal(sha(fs.readFileSync(path.join(destination, relative))), sha(bytes));
  copies.push({ source: input, destination: relative, bytes: bytes.length, sha256: sha(bytes) });
}
function walk(input, relative = '') {
  for (const entry of fs.readdirSync(input, { withFileTypes: true })) {
    assert.equal(entry.isSymbolicLink(), false, entry.name);
    const file = path.join(input, entry.name);
    const name = path.join(relative, entry.name);
    if (entry.isDirectory()) walk(file, name);
    else {
      const parts = name.split(path.sep);
      if (parts.includes('bin') || parts.includes('obj') ||
        /\.(?:dll|pdb|exe|so|dylib|a|lib|nupkg|zip|dmp|obj|bin)$/i.test(name)) {
        const bytes = fs.readFileSync(file);
        omitted.push({ source: file, originalRunRelativePath: name, bytes: bytes.length, sha256: sha(bytes),
          reason: 'Compiled/restore/native image bytes omitted; historical hash metadata is retained, not a portable binary rehash claim.' });
      } else copy(file, path.join('raw', name));
    }
  }
}
walk(run);
const preparation = read(path.join(run, 'preparation-original-001', 'verified-preparation.json'));
for (const entry of preparation.actualHarnessFiles)
  copy(path.join(run, 'harness', entry.file), path.join('harness', entry.file));
for (const name of fs.readdirSync(session).filter(name => /^F038-.*\.(?:mjs|ps1)$/.test(name)))
  copy(path.join(session, name), path.join('historical-drivers', name));
copy(path.join(session, 'F038-verify.mjs'), 'F038-verify.mjs');
for (const file of ['LICENSE.txt', 'docs\\BuildFromSource.md', 'src\\Components\\test\\E2ETest\\Tests\\KeyTest.cs',
  'src\\Components\\Components\\test\\RenderTreeDiffBuilderTest.cs'])
  copy(path.join(root, file), path.join('reference', file));
write('.gitattributes', '* -text\n');
write('omitted-file-manifest.json', JSON.stringify({
  candidate: 'F038', actualNativeBinaryBytesPublished: false, actualPortableAuditRehashesOmittedBytes: false,
  files: omitted,
}, null, 2) + '\n');
const table = [
  '# F038 complete results',
  '',
  'Positive less-time percentages favor the candidate. All 40 profiles and all three pairs are retained, including empty/singleton/scaled, mixed and unchanged controls.',
  '',
  '| Profile | Pair 1 original->candidate ns | Less time % | Pair 2 original->candidate ns | Less time % | Pair 3 original->candidate ns | Less time % | Median less time % | B/op original->candidate pairs 1/2/3 |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---|',
];
for (const profile of audit.summaryByProfile) {
  const rows = audit.pairs.map(pair => pair.rows.find(row => row.profile === profile.profile));
  const values = rows.flatMap(row => [
    `${row.originalMeanNs.toFixed(3)}->${row.candidateMeanNs.toFixed(3)}`, row.lessTimePercent.toFixed(2),
  ]);
  table.push(`| ${profile.profile} | ${values.join(' | ')} | ${profile.medianLessTimePercent.toFixed(2)} | ${rows.map(row =>
    `${row.originalBytesPerOp}->${row.candidateBytesPerOp}`).join(' / ')} |`);
}
table.push('', 'All 240 means and sample standard deviations were recomputed from 1,920 retained JSON measurements and matched against 1,920 actual native stdout result lines.',
  `Maximum measured profile CV: ${decision.actualMaximumCvPercent.toFixed(2)}%. The 99.9% confidence intervals and rounded MemoryDiagnoser values are retained as reported, not independently derived confidence or allocation counters.`,
  'The primary remains 74 B/op in all six members. 116/120 paired allocation reports are identical; four candidate reports are 1 B/op lower. No structural allocation reduction is claimed.',
  '', 'The three actual source comparisons are permanently closed. Independent project builds and characterizations are untimed and do not add measurement confidence.', '');
write('comparison-results.md', table.join('\n'));
const commandFiles = [
  'validation\\original-existing-1\\command.json', 'validation\\candidate-existing-1\\command.json',
  'formatting-candidate-001\\command.json', 'selenium-build-candidate-001\\command.json',
  'selenium-candidate-producer-001\\command.json', 'selenium-candidate-remaining-001\\command.json',
  'preparation-original-001\\commands.json', 'reproduction-candidate-001\\build-commands.json',
];
for (let round = 1; round <= 3; round++) for (const variant of ['original', 'candidate'])
  commandFiles.push(`measure-${variant}-${String(round).padStart(3, '0')}\\completion.json`);
const commands = [
  '# F038 exact validation and measurement commands',
  '',
  'Historical absolute paths are intentional. Each fresh .NET shell first ran `Set-Location C:\\src\\aspnetcore` and `. .\\activate.ps1`.',
  'These receipts are evidence, not overwrite/replay instructions. The archived source-comparison budget is closed.',
  '',
];
for (const file of commandFiles) {
  const value = read(path.join(run, file));
  for (const command of Array.isArray(value) ? value : [value]) {
    const code = command.actualExitCode;
    assert.equal(code, 0, file);
    commands.push(`## ${file}: ${command.arguments[0]}`, '', '**Result: passed, native exit 0.**', '', '```powershell',
      '& ' + [command.executable, ...command.arguments].map(argument => `'${String(argument).replaceAll("'", "''")}'`).join(' '),
      '```', '');
  }
}
commands.push('The original and candidate sample builds each passed with 0 warnings/0 errors. Both actual browser-result.json receipts record five real InteractiveServer click transitions and 0 page/console errors.',
  'The original startup-log buffering and missing bundled-browser prerequisites were isolated before assertions; actual owned listeners and installed Edge were used. No timing attempt failed and no fourth source comparison ran.', '');
write('validation-commands.md', commands.join('\n'));
const report = read(path.join(run, 'measure-original-001', 'reports', 'results', 'AutoPerf.KeyedRenderBenchmarks-report-full.json'));
write('environment.json', JSON.stringify(report.HostEnvironmentInfo, null, 2) + '\n');
const readme = `# F038: one-probe new-tree keyed rendering

**Qualified fork-only draft candidate:** the declared \`KeyedStable:Integer:256\` primary uses
**7.49%, 8.07%, 6.36% less renderer time** in three alternating comparisons
(median 7.49%), with **74 B/op unchanged**. This is a prepared actual-renderer result,
not application throughput, DOM/browser timing, or Mono/AOT performance.

Source branch: [\`${source.sourceBranch}\`](https://github.com/jaslawinMs/aspnetcore/tree/${source.sourceBranch})
at \`${source.sourceCommit}\`. Its diff is exactly one shipping file, 5 insertions/3 deletions.
The benchmark project and evidence live here, not in the shipping source diff.
\`publication.json\` is added separately after immutable remote blobs and the fork draft are verified.

## What changed and why

Only the new-tree loop in \`RenderTreeDiffBuilder.BuildKeyToInfoLookup\` changes.
\`CollectionsMarshal.GetValueRefOrAddDefault\` replaces a lookup followed by an indexer write.
The existing \`existingEntry\` local and branch structure are retained. The miss is immediately
initialized with \`new KeyedItemInfo(-1, newStartIndex)\`; the existing-key path preserves the
old index and exact duplicate guard. No ref escapes or spans another dictionary insertion.
The old-tree loop, comparer, exceptions, sibling scopes, permutations, pooling and public/protected surface are unchanged.

**Historical credit:** the same new-tree ref strategy was explored in
[dotnet/aspnetcore#70133](https://github.com/dotnet/aspnetcore/pull/70133) and removed by
\`95837ac848beda6c84dc17f44be2298dd7414df2\` under that earlier campaign's constraint.
That PR closed without merging; its final old-tree-only change is outside F038.
This is not a novelty claim. Its historical numbers are not this machine's results.

## Measurements, including the non-wins

- [All 40 profiles and all three pairs](comparison-results.md): 240 rows, 1,920 retained samples,
  independently matched between native stdout and full JSON; no discarded outliers.
- Counts 0/1/16/256; actual Integer/String keys; stable, reorder, replace, mixed and unkeyed controls.
  One complete prepared update runs through the real default Dispatcher, public RenderHandle,
  RenderTreeBuilder, Renderer and RenderBatch. Keys/labels/arrays/delegates are prepared outside timing.
  Timed lists contain elements, not keyed child components. There is no copied dictionary algorithm.
- At 256 items, stable string keys use 11.48/11.94/10.64% less time. This does not imply the
  same effect for every keyed workload: integer replacement at 256 has a 1.02% slower median.
- Unkeyed 256 integer/string controls have medians 0.32%/0.62% slower. Empty stable-string control
  is 5.10% slower at the median. Isolated adverse observations include integer replacement at 16
  taking 24.25% more time in pair 2 and mixed integer 256 taking 8.44% more in pair 1.
  They are retained, not dismissed or averaged out of the published rows.
- All 120 allocation pairs are retained: 116 equal and four reported 1 B/op lower.
  There is **no structural allocation-saving claim**. Maximum profile CV is${decision.actualMaximumCvPercent.toFixed(2)}%.
- Untimed real-renderer counting keys witness 128->96 hash calls for 32 keys and 64->48 for 16
  colliding keys. These are reachability/mechanism checks, not timed synthetic-key gains.

## Preservation and reproducibility

| Boundary | Actual evidence |
|---|---|
| Existing managed owner | All 83 original and 83 candidate RenderTreeDiffBuilderTest rows pass, 0 skipped; every TRX row and 14 required keyed facts parsed |
| Actual renderer contracts | Three successful characterizations each produce the same complete 44 semantic records and 40 actual benchmark lifecycles, including empty/singleton, growth, pool reuse, equal/colliding keys and real new/old duplicate producers |
| Actual browser producer | Canonical BlazorWebAppPerPage InteractiveServer, five real-click transitions on each source version; correct order, retained native element/component identities, local child state, typed input and unkeyed neighbors; removed/replaced nodes disconnected; actual WebSocket/framework 200; 0 page/console errors |
| Permanent browser coverage | Existing KeyTest.CanReorder plus seven remaining existing KeyTest facts pass, 8 fresh rows/0 skips, after the documented dependency-aware E2E build; Debug WebAssembly correctness only, not the measured Release image or Wasm performance |
| Exact measured harness | 106 files/image; only Components DLL/PDB differ. 104 unchanged files **include the two harness files**, leaving 102 other unchanged files |
| Runnable project | Exact seven-file project independently relocated, restored and rebuilt with 0 warnings/0 errors; actual 44 semantic/40 lifecycle collections match, with a separately compiled harness; no extra timing or relocated-PE identity claim |
| Cleanup | Only the two task-created Razor probes were archived then removed after permanent coverage passed; captured server/Selenium helpers gone; four unrelated untracked reports preserved |

This is performance/preservation work, **not a semantic bug-fix red/green claim**.
No new behavior needs a new semantic test. Existing permanent suites were reused.
[Exact commands and results](validation-commands.md) and original TRX/browser records are retained.

## Runtime, source and claim boundaries

- SDK \`12.0.100-alpha.1.26557.102\`; pinned runtime \`12.0.0-alpha.1.26562.105\`
  (\`Environment.Version\` 12.0.0); C# 13, Release, ServerGC, Windows x64 RyuJIT.
  [Actual host metadata](environment.json).
- BDN 0.13.0; settings-preserving in-process emitted executor; 3 warmups/8 results, 100 ms,
  unroll 1, \`DontRemove\`, \`Guid.Empty\` power-plan mode.
  Source order original/candidate, candidate/original, original/candidate; exactly three closed attempts.
- Shared Hyper-V VM, **not dedicated or isolated**. No priority/affinity/power/OS/network changes
  or unrelated process termination. All 240 before/after executor settings pairs and 240 setup/cleanup
  observations per side are recorded; the live audit rehashes ${live.actualUniquePhysicalFilesRehashed} unique files,
  ${live.actualConsumerBindings} consumer bindings and ${live.actualLoadedAssemblyBindings} loaded-assembly bindings.
- Fresh selected comparison against default \`${source.actualCurrentDefault}\`: 20/21 files match the
  tested baseline, including this owner, owning tests and selected keyed producers. Renderer event-error/
  disposed-exception changes are retained as explicit excluded drift; SDK/version files also differ.
  **Not a full-current-main build or measurement.**
- Timed binaries were built on baseline \`${source.actualMeasuredBuildHead}\` plus the uncommitted candidate,
  not relabeled as compiled from the later source publication commit. Its LF-canonical source matches.
- No production-frequency, whole-app, transport, browser, event-error/disposed-exception, hot-reload,
  WebView, Mono interpreter or AOT performance claim. The eight Selenium passes add bounded Debug
  WebAssembly correctness evidence, not that unmeasured runtime matrix.
- Selected PE/PDB witnesses cover ${live.actualSourcePePdbDocumentAssociations} source-document associations,
  not complete compiler provenance or method coverage. No new IVT or UnsafeAccessor is used.

## Use the evidence and project

Portable copied-text/statistics audit, without .NET or retiming:

\`\`\`powershell
node .\\F038-verify.mjs .
\`\`\`

\`harness\\AutoPerf.Benchmarks.csproj\` is the exact measured seven-file project.
For a **new** experiment, copy it outside the source checkout, activate that checkout's
repository SDK and set \`AUTOPERF_ASPNETCORE_ROOT\` to it. First build the actual owning
Components.Tests project in Release, not installed framework binaries. Restore/build the
standalone project with that checkout's NuGet.config. The actual independently successful
commands are in \`raw\\reproduction-candidate-001\\build-commands.json\`.

The program requires explicit mode, variant, fresh state directory, new 106-file consumer closure,
current nine selected source documents and report directory. Its usage and strong runtime/source
checks are in \`harness\\Program.cs\` and \`Evidence.cs\`; the executed preparation/reproduction
drivers show the exact manifest construction. Default to an untimed \`characterize\` run before
new measurements. Historical absolute paths/closed-budget drivers are evidence, **not overwrite/replay commands**.

Compiled/restore/native files are omitted with exact hashes; portable verification cannot rehash
those omitted bytes or independently recreate historical runtime execution.
See \`authoritative-copy-manifest.json\`,\`omitted-file-manifest.json\` and \`raw\\live-file-audit.json\`.
All copied raw source,stdout,CSV,full JSON,TRX and browser data are byte-exact.
`;
write('README.md', readme);
const evidenceLink = 'https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F038/README.md';
const issue = `## Measured F038 proposal

Only the new-tree keyed-lookup loop changes; the old-tree loop, duplicate failures, pooling and public API remain unchanged.

Declared actual-renderer primary \`KeyedStable:Integer:256\`: **7.49/8.07/6.36% less time**, median 7.49%, **74 B/op unchanged**, over three permanently closed comparisons. All 40 profiles/240 rows/1,920 stdout-and-JSON-cross-checked samples are retained.

This is not uniformly faster: empty stable-string median 5.10% slower; integer replacement 16 pair 2 takes 24.25% more time and mixed integer 256 pair 1 takes 8.44% more. The full adverse/control/allocation matrix is published.

All 83 original+83 candidate managed rows and eight existing owning keyed Selenium facts pass, 0 skips. Real canonical InteractiveServer clicks pass five transitions on each source version with 0 errors. Exact seven-file project independently rebuilds and characterizes. Same measured harness; only owner DLL/PDB differs.

Historical credit: dotnet/aspnetcore#70133 previously explored and removed this strategy at 95837ac848beda6c84dc17f44be2298dd7414df2. No novelty or reuse of its performance numbers is claimed.

[Immutable evidence, project, raw results and limitations](${evidenceLink}).
Source branch: \`${source.sourceBranch}\` at \`${source.sourceCommit}\`.
Shared Windows VM, .NET 12 RyuJIT only; 20/21 selected current-default files match, Renderer/SDK drift excluded. Not application/DOM/Mono-AOT performance or merge-ready.
`;
fs.writeFileSync(path.join(session, 'F038-issue-template.md'), issue, { flag: 'wx' });
const detail = `Only the new-tree \`BuildKeyToInfoLookup\` probe/update seam changes. The value ref is consumed before another insertion; miss initialization, existing old index and exact duplicate guard are retained. Old-tree construction, key comparer, pool ownership and public/protected API are unchanged.

**Measured scope:** one complete prepared public-renderer element-list update on this shared Windows x64 .NET 12 VM. Declared \`KeyedStable:Integer:256\` uses **7.49%, 8.07%, 6.36% less time** (median 7.49%), **74 B/op unchanged**. Exactly three closed source pairs, 40 profiles/member, 240 rows/1,920 raw samples independently matched between stdout and JSON. One identical measured harness; only Components DLL/PDB differ across 106-file images (104 unchanged include harness DLL/PDB, leaving 102 other files).

**Non-wins retained:** empty stable-string median 5.10% slower; integer replacement 16 pair 2 takes 24.25% more time, mixed integer 256 pair 1 takes 8.44% more. Unkeyed 256 controls have medians 0.32%/0.62% slower. No uniform-speedup or structural allocation claim.

**Preservation:** all 83 original+83 candidate existing managed rows pass, 0 skips; after a dependency-aware Debug E2E build, all eight existing KeyTest Selenium facts pass, 0 skips. Both real InteractiveServer browser versions pass five click-driven identity/state/order transitions with 0 page/console errors. Three complete 44 semantic/40 benchmark-lifecycle collections match, including the independently relocated exact seven-file project. No new semantic behavior or new test cases are claimed.

**Commands and results** (every fresh .NET shell activates \`. .\\activate.ps1\`; complete exact invocations are linked below):

- \`dotnet test src\\Components\\Components\\test\\Microsoft.AspNetCore.Components.Tests.csproj --configuration Release --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false -p:UseSharedCompilation=false --filter "FullyQualifiedName~Microsoft.AspNetCore.Components.Test.RenderTreeDiffBuilderTest"\`: **passed 83/83 original and 83/83 candidate**, with recorded TRX logger/results arguments.
- \`dotnet build src\\Components\\test\\E2ETest\\Microsoft.AspNetCore.Components.E2ETests.csproj --configuration Debug --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false -p:UseSharedCompilation=false\`: **passed, 0 warnings/0 errors**.
- \`dotnet test src\\Components\\test\\E2ETest\\Microsoft.AspNetCore.Components.E2ETests.csproj --configuration Debug --no-build --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false --filter "FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.KeyTest.CanReorder"\`: **passed 1/1**, then one combined exact seven-method selector **passed 7/7**, all fresh TRX rows inspected.
- Focused \`dotnet format whitespace\` on the changed file: **passed, no modifications**. Exact standalone seven-file project restore/build and untimed characterization: **passed, 0 warnings/0 errors, 44 semantic+40 lifecycle records**.

[Immutable evidence and runnable benchmark project](${evidenceLink}) / [all 40 profile results](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F038/comparison-results.md) / [every exact command and result](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F038/validation-commands.md).

**Historical credit and limitations:** dotnet/aspnetcore#70133 previously tried this new-tree strategy, removed at 95837ac848beda6c84dc17f44be2298dd7414df2; no novelty claim or imported performance numbers. 20/21 selected current-default files match baseline; Renderer event-error/disposed-exception and SDK/version drift remain excluded. Not full-current-main, application, DOM/browser or Mono/AOT performance. Existing Selenium coverage is Debug WebAssembly correctness, not the measured Release image. Shared VM, not isolated; no priority/affinity/power changes. Research draft for this fork, **not merge-ready**.`;
const template = fs.readFileSync(path.join(run, 'pr-template-main.md'), 'utf8');
const pr = template.replace('# {PR title}', '# Avoid duplicate new-tree key lookups during rendering')
  .replaceAll('- [ ]', '- [x]')
  .replace('Summary of the changes (Less than 80 chars)', 'Avoid duplicate dictionary probes when merging new keyed render-tree siblings.')
  .replace('{Detail}', detail).replace('Fixes #{bug number} (in this specific format)', 'Fixes #@TRACKING_NUMBER@');
assert.ok(!pr.includes('{Detail}') && !pr.includes('{PR title}'));
fs.writeFileSync(path.join(session, 'F038-pr-template.md'), pr, { flag: 'wx' });
copy(path.join(session, 'F038-issue-template.md'), 'issue-template.md');
copy(path.join(session, 'F038-pr-template.md'), 'pr-template.md');
write('authoritative-copy-manifest.json', JSON.stringify({
  candidate: 'F038', actualCopiedSourceBytesUnchanged: true, files: copies,
}, null, 2) + '\n');
write('raw-file-copy-verification.json', JSON.stringify({
  candidate: 'F038', actualByteExactCopies: copies.length, actualHashedOmissions: omitted.length,
  actualRawNativeAndReportBytesUnchanged: true, actualMeasuredHarnessSourcesUnchanged: 7,
  actualConsumerNativeBytesOmittedWithHashes: true,
}, null, 2) + '\n');
const files = [];
function inventory(folder, relative = '') {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    const name = path.join(relative, entry.name);
    if (entry.isDirectory()) inventory(file, name);
    else files.push({ path: name, bytes: fs.statSync(file).size, sha256: sha(fs.readFileSync(file)) });
  }
}
inventory(destination);
write('capsule-file-hashes.json', JSON.stringify({
  candidate: 'F038', actualNativeBinaryBytesRehashableByPortableAudit: false,
  files: files.sort((a, b) => a.path.localeCompare(b.path)),
}, null, 2) + '\n');
const count = files.length + 1;
fs.writeFileSync(path.join(session, 'F038-immutable-file-count.txt'), String(count) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(session, 'F038-capsule-assembly.json'), JSON.stringify({
  candidate: 'F038', actualImmutableFiles: count, actualByteExactCopies: copies.length,
  actualHashedOmissions: omitted.length, actualSourceCommit: source.sourceCommit,
  actualNoRootInventoryChanges: true, actualNoPublicationReceiptYet: true,
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F038', actualImmutableFiles: count,
  actualByteExactCopies: copies.length, actualHashedOmissions: omitted.length,
  actualRootInventoryUnchanged: true }, null, 2));
