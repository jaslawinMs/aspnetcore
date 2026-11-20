import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = 'C:\\src\\aspnetcore';
const defaultRoot = 'C:\\src\\autoperf-F042-default';
const run = path.join(session, 'autoperf-runs', 'F126');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F126-cache-deterministic-sample-endpoint-policies';
const sample = 'src/Security/samples/CustomPolicyProvider/';
const owner = sample + 'Authorization/MinimumAgePolicyProvider.cs';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
assert.equal(fs.existsSync(run), false, 'Inspect any previous or partial intake.');
const campaign = read(path.join(session, 'autoperf-campaign.json'));
assert.equal(campaign.candidates.find(item => item.status === 'pending').id, 'F126');
const previous = read(path.join(session, 'autoperf-runs', 'F124', 'verified-final-publication.json'));
assert.equal(previous.actualCampaignFinalized, 129);
fs.mkdirSync(run, { recursive: true });
const calls = [];
function execute(executable, args, cwd = root) {
  const result = spawnSync(executable, args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  calls.push({ executable, arguments: args, cwd, exitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(path.join(run, 'discovery-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trimEnd();
}
const git = args => execute('git', ['--no-pager', ...args]);
function write(name, value) {
  const file = path.join(run, ...name.split('/'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
assert.equal(git(['branch', '--show-current']), 'autoperf/F124-bounded-program-analyzer-traversal');
assert.equal(git(['rev-parse', 'HEAD']), '720598d890234636942304ec853a598f41a1e985');
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
assert.match(git(['remote', 'get-url', 'origin']), /github\.com[:/]dotnet\/aspnetcore(?:\.git)?$/i);
assert.match(git(['remote', 'get-url', 'autoperf']), /github\.com[:/]jaslawinMs\/aspnetcore(?:\.git)?$/i);
assert.equal(git(['ls-remote', '--heads', 'autoperf', 'refs/heads/' + branch]), '');
assert.equal(execute('git', ['status', '--porcelain', '--untracked-files=no'], defaultRoot), '');
const priorDefault = execute('git', ['rev-parse', 'HEAD'], defaultRoot);
const protectedInputs = read(path.join(session, 'autoperf-runs', 'F124', 'intake-completed.json')).actualProtectedPrimaryInputs;
const reports = read(path.join(session, 'autoperf-runs', 'F124', 'source-publication.json')).actualUnrelatedReportHashesPreserved;
for (const item of protectedInputs) {
  assert.equal(sha(path.join(root, item.path)), item.sha256);
}
for (const [file, expected] of Object.entries(reports)) {
  assert.equal(sha(path.join(root, file)), expected);
}
const defaultBranch = execute('gh', ['api', 'repos/dotnet/aspnetcore', '--jq', '.default_branch']);
assert.equal(defaultBranch, 'main');
git(['fetch', '--no-tags', 'origin', defaultBranch]);
const actualDefault = git(['rev-parse', 'origin/' + defaultBranch]);
const metadata = JSON.parse(execute('gh', ['api', 'repos/dotnet/aspnetcore/commits/' + actualDefault,
  '--jq', '{sha: .sha, commit: .commit, html_url: .html_url}']));
const sampleInputs = git(['ls-tree', '-r', '--name-only', baseline, '--', sample]).split(/\r?\n/)
  .filter(file => /\.(cs|cshtml|csproj|json|md)$/i.test(file));
assert.ok(sampleInputs.includes(owner));
const additional = [
  'src/Security/Authorization/Core/src/IAuthorizationPolicyProvider.cs',
  'src/Security/Authorization/Core/src/DefaultAuthorizationPolicyProvider.cs',
  'src/Security/Authorization/Policy/src/AuthorizationMiddleware.cs',
  'src/Security/Authorization/Policy/src/AuthorizationPolicyCache.cs',
  'src/Security/Authorization/test/AuthorizationMiddlewareTests.cs',
  'src/Security/Authorization/test/Microsoft.AspNetCore.Authorization.Test.csproj',
  'src/Security/test/AuthSamples.FunctionalTests/CustomPolicyProviderTests.cs',
  'src/Security/test/AuthSamples.FunctionalTests/AuthSamples.FunctionalTests.csproj',
  'src/Mvc/Mvc.Core/src/ApplicationModels/AuthorizationApplicationModelProvider.cs'
];
const selected = [...sampleInputs, ...additional].map(source => {
  const original = git(['show', baseline + ':' + source]);
  const current = git(['show', actualDefault + ':' + source]);
  write('intake-source/original/' + source, original + '\n');
  write('intake-source/current-default/' + source, current + '\n');
  return { path: source, originalGitBlob: git(['rev-parse', baseline + ':' + source]),
    actualDefaultGitBlob: git(['rev-parse', actualDefault + ':' + source]), actualNormalizedTextMatches: current === original };
});
const recentHistory = git(['log', '--follow', '-8', '--format=%H %cI %s', actualDefault, '--', owner]);
const providerParsingHistory = git(['log', '--follow', '-S', 'policyName.Substring', '--format=%H %cI %s', actualDefault, '--', owner]);
const cacheFlagHistory = git(['log', '-S', 'AllowsCachingPolicies', '--format=%H %cI %s', actualDefault, '--',
  'src/Security/Authorization/Core/src/IAuthorizationPolicyProvider.cs']);
const issues = JSON.parse(execute('gh', ['search', 'issues', '"MinimumAgePolicyProvider"', '--repo', 'dotnet/aspnetcore',
  '--limit', '30', '--json', 'number,title,state,url']));
const prs = JSON.parse(execute('gh', ['search', 'prs', '"MinimumAgePolicyProvider"', '--repo', 'dotnet/aspnetcore',
  '--limit', '30', '--json', 'number,title,state,url']));
const cachePrs = JSON.parse(execute('gh', ['search', 'prs', '"AllowsCachingPolicies"', '--repo', 'dotnet/aspnetcore',
  '--limit', '30', '--json', 'number,title,state,url']));
execute('git', ['switch', '--detach', actualDefault], defaultRoot);
assert.equal(execute('git', ['status', '--porcelain', '--untracked-files=no'], defaultRoot), '');
git(['switch', '--no-track', '-c', branch, baseline]);
for (const item of selected) {
  item.originalPhysicalSha256 = sha(path.join(root, ...item.path.split('/')));
}
for (const item of protectedInputs) {
  assert.equal(sha(path.join(root, item.path)), item.sha256);
}
write('history-and-related-work.json', {
  candidate: 'F126', actualRecentOwnerHistory: recentHistory,
  actualProviderSubstringHistory: providerParsingHistory, actualInterfaceCacheFlagHistory: cacheFlagHistory,
  actualBoundedIssueMatches: issues, actualBoundedOwnerPrMatches: prs, actualBoundedCacheFlagPrMatches: cachePrs,
  actualRelatedLedgerEntries: campaign.candidates.filter(item => item.finding.file === owner),
  actualNoCompleteRelatedWorkClaim: true,
  actualRemoteSemanticLookupUnavailable: 'GitHub indexed semantic tool returned HTTP 404 for dotnet/aspnetcore; configured ADO code intelligence covers unrelated msazure/One.',
  actualLspBoundary: 'Current-file document symbols available. Interface definition lookup returned no definition; workspace-symbol lookup returned no symbols. References returned only declaration/constructor, not the actual Startup producer. No global resolved caller census is claimed.',
  actualOwningProducerRead: 'Actual sample Startup registers this singleton, UseRouting/UseAuthentication/UseAuthorization and MVC controller endpoints. AuthorizationMiddleware reads the actual AllowsCachingPolicies flag; MVC endpoint-routing branch delegates to that middleware. Cache belongs to framework endpoint data source and its change-token lifetime.'
});
write('discovery-completed.json', {
  candidate: 'F126', actualCompletedAt: new Date().toISOString(), actualBaseline: baseline, branch,
  actualCurrentDefault: actualDefault, actualCurrentDefaultCommittedAt: metadata.commit.committer.date,
  actualDefaultBranch: defaultBranch, actualPriorDefaultCheckoutCommit: priorDefault, actualDefaultSourceRoot: defaultRoot,
  actualSelectedInputs: selected, actualMatchingSelectedInputs: selected.filter(item => item.actualNormalizedTextMatches).length,
  actualChangedSelectedInputs: selected.filter(item => !item.actualNormalizedTextMatches).map(item => item.path),
  actualProtectedPrimaryInputs: protectedInputs, actualUnrelatedReportHashesPreserved: reports,
  actualDefaultGlobalJsonSha256: sha(path.join(defaultRoot, 'global.json')),
  originalFinding: campaign.candidates.find(item => item.id === 'F126').finding,
  actualShippingEditsAtDiscovery: 0, actualNewTestsAuthoredAtDiscovery: 0, actualTimingRunsAtDiscovery: 0,
  actualAcceptancePlanNotYetSealed: true, actualPreviousF124PermanentlyClosed: true
});
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
console.log(JSON.stringify({ candidate: 'F126', branch, actualCurrentDefault: actualDefault,
  actualSelectedInputs: selected.length, actualChangedInputs: selected.filter(item => !item.actualNormalizedTextMatches).map(item => item.path),
  actualRecentOwnerHistory: recentHistory, actualProviderSubstringHistory: providerParsingHistory,
  actualInterfaceCacheFlagHistory: cacheFlagHistory, actualBoundedOwnerIssues: issues,
  actualBoundedOwnerPrs: prs, actualBoundedCacheFlagPrs: cachePrs,
  actualSourceEdits: 0, actualNewTests: 0, actualTimingRuns: 0 }, null, 2));
