import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] ?? path.dirname(fileURLToPath(import.meta.url)));
const flags = process.argv.slice(3);
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
const evidence = (folder, kind) => {
  const files = fs.readdirSync(located(folder)).filter(name => name.endsWith(`-${kind}.json`));
  assert.equal(files.length, 1, `${folder}:${kind}`);
  return read(`${folder}/${files[0]}`);
};
const owner = 'Microsoft.AspNetCore.JsonPatch.SystemTextJson';
const ownerSource = 'src\\Features\\JsonPatch.SystemTextJson\\src\\Internal\\DictionaryAdapterOfTU.cs';
const plan = read('acceptance-plan.json'), budget = read('diagnostic-budget.json');
assert.equal(budget.closed, true);
assert.equal(budget.maximumAuthorizations, 3);
assert.equal(budget.consumedAuthorizations, 3);
assert.equal(budget.attempts.length, 3);
assert.equal(budget.standaloneOriginalOnlyTimingAuthorized, false);
const profiles = plan.measurement.counts.flatMap(count => plan.measurement.profiles.map(profile => `${count}:${profile}`)).sort();
assert.equal(profiles.length, 12);
assert.equal(new Set(profiles).size, 12);
const harness = read('harness-source-hashes.json');
assert.equal(harness.files.length, 7);
for (const file of harness.files) {
  assert.equal(sha(located(`harness/${file.path}`)), file.sha256);
  assert.equal(sha(located(`reproduction-paired-001/project/${file.path}`)), file.sha256);
}
assert.deepEqual(read('reproduction-paired-001/project-copy.json'), harness);
assert.equal(sha(located('new-tests-original.cs')), sha(located('new-tests-candidate.cs')));
const originals = read('source-inputs-original.json'), candidates = read('source-inputs-candidate.json');
assert.equal(originals.actualPrimaryBaseline, '37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(originals.actualCurrentDefault, 'c5baf473f31fa3bbe9f8201e3411361c632f3a91');
assert.equal(originals.sourceFiles.length, 13);
assert.equal(candidates.sourceFiles.length, 13);
assert.deepEqual(candidates.sourceFiles.filter((file, index) => file.sha256 !== originals.sourceFiles[index].sha256)
  .map(file => file.path), [ownerSource]);
const corrections = read('metadata-corrections.json');
assert.equal(corrections.historicalInputsPreservedUnchanged, true);
assert.equal(corrections.corrections.length, 1);
const discrepancies = [];
for (const [label, inputs, directory] of [
  ['original', originals, 'source-files'], ['candidate', candidates, 'source-files-candidate']
]) {
  for (const file of inputs.sourceFiles) {
    const snapshot = located(`${directory}/${file.path}`);
    assert.equal(sha(snapshot), file.sha256);
    if (fs.statSync(snapshot).size !== file.bytes) discrepancies.push({
      manifest: `source-inputs-${label}.json`, manifestSha256: sha(located(`source-inputs-${label}.json`)),
      path: file.path, recordedBytes: file.bytes, actualSnapshotBytes: fs.statSync(snapshot).size,
      actualSnapshotSha256: file.sha256
    });
    if (label === 'original') assert.equal(file.actualDefaultSha256, file.sha256);
  }
}
assert.deepEqual(discrepancies, corrections.corrections.map(({ reason, ...fields }) => fields));
const closures = Object.fromEntries(['Original', 'Candidate'].map(variant =>
  [variant, read(`consumer-${variant.toLowerCase()}-closure.json`)]));
for (const closure of Object.values(closures)) assert.equal(closure.files.length, 77);
const filesByPath = closure => new Map(closure.files.map(file => [file.path, file]));
const originalFiles = filesByPath(closures.Original), candidateFiles = filesByPath(closures.Candidate);
assert.deepEqual([...originalFiles.keys()].sort(), [...candidateFiles.keys()].sort());
assert.deepEqual([...originalFiles.keys()].filter(file => originalFiles.get(file).sha256 !== candidateFiles.get(file).sha256).sort(),
  [`${owner}.dll`, `${owner}.pdb`].sort());
const expectedSettings = evidence('original-characterization-001/evidence', 'runtime-characterize-before').settings;
assert.deepEqual(expectedSettings, { processPriority: 'Normal', threadPriority: 'Normal', affinity: 65535 });
let runtimeRecords = 0, settingsRecords = 0;
function verifyExecution(folder, variant, closure, mode, sourceProof) {
  const image = evidence(folder, 'verified-image'), proof = evidence(folder, 'selected-source-pdb-associations');
  assert.equal(image.actualEntries, 77);
  assert.equal(image.actualEveryEntryVerified, true);
  assert.equal(proof.actualSelectedInputs, 13);
  assert.equal(proof.actualSelectedDocuments, 8);
  assert.equal(proof.actualCompleteCompilerProvenanceClaimed, false);
  assert.equal(proof.actualPeAndPdbMatch, true);
  const files = filesByPath(closure), inputs = variant === 'Original' ? originals : candidates;
  assert.equal(proof.actualOwnerSha256, files.get(`${owner}.dll`).sha256);
  assert.equal(proof.actualPdbSha256, files.get(`${owner}.pdb`).sha256);
  for (const item of proof.proofs) assert.equal(item.sha256, inputs.sourceFiles.find(file => file.path === item.source).sha256);
  if (sourceProof) assert.deepEqual(proof, sourceProof);
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
    for (const name of ['AutoPerf.Benchmarks', owner])
      assert.equal(runtime.assemblies.find(item => item.name === name).sha256, files.get(`${name}.dll`).sha256);
    for (const assembly of runtime.assemblies) {
      if (assembly.location.startsWith(imageRoot + '\\')) {
        const relative = path.win32.relative(imageRoot, assembly.location).replaceAll('\\', '/');
        assert.ok(files.has(relative), `Loaded image-relative assembly missing from closure: ${relative}`);
        assert.equal(assembly.sha256, files.get(relative).sha256);
      }
    }
    runtimeRecords++;
  }
  return proof;
}
const originalCases = evidence('original-characterization-001/evidence', 'characterization');
const originalLifecycles = evidence('original-characterization-001/evidence', 'all-lifecycles');
assert.equal(originalCases.actualCases, 16);
assert.equal(originalCases.actualEveryCasePassed, true);
assert.equal(originalCases.actualDefaultPublicProducerUsed, true);
assert.equal(originalCases.actualPrivateAdapterOrCallbackInjection, false);
assert.equal(originalCases.cases.length, 16);
assert.ok(originalCases.cases.every(item => item.passed));
assert.equal(originalLifecycles.actualProfiles, 12);
assert.equal(originalLifecycles.actualEverySetupWorkloadCleanupPassed, true);
assert.deepEqual(originalLifecycles.lifecycles.map(item => `${item.count}:${item.profile}`).sort(), profiles);
assert.ok(originalLifecycles.lifecycles.every(item => item.passed));
const sourceProofs = {};
for (const variant of ['Original', 'Candidate']) {
  const folder = `${variant.toLowerCase()}-characterization-001/evidence`;
  assert.deepEqual(evidence(folder, 'characterization'), originalCases);
  assert.deepEqual(evidence(folder, 'all-lifecycles'), originalLifecycles);
  sourceProofs[variant] = verifyExecution(folder, variant, closures[variant], 'characterize');
}
const actualDefault = read('current-default-validation.json');
assert.equal(actualDefault.actualCurrentDefaultOwnerBuildPassed, true);
assert.equal(actualDefault.actualUnmodifiedDefault, originals.actualCurrentDefault);
assert.equal(actualDefault.actualCurrentDefaultCompleteTestSuiteRun, false);
assert.equal(read('validation/default-bootstrap-and-owner-build-003/command.json').actualExitCode, 0);
assert.deepEqual(evidence('default-validation/state', 'characterization'), originalCases);
assert.deepEqual(evidence('default-validation/state', 'all-lifecycles'), originalLifecycles);
const defaultProof = evidence('default-validation/state', 'selected-source-pdb-associations');
assert.equal(defaultProof.actualPeAndPdbMatch, true);
assert.equal(defaultProof.actualSelectedDocuments, 8);
for (const proof of defaultProof.proofs)
  assert.equal(proof.sha256, originals.sourceFiles.find(file => file.path === proof.source).sha256);
const allocationSource = located('BenchmarkDotNet-0.13.0-GcStats.cs');
assert.equal(sha(allocationSource), read('BenchmarkDotNet-0.13.0-GcStats-metadata.json').sha256);
assert.equal(sha(located('BenchmarkDotNet-0.13.0-LICENSE.md')), read('BenchmarkDotNet-0.13.0-license-metadata.json').sha256);
const implementation = fs.readFileSync(allocationSource, 'utf8');
assert.ok(implementation.includes('(long) Math.Round(') && implementation.includes('MidpointRounding.ToEven'));
const rows = [];
for (const attempt of [1, 2, 3]) {
  const folder = `comparison-${String(attempt).padStart(3, '0')}`;
  const historical = budget.attempts[attempt - 1], authorization = read(`${folder}/authorization.json`);
  assert.equal(historical.state, 'completed');
  assert.equal(historical.actualRetainedSamples, 192);
  assert.deepEqual(historical.actualOrder, budget.predeclaredOrder[attempt - 1]);
  assert.equal(authorization.attempt, attempt);
  assert.equal(authorization.actualBudgetConsumedBeforeTiming, attempt);
  assert.deepEqual(authorization.actualOrder, historical.actualOrder);
  const receipt = read(`${folder}/execution-receipt.json`);
  assert.equal(receipt.actualCompletePairedSourceComparison, true);
  assert.equal(receipt.actualRetainedSamples, 192);
  assert.deepEqual(receipt.actualOrder, historical.actualOrder);
  assert.deepEqual(receipt.completed, historical.actualCompletedVariants);
  for (const variant of historical.actualOrder) {
    const lower = variant.toLowerCase(), variantFolder = `${folder}/${variant}`;
    assert.equal(authorization[variant].closureSha256, sha(located(`consumer-${lower}-closure.json`)));
    assert.equal(authorization[variant].sourceInputsSha256, sha(located(`source-inputs-${lower}.json`)));
    const command = read(`${variantFolder}/command.json`);
    assert.equal(command.actualExitCode, 0);
    assert.equal(command.actualLaunchError, null);
    assert.equal(command.actualProcessSettingsModifiedByDriver, false);
    assert.equal(command.arguments[1], 'measure');
    assert.equal(command.actualAttempt, attempt);
    assert.equal(command.actualVariant, variant);
    const evidenceDirectory = `${variantFolder}/evidence`;
    verifyExecution(evidenceDirectory, variant, closures[variant], 'measure', sourceProofs[variant]);
    const completed = evidence(evidenceDirectory, 'completed');
    assert.equal(completed.actualReports, 12);
    assert.equal(completed.actualAllSuccessful, true);
    assert.equal(completed.actualAttempt, attempt);
    assert.equal(completed.actualVariant, variant);
    const settings = fs.readdirSync(located(evidenceDirectory)).filter(file => /-settings-(before|after)\.json$/.test(file));
    assert.equal(settings.length, 24);
    for (const file of settings) assert.deepEqual(read(`${evidenceDirectory}/${file}`), expectedSettings);
    settingsRecords += settings.length;
    const reportFile = `${variantFolder}/reports/results/AutoPerf.DictionaryReplaceBenchmarks-report-full.json`;
    assert.equal(sha(located(reportFile)), historical.actualCompletedVariants.find(item => item.variant === variant).actualFullJsonSha256);
    const raw = read(reportFile);
    assert.equal(raw.Benchmarks.length, 12);
    const blocks = fs.readFileSync(located(`${variantFolder}/stdout.txt`), 'utf8').split(/^\/\/ Benchmark: /m).slice(1);
    assert.equal(blocks.length, 12);
    const nativeByDisplay = new Map(blocks.map(block => [block.split(/\r?\n/, 1)[0].trim(), block]));
    assert.equal(nativeByDisplay.size, 12);
    const keys = [];
    for (const benchmark of raw.Benchmarks) {
      const identity = benchmark.FullName.match(/^AutoPerf\.DictionaryReplaceBenchmarks\.ApplyAndObserve\(Count: (1|64), Profile: "([^"]+)"\)$/);
      assert.ok(identity, benchmark.FullName);
      const count = Number(identity[1]), profile = identity[2], key = `${count}:${profile}`;
      keys.push(key);
      assert.equal(benchmark.Method, 'ApplyAndObserve');
      const native = nativeByDisplay.get(benchmark.DisplayInfo);
      assert.ok(native, `Unique exact raw DisplayInfo must bind untruncated FullName: ${key}`);
      const results = [...native.matchAll(/^WorkloadResult\s+(\d+): (\d+) op, ([\d.]+) ns,/gm)];
      const actual = [...native.matchAll(/^WorkloadActual\s+(\d+): (\d+) op, ([\d.]+) ns,/gm)];
      const overhead = [...native.matchAll(/^OverheadActual\s+\d+: (\d+) op, ([\d.]+) ns,/gm)];
      const gc = [...native.matchAll(/^GC:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/gm)];
      assert.equal(results.length, 8);
      assert.equal(actual.length, 8);
      assert.equal(overhead.length, 20);
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
      for (const [field, value] of Object.entries({ Mean: mean(values), Median: median(values), StandardDeviation: deviation,
        Variance: variance(values), StandardError: deviation / Math.sqrt(8), Min: Math.min(...values), Max: Math.max(...values) }))
        close(benchmark.Statistics[field], value);
      const rawGc = gc[0].slice(1).map(Number), memory = benchmark.Memory;
      assert.equal(memory.TotalOperations, rawGc[4]);
      assert.deepEqual([memory.Gen0Collections, memory.Gen1Collections, memory.Gen2Collections], rawGc.slice(0, 3));
      const quotient = rawGc[3] / rawGc[4], integral = Math.floor(quotient);
      const rounded = quotient - integral === 0.5 ? integral + integral % 2 : Math.round(quotient);
      assert.equal(memory.BytesAllocatedPerOperation, rounded);
      rows.push({ attempt, variant, count, profile, meanNs: mean(values), medianNs: median(values),
        standardDeviationNs: deviation, cvPercent: 100 * deviation / mean(values),
        allocatedBytesPerOperation: rounded, rawGc, rawResultNsPerOperation: values });
    }
    assert.deepEqual(keys.sort(), profiles);
  }
}
assert.equal(rows.length, 72);
const paired = [1, 2, 3].flatMap(attempt => profiles.map(key => {
  const [countText, profile] = key.split(':'), count = Number(countText);
  const original = rows.find(row => row.attempt === attempt && row.variant === 'Original' && row.count === count && row.profile === profile);
  const candidate = rows.find(row => row.attempt === attempt && row.variant === 'Candidate' && row.count === count && row.profile === profile);
  return { attempt, count, profile, lessTimePercent: 100 * (1 - candidate.meanNs / original.meanNs),
    actualManagedBytesSaved: original.allocatedBytesPerOperation - candidate.allocatedBytesPerOperation, original, candidate };
}));
const primary = paired.filter(row => row.count === 1 && row.profile === 'ParsedObjectExisting');
const medianPrimaryLessTime = median(primary.map(row => row.lessTimePercent));
assert.ok(medianPrimaryLessTime < plan.measurement.minimumQualifyingMedianPrimaryLessTimePercent);
assert.ok(primary.every(row => row.actualManagedBytesSaved < plan.measurement.alternativeMinimumRepeatedManagedBytesSavedPerPrimaryOperation));
const profileSummaries = profiles.map(key => {
  const [countText, profile] = key.split(':'), count = Number(countText);
  const comparisons = paired.filter(row => row.count === count && row.profile === profile);
  return { count, profile, medianLessTimePercent: median(comparisons.map(row => row.lessTimePercent)),
    eachLessTimePercent: comparisons.map(row => row.lessTimePercent),
    eachManagedBytesSaved: comparisons.map(row => row.actualManagedBytesSaved),
    medianOriginalNs: median(comparisons.map(row => row.original.meanNs)),
    medianCandidateNs: median(comparisons.map(row => row.candidate.meanNs)),
    originalAllocatedBytes: comparisons.map(row => row.original.allocatedBytesPerOperation),
    candidateAllocatedBytes: comparisons.map(row => row.candidate.allocatedBytesPerOperation) };
});
const reproduction = read('reproduction-paired-001/verified-reproduction.json');
assert.equal(reproduction.actualByteExactProjectFiles, 7);
assert.equal(reproduction.actualAdditionalTimingSamples, 0);
assert.equal(reproduction.actualClosedBudgetBytesUnchanged, true);
assert.equal(reproduction.actualClosedBudgetSha256, sha(located('diagnostic-budget.json')));
assert.equal(reproduction.actualMeasuredImagesPreserved, true);
assert.equal(reproduction.actualShippingSourceTestsProtectedFilesAndReportsPreserved, true);
for (const phase of ['Restore', 'Build', 'Original-CharacterizeRun', 'Candidate-CharacterizeRun']) {
  const command = read(`reproduction-paired-001/${phase}/command.json`);
  assert.equal(command.actualExitCode, 0);
  assert.equal(command.actualTimingAuthorized, false);
}
for (const variant of ['Original', 'Candidate']) {
  const closure = read(`reproduction-paired-001/consumer-${variant.toLowerCase()}-closure.json`), files = filesByPath(closure);
  assert.equal(files.size, 77);
  assert.deepEqual([...files.keys()].sort(), [...originalFiles.keys()].sort());
  const old = filesByPath(closures[variant]);
  assert.deepEqual([...files.keys()].filter(file => files.get(file).sha256 !== old.get(file).sha256).sort(),
    ['AutoPerf.Benchmarks.dll', 'AutoPerf.Benchmarks.pdb']);
  const folder = `reproduction-paired-001/${variant}/evidence`;
  verifyExecution(folder, variant, closure, 'characterize', sourceProofs[variant]);
  assert.deepEqual(evidence(folder, 'characterization'), originalCases);
  assert.deepEqual(evidence(folder, 'all-lifecycles'), originalLifecycles);
}
for (const variant of ['original', 'candidate'])
  assert.equal(read(`validation/${variant}-dictionary-tests-001/command.json`).actualExitCode, 0);
assert.equal(read('validation/candidate-format-whitespace-002/command.json').actualExitCode, 0);
const trx = spawnSync('pwsh', ['-NoProfile', '-File', located('F042-audit-trx.ps1'), '-RunDirectory', root],
  { encoding: 'utf8', windowsHide: true });
assert.equal(trx.status, 0, trx.stderr || trx.stdout);
const tests = JSON.parse(trx.stdout.replace(/^\uFEFF/, ''));
if (flags.includes('--live-images')) {
  for (const variant of ['original', 'candidate']) {
    for (const file of closures[variant === 'original' ? 'Original' : 'Candidate'].files)
      assert.equal(sha(located(`consumer-${variant}/${file.path}`)), file.sha256);
  }
}
if (flags.includes('--require-seal')) {
  const seal = read('capsule-file-hashes.json');
  for (const file of seal.files) {
    assert.equal(fs.statSync(located(file.path)).size, file.bytes);
    assert.equal(sha(located(file.path)), file.sha256);
  }
}
const summary = { candidate: 'F042', disposition: 'no-gain', actualCompletedComparisons: 3,
  actualRetainedSamples: rows.length * 8, actualTimedProfilesPerVariant: 12, actualSourceOrders: budget.predeclaredOrder,
  actualPrimaryDefinition: plan.measurement.primary, actualMedianPrimaryLessTimePercent: medianPrimaryLessTime,
  actualPrimaryManagedByteSavings: primary.map(row => row.actualManagedBytesSaved),
  actualNoThirtyTwoByteSavingClaim: true, actualRuntimeRecordsChecked: runtimeRecords,
  actualPerBenchmarkSettingsRecordsChecked: settingsRecords, actualExpectedSettings: expectedSettings,
  actualTests: tests, actualMetadataOnlyCorrectionExplicit: true,
  actualNotCompleteCompilerProvenance: true, actualAdditionalTimingAuthorized: false, primary, profileSummaries, paired, rows };
if (flags.includes('--write-summary'))
  fs.writeFileSync(located('audit-summary.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
else assert.deepEqual(read('audit-summary.json'), summary);
console.log(JSON.stringify({ candidate: summary.candidate, disposition: summary.disposition,
  actualCompletedComparisons: 3, actualRetainedSamples: summary.actualRetainedSamples,
  actualMedianPrimaryLessTimePercent: medianPrimaryLessTime, actualPrimaryManagedByteSavings: summary.actualPrimaryManagedByteSavings,
  actualRuntimeRecordsChecked: runtimeRecords, actualPerBenchmarkSettingsRecordsChecked: settingsRecords,
  actualIndependentlyXmlParsedTestRowsPerVariant: tests.actualPassedPerVariant,
  actualRelocatedCharacterizationsPerVariant: 16, actualRelocatedUntimedLifecyclesPerVariant: 12,
  actualAdditionalTimingAuthorized: false }, null, 2));
