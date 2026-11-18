import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const directory = path.resolve(process.argv[2] ?? path.dirname(fileURLToPath(import.meta.url)));
const flags = process.argv.slice(3);
const option = name => flags.includes(name) ? flags[flags.indexOf(name) + 1] : undefined;
const located = name => path.join(directory, ...name.split(/[\\/]/));
const read = name => JSON.parse(fs.readFileSync(located(name), 'utf8').replace(/^\uFEFF/, ''));
const hashed = new Set();
const sha = file => {
  hashed.add(path.resolve(file));
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
};
const blob = file => {
  const bytes = Buffer.from(fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n'));
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
};
const close = (actual, expected) => assert.ok(
  Math.abs(actual - expected) <= Math.max(1e-6, Math.abs(expected) * 1e-11), `${actual} != ${expected}`);
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const variance = values => {
  const average = mean(values);
  return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
};
const median = values => {
  const ordered = [...values].sort((a, b) => a - b);
  return (ordered[(ordered.length - 1) >> 1] + ordered[ordered.length >> 1]) / 2;
};
const evidenceFiles = folder => fs.readdirSync(located(`${folder}/evidence`)).sort();
const evidence = (folder, kind) => {
  const files = evidenceFiles(folder).filter(name => name.endsWith(`-${kind}.json`));
  assert.equal(files.length, 1, `${folder}:${kind}`);
  return read(`${folder}/evidence/${files[0]}`);
};
const inputs = read('source-inputs.json');
const plan = read('acceptance-plan.json');
const budget = read('diagnostic-budget.json');
assert.equal(inputs.baseline, '37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(inputs.upstreamDefault, 'c5baf473f31fa3bbe9f8201e3411361c632f3a91');
assert.equal(inputs.sourceFiles.length, 13);
assert.equal(budget.actualAuthorizedOriginalOnlyInvocations, 1);
assert.equal(budget.maximumAuthorizedOriginalOnlyInvocations, 1);
assert.equal(budget.actualAuthorizedSourceComparisons, 0);
assert.equal(budget.actualBudgetPermanentlyClosedAfterThisAttempt, true);
assert.equal(budget.actualOptimizedCandidateExists, false);
assert.equal(budget.actualGainOrNoGainClaimed, false);
assert.equal(plan.sourceMutationAuthorizedByThisPlan, false);
assert.equal(inputs.sourceFiles.filter(file => file.baselineBlob === file.defaultBlob).length, 12);
for (const item of inputs.sourceFiles) {
  const file = located(`source-files/${item.path}`);
  assert.equal(sha(file), item.sha256);
  assert.equal(fs.statSync(file).size, item.bytes);
  assert.equal(blob(file), item.baselineBlob);
}
const originalInput = located('source-files/src/Components/Web/src/Forms/InputBase.cs');
const defaultInput = located('current-default-InputBase.cs');
assert.equal(blob(defaultInput), inputs.sourceFiles.find(item => item.gitPath.endsWith('/InputBase.cs')).defaultBlob);
const initialization = file => {
  const text = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const start = text.indexOf('        if (!_hasInitializedParameters)\n');
  const end = text.indexOf('        else if (CascadedEditContext != EditContext)\n', start);
  assert.ok(start > 0 && end > start);
  return text.slice(start, end);
};
assert.equal(initialization(originalInput), initialization(defaultInput));
const harness = read('harness-source-hashes.json');
assert.equal(harness.length, 7);
for (const item of harness) {
  const file = located(`harness/${item.path}`);
  assert.equal(sha(file), item.sha256);
  assert.equal(fs.statSync(file).size, item.bytes);
}
const closure = read('consumer-closure.json');
assert.equal(closure.variant, 'original-only');
assert.equal(closure.files.length, 131);
const closureByName = new Map(closure.files.map(item => [item.path, item]));
const sourceByName = new Map(inputs.sourceFiles.map(item => [item.path, item]));
const runtimeRecords = [];
for (const folder of ['native-characterize-001', 'native-measure-001']) {
  assert.equal(read(`${folder}/command.json`).actualExitCode, 0);
  assert.equal(fs.readFileSync(located(`${folder}/stderr.txt`)).length, 0);
  assert.deepEqual(evidence(folder, 'verified-image'), { actualEntries: 131, actualEveryEntryVerified: true });
  assert.deepEqual(evidence(folder, 'benchmarkdotnet-discovery-preflight'), {
    actualEligiblePublicNonSealedType: true, actualDiscoveredCases: 6, actualTimingRunByThisPreflight: false });
  const associations = evidence(folder, 'selected-source-pdb-associations');
  assert.equal(associations.actualSelectedInputs, 13);
  assert.equal(associations.actualSelectedDocuments, 8);
  assert.equal(associations.proofs.length, 8);
  assert.equal(associations.actualCompleteCompilerProvenanceClaimed, false);
  for (const proof of associations.proofs) {
    assert.equal(proof.sha256, sourceByName.get(proof.source).sha256);
    assert.equal(proof.actualOwnerSha256, closureByName.get(`${proof.owner}.dll`).sha256);
    assert.equal(proof.actualPdbSha256, closureByName.get(`${proof.owner}.pdb`).sha256);
  }
  const records = evidenceFiles(folder).filter(file => /-runtime-.+\.json$/.test(file))
    .map(file => read(`${folder}/evidence/${file}`));
  assert.equal(records.length, 2);
  assert.equal(records[0].pid, records[1].pid);
  runtimeRecords.push(...records);
}
const settings = { processPriority: 'Normal', threadPriority: 'Normal', affinity: 65535 };
for (const runtime of runtimeRecords) {
  assert.equal(runtime.framework, '.NET 12.0.0-alpha.1.26562.105');
  assert.deepEqual(runtime.settings, settings);
  for (const name of ['AutoPerf.Benchmarks', 'Microsoft.AspNetCore.Components.Forms', 'Microsoft.AspNetCore.Components.Web'])
    assert.equal(runtime.assemblies.find(item => item.name === name).sha256, closureByName.get(`${name}.dll`).sha256);
}
const characterization = evidence('native-characterize-001', 'characterization');
assert.equal(characterization.actualCases, 10);
assert.equal(characterization.actualEveryCasePassed, true);
assert.equal(characterization.actualNonpublicMemberInvocations, 0);
assert.equal(characterization.actualBrowserValidationClaimed, false);
assert.deepEqual(characterization.cases.map(item => item.name), plan.requiredCharacterizationCases);
assert.ok(characterization.cases.every(item => item.passed === true));
assert.equal(characterization.cases[0].actualHashes, 0);
assert.equal(characterization.cases[1].actualHashes, 2);
for (const item of characterization.cases.slice(2, 8)) {
  const count = Number(item.name.split('_').at(-1));
  const observation = item.observation;
  assert.equal(observation.actualInputCount, count);
  assert.equal(observation.fields.length, count);
  assert.equal(observation.actualProviderCalls, 1);
  assert.equal(observation.actualApplicationPropertyPreserved, true);
  assert.ok(observation.html.includes(`<f041-observation data-fields="${count}"></f041-observation>`));
  observation.fields.forEach((field, index) => {
    assert.deepEqual(field, { fieldName: 'Value', renderedName: `fields[${index}].Value`,
      value: `fields-value-${index}`, actualModelReferenceMatched: true });
    assert.ok(observation.html.includes(`name="${field.renderedName}"`) && observation.html.includes(`value="${field.value}"`));
  });
}
assert.equal(characterization.cases.at(-1).observation.actualInputCount, 0);
assert.equal(characterization.cases.at(-1).observation.actualProviderCalls, 0);
assert.deepEqual(evidence('native-characterize-001', 'all-lifecycles'), {
  actualProfiles: 6, actualEverySetupWorkloadCleanupPassed: true });
const expectedProfiles = ['1:Cold', '1:Warm', '8:Cold', '8:Warm', '64:Cold', '64:Warm'].sort();
for (const folder of ['native-characterize-001', 'native-measure-001']) {
  for (const phase of ['setup', 'cleanup']) {
    const records = evidenceFiles(folder).filter(file => file.endsWith(`-lifecycle-${phase}.json`))
      .map(file => read(`${folder}/evidence/${file}`));
    assert.deepEqual(records.map(item => `${item.FieldCount}:${item.RegistryState}`).sort(), expectedProfiles);
    if (phase === 'cleanup') assert.ok(records.every(item => item.actualWorkloadConsumerCalls > 0 &&
      item.actualApplicationPropertyPreserved === true && item.actualServiceProviderDisposed === true));
  }
}
for (const phase of ['before', 'after']) {
  const records = evidenceFiles('native-measure-001').filter(file => file.endsWith(`-settings-${phase}.json`));
  assert.equal(records.length, 6);
  records.forEach(file => assert.deepEqual(read(`native-measure-001/evidence/${file}`), settings));
}
assert.deepEqual(evidence('native-measure-001', 'completed'), { actualReports: 6, actualAllSuccessful: true,
  actualSourceComparison: false, actualOptimizedCandidateExists: false, actualGainClaimed: false });
for (const folder of ['validation/WebBuild-original-001', 'validation/InputBaseTests-original-001']) {
  assert.equal(read(`${folder}/command.json`).actualExitCode, 0);
  assert.equal(fs.readFileSync(located(`${folder}/stderr.txt`)).length, 0);
}
const trx = read('validation/all-trx-rows.json');
assert.equal(trx.actualIndependentlyParsedXml, true);
assert.equal(sha(located(trx.source)), trx.sourceSha256);
assert.equal(trx.actualRows, 21);
assert.equal(trx.rows.length, 21);
assert.equal(new Set(trx.rows.map(item => item.executionId)).size, 21);
assert.equal(trx.actualPassed, 21);
assert.equal(trx.actualSkipped, 0);
assert.ok(trx.rows.every(item => item.outcome === 'Passed' && item.testName.includes('.InputBaseTest.')));
const identities = rows => rows.map(item => `${item.testName}|${item.testId}|${item.outcome}`).sort();
assert.deepEqual(identities(trx.rows), identities(read('validation/verified-owner-validation.json').actualRows));
const stdout = fs.readFileSync(located('native-measure-001/stdout.txt'), 'utf8');
const blocks = stdout.split(/^\/\/ Benchmark: /m).slice(1);
assert.equal(blocks.length, 6);
const nativeProfiles = new Map();
for (const block of blocks) {
  const identity = block.match(/\[FieldCount=(\d+), RegistryState=(Cold|Warm)\]/);
  const key = `${identity[1]}:${identity[2]}`;
  assert.equal(nativeProfiles.has(key), false);
  const results = [...block.matchAll(/^WorkloadResult\s+(\d+): (\d+) op, ([\d.]+) ns,/gm)];
  const actual = [...block.matchAll(/^WorkloadActual\s+(\d+): (\d+) op, ([\d.]+) ns,/gm)];
  const overhead = [...block.matchAll(/^OverheadActual\s+\d+: (\d+) op, ([\d.]+) ns,/gm)];
  assert.equal(results.length, 8);
  assert.equal(actual.length, 8);
  assert.equal(overhead.length, 20);
  assert.equal([...block.matchAll(/^WorkloadWarmup\s+/gm)].length, 3);
  const gc = [...block.matchAll(/^GC:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/gm)];
  assert.equal(gc.length, 1);
  nativeProfiles.set(key, { results, actual, overhead, gc: gc[0].slice(1).map(Number) });
}
assert.deepEqual([...nativeProfiles.keys()].sort(), expectedProfiles);
const raw = read('native-measure-001/reports/results/AutoPerf.FieldRegistryBenchmarks-report-full.json');
assert.equal(raw.Benchmarks.length, 6);
const profiles = raw.Benchmarks.map(benchmark => {
  assert.equal(benchmark.Method, 'RenderForm');
  const parameters = new URLSearchParams(benchmark.Parameters);
  const count = Number(parameters.get('FieldCount')), state = parameters.get('RegistryState');
  const native = nativeProfiles.get(`${count}:${state}`);
  assert.ok(native);
  const measurements = benchmark.Measurements;
  assert.equal(measurements.length, 8);
  assert.equal(benchmark.Statistics.N, 8);
  assert.equal(benchmark.Statistics.OriginalValues.length, 8);
  const correction = median(native.overhead.map(item => Number(item[2]) / Number(item[1])));
  const values = measurements.map((measurement, index) => {
    const printed = native.results[index], actual = native.actual[index];
    assert.equal(Number(printed[1]), index + 1);
    assert.equal(Number(actual[1]), index + 1);
    assert.equal(measurement.IterationIndex, index + 1);
    assert.equal(measurement.LaunchIndex, 1);
    assert.equal(measurement.IterationMode, 'Workload');
    assert.equal(measurement.IterationStage, 'Result');
    assert.equal(Number(printed[2]), measurement.Operations);
    assert.equal(Number(actual[2]), measurement.Operations);
    close(Number(printed[3]), measurement.Nanoseconds);
    close(Number(printed[3]), Number(actual[3]) - correction * measurement.Operations);
    const value = measurement.Nanoseconds / measurement.Operations;
    close(value, benchmark.Statistics.OriginalValues[index]);
    return value;
  });
  const stats = benchmark.Statistics, deviation = Math.sqrt(variance(values));
  for (const [field, value] of Object.entries({ Mean: mean(values), StandardDeviation: deviation,
    Variance: variance(values), Median: median(values), Min: Math.min(...values), Max: Math.max(...values),
    StandardError: deviation / Math.sqrt(8) })) close(stats[field], value);
  const memory = benchmark.Memory;
  assert.equal(memory.TotalOperations, native.gc[4]);
  assert.equal(memory.BytesAllocatedPerOperation, Math.floor(native.gc[3] / native.gc[4]));
  assert.deepEqual([memory.Gen0Collections, memory.Gen1Collections, memory.Gen2Collections], native.gc.slice(0, 3));
  return { fieldCount: count, registryState: state, n: 8, meanNs: mean(values), standardDeviationNs: deviation,
    medianNs: median(values), cvPercent: 100 * deviation / mean(values),
    allocatedBytesPerOperation: memory.BytesAllocatedPerOperation, rawResultNsPerOperation: values };
});
assert.deepEqual(profiles.map(item => `${item.fieldCount}:${item.registryState}`).sort(), expectedProfiles);
let live = null;
if (flags.includes('--live-source') || flags.includes('--consumer')) {
  const root = option('--live-source'), consumer = option('--consumer');
  assert.ok(root && consumer, 'Both explicit live paths are required.');
  const git = arguments_ => {
    const result = spawnSync('git', arguments_, { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  assert.equal(git(['rev-parse', 'HEAD']), inputs.baseline);
  assert.equal(git(['branch', '--show-current']), inputs.branch);
  assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '');
  assert.deepEqual(git(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).sort(),
    inputs.preservedUntrackedReports.map(item => item.path).sort());
  for (const item of [...inputs.sourceFiles, ...inputs.preservedUntrackedReports])
    assert.equal(sha(path.join(root, ...item.path.split('\\'))), item.sha256);
  const walk = folder => fs.readdirSync(folder, { withFileTypes: true })
    .flatMap(item => item.isDirectory() ? walk(path.join(folder, item.name)) : [path.join(folder, item.name)]);
  assert.deepEqual(walk(consumer).map(file => path.relative(consumer, file)).sort(), [...closureByName.keys()].sort());
  for (const item of closure.files) assert.equal(sha(path.join(consumer, ...item.path.split('\\'))), item.sha256);
  let assemblyBindings = 0;
  for (const runtime of runtimeRecords) for (const assembly of runtime.assemblies) {
    assert.equal(sha(assembly.location), assembly.sha256);
    assemblyBindings++;
  }
  live = { actualFrozenConsumerEntriesRehashed: 131, actualLoadedAssemblyBindingsRehashed: assemblyBindings,
    actualSourceAndFourUntrackedReportsPreserved: true,
    actualPortablePdbIndependentlyDecodedByThisNodeAudit: false };
}
const result = { candidate: 'F041', actualOptimizedCandidateExists: false, actualSourceComparisons: 0,
  actualOriginalOnlyInvocations: 1, actualOriginalOnlyProfiles: 6, actualRawResultsCrossChecked: 48,
  actualMeansSampleSdVarianceSeMedianMinMaxRecomputed: true, actualConsoleGcArithmeticCrossChecked: true,
  actualCharacterizationCases: 10, actualUntimedLifecycles: 6, actualExistingInputBaseRows: 21,
  actualSkippedRows: 0, actualSelectedSourcePdbAssociationsRecordedPerImageCheck: 8,
  actualCompleteCompilerProvenanceClaimed: false, profiles };
if (flags.includes('--write'))
  fs.writeFileSync(located('audit-original-only.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
else assert.deepEqual(result, read('audit-original-only.json'));
let capsuleFiles = 0;
if (fs.existsSync(located('capsule-file-hashes.json'))) for (const item of read('capsule-file-hashes.json').files) {
  assert.equal(sha(located(item.path)), item.sha256);
  capsuleFiles++;
}
console.log(JSON.stringify({ actualCoreEvidenceAuditPassed: true, actualOriginalOnlyProfiles: 6,
  actualRawResultsCrossChecked: 48, actualUniquePhysicalFilesRehashed: hashed.size,
  actualCapsuleFilesRehashed: capsuleFiles, live,
  trxBoundary: 'Actual TRX XML independently parsed by F041-audit-trx.ps1; this Node audit checks its exact bytes and complete recorded execution identities.',
  profiles: profiles.map(({ rawResultNsPerOperation, ...profile }) => profile) }, null, 2));
