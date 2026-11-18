import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F040');
const results = path.join(session, 'autoperf-published-results');
const destination = path.join(results, 'F040');
const root = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const git = args => {
  const result = spawnSync('git', args, { cwd: results, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};
assert.equal(git(['rev-parse', 'HEAD']), 'bd689a66bb69c31a8b09ea990bf01e5c2b068a8c');
assert.equal(git(['status', '--porcelain']), '');
assert.equal(git(['branch', '--show-current']), 'autoperf-results');
assert.equal(fs.existsSync(destination), false);
const decision = read(path.join(run, 'decision.json'));
const audit = read(path.join(run, 'audit-through-003.json'));
const assessment = read(path.join(run, 'measurement-assessment.json'));
const live = read(path.join(run, 'live-file-audit.json'));
const source = read(path.join(run, 'source-publication', 'verified-source-publication.json'));
assert.equal(decision.actualAllApplicableAcceptanceChecksPassed, true);
assert.equal(source.actualAllSourceRefChecksPassed, true);
assert.equal(decision.actualSourceComparisonBudgetPermanentlyClosed, true);
assert.equal(audit.actualPairs, 3);
assert.equal(audit.actualRows, 240);
assert.equal(audit.actualRawResultSamples, 1920);
assert.equal(assessment.actualAllMeasuredAllocationReportsZero, true);
fs.mkdirSync(destination);
const copies = [], omitted = [];
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
    assert.equal(entry.isSymbolicLink(), false);
    const file = path.join(input, entry.name), name = path.join(relative, entry.name);
    if (entry.isDirectory()) walk(file, name);
    else if (name.split(path.sep).some(part => part === 'bin' || part === 'obj') ||
      /\.(?:dll|pdb|exe|so|dylib|a|lib|nupkg|zip|dmp|obj|bin)$/i.test(name)) {
      const bytes = fs.readFileSync(file);
      omitted.push({ source: file, originalRunRelativePath: name, bytes: bytes.length, sha256: sha(bytes),
        reason: 'Compiled/restore/native bytes omitted; hashes are historical metadata, not a portable rehash claim.' });
    } else copy(file, path.join('raw', name));
  }
}
walk(run);
const projectFiles = read(path.join(run, 'preparation-original-001', 'harness-source-manifest.json')).files;
for (const entry of projectFiles) copy(path.join(run, 'harness', entry.file), path.join('harness', entry.file));
for (const name of fs.readdirSync(session).filter(name => /^F040-.*\.(?:mjs|ps1)$/.test(name)))
  copy(path.join(session, name), path.join('historical-drivers', name));
copy(path.join(session, 'F040-verify.mjs'), 'F040-verify.mjs');
for (const file of ['LICENSE.txt', 'docs\\BuildFromSource.md',
  'src\\Components\\test\\E2ETest\\Tests\\TempDataCookieTest.cs',
  '.github\\pull_request_template.md', '.github\\PULL_REQUEST_TEMPLATE\\servicing.md'])
  copy(path.join(root, file), path.join('reference', file));
write('.gitattributes', '* -text\n');
write('omitted-file-manifest.json', JSON.stringify({
  candidate: 'F040', actualNativeBinaryBytesPublished: false, actualPortableAuditRehashesOmittedBytes: false, files: omitted,
}, null, 2) + '\n');
const primary = audit.primary;
const pcts = primary.lessTimePercentByPair.map(value => value.toFixed(2)).join('/');
const median = primary.medianLessTimePercent.toFixed(2);
const worst = assessment.actualWorstIndividualPairedRows.slice(0, 3);
const adverse = assessment.actualAllAdverseProfiles
  .map(row => `${row.profile}: ${(-row.medianLessTimePercent).toFixed(2)}% slower`).join('; ');
const worstText = worst.map(row => `${row.profile} comparison ${row.round}: ${(-row.lessTimePercent).toFixed(2)}% more time`).join('; ');
const qualification = assessment.actualMissOrControlMedianRegressionsAtLeastFivePercent.length
  ? assessment.actualMissOrControlMedianRegressionsAtLeastFivePercent
    .map(row => `${row.profile}: ${(-row.medianLessTimePercent).toFixed(2)}% median regression`).join('; ')
  : 'No miss/control median regression reaches 5%; individual adverse observations are still retained.';
const table = ['# F040 complete RemoveAndRestore results', '',
  'Positive less-time percentages favor the candidate. Restoration of every nonempty prepared target is inside timing.',
  'These are round-trip costs, not isolated Remove nanoseconds. Empty profiles remain genuine misses without restoration.',
  '', '| Profile | Comparison 1 original->candidate ns | Less time % | Comparison 2 original->candidate ns | Less time % | Comparison 3 original->candidate ns | Less time % | Median less time % | B/op original->candidate, comparisons 1/2/3 |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---|'];
for (const profile of audit.summaryByProfile) {
  const rows = audit.pairs.map(pair => pair.rows.find(row => row.profile === profile.profile));
  const values = rows.flatMap(row => [`${row.originalMeanNs.toFixed(4)}->${row.candidateMeanNs.toFixed(4)}`, row.lessTimePercent.toFixed(2)]);
  table.push(`| ${profile.profile} | ${values.join(' | ')} | ${profile.medianLessTimePercent.toFixed(2)} | ${rows.map(row =>
    `${row.originalBytesPerOp}->${row.candidateBytesPerOp}`).join(' / ')} |`);
}
table.push('', '**Actual execution order:** comparison 1 original/candidate; 2 candidate/original; 3 original/candidate.',
  'All 240 row means and sample standard deviations were recomputed from 1,920 JSON measurements and matched against 1,920 native stdout WorkloadResult lines.',
  `Every one of 240 allocation reports is 0 B/op. No allocation-saving claim. Maximum measured profile CV: ${decision.actualMaximumCvPercent.toFixed(2)}%; noisy/adverse rows are retained.`,
  'BDN 99.9% confidence intervals and rounded MemoryDiagnoser values are retained as reported, not independently derived confidence or allocation counters.',
  '', `**All adverse medians:** ${adverse || 'none'}.`,
  `**Worst individual paired rows:** ${worstText}.`, qualification,
  '', 'All three authorized comparisons completed. The budget is permanently closed; no fourth comparison, replacement run or extra timing was performed.', '');
write('comparison-results.md', table.join('\n'));
const commandFiles = [
  'validation\\InitialManagedBuild-original-1\\command.json',
  'validation\\Tests-original-1\\command.json', 'validation\\Tests-original-2\\command.json',
  'validation\\Tests-original-3\\command.json', 'validation\\Tests-candidate-1\\command.json',
  'validation\\Format-candidate-1\\command.json',
  'validation\\SampleBuild-original-1\\command.json', 'validation\\SampleBuild-candidate-1\\command.json',
  'validation\\HarnessRestore-original-1\\command.json', 'validation\\HarnessBuild-original-1\\command.json',
  'characterize-original-001\\completion.json', 'characterize-candidate-001\\completion.json',
  'selenium-build-candidate-001\\command.json', 'selenium-candidate-producer-001\\command.json',
  'selenium-candidate-remaining-001\\command.json', 'reproduction-candidate-001\\build-commands.json',
  'reproduction-candidate-001\\characterize-command.json',
];
for (const round of [1, 2, 3]) for (const variant of ['original', 'candidate'])
  commandFiles.push(`measure-${variant}-${String(round).padStart(3, '0')}\\completion.json`);
const quote = argument => `'${String(argument).replaceAll("'", "''")}'`;
const commands = ['# F040 exact validation and measurement commands', '',
  'Historical absolute paths are intentional. Each fresh .NET shell first ran `Set-Location C:\\src\\aspnetcore` and `. .\\activate.ps1`.',
  'These receipts are evidence, not replay/overwrite instructions. The source-comparison budget is permanently closed.', ''];
for (const file of commandFiles) {
  const value = read(path.join(run, file));
  for (const command of Array.isArray(value) ? value : [value]) {
    commands.push(`## ${file}`, '',
      `**Result: ${command.actualExitCode === 0 ? 'passed' : 'failed, preserved'}, native exit ${command.actualExitCode}.**`, '',
      '```powershell', '& ' + [command.executable, ...command.arguments].map(quote).join(' '), '```', '');
  }
}
for (const variant of ['original', 'candidate']) {
  const launch = read(path.join(run, `sample-${variant}`, 'launch.json'));
  commands.push(`## Actual canonical browser sample: ${variant}`, '',
    '**Result: eight real cookie-backed navigations passed; framework JS 200; zero page/console errors; owned helpers stopped.**', '',
    '```powershell', '& ' + [launch.executable, ...launch.arguments].map(quote).join(' '), '```',
    `Executed browser driver: \`node F040-browser-probe.mjs ${variant}\`; exact server and browser state are retained under \`raw\\sample-${variant}\`.`, '');
}
commands.push('The broad initial managed build failed in unchanged Framework.App.Runtime packaging: MSB4057 CreateWixInstaller and NETSDK1094 ReadyToRun runtime package.',
  'No global successful-initialization marker was created and no unrelated fix/config/restore change was made. Documented focused-project fallback was used; this is not a repository-wide or packaging pass.',
  'The first added-theory compilation failed with CS8632 because its existing test project disables nullable annotations. Its exact failing source and output are retained; only the new theory adopted the existing oblivious-object style.',
  'The later original and candidate runs each pass 73 rows, including all eight CollectionRemove_UpdatesRetainedValues_WhenFirstAccessTriggersLazyLoad cases, 0 skipped.',
  'These are behavior-preserving optimization checks, not a semantic-bug red/green claim.',
  'Ten existing nonquarantined TempDataCookieTest facts pass after the dependency-aware Debug E2E build. String-key Remove is adjacent coverage, not direct collection Remove proof.',
  'TempDataPersistWithoutAccessing remains pre-quarantined by dotnet/aspnetcore#70085 and is neither selected nor counted as passed.',
  'The exact seven-file project independently restores/builds/characterizes, with no extra timing. All owned sample/Selenium helpers are gone.', '');
write('validation-commands.md', commands.join('\n'));
write('environment.json', JSON.stringify(read(path.join(run, 'measure-original-001', 'reports', 'results',
  'AutoPerf.TempDataRemoveBenchmarks-report-full.json')).HostEnvironmentInfo, null, 2) + '\n');
const primaryTable = audit.pairs.map(pair => {
  const row = pair.primary;
  const cv = variant => audit.allRows.find(value => value.round === pair.round && value.variant === variant &&
    value.profile === primary.profile).coefficientOfVariationPercent.toFixed(2);
  return `| ${pair.round} | ${pair.order.join(' then ')} | ${row.originalMeanNs.toFixed(4)} | ${row.candidateMeanNs.toFixed(4)} | ${row.lessTimePercent.toFixed(2)} | ${cv('original')}/${cv('candidate')} |`;
}).join('\n');
write('README.md', `# F040: TempData conditional collection removal

**Qualified fork-only research draft:** the predeclared \`Match:12:8\` primary uses
**${pcts}% less time**, median **${median}%**, in three completed comparisons.
All 240 allocation reports are **0 B/op unchanged**.
This measures prepared loaded **RemoveAndRestore round trips, with restoration inside timing**,
not isolated Remove nanoseconds or application/cookie/DI/rendering/browser performance.

| Comparison | Actual native order | Original ns | Candidate ns | Less time % | Original/candidate CV % |
|---|---|---:|---:|---:|---:|
${primaryTable}

Source branch [\`${source.sourceBranch}\`](https://github.com/jaslawinMs/aspnetcore/tree/${source.sourceBranch})
at \`${source.sourceCommit}\`. Exactly two source files change: one existing shipping condition
and 47 focused preservation-test lines. F039 Contains and all other shipping statements,
public/protected declarations, friend grants and API baselines remain unchanged.
\`publication.json\` is added separately after immutable remote verification and draft creation.

## Change and compatibility

Only the condition in explicit \`ICollection<KeyValuePair<string, object?>>.Remove\` changes:

\`\`\`csharp
if (Data.TryGetValue(item.Key, out var value) && Equals(value, item.Value))
{
    return Remove(item.Key);
}
\`\`\`

The original calls ContainsKey and non-consuming Peek before the same final Remove(key).
The candidate uses **private Data.TryGetValue**, never the consuming public IDictionary member.
It removes one initial successful-hit probe, **not all removal/retained-key work**.
The branch, final Remove(key), its returned Boolean and final false return are unchanged.
Lazy load ordering, absent/present-null, OrdinalIgnoreCase keys, stored-value-first equality,
exceptions and Save retention are preserved. Reentrant equality may remove or replace a key:
the outer operation still returns the result of the final actual Remove(key).

## Actual producer and steady-state benchmark

AddRazorComponents and public RazorComponentResult rendering capture the actual source-built
internal owner through its registered ITempData cascade and real cookie-provider callback.
No copied owner algorithm, private constructor/member reflection, new IVT or UnsafeAccessor is used.
The real provider remains cold at capture and loads once. Direct memory-response result execution
does not execute endpoint-invoker persistence; separate real mapped sample requests cover it.

All keys, distinct equal string objects, case-varied queries, pairs and restoration inputs are
prepared outside timing. Every nonempty timed call performs collection Remove (or the explicitly
unchanged public string-key Remove control), then restores the original target using its actual setter.
Restoration and retained-key work **remain inside timing** for every nonempty profile, including
mismatch/missing controls. Empty profiles skip restoration and remain genuinely empty misses.
Both complete untimed characterizations and the independent rebuild exercise 16 repeated selected
calls for each of 40 profiles (640 calls), checking the result/cardinality after each call.
Eighty setup/cleanup validation calls per characterization are recorded separately.

## All observations and failures retained

- [All 40 profiles and three comparisons](comparison-results.md): 240 report rows and 1,920
  stdout/JSON-matched samples; counts0/1/8/64, key lengths12/128, Match/Different/Null/MissingNull/
  unchanged string-key Remove controls. Three authorizations completed; no fourth or extra timing.
- **All adverse medians:** ${adverse || 'none'}.
  **Worst individual rows:** ${worstText}.
  ${qualification}
- Maximum profile CV is **${decision.actualMaximumCvPercent.toFixed(2)}%**; primary CVs are in the table.
  This is a shared Windows Hyper-V VM, not isolated. No uniform-speedup or production-frequency claim.
  All allocation reports remain0B/op, with no structural allocation-saving claim.
- The initial broad managed build **failed**, exit1, in unchanged Framework.App.Runtime packaging:
  MSB4057 missing CreateWixInstaller and NETSDK1094 missing ReadyToRun runtime package.
  The exact command/logs and focused fallback are retained. No false successful-initialization marker
  or repository-wide/packaging pass is claimed; focused managed/sample/harness/E2E builds pass.
- An earlier untimed added-theory compilation failed with CS8632. The exact failing source/output
  are retained. Only the added theory adopted the existing project's nullable-disabled style.
  Neither untimed failure is misreported as a completed timing run.

## Preservation and reproducibility

| Boundary | Actual evidence |
|---|---|
| Owning managed contract | 73 original +73 candidate rows pass,0skipped; all eight CollectionRemove_UpdatesRetainedValues_WhenFirstAccessTriggersLazyLoad cases are parsed individually |
| Public producer | Three complete characterizations (original, candidate, independent rebuilt project) match17semantic records and40lifecycles;43actual public-owner captures each |
| Equality/retention | Cold real-provider load once, null/missing/casing, actual null-key failure, asymmetric/throwing equality, and reentrant removal/matched replacement/mismatched replacement; custom equality objects are in-memory only |
| Mapped cookie persistence | Eight real full-document canonical BlazorWebAppPerPage navigations per source version; mismatches preserve, matches remove, missing-null preserves present-null, unrelated sibling survives following requests; framework200;0page/console errors |
| Existing permanent browser suite | Ten nonquarantined TempDataCookieTest facts pass,0skipped, after dependency-aware Debug build; string-key Remove is adjacent, not direct collection Remove coverage |
| Known excluded fact | TempDataPersistWithoutAccessing remains pre-quarantined by dotnet/aspnetcore#70085; never forced or counted |
| Exact timed image | 197files per variant; only Endpoints DLL/PDB differ.195unchanged entries include identical measured harness DLL/PDB, leaving193other entries |
| Runnable project | Exact seven-file project independently relocates/restores/builds with0warnings/errors, discovers40actual BDN cases and characterizes17semantic/40lifecycle records; separately compiled harness, no extra timing or same-PE claim |
| Cleanup | Only our archived temporary Razor page was removed; all captured owned sample/Selenium helpers are gone; four unrelated reports are preserved |

This is intended behavior-preserving performance work, **not a semantic-bug red/green claim**.
[Every exact command and result](validation-commands.md), original TRX/browser records and the
five-field permanent boundary are retained.

## Runtime, source history and limits

- SDK12.0.100-alpha.1.26557.102, pinned runtime12.0.0-alpha.1.26562.105
  (Environment.Version12.0.0), C#13, Release, ServerGC, Windows x64 RyuJIT.
  [Actual host metadata](environment.json).
- BDN0.13.0; settings-preserving in-process emit executor;3warmups/8results,100ms,
  unroll1,DontRemove,Guid.Empty power-plan mode. Executor settings are observed before/after
  every profile. No priority/affinity/power/OS/network changes or unrelated process termination.
- All18selected owner/interface/producer/project/test files match fresh upstream default
  \`${source.actualCurrentDefault}\` before edits. Not a full-current-default build or dependency-equivalence claim.
- Timed source was baseline \`${source.actualMeasuredBuildHead}\` plus the uncommitted candidate,
  not relabeled as built from the later publication commit. Both committed source files'
  LF-canonical content matches the tested snapshots.
- Authoritative feature design dotnet/aspnetcore#65039 and relevant history were read.
  Bounded open-work searches and complete file pages for five TempData-related open PR hits are
  retained, not proof of global novelty or absence.
- Selected PE/PDB witnesses cover${live.actualSourcePePdbDocumentAssociations}source-document associations,
  not complete compiler provenance or method coverage. Live audit hashes${live.actualUniquePhysicalFilesRehashed}
  unique files,${live.actualConsumerBindings}consumer and${live.actualLoadedAssemblyBindings}loaded-assembly bindings.
- No whole-app/transport/DOM/browser/cookie timing, session-provider, streaming-performance,
  InteractiveServer/Auto/WASM/Mono/AOT performance or production-frequency claim.
  Existing Debug static-SSR Selenium adds correctness only, not the measured Release image.

## Use the evidence and exact project

Portable copied-text/statistics audit, without .NET or retiming:

\`\`\`powershell
node .\\F040-verify.mjs .
\`\`\`

\`harness\\AutoPerf.Benchmarks.csproj\` and its six C# files are the exact measured project.
For a **new** experiment, copy them outside the source checkout, activate that checkout's repository
SDK and set AUTOPERF_ASPNETCORE_ROOT. First dependency-aware build the actual owning
Components.Endpoints.Tests project in Release, not installed substitute framework binaries.
Then restore/build the standalone project. The independent successful commands are retained
under \`raw\\reproduction-candidate-001\\build-commands.json\`.

The program requires explicit mode,variant,fresh state directory,new197-file consumer closure,
current12selected source documents and report directory. Its usage/validation are in Program.cs/Evidence.cs;
the executed preparation/reproduction drivers show exact manifest construction. Run untimed
characterize first. Closed-budget historical drivers/absolute paths are evidence, not overwrite/replay instructions.

Compiled/restore/native bytes are omitted with exact hashes. Portable verification cannot rehash
those omitted bytes or independently recreate historical compilation/runtime execution.
All copied source/stdout/CSV/full JSON/TRX/browser data is byte-exact.
`);
const evidenceLink = 'https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F040/README.md';
const issue = `## Measured F040 proposal

Use private Data.TryGetValue in TempData's explicit conditional collection Remove, preserving the
same object.Equals direction, branch and final Remove(key) result/retention. Never use the consuming
public IDictionary.TryGetValue or remove before equality. F039 Contains and public API are unchanged.

Predeclared actual-owner Match:12:8: **${pcts}% less RemoveAndRestore time**, median **${median}%**,
**0 B/op unchanged**. Restoration is inside timing, not isolated Remove cost. All three comparisons
completed:40profiles/member,240rows,1,920stdout/JSON-matched samples. The budget is permanently closed.

**Non-wins:** ${adverse || 'none'}. Worst individual observations: ${worstText}.
${qualification} Maximum CV${decision.actualMaximumCvPercent.toFixed(2)}%; shared VM, not isolated.

73original+73candidate managed rows pass, including all eight new lazy-load/Save preservation rows;
17semantic/40lifecycle records match across original/candidate/independent rebuilt project.
Both canonical mapped cookie browser versions pass8real navigations/0errors. Ten existing
nonquarantined TempDataCookieTest facts pass after a dependency-aware Debug build. The pre-quarantined
TempDataPersistWithoutAccessing (dotnet/aspnetcore#70085) is excluded, not counted.

The broad initial managed build failed only in unchanged Framework.App.Runtime packaging
(MSB4057/NETSDK1094); focused builds passed. Earlier untimed CS8632 test compilation and its
style correction are retained. No full repository/packaging pass is claimed.

[Immutable evidence, runnable project, exact commands and limitations](${evidenceLink}).
Source branch \`${source.sourceBranch}\` at \`${source.sourceCommit}\`.
Not isolated Remove, application/cookie/DI/rendering/Mono/AOT performance or merge-ready.
`;
fs.writeFileSync(path.join(session, 'F040-issue-template.md'), issue, { flag: 'wx' });
const detail = `Replace only the initial condition's ContainsKey+Peek with private Data.TryGetValue and the same stored-value-first object.Equals. The public IDictionary.TryGetValue consumes values and is deliberately not used. Preserve the existing branch and final Remove(key), including its Boolean after reentrant equality. F039 Contains, public/protected surface and all other shipping statements stay unchanged. Add eight first-access preservation rows to TempDataTest.

**Measured scope:** prepared loaded actual-owner RemoveAndRestore round trip, **restoration inside timing**.
Not isolated Remove nanoseconds or DI/rendering/cookie/application performance.
Predeclared Match:12:8 uses **${pcts}% less time**, median **${median}%**, **0 B/op unchanged**.
All three comparisons are closed:240rows/1,920raw samples independently matched between stdout and JSON.
Both variants use identical measured harness DLL/PDB; only owner DLL/PDB differ.

**Non-wins retained:** ${adverse || 'none'}. Worst individual rows: ${worstText}.
${qualification} Maximum profile CV${decision.actualMaximumCvPercent.toFixed(2)}%; shared VM, not isolated.
No uniform-speedup, allocation-saving or production-frequency claim.

**Preservation:** 73original+73candidate managed rows pass,0skipped, including every row of
CollectionRemove_UpdatesRetainedValues_WhenFirstAccessTriggersLazyLoad. Three17semantic/40lifecycle
collections match, including independent exact-project relocation/rebuild with no extra timing.
Each characterization checks640repeated selected calls plus80setup/cleanup validation calls.
Both canonical mapped static-SSR browser versions pass8real cookie-backed navigations/0errors.
Ten existing nonquarantined TempDataCookieTest facts pass after dependency-aware Debug build.
String-key Remove is adjacent coverage, not direct collection Remove proof; the selected permanent
surface owns the managed conditional-removal contract. TempDataPersistWithoutAccessing remains
pre-quarantined by dotnet/aspnetcore#70085 and is not counted. This is preservation, not semantic-bug red/green.

**Exact commands and results** (every fresh .NET shell activates \`. .\\activate.ps1\`; complete
logger/results arguments and all selectors are retained in the linked command records):

- \`dotnet test src\\Components\\Endpoints\\test\\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj --configuration Release --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false -p:UseSharedCompilation=false --filter FullyQualifiedName~TempData\`: **passed73/73original and73/73candidate,0skipped**.
- \`dotnet build src\\Components\\test\\E2ETest\\Microsoft.AspNetCore.Components.E2ETests.csproj --configuration Debug --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false -p:UseSharedCompilation=false\`: **passed,0warnings/0errors**.
- \`dotnet test src\\Components\\test\\E2ETest\\Microsoft.AspNetCore.Components.E2ETests.csproj --configuration Debug --no-build --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false --filter FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.CanRemoveTheElementWithRemove\`: **passed1/1**, then one combined exact nine-method selector **passed9/9**, every fresh TRX row inspected.
- Targeted \`dotnet format whitespace\`: **passed,no modifications**. Both canonical sample builds and independent exact-project restore/build: **passed,0warnings/0errors**. Untimed actual BDN discovery40cases and17semantic/40lifecycle records: **passed**, no extra timing.

**Retained failures and limit:** \`eng\\build.cmd -BuildManaged -NoRestore -NoBuildNative -NoBuildNodeJS -NoBuildJava -NoBuildInstallers -Configuration Release -verbosity:quiet /p:UseIisNativeAssets=false /p:UseSharedCompilation=false /maxcpucount:2 /nodeReuse:false\`: **failed,exit1**, unchanged Framework.App.Runtime packaging MSB4057(CreateWixInstaller)/NETSDK1094(ReadyToRun). No repository-wide/packaging pass or successful-initialization sentinel is claimed. Documented focused fallback passed. An earlier untimed added-theory compilation failed CS8632 and was corrected only to the containing project's nullable-disabled style; exact failure/source and later73-row success are retained.

[Immutable evidence and runnable benchmark](${evidenceLink}) /
[all40profiles](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F040/comparison-results.md) /
[every exact command and result](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F040/validation-commands.md).

All18selected current-default source files match baseline before edits; this is not a full-current-default
build/dependency-equivalence claim. Timed binaries are not relabeled as compiled from the later
publication commit. No new public API or consumer documentation surface.
Fork-only research draft, not merge-ready; no priority/affinity/power changes.`;
const template = fs.readFileSync(path.join(run, 'pr-template-main.md'), 'utf8');
const pr = template.replace('# {PR title}', '# Avoid duplicate TempData conditional-removal lookups')
  .replaceAll('- [ ]', '- [x]')
  .replace('Summary of the changes (Less than 80 chars)', 'Avoid a duplicate non-consuming lookup before conditional TempData removal.')
  .replace('{Detail}', detail)
  .replace('Fixes #{bug number} (in this specific format)', 'Fixes jaslawinMs/aspnetcore#@TRACKING_NUMBER@');
assert.ok(!pr.includes('{Detail}') && !pr.includes('{PR title}'));
fs.writeFileSync(path.join(session, 'F040-pr-template.md'), pr, { flag: 'wx' });
copy(path.join(session, 'F040-issue-template.md'), 'issue-template.md');
copy(path.join(session, 'F040-pr-template.md'), 'pr-template.md');
write('authoritative-copy-manifest.json', JSON.stringify({ candidate: 'F040', actualCopiedSourceBytesUnchanged: true, files: copies }, null, 2) + '\n');
write('raw-file-copy-verification.json', JSON.stringify({
  candidate: 'F040', actualByteExactCopies: copies.length, actualHashedOmissions: omitted.length,
  actualRawNativeAndReportBytesUnchanged: true, actualMeasuredHarnessSourcesUnchanged: 7,
  actualConsumerNativeBytesOmittedWithHashes: true,
}, null, 2) + '\n');
const files = [];
function inventory(folder, relative = '') {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name), name = path.join(relative, entry.name);
    if (entry.isDirectory()) inventory(file, name);
    else files.push({ path: name, bytes: fs.statSync(file).size, sha256: sha(fs.readFileSync(file)) });
  }
}
inventory(destination);
write('capsule-file-hashes.json', JSON.stringify({
  candidate: 'F040', actualNativeBinaryBytesRehashableByPortableAudit: false,
  files: files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
}, null, 2) + '\n');
const count = files.length + 1;
fs.writeFileSync(path.join(session, 'F040-immutable-file-count.txt'), String(count) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(session, 'F040-capsule-assembly.json'), JSON.stringify({
  candidate: 'F040', actualImmutableFiles: count, actualByteExactCopies: copies.length,
  actualHashedOmissions: omitted.length, actualSourceCommit: source.sourceCommit,
  actualNoRootInventoryChanges: true, actualNoPublicationReceiptYet: true,
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F040', actualImmutableFiles: count,
  actualByteExactCopies: copies.length, actualHashedOmissions: omitted.length, actualRootInventoryUnchanged: true }, null, 2));
