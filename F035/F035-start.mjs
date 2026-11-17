import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F035');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F035-value-provider-enumeration';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const prior = read(path.join(session, 'F033-final-verification.json'));
assert.equal(prior.actualResultsCheckoutClean, true);
assert.equal(prior.actualVerifiedRemoteEvidenceAndReceiptIndexEntries, 1118);
assert.equal(prior.actualFinalIndex.actualFinalizedAfterReceipt, 113);
const ledger = read(path.join(session, 'autoperf-campaign.json'));
const finding = ledger.candidates.find(row => row.id === 'F035');
assert.equal(finding.status, 'pending');
fs.mkdirSync(run);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(run, 'executed-start.mjs'));
fs.writeFileSync(path.join(run, 'finding.json'), JSON.stringify(finding, null, 2) + '\n');
const calls = [];
function capture(command, args, label, allowFailure = false) {
  const started = new Date().toISOString();
  const result = spawnSync(command, args, { cwd: root, maxBuffer: 16 * 1024 * 1024 });
  fs.writeFileSync(path.join(run, label + '.stdout'), result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(path.join(run, label + '.stderr'), result.stderr ?? Buffer.alloc(0));
  calls.push({ command, args, workingDirectory: root, started, completed: new Date().toISOString(),
    actualExitCode: result.status, stdout: label + '.stdout', stderr: label + '.stderr' });
  fs.writeFileSync(path.join(run, 'initial-actual-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  if (!allowFailure) {
    assert.equal(result.status, 0, `${label}:${result.stderr}`);
  }
  return { ...result, text: (result.stdout ?? Buffer.alloc(0)).toString().trim() };
}
const git = (args, label) => capture('git', args, label).text;
const gh = (endpoint, label) => JSON.parse(capture('gh', ['api', endpoint], label).text);
const digest = value => createHash('sha256').update(value).digest('hex').toUpperCase();
assert.equal(git(['status', '--porcelain=v1', '--untracked-files=no'], 'initial-tracked-status'), '');
assert.equal(git(['rev-parse', 'HEAD'], 'actual-prior-source-head'), '053d19c2a36d3402243016641f3907b834084137');
assert.deepEqual(git(['ls-files', '--others', '--exclude-standard'], 'initial-untracked').split('\n').sort(), [
  'autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md',
].sort());
assert.equal(gh('repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results', 'prior-actual-results-ref').object.sha,
  prior.actualReceiptCommit);
const current = gh('repos/dotnet/aspnetcore/branches/main', 'actual-current-default').commit.sha;
if (capture('git', ['cat-file', '-e', `${current}^{commit}`], 'current-local-probe', true).status !== 0) {
  git(['fetch', '--no-tags', 'origin', current], 'fetch-actual-current');
}
assert.equal(capture('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], 'new-local-branch-probe', true).status, 1);
assert.equal(git(['ls-remote', '--heads', 'autoperf', `refs/heads/${branch}`], 'new-fork-branch-probe'), '');
git(['switch', '--create', branch, baseline], 'create-independent-branch');
assert.equal(git(['rev-parse', 'HEAD'], 'actual-independent-parent'), baseline);
const selected = [
  'src/Mvc/Mvc.Abstractions/src/ModelBinding/ValueProviderResult.cs',
  'src/Mvc/Mvc.Abstractions/src/Microsoft.AspNetCore.Mvc.Abstractions.csproj',
  'src/Mvc/Mvc.Abstractions/src/PublicAPI.Shipped.txt',
  'src/Mvc/Mvc.Abstractions/src/PublicAPI.Unshipped.txt',
  'src/Mvc/Mvc.Abstractions/test/ModelBinding/ValueProviderResultTest.cs',
  'src/Mvc/Mvc.Abstractions/test/Microsoft.AspNetCore.Mvc.Abstractions.Test.csproj',
  'src/Mvc/Mvc.Core/src/ModelBinding/QueryStringValueProvider.cs',
  'src/Mvc/Mvc.Core/src/ModelBinding/QueryStringValueProviderFactory.cs',
  'src/Mvc/Mvc.Core/src/ModelBinding/Binders/CollectionModelBinder.cs',
  'src/Mvc/Mvc.Core/src/Microsoft.AspNetCore.Mvc.Core.csproj',
  'src/Mvc/Mvc.Core/test/ModelBinding/QueryStringValueProviderTest.cs',
  'src/Mvc/Mvc.Core/test/ModelBinding/QueryStringValueProviderFactoryTest.cs',
];
const snapshots = path.join(run, 'source-snapshots');
fs.mkdirSync(snapshots);
const parity = [];
for (const [index, file] of [...selected, 'global.json', 'eng/Versions.props',
  'src/Servers/HttpSys/src/ResponseStream.cs'].entries()) {
  const before = capture('git', ['show', `${baseline}:${file}`], `snapshot-${index}-baseline`).stdout;
  const after = capture('git', ['show', `${current}:${file}`], `snapshot-${index}-current`).stdout;
  const working = fs.readFileSync(path.join(root, ...file.split('/')));
  const prefix = String(index).padStart(2, '0') + '-' + path.basename(file);
  for (const [variant, bytes] of [['baseline', before], ['current', after], ['working', working]]) {
    fs.writeFileSync(path.join(snapshots, prefix + '.' + variant), bytes);
  }
  parity.push({ file, core: selected.includes(file), actualBaselineBlobBytesSha256: digest(before),
    actualCurrentBlobBytesSha256: digest(after), actualWorkingBytesSha256: digest(working),
    actualBaselineAndCurrentBlobBytesEqual: before.equals(after),
    actualWorkingLfBytesMatchBaselineBlob: Buffer.from(working.toString().replaceAll('\r\n', '\n')).equals(before) });
}
const history = git(['--no-pager', 'log', '--format=%H %s', `${baseline}..${current}`, '--', ...selected],
  'selected-intervening-history');
gh(`repos/dotnet/aspnetcore/commits?path=${selected[0]}&per_page=8&sha=${current}`, 'actual-owner-history');
gh(`repos/dotnet/aspnetcore/commits?path=${selected[8]}&per_page=8&sha=${current}`, 'actual-collection-consumer-history');
for (const [label, kind, query] of [
  ['owner', 'prs', 'ValueProviderResult'],
  ['enumerator', 'issues', 'ValueProviderResult GetEnumerator'],
  ['existing-enumerator', 'prs', 'ValueProviderResult enumerator'],
]) {
  capture('gh', ['search', kind, query, '--repo', 'dotnet/aspnetcore', '--limit', '15',
    '--json', 'number,title,url,state,updatedAt'], 'actual-upstream-search-' + label);
}
const docsCommit = gh('repos/dotnet/AspNetCore.Docs/branches/main', 'actual-documentation-default').commit.sha;
const docs = capture('gh', ['api', '-H', 'Accept: application/vnd.github.raw+json',
  `repos/dotnet/AspNetCore.Docs/contents/aspnetcore/mvc/models/model-binding.md?ref=${docsCommit}`],
  'actual-model-binding-documentation', true);
for (const [index, file] of [
  'src/Mvc/AGENTS.md', '.github/instructions/cross-cutting-guidance.instructions.md',
  '.github/instructions/build.instructions.md', 'docs/CrossCuttingGuidance.md', 'docs/BuildFromSource.md',
  '.github/skills/review-public-api/references/conventions.md', '.github/skills/review-public-api/references/output-format.md',
  '.github/skills/review-public-api/references/process.md',
].entries()) {
  fs.copyFileSync(path.join(root, ...file.split('/')), path.join(run, `guidance-${index}-${path.basename(file)}`));
}
const api = {
  candidate: 'F035', verdict: 'Recommend not adding',
  proposalUnderReview: 'Replace the shipped GetEnumerator return with StringValues.Enumerator to enable value-type concrete foreach.',
  currentSignature: 'public System.Collections.Generic.IEnumerator<string> Microsoft.AspNetCore.Mvc.ModelBinding.ValueProviderResult.GetEnumerator()',
  shippedBaseline: 'src/Mvc/Mvc.Abstractions/src/PublicAPI.Shipped.txt:687',
  scenarioModel: 'MVC server-rendered applications/server APIs bind incoming query/form values,usually empty/single/few values. Framework binders and custom app/library foreach consumers run in process independently of scale-out. This is not a browser/SignalR mechanism and no new client behavior is claimed.',
  commonality: 'Happy-path model binding;direct app enumeration is an existing end-developer/library capability,not evidence that a replacement public API is needed.',
  targetAudience: 'Existing framework/library and end-application consumers.',
  typePlacementAssessment: 'The existing readonly result remains beside IValueProvider in the MVC.Abstractions dependency sink;no new type,dependency,namespace,interface/default or extensibility shape is justified.',
  why: 'Already-compiled callers request the exact IEnumerator<string>-returning method signature and would throw MissingMethodException if replaced. C# cannot overload solely by return type. Preserve the existing member;Values.GetEnumerator() already gives opt-in concrete StringValues enumeration without new framework surface.',
  compatibility: 'Kept public IEnumerator<string> ValueProviderResult.GetEnumerator() unchanged because already-compiled MVC/custom consumers bind that exact return signature and would throw MissingMethodException if it changed. Evaluate only a same-signature body change,not the incompatible struct-return replacement.',
  recommendedRefAssemblyDiff: 'namespace Microsoft.AspNetCore.Mvc.ModelBinding;\n public readonly struct ValueProviderResult\n {\n     public System.Collections.Generic.IEnumerator<string> GetEnumerator();\n }\n// No API added,removed or changed.',
  changes: ['Do not replace the shipped return type.','Do not add a redundant enumeration API.','If actual behavior and measurements support it,remove only an avoidable internal StringValues interface conversion while preserving the original return contract.'],
  potentialCompatibleImplementationNotYetCompiledOrMeasured: 'return (IEnumerator<string>)Values.GetEnumerator();',
  actualPublicApiOrBaselineEdit: false, actualApiApprovalClaimed: false,
};
fs.writeFileSync(path.join(run, 'api-assessment.json'), JSON.stringify(api, null, 2) + '\n');
const acceptance = {
  candidate: 'F035', definedBeforeProductEditsOrTiming: true,
  requirements: [
    'Preserve the shipped public IEnumerator<string> GetEnumerator signature,both generic/nongeneric IEnumerable contracts,all members/API baselines/defaults and ordinary data/culture behavior. No new IVT/UnsafeAccessor or framework surface.',
    'Before any shipping edit,run the exact existing ValueProviderResult unit class including every discovered EqualsData row and characterize real current loaded StringValues enumeration implementation/returned type and lifecycle. Do not equate IL boxing with actual native heap cost.',
    'Characterize default,None,null string,null array,empty array,empty string,single string,single array,multiple/null/empty values,independent enumerators,Reset/Current/Dispose behavior and live backing-array mutations. Compare concrete/generic/nongeneric return,data and exact observations across variants.',
    'Exercise actual DefaultHttpContext request query parsing,public QueryStringValueProviderFactory/GetValue and a real CollectionModelBinder consumer;assert complete output/error/model-state/culture behavior. No source-linked surrogate or direct private-state/callback injection. Distinguish original-only contract cases from actual benchmark lifecycles.',
    'Prepare one harness and dependency closure;candidate is its exact copy with only the actual tested MVC.Abstractions DLL/PDB replaced. Verify owner/source/runtime identities and API/ref evidence;do not substitute installed MVC binaries.',
    'Predeclare ordinary one-value real collection binding as primary,empty/few/scaled cases and unchanged direct Values enumeration as controls. Prepared enumeration,query producer and real binding boundaries must be stated honestly;no hosted HTTP/application-throughput or workload-frequency claims.',
    'Use pinned net12 runtime/C#13,Release,MemoryDiagnoser and the proven byte-exact settings-preserving emitter with before/after observations. Serialize heavy work,max2MSBuild workers,shared non-isolated Windows host;no priority/affinity/power/OS-setting changes or unrelated process termination.',
    'At most3actual source-comparison attempt slots,including partial/failed starts;alternate original/candidate,candidate/original,original/candidate. All8result samples/outliers,controls,allocations and failed attempts retained. Clear>=50%primary gain may stop early;otherwise at most3.',
    'Establish repeatable meaningful compatible benefit. If JIT already removes the nominal boxing or no net benefit survives actual measurement,restore original source/product and publish no-gain;do not manufacture a draft for the rejected public-signature change.',
    'Independently copy/rebuild the runnable original project after measurements without another timing,rehash live frozen images and retained samples/statistics,and publish immutable evidence before fork-only tracking/draft/final four-file receipt. Immediately open every genuinely new justified draft.',
    'Preserve unrelated reports and global.json/package.json/package-lock.json/NuGet.config. No compiler-provenance claim beyond actual selected source/PE/PDB receipts. Keep current-default/source/history/search coverage explicitly bounded.',
  ],
  maximumActualComparisons: 3, actualComparisonsStarted: 0,
};
fs.writeFileSync(path.join(run, 'acceptance.json'), JSON.stringify(acceptance, null, 2) + '\n');
const investigation = {
  candidate: 'F035', baseline, branch, actualCurrentDefault: current,
  actualRawSnapshots: parity.length * 3, actualSelectedFilePairs: selected.length, parity,
  actualSelectedInterveningHistory: history,
  actualSelectedSourceParity: parity.filter(row => row.core).every(row => row.actualBaselineAndCurrentBlobBytesEqual),
  actualDocumentationCommit: docsCommit, actualDocumentationExit: docs.status,
  actualNewShippingEditPerformed: false, actualTimingPerformed: false,
  actualPriorF033GuardNotInherited: parity.find(row => row.file.endsWith('/ResponseStream.cs')).actualWorkingLfBytesMatchBaselineBlob,
  codeIntelligenceLimit: 'Remote index is unrelated msazure/One and GitHub semantic lookup unavailable in prior checks. Local GetEnumerator LSP returns its declaration and explicit nongeneric forwarder only;Core producer/consumer symbol lookup returns no results. Known-source/Git and bounded file lookup fallback,not graph-complete caller enumeration.',
  apiAssessment: 'Reject struct-return replacement;investigate only compatible same-signature implementation if real StringValues behavior permits.',
  limit: 'Selected source/history/search/documentation parity,not complete repository history/issue absence or integration on the advanced default SDK.',
};
fs.writeFileSync(path.join(run, 'investigation.json'), JSON.stringify(investigation, null, 2) + '\n');
assert.ok(investigation.actualSelectedSourceParity && parity.filter(row => row.core).every(row =>
  row.actualWorkingLfBytesMatchBaselineBlob), 'Changed selected sources require explicit current-default reassessment.');
assert.equal(investigation.actualPriorF033GuardNotInherited, true);
console.log(JSON.stringify({ branch, baseline, actualCurrentDefault: current,
  actualSelectedSourceParity: investigation.actualSelectedSourceParity,
  actualRawSnapshots: investigation.actualRawSnapshots, actualTimingPerformed: false }, null, 2));
