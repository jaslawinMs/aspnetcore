import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] ?? path.dirname(fileURLToPath(import.meta.url)));
const flags = process.argv.slice(3);
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
const close = (actual, expected) => assert.ok(Number.isFinite(actual) && Number.isFinite(expected)
  && Math.abs(actual - expected) <= Math.max(1e-6, Math.abs(expected) * 1e-11), `${actual} != ${expected}`);
const records = (folder, kind) => fs.readdirSync(located(folder)).sort()
  .filter(name => name.endsWith('-' + kind + '.json')).map(name => read(folder + '/' + name));
function one(folder, kind) {
  const result = records(folder, kind);
  assert.equal(result.length, 1, folder + ':' + kind);
  return result[0];
}
const plan = read('acceptance-plan.json');
const profiles = read('profile-definitions.json');
const budget = read('diagnostic-budget.json');
const seal = read('baseline-validation.json');
assert.equal(sha(located('acceptance-plan.json')), seal.acceptancePlanSha256);
assert.equal(sha(located('profile-definitions.json')), seal.profileDefinitionsSha256);
assert.equal(plan.actualShippingEditsAtSeal, 0);
assert.equal(plan.actualNewPermanentTestFilesAtSeal, 0);
assert.equal(plan.actualNewTestsExecutedAtSeal, 0);
assert.equal(plan.actualBenchmarkRunsAtSeal, 0);
assert.equal(seal.actualCandidateSelected, false);
assert.equal(seal.actualShippingEdits, 0);
assert.equal(seal.actualBoundedProductionFitGateMet, false);
assert.equal(budget.maximum, 3);
assert.equal(budget.permanentlyClosed, true);
assert.equal(budget.authorized.length, 1);
assert.equal(budget.authorized[0].kind, 'original-only-profile');
assert.equal(budget.authorized[0].state, 'completed');
assert.equal(budget.failedOrPartialAttempts.length, 0);
assert.equal(sha(located('diagnostic-budget.json')), read('permanent-budget-close.json').closedBudgetSha256);
assert.deepEqual(profiles.map(item => item.key), plan.profileKeys);
assert.equal(new Set(plan.profileKeys).size, 8);
assert.deepEqual(plan.benchmarkMethods, ['EnumerateGeneric', 'EnumerateNonGeneric', 'RetainGenericEnumerator', 'UnchangedIndexOf']);
const harness = read('harness-source-hashes.json');
assert.equal(harness.length, 8);
for (const item of harness) {
  assert.equal(sha(located('harness/' + item.path)), item.sha256);
  assert.equal(fs.statSync(located('harness/' + item.path)).size, item.bytes);
}
assert.equal(sha(located('harness/SettingsPreservingEmitToolchain.cs')), '02B69C0AA06612700D9DA122BA64081771EE333B126DABC08156C0BD118F115B');
const inputs = {};
const closures = {};
const byPath = closure => new Map(closure.files.map(item => [item.path, item]));
for (const [variant, suffix] of [['Original', 'original'], ['Default', 'current-default']]) {
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
for (const role of seal.roles) {
  for (const item of role.stateHashes) assert.equal(sha(located(item.path)), item.sha256);
  assert.equal(sha(located(role.characterizationPath)), role.characterizationSha256);
  assert.equal(sha(located(role.closurePath)), role.closureSha256);
  assert.equal(sha(located(role.sourcePath)), role.sourceSha256);
}
assert.equal(sha(located(seal.actualFocusedTestSource.snapshot)), seal.actualFocusedTestSource.sha256);
const originalStates = 'characterization-original-characterize-001/states';
const expectedSettings = one(originalStates, 'runtime-characterize-before').settings;
assert.deepEqual(expectedSettings, { processPriority: 'Normal', threadPriority: 'Normal', affinity: 65535 });
const ownerNames = ['Microsoft.AspNetCore.Mvc.Core', 'Microsoft.AspNetCore.Mvc.RazorPages', 'Microsoft.AspNetCore.TestHost'];
let runtimeRecords = 0;
function verifyExecution(folder, variant, closure, mode) {
  const files = byPath(closure);
  const image = one(folder, 'verified-image');
  assert.equal(image.actualEntries, 328);
  assert.equal(image.actualEveryEntryVerified, true);
  const proof = one(folder, 'selected-source-pdb-associations');
  assert.equal(proof.actualSelectedInputs, 11);
  assert.equal(proof.actualSelectedDocuments, 7);
  assert.equal(proof.actualUniqueFrameworkDocuments, 7);
  assert.equal(proof.actualSourceBuiltOwners, 3);
  assert.equal(proof.actualCompleteCompilerProvenanceClaimed, false);
  const proved = new Set();
  for (const name of ownerNames) {
    const owner = proof.ownerProofs.find(item => item.actualOwner === name);
    assert.ok(owner);
    assert.equal(owner.actualPeAndPdbMatch, true);
    assert.equal(owner.actualOwnerSha256, files.get(name + '.dll').sha256);
    assert.equal(owner.actualPdbSha256, files.get(name + '.pdb').sha256);
    assert.equal(owner.proofs.length, name === ownerNames[0] ? 4 : name === ownerNames[1] ? 3 : 0);
    for (const item of owner.proofs) {
      const source = inputs[variant].sourceFiles.find(file => file.path === item.source);
      assert.equal(item.sha256, source.sha256);
      assert.equal(source.pdbDocumentRequired, true);
      proved.add(item.source);
    }
  }
  assert.equal(proved.size, 7);
  const discovery = one(folder, 'benchmarkdotnet-discovery-preflight');
  assert.equal(discovery.actualDiscoveredCases, 32);
  assert.equal(discovery.actualTimingRunByThisPreflight, false);
  assert.equal(discovery.actualVariant, variant);
  const properties = records(folder, 'actual-public-consumer-static-type');
  assert.equal(properties.length, 2);
  assert.deepEqual(properties.map(item => item.actualContext).sort(),
    ['Microsoft.AspNetCore.Mvc.ControllerContext', 'Microsoft.AspNetCore.Mvc.RazorPages.PageContext']);
  assert.ok(properties.every(item => item.actualDeclaredType
    === 'System.Collections.Generic.IList`1[Microsoft.AspNetCore.Mvc.ModelBinding.IValueProviderFactory]'
    && !item.actualConcretePatternSelectableThroughProperty));
  const callers = one(folder, 'bounded-shipping-il-audit');
  assert.equal(callers.actualModules, 14);
  assert.equal(callers.actualIlBodies, 9771);
  assert.equal(callers.actualDecodedMethodOperands, variant === 'Original' ? 37921 : 37918);
  assert.equal(callers.actualMatchingConstructorSites, 4);
  assert.equal(callers.actualConcreteGetEnumeratorMethodOperands, 1);
  assert.equal(callers.actualNonGenericForwardingOperands, 1);
  assert.equal(callers.actualOtherConcreteGetEnumeratorOperands, 0);
  assert.equal(callers.actualCandidateConcretePatternProductionFitDemonstrated, false);
  assert.equal(callers.actualFullRepositoryOrExternalDynamicCallerAbsenceClaimed, false);
  assert.equal(callers.actualGenericInterfaceTargetsOriginalPublicMember, true);
  assert.equal(callers.actualNonGenericInterfaceTargetsForwarder, true);
  assert.equal(callers.modules.reduce((sum, item) => sum + item.actualIlBodies, 0), callers.actualIlBodies);
  assert.equal(callers.modules.reduce((sum, item) => sum + item.actualMethodOperands, 0), callers.actualDecodedMethodOperands);
  assert.equal(callers.matches.filter(item => item.actualTargetMethod === '.ctor').length, 4);
  const forwarding = callers.matches.filter(item => item.actualTargetMethod === 'GetEnumerator');
  assert.equal(forwarding.length, 1);
  assert.equal(forwarding[0].actualCallerType, 'Microsoft.AspNetCore.Mvc.Infrastructure.CopyOnWriteList`1');
  assert.equal(forwarding[0].actualCallerMethod, 'System.Collections.IEnumerable.GetEnumerator');
  for (const module of callers.modules) {
    assert.equal(files.get(path.win32.basename(module.actualPath)).sha256, module.actualSha256);
  }
  const runtimes = ['before', 'after'].map(phase => one(folder, 'runtime-' + mode + '-' + phase));
  assert.equal(runtimes[0].pid, runtimes[1].pid);
  for (const runtime of runtimes) {
    assert.equal(runtime.framework, '.NET 12.0.0-alpha.1.26562.105');
    assert.deepEqual(runtime.settings, expectedSettings);
    const imageRoot = path.win32.dirname(runtime.assemblies.find(item => item.name === 'AutoPerf.Benchmarks').location);
    for (const name of ['AutoPerf.Benchmarks', ...ownerNames]) {
      assert.equal(runtime.assemblies.find(item => item.name === name).sha256, files.get(name + '.dll').sha256);
    }
    for (const assembly of runtime.assemblies.filter(item => item.location.startsWith(imageRoot + '\\'))) {
      const relative = path.win32.relative(imageRoot, assembly.location).replaceAll('\\', '/');
      assert.ok(files.has(relative));
      assert.equal(assembly.sha256, files.get(relative).sha256);
    }
    runtimeRecords++;
  }
  return proof;
}
const extraKinds = [
  ['actual-enumeration-reference-isolation-contract', 'actualCopied'],
  ['actual-enumeration-cursor-contract', 'actualCopied'],
  ['actual-enumeration-capture-mutation-contract', 'actualNonGeneric'],
  ['actual-enumeration-source-forwarding-contract', 'actualNonGeneric'],
  ['actual-enumeration-early-disposal-contract', 'actualThrowFromBody']
];
function verifyCharacterization(folder) {
  const producers = records(folder, 'actual-mvc-producer');
  const contracts = records(folder, 'actual-prepared-public-contract');
  assert.equal(producers.length, 24);
  assert.equal(contracts.length, 16);
  for (const profile of profiles) {
    const expected = profile.factoryCount === 'default-five' ? 5 : profile.factoryCount;
    const captures = producers.filter(item => item.actualProfile === profile.key);
    assert.equal(captures.length, 3);
    assert.equal(captures.filter(item => item.actualEnableActionInvokers).length, 1);
    for (const capture of captures) {
      assert.equal(capture.actualHttpRequests, 2);
      assert.equal(capture.actualConfiguredFactoryCount, expected);
      assert.equal(capture.actualDistinctPerRequestWrappers, true);
      assert.equal(capture.actualSameUntouchedSourceArray, true);
      assert.equal(capture.actualSecondRequestHasNoCopy, true);
      assert.equal(capture.actualNoValueProviderFactoriesPropertyAssignment, true);
      assert.equal(capture.actualCompiledRazorPageRequestClaimed, false);
      assert.equal(capture.observations.length, 2);
      for (const [index, item] of capture.observations.entries()) {
        const copied = index === 0 && profile.copied;
        assert.equal(item.actualRawQueryReadByParameterlessAction, copied ? 'true' : 'false');
        assert.equal(item.actualInitialCopyNull, true);
        assert.equal(item.actualFinalCopied, copied);
        assert.equal(item.actualPrivateCopyIsExactList, copied);
        assert.equal(item.actualFactoryCount, expected);
        assert.equal(item.actualSourceUnchanged, true);
      }
    }
    const results = contracts.filter(item => item.actualProfile === profile.key);
    assert.equal(results.length, 2);
    assert.deepEqual(results.map(item => item.actualEnableActionInvokers).sort(), [false, true]);
    assert.ok(results.every(item => item.actualCount === expected && item.actualGenericAndNonGenericReferencesAndOrderVerified
      && item.actualPreparedBenchmarkChecksumVerified && item.actualRetainedEnumeratorAcquiredAndDisposed && item.actualPassed));
  }
  for (const [kind, field] of extraKinds) {
    const values = records(folder, kind);
    assert.equal(values.length, 2);
    assert.deepEqual(values.map(item => item[field]).sort(), [false, true]);
    assert.ok(values.every(item => item.actualPassed));
  }
  assert.equal(records(folder, 'actual-prepared-collection-lifetime').length, 8);
  const completed = one(folder, 'characterization-completed');
  assert.equal(completed.actualHttpRequests, 48);
  assert.equal(completed.actualAllPassed, true);
  assert.equal(completed.actualTimingRun, false);
}
for (const role of seal.roles) {
  const folder = path.posix.dirname(role.characterizationPath) + '/states';
  verifyCharacterization(folder);
  verifyExecution(folder, role.variant, closures[role.variant], 'characterize');
}
for (const [filename, metadata] of [
  ['BenchmarkDotNet-0.13.0-GcStats.cs', 'BenchmarkDotNet-0.13.0-GcStats-metadata.json'],
  ['BenchmarkDotNet-0.13.0-LICENSE.md', 'BenchmarkDotNet-0.13.0-license-metadata.json']
]) assert.equal(sha(located(filename)), read(metadata).sha256);
const allocationSource = fs.readFileSync(located('BenchmarkDotNet-0.13.0-GcStats.cs'), 'utf8');
assert.ok(allocationSource.includes('(long) Math.Round(') && allocationSource.includes('MidpointRounding.ToEven'));
const history = budget.authorized[0];
assert.equal(history.attempt, 1);
assert.equal(history.actualTimingStarted, true);
assert.equal(history.actualDriverSha256, sha(located('F122-profile.mjs')));
const profileFolder = 'original-profile-001';
const authorization = read(profileFolder + '/authorization.json');
assert.equal(authorization.candidate, 'F122');
assert.equal(authorization.kind, 'original-only-profile');
assert.equal(authorization.attempt, 1);
assert.equal(authorization.actualConsumedBeforeProcessLaunch, 1);
assert.equal(authorization.actualAcceptancePlanSha256, seal.acceptancePlanSha256);
assert.equal(authorization.Original.closureSha256, sha(located('closure-original.json')));
assert.equal(authorization.Original.sourceInputsSha256, sha(located('source-inputs-original.json')));
const receipt = read(profileFolder + '/execution-receipt.json');
assert.equal(receipt.actualOriginalOnlyProfile, true);
assert.equal(receipt.actualCompletePairedSourceComparison, false);
assert.equal(receipt.actualSourceComparisons, 0);
assert.equal(receipt.actualRetainedSamples, 256);
assert.deepEqual(receipt.completed, history.completed);
const variantFolder = profileFolder + '/Original';
const command = read(variantFolder + '/command.json');
const result = read(variantFolder + '/result.json');
assert.equal(result.exitCode, 0);
assert.equal(result.launchError, null);
assert.equal(command.arguments[1], 'measure');
assert.equal(command.actualVariant, 'Original');
assert.equal(command.actualProcessSettingsModifiedByDriver, false);
assert.equal(sha(located(variantFolder + '/stdout.txt')), result.stdoutSha256);
assert.equal(sha(located(variantFolder + '/stderr.txt')), result.stderrSha256);
const stateFolder = variantFolder + '/states';
verifyExecution(stateFolder, 'Original', closures.Original, 'measure');
const completion = one(stateFolder, 'completed');
assert.equal(completion.actualReports, 32);
assert.equal(completion.actualAllSuccessful, true);
assert.equal(completion.actualOriginalOnlyProfile, true);
assert.equal(completion.actualSourceComparison, false);
const lifetimes = records(stateFolder, 'actual-prepared-collection-lifetime');
assert.equal(lifetimes.length, 32);
for (const profile of profiles) assert.equal(lifetimes.filter(item => item.actualProfile === profile.key).length, 4);
assert.ok(lifetimes.every(item => item.actualHostAndHttpClientDisposedBeforeTiming && item.actualCreationAndFirstWriteOutsideTiming
  && item.actualStableEnumerationAndIndexOf && item.actualOnlyActualArrayOrListEnumeratorsRetained));
let settingsRecords = 0;
for (const phase of ['before', 'after']) {
  const values = records(stateFolder, 'settings-' + phase);
  assert.equal(values.length, 32);
  for (const item of values) assert.deepEqual(item, expectedSettings);
  settingsRecords += values.length;
}
const reportFile = variantFolder + '/reports/results/AutoPerf.CollectionBenchmarks-report-full.json';
assert.equal(sha(located(reportFile)), history.completed[0].fullJsonSha256);
const report = read(reportFile);
assert.equal(report.Benchmarks.length, 32);
const blocks = fs.readFileSync(located(variantFolder + '/stdout.txt'), 'utf8').split(/^\/\/ Benchmark: /m).slice(1);
assert.equal(blocks.length, 32);
const nativeByDisplay = new Map(blocks.map(block => [block.split(/\r?\n/, 1)[0].trim(), block]));
assert.equal(nativeByDisplay.size, 32);
const rows = [];
for (const benchmark of report.Benchmarks) {
  const match = benchmark.FullName.match(/^AutoPerf\.CollectionBenchmarks\.(EnumerateGeneric|EnumerateNonGeneric|RetainGenericEnumerator|UnchangedIndexOf)\(Profile: ([A-Za-z0-9]+)\)$/);
  assert.ok(match, benchmark.FullName);
  const [, method, profile] = match;
  assert.equal(benchmark.Method, method);
  assert.equal(benchmark.Parameters, 'Profile=' + profile);
  for (const setting of ['OutlierMode=DontRemove', 'PowerPlanMode=00000000-0000-0000-0000-000000000000',
    'Toolchain=SettingsPreservingEmitToolchain', 'IterationCount=8', 'IterationTime=100.0000 ms', 'UnrollFactor=1', 'WarmupCount=3']) {
    assert.ok(benchmark.DisplayInfo.includes(setting));
  }
  const native = nativeByDisplay.get(benchmark.DisplayInfo);
  assert.ok(native);
  const actual = [...native.matchAll(/^WorkloadActual\s+(\d+): (\d+) op, ([\d.]+) ns,/gm)];
  const results = [...native.matchAll(/^WorkloadResult\s+(\d+): (\d+) op, ([\d.]+) ns,/gm)];
  const overhead = [...native.matchAll(/^OverheadActual\s+\d+: (\d+) op, ([\d.]+) ns,/gm)];
  const gc = [...native.matchAll(/^GC:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/gm)];
  assert.equal(actual.length, 8);
  assert.equal(results.length, 8);
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
  const average = mean(values);
  const deviation = Math.sqrt(variance(values));
  for (const [field, value] of Object.entries({ Mean: average, Median: median(values), StandardDeviation: deviation,
    Variance: variance(values), StandardError: deviation / Math.sqrt(8), Min: Math.min(...values), Max: Math.max(...values) })) {
    close(benchmark.Statistics[field], value);
  }
  const rawGc = gc[0].slice(1).map(Number);
  assert.equal(benchmark.Memory.TotalOperations, rawGc[4]);
  assert.deepEqual([benchmark.Memory.Gen0Collections, benchmark.Memory.Gen1Collections, benchmark.Memory.Gen2Collections], rawGc.slice(0, 3));
  const quotient = rawGc[3] / rawGc[4];
  const integral = Math.floor(quotient);
  const rounded = quotient - integral === 0.5 ? integral + integral % 2 : Math.round(quotient);
  assert.equal(benchmark.Memory.BytesAllocatedPerOperation, rounded);
  const firstHalf = mean(values.slice(0, 4));
  const secondHalf = mean(values.slice(4));
  const slope = values.reduce((sum, value, index) => sum + (index - 3.5) * (value - average), 0) / 42;
  rows.push({
    method, profile, meanNs: average, medianNs: median(values), standardDeviationNs: deviation,
    cvPercent: average > 0 ? 100 * deviation / average : null, allocatedBytesPerOperation: rounded,
    actualSubResolutionMean: average === 0, firstHalfMeanNs: firstHalf, secondHalfMeanNs: secondHalf,
    secondHalfLessTimePercent: firstHalf > 0 ? 100 * (1 - secondHalf / firstHalf) : null,
    fittedEndToEndTrendPercent: average > 0 ? 100 * slope * 7 / average : null,
    actualOverheadSamples: overhead.length, actualMedianOverheadNsPerOperation: correction,
    rawGc, rawResultNsPerOperation: values
  });
}
assert.deepEqual(rows.map(item => item.method + ':' + item.profile).sort(),
  plan.benchmarkMethods.flatMap(method => plan.profileKeys.map(profile => method + ':' + profile)).sort());
const xmlAudits = [];
for (const item of seal.audits) {
  assert.equal(sha(located(item.auditPath)), item.auditSha256);
  assert.equal(sha(located(item.trxPath)), item.trxSha256);
  const previous = read(item.auditPath);
  const parsed = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', located('F122-audit-trx.ps1'),
    '-TrxPath', located(item.trxPath), '-ExpectedRows', String(item.actualRows),
    '-ExpectedFocusedRows', String(item.actualFocusedRows)], { windowsHide: true, encoding: 'utf8' });
  assert.equal(parsed.status, 0, parsed.stderr || parsed.stdout);
  const actual = JSON.parse(parsed.stdout.replace(/^\uFEFF/, ''));
  assert.equal(actual.actualPassed, item.actualRows);
  assert.equal(actual.actualFocusedRows, item.actualFocusedRows);
  assert.deepEqual(actual.actualRows, previous.rows);
  xmlAudits.push({ label: item.label, actualRows: actual.actualPassed, actualFocusedRows: actual.actualFocusedRows, actualXmlParsed: true });
}
for (const label of fs.readdirSync(located('validation'))) {
  const result = read('validation/' + label + '/result.json');
  assert.equal(result.exitCode, 0);
  assert.equal(result.protectedPinUnchanged, true);
  for (const [filename, property] of [['command.ps1', 'actualCommandSha256'], ['stdout.txt', 'stdoutSha256'], ['stderr.txt', 'stderrSha256']]) {
    assert.equal(sha(located('validation/' + label + '/' + filename)), result[property]);
  }
}
const additional = {};
if (!measurementOnly) {
  const decision = read('decision.json');
  assert.equal(decision.disposition, 'rejected');
  assert.equal(decision.actualShippingSourceChanged, false);
  assert.equal(decision.actualCandidateSelected, false);
  assert.equal(decision.actualSourceComparisons, 0);
  const reconstruction = 'reconstruction-original-and-default-001';
  const copy = read(reconstruction + '/project-copy.json');
  assert.deepEqual(copy, harness);
  for (const item of copy) assert.equal(sha(located(reconstruction + '/project/' + item.path)), item.sha256);
  const verified = read(reconstruction + '/verified-reproduction.json');
  assert.equal(verified.actualByteExactProjectFiles, 8);
  assert.equal(verified.actualFreshProjectRestoredAndRebuilt, true);
  assert.equal(verified.actualAdditionalTimingSamples, 0);
  assert.equal(verified.actualClosedBudgetSha256, sha(located('diagnostic-budget.json')));
  for (const [variant, suffix] of [['Original', 'original'], ['Default', 'current-default']]) {
    const closure = read(reconstruction + '/closure-' + suffix + '.json');
    const before = byPath(closures[variant]);
    const after = byPath(closure);
    assert.deepEqual([...before.keys()], [...after.keys()]);
    assert.deepEqual([...before.keys()].filter(name => before.get(name).sha256 !== after.get(name).sha256),
      ['AutoPerf.Benchmarks.dll', 'AutoPerf.Benchmarks.pdb']);
    const folder = reconstruction + '/' + variant + '/states';
    verifyCharacterization(folder);
    verifyExecution(folder, variant, closure, 'characterize');
  }
  for (const label of ['Restore', 'Build', 'Original-Characterize', 'Default-Characterize']) {
    const command = read(reconstruction + '/' + label + '/command.json');
    assert.equal(command.actualExitCode, 0);
    assert.equal(command.actualTimingAuthorized, false);
    assert.equal(command.arguments.includes('measure'), false);
    assert.equal(sha(located(reconstruction + '/' + label + '/command.ps1')), command.actualCommandSha256);
    assert.equal(sha(located(reconstruction + '/' + label + '/stdout.txt')), command.actualStdoutSha256);
    assert.equal(sha(located(reconstruction + '/' + label + '/stderr.txt')), command.actualStderrSha256);
  }
  Object.assign(additional, { actualDisposition: decision.disposition, actualIndependentlyRebuiltProjectFiles: 8,
    actualAdditionalReconstructionTimingSamples: 0 });
}
if (flags.includes('--live-images')) {
  for (const [variant, suffix] of [['Original', 'original'], ['Default', 'current-default']]) {
    for (const item of closures[variant].files) {
      assert.equal(sha(located('consumer-' + suffix + '/' + item.path)), item.sha256);
    }
  }
}
if (flags.includes('--require-seal')) {
  const manifest = read('capsule-file-hashes.json');
  const all = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    assert.equal(item.isSymbolicLink(), false);
    const filename = path.join(directory, item.name);
    return item.isDirectory() ? all(filename) : [path.relative(root, filename).replaceAll('\\', '/')];
  });
  assert.deepEqual(all(root).filter(name => !['capsule-file-hashes.json', 'publication.json'].includes(name)).sort(),
    manifest.files.map(item => item.path).sort());
  for (const item of manifest.files) {
    assert.equal(sha(located(item.path)), item.sha256);
    assert.equal(fs.statSync(located(item.path)).size, item.bytes);
  }
}
const summary = {
  candidate: 'F122', actualTimingAuthorizationsConsumed: 1, actualOriginalOnlyProfilesCompleted: 1,
  actualSourceComparisons: 0, actualRetainedSamples: 256, actualTimedCases: 32,
  actualShippingSourceChanged: false, actualCandidateSelected: false,
  actualConcretePatternProductionFitEstablished: false,
  actualRuntimeRecordsChecked: runtimeRecords, actualPerBenchmarkSettingsRecordsChecked: settingsRecords,
  actualParsedIndividualTestRows: xmlAudits.reduce((sum, item) => sum + item.actualRows, 0),
  actualXmlAudits: xmlAudits, actualExpectedSettings: expectedSettings,
  actualBoundedCallerCohortModules: 14, actualBoundedCallerIlBodies: 9771,
  actualOtherConcreteGetEnumeratorOperandsOriginalAndDefault: [0, 0],
  actualMaximumObservedCaseCvPercent: Math.max(...rows.map(item => item.cvPercent ?? 0)),
  actualSubResolutionCases: rows.filter(item => item.actualSubResolutionMean).map(item => item.method + ':' + item.profile),
  actualNotCompleteCompilerOrCallerProvenance: true, ...additional, rows
};
if (flags.includes('--write-summary')) {
  const filename = located(measurementOnly ? 'measurement-audit.json' : 'audit-summary.json');
  fs.writeFileSync(filename, JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify({ ...summary, actualXmlAudits: summary.actualXmlAudits.length, rows: summary.rows.length }, null, 2));
