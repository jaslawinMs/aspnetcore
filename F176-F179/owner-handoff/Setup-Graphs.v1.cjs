'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = __dirname, owner = path.dirname(root);
const entry = JSON.parse(fs.readFileSync(path.join(owner, 'entry.json')));
const graphs = {
  originalPath: 'C:\\src\\ap-F176-o022',
  defaultPath: 'C:\\src\\ap-F176-d022',
  originalCommit: entry.originalCommit,
  defaultCommit: entry.lsRemote.split(/\s+/)[0],
  upstream: 'https://github.com/dotnet/aspnetcore.git',
  donor: entry.donor,
  independentObjectStores: true,
  cloneArguments: ['clone', '--no-hardlinks', '--no-checkout'],
  observedAtUtc: entry.observedAtUtc,
  targetPaths: [
    'src/Mvc/Mvc.Core/src/Builder/ControllerEndpointRouteBuilderExtensions.cs',
    'src/Mvc/Mvc.Razor/src/Compilation/DefaultViewCompiler.cs'
  ]
};
fs.mkdirSync(path.join(root, 'evidence'), { recursive: true });
function json(name, value) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.stage', JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(file + '.stage', file);
}
function git(label, args, cwd) {
  const startedAtUtc = new Date().toISOString();
  const result = cp.spawnSync('git', ['--no-pager', ...args], { cwd, windowsHide: true, encoding: null, maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(root, 'evidence', label + '.stdout.txt'), result.stdout ?? '');
  fs.writeFileSync(path.join(root, 'evidence', label + '.stderr.txt'), result.stderr ?? '');
  json(`evidence/${label}.git.json`, { executable: 'git', arguments: ['--no-pager', ...args], cwd: cwd ?? owner, startedAtUtc, endedAtUtc: new Date().toISOString(), exitCode: result.status, signal: result.signal, error: result.error?.message ?? null });
  assert.equal(result.status, 0, `${label}: ${result.stderr}`);
  return result.stdout.toString('utf8').trim();
}
assert.equal(entry.donorHead, entry.originalCommit);
assert.equal(entry.donorTrackedStatus, '');
assert.equal(entry.upstreamRepository.default_branch, 'main');
for (const name of ['entry.json', 'candidates-entry.json']) fs.copyFileSync(path.join(owner, name), path.join(root, name));
fs.copyFileSync(path.join(owner, '..', 'policy.json'), path.join(root, 'entry-policy.json'));
for (const role of ['original', 'default']) {
  const checkout = graphs[`${role}Path`], commit = graphs[`${role}Commit`];
  assert(!fs.existsSync(checkout), `Fresh private path required: ${checkout}`);
  git(`clone-${role}`, ['clone', '--no-hardlinks', '--no-checkout', graphs.donor, checkout]);
  assert(!fs.existsSync(path.join(checkout, '.git', 'objects', 'info', 'alternates')));
  git(`remote-${role}`, ['remote', 'set-url', 'origin', graphs.upstream], checkout);
  if (role === 'default') git('fetch-default-exact', ['fetch', '--no-tags', 'origin', commit], checkout);
  assert.equal(git(`available-${role}`, ['cat-file', '-t', commit], checkout), 'commit');
  const blobs = {};
  for (const target of graphs.targetPaths)
    blobs[target] = git(`${role}-target-${path.basename(target)}`, ['rev-parse', `${commit}:${target}`], checkout);
  git(`checkout-${role}`, ['checkout', '--quiet', '--detach', commit], checkout);
  assert.equal(git(`${role}-head`, ['rev-parse', 'HEAD'], checkout), commit);
  assert.equal(git(`${role}-status`, ['status', '--porcelain=v1', '--untracked-files=no'], checkout), '');
  const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    const name = path.join(directory, item.name);
    if (item.isDirectory()) return walk(name);
    const stat = fs.statSync(name);
    assert.equal(stat.nlink, 1, `No hardlinks in own object store: ${name}`);
    return [{ path: path.relative(path.join(checkout, '.git', 'objects'), name).replaceAll('\\', '/'), bytes: stat.size, linkCount: stat.nlink }];
  });
  graphs[`${role}ObjectStore`] = { path: path.join(checkout, '.git', 'objects'), alternatesAbsent: true, files: walk(path.join(checkout, '.git', 'objects')) };
  graphs[`${role}TargetBlobs`] = blobs;
}
json('graph-creation.json', graphs);
json('ACCEPTANCE.json', {
  status: 'PENDING', findings: ['F176', 'F177', 'F178', 'F179'], candidates: 0, comparisons: 0,
  scope: 'Untimed unchanged native producer/consumer and compatibility evidence preparation only.',
  criteria: [
    'Fresh upstream-default observation, exact fetched pinned tree, private clean no-hardlink/no-alternate source graphs.',
    'Normal dependency-aware native builds and narrow existing MVC native tests on Original and whole current-default graphs, with every TRX row structurally reconciled.',
    'One C#13 private common consumer compilation against Original native references; identical accepted DLL/PDB/companions on both roles using each role normal native deps/runtime.',
    'Actual public MVC registration and endpoint materialization, builder/items identity and retained sentinels, native precompiled Razor ApplicationParts/compiler path and real compiler results.',
    'Selected actual PE/PDB bytes and all selected PDB Documents/raw pinned source bridge; retained compile history and errors; complete native/common/runtime all-file inventories and union/differences.',
    'Read-only built-in Node offline audit; terminal known roots, sampled descendants and redirected streams with UTC/PID-creation identity checks.'
  ],
  excluded: [
    'No shipping/permanent-test/public API/config/ledger/policy edits, commits, PRs or issues.',
    'No benchmarks, timers, allocation counters, performance claims, application cardinality/frequency claims, or implementation candidates.',
    'No complete historical descendant census, complete native compiler/toolchain closure, or unselected runtime/distribution byte attestation.'
  ]
});
console.log(JSON.stringify({ originalCommit: graphs.originalCommit, defaultCommit: graphs.defaultCommit, originalTargetBlobs: graphs.originalTargetBlobs, defaultTargetBlobs: graphs.defaultTargetBlobs }));
