import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F040');
const previous = JSON.parse(fs.readFileSync(path.join(session, 'F039-final-verification.json'), 'utf8'));
const ledger = JSON.parse(fs.readFileSync(path.join(session, 'autoperf-campaign.json'), 'utf8').replace(/^\uFEFF/, ''));
const candidate = ledger.candidates.find(entry => entry.id === 'F040');
assert.equal(previous.actualAllPublicationChecksPassed, true);
assert.equal(previous.actualFinalized, 117);
assert.equal(candidate.status, 'pending');
assert.equal(candidate.pr_url, null);
assert.equal(candidate.finding.card_id, 'dictionary-containskey-before-indexer');
assert.equal(candidate.finding.file, 'src/Components/Endpoints/src/TempData/TempData.cs');
assert.equal(fs.existsSync(run), false);
const output = path.join(run, 'investigation');
fs.mkdirSync(output, { recursive: true });
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(output, 'executed-driver.mjs'));
const invocations = [];
function capture(name, executable, args) {
  const started = new Date().toISOString();
  const result = spawnSync(executable, args, { cwd: root, maxBuffer: 32 * 1024 * 1024,
    windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  fs.writeFileSync(path.join(output, `${name}.stdout`), result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(path.join(output, `${name}.stderr`), result.stderr ?? Buffer.alloc(0));
  invocations.push({ name, executable, arguments: args, actualStartedUtc: started,
    actualFinishedUtc: new Date().toISOString(), actualExitCode: result.status });
  fs.writeFileSync(path.join(output, 'actual-invocations.json'), JSON.stringify(invocations, null, 2) + '\n');
  assert.equal(result.status, 0, `${name}: ${result.stderr}`);
  return result.stdout;
}
const git = (name, args) => capture(name, 'git', args).toString().trim();
const hash = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const branch = 'autoperf/F040-tempdata-remove-lookup';
assert.equal(git('independent-source-head', ['rev-parse', 'HEAD']), ledger.baseline_revision);
assert.equal(git('independent-source-branch', ['branch', '--show-current']), branch);
assert.equal(git('independent-source-tracked-status', ['status', '--porcelain=v1', '--untracked-files=no']), '');
assert.deepEqual(git('unrelated-reports', ['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).sort(),
  ['autoperf-scan-report.md', 'autoperf-issue-70219-duplicate-report.html',
    'autoperf-issue-70219-deduplicated-report.html', 'performance-antipattern-findings.md'].sort());
assert.match(git('fork-remote', ['remote', 'get-url', 'autoperf']), /^https:\/\/github\.com\/jaslawinMs\/aspnetcore(?:\.git)?$/i);
assert.match(git('upstream-remote', ['remote', 'get-url', 'origin']), /^https:\/\/github\.com\/dotnet\/aspnetcore(?:\.git)?$/i);
const current = JSON.parse(capture('current-default-before', 'gh', ['api', 'repos/dotnet/aspnetcore/branches/main']).toString());
const currentDefault = current.commit.sha;
git('fetch-current-main', ['fetch', '--quiet', 'origin', 'main']);
assert.equal(git('current-default-available', ['rev-parse', `${currentDefault}^{commit}`]), currentDefault);
const selected = [
  'src/Components/Endpoints/src/TempData/TempData.cs',
  'src/Components/Endpoints/src/TempData/ITempData.cs',
  'src/Components/Endpoints/src/TempData/TempDataProviderServiceCollectionExtensions.cs',
  'src/Components/Endpoints/src/TempData/TempDataCascadingValueSupplier.cs',
  'src/Components/Endpoints/src/DependencyInjection/TempDataService.cs',
  'src/Components/Endpoints/src/Microsoft.AspNetCore.Components.Endpoints.csproj',
  'src/Components/Endpoints/test/TempData/TempDataTest.cs',
  'src/Components/Endpoints/test/TempData/CookieTempDataProviderTest.cs',
  'src/Components/Endpoints/test/Microsoft.AspNetCore.Components.Endpoints.Tests.csproj',
  'src/Components/Endpoints/src/Results/RazorComponentResult.cs',
  'src/Components/Endpoints/src/Results/RazorComponentResultOfT.cs',
  'src/Components/Endpoints/src/Results/RazorComponentResultExecutor.cs',
  'src/Components/Endpoints/src/Rendering/EndpointHtmlRenderer.cs',
  'src/Components/Endpoints/src/Rendering/EndpointHtmlRenderer.Prerendering.cs',
  'src/Components/Endpoints/src/RazorComponentEndpointInvoker.cs',
  'src/Components/Endpoints/src/DependencyInjection/RazorComponentsServiceCollectionExtensions.cs',
  'src/Components/Endpoints/src/TempData/CookieTempDataProvider.cs',
  'src/Components/test/E2ETest/Tests/TempDataCookieTest.cs',
];
const pairs = selected.map((file, index) => {
  const prefix = String(index + 1).padStart(3, '0');
  const baseline = capture(`${prefix}-baseline-blob`, 'git', ['show', `${ledger.baseline_revision}:${file}`]);
  const fresh = capture(`${prefix}-default-blob`, 'git', ['show', `${currentDefault}:${file}`]);
  if (!baseline.equals(fresh))
    capture(`${prefix}-default-drift`, 'git', ['--no-pager', 'diff', ledger.baseline_revision, currentDefault, '--', file]);
  return { file, actualBaselineBlobSha256: hash(baseline), actualDefaultBlobSha256: hash(fresh),
    actualDefaultEqualsBaseline: baseline.equals(fresh),
    actualWorkingTreeRawSha256: hash(fs.readFileSync(path.join(root, file))) };
});
const target = selected[0];
git('owner-follow-history', ['--no-pager', 'log', '--follow', '-n', '12',
  '--format=%H%x09%aI%x09%s', currentDefault, '--', target]);
capture('lazy-load-contract-fix', 'git', ['--no-pager', 'show', '--format=fuller',
  'e55796c6188a4b94f79129aa0a4eb7dafd2b31f6', '--', target, selected[6]]);
capture('serialization-owner-history', 'git', ['--no-pager', 'show', '--format=fuller',
  '2daa22c6508224fcc2f6d0d8fa576d0148545c46', '--', target]);
const proposal = JSON.parse(capture('authoritative-feature-design', 'gh',
  ['api', 'repos/dotnet/aspnetcore/issues/65039']).toString());
const queries = [
  ['open-tempdata-proposals', 'repo:dotnet/aspnetcore is:pr is:open TempData'],
  ['tempdata-remove-proposals', 'repo:dotnet/aspnetcore is:pr TempData Remove'],
  ['tempdata-trygetvalue-proposals', 'repo:dotnet/aspnetcore is:pr TempData TryGetValue'],
  ['tempdata-performance-issues', 'repo:dotnet/aspnetcore is:issue TempData performance'],
].map(([name, query]) => {
  const result = JSON.parse(capture(name, 'gh', ['api', '--method', 'GET', 'search/issues',
    '-f', `q=${query}`, '-f', 'per_page=50']).toString());
  assert.equal(result.incomplete_results, false);
  return { query, actualTotalCount: result.total_count, actualReturned: result.items.length,
    actualIncomplete: result.incomplete_results,
    items: result.items.map(item => ({ number: item.number, title: item.title, url: item.html_url, state: item.state })) };
});
const work = [];
for (const item of queries[0].items) {
  const files = JSON.parse(capture(`open-${item.number}-all-files`, 'gh',
    ['api', '--paginate', '--slurp', `repos/dotnet/aspnetcore/pulls/${item.number}/files?per_page=100`]).toString()).flat();
  work.push({ number: item.number, actualChangedFilesChecked: files.length,
    actualOwnerFileChanges: files.filter(file => file.filename === target),
    actualTempDataRelatedFiles: files.filter(file => /TempData|StoredDataSerializer/.test(file.filename))
      .map(file => ({ filename: file.filename, status: file.status, patch: file.patch })) });
}
const friends = git('existing-real-friend-projects', ['ls-files',
  '*Microsoft.AspNetCore.Components.Endpoints.Microbenchmarks.csproj',
  '*Microsoft.AspNetCore.Components.Endpoints.Tests.csproj',
  '*Microsoft.AspNetCore.Mvc.TagHelpers.Test.csproj']).split(/\r?\n/);
const result = {
  candidate: 'F040', actualIndependentBranch: branch, baseline: ledger.baseline_revision,
  actualFreshDefault: currentDefault, actualAllSelectedPairs: pairs,
  actualAllSelectedBaselineMatches: pairs.filter(pair => pair.actualDefaultEqualsBaseline).length,
  actualHistoryAndAuthoritativeDesignCaptured: true, actualFeatureProposal: proposal.html_url,
  actualBoundedExistingWorkQueries: queries, actualOpenProposalsAudited: work,
  actualBoundedOpenWorkChangesTargetOwner: work.some(item => item.actualOwnerFileChanges.length),
  actualNoGlobalAbsenceOrNoveltyClaim: true, actualExistingFriendProjects: friends,
  actualExistingDynamicProxyFriendIsGeneratedAndAllSignaturesWillBePreserved: true,
  actualClassification: 'Behavior-preserving replacement of redundant private dictionary lookup calls in one existing explicit collection Remove condition; no entry point, annotation, interface, default, TFM or generated source changes.',
  actualPublicDictionaryTryGetValueConsumesRetentionAndIsNotASafeReplacement: true,
  actualCandidateHypothesisNotYetImplemented: 'Use private Data.TryGetValue then the same stored-value-first Equals; preserve the existing if branch, final Remove(key), retained-key maintenance and its returned Boolean even after reentrant equality.',
  actualF039ContainsOptimizationAndTestsNotInherited: true,
  actualPublicOwnerFactory: 'RazorComponentResult + real EndpointHtmlRenderer + registered ITempData cascade + TempDataService.CreateEmpty with actual cookie-provider callback',
  actualMemoryResponseCaptureDoesNotExecuteEndpointInvokerCookiePersistence: true,
  actualPersistenceBoundary: 'Actual routed canonical static-SSR sample and real cookie-bearing navigations; not a manually called callback.',
  actualExistingPermanentSuite: 'TempDataCookieTest adjacent persistence and unchanged public string-key removal controls',
  actualPreexistingQuarantineExcludedFromPassingCount: 'TempDataCookieTest.TempDataPersistWithoutAccessing, dotnet/aspnetcore#70085',
  actualShippingCodeEdits: 0, actualSourceComparisons: 0, actualNewScanOrTelemetryRun: false,
};
fs.writeFileSync(path.join(run, 'investigation.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
assert.equal(pairs.every(pair => pair.actualDefaultEqualsBaseline), true, 'Inspect current-default drift before selecting a candidate.');
assert.equal(result.actualBoundedOpenWorkChangesTargetOwner, false, 'Inspect overlapping existing work before selecting a candidate.');
console.log(JSON.stringify({ candidate: result.candidate, actualFreshDefault: currentDefault,
  actualSelectedPairs: pairs.length, actualBaselineMatches: result.actualAllSelectedBaselineMatches,
  actualExistingWork: queries, actualOpenOwnersChanged: result.actualBoundedOpenWorkChangesTargetOwner,
  actualExistingFriendProjects: friends, actualShippingEdits: 0, actualSourceComparisons: 0 }, null, 2));
