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
const close = (actual, expected) => assert.ok(
  Math.abs(actual - expected) <= Math.max(1e-6, Math.abs(expected) * 1e-11), `${actual} != ${expected}`);
function evidence(folder, kind) {
  const names = fs.readdirSync(located(folder)).filter(name => name.endsWith('-' + kind + '.json'));
  assert.equal(names.length, 1, `${folder}:${kind}`);
  return read(folder + '/' + names[0]);
}
const owner = 'Microsoft.AspNetCore.Mvc.Razor';
const ownerSource = 'src\\Mvc\\Mvc.Razor\\src\\RazorPage.cs';
const plan = read('acceptance-plan.json');
const budget = read('diagnostic-budget.json');
assert.equal(budget.closed, true);
assert.equal(budget.maximumSourceComparisons, 3);
assert.equal(budget.consumed, 3);
assert.equal(budget.completed, 3);
assert.equal(budget.standaloneOriginalTimingAllowed, false);
assert.equal(budget.authorizations.length, 3);
assert.equal(sha(located('acceptance-plan.json')), budget.acceptancePlanSha256);
assert.equal(sha(located('diagnostic-budget.json')), read('permanent-budget-close.json').closedBudgetSha256);
const orders = [['Original', 'Candidate'], ['Candidate', 'Original'], ['Original', 'Candidate']];
assert.deepEqual(read('comparison-order-declaration.json').orders, orders);
const profiles = plan.profiles.map(item => item.name);
const methods = plan.measuredBoundaries.map(item => item.method);
const keys = methods.flatMap(method => profiles.map(profile => method + ':' + profile)).sort();
assert.equal(keys.length, 12);
assert.equal(new Set(keys).size, 12);
assert.deepEqual(plan.primary.method, 'RegisterFreshPage');
assert.deepEqual(plan.primary.profile, 'Two');
const harness = read('harness-source-hashes.json');
assert.equal(harness.files.length, 13);
for (const file of harness.files) {
  assert.equal(sha(located('harness/' + file.path)), file.sha256);
  assert.equal(fs.statSync(located('harness/' + file.path)).size, file.bytes);
}
const generated = read('compiled-producer-source-hashes.json');
assert.equal(generated.actualSdkGeneratedCSharpFiles, 6);
assert.equal(generated.actualGeneratedSourceOnlyNotCompleteCompilerProvenance, true);
for (const file of generated.files) assert.equal(sha(located('compiled-producer-sources/' + file.path)), file.sha256);
const fixtures = read('compiled-fixture-inputs.json').fixtures;
assert.deepEqual(fixtures.map(item => item.profile), profiles);
for (const fixture of fixtures) assert.equal(sha(located('harness/' + fixture.path)), fixture.sha256);
const inputs = {};
const closures = {};
for (const variant of ['Original', 'Candidate', 'Default']) {
  const suffix = variant === 'Default' ? 'current-default' : variant.toLowerCase();
  inputs[variant] = read('source-inputs-' + suffix + '.json');
  closures[variant] = read('consumer-' + suffix + '-closure.json');
  assert.equal(inputs[variant].sourceFiles.length, 7);
  assert.equal(inputs[variant].sourceFiles.filter(item => item.pdbDocumentRequired).length, 3);
  assert.equal(closures[variant].files.length, 264);
  assert.equal(new Set(closures[variant].files.map(item => item.path)).size, 264);
  for (const file of inputs[variant].sourceFiles) {
    const snapshot = located('source-files-' + suffix + '/' + file.path);
    assert.equal(sha(snapshot), file.sha256);
    assert.equal(fs.statSync(snapshot).size, file.bytes);
  }
}
assert.deepEqual(inputs.Candidate.sourceFiles.filter(file =>
  file.sha256 !== inputs.Original.sourceFiles.find(before => before.path === file.path).sha256).map(file => file.path), [ownerSource]);
const byPath = closure => new Map(closure.files.map(file => [file.path, file]));
const originalFiles = byPath(closures.Original);
const candidateFiles = byPath(closures.Candidate);
assert.deepEqual([...originalFiles.keys()].sort(), [...candidateFiles.keys()].sort());
assert.deepEqual([...originalFiles.keys()].filter(file => originalFiles.get(file).sha256 !== candidateFiles.get(file).sha256).sort(),
  [owner + '.dll', owner + '.pdb'].sort());
const expectedSettings = evidence('characterization-original-001/states', 'runtime-characterize-before').settings;
assert.deepEqual(expectedSettings, { processPriority: 'Normal', threadPriority: 'Normal', affinity: 65535 });
let runtimeRecords = 0;
let settingsRecords = 0;
function verifyExecution(folder, variant, closure, mode, expectedProof) {
  const image = evidence(folder, 'verified-image');
  const proof = evidence(folder, 'selected-source-pdb-associations');
  const files = byPath(closure);
  assert.equal(image.actualEveryEntryVerified, true);
  assert.equal(image.actualEntries, files.size);
  assert.equal(proof.actualSelectedInputs, 7);
  assert.equal(proof.actualSelectedDocuments, 3);
  assert.equal(proof.actualCompleteCompilerProvenanceClaimed, false);
  assert.equal(proof.actualPeAndPdbMatch, true);
  assert.equal(proof.actualOwnerSha256, files.get(owner + '.dll').sha256);
  assert.equal(proof.actualPdbSha256, files.get(owner + '.pdb').sha256);
  assert.equal(proof.proofs.length, 3);
  for (const item of proof.proofs) {
    assert.equal(item.sha256, inputs[variant].sourceFiles.find(file => file.path === item.source).sha256);
  }
  if (expectedProof) assert.deepEqual(proof, expectedProof);
  const discovery = evidence(folder, 'benchmarkdotnet-discovery-preflight');
  assert.equal(discovery.actualDiscoveredCases, 12);
  assert.equal(discovery.actualTimingRunByThisPreflight, false);
  assert.equal(discovery.actualVariant, variant);
  const runtimes = ['before', 'after'].map(phase => evidence(folder, `runtime-${mode}-${phase}`));
  assert.equal(runtimes[0].pid, runtimes[1].pid);
  for (const runtime of runtimes) {
    assert.equal(runtime.framework, '.NET 12.0.0-alpha.1.26562.105');
    assert.deepEqual(runtime.settings, expectedSettings);
    const imageRoot = path.win32.dirname(runtime.assemblies.find(item => item.name === owner).location);
    for (const name of ['AutoPerf.Benchmarks', owner]) {
      assert.equal(runtime.assemblies.find(item => item.name === name).sha256, files.get(name + '.dll').sha256);
    }
    for (const assembly of runtime.assemblies) {
      if (assembly.location.startsWith(imageRoot + '\\')) {
        const relative = path.win32.relative(imageRoot, assembly.location).replaceAll('\\', '/');
        assert.ok(files.has(relative), `Loaded image entry missing from closure: ${relative}`);
        assert.equal(assembly.sha256, files.get(relative).sha256);
      }
    }
    runtimeRecords++;
  }
  return proof;
}
function characterize(folder) {
  const completed = evidence(folder, 'characterization-completed');
  const contracts = evidence(folder, 'public-contracts');
  const bcl = evidence(folder, 'adjacent-bcl-diagnostics');
  assert.equal(completed.actualContractCases, 9);
  assert.equal(completed.actualCompiledProducerProfiles, 6);
  assert.equal(completed.actualRegistrationAndFullViewBoundaries, 12);
  assert.equal(completed.actualTimingPerformed, false);
  assert.equal(contracts.actualCases, 9);
  assert.equal(contracts.actualPassed.length, 9);
  assert.equal(bcl.actualTimingPerformed, false);
  assert.equal(bcl.actualProductionRazorHashCountClaimed, false);
  assert.deepEqual(bcl.observations.map(item => item.actualHashCallsBeforeReadback), [1, 1, 1, 2, 2, 1]);
  const rows = fs.readdirSync(located(folder)).filter(name => name.endsWith('-compiled-producer-and-rendering.json'))
    .map(name => read(folder + '/' + name));
  assert.equal(rows.length, 6);
  const normalized = [];
  for (const fixture of fixtures) {
    const row = rows.find(item => item.profile === fixture.profile);
    assert.ok(row);
    assert.equal(row.actualExpectedCount, fixture.expectedCount);
    assert.deepEqual(row.actualNames, fixture.names);
    assert.equal(row.actualRegistrationOutput, fixture.expectedRegistrationOutput);
    assert.equal(row.actualOriginalDictionaryPreserved, true);
    assert.equal(row.actualCallbacks.length, fixture.expectedCount);
    assert.ok(row.actualCallbacks.every(callback => callback.declaringType === row.actualCompiledPage
      && callback.targetType === row.actualCompiledPage));
    assert.equal(row.actualRendering.Written, fixture.expectedFullViewHtml);
    assert.equal(row.actualRendering.Sections, fixture.expectedCount);
    assert.equal(row.actualRendering.ConsumedTokens, fixture.expectedCount);
    assert.equal(row.actualRendering.OriginalDictionaryTransferred, true);
    assert.equal(row.actualRendering.ContentMarkedForLayout, true);
    assert.equal(row.actualRendering.BufferScopeType, 'Microsoft.AspNetCore.Mvc.ViewFeatures.Buffers.MemoryPoolViewBufferScope');
    normalized.push({ ...row, actualCallbacks: row.actualCallbacks.map(callback =>
      ({ ...callback, assembly: '<byte-bound-common-harness>' })) });
  }
  return { contracts, bcl, rows: normalized };
}
assert.equal(read('validation/default-managed-razor-build-005/result.json').exitCode, 0);
const originalCharacterization = characterize('characterization-original-001/states');
const proofs = {};
for (const variant of ['Default', 'Original', 'Candidate']) {
  const suffix = variant === 'Default' ? 'current-default' : variant.toLowerCase();
  const folder = 'characterization-' + suffix + '-001/states';
  assert.deepEqual(characterize(folder), originalCharacterization);
  proofs[variant] = verifyExecution(folder, variant, closures[variant], 'characterize');
}
for (const [source, metadata] of [
  ['BenchmarkDotNet-0.13.0-GcStats.cs', 'BenchmarkDotNet-0.13.0-GcStats-metadata.json'],
  ['BenchmarkDotNet-0.13.0-LICENSE.md', 'BenchmarkDotNet-0.13.0-license-metadata.json']
]) assert.equal(sha(located(source)), read(metadata).sha256);
const allocationImplementation = fs.readFileSync(located('BenchmarkDotNet-0.13.0-GcStats.cs'), 'utf8');
assert.ok(allocationImplementation.includes('(long) Math.Round(')
  && allocationImplementation.includes('MidpointRounding.ToEven'));
const rows = [];
for (const attempt of [1, 2, 3]) {
  const folder = 'comparison-' + String(attempt).padStart(3, '0');
  const historic = budget.authorizations[attempt - 1];
  const authorization = read(folder + '/authorization.json');
  const receipt = read(folder + '/execution-receipt.json');
  assert.equal(historic.state, 'completed');
  assert.equal(historic.actualRetainedSamples, 192);
  assert.deepEqual(historic.order, orders[attempt - 1]);
  assert.equal(authorization.attempt, attempt);
  assert.equal(authorization.consumedBeforeLaunch, attempt);
  assert.deepEqual(authorization.order, historic.order);
  assert.equal(receipt.actualCompletePairedSourceComparison, true);
  assert.equal(receipt.actualRetainedSamples, 192);
  assert.deepEqual(receipt.completed, historic.completed);
  assert.equal(receipt.actualDriverSha256, sha(located('F043-compare.mjs')));
  for (const variant of historic.order) {
    const lower = variant.toLowerCase();
    const variantFolder = folder + '/' + variant;
    assert.equal(authorization[variant].closureSha256, sha(located('consumer-' + lower + '-closure.json')));
    assert.equal(authorization[variant].sourceInputsSha256, sha(located('source-inputs-' + lower + '.json')));
    const command = read(variantFolder + '/command.json');
    const result = read(variantFolder + '/result.json');
    assert.equal(result.exitCode, 0);
    assert.equal(result.launchError, null);
    assert.equal(command.actualProcessSettingsModifiedByDriver, false);
    assert.equal(command.arguments[1], 'measure');
    assert.equal(command.actualAttempt, attempt);
    assert.equal(command.actualVariant, variant);
    assert.equal(sha(located(variantFolder + '/stdout.txt')), result.stdoutSha256);
    assert.equal(sha(located(variantFolder + '/stderr.txt')), result.stderrSha256);
    const stateFolder = variantFolder + '/evidence';
    verifyExecution(stateFolder, variant, closures[variant], 'measure', proofs[variant]);
    const completed = evidence(stateFolder, 'completed');
    assert.equal(completed.actualReports, 12);
    assert.equal(completed.actualAllSuccessful, true);
    assert.equal(completed.actualAttempt, attempt);
    assert.equal(completed.actualVariant, variant);
    const settings = fs.readdirSync(located(stateFolder)).filter(file => /-settings-(before|after)\.json$/.test(file));
    assert.equal(settings.length, 24);
    for (const filename of settings) assert.deepEqual(read(stateFolder + '/' + filename), expectedSettings);
    settingsRecords += settings.length;
    const reportFile = variantFolder + '/reports/results/AutoPerf.SectionRegistrationBenchmarks-report-full.json';
    assert.equal(sha(located(reportFile)), historic.completed.find(item => item.variant === variant).fullJsonSha256);
    const raw = read(reportFile);
    assert.equal(raw.Benchmarks.length, 12);
    const blocks = fs.readFileSync(located(variantFolder + '/stdout.txt'), 'utf8').split(/^\/\/ Benchmark: /m).slice(1);
    assert.equal(blocks.length, 12);
    const nativeByDisplay = new Map(blocks.map(block => [block.split(/\r?\n/, 1)[0].trim(), block]));
    assert.equal(nativeByDisplay.size, 12);
    const actualKeys = [];
    for (const benchmark of raw.Benchmarks) {
      const identity = benchmark.FullName.match(/^AutoPerf\.SectionRegistrationBenchmarks\.(RegisterFreshPage|RenderFullView)\(Profile: "([^"]+)"\)$/);
      assert.ok(identity, benchmark.FullName);
      const method = identity[1];
      const profile = identity[2];
      actualKeys.push(method + ':' + profile);
      assert.equal(benchmark.Method, method);
      assert.ok(benchmark.DisplayInfo.includes('OutlierMode=DontRemove')
        && benchmark.DisplayInfo.includes('PowerPlanMode=00000000-0000-0000-0000-000000000000'));
      const native = nativeByDisplay.get(benchmark.DisplayInfo);
      assert.ok(native, 'Bind every full identity to its exact original native block.');
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
      assert.equal(benchmark.Statistics.OriginalValues.length, 8);
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
        close(Number(results[index][3]), Number(actual[index][3]) - correction * measurement.Operations);
        const value = measurement.Nanoseconds / measurement.Operations;
        close(value, benchmark.Statistics.OriginalValues[index]);
        return value;
      });
      const deviation = Math.sqrt(variance(values));
      for (const [field, value] of Object.entries({
        Mean: mean(values), Median: median(values), StandardDeviation: deviation,
        Variance: variance(values), StandardError: deviation / Math.sqrt(8), Min: Math.min(...values), Max: Math.max(...values)
      })) close(benchmark.Statistics[field], value);
      const rawGc = gc[0].slice(1).map(Number);
      const memory = benchmark.Memory;
      assert.equal(memory.TotalOperations, rawGc[4]);
      assert.deepEqual([memory.Gen0Collections, memory.Gen1Collections, memory.Gen2Collections], rawGc.slice(0, 3));
      const quotient = rawGc[3] / rawGc[4];
      const integral = Math.floor(quotient);
      const rounded = quotient - integral === 0.5 ? integral + integral % 2 : Math.round(quotient);
      assert.equal(memory.BytesAllocatedPerOperation, rounded);
      rows.push({ attempt, variant, method, profile, meanNs: mean(values), medianNs: median(values),
        standardDeviationNs: deviation, cvPercent: 100 * deviation / mean(values),
        allocatedBytesPerOperation: rounded, actualOverheadSamples: overhead.length,
        actualMedianOverheadNsPerOperation: correction, rawGc, rawResultNsPerOperation: values });
    }
    assert.deepEqual(actualKeys.sort(), keys);
  }
}
assert.equal(rows.length, 72);
const paired = [1, 2, 3].flatMap(attempt => keys.map(key => {
  const [method, profile] = key.split(':');
  const original = rows.find(row => row.attempt === attempt && row.variant === 'Original' && row.method === method && row.profile === profile);
  const candidate = rows.find(row => row.attempt === attempt && row.variant === 'Candidate' && row.method === method && row.profile === profile);
  return { attempt, method, profile, lessTimePercent: 100 * (1 - candidate.meanNs / original.meanNs),
    actualManagedBytesSaved: original.allocatedBytesPerOperation - candidate.allocatedBytesPerOperation, original, candidate };
}));
const primary = paired.filter(row => row.method === plan.primary.method && row.profile === plan.primary.profile);
const control = paired.filter(row => row.method === plan.primary.method && row.profile === 'NoSections');
const medianPrimary = median(primary.map(row => row.lessTimePercent));
const numericalPrimaryTimingGate = medianPrimary >= plan.primary.minimumMedianPairedLessTimePercent
  && primary.filter(row => row.lessTimePercent > 0).length >= plan.primary.requiredPrimaryFasterComparisonsWhenAllThreeRun;
const allocationGate = primary.filter(row => row.actualManagedBytesSaved >= plan.primary.alternativeRepeatedActualPrimaryBytesSaved).length >= 2;
const primaryAtMostControlComparisons = primary.filter(row =>
  row.lessTimePercent <= control.find(item => item.attempt === row.attempt).lessTimePercent).map(row => row.attempt);
const profileSummaries = keys.map(key => {
  const [method, profile] = key.split(':');
  const comparisons = paired.filter(row => row.method === method && row.profile === profile);
  return { method, profile, medianLessTimePercent: median(comparisons.map(row => row.lessTimePercent)),
    eachLessTimePercent: comparisons.map(row => row.lessTimePercent),
    eachManagedBytesSaved: comparisons.map(row => row.actualManagedBytesSaved),
    medianOriginalNs: median(comparisons.map(row => row.original.meanNs)),
    medianCandidateNs: median(comparisons.map(row => row.candidate.meanNs)),
    originalAllocatedBytes: comparisons.map(row => row.original.allocatedBytesPerOperation),
    candidateAllocatedBytes: comparisons.map(row => row.candidate.allocatedBytesPerOperation) };
});
const trx = spawnSync('pwsh', ['-NoProfile', '-File', located('F043-audit-trx.ps1'), '-RunRoot', root, '-Variant', 'Both'],
  { encoding: 'utf8', windowsHide: true });
assert.equal(trx.status, 0, trx.stderr || trx.stdout);
const tests = JSON.parse(trx.stdout.replace(/^\uFEFF/, ''));
assert.equal(tests.audits.length, 2);
assert.ok(tests.audits.every(item => item.actualRows === 59 && item.actualAllPassed && item.actualBothNewTheoryValuesPassed));
const extra = {};
if (!measurementOnly) {
  const decision = read('decision.json');
  assert.equal(decision.disposition, 'no-gain');
  assert.equal(decision.numericalPrimaryTimingGateMet, numericalPrimaryTimingGate);
  assert.equal(decision.allocationGateMet, allocationGate);
  assert.equal(decision.controlCredibilityGateMet, false);
  assert.deepEqual(decision.primaryNoGreaterThanControlComparisons, primaryAtMostControlComparisons);
  close(decision.medianPrimaryLessTimePercent, medianPrimary);
  const publication = read('source-publication.json');
  assert.equal(publication.actualRemoteRefVerified, true);
  assert.equal(publication.actualNewPerformancePullRequestCreated, false);
  assert.equal(publication.actualCandidateRecommendedForMerge, false);
  assert.equal(publication.actualOnlySourceFiles.length, 2);
  const reproduction = read('reproduction-paired-001/verified-reproduction.json');
  assert.equal(reproduction.actualByteExactProjectFiles, 13);
  assert.equal(reproduction.actualAdditionalTimingSamples, 0);
  assert.equal(reproduction.actualClosedBudgetBytesUnchanged, true);
  assert.equal(reproduction.actualClosedBudgetSha256, sha(located('diagnostic-budget.json')));
  assert.equal(reproduction.actualMeasuredImagesPreserved, true);
  assert.equal(reproduction.actualVariants.length, 2);
  for (const file of harness.files) assert.equal(sha(located('reproduction-paired-001/project/' + file.path)), file.sha256);
  for (const variant of ['Original', 'Candidate']) {
    const closure = read('reproduction-paired-001/consumer-' + variant.toLowerCase() + '-closure.json');
    const files = byPath(closure);
    const measured = byPath(closures[variant]);
    assert.deepEqual([...files.keys()].sort(), [...measured.keys()].sort());
    assert.deepEqual([...files.keys()].filter(name => files.get(name).sha256 !== measured.get(name).sha256).sort(),
      ['AutoPerf.Benchmarks.dll', 'AutoPerf.Benchmarks.pdb']);
    const folder = 'reproduction-paired-001/' + variant + '/evidence';
    verifyExecution(folder, variant, closure, 'characterize', proofs[variant]);
    assert.deepEqual(characterize(folder), originalCharacterization);
  }
  for (const phase of ['Restore', 'Build', 'Original-CharacterizeRun', 'Candidate-CharacterizeRun']) {
    const command = read('reproduction-paired-001/' + phase + '/command.json');
    assert.equal(command.actualExitCode, 0);
    assert.equal(command.actualTimingAuthorized, false);
  }
  Object.assign(extra, { disposition: decision.disposition, actualIndependentlyRebuiltProjectFiles: 13,
    actualAdditionalReproductionTimingSamples: 0, sourceCommit: publication.sourceCommit,
    actualControlCredibilityGateMet: false });
}
if (flags.includes('--live-images')) {
  for (const variant of ['Original', 'Candidate', 'Default']) {
    const suffix = variant === 'Default' ? 'current-default' : variant.toLowerCase();
    for (const file of closures[variant].files) assert.equal(sha(located('consumer-' + suffix + '/' + file.path)), file.sha256);
  }
}
if (flags.includes('--require-seal')) {
  const seal = read('capsule-file-hashes.json');
  const all = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    assert.equal(entry.isSymbolicLink(), false);
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? all(full) : [path.relative(root, full).replaceAll('\\', '/')];
  });
  assert.deepEqual(all(root).filter(name => !['capsule-file-hashes.json', 'publication.json'].includes(name)).sort(),
    seal.files.map(file => file.path).sort());
  for (const file of seal.files) {
    assert.equal(sha(located(file.path)), file.sha256);
    assert.equal(fs.statSync(located(file.path)).size, file.bytes);
  }
}
const summary = {
  candidate: 'F043', actualCompletedComparisons: 3, actualRetainedSamples: rows.length * 8,
  actualTimedCasesPerVariant: 12, actualSourceOrders: orders,
  actualPrimaryDefinition: plan.primary, actualMedianPrimaryLessTimePercent: medianPrimary,
  actualNumericalPrimaryTimingGateMet: numericalPrimaryTimingGate, actualPrimaryAllocationGateMet: allocationGate,
  actualPrimaryManagedByteSavings: primary.map(row => row.actualManagedBytesSaved),
  actualMedianUnchangedRegistrationControlLessTimePercent: median(control.map(row => row.lessTimePercent)),
  actualPrimaryNoGreaterThanControlComparisons: primaryAtMostControlComparisons,
  actualRuntimeRecordsChecked: runtimeRecords, actualPerBenchmarkSettingsRecordsChecked: settingsRecords,
  actualExpectedSettings: expectedSettings, actualParsedTestRowsPerVariant: tests.audits.map(item => item.actualRows),
  actualEachNewTheoryRowPassedPerVariant: true, actualNotCompleteCompilerProvenance: true,
  ...extra, primary, control, profileSummaries, paired, rows
};
const summaryFile = measurementOnly ? 'measurement-audit.json' : 'audit-summary.json';
if (flags.includes('--write-summary')) {
  fs.writeFileSync(located(summaryFile), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
} else {
  assert.deepEqual(read(summaryFile), summary);
}
console.log(JSON.stringify({
  candidate: summary.candidate, actualCompletedComparisons: 3, actualRetainedSamples: summary.actualRetainedSamples,
  actualMedianPrimaryLessTimePercent: medianPrimary, actualNumericalPrimaryTimingGateMet: numericalPrimaryTimingGate,
  actualPrimaryManagedByteSavings: summary.actualPrimaryManagedByteSavings,
  actualMedianUnchangedControlLessTimePercent: summary.actualMedianUnchangedRegistrationControlLessTimePercent,
  actualPrimaryNoGreaterThanControlComparisons: primaryAtMostControlComparisons,
  actualRuntimeRecordsChecked: runtimeRecords, actualPerBenchmarkSettingsRecordsChecked: settingsRecords,
  actualXmlParsedTestRowsPerVariant: summary.actualParsedTestRowsPerVariant, ...extra
}, null, 2));
