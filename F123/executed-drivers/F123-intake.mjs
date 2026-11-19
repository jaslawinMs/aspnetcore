import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const defaultRoot = String.raw`C:\src\autoperf-F042-default`;
const run = path.join(session, 'autoperf-runs', 'F123');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const actualDefault = 'f78194260f43c48ae2092675f55757f2a42dd63d';
const branch = 'autoperf/F123-copy-on-write-indexof';
const owner = 'src/Mvc/Mvc.Core/src/Infrastructure/CopyOnWriteList.cs';
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, ''));
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex').toUpperCase();
const calls = [];
function execute(executable, args, cwd = root) {
  const result = spawnSync(executable, args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  calls.push({ executable, arguments: args, cwd, exitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trimEnd();
}
const git = args => execute('git', ['--no-pager', ...args]);
function write(name, value) {
  const filename = path.join(run, ...name.split('/'));
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
assert.equal(fs.existsSync(run), false);
const campaign = read(path.join(session, 'autoperf-campaign.json'));
assert.equal(campaign.candidates.find(item => item.status === 'pending').id, 'F123');
const previous = read(path.join(session, 'autoperf-runs', 'F122', 'verified-final-publication.json'));
assert.equal(previous.actualCampaignFinalized, 127);
assert.equal(git(['branch', '--show-current']), 'autoperf/F122-copy-on-write-enumerator');
assert.equal(git(['rev-parse', 'HEAD']), '04a462f22aa2ae88d87f7efe1eb7ce5e711229d9');
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
assert.equal(git(['rev-parse', 'origin/main']), actualDefault);
assert.equal(git(['ls-remote', '--heads', 'autoperf', 'refs/heads/' + branch]), '');
assert.equal(execute('git', ['status', '--porcelain', '--untracked-files=no'], defaultRoot), '');
assert.equal(execute('git', ['rev-parse', 'HEAD'], defaultRoot), actualDefault);
const metadata = JSON.parse(execute('gh', ['api', 'repos/dotnet/aspnetcore/commits/' + actualDefault]));
const recentHistory = git(['log', '-8', '--format=%H %cI %s', actualDefault, '--', owner]);
const introductionCommit = 'd74e81186bb35714566d751625c2f0ce609f81c0';
const introductionPath = git(['diff-tree', '--no-commit-id', '--name-only', '-r', introductionCommit])
  .split(/\r?\n/).find(filename => filename.endsWith('/CopyOnWriteList.cs'));
assert.ok(introductionPath);
const introduction = git(['show', introductionCommit + ':' + introductionPath]);
assert.ok(introduction.includes('public int IndexOf(T item)') && introduction.includes('object.Equals(obj, item)'));
const issues = JSON.parse(execute('gh', ['search', 'issues', '"CopyOnWriteList" "IndexOf"', '--repo', 'dotnet/aspnetcore',
  '--limit', '20', '--json', 'number,title,state,url']));
const prs = JSON.parse(execute('gh', ['search', 'prs', '"CopyOnWriteList"', '--repo', 'dotnet/aspnetcore',
  '--limit', '20', '--json', 'number,title,state,url']));
const prior = read(path.join(session, 'autoperf-runs', 'F122', 'intake-completed.json'));
for (const item of prior.actualProtectedPrimaryInputs) assert.equal(sha(path.join(root, item.path)), item.sha256);
git(['switch', '--no-track', '-c', branch, baseline]);
assert.equal(fs.existsSync(path.join(root, 'src', 'Mvc', 'Mvc.Core', 'test', 'Infrastructure', 'CopyOnWriteListTest.cs')), false);
const sourcePaths = read(path.join(session, 'autoperf-runs', 'F122', 'source-inputs-original.json')).sourceFiles.map(item => item.path);
assert.equal(new Set(sourcePaths).size, 11);
const selected = sourcePaths.map(source => {
  const original = git(['show', baseline + ':' + source]);
  const current = git(['show', actualDefault + ':' + source]);
  assert.equal(original, current, 'Reconcile changed current-default source: ' + source);
  write('intake-source/original/' + source, original + '\n');
  write('intake-source/current-default/' + source, current + '\n');
  return { path: source, originalGitBlob: git(['rev-parse', baseline + ':' + source]),
    actualDefaultGitBlob: git(['rev-parse', actualDefault + ':' + source]),
    actualNormalizedTextMatches: true, originalPhysicalSha256: sha(path.join(root, source)) };
});
const profiles = [
  { key: 'CopiedDefault5', copied: true, factoryCount: 'default-five', probe: 'missing' },
  { key: 'UnmodifiedDefault5', copied: false, factoryCount: 'default-five', probe: 'missing' },
  { key: 'CopiedDefault5HitFirst', copied: true, factoryCount: 'default-five', probe: 'first' },
  { key: 'UnmodifiedDefault5HitFirst', copied: false, factoryCount: 'default-five', probe: 'first' },
  { key: 'CopiedDefault5HitLast', copied: true, factoryCount: 'default-five', probe: 'last' },
  { key: 'UnmodifiedDefault5HitLast', copied: false, factoryCount: 'default-five', probe: 'last' },
  { key: 'CopiedEmpty', copied: true, factoryCount: 0, probe: 'missing' },
  { key: 'UnmodifiedEmpty', copied: false, factoryCount: 0, probe: 'missing' },
  { key: 'CopiedOne', copied: true, factoryCount: 1, probe: 'missing' },
  { key: 'UnmodifiedOne', copied: false, factoryCount: 1, probe: 'missing' },
  { key: 'CopiedEight', copied: true, factoryCount: 8, probe: 'missing' },
  { key: 'UnmodifiedEight', copied: false, factoryCount: 8, probe: 'missing' }
];
const plan = {
  candidate: 'F123', baseline, actualCurrentDefault: actualDefault, branch,
  actualSealedAt: new Date().toISOString(), actualShippingEditsAtSeal: 0,
  actualNewPermanentTestFilesAtSeal: 0, actualNewTestsExecutedAtSeal: 0, actualBenchmarkRunsAtSeal: 0,
  target: 'Only IndexOf: specialize enumeration of the private exact List<T>; preserve the original source fallback, object.Equals and explanatory index counter.',
  originalFinding: campaign.candidates.find(item => item.id === 'F123').finding,
  actualNotConcreteEnumeratorPattern: 'The existing IList<IValueProviderFactory>.IndexOf is publicly reachable through actual ControllerContext/PageContext properties. This is not the concrete-only GetEnumerator pattern rejected in F122. Do not infer normal framework call frequency.',
  actualPriorDiagnosticNotNewComparison: 'The independently closed F122 IndexOf control reported 0 B/op for copied-five and 32 B/op for untouched-five. Syntax alone does not establish a boxing cost. These prior observations do not count as a new F123 source comparison or permit retargeting its copied-five primary.',
  actualProposedSmallestCandidate: 'After var i = 0, add a private-copy non-null branch with foreach over the exact List<T>, the same object.Equals(obj, item), the same index increment and early return. Leave the existing Readable loop/fallback byte-for-byte unchanged. Never replace legacy object.Equals with List<T>.IndexOf/EqualityComparer<T>.Default.',
  benchmarkClass: 'AutoPerf.CollectionBenchmarks', benchmarkMethod: 'IndexOf',
  unchangedControlMethod: 'UnchangedContains', primary: 'CopiedDefault5', unchangedControl: 'UnmodifiedDefault5',
  profileKeys: profiles.map(item => item.key),
  actualCasesPerSource: 24, actualRetainedSamplesPerCompleteComparison: 384,
  actualTimedBoundary: 'One public IList.IndexOf call on an actual HTTP-produced collection. Missing/first/last probes are selected and independently validated before timing. Unchanged Contains consumes the same probe/collection. HTTP, setup, source creation, first write, reflection and validation stay outside timing.',
  actualProducer: 'Real parameterless routed TestServer MVC controller, both EnableActionInvokers modes, no ValueProviderFactories assignment. Public Add/RemoveAt creates copy; second actual request proves source/request isolation. The action itself also executes the actual public IndexOf and exposes its expected -1/0/4 result in the HTTP response.',
  actualCorrectnessRequirements: [
    'First-match indices, misses, empty/null/duplicate references and source/copy isolation.',
    'Legacy object.Equals for both reference and value types even when IEquatable<T> deliberately differs.',
    'Stored-left equality order and short-circuiting; never evaluate later entries or reverse the receiver.',
    'Already-copied enumerator mutation detection, including return-before-next-MoveNext when equality matched.',
    'Arbitrary supplied IReadOnlyList is enumerated without Count/indexer assumptions and disposed on match/completion.',
    'Actual source enumerator disposal on Current/equality exceptions, with exact owning boundary reached.',
    'Every selected individual XML row executes and passes without a skip; original/candidate checks preserve behavior, not a semantic-bug fix.'
  ],
  timingGate: 'Median paired primary less-time at least 5%; at least two of three primary comparisons faster and at least two primary effects exceed the unchanged same-profile Contains movement. No unexplained ordinary-source adverse effect. Retain all control/short-circuit/adverse cases; no primary substitution.',
  allocationGate: 'At least 32 reported primary managed B/op saved in at least two comparisons, distinct from unchanged Contains and ordinary-source controls. Reject allocation-only qualification if ordinary-source median slowdown is at least 5%, slower in two comparisons and worse than its control in two comparisons. Prior copied-primary allocation was already reported 0 B/op, so do not promise any saving.',
  maximumTimingAuthorizationsIncludingFailedOrPartial: 3,
  comparisonOrders: [['Original', 'Candidate'], ['Candidate', 'Original'], ['Original', 'Candidate']],
  actualNoRetuningOrHistoricalReplay: true,
  benchmarkDotNet: { version: '0.13.0', runtime: '12.0.0-alpha.1.26562.105',
    warmups: 3, retained: 8, requestedIterationMilliseconds: 100, unroll: 1,
    outlierMode: 'DontRemove', settingsPreservingExecutor: true, powerPlanChangeRequested: false },
  machine: 'Shared non-isolated Windows box. Serialize builds and timing, max two MSBuild workers; no priority, affinity, power, firewall, URL ACL or OS setting changes.',
  actualPreviousFindingsPermanentlyClosed: ['F120', 'F121', 'F122'],
  publication: 'Fork-only independent baseline37 branch, exact tests/commands and connected immutable evidence. No performance PR without declared primary qualification. Open each justified new draft separately; no PR/browser launch for no-gain/rejection. Advance only F123 after remote verification, preserve the fixed report and continue the standing campaign.',
  excludedClaims: ['complete static/dynamic caller census', 'normal request/application gain', 'representative call frequency',
    'specific JIT cause', 'compiled-page/browser', 'AOT/trimming', 'packaging', 'merge readiness']
};
write('acceptance-plan.json', plan);
write('profile-definitions.json', profiles);
write('history-introduction-CopyOnWriteList.cs', introduction + '\n');
write('history-and-related-work.json', {
  candidate: 'F123', actualSourceUnchangedAtCheckedDefault: true, actualRecentOwnerHistory: recentHistory,
  actualIndexOfPresentIn2015IntroductionCommit: introductionCommit, actualIntroductionPath: introductionPath,
  actualObjectEqualsPresentInInspectedIntroduction: true,
  actualBoundedIssueMatches: issues, actualBoundedPrMatches: prs,
  actualNoCompleteRelatedWorkClaim: true, actualLspOnlyDeclarationAndNoIncomingCallsInCurrentFileCoverage: true,
  actualLspNotAWholeSolutionCallerCensus: true,
  actualFollowedSignatureHistoryInvestigatedSeparatelyNotInferredFromAnEmptyPathLocalPickaxe: true
});
write('intake-completed.json', {
  candidate: 'F123', actualCompletedAt: new Date().toISOString(), actualBaseline: baseline,
  actualCurrentDefault: actualDefault, actualCurrentDefaultCommittedAt: metadata.commit.committer.date,
  actualDefaultSourceRoot: defaultRoot, actualSelectedInputs: selected,
  actualProtectedPrimaryInputs: prior.actualProtectedPrimaryInputs,
  actualLspCoverageLimitedToCurrentFile: true, actualLspNotACompleteCallerCensus: true,
  actualAcceptancePlanSha256: sha(path.join(run, 'acceptance-plan.json')),
  actualProfileDefinitionsSha256: sha(path.join(run, 'profile-definitions.json')),
  actualPreviousFindingsPermanentlyClosed: ['F120', 'F121', 'F122']
});
write('intake-invocations.json', calls);
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
for (const item of prior.actualProtectedPrimaryInputs) assert.equal(sha(path.join(root, item.path)), item.sha256);
console.log(JSON.stringify({ candidate: 'F123', branch, actualSealedBeforeTestsAndImplementation: true,
  actualCurrentDefaultInputsMatching: selected.length, actualProfiles: profiles.length,
  actualShippingEdits: 0, actualTimingRuns: 0 }, null, 2));
