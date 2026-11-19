import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F124');
const published = path.join(session, 'autoperf-published-results');
const destination = path.join(published, 'F124');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
function write(name, value) {
  const file = path.join(destination, ...name.split('/'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n',
    { flag: 'wx' });
}
function inventory(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    assert.equal(item.isSymbolicLink(), false);
    const name = prefix ? prefix + '/' + item.name : item.name;
    return item.isDirectory() ? inventory(path.join(directory, item.name), name) : [name];
  }).sort();
}
function git(args) {
  const result = spawnSync('git', ['--no-pager', ...args], { cwd: published, encoding: 'utf8', windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
assert.equal(fs.existsSync(destination), false, 'Preserve a known partial capsule rather than overwriting it.');
assert.equal(git(['rev-parse', 'HEAD']), '8133d74ef4b7d90bce8dacfe4279f30c2de65ba2');
assert.equal(git(['status', '--porcelain']), '');
assert.equal(git(['rev-parse', 'HEAD:REPORT.md']), '73abf142464b1f81676e03a1eebc766c279cb47b');
const audit = read(path.join(run, 'audit-summary.json'));
const source = read(path.join(run, 'source-publication.json'));
const decision = read(path.join(run, 'decision.json'));
assert.equal(audit.actualPrimaryQualificationMet, true);
assert.equal(audit.actualRetainedSamples, 576);
assert.equal(audit.actualRuntimeRecordsChecked, 22);
assert.equal(audit.actualPartialPreparationRuntimeRecordsChecked, 1);
assert.equal(audit.actualPerBenchmarkSettingsRecordsChecked, 216);
assert.equal(audit.actualParsedIndividualTestRows, 63);
assert.equal(source.actualRemoteRefVerified, true);
assert.equal(decision.actualDraftProposalWarrantedWithinExplicitLimitations, true);
assert.equal(read(path.join(run, 'full-live-audit-002.command.json')).actualExitCode, 0);
assert.equal(sha(path.join(run, 'F124-verify.mjs')), sha(path.join(session, 'F124-verify.mjs')));
assert.equal(sha(path.join(run, 'diagnostic-budget.json')), read(path.join(run, 'permanent-budget-close.json')).closedBudgetSha256);
fs.mkdirSync(destination);
const copies = [];
const omitted = [];
for (const name of inventory(run)) {
  const file = path.join(run, ...name.split('/'));
  const entry = { path: name, bytes: fs.statSync(file).size, sha256: sha(file) };
  if (name.split('/').some(part => part === 'bin' || part === 'obj' || part.startsWith('consumer-'))
    || /\.(dll|pdb|exe|so|a|dylib|zip|nupkg|cache|bin|db)$/i.test(name)) {
    omitted.push(entry);
    continue;
  }
  const target = path.join(destination, ...name.split('/'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(file, target, fs.constants.COPYFILE_EXCL);
  assert.equal(sha(target), entry.sha256);
  copies.push({ ...entry, authoritativeSource: 'private-case/' + name });
}
for (const suffix of [
  'discover.mjs', 'seal-plan.mjs', 'managed-command.mjs', 'audit-test-results.mjs',
  'freeze.mjs', 'run-characterization.mjs', 'prepare-default.mjs', 'seal-validation.mjs',
  'prepare-candidate.mjs', 'compare.mjs', 'close-budget.mjs', 'verify.mjs',
  'reproduce-untimed.mjs', 'record-final-audit.mjs', 'finish-evaluation.mjs', 'publish-source.mjs', 'build-capsule.mjs'
]) {
  const name = 'F124-' + suffix;
  const input = path.join(session, name);
  const target = 'executed-drivers/' + name;
  write(target, fs.readFileSync(input));
  assert.equal(sha(path.join(destination, ...target.split('/'))), sha(input));
  copies.push({ path: target, bytes: fs.statSync(input).size, sha256: sha(input), authoritativeSource: 'private-session/' + name });
}
write('.gitattributes', '* -text\n');
const owner = 'src/Framework/AspNetCoreAnalyzers/src/Analyzers/WebApplicationBuilder/PublicPartialProgramClassAnalyzer.cs';
const test = 'src/Framework/AspNetCoreAnalyzers/test/WebApplicationBuilder/PublicPartialProgramClassTest.cs';
const sourceBase = `https://github.com/jaslawinMs/aspnetcore/blob/${source.sourceCommit}`;
const f = number => number.toFixed(2);
const profile = (method, name) => audit.profileSummaries.find(item => item.method === method && item.profile === name);
const primary = audit.primary.map(item =>
  `| ${item.attempt} | ${item.attempt === 2 ? 'Candidate -> Original' : 'Original -> Candidate'} | ${f(item.original.meanNs)} | ${f(item.candidate.meanNs)} | ${f(item.lessTimePercent)}% | ${item.original.allocatedBytesPerOperation} -> ${item.candidate.allocatedBytesPerOperation} |`).join('\n');
const perProfile = audit.profileSummaries.map(item =>
  `| ${item.method} | ${item.profile} | ${f(item.medianLessTimePercent)}% | ${item.eachLessTimePercent.map(value => f(value) + '%').join(' / ')} | ${item.originalAllocatedBytes.join('/')} -> ${item.candidateAllocatedBytes.join('/')} |`).join('\n');
const variability = audit.rows.map(item =>
  `| ${item.attempt} | ${item.variant} | ${item.method} | ${item.profile} | ${f(item.meanNs)} | ${f(item.medianNs)} | ${f(item.standardDeviationNs)} | ${f(item.cvPercent)}% | ${f(item.firstHalfMeanNs)} | ${f(item.secondHalfMeanNs)} | ${f(item.fittedEndToEndTrendPercent)}% |`).join('\n');
const raw = [1, 2, 3].map(attempt => {
  const folder = 'comparison-' + String(attempt).padStart(3, '0');
  return `- Pair ${attempt}: [Original full JSON](${folder}/Original/reports/results/AutoPerf.AnalyzerBenchmarks-report-full.json), [Candidate full JSON](${folder}/Candidate/reports/results/AutoPerf.AnalyzerBenchmarks-report-full.json), [authorization](${folder}/authorization.json), [receipt](${folder}/execution-receipt.json).`;
}).join('\n');
write('comparison-results.md', `# F124: every measured result

The predeclared primary is the actual compiled private \`Predicate/MinimalProgram\` on a real parser-produced 38-descendant source fixture. Negative **less-time** means slower. This is not a full analyzer, build or IDE speedup.

| Pair | Order | Original ns/op | Candidate ns/op | Less time | B/op |
|---|---|---:|---:|---:|---|
${primary}

Median paired primary effect: **${f(audit.actualMedianPrimaryLessTimePercent)}% less time**, with **112 -> 168 reported B/op (+56)** in every pair. This is a median of paired percentage effects, not a ratio of independent medians. The same-profile unchanged GetLocation effects are ${profile('UnchangedGetLocation', 'MinimalProgram').eachLessTimePercent.map(value => f(value) + '%').join(' / ')}; each primary benefit exceeds their absolute movement.

## Important adverse and uncertain observations

**No demonstrated full-driver improvement:** \`AnalyzeCompilation/MinimalProgram\` has median **1.79% more time**, with effects -1.79% / -8.84% / +2.95% less time. It uses a fresh real CompilationWithAnalyzers driver on every invocation over a prepared valid compilation, not a cached completed diagnostic result.

The one-descendant predicate is **13.83% slower** at the median and also adds 56 reported B/op. The unchanged EarlyGuard is highly unstable: **-522.24% / -8.94% / +83.34% less time**; its same-profile unchanged location control moves -83.27% / +2.82% / +78.48%. The ordinary predicate's median slowdown is **8.94%**, narrowly below the predeclared 10% rejection threshold. The two adverse pairs are retained; **no neutrality or causal explanation is claimed**.

LargeProgram adds 128 actual MapGet registrations and is only a scaling probe. Its favorable predicate and driver observations do not replace the ordinary primary or prove workload frequency.

## Every profile, secondary and control

| Method | Profile | Median less time | Each pair less time | Original -> candidate B/op |
|---|---|---:|---|---|
${perProfile}

## Every case's variability

All eight results are retained. SD is sample standard deviation; fitted trend is fitted first-to-last change divided by the mean. The largest observed case CV is ${f(Math.max(...audit.rows.map(item => item.cvPercent)))}%. No outlier removal, retuning, new primary or specific JIT-cause claim.

| Pair | Source | Method | Profile | Mean ns | Median ns | SD ns | CV | First-half ns | Last-half ns | Fitted trend |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|
${variability}

## Raw authority

${raw}

Every source directory preserves stdout, warmups, raw overhead/workload/result/GC observations, all runtime/source/owner/settings records and native exports. [Independent recomputation](measurement-audit.json) checks every one of **576 retained samples**, including actual-minus-median-overhead arithmetic and [pinned BDN midpoint-to-even allocation accounting](BenchmarkDotNet-0.13.0-GcStats.cs) with its [license](BenchmarkDotNet-0.13.0-LICENSE.md).
`);
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const failureMeaning = {
  'original-analyzer-build-001': 'failed before the managed test boundary: missing ANCM native asset; existing command-scoped UseIisNativeAssets=false used for the successful successor',
  'original-preservation-tests-001': '22 passed, 1 failed compiler prerequisite CS0267: invalid newly authored partial public modifier order; actual failing XML and source retained, not an analyzer bug',
  'original-characterization-001': 'failed CS0012 before the first profile contract: missing real Hosting.Abstractions compiler metadata; entire 217-file image and five pre-failure states retained',
  'default-analyzer-build-001': 'failed NETSDK1004: absent actual-default project.assets.json; successful scoped restore retained',
  'default-analyzer-build-002': 'failed on missing generated Blazor JavaScript, unrelated to the managed analyzer boundary',
  'default-analyzer-build-003': 'failed on missing static-web-asset manifest; inspected SDK enablement and used existing command-scoped StaticWebAssetsEnabled=false',
  'candidate-format-whitespace-001': 'formatter rejected incompatible --folder and --no-restore options before source analysis; corrected folder-only verification passed in attempt 002'
};
const commands = fs.readdirSync(path.join(run, 'validation')).sort().map(label => {
  const command = read(path.join(run, 'validation', label, 'command.json'));
  const result = read(path.join(run, 'validation', label, 'result.json'));
  const rows = audit.actualXmlAudits.find(item => item.label === label);
  const outcome = result.exitCode === 0
    ? rows ? `passed all ${rows.actualRows} individual XML rows, including ${rows.actualFocusedRows} new threshold rows; none failed/skipped` : 'passed within the explicitly stated boundary'
    : failureMeaning[label];
  assert.ok(outcome, 'Explain every failed actual command: ' + label);
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
[Command](validation/${label}/command.json), [result](validation/${label}/result.json), [stdout](validation/${label}/stdout.txt), [stderr](validation/${label}/stderr.txt)${rows ? `, [individual-row audit](validation/${label}/individual-results.audit.json), [actual XML](validation/${label}/test-results/results.trx)` : ''}.
`;
}).join('\n');
write('validation-commands.md', `# F124: exact validation commands, failures and outcomes

Every fresh managed shell activates its own repository-pinned SDK. Builds are serialized with timing, use at most two workers, no shared compilation or node reuse, and do not alter machine settings. Actual default required the existing command-scoped UseIisNativeAssets=false, BuildNodeJS=false and StaticWebAssetsEnabled=false. These managed analyzer tests **do not validate IIS/ANCM, Blazor JavaScript, static-asset production or packaging, hosted applications or browsers**.

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Exactly one descendant stays non-diagnostic, including semicolon, escaped identifier and trivia; another real compiler tree supplies an entry point | \`DoesNotFix_ProgramDeclarationInSeparateFile\`: all four exact data rows pass on original and candidate |
| Exactly two descendants report at Program and the actual code fix removes only that class, preserving the sibling and trivia | \`RemovesDeclarationIfItIsFound_WithOneOtherNode\`: both exact data rows pass on original and candidate |
| Preserve existing guards, diagnostics and code fixes | All 17 existing \`PublicPartialProgramClassTest\` rows pass on original, actual default and candidate |
| Real parser/compiler/registered analyzer producer, exact diagnostics and private predicate | [Original](original-characterization-002/verified-characterization.json), [actual default](default-characterization-001/verified-characterization.json), [candidate](candidate-characterization-001/verified-characterization.json): 34 fresh drivers each, four profiles, six additional contracts, four actual benchmark-method contracts |
| Exactly-two, structured trivia, attribute, member, namespace and generated-code behavior | Six additional real-driver contracts per accepted source; generated source deliberately has true private predicate but zero diagnostics through the actual generated-code suppression policy |
| Common harness, nine selected inputs, matching loaded owner/PDB and exact one-expression change | [Premeasurement seal](premeasurement-validation.json), [seam](candidate-seam-verification.json), [complete audit](audit-summary.json): 235 of 237 measured image entries identical |
| Actual numerical and execution evidence | 576 independently recomputed samples, 216 timing settings records, 22 successful-boundary runtime records plus one separately audited failed-preparation runtime-before record |
| Exact-eight-input fresh common-project rebuild, both measured owner/dependency variants, no further timing | [Reconstruction receipt](reconstruction-paired-001/verified-reproduction.json) and its four exact activated successful commands |

These are **green/green preservation checks**, not a semantic-bug red/green claim. The accepted XML total is original 23 + actual default 17 + candidate 23 = **63 historical executions, not 63 unique tests**. Each new declaration datum was individually checked in the actual XML, not inferred from a Theory summary.

## Retained preparation and audit corrections

[Original/default corrections](preparation-correction.json) retain the ANCM prerequisite, invalid new C# fixture, missing metadata, missing current-default restore assets and static-asset prerequisites. The initial malformed \`DoesNotFix_ProgramDeclarationInSeparateFile\` row never reached its analyzer assertion because compiler diagnostic CS0267 blocked it. **Its failing XML is preserved.** The corrected escaped-identifier datum passes on original and candidate. The first MinimalProgram characterization stopped at CS0012 before its contract; the corrected real metadata closure is generation 002, with primary and profiles unchanged.

[Candidate formatter correction](candidate-preparation-correction.json) retains its actual rejected command. [Canonical string-name parsing correction](audit-history/string-parameter-fullname-001/correction.json) and [manifest-order correction](audit-history/reconstruction-manifest-order-003/correction.json) retain the failed auditor versions and output without changing measurements. The latter compares identical relative-path sets independently of locale versus ordinal manifest order, then still verifies every hash and exact two-file rebuilt-harness difference.

${commands}

## Reconstruction and authoritative complete audit

Each exited 0: [Restore](reconstruction-paired-001/Restore/command.json), [Build](reconstruction-paired-001/Build/command.json), [Original characterization](reconstruction-paired-001/Original-Characterize/command.json), [Candidate characterization](reconstruction-paired-001/Candidate-Characterize/command.json).

The accepted full audit has its [exact command and exit 0](full-live-audit-002.command.json), [stdout](full-live-audit-002.stdout.txt) and [stderr](full-live-audit-002.stderr.txt). The initial full auditor's ordering assertion failed and is retained; the accepted audit independently checks the same unchanged images and raw observations. The budget remains permanently closed.
`);
write('README.md', `# F124: bounded public Program analyzer traversal

**Qualified private-predicate trade-off, not an analyzer/build/IDE speedup or merge-ready recommendation.** The predeclared 38-node predicate primary has **83.73% median less time**, but **112 -> 168 reported B/op (+56)**. The actual fresh-driver MinimalProgram secondary shows **no demonstrated improvement (median 1.79% more time)**; a lone-declaration predicate is **13.83% slower**. Unchanged EarlyGuard measurements are highly unstable and narrowly avoid the predeclared rejection threshold. All **576 observations** and every adverse/control outcome remain; the three-slot budget is permanently closed.

## Connected artifacts

| Artifact | Link | Meaning |
|---|---|---|
| Independent source | [Fork branch](${source.sourceBranchUrl}), [exact commit](https://github.com/jaslawinMs/aspnetcore/commit/${source.sourceCommit}) | Two files, parent baseline \`${source.parentBaseline}\`; no stacked change |
| Shipping seam | [PublicPartialProgramClassAnalyzer.cs](${sourceBase}/${owner}), [byte-exact seam](candidate-seam-verification.json) | Only Count() > 1 becomes Skip(1).Any(); every other source byte preserved |
| Preservation tests | [Exact committed class](${sourceBase}/${test}), [tested physical snapshot](source-files-candidate-002/${test}) | Two theory methods/six rows, all pass on original and candidate |
| Runnable benchmark | [Project](harness/AutoPerf.Benchmarks.csproj), [methods](harness/AnalyzerBenchmarks.cs), [eight source hashes](harness-source-hashes-002.json) | Four exact profiles/three methods; identical measured common harness DLL/PDB |
| Actual owning producer | [Real parser/compiler/driver](harness/AnalyzerScenario.cs), [characterization](harness/Characterization.cs), [premeasurement seal](premeasurement-validation.json) | Fresh CompilationWithAnalyzers; exact ASP0027 ID/severity/message/class spans and real generated-code policy |
| Every measurement | [All results and variability](comparison-results.md), [raw recomputation](measurement-audit.json) | Ordinary primary, scaling, one-node regression, full-driver secondaries and unchanged controls |
| Tests and exact commands | [Requirements and all outcomes](validation-commands.md) | 63 accepted XML executions; every failed prerequisite and successful successor disclosed |
| Independent reconstruction | [Verified receipt](reconstruction-paired-001/verified-reproduction.json), [exact copied project](reconstruction-paired-001/project/AutoPerf.Benchmarks.csproj) | Actually restored/rebuilt all eight inputs and exercised both measured owner/dependency variants without timing |
| Decision and timing closure | [Decision](decision.json), [closed budget](diagnostic-budget.json), [close receipt](permanent-budget-close.json) | Primary-only time qualification; allocation gate fails; no replay/retuning |
| Complete verification | [Portable auditor](F124-verify.mjs), [full audit](audit-summary.json), [XML parser](F124-audit-trx.ps1) | Raw statistics, allocations, images, PDB/source associations, actual settings and every accepted test row |
| Copy and omission inventories | [Authoritative copies](authoritative-copies.json), [omitted files](omitted-file-hashes.json), [immutable seal](capsule-file-hashes.json) | Full compiled/restore images are individually hashed but not shipped |
| Later issue, draft PR and visible-window evidence | [Additive live publication receipt](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F124/publication.json) | Added only after this immutable capsule is remotely verified; no sealed file is rewritten |

## Why the condition is equivalent

This syntax-only predicate is reached by the real registered class-declaration callback, but traversal occurs only after the empty public partial Program guards pass. Count() > 1 asks whether there is a second descendant. Skip(1).Any() discards the first and returns as soon as the second exists, rather than visiting the complete immutable Roslyn tree. **Any() alone would be incorrect:** a file containing only the empty Program class has exactly one descendant.

The focused tests deliberately put the real top-level entry point in a second compiler tree, so the one-node file remains valid C# without changing its per-file threshold. An empty sibling class plus Program gives exactly two nodes and the existing diagnostic/code fix. Tokens and default-excluded structured trivia do not turn a one-node file into two. Escaped @Program preserves ValueText. Generated files still follow the actual analyzer's generated-code suppression, even when the private predicate itself returns true.

## Qualification is deliberately narrow

The three primary effects are **83.73% / 83.58% / 85.71% less time** and exceed absolute same-profile unchanged location movement in every pair. The allocation-only gate fails. Full-driver primary effects are **-1.79% / -8.84% / +2.95%**; there is no demonstrated analyzer-wide improvement.

Unchanged EarlyGuard has **-522.24% / -8.94% / +83.34%** paired less-time effects, versus its unchanged location control's **-83.27% / +2.82% / +78.48%**. Its median slowdown **8.94%** is narrowly below the sealed **10%** rejection threshold; both adverse pairs remain. Do not interpret that as neutral or repeatable ordinary-path performance. No disassembly or specific JIT/environmental cause is assigned.

The 128-registration LargeProgram result is an explicit scaling probe, not ordinary workload frequency. More iterator allocation and the one-node regression are real trade-offs. This proposal is **not merge-ready**.

## Environment and reconstruction limits

- Baseline \`${source.parentBaseline}\`; actual default \`744c772d93b79d4d52ff11c05818c4e8de55db6b\`. All nine selected inputs matched in Git text before new test authorship.
- SDK 12.0.100-alpha.1.26557.102; x64 runtime 12.0.0-alpha.1.26562.105; C# 13; BDN 0.13.0; Roslyn 5.11.0-1.26420.103. Three warmups/eight retained, requested 100 ms/unroll 1/DontRemove; orders Original -> Candidate, Candidate -> Original, Original -> Candidate.
- Shared non-isolated Windows box. Process/thread Normal, affinity 65535. No power, affinity, priority, firewall, URL ACL or other machine changes.
- Each accepted measured image has 237 entries; **235**, including the common harness DLL/PDB and compiler reference metadata, are identical between measured Original/Candidate. Only actual analyzer DLL/PDB change. Two selected source documents match the loaded owner PDB; **not complete compiler provenance**.
- Actual default tests ran on its own genuine source-built graph, with existing command-scoped managed-only exclusions. Characterization uses that default owner with the same common harness/reference metadata. It is not complete-default binary isolation.
- Measured binaries predate the source commit. Physical snapshots and PE/PDB associations are historical authority; a later commit or SourceLink URL alone does not reproduce those measured bytes.
- The relocated project was actually rebuilt from its exact eight inputs and exercised both measured owner/dependency images without extra timing. Public compiled/restore images are omitted; turnkey byte-identical fresh-clone replay is not promised. The project accepts AspNetCoreRoot for an already built source tree.
- No request/application throughput, cold parse/build, full IDE, AOT/trimming, packaging, native/browser or merge-readiness claim. No new public API or framework assembly-boundary access mechanism.

## Audit without running benchmarks

\`\`\`powershell
node .\\F124-verify.mjs . --require-seal
\`\`\`

This audits the historical capsule without more timing. **Do not replay consumed authorizations or reopen the budget.** See the exact activated commands and corrected prerequisites above. The classified REPORT.md remains its fixed 118-finalized snapshot.
`);
write('authoritative-copies.json', { candidate: 'F124', actualCopiedAuthoritativeFiles: copies.length, files: copies });
write('omitted-file-hashes.json', { candidate: 'F124', actualOmittedCompiledRestoreFiles: omitted.length,
  actualAllOmissionsIndividuallyInventoried: true, files: omitted });
const authored = ['README.md', 'comparison-results.md', 'validation-commands.md'];
const links = [];
function verifyLinks(deferSeal) {
  for (const name of authored) {
    const text = fs.readFileSync(path.join(destination, name), 'utf8');
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^(https?:|#)/.test(target)) continue;
      const relative = decodeURIComponent(target.split('#')[0]);
      if (deferSeal && relative === 'capsule-file-hashes.json') continue;
      const file = path.resolve(destination, relative);
      assert.ok(file.startsWith(destination + path.sep));
      assert.equal(fs.existsSync(file), true, `${name}: missing artifact ${target}`);
      if (deferSeal) links.push({ source: name, target });
    }
  }
}
verifyLinks(true);
write('authored-link-audit.json', { candidate: 'F124', actualCheckedExistingLocalLinks: links.length,
  actualDeferredSealSelfLinkOnly: 'capsule-file-hashes.json',
  actualFinalSelfLinkMustBeVerifiedAfterSealCreation: true, links });
const material = inventory(destination).map(name => {
  const file = path.join(destination, ...name.split('/'));
  return { path: name, bytes: fs.statSync(file).size, sha256: sha(file) };
});
write('capsule-file-hashes.json', { candidate: 'F124',
  actualExcludedAdditiveFiles: ['capsule-file-hashes.json', 'publication.json'], files: material });
verifyLinks(false);
const args = [path.join(destination, 'F124-verify.mjs'), destination, '--require-seal'];
const result = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
for (const [name, content] of [['stdout', result.stdout], ['stderr', result.stderr]]) {
  fs.writeFileSync(path.join(run, 'sealed-capsule-audit.' + name + '.txt'), content ?? '', { flag: 'wx' });
}
const receipt = {
  candidate: 'F124', disposition: 'qualified', subtype: decision.subtype,
  actualImmutableFilesIncludingSeal: material.length + 1,
  actualCopiedAuthoritativeFiles: copies.length, actualOmittedCompiledRestoreFiles: omitted.length,
  actualCheckedAuthoredLocalLinks: links.length + 1, actualBrokenAuthoredArtifactLinks: 0,
  actualSealSelfLinkVerifiedAfterCreation: true, actualSealedCapsuleAuditPassed: result.status === 0,
  actualAuditExecutable: process.execPath, actualAuditArguments: args, actualAuditExitCode: result.status,
  actualCurrentCountersUnchanged: true, actualFixedReportPreserved: true
};
fs.writeFileSync(path.join(run, 'sealed-capsule-audit.command.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
if (result.stdout) process.stdout.write(result.stdout);
assert.ifError(result.error);
assert.equal(result.status, 0, result.stderr);
fs.writeFileSync(path.join(run, 'capsule-preparation.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt, null, 2));
