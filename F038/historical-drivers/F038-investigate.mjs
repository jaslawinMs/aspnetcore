import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F038');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F038-render-tree-keyed-lookup';
const previous = JSON.parse(fs.readFileSync(path.join(session, 'F036-final-verification.json'), 'utf8'));
assert.equal(previous.actualAllPublicationChecksPassed, true);
assert.equal(previous.actualFinalized, 115);
assert.equal(previous.actualFinalReceiptCommit, '3bfcf464394f94446a60fd3aa33cf0f35cdaf203');
assert.equal(fs.existsSync(run), false, 'Never overwrite an investigation.');
fs.mkdirSync(path.join(run, 'investigation'), { recursive: true });

const commands = [];
const hash = data => createHash('sha256').update(data).digest('hex').toUpperCase();
const write = (name, value) => fs.writeFileSync(path.join(run, name),
  JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function capture(name, executable, args, expectedExit = 0) {
  const result = spawnSync(executable, args, { cwd: root, encoding: null, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  assert.ifError(result.error);
  const out = path.join(run, 'investigation', name + '.stdout');
  const err = path.join(run, 'investigation', name + '.stderr');
  fs.writeFileSync(out, result.stdout, { flag: 'wx' });
  fs.writeFileSync(err, result.stderr, { flag: 'wx' });
  commands.push({ executable, args, exitCode: result.status, expectedExit,
    stdout: path.relative(run, out), stderr: path.relative(run, err),
    stdoutSha256: hash(result.stdout), stderrSha256: hash(result.stderr) });
  assert.ok((Array.isArray(expectedExit) ? expectedExit : [expectedExit]).includes(result.status),
    `${executable} ${args.join(' ')}: ${result.stderr.toString()}`);
  return result.stdout;
}
const text = (...args) => capture(...args).toString('utf8').trim();
assert.equal(text('initial-tracked-status', 'git', ['--no-pager', 'status', '--porcelain', '--untracked-files=no']), '');
assert.equal(text('initial-head', 'git', ['rev-parse', 'HEAD']), baseline);
assert.equal(text('initial-branch', 'git', ['branch', '--show-current']), 'autoperf/F036-viewdata-enumeration');
assert.equal(text('fork-remote', 'git', ['remote', 'get-url', 'autoperf']), 'https://github.com/jaslawinMs/aspnetcore.git');
capture('new-branch-absent', 'git', ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], 1);
const untrackedBefore = text('untracked-before', 'git', ['--no-pager', 'status', '--porcelain', '--untracked-files=normal']);

const imported = [
  'F038-current-default.json',
  'F038-existing-work-70219-issue.json',
  'F038-existing-work-70133.json',
  'F038-existing-work-70133-files.json',
];
const imports = imported.map(name => {
  const source = path.join(session, name);
  const destination = path.join(run, 'investigation', name);
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
  return { file: path.relative(run, destination), sha256: hash(fs.readFileSync(source)) };
});
const current = JSON.parse(fs.readFileSync(path.join(session, imported[0]), 'utf8')).commit.sha;
capture('current-default-object', 'git', ['cat-file', '-e', current + '^{commit}'], [0, 1, 128]);
if (commands.at(-1).exitCode !== 0) {
  capture('fetch-current-default-object', 'git', ['fetch', '--quiet', 'origin', current]);
  capture('fetched-current-default-object', 'git', ['cat-file', '-e', current + '^{commit}']);
}
const sources = [
  'src/Components/Components/src/RenderTree/RenderTreeDiffBuilder.cs',
  'src/Components/Components/src/RenderTree/Renderer.cs',
  'src/Components/Components/src/RenderTree/RenderTreeFrame.cs',
  'src/Components/Components/src/RenderTree/RenderTreeDiff.cs',
  'src/Components/Components/src/RenderTree/RenderTreeEdit.cs',
  'src/Components/Components/src/RenderTree/StackObjectPool.cs',
  'src/Components/Components/src/Rendering/KeyedItemInfo.cs',
  'src/Components/Components/src/Rendering/RenderBatchBuilder.cs',
  'src/Components/Components/src/Rendering/RenderTreeBuilder.cs',
  'src/Components/Components/src/Rendering/ComponentState.cs',
  'src/Components/Components/src/Rendering/RendererSynchronizationContext.cs',
  'src/Components/Components/src/Rendering/RendererSynchronizationContextDispatcher.cs',
  'src/Components/Components/src/RenderHandle.cs',
  'src/Components/Components/src/IComponent.cs',
  'src/Components/Components/src/ComponentBase.cs',
  'src/Components/Components/src/Dispatcher.cs',
  'src/Components/Components/src/Microsoft.AspNetCore.Components.csproj',
  'src/Components/Components/test/RenderTreeDiffBuilderTest.cs',
  'src/Components/Components/test/Microsoft.AspNetCore.Components.Tests.csproj',
  'src/Components/Components/perf/RenderTreeDiffBuilderBenchmark.cs',
  'src/Components/Components/perf/Microsoft.AspNetCore.Components.Performance.csproj',
];
const sourceHashes = sources.map((source, index) => {
  const prefix = 'source-' + String(index + 1).padStart(2, '0');
  const original = capture(prefix + '-baseline', 'git', ['show', `${baseline}:${source}`]);
  const latest = capture(prefix + '-current-default', 'git', ['show', `${current}:${source}`]);
  const working = fs.readFileSync(path.join(root, ...source.split('/')));
  assert.equal(working.toString('utf8').replace(/\r\n/g, '\n'), original.toString('utf8').replace(/\r\n/g, '\n'));
  return { source, baselineSha256: hash(original), currentDefaultSha256: hash(latest),
    workingFileSha256: hash(working), matchesCurrentDefault: original.equals(latest),
    baselineFile: `investigation/${prefix}-baseline.stdout`,
    currentDefaultFile: `investigation/${prefix}-current-default.stdout` };
});
capture('core-and-shared-default-diff', 'git', ['--no-pager', 'diff', '--name-status', baseline, current,
  '--', 'src/Components/Components', 'src/Components/Shared']);
capture('owner-history-baseline', 'git', ['--no-pager', 'log', '--follow', '-n', '12',
  '--format=%H%n%aI%n%s', baseline, '--', sources[0]]);
capture('owner-history-current', 'git', ['--no-pager', 'log', '--follow', '-n', '12',
  '--format=%H%n%aI%n%s', current, '--', sources[0]]);
capture('removed-ref-experiment', 'gh', ['api', 'repos/dotnet/aspnetcore/commits/95837ac8']);
for (const [index, query] of ['BuildKeyToInfoLookup', 'RenderTreeDiffBuilder keyed', 'keyed dictionary performance'].entries()) {
  capture(`existing-pr-search-${index + 1}`, 'gh', ['search', 'prs', query, '--repo', 'dotnet/aspnetcore',
    '--limit', '20', '--json', 'number,title,state,url,updatedAt']);
}
capture('create-independent-source-branch', 'git', ['switch', '-c', branch, baseline]);
assert.equal(text('final-head', 'git', ['rev-parse', 'HEAD']), baseline);
assert.equal(text('final-branch', 'git', ['branch', '--show-current']), branch);
assert.equal(text('untracked-after', 'git', ['--no-pager', 'status', '--porcelain', '--untracked-files=normal']), untrackedBefore);
write('investigation.json', {
  candidate: 'F038', initializedAt: new Date().toISOString(), baseline, branch, actualCurrentDefault: current,
  prerequisite: previous, imports, sourceHashes, actualSelectedSourcesCompared: sourceHashes.length,
  actualSelectedSourcesMatchCurrentDefault: sourceHashes.every(source => source.matchesCurrentDefault),
  commands,
  authoringObservations: [{
    operation: 'gh api repos/dotnet/aspnetcore/pulls/70219/files --paginate --slurp',
    actualExitCode: 1, actualHttpStatus: 404,
    resolution: '70219 is a summary issue, not a pull request. Read its issue endpoint and the linked actual PR70133; no retry of the incorrect endpoint.',
  }],
  knownPriorExperiment: {
    issue: 'https://github.com/dotnet/aspnetcore/issues/70219',
    pullRequest: 'https://github.com/dotnet/aspnetcore/pull/70133',
    latestDisposition: 'Closed without merging; latest diff changes only the old-tree loop, outside F038.',
    removedRevision: '95837ac8',
    limitation: 'The PR body reports an earlier CollectionsMarshal new-tree prototype removed under that campaign author constraint. F038 must credit and inspect it; no novelty or independent historical-performance claim.',
  },
  scope: 'Only the new-tree TryGetValue-plus-indexer loop. Do not change the excluded old-tree TryAdd opportunity, signatures, key comparer, duplicate errors, dictionary pooling or rendering protocol.',
  noShippingChangesYet: true,
  notFullCurrentMainOrAllHostValidation: true,
});
console.log(JSON.stringify({ candidate: 'F038', branch, baseline, currentDefault: current,
  actualSelectedSourcesCompared: sourceHashes.length,
  actualSelectedSourcesMatchCurrentDefault: sourceHashes.every(source => source.matchesCurrentDefault),
  actualShippingChanges: 0 }, null, 2));
