import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = 'C:\\src\\aspnetcore';
const current = 'C:\\src\\autoperf-F042-default';
const run = path.join(session, 'autoperf-runs', 'F046');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const branch = 'autoperf/F046-httpsys-header-append-ref';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
assert.equal(fs.existsSync(run), false, 'Never overwrite F046 evidence.');
const ledger = read(path.join(session, 'autoperf-campaign.json'));
assert.equal(ledger.candidates.find(row => row.id === 'F046').status, 'pending');
assert.equal(ledger.candidates.filter(row => ['drafted', 'no-gain', 'rejected', 'duplicate'].includes(row.status)).length, 122);
fs.mkdirSync(run, { recursive: true });
const calls = [];
function capture(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.ifError(result.error);
  calls.push({ command, arguments: args, workingDirectory: cwd, actualExitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(path.join(run, 'intake-invocations.json'), JSON.stringify(calls, null, 2) + '\n');
  assert.equal(result.status, 0, `${command}: ${result.stderr}\n${result.stdout}`);
  return result.stdout.trim();
}
const git = (args, cwd = root) => capture('git', ['-c', 'core.longpaths=true', '--no-pager', ...args], cwd);
assert.equal(git(['diff', '--name-only']), '');
assert.equal(git(['diff', '--cached', '--name-only']), '');
assert.equal(git(['rev-parse', 'HEAD']), '099fcb681338358303dbdb1ce3910a52bd3c23f6');
assert.equal(git(['diff', '--name-only'], current), '');
const actualDefault = git(['rev-parse', 'origin/main']);
assert.equal(actualDefault, '31c15331c03714b7a602e1817e65881474c29e2e');
assert.equal(git(['rev-parse', 'HEAD'], current), actualDefault);
const protectedFiles = ['global.json', 'autoperf-issue-70219-deduplicated-report.html',
  'autoperf-issue-70219-duplicate-report.html', 'autoperf-scan-report.md', 'performance-antipattern-findings.md']
  .map(file => ({ path: file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
assert.equal(protectedFiles[0].sha256, 'C3D6E7C29D94C34B6343D4A2EFE74164929F29BFA26FD84B5E2020A15091CD53');
const areaTrees = ['src/Shared/HttpSys', 'src/Servers/HttpSys', 'src/Servers/IIS/IIS'].map(area => {
  const pair = git(['rev-parse', baseline + ':' + area, actualDefault + ':' + area]).split(/\r?\n/);
  assert.equal(pair.length, 2);
  assert.equal(pair[0], pair[1], area);
  return { path: area, baselineTree: pair[0], actualDefaultTree: pair[1], actualEntireAreaTreeMatches: true };
});
const selected = [
  'src/Shared/HttpSys/RequestProcessing/HeaderCollection.cs',
  'src/Shared/ServerInfrastructure/HttpCharacters.cs',
  'src/Servers/HttpSys/src/RequestProcessing/Response.cs',
  'src/Servers/HttpSys/src/Microsoft.AspNetCore.Server.HttpSys.csproj',
  'src/Servers/IIS/IIS/src/Microsoft.AspNetCore.Server.IIS.csproj',
  'src/Servers/IIS/IIS/src/Core/IISHttpContext.cs',
  'src/Http/Http.Abstractions/src/Extensions/HeaderDictionaryExtensions.cs',
  'src/Servers/HttpSys/test/Tests/Microsoft.AspNetCore.Server.HttpSys.Tests.csproj',
  'src/Servers/HttpSys/test/FunctionalTests/Microsoft.AspNetCore.Server.HttpSys.FunctionalTests.csproj',
  'src/Servers/HttpSys/test/FunctionalTests/Listener/ResponseHeaderTests.cs',
  'src/Servers/HttpSys/test/FunctionalTests/ResponseHeaderTests.cs'
];
const snapshots = selected.map(file => {
  const source = fs.readFileSync(path.join(root, ...file.split('/')));
  const defaultSource = fs.readFileSync(path.join(current, ...file.split('/')));
  const pair = git(['rev-parse', baseline + ':' + file, actualDefault + ':' + file]).split(/\r?\n/);
  assert.equal(pair[0], pair[1], file);
  const values = [['original', source], ['current-default', defaultSource]].map(([variant, bytes]) => {
    const relative = path.join('source-files-' + variant, ...file.split('/'));
    const destination = path.join(run, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes, { flag: 'wx' });
    return { variant, path: relative.replaceAll('\\', '/'), sha256: sha(bytes), bytes: bytes.length };
  });
  return { path: file, baselineBlob: pair[0], actualDefaultBlob: pair[1], actualGitTextIdentical: true, snapshots: values };
});
const history = git(['log', '-3', '--format=%H %ad %s', '--date=iso-strict',
  '-L', '183,192:src/Shared/HttpSys/RequestProcessing/HeaderCollection.cs']);
fs.writeFileSync(path.join(run, 'append-history.txt'), history + '\n', { flag: 'wx' });
const related = JSON.parse(capture('gh', ['pr', 'list', '--repo', 'dotnet/aspnetcore', '--state', 'open',
  '--search', 'HeaderCollection', '--limit', '20', '--json', 'number,title,url,headRefOid']));
fs.writeFileSync(path.join(run, 'bounded-related-open-work.json'), JSON.stringify({
  query: 'HeaderCollection', limit: 20, actualReturned: related,
  actualSearchIsNotAnExhaustiveChangedFileOrDuplicateProof: true
}, null, 2) + '\n', { flag: 'wx' });
git(['switch', '-c', branch, baseline]);
assert.equal(git(['rev-parse', 'HEAD']), baseline);
assert.equal(git(['branch', '--show-current']), branch);
for (const item of protectedFiles) {
  assert.equal(sha(fs.readFileSync(path.join(root, item.path))), item.sha256);
}
const plan = {
  candidate: 'F046', declaredAt: new Date().toISOString(), baseline, actualCurrentDefault: actualDefault, branch,
  actualDeclaredBeforeAnyF046ShippingSourceEditOrTiming: true,
  target: 'Microsoft.AspNetCore.HttpSys.Internal.HeaderCollection.Append(string,string)',
  actualCompiledShippingOwners: ['Microsoft.AspNetCore.Server.HttpSys', 'Microsoft.AspNetCore.Server.IIS'],
  actualObservedNarrowSourceProducer: 'HTTP.sys Response.ComputeHeaders appends exactly Connection:close when connection lifetime requires closing and the response does not already equal close.',
  actualNotTheGeneralPublicHeaderDictionaryAppendExtension: true,
  actualLspReturnedNoIncomingCallsDespiteRealSourceCaller: true,
  requiredProducerEvidenceBeforeTiming: [
    'Both real source-built owners contain the actual shared HeaderCollection body and matching source/PDB document.',
    'Resolve the compiled HTTP.sys ComputeHeaders call target from actual owner IL, not a text-match completeness assumption.',
    'Execute actual public UseHttpSys requests for HTTP/1.0, request Connection:close and unchanged keep-alive/application-close controls.',
    'Observe actual managed response header values/read-only state after the real producer and material client protocol/header/body output.',
    'Characterize original and actual current default before a shipping edit; do not inject producer callbacks, native request contexts or substitute header collections.'
  ],
  proposedChange: 'After all existing guards, use CollectionsMarshal.GetValueRefOrAddDefault only when Store.GetType() equals the exact Dictionary<string,StringValues> type; preserve the original IDictionary read/concat/write fallback for wrappers and dictionary subclasses.',
  requiredPreservation: [
    'Keep existing constructor, private Store type, guards/order, dictionary comparer, stored key spelling and concatenation order.',
    'Missing keys, existing single/multiple values, empty/null values, read-only and trailer restrictions preserve existing state and errors.',
    'A derived dictionary with explicit IDictionary operations must keep those operations; an is-Dictionary shortcut is insufficient.',
    'No dictionary add/remove or callbacks while the returned ref is in use; StringValues.Concat computes the struct value before assignment.',
    'No public/protected API change, new IVT or UnsafeAccessor, dependency-manifest or unrelated formatting change.',
    'Build both source owners, run focused owning managed tests and relevant existing real HTTP.sys functional rows on both source variants.',
    'IIS managed shared-class contracts are not passed off as native IIS integration or throughput.'
  ],
  measuredBoundary: 'Fresh actual default HeaderCollection, ContentLength=0, optional preexisting Connection values, one fixed Connection:close append, collection-count readback; includes collection initialization and optional setup writes, excludes native HTTP/client/host costs.',
  primary: { method: 'FreshNativeAppend', profile: 'NoExisting', reason: 'Smallest default-store shape produced by closing an empty response after Content-Length initialization; fixed real Connection key/close value, not arbitrary bulk/long-name appends.' },
  unchangedControl: { method: 'FreshPublicExtensionControl', profile: 'NoExisting', reason: 'Same fresh header construction/value but explicit public HeaderDictionaryExtensions.Append, which does not call the changed instance method.' },
  profileKeys: ['NoExisting', 'KeepAlive', 'TwoExisting', 'EightExisting', 'MixedCaseExisting', 'WrappedStore'],
  actualWrappedStoreAndScaledValuesAreSecondaryNotProductionFrequencyEvidence: true,
  benchmarkCasesPerSource: 12, warmupIterations: 3, retainedIterations: 8, requestedIterationMilliseconds: 100,
  unrollFactor: 1, outlierRemoval: 'DontRemove', benchmarkDotNetVersion: '0.13.0',
  sourceComparisonsMaximum: 3, failedOrPartialComparisonAuthorizationsConsumeBudget: true,
  comparisonOrders: [['Original', 'Candidate'], ['Candidate', 'Original'], ['Original', 'Candidate']],
  clearPrimaryGainMayStopEarlyAtPercent: 50,
  numericalTimingCriterion: 'At least5% median paired less time and primary faster in at least2of3 completed pairs.',
  allocationCriterion: 'Alternative primary structural managed saving at least16B/op, repeated in at least2of3, never inferred from unmatched or control drift.',
  controlCredibilityCriterion: 'Reject timing-only qualification if primary apparent benefit is no greater than the corresponding unchanged control in at least2of3; independently review all variance and adverse profiles.',
  localGainDoesNotImplyNativeHttpSysIisOrApplicationThroughputGain: true,
  imageCriterion: 'One byte-identical common measured harness and full closures; only the two actual source-built owner DLL/PDB pairs may change.',
  reconstructionCriterion: 'Independently restore/build byte-exact authored project elsewhere and characterize both source variants without extra timing.',
  sampleAuditCriterion: 'Independently reconstruct every retained result from native actual/overhead measurements, validate allocation rounding, settings and individual parameterized TRX rows.',
  environment: 'Shared Windows machine; no priority, affinity, power, URL ACL, firewall or OS changes; no unrelated process termination; serialize builds/benchmarks with at most2MSBuild workers.',
  protectedFiles,
  documentation: {
    url: 'https://learn.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.collectionsmarshal.getvaluereforadddefault?view=net-10.0',
    observedDocsCommit: 'eb67337dea628c1898350f7d074e02e6a1c7ad65',
    relevantRemark: 'Items should not be added to or removed from the dictionary while the ref TValue is in use.',
    observedBeforeCandidateImplementation: true
  }
};
fs.writeFileSync(path.join(run, 'acceptance-plan.json'), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(run, 'diagnostic-budget.json'), JSON.stringify({
  candidate: 'F046', maximumSourceComparisons: 3, state: 'open', authorized: [], completed: [],
  failedOrPartialAttempts: [], permanentlyClosed: false, actualCreated: new Date().toISOString()
}, null, 2) + '\n', { flag: 'wx' });
const intake = {
  candidate: 'F046', baseline, actualCurrentDefault: actualDefault, branch, root, currentDefaultRoot: current,
  actualIndependentBranchCreated: true, actualShippingEditsAtIntake: 0, actualNewPermanentTestsAtIntake: 0,
  actualRecordedComparisonAuthorizations: 0, protectedFiles,
  protectedCurrentDefaultGlobalJson: sha(fs.readFileSync(path.join(current, 'global.json'))),
  actualMatchingFullAreaTrees: areaTrees, actualSelectedSources: snapshots,
  actualCurrentDefaultBuildAndProducerCharacterizationStillRequired: true,
  actualBoundedRelatedWorkResults: related.length,
  actualCodeIntelligenceBoundary: 'Configured Bluebird scopes are Azure DevOps projects, not this GitHub repo. GitHub semantic lookup previously returned404. C# LSP gave no incoming Append calls; bounded source inspection found the actual ComputeHeaders call. Zero LSP edges is not producer absence or complete graph evidence.',
  actualFindingScopeCorrectedBeforeMeasurement: 'Not generic request-header appending: the observed internal call is HTTP.sys managed response Connection:close generation; IIS also compiles the shared class.',
  actualCompleted: new Date().toISOString()
};
fs.writeFileSync(path.join(run, 'intake-completed.json'), JSON.stringify(intake, null, 2) + '\n', { flag: 'wx' });
const driver = fs.readFileSync(path.join(session, 'F044-managed-command.mjs'), 'utf8').replaceAll('F044', 'F046');
fs.writeFileSync(path.join(session, 'F046-managed-command.mjs'), driver, { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F046', branch, actualCurrentDefault: actualDefault,
  actualMatchingWholeAreaTrees: areaTrees.length, actualSelectedSourcePairs: snapshots.length,
  actualPreimplementationCriteriaDeclared: true, actualShippingEdits: 0, actualTimingAuthorizations: 0,
  actualProducerScope: intake.actualFindingScopeCorrectedBeforeMeasurement }, null, 2));
