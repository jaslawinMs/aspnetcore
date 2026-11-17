import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F033');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
assert.ok(!fs.existsSync(path.join(run, 'measurement-plan.json')));
assert.ok(!fs.existsSync(path.join(run, 'measurement-budget.json')));
const status = spawnSync('git', ['status', '--porcelain', '--untracked-files=no'],
  { cwd: String.raw`C:\src\aspnetcore`, encoding: 'utf8' });
assert.equal(status.status, 0);
assert.equal(status.stdout.trim(), '');
const manifest = read(path.join(run, 'preparation-original-002', 'prepared', 'capsule.json'));
const passed = read(path.join(run, 'profiles', 'characterize-original-002', 'verified-native-exit.json'));
assert.equal(passed.actualNativeExitCode, 0);
assert.equal(passed.actualMode, 'characterize');
assert.equal(passed.actualHarnessSha256, manifest.actualHarnessSha256);
const originalTests = read(path.join(run, 'validation', 'original-existing-1', 'verified-result.json'));
assert.equal(originalTests.actualPassed, 15);
assert.equal(originalTests.actualSkipped, 0);
const profiles = ['Request.Sync.None.128', 'Request.Sync.Ready.128', 'Request.Sync.Ready.4096',
  'Request.Async.Ready.128', 'Live.Sync.Started.Zero', 'Live.Async.Started.Zero'];
const plan = {
  candidate: 'F033', actualDeclaredBeforeProductEditAndNativeTiming: true,
  actualDeclaredAt: new Date().toISOString(),
  strategy: 'Only synchronous ResponseStream.Write retains actual startTask and avoids GetAwaiter().GetResult only for IsCompletedSuccessfully. Every pending/faulted/canceled start remains awaited. Keep start-before-argument-validation-before-default-IO-rejection,Flush/all async methods/producer/native implementation/defaults/API unchanged.',
  primaryProfile: 'Request.Sync.Ready.128',
  supportingSyncProfiles: ['Request.Sync.None.128', 'Request.Sync.Ready.4096'],
  limitedPreparedSyncProfile: 'Live.Sync.Started.Zero',
  unchangedAsyncControls: ['Request.Async.Ready.128', 'Live.Async.Started.Zero'],
  profiles, maximumActualSourceComparisons: 3,
  pairedOrder: [['original', 'candidate'], ['candidate', 'original'], ['original', 'candidate']],
  originalPreparation: 'preparation-original-002', originalCharacterization: 'characterize-original-002',
  expectedCandidatePreparation: 'preparation-candidate', expectedCandidateCharacterization: 'characterize-candidate',
  actualOriginalHarnessSha256: manifest.actualHarnessSha256,
  actualOriginalHarnessPdbSha256: manifest.actualHarnessPdbSha256,
  actualOriginalClosureFiles: manifest.actualClosureFiles,
  expectedCandidateClosureDifference: ['Microsoft.AspNetCore.Server.HttpSys.dll', 'Microsoft.AspNetCore.Server.HttpSys.pdb'],
  exactRecordedErrorTypesAndParameterNamesMustMatchAcrossVariants: true,
  characterization: 'Six completed profiles plus22additional actual pending/default/error/ranged-data/argument/first-zero contracts and six actual void-setup/workload/cleanup lifecycles. Strict original-vs-candidate concrete argument error/parameter/header/order/wire comparison required,including native past-end ArgumentOutOfRangeException(count).',
  initialUntimedFailure: {
    label: 'characterize-original', actualNativeExit: -532462766, actualTimedComparisonsConsumed: 0,
    actualFailure: 'Harness assumed exact base ArgumentException/no parameter for past-end array;actual pinned native validation uses ArgumentOutOfRangeException(count). First three concrete argument cases passed;one owned listener gracefully disposed. No shipping source edit or timing.',
    correction: 'Retain exact runtime observations before assertion;assert public ArgumentException contract for bounds,and require exact observed concrete type/parameter equality across actual owner variants. Corrected original and lifecycle characterization passed before this plan.',
    originalImage: 'preparation-original', retainedUnchanged: true,
    failedRuntimeSourceLookup: 'Reported CoreLib commit dfd6ac738610ea05f42e704be82b386e71052e12 unavailable publicly(404). Not compiler-provenance proof.',
  },
  earlyStop: 'Only a clear compatible >=50% primary full-request gain not explained by unchanged controls may stop early. A prepared zero-byte microboundary gain alone is not full-request evidence. Otherwise use all3slots;partial/failed timing consumes its slot without reset.',
  measurement: {
    benchmarkDotNet: '0.13.0', executor: 'byte-exact settings-preserving in-process emit',
    settingsExecutorSourceSha256: '02B69C0AA06612700D9DA122BA64081771EE333B126DABC08156C0BD118F115B',
    warmups: 3, resultSamplesPerProfile: 8, iterationTimeMilliseconds: 100,
    unrollFactor: 1, outliers: 'DontRemove', powerPlan: 'Guid.Empty',
  },
  qualification: 'Shared non-isolated Windows VM;serialize heavy work,max2MSBuild workers,never set priority/affinity/power/OS/URL-ACL/firewall settings. Full request includes client/fixture/native IO/complete byte validation and disposal. Prepared zero-length writes have initial128B+header send before timing,no new native send per measured operation. Not nonzero network throughput or production app speedup.',
  noGainRule: 'Require repeatable meaningful compatible benefit after unchanged controls and variability. No demonstrated gain means restore byte-exact source/product,publish honest no-gain issue/evidence,not an artificial PR. Always retain adverse timings,allocation residuals,raw failures and exact native samples.',
};
const budget = {
  candidate: 'F033', maximumActualSourceComparisons: 3,
  actualSourceComparisonsStarted: 0, actualSourceComparisonsCompleted: 0, actualSourceComparisonsConcluded: 0,
  sourceComparisonBudgetClosed: false, pairedOrder: plan.pairedOrder,
  authoritativePreparations: { original: 'preparation-original-002', candidate: 'preparation-candidate' },
  authoritativeCharacterizations: { original: 'characterize-original-002', candidate: 'characterize-candidate' },
  nativeProfilesStarted: [], nativeProfilesCompleted: [], comparisonsSettled: [],
};
fs.writeFileSync(path.join(run, 'measurement-plan.json'), JSON.stringify(plan, null, 2) + '\n');
fs.writeFileSync(path.join(run, 'measurement-budget.json'), JSON.stringify(budget, null, 2) + '\n');
fs.writeFileSync(path.join(run, 'measurement-plan-receipt.json'), JSON.stringify({
  candidate: 'F033', actualPlanSha256: hash(path.join(run, 'measurement-plan.json')),
  actualOriginalNativeCharacterizationSha256: hash(path.join(run, 'profiles', 'characterize-original-002', 'verified-native-exit.json')),
  actualSourceStillUnchangedBeforePlan: true, actualTimedComparisonsStarted: 0,
}, null, 2) + '\n');
console.log('F033:pre-edit measurement plan sealed;3comparison slots,6profiles,exact original producer/error/wire/lifecycle characterization bound.');
