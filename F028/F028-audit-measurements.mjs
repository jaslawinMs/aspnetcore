import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const [runArgument, operation] = process.argv.slice(2);
assert.ok(runArgument && ['--finalize', '--verify'].includes(operation), 'Supply F028 root and --finalize or --verify.');
const run = path.resolve(runArgument);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const relative = file => path.relative(run, file).replaceAll('\\', '/');
const relocate = original => {
  const marker = '/autoperf-runs/F028/';
  const normalized = original.replaceAll('\\', '/');
  const start = normalized.indexOf(marker);
  assert.ok(start >= 0, `Recorded path is outside F028:${original}`);
  return path.join(run, ...normalized.slice(start + marker.length).split('/'));
};
const names = [
  'Default.One.Hit', 'Default.Four.Tail', 'Default.Many.Tail', 'Default.Many.Miss', 'Default.Many.Hidden',
  'Default.Many.Head', 'Default.Empty.Miss', 'DerivedManager.Four.Tail', 'DerivedProvider.Four.Tail', 'Early.NoAuthentication',
];
const primary = ['Default.Four.Tail', 'Default.Many.Tail'];
const firstNames = ['Default.Four.Tail', 'DerivedManager.Four.Tail'];
const producerNames = [
  'Default.LiveRemoveAndAdd', ...['empty', 'custom', 'duplicate', 'null-first', 'empty-display'].map(value => `Manager.Override.${value}`),
  'Provider.Override.Custom', 'Provider.Override.Empty', 'Provider.Pending.ExactFailure', 'Provider.Pending.Success',
  'Early.MissingProvider', 'Early.MissingSubject', 'Subject.Fallback', 'Marker.Match', 'Marker.Mismatch',
  'AuthenticationResult.Pending.ExactFailure', 'AuthenticationResult.Pending.Success', 'Manager.Iterator.ShortCircuitAndDispose',
];
const settings = { processPriority: 'Normal', threadPriority: 'Normal', affinity: 65535 };
const capsule = read(path.join(run, 'prepared', 'capsule.json'));
const budgetPath = path.join(run, 'measurement-budget.json');
const budget = read(budgetPath);
const comparisons = budget.actual_comparisons_completed;
assert.equal(budget.maximum_actual_comparisons, 3);
assert.ok(comparisons >= 1 && comparisons <= 3);
assert.equal(budget.actual_comparisons_started, comparisons);
assert.equal(budget.actual_timing_profiles_started, comparisons * 6);
assert.equal(budget.attempts.length, comparisons);
assert.equal(budget.comparison_budget_closed, operation === '--verify');
assert.equal(capsule.actualClosureFiles, 132);
assert.equal(capsule.actualBuiltAsBaselinePlusUncommittedScopedPatch, true);
assert.equal(capsule.actualOtherSignInManagerMethodsUnchanged, true);
assert.equal(capsule.authoritativeOriginalResourceValidation, 'original-resource-characterization-002');
assert.equal(capsule.actualSettingsExecutorSourceSha256, '02B69C0AA06612700D9DA122BA64081771EE333B126DABC08156C0BD118F115B');
const planPath = path.join(run, 'measurement-plan.json');
const plan = read(planPath);
assert.deepEqual(plan.primaryCases, primary);
assert.deepEqual(plan.cases.map(row => row.name), names);
assert.deepEqual(plan.firstObservedCases, firstNames);
assert.equal(plan.maximumActualComparisons, 3);
const closures = Object.fromEntries(['original', 'selected'].map(variant =>
  [variant, read(relocate(capsule.variants[variant].closurePath))]));
for (const variant of ['original', 'selected']) {
  assert.equal(closures[variant].files.length, 132);
  assert.equal(new Set(closures[variant].files.map(file => file.path)).size, 132);
  for (const source of capsule.variants[variant].sourceFiles) {
    assert.equal(hash(path.join(relocate(capsule.variants[variant].directory), ...source.path.split(/[\\/]/))), source.sha256);
  }
}
const differences = closures.original.files.filter(before =>
  closures.selected.files.find(after => after.path === before.path)?.sha256 !== before.sha256).map(file => file.path).sort();
assert.deepEqual(differences, ['Microsoft.AspNetCore.Identity.dll', 'Microsoft.AspNetCore.Identity.pdb']);
const ownerText = variant => fs.readFileSync(path.join(relocate(capsule.variants[variant].sources), 'owner', 'SignInManager.cs'), 'utf8');
const marker = '    public virtual async Task<ExternalLoginInfo?> GetExternalLoginInfoAsync';
const suffix = '    public virtual async Task<IdentityResult> UpdateExternalAuthenticationTokensAsync';
assert.equal(ownerText('original').slice(0, ownerText('original').indexOf(marker)), ownerText('selected').slice(0, ownerText('selected').indexOf(marker)));
assert.equal(ownerText('original').slice(ownerText('original').indexOf(suffix)), ownerText('selected').slice(ownerText('selected').indexOf(suffix)));
assert.ok(ownerText('selected').includes('GetType() == typeof(SignInManager<TUser>) && _schemes.GetType() == typeof(AuthenticationSchemeProvider)'));
assert.ok(ownerText('selected').includes('providerDisplayName = scheme is { DisplayName.Length: > 0 } ? scheme.DisplayName : provider;'));
const stateRows = directory => fs.readdirSync(path.join(directory, 'states')).filter(file => file.endsWith('.json')).map(file =>
  ({ file, value: read(path.join(directory, 'states', file)) }));
const characterizations = [];
for (const variant of ['original', 'selected']) {
  const directory = path.join(run, 'profiles', `characterize-${variant}-002`);
  assert.equal(read(path.join(directory, 'verified-native-exit.json')).actualNativeExitCode, 0);
  const states = stateRows(directory);
  const completion = states.filter(row => row.file.endsWith('-characterization-completed.json'));
  assert.equal(completion.length, 1);
  assert.equal(completion[0].value.actualTimedWrapperPaths, 10);
  assert.equal(completion[0].value.actualRecordedProfileContracts, 20);
  assert.equal(completion[0].value.actualAdditionalProducerContracts, 18);
  const producers = states.filter(row => row.file.endsWith('-additional-producer-contract.json')).map(row => row.value);
  assert.deepEqual(producers.map(row => row.name).sort(), [...producerNames].sort());
  assert.ok(producers.every(row => row.actualAllAssertionsPassed));
  characterizations.push({ variant, actualWrappers: 10, actualValueContracts: 20, actualAdditionalProducerContracts: 18 });
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
  const comparisonDirectory = path.join(run, `comparison-${String(attempt.number).padStart(2, '0')}`);
  assert.equal(hash(path.join(comparisonDirectory, 'executed-measurement-plan.json')), hash(planPath));
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
    assert.equal(invocation.actualClosureFileCount, 132);
    const variant = capsule.variants[started.variant];
    assert.equal(invocation.actualClosureSha256, hash(relocate(variant.closurePath)));
    assert.equal(invocation.actualOwnerSha256, variant.owners[0].sha256);
    assert.ok(Date.parse(started.actualStartedBeforeNativeLaunch) <= Date.parse(invocation.started));
    const nativeExit = read(path.join(directory, 'verified-native-exit.json'));
    assert.equal(nativeExit.actualNativeExitCode, 0);
    assert.equal(nativeExit.actualClosureBeforeAndAfterMatched, true);
    assert.equal(nativeExit.actualCommonHarnessSha256, capsule.actualHarnessSha256);
    const states = stateRows(directory);
    const matching = ending => states.filter(row => row.file.endsWith(ending)).map(row => row.value);
    const single = ending => {
      const actual = matching(ending);
      assert.equal(actual.length, 1, `${started.label}:${ending}`);
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
    assert.equal(core?.sha256, '0CEBA028A838AFF170CFF9D03570B34F9F044D6A9597974088E58B9834DF74E4');
    assert.equal(core.informationalVersion, '12.0.0-alpha.1.26562.105+dfd6ac738610ea05f42e704be82b386e71052e12');
    for (const [assembly, expectedDocuments] of [
      ['Microsoft.AspNetCore.Identity', 2], ['Microsoft.AspNetCore.Authentication.Core', 1], ['AutoPerf.Benchmarks', 5],
    ]) {
      const witness = single(`-source-pdb-${assembly}.json`);
      assert.equal(witness.actualPePdbBindingMatched, true);
      assert.equal(witness.codeViewGuid, witness.pdbGuid);
      const expected = assembly === 'AutoPerf.Benchmarks' ? runtime.harnessSha256
        : assembly === 'Microsoft.AspNetCore.Identity' ? runtime.ownerSha256
          : runtime.runtimeAssemblies.find(row => row.name === assembly)?.sha256;
      assert.equal(witness.assemblySha256, expected);
      assert.equal(witness.documents.length, expectedDocuments);
      witness.documents.forEach(document => assert.equal(hash(relocate(document.source)), document.sha256));
    }
    if (started.mode === 'measure') {
      assert.equal(single('-completed.json').actualReports, 10);
      assert.equal(single('-completed.json').allSuccessful, true);
      for (const ending of ['-settings-before.json', '-settings-setup.json', '-settings-after.json']) {
        const values = matching(ending);
        assert.equal(values.length, 10);
        values.forEach(value => assert.deepEqual(value, settings));
      }
      const contracts = matching('-public-profile-contract.json');
      assert.equal(contracts.length, 20);
      assert.deepEqual(contracts.map(row => row.profile).sort(), names.flatMap(name => [name, name]).sort());
      contracts.forEach(contract => {
        assert.equal(contract.actualConsumedValue, contract.expectedConsumedValue);
        assert.equal(contract.actualAllContractAssertionsPassed, true);
        assert.equal(contract.actualPublicContextAssignedEqually, true);
        assert.equal(contract.actualPropertiesReferencePreserved, true);
        assert.equal(contract.actualPrincipalReferencePreserved, true);
        assert.equal(contract.actualExactDefaultTypes, contract.profile.startsWith('Default.') || contract.profile.startsWith('Early.'));
      });
      const reportPath = path.join(directory, 'results', 'AutoPerf.SignInBenchmarks-report-full.json');
      const report = read(reportPath);
      assert.equal(report.Benchmarks.length, 10);
      const observedNames = [];
      for (const row of report.Benchmarks) {
        const match = /^AutoPerf\.SignInBenchmarks\.ResolveAndConsume\(Case: "([^"]+)"\)$/.exec(row.FullName);
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
      assert.equal(record.observed, 9);
      assert.ok(record.actualElapsedTicks > 0 && record.stopwatchFrequency > 0 && record.actualAllocatedBytes > 0);
      cold.push({
        comparison: attempt.number, variant: started.variant, name: record.profile,
        actualMilliseconds: record.actualElapsedTicks * 1000 / record.stopwatchFrequency,
        actualAllocatedBytes: record.actualAllocatedBytes, actualObservedResult: record.observed,
        boundary: record.boundary, stateDirectory: relative(path.join(directory, 'states')),
      });
    }
    profiles.push({ label: started.label, actualInvocationSha256: hash(invocationPath), actualNativeExitCode: 0 });
  }
}
assert.equal(samples.length, comparisons * 20);
assert.equal(cold.length, comparisons * 4);
assert.equal(profiles.length, comparisons * 6);
const pairs = (rows, metric) => budget.attempts.map(({ number: comparison }) => {
  const original = rows.find(row => row.comparison === comparison && row.variant === 'original');
  const selected = rows.find(row => row.comparison === comparison && row.variant === 'selected');
  assert.ok(original && selected);
  return { comparison, original: original[metric], selected: selected[metric],
    improvementPercent: original[metric] === 0 ? null : 100 * (1 - selected[metric] / original[metric]) };
});
const summaries = names.map(name => ({
  name, primary: primary.includes(name), kind: plan.cases.find(row => row.name === name).kind,
  timing: pairs(samples.filter(row => row.name === name), 'actualMeanNs'),
  allocation: pairs(samples.filter(row => row.name === name), 'actualBytesPerOperation'),
  minimumRetainedMeasurementCount: Math.min(...samples.filter(row => row.name === name).map(row => row.actualRetainedMeasurementCount)),
}));
const stopEvidence = primary.flatMap(name => budget.attempts.flatMap(({ number: comparison }) => {
  const before = samples.find(row => row.name === name && row.comparison === comparison && row.variant === 'original');
  const after = samples.find(row => row.name === name && row.comparison === comparison && row.variant === 'selected');
  const improvementPercent = 100 * (1 - after.actualMeanNs / before.actualMeanNs);
  return improvementPercent >= 50 && before.actualConfidenceInterval.Lower > after.actualConfidenceInterval.Upper
    ? [{ name, comparison, actualImprovementPercent: improvementPercent, originalInterval: before.actualConfidenceInterval,
      selectedInterval: after.actualConfidenceInterval, actualIntervalsSeparated: true }] : [];
}));
assert.ok(comparisons === 3 || stopEvidence.length > 0, 'Do not close early without the declared substantial primary result.');
const coldSummaries = firstNames.map(name => ({
  name, timing: pairs(cold.filter(row => row.name === name), 'actualMilliseconds'),
  allocation: pairs(cold.filter(row => row.name === name), 'actualAllocatedBytes'),
  interpretation: 'Single observations including fixture,provider,DI,UserManager,JIT and metadata. No cold-start or isolated-entry conclusion.',
}));
const output = {
  candidate: 'F028', actualComparedProductImplementations: 1, actualCommonHarnessSha256: capsule.actualHarnessSha256,
  actualMeasurementPlanSha256: hash(planPath), actualCompletedComparisons: comparisons,
  actualTimingProfiles: profiles.length, actualNativeWarmRows: samples.length, actualFirstObservedRows: cold.length,
  actualConsumerClosureFiles: 132, actualOnlyClosureDifferences: differences, actualCharacterizations: characterizations,
  actualDeclaredEarlyStopEvidence: stopEvidence, profiles, actualWarmSamples: samples, warmSummaries: summaries,
  firstObservedSamples: cold, firstObservedSummaries: coldSummaries,
  limits: [
    'Shared Windows VM,not sandboxed,dedicated or isolated. Settings are point observations:Normal/Normal/65535. No OS settings were changed.',
    'Only exact default manager/provider types use the dictionary. All custom/derived virtual behavior stays on the original sequence path.',
    'The real default provider already reuses its safe snapshot. This removes a per-call filter/scan,not a snapshot rebuild.',
    'Prepared synchronous authentication-result service and actual public owner/provider. Not full login,cookie,HTTP/network,async-authentication throughput or application-frequency evidence.',
    'The128scheme primary is explicitly synthetic scaling,not evidence that applications commonly register128schemes.',
    'Derived controls traverse the added type guard and larger method;they are not byte-identical IL controls. Retain their observed regressions rather than claiming all callers benefit.',
    'The unreached early-return control has unchanged source but shares the rebuilt method. Source identity is not proof of identical generated code.',
    'Task<int> consumer and prepared-producer bookkeeping are common to both images. Owning unit and BDN callers have different absolute allocation boundaries.',
    'PE/PDB selected-document identities are not full compiler provenance or method coverage. Copied-text verification does not rehash omitted binaries or runtime files.',
    'All raw native,control and first observations are retained. Paired means are scoped measurements,not clean causal application-speedup claims.',
  ],
};
const n = value => value.toFixed(2);
const markdown = [
  '# F028 measured comparison', '',
  `${comparisons} actual comparison;${samples.length} native warm rows and${cold.length} first observations. Positive percentage means less time.`,
  'Stopped under the declared>=50%primary rule;the128scheme tail primary meets it with separated reported intervals. This is a scoped synthetic-scaling result,not an application-frequency claim.',
  'Derived-manager/provider controls are slower in this comparison. The proposal is not an all-caller improvement or merge-ready recommendation.', '',
  '| Actual public profile | Original ns/op | Selected ns/op | Observed less time % | Original/selected B/op |',
  '|---|---:|---:|---:|---:|',
  ...summaries.map(row => `| ${row.name}${row.primary ? ' (primary)' : ''} | ${row.timing.map(pair => n(pair.original)).join(' / ')} | ${row.timing.map(pair => n(pair.selected)).join(' / ')} | ${row.timing.map(pair => n(pair.improvementPercent)).join(' / ')} | ${row.allocation.map(pair => `${pair.original} / ${pair.selected}`).join('; ')} |`),
  '', '## First observed:fixture,provider,DI,UserManager,JIT and metadata included', '',
  '| Public profile | Original ms | Selected ms | Original bytes | Selected bytes |', '|---|---:|---:|---:|---:|',
  ...coldSummaries.map(row => `| ${row.name} | ${row.timing.map(pair => n(pair.original)).join(' / ')} | ${row.timing.map(pair => n(pair.selected)).join(' / ')} | ${row.allocation.map(pair => pair.original).join(' / ')} | ${row.allocation.map(pair => pair.selected).join(' / ')} |`),
  '', 'Single observations only,not cold-start or isolated-entry conclusions. All unfavorable observations remain authoritative.', '',
  '## Limits', '', ...output.limits.map(value => `- ${value}`), '',
];
const serialized = JSON.stringify(output, null, 2) + '\n';
if (operation === '--finalize') {
  fs.writeFileSync(path.join(run, 'measurement-audit.json'), serialized, { flag: 'wx' });
  fs.writeFileSync(path.join(run, 'comparison.md'), markdown.join('\n'), { flag: 'wx' });
  budget.comparison_budget_closed = true;
  budget.closed_at = new Date().toISOString();
  budget.final_measurement_audit_sha256 = hash(path.join(run, 'measurement-audit.json'));
  budget.final_native_warm_rows = samples.length;
  budget.final_first_observed_rows = cold.length;
  budget.reason = `${comparisons} actual comparisons completed. Declared substantial-primary stop rule satisfied;remaining slots permanently closed,not available for later tuning.`;
  fs.writeFileSync(budgetPath, JSON.stringify(budget, null, 2) + '\n');
} else {
  assert.equal(fs.readFileSync(path.join(run, 'measurement-audit.json'), 'utf8'), serialized);
  assert.equal(hash(path.join(run, 'measurement-audit.json')), budget.final_measurement_audit_sha256);
  assert.equal(fs.readFileSync(path.join(run, 'comparison.md'), 'utf8'), markdown.join('\n'));
}
console.log(JSON.stringify({
  actualComparisons: comparisons, actualWarmRows: samples.length, actualFirstObservations: cold.length,
  actualTimingProfiles: profiles.length, actualConsumerClosureFiles: 132, comparisonBudgetPermanentlyClosed: true,
  actualDeclaredEarlyStopEvidence: stopEvidence, allWarmSummaries: summaries, firstObserved: coldSummaries,
  exactCopiedTextAuditPassed: true, auditDoesNotRehashOmittedNativeBinaries: true,
}, null, 2));
