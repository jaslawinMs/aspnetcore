import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F126');
const published = path.join(session, 'autoperf-published-results');
const destination = path.join(published, 'F126');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
function write(name, value) {
  const file = path.join(destination, ...name.split('/'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
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
assert.equal(fs.existsSync(destination), false, 'Preserve a known partial capsule.');
assert.equal(git(['rev-parse', 'HEAD']), '772634b479817f36171257fb9533d320f3fb7745');
assert.equal(git(['status', '--porcelain']), '');
assert.equal(git(['rev-parse', 'HEAD:REPORT.md']), '73abf142464b1f81676e03a1eebc766c279cb47b');
const source = read(path.join(run, 'source-publication.json'));
const decision = read(path.join(run, 'decision.json'));
const analysis = read(path.join(run, 'analysis.json'));
assert.equal(source.actualRemoteRefVerified, true);
assert.equal(decision.actualDraftProposalWarrantedWithinExplicitLimitations, true);
assert.equal(decision.qualificationBasis, 'predeclared-alternative-allocation-gate-only');
assert.equal(read(path.join(run, 'native-inclusive-audit.command.json')).actualExitCode, 0);
assert.equal(sha(path.join(run, 'diagnostic-budget.json')), read(path.join(run, 'budget-closure.json')).actualClosedBudgetSha256);
fs.mkdirSync(destination);
const copies = [];
const omitted = [];
for (const name of inventory(run)) {
  const input = path.join(run, ...name.split('/'));
  const entry = { path: name, bytes: fs.statSync(input).size, sha256: sha(input) };
  if (name.split('/').some(part => part === 'bin' || part === 'obj' || part.startsWith('consumer-'))
    || /^images\/(?:Original|Default|Candidate)\/image\//.test(name)
    || /\.(dll|pdb|exe|so|a|dylib|zip|nupkg|cache|bin|db)$/i.test(name)) {
    omitted.push(entry);
    continue;
  }
  const target = path.join(destination, ...name.split('/'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(input, target, fs.constants.COPYFILE_EXCL);
  assert.equal(sha(target), entry.sha256);
  copies.push({ ...entry, authoritativeSource: 'private-case/' + name });
}
for (const suffix of ['discover.mjs', 'seal-plan.mjs', 'managed-command.mjs', 'audit-test-results.mjs',
  'prepare-images.mjs', 'correct-harness-preparation.mjs', 'characterize.mjs', 'seal-baseline.mjs',
  'audit-candidate-correctness.mjs', 'prepare-watch.mjs', 'watch-sample.ps1', 'probe-watch.mjs',
  'audit-hot-reload.mjs', 'seal-premeasurement.mjs', 'compare.mjs', 'close-budget.mjs',
  'analyze-results.mjs', 'audit-numbers.ps1', 'reproduce-untimed.mjs', 'finish-evaluation.mjs',
  'publish-source.mjs', 'build-capsule.mjs']) {
  const name = 'F126-' + suffix;
  const input = path.join(session, name);
  const target = 'executed-drivers/' + name;
  write(target, fs.readFileSync(input));
  copies.push({ path: target, bytes: fs.statSync(input).size, sha256: sha(input), authoritativeSource: 'private-session/' + name });
}
write('F126-verify.mjs', fs.readFileSync(path.join(session, 'F126-verify.mjs')));
write('.gitattributes', '* -text\n');
const f = number => number.toFixed(2);
const rows = analysis.aggregates.map(item =>
  `| ${item.key} | ${f(item.medianLessTimePercent)}% | ${item.pairedLessTimePercent.map(value => f(value) + '%').join(' / ')} | ${item.pairedReportedBytesSaved.join(' / ')} |`).join('\n');
const primary = analysis.pairs.map(pair => {
  const item = pair.cells.find(item => item.key === 'WarmRequest/MinimumAge10');
  const matched = pair.cells.find(item => item.key === 'CachingDisabledRequest/MinimumAge10');
  return `| ${pair.attempt} | ${pair.order.join(' -> ')} | ${f(item.originalMeanNanoseconds)} | ${f(item.candidateMeanNanoseconds)} | ${f(item.lessTimePercent)}% | ${item.originalReportedBytesPerOperation} -> ${item.candidateReportedBytesPerOperation} | ${item.reportedBytesSavedPerOperation} | ${matched.reportedBytesSavedPerOperation} | ${item.reportedBytesSavedPerOperation - matched.reportedBytesSavedPerOperation} |`;
}).join('\n');
const variability = analysis.rawCases.map(item =>
  `| ${item.attempt} | ${item.role} | ${item.key} | ${f(item.meanNanoseconds)} | ${f(item.standardDeviation)} | ${f(100 * item.standardDeviation / item.meanNanoseconds)}% | ${item.reportedBytesPerOperation} | ${item.actualMemory.Gen0Collections}/${item.actualMemory.Gen1Collections}/${item.actualMemory.Gen2Collections} | ${item.actualMemory.TotalOperations} |`).join('\n');
const raw = [1, 2, 3].map(attempt => {
  const folder = 'comparison-' + String(attempt).padStart(3, '0');
  return `- Pair ${attempt}: [Original full JSON](${folder}/Original/reports/results/AutoPerf.PolicyBenchmarks-report-full.json), [Candidate full JSON](${folder}/Candidate/reports/results/AutoPerf.PolicyBenchmarks-report-full.json), [authorization](${folder}/authorization.json), [receipt](${folder}/execution-receipt.json).`;
}).join('\n');
write('comparison-results.md', `# F126: allocation-only result, all timings and controls

The predeclared primary is \`WarmRequest/MinimumAge10\`, a real routed source-built sample request after endpoint warmup. Positive **less time** means faster; positive **bytes saved** means less reported allocation. These are whole TestServer request observations, **not an isolated policy-object size or network/application-throughput result**.

| Pair | Order | Original ns/op | Candidate ns/op | Less time | Reported B/op | Primary saved B/op | Disabled-cache saved B/op | Difference in savings |
|---|---|---:|---:|---:|---|---:|---:|---:|
${primary}

**Allocation qualifies:** primary savings are **1246 / 1258 / 1269 reported B/op**, median **1258 B/op (about 1.23 KiB)**. The matched-control-adjusted savings are **1801 / 1277 / 634 B/op**; every pair exceeds the sealed alternative 32-B/op gate.

**Timing does not qualify:** primary less-time effects are **+0.97% / +5.71% / -0.04%**, median **+0.97%**. The unchanged same-profile disabled-cache control moves **+26.73% / +23.76% / -38.69%**. The primary neither reaches 10% median nor exceeds absolute matched-control movement in any pair. No reliable speedup, latency neutrality or environmental/JIT explanation is claimed.

## Every route and unchanged/adverse control

\`CachingDisabledRequest\` is an explicit counterfactual: the real sample pipeline and provider with the harness decorator forcing the existing flag false in both variants. It is not described as an unmodified application. \`DirectGetPolicy\` deliberately stays outside the endpoint cache and keeps constructing fresh equivalent policies.

| Method / real profile | Median less time | Each pair less time | Each pair reported B/op saved |
|---|---:|---|---|
${rows}

The age50 warm route saves **1315 / 1292 / 1291 B/op**, but never replaces the primary. Direct age50 has a **4.63% median slowdown**, unchanged allocation, and all adverse pairs retained. The predeclared direct-age10 rejection guard is not triggered; that is not proof every unchanged path is neutral.

## Every case's variability and GC observation

All eight retained results and three warmups remain. SD is sample standard deviation; GC counts are raw diagnostic Gen0/Gen1/Gen2 counts, not normalized collection rates. Timing is highly variable on this shared non-isolated box.

| Pair | Source | Method / profile | Mean ns | SD ns | CV | Reported B/op | GC counts | Diagnostic operations |
|---|---|---|---:|---:|---:|---:|---|---:|
${variability}

## Raw authority and arithmetic

${raw}

[JavaScript reduction](analysis.json), [separate PowerShell raw-measurement audit](independent-numerical-audit.json), and [native-inclusive audit](native-inclusive-audit.stdout.txt) agree. The portable auditor reconciles all **288 Workload/Result observations** with actual-minus-median-overhead arithmetic and all **36 raw GC/allocation records** with the pinned BDN midpoint-to-even allocation accounting. See [BDN source](BenchmarkDotNet-0.13.0-GcStats.cs) and its [license](BenchmarkDotNet-0.13.0-LICENSE.md).

Exactly three alternating source comparisons were authorized and completed; [the budget](diagnostic-budget.json) is permanently closed. No tuning, replay or primary substitution.
`);
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const failures = {
  'default-existing-functional-build-001': 'NETSDK1004: absent actual-default functional assets; the subsequent scoped restore was required',
  'default-existing-functional-build-002': 'NETSDK1005: the first restore incorrectly forced global net12.0 and omitted a required netstandard2.0 MSBuild-task target; restoring without the global TargetFramework fixed the prerequisite',
  'original-cache-contract-tests-001': 'expected red: seven existing rows passed and EACH of the two new rows reached the final Moq assertion and failed specifically because two actual lookups occurred instead of one',
  'original-common-harness-build-001': 'NETSDK1004: absent new harness assets; the scoped restore followed this actual missing-dependency failure'
};
const commands = fs.readdirSync(path.join(run, 'validation')).sort().map(label => {
  const directory = path.join(run, 'validation', label);
  const command = read(path.join(directory, 'command.json'));
  const result = read(path.join(directory, 'result.json'));
  const auditPath = path.join(directory, 'individual-results.audit.json');
  const audit = fs.existsSync(auditPath) ? read(auditPath) : null;
  const outcome = result.exitCode === 0
    ? audit ? `${audit.actualParsedRows} individual XML rows passed; zero skipped` : label === 'original-common-harness-build-002'
      ? 'build completed with four premeasurement warnings; exact initial inputs/warning output retained and corrected before the accepted zero-warning build'
      : 'passed within the explicitly documented boundary'
    : failures[label];
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
[Command](validation/${label}/command.json), [result](validation/${label}/result.json), [stdout](validation/${label}/stdout.txt), [stderr](validation/${label}/stderr.txt)${audit ? `, [individual-row audit](validation/${label}/individual-results.audit.json), [actual XML](validation/${label}/test-results/results.trx)` : ''}.
`;
}).join('\n');
write('validation-commands.md', `# F126: exact commands, individual rows and real lifetime evidence

## Requirement coverage

| Requirement | Evidence |
|---|---|
| Preserve root and both real redirect results | \`DefaultReturns200\`, \`MinimumAge10RedirectsWhenNotLoggedIn\`, \`MinimumAge50RedirectsWhenNotLoggedIn\`: pass on original, actual default and candidate |
| Preserve different users and per-request requirement evaluation | \`MinimumAge10WorksIfOldEnough\`, \`MinimumAge10FailsIfNotOldEnough\`, \`MinimumAge50WorksIfOldEnough\`, \`MinimumAge50FailsIfNotOldEnough\`: pass on all three source roles |
| Real owning endpoint producer reaches the cache opt-in | \`MinimumAgePolicyIsCachedBetweenRequests(policyName: "MinimumAge10")\` and \`MinimumAgePolicyIsCachedBetweenRequests(policyName: "MinimumAge50")\`: EACH specifically red with two real original calls, then green with one candidate call after both original real302 responses |
| Policy contents, direct construction, configured delegation and cultures | [Original/default/candidate seal](premeasurement-validation.json), [actual characterization source](harness/Characterization.cs): real MVC metadata, fresh direct instances, older/younger handler evaluation, named/default/fallback options, malformed/unknown/overflow names and 50 name/culture cases per owner |
| Real supported metadata update without restart | [Live-edit audit](hot-reload-verified.json), [actual successful watch command](hot-reload/actual-sample-003/watch-command.json), [raw watch log](hot-reload/actual-sample-003/watch.stdout.txt): age10 ->11 ->10, same app PID34008, two applied batches, one startup, six real302s, handler ages10/10/11/11/10/10, exact controller restore and owned cleanup |
| Measured owner isolation | [Original](images/Original/closure.json) and [candidate](images/Candidate/closure.json): 352 entries, 350 identical INCLUDING compiled common harness DLL/PDB; only actual sample owner DLL/PDB differ. Six selected documents match actual owner PE/PDB |
| Runnable exact-input reconstruction | [Receipt](reconstruction-paired-001/verified-reproduction.json): eight byte-exact inputs freshly rebuilt with zero warnings, both measured owners characterized with identical stable observations, no additional timing |
| All numerical and execution evidence | [Native-inclusive audit](native-inclusive-audit.stdout.txt): 288 samples, 36 raw GC records, actual overhead arithmetic and 72 before/after normal-priority settings records; [independent arithmetic](independent-numerical-audit.json) |

The **32 XML executions** are original-existing7 + original-with-new-rows9 + actual-default7 + candidate9 = **30 passed and two individually expected original failures**, not32 unique passing tests. The old and young HTTP cases remain genuine handler/page tests. The new strict forwarding spy forwards the actual registered provider and real owner flag; it does not inject a cached policy or synthetic endpoint.

## Retained failed prerequisites and corrections

All failed commands and outputs below remain. The first current-default restore forced the wrong global TargetFramework; its corrected restore/build has zero warnings/errors and all seven HTTP tests pass. The initial benchmark build accidentally included generator references and deprecated host constructors, producing four warnings. The accepted common harness excludes generators and uses supported generic HostBuilder/ConfigureWebHost/UseTestServer, with async creation/warmup completed in Main before synchronous GlobalSetup. Its exact earlier inputs and logs are retained; all corrections precede timing.

Watch attempts001/002 never reached a running app or controller edit: short -p properties conflict with --project; properties after the child delimiter do not bind the initial watch build and hit the existing ANCM prerequisite. Attempt003 uses proven long --property:Name=value options before the delimiter. No machine setting, framework callback or private cache was manually altered. Its [baseline](hot-reload/actual-sample-003/baseline-warmed.json), [after actual edit](hot-reload/actual-sample-003/after-controller-attribute-edit.json), [after exact restore](hot-reload/actual-sample-003/after-exact-controller-restore.json) and [owned stop](hot-reload/actual-sample-003/watch-stopped.json) are preserved.

The rebuilt Original characterization succeeded before an overstrict location audit incorrectly demanded that Microsoft.Extensions runtime abstractions load from the copied image. [The initial audit failure](reconstruction-paired-001/audit-failure-001.json) and exact executed driver remain. The corrected audit requires measured image-relative relocation for copied image assemblies and identical absolute paths/bytes for measured pinned-runtime assemblies, then completes Candidate using the SAME successful rebuild. It does not replace observations or consume timing.

${commands}

## Exact untimed reconstruction command outcomes

[First no-restore build](reconstruction-paired-001/Build-NoRestore-First/command.json): expected NETSDK1004 before the fresh assets existed.
[Restore](reconstruction-paired-001/Restore/command.json), [Build](reconstruction-paired-001/Build/command.json), [Original characterization](reconstruction-paired-001/Original-Characterize/command.json), and [Candidate characterization](reconstruction-paired-001/Candidate-Characterize/command.json): EACH exit0; build zero warnings. Every command preserves executable, exact arguments, activated root, timestamps and raw stdout/stderr.

Managed-only command-scoped exclusions UseIisNativeAssets=false, BuildNodeJS=false and StaticWebAssetsEnabled=false do not validate native IIS/ANCM, browser/JavaScript, static-asset production or packaging, legacy TFMs, full-repository builds, AOT/trimming or network throughput. The actual-default graph was separately source-built; its owner-only common-image characterization is explicitly not full-default binary isolation.
`);
const sourceBase = `https://github.com/jaslawinMs/aspnetcore/blob/${source.sourceCommit}`;
write('README.md', `# F126: reuse deterministic sample endpoint policies

**Focused allocation reduction in an internal educational sample; no reliable speedup or merge-ready claim.** The predeclared real age10 TestServer request saves **1246 / 1258 / 1269 reported B/op**, median **1258 B/op (about1.23KiB)**. The alternative allocation gate passes in all three pairs after matched-control adjustment. Timing is **inconclusive**: primary +0.97%/+5.71%/-0.04% less time is much smaller than the unchanged control's +26.73%/+23.76%/-38.69% movement. The permanently closed three-comparison budget retains all288 observations and every adverse/control result.

## Connected artifacts

| Artifact | Link | Meaning |
|---|---|---|
| Independent source | [Exact commit](https://github.com/jaslawinMs/aspnetcore/commit/${source.sourceCommit}), [fork branch](${source.sourceBranchUrl}) | Three files,53 insertions, no deletions; independent parent \`${source.parentBaseline}\` |
| Actual sample change | [Provider](${sourceBase}/src/Security/samples/CustomPolicyProvider/Authorization/MinimumAgePolicyProvider.cs), [sample explanation](${sourceBase}/src/Security/samples/CustomPolicyProvider/readme.md) | Existing AllowsCachingPolicies=true contract; no parser, framework default or private name cache |
| Real HTTP regression coverage | [Exact tests](${sourceBase}/src/Security/test/AuthSamples.FunctionalTests/CustomPolicyProviderTests.cs), [individual requirements and commands](validation-commands.md) | Two individually red->green cache rows; all existing different-user HTTP results preserved |
| Runnable benchmark | [Eight-input project](harness/AutoPerf.Benchmarks.csproj), [methods](harness/PolicyBenchmarks.cs), [actual host/pipeline](harness/PolicyScenario.cs), [hashes](common-inputs-prepared.json) | Actual source-built Startup/MVC/cookie pipeline, both real routes, explicit disabled-cache and direct controls |
| Every measurement | [All results and variability](comparison-results.md), [raw reduction](analysis.json), [independent arithmetic](independent-numerical-audit.json) | Allocation-only qualification, noisy timings and all secondary/adverse/control outcomes |
| Real Hot Reload and lifetime | [Verified live-edit receipt](hot-reload-verified.json), [raw watch log](hot-reload/actual-sample-003/watch.stdout.txt) | Real supported age10->11->10 controller attribute edit, two updates, same PID/no restart, actual handler logs and exact restore |
| Source/PDB and actual default | [Premeasurement seal](premeasurement-validation.json), [baseline](baseline-completed.json), [candidate](candidate-correctness-completed.json) |26 selected inputs/owner, six actual matching PE/PDB documents; actual-default seven HTTP cases on its own complete source graph |
| Independent fresh reconstruction | [Receipt](reconstruction-paired-001/verified-reproduction.json), [exact copied project](reconstruction-paired-001/project/AutoPerf.Benchmarks.csproj) | Exact eight inputs rebuilt, both measured source owners characterized, 350 of 352 image entries unchanged per owner, no more timing |
| Decision and closure | [Decision](decision.json), [closed budget](diagnostic-budget.json), [closure receipt](budget-closure.json) | Allocation alternative only; timing gate fails, direct-age10 guard does not reject; no retuning/replay |
| Portable historical audit | [Auditor](F126-verify.mjs), [native-inclusive result](native-inclusive-audit.stdout.txt), [XML parser](F126-audit-trx.ps1) |288 actual samples/36 GC records/32 individual XML executions; does not execute omitted binaries |
| Copies and omissions | [Copied authority](authoritative-copies.json), [every omitted file hash](omitted-file-hashes.json), [immutable seal](capsule-file-hashes.json) | Full compiled/restore images individually hashed but not publicly shipped |
| Later issue, draft and visible-window evidence | [Additive live publication receipt](https://github.com/jaslawinMs/aspnetcore/blob/autoperf-results/F126/publication.json) | Added after immutable core is remotely verified; no sealed file is rewritten |

## Why enabling this flag preserves the sample's work

The sample's actual Startup registers a singleton internal MinimumAgePolicyProvider. MVC produces its endpoint policy metadata from MinimumAgeAuthorizeAttribute. Without opt-in, the existing middleware reparses the same deterministic age name, builds requirements and combines a policy on each request. The new getter allows the framework's existing endpoint-keyed AuthorizationPolicyCache to reuse that combined policy. It does **not** cache a user's authorization result: the real handler still evaluates the current user's requirements on each request.

Direct GetPolicyAsync intentionally remains uncached; configured named/default/fallback delegation, malformed/unknown names and parsing stay untouched. There is no private unbounded string-name cache. Existing endpoint change-token/disposal machinery owns invalidation. The real watch experiment applies supported metadata changes twice without a restart; the actual handler sees10, then11, then10. Providers backed by independently changing data should keep the existing default false.

## Boundaries and adverse observations

- Qualification is allocation-only. Whole-request B/op savings are not exact policy-object sizes. The disabled-cache primary control's allocation changes -555/-19/+635B/op and very large timing movement remain visible.
- The second real warm route saves1315/1292/1291B/op but does not replace the primary. Direct age50 median timing is4.63% worse with unchanged allocations. No unchanged-path neutrality or causal/JIT explanation is assigned.
- The harness uses actual source-built ASP.NET Core owners, generic hosting and TestServer, disabled logging, ephemeral data protection and a documented Interlocked lookup observer INCLUDED in timing. It makes no socket/network or general framework/application throughput claim.
- Original/candidate images have352 entries,350 identical INCLUDING common harness DLL/PDB; only actual sample DLL/PDB differ. Some unchanged Microsoft.Extensions abstractions resolve from pinned Microsoft.NETCore.App; raw actual paths/bytes are retained. The default sample owner uses the common baseline framework image for characterization; its actual full-default graph was separately validated.
- Baseline \`${source.parentBaseline}\`; actual default744c772d93b79d4d52ff11c05818c4e8de55db6b. SDK12.0.100-alpha.1.26557.102; x64 runtime12.0.0-alpha.1.26562.105; C#13; BDN0.13.0. Three warmups/eight retained, requested100ms/unroll1/DontRemove; O->C,C->O,O->C.
- Shared non-isolated Windows box, Normal process/thread priority and affinity65535. No power, priority, affinity, firewall, URL ACL or other machine setting changes.
- The exact common project was rebuilt in a new directory and both measured owners characterized without timing. Measured owner/framework bytes were reused. Six selected owner documents/26 selected inputs are not complete compiler provenance or fresh-clone byte-identical replay. Measured binaries predate the later source commit.
- The supported live controller-attribute edit on this runtime is verified, not every possible metadata delta. Cold concurrent misses need not build once. No new public framework API, new assembly-boundary access, native/browser/static-asset production/packaging or merge-readiness claim.

## Audit without more timing

\`\`\`powershell
node .\\F126-verify.mjs . --require-seal
\`\`\`

Requires Node and PowerShell7 for actual XML parsing, not SDK restore or timing. Never replay the consumed authorizations. The fixed classified REPORT.md remains its118-finalized snapshot; live campaign progress is separate.
`);
write('authoritative-copies.json', { candidate: 'F126', actualCopiedAuthoritativeFiles: copies.length, files: copies });
write('omitted-file-hashes.json', { candidate: 'F126', actualOmittedCompiledRestoreFiles: omitted.length,
  actualAllOmissionsIndividuallyInventoried: true, files: omitted });
const authored = ['README.md', 'comparison-results.md', 'validation-commands.md'];
const links = [];
function verifyLinks(deferSeal) {
  for (const name of authored) {
    for (const match of fs.readFileSync(path.join(destination, name), 'utf8').matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^(https?:|#)/.test(target)) continue;
      if (deferSeal && target === 'capsule-file-hashes.json') continue;
      const file = path.resolve(destination, ...decodeURIComponent(target.split('#')[0]).split('/'));
      assert.ok(file.startsWith(destination + path.sep));
      assert.equal(fs.existsSync(file), true, `${name}: missing artifact ${target}`);
      if (deferSeal) links.push({ source: name, target });
    }
  }
}
verifyLinks(true);
write('authored-link-audit.json', { candidate: 'F126', actualCheckedExistingLocalLinks: links.length,
  actualDeferredSealSelfLinkOnly: 'capsule-file-hashes.json', links });
const material = inventory(destination).map(name => {
  const file = path.join(destination, ...name.split('/'));
  return { path: name, bytes: fs.statSync(file).size, sha256: sha(file) };
});
write('capsule-file-hashes.json', { candidate: 'F126', actualExcludedAdditiveFiles: ['capsule-file-hashes.json', 'publication.json'], files: material });
verifyLinks(false);
const args = [path.join(destination, 'F126-verify.mjs'), destination, '--require-seal'];
const result = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
for (const [name, content] of [['stdout', result.stdout], ['stderr', result.stderr]]) {
  fs.writeFileSync(path.join(run, 'sealed-capsule-audit.' + name + '.txt'), content ?? '', { flag: 'wx' });
}
const receipt = {
  candidate: 'F126', disposition: 'qualified', subtype: decision.subtype,
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
