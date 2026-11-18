import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F039');
const previous = JSON.parse(fs.readFileSync(path.join(session, 'F038-final-verification.json'), 'utf8'));
const ledger = JSON.parse(fs.readFileSync(path.join(session, 'autoperf-campaign.json'), 'utf8').replace(/^\uFEFF/, ''));
const candidate = ledger.candidates.find(entry => entry.id === 'F039');
assert.equal(previous.actualAllPublicationChecksPassed, true);
assert.equal(previous.actualFinalized, 116);
assert.equal(candidate.status, 'pending');
assert.equal(candidate.finding.file, 'src/Components/Endpoints/src/TempData/TempData.cs');
assert.equal(candidate.pr_url, null);
assert.equal(fs.existsSync(run), false);
fs.mkdirSync(path.join(run, 'investigation'), { recursive: true });
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(run, 'investigation', 'executed-driver.mjs'));
const calls = [];
function capture(name, executable, args) {
  const started = new Date().toISOString();
  const result = spawnSync(executable, args, { cwd: root, maxBuffer: 16 * 1024 * 1024,
    windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  fs.writeFileSync(path.join(run, 'investigation', `${name}.stdout`), result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(path.join(run, 'investigation', `${name}.stderr`), result.stderr ?? Buffer.alloc(0));
  calls.push({ name, executable, arguments: args, actualStartedUtc: started,
    actualFinishedUtc: new Date().toISOString(), actualExitCode: result.status });
  fs.writeFileSync(path.join(run, 'investigation', 'actual-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${name}: ${result.stderr}`);
  return result.stdout;
}
const git = (name, args) => capture(name, 'git', args).toString().trim();
assert.equal(git('previous-source-head', ['rev-parse', 'HEAD']), '9c422372a360c0ef06ffcaf8d06995a8873ceaec');
assert.equal(git('previous-source-branch', ['branch', '--show-current']), 'autoperf/F038-render-tree-keyed-lookup');
assert.equal(git('previous-source-tracked-status', ['status', '--porcelain=v1', '--untracked-files=no']), '');
assert.deepEqual(git('unrelated-reports', ['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).sort(),
  ['autoperf-scan-report.md', 'autoperf-issue-70219-duplicate-report.html',
    'autoperf-issue-70219-deduplicated-report.html', 'performance-antipattern-findings.md'].sort());
assert.match(git('fork-remote', ['remote', 'get-url', 'autoperf']), /^https:\/\/github\.com\/jaslawinMs\/aspnetcore(?:\.git)?$/i);
assert.match(git('upstream-remote', ['remote', 'get-url', 'origin']), /^https:\/\/github\.com\/dotnet\/aspnetcore(?:\.git)?$/i);
const branch = 'autoperf/F039-tempdata-contains-lookup';
assert.equal(git('independent-branch-absence', ['branch', '--list', branch]), '');
git('independent-baseline-checkout', ['switch', '--quiet', '-c', branch, ledger.baseline_revision]);
assert.equal(git('independent-baseline-head', ['rev-parse', 'HEAD']), ledger.baseline_revision);
const current = JSON.parse(capture('current-default-before', 'gh', ['api', 'repos/dotnet/aspnetcore/branches/main']).toString());
const currentDefault = current.commit.sha;
git('fetch-current-main', ['fetch', '--quiet', 'origin', 'main']);
assert.equal(git('current-default-available', ['rev-parse', `${currentDefault}^{commit}`]), currentDefault);
const files = [
  'src/Components/Endpoints/src/TempData/TempData.cs',
  'src/Components/Endpoints/src/TempData/ITempData.cs',
  'src/Components/Endpoints/src/TempData/TempDataProviderServiceCollectionExtensions.cs',
  'src/Components/Endpoints/src/TempData/TempDataCascadingValueSupplier.cs',
  'src/Components/Endpoints/src/DependencyInjection/TempDataService.cs',
  'src/Components/Endpoints/src/Microsoft.AspNetCore.Components.Endpoints.csproj',
  'src/Components/Endpoints/test/TempData/TempDataTest.cs',
  'src/Components/Endpoints/test/TempData/CookieTempDataProviderTest.cs',
  'src/Components/Endpoints/test/Microsoft.AspNetCore.Components.Endpoints.Tests.csproj',
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const pairs = files.map((file, index) => {
  const prefix = String(index + 1).padStart(3, '0');
  const original = capture(`${prefix}-baseline-blob`, 'git', ['show', `${ledger.baseline_revision}:${file}`]);
  const fresh = capture(`${prefix}-default-blob`, 'git', ['show', `${currentDefault}:${file}`]);
  return { file, actualBaselineBlobSha256: sha(original), actualCurrentDefaultBlobSha256: sha(fresh),
    actualDefaultEqualsBaseline: original.equals(fresh), actualWorkingTreeRawSha256: sha(fs.readFileSync(path.join(root, file))) };
});
git('tempdata-owner-follow-history', ['--no-pager', 'log', '--follow', '-n', '12',
  '--format=%H%x09%aI%x09%s', currentDefault, '--', files[0]]);
const searches = [
  ['open-tempdata-proposals', 'repo:dotnet/aspnetcore is:pr is:open TempData'],
  ['tempdata-contains-proposals', 'repo:dotnet/aspnetcore is:pr TempData Contains'],
  ['tempdata-trygetvalue-proposals', 'repo:dotnet/aspnetcore is:pr TempData TryGetValue'],
  ['tempdata-performance-issues', 'repo:dotnet/aspnetcore is:issue TempData performance'],
];
const queryResults = searches.map(([name, query]) => {
  const result = JSON.parse(capture(name, 'gh', ['api', '--method', 'GET', 'search/issues',
    '-f', `q=${query}`, '-f', 'per_page=50']).toString());
  return { query, actualTotalCount: result.total_count, actualReturned: result.items.length,
    actualIncomplete: result.incomplete_results,
    items: result.items.map(item => ({ number: item.number, title: item.title, url: item.html_url, state: item.state })) };
});
const investigation = {
  candidate: 'F039', actualIndependentBranch: branch, baseline: ledger.baseline_revision,
  actualFreshDefault: currentDefault, actualSelectedSourcePairs: pairs,
  actualSelectedBaselineMatches: pairs.filter(pair => pair.actualDefaultEqualsBaseline).length,
  actualShippingCodeEdits: 0, actualSourceComparisons: 0,
  actualPendingF040RemovalSeamIntentionallyExcluded: true,
  actualLocalLspOnlyReturnedFourSameFileClassReferences: true,
  actualCrossProjectCallerCompletenessEstablishedByLsp: false,
  actualPublicProducerIdentifiedInSource: 'Razor component ITempData cascading value -> GetOrCreateTempData -> TempDataService.CreateEmpty -> TempData with real provider load callback',
  actualPublicDictionaryTryGetValueIsConsumingAndNotASafeReplacement: true,
  actualCandidateHypothesisNotYetImplemented: 'Use the private Data dictionary TryGetValue directly in ICollection.Contains; preserve missing-vs-null, case-insensitive keys, object equality and retention.',
  actualBoundedExistingWorkQueries: queryResults, actualNewScanOrTelemetryRun: false,
  actualAllMatchingCardsAlreadyCoveredByRestoredScan: true,
  actualNextStep: 'Inspect any default drift/history/proposals, define acceptance and establish the original public producer, saved-cookie behavior and owning tests before editing.',
};
fs.writeFileSync(path.join(run, 'investigation.json'), JSON.stringify(investigation, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F039', actualIndependentBranch: branch,
  actualFreshDefault: currentDefault, actualSelectedPairs: pairs.length,
  actualSelectedBaselineMatches: investigation.actualSelectedBaselineMatches,
  actualHistory: git('tempdata-history-summary', ['--no-pager', 'log', '--follow', '-n', '4',
    '--format=%H%x09%s', currentDefault, '--', files[0]]),
  actualExistingWork: queryResults, actualShippingEdits: 0, actualSourceComparisons: 0 }, null, 2));
