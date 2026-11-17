import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = String.raw`C:\src\aspnetcore`;
const run = path.join(session, 'autoperf-runs', 'F033');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F033-httpsys-write-start';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const previous = read(path.join(session, 'F032-receipt-blob-verification.json'));
assert.equal(previous.length, 953);
assert.ok(previous.every(row => row.verified_remote_blob || row.verified_receipt_or_index));
const ledger = read(path.join(session, 'autoperf-campaign.json'));
const finding = ledger.candidates.find(row => row.id === 'F033');
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
    assert.equal(result.status, 0, `${label}:${result.stderr}`);
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
  ['async-write', 'issues', 'HttpSys Write OnStarting'],
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
  candidate: 'F033', definedBeforeProductEditsOrTiming: true,
  exactPublicContracts: ['void System.IO.Stream.Write(byte[] buffer,int offset,int count)',
    'ValueTask System.IO.Stream.WriteAsync(ReadOnlyMemory<byte> buffer,CancellationToken cancellationToken)'],
  requirements: [
    'Independently exercise a real public UseHttpSys host and accepted loopback HTTP request,actual ResponseStream/OnResponseStart/OnStarting/native ResponseBody. No injected framework start delegate,fake RequestContext/native pointers or replaced stream.',
    'Synchronous Write must await actual OnStarting completion before consuming its buffer/sending payload/returning. Preserve callback LIFO,exact errors/tokens,wire status/protocol/payload,header state and default AllowSynchronousIO=false. Nonblocking return is not compatible.',
    'OnResponseStart publicly marks HasStarted before awaiting callbacks. While pending,observe true HasStarted,unlocked headers,incomplete callback/public invocation,actual synchronous server caller waiting and absent wire headers.',
    'Before any shipping edit,run the exact native owning tests and real pending Write callback success/failure/cancellation plus async controls,already-faulted/canceled callbacks and default synchronous-IO rejection. Actual server Body.Write invocation contains no harness task wait.',
    'Exercise nonzero ranged byte-array writes including sentinels,ordinary128B and4096B data,zero-length writes,and exact consumed bytes. Include real invalid null/negative-offset/negative-count/out-of-range buffer arguments,callback-before-argument validation,and pending callback error/cancellation precedence over invalid arguments. Do not equate public HasStarted with sent wire headers.',
    'Only evaluate a compatible completed-success guard in ResponseStream.Write;keep actual start task and GetAwaiter().GetResult for every not-successfully-completed task. Leave Flush/all async methods/producer/defaults/API/baselines unchanged;no new IVT/UnsafeAccessor.',
    'Predeclare Request.Sync.None.128,Request.Sync.Ready.128,Request.Sync.Ready.4096,Request.Async.Ready.128,Live.Sync.Started.Zero,Live.Async.Started.Zero. Full requests include real client/dispatch/registration/data/native IO/wire consumption. Prepared live uses one held actually started request,one zero-length write per operation and no new native send;not representative nonzero-write or application throughput.',
    'Use proven synchronous void BDN lifecycle adapters outside measurement. Characterize every actual setup/workload/cleanup lifecycle before timing;awaiting is not assumed from method attributes. All owned requests/client/hosts must close with explicit disposal evidence.',
    'Freeze one measured harness/dependency closure;copy for candidate and replace only actual tested HTTP.sys DLL/PDB. Verify all files,selected source/PDB witnesses and actual runtime-loaded owner path/hashes.',
    'At most3actual source-comparison attempt slots,including partial/failed starts;alternate original/candidate,candidate/original,original/candidate. All6profiles,8result samples/outliers,adverse/async controls and allocation residuals retained. Early stop only for clear>=50%primary gain;otherwise maximum3.',
    'Require repeatable meaningful compatible benefit not explained by unchanged controls. No convincing gain means restore original source/product and publish no-gain. F032 is adjacent evidence,not a duplicate classification or independent Write measurement.',
    'Pinned activated SDK/runtime,settings-preserving byte-exact emitter,serialized heavy work,max2build workers,shared non-isolated Windows host. Never change priority/affinity/power/OS/URL-ACL/firewall settings or terminate unrelated processes;only unique owned ephemeral loopback listeners.',
    'Preserve root global.json/package.json/package-lock.json/NuGet.config. Retain all history/docs/raw outcomes/failures. Fork-only publication;justified new draft PR opens immediately;no fake optimization PR or extra historical timing.',
  ],
  maximumActualComparisons: 3, actualComparisonsStarted: 0,
};
fs.writeFileSync(path.join(run, 'acceptance.json'), JSON.stringify(acceptance, null, 2) + '\n');
const investigation = {
  candidate: 'F033', baseline, branch, actualCurrentDefault: current,
  actualRawSnapshots: parity.length * 3, actualSelectedFilePairs: selected.length, parity,
  actualSelectedInterveningHistory: history,
  actualSelectedSourceParity: parity.filter(row => row.core).every(row => row.actualBaselineAndCurrentBlobBytesEqual),
  actualDocumentationCommit: docsCommit, actualDocumentationExit: docs.status,
  actualNewShippingEditPerformed: false, actualTimingPerformed: false,
  actualOnResponseStartMarksHasStartedBeforeAwaitingCallback: true,
  actualNativeWriteValidatesArgumentsBeforeSynchronousIoCheck: true,
  actualPublicWriteInvokesResponseStartBeforeNativeArgumentValidation: true,
  existingTestLimit: 'Thirteen full-host rows cover actual start/completion/writes/headers;two lower Listener rows bypass ResponseStream. Separate real-host pending Write,data/argument/default/wire cases required.',
  codeIntelligenceLimit: 'Remote graph remains scoped to unrelated msazure/One;GitHub semantic lookup unavailable in F032,not repeated. F033 local LSP resolves owner/native symbols,but Write references return its declaration only;known source/Git fallback,not graph-complete call enumeration.',
  limit: 'Selected source/history parity only,not newer-default SDK integration or complete issue/history absence.',
};
fs.writeFileSync(path.join(run, 'investigation.json'), JSON.stringify(investigation, null, 2) + '\n');
assert.ok(investigation.actualSelectedSourceParity && parity.filter(row => row.core).every(row =>
  row.actualWorkingLfBytesMatchBaselineBlob), 'Changed selected sources require an explicit current-default assessment.');
console.log(JSON.stringify({ branch, baseline, actualCurrentDefault: current,
  actualSelectedSourceParity: investigation.actualSelectedSourceParity,
  actualRawSnapshots: investigation.actualRawSnapshots, actualTimingPerformed: false }, null, 2));
