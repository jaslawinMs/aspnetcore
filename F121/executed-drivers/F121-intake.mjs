import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const root = String.raw`C:\src\aspnetcore`;
const defaultRoot = String.raw`C:\src\autoperf-F042-default`;
const run = path.join(session, 'autoperf-runs', 'F121');
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const actualDefault = 'f78194260f43c48ae2092675f55757f2a42dd63d';
function require(condition, message) {
  if (!condition) throw new Error(message);
}
function sha(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
}
function execute(executable, args, cwd = root) {
  const result = spawnSync(executable, args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  require(!result.error && result.status === 0, `${executable} ${args.join(' ')} failed: ${result.error ?? result.stderr}`);
  return result.stdout.trimEnd();
}
function write(name, value) {
  const filename = path.join(run, name);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
require(!fs.existsSync(run), 'Never replace an existing finding intake.');
require(execute('git', ['branch', '--show-current']) === 'autoperf/F121-copy-on-write-copyto', 'Require the independent F121 branch.');
require(execute('git', ['rev-parse', 'HEAD']) === baseline, 'Require the unchanged campaign baseline.');
require(execute('git', ['diff', '--name-only', 'HEAD']) === '', 'Require zero shipping or test edits before acceptance.');
require(execute('git', ['status', '--porcelain', '--untracked-files=no'], defaultRoot) === '', 'Preserve the previous clean default checkout.');
const metadata = JSON.parse(execute('gh', ['api', `repos/dotnet/aspnetcore/commits/${actualDefault}`]));
require(metadata.sha === actualDefault, 'Resolve the actual current-default commit.');
const priorInputs = JSON.parse(fs.readFileSync(path.join(session, 'autoperf-runs', 'F120', 'source-inputs-original.json')));
const comparisons = priorInputs.sourceFiles.map(input => {
  const original = execute('git', ['show', `${baseline}:${input.path}`]);
  const current = execute('git', ['show', `${actualDefault}:${input.path}`]);
  require(original === current, `Reconcile changed current-default input: ${input.path}`);
  write(path.join('intake-source', 'original', input.path), original + '\n');
  write(path.join('intake-source', 'current-default', input.path), current + '\n');
  return {
    path: input.path,
    originalGitBlob: execute('git', ['rev-parse', `${baseline}:${input.path}`]),
    actualDefaultGitBlob: execute('git', ['rev-parse', `${actualDefault}:${input.path}`]),
    actualNormalizedTextMatches: true,
    originalPhysicalSha256: sha(fs.readFileSync(path.join(root, input.path)))
  };
});
const protectedPaths = [
  'global.json', 'package.json', 'package-lock.json', 'NuGet.config',
  'autoperf-issue-70219-deduplicated-report.html', 'autoperf-issue-70219-duplicate-report.html',
  'autoperf-scan-report.md', 'performance-antipattern-findings.md'
];
const protectedInputs = protectedPaths.filter(relative => fs.existsSync(path.join(root, relative)))
  .map(relative => ({ path: relative, sha256: sha(fs.readFileSync(path.join(root, relative))) }));
const plan = {
  candidate: 'F121',
  actualSealedAt: new Date().toISOString(),
  actualShippingEditsAtSeal: 0,
  actualNewPermanentTestFilesAtSeal: 1,
  actualNewTestsExecutedAtSeal: 0,
  actualAcceptanceDefinedInThisDriverBeforeTestAuthorship: true,
  actualBenchmarkRunsAtSeal: 0,
  baseline,
  actualCurrentDefault: actualDefault,
  branch: 'autoperf/F121-copy-on-write-copyto',
  classification: 'Behavior-preserving specialization of CopyTo on the private already-copied List<T> only.',
  target: 'CopyOnWriteList<T>.CopyTo only; do not alter Contains, IndexOf, GetEnumerator or validation conventions.',
  proposedChange: 'When _copy is not null, use the same per-item array assignment loop over that concrete private List<T>, then return. Leave the existing Readable interface loop exactly intact.',
  rejectedShortcuts: [
    'List<T>.CopyTo or Array.Copy would change empty-input validation, exception types and partial destination writes.',
    'Do not index an arbitrary IReadOnlyList<T> or treat a supplied List subclass as the private exact List<T>.',
    'Do not carry the F120 experiment or its preservation tests onto this independent baseline branch.'
  ],
  rationale: 'Real MVC producers cache arrays and create a private List only after a public write. CopyTo is an optional caller/debugger collection operation, not a demonstrated normal MVC request cost.',
  benchmarkClass: 'AutoPerf.CollectionBenchmarks',
  benchmarkMethod: 'CopyTo',
  unchangedControlMethod: 'UnchangedIndexOf',
  primary: 'CopiedDefault5',
  unchangedControl: 'UnmodifiedDefault5',
  profileKeys: [
    'CopiedDefault5', 'UnmodifiedDefault5', 'CopiedDefault5Offset2', 'UnmodifiedDefault5Offset2',
    'CopiedEmpty', 'CopiedOne', 'CopiedEight', 'CopiedEightOffset2'
  ],
  actualTimedBoundary: 'One public IList<IValueProviderFactory>.CopyTo into a preallocated destination on an actual HTTP-produced MVC collection. Zero-offset destinations are exact-sized; offset-two destinations have two sentinels before and after the copied region. HTTP, first-write preparation, allocation and validation are outside timing.',
  actualUnchangedControlBoundary: 'A missing-item IndexOf on the same immutable prepared collection; its source is untouched.',
  actualProductionProducerRequirement: 'Use real TestServer controller activation in both EnableActionInvokers modes. Never assign ControllerContext.ValueProviderFactories or substitute a list. Public Add/RemoveAt establishes the copied store; a second actual HTTP request proves shared-source and per-request isolation.',
  actualConsumerRequirement: 'Exercise direct public CopyTo and real Enumerable.ToArray collection consumption outside timing, checking every destination reference and offset sentinel. Do not claim that MVC normally invokes CopyTo on a request.',
  actualDefaultFactoryCountMustBeVerified: 5,
  actualPageBoundary: 'Current-default page producer inputs are checked and existing PageInvokerProviderTest is exercised if the candidate is retained. MVC HTTP evidence does not establish a compiled Razor Page request.',
  preservation: [
    'Original/current-default target and selected producer/test inputs checked before shipping edits.',
    'Items, null references, source order, nonzero offsets and untouched prefix/suffix slots must be preserved.',
    'Post-copy source mutation must remain visible only through the unmodified wrapper.',
    'Empty inputs must remain no-op even with null destinations and invalid offsets.',
    'Nonempty null/negative/short/covariant destinations must preserve exact exception types and partial writes.',
    'Arbitrary supplied IReadOnlyList enumeration and enumerator disposal, including destination failure, remain unchanged.',
    'New focused tests pass on untouched source and candidate: green/green preservation, not a semantic-bug red/green claim.',
    'No shipping public API, IVT, UnsafeAccessor, pin, package manifest or feed configuration change.'
  ],
  numericalTimingQualification: {
    minimumMedianPairedLessTimePercent: 5,
    minimumPrimaryFasterComparisonsOfThree: 2,
    rejectTimingOnlyWhenPrimaryAtMostUnchangedSameProfileIndexOfControlInAtLeastComparisons: 2
  },
  alternativeAllocationQualification: {
    minimumPrimaryManagedBytesSavedPerOperation: 32,
    minimumComparisonsOfThree: 2,
    requireDistinctionFromUnchangedControls: true,
    doNotHideAdversePrimaryOrOrdinaryPathLatency: true
  },
  ordinaryPathGuard: 'Reject an allocation-only proposal if UnmodifiedDefault5 CopyTo has at least 5% median more time, is slower in at least two pairs, and the adverse effect is not explained by corresponding unchanged IndexOf movement. Retain every outcome.',
  clearEarlyStop: 'After one comparison only for at least 50% less primary time, both case CVs at most 10%, no undermining ramp, benefit larger than its unchanged IndexOf control, and no material adverse ordinary-path observation.',
  maximumComparisonAuthorizationsIncludingFailedOrPartial: 3,
  comparisonOrders: [['Original', 'Candidate'], ['Candidate', 'Original'], ['Original', 'Candidate']],
  benchmarkDotNet: {
    version: '0.13.0', runtime: '12.0.0-alpha.1.26562.105',
    warmups: 3, retained: 8, requestedIterationMilliseconds: 100,
    unroll: 1, outlierMode: 'DontRemove', settingsPreservingExecutor: true, powerPlanChangeRequested: false
  },
  sourceIsolation: 'Original/candidate use byte-identical common harness DLL/PDB and dependencies, replacing only the actual source-built MVC Core owner DLL/PDB. Preserve complete images and selected source/PE/PDB bindings without claiming complete compiler provenance.',
  independentAudit: 'Recompute every retained actual-minus-median-adaptive-overhead sample, statistics, raw GC allocation arithmetic, authorizations/orders, actual settings, loaded owners and individual XML rows.',
  independentReproduction: 'Actually restore/rebuild the exact relocated harness inputs and characterize both source variants with measured owners/dependencies fixed. No extra timing.',
  machine: 'Shared non-isolated Windows box. Serialize builds and timing, at most two MSBuild workers; never alter process/thread priority, affinity, power, firewall, URL ACL or OS settings.',
  publication: 'Fork-only source and connected immutable evidence. Create/open a new draft in its own visible Edge window only when justified. No speculative no-gain/rejected PR. Advance only F121 and official counters after remote evidence verification; fixed REPORT stays unchanged.',
  excludedClaims: ['normal MVC request speedup', 'whole application throughput', 'representative call frequency', 'compiled page/browser coverage', 'AOT/trimming', 'packaging', 'merge readiness']
};
write('acceptance-plan.json', plan);
write('intake-completed.json', {
  candidate: 'F121', actualCompletedAt: new Date().toISOString(),
  actualBaseline: baseline, actualCurrentDefault: actualDefault,
  actualCurrentDefaultCommittedAt: metadata.commit.committer.date,
  actualDefaultSourceRoot: defaultRoot,
  actualLspCoverageLimitedToCurrentFile: true,
  actualLspLogUnavailable: true,
  actualPreservationTestSourceAlreadyAuthoredButNotBuiltOrExecuted: true,
  actualPreviousFindingBudgetRemainsClosed: true,
  actualAcceptancePlanSha256: sha(fs.readFileSync(path.join(run, 'acceptance-plan.json'))),
  actualSelectedInputs: comparisons, actualProtectedPrimaryInputs: protectedInputs
});
console.log(JSON.stringify({ candidate: 'F121', actualAcceptanceSealed: true, actualSelectedCurrentDefaultInputsMatching: comparisons.length, actualShippingEdits: 0, actualTimingRuns: 0, run }, null, 2));
