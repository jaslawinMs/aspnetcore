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
function records(folder, kind) {
  return fs.readdirSync(located(folder)).filter(name => name.endsWith('-' + kind + '.json'))
    .map(name => read(folder + '/' + name));
}
function one(folder, kind) {
  const values = records(folder, kind);
  assert.equal(values.length, 1, folder + ':' + kind);
  return values[0];
}
const normalize = value => {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, next]) =>
    [key, key === 'PrerenderId' && next !== null ? '<per-render-id>' : normalize(next)]));
  return value;
};
const plan = read('acceptance-plan.json');
const budget = read('diagnostic-budget.json');
const seal = read('premeasurement-validation.json');
assert.equal(budget.permanentlyClosed, true);
assert.equal(budget.authorized.length, 3);
assert.equal(budget.completed.length, 3);
assert.equal(budget.failedOrPartialAttempts.length, 0);
assert.equal(sha(located('diagnostic-budget.json')), read('permanent-budget-close.json').closedBudgetSha256);
assert.equal(sha(located('acceptance-plan.json')), seal.acceptancePlanSha256);
assert.equal(plan.benchmarkMethod, 'FreshBoundarySetAndDispose');
assert.equal(plan.primary, 'PrerenderScalar1');
assert.equal(plan.unchangedControl, 'NonPrerenderScalar1');
const keys = [...plan.profileKeys].sort();
assert.equal(keys.length, 8);
assert.equal(new Set(keys).size, 8);
const harness = read('harness-source-hashes.json');
assert.equal(harness.length, 8);
for (const item of harness) {
  assert.equal(sha(located('harness/' + item.path)), item.sha256);
  assert.equal(fs.statSync(located('harness/' + item.path)).size, item.bytes);
}
const owners = ['Microsoft.AspNetCore.Components.Endpoints', 'Microsoft.AspNetCore.Components', 'Microsoft.AspNetCore.Components.Web'];
const ownerSource = 'src/Components/Endpoints/src/Rendering/SSRRenderModeBoundary.cs';
const testSource = 'src/Components/Endpoints/test/EndpointHtmlRendererTest.cs';
const inputs = {};
const closures = {};
const byPath = closure => new Map(closure.files.map(item => [item.path, item]));
for (const variant of ['Original', 'Candidate', 'Default']) {
  const suffix = variant === 'Default' ? 'current-default' : variant.toLowerCase();
  inputs[variant] = read('source-inputs-' + suffix + '.json');
  closures[variant] = read('closure-' + suffix + '.json');
  assert.equal(inputs[variant].sourceFiles.length, 19);
  assert.equal(inputs[variant].sourceFiles.filter(item => item.pdbDocumentRequired).length, 8);
  assert.equal(closures[variant].files.length, 195);
  assert.equal(byPath(closures[variant]).size, 195);
  for (const item of inputs[variant].sourceFiles) {
    assert.equal(sha(located('source-files-' + suffix + '/' + item.path)), item.sha256);
  }
}
assert.deepEqual(inputs.Candidate.sourceFiles.filter(item =>
  item.sha256 !== inputs.Original.sourceFiles.find(old => old.path === item.path).sha256).map(item => item.path).sort(),
  [ownerSource, testSource].sort());
assert.deepEqual(inputs.Default.sourceFiles.filter(item =>
  item.sha256 !== inputs.Original.sourceFiles.find(old => old.path === item.path).sha256).map(item => item.path),
  ['src/Components/Components/src/RenderTree/Renderer.cs']);
const original = byPath(closures.Original);
const candidate = byPath(closures.Candidate);
assert.deepEqual([...original.keys()].sort(), [...candidate.keys()].sort());
assert.deepEqual([...original.keys()].filter(name => original.get(name).sha256 !== candidate.get(name).sha256).sort(),
  [owners[0] + '.dll', owners[0] + '.pdb'].sort());
for (const role of seal.roles) {
  for (const item of role.stateHashes) assert.equal(sha(located(item.path)), item.sha256);
}
const originalStates = 'characterization-original-characterize-001/states';
const expectedSettings = one(originalStates, 'runtime-characterize-before').settings;
assert.equal(expectedSettings.processPriority, 'Normal');
assert.equal(expectedSettings.threadPriority, 'Normal');
assert.ok(Number.isInteger(expectedSettings.affinity) && expectedSettings.affinity > 0);
let runtimeRecords = 0;
let settingsRecords = 0;
function verifyExecution(folder, variant, closure, mode, expectedProof) {
  const files = byPath(closure);
  assert.equal(one(folder, 'verified-image').actualEntries, files.size);
  assert.equal(one(folder, 'verified-image').actualEveryEntryVerified, true);
  const proof = one(folder, 'selected-source-pdb-associations');
  assert.equal(proof.actualSelectedInputs, 19);
  assert.equal(proof.actualSelectedDocuments, 8);
  assert.equal(proof.actualUniqueFrameworkDocuments, 8);
  assert.equal(proof.actualSourceBuiltOwners, 3);
  assert.equal(proof.actualCompleteCompilerProvenanceClaimed, false);
  const proved = new Set();
  for (const name of owners) {
    const owner = proof.ownerProofs.find(item => item.actualOwner === name);
    assert.ok(owner);
    assert.equal(owner.actualPeAndPdbMatch, true);
    assert.equal(owner.actualOwnerSha256, files.get(name + '.dll').sha256);
    assert.equal(owner.actualPdbSha256, files.get(name + '.pdb').sha256);
    assert.equal(owner.proofs.length, name === owners[0] ? 5 : name === owners[1] ? 3 : 0);
    for (const item of owner.proofs) {
      const source = inputs[variant].sourceFiles.find(file => file.path === item.source);
      assert.equal(item.sha256, source.sha256);
      assert.equal(source.pdbDocumentRequired, true);
      proved.add(item.source);
    }
  }
  assert.equal(proved.size, 8);
  if (expectedProof) assert.deepEqual(proof, expectedProof);
  const discovery = one(folder, 'benchmarkdotnet-discovery-preflight');
  assert.equal(discovery.actualDiscoveredCases, 8);
  assert.equal(discovery.actualTimingRunByThisPreflight, false);
  assert.equal(discovery.actualVariant, variant);
  const runtimes = ['before', 'after'].map(phase => one(folder, 'runtime-' + mode + '-' + phase));
  assert.equal(runtimes[0].pid, runtimes[1].pid);
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
function characterize(folder) {
  const boundaries = records(folder, 'actual-renderer-boundary-characterized');
  assert.equal(boundaries.length, 24);
  for (const mode of ['server', 'wasm', 'auto']) {
    assert.deepEqual(boundaries.filter(item => item.actualMode === mode).map(item => item.actualProfile).sort(), keys);
  }
  assert.ok(boundaries.every(item => item.actualFreshBenchmarkOperationAlsoExecuted
    && item.actualOriginalInputsUnchanged && item.actualCreated === item.actualDisposed));
  assert.equal(records(folder, 'actual-invalid-delegate-contract').length, 12);
  assert.equal(records(folder, 'actual-disabled-fragment-contract').length, 3);
  assert.equal(records(folder, 'actual-nested-fragment-characterized').length, 1);
  assert.equal(one(folder, 'actual-runtime-dictionary-contract').actualPassed, true);
  assert.equal(one(folder, 'characterization-completed').actualPassed, true);
  return normalize({
    boundaries, invalid: records(folder, 'actual-invalid-delegate-contract'),
    disabled: records(folder, 'actual-disabled-fragment-contract'),
    nested: records(folder, 'actual-nested-fragment-characterized'),
    dictionary: records(folder, 'actual-runtime-dictionary-contract')
  });
}
const proofs = {};
const observed = characterize(originalStates);
for (const variant of ['Original', 'Default', 'Candidate']) {
  const suffix = variant === 'Default' ? 'default' : variant.toLowerCase();
  const folder = 'characterization-' + suffix + '-characterize-001/states';
  assert.deepEqual(characterize(folder), observed);
  proofs[variant] = verifyExecution(folder, variant, closures[variant], 'characterize');
}
for (const [source, metadata] of [
  ['BenchmarkDotNet-0.13.0-GcStats.cs', 'BenchmarkDotNet-0.13.0-GcStats-metadata.json'],
  ['BenchmarkDotNet-0.13.0-LICENSE.md', 'BenchmarkDotNet-0.13.0-license-metadata.json']
]) assert.equal(sha(located(source)), read(metadata).sha256);
const allocationSource = fs.readFileSync(located('BenchmarkDotNet-0.13.0-GcStats.cs'), 'utf8');
assert.ok(allocationSource.includes('(long) Math.Round(') && allocationSource.includes('MidpointRounding.ToEven'));
const rows = [];
for (const attempt of [1, 2, 3]) {
  const folder = 'comparison-' + String(attempt).padStart(3, '0');
  const historic = budget.authorized[attempt - 1];
  const authorization = read(folder + '/authorization.json');
  const receipt = read(folder + '/execution-receipt.json');
  assert.equal(historic.state, 'completed');
  assert.equal(historic.actualTimingStarted, true);
  assert.deepEqual(historic.order, plan.comparisonOrders[attempt - 1]);
  assert.equal(authorization.actualConsumedBeforeProcessLaunch, attempt);
  assert.equal(authorization.actualAcceptancePlanSha256, seal.acceptancePlanSha256);
  assert.equal(receipt.actualCompletePairedSourceComparison, true);
  assert.equal(receipt.actualRetainedSamples, 128);
  assert.deepEqual(receipt.completed, historic.completed);
  assert.equal(receipt.actualDriverSha256, sha(located('F047-compare.mjs')));
  for (const variant of historic.order) {
    const suffix = variant.toLowerCase();
    assert.equal(authorization[variant].closureSha256, sha(located('closure-' + suffix + '.json')));
    assert.equal(authorization[variant].sourceInputsSha256, sha(located('source-inputs-' + suffix + '.json')));
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
    assert.equal(completed.actualReports, 8);
    assert.equal(completed.actualAllSuccessful, true);
    assert.equal(completed.actualAttempt, attempt);
    assert.equal(completed.actualVariant, variant);
    const lifetimes = records(stateFolder, 'actual-benchmark-lifetimes');
    assert.equal(lifetimes.length, 8);
    assert.deepEqual(lifetimes.map(item => item.profile).sort(), keys);
    assert.ok(lifetimes.every(item => item.actualNoRetainedRootsOrChildren && item.actualCreated === item.actualDisposed
      && (item.profile.startsWith('NonPrerender') ? item.actualCreated === 0 : item.actualCreated > 0)));
    for (const phase of ['before', 'after']) {
      const settings = records(stateFolder, 'settings-' + phase);
      assert.equal(settings.length, 8);
      for (const item of settings) assert.deepEqual(item, expectedSettings);
      settingsRecords += settings.length;
    }
    const reportFile = variantFolder + '/reports/results/AutoPerf.BoundaryBenchmarks-report-full.json';
    assert.equal(sha(located(reportFile)), historic.completed.find(item => item.variant === variant).fullJsonSha256);
    const report = read(reportFile);
    assert.equal(report.Benchmarks.length, 8);
    const blocks = fs.readFileSync(located(variantFolder + '/stdout.txt'), 'utf8').split(/^\/\/ Benchmark: /m).slice(1);
    assert.equal(blocks.length, 8);
    const nativeByDisplay = new Map(blocks.map(block => [block.split(/\r?\n/, 1)[0].trim(), block]));
    assert.equal(nativeByDisplay.size, 8);
    const actualKeys = [];
    for (const benchmark of report.Benchmarks) {
      const match = benchmark.FullName.match(/^AutoPerf\.BoundaryBenchmarks\.FreshBoundarySetAndDispose\(Profile: ([A-Za-z0-9]+)\)$/);
      assert.ok(match, benchmark.FullName);
      const profile = match[1];
      actualKeys.push(profile);
      assert.equal(benchmark.Method, plan.benchmarkMethod);
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
        close(measurement.Nanoseconds, Number(actual[index][3]) - correction * measurement.Operations);
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
      rows.push({ attempt, variant, method: plan.benchmarkMethod, profile, meanNs: mean(values), medianNs: median(values),
        standardDeviationNs: deviation, cvPercent: 100 * deviation / mean(values), allocatedBytesPerOperation: rounded,
        actualOverheadSamples: overhead.length, actualMedianOverheadNsPerOperation: correction, rawGc, rawResultNsPerOperation: values });
    }
    assert.deepEqual(actualKeys.sort(), keys);
  }
}
assert.equal(rows.length, 48);
const paired = [1, 2, 3].flatMap(attempt => keys.map(profile => {
  const before = rows.find(row => row.attempt === attempt && row.variant === 'Original' && row.profile === profile);
  const after = rows.find(row => row.attempt === attempt && row.variant === 'Candidate' && row.profile === profile);
  return { attempt, method: plan.benchmarkMethod, profile, lessTimePercent: 100 * (1 - after.meanNs / before.meanNs),
    actualManagedBytesSaved: before.allocatedBytesPerOperation - after.allocatedBytesPerOperation, original: before, candidate: after };
}));
const primary = paired.filter(row => row.profile === plan.primary);
const control = paired.filter(row => row.profile === plan.unchangedControl);
const medianPrimary = median(primary.map(row => row.lessTimePercent));
const numericalGate = medianPrimary >= 5 && primary.filter(row => row.lessTimePercent > 0).length >= 2;
const allocationGate = primary.filter(row => row.actualManagedBytesSaved >= 32).length >= 2;
const atMostControl = primary.filter(row => row.lessTimePercent <= control.find(item => item.attempt === row.attempt).lessTimePercent).map(row => row.attempt);
const profileSummaries = plan.profileKeys.map(profile => {
  const comparisons = paired.filter(row => row.profile === profile);
  return { method: plan.benchmarkMethod, profile, medianLessTimePercent: median(comparisons.map(row => row.lessTimePercent)),
    eachLessTimePercent: comparisons.map(row => row.lessTimePercent), medianOriginalNs: median(comparisons.map(row => row.original.meanNs)),
    medianCandidateNs: median(comparisons.map(row => row.candidate.meanNs)),
    originalAllocatedBytes: comparisons.map(row => row.original.allocatedBytesPerOperation),
    candidateAllocatedBytes: comparisons.map(row => row.candidate.allocatedBytesPerOperation) };
});
const xmlAudits = [];
for (const item of seal.audits) {
  assert.equal(sha(located(item.auditPath)), item.auditSha256);
  assert.equal(sha(located(item.trxPath)), item.trxSha256);
  const previous = read(item.auditPath);
  const result = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', located('F047-audit-trx.ps1'),
    '-TrxPath', located(item.trxPath), '-Kind', previous.kind], { windowsHide: true, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const audit = JSON.parse(result.stdout.replace(/^\uFEFF/, ''));
  assert.equal(audit.actualPassed, item.actualRows);
  assert.equal(audit.actualSkippedOrFailed, 0);
  assert.deepEqual(audit.actualRows, previous.actualRows);
  xmlAudits.push({ variant: item.variant, kind: item.kind, actualRows: audit.actualPassed, actualXmlParsed: true });
}
for (const sample of seal.samples) {
  assert.equal(sha(located(sample.path)), sample.sha256);
  const result = read(sample.path);
  assert.equal(result.actualPassed, true);
  assert.equal(result.actualCases.length, 6);
  assert.ok(result.actualCases.every(item => item.actualPassed && item.actualRealClickCount === 1));
  assert.equal(result.actualCleanup.actualAllCapturedOwnedHelpersGone, true);
  assert.equal(result.expectedOwnerSha256, byPath(closures[sample.variant === 'original' ? 'Original' : 'Candidate']).get(owners[0] + '.dll').sha256);
}
assert.equal(read('selenium-candidate-001/verified-result.json').actualAllCapturedOwnedHelpersGone, true);
assert.equal(read('temporary-sample-cleanup.json').actualRemovedOnlyTheTwoOwnedSampleFiles, true);
const expectedFailures = ['default-endpoints-test-build-001', 'original-preservation-tests-001'];
for (const label of fs.readdirSync(located('validation'))) {
  const result = read('validation/' + label + '/result.json');
  assert.equal(result.protectedPinUnchanged, true);
  assert.equal(result.exitCode, expectedFailures.includes(label) ? 1 : 0);
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
  close(decision.medianPrimaryLessTimePercent, medianPrimary);
  assert.equal(decision.actualPrimarySlowerComparisons.length, primary.filter(row => row.lessTimePercent < 0).length);
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
  candidate: 'F047', actualCompletedComparisons: 3, actualRetainedSamples: 384, actualTimedCasesPerVariant: 8,
  actualSourceOrders: plan.comparisonOrders, actualPrimaryDefinition: plan.primary,
  actualMedianPrimaryLessTimePercent: medianPrimary, actualNumericalPrimaryTimingGateMet: numericalGate,
  actualPrimaryAllocationGateMet: allocationGate, actualPrimaryManagedByteSavings: primary.map(row => row.actualManagedBytesSaved),
  actualPrimarySlowerComparisons: primary.filter(row => row.lessTimePercent < 0).map(row => row.attempt),
  actualMedianUnchangedControlLessTimePercent: median(control.map(row => row.lessTimePercent)),
  actualControlCredibilityGateMet: atMostControl.length < 2, actualPrimaryNoGreaterThanControlComparisons: atMostControl,
  actualMaximumObservedCaseCvPercent: Math.max(...rows.map(row => row.cvPercent)),
  actualRuntimeRecordsChecked: runtimeRecords, actualPerBenchmarkSettingsRecordsChecked: settingsRecords,
  actualExpectedSettings: expectedSettings, actualXmlAudits: xmlAudits,
  actualExpectedPreservedPreparationFailures: expectedFailures, actualNotCompleteCompilerProvenance: true,
  ...extra, primary, control, profileSummaries, paired, rows
};
const output = measurementOnly ? 'measurement-audit.json' : 'audit-summary.json';
if (flags.includes('--write-summary')) fs.writeFileSync(located(output), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
else assert.deepEqual(read(output), summary);
console.log(JSON.stringify({ candidate: 'F047', actualCompletedComparisons: 3, actualRetainedSamples: 384,
  actualMedianPrimaryLessTimePercent: medianPrimary, actualNumericalPrimaryTimingGateMet: numericalGate,
  actualPrimaryManagedByteSavings: summary.actualPrimaryManagedByteSavings,
  actualPrimarySlowerComparisons: summary.actualPrimarySlowerComparisons,
  actualRuntimeRecordsChecked: runtimeRecords, actualPerBenchmarkSettingsRecordsChecked: settingsRecords,
  actualParsedIndividualTestRows: xmlAudits.reduce((sum, item) => sum + item.actualRows, 0), ...extra }, null, 2));
