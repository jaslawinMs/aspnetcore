import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const defaultRoot = String.raw`C:\src\autoperf-F042-default`;
const run = path.join(session, 'autoperf-runs', 'F124');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F124-bounded-program-analyzer-traversal';
const area = 'src/Framework/AspNetCoreAnalyzers/';
const owner = area + 'src/Analyzers/WebApplicationBuilder/PublicPartialProgramClassAnalyzer.cs';
const selectedPaths = [
  owner, area + 'src/Analyzers/Microsoft.AspNetCore.App.Analyzers.csproj',
  area + 'src/Analyzers/DiagnosticDescriptors.cs', area + 'src/Analyzers/Resources.resx',
  area + 'src/CodeFixes/PublicPartialProgramClassFixer.cs',
  area + 'test/WebApplicationBuilder/PublicPartialProgramClassTest.cs',
  area + 'test/Microsoft.AspNetCore.App.Analyzers.Test.csproj',
  area + 'test/Verifiers/CSharpCodeFixVerifier.cs', area + 'test/Verifiers/CSharpAnalyzerVerifier.cs'
];
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
assert.equal(fs.existsSync(run), false, 'Inspect and resume a partial intake instead of replacing it.');
const campaign = read(path.join(session, 'autoperf-campaign.json'));
assert.equal(campaign.candidates.find(item => item.status === 'pending').id, 'F124');
const previous = read(path.join(session, 'autoperf-runs', 'F123', 'verified-final-publication.json'));
assert.equal(previous.actualCampaignFinalized, 128);
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
assert.equal(git(['branch', '--show-current']), 'autoperf/F123-copy-on-write-indexof');
assert.equal(git(['rev-parse', 'HEAD']), '8f72875eb6c2a108e529b93714dd56e3d8e0c154');
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
assert.match(git(['remote', 'get-url', 'origin']), /github\.com[:/]dotnet\/aspnetcore(?:\.git)?$/i);
assert.match(git(['remote', 'get-url', 'autoperf']), /github\.com[:/]jaslawinMs\/aspnetcore(?:\.git)?$/i);
assert.equal(git(['ls-remote', '--heads', 'autoperf', 'refs/heads/' + branch]), '');
assert.equal(execute('git', ['status', '--porcelain', '--untracked-files=no'], defaultRoot), '');
const priorDefault = execute('git', ['rev-parse', 'HEAD'], defaultRoot);
const protectedInputs = read(path.join(session, 'autoperf-runs', 'F123', 'intake-completed.json')).actualProtectedPrimaryInputs;
for (const item of protectedInputs) assert.equal(sha(path.join(root, item.path)), item.sha256);
const defaultBranch = execute('gh', ['api', 'repos/dotnet/aspnetcore', '--jq', '.default_branch']);
assert.equal(defaultBranch, 'main');
git(['fetch', '--no-tags', 'origin', defaultBranch]);
const actualDefault = git(['rev-parse', 'origin/' + defaultBranch]);
const metadata = JSON.parse(execute('gh', ['api', 'repos/dotnet/aspnetcore/commits/' + actualDefault,
  '--jq', '{sha: .sha, commit: .commit, html_url: .html_url}']));
const selected = selectedPaths.map(source => {
  const original = git(['show', baseline + ':' + source]);
  const current = git(['show', actualDefault + ':' + source]);
  assert.equal(current, original, 'Reconcile changed current-default input before designing the experiment: ' + source);
  write('intake-source/original/' + source, original + '\n');
  write('intake-source/current-default/' + source, current + '\n');
  return { path: source, originalGitBlob: git(['rev-parse', baseline + ':' + source]),
    actualDefaultGitBlob: git(['rev-parse', actualDefault + ':' + source]), actualNormalizedTextMatches: true };
});
const recentHistory = git(['log', '--follow', '-8', '--format=%H %cI %s', actualDefault, '--', owner]);
const introductionMatches = git(['log', '--follow', '-S', 'DescendantNodes().Count() > 1',
  '--format=%H %cI %s', actualDefault, '--', owner]);
assert.ok(introductionMatches.length > 0, 'Inspect a positive historical occurrence rather than inferring an introduction.');
const introduction = introductionMatches.split(/\r?\n/)[0].split(' ')[0];
const introductionPath = git(['diff-tree', '--no-commit-id', '--name-only', '-r', introduction])
  .split(/\r?\n/).find(file => file.endsWith('/PublicPartialProgramClassAnalyzer.cs'));
assert.ok(introductionPath);
const introductionSource = git(['show', introduction + ':' + introductionPath]);
assert.ok(introductionSource.includes('DescendantNodes().Count() > 1'));
write('history-introduction-PublicPartialProgramClassAnalyzer.cs', introductionSource + '\n');
const issues = JSON.parse(execute('gh', ['search', 'issues', '"PublicPartialProgramClass"', '--repo', 'dotnet/aspnetcore',
  '--limit', '20', '--json', 'number,title,state,url']));
const prs = JSON.parse(execute('gh', ['search', 'prs', '"PublicPartialProgramClass"', '--repo', 'dotnet/aspnetcore',
  '--limit', '20', '--json', 'number,title,state,url']));
execute('git', ['switch', '--detach', actualDefault], defaultRoot);
assert.equal(execute('git', ['status', '--porcelain', '--untracked-files=no'], defaultRoot), '');
git(['switch', '--no-track', '-c', branch, baseline]);
for (const item of selected) item.originalPhysicalSha256 = sha(path.join(root, item.path));
for (const item of protectedInputs) assert.equal(sha(path.join(root, item.path)), item.sha256);
write('history-and-related-work.json', {
  candidate: 'F124', actualRecentOwnerHistory: recentHistory,
  actualPositiveCountThresholdHistory: introductionMatches,
  actualVerifiedHistoricalCommit: introduction, actualVerifiedHistoricalPath: introductionPath,
  actualBoundedIssueMatches: issues, actualBoundedPrMatches: prs,
  actualNoCompleteRelatedWorkClaim: true,
  actualLspReferencesInCurrentFile: [
    { path: owner, line: 25, role: 'registered ClassDeclaration syntax-node action calls the predicate' },
    { path: owner, line: 34, role: 'private predicate definition' }
  ],
  actualWorkspaceSymbolLookupReturnedNoGlobalSymbols: true,
  actualLspNotACompleteCallerCensus: true
});
write('discovery-completed.json', {
  candidate: 'F124', actualCompletedAt: new Date().toISOString(), actualBaseline: baseline, branch,
  actualCurrentDefault: actualDefault, actualCurrentDefaultCommittedAt: metadata.commit.committer.date,
  actualDefaultBranch: defaultBranch, actualPriorDefaultCheckoutCommit: priorDefault, actualDefaultSourceRoot: defaultRoot,
  actualSelectedInputs: selected, actualProtectedPrimaryInputs: protectedInputs,
  actualDefaultGlobalJsonSha256: sha(path.join(defaultRoot, 'global.json')),
  originalFinding: campaign.candidates.find(item => item.id === 'F124').finding,
  actualShippingEditsAtDiscovery: 0, actualNewTestsAuthoredAtDiscovery: 0, actualTimingRunsAtDiscovery: 0,
  actualAcceptancePlanNotYetSealed: true, actualPreviousF123PermanentlyClosed: true
});
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
console.log(JSON.stringify({ candidate: 'F124', branch, actualCurrentDefault: actualDefault,
  actualMatchingSelectedInputs: selected.length, actualHistoricalCountThresholdCommit: introduction,
  actualSourceEdits: 0, actualNewTests: 0, actualTimingRuns: 0 }, null, 2));
