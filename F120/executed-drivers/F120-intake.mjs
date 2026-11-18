import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = 'C:\\src\\aspnetcore';
const run = path.join(session, 'autoperf-runs', 'F120');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F120-copy-on-write-contains';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
assert.equal(fs.existsSync(run), false, 'Preserve an existing intake rather than overwriting it.');
const previous = read(path.join(session, 'autoperf-runs', 'F047', 'verified-final-publication.json'));
assert.equal(previous.actualCampaignFinalized, 124);
assert.equal(previous.actualImmutableCoreFilesPreserved, 807);
const campaign = read(path.join(session, 'autoperf-campaign.json'));
assert.equal(campaign.candidates.find(item => item.id === 'F120').status, 'pending');
fs.mkdirSync(run);
const calls = [];
function execute(executable, args) {
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  calls.push({ executable, arguments: args, actualExitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(path.join(run, 'intake-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${executable}: ${result.stderr}`);
  return result.stdout.trim();
}
const git = args => execute('git', ['-c', 'core.longpaths=true', '--no-pager', ...args]);
assert.equal(git(['rev-parse', 'HEAD']), '8b48da8e48baed69648d2a34359b6fadaa4b30fe');
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
const reports = ['autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md'];
assert.deepEqual(git(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).sort(), reports.sort());
const protectedFiles = ['global.json', 'package.json', 'package-lock.json', 'NuGet.config', ...reports]
  .map(file => ({ path: file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
const current = JSON.parse(execute('gh', ['api', 'repos/dotnet/aspnetcore/commits/main']));
const currentDefault = current.sha;
assert.match(currentDefault, /^[a-f0-9]{40}$/);
fs.writeFileSync(path.join(run, 'observed-current-default.json'), JSON.stringify(current, null, 2) + '\n');
git(['fetch', '--quiet', '--no-tags', 'origin', 'main']);
assert.equal(git(['cat-file', '-t', currentDefault]), 'commit');
git(['switch', '-c', branch, baseline]);
const selected = [
  'src/Mvc/Mvc.Core/src/Infrastructure/CopyOnWriteList.cs',
  'src/Mvc/Mvc.Core/src/Infrastructure/ControllerActionInvokerProvider.cs',
  'src/Mvc/Mvc.Core/src/Routing/ControllerRequestDelegateFactory.cs',
  'src/Mvc/Mvc.Core/src/ControllerContext.cs',
  'src/Mvc/Mvc.Core/src/Microsoft.AspNetCore.Mvc.Core.csproj',
  'src/Mvc/Mvc.Core/test/Microsoft.AspNetCore.Mvc.Core.Test.csproj',
  'src/Mvc/Mvc.Core/test/Infrastructure/ControllerActionInvokerTest.cs',
  'src/Mvc/Mvc.RazorPages/src/Infrastructure/PageActionInvokerProvider.cs',
  'src/Mvc/Mvc.RazorPages/src/Infrastructure/PageRequestDelegateFactory.cs',
  'src/Hosting/TestHost/src/Microsoft.AspNetCore.TestHost.csproj'
];
const snapshots = [];
for (const file of selected) {
  const originalBlob = git(['rev-parse', baseline + ':' + file]);
  const defaultBlob = git(['rev-parse', currentDefault + ':' + file]);
  const before = fs.readFileSync(path.join(root, ...file.split('/')));
  const result = spawnSync('git', ['--no-pager', 'show', currentDefault + ':' + file], { cwd: root, encoding: null, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0);
  const normalized = bytes => bytes.toString('utf8').replaceAll('\r\n', '\n');
  for (const [variant, bytes] of [['original', before], ['current-default', result.stdout]]) {
    const target = path.join(run, 'intake-source-files-' + variant, ...file.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes, { flag: 'wx' });
  }
  snapshots.push({ path: file, baselineBlob: originalBlob, actualDefaultBlob: defaultBlob,
    actualGitTextIdentical: normalized(before) === normalized(result.stdout),
    actualOriginalPhysicalSha256: sha(before), actualDefaultGitBytesSha256: sha(result.stdout) });
}
assert.equal(snapshots[0].actualGitTextIdentical, true, 'Reassess a changed default implementation before proposing a fix.');
fs.writeFileSync(path.join(run, 'target-history.txt'), execute('git', ['--no-pager', 'log', '-12', '--format=%H %ad %s',
  '--date=iso-strict', '--follow', '--', selected[0]]) + '\n');
fs.writeFileSync(path.join(run, 'last-target-change.diff'), execute('git', ['--no-pager', 'show',
  'a020933a662680d4628bcbb087f6b1a19f037bd0', '--', selected[0]]) + '\n');
const related = JSON.parse(execute('gh', ['issue', 'list', '--repo', 'dotnet/aspnetcore', '--state', 'open',
  '--search', '"CopyOnWriteList" in:title,body', '--limit', '15', '--json', 'number,title,url,body']));
fs.writeFileSync(path.join(run, 'bounded-related-open-work.json'), JSON.stringify({
  actualQuery: '"CopyOnWriteList" in:title,body', actualLimit: 15, actualCompleteDuplicateSearchClaimed: false, results: related
}, null, 2) + '\n');
for (const file of protectedFiles) assert.equal(sha(fs.readFileSync(path.join(root, file.path))), file.sha256);
const receipt = {
  candidate: 'F120', baseline, actualCurrentDefault: currentDefault, branch, root,
  actualIndependentBranchCreated: true, actualShippingEditsAtIntake: 0, actualNewPermanentTestsAtIntake: 0,
  actualRecordedComparisonAuthorizations: 0, protectedFiles, actualSelectedSources: snapshots,
  actualObservedProductionConstructors: [
    'ControllerActionInvokerProvider.OnProvidersExecuting',
    'ControllerRequestDelegateFactory.CreateRequestDelegate',
    'PageActionInvokerProvider.OnProvidersExecuting',
    'PageRequestDelegateFactory.CreateRequestDelegate'
  ],
  actualProducerCachesMaterializeArraysBeforePerRequestWrappers: true,
  actualWritableCopiesArePrivateConcreteLists: true,
  actualLspReferenceResultsIncomplete: 'Class/Contains references and ControllerContext definition lookup omit source-proven consumers. Zero external LSP edges is not proof of no production use.',
  actualCandidateBoundary: 'Consider only an already-created private _copy List<T> fast path. Preserve the existing source-backed interface loop and object.Equals argument order; do not change Contains to EqualityComparer<T>.Default or List<T>.Contains.',
  actualAdjacentFindingsNotClaimedResolved: ['F121', 'F122', 'F123', 'F151', 'F152'],
  actualMeasuredScopeNotYetDeclared: true
};
fs.writeFileSync(path.join(run, 'intake-completed.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F120', branch, baseline, actualCurrentDefault: currentDefault,
  actualTargetSameOnCurrentDefault: true, actualSelectedSnapshots: snapshots.length,
  actualDifferentSelectedDefaultSources: snapshots.filter(item => !item.actualGitTextIdentical).map(item => item.path),
  actualShippingEdits: 0, actualSourceComparisons: 0 }, null, 2));
