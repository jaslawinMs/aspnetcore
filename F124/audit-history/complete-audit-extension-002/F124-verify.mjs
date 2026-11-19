import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] ?? path.dirname(fileURLToPath(import.meta.url)));
const flags = process.argv.slice(3);
const openBudget = flags.includes('--open-budget');
const preflight = flags.includes('--preflight');
assert.ok(!preflight || openBudget);
const located = name => path.join(root, ...name.split(/[\\/]/));
const read = name => JSON.parse(fs.readFileSync(located(name), 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2;
};
const variance = values => values.reduce((sum, value) => sum + (value - mean(values)) ** 2, 0) / (values.length - 1);
const close = (actual, expected) => assert.ok(
  Math.abs(actual - expected) <= Math.max(1e-6, Math.abs(expected) * 1e-11), `${actual} != ${expected}`);
function records(folder, kind) {
  return fs.readdirSync(located(folder)).sort().filter(file => file.endsWith('-' + kind + '.json'))
    .map(file => read(folder + '/' + file));
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
assert.equal(plan.candidate, 'F124');
assert.equal(plan.primaryMethod, 'Predicate');
assert.equal(plan.primaryProfile, 'MinimalProgram');
assert.equal(plan.unchangedControlMethod, 'UnchangedGetLocation');
assert.equal(plan.ordinaryGuardProfile, 'EarlyGuard');
assert.equal(budget.maximum, 3);
assert.ok(budget.authorized.length >= (preflight ? 0 : 1) && budget.authorized.length <= 3);
if (preflight) assert.equal(budget.authorized.length, 0);
assert.equal(budget.permanentlyClosed, !openBudget);
assert.ok(budget.authorized.every(item => ['completed', 'failed'].includes(item.state)));
if (!openBudget) assert.equal(sha(located('diagnostic-budget.json')), read('permanent-budget-close.json').closedBudgetSha256);
assert.equal(sha(located('acceptance-plan.json')), seal.acceptancePlanSha256);
assert.equal(sha(located('baseline-validation.json')), seal.baselineValidationSha256);
assert.equal(sha(located('profile-definitions.json')), seal.profileDefinitionsSha256);
assert.equal(seal.actualSemanticallyIdenticalObservedBoundaryAcrossAllVariants, true);
assert.equal(seal.actualParsedPassingXmlExecutions, 63);
assert.equal(read('baseline-validation.json').actualShippingEditsAtSeal, 0);
assert.deepEqual(profiles.map(item => item.key), plan.profileKeys);
const keys = [...plan.profileKeys].sort();
assert.equal(new Set(keys).size, 4);
const methods = ['Predicate', 'AnalyzeCompilation', 'UnchangedGetLocation'];
assert.deepEqual(plan.timedMethods, methods);
const harness = read('harness-source-hashes-002.json');
assert.equal(harness.length, 8);
for (const item of harness) {
  assert.equal(sha(located('harness/' + item.path)), item.sha256);
  assert.equal(fs.statSync(located('harness/' + item.path)).size, item.bytes);
}
const owner = 'Microsoft.AspNetCore.App.Analyzers';
const ownerSource = 'src/Framework/AspNetCoreAnalyzers/src/Analyzers/WebApplicationBuilder/PublicPartialProgramClassAnalyzer.cs';
const testSource = 'src/Framework/AspNetCoreAnalyzers/test/WebApplicationBuilder/PublicPartialProgramClassTest.cs';
const inputs = {};
const closures = {};
const byPath = closure => new Map(closure.files.map(item => [item.path, item]));
const suffixOf = variant => (variant === 'Default' ? 'current-default' : variant.toLowerCase()) + '-002';
for (const variant of ['Original', 'Candidate', 'Default']) {
  const suffix = suffixOf(variant);
  inputs[variant] = read('source-inputs-' + suffix + '.json');
  closures[variant] = read('closure-' + suffix + '.json');
  assert.equal(inputs[variant].sourceFiles.length, 9);
  assert.equal(inputs[variant].sourceFiles.filter(item => item.pdbDocumentRequired).length, 2);
  assert.equal(closures[variant].files.length, 237);
  assert.equal(byPath(closures[variant]).size, 237);
  for (const item of inputs[variant].sourceFiles) {
    assert.equal(sha(located('source-files-' + suffix + '/' + item.path)), item.sha256);
  }
  if (flags.includes('--live-images')) {
    for (const item of closures[variant].files) {
      assert.equal(sha(located('consumer-' + suffix + '/' + item.path)), item.sha256);
    }
  }
}
assert.deepEqual(inputs.Candidate.sourceFiles.filter(item =>
  item.sha256 !== inputs.Original.sourceFiles.find(old => old.path === item.path).sha256).map(item => item.path), [ownerSource]);
for (const item of inputs.Default.sourceFiles.filter(item => item.path !== testSource)) {
  const text = role => fs.readFileSync(located('source-files-' + role + '-002/' + item.path), 'utf8').replaceAll('\r\n', '\n');
  assert.equal(text('current-default'), text('original'));
}
const beforeSource = fs.readFileSync(located('source-files-original-002/' + ownerSource));
const afterSource = fs.readFileSync(located('source-files-candidate-002/' + ownerSource));
const beforeExpression = Buffer.from('parentNode.DescendantNodes().Count() > 1');
const afterExpression = Buffer.from('parentNode.DescendantNodes().Skip(1).Any()');
const seam = beforeSource.indexOf(beforeExpression);
assert.ok(seam >= 0);
assert.equal(beforeSource.indexOf(beforeExpression, seam + beforeExpression.length), -1);
assert.deepEqual(afterSource, Buffer.concat([beforeSource.subarray(0, seam), afterExpression,
  beforeSource.subarray(seam + beforeExpression.length)]));
assert.equal(read('candidate-seam-verification.json').actualEveryOtherSourceBytePreserved, true);
const originalFiles = byPath(closures.Original);
const candidateFiles = byPath(closures.Candidate);
assert.deepEqual([...originalFiles.keys()], [...candidateFiles.keys()]);
assert.deepEqual([...originalFiles.keys()].filter(file => originalFiles.get(file).sha256 !== candidateFiles.get(file).sha256).sort(),
  [owner + '.dll', owner + '.pdb'].sort());
const expectedSettings = one('original-characterization-002/states', 'runtime-characterize-before').settings;
assert.deepEqual(expectedSettings, { processPriority: 'Normal', threadPriority: 'Normal', affinity: 65535 });
let runtimeRecords = 0;
let settingsRecords = 0;
function verifyExecution(folder, variant, closure, mode, expectedProof) {
  const files = byPath(closure);
  assert.equal(one(folder, 'verified-image').actualEntries, files.size);
  assert.equal(one(folder, 'verified-image').actualEveryEntryVerified, true);
  const proof = one(folder, 'selected-source-pdb-associations');
  assert.equal(proof.actualSelectedInputs, 9);
  assert.equal(proof.actualSelectedDocuments, 2);
  assert.equal(proof.actualSourceBuiltOwners, 1);
  assert.equal(proof.actualOwner, owner);
  assert.equal(proof.actualPeAndPdbMatch, true);
  assert.equal(proof.actualOwnerSha256, files.get(owner + '.dll').sha256);
  assert.equal(proof.actualPdbSha256, files.get(owner + '.pdb').sha256);
  assert.equal(proof.actualCompleteCompilerProvenanceClaimed, false);
  assert.equal(proof.proofs.length, 2);
  for (const item of proof.proofs) {
    const source = inputs[variant].sourceFiles.find(input => input.path === item.source);
    assert.ok(source && source.pdbDocumentRequired);
    assert.equal(item.sha256, source.sha256);
  }
  if (expectedProof) assert.deepEqual(proof, expectedProof);
  const discovery = one(folder, 'benchmarkdotnet-discovery-preflight');
  assert.equal(discovery.actualDiscoveredCases, 12);
  assert.equal(discovery.actualTimingRunByThisPreflight, false);
  assert.equal(discovery.actualVariant, variant);
  const runtimes = ['before', 'after'].map(phase => one(folder, 'runtime-' + mode + '-' + phase));
  assert.equal(runtimes[0].pid, runtimes[1].pid);
  for (const runtime of runtimes) {
    assert.equal(runtime.framework, '.NET 12.0.0-alpha.1.26562.105');
    assert.deepEqual(runtime.settings, expectedSettings);
    const imageRoot = path.win32.dirname(runtime.assemblies.find(item => item.name === 'AutoPerf.Benchmarks').location);
    for (const name of ['AutoPerf.Benchmarks', owner]) {
      const assembly = runtime.assemblies.find(item => item.name === name);
      assert.ok(assembly);
      assert.equal(assembly.sha256, files.get(name + '.dll').sha256);
    }
    for (const assembly of runtime.assemblies.filter(item => item.location.startsWith(imageRoot + '\\'))) {
      const relative = path.win32.relative(imageRoot, assembly.location).replaceAll('\\', '/');
      assert.ok(files.has(relative), 'An actually loaded local assembly is absent: ' + relative);
      assert.equal(assembly.sha256, files.get(relative).sha256);
    }
    runtimeRecords++;
  }
  const prepared = records(folder, 'prepared-profile-contract');
  assert.deepEqual(prepared.map(item => item.profile).sort(), keys);
  for (const item of prepared) {
    const definition = profiles.find(profile => profile.key === item.profile);
    assert.equal(item.Source, definition.source);
    assert.equal(item.AdditionalSource, definition.additionalSource);
    assert.equal(item.actualSelectedClass, definition.selectedClass);
    assert.equal(item.actualCompilerErrors, 0);
    assert.equal(item.actualPredicateResult, definition.expectedPredicate);
    assert.equal(item.actualExpectedDiagnosticCount, definition.expectedDiagnosticCount);
    assert.equal(item.actualFreshSerialDriverRuns, 2);
    assert.equal(item.actualFreshConcurrentDriverRuns, 1);
    assert.equal(item.actualPredicateOwner, 'Microsoft.AspNetCore.Analyzers.PublicPartialProgramClassAnalyzer');
    assert.equal(item.actualPredicateMethod, 'IsPublicPartialClassProgram');
    assert.deepEqual(item.first, item.second);
    assert.deepEqual(item.first, item.concurrent);
    assert.equal(item.first.length, definition.expectedDiagnosticCount);
    for (const diagnostic of item.first) {
      assert.equal(diagnostic.id, 'ASP0027');
      assert.equal(diagnostic.severity, 'Info');
      assert.equal(diagnostic.file, item.FileName);
      assert.equal(diagnostic.length, 32);
    }
  }
  assert.equal(prepared.find(item => item.profile === 'MinimalProgram').actualDescendantCount, 38);
  assert.equal(prepared.find(item => item.profile === 'LoneDeclaration').actualDescendantCount, 1);
  return proof;
}
const proofs = {};
for (const role of seal.roles) {
  for (const item of role.stateHashes) assert.equal(sha(located(item.path)), item.sha256);
  const folder = role.label + '/states';
  proofs[role.variant] = verifyExecution(folder, role.variant, closures[role.variant], 'characterize');
  const extra = records(folder, 'additional-semantic-contract');
  assert.equal(extra.length, 6);
  assert.deepEqual(extra.map(item => item.profile).sort(),
    ['ExactlyTwoNodes', 'Generated', 'InNamespace', 'TriviaOnly', 'WithAttribute', 'WithMember'].sort());
  assert.equal(extra.find(item => item.profile === 'ExactlyTwoNodes').actualDescendantCount, 2);
  assert.equal(extra.find(item => item.profile === 'TriviaOnly').actualDescendantCount, 1);
  assert.equal(extra.find(item => item.profile === 'Generated').actualPredicateResult, true);
  assert.deepEqual(extra.find(item => item.profile === 'Generated').first, []);
  const projection = extra.map(({ actualPredicateMetadataToken, actualPredicateOwnerMvid, ...item }) => item)
    .sort((a, b) => a.profile.localeCompare(b.profile, 'en'));
  assert.deepEqual(projection, seal.roles[0].actualAdditionalSemanticProjection);
  const methodsRun = records(folder, 'actual-benchmark-method-contract');
  assert.equal(methodsRun.length, 4);
  assert.ok(methodsRun.every(item => item.actualFreshDriverRan
    && JSON.stringify(item.actualMethodsExecuted) === JSON.stringify(methods)));
}
const xmlAudits = [];
for (const audit of seal.audits) {
  assert.equal(sha(located(audit.auditPath)), audit.auditSha256);
  assert.equal(sha(located(audit.trxPath)), audit.trxSha256);
  const parser = located('F124-audit-trx.ps1');
  const result = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', parser,
    '-TrxPath', located(audit.trxPath), '-ExpectedRows', String(audit.actualRows),
    '-ExpectedFocusedRows', String(audit.actualFocusedRows)], { encoding: 'utf8', windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const rows = JSON.parse(result.stdout.replace(/^\uFEFF/, ''));
  assert.equal(rows.actualPassed, audit.actualRows);
  xmlAudits.push({ label: audit.label, actualRows: rows.actualPassed,
    actualFocusedRows: rows.actualFocusedRows, actualXmlParsed: true });
}
assert.equal(xmlAudits.reduce((sum, item) => sum + item.actualRows, 0), 63);
const preparation = read('preparation-correction.json');
assert.equal(preparation.actualInvalidNewFixture.actualFailedXmlPreserved, true);
assert.equal(sha(located('validation/original-preservation-tests-001/test-results/results.trx')),
  preparation.actualInvalidNewFixture.actualFailedTrxSha256);
assert.equal(sha(located('preparation-history/original-test-source-before-invalid-modifier-fixture-correction.cs')),
  preparation.actualInvalidNewFixture.actualFailedTestSourceSha256);
assert.equal(preparation.actualMissingCompilerReferenceMetadata.actualOldImageManifestsAndStatesNotOverwritten, true);
assert.equal(read('closure-original.json').files.length, 217);
assert.equal(sha(located('closure-original.json')), preparation.actualMissingCompilerReferenceMetadata.actualOldClosureSha256);
for (const input of read('harness-source-hashes.json')) {
  assert.equal(sha(located('preparation-history/missing-reference-metadata-001/' + input.path)), input.sha256);
}
const failedPreparationStates = 'original-characterization-001/states';
assert.equal(fs.readdirSync(located(failedPreparationStates)).length, 5);
assert.equal(records(failedPreparationStates, 'prepared-profile-contract').length, 0);
assert.equal(records(failedPreparationStates, 'runtime-characterize-after').length, 0);
assert.equal(one(failedPreparationStates, 'verified-image').actualEntries, 217);
const partialPreparationRuntime = one(failedPreparationStates, 'runtime-characterize-before');
assert.deepEqual(partialPreparationRuntime.settings, expectedSettings);
const oldFiles = byPath(read('closure-original.json'));
for (const name of ['AutoPerf.Benchmarks', owner]) {
  const assembly = partialPreparationRuntime.assemblies.find(item => item.name === name);
  assert.ok(assembly);
  assert.equal(assembly.sha256, oldFiles.get(name + '.dll').sha256);
}
assert.equal(read('validation/candidate-format-whitespace-002/result.json').exitCode, 0);
for (const label of ['default-analyzer-build-001', 'default-analyzer-build-002', 'default-analyzer-build-003']) {
  assert.equal(read('validation/' + label + '/result.json').exitCode, 1);
}
assert.equal(read('validation/default-analyzer-build-004/result.json').exitCode, 0);
const defaultBuild = read('validation/default-analyzer-build-004/command.json');
for (const flag of ['-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false']) {
  assert.ok(defaultBuild.arguments.includes(flag));
}
for (const [source, metadata] of [
  ['BenchmarkDotNet-0.13.0-GcStats.cs', 'BenchmarkDotNet-0.13.0-GcStats-metadata.json'],
  ['BenchmarkDotNet-0.13.0-LICENSE.md', 'BenchmarkDotNet-0.13.0-license-metadata.json']
]) assert.equal(sha(located(source)), read(metadata).sha256);
const allocationSource = fs.readFileSync(located('BenchmarkDotNet-0.13.0-GcStats.cs'), 'utf8');
assert.ok(allocationSource.includes('(long) Math.Round(') && allocationSource.includes('MidpointRounding.ToEven'));
if (preflight) {
  console.log(JSON.stringify({ candidate: 'F124', actualIndependentPremeasurementAuditPassed: true,
    actualAcceptedVariants: seal.roles.length, actualParsedIndividualTestRows: 63,
    actualSuccessfulRuntimeRecordsChecked: runtimeRecords, actualPartialPreparationRuntimeRecordsChecked: 1,
    actualImageEntriesPerAcceptedVariant: 237, actualSourceInputsPerAcceptedVariant: 9,
    actualSelectedOwnerPdbDocumentsPerVariant: 2, actualByteExactSingleExpressionReplacement: true,
    actualTimingAuthorizationsConsumed: 0 }, null, 2));
  process.exit(0);
}
const rows = [];
for (const historic of budget.authorized) {
  const attempt = historic.attempt;
  const folder = 'comparison-' + String(attempt).padStart(3, '0');
  const authorization = read(folder + '/authorization.json');
  assert.deepEqual(historic.order, plan.comparisonOrders[attempt - 1]);
  assert.equal(authorization.actualConsumedBeforeProcessLaunch, attempt);
  assert.equal(authorization.actualAcceptancePlanSha256, seal.acceptancePlanSha256);
  assert.equal(historic.actualDriverSha256, sha(located('F124-compare.mjs')));
  for (const variant of ['Original', 'Candidate']) {
    assert.equal(authorization[variant].closureSha256, sha(located('closure-' + suffixOf(variant) + '.json')));
    assert.equal(authorization[variant].sourceInputsSha256, sha(located('source-inputs-' + suffixOf(variant) + '.json')));
  }
  assert.equal(historic.state, 'completed', 'Explicitly audit any failed/partial prefix separately; never manufacture a pair.');
  assert.equal(historic.actualTimingStarted, true);
  const receipt = read(folder + '/execution-receipt.json');
  assert.equal(receipt.actualCompletePairedSourceComparison, true);
  assert.equal(receipt.actualRetainedSamples, 192);
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
    assert.equal(completed.actualReports, 12);
    assert.equal(completed.actualAllSuccessful, true);
    assert.equal(completed.actualAttempt, attempt);
    assert.equal(completed.actualVariant, variant);
    for (const phase of ['before', 'after']) {
      const settings = records(stateFolder, 'settings-' + phase);
      assert.equal(settings.length, 12);
      for (const item of settings) assert.deepEqual(item, expectedSettings);
      settingsRecords += settings.length;
    }
    const setups = records(stateFolder, 'benchmark-setup');
    assert.equal(setups.length, 12);
    for (const key of keys) assert.equal(setups.filter(item => item.profile === key).length, 3);
    assert.ok(setups.every(item => JSON.stringify(item.actualSettings) === JSON.stringify(expectedSettings)));
    settingsRecords += setups.length;
    const reportFile = variantFolder + '/reports/results/AutoPerf.AnalyzerBenchmarks-report-full.json';
    assert.equal(sha(located(reportFile)), historic.completed.find(item => item.variant === variant).fullJsonSha256);
    const report = read(reportFile);
    assert.equal(report.Benchmarks.length, 12);
    const blocks = fs.readFileSync(located(variantFolder + '/stdout.txt'), 'utf8').split(/^\/\/ Benchmark: /m).slice(1);
    assert.equal(blocks.length, 12);
    const nativeByDisplay = new Map(blocks.map(block => [block.split(/\r?\n/, 1)[0].trim(), block]));
    assert.equal(nativeByDisplay.size, 12);
    const actualCases = [];
    for (const benchmark of report.Benchmarks) {
      const match = benchmark.FullName.match(/^AutoPerf\.AnalyzerBenchmarks\.(Predicate|AnalyzeCompilation|UnchangedGetLocation)\(Profile: "([A-Za-z0-9]+)"\)$/);
      assert.ok(match, benchmark.FullName);
      const [, method, profile] = match;
      actualCases.push(method + ':' + profile);
      assert.equal(benchmark.Method, method);
      assert.equal(benchmark.Parameters, 'Profile=' + profile);
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
        actualOverheadSamples: overhead.length, actualMedianOverheadNsPerOperation: correction,
        rawGc, rawResultNsPerOperation: values });
    }
    assert.deepEqual(actualCases.sort(), methods.flatMap(method => keys.map(profile => method + ':' + profile)).sort());
  }
}
const attempts = budget.completed.map(item => item.attempt);
assert.equal(rows.length, attempts.length * 24);
const paired = attempts.flatMap(attempt => methods.flatMap(method => keys.map(profile => {
  const original = rows.find(row => row.attempt === attempt && row.variant === 'Original' && row.profile === profile && row.method === method);
  const candidate = rows.find(row => row.attempt === attempt && row.variant === 'Candidate' && row.profile === profile && row.method === method);
  return { attempt, method, profile, lessTimePercent: 100 * (1 - candidate.meanNs / original.meanNs),
    actualManagedBytesSaved: original.allocatedBytesPerOperation - candidate.allocatedBytesPerOperation, original, candidate };
})));
const selected = (method, profile) => paired.filter(item => item.method === method && item.profile === profile);
const primary = selected(plan.primaryMethod, plan.primaryProfile);
const primaryControl = selected(plan.unchangedControlMethod, plan.primaryProfile);
const ordinary = selected(plan.primaryMethod, plan.ordinaryGuardProfile);
const ordinaryControl = selected(plan.unchangedControlMethod, plan.ordinaryGuardProfile);
const medianPrimary = median(primary.map(item => item.lessTimePercent));
const numericalGate = medianPrimary >= 10 && primary.filter(item => item.lessTimePercent > 0).length >= 2;
const crediblePairs = primary.filter(item =>
  item.lessTimePercent > Math.abs(primaryControl.find(control => control.attempt === item.attempt).lessTimePercent)).map(item => item.attempt);
const allocationPairs = primary.filter(item => item.actualManagedBytesSaved >= 32
  && [primaryControl, ordinary, ordinaryControl].every(control =>
    item.actualManagedBytesSaved > control.find(row => row.attempt === item.attempt).actualManagedBytesSaved)).map(item => item.attempt);
const ordinaryMedianMoreTime = -median(ordinary.map(item => item.lessTimePercent));
const adverseOrdinaryPairs = ordinary.filter(item => item.lessTimePercent < 0
  && -item.lessTimePercent > Math.abs(ordinaryControl.find(control => control.attempt === item.attempt).lessTimePercent)).map(item => item.attempt);
const ordinaryRejects = ordinaryMedianMoreTime >= 10
  && ordinary.filter(item => item.lessTimePercent < 0).length >= 2 && adverseOrdinaryPairs.length >= 2;
const qualified = ((numericalGate && crediblePairs.length >= 2) || allocationPairs.length >= 2) && !ordinaryRejects;
const profileSummaries = methods.flatMap(method => keys.map(profile => {
  const cases = selected(method, profile);
  return { method, profile, medianLessTimePercent: median(cases.map(item => item.lessTimePercent)),
    eachLessTimePercent: cases.map(item => item.lessTimePercent),
    originalMeanNs: cases.map(item => item.original.meanNs), candidateMeanNs: cases.map(item => item.candidate.meanNs),
    originalAllocatedBytes: cases.map(item => item.original.allocatedBytesPerOperation),
    candidateAllocatedBytes: cases.map(item => item.candidate.allocatedBytesPerOperation) };
}));
const audit = {
  candidate: 'F124', actualAuthorizationsConsumed: budget.authorized.length,
  actualCompletedComparisonNumbers: attempts, actualRetainedSamples: rows.length * 8,
  actualMedianPrimaryLessTimePercent: medianPrimary, actualNumericalPrimaryTimingGateMet: numericalGate,
  actualPrimaryControlCrediblePairs: crediblePairs, actualPrimaryAllocationDistinctPairs: allocationPairs,
  actualPrimaryAllocationGateMet: allocationPairs.length >= 2,
  actualOrdinaryMedianMoreTimePercent: ordinaryMedianMoreTime, actualAdverseOrdinaryPairs: adverseOrdinaryPairs,
  actualOrdinaryGuardRejectsQualification: ordinaryRejects,
  actualPrimaryQualificationMet: qualified,
  actualProvisionalDisposition: openBudget ? 'measurement-in-progress' : qualified ? 'qualified-trade-off' : 'no-gain',
  actualFullDriverNotPrimaryAndNoWholeBuildOrIdeClaim: true,
  actualRuntimeRecordsChecked: runtimeRecords, actualPerBenchmarkSettingsRecordsChecked: settingsRecords,
  actualPartialPreparationRuntimeRecordsChecked: 1,
  actualParsedIndividualTestRows: xmlAudits.reduce((total, item) => total + item.actualRows, 0),
  actualXmlAudits: xmlAudits, primary, ordinary, profileSummaries, rows, paired
};
if (flags.includes('--require-seal')) {
  const sealFile = read('capsule-file-hashes.json');
  for (const item of sealFile.files) {
    assert.equal(sha(located(item.path)), item.sha256);
    assert.equal(fs.statSync(located(item.path)).size, item.bytes);
  }
}
const outputIndex = flags.indexOf('--output');
if (outputIndex >= 0) {
  assert.equal(flags.includes('--require-seal'), false);
  const output = path.resolve(flags[outputIndex + 1]);
  assert.equal(path.dirname(output).toUpperCase(), root.toUpperCase());
  fs.writeFileSync(output, JSON.stringify(audit, null, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify({
  candidate: 'F124', actualAuthorizationsConsumed: budget.authorized.length,
  actualCompletedComparisonNumbers: attempts, actualRetainedSamples: rows.length * 8,
  actualMedianPrimaryLessTimePercent: medianPrimary, actualPrimaryQualificationMet: qualified,
  actualOrdinaryGuardRejectsQualification: ordinaryRejects,
  actualRuntimeRecordsChecked: runtimeRecords, actualPerBenchmarkSettingsRecordsChecked: settingsRecords,
  actualPartialPreparationRuntimeRecordsChecked: 1,
  actualParsedIndividualTestRows: 63, actualProvisionalDisposition: audit.actualProvisionalDisposition
}, null, 2));
