import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F123');
const published = path.join(session, 'autoperf-published-results');
const destination = path.join(published, 'F123');
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, ''));
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex').toUpperCase();
function write(name, value) {
  const filename = path.join(destination, ...name.split('/'));
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
function execute(executable, args) {
  const result = spawnSync(executable, args, { cwd: published, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
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
assert.equal(fs.existsSync(destination), false, 'Preserve an existing or partial capsule; never overwrite it.');
assert.equal(execute('git', ['--no-pager', 'rev-parse', 'HEAD']), 'ac7c722f94eea4a831f3e16debbc43802dde305b');
assert.equal(execute('git', ['--no-pager', 'status', '--porcelain']), '');
assert.equal(execute('git', ['--no-pager', 'rev-parse', 'HEAD:REPORT.md']), '73abf142464b1f81676e03a1eebc766c279cb47b');
const audit = read(path.join(run, 'audit-summary.json'));
const source = read(path.join(run, 'source-publication.json'));
const decision = read(path.join(run, 'decision.json'));
assert.equal(audit.actualDisposition, 'no-gain');
assert.equal(audit.actualRetainedSamples, 1152);
assert.equal(audit.actualRuntimeRecordsChecked, 22);
assert.equal(audit.actualPerBenchmarkSettingsRecordsChecked, 288);
assert.equal(source.actualRemoteRefVerified, true);
assert.equal(decision.actualNoPerformancePrWarranted, true);
assert.equal(sha(path.join(run, 'diagnostic-budget.json')), read(path.join(run, 'permanent-budget-close.json')).closedBudgetSha256);
assert.equal(read(path.join(run, 'full-live-audit.command.json')).actualExitCode, 0);
assert.equal(sha(path.join(run, 'F123-verify.mjs')), sha(path.join(session, 'F123-verify.mjs')));
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
for (const suffix of [
  'intake.mjs', 'managed-command.mjs', 'audit-test-results.mjs', 'preservation-baseline.mjs',
  'prepare-original.mjs', 'freeze.mjs', 'seal.mjs', 'prepare-candidate.mjs', 'compare.mjs',
  'verify.mjs', 'reproduce-untimed.mjs', 'finish-evaluation.mjs', 'record-final-audit.mjs',
  'publish-source.mjs', 'build-capsule.mjs'
]) {
  const filename = 'F123-' + suffix;
  const input = path.join(session, filename);
  const target = 'executed-drivers/' + filename;
  write(target, fs.readFileSync(input));
  assert.equal(sha(path.join(destination, ...target.split('/'))), sha(input));
  copies.push({ path: target, bytes: fs.statSync(input).size, sha256: sha(input),
    authoritativeSource: 'private-session/' + filename });
}
write('.gitattributes', '* -text\n');
const sourceBase = `https://github.com/jaslawinMs/aspnetcore/blob/${source.sourceCommit}`;
const sourceCommitUrl = `https://github.com/jaslawinMs/aspnetcore/commit/${source.sourceCommit}`;
const sourceTarget = sourceBase + '/src/Mvc/Mvc.Core/src/Infrastructure/CopyOnWriteList.cs';
const sourceTests = sourceBase + '/src/Mvc/Mvc.Core/test/Infrastructure/CopyOnWriteListTest.cs';
const report = (attempt, variant) => `comparison-${String(attempt).padStart(3, '0')}/${variant}/reports/results/AutoPerf.CollectionBenchmarks-report-full.json`;
const f = number => number.toFixed(2);
const effects = audit.primary.map(item => f(item.lessTimePercent) + '%').join(' / ');
const primary = audit.primary.map(item =>
  `| ${item.attempt} | ${item.attempt === 2 ? 'Candidate -> Original' : 'Original -> Candidate'} | ${f(item.original.meanNs)} | ${f(item.candidate.meanNs)} | ${f(item.lessTimePercent)}% | ${item.original.allocatedBytesPerOperation} -> ${item.candidate.allocatedBytesPerOperation} |`).join('\n');
const perProfile = audit.profileSummaries.map(item =>
  `| ${item.method} | ${item.profile} | ${f(item.medianLessTimePercent)}% | ${item.eachLessTimePercent.map(value => f(value) + '%').join(' / ')} | ${item.originalAllocatedBytes.join('/')} -> ${item.candidateAllocatedBytes.join('/')} |`).join('\n');
const variability = audit.rows.map(item =>
  `| ${item.attempt} | ${item.variant} | ${item.method} | ${item.profile} | ${f(item.meanNs)} | ${f(item.standardDeviationNs)} | ${f(item.cvPercent)}% | ${f(item.firstHalfMeanNs)} | ${f(item.secondHalfMeanNs)} | ${f(item.fittedEndToEndTrendPercent)}% |`).join('\n');
const rawLinks = [1, 2, 3].map(attempt =>
  `- Comparison ${attempt}: [Original full JSON](${report(attempt, 'Original')}), [Candidate full JSON](${report(attempt, 'Candidate')}), [authorization](comparison-${String(attempt).padStart(3, '0')}/authorization.json), [execution receipt](comparison-${String(attempt).padStart(3, '0')}/execution-receipt.json).`).join('\n');
write('comparison-results.md', `# F123: all measured results

The declared primary is one public \`IList.IndexOf\` miss on an already-copied actual MVC default-five-factory collection. Negative **less-time** means slower. This is a local method boundary, not request throughput.

| Comparison | Order | Original ns/op | Candidate ns/op | Less time | B/op |
|---|---|---:|---:|---:|---|
${primary}

Median paired primary effect: **${f(audit.actualMedianPrimaryLessTimePercent)}% less time**, or **${f(-audit.actualMedianPrimaryLessTimePercent)}% more time**. This is the median of paired percentage effects, not a ratio of independent medians. Both sources report **0 B/op in every primary pair**.

## Every profile and unchanged control

Twelve profiles retain misses, first-hit and last-hit short circuits, empty, singleton and eight-factory shapes, both source-backed and already-copied. \`UnchangedContains\` consumes the same collection and probe; IndexOf is not its own control. The ordinary source-backed path's median observed effect is ${f(-audit.actualOrdinaryMedianMoreTimePercent)}% less time. Favorable rows do not replace the declared primary.

| Method | Profile | Median less time | Each comparison less time | Original -> candidate B/op |
|---|---|---:|---|---|
${perProfile}

The original source fallback is byte-for-byte unchanged. No specific JIT explanation is assigned to its favorable movement or to unchanged-control movement. This shared box is not isolated; the worst individual-case CV is ${f(audit.actualMaximumObservedCaseCvPercent)}%. No disassembly was collected.

## Every case's variability

Each row retains all eight results. SD is sample standard deviation; fitted trend is fitted first-to-last change divided by the mean. No outlier removal, case substitution or retuning occurred.

| Comparison | Source | Method | Profile | Mean ns | SD ns | CV | First-half ns | Last-half ns | Fitted trend |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
${variability}

## Raw authority

${rawLinks}

Each source directory also retains exact stdout, all warmups, adaptive-overhead/workload/result/GC observations, source/runtime/owner/settings records and CSV/Markdown exports. [Independent recomputation](measurement-audit.json) checks all **1,152** actual-minus-median-overhead samples and midpoint-to-even allocation arithmetic against [BDN's pinned source](BenchmarkDotNet-0.13.0-GcStats.cs) and [license](BenchmarkDotNet-0.13.0-LICENSE.md).
`);
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const commands = fs.readdirSync(path.join(run, 'validation')).sort().map(label => {
  const command = read(path.join(run, 'validation', label, 'command.json'));
  const result = read(path.join(run, 'validation', label, 'result.json'));
  const row = audit.actualXmlAudits.find(item => item.label === label);
  const rowAudit = row ? read(path.join(run, 'validation', label, 'test-row-audit.json')) : undefined;
  let outcome = row ? `all ${row.actualRows} individual XML rows passed, including ${row.actualFocusedRows} new preservation rows; none failed or skipped` : 'passed within the stated scope';
  if (label === 'original-preservation-tests-001') outcome = 'failed: two rows stopped before IndexOf/assertion because Moq could not proxy a private generic argument; raw failure streams remain, but the initial failing TRX was subsequently overwritten';
  if (label === 'original-preservation-tests-002') outcome = 'all 40 rows passed according to the raw runner output, but a reused results directory overwrote the first attempt TRX; this misdirected report is excluded from accepted XML evidence; attempt 003 supplies fresh individual-row proof';
  const environment = Object.entries(command.environmentOverrides).map(([name, value]) => `$env:${name} = ${quote(value)}`).join('\n');
  return `### ${label}

\`\`\`powershell
Set-Location -LiteralPath ${quote(command.cwd)}
. .\\activate.ps1
${environment}
$arguments = @(${command.arguments.map(quote).join(', ')})
& ${quote(command.executable)} @arguments
\`\`\`

**Result:** exit ${result.exitCode}; ${outcome}.
[Command](validation/${label}/command.json), [result](validation/${label}/result.json), [stdout](validation/${label}/stdout.txt), [stderr](validation/${label}/stderr.txt)${row ? `, [row audit](validation/${label}/test-row-audit.json), [actual XML](validation/${label}/test-results/${rowAudit.actualReport})` : ''}.
`;
}).join('\n');
write('validation-commands.md', `# F123: exact validation commands and outcomes

Every managed shell activates its repository-pinned SDK. Builds use at most two workers, no shared compilation or node reuse, serialized with measurement. Existing command-only managed scope excludes native IIS/static-assets prerequisites; no SDK pin, source or feed configuration was changed to evade a prerequisite. No IIS/native, browser, packaging or full-repository coverage is claimed.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| First match, misses, empty/null/duplicate references and source/copy isolation | \`IndexOf_PreservesFirstMatchNullsAndSourceIsolation\`, both Boolean rows, original and candidate |
| Preserve object.Equals rather than differing IEquatable equality, reference and value types | \`IndexOf_UsesLegacyObjectEquality\`, both Boolean rows |
| Stored-left equality order and short-circuiting | \`IndexOf_PreservesStoredLeftEqualityOrderAndShortCircuit\`, both Boolean rows |
| Actual copied-list mutation throws on next MoveNext, but not after a matching early return | \`IndexOf_CopiedStorePreservesMutationDetection\`, both Boolean rows |
| Arbitrary source enumeration, no Count/indexer assumption, disposal on match/completion | \`IndexOf_ArbitrarySourceDisposesOnMatchOrCompletion\`, both Boolean rows |
| Current/equality failures propagate the exact instance and dispose the actual enumerator | \`IndexOf_ArbitrarySourceDisposesOnCurrentOrEqualityFailure\`, both Boolean rows |
| Actual MVC producer and consumer, both invoker modes, IndexOf observed in HTTP response | [Original](characterization-original-characterize-001/verified-characterization.json), [actual default](characterization-default-characterize-001/verified-characterization.json), [candidate](characterization-candidate-characterize-001/verified-characterization.json): 72 requests, 24 public contracts and twelve additional semantic contracts per variant |
| Source/PE-PDB/owner/settings bindings and actual numerical observations | [Full audit](audit-summary.json): 117 accepted passing XML executions, 22 runtime records, 288 settings records and 1,152 observations |
| Fresh exact-eight-input restore/build and both measured owner/dependency variants | [Actual reconstruction](reconstruction-paired-001/verified-reproduction.json); no extra timing |

These are **green/green preservation checks**, not a semantic-bug red/green claim. The managed collection boundary owns the disputed equality, mutation, disposal and index effects. A real HTTP application also executes the actual public IList.IndexOf and exposes -1/0/4 in its response; no typical framework call frequency is inferred.

## Preparation corrections and XML boundary

The first new fixture used Moq with a private generic argument; two rows never reached IndexOf or their assertion. The corrected fixture keeps the helper private and uses public \`IEnumerator<object>\`/\`IReadOnlyList<object>\` interfaces returning the same real equality objects. No access mechanism or shipping behavior changed. All twelve successor rows then passed.

A reused results path in the first successful rerun overwrote the initial failing TRX. **That initial failing XML is not preserved.** Its raw stdout/stderr and exit are preserved, and the misdirected successful XML is not counted as accepted evidence. A subsequent fresh-directory original run supplies forty individually parsed passing rows. The accepted total is original 40 + actual default 28 + candidate Core 40 + candidate Pages 9 = **117 executions, not 117 unique tests**. [Correction receipt](preparation-correction.json) and [initial fixture snapshot](preparation-history/original-test-source-before-moq-visibility-correction.cs) retain this limitation. A command guard now rejects results paths outside their unique attempt directory.

${commands}

## Independent reconstruction and full audit

Exact activated commands and successful outcomes: [Restore](reconstruction-paired-001/Restore/command.json), [Build](reconstruction-paired-001/Build/command.json), [Original](reconstruction-paired-001/Original-Characterize/command.json), [Candidate](reconstruction-paired-001/Candidate-Characterize/command.json).

The authoritative final recomputation has its [exact command and exit](full-live-audit.command.json), [stdout](full-live-audit.stdout.txt) and [stderr](full-live-audit.stderr.txt). Rebuilding changed only the common harness DLL/PDB; measured owner/dependency images and the closed budget remained fixed. Interim audits remain historical; the final audit recomputes all three comparisons.
`);
write('README.md', `# F123: MVC copied-store IndexOf experiment - no gain

**No-gain; no performance PR or merge recommendation.** The declared copied-five-factory IndexOf primary has paired less-time effects **${effects}**; negative means slower. Median paired effect: **${f(-audit.actualMedianPrimaryLessTimePercent)}% more time**. Both sources report **0 B/op** in every primary pair. All **1,152 observations** remain; the three-slot timing budget is permanently closed.

## Connected artifacts

| Artifact | Link | Meaning |
|---|---|---|
| Diagnostic source | [Independent fork branch](${source.sourceBranchUrl}), [exact commit](${sourceCommitUrl}) | \`${source.sourceCommit}\`, parent \`${source.parentBaseline}\`; not recommended for merge |
| Shipping seam | [CopyOnWriteList.cs](${sourceTarget}), [exact seam verification](candidate-seam-verification.json) | Fifteen inserted lines in IndexOf; every original prefix/suffix byte and the complete source fallback preserved |
| Preservation tests | [Exact committed tests](${sourceTests}), [tested physical snapshot](preservation-source/src/Mvc/Mvc.Core/test/Infrastructure/CopyOnWriteListTest.cs) | Six methods, twelve Boolean rows, green on original and candidate |
| Runnable BDN project | [Project](harness/AutoPerf.Benchmarks.csproj), [methods](harness/CollectionBenchmarks.cs), [eight source hashes](harness-source-hashes.json) | Twelve profiles, two methods, identical measured common harness DLL/PDB |
| Real producer and consumer | [HostedProducer.cs](harness/HostedProducer.cs), [baseline seal](baseline-validation.json), [premeasurement seal](premeasurement-validation.json) | Actual routed MVC actions call public IList.IndexOf and expose its result in HTTP, both invoker modes; no property substitution |
| All measurements | [Every result and variability](comparison-results.md), [raw recomputation](measurement-audit.json) | Primary, favorable ordinary-source, first/last-hit, empty and unchanged Contains rows all retained |
| Correctness and commands | [Requirements, commands and exact outcomes](validation-commands.md) | 117 accepted passing XML executions; initial fixture/report-routing limitation explicitly disclosed |
| Independent reconstruction | [Verified result](reconstruction-paired-001/verified-reproduction.json), [exact copied project](reconstruction-paired-001/project/AutoPerf.Benchmarks.csproj) | Actually restored/rebuilt all eight inputs and exercised both owner/dependency variants without timing |
| Decision and budget | [Decision](decision.json), [closed budget](diagnostic-budget.json), [close receipt](permanent-budget-close.json) | No primary timing/allocation qualification; no replay, retuning or primary substitution |
| Complete verification | [Portable auditor](F123-verify.mjs), [full audit](audit-summary.json), [XML parser](F123-audit-trx.ps1) | All numerical, source, owner, settings and accepted XML evidence independently recomputed |
| Copy and omission inventories | [Authoritative copies](authoritative-copies.json), [omitted files](omitted-file-hashes.json), [immutable seal](capsule-file-hashes.json) | Compiled images/build caches are hashed but not shipped |

Tracking and a directly connected final publication receipt are added only after this immutable evidence is remotely verified. The additive \`publication.json\` is excluded from the core seal; it must not rewrite this historical capsule.

## Why this plausible optimization was not selected

The scan identified a foreach through the interface-typed Readable property. Actual MVC controller/page producers cache arrays; public mutation creates a private exact List. Unlike F122's rejected concrete-only enumeration pattern, **the existing public IList.IndexOf consumer is reachable**: this harness executes it through the real ControllerContext property and checks its -1/0/4 HTTP response.

That production fit does not prove a performance opportunity. The private-list candidate preserves object.Equals, the explanatory index counter and the complete original fallback, but the copied-five primary regresses and has no reported allocation saving. BDN rounds amortized managed bytes; 0 B/op is not a proof of no allocation anywhere. No disassembly or specific JIT-cause claim is supplied.

The unmodified ordinary-source path has favorable measurements, and every such result is retained. It does not replace the declared copied-store primary. Unchanged Contains movement and every profile's variability remain visible. These are local optional application-consumer observations, **not normal-request frequency or request-throughput gains**.

## Why List.IndexOf is not an equivalent shortcut

The legacy code calls \`object.Equals(storedElement, item)\`, in order, and stops at the first match. \`List<T>.IndexOf\` can select \`IEquatable<T>\` equality instead. The tests deliberately supply both reference and value types whose object equality works but typed equality throws. They also preserve stored-left receiver/order, version detection after real copied-list mutation, matching early return before another MoveNext, and arbitrary-source enumeration/disposal on completion, match and exact Current/equality failure.

The new tests preserve existing behavior on original and candidate; no semantic bug is claimed. Existing managed page-producer tests pass, but **no compiled Razor Page request or browser validation is claimed**.

## Environment and reproducibility limits

- Baseline \`${source.parentBaseline}\`; actual default \`f78194260f43c48ae2092675f55757f2a42dd63d\`. All eleven selected original/default inputs match in Git text.
- SDK \`12.0.100-alpha.1.26557.102\`, x64 runtime \`12.0.0-alpha.1.26562.105\`, C# 13 and BDN 0.13.0. Host/runtime details remain in the [first raw report](${report(1, 'Original')}) and actual runtime records.
- Three warmups, eight retained results, requested 100 ms, unroll 1, DontRemove; orders Original -> Candidate, Candidate -> Original, Original -> Candidate.
- Shared non-isolated Windows box. Process/thread priorities stay Normal and affinity 65535; no power, affinity, firewall, URL ACL or other machine setting was changed.
- Each measured image has 328 entries; 326, including the common harness DLL/PDB, are identical. Only Core DLL/PDB change. Seven selected source documents match portable PDBs for three loaded owners; this is **not complete compiler provenance**.
- Measured binaries predate the source publication commit. Physical snapshots, image manifests and source/PE-PDB records are historical authority; a later commit alone does not reproduce the measured PE bytes.
- The relocated exact-eight-input project was actually restored/rebuilt; both untimed variants reuse measured owner/dependency bytes. Public compiled images/restore caches are intentionally omitted, so turnkey byte-identical fresh-clone replay is not promised.
- No AOT/trimming, packaging, compiled-page/browser, representative call-frequency, application-throughput or merge-readiness claim. No new public API or framework assembly-boundary mechanism.

## Audit without running benchmarks

\`\`\`powershell
node .\\F123-verify.mjs . --require-seal
\`\`\`

This recomputes historical evidence without more timing. **Do not replay consumed authorizations or reopen the budget.** Exact machine-specific paths and activated commands are disclosed in [validation-commands.md](validation-commands.md). The classified report remains its fixed snapshot and excludes no-gain outcomes.
`);
write('issue-template.md', `## Outcome

**F123 is measured no-gain, not a performance PR.** Three complete source comparisons retain 1,152 observations. The declared copied-five IndexOf primary has paired less-time effects ${effects}; negative means slower. Median: ${f(-audit.actualMedianPrimaryLessTimePercent)}% more time, 0 B/op reported in both sources. Every favorable/adverse/first-hit/last-hit and unchanged Contains outcome remains; the timing budget is permanently closed.

## Connected artifacts

| Artifact | Link |
|---|---|
| Immutable evidence and limits | {{EVIDENCE_URL}} |
| Diagnostic source experiment; not recommended for merge | ${sourceCommitUrl} |
| Twelve focused preservation rows | ${sourceTests} |
| Runnable exact-eight-input BDN project | {{EVIDENCE_BASE}}/harness/AutoPerf.Benchmarks.csproj |
| Every measurement, control and variability table | {{EVIDENCE_BASE}}/comparison-results.md |
| Requirement coverage, exact commands and outcomes | {{EVIDENCE_BASE}}/validation-commands.md |
| Actual independent eight-input rebuild | {{EVIDENCE_BASE}}/reconstruction-paired-001/verified-reproduction.json |
| Full audit: 117 accepted XML executions, 22 runtime / 288 settings records | {{EVIDENCE_BASE}}/audit-summary.json |
| Permanently closed budget | {{EVIDENCE_BASE}}/permanent-budget-close.json |

The actual default and original pass the same faithful boundary. The action itself executes public IList.IndexOf and its result is verified over HTTP. That proves optional consumer reachability, not ordinary framework frequency. Object.Equals, reference/value-type typed-equality differences, first match, order, mutation/version semantics and arbitrary-source disposal remain green on both sources.

An initial Moq-private-type preparation failure and a subsequent report-routing mistake are retained and explicitly disclosed; the initial failing TRX was overwritten, not preserved. The fresh accepted original/candidate XML rows all reach their assertions and pass. No shipping semantic bug is claimed.

No primary retargeting, more timing, performance PR/browser launch, application-throughput, specific JIT-cause, compiled-page/browser or merge-readiness claim. Fixed classified report unchanged.
`);
write('authoritative-copies.json', { candidate: 'F123', files: copies });
write('omitted-file-hashes.json', { candidate: 'F123',
  actualReason: 'Compiled images, build output and restore caches are identified but intentionally not committed.', files: omitted });
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
write('authored-link-audit.json', { candidate: 'F123', actualCheckedExistingLocalLinks: links.length,
  actualDeferredSealSelfLinkOnly: 'capsule-file-hashes.json',
  actualFinalSelfLinkMustBeVerifiedAfterSealCreation: true, links });
const material = inventory(destination).map(name => {
  const filename = path.join(destination, ...name.split('/'));
  return { path: name, bytes: fs.statSync(filename).size, sha256: sha(filename) };
});
write('capsule-file-hashes.json', { candidate: 'F123',
  actualExcludedAdditiveFiles: ['capsule-file-hashes.json', 'publication.json'], files: material });
verifyLinks(false);
const verifyArguments = [path.join(destination, 'F123-verify.mjs'), destination, '--require-seal'];
const verification = spawnSync(process.execPath, verifyArguments, { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stdout.txt'), verification.stdout ?? '', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stderr.txt'), verification.stderr ?? '', { flag: 'wx' });
const preparation = {
  candidate: 'F123', disposition: 'no-gain', actualImmutableFilesIncludingSeal: material.length + 1,
  actualCopiedAuthoritativeFiles: copies.length, actualOmittedCompiledRestoreFiles: omitted.length,
  actualCheckedAuthoredLocalLinks: links.length + 1, actualBrokenAuthoredArtifactLinks: 0,
  actualSealSelfLinkVerifiedAfterCreation: true, actualSealedCapsuleAuditPassed: verification.status === 0,
  actualAuditExecutable: process.execPath, actualAuditArguments: verifyArguments, actualAuditExitCode: verification.status,
  actualCurrentCountersUnchanged: true, actualFixedReportPreserved: true
};
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.command.json'), JSON.stringify(preparation, null, 2) + '\n', { flag: 'wx' });
if (verification.stdout) process.stdout.write(verification.stdout);
assert.equal(verification.status, 0, verification.stderr);
fs.writeFileSync(path.join(run, 'capsule-preparation.json'), JSON.stringify(preparation, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(preparation, null, 2));
