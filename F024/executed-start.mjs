import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F024');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F024-session-commit-timeout-source';
fs.mkdirSync(run);
const commands = path.join(run, 'investigation-commands');
fs.mkdirSync(commands);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(run, 'executed-start.mjs'));
const journal = [];
function capture(command, args, expected = 0) {
  const index = String(journal.length + 1).padStart(3, '0');
  const started = new Date().toISOString();
  const result = spawnSync(command, args, { cwd: root, maxBuffer: 8 * 1024 * 1024 });
  fs.writeFileSync(path.join(commands, `${index}.stdout`), result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(path.join(commands, `${index}.stderr`), result.stderr ?? Buffer.alloc(0));
  journal.push({ executable: command, arguments: args, workingDirectory: root, started,
    completed: new Date().toISOString(), actualExitCode: result.status, expectedExitCode: expected,
    stdout: `${index}.stdout`, stderr: `${index}.stderr` });
  fs.writeFileSync(path.join(commands, 'invocations.json'), JSON.stringify(journal, null, 2) + '\n');
  assert.ok(result.status === expected, `Unexpected ${command} exit:${result.status}`);
  return result.stdout;
}
const git = args => capture('git', args);
const gh = args => capture('gh', args);
assert.equal(git(['rev-parse', 'HEAD']).toString().trim(), '9068cc0d115e7e6a931ac836cc41c62767a2c57f');
assert.equal(git(['diff', '--name-only']).toString().trim(), '');
assert.equal(git(['diff', '--cached', '--name-only']).toString().trim(), '');
const unrelated = git(['ls-files', '--others', '--exclude-standard']).toString().trim().split('\n').sort();
assert.deepEqual(unrelated, ['autoperf-issue-70219-deduplicated-report.html',
  'autoperf-issue-70219-duplicate-report.html', 'autoperf-scan-report.md', 'performance-antipattern-findings.md']);
const current = gh(['api', 'repos/dotnet/aspnetcore/commits/main', '--jq', '.sha']).toString().trim();
assert.match(current, /^[0-9a-f]{40}$/);
git(['fetch', '--quiet', '--no-tags', 'origin', current]);
git(['switch', '--create', branch, baseline]);
const files = [
  'src/Middleware/Session/src/DistributedSession.cs',
  'src/Middleware/Session/src/SessionOptions.cs',
  'src/Middleware/Session/src/SessionMiddleware.cs',
  'src/Middleware/Session/src/DistributedSessionStore.cs',
  'src/Middleware/Session/src/DefaultDistributedSessionStore.cs',
  'src/Middleware/Session/src/LoggingExtensions.cs',
  'src/Middleware/Session/src/Microsoft.AspNetCore.Session.csproj',
  'src/Middleware/Session/src/PublicAPI.Shipped.txt',
  'src/Middleware/Session/src/PublicAPI.Unshipped.txt',
  'src/Middleware/Session/test/SessionTests.cs',
  'src/Middleware/Session/test/Microsoft.AspNetCore.Session.Tests.csproj',
];
const snapshots = [];
for (const file of files) {
  for (const [variant, revision] of [['baseline', baseline], ['current-default', current], ['working', null]]) {
    const bytes = revision ? git(['show', `${revision}:${file}`]) : fs.readFileSync(path.join(root, ...file.split('/')));
    const relative = `${variant}-${path.posix.basename(file)}`;
    fs.writeFileSync(path.join(run, relative), bytes, { flag: 'wx' });
    snapshots.push({ file, variant, path: relative, bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex').toUpperCase(),
      actualGitBlob: createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex') });
  }
}
const parity = files.map(file => {
  const rows = snapshots.filter(row => row.file === file);
  return { file, actualBaselineAndCurrentGitBlobsEqual: rows[0].actualGitBlob === rows[1].actualGitBlob };
});
const history = git(['--no-pager', 'log', '--format=%H %s', `${baseline}..${current}`, '--', ...files]);
fs.writeFileSync(path.join(run, 'actual-intervening-area-history.stdout'), history);
const priorHistory = git(['--no-pager', 'log', '-8', '--format=%H %s', baseline, '--', files[0]]);
fs.writeFileSync(path.join(run, 'actual-prior-owner-history.stdout'), priorHistory);
const prior = gh(['api', 'repos/dotnet/aspnetcore/pulls/51660']);
fs.writeFileSync(path.join(run, 'prior-consolidation-pr.json'), prior);
fs.writeFileSync(path.join(run, 'prior-consolidation.diff'), gh(['pr', 'diff', '51660', '--repo', 'dotnet/aspnetcore']));
for (const [label, query] of [
  ['owner-infinite', 'repo:dotnet/aspnetcore "DistributedSession" "InfiniteTimeSpan"'],
  ['commit-infinite', 'repo:dotnet/aspnetcore "session" "commit" "infinite"'],
  ['cancelafter-session', 'repo:dotnet/aspnetcore "CancelAfter" "session"'],
]) {
  fs.writeFileSync(path.join(run, `actual-upstream-search-${label}.json`),
    gh(['api', '-X', 'GET', 'search/issues', '-f', `q=${query}`, '-f', 'per_page=10']));
}
const context = [];
for (const file of ['global.json', 'eng/Versions.props']) {
  const pair = {};
  for (const [variant, revision] of [['baseline', baseline], ['current-default', current]]) {
    const bytes = git(['show', `${revision}:${file}`]);
    fs.writeFileSync(path.join(run, `${variant}-${path.posix.basename(file)}`), bytes);
    pair[variant] = createHash('sha256').update(bytes).digest('hex');
  }
  context.push({ file, actualBytesEqual: pair.baseline === pair['current-default'] });
}
const ledger = JSON.parse(fs.readFileSync(path.join(session, 'autoperf-campaign.json'), 'utf8').replace(/^\uFEFF/, ''));
const finding = ledger.candidates.find(row => row.id === 'F024');
assert.equal(finding.status, 'pending');
fs.writeFileSync(path.join(run, 'finding.json'), JSON.stringify(finding, null, 2) + '\n');
const proof = {
  candidate: 'F024', baseline, capturedCurrentDefault: current,
  actualIndependentBranch: git(['branch', '--show-current']).toString().trim(),
  actualSourceHeadBeforeEdits: git(['rev-parse', 'HEAD']).toString().trim(),
  actualSourceFiles: files.length, actualRawSnapshots: snapshots.length, snapshots, parity, context,
  actualInterveningSelectedHistoryEmpty: history.toString().trim().length === 0,
  owningTestsProject: 'src/Middleware/Session/test/Microsoft.AspNetCore.Session.Tests.csproj',
  knownSingleTfm: 'net12.0', ownerIsPackable: false, publicApiChangeProposed: false,
  sourceChangesCreated: 0, actualComparativeTimingProfiles: 0,
  F023LoadOptimizationCarried: false, actualUnrelatedReportsPreserved: unrelated,
  boundary: 'Actual CommitAsync modified SetAsync and unmodified RefreshAsync;real middleware invokes it in finally. Finite deadlines and fresh linked-token ownership remain required.',
  limits: ['Selected source/history parity is not newer-current-default SDK integration.',
    'Bounded issue-title/body searches are not proof that no related upstream work exists.',
    'F023 primitive observations are context,not independent F024 public gain evidence.'],
};
fs.writeFileSync(path.join(run, 'investigation.json'), JSON.stringify(proof, null, 2) + '\n');
assert.ok(parity.every(row => row.actualBaselineAndCurrentGitBlobsEqual), 'Current-default owner boundary changed;inspect before implementation.');
assert.ok(proof.actualInterveningSelectedHistoryEmpty, 'Selected history requires independent review.');
assert.equal(proof.actualSourceHeadBeforeEdits, baseline);
assert.equal(proof.actualIndependentBranch, branch);
const acceptance = {
  candidate: 'F024', definedBeforeProductEditsOrTiming: true,
  scope: 'Investigate only exact documented Timeout.InfiniteTimeSpan in CommitAsync;fresh owned linked CTS retained. Finite/default,LoadAsync,serialization,logging and public surface unchanged.',
  requiredPublicBoundary: 'Actual DistributedSessionStore/Create/CommitAsync with real MemoryDistributedCache SetAsync/RefreshAsync and public persisted value consumption.',
  requirements: [
    'Independently reproduce an allocation red on both modified SetAsync and unmodified RefreshAsync real owner rows before changing shipping code.',
    'Preserve caller cancellation before entry and while actually pending for both branches;modified pre-cancel avoids SetAsync,refresh still reaches cache entry before it observes cancellation.',
    'Preserve owned source identity,caller unlink after completion,success transition to refresh,and failed/canceled modified-state retry.',
    'Preserve finite/zero timeout producer cancellation,correct warning/message/inner token,canceled-caller distinction and invalid timeout behavior.',
    'Preserve information-enabled pre-store GetAsync same-token path and its existing best-effort exception behavior;no widened catches.',
    'All original owning tests and every focused row must pass selected;original focused failures must be only the exact independently parsed resource rows.',
    'Freeze actual source/PE/PDB/consumer closure;one byte-identical common harness;retain source/binary identity and all controls/failures.',
    'At most3 actual comparison attempts,including failed/partial timing. No settings mutation on shared machine. All adverse allocations/timings and first-observed costs retained.',
    'Build/characterize a physically relocated fresh runnable project without extending historical timing budget.',
    'Only qualified compatible measured improvement gets a fork-only draft,immediate browser URL handoff and fully verified remote evidence/receipt/index.',
  ],
  noClaims: ['No default-configuration gain,HTTP/remote-I/O throughput,application frequency,dedicated machine,full newer-default integration or merge/release readiness.'],
  maximumActualComparisons: 3, actualComparisonsStarted: 0,
};
fs.writeFileSync(path.join(run, 'acceptance.json'), JSON.stringify(acceptance, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualBranch: branch, baseline, capturedCurrentDefault: current,
  actualSourcePairsEqual: parity.length, actualSnapshots: snapshots.length,
  actualInterveningSelectedHistoryEmpty: true, sourceChanges: 0, timingProfiles: 0,
  acceptanceDefined: true }, null, 2));
