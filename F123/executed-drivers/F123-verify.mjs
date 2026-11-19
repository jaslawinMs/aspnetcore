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
assert.ok(budget.authorized.length >= (openBudget ? 1 : 2) && budget.authorized.length <= 3);
assert.ok(budget.authorized.every(item => ['completed', 'failed'].includes(item.state)));
assert.equal(budget.permanentlyClosed, !openBudget);
if (!openBudget) {
  assert.equal(budget.authorized.length, 3);
  assert.equal(sha(located('diagnostic-budget.json')), read('permanent-budget-close.json').closedBudgetSha256);
}
assert.equal(sha(located('acceptance-plan.json')), seal.acceptancePlanSha256);
assert.equal(plan.candidate, 'F123');
assert.equal(plan.benchmarkMethod, 'IndexOf');
assert.equal(plan.unchangedControlMethod, 'UnchangedContains');
assert.equal(plan.primary, 'CopiedDefault5');
assert.equal(plan.unchangedControl, 'UnmodifiedDefault5');
assert.equal(seal.actualFixtureEpoch, 1);
assert.deepEqual(seal.actualPreviouslyConsumedFailedAuthorizations, []);
assert.equal(sha(located('profile-definitions.json')), seal.profileDefinitionsSha256);
assert.deepEqual(profiles.map(item => item.key), plan.profileKeys);
const keys = [...plan.profileKeys].sort();
assert.equal(keys.length, 12);
assert.equal(new Set(keys).size, 12);
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
  assert.equal(inputs[variant].sourceFiles.length, 11);
  assert.equal(inputs[variant].sourceFiles.filter(item => item.pdbDocumentRequired).length, 7);
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
const originalOwnerText = fs.readFileSync(located('source-files-original/' + ownerSource), 'utf8');
const candidateOwnerText = fs.readFileSync(located('source-files-candidate/' + ownerSource), 'utf8');
const ownerSeam = originalOwnerText.indexOf('        foreach (var obj in Readable)',
  originalOwnerText.indexOf('    public int IndexOf(T item)'));
assert.ok(ownerSeam > 0);
assert.ok(candidateOwnerText.startsWith(originalOwnerText.slice(0, ownerSeam)));
assert.ok(candidateOwnerText.endsWith(originalOwnerText.slice(ownerSeam)));
assert.equal(read('candidate-seam-verification.json').actualOriginalPrefixAndCompleteSuffixByteExact, true);
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
  assert.equal(proof.actualSelectedInputs, 11);
  assert.equal(proof.actualSelectedDocuments, 7);
  assert.equal(proof.actualUniqueFrameworkDocuments, 7);
  assert.equal(proof.actualSourceBuiltOwners, 3);
  assert.equal(proof.actualCompleteCompilerProvenanceClaimed, false);
  const proved = new Set();
  for (const name of owners) {
    const owner = proof.ownerProofs.find(item => item.actualOwner === name);
    assert.ok(owner);
    assert.equal(owner.actualPeAndPdbMatch, true);
    assert.equal(owner.actualOwnerSha256, files.get(name + '.dll').sha256);
    assert.equal(owner.actualPdbSha256, files.get(name + '.pdb').sha256);
    assert.equal(owner.proofs.length, name === owners[0] ? 4 : name === owners[1] ? 3 : 0);
    for (const item of owner.proofs) {
      const source = inputs[variant].sourceFiles.find(file => file.path === item.source);
      assert.equal(item.sha256, source.sha256);
      assert.equal(source.pdbDocumentRequired, true);
      proved.add(item.source);
    }
  }
  assert.equal(proved.size, 7);
  if (expectedProof) assert.deepEqual(proof, expectedProof);
  const discovery = one(folder, 'benchmarkdotnet-discovery-preflight');
  assert.equal(discovery.actualDiscoveredCases, 24);
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
  const properties = records(folder, 'actual-public-property-contract');
  assert.equal(properties.length, 2);
  assert.deepEqual(properties.map(item => item.actualContext).sort(),
    ['Microsoft.AspNetCore.Mvc.ControllerContext', 'Microsoft.AspNetCore.Mvc.RazorPages.PageContext']);
  assert.ok(properties.every(item => item.actualProperty === 'ValueProviderFactories' && item.actualIListIndexOfAvailable));
  const dispatch = one(folder, 'actual-indexof-interface-map');
  assert.equal(dispatch.actualMethod, 'IndexOf');
  assert.equal(dispatch.actualTargetMatchesOwnerPublicIndexOf, true);
  assert.equal(dispatch.actualOptionalApplicationConsumer, true);
  assert.equal(dispatch.actualNormalFrameworkCallFrequencyClaimed, false);
  return proof;
}
const semanticKinds = [
  'actual-indexof-reference-null-isolation-contract', 'actual-indexof-object-equality-contract',
  'actual-indexof-equality-order-contract', 'actual-indexof-mutation-contract',
  'actual-indexof-source-disposal-contract', 'actual-indexof-failure-disposal-contract'
];
const observedKinds = ['actual-mvc-producer', 'actual-public-indexof-contract', 'actual-benchmark-method-contract',
  'actual-prepared-collection-lifetime', ...semanticKinds, 'characterization-completed'];
function characterize(folder) {
  const observations = Object.fromEntries(observedKinds.map(kind => [kind,
    records(folder, kind).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'))]));
  for (const [kind, count] of [['actual-mvc-producer', 36], ['actual-public-indexof-contract', 24],
    ['actual-benchmark-method-contract', 12], ['actual-prepared-collection-lifetime', 12],
    ...semanticKinds.map(kind => [kind, 2]), ['characterization-completed', 1]]) assert.equal(observations[kind].length, count);
  const producers = observations['actual-mvc-producer'];
  const contracts = observations['actual-public-indexof-contract'];
  for (const profile of profiles) {
    const count = profile.factoryCount === 'default-five' ? 5 : profile.factoryCount;
    const index = profile.probe === 'first' ? 0 : profile.probe === 'last' ? count - 1 : -1;
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
        assert.equal(observation.actualIndexOfExecutedThroughActualPublicProperty, true);
        assert.equal(observation.actualExpectedIndex, index);
        assert.equal(observation.actualIndex, index);
      }
    }
    const results = contracts.filter(item => item.actualProfile === profile.key);
    assert.equal(results.length, 2);
    assert.deepEqual(results.map(item => item.actualEnableActionInvokers).sort(), [false, true]);
    assert.ok(results.every(item => item.actualCount === count && item.actualIndex === index
      && item.actualExpectedIndex === index && item.actualContains === (index >= 0) && item.actualPublicIListIndexOfInvoked));
    const method = observations['actual-benchmark-method-contract'].filter(item => item.actualProfile === profile.key);
    assert.equal(method.length, 1);
    assert.equal(method[0].actualIndex, index);
    assert.equal(method[0].actualContains, index >= 0);
    assert.equal(method[0].actualMethodsInvoked, 2);
    assert.equal(method[0].actualTimingPerformed, false);
    const lifetime = observations['actual-prepared-collection-lifetime'].filter(item => item.actualProfile === profile.key);
    assert.equal(lifetime.length, 1);
    assert.equal(lifetime[0].actualFactoryCount, count);
    assert.equal(lifetime[0].actualExpectedIndex, index);
    assert.equal(lifetime[0].actualExpectedContains, index >= 0);
    assert.ok(lifetime[0].actualHostAndHttpClientDisposedBeforeTiming
      && lifetime[0].actualCreationAndFirstWriteOutsideTiming && lifetime[0].actualStableIndexOfAndContains);
  }
  for (const kind of semanticKinds) {
    const flag = kind.includes('mutation') || kind.includes('source-disposal') ? 'actualMatch'
      : kind.includes('failure-disposal') ? 'actualEqualityFailure' : 'actualCopied';
    assert.deepEqual(observations[kind].map(item => item[flag]).sort(), [false, true]);
  }
  for (const item of observations['actual-indexof-reference-null-isolation-contract']) {
    assert.equal(item.actualFirstRemainingIndex, item.actualCopied ? 0 : 3);
    assert.equal(item.actualReplacementIndex, item.actualCopied ? -1 : 0);
    assert.equal(item.actualEmptyMissingIndex, -1);
    assert.equal(item.actualAllReferenceNullDuplicateChecksPassed, true);
  }
  for (const item of observations['actual-indexof-object-equality-contract']) {
    assert.equal(item.actualReferenceAndValueTypeObjectEqualityVerified, true);
    assert.equal(item.actualTypedEqualityWouldThrowDistinctProbeException, true);
  }
  for (const item of observations['actual-indexof-equality-order-contract']) {
    assert.equal(item.actualIndex, 1);
    assert.deepEqual(item.actualEqualityOrder, [1, 2]);
    assert.equal(item.actualLaterElementAndProbeReceiversNotEvaluated, true);
  }
  for (const item of observations['actual-indexof-mutation-contract']) {
    assert.equal(item.actualEqualityCalls, 1);
    assert.equal(item.actualMutationCount, 3);
    assert.equal(item.actualInvalidOperationException, !item.actualMatch);
    assert.equal(item.actualIndex, item.actualMatch ? 0 : null);
    assert.equal(item.actualSourceUnchanged, true);
  }
  for (const item of observations['actual-indexof-source-disposal-contract']) {
    assert.equal(item.actualIndex, item.actualMatch ? 1 : -1);
    assert.equal(item.actualGetEnumeratorCalls, 1);
    assert.equal(item.actualMoveNextCalls, item.actualMatch ? 2 : 3);
    assert.equal(item.actualCurrentCalls, 2);
    assert.equal(item.actualDisposeCalls, 1);
    assert.equal(item.actualCountAndIndexerReads, 0);
  }
  for (const item of observations['actual-indexof-failure-disposal-contract']) {
    assert.equal(item.actualEqualityCalls, item.actualEqualityFailure ? 1 : 0);
    assert.equal(item.actualSameFailurePropagated, true);
    assert.equal(item.actualMoveNextCalls, 1);
    assert.equal(item.actualCurrentCalls, 1);
    assert.equal(item.actualDisposeCalls, 1);
    assert.equal(item.actualCountAndIndexerReads, 0);
  }
  const completed = one(folder, 'characterization-completed');
  assert.equal(completed.actualProfiles, 12);
  assert.equal(completed.actualControllerModes, 2);
  assert.equal(completed.actualPublicProducerContracts, 24);
  assert.equal(completed.actualBenchmarkMethodChecks, 24);
  assert.equal(completed.actualLegacySemanticContracts, 12);
  assert.equal(completed.actualApplicationIndexOfResultObservedInHttpResponse, true);
  assert.equal(completed.actualRequestThroughputOrTypicalCallFrequencyClaimed, false);
  assert.equal(completed.actualCompiledPageOrBrowserRequestClaimed, false);
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
  assert.equal(historic.actualDriverSha256, sha(located('F123-compare.mjs')));
  for (const variant of ['Original', 'Candidate']) {
    assert.equal(authorization[variant].closureSha256, sha(located('closure-' + variant.toLowerCase() + '.json')));
    assert.equal(authorization[variant].sourceInputsSha256, sha(located('source-inputs-' + variant.toLowerCase() + '.json')));
  }
  assert.equal(historic.state, 'completed', 'Audit a later failed/partial attempt explicitly; never manufacture a paired result.');
  assert.equal(historic.actualTimingStarted, true);
  const receipt = read(folder + '/execution-receipt.json');
  assert.equal(receipt.actualCompletePairedSourceComparison, true);
  assert.equal(receipt.actualRetainedSamples, 384);
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
    assert.equal(completed.actualReports, 24);
    assert.equal(completed.actualAllSuccessful, true);
    assert.equal(completed.actualAttempt, attempt);
    assert.equal(completed.actualVariant, variant);
    const producers = records(stateFolder, 'actual-mvc-producer');
    assert.equal(producers.length, 12);
    assert.deepEqual(producers.map(item => item.actualProfile).sort(), keys);
    assert.ok(producers.every(item => item.actualHttpRequests === 2 && !item.actualEnableActionInvokers
      && item.actualDistinctPerRequestWrappers && item.actualSameUntouchedSourceArray && item.actualSecondRequestHasNoCopy));
    const lifetimes = records(stateFolder, 'actual-prepared-collection-lifetime');
    assert.equal(lifetimes.length, 24);
    for (const key of keys) assert.equal(lifetimes.filter(item => item.actualProfile === key).length, 2);
    assert.ok(lifetimes.every(item => item.actualHostAndHttpClientDisposedBeforeTiming
      && item.actualCreationAndFirstWriteOutsideTiming && item.actualStableIndexOfAndContains));
    for (const phase of ['before', 'after']) {
      const settings = records(stateFolder, 'settings-' + phase);
      assert.equal(settings.length, 24);
      for (const item of settings) assert.deepEqual(item, expectedSettings);
      settingsRecords += settings.length;
    }
    const reportFile = variantFolder + '/reports/results/AutoPerf.CollectionBenchmarks-report-full.json';
    assert.equal(sha(located(reportFile)), historic.completed.find(item => item.variant === variant).fullJsonSha256);
    const report = read(reportFile);
    assert.equal(report.Benchmarks.length, 24);
    const blocks = fs.readFileSync(located(variantFolder + '/stdout.txt'), 'utf8').split(/^\/\/ Benchmark: /m).slice(1);
    assert.equal(blocks.length, 24);
    const nativeByDisplay = new Map(blocks.map(block => [block.split(/\r?\n/, 1)[0].trim(), block]));
    assert.equal(nativeByDisplay.size, 24);
    const actualCases = [];
    for (const benchmark of report.Benchmarks) {
      const match = benchmark.FullName.match(/^AutoPerf\.CollectionBenchmarks\.(IndexOf|UnchangedContains)\(Profile: ([A-Za-z0-9]+)\)$/);
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
assert.equal(rows.length, attempts.length * 48);
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
const controlCredibilityGate = primary.filter(row =>
  row.lessTimePercent > primaryControl.find(item => item.attempt === row.attempt).lessTimePercent).length >= 2;
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
  const result = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', located('F123-audit-trx.ps1'),
    '-TrxPath', located(item.trxPath), '-ExpectedRows', String(item.actualRows),
    '-ExpectedFocusedRows', String(item.actualPreservationRows)], { windowsHide: true, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const audit = JSON.parse(result.stdout.replace(/^\uFEFF/, ''));
  assert.equal(audit.actualPassed, item.actualRows);
  assert.equal(audit.actualSkippedOrFailed, 0);
  assert.deepEqual(audit.actualRows, previous.rows);
  xmlAudits.push({ label: item.label, actualRows: audit.actualPassed, actualFocusedRows: audit.actualFocusedRows, actualXmlParsed: true });
}
const expectedFailures = new Map([['original-preservation-tests-001', 1]]);
for (const label of fs.readdirSync(located('validation'))) {
  const result = read('validation/' + label + '/result.json');
  assert.equal(result.protectedPinUnchanged, true);
  assert.equal(result.exitCode, expectedFailures.get(label) ?? 0, label);
  assert.equal(sha(located('validation/' + label + '/stdout.txt')), result.stdoutSha256);
  assert.equal(sha(located('validation/' + label + '/stderr.txt')), result.stderrSha256);
  assert.equal(sha(located('validation/' + label + '/command.ps1')), result.actualCommandSha256);
}
const corrections = read('preparation-correction.json');
assert.equal(corrections.actualInitialPassed, 38);
assert.equal(corrections.actualInitialFailed, 2);
assert.equal(corrections.actualEveryFocusedSuccessorRowPassed, 12);
assert.equal(corrections.actualNoShippingSourceChange, true);
assert.equal(corrections.actualTimingAuthorizationsConsumed, 0);
assert.equal(sha(located('validation/original-preservation-tests-001/stdout.txt')), corrections.actualOriginalFailureStdoutSha256);
assert.equal(sha(located('validation/original-preservation-tests-001/stderr.txt')), corrections.actualOriginalFailureStderrSha256);
assert.ok(fs.readFileSync(located('validation/original-preservation-tests-001/stdout.txt'), 'utf8')
  .includes('Failed:     2, Passed:    38, Skipped:     0, Total:    40'));
const misdirected = read('validation/original-preservation-tests-002/command.json').arguments;
assert.ok(misdirected[misdirected.indexOf('--results-directory') + 1]
  .endsWith('\\original-preservation-tests-001\\test-results'));
assert.ok(fs.readFileSync(located('validation/original-preservation-tests-002/stdout.txt'), 'utf8')
  .includes('WARNING: Overwriting results file:'));
assert.ok(!seal.audits.some(item => item.label === 'original-preservation-tests-001'
  || item.label === 'original-preservation-tests-002'));
const extra = {};
if (!measurementOnly) {
  const decision = read('decision.json');
  assert.equal(decision.numericalPrimaryTimingGateMet, numericalGate);
  assert.equal(decision.allocationGateMet, allocationGate);
  assert.equal(decision.controlCredibilityGateMet, controlCredibilityGate);
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
  candidate: 'F123', actualAuthorizationsConsumed: budget.authorized.length, actualFailedAuthorizationNumbers: [],
  actualCompletedComparisonNumbers: attempts, actualCompletedComparisons: attempts.length,
  actualRetainedSamples: rows.length * 8, actualTimedCasesPerVariant: 24,
  actualAuthorizedSourceOrders: budget.authorized.map(item => item.order),
  actualExecutedSourceOrders: budget.authorized.map(item => ({ attempt: item.attempt,
    order: item.order })), actualPrimaryDefinition: plan.primary,
  actualMedianPrimaryLessTimePercent: medianPrimary, actualNumericalPrimaryTimingGateMet: numericalGate,
  actualPrimaryAllocationGateMet: allocationGate, actualPrimaryAllocationDistinctComparisons: allocationDistinctPairs,
  actualPrimaryManagedByteSavings: primary.map(row => row.actualManagedBytesSaved),
  actualPrimarySlowerComparisons: primary.filter(row => row.lessTimePercent < 0).map(row => row.attempt),
  actualControlCredibilityGateMet: controlCredibilityGate, actualPrimaryNoGreaterThanContainsComparisons: atMostControl,
  actualOrdinaryMedianMoreTimePercent: ordinaryMedianMoreTime, actualOrdinarySlowerComparisons: ordinarySlower,
  actualOrdinaryUnexplainedAdverseComparisons: unexplainedOrdinaryAdverse, actualOrdinaryPathRejectsAllocationOnly: rejectAllocationOnly,
  actualMaximumObservedCaseCvPercent: Math.max(...rows.map(row => row.cvPercent)),
  actualRuntimeRecordsChecked: runtimeRecords, actualPerBenchmarkSettingsRecordsChecked: settingsRecords,
  actualExpectedSettings: expectedSettings, actualXmlAudits: xmlAudits,
  actualExpectedPreservedPreparationFailures: [...expectedFailures.keys()], actualNotCompleteCompilerProvenance: true,
  actualInitialFailingTrxNotPreserved: true,
  actualMisdirectedPreparationTrxExcludedFromAcceptedXmlEvidence: true,
  ...extra, primary, primaryControl, ordinary, ordinaryControl, profileSummaries, paired, rows
};
const output = openBudget ? 'measurement-audit-after-attempt-' + String(budget.authorized.length).padStart(3, '0') + '.json'
  : measurementOnly ? 'measurement-audit.json' : 'audit-summary.json';
if (flags.includes('--write-summary')) fs.writeFileSync(located(output), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
else assert.deepEqual(read(output), summary);
console.log(JSON.stringify({ candidate: 'F123', actualAuthorizationsConsumed: budget.authorized.length,
  actualCompletedComparisonNumbers: attempts, actualRetainedSamples: summary.actualRetainedSamples,
  actualMedianPrimaryLessTimePercent: medianPrimary, actualNumericalPrimaryTimingGateMet: numericalGate,
  actualPrimaryManagedByteSavings: summary.actualPrimaryManagedByteSavings, actualPrimaryAllocationGateMet: allocationGate,
  actualOrdinaryMedianMoreTimePercent: ordinaryMedianMoreTime, actualOrdinaryPathRejectsAllocationOnly: rejectAllocationOnly,
  actualRuntimeRecordsChecked: runtimeRecords, actualPerBenchmarkSettingsRecordsChecked: settingsRecords,
  actualParsedIndividualTestRows: xmlAudits.reduce((sum, item) => sum + item.actualRows, 0), ...extra }, null, 2));
