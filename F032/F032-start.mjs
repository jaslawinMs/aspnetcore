import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F032');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F032-httpsys-flush-start';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const previous = read(path.join(session, 'F031-receipt-blob-verification.json'));
assert.equal(previous.length, 745);
assert.ok(previous.every(row => row.verified_remote_blob || row.verified_receipt_or_index));
const ledger = read(path.join(session, 'autoperf-campaign.json'));
const finding = ledger.candidates.find(row => row.id === 'F032');
assert.equal(finding.status, 'pending');
fs.mkdirSync(run);
fs.copyFileSync(fileURLToPath(import.meta.url), path.join(run, 'executed-start.mjs'));
fs.writeFileSync(path.join(run, 'finding.json'), JSON.stringify(finding, null, 2) + '\n');
const calls = [];
function capture(command, args, label, allowFailure = false) {
  const started = new Date().toISOString();
  const result = spawnSync(command, args, { cwd: root, maxBuffer: 16 * 1024 * 1024 });
  fs.writeFileSync(path.join(run, label + '.stdout'), result.stdout ?? Buffer.alloc(0));
  fs.writeFileSync(path.join(run, label + '.stderr'), result.stderr ?? Buffer.alloc(0));
  calls.push({ command, args, workingDirectory: root, started, completed: new Date().toISOString(),
    actualExitCode: result.status, stdout: label + '.stdout', stderr: label + '.stderr' });
  fs.writeFileSync(path.join(run, 'initial-actual-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  if (!allowFailure) {
    assert.equal(result.status, 0, `${label}: ${result.stderr}`);
  }
  return { ...result, text: (result.stdout ?? Buffer.alloc(0)).toString().trim() };
}
const git = (args, label) => capture('git', args, label).text;
const gh = (endpoint, label) => JSON.parse(capture('gh', ['api', endpoint], label).text);
const digest = value => createHash('sha256').update(value).digest('hex').toUpperCase();
assert.equal(git(['status', '--porcelain', '--untracked-files=no'], 'initial-tracked-status'), '');
assert.deepEqual(git(['ls-files', '--others', '--exclude-standard'], 'initial-untracked').split('\n').sort(), [
  'autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md',
].sort());
const current = gh('repos/dotnet/aspnetcore/branches/main', 'actual-current-default').commit.sha;
if (capture('git', ['cat-file', '-e', `${current}^{commit}`], 'current-local-probe', true).status !== 0) {
  git(['fetch', '--no-tags', 'origin', current], 'fetch-actual-current');
}
assert.equal(capture('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`],
  'new-local-branch-probe', true).status, 1);
assert.equal(git(['ls-remote', '--heads', 'autoperf', `refs/heads/${branch}`], 'new-fork-branch-probe'), '');
git(['switch', '--create', branch, baseline], 'create-independent-branch');
assert.equal(git(['rev-parse', 'HEAD'], 'actual-independent-parent'), baseline);
const selected = [
  'src/Servers/HttpSys/src/ResponseStream.cs',
  'src/Servers/HttpSys/src/RequestProcessing/RequestContext.FeatureCollection.cs',
  'src/Servers/HttpSys/src/RequestProcessing/ResponseBody.cs',
  'src/Servers/HttpSys/src/MessagePump.cs',
  'src/Servers/HttpSys/src/HttpSysOptions.cs',
  'src/Servers/HttpSys/src/WebHostBuilderHttpSysExtensions.cs',
  'src/Servers/HttpSys/src/Microsoft.AspNetCore.Server.HttpSys.csproj',
  'src/Servers/HttpSys/src/PublicAPI.Shipped.txt',
  'src/Servers/HttpSys/src/PublicAPI.Unshipped.txt',
  'src/Servers/HttpSys/test/FunctionalTests/ResponseTests.cs',
  'src/Servers/HttpSys/test/FunctionalTests/ResponseBodyTests.cs',
  'src/Servers/HttpSys/test/FunctionalTests/Listener/ResponseBodyTests.cs',
  'src/Servers/HttpSys/test/FunctionalTests/Utilities.cs',
  'src/Servers/HttpSys/test/FunctionalTests/Listener/Utilities.cs',
  'src/Servers/HttpSys/test/FunctionalTests/Properties/AssemblyInfo.cs',
  'src/Servers/HttpSys/test/FunctionalTests/Microsoft.AspNetCore.Server.HttpSys.FunctionalTests.csproj',
];
const snapshots = path.join(run, 'source-snapshots');
fs.mkdirSync(snapshots);
const parity = [];
for (const [index, file] of [...selected, 'global.json', 'eng/Versions.props'].entries()) {
  const before = capture('git', ['show', `${baseline}:${file}`], `snapshot-${index}-baseline`).stdout;
  const after = capture('git', ['show', `${current}:${file}`], `snapshot-${index}-current`).stdout;
  const working = fs.readFileSync(path.join(root, ...file.split('/')));
  const prefix = String(index).padStart(2, '0') + '-' + path.basename(file);
  for (const [variant, bytes] of [['baseline', before], ['current', after], ['working', working]]) {
    fs.writeFileSync(path.join(snapshots, prefix + '.' + variant), bytes);
  }
  parity.push({ file, core: selected.includes(file), actualBaselineBlobBytesSha256: digest(before),
    actualCurrentBlobBytesSha256: digest(after), actualWorkingBytesSha256: digest(working),
    actualBaselineAndCurrentBlobBytesEqual: before.equals(after),
    actualWorkingLfBytesMatchBaselineBlob: Buffer.from(working.toString().replaceAll('\r\n', '\n')).equals(before) });
}
const history = git(['--no-pager', 'log', '--format=%H %s', `${baseline}..${current}`, '--', ...selected],
  'selected-intervening-history');
gh(`repos/dotnet/aspnetcore/commits?path=src/Servers/HttpSys/src/ResponseStream.cs&per_page=8&sha=${current}`,
  'actual-stream-owner-history');
gh(`repos/dotnet/aspnetcore/commits?path=src/Servers/HttpSys/src/RequestProcessing/RequestContext.FeatureCollection.cs&per_page=8&sha=${current}`,
  'actual-start-producer-history');
for (const [label, kind, query] of [
  ['owner', 'prs', 'ResponseStream HttpSys'],
  ['async-flush', 'issues', 'HttpSys Flush OnStarting'],
  ['completed-guard', 'prs', 'ResponseStream IsCompletedSuccessfully'],
]) {
  capture('gh', ['search', kind, query, '--repo', 'dotnet/aspnetcore', '--limit', '10',
    '--json', 'number,title,url,state,updatedAt'], 'actual-upstream-search-' + label);
}
const docsCommit = gh('repos/dotnet/AspNetCore.Docs/branches/main', 'actual-documentation-default').commit.sha;
const docs = capture('gh', ['api', '-H', 'Accept: application/vnd.github.raw+json',
  `repos/dotnet/AspNetCore.Docs/contents/aspnetcore/fundamentals/servers/httpsys.md?ref=${docsCommit}`],
  'actual-httpsys-documentation', true);
const acceptance = {
  candidate: 'F032', definedBeforeProductEditsOrTiming: true,
  exactPublicContracts: ['void System.IO.Stream.Flush()', 'Task System.IO.Stream.FlushAsync(CancellationToken cancellationToken)'],
  requirements: [
    'Independently exercise an actual public UseHttpSys host and actual accepted loopback HTTP request. Observe real ResponseStream from RequestContext.InitializeFeatures and real OnResponseStart/NotifiyOnStartingAsync,not a hand-injected Func<Task> or mocked server callback.',
    'Preserve synchronous Flush completion before caller continuation and native header delivery,callback LIFO/exact exceptions/cancellation,header visibility/locking and the default AllowSynchronousIO=false. Nonblocking return is not a compatible replacement.',
    'Important observed source contract:RequestContext.OnResponseStart sets the public HasStarted flag before awaiting OnStarting. Do not equate that flag with wire header delivery or assert it stays false while the real callback is pending.',
    'Before any shipping edit,execute actual existing owning functional tests and faithful pending OnStarting producer cases:success,failure,cancellation. Call actual Response.Body.Flush directly with no harness task wait;observe incomplete public call,actual server caller waiting and no client response headers before release;after release inspect exact caller error/token,callback order and real HTTP status,headers,payload/completion.',
    'Also check already-completed callbacks,already-faulted/canceled callbacks,default synchronous-IO rejection and actual FlushAsync pending controls. Clearly distinguish gate cancellation from RequestAborted cancellation.',
    'Evaluate only a compatible completed-success guard in ResponseStream.Flush,leaving Write and every existing async method unchanged. Keep actual onStart task and use GetAwaiter().GetResult() for every nonsuccessfully-completed task. No public API/default/baseline/new IVT/UnsafeAccessor changes.',
    'Predeclare ordinary real full-request Flush1 with no callback and completed callback,a repeated Flush64 request,unchanged async full-request Flush1 control,and prepared-live-request synchronous/async repeated-Flush profiles. Actual accepted request stays alive until each prepared profile is torn down. Do not fabricate RequestContext/native pointers or time a disposed request.',
    'The prepared-live profile is an already-started real response,no new network operation per flush and not a production throughput claim. Full-request profiles retain actual loopback/network/client/dispatch costs. Make setup and measured boundaries explicit.',
    'Freeze one measured harness/dependency closure;candidate copies it and replaces only the actually tested HttpSys DLL/PDB. Check every consumer file,selected source-to-PDB witnesses and actual runtime-loaded owner path/hashes before/after.',
    'At most3 actual source-comparison slots,including partial/failed timing. Alternate paired order original/candidate,candidate/original,original/candidate. All raw samples/outliers,adverse cases,default/async controls and allocation residuals remain. Stop early only for clear >=50% primary gain;otherwise maximum3.',
    'Require material repeatable compatible target benefit not explained by unchanged controls. No convincing gain means restore original source/product and publish no-gain;do not invent a performance PR.',
    'Use pinned activated SDK and byte-exact settings-preserving emitter,serialize heavy work,max2 build workers. This is a shared Windows host:do not change priority,affinity,power,URL ACL/firewall/OS settings or unrelated processes. Own only a unique ephemeral loopback listener and close every held request/client/host.',
    'If actual native HTTP.sys hosting is unavailable,retain exact failure/prerequisite and name unverified producer/wire boundaries. Do not label injected callback tests or skipped conditional tests as real-server validation.',
    'Preserve global.json,package.json,package-lock.json and NuGet.config. Publish raw commands/outcomes,source history/docs and any failed attempts;fork-only writes and no extra historical timing.',
  ],
  maximumActualComparisons: 3, actualComparisonsStarted: 0,
};
fs.writeFileSync(path.join(run, 'acceptance.json'), JSON.stringify(acceptance, null, 2) + '\n');
const investigation = {
  candidate: 'F032', baseline, branch, actualCurrentDefault: current,
  actualRawSnapshots: parity.length * 3, actualSelectedFilePairs: selected.length, parity,
  actualSelectedInterveningHistory: history,
  actualSelectedSourceParity: parity.filter(row => row.core).every(row => row.actualBaselineAndCurrentBlobBytesEqual),
  actualDocumentationCommit: docsCommit, actualDocumentationExit: docs.status,
  actualNewShippingEditPerformed: false, actualTimingPerformed: false,
  actualOnResponseStartMarksHasStartedBeforeAwaitingCallback: true,
  existingTestLimit: 'The lower Listener.ResponseBodyTests exercise native ResponseBody directly,not ResponseStream/OnStarting. Actual full-host tests cover OnStarting/headers and real public writes;add standalone real-host synchronous Flush pending/error/default-IO characterization.',
  codeIntelligenceLimit: 'GitHub semantic code lookup for dotnet/aspnetcore returned HTTP404. Available remote graph scope is msazure/One,not this GitHub checkout. Local LSP finds only two same-file ResponseStream references;known local source/Git fallback,not graph-complete call enumeration.',
  limit: 'Selected source/history parity only,not newer-default SDK integration. Bounded work searches do not establish universal absence.',
};
fs.writeFileSync(path.join(run, 'investigation.json'), JSON.stringify(investigation, null, 2) + '\n');
assert.ok(investigation.actualSelectedSourceParity && parity.filter(row => row.core).every(row =>
  row.actualWorkingLfBytesMatchBaselineBlob), 'Changed selected sources require an explicit current-default assessment.');
console.log(JSON.stringify({ branch, baseline, actualCurrentDefault: current,
  actualSelectedSourceParity: investigation.actualSelectedSourceParity,
  actualRawSnapshots: investigation.actualRawSnapshots, actualTimingPerformed: false }, null, 2));
