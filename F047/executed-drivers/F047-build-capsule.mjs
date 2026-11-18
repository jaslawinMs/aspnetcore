import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F047');
const published = path.join(session, 'autoperf-published-results');
const destination = path.join(published, 'F047');
const forward = value => value.replaceAll('\\', '/');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const text = (name, value) => fs.writeFileSync(path.join(run, name), value.trim() + '\n', { flag: 'wx' });
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    assert.equal(item.isSymbolicLink(), false);
    const file = path.join(directory, item.name);
    return item.isDirectory() ? files(file) : [file];
  });
}
assert.equal(fs.existsSync(destination), false, 'Inspect any previous or partial capsule rather than replacing it.');
assert.equal(fs.existsSync(path.join(run, 'source-comparison.lock')), false);
assert.equal(read(path.join(run, 'diagnostic-budget.json')).permanentlyClosed, true);
const summary = read(path.join(run, 'audit-summary.json'));
const source = read(path.join(run, 'source-publication.json'));
assert.equal(summary.actualDisposition, 'qualified');
assert.equal(summary.actualRetainedSamples, 384);
assert.equal(summary.actualNumericalPrimaryTimingGateMet, false);
assert.deepEqual(summary.actualPrimaryManagedByteSavings, [56, 56, 56]);
assert.equal(summary.actualRuntimeRecordsChecked, 22);
assert.equal(source.actualRemoteRefVerified, true);
fs.copyFileSync(path.join(session, 'F047-pr-description.md'), path.join(run, 'pr-description-template.md'), fs.constants.COPYFILE_EXCL);
const format = value => value.toFixed(2);
const results = [
  '# F047: every actual source comparison', '',
  '**Allocation trade-off, not a demonstrated speedup.** The one-scalar prerender primary saves 56 B/op in every pair.',
  'Its median paired less-time effect is -1.43%; it is slower in pairs 2 and 3. No latency-neutrality or throughput claim is made.',
  'Positive less-time means the candidate takes less time. All three comparisons use the same frozen candidate and byte-identical common harness.',
  'All eight retained observations are used. Medians aggregate paired percentage effects, not separately aggregated source means.', '',
  '| Profile | Original ns/op by pair | Candidate ns/op by pair | Less-time % by pair | Median less-time % | Original B/op by pair | Candidate B/op by pair |',
  '|---|---:|---:|---:|---:|---:|---:|'
];
for (const item of summary.profileSummaries) {
  const rows = summary.paired.filter(row => row.profile === item.profile);
  results.push(`| ${item.profile} | ${rows.map(row => format(row.original.meanNs)).join(' / ')} | ${rows.map(row => format(row.candidate.meanNs)).join(' / ')} | ${item.eachLessTimePercent.map(format).join(' / ')} | ${format(item.medianLessTimePercent)} | ${item.originalAllocatedBytes.join(' / ')} | ${item.candidateAllocatedBytes.join(' / ')} |`);
}
results.push('', 'Method: `AutoPerf.BoundaryBenchmarks.FreshBoundarySetAndDispose`.', '',
  '**Do not headline pair 1 as a 51.20% speedup.** Its original primary has 42.69% CV and declines from 3969.80 to 1261.18 ns/op.',
  'All eight observations are retained. The cause of this ramp was not established.',
  'The later primary comparisons are 2.48% and 1.43% slower. The unchanged one-scalar control has median +2.42% apparent benefit.',
  'The unchanged four-scalar control swings -26.65%, +24.04%, -6.71%. Mixed4 and Fragments8 regress 7.62% and 1.46% in pair 1.',
  'These observations do not establish formal significance or application performance on this shared, non-isolated box.', '',
  '## Every report row and its variability', '',
  '| Pair | Variant | Profile | Mean ns | Sample SD ns | CV % | Median ns | B/op | Actual overhead N | Retained N |',
  '|---:|---|---|---:|---:|---:|---:|---:|---:|---:|');
for (const row of summary.rows) {
  results.push(`| ${row.attempt} | ${row.variant} | ${row.profile} | ${format(row.meanNs)} | ${format(row.standardDeviationNs)} | ${format(row.cvPercent)} | ${format(row.medianNs)} | ${row.allocatedBytesPerOperation} | ${row.actualOverheadSamples} | 8 |`);
}
results.push('', 'The audit binds exact complete FullName and raw DisplayInfo identities, reconstructs actual-minus-median-adaptive-overhead results,',
  'checks every statistic and midpoint-to-even allocation arithmetic against the preserved BDN v0.13.0 source and MIT license.', '');
for (const attempt of [1, 2, 3]) {
  const folder = 'comparison-' + String(attempt).padStart(3, '0');
  results.push(`Pair ${attempt}: ${summary.actualSourceOrders[attempt - 1].join(' then ')}; [authorization](${folder}/authorization.json), [completion](${folder}/execution-receipt.json).`);
  for (const variant of ['Original', 'Candidate']) {
    results.push(`${variant}: [raw stdout](${folder}/${variant}/stdout.txt), [full JSON](${folder}/${variant}/reports/results/AutoPerf.BoundaryBenchmarks-report-full.json), [arguments](${folder}/${variant}/command.json), [actual result](${folder}/${variant}/result.json).`);
  }
  results.push('');
}
text('comparison-results.md', results.join('\n'));
const commands = [
  '# F047: exact executed commands and observed results', '',
  'Every managed invocation activates the reviewed checkout-local SDK first. Builds use at most two workers, no shared compilation or node reuse.',
  'Power-plan changes are disabled. Original observed process/thread priority and affinity are preserved.',
  'These are historical commands, not authorization to rerun the permanently closed timing budget.', '',
  '## Managed commands', '',
  '| Boundary | Result | Exact activated script | Raw stdout | Raw stderr |',
  '|---|---|---|---|---|'
];
for (const label of fs.readdirSync(path.join(run, 'validation')).sort()) {
  const folder = 'validation/' + label;
  const result = read(path.join(run, 'validation', label, 'result.json'));
  commands.push(`| ${label} | ${result.exitCode === 0 ? 'Passed' : 'Failed'}; exit ${result.exitCode} | [actual script](${folder}/command.ps1) | [stdout](${folder}/stdout.txt) | [stderr](${folder}/stderr.txt) |`);
}
commands.push('', '## Characterization, timing and independent reconstruction commands', '',
  '| Boundary | Result | Exact arguments | Raw stdout | Raw stderr |',
  '|---|---|---|---|---|');
for (const file of files(run).filter(file => path.basename(file) === 'command.json').sort()) {
  const relative = forward(path.relative(run, file));
  const folder = path.posix.dirname(relative);
  const command = read(file);
  const companion = path.join(path.dirname(file), 'result.json');
  const code = fs.existsSync(companion) ? read(companion).exitCode : command.actualExitCode;
  assert.ok(Number.isInteger(code), 'Do not invent command outcomes: ' + relative);
  const extension = folder === 'selenium-candidate-001' ? 'log' : 'txt';
  commands.push(`| ${folder} | ${code === 0 ? 'Passed' : 'Failed'}; exit ${code} | [arguments](${relative}) | [stdout](${folder}/stdout.${extension}) | [stderr](${folder}/stderr.${extension}) |`);
}
commands.push('', 'Actual default submodule initialization also passed: [arguments/result](default-submodules-command.json), [stdout](default-submodules.stdout.txt), [stderr](default-submodules.stderr.txt).');
commands.push('', '## Exact selected managed test scripts and outcomes', '');
for (const item of read(path.join(run, 'premeasurement-validation.json')).audits.filter(item => item.kind !== 'browser')) {
  commands.push(`- ${item.variant}, ${item.kind}: **${item.actualRows} individual rows passed, zero failed/skipped**; [XML audit](${item.auditPath}), [actual XML](${item.trxPath}).`);
}
commands.push('', 'The new `CanPrerender_MultipleRenderFragmentParameters` theory passes all Server/WebAssembly/Auto rows on untouched shipping code and the candidate.',
  'The original final inventory is 98 existing plus 3 new rows; current default has 98 existing rows; candidate has 101 rows.',
  'This is green/green preservation, not a claim that a functional bug was fixed.', '',
  '## Real-browser producer boundaries', '',
  'The original and candidate canonical per-page samples each pass Server/WebAssembly/Auto with prerendering enabled and disabled: six cases and six real clicks per source.',
  '[Original browser records](sample-original/browser-result.json) and [candidate browser records](sample-candidate/browser-result.json) bind loaded owners, DOM state, asset responses, console/network observations and precise helper cleanup.',
  'For prerendered cases, two distinct fragments and interleaved scalar/null parameters survive real activation and interaction.',
  'Auto platform selection is recorded, not claimed to cover cached versus uncached selection.', '',
  'The existing owning `RenderFragmentSerializationTest` suite passes **all 14 individual Server/WebAssembly rows**, zero skips/failures.',
  'Its real nested component case includes outer and inner child interactions, beyond the harness nested-fragment/region check.',
  '[Exact Selenium launch/result](selenium-candidate-001/command.json), [activated Selenium driver](executed-drivers/F047-selenium.ps1), [individual XML audit](selenium-candidate-001/all-trx-rows.json), [verified cleanup](selenium-candidate-001/verified-result.json).', '',
  '## Preserved preparation failures and corrections', '',
  '- `default-endpoints-test-build-001`: NETSDK1004 because restore assets were missing. The actual targeted restore and successful retry are retained.',
  '- `CanPrerender_MultipleRenderFragmentParameters(mode: "auto")` in `original-preservation-tests-001` cannot reach its new assertion: the first fixture incorrectly invokes unsupported explicit root-result Auto prerendering. The existing producer throws NotImplementedException in UpdateSaveStateRenderMode. This is not a discovered product defect.',
  '- The corrected fixture uses the real nested render-mode producer, matching the successful canonical sample. All three rows pass in `original-preservation-tests-002` before shipping edits; all candidate rows pass. The original failed 100/101 invocation and XML remain.',
  '- The original characterization managed command passed. An initial controller post-parser counted the dictionary-contract record as a runtime record; the corrected filename selector audited the same successful run without relaunching it. No timing authorization was consumed.', '',
  '## Independent checks', '',
  'All 384 retained observations, adaptive overhead corrections, statistics and allocation rounding are recomputed independently.',
  'The auditor reparses 314 individual passing XML rows and checks 22 runtime and 96 per-benchmark settings records.',
  'The exact eight-file project is relocated, restored and rebuilt. Both fresh source variants repeat 24 renderer profiles, 12 invalid-delegate cases, 3 expected disabled-fragment serialization failures, one nested-fragment case and 8 real benchmark lifecycles, without timing.',
  'Only the rebuilt common harness DLL/PDB differs from its measured image. All source owners/dependencies, measured images, source/tests, SDK/NuGet files, unrelated reports and the closed budget remain unchanged.', '',
  '[Source publication commands/results](source-publication-invocations.json), [full audit](audit-summary.json), [reconstruction receipt](reconstruction-paired-001/verified-reproduction.json).', '',
  '```powershell', 'node .\\F047-verify.mjs . --require-seal', '```', '',
  'Packaging, AOT/trimming, global Router/template matrices, enhanced navigation/streaming overlap, cached Auto selection and HTTP/application throughput are unverified boundaries.');
text('validation-commands.md', commands.join('\n'));
text('README.md', `
# F047: SSR parameter wrapping without temporary key arrays

**Allocation trade-off, not a demonstrated speedup; not merge-ready.**
The declared one-scalar fresh-boundary primary saves **56 B/op in all three pairs**
(1616 -> 1560 B/op, 3.47%). Its median paired less-time effect is **-1.43%**:
it is 2.48% and 1.43% slower in the two later pairs. The apparent first-pair
51.20% benefit has an unstable original baseline (42.69% CV) and is not a
credible speedup headline. All observations and unchanged controls are retained.

Classification: **Focused allocation reduction with an unproven latency trade-off**.
The predeclared alternative allocation gate is met; the timing gate is not.
There is no latency-neutrality, merge-readiness or application-throughput claim.
The campaign's three-comparison timing budget is permanently closed.

## Connected artifacts

| Artifact | Location |
|---|---|
| Source proposal | [Two-file source commit](https://github.com/jaslawinMs/aspnetcore/commit/${source.sourceCommit}) |
| Tracking issue, draft PR, immutable evidence and browser receipt | [Additive publication connections](publication.json), populated after immutable publication |
| Runnable BenchmarkDotNet project | [Project](harness/AutoPerf.Benchmarks.csproj), [cases](harness/BoundaryBenchmarks.cs), [real boundary adapter](harness/BoundaryAccess.cs), [real renderer lifecycle](harness/BoundaryScenario.cs) |
| All measurements, adverse results and controls | [Every measured row](comparison-results.md), [independent arithmetic audit](audit-summary.json), [decision](decision.json) |
| Tests and exact commands/results | [Validation catalog](validation-commands.md), [original existing XML audit](original-existing-trx-audit.json), [original new rows](original-multiple-fragments-trx-audit.json), [candidate XML audit](candidate-trx-audit.json), [current-default XML audit](default-existing-trx-audit.json) |
| Real browser evidence | [Original sample](sample-original/browser-result.json), [candidate sample](sample-candidate/browser-result.json), [14 owning Selenium rows](selenium-candidate-001/all-trx-rows.json) |
| Source/binary bindings | [Original](source-inputs-original.json), [actual default](source-inputs-current-default.json), [candidate](source-inputs-candidate.json), [premeasurement seal](premeasurement-validation.json) |
| Runtime overwrite authority | [Recorded runtime PR](official-dictionary-overwrite-pr.json), [actual diff](official-dictionary-overwrite.diff), [runtime contract implementation](harness/Characterization.cs) |
| Independent eight-file project rebuild | [Untimed reconstruction receipt](reconstruction-paired-001/verified-reproduction.json) |
| Criteria and limit | [Preimplementation acceptance](acceptance-plan.json), [permanently closed budget](diagnostic-budget.json), [closure hash](permanent-budget-close.json) |
| Exact sample cleanup | [Archived sources](sample-source-archive.json), [only-two-file cleanup receipt](temporary-sample-cleanup.json) |
| Capsule integrity and omitted binary inventory | [SHA256 inventory](capsule-file-hashes.json), [omitted files](omitted-file-hashes.json) |

The classified root REPORT.md intentionally remains its previous 118-finalized
snapshot; this later case does not silently revise it.

## What changes and why it preserves the supported behavior

The real producers are EndpointHtmlRenderer.ResolveComponentForRenderMode and
EndpointHtmlRenderer.PrerenderComponentAsync. The boundary first makes its private
ParameterView.ToDictionary snapshot and validates it. When prerendering is enabled,
the original then materializes parametersDict.Keys.ToArray and reindexes each value.
The candidate enumerates the concrete dictionary's name/value pairs directly.
Only existing values are overwritten with the same RenderFragmentCapture delegates;
no entry is added or removed from that dictionary and no user fragment is executed
by the capture constructor. Snapshot, validation, captures, ordering, rendering
and serialization otherwise remain unchanged.

**Why does overwriting not invalidate enumeration?** Modern .NET explicitly permits
replacement of an existing Dictionary value without bumping its enumerator version:
[dotnet/runtime#34667](https://github.com/dotnet/runtime/pull/34667), merged in 2020.
The exact pinned runtime contract is also exercised on Original, Default and Candidate.
The general enumerator documentation's older Remove/Clear remarks do not themselves
establish this overwrite guarantee. No claim is made that this always worked on .NET Framework.

Keeping ToDictionary matters: it retains the private snapshot and duplicate-name
canonicalization. Re-enumerating the raw ParameterView instead would be a different
change. Mutating keys or adding/removing entries during the loop is not proposed.
No new shipping API, friend assembly, unsafe accessor, dependency, renderer cache,
cross-runtime protocol or DI lifetime is introduced.

The measured allocation differences fit removing the fresh snapshot's Keys wrapper
and temporary key array: 24 B for empty, 56 B for one key, 80 B for four, 112 B for eight.
The unchanged nonprerender controls save zero bytes. This is measured managed
allocation, not measured browser memory or a prediction of application GC impact.

## Faithful measurement boundary

Each operation constructs the actual internal boundary through a precompiled
expression adapter, uses the real framework Dispatcher and Renderer to assign a
fresh root, bind parameters and render its actual child, then removes/disposes the
root. Constructor adapter, dispatcher invocation, snapshot/validation, wrapping,
child binding/rendering and lifetime bookkeeping are timed. Prepared input frames,
reflection observations, marker serialization, HTTP hosting and browsers are not.
The wrapping algorithm is not copied into a surrogate benchmark.

Eight fixed profiles cover empty, one/four scalar, one fragment, mixed four,
eight fragments, and the unchanged nonprerender scalar controls. Primary:
PrerenderScalar1. Unchanged primary control: NonPrerenderScalar1. Scaled/fragment
profiles do not establish production frequency.

The eight authored project inputs and measured common harness DLL/PDB are identical
between sources. Each frozen image has 195 entries; only the Endpoints DLL/PDB
differ between Original and Candidate (193 entries unchanged).
The actual default checkout is separately restored, built, tested and characterized,
not relabeled original binaries. Its target blob matches the campaign baseline;
the selected Core Renderer source differs and that difference is retained.

Three loaded source-built owners have matching PE/PDB identities. Eight selected
framework documents are verified: five Endpoints and three Core; Web's image/PDB
is bound but has no separately selected required source document. All 19 selected
physical inputs are hashed. This is not complete compiler provenance.

## Results and limitations

| Pair | Order | Original primary ns/op | Candidate primary ns/op | Less time | B/op before -> after |
|---|---|---:|---:|---:|---:|
${summary.primary.map(row => `| ${row.attempt} | ${summary.actualSourceOrders[row.attempt - 1].join(' then ')} | ${format(row.original.meanNs)} | ${format(row.candidate.meanNs)} | ${format(row.lessTimePercent)}% | 1616 -> 1560 |`).join('\n')}

Positive effect means less time. The median of paired percentages is -1.43%,
not a ratio of separately aggregated means. The predeclared timing threshold
(at least 5% median less time and faster in at least two pairs) is not met.
The separate predeclared allocation threshold (at least 32 B/op in two pairs)
is met in all three. Two later slower primary means remain a real adverse
observation, not proof of a statistically established causal regression.

The unchanged four-scalar nonprerender control swings -26.65%, +24.04%, -6.71%.
Mixed4 and Fragments8 regress 7.62% and 1.46% in pair 1. The original first
primary's eight samples decline from 3969.80 to 1261.18 ns/op; the cause is
unproven. No samples are removed. See the complete table for every case/CV.
This shared, non-isolated Windows box is not dedicated benchmarking hardware.

## Behavior and reconstruction evidence

Original: 98 existing managed rows plus all three new mode rows. Current default:
98 existing rows. Candidate: 101 rows. Existing owning RenderFragmentSerializationTest:
14 real Server/WebAssembly rows. All 314 passing XML rows are individually reparsed.
This is green/green preservation of behavior, not semantic-bug red/green.

The first Auto fixture failed before its assertion because explicit root-result
Auto prerendering is unsupported. Its named failed row and 100/101 output remain.
The corrected nested producer matches the real canonical sample and passes all
three rows on untouched shipping code before the candidate. Missing default
restore assets and the original controller post-parser correction are also
retained and explained in the validation catalog.

Original and candidate each pass six canonical sample cases and six real clicks
(Server/WebAssembly/Auto, prerender on/off), with two distinct prerendered fragment
slots, scalar/null preservation, live interactivity, asset responses and no real
browser errors. Existing nested-component Selenium coverage supplies its real
nested producer; the harness's nested fragment/region check is not substituted for it.
All owned helpers are stopped; only the two archived temporary pages are removed.

The independently relocated exact eight-file project is actually restored and
rebuilt. Both variants repeat all 24 renderer profiles, 12 invalid-delegate cases,
three expected disabled-fragment serialization failures, one nested-fragment case
and eight fresh benchmark lifecycles. Only its common harness DLL/PDB differs from
the measured image; owner/dependency bytes and the closed timing budget remain fixed.
No extra timing is used for reconstruction.

Unverified: cached/uncached Auto choice, global Router/template combinations,
enhanced navigation/streaming overlap, AOT/trimming, packaging and HTTP/application
throughput. No independent architecture review occurred; the recorded checkpoint
identifies this as a local behavior-preserving server enumeration, not a new
cross-runtime boundary.

## Reproduce and inspect

Checkout the linked source commit (parent baseline ${source.parentBaseline}).
Follow the repository BuildFromSource guide and Components AGENTS using build.cmd
on Windows. Activate the checkout first, and build the Release Endpoints test graph
with its normal dependencies. Do not substitute installed ASP.NET Core owners.
The captured scripts record exact SDK/build settings and each observed outcome.

Copy all eight harness files into a separate directory and override AspNetCoreRoot
when restoring/building the project, as in the actual independently executed
[restore](reconstruction-paired-001/Restore/command.ps1) and
[build](reconstruction-paired-001/Build/command.ps1) scripts. The original and
candidate checks use separately frozen Endpoints DLL/PDB pairs with all other
dependency bytes held fixed. Compiled/restored images are intentionally omitted
from Git and listed by hash, not pretended to be downloadable executables.

The included independent offline audit needs Node and PowerShell 7, not private
binary paths: run \`node .\\F047-verify.mjs . --require-seal\` from this case.
It recomputes all 384 retained observations/allocations, parses the individual XML,
and verifies the immutable capsule seal without timing. Historical paths identify
the original run, not portable package-cache locations.
`);
text('issue-template.md', `
# F047: reduce temporary SSR parameter-key allocations

**Allocation-only research proposal; not a speedup or merge-ready recommendation.**
Enumerate the private SSRRenderModeBoundary parameter snapshot directly instead
of materializing Keys.ToArray and reindexing every value. Snapshot/validation,
fragment captures and serialization stay intact. Modern Dictionary existing-value
overwrites are supported and exercised on the pinned runtime.

Three permanently closed AB/BA/AB comparisons save 56 B/op in the one-scalar
fresh-boundary primary (1616 -> 1560). Its median paired less-time effect is
-1.43%; the candidate is slower in pairs 2 and 3 (2.48%, 1.43%). The unstable
first original baseline does not justify a 51.20% speedup headline.
Both unchanged nonprerender controls save zero bytes; all adverse results remain.

| Connected artifact | Link |
|---|---|
| Exact source proposal and preservation theory | [Two-file commit](https://github.com/jaslawinMs/aspnetcore/commit/{{SOURCE_COMMIT}}) |
| Immutable case guide and runnable BenchmarkDotNet project | [Guide](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F047/README.md) |
| Every measurement, CV, control and raw-report link | [Results](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F047/comparison-results.md) |
| Exact commands/results, 314 individual passing XML rows and browser boundaries | [Validation](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F047/validation-commands.md) |
| Raw arithmetic audit and independent untimed rebuild | [Audit](https://github.com/jaslawinMs/aspnetcore/blob/{{EVIDENCE_COMMIT}}/F047/audit-summary.json) |

The source contains only the loop change, unused-using removal and three new
Server/WebAssembly/Auto preservation rows. The new theory is green on both
shipping versions; it closes coverage, not a claimed functional bug. The initial
unsupported root-Auto fixture failure, restore prerequisite and parser correction
are retained. Canonical browser checks pass six modes/clicks per source and the
owning existing Selenium suite passes all 14 rows. No application throughput,
cached Auto selection, AOT/trimming, global Router or packaging result is claimed.
The fork draft and additive publication receipt will be connected after creation.
`);
text('.gitattributes', '* -text');
const excludedRoots = [
  'consumer-original', 'consumer-candidate', 'consumer-current-default', 'harness/bin', 'harness/obj',
  'reconstruction-paired-001/project/bin', 'reconstruction-paired-001/project/obj',
  'reconstruction-paired-001/consumer-original', 'reconstruction-paired-001/consumer-candidate'
];
const excluded = relative => excludedRoots.some(prefix => relative === prefix || relative.startsWith(prefix + '/'));
const copied = [];
const omitted = [];
for (const file of files(run).sort()) {
  const relative = forward(path.relative(run, file));
  const item = { path: relative, bytes: fs.statSync(file).size, sha256: sha(file) };
  if (excluded(relative)) {
    omitted.push(item);
    continue;
  }
  assert.equal(/\.(dll|pdb|exe|so|dylib|nupkg)$/i.test(relative), false, 'Inspect unexpected compiled bytes: ' + relative);
  const target = path.join(destination, ...relative.split('/'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(file, target, fs.constants.COPYFILE_EXCL);
  assert.equal(sha(target), item.sha256);
  copied.push(item);
}
for (const name of fs.readdirSync(session).filter(name => /^F047-.*\.(mjs|ps1)$/.test(name)).sort()) {
  const source = path.join(session, name);
  const target = path.join(destination, 'executed-drivers', name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
  copied.push({ path: 'executed-drivers/' + name, bytes: fs.statSync(source).size, sha256: sha(source) });
}
fs.copyFileSync(path.join(published, 'F042', 'LICENSE.txt'), path.join(destination, 'LICENSE.txt'), fs.constants.COPYFILE_EXCL);
write(path.join(destination, 'omitted-file-hashes.json'), {
  candidate: 'F047', actualOmittedFiles: omitted.length, actualOnlyExcludedRoots: excludedRoots,
  actualCompiledRestoreBytesPublished: false, files: omitted
});
const audit = spawnSync(process.execPath, [path.join(destination, 'F047-verify.mjs'), destination],
  { encoding: 'utf8', windowsHide: true });
for (const [name, content] of [['portable-capsule-audit.stdout.txt', audit.stdout], ['portable-capsule-audit.stderr.txt', audit.stderr]]) {
  fs.writeFileSync(path.join(run, name), content ?? '', { flag: 'wx' });
  fs.copyFileSync(path.join(run, name), path.join(destination, name), fs.constants.COPYFILE_EXCL);
  copied.push({ path: name, bytes: fs.statSync(path.join(run, name)).size, sha256: sha(path.join(run, name)) });
}
assert.equal(audit.status, 0, audit.stderr || audit.stdout);
write(path.join(destination, 'portable-capsule-audit-command.json'), {
  executable: process.execPath, arguments: [path.join(destination, 'F047-verify.mjs'), destination],
  actualExitCode: audit.status, actualTimingRun: false, actualLiveBinaryAudit: false
});
write(path.join(destination, 'authoritative-copies.json'), {
  candidate: 'F047', actualByteExactCopies: copied.length,
  actualSources: 'Case-owned actual run files and recorded private drivers, excluding compiler/restored images',
  files: copied
});
const broken = [];
const late = [];
for (const name of ['README.md', 'comparison-results.md', 'validation-commands.md', 'issue-template.md']) {
  const markdown = fs.readFileSync(path.join(destination, name), 'utf8');
  assert.equal(markdown.includes('\uFFFD'), false);
  assert.equal(markdown.endsWith('\n\n'), false);
  for (const match of markdown.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^(https?:|mailto:|\{\{)/i.test(target)) continue;
    if (target === 'publication.json') late.push({ document: name, target, reason: 'Intentionally additive receipt after immutable publication.' });
    else if (target !== 'capsule-file-hashes.json' && !fs.existsSync(path.join(destination, ...target.split('/')))) broken.push({ document: name, target });
  }
}
assert.deepEqual(broken, []);
assert.equal(late.length, 1);
write(path.join(destination, 'authored-link-audit.json'), {
  candidate: 'F047', actualBrokenAuthoredArtifactLinks: 0, actualExplicitlyPlannedLateReceiptLinks: late,
  actualTemplatePlaceholdersAreNotPublishedIssueLinks: true
});
const material = files(destination).map(file => ({
  path: forward(path.relative(destination, file)), bytes: fs.statSync(file).size, sha256: sha(file)
})).sort((a, b) => a.path.localeCompare(b.path));
write(path.join(destination, 'capsule-file-hashes.json'), {
  candidate: 'F047', actualSelfReferenceExcluded: 'capsule-file-hashes.json', files: material
});
const sealed = spawnSync(process.execPath, [path.join(destination, 'F047-verify.mjs'), destination, '--require-seal'],
  { encoding: 'utf8', windowsHide: true });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stdout.txt'), sealed.stdout ?? '', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stderr.txt'), sealed.stderr ?? '', { flag: 'wx' });
assert.equal(sealed.status, 0, sealed.stderr || sealed.stdout);
const receipt = {
  candidate: 'F047', actualImmutableFilesIncludingSeal: material.length + 1,
  actualCopiedAuthoritativeFiles: copied.length, actualOmittedCompiledRestoreFiles: omitted.length,
  actualSealedCapsuleAuditPassed: true, actualBrokenAuthoredArtifactLinks: 0,
  actualExplicitlyPlannedAdditiveReceiptLinks: 1, actualHistoricalTimingRerun: false,
  actualCountersAdvanced: false, actualReportChanged: false
};
write(path.join(run, 'capsule-preparation.json'), receipt);
console.log(JSON.stringify(receipt, null, 2));
