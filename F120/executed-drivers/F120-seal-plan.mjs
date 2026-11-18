import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F120');
const read = name => JSON.parse(fs.readFileSync(path.join(run, name), 'utf8'));
const intake = read('intake-completed.json');
const git = args => {
  const result = spawnSync('git', ['--no-pager', ...args], { cwd: intake.root, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};
assert.equal(git(['rev-parse', 'HEAD']), intake.baseline);
assert.equal(git(['branch', '--show-current']), intake.branch);
assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
assert.equal(fs.existsSync(path.join(run, 'acceptance-plan.json')), false);
const profiles = [
  { key: 'CopiedDefault5Miss', copied: true, factoryCount: 'default-five', match: 'missing', role: 'primary' },
  { key: 'UnmodifiedDefault5Miss', copied: false, factoryCount: 'default-five', match: 'missing', role: 'unchanged ordinary-path control' },
  { key: 'CopiedDefault5First', copied: true, factoryCount: 'default-five', match: 'first', role: 'early-hit secondary' },
  { key: 'CopiedDefault5Last', copied: true, factoryCount: 'default-five', match: 'last', role: 'late-hit secondary' },
  { key: 'CopiedEmptyMiss', copied: true, factoryCount: 0, match: 'missing', role: 'empty control' },
  { key: 'CopiedOneMiss', copied: true, factoryCount: 1, match: 'missing', role: 'small copied secondary' },
  { key: 'CopiedEightMiss', copied: true, factoryCount: 8, match: 'missing', role: 'scaled copied secondary' },
  { key: 'UnmodifiedDefault5First', copied: false, factoryCount: 'default-five', match: 'first', role: 'unchanged early-hit control' }
];
const plan = {
  candidate: 'F120', actualSealedAt: new Date().toISOString(),
  actualShippingEditsAtSeal: 0, actualNewPermanentTestFilesAtSeal: 0, actualBenchmarkRunsAtSeal: 0,
  baseline: intake.baseline, actualCurrentDefault: intake.actualCurrentDefault, branch: intake.branch,
  classification: 'Behavior-preserving private copied-store specialization; no public API or equality-policy change.',
  target: 'CopyOnWriteList<T>.Contains only; do not alter CopyTo, GetEnumerator, IndexOf or object.Equals.',
  proposedChange: 'When _copy is not null, enumerate that private concrete List<T> with the original object.Equals(obj, item) loop and early return. Leave the existing source-backed interface loop exactly intact.',
  rationale: 'All four observed controller/page producers cache arrays. A private List<T> is created only after a per-request write. The target is that optional already-copied store, not the ordinary unmodified request or whole MVC throughput.',
  benchmarkClass: 'AutoPerf.CollectionBenchmarks',
  benchmarkMethod: 'Contains', unchangedControlMethod: 'UnchangedIndexOf',
  primary: 'CopiedDefault5Miss', unchangedControl: 'UnmodifiedDefault5Miss',
  profileKeys: profiles.map(profile => profile.key), profiles,
  actualTimedBoundary: 'One public IList<IValueProviderFactory>.Contains call on a real, already-produced MVC CopyOnWriteList and stable prepared probe. Store creation, first-write copying, host/request setup, reflection and result validation are outside timing.',
  actualUnchangedControlBoundary: 'IndexOf on the same prepared store and probe; its source stays untouched. Ordinary unmodified Contains profiles separately expose any common-path cost.',
  actualProductionProducerRequirement: 'Untimed TestServer HTTP requests must exercise real controller routing/activation and obtain ControllerContext.ValueProviderFactories without assigning that property or constructing a surrogate list. Exercise both EnableActionInvokers settings and public mutation to establish original array/private-copy state and isolation across requests.',
  actualDefaultFactoryCountMustBeVerified: 5,
  actualEmptyAndScaledSetup: 'Configure MvcOptions.ValueProviderFactories on a real host; a parameterless action reads the HTTP query directly so an empty configured factory list cannot silently skip a bound mutation scenario.',
  actualPageBoundary: 'Inspect both Razor Pages producers and exercise relevant existing managed tests if implementation is retained. The collection contract is fully managed. MVC HTTP evidence does not by itself establish a real compiled-page request; disclose that boundary.',
  preservation: [
    'Original/current-default source and owning behavior checked before a shipping edit; target blob must match or differences be explicitly reconciled.',
    'Preserve object.Equals rather than EqualityComparer<T>.Default or List<T>.Contains, including observable equality ordering and callback semantics.',
    'Preserve early success, enumeration/version failure after nonmatching reentrant mutation, and enumerator cleanup.',
    'Preserve original source and per-request copy isolation, null/missing/present inputs, empty and one-item stores.',
    'Preserve arbitrary IReadOnlyList<T> and subclass/interface enumeration on the untouched fallback; do not index it or assume it is a List<T>.',
    'New focused managed coverage must pass on untouched source and candidate. This is green/green preservation, not a semantic-bug red/green claim.',
    'Use existing MVC test naming/project categories. Do not put an HTTP host test into its unit project.',
    'No shipping InternalsVisibleTo, UnsafeAccessor, global.json, package.json, package-lock.json or NuGet.config edits.'
  ],
  numericalTimingQualification: {
    minimumMedianPairedLessTimePercent: 5, minimumPrimaryFasterComparisonsOfThree: 2,
    rejectTimingOnlyWhenPrimaryAtMostUnchangedSameProfileIndexOfControlInAtLeastComparisons: 2
  },
  alternativeAllocationQualification: {
    minimumPrimaryManagedBytesSavedPerOperation: 32, minimumComparisonsOfThree: 2,
    requireDistinctionFromUnchangedControls: true, doNotHideAdversePrimaryOrOrdinaryPathLatency: true
  },
  ordinaryPathGuard: 'Reject an allocation-only proposal if the ordinary unmodified-default Contains has at least 5% median more time, is slower in at least two pairs, and its adverse effect is not explained by corresponding unchanged IndexOf control movement in those pairs. Retain all observations even on rejection.',
  clearEarlyStop: 'After one comparison only if the declared copied primary has at least 50% less time, both source-case CVs are at most 10%, no observed primary ramp undermines it, primary exceeds its unchanged IndexOf control, and ordinary unmodified Contains controls show no material adverse result. A merely lower-allocation result uses the remaining budget.',
  maximumComparisonAuthorizationsIncludingFailedOrPartial: 3,
  comparisonOrders: [['Original', 'Candidate'], ['Candidate', 'Original'], ['Original', 'Candidate']],
  benchmarkDotNet: { version: '0.13.0', runtime: '12.0.0-alpha.1.26562.105',
    warmups: 3, retained: 8, requestedIterationMilliseconds: 100, unroll: 1, outlierMode: 'DontRemove',
    settingsPreservingExecutor: true, powerPlanChangeRequested: false },
  sourceIsolation: 'Identical measured common harness DLL/PDB and every other dependency; replace only the tested source-built MVC Core owner DLL/PDB. Preserve original/default/candidate source, complete image hashes and selected PE/PDB associations. Do not claim complete compiler provenance.',
  independentAudit: 'Recompute every retained actual-minus-median-adaptive-overhead sample, statistics and midpoint-to-even allocation arithmetic; audit source orders, authorizations, actual settings, loaded owners and individual XML rows.',
  independentReproduction: 'Relocate the exact hashed project inputs, actually restore/rebuild them, and characterize original/candidate with measured owner bytes and all other dependencies fixed; no additional timing.',
  machine: 'Shared non-isolated Windows box. No process/thread priority, affinity, power, firewall, URL ACL or OS setting changes. No parallel overlapping builds or timing.',
  publication: 'Fork-only independent branch, connected evidence and honest disposition. Open each justified new draft immediately in a distinct visible Edge window. No draft for no-gain/rejected outcomes; do not update the fixed classified report or official counter before remote evidence verification.',
  excludedClaims: ['ordinary/default-request gain', 'whole MVC/Razor Pages or application throughput', 'representative production frequency', 'browser behavior', 'AOT/trimming', 'packaging', 'merge readiness']
};
const bytes = JSON.stringify(plan, null, 2) + '\n';
fs.writeFileSync(path.join(run, 'acceptance-plan.json'), bytes, { flag: 'wx' });
fs.writeFileSync(path.join(run, 'diagnostic-budget.json'), JSON.stringify({
  candidate: 'F120', maximum: 3, authorized: [], completed: [], failedOrPartialAttempts: [],
  permanentlyClosed: false, actualAcceptancePlanSha256: crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),
  actualShippingEditsAtCreation: 0, actualCreated: new Date().toISOString()
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: 'F120', actualPreimplementationPlanSealed: true,
  actualProfileCount: profiles.length, actualMaximumComparisons: 3, actualRecordedComparisons: 0,
  actualTimedBoundary: plan.actualTimedBoundary }, null, 2));
