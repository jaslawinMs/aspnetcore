import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F121');
const published = path.join(session, 'autoperf-published-results');
const destination = path.join(published, 'F121');
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex').toUpperCase();
const relative = filename => path.relative(destination, filename).replaceAll('\\', '/');
function write(name, value) {
  const filename = path.join(destination, ...name.split('/'));
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
function execute(executable, args, cwd = published) {
  const result = spawnSync(executable, args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}
function inventory(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    assert.equal(item.isSymbolicLink(), false);
    const name = prefix ? prefix + '/' + item.name : item.name;
    return item.isDirectory() ? inventory(path.join(directory, item.name), name) : [name];
  }).sort();
}
assert.equal(fs.existsSync(destination), false, 'Preserve an existing or partial capsule; do not overwrite it.');
assert.equal(execute('git', ['--no-pager', 'rev-parse', 'HEAD']), 'f1218a4e0d8369d50bc078e2c6a8717b6f7a52c5');
assert.equal(execute('git', ['--no-pager', 'status', '--porcelain']), '');
assert.equal(execute('git', ['--no-pager', 'rev-parse', 'HEAD:REPORT.md']), '73abf142464b1f81676e03a1eebc766c279cb47b');
const audit = read(path.join(run, 'audit-summary.json'));
const source = read(path.join(run, 'source-publication.json'));
const decision = read(path.join(run, 'decision.json'));
assert.equal(audit.actualDisposition, 'no-gain');
assert.equal(audit.actualRetainedSamples, 768);
assert.equal(audit.actualRuntimeRecordsChecked, 22);
assert.equal(audit.actualPerBenchmarkSettingsRecordsChecked, 192);
assert.equal(source.actualRemoteRefVerified, true);
assert.equal(sha(path.join(run, 'diagnostic-budget.json')), decision.actualClosedBudgetSha256);
fs.mkdirSync(destination);
const copies = [];
const omitted = [];
for (const name of inventory(run)) {
  const filename = path.join(run, ...name.split('/'));
  const entry = { path: name, bytes: fs.statSync(filename).size, sha256: sha(filename) };
  const segments = name.split('/');
  if (segments.some(segment => segment === 'bin' || segment === 'obj' || segment.startsWith('consumer-'))
    || /\.(dll|pdb|exe|so|a|dylib|zip|nupkg|cache|bin|db)$/i.test(name)) {
    omitted.push(entry);
    continue;
  }
  const target = path.join(destination, ...segments);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(filename, target, fs.constants.COPYFILE_EXCL);
  assert.equal(sha(target), entry.sha256);
  copies.push({ ...entry, authoritativeSource: 'private-case/' + name });
}
const drivers = [
  'intake.mjs', 'managed-command.mjs', 'bootstrap-harness.mjs', 'freeze.mjs',
  'characterize.mjs', 'audit-test-results.mjs', 'seal.mjs', 'compare.mjs',
  'close-budget.mjs', 'reproduce-untimed.mjs', 'finalize-evaluation.mjs',
  'publish-source.mjs', 'build-capsule.mjs'
];
for (const name of drivers) {
  const filename = 'F121-' + name;
  const input = path.join(session, filename);
  const target = 'executed-drivers/' + filename;
  write(target, fs.readFileSync(input, 'utf8'));
  assert.equal(sha(path.join(destination, ...target.split('/'))), sha(input));
  copies.push({
    path: target, bytes: fs.statSync(input).size, sha256: sha(input),
    authoritativeSource: 'private-session/' + filename
  });
}
write('.gitattributes', '* -text\n');
const sourceBase = `https://github.com/jaslawinMs/aspnetcore/blob/${source.sourceCommit}`;
const sourceCommitUrl = `https://github.com/jaslawinMs/aspnetcore/commit/${source.sourceCommit}`;
const sourceTarget = sourceBase + '/src/Mvc/Mvc.Core/src/Infrastructure/CopyOnWriteList.cs';
const sourceTests = sourceBase + '/src/Mvc/Mvc.Core/test/Infrastructure/CopyOnWriteListTest.cs';
const report = (attempt, variant) => `comparison-${String(attempt).padStart(3, '0')}/${variant}/reports/results/AutoPerf.CollectionBenchmarks-report-full.json`;
const f = number => number.toFixed(2);
const perProfile = audit.profileSummaries.map(item =>
  `| ${item.method} | ${item.profile} | ${f(item.medianLessTimePercent)}% | ${item.eachLessTimePercent.map(value => f(value) + '%').join(' / ')} | ${item.originalAllocatedBytes.join('/')} -> ${item.candidateAllocatedBytes.join('/')} |`).join('\n');
const primary = audit.primary.map(item =>
  `| ${item.attempt} | ${item.attempt === 2 ? 'Candidate -> Original' : 'Original -> Candidate'} | ${f(item.original.meanNs)} | ${f(item.candidate.meanNs)} | ${f(item.lessTimePercent)}% | 0 -> 0 |`).join('\n');
const variability = audit.rows.map(item =>
  `| ${item.attempt} | ${item.variant} | ${item.method} | ${item.profile} | ${f(item.meanNs)} | ${f(item.standardDeviationNs)} | ${f(item.cvPercent)}% | ${f(item.firstHalfMeanNs)} | ${f(item.secondHalfMeanNs)} | ${f(item.fittedEndToEndTrendPercent)}% |`).join('\n');
const rawLinks = [1, 2, 3].map(attempt =>
  `- Comparison ${attempt}: [Original full JSON](${report(attempt, 'Original')}), [Candidate full JSON](${report(attempt, 'Candidate')}), [authorization](comparison-${String(attempt).padStart(3, '0')}/authorization.json), [execution receipt](comparison-${String(attempt).padStart(3, '0')}/execution-receipt.json).`).join('\n');
write('comparison-results.md', `# F121: all measured results

The declared primary is one public \`CopyTo\` on an already-copied, actual MVC five-factory collection, into an exact-sized preallocated array. Negative **less-time** means slower. These are local method measurements, not request throughput.

| Comparison | Order | Original ns/op | Candidate ns/op | Less time | B/op |
|---|---|---:|---:|---:|---|
${primary}

Median paired primary effect: **${f(audit.actualMedianPrimaryLessTimePercent)}% less time**, or **${f(-audit.actualMedianPrimaryLessTimePercent)}% more time**. This is the median of paired percentage effects, not a ratio of independent medians. BenchmarkDotNet reports **0 B/op in both variants in every primary pair**.

## Every profile and unchanged control

The zero-offset destinations are exact-sized. Offset-two destinations retain two sentinel entries before and after the copied region. Both timed methods share the same immutable prepared collection. No favorable row substitutes for the primary.

| Method | Profile | Median less time | Each comparison less time | Original -> candidate B/op |
|---|---|---:|---|---|
${perProfile}

The source-backed path is not edited; its favorable observations and all unchanged \`IndexOf\` movements are retained without assigning a JIT cause. Several unchanged controls are unstable; the highest individual-case CV across the complete matrix is ${f(audit.actualMaximumObservedCaseCvPercent)}%. Do not treat those controls as perfectly stable. No disassembly was collected.

## All individual case variability

Each row retains all eight workload-result observations. SD is the sample standard deviation; fitted trend is the fitted first-to-last change divided by the mean. No outlier removal, case substitution or profile retuning occurred.

| Comparison | Source | Method | Profile | Mean ns | SD ns | CV | First-half ns | Last-half ns | Fitted trend |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
${variability}

## Raw authority

${rawLinks}

Each source directory also contains exact stdout with every warmup, adaptive-overhead, workload, result and GC observation, its runtime/owner/settings records and CSV/Markdown exports. [Independent recomputation](measurement-audit.json) checks all **768** actual-minus-median-overhead samples and midpoint-to-even allocation arithmetic against [the pinned BDN implementation](BenchmarkDotNet-0.13.0-GcStats.cs) and [license](BenchmarkDotNet-0.13.0-LICENSE.md).
`);
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const commands = fs.readdirSync(path.join(run, 'validation')).sort().map(label => {
  const command = read(path.join(run, 'validation', label, 'command.json'));
  const result = read(path.join(run, 'validation', label, 'result.json'));
  const args = command.arguments.map(quote).join(', ');
  const row = audit.actualXmlAudits.find(item => item.label === label);
  const rowAudit = row ? read(path.join(run, 'validation', label, 'test-row-audit.json')) : undefined;
  const environment = Object.entries(command.environmentOverrides).map(([name, value]) => `$env:${name} = ${quote(value)}`).join('\n');
  return `### ${label}

\`\`\`powershell
Set-Location -LiteralPath ${quote(command.cwd)}
. .\\activate.ps1
${environment}
$arguments = @(${args})
& ${quote(command.executable)} @arguments
\`\`\`

**Result:** exit ${result.exitCode}${row ? `; all ${row.actualRows} individual XML rows passed, including ${row.actualFocusedRows} new preservation rows; none failed or skipped` : result.exitCode === 0 ? '; passed' : '; failed on the unrelated missing native ANCM DLL before the scoped correction'}.
[Raw command](validation/${label}/command.json), [result](validation/${label}/result.json), [stdout](validation/${label}/stdout.txt), [stderr](validation/${label}/stderr.txt)${row ? `, [individual-row audit](validation/${label}/test-row-audit.json), [actual XML](validation/${label}/test-results/${rowAudit.actualReport})` : ''}.
`;
}).join('\n');
write('validation-commands.md', `# F121: exact validation commands and outcomes

The repository-pinned SDK was activated in every managed shell. Builds use at most two workers, no shared compilation or node reuse, and were serialized with measurement. The first broad managed graph stopped on missing native ANCM assets. Existing command-only \`UseIisNativeAssets=false\`, \`BuildNodeJS=false\` and \`StaticWebAssetsEnabled=false\` scope then passed. No source, package/feed configuration or SDK pin was changed to bypass that prerequisite. IIS/native, static-assets, browser, packaging and full-repository coverage are not claimed.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Items, null entries, offsets and post-copy source isolation | \`CopyTo_PreservesItemsOffsetAndStoreIsolation\`, both Boolean rows, original and candidate |
| Empty store remains no-op for null/invalid destinations | \`CopyTo_EmptyStoreDoesNotValidateDestination\`, both Boolean rows |
| Partial writes before a short-array bounds failure | \`CopyTo_PreservesPartialWritesBeforeBoundsFailure\`, both Boolean rows |
| Exact null and negative-offset exception types | \`CopyTo_PreservesNullAndNegativeIndexFailures\`, both Boolean rows |
| Covariant array failure preserves its successful prefix | \`CopyTo_PreservesCovariantArrayPartialWrites\`, both Boolean rows |
| Arbitrary source enumeration and disposal on success/failure | \`CopyTo_UnmodifiedStoreEnumeratesAndDisposesSource\`, both Boolean rows |
| Real controller producers and both invoker modes, without property substitution | [Original characterization](characterization-original-characterize-001/verified-characterization.json), [actual default](characterization-default-characterize-001/verified-characterization.json), [candidate](characterization-candidate-characterize-001/verified-characterization.json): 48 actual HTTP requests and 16 public profile contracts per variant |
| Exact source, PE/PDB associations and all measured observations | [Full audit](audit-summary.json): 117 historical passing XML rows, 22 runtime records, 192 settings records, 768 samples; these are executions, not 117 unique tests |
| Independently rebuilt exact eight-input project and both source variants | [Actual reconstruction](reconstruction-paired-001/verified-reproduction.json); no extra timing |

These are **green/green performance-preservation checks**, not proof of fixing a semantic bug. The managed boundary owns these collection effects; no browser test is required or claimed.

${commands}

## Independent reconstruction and audit

The exact activated restore/build/characterization commands and exit-zero results are in [Restore](reconstruction-paired-001/Restore/command.json), [Build](reconstruction-paired-001/Build/command.json), [Original](reconstruction-paired-001/Original-Characterize/command.json) and [Candidate](reconstruction-paired-001/Candidate-Characterize/command.json).

The full audit command and its actual successful result are in [full-live-audit.command.json](full-live-audit.command.json), with [stdout](full-live-audit.stdout.txt) and [stderr](full-live-audit.stderr.txt). The reconstruction changed only the rebuilt common harness DLL/PDB; measured owner/dependency bytes and the closed budget remained fixed.
`);
write('README.md', `# F121: MVC CopyTo copied-store experiment - no gain

**Disposition: no-gain; no performance PR and no merge recommendation.** The declared already-copied five-factory primary is **16.03%, 5.06% and 18.84% slower**. Median paired effect: **16.03% more time**. BenchmarkDotNet reports **0 B/op before and after** in all three pairs. Three complete comparisons retain **768 observations**; the timing budget is permanently closed.

## Connected artifacts

| Artifact | Link | Meaning |
|---|---|---|
| Diagnostic source | [Independent fork branch](${source.sourceBranchUrl}), [exact source commit](${sourceCommitUrl}) | \`${source.sourceCommit}\`, parent \`${source.parentBaseline}\`; not proposed for merge |
| Shipping seam | [CopyOnWriteList.cs](${sourceTarget}) | Ten insertions only in \`CopyTo\`; source-backed loop untouched |
| Preservation tests | [Exact test source](${sourceTests}), [tested physical snapshot](preservation-source/src/Mvc/Mvc.Core/test/Infrastructure/CopyOnWriteListTest.cs) | Six methods, twelve Boolean rows, green on original and candidate |
| Runnable BDN project | [Project](harness/AutoPerf.Benchmarks.csproj), [timed methods](harness/CollectionBenchmarks.cs), [eight source hashes](harness-source-hashes.json) | Same common source/DLL/PDB for both measured variants |
| Real producer | [HostedProducer.cs](harness/HostedProducer.cs), [baseline seal](baseline-validation.json), [premeasurement seal](premeasurement-validation.json) | Actual routed MVC controller actions; no factory-property assignment or surrogate collection |
| All measurements | [Comparison tables](comparison-results.md), [independent raw recomputation](measurement-audit.json) | Every adverse, favorable and unchanged-control row retained |
| Correctness and commands | [Requirements, exact commands and outcomes](validation-commands.md) | 117 historical passing individual XML rows; no hidden skipped row |
| Independent reconstruction | [Verified result](reconstruction-paired-001/verified-reproduction.json), [exact copied project](reconstruction-paired-001/project/AutoPerf.Benchmarks.csproj) | Actually restored/rebuilt all eight inputs and characterized both source variants; no extra timing |
| Final decision and budget | [Decision](decision.json), [closed budget](diagnostic-budget.json), [close receipt](permanent-budget-close.json) | No primary timing/allocation qualification; no replay or retuning |
| Complete verification | [Portable verifier](F121-verify.mjs), [full audit](audit-summary.json), [XML parser](F121-audit-trx.ps1) | All samples, source bindings, owner/settings records and individual rows independently checked |
| Exact-copy and omission inventories | [Authoritative copies](authoritative-copies.json), [omitted files](omitted-file-hashes.json), [immutable seal](capsule-file-hashes.json) | Omitted binaries/build caches are hashed, not shipped |

Tracking and the final campaign/index receipt are added only after this immutable evidence commit is published. The later \`publication.json\` is additive and excluded from the core seal; it must not rewrite this historical capsule.

## Why this apparently simple change was not accepted

The scan identified interface enumeration in \`CopyTo\`. All four inspected controller/page producers cache arrays; a private exact \`List<T>\` exists only after a public write. The candidate enumerates that private concrete list while retaining the original per-item assignment and untouched source fallback.

The runtime measurements do **not** show the predicted copied-store allocation saving. Reported allocation is 0 B/op for both copied variants, including all three primary pairs. BDN rounds amortized per-operation bytes; that is not proof of no allocation anywhere, and no disassembly was collected to establish a JIT explanation.

Empty and ordinary source-backed profiles have favorable observations, but they do not replace the declared copied-store primary. The ordinary source-backed path itself was not edited, and unchanged controls also move. See every result and its variability in [comparison-results.md](comparison-results.md). There is no normal-request, whole-MVC or application-throughput claim.

## Behavioral compatibility

This legacy method deliberately retains its observed behavior, including no destination validation for an empty source and partial successful writes before bounds or covariant-array failures. Replacing it with \`List<T>.CopyTo\` or \`Array.Copy\` without additional analysis would not preserve that boundary. The original interface fallback also has to respect arbitrary supplied enumeration and disposal, rather than assuming an indexer or ordinary List subclass behavior.

The new tests preserve these contracts on both source-backed and already-copied stores. They are not semantic-bug regression claims. HTTP characterization exercises real per-request production, public mutation and source isolation, both controller invoker modes, direct CopyTo and real \`Enumerable.ToArray\` consumption. Existing managed page-producer tests pass, but **no compiled Razor Page request or browser validation is claimed**.

## Source, environment and reproducibility limits

- Campaign baseline: \`${source.parentBaseline}\`; actual default checked and built: \`f78194260f43c48ae2092675f55757f2a42dd63d\`. All ten selected original/default inputs match in Git text.
- SDK \`12.0.100-alpha.1.26557.102\`, x64 runtime \`12.0.0-alpha.1.26562.105\`, C# 13 and BDN 0.13.0. Exact host/hardware and runtime data are retained in the [raw first report](${report(1, 'Original')}) and runtime records.
- Three warmups, eight retained results, requested 100 ms, unroll 1, no outlier removal. Source orders: Original -> Candidate, Candidate -> Original, Original -> Candidate.
- This is a shared, non-isolated Windows box. Process/thread priorities remain Normal and affinity 65535; no affinity, power, firewall, URL ACL or other machine setting was changed.
- Original/candidate images contain 328 files; 326 entries, including the common harness DLL/PDB, are identical. Only source-built MVC Core DLL/PDB differ. Six selected portable-PDB documents match three actually loaded owners; this is **not complete compiler provenance**.
- Measured binaries predate the later source publication commit. Physical source snapshots, image inventories and portable-PDB associations are historical authority; a later commit ID alone is not claimed to reproduce measured PE bytes.
- The exact relocated common project was actually restored and rebuilt. It reused measured owner/dependency bytes and verified both untimed variants. The public capsule omits compiled images/restore caches and does not promise turnkey byte-identical fresh-clone replay.
- No AOT/trimming, packaging, compiled-page/browser, representative call-frequency or merge-readiness claim. No new public API or framework assembly-boundary mechanism.

## Verify the capsule without running benchmarks

\`\`\`powershell
node .\\F121-verify.mjs . --require-seal
\`\`\`

The audit recomputes the historical observations; it does not rerun timing. Historical authorizations are consumed. **Do not replay them.** Source-building commands use the activated repository and its unchanged feed configuration; machine-specific repository paths are recorded explicitly in [validation-commands.md](validation-commands.md).
`);
write('issue-template.md', `## Outcome

**F121 is measured no-gain, not a performance PR.** Three complete source comparisons retain 768 observations. The predeclared copied-five-factory CopyTo primary is 16.03%, 5.06% and 18.84% slower; BDN reports 0 B/op in both variants. All secondary and unchanged-control observations are retained. The three-slot budget is permanently closed.

## Connected artifacts

| Artifact | Link |
|---|---|
| Immutable evidence and limitations | {{EVIDENCE_URL}} |
| Exact source experiment, not recommended for merge | ${sourceCommitUrl} |
| Twelve focused preservation rows | ${sourceTests} |
| Runnable BenchmarkDotNet project | {{EVIDENCE_BASE}}/harness/AutoPerf.Benchmarks.csproj |
| Every measurement, control and variability table | {{EVIDENCE_BASE}}/comparison-results.md |
| Exact validation commands, results and requirement coverage | {{EVIDENCE_BASE}}/validation-commands.md |
| Independent exact-eight-input rebuild | {{EVIDENCE_BASE}}/reconstruction-paired-001/verified-reproduction.json |
| Independent audit: 117 XML rows, 22 runtime and 192 settings records | {{EVIDENCE_BASE}}/audit-summary.json |
| Closed timing budget | {{EVIDENCE_BASE}}/permanent-budget-close.json |

Current default f78194260f43c48ae2092675f55757f2a42dd63d and the original source pass the same faithful MVC producer/CopyTo boundary. New tests are green/green preservation checks, not a semantic-bug fix. The candidate preserves empty-input no-op behavior, exception types, partial writes and arbitrary source enumeration/disposal.

No primary retargeting, further timing, normal-request/application gain, specific JIT-cause, compiled-page/browser or merge-readiness claim. No performance pull request or browser launch. The fixed classified report excludes no-gain results and remains unchanged.
`);
write('authoritative-copies.json', { candidate: 'F121', files: copies });
write('omitted-file-hashes.json', { candidate: 'F121', actualReason: 'Compiled images, build output and restore caches are identified but intentionally not committed.', files: omitted });
const authored = ['README.md', 'comparison-results.md', 'validation-commands.md', 'issue-template.md'];
const links = [];
function verifyLinks(allowDeferredSeal) {
  for (const name of authored) {
    const text = fs.readFileSync(path.join(destination, name), 'utf8');
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^(https?:|#)/.test(target)) continue;
      const decoded = decodeURIComponent(target.split('#')[0]);
      if (allowDeferredSeal && decoded === 'capsule-file-hashes.json') continue;
      const filename = path.resolve(destination, decoded);
      assert.ok(filename.startsWith(destination + path.sep));
      assert.equal(fs.existsSync(filename), true, `${name}: missing local artifact ${target}`);
      if (allowDeferredSeal) links.push({ source: name, target });
    }
  }
}
verifyLinks(true);
write('authored-link-audit.json', { candidate: 'F121', actualCheckedExistingLocalLinks: links.length,
  actualDeferredSealSelfLinkOnly: 'capsule-file-hashes.json',
  actualFinalSelfLinkMustBeVerifiedAfterSealCreation: true, links });
const material = inventory(destination).map(name => {
  const filename = path.join(destination, ...name.split('/'));
  return { path: name, bytes: fs.statSync(filename).size, sha256: sha(filename) };
});
write('capsule-file-hashes.json', { candidate: 'F121', actualExcludedAdditiveFiles: ['capsule-file-hashes.json', 'publication.json'], files: material });
verifyLinks(false);
const verifyArguments = [path.join(destination, 'F121-verify.mjs'), destination, '--require-seal'];
const verification = spawnSync(process.execPath, verifyArguments, { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stdout.txt'), verification.stdout ?? '', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stderr.txt'), verification.stderr ?? '', { flag: 'wx' });
const preparation = {
  candidate: 'F121', disposition: 'no-gain', actualImmutableFilesIncludingSeal: material.length + 1,
  actualCopiedAuthoritativeFiles: copies.length, actualOmittedCompiledRestoreFiles: omitted.length,
  actualCheckedAuthoredLocalLinks: links.length + 1, actualBrokenAuthoredArtifactLinks: 0,
  actualSealSelfLinkVerifiedAfterCreation: true, actualSealedCapsuleAuditPassed: verification.status === 0,
  actualAuditExecutable: process.execPath, actualAuditArguments: verifyArguments, actualAuditExitCode: verification.status,
  actualCurrentCountersUnchanged: true, actualFixedReportPreserved: true
};
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.command.json'), JSON.stringify(preparation, null, 2) + '\n', { flag: 'wx' });
console.log(verification.stdout);
assert.equal(verification.status, 0, verification.stderr);
fs.writeFileSync(path.join(run, 'capsule-preparation.json'), JSON.stringify(preparation, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(preparation, null, 2));
