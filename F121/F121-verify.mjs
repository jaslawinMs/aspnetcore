import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] ?? path.dirname(fileURLToPath(import.meta.url)));
const flags = process.argv.slice(3);
const openBudget = flags.includes('--open-budget');
const measurementOnly = flags.includes('--measurement-only');
const located = name => path.join(root, ...name.split(/[\\/]/));
const read = name => JSON.parse(fs.readFileSync(located(name), 'utf8').replace(/^\uFEFF/, ''));
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex').toUpperCase();
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2;
};
const variance = values => values.reduce((sum, value) => sum + (value - mean(values)) ** 2, 0) / (values.length - 1);
const close = (actual, expected) => assert.ok(
  Math.abs(actual - expected) <= Math.max(1e-6, Math.abs(expected) * 1e-11), `${actual} != ${expected}`);
function records(folder, kind) {
  return fs.readdirSync(located(folder)).sort().filter(name => name.endsWith('-' + kind + '.json'))
    .map(name => read(folder + '/' + name));
}
function one(folder, kind) {
  const values = records(folder, kind);
  assert.equal(values.length, 1, folder + ':' + kind);
  return values[0];
}
const plan = read('acceptance-plan.json');
const profiles = read('profile-definitions.json');
const budget = read('diagnostic-budget.json');
const seal = read('premeasurement-validation.json');
assert.equal(budget.maximum, 3);
assert.ok(budget.authorized.length >= 2 && budget.authorized.length <= 3);
assert.ok(budget.authorized.every(item => ['completed', 'failed'].includes(item.state)));
assert.equal(budget.permanentlyClosed, !openBudget);
if (!openBudget) {
  assert.equal(budget.authorized.length, 3);
  assert.equal(sha(located('diagnostic-budget.json')), read('permanent-budget-close.json').closedBudgetSha256);
}
assert.equal(sha(located('acceptance-plan.json')), seal.acceptancePlanSha256);
assert.equal(plan.benchmarkMethod, 'CopyTo');
assert.equal(plan.unchangedControlMethod, 'UnchangedIndexOf');
assert.equal(plan.primary, 'CopiedDefault5');
assert.equal(plan.unchangedControl, 'UnmodifiedDefault5');
assert.equal(seal.actualFixtureEpoch, 1);
assert.deepEqual(seal.actualPreviouslyConsumedFailedAuthorizations, []);
assert.equal(sha(located('profile-definitions.json')), seal.profileDefinitionsSha256);
assert.deepEqual(profiles.map(item => item.key), plan.profileKeys);
const keys = [...plan.profileKeys].sort();
assert.equal(keys.length, 8);
assert.equal(new Set(keys).size, 8);
const harness = read('harness-source-hashes.json');
assert.equal(harness.length, 8);
for (const item of harness) {
  assert.equal(sha(located('harness/' + item.path)), item.sha256);
  assert.equal(fs.statSync(located('harness/' + item.path)).size, item.bytes);
}
const owners = ['Microsoft.AspNetCore.Mvc.Core', 'Microsoft.AspNetCore.Mvc.RazorPages', 'Microsoft.AspNetCore.TestHost'];
const ownerSource = 'src/Mvc/Mvc.Core/src/Infrastructure/CopyOnWriteList.cs';
const inputs = {};
const closures = {};
const byPath = closure => new Map(closure.files.map(item => [item.path, item]));
for (const variant of ['Original', 'Candidate', 'Default']) {
  const suffix = variant === 'Default' ? 'current-default' : variant.toLowerCase();
  inputs[variant] = read('source-inputs-' + suffix + '.json');
  closures[variant] = read('closure-' + suffix + '.json');
  assert.equal(inputs[variant].sourceFiles.length, 10);
  assert.equal(inputs[variant].sourceFiles.filter(item => item.pdbDocumentRequired).length, 6);
  assert.equal(closures[variant].files.length, 328);
  assert.equal(byPath(closures[variant]).size, 328);
  for (const item of inputs[variant].sourceFiles) {
    assert.equal(sha(located('source-files-' + suffix + '/' + item.path)), item.sha256);
    if (variant === 'Default') {
      const text = role => fs.readFileSync(located('source-files-' + role + '/' + item.path), 'utf8').replaceAll('\r\n', '\n');
      assert.equal(text('current-default'), text('original'));
    }
  }
}
assert.deepEqual(inputs.Candidate.sourceFiles.filter(item =>
  item.sha256 !== inputs.Original.sourceFiles.find(old => old.path === item.path).sha256).map(item => item.path), [ownerSource]);
const originalFiles = byPath(closures.Original);
const candidateFiles = byPath(closures.Candidate);
assert.deepEqual([...originalFiles.keys()], [...candidateFiles.keys()]);
assert.deepEqual([...originalFiles.keys()].filter(name => originalFiles.get(name).sha256 !== candidateFiles.get(name).sha256),
  [owners[0] + '.dll', owners[0] + '.pdb']);
for (const role of seal.roles) for (const item of role.stateHashes) assert.equal(sha(located(item.path)), item.sha256);
const originalStates = 'characterization-original-characterize-001/states';
const expectedSettings = one(originalStates, 'runtime-characterize-before').settings;
assert.equal(expectedSettings.processPriority, 'Normal');
assert.equal(expectedSettings.threadPriority, 'Normal');
assert.ok(Number.isInteger(expectedSettings.affinity) && expectedSettings.affinity > 0);
let runtimeRecords = 0;
let settingsRecords = 0;
function verifyExecution(folder, variant, closure, mode, expectedProof, partial = false) {
  const files = byPath(closure);
  assert.equal(one(folder, 'verified-image').actualEntries, files.size);
  assert.equal(one(folder, 'verified-image').actualEveryEntryVerified, true);
  const proof = one(folder, 'selected-source-pdb-associations');
  assert.equal(proof.actualSelectedInputs, 10);
  assert.equal(proof.actualSelectedDocuments, 6);
  assert.equal(proof.actualUniqueFrameworkDocuments, 6);
  assert.equal(proof.actualSourceBuiltOwners, 3);
  assert.equal(proof.actualCompleteCompilerProvenanceClaimed, false);
  const proved = new Set();
  for (const name of owners) {
    const owner = proof.ownerProofs.find(item => item.actualOwner === name);
    assert.ok(owner);
    assert.equal(owner.actualPeAndPdbMatch, true);
    assert.equal(owner.actualOwnerSha256, files.get(name + '.dll').sha256);
    assert.equal(owner.actualPdbSha256, files.get(name + '.pdb').sha256);
    assert.equal(owner.proofs.length, name === owners[0] ? 4 : name === owners[1] ? 2 : 0);
    for (const item of owner.proofs) {
      const source = inputs[variant].sourceFiles.find(file => file.path === item.source);
      assert.equal(item.sha256, source.sha256);
      assert.equal(source.pdbDocumentRequired, true);
      proved.add(item.source);
    }
  }
  assert.equal(proved.size, 6);
  if (expectedProof) assert.deepEqual(proof, expectedProof);
  const discovery = one(folder, 'benchmarkdotnet-discovery-preflight');
  assert.equal(discovery.actualDiscoveredCases, 16);
  assert.equal(discovery.actualTimingRunByThisPreflight, false);
  assert.equal(discovery.actualVariant, variant);
  const phases = partial ? ['before'] : ['before', 'after'];
  const runtimes = phases.map(phase => one(folder, 'runtime-' + mode + '-' + phase));
  assert.ok(runtimes.every(item => item.pid === runtimes[0].pid));
  for (const runtime of runtimes) {
    assert.equal(runtime.framework, '.NET 12.0.0-alpha.1.26562.105');
    assert.deepEqual(runtime.settings, expectedSettings);
    const imageRoot = path.win32.dirname(runtime.assemblies.find(item => item.name === 'AutoPerf.Benchmarks').location);
    for (const name of ['AutoPerf.Benchmarks', ...owners]) {
      const assembly = runtime.assemblies.find(item => item.name === name);
      assert.ok(assembly);
      assert.equal(assembly.sha256, files.get(name + '.dll').sha256);
    }
    for (const assembly of runtime.assemblies) {
      if (assembly.location.startsWith(imageRoot + '\\')) {
        const relative = path.win32.relative(imageRoot, assembly.location).replaceAll('\\', '/');
        assert.ok(files.has(relative), 'An actually loaded local entry is absent: ' + relative);
        assert.equal(assembly.sha256, files.get(relative).sha256);
      }
    }
    runtimeRecords++;
  }
  return proof;
}
const observedKinds = ['actual-mvc-producer', 'actual-prepared-public-contract', 'actual-null-reference-offset-contract',
  'actual-invalid-destination-contract', 'actual-source-interface-contract',
  'actual-prepared-collection-lifetime', 'characterization-completed'];
function characterize(folder) {
  const observations = Object.fromEntries(observedKinds.map(kind => [kind,
    records(folder, kind).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'))]));
  for (const [kind, count] of [['actual-mvc-producer', 24], ['actual-prepared-public-contract', 16],
    ['actual-null-reference-offset-contract', 2], ['actual-invalid-destination-contract', 2],
    ['actual-source-interface-contract', 2],
    ['actual-prepared-collection-lifetime', 8], ['characterization-completed', 1]]) assert.equal(observations[kind].length, count);
  const producers = observations['actual-mvc-producer'];
  const contracts = observations['actual-prepared-public-contract'];
  for (const profile of profiles) {
    const count = profile.factoryCount === 'default-five' ? 5 : profile.factoryCount;
    const selected = producers.filter(item => item.actualProfile === profile.key);
    assert.equal(selected.length, 3);
    assert.equal(selected.filter(item => item.actualEnableActionInvokers).length, 1);
    for (const item of selected) {
      assert.equal(item.actualHttpRequests, 2);
      assert.equal(item.actualConfiguredFactoryCount, count);
      assert.equal(item.actualDefaultFiveVerified, profile.factoryCount === 'default-five');
      for (const key of ['actualDistinctPerRequestWrappers', 'actualSameUntouchedSourceArray',
        'actualSecondRequestHasNoCopy', 'actualNoValueProviderFactoriesPropertyAssignment',
        'actualReflectedFieldsObservedOnlyOutsideTiming']) assert.equal(item[key], true);
      assert.equal(item.actualCompiledRazorPageRequestClaimed, false);
      assert.equal(item.observations.length, 2);
      for (const [position, observation] of item.observations.entries()) {
        const copied = position === 0 && profile.copied;
        assert.equal(observation.actualRawQueryReadByParameterlessAction, copied ? 'true' : 'false');
        assert.equal(observation.actualInitialCopyNull, true);
        assert.equal(observation.actualFinalCopied, copied);
        assert.equal(observation.actualPrivateCopyIsExactList, copied);
        assert.equal(observation.actualFactoryCount, count);
        assert.equal(observation.actualFactoryTypes.length, count);
        assert.equal(observation.actualSourceUnchanged, true);
      }
    }
    const results = contracts.filter(item => item.actualProfile === profile.key);
    assert.equal(results.length, 2);
    assert.deepEqual(results.map(item => item.actualEnableActionInvokers).sort(), [false, true]);
    assert.ok(results.every(item => item.actualCount === count && item.actualOffset === profile.offset
      && item.actualIndexOf === -1 && item.actualEveryDestinationReferenceVerified
      && item.actualPrefixAndSuffixSentinelsVerified && item.actualEnumerableToArrayConsumerExecuted && item.actualPassed));
  }
  const completed = one(folder, 'characterization-completed');
  assert.equal(completed.actualAllPassed, true);
  assert.equal(completed.actualHttpRequests, 48);
  assert.equal(completed.actualTimingRun, false);
  return observations;
}
const proofs = {};
const observed = characterize(originalStates);
for (const role of seal.roles) {
  const folder = 'characterization-' + role.label + '/states';
  assert.deepEqual(characterize(folder), observed);
  proofs[role.variant] = verifyExecution(folder, role.variant, closures[role.variant], 'characterize');
}
for (const [source, metadata] of [
  ['BenchmarkDotNet-0.13.0-GcStats.cs', 'BenchmarkDotNet-0.13.0-GcStats-metadata.json'],
  ['BenchmarkDotNet-0.13.0-LICENSE.md', 'BenchmarkDotNet-0.13.0-license-metadata.json']
]) assert.equal(sha(located(source)), read(metadata).sha256);
const allocationSource = fs.readFileSync(located('BenchmarkDotNet-0.13.0-GcStats.cs'), 'utf8');
assert.ok(allocationSource.includes('(long) Math.Round(') && allocationSource.includes('MidpointRounding.ToEven'));
const rows = [];
for (const historic of budget.authorized) {
  const attempt = historic.attempt;
  const folder = 'comparison-' + String(attempt).padStart(3, '0');
  const authorization = read(folder + '/authorization.json');
  assert.deepEqual(historic.order, plan.comparisonOrders[attempt - 1]);
  assert.equal(authorization.actualConsumedBeforeProcessLaunch, attempt);
  assert.equal(authorization.actualAcceptancePlanSha256, seal.acceptancePlanSha256);
  assert.equal(historic.actualDriverSha256, sha(located('F121-compare.mjs')));
  for (const variant of ['Original', 'Candidate']) {
    assert.equal(authorization[variant].closureSha256, sha(located('closure-' + variant.toLowerCase() + '.json')));
    assert.equal(authorization[variant].sourceInputsSha256, sha(located('source-inputs-' + variant.toLowerCase() + '.json')));
  }
  assert.equal(historic.state, 'completed', 'Audit a later failed/partial attempt explicitly; never manufacture a paired result.');
  assert.equal(historic.actualTimingStarted, true);
  const receipt = read(folder + '/execution-receipt.json');
  assert.equal(receipt.actualCompletePairedSourceComparison, true);
  assert.equal(receipt.actualRetainedSamples, 256);
  assert.deepEqual(receipt.completed, historic.completed);
  assert.equal(receipt.actualDriverSha256, historic.actualDriverSha256);
  for (const variant of historic.order) {
    const variantFolder = folder + '/' + variant;
    const command = read(variantFolder + '/command.json');
    const result = read(variantFolder + '/result.json');
    assert.equal(result.exitCode, 0);
    assert.equal(result.launchError, null);
    assert.equal(command.arguments[1], 'measure');
    assert.equal(command.actualVariant, variant);
    assert.equal(command.actualAttempt, attempt);
    assert.equal(command.actualProcessSettingsModifiedByDriver, false);
    assert.equal(sha(located(variantFolder + '/stdout.txt')), result.stdoutSha256);
    assert.equal(sha(located(variantFolder + '/stderr.txt')), result.stderrSha256);
    const stateFolder = variantFolder + '/states';
    verifyExecution(stateFolder, variant, closures[variant], 'measure', proofs[variant]);
    const completed = one(stateFolder, 'completed');
    assert.equal(completed.actualReports, 16);
    assert.equal(completed.actualAllSuccessful, true);
    assert.equal(completed.actualAttempt, attempt);
    assert.equal(completed.actualVariant, variant);
    const producers = records(stateFolder, 'actual-mvc-producer');
    assert.equal(producers.length, 8);
    assert.deepEqual(producers.map(item => item.actualProfile).sort(), keys);
    assert.ok(producers.every(item => item.actualHttpRequests === 2 && !item.actualEnableActionInvokers
      && item.actualDistinctPerRequestWrappers && item.actualSameUntouchedSourceArray && item.actualSecondRequestHasNoCopy));
    const lifetimes = records(stateFolder, 'actual-prepared-collection-lifetime');
    assert.equal(lifetimes.length, 16);
    for (const key of keys) assert.equal(lifetimes.filter(item => item.actualProfile === key).length, 2);
    assert.ok(lifetimes.every(item => item.actualHostAndHttpClientDisposedBeforeTiming
      && item.actualCreationAndFirstWriteOutsideTiming && item.actualStableCopyToAndIndexOf));
    for (const phase of ['before', 'after']) {
      const settings = records(stateFolder, 'settings-' + phase);
      assert.equal(settings.length, 16);
      for (const item of settings) assert.deepEqual(item, expectedSettings);
      settingsRecords += settings.length;
    }
    const reportFile = variantFolder + '/reports/results/AutoPerf.CollectionBenchmarks-report-full.json';
    assert.equal(sha(located(reportFile)), historic.completed.find(item => item.variant === variant).fullJsonSha256);
    const report = read(reportFile);
    assert.equal(report.Benchmarks.length, 16);
    const blocks = fs.readFileSync(located(variantFolder + '/stdout.txt'), 'utf8').split(/^\/\/ Benchmark: /m).slice(1);
    assert.equal(blocks.length, 16);
    const nativeByDisplay = new Map(blocks.map(block => [block.split(/\r?\n/, 1)[0].trim(), block]));
    assert.equal(nativeByDisplay.size, 16);
    const actualCases = [];
    for (const benchmark of report.Benchmarks) {
      const match = benchmark.FullName.match(/^AutoPerf\.CollectionBenchmarks\.(CopyTo|UnchangedIndexOf)\(Profile: ([A-Za-z0-9]+)\)$/);
      assert.ok(match, benchmark.FullName);
      const [, method, profile] = match;
      actualCases.push(method + ':' + profile);
      assert.equal(benchmark.Method, method);
      const displayedProfile = profile.length > 20
        ? `${profile.slice(0, 5)}(...)${profile.slice(-5)} [${profile.length}]` : profile;
      assert.equal(benchmark.Parameters, 'Profile=' + displayedProfile);
      for (const setting of ['OutlierMode=DontRemove', 'PowerPlanMode=00000000-0000-0000-0000-000000000000',
        'Toolchain=SettingsPreservingEmitToolchain', 'IterationCount=8', 'IterationTime=100.0000 ms', 'UnrollFactor=1', 'WarmupCount=3']) {
        assert.ok(benchmark.DisplayInfo.includes(setting));
      }
      const native = nativeByDisplay.get(benchmark.DisplayInfo);
      assert.ok(native);
      const results = [...native.matchAll(/^WorkloadResult\s+(\d+): (\d+) op, ([\d.]+) ns,/gm)];
      const actual = [...native.matchAll(/^WorkloadActual\s+(\d+): (\d+) op, ([\d.]+) ns,/gm)];
      const overhead = [...native.matchAll(/^OverheadActual\s+\d+: (\d+) op, ([\d.]+) ns,/gm)];
      const gc = [...native.matchAll(/^GC:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/gm)];
      assert.equal(results.length, 8);
      assert.equal(actual.length, 8);
      assert.ok(overhead.length > 0);
      assert.equal(gc.length, 1);
      assert.equal([...native.matchAll(/^WorkloadWarmup\s+/gm)].length, 3);
      assert.equal(benchmark.Measurements.length, 8);
      assert.equal(benchmark.Statistics.N, 8);
      const correction = median(overhead.map(item => Number(item[2]) / Number(item[1])));
      const values = benchmark.Measurements.map((measurement, index) => {
        assert.equal(measurement.IterationIndex, index + 1);
        assert.equal(measurement.LaunchIndex, 1);
        assert.equal(measurement.IterationMode, 'Workload');
        assert.equal(measurement.IterationStage, 'Result');
        assert.equal(Number(results[index][1]), index + 1);
        assert.equal(Number(actual[index][1]), index + 1);
        assert.equal(Number(results[index][2]), measurement.Operations);
        assert.equal(Number(actual[index][2]), measurement.Operations);
        close(Number(results[index][3]), measurement.Nanoseconds);
        close(measurement.Nanoseconds, Math.max(0, Number(actual[index][3]) - correction * measurement.Operations));
        const value = measurement.Nanoseconds / measurement.Operations;
        close(value, benchmark.Statistics.OriginalValues[index]);
        return value;
      });
      const deviation = Math.sqrt(variance(values));
      for (const [field, value] of Object.entries({ Mean: mean(values), Median: median(values),
        StandardDeviation: deviation, Variance: variance(values), StandardError: deviation / Math.sqrt(8),
        Min: Math.min(...values), Max: Math.max(...values) })) close(benchmark.Statistics[field], value);
      const rawGc = gc[0].slice(1).map(Number);
      assert.equal(benchmark.Memory.TotalOperations, rawGc[4]);
      assert.deepEqual([benchmark.Memory.Gen0Collections, benchmark.Memory.Gen1Collections, benchmark.Memory.Gen2Collections], rawGc.slice(0, 3));
      const quotient = rawGc[3] / rawGc[4];
      const integral = Math.floor(quotient);
      const rounded = quotient - integral === 0.5 ? integral + integral % 2 : Math.round(quotient);
      assert.equal(benchmark.Memory.BytesAllocatedPerOperation, rounded);
      const firstHalf = mean(values.slice(0, 4));
      const secondHalf = mean(values.slice(4));
      const slope = values.reduce((sum, value, index) => sum + (index - 3.5) * (value - mean(values)), 0) / 42;
      rows.push({ attempt, variant, method, profile, meanNs: mean(values), medianNs: median(values),
        standardDeviationNs: deviation, cvPercent: 100 * deviation / mean(values), allocatedBytesPerOperation: rounded,
        firstHalfMeanNs: firstHalf, secondHalfMeanNs: secondHalf, secondHalfLessTimePercent: 100 * (1 - secondHalf / firstHalf),
        fittedEndToEndTrendPercent: 100 * slope * 7 / mean(values),
        actualOverheadSamples: overhead.length, actualMedianOverheadNsPerOperation: correction, rawGc, rawResultNsPerOperation: values });
    }
    assert.deepEqual(actualCases.sort(), [plan.benchmarkMethod, plan.unchangedControlMethod].flatMap(method =>
      keys.map(profile => method + ':' + profile)).sort());
  }
}
const attempts = budget.completed.map(item => item.attempt);
assert.equal(rows.length, attempts.length * 32);
const paired = attempts.flatMap(attempt => [plan.benchmarkMethod, plan.unchangedControlMethod].flatMap(method => keys.map(profile => {
  const before = rows.find(row => row.attempt === attempt && row.variant === 'Original' && row.profile === profile && row.method === method);
  const after = rows.find(row => row.attempt === attempt && row.variant === 'Candidate' && row.profile === profile && row.method === method);
  return { attempt, method, profile, lessTimePercent: 100 * (1 - after.meanNs / before.meanNs),
    actualManagedBytesSaved: before.allocatedBytesPerOperation - after.allocatedBytesPerOperation, original: before, candidate: after };
})));
const primary = paired.filter(row => row.profile === plan.primary && row.method === plan.benchmarkMethod);
const primaryControl = paired.filter(row => row.profile === plan.primary && row.method === plan.unchangedControlMethod);
const ordinary = paired.filter(row => row.profile === plan.unchangedControl && row.method === plan.benchmarkMethod);
const ordinaryControl = paired.filter(row => row.profile === plan.unchangedControl && row.method === plan.unchangedControlMethod);
const medianPrimary = median(primary.map(row => row.lessTimePercent));
const numericalGate = medianPrimary >= 5 && primary.filter(row => row.lessTimePercent > 0).length >= 2;
const atMostControl = primary.filter(row => row.lessTimePercent <= primaryControl.find(item => item.attempt === row.attempt).lessTimePercent).map(row => row.attempt);
const allocationDistinctPairs = primary.filter(row => row.actualManagedBytesSaved >= 32
  && [primaryControl, ordinary, ordinaryControl].every(control =>
    row.actualManagedBytesSaved > control.find(item => item.attempt === row.attempt).actualManagedBytesSaved)).map(row => row.attempt);
const allocationGate = allocationDistinctPairs.length >= 2;
const ordinarySlower = ordinary.filter(row => row.lessTimePercent < 0).map(row => row.attempt);
const unexplainedOrdinaryAdverse = ordinary.filter(row => row.lessTimePercent < 0
  && row.lessTimePercent < ordinaryControl.find(item => item.attempt === row.attempt).lessTimePercent).map(row => row.attempt);
const ordinaryMedianMoreTime = -median(ordinary.map(row => row.lessTimePercent));
const rejectAllocationOnly = ordinaryMedianMoreTime >= 5 && ordinarySlower.length >= 2 && unexplainedOrdinaryAdverse.length >= 2;
const profileSummaries = [plan.benchmarkMethod, plan.unchangedControlMethod].flatMap(method => plan.profileKeys.map(profile => {
  const comparisons = paired.filter(row => row.profile === profile && row.method === method);
  return { method, profile, medianLessTimePercent: median(comparisons.map(row => row.lessTimePercent)),
    eachLessTimePercent: comparisons.map(row => row.lessTimePercent), medianOriginalNs: median(comparisons.map(row => row.original.meanNs)),
    medianCandidateNs: median(comparisons.map(row => row.candidate.meanNs)),
    originalAllocatedBytes: comparisons.map(row => row.original.allocatedBytesPerOperation),
    candidateAllocatedBytes: comparisons.map(row => row.candidate.allocatedBytesPerOperation) };
}));
const xmlAudits = [];
for (const item of seal.audits) {
  assert.equal(sha(located(item.auditPath)), item.auditSha256);
  assert.equal(sha(located(item.trxPath)), item.trxSha256);
  const previous = read(item.auditPath);
  const result = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', located('F121-audit-trx.ps1'),
    '-TrxPath', located(item.trxPath), '-ExpectedRows', String(item.actualRows),
    '-ExpectedFocusedRows', String(item.actualPreservationRows)], { windowsHide: true, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const audit = JSON.parse(result.stdout.replace(/^\uFEFF/, ''));
  assert.equal(audit.actualPassed, item.actualRows);
  assert.equal(audit.actualSkippedOrFailed, 0);
  assert.deepEqual(audit.actualRows, previous.rows);
  xmlAudits.push({ label: item.label, actualRows: audit.actualPassed, actualFocusedRows: audit.actualFocusedRows, actualXmlParsed: true });
}
const expectedFailures = new Map([['original-preservation-build-001', 1]]);
for (const label of fs.readdirSync(located('validation'))) {
  const result = read('validation/' + label + '/result.json');
  assert.equal(result.protectedPinUnchanged, true);
  assert.equal(result.exitCode, expectedFailures.get(label) ?? 0, label);
  assert.equal(sha(located('validation/' + label + '/stdout.txt')), result.stdoutSha256);
  assert.equal(sha(located('validation/' + label + '/stderr.txt')), result.stderrSha256);
  assert.equal(sha(located('validation/' + label + '/command.ps1')), result.actualCommandSha256);
}
const extra = {};
if (!measurementOnly) {
  const decision = read('decision.json');
  assert.equal(decision.numericalPrimaryTimingGateMet, numericalGate);
  assert.equal(decision.allocationGateMet, allocationGate);
  assert.equal(decision.controlCredibilityGateMet, atMostControl.length < 2);
  assert.equal(decision.ordinaryPathRejectsAllocationOnly, rejectAllocationOnly);
  close(decision.medianPrimaryLessTimePercent, medianPrimary);
  const reproduction = read('reconstruction-paired-001/verified-reproduction.json');
  assert.equal(reproduction.actualByteExactProjectFiles, 8);
  assert.equal(reproduction.actualAdditionalTimingSamples, 0);
  assert.equal(reproduction.actualClosedBudgetSha256, sha(located('diagnostic-budget.json')));
  assert.equal(reproduction.actualMeasuredImagesPreserved, true);
  for (const item of harness) assert.equal(sha(located('reconstruction-paired-001/project/' + item.path)), item.sha256);
  for (const variant of ['Original', 'Candidate']) {
    const suffix = variant.toLowerCase();
    const closure = read('reconstruction-paired-001/closure-' + suffix + '.json');
    const fresh = byPath(closure);
    const measured = byPath(closures[variant]);
    assert.deepEqual([...fresh.keys()].sort(), [...measured.keys()].sort());
    assert.deepEqual([...fresh.keys()].filter(name => fresh.get(name).sha256 !== measured.get(name).sha256).sort(),
      ['AutoPerf.Benchmarks.dll', 'AutoPerf.Benchmarks.pdb']);
    const folder = 'reconstruction-paired-001/' + variant + '/states';
    assert.deepEqual(characterize(folder), observed);
    verifyExecution(folder, variant, closure, 'characterize', proofs[variant]);
  }
  for (const label of ['Restore', 'Build', 'Original-Characterize', 'Candidate-Characterize']) {
    const command = read('reconstruction-paired-001/' + label + '/command.json');
    assert.equal(command.actualExitCode, 0);
    assert.equal(command.actualTimingAuthorized, false);
    assert.equal(command.arguments.includes('measure'), false);
  }
  Object.assign(extra, { actualDisposition: decision.disposition, actualIndependentlyRebuiltProjectFiles: 8,
    actualAdditionalReconstructionTimingSamples: 0 });
}
if (flags.includes('--live-images')) {
  for (const variant of ['Original', 'Candidate', 'Default']) {
    const suffix = variant === 'Default' ? 'current-default' : variant.toLowerCase();
    for (const item of closures[variant].files) assert.equal(sha(located('consumer-' + suffix + '/' + item.path)), item.sha256);
  }
}
if (flags.includes('--require-seal')) {
  const capsule = read('capsule-file-hashes.json');
  const all = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    assert.equal(item.isSymbolicLink(), false);
    const file = path.join(directory, item.name);
    return item.isDirectory() ? all(file) : [path.relative(root, file).replaceAll('\\', '/')];
  });
  assert.deepEqual(all(root).filter(name => !['capsule-file-hashes.json', 'publication.json'].includes(name)).sort(),
    capsule.files.map(item => item.path).sort());
  for (const item of capsule.files) {
    assert.equal(sha(located(item.path)), item.sha256);
    assert.equal(fs.statSync(located(item.path)).size, item.bytes);
  }
}
const summary = {
  candidate: 'F121', actualAuthorizationsConsumed: budget.authorized.length, actualFailedAuthorizationNumbers: [],
  actualCompletedComparisonNumbers: attempts, actualCompletedComparisons: attempts.length,
  actualRetainedSamples: rows.length * 8, actualTimedCasesPerVariant: 16,
  actualAuthorizedSourceOrders: budget.authorized.map(item => item.order),
  actualExecutedSourceOrders: budget.authorized.map(item => ({ attempt: item.attempt,
    order: item.order })), actualPrimaryDefinition: plan.primary,
  actualMedianPrimaryLessTimePercent: medianPrimary, actualNumericalPrimaryTimingGateMet: numericalGate,
  actualPrimaryAllocationGateMet: allocationGate, actualPrimaryAllocationDistinctComparisons: allocationDistinctPairs,
  actualPrimaryManagedByteSavings: primary.map(row => row.actualManagedBytesSaved),
  actualPrimarySlowerComparisons: primary.filter(row => row.lessTimePercent < 0).map(row => row.attempt),
  actualControlCredibilityGateMet: atMostControl.length < 2, actualPrimaryNoGreaterThanIndexOfComparisons: atMostControl,
  actualOrdinaryMedianMoreTimePercent: ordinaryMedianMoreTime, actualOrdinarySlowerComparisons: ordinarySlower,
  actualOrdinaryUnexplainedAdverseComparisons: unexplainedOrdinaryAdverse, actualOrdinaryPathRejectsAllocationOnly: rejectAllocationOnly,
  actualMaximumObservedCaseCvPercent: Math.max(...rows.map(row => row.cvPercent)),
  actualRuntimeRecordsChecked: runtimeRecords, actualPerBenchmarkSettingsRecordsChecked: settingsRecords,
  actualExpectedSettings: expectedSettings, actualXmlAudits: xmlAudits,
  actualExpectedPreservedPreparationFailures: [...expectedFailures.keys()], actualNotCompleteCompilerProvenance: true,
  ...extra, primary, primaryControl, ordinary, ordinaryControl, profileSummaries, paired, rows
};
const output = openBudget ? 'measurement-audit-after-attempt-' + String(budget.authorized.length).padStart(3, '0') + '.json'
  : measurementOnly ? 'measurement-audit.json' : 'audit-summary.json';
if (flags.includes('--write-summary')) fs.writeFileSync(located(output), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
else assert.deepEqual(read(output), summary);
console.log(JSON.stringify({ candidate: 'F121', actualAuthorizationsConsumed: budget.authorized.length,
  actualCompletedComparisonNumbers: attempts, actualRetainedSamples: summary.actualRetainedSamples,
  actualMedianPrimaryLessTimePercent: medianPrimary, actualNumericalPrimaryTimingGateMet: numericalGate,
  actualPrimaryManagedByteSavings: summary.actualPrimaryManagedByteSavings, actualPrimaryAllocationGateMet: allocationGate,
  actualOrdinaryMedianMoreTimePercent: ordinaryMedianMoreTime, actualOrdinaryPathRejectsAllocationOnly: rejectAllocationOnly,
  actualRuntimeRecordsChecked: runtimeRecords, actualPerBenchmarkSettingsRecordsChecked: settingsRecords,
  actualParsedIndividualTestRows: xmlAudits.reduce((sum, item) => sum + item.actualRows, 0), ...extra }, null, 2));
