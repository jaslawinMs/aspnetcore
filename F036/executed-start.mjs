import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F036');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F036-viewdata-enumeration';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const prior = read(path.join(session, 'F035-final-verification.json'));
assert.equal(prior.actualAllPublicationChecksPassed, true);
assert.equal(prior.actualResultsStatusEntries, 0);
assert.equal(prior.actualVerifiedRemoteImmutableReceiptIndexEntries, 1395);
assert.equal(prior.actualFinalized, 114);
const ledger = read(path.join(session, 'autoperf-campaign.json'));
const finding = ledger.candidates.find(row => row.id === 'F036');
assert.equal(finding.status, 'pending');
fs.mkdirSync(run);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(run, 'executed-start.mjs'));
fs.writeFileSync(path.join(run, 'finding.json'), JSON.stringify(finding, null, 2) + '\n');
const calls = [];
function capture(command, args, label, expectedProbe = false) {
  const started = new Date().toISOString();
  const result = spawnSync(command, args, { cwd: root, maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  fs.writeFileSync(path.join(run, label + '.stdout'), result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(path.join(run, label + '.stderr'), result.stderr ?? Buffer.alloc(0));
  calls.push({ executable: command, arguments: args, workingDirectory: root, started,
    completed: new Date().toISOString(), actualExitCode: result.status,
    expectedExistenceOrOptionalDocumentationProbe: expectedProbe,
    stdout: label + '.stdout', stderr: label + '.stderr' });
  fs.writeFileSync(path.join(run, 'initial-actual-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  if (!expectedProbe) {
    assert.equal(result.status, 0, `${label}:${result.stderr}`);
  }
  return { ...result, text: (result.stdout ?? Buffer.alloc(0)).toString().trim() };
}
const git = (args, label) => capture('git', args, label).text;
const gh = (endpoint, label) => JSON.parse(capture('gh', ['api', endpoint], label).text);
const digest = value => createHash('sha256').update(value).digest('hex').toUpperCase();
assert.equal(git(['status', '--porcelain=v1', '--untracked-files=no'], 'initial-tracked-status'), '');
assert.equal(git(['rev-parse', 'HEAD'], 'actual-prior-source-head'), baseline);
assert.equal(git(['branch', '--show-current'], 'actual-prior-source-branch'), 'autoperf/F035-value-provider-enumeration');
assert.deepEqual(git(['ls-files', '--others', '--exclude-standard'], 'initial-untracked').split(/\r?\n/).sort(), [
  'autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md',
].sort());
assert.equal(gh('repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf-results', 'prior-actual-results-ref').object.sha,
  prior.actualFinalReceiptCommit);
const current = gh('repos/dotnet/aspnetcore/branches/main', 'actual-current-default').commit.sha;
if (capture('git', ['cat-file', '-e', `${current}^{commit}`], 'current-local-probe', true).status !== 0) {
  git(['fetch', '--no-tags', 'origin', current], 'fetch-actual-current');
}
assert.equal(capture('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], 'new-local-branch-probe', true).status, 1);
assert.equal(git(['ls-remote', '--heads', 'autoperf', `refs/heads/${branch}`], 'new-fork-branch-probe'), '');
git(['switch', '--create', branch, baseline], 'create-independent-branch');
assert.equal(git(['rev-parse', 'HEAD'], 'actual-independent-parent'), baseline);
const selected = [
  'src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionary.cs',
  'src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionaryOfT.cs',
  'src/Shared/CopyOnWriteDictionary/CopyOnWriteDictionary.cs',
  'src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionaryFactory.cs',
  'src/Mvc/Mvc.ViewFeatures/src/Microsoft.AspNetCore.Mvc.ViewFeatures.csproj',
  'src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Shipped.txt',
  'src/Mvc/Mvc.ViewFeatures/src/PublicAPI.Unshipped.txt',
  'src/Mvc/Mvc.ViewFeatures/test/ViewDataDictionaryTest.cs',
  'src/Mvc/Mvc.ViewFeatures/test/ViewDataDictionaryOfTModelTest.cs',
  'src/Mvc/Mvc.ViewFeatures/test/Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj',
  'src/Mvc/Mvc.ViewFeatures/src/TemplateBuilder.cs',
  'src/Mvc/Mvc.ViewFeatures/src/HtmlHelper.cs',
];
const snapshots = path.join(run, 'source-snapshots');
fs.mkdirSync(snapshots);
const parity = [];
for (const [index, file] of [...selected, 'global.json', 'eng/Versions.props',
  'src/Mvc/Mvc.Abstractions/src/ModelBinding/ValueProviderResult.cs'].entries()) {
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
gh(`repos/dotnet/aspnetcore/commits?path=${selected[2]}&per_page=8&sha=${current}`, 'actual-copy-on-write-history');
for (const [label, kind, query] of [
  ['owner', 'prs', 'ViewDataDictionary'],
  ['enumerator', 'issues', 'ViewDataDictionary GetEnumerator'],
  ['existing-enumerator', 'prs', 'ViewDataDictionary enumerator'],
]) {
  capture('gh', ['search', kind, query, '--repo', 'dotnet/aspnetcore', '--limit', '15',
    '--json', 'number,title,url,state,updatedAt'], 'actual-upstream-search-' + label);
}
const docsCommit = gh('repos/dotnet/AspNetCore.Docs/branches/main', 'actual-documentation-default').commit.sha;
const docs = capture('gh', ['api', '-H', 'Accept: application/vnd.github.raw+json',
  `repos/dotnet/AspNetCore.Docs/contents/aspnetcore/mvc/views/overview.md?ref=${docsCommit}`],
  'actual-viewdata-documentation', true);
for (const [index, file] of [
  'src/Mvc/AGENTS.md', '.github/instructions/cross-cutting-guidance.instructions.md',
  '.github/instructions/build.instructions.md', 'docs/CrossCuttingGuidance.md', 'docs/BuildFromSource.md',
].entries()) {
  fs.copyFileSync(path.join(root, ...file.split('/')), path.join(run, `guidance-${index}-${path.basename(file)}`));
}
const api = {
  candidate: 'F036', verdict: 'Recommend not adding',
  proposalUnderReview: 'Naively add public Dictionary<string,object?>.Enumerator GetEnumerator() to ViewDataDictionary as a universal allocation-free concrete foreach path.',
  currentSignature: 'No public pattern GetEnumerator. Explicit IEnumerable<KeyValuePair<string,object?>>.GetEnumerator returns IEnumerator<KeyValuePair<string,object?>>;explicit IEnumerable.GetEnumerator returns IEnumerator.',
  proposedMemberRejectedRefDiff: '- public System.Collections.Generic.Dictionary<string,object?>.Enumerator GetEnumerator();\n// No API added.',
  scenarioModel: 'MVC/Razor server rendering passes application/controller/handler metadata into base and typed view-data dictionaries. Public copy constructors and real TemplateBuilder/HtmlHelper flows create lazy copy-on-write scopes. End-app direct foreach and library/derived dictionaries exist;no frequency or dominant enumeration-hotpath established. This is not a browser/client or scale-out mechanism.',
  needAssessment: 'Underlying data are not universally a concrete Dictionary. A permanent exported enumerator family needs actual benefit and preserved lazy/derived behavior,not only the presence of interface-returning enumeration.',
  typeAndAssemblyAssessment: 'ViewDataDictionary remains the existing unsealed MVC.ViewFeatures implementation type. No justification yet for another durable public enumerator contract or changing its IDictionary relationships/defaults.',
  changesRecommended: ['Do not cast heterogeneous private IDictionary storage to Dictionary.','Do not flatten lazy copies or bypass derived IEnumerable implementations to obtain a concrete cursor.','First characterize real owner producers/cursors and original allocation behavior. Evaluate a compatible internal strategy only if it preserves these constraints and has demonstrated need.'],
  why: 'Top-level data are a Dictionary,but copy constructors wrap the source ViewDataDictionary in CopyOnWriteDictionary. Eager materialization would alter visibility before the first write. The public unsealed type permits derived interface reimplementation;naive pattern binding/direct backing-store traversal can bypass it. These are constraints to prove with original owning producers,not a verified candidate-break claim.',
  potentialCompatibleStrategyEstablished: false, actualPublicApiOrBaselineEdit: false,
  actualApiApprovalClaimed: false, actualCandidateImplementationCompiled: false,
  actualCandidateBehavioralBreakVerified: false,
};
fs.writeFileSync(path.join(run, 'api-assessment.json'), JSON.stringify(api, null, 2) + '\n');
const acceptance = {
  candidate: 'F036', testWorkScope: 'Focused:ViewDataDictionary enumeration and its actual public copy/typed producers,not package-wide test generation.',
  definedBeforeProductEditsOrTiming: true,
  requirements: [
    'Verify selected default-branch/history/source/API and bounded existing-work evidence before any implementation. Keep stable finding identity;nominal interface shape is not measured native boxing or application hotness.',
    'Preserve every existing API/default/interface,case-insensitive keys,order/null/model/model-state/TemplateInfo behavior and derived implementation semantics. No new IVT/UnsafeAccessor or access to nonpublic members in shipping framework code.',
    'Use actual public base/typed/copy constructors and actual owner foreach/interface enumeration,not an independent replacement dictionary. Plain Dictionary may be an explicitly unchanged diagnostic control,not a substituted owner.',
    'Prove source mutations are visible before first copy write;first write detaches;later source mutations are isolated;child mutation does not alter source;nested copies and enumerators acquired before/after detachment retain their real backing semantics.',
    'Prove actual derived IEnumerable reimplementation affects real concrete/interface enumeration and real public-copy materialization. Do not equate observed original constraints with an executed candidate regression.',
    'Retain exact cursor type,data/order,Current before/after,repeated exhaustion,Reset and post-reset move,Dispose and post-dispose behavior for empty/single/few/scaled and base/typed/lazy/materialized sources. Exceptions are explicit type/message records,not swallowed defaults.',
    'Run narrow existing owning tests with fresh TRX. Account for every selected row,unique execution IDs and parameterized rows,including all metadata-data rows and both nullable integer InlineData rows. No changes to existing test inputs/names to make reporting easy.',
    'Freeze actual source/PE/PDB/dependency/runtime bindings,predeclare benchmark methods/counts/primary/controls and execution policy before native timing. Pinned net12/C#13,Release,MemoryDiagnoser,3warmup/8results,100ms,unroll1,DontRemove,settings-preserving byte-exact emitter.',
    'If no justified compatible candidate is established,use explicitly original-only diagnostics:zero source-comparison attempts,no before/after gain claim. If a candidate is justified,at most3actual source-comparison slots including failures/partial starts,alternating order;clear>=50%primary gain may stop early. Never manufacture a public API or draft to satisfy the scan.',
    'Shared non-isolated Windows host;serialize heavy work,max2MSBuild workers. Never alter priorities,affinity,power,OS/network policy or terminate unrelated processes. No full Razor/HTTP/application-throughput/prevalence claim from in-memory owner measurements.',
    'Independently copy/rebuild/characterize without retiming,compare all concrete records and audit every raw sample/settings/source witness/live closure. Preserve failed attempts and bounded/unverified boundaries explicitly.',
    'Only publish a justified API-changing implementation draft with separate api-review proposal issue. Otherwise publish honest no-gain/rejected/duplicate tracking evidence,no artificial PR. Verify immutable blobs before issue/draft and final exact four-file receipt/index before progress.',
  ],
  languageReferenceAvailability: 'code-testing-extensions catalog not provided;existing SDK-style xUnit/Moq manifests and representative owning tests used instead. No install-directory search or reporter dependency change.',
  maximumActualSourceComparisons: 3, actualComparisonsStarted: 0,
};
fs.writeFileSync(path.join(run, 'acceptance.json'), JSON.stringify(acceptance, null, 2) + '\n');
const investigation = {
  candidate: 'F036', baseline, branch, actualCurrentDefault: current,
  actualRawSnapshots: parity.length * 3, actualSelectedFilePairs: selected.length, parity,
  actualSelectedInterveningHistory: history,
  actualSelectedSourceParity: parity.filter(row => row.core).every(row => row.actualBaselineAndCurrentBlobBytesEqual),
  actualDocumentationCommit: docsCommit, actualDocumentationExit: docs.status,
  actualNewShippingEditPerformed: false, actualTimingPerformed: false,
  actualPriorF035CandidateNotInherited: parity.find(row => row.file.endsWith('/ValueProviderResult.cs')).actualWorkingLfBytesMatchBaselineBlob,
  codeIntelligenceLimit: 'Remote index is unrelated msazure/One and GitHub semantic lookup unavailable in prior checks. Local LSP returns ViewDataDictionary member inventory but no CopyOnWriteDictionary symbol. Known-source/Git and bounded file lookup fallback,not graph-complete caller enumeration.',
  apiAssessment: 'Reject naive universal Dictionary cursor addition;actual original lazy/derived behavior and native cost still require characterization before disposition.',
  limit: 'Selected source/history/search/documentation parity,not complete repository history/issue absence or integration on advanced-default SDK.',
};
fs.writeFileSync(path.join(run, 'investigation.json'), JSON.stringify(investigation, null, 2) + '\n');
assert.ok(investigation.actualSelectedSourceParity && parity.filter(row => row.core).every(row =>
  row.actualWorkingLfBytesMatchBaselineBlob), 'Changed selected sources require explicit current-default reassessment.');
assert.equal(investigation.actualPriorF035CandidateNotInherited, true);
console.log(JSON.stringify({ branch, baseline, actualCurrentDefault: current,
  actualSelectedSourceParity: investigation.actualSelectedSourceParity,
  actualRawSnapshots: investigation.actualRawSnapshots, actualTimingPerformed: false }, null, 2));
