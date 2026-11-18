import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F042');
const root = 'C:\\src\\aspnetcore';
const branch = 'autoperf/F042-json-patch-dictionary-replace';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const ledger = read(path.join(session, 'autoperf-campaign.json'));
const entry = ledger.candidates.find(item => item.id === 'F042');
assert.equal(entry.status, 'pending');
assert.equal(entry.pr_url, null);
assert.equal(fs.existsSync(run), false, 'Inspect existing case work; do not overwrite or reset it.');
fs.mkdirSync(run);
const calls = [];
const execute = (executable, args, expectedExitCodes = [0]) => {
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  calls.push({ executable, arguments: args, actualExitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(path.join(run, 'intake-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.ok(expectedExitCodes.includes(result.status), `${executable} ${args.join(' ')}\n${result.stderr}`);
  return result;
};
const git = args => execute('git', args).stdout.trim();
const api = endpoint => JSON.parse(execute('gh', ['api', endpoint]).stdout);
const save = (name, data) => fs.writeFileSync(path.join(run, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const previous = read(path.join(session, 'autoperf-runs', 'F041', 'source-inputs.json'));
assert.equal(git(['rev-parse', 'HEAD']), previous.baseline);
assert.equal(git(['branch', '--show-current']), previous.branch);
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
for (const item of previous.preservedUntrackedReports) {
  assert.equal(sha256(fs.readFileSync(path.join(root, item.path))), item.sha256);
}
const origin = new URL(git(['remote', 'get-url', 'origin']));
assert.equal(origin.hostname, 'github.com');
assert.equal(origin.pathname.replace(/\.git$/, '').toLowerCase(), '/dotnet/aspnetcore');
const fork = new URL(git(['remote', 'get-url', 'autoperf']));
assert.equal(fork.pathname.replace(/\.git$/, '').toLowerCase(), '/jaslawinms/aspnetcore');
assert.equal(git(['branch', '--list', branch]), '');
assert.equal(git(['ls-remote', '--heads', 'autoperf', `refs/heads/${branch}`]), '');
save('finding.json', { id: 'F042', ...entry.finding });
save('campaign-entry-at-start.json', entry);
const repository = api('repos/dotnet/aspnetcore');
assert.equal(repository.full_name.toLowerCase(), 'dotnet/aspnetcore');
const upstreamRef = api(`repos/dotnet/aspnetcore/git/ref/heads/${repository.default_branch}`);
const baseline = upstreamRef.object.sha;
save('current-default-ref.json', { repository: repository.full_name, defaultBranch: repository.default_branch,
  actualCapturedUtc: new Date().toISOString(), actualRef: upstreamRef });
const objectCheck = execute('git', ['cat-file', '-e', `${baseline}^{commit}`], [0, 1, 128]);
if (objectCheck.status !== 0) git(['fetch', '--no-tags', 'origin', baseline]);
const changed = git(['diff', '--name-only', previous.baseline, baseline]).split(/\r?\n/).filter(Boolean);
assert.deepEqual(changed.filter(file => /(^|\/)(global\.json|package(?:-lock)?\.json|nuget\.config)$/i.test(file)), [],
  'Do not change a protected dependency manifest while selecting the fresh-default baseline.');
save('baseline-selection.json', { previousBranch: previous.branch, previousCommit: previous.baseline,
  branch, actualNewBaseline: baseline, actualBaselineIsCapturedCurrentDefault: true,
  actualChangedTrackedPathsAtBranchSwitch: changed,
  actualProtectedManifestChanged: false, actualSourceOptimizationEditPerformed: false });
git(['switch', '--create', branch, baseline]);
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
const prefix = 'src/Features/JsonPatch.SystemTextJson/';
const selected = [
  'src/Internal/DictionaryAdapterOfTU.cs', 'src/Internal/ConversionResultProvider.cs',
  'src/Internal/ConversionResult.cs', 'src/Adapters/AdapterFactory.cs', 'src/Adapters/ObjectAdapter.cs',
  'src/Internal/IAdapter.cs', 'src/JsonPatchDocument.cs', 'src/Operations/Operation.cs',
  'src/Converters/JsonPatchDocumentConverter.cs', 'src/Microsoft.AspNetCore.JsonPatch.SystemTextJson.csproj',
  'test/Internal/DictionaryAdapterTest.cs', 'test/IntegrationTests/DictionaryIntegrationTest.cs',
  'test/Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.csproj'
].map(file => prefix + file);
const files = selected.map(relative => {
  const actual = path.join(root, ...relative.split('/'));
  const destination = path.join(run, 'source-files', ...relative.split('/'));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(actual, destination);
  const baselineBlob = git(['rev-parse', `${baseline}:${relative}`]);
  const previousBlob = git(['rev-parse', `${previous.baseline}:${relative}`]);
  assert.equal(git(['hash-object', '--', relative]), baselineBlob, relative);
  return { path: relative.replaceAll('/', '\\'), bytes: fs.statSync(actual).size,
    sha256: sha256(fs.readFileSync(actual)), baselineBlob, previousBlob,
    actualCanonicalContentMatchesPreviousBaseline: baselineBlob === previousBlob };
});
const sourceInputs = { candidate: 'F042', baseline, branch,
  actualBaselineIsCapturedCurrentDefault: true, capturedDefaultBranch: repository.default_branch,
  previousCampaignBaseline: previous.baseline, sourceFiles: files,
  preservedUntrackedReports: previous.preservedUntrackedReports,
  codeIntelligenceBoundary: {
    bluebirdConnection: 'msazure/One project-wide; not this GitHub repository.',
    githubSemanticSearch: 'HTTP404: requested dotnet/aspnetcore could not be resolved by that tool.',
    lsp: 'File document symbols work; workspace lookup returns none; TryReplace references return only its declaration; related definitions do not resolve.',
    fallback: 'Bounded known-file reads and relevant-area globs. Runtime producer validation still required; no complete resolved call-graph claim.'
  }
};
save('source-inputs.json', sourceInputs);
const historyArgs = ['log', '-6', '--date=iso-strict', '--format=fuller', '-p', baseline, '--',
  prefix + 'src/Internal/DictionaryAdapterOfTU.cs',
  prefix + 'src/Internal/ConversionResultProvider.cs',
  prefix + 'src/Adapters/AdapterFactory.cs'];
fs.writeFileSync(path.join(run, 'scoped-history.txt'), execute('git', historyArgs).stdout, { flag: 'wx' });
fs.writeFileSync(path.join(run, 'selected-baseline-to-default.diff'),
  execute('git', ['diff', previous.baseline, baseline, '--', ...selected]).stdout, { flag: 'wx' });
const queries = [
  'repo:dotnet/aspnetcore "DictionaryAdapter" "TryReplace"',
  'repo:dotnet/aspnetcore "JsonPatch" "dictionary" "replace"'
];
const searches = queries.map(q => ({ query: q, perPage: 10,
  response: api(`search/issues?${new URLSearchParams({ q, per_page: '10' })}`) }));
save('upstream-existing-work-search.json', searches);
for (const item of previous.preservedUntrackedReports) {
  assert.equal(sha256(fs.readFileSync(path.join(root, item.path))), item.sha256);
}
console.log(JSON.stringify({ actualCandidate: 'F042', actualBranch: branch, actualBaseline: baseline,
  actualBaselineIsCapturedCurrentDefault: true, actualSelectedSourcesCaptured: files.length,
  actualSelectedSourcesEqualPreviousBaseline: files.filter(item => item.actualCanonicalContentMatchesPreviousBaseline).length,
  actualProtectedManifestChanged: false, actualFourReportsPreserved: true,
  actualSourceOptimizationEditPerformed: false,
  searches: searches.map(item => ({ query: item.query, total: item.response.total_count,
    items: item.response.items.map(result => ({ number: result.number, title: result.title, url: result.html_url })) }))
}, null, 2));
