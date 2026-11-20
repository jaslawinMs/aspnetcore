import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] ?? path.dirname(fileURLToPath(import.meta.url)));
const local = relative => path.join(root, ...relative.replaceAll('\\', '/').split('/'));
const read = relative => JSON.parse(fs.readFileSync(local(relative), 'utf8'));
const sha = relative => crypto.createHash('sha256').update(fs.readFileSync(local(relative))).digest('hex').toUpperCase();
const median = values => [...values].sort((a, b) => a - b)[1];
const middle = values => {
  const sorted = [...values].sort((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[half - 1] + sorted[half]) / 2 : sorted[half];
};
const near = (a, b) => assert.ok(Math.abs(a - b) <= Math.max(1e-8, Math.abs(a) * 1e-12), `${a} != ${b}`);
const seal = read('premeasurement-validation.json');
const budget = read('diagnostic-budget.json');
const decision = read('decision.json');
const analysis = read('analysis.json');
assert.equal(budget.permanentlyClosed, true);
assert.equal(budget.authorizations.length, 3);
assert.equal(budget.completed.length, 3);
assert.equal(budget.failedOrPartialAttempts.length, 0);
assert.equal(sha('diagnostic-budget.json'), read('budget-closure.json').actualClosedBudgetSha256);
for (const [file, field] of [['acceptance-plan.json', 'acceptancePlanSha256'],
  ['baseline-completed.json', 'baselineValidationSha256'], ['candidate-correctness-completed.json', 'candidateCorrectnessSha256'],
  ['hot-reload-verified.json', 'hotReloadVerificationSha256'], ['harness/profile-definitions.json', 'profileDefinitionsSha256'],
  ['common-inputs-prepared.json', 'commonInputManifestSha256']]) assert.equal(sha(file), seal[field]);
assert.equal(decision.actualAnalysisSha256, sha('analysis.json'));
assert.equal(decision.actualClosedBudgetSha256, sha('diagnostic-budget.json'));
assert.equal(decision.actualIndependentNumericalAuditSha256, sha('independent-numerical-audit.json'));
assert.equal(decision.actualReconstructionSha256, sha('reconstruction-paired-001/verified-reproduction.json'));
for (const [file, metadata] of [['BenchmarkDotNet-0.13.0-GcStats.cs', 'BenchmarkDotNet-0.13.0-GcStats-metadata.json'],
  ['BenchmarkDotNet-0.13.0-LICENSE.md', 'BenchmarkDotNet-0.13.0-license-metadata.json']]) assert.equal(sha(file), read(metadata).sha256);
assert.ok(fs.readFileSync(local('BenchmarkDotNet-0.13.0-GcStats.cs'), 'utf8').includes('MidpointRounding.ToEven'));
const inputs = read('common-inputs-prepared.json').actualInputs;
assert.equal(inputs.length, 8);
for (const input of inputs) {
  assert.equal(sha('harness/' + input.path), input.sha256);
  assert.equal(sha('reconstruction-paired-001/project/' + input.path), input.sha256);
}
let actualXmlRows = 0;
let actualPassingXmlRows = 0;
let actualExpectedRedRows = 0;
for (const input of seal.audits) {
  assert.equal(sha(input.auditPath), input.auditSha256);
  assert.equal(sha(input.trxPath), input.trxSha256);
  const audit = read(input.auditPath);
  assert.equal(sha('F126-audit-trx.ps1'), audit.actualParserSha256);
  const result = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', local('F126-audit-trx.ps1'),
    '-TrxPath', local(input.trxPath), '-Mode', audit.mode], { encoding: 'utf8', windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const rows = JSON.parse(result.stdout);
  for (const [key, value] of Object.entries(rows)) assert.deepEqual(audit[key], value);
  actualXmlRows += rows.actualParsedRows;
  actualPassingXmlRows += rows.actualPassed;
  actualExpectedRedRows += rows.actualExpectedOriginalCacheContractFailures;
}
assert.equal(actualXmlRows, 32);
assert.equal(actualPassingXmlRows, 30);
assert.equal(actualExpectedRedRows, 2);
for (const role of seal.roles) {
  assert.equal(sha(`images/${role.role}/closure.json`), role.closureSha256);
  assert.equal(sha(`images/${role.role}/source-inputs.json`), role.sourceInputsSha256);
  for (const file of role.stateHashes) assert.equal(sha(file.path), file.sha256);
  const directory = `images/${role.role}`;
  const source = read(directory + '/source-inputs.json').sourceFiles;
  const closure = read(directory + '/closure.json').files;
  assert.equal(source.length, 26);
  assert.equal(closure.length, 352);
  for (const file of source) assert.equal(sha(directory + '/source/' + file.path), file.sha256);
  const association = role.stateHashes.find(item => item.path.endsWith('-selected-source-pdb-associations.json'));
  const proofs = read(association.path);
  assert.equal(proofs.actualPeAndPdbMatch, true);
  assert.equal(proofs.actualSelectedDocuments, 6);
  assert.equal(proofs.actualOwnerSha256, closure.find(item => item.path === 'CustomPolicyProvider.dll').sha256);
  assert.equal(proofs.actualPdbSha256, closure.find(item => item.path === 'CustomPolicyProvider.pdb').sha256);
  for (const proof of proofs.proofs) assert.equal(proof.sha256, source.find(item => item.path === proof.source).sha256);
}
const original = read('images/Original/closure.json').files;
const candidate = read('images/Candidate/closure.json').files;
assert.deepEqual(original.map(item => item.path).sort(), candidate.map(item => item.path).sort());
assert.deepEqual(candidate.filter(item => item.sha256 !== original.find(old => old.path === item.path).sha256)
  .map(item => item.path).sort(), ['CustomPolicyProvider.dll', 'CustomPolicyProvider.pdb']);
let actualRetainedSamples = 0;
let actualSettings = 0;
let actualRawGcRecords = 0;
const cells = {};
for (const pair of budget.completed) {
  const entries = {};
  for (const role of pair.completed) {
    assert.equal(sha(role.fullJson), role.fullJsonSha256);
    const data = read(role.fullJson);
    assert.equal(data.Benchmarks.length, 6);
    const sourceDirectory = `comparison-${String(pair.attempt).padStart(3, '0')}/${role.variant}`;
    const sourceResult = read(sourceDirectory + '/result.json');
    assert.equal(sourceResult.exitCode, 0);
    assert.equal(sha(sourceDirectory + '/stdout.txt'), sourceResult.stdoutSha256);
    assert.equal(sha(sourceDirectory + '/stderr.txt'), sourceResult.stderrSha256);
    const blocks = fs.readFileSync(local(sourceDirectory + '/stdout.txt'), 'utf8').split(/^\/\/ Benchmark: /m).slice(1);
    assert.equal(blocks.length, 6);
    const byDisplay = new Map(blocks.map(block => [block.split(/\r?\n/, 1)[0].trim(), block]));
    entries[role.variant] = {};
    for (const item of data.Benchmarks) {
      const native = byDisplay.get(item.DisplayInfo);
      assert.ok(native);
      const actual = [...native.matchAll(/^WorkloadActual\s+(\d+): (\d+) op, ([\d.]+) ns,/gm)];
      const results = [...native.matchAll(/^WorkloadResult\s+(\d+): (\d+) op, ([\d.]+) ns,/gm)];
      const overhead = [...native.matchAll(/^OverheadActual\s+\d+: (\d+) op, ([\d.]+) ns,/gm)];
      const gc = [...native.matchAll(/^GC:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/gm)];
      assert.equal(actual.length, 8);
      assert.equal(results.length, 8);
      assert.equal(gc.length, 1);
      assert.ok(overhead.length > 0);
      assert.equal([...native.matchAll(/^WorkloadWarmup\s+/gm)].length, 3);
      const correction = middle(overhead.map(value => Number(value[2]) / Number(value[1])));
      const rawGc = gc[0].slice(1).map(Number);
      assert.equal(item.Memory.TotalOperations, rawGc[4]);
      assert.deepEqual([item.Memory.Gen0Collections, item.Memory.Gen1Collections, item.Memory.Gen2Collections], rawGc.slice(0, 3));
      const quotient = rawGc[3] / rawGc[4];
      const integral = Math.floor(quotient);
      const rounded = quotient - integral === 0.5 ? integral + integral % 2 : Math.round(quotient);
      assert.equal(item.Memory.BytesAllocatedPerOperation, rounded);
      actualRawGcRecords++;
      const measurements = item.Measurements.filter(value => value.IterationMode === 'Workload' && value.IterationStage === 'Result');
      assert.equal(measurements.length, 8);
      assert.equal(item.Statistics.N, 8);
      let sum = 0;
      measurements.forEach((value, index) => {
        assert.equal(Number(results[index][1]), index + 1);
        assert.equal(Number(actual[index][1]), index + 1);
        assert.equal(Number(results[index][2]), value.Operations);
        assert.equal(Number(actual[index][2]), value.Operations);
        near(Number(results[index][3]), value.Nanoseconds);
        near(value.Nanoseconds, Math.max(0, Number(actual[index][3]) - correction * value.Operations));
        const ns = value.Nanoseconds / value.Operations;
        near(ns, item.Statistics.OriginalValues[index]);
        sum += ns;
        actualRetainedSamples++;
      });
      near(sum / 8, item.Statistics.Mean);
      near(middle(item.Statistics.OriginalValues), item.Statistics.Median);
      const variance = item.Statistics.OriginalValues.reduce((total, value) => total + (value - sum / 8) ** 2, 0) / 7;
      near(Math.sqrt(variance), item.Statistics.StandardDeviation);
      entries[role.variant][item.Method + '/' + item.Parameters.slice('Profile='.length)] = {
        mean: sum / 8, bytes: item.Memory.BytesAllocatedPerOperation
      };
    }
    const state = local(`comparison-${String(pair.attempt).padStart(3, '0')}/${role.variant}/states`);
    for (const file of fs.readdirSync(state).filter(name => /-settings-(before|after)\.json$/.test(name))) {
      const settings = JSON.parse(fs.readFileSync(path.join(state, file), 'utf8'));
      assert.equal(settings.processPriority, 'Normal');
      assert.equal(settings.threadPriority, 'Normal');
      assert.equal(settings.affinity, 65535);
      actualSettings++;
    }
  }
  assert.deepEqual(Object.keys(entries.Original).sort(), Object.keys(entries.Candidate).sort());
  for (const [key, before] of Object.entries(entries.Original)) {
    const after = entries.Candidate[key];
    const less = 100 * (before.mean - after.mean) / before.mean;
    const saved = before.bytes - after.bytes;
    const stored = analysis.pairs.find(item => item.attempt === pair.attempt).cells.find(item => item.key === key);
    near(less, stored.lessTimePercent);
    near(saved, stored.reportedBytesSavedPerOperation);
    (cells[key] ??= []).push({ less, saved });
  }
}
assert.equal(Object.keys(cells).length, 6);
assert.equal(actualRetainedSamples, 288);
assert.equal(actualSettings, 72);
assert.equal(actualRawGcRecords, 36);
const primary = cells['WarmRequest/MinimumAge10'];
const control = cells['CachingDisabledRequest/MinimumAge10'];
const guard = cells['DirectGetPolicy/MinimumAge10'];
const timing = median(primary.map(item => item.less)) >= 10 && primary.filter(item => item.less > 0).length >= 2
  && primary.filter((item, index) => item.less > Math.abs(control[index].less)).length >= 2;
const allocation = primary.filter((item, index) => item.saved >= 32 && item.saved - control[index].saved >= 32).length >= 2;
const rejects = median(guard.map(item => item.less)) <= -10 && guard.filter(item => item.less < 0).length >= 2
  && guard.filter((item, index) => -item.less > Math.abs(control[index].less)).length >= 2;
assert.equal(timing, false);
assert.equal(allocation, true);
assert.equal(rejects, false);
const hot = read('hot-reload-verified.json');
assert.equal(hot.actualNoRestart, true);
assert.equal(hot.actualInPlaceUpdateBatches, 2);
assert.equal(hot.actualListeningStartupMarkers, 1);
assert.equal(hot.actualSourceRestoredByteExactly, true);
assert.equal(hot.actualOwnedCleanupVerifiedAtStop, true);
assert.deepEqual(hot.actualHandlerAges, [10, 10, 11, 11, 10, 10]);
assert.equal(sha('hot-reload/actual-sample-003/watch.stdout.txt'), hot.actualWatchStdoutSha256);
assert.equal(sha('hot-reload/actual-sample-003/watch.stderr.txt'), hot.actualWatchStderrSha256);
let actualSealedFiles = 0;
if (process.argv.includes('--require-seal')) {
  const material = read('capsule-file-hashes.json');
  for (const item of material.files) {
    assert.equal(fs.statSync(local(item.path)).size, item.bytes);
    assert.equal(sha(item.path), item.sha256);
  }
  actualSealedFiles = material.files.length + 1;
}
console.log(JSON.stringify({ candidate: 'F126', actualHistoricalAuditPassed: true, actualRetainedSamples,
  actualTimingSettingsRecords: actualSettings, actualXmlRows, actualPassingXmlRows, actualExpectedRedRows,
  actualRawGcRecordsReconciled: actualRawGcRecords, actualOverheadAndNativeResultArithmeticVerified: true,
  actualEightExactCommonInputsVerified: true, actualAllocationQualificationOnly: true,
  actualTimingQualification: false, actualNoRestartHotReloadEvidenceVerified: true, actualSealedFiles,
  actualAdditionalTimingSamples: 0, actualCompiledImagesOmittedNotReexecuted: true }, null, 2));
