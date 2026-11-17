import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const [runArgument, operation] = process.argv.slice(2);
assert.ok(runArgument && ['--finalize', '--verify'].includes(operation), 'Supply the F024 capsule root and --verify,or finalize the already completed historical records once.');
const run = path.resolve(runArgument);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const relative = file => path.relative(run, file).replaceAll('\\', '/');
const relocate = original => {
  const marker = '/autoperf-runs/F024/';
  const normalized = original.replaceAll('\\', '/');
  const start = normalized.indexOf(marker);
  assert.ok(start >= 0, `Recorded path is outside F024:${original}`);
  return path.join(run, ...normalized.slice(start + marker.length).split('/'));
};
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const names = [
  'Commit.Infinite.Set.None', 'Commit.Infinite.Set.Caller', 'Commit.Infinite.Refresh.None', 'Commit.Infinite.Refresh.Caller',
  'Commit.Default.Set.None', 'Commit.Default.Refresh.Caller', 'Load.Infinite.Hit.None', 'Load.Default.Hit.None',
];
const primary = ['Commit.Infinite.Set.None', 'Commit.Infinite.Refresh.None'];
const firstNames = ['Commit.Infinite.Set.None', 'Commit.Default.Refresh.Caller'];
const producerNames = [
  ...['Set', 'Refresh'].flatMap(branch => [
    `Infinite.${branch}.Pending.Success`, `Finite.${branch}.Pending.Timeout`, `Zero.${branch}.Pending.Timeout`,
    `Infinite.${branch}.Caller.BeforeEntry`, `Infinite.${branch}.Caller.Pending`, `Infinite.${branch}.Cache.Fault.Retry`,
    `Invalid.${branch}.Negative`, `Invalid.${branch}.TooLarge`, `Infinite.${branch}.Owned.Source.Lifetime`,
    `Infinite.${branch}.Success.Then.Refresh`,
  ]),
  'Infinite.Info.Get.Success', 'Infinite.Info.Get.Fault.Then.Store',
  'Infinite.Info.Get.Caller.Pending', 'Finite.Info.Get.Timeout.Then.Retry',
];
const settings = { processPriority: 'Normal', threadPriority: 'Normal', affinity: 65535 };
const capsule = read(path.join(run, 'prepared', 'capsule.json'));
const budgetPath = path.join(run, 'measurement-budget.json');
const budget = read(budgetPath);
assert.equal(budget.maximum_actual_comparisons, 3);
assert.equal(budget.actual_comparisons_started, 3);
assert.equal(budget.actual_comparisons_completed, 3);
assert.equal(budget.actual_timing_profiles_started, 18);
assert.equal(budget.attempts.length, 3);
assert.equal(budget.comparison_budget_closed, operation === '--verify');
assert.equal(capsule.actualClosureFiles, 98);
assert.equal(capsule.actualBuiltAsBaselinePlusUncommittedScopedPatch, true);
assert.equal(capsule.actualF023LoadAndNonCommitSourceUnchanged, true);
assert.equal(capsule.actualSettingsExecutorSourceSha256, '02B69C0AA06612700D9DA122BA64081771EE333B126DABC08156C0BD118F115B');
const closures = Object.fromEntries(['original', 'selected'].map(variant =>
  [variant, read(relocate(capsule.variants[variant].closurePath))]));
for (const variant of ['original', 'selected']) {
  assert.equal(closures[variant].files.length, 98);
  assert.equal(new Set(closures[variant].files.map(file => file.path)).size, 98);
  for (const source of capsule.variants[variant].sourceFiles) {
    assert.equal(hash(path.join(relocate(capsule.variants[variant].directory), ...source.path.split(/[\\/]/))),
      source.sha256);
  }
}
const differences = closures.original.files.filter(before =>
  closures.selected.files.find(after => after.path === before.path)?.sha256 !== before.sha256).map(file => file.path).sort();
assert.deepEqual(differences, ['Microsoft.AspNetCore.Session.dll', 'Microsoft.AspNetCore.Session.pdb']);
const ownerText = variant => fs.readFileSync(path.join(relocate(capsule.variants[variant].sources), 'owner', 'DistributedSession.cs'), 'utf8');
const marker = '    public async Task CommitAsync';
const suffix = '    // Format:';
assert.equal(ownerText('original').slice(0, ownerText('original').indexOf(marker)), ownerText('selected').slice(0, ownerText('selected').indexOf(marker)));
assert.equal(ownerText('original').slice(ownerText('original').indexOf(suffix)), ownerText('selected').slice(ownerText('selected').indexOf(suffix)));
const snapshots = [];
for (const variant of ['original', 'selected']) {
  const directory = path.join(run, 'profiles', `characterize-${variant}`);
  const exit = read(path.join(directory, 'verified-native-exit.json'));
  assert.equal(exit.actualNativeExitCode, 0);
  const states = fs.readdirSync(path.join(directory, 'states')).filter(file => file.endsWith('.json')).map(file =>
    ({ file, value: read(path.join(directory, 'states', file)) }));
  const completion = states.filter(row => row.file.endsWith('-characterization-completed.json'));
  assert.equal(completion.length, 1);
  assert.equal(completion[0].value.actualTimedWrapperPaths, 8);
  assert.equal(completion[0].value.actualRecordedProfileContracts, 16);
  assert.equal(completion[0].value.actualAdditionalProducerContracts, 24);
  const producers = states.filter(row => row.file.endsWith('-producer-contract.json')).map(row => row.value);
  assert.deepEqual(producers.map(row => row.name).sort(), [...producerNames].sort());
  assert.ok(producers.every(row => row.actualOwningProducerExercised));
  snapshots.push({ variant, actualWrappers: 8, actualValueContracts: 16, actualAdditionalProducerContracts: 24 });
}
const samples = [];
const cold = [];
const profiles = [];
for (const attempt of budget.attempts) {
  assert.equal(attempt.status, 'completed');
  assert.equal(attempt.actualFailure, null);
  assert.equal(attempt.profilesStarted.length, 6);
  assert.equal(attempt.profilesCompleted.length, 6);
  assert.deepEqual(attempt.warmVariantOrder, attempt.number % 2 ? ['original', 'selected'] : ['selected', 'original']);
  for (const started of attempt.profilesStarted) {
    const directory = path.join(run, 'profiles', started.label);
    const invocationPath = path.join(directory, 'invocation.json');
    const invocation = read(invocationPath);
    const completed = attempt.profilesCompleted.find(value => value.label === started.label);
    assert.ok(completed);
    assert.equal(completed.actualInvocationSha256, hash(invocationPath));
    assert.equal(completed.actualNativeExitCode, 0);
    assert.equal(invocation.actualExitCode, 0);
    assert.equal(invocation.actualComparisonAttempt, attempt.number);
    assert.equal(invocation.variant, started.variant);
    assert.equal(invocation.mode, started.mode);
    assert.equal(invocation.actualHarnessSha256, capsule.actualHarnessSha256);
    assert.equal(invocation.actualClosureFileCount, 98);
    const variant = capsule.variants[started.variant];
    assert.equal(invocation.actualClosureSha256, hash(relocate(variant.closurePath)));
    assert.equal(invocation.actualOwnerSha256, variant.owners[0].sha256);
    const nativeExit = read(path.join(directory, 'verified-native-exit.json'));
    assert.equal(nativeExit.actualNativeExitCode, 0);
    assert.equal(nativeExit.actualClosureBeforeAndAfterMatched, true);
    assert.equal(nativeExit.actualCommonHarnessSha256, capsule.actualHarnessSha256);
    const stateDirectory = path.join(directory, 'states');
    const states = fs.readdirSync(stateDirectory).filter(file => file.endsWith('.json')).map(file =>
      ({ file, value: read(path.join(stateDirectory, file)) }));
    const matching = suffix => states.filter(row => row.file.endsWith(suffix)).map(row => row.value);
    const single = suffix => {
      const actual = matching(suffix);
      assert.equal(actual.length, 1, `${started.label}:${suffix}`);
      return actual[0];
    };
    const runtime = single('-runtime.json');
    assert.equal(runtime.context, started.variant);
    assert.equal(runtime.mode, started.mode);
    assert.equal(runtime.actualX64Process, true);
    assert.equal(runtime.serverGc, true);
    assert.equal(runtime.sharedMachineNotIsolated, true);
    assert.equal(runtime.ownerSha256, invocation.actualOwnerSha256);
    assert.equal(runtime.harnessSha256, invocation.actualHarnessSha256);
    assert.equal(runtime.actualClosureSha256, invocation.actualClosureSha256);
    assert.deepEqual(runtime.initialSettings, settings);
    const core = runtime.runtimeAssemblies.find(row => row.name === 'System.Private.CoreLib');
    assert.ok(core);
    assert.equal(core.sha256, '0CEBA028A838AFF170CFF9D03570B34F9F044D6A9597974088E58B9834DF74E4');
    assert.equal(core.informationalVersion, '12.0.0-alpha.1.26562.105+dfd6ac738610ea05f42e704be82b386e71052e12');
    for (const [assembly, expectedDocuments] of [['Microsoft.AspNetCore.Session', 4], ['AutoPerf.Benchmarks', 5]]) {
      const witness = single(`-source-pdb-${assembly}.json`);
      assert.equal(witness.actualPePdbBindingMatched, true);
      assert.equal(witness.codeViewGuid, witness.pdbGuid);
      assert.equal(witness.assemblySha256, assembly === 'AutoPerf.Benchmarks' ? runtime.harnessSha256 : runtime.ownerSha256);
      assert.equal(witness.documents.length, expectedDocuments);
      for (const document of witness.documents) {
        assert.equal(hash(relocate(document.source)), document.sha256);
      }
    }
    if (started.mode === 'measure') {
      assert.equal(single('-completed.json').actualReports, 8);
      assert.equal(single('-completed.json').allSuccessful, true);
      for (const suffix of ['-settings-before.json', '-settings-setup.json', '-settings-after.json']) {
        const actualSettings = matching(suffix);
        assert.equal(actualSettings.length, 8);
        actualSettings.forEach(value => assert.deepEqual(value, settings));
      }
      const contracts = matching('-public-profile-contract.json');
      assert.equal(contracts.length, 16);
      assert.deepEqual(contracts.map(row => row.profile).sort(), names.flatMap(name => [name, name]).sort());
      contracts.forEach(contract => {
        assert.equal(contract.observed, contract.expected);
        assert.equal(contract.actualStoredPayloadConsumedInTimedWrapper, true);
        assert.equal(contract.actualCompletedPublicWrapper, true);
      });
      const reportPath = path.join(directory, 'results', 'AutoPerf.SessionBenchmarks-report-full.json');
      const report = read(reportPath);
      assert.equal(report.Benchmarks.length, 8);
      const observedNames = [];
      for (const row of report.Benchmarks) {
        const match = /^AutoPerf\.SessionBenchmarks\.CreateUseConsume\(Case: "([^"]+)"\)$/.exec(row.FullName);
        assert.ok(match, row.FullName);
        const name = match[1];
        observedNames.push(name);
        assert.ok(Number.isFinite(row.Statistics.Mean) && row.Statistics.Mean > 0);
        assert.ok(Number.isFinite(row.Statistics.StandardDeviation) && row.Statistics.StandardDeviation >= 0);
        assert.ok(row.Statistics.N > 0);
        assert.equal(row.Statistics.OriginalValues.length, row.Statistics.N);
        const measured = row.Measurements.filter(value => value.IterationMode === 'Workload' && value.IterationStage === 'Result');
        assert.equal(measured.length, row.Statistics.N);
        assert.ok(measured.every(value => value.Operations > 0 && value.Nanoseconds > 0));
        const recomputed = measured.map(value => value.Nanoseconds / value.Operations).sort((a, b) => a - b);
        const reported = [...row.Statistics.OriginalValues].sort((a, b) => a - b);
        recomputed.forEach((value, index) => assert.ok(Math.abs(value - reported[index]) <= Math.max(1e-8, Math.abs(value) * 1e-10)));
        const recomputedMean = recomputed.reduce((sum, value) => sum + value, 0) / recomputed.length;
        assert.ok(Math.abs(recomputedMean - row.Statistics.Mean) <= Math.max(1e-8, Math.abs(recomputedMean) * 1e-10));
        assert.ok(Number.isFinite(row.Memory.BytesAllocatedPerOperation) && row.Memory.BytesAllocatedPerOperation >= 0);
        samples.push({
          comparison: attempt.number, variant: started.variant, name, actualMeanNs: row.Statistics.Mean,
          actualBytesPerOperation: row.Memory.BytesAllocatedPerOperation, actualRetainedMeasurementCount: row.Statistics.N,
          actualConfidenceInterval: row.Statistics.ConfidenceInterval, actualStdDev: row.Statistics.StandardDeviation,
          report: relative(reportPath), actualHarnessSha256: invocation.actualHarnessSha256,
        });
      }
      assert.deepEqual(observedNames.sort(), [...names].sort());
    } else {
      assert.equal(started.mode, 'first-use');
      const record = single('-first-observed-public-call.json');
      assert.equal(record.context, started.variant);
      assert.equal(record.profile, started.firstCase);
      assert.equal(record.observed, 42);
      assert.ok(record.actualElapsedTicks > 0 && record.stopwatchFrequency > 0 && record.actualAllocatedBytes > 0);
      cold.push({
        comparison: attempt.number, variant: started.variant, name: record.profile,
        actualMilliseconds: record.actualElapsedTicks * 1000 / record.stopwatchFrequency,
        actualAllocatedBytes: record.actualAllocatedBytes, actualObservedResult: record.observed,
        boundary: record.boundary, stateDirectory: relative(stateDirectory),
      });
    }
    profiles.push({ label: started.label, actualInvocationSha256: hash(invocationPath), actualNativeExitCode: 0 });
  }
}
assert.equal(samples.length, 48);
assert.equal(cold.length, 12);
assert.equal(profiles.length, 18);
const pairs = (rows, metric) => [1, 2, 3].map(comparison => {
  const original = rows.find(row => row.comparison === comparison && row.variant === 'original');
  const selected = rows.find(row => row.comparison === comparison && row.variant === 'selected');
  assert.ok(original && selected);
  return { comparison, original: original[metric], selected: selected[metric],
    improvementPercent: original[metric] === 0 ? null : 100 * (1 - selected[metric] / original[metric]) };
});
const summaries = names.map(name => {
  const rows = samples.filter(row => row.name === name);
  const timing = pairs(rows, 'actualMeanNs');
  const allocation = pairs(rows, 'actualBytesPerOperation');
  return {
    name, primary: primary.includes(name), explicitInfiniteTimeoutTarget: name.startsWith('Commit.Infinite.'),
    timing, allocation, medianPairedTimeImprovementPercent: median(timing.map(pair => pair.improvementPercent)),
    minimumPairedTimeImprovementPercent: Math.min(...timing.map(pair => pair.improvementPercent)),
    maximumPairedTimeImprovementPercent: Math.max(...timing.map(pair => pair.improvementPercent)),
    medianOriginalBytes: median(allocation.map(pair => pair.original)),
    medianSelectedBytes: median(allocation.map(pair => pair.selected)),
    minimumRetainedMeasurementCount: Math.min(...rows.map(row => row.actualRetainedMeasurementCount)),
  };
});
const coldSummaries = firstNames.map(name => {
  const rows = cold.filter(row => row.name === name);
  return { name, timing: pairs(rows, 'actualMilliseconds'), allocation: pairs(rows, 'actualAllocatedBytes'),
    interpretation: 'Three single observations per image,including fixture/caller,seed/commit,JIT and metadata. No cold-start or isolated-entry performance conclusion.' };
});
const allocationAccounting = [
  ['Commit.Infinite.Set.None', 'Commit.Default.Set.None'],
  ['Commit.Infinite.Refresh.Caller', 'Commit.Default.Refresh.Caller'],
].map(([target, finiteControl]) => ({
  target, finiteControl,
  comparisons: [1, 2, 3].map(comparison => {
    const targetPair = summaries.find(row => row.name === target).allocation.find(row => row.comparison === comparison);
    const controlPair = summaries.find(row => row.name === finiteControl).allocation.find(row => row.comparison === comparison);
    const targetSaving = targetPair.original - targetPair.selected;
    const finiteControlSaving = controlPair.original - controlPair.selected;
    return { comparison, actualTargetSaving: targetSaving, actualFiniteControlSaving: finiteControlSaving,
      actualControlRelativeSaving: targetSaving - finiteControlSaving };
  }),
  interpretation: 'Observed allocation accounting for timeout-matched caller shapes,not identification of the allocated types or proof of a universal runtime mechanism.',
}));
const output = {
  candidate: 'F024', actualComparedProductImplementations: 1, actualCommonHarnessSha256: capsule.actualHarnessSha256,
  actualCompletedComparisons: 3, actualTimingProfiles: 18, actualNativeWarmRows: 48, actualFirstObservedRows: 12,
  actualConsumerClosureFiles: 98, actualOnlyClosureDifferences: differences, actualCharacterizations: snapshots,
  profiles, actualWarmSamples: samples, warmSummaries: summaries, firstObservedSamples: cold, firstObservedSummaries: coldSummaries,
  actualTimeoutMatchedAllocationAccounting: allocationAccounting,
  limits: [
    'Shared Windows VM,not dedicated or isolated. Initial settings and warm before/setup/after point observations remained Normal/Normal/65535. No OS settings were changed.',
    'Opt-in exact InfiniteTimeSpan only. Finite/default cancellation stays scheduled;there is no default-configuration,HTTP,remote-I/O,production-frequency or application-speedup claim.',
    'Default-path controls preserve finite work but traverse the new comparison guard;they are not byte-identical IL controls. Explicit LoadAsync controls have unchanged owner source;F023 is not carried.',
    'One common actual harness and single proposed product implementation across all three comparisons. Native retained N after outlier treatment is authoritative.',
    'Public wrapper includes Task<int> consumer and per-wrapper accounting,common to both images. Unit resource totals and BDN totals are different callers/JIT/consumer boundaries;do not equate their absolute allocations.',
    'Source/PE/PDB selected-document identities are not full compiler provenance or method coverage. Copied-text verification cannot rehash omitted binaries or runtime files.',
    'Every native/control/cold result is retained. Observed paired means are not clean causal timing evidence when controls or environment drift.',
    'Finite/default allocation controls also move on this exact runtime. Retain the full observed savings and timeout-matched control-relative accounting;do not attribute all bytes to the skipped disabled timer or invent the cause of the extra finite-path change.',
  ],
};
const observedSavings = predicate => [...new Set(summaries.filter(predicate).flatMap(row =>
  row.allocation.map(pair => pair.original - pair.selected)))].sort((a, b) => a - b).join('/');
const n = value => value.toFixed(2);
const markdown = [
  '# F024 measured comparison',
  '',
  'Three actual comparisons;48 native warm rows and12 first-observed observations. Positive percentage means less time.',
  `Observed infinite-target allocation reductions:${observedSavings(row => row.explicitInfiniteTimeoutTarget)} B/op;finite/default reductions:${observedSavings(row => row.name.startsWith('Commit.Default.'))} B/op;unchanged-source load-control reductions:${observedSavings(row => row.name.startsWith('Load.'))} B/op.`,
  'Do not attribute the entire observed reduction to a disabled timer. Finite/default paths also move;timeout-matched control-relative accounting is reported separately.',
  'Shared VM,control drift and the added finite-path guard limit timing attribution;do not convert the observed means into application/default-configuration speedups.',
  '',
  '| Actual public profile | Original ns/op,1/2/3 | Selected ns/op,1/2/3 | Observed paired improvement %,1/2/3 | Median original/selected B/op |',
  '|---|---:|---:|---:|---:|',
  ...summaries.map(row => `| ${row.name}${row.primary ? ' (primary)' : ''} | ${row.timing.map(pair => n(pair.original)).join(' / ')} | ${row.timing.map(pair => n(pair.selected)).join(' / ')} | ${row.timing.map(pair => n(pair.improvementPercent)).join(' / ')} | ${row.medianOriginalBytes} / ${row.medianSelectedBytes} |`),
  '',
  '## Allocation accounting against timeout-matched finite controls',
  '',
  '| Infinite target / finite control | Target savings B/op,1/2/3 | Finite control savings B/op,1/2/3 | Difference in savings B/op,1/2/3 |',
  '|---|---:|---:|---:|',
  ...allocationAccounting.map(row => `| ${row.target} / ${row.finiteControl} | ${row.comparisons.map(pair => pair.actualTargetSaving).join(' / ')} | ${row.comparisons.map(pair => pair.actualFiniteControlSaving).join(' / ')} | ${row.comparisons.map(pair => pair.actualControlRelativeSaving).join(' / ')} |`),
  '',
  'Accounting is not a type-allocation or JIT-mechanism proof;no general default-configuration gain claim.',
  '',
  '## First observed:fixture,seed/commit,JIT and metadata included',
  '',
  '| Public profile | Original ms,1/2/3 | Selected ms,1/2/3 | Original bytes,1/2/3 | Selected bytes,1/2/3 |',
  '|---|---:|---:|---:|---:|',
  ...coldSummaries.map(row => `| ${row.name} | ${row.timing.map(pair => n(pair.original)).join(' / ')} | ${row.timing.map(pair => n(pair.selected)).join(' / ')} | ${row.allocation.map(pair => pair.original).join(' / ')} | ${row.allocation.map(pair => pair.selected).join(' / ')} |`),
  '',
  'Single observations only,not cold-start or isolated-entry conclusions. All adverse and control observations are retained.',
  '',
];
const serialized = JSON.stringify(output, null, 2) + '\n';
if (operation === '--finalize') {
  fs.writeFileSync(path.join(run, 'measurement-audit.json'), serialized, { flag: 'wx' });
  fs.writeFileSync(path.join(run, 'comparison.md'), markdown.join('\n'), { flag: 'wx' });
  budget.comparison_budget_closed = true;
  budget.closed_at = new Date().toISOString();
  budget.final_measurement_audit_sha256 = hash(path.join(run, 'measurement-audit.json'));
  budget.final_native_warm_rows = 48;
  budget.final_first_observed_rows = 12;
  budget.reason = 'All three comparisons and18 native profiles completed. Historical timing budget permanently closed;no fourth comparison.';
  fs.writeFileSync(budgetPath, JSON.stringify(budget, null, 2) + '\n');
} else {
  assert.equal(fs.readFileSync(path.join(run, 'measurement-audit.json'), 'utf8'), serialized);
  assert.equal(hash(path.join(run, 'measurement-audit.json')), budget.final_measurement_audit_sha256);
  assert.equal(fs.readFileSync(path.join(run, 'comparison.md'), 'utf8'), markdown.join('\n'));
}
console.log(JSON.stringify({
  actualWarmRows: samples.length, actualFirstObservedRows: cold.length, actualNativeTimingProfiles: profiles.length,
  primaryResults: summaries.filter(row => row.primary), allWarmSummaries: summaries,
  firstObserved: coldSummaries, comparisonBudgetPermanentlyClosed: true, exactCopiedTextAuditPassed: true,
  auditDoesNotRehashOmittedNativeBinaries: true,
}, null, 2));
