import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F122');
const published = path.join(session, 'autoperf-published-results');
const destination = path.join(published, 'F122');
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex').toUpperCase();
function write(name, value) {
  const filename = path.join(destination, ...name.split('/'));
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
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
assert.equal(fs.existsSync(destination), false, 'Preserve an existing or partial capsule; do not overwrite it.');
assert.equal(execute('git', ['--no-pager', 'rev-parse', 'HEAD']), 'c39ccb10b2aae055e7549c5adae271088111f8c3');
assert.equal(execute('git', ['--no-pager', 'status', '--porcelain']), '');
assert.equal(execute('git', ['--no-pager', 'rev-parse', 'HEAD:REPORT.md']), '73abf142464b1f81676e03a1eebc766c279cb47b');
const audit = read(path.join(run, 'audit-summary.json'));
const source = read(path.join(run, 'source-publication.json'));
const decision = read(path.join(run, 'decision.json'));
assert.equal(audit.actualDisposition, 'rejected');
assert.equal(audit.actualRetainedSamples, 256);
assert.equal(audit.actualRuntimeRecordsChecked, 10);
assert.equal(audit.actualPerBenchmarkSettingsRecordsChecked, 64);
assert.equal(audit.actualParsedIndividualTestRows, 68);
assert.equal(source.actualRemoteRefVerified, true);
assert.equal(source.actualTestsOnlyCharacterizationBranch, true);
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
for (const name of [
  'intake.mjs', 'managed-command.mjs', 'freeze.mjs', 'characterize.mjs', 'audit-test-results.mjs',
  'seal.mjs', 'profile.mjs', 'close-budget.mjs', 'audit.mjs', 'reproduce-untimed.mjs',
  'finalize-evaluation.mjs', 'publish-source.mjs', 'build-capsule.mjs'
]) {
  const filename = 'F122-' + name;
  const input = path.join(session, filename);
  const target = 'executed-drivers/' + filename;
  write(target, fs.readFileSync(input, 'utf8'));
  assert.equal(sha(path.join(destination, ...target.split('/'))), sha(input));
  copies.push({ path: target, bytes: fs.statSync(input).size, sha256: sha(input), authoritativeSource: 'private-session/' + filename });
}
write('F122-verify.mjs', fs.readFileSync(path.join(session, 'F122-verify.mjs'), 'utf8'));
copies.push({ path: 'F122-verify.mjs', bytes: fs.statSync(path.join(session, 'F122-verify.mjs')).size,
  sha256: sha(path.join(session, 'F122-verify.mjs')), authoritativeSource: 'private-session/F122-verify.mjs' });
write('.gitattributes', '* -text\n');
const sourceBase = `https://github.com/jaslawinMs/aspnetcore/blob/${source.sourceCommit}`;
const sourceCommitUrl = `https://github.com/jaslawinMs/aspnetcore/commit/${source.sourceCommit}`;
const sourceTarget = sourceBase + '/src/Mvc/Mvc.Core/src/Infrastructure/CopyOnWriteList.cs';
const sourceTests = sourceBase + '/src/Mvc/Mvc.Core/test/Infrastructure/CopyOnWriteListTest.cs';
const report = 'original-profile-001/Original/reports/results/AutoPerf.CollectionBenchmarks-report-full.json';
const f = number => number === null ? 'not resolved' : number.toFixed(2);
const results = audit.rows.map(item =>
  `| ${item.method} | ${item.profile} | ${f(item.meanNs)} | ${f(item.standardDeviationNs)} | ${item.allocatedBytesPerOperation} | ${f(item.cvPercent)}% | ${f(item.firstHalfMeanNs)} | ${f(item.secondHalfMeanNs)} | ${f(item.fittedEndToEndTrendPercent)}% |`).join('\n');
const primary = audit.rows.find(item => item.method === 'EnumerateGeneric' && item.profile === 'CopiedDefault5');
const ordinary = audit.rows.find(item => item.method === 'EnumerateGeneric' && item.profile === 'UnmodifiedDefault5');
write('original-results.md', `# F122: every original-only observation

**No candidate was selected; this is not a before/after comparison.** One timing authorization completed four methods across all eight declared profiles, retaining eight observations per case: **32 cases / 256 samples**. Two unused authorizations are permanently closed.

The declared generic copied-five-factory loop reports **${f(primary.meanNs)} ns/op and ${primary.allocatedBytesPerOperation} B/op**. The untouched-five-factory loop reports **${f(ordinary.meanNs)} ns/op and ${ordinary.allocatedBytesPerOperation} B/op**. These measurements do not say that the interface path is allocation-free. The rejection concerns whether a new concrete-only pattern can be selected by the established production consumer, not whether interface enumeration has a cost.

The copied and unmodified profiles are different store states, not original/candidate implementations. Their absolute difference is not an optimization result. The retained-enumerator method separately exposes an escape boundary; \`UnchangedIndexOf\` is a same-collection diagnostic, not an alternative primary.

## All cases and variability

SD is the sample standard deviation; fitted trend is the within-run fitted first-to-last change divided by the mean. Every warmup and retained observation remains available; no outlier removal, case substitution or profile retuning occurred. Maximum case CV is **${f(audit.actualMaximumObservedCaseCvPercent)}%**. One original-only run cannot establish a change's repeatable effect.

| Method | Profile | Mean ns/op | SD ns | B/op | CV | First-half ns | Last-half ns | Fitted trend |
|---|---|---:|---:|---:|---:|---:|---:|---:|
${results}

## Raw authority

[Full original JSON](${report}), [exact stdout](original-profile-001/Original/stdout.txt), [authorization](original-profile-001/authorization.json), [execution receipt](original-profile-001/execution-receipt.json), [independent recomputation](measurement-audit.json).

The audit recomputes all 256 actual-minus-median-adaptive-overhead values and the reported statistics. It independently checks GC totals and BDN 0.13.0 midpoint-to-even allocation arithmetic against [the pinned implementation](BenchmarkDotNet-0.13.0-GcStats.cs) and [license](BenchmarkDotNet-0.13.0-LICENSE.md). Reported 0 B/op in an empty/control case is rounded amortized allocation, not a universal no-allocation proof. No disassembly or specific JIT-cause claim.
`);
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const commands = fs.readdirSync(path.join(run, 'validation')).sort().map(label => {
  const command = read(path.join(run, 'validation', label, 'command.json'));
  const result = read(path.join(run, 'validation', label, 'result.json'));
  const row = audit.actualXmlAudits.find(item => item.label === label);
  const rowAudit = row ? read(path.join(run, 'validation', label, 'test-row-audit.json')) : undefined;
  const environment = Object.entries(command.environmentOverrides).map(([name, value]) => `$env:${name} = ${quote(value)}`).join('\n');
  return `### ${label}

\`\`\`powershell
Set-Location -LiteralPath ${quote(command.cwd)}
. .\\activate.ps1
${environment}
$arguments = @(${command.arguments.map(quote).join(', ')})
& ${quote(command.executable)} @arguments
\`\`\`

**Result:** exit ${result.exitCode}; passed${row ? `; all ${row.actualRows} individual XML rows, including ${row.actualFocusedRows} new preservation rows; none failed or skipped` : ''}.
[Raw command](validation/${label}/command.json), [result](validation/${label}/result.json), [stdout](validation/${label}/stdout.txt), [stderr](validation/${label}/stderr.txt)${row ? `, [individual-row audit](validation/${label}/test-row-audit.json), [actual XML](validation/${label}/test-results/${rowAudit.actualReport})` : ''}.
`;
}).join('\n');
write('validation-commands.md', `# F122: requirement coverage, exact commands and outcomes

These are preservation checks on an **unchanged shipping implementation**, not semantic-bug red/green evidence. All 40 original and 28 actual-current-default XML executions were individually parsed: **68 historical passing executions**, not 68 unique tests. The twelve new Boolean rows execute only in the original checkout; they were not copied into the current-default checkout.

| Requirement | Evidence |
|---|---|
| Ordered references, null entries, generic/nongeneric parity and copy isolation | \`GetEnumerator_PreservesItemsAndStoreIsolation\`, copied false/true |
| Cursor, Reset and nongeneric Current invalid states | \`GetEnumerator_PreservesCursorResetAndNonGenericCurrent\`, copied false/true |
| Enumerator captured before first write keeps its old source | \`GetEnumerator_KeepsCapturedStoreWhenCopyIsCreated\`, nongeneric false/true |
| Already-copied list detects subsequent mutation | \`GetEnumerator_CopiedStoreDetectsMutation\`, nongeneric false/true |
| Actual arbitrary source forwarding/identity without Count/indexer | \`GetEnumerator_ForwardsArbitrarySourceWithoutIndexing\`, nongeneric false/true |
| Actual source enumerator disposal on early break/consumer failure | \`Foreach_DisposesSourceOnBreakOrFailure\`, throw false/true |
| Actual MVC producer, both controller invoker modes, public write and request/source isolation | [Original characterization](characterization-original-characterize-001/verified-characterization.json), [actual default](characterization-default-characterize-001/verified-characterization.json): 48 actual HTTP requests, 16 public profile contracts and ten extra enumeration contracts per execution |
| Concrete-pattern selection gate at the real public/compiled boundary | [Original IL/property records](characterization-original-characterize-001/states/0006-bounded-shipping-il-audit.json), [sealed baseline](baseline-validation.json), [full audit](audit-summary.json): fourteen inspected MVC modules per role; only nongeneric self-forwarding reaches concrete GetEnumerator |
| Exact eight-input rebuild and owner/dependency preservation | [Actual reconstruction](reconstruction-original-and-default-001/verified-reproduction.json), original/default untimed execution; zero extra timing |
| Every absolute observation, source/owner binding and process setting | [Full audit](audit-summary.json): 256 samples, ten runtime records, 64 per-benchmark settings records and 68 individually reparsed XML executions |

Every managed shell activates its repository-pinned SDK. Builds and timing were serialized, with at most two MSBuild workers and no shared compilation/node reuse. Existing command-only IIS/native, Node and static-assets exclusions bound the managed graph; they are not coverage of those omitted features. No SDK pin, package manifest or feed configuration changed.

${commands}

## Independent reconstruction and audit

Actual exit-zero commands: [Restore](reconstruction-original-and-default-001/Restore/command.json), [Build](reconstruction-original-and-default-001/Build/command.json), [Original](reconstruction-original-and-default-001/Original-Characterize/command.json), [Default](reconstruction-original-and-default-001/Default-Characterize/command.json). The exact copied eight-input project rebuilt a fresh common harness; consumers retained their corresponding frozen source-built owners/dependencies. Only the new harness DLL/PDB differed. Only relocated absolute frozen-image paths were normalized when comparing untimed observations.

[Full independent audit command/result](audit-executions/full-live-001/command.json), [stdout](audit-executions/full-live-001/stdout.txt), [stderr](audit-executions/full-live-001/stderr.txt).
`);
write('README.md', `# F122: concrete enumerator pattern - rejected for production fit

**No shipping change, no performance PR, no candidate comparison.** The suggested concrete struct-enumerator pattern has no established non-forwarding production consumer in the inspected MVC cohort. One original-only profile retains **32 cases / 256 observations**, including real interface allocations; the unused two timing authorizations are permanently closed.

## Connected artifacts

| Artifact | Link | Meaning |
|---|---|---|
| Tests-only source | [Independent fork branch](${source.sourceBranchUrl}), [exact commit](${sourceCommitUrl}) | \`${source.sourceCommit}\`, parent \`${source.parentBaseline}\`; only the new test file differs |
| Unchanged shipping owner | [CopyOnWriteList.cs](${sourceTarget}) | Original interface-returning GetEnumerator preserved; no candidate implementation |
| Preservation tests | [Exact test source](${sourceTests}), [tested physical snapshot](preservation-source/src/Mvc/Mvc.Core/test/Infrastructure/CopyOnWriteListTest.cs) | Six methods, twelve passing Boolean rows |
| Predeclared selection boundary | [Acceptance plan](acceptance-plan.json), [sealed passing baseline](baseline-validation.json) | Sealed before new tests, shipping edits or timing; do not invent a concrete caller |
| Actual compiled/public caller evidence | [Original IL audit](characterization-original-characterize-001/states/0006-bounded-shipping-il-audit.json), [current-default characterization](characterization-default-characterize-001/verified-characterization.json) | Two IList properties; fourteen-module cohorts, four constructor operands, only the nongeneric self-forwarder calls concrete GetEnumerator |
| Runnable BDN project | [Project](harness/AutoPerf.Benchmarks.csproj), [four timed methods](harness/CollectionBenchmarks.cs), [eight source hashes](harness-source-hashes.json) | Actual HTTP-produced collections; generic/nongeneric consumption, retained enumeration and unchanged IndexOf |
| All absolute observations | [Every case and variability](original-results.md), [raw recomputation](measurement-audit.json) | No before/after ratio, favorable-profile substitution or allocation-free claim |
| Correctness and commands | [Requirements, exact commands and results](validation-commands.md) | 68 historic passing XML executions, no hidden skips |
| Independent reconstruction | [Verified result](reconstruction-original-and-default-001/verified-reproduction.json), [exact copied project](reconstruction-original-and-default-001/project/AutoPerf.Benchmarks.csproj) | Actually restored/rebuilt all eight inputs and characterized original/default roles; no timing |
| Decision and closed budget | [Decision](decision.json), [budget](diagnostic-budget.json), [close receipt](permanent-budget-close.json) | Production-fit rejection, not a numerical no-gain verdict |
| Complete verification | [Portable verifier](F122-verify.mjs), [full audit](audit-summary.json), [individual XML parser](F122-audit-trx.ps1) | All 256 samples, ten runtime and 64 settings records, source bindings and individual XML rows checked |
| Exact-copy/omission inventories | [Authoritative copies](authoritative-copies.json), [omitted files](omitted-file-hashes.json), [immutable seal](capsule-file-hashes.json) | Compiled images/build caches are hashed but not shipped |

The tracking issue and final campaign/index receipt are created only after this immutable evidence is remotely verified. The later \`publication.json\` is additive and excluded from the core seal; it must not rewrite this historical capsule.

## Why not add the apparently faster struct enumerator?

The scan's syntactic observation is correct: the internal concrete type's public method returns \`IEnumerator<T>\`. But \`ControllerContext.ValueProviderFactories\` and \`PageContext.ValueProviderFactories\` expose **\`IList<IValueProviderFactory>\`**. A foreach through those properties uses the interface enumeration contract; it cannot select a new concrete-only pattern member. Actual interface maps also target the original public generic member and its explicit nongeneric forwarder.

The compiled audit decoded **9,771 IL bodies in fourteen frozen MVC modules per source role**, including 37,921 original / 37,918 default method operands. Four constructor operands reach the known controller/page producers. The sole concrete GetEnumerator operand is its own nongeneric forwarding member; no other concrete-pattern consumer was established in that cohort. Controller HTTP execution separately proves the real array-backed producer, public mutation and per-request/source isolation in both invoker modes. Compiled page constructor operands are inspected, but **a compiled Razor Page request was not executed**.

This is deliberately **bounded evidence**, not a whole-repository or arbitrary dynamic/external caller absence proof. The enclosing type is internal: this is **not a public-API-compatibility rejection**. A broader interface-path redesign might be worthwhile but would be a different optimization requiring its own concrete proposal and evidence.

Nor does rejection mean that enumeration is free. The actual original copied-five-factory generic loop reports **${f(primary.meanNs)} ns/op, ${primary.allocatedBytesPerOperation} B/op**; the untouched-five-factory loop reports **${f(ordinary.meanNs)} ns/op, ${ordinary.allocatedBytesPerOperation} B/op**. All generic/nongeneric, retained-enumerator and unchanged-control results remain in [original-results.md](original-results.md). No source-change speedup, typical request frequency, application gain or precise JIT explanation is inferred.

## Behavioral and reproducibility boundaries

The new tests preserve reference/null order and source isolation, cursor/Reset and nongeneric Current behavior, captured-before-copy versus already-copied mutation semantics, actual arbitrary-source identity/forwarding and disposal on loop break/failure. The actual nongeneric foreach is exercised directly; it is not replaced by a LINQ cast that can shortcut back to the generic interface.

Baseline \`${source.parentBaseline}\`; actual default \`f78194260f43c48ae2092675f55757f2a42dd63d\`. All eleven selected original/default inputs match in Git text. Seven selected portable-PDB documents match three actually loaded source-built owners. This is **not complete compiler provenance** or a full caller census.

SDK \`12.0.100-alpha.1.26557.102\`, x64 runtime \`12.0.0-alpha.1.26562.105\`, C# 13 and BDN 0.13.0. Three warmups, eight retained results, requested 100 ms, unroll one, no outlier removal. This is a shared, non-isolated Windows box: process/thread priority Normal and affinity 65535; no affinity, power, firewall, URL ACL or other machine setting changed. Exact hardware/runtime data are in the [raw report](${report}).

The exact relocated common project was really restored/rebuilt and both untimed roles matched the earlier contract/metadata boundary, retaining each role's owner/dependency bytes. Public evidence omits compiled images/restore caches and does not promise turnkey byte-identical fresh-clone replay. The source commit follows the measured builds; physical snapshots, loaded image hashes and PE/PDB associations are historical authority, not a claim that a later commit ID alone reproduces measured binaries.

No compiled-page/browser, AOT/trimming, packaging, full-repository build or merge-readiness claim. No new public shipping API or framework assembly-boundary mechanism.

## Verify without running benchmarks

\`\`\`powershell
node .\\F122-verify.mjs . --require-seal
\`\`\`

This recomputes historical observations only. **Do not replay consumed authorizations or reopen the closed budget.** Exact activated build/test commands and machine-specific source paths are disclosed in [validation-commands.md](validation-commands.md). The fixed classified report excludes rejected outcomes and remains unchanged.
`);
write('issue-template.md', `## Outcome

**F122 is rejected for production fit, not a numerical no-gain result.** No shipping source candidate or performance comparison was selected. A new concrete-only struct-enumerator pattern cannot be selected through the inspected ControllerContext/PageContext IList properties; the fourteen-module MVC cohorts establish only nongeneric self-forwarding to concrete GetEnumerator. This is bounded evidence, not a whole-repository/dynamic absence proof.

One original-only profile completed all 32 cases / 256 retained observations. The real original copied-five-factory generic loop reports ${f(primary.meanNs)} ns/op and ${primary.allocatedBytesPerOperation} B/op; untouched-five reports ${f(ordinary.meanNs)} ns/op and ${ordinary.allocatedBytesPerOperation} B/op. These are not change improvements or an allocation-free claim. A broader interface-path redesign is not ruled out.

## Connected artifacts

| Artifact | Link |
|---|---|
| Immutable evidence, selection boundary and limitations | {{EVIDENCE_URL}} |
| Tests-only independent source commit; shipping owner unchanged | ${sourceCommitUrl} |
| Twelve focused preservation rows | ${sourceTests} |
| Predeclared production-fit acceptance plan | {{EVIDENCE_BASE}}/acceptance-plan.json |
| Original compiled caller/property evidence | {{EVIDENCE_BASE}}/characterization-original-characterize-001/states/0006-bounded-shipping-il-audit.json |
| Runnable eight-input BDN project | {{EVIDENCE_BASE}}/harness/AutoPerf.Benchmarks.csproj |
| Every absolute result and variability observation | {{EVIDENCE_BASE}}/original-results.md |
| Exact validation commands/results and requirement coverage | {{EVIDENCE_BASE}}/validation-commands.md |
| Actual independent eight-input rebuild | {{EVIDENCE_BASE}}/reconstruction-original-and-default-001/verified-reproduction.json |
| Full audit: 68 XML executions, ten runtime / 64 settings records | {{EVIDENCE_BASE}}/audit-summary.json |
| Permanently closed timing budget | {{EVIDENCE_BASE}}/permanent-budget-close.json |

No performance pull request or browser launch. Preservation tests run against unchanged behavior, not a semantic bug fix. No public-API-compatibility rejection (the owner is internal), invented concrete production caller, normal-request/application gain, specific JIT cause or compiled-page/browser execution claim. Fixed classified report unchanged.
`);
write('authoritative-copies.json', { candidate: 'F122', files: copies });
write('omitted-file-hashes.json', { candidate: 'F122',
  actualReason: 'Compiled images, build output and restore caches are identified but intentionally not committed.', files: omitted });
const authored = ['README.md', 'original-results.md', 'validation-commands.md', 'issue-template.md'];
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
write('authored-link-audit.json', { candidate: 'F122', actualCheckedExistingLocalLinks: links.length,
  actualDeferredSealSelfLinkOnly: 'capsule-file-hashes.json',
  actualFinalSelfLinkMustBeVerifiedAfterSealCreation: true, links });
const material = inventory(destination).map(name => {
  const filename = path.join(destination, ...name.split('/'));
  return { path: name, bytes: fs.statSync(filename).size, sha256: sha(filename) };
});
write('capsule-file-hashes.json', { candidate: 'F122', actualExcludedAdditiveFiles: ['capsule-file-hashes.json', 'publication.json'], files: material });
verifyLinks(false);
const verifyArguments = [path.join(destination, 'F122-verify.mjs'), destination, '--require-seal'];
const verification = spawnSync(process.execPath, verifyArguments, { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stdout.txt'), verification.stdout ?? '', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.stderr.txt'), verification.stderr ?? '', { flag: 'wx' });
const preparation = {
  candidate: 'F122', disposition: 'rejected', actualImmutableFilesIncludingSeal: material.length + 1,
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
