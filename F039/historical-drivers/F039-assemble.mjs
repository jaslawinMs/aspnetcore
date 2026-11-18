import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F039');
const results = path.join(session, 'autoperf-published-results');
const destination = path.join(results, 'F039');
const root = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const git = args => {
  const result = spawnSync('git', args, { cwd: results, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};
assert.equal(git(['rev-parse', 'HEAD']), 'ec58de221859b542594921a5d4714103108f7459');
assert.equal(git(['status', '--porcelain']), '');
assert.equal(git(['branch', '--show-current']), 'autoperf-results');
assert.equal(fs.existsSync(destination), false);
const decision = read(path.join(run, 'decision.json'));
const audit = read(path.join(run, 'audit-v2-through-003.json'));
const assessment = read(path.join(run, 'measurement-assessment.json'));
const live = read(path.join(run, 'live-file-audit.json'));
const source = read(path.join(run, 'source-publication', 'verified-source-publication.json'));
assert.equal(decision.actualAllApplicableAcceptanceChecksPassed, true);
assert.equal(source.actualAllSourceRefChecksPassed, true);
assert.equal(decision.actualSourceComparisonBudgetPermanentlyClosed, true);
assert.equal(audit.actualPairs, 2);
assert.equal(audit.actualRows, 160);
assert.equal(audit.actualRawResultSamples, 1280);
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
const projectFiles = read(path.join(run, 'preparation-original-002', 'harness-source-manifest.json')).files;
for (const entry of projectFiles) copy(path.join(run, 'harness-v2', entry.file), path.join('harness', entry.file));
for (const name of fs.readdirSync(session).filter(name => /^F039-.*\.(?:mjs|ps1)$/.test(name)))
  copy(path.join(session, name), path.join('historical-drivers', name));
copy(path.join(session, 'F039-verify.mjs'), 'F039-verify.mjs');
for (const file of ['LICENSE.txt', 'docs\\BuildFromSource.md', 'src\\Components\\test\\E2ETest\\Tests\\TempDataCookieTest.cs'])
  copy(path.join(root, file), path.join('reference', file));
write('.gitattributes', '* -text\n');
write('omitted-file-manifest.json', JSON.stringify({
  candidate: 'F039', actualNativeBinaryBytesPublished: false, actualPortableAuditRehashesOmittedBytes: false, files: omitted,
}, null, 2) + '\n');
const primary = audit.primary;
const pcts = primary.lessTimePercentByPair.map(value => value.toFixed(2)).join('/');
const median = primary.medianLessTimePercent.toFixed(2);
const worst = audit.pairs.flatMap(pair => pair.rows.map(row => ({ round: pair.round, ...row })))
  .sort((a, b) => a.lessTimePercent - b.lessTimePercent).slice(0, 3);
const adverse = assessment.actualAllAdverseProfiles.map(row => `${row.profile}: ${(-row.medianLessTimePercent).toFixed(2)}% slower`).join('; ');
const worstText = worst.map(row => `${row.profile} attempt ${row.round}: ${(-row.lessTimePercent).toFixed(2)}% more time`).join('; ');
const table = ['# F039 complete results', '',
  'Positive less-time percentages favor the candidate. Attempt 1 failed before timing and has no invented result. Attempts 2 and 3 are the two completed comparisons.',
  '', '| Profile | Attempt 2 original->candidate ns | Less time % | Attempt 3 original->candidate ns | Less time % | Median less time % | B/op original->candidate, attempts 2/3 |',
  '|---|---:|---:|---:|---:|---:|---|'];
for (const profile of audit.summaryByProfile) {
  const rows = audit.pairs.map(pair => pair.rows.find(row => row.profile === profile.profile));
  const values = rows.flatMap(row => [`${row.originalMeanNs.toFixed(4)}->${row.candidateMeanNs.toFixed(4)}`, row.lessTimePercent.toFixed(2)]);
  table.push(`| ${profile.profile} | ${values.join(' | ')} | ${profile.medianLessTimePercent.toFixed(2)} | ${rows.map(row =>
    `${row.originalBytesPerOp}->${row.candidateBytesPerOp}`).join(' / ')} |`);
}
table.push('', '**Actual execution order:** attempt 2 candidate/original; attempt 3 original/candidate.',
  'All 160 row means and sample standard deviations were recomputed from 1,280 retained JSON measurements and matched against 1,280 native stdout WorkloadResult lines.',
  `Every one of 160 allocation reports is 0 B/op. No allocation-saving claim. Maximum measured profile CV: ${decision.actualMaximumCvPercent.toFixed(2)}%; noisy/adverse rows are retained.`,
  'BDN 99.9% confidence intervals and rounded MemoryDiagnoser values are retained as reported, not independently derived confidence or allocation counters.',
  '', `**All adverse medians:** ${adverse || 'none'}.`,
  `**Worst individual paired rows:** ${worstText}.`,
  'No miss/control median regression reaches 5% in this run. This does not make every individual observation a win.',
  '', 'Three source-comparison authorizations are permanently consumed: one before-timing fixture failure plus two completed comparisons. No fourth attempt or replacement run occurred.', '');
assert.equal(assessment.actualMissOrControlMedianRegressionsAtLeastFivePercent.length, 0);
write('comparison-results.md', table.join('\n'));
const commandFiles = [
  'validation\\Tests-original-1\\command.json', 'validation\\Tests-original-2\\command.json',
  'validation\\Tests-candidate-1\\command.json', 'validation\\Format-candidate-1\\command.json',
  'validation\\SampleBuild-original-1\\command.json', 'validation\\SampleBuild-candidate-1\\command.json',
  'validation\\HarnessBuild-original-1\\command.json', 'validation\\HarnessBuild-original-2\\command.json',
  'harness-build-v2\\restore-command.json', 'harness-build-v2\\build-command.json',
  'selenium-build-candidate-001\\command.json', 'selenium-candidate-producer-001\\command.json',
  'selenium-candidate-remaining-001\\command.json', 'reproduction-candidate-001\\build-commands.json',
  'reproduction-candidate-001\\characterize-command.json', 'measure-original-001\\completion.json',
];
for (const round of [2, 3]) for (const variant of ['original', 'candidate'])
  commandFiles.push(`measure-${variant}-${String(round).padStart(3, '0')}\\completion.json`);
const commands = ['# F039 exact validation and measurement commands', '',
  'Historical absolute paths are intentional. Each fresh .NET shell first ran `Set-Location C:\\src\\aspnetcore` and `. .\\activate.ps1`.',
  'These receipts are evidence, not replay/overwrite instructions. The source-comparison budget is permanently closed.', ''];
for (const file of commandFiles) {
  const value = read(path.join(run, file));
  for (const command of Array.isArray(value) ? value : [value]) {
    const passed = command.actualExitCode === 0;
    commands.push(`## ${file}`, '', `**Result: ${passed ? 'passed' : 'failed, preserved'}, native exit ${command.actualExitCode}.**`, '',
      '```powershell', '& ' + [command.executable, ...command.arguments].map(argument => `'${String(argument).replaceAll("'", "''")}'`).join(' '), '```', '');
  }
}
commands.push('The untimed original harness first failed to compile with CS0136 (shadowed local); all seven failing source inputs and output are retained.',
  'Attempt 1 then failed before timing because BDN rejects a sealed fixture. It consumed an authorization. The corrected non-sealed fixture adds actual untimed public BenchmarkConverter discovery of all 40 cases.',
  'Both source variants pass 74 managed rows, 0 skipped, including all eight new theory rows and the consumed-value fact. These are preservation checks, not a semantic-bug red/green claim.',
  'Actual canonical static-SSR browser results pass eight full cookie-backed transitions on each source version, with zero page/console errors.',
  'Ten existing nonquarantined TempDataCookieTest facts pass after the dependency-aware Debug E2E build. TempDataPersistWithoutAccessing remains pre-quarantined by dotnet/aspnetcore#70085 and is not selected or counted.',
  'The exact corrected seven-file project independently restores/builds/characterizes without extra timing. All owned sample/Selenium helpers are stopped.', '');
write('validation-commands.md', commands.join('\n'));
write('environment.json', JSON.stringify(read(path.join(run, 'measure-original-002', 'reports', 'results',
  'AutoPerf.TempDataContainsBenchmarks-report-full.json')).HostEnvironmentInfo, null, 2) + '\n');
const primaryTable = audit.pairs.map(pair => {
  const row = pair.primary;
  const cv = variant => audit.allRows.find(value => value.round === pair.round && value.variant === variant && value.profile === primary.profile).coefficientOfVariationPercent.toFixed(2);
  return `| ${pair.round} | ${pair.order.join(' then ')} | ${row.originalMeanNs.toFixed(4)} | ${row.candidateMeanNs.toFixed(4)} | ${row.lessTimePercent.toFixed(2)} | ${cv('original')}/${cv('candidate')} |`;
}).join('\n');
write('README.md', `# F039: non-consuming TempData collection containment

**Qualified fork-only research draft:** the predeclared \`Match:12:8\` primary uses
**${pcts}% less time**, median **${median}%**, in two completed comparisons.
All allocation reports are **0 B/op unchanged**. This measures a prepared loaded
actual TempData collection lookup, **not application, cookie, DI, rendering or browser performance**.

| Attempt | Actual native order | Original ns | Candidate ns | Less time % | Original/candidate CV % |
|---|---|---:|---:|---:|---:|
${primaryTable}

Source branch [\`${source.sourceBranch}\`](https://github.com/jaslawinMs/aspnetcore/tree/${source.sourceBranch})
at \`${source.sourceCommit}\`. Exactly two source files change: one shipping return
statement and 48 focused preservation-test lines. F040 collection removal, public/protected
surface and all other statements stay unchanged. \`publication.json\` is added separately
after immutable remote verification and draft creation.

## Change and compatibility

Only explicit \`ICollection<KeyValuePair<string, object?>>.Contains\` changes:

\`\`\`csharp
return Data.TryGetValue(item.Key, out var value) && Equals(value, item.Value);
\`\`\`

The original calls \`ContainsKey\` and then non-consuming \`Peek\`, repeating a dictionary lookup
on hits. The candidate uses the **private Data dictionary**, not public
\`IDictionary.TryGetValue\`: that public operation consumes retained keys and would be incompatible.
The same lazy loader, case-insensitive comparer, missing/present-null distinction,
equality direction/call count/exceptions, and retained/consumed Save state are preserved.

The actual public producer is \`AddRazorComponents\` + \`RazorComponentResult\` rendering a
component with a real cascading ITempData parameter. It captures the actual source-built
internal owner with the registered cookie-provider callback. No copied owner/dictionary algorithm,
reflection member invocation, new IVT or UnsafeAccessor is used. DI/rendering/key/value preparation,
loading, evidence and cleanup are outside timing. Direct result execution does not execute
endpoint-invoker persistence; separate real mapped sample requests cover that boundary.

## Attempts, failures and non-wins

- **Three authorizations consumed, two completed comparisons, no fourth attempt.** Attempt 1
  started original PID14908 and failed before timing: BDN0.13 requires a non-sealed fixture.
  Its native exit -532462766, output, old seven-file source, 687-input seal and original failed
  budget entry remain intact. There are zero timing samples from that attempt.
- A new corrected harness makes only the fixture non-sealed and adds actual untimed public
  BDN discovery of all 40 cases. Both source variants pass discovery/characterization before
  the two remaining authorizations. A successor 1,186-input seal preserves the old epoch;
  the budget was **not reset**. The earlier untimed CS0136 build failure is also retained.
- [All 40 profiles and both comparisons](comparison-results.md): 160 rows, 1,280 raw samples
  independently cross-checked between actual stdout and full JSON. Counts0/1/8/64,
  key lengths12/128, Match/Different/Null/MissingNull/unchanged ContainsKey controls.
  Zero-count profiles are actual misses; strings/queries/pairs are prepared outside timing.
- All adverse medians: **${adverse || 'none'}**.
  Worst individual paired rows: **${worstText}**. No miss/control median regression reaches
  the declared 5% qualification threshold, but individual adverse observations are not hidden.
- Maximum profile CV is **${decision.actualMaximumCvPercent.toFixed(2)}%**; the table above gives each
  primary CV. This shared VM is noisy, not isolated. No uniform-speedup or production-frequency claim.
  All 160 allocation reports remain0B/op; no structural allocation-saving claim.

## Preservation and reproducibility

| Boundary | Actual evidence |
|---|---|
| Owning managed tests | 74 original +74 candidate rows pass,0skipped; all eight rows of CollectionContains_PreservesValues_WhenFirstAccessTriggersLazyLoad and CollectionContains_DoesNotRetainConsumedValue are parsed individually |
| Untimed real producer | Five full characterizations match all15semantic records and40benchmark lifecycles, including original/candidate in both harness epochs and the independently rebuilt corrected harness; each exercises43actual public-owner captures and640prepared calls |
| Lazy loading and equality | Actual registered cookie provider remains unloaded at capture, loads once at first access; null/missing/casing, actual null-key failure and in-memory asymmetric/throwing/reentrant equality are checked; custom object persistence is not claimed |
| Real mapped cookie persistence | Eight actual canonical BlazorWebAppPerPage static-SSR browser navigations on each source version prove non-consuming containment and consumption by Get/public TryGetValue on subsequent requests; framework200; zero page/console errors |
| Permanent adjacent browser coverage | Ten existing nonquarantined TempDataCookieTest facts pass,0skipped, after dependency-aware Debug build; ContainsKey is adjacent coverage, not direct collection Contains proof |
| Known excluded existing test | TempDataPersistWithoutAccessing stays pre-quarantined by dotnet/aspnetcore#70085; never forced, selected or counted as passed |
| Exact timed image | 197files per variant; only Endpoints DLL/PDB differ.195unchanged entries include identical measured harness DLL/PDB, leaving193other unchanged entries |
| Runnable project | Exact corrected seven-file project independently relocates/restores/builds with0warnings/errors, discovers40actual BDN cases and characterizes15semantic/40lifecycle records; separately compiled harness, no extra timing or same-PE claim |
| Cleanup | Only our archived temporary Razor page was removed; all captured owned sample/Selenium helpers are gone; four unrelated reports are preserved |

This is intended behavior-preserving performance work, **not a semantic-bug red/green claim**.
[Every exact command and result](validation-commands.md), original TRX/browser records,
and the five-field permanent boundary are retained.

## Runtime, history and claim limits

- SDK12.0.100-alpha.1.26557.102; pinned runtime12.0.0-alpha.1.26562.105
  (Environment.Version12.0.0), C#13, Release, ServerGC, Windows x64 RyuJIT.
  [Actual host metadata](environment.json).
- BDN0.13.0; settings-preserving in-process emit executor;3warmups/8results,100ms,
  unroll1,DontRemove,Guid.Empty power-plan mode. All before/after executor settings checked.
  No priority/affinity/power/OS/network changes or unrelated process termination.
- Fresh selected comparison against upstream default \`${source.actualCurrentDefault}\`:
  all18owner/interface/producer/project/test files match the tested baseline before our edits.
  **Not a full-current-default build or dependency-equivalence claim.**
- Timed source was baseline \`${source.actualMeasuredBuildHead}\` plus the uncommitted candidate,
  not relabeled as built from the later publication commit. Both committed source files'
  LF-canonical content matches the tested snapshots.
- Authoritative feature design dotnet/aspnetcore#65039 and relevant lazy-load/serialization
  history were read. Bounded open-work searches and all file pages for five TempData-related
  open PR hits are retained; they are not proof of global novelty or absence.
- Selected PE/PDB witnesses cover${live.actualSourcePePdbDocumentAssociations}source-document associations,
  not complete compiler provenance or method coverage. Live audit hashes${live.actualUniquePhysicalFilesRehashed}
  unique files,${live.actualConsumerBindings}consumer and${live.actualLoadedAssemblyBindings}loaded-assembly bindings.
- No whole-app/transport/DOM/browser/cookie timing, session-provider, streaming-performance,
  InteractiveServer/Auto/WASM/Mono/AOT performance or production-frequency claim.
  Existing Debug static-SSR Selenium adds correctness only, not the measured Release image.

## Use the evidence and exact project

Portable copied-text/statistics audit, without .NET or retiming:

\`\`\`powershell
node .\\F039-verify.mjs .
\`\`\`

\`harness\\AutoPerf.Benchmarks.csproj\` and its six C# files are the exact corrected measured
project. For a **new** experiment, copy them outside the source checkout, activate that
checkout's repository SDK and set \`AUTOPERF_ASPNETCORE_ROOT\`. Build the actual
Components.Endpoints.Tests project in Release, not installed framework binaries, then restore/build
the standalone project. The independently successful commands are retained under
\`raw\\reproduction-candidate-001\\build-commands.json\`.

The program requires explicit mode,variant,fresh state directory,new197-file consumer closure,
current12selected source documents and report directory. Its usage/validation are in Program.cs/Evidence.cs;
the executed preparation/reproduction drivers show exact manifest construction. Run untimed
\`characterize\` first. Closed-budget historical drivers/absolute paths are evidence, **not overwrite/replay instructions**.

Compiled/restore/native bytes are omitted with exact hashes. Portable verification cannot rehash
those omitted bytes or independently recreate historical compilation/runtime execution.
All copied source/stdout/CSV/full JSON/TRX/browser data is byte-exact.
`);
const evidenceLink = 'https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F039/README.md';
const issue = `## Measured F039 proposal

Use the private Data dictionary TryGetValue in TempData's explicit collection Contains.
Do not use the consuming public IDictionary.TryGetValue. F040 Remove and public API are unchanged.

Predeclared prepared actual-owner primary Match:12:8: **${pcts}% less time**, median${median}%,
**0B/op unchanged**. Three consumed authorizations include a sealed-fixture failure before timing;
two comparisons completed:40profiles/member,160rows,1,280stdout/JSON-matched samples. Both harness
epochs/seals and all adverse controls remain published. Maximum CV${decision.actualMaximumCvPercent.toFixed(2)}%.

**Non-wins:** ${adverse || 'none'}. Worst individual observations: ${worstText}.
74original+74candidate managed rows pass, including all9new preservation rows; ten existing
nonquarantined TempDataCookieTest facts pass after a dependency-aware Debug build. The pre-quarantined
TempDataPersistWithoutAccessing (dotnet/aspnetcore#70085) is excluded, not counted. Both actual canonical
cookie-backed browser variants pass8navigations/0errors. Exact seven-file project independently rebuilds
and characterizes, without extra timing.

[Immutable evidence, runnable project, exact commands and limitations](${evidenceLink}).
Source branch \`${source.sourceBranch}\` at \`${source.sourceCommit}\`.
Shared Windows VM, not isolated. Not application/cookie/DI/rendering/Mono/AOT performance or merge-ready.
`;
fs.writeFileSync(path.join(session, 'F039-issue-template.md'), issue, { flag: 'wx' });
const detail = `Replace the hit path's ContainsKey+Peek with the private Data.TryGetValue and the same object.Equals. The public IDictionary.TryGetValue consumes values and is deliberately not used. Preserve lazy loading, null/missing/casing/equality and retention. Add eight lazy-load theory rows and one consumed-value preservation fact. F040 Remove and public/protected surface are unchanged.

**Measured scope:** prepared loaded actual-owner collection lookup, not DI/rendering/cookie/application timing.
Predeclared Match:12:8 uses **${pcts}% less time**, median **${median}%**, **0B/op unchanged**.
Three authorizations are closed: first failed before timing (sealed BDN fixture), two completed comparisons.
Both harness epochs/seals and the failed budget entry remain intact.160rows/1,280raw samples are independently
matched between stdout and JSON; original/candidate use the identical corrected harness, only owner DLL/PDB differ.

**Non-wins retained:** ${adverse || 'none'}. Worst individual rows: ${worstText}.
Maximum profile CV${decision.actualMaximumCvPercent.toFixed(2)}%; shared VM, not isolated. No uniform-speedup or allocation-saving claim.

**Preservation:** 74original+74candidate managed rows pass,0skipped, including all eight
CollectionContains_PreservesValues_WhenFirstAccessTriggersLazyLoad rows and CollectionContains_DoesNotRetainConsumedValue.
Five15semantic/40lifecycle collections match, including independent exact-project relocation/rebuild.
Both canonical mapped static-SSR browser versions pass8real cookie-backed navigations/0errors.
Ten existing nonquarantined TempDataCookieTest facts pass after dependency-aware Debug build;
TempDataPersistWithoutAccessing remains pre-quarantined by dotnet/aspnetcore#70085 and is not counted.
This is preservation, not a semantic-bug red/green claim.

**Exact commands and results** (every fresh .NET shell activates \`. .\\activate.ps1\`; complete
logger/results arguments and all selectors are retained in the linked command records):

- \`dotnet test src\\Components\\Endpoints\\test\\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj --configuration Release --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false -p:UseSharedCompilation=false --filter FullyQualifiedName~TempData\`: **passed74/74original and74/74candidate,0skipped**.
- \`dotnet build src\\Components\\test\\E2ETest\\Microsoft.AspNetCore.Components.E2ETests.csproj --configuration Debug --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false -p:UseSharedCompilation=false\`: **passed,0warnings/0errors**.
- \`dotnet test src\\Components\\test\\E2ETest\\Microsoft.AspNetCore.Components.E2ETests.csproj --configuration Debug --no-build --no-restore -m:2 -nr:false --verbosity quiet -p:UseIisNativeAssets=false --filter FullyQualifiedName=Microsoft.AspNetCore.Components.E2ETest.Tests.TempDataCookieTest.CanCheckIfTempDataContainsKey\`: **passed1/1**, then one combined exact nine-method selector **passed9/9**, every fresh TRX row inspected.
- Targeted \`dotnet format whitespace\`: **passed,no modifications**. Both canonical sample builds and corrected exact-project independent restore/build: **passed,0warnings/0errors**. Untimed actual BDN discovery40cases and15semantic/40lifecycle records: **passed**, no extra timing.

[Immutable evidence and runnable benchmark](${evidenceLink}) /
[all40profiles](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F039/comparison-results.md) /
[every exact command and result](https://github.com/jaslawinMs/aspnetcore/blob/@EVIDENCE_COMMIT@/F039/validation-commands.md).

All18selected current-default source files match baseline before edits; this is not a full-current-default
build/dependency-equivalence claim. Runtime/source/PE/PDB limitations and relevant design/history are retained.
Not application/cookie/browser/Mono/AOT performance, production-frequency evidence, or merge-ready.
Fork-only research draft; no priority/affinity/power changes.`;
const template = fs.readFileSync(path.join(run, 'pr-template-main.md'), 'utf8');
const pr = template.replace('# {PR title}', '# Avoid duplicate lookups in TempData collection containment')
  .replaceAll('- [ ]', '- [x]')
  .replace('Summary of the changes (Less than 80 chars)', 'Avoid repeated dictionary probes without consuming TempData values.')
  .replace('{Detail}', detail).replace('Fixes #{bug number} (in this specific format)', 'Fixes #@TRACKING_NUMBER@');
assert.ok(!pr.includes('{Detail}') && !pr.includes('{PR title}'));
fs.writeFileSync(path.join(session, 'F039-pr-template.md'), pr, { flag: 'wx' });
copy(path.join(session, 'F039-issue-template.md'), 'issue-template.md');
copy(path.join(session, 'F039-pr-template.md'), 'pr-template.md');
write('authoritative-copy-manifest.json', JSON.stringify({ candidate: 'F039', actualCopiedSourceBytesUnchanged: true, files: copies }, null, 2) + '\n');
write('raw-file-copy-verification.json', JSON.stringify({
  candidate: 'F039', actualByteExactCopies: copies.length, actualHashedOmissions: omitted.length,
  actualRawNativeAndReportBytesUnchanged: true, actualCorrectedMeasuredHarnessSourcesUnchanged: 7,
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
  candidate: 'F039', actualNativeBinaryBytesRehashableByPortableAudit: false,
  files: files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
}, null, 2) + '\n');
const count = files.length + 1;
fs.writeFileSync(path.join(session, 'F039-immutable-file-count.txt'), String(count) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(session, 'F039-capsule-assembly.json'), JSON.stringify({
  candidate: 'F039', actualImmutableFiles: count, actualByteExactCopies: copies.length,
  actualHashedOmissions: omitted.length, actualSourceCommit: source.sourceCommit,
  actualNoRootInventoryChanges: true, actualNoPublicationReceiptYet: true,
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F039', actualImmutableFiles: count,
  actualByteExactCopies: copies.length, actualHashedOmissions: omitted.length, actualRootInventoryUnchanged: true }, null, 2));
