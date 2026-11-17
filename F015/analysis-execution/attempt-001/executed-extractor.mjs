import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] ?? path.join(session, 'autoperf-runs', 'F015'));
const verifyOnly = process.argv.includes('--verify');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const require = (condition, message) => { if (!condition) throw new Error(message); };
const close = (actual, expected, message) => require(Number.isFinite(actual) && Number.isFinite(expected) &&
  Math.abs(actual - expected) <= Math.max(1e-6, Math.abs(expected) * 1e-11), `${message}: ${actual} != ${expected}`);
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const quantile = (values, fraction) => {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index);
  return sorted[lower] + (sorted[Math.min(lower + 1, sorted.length - 1)] - sorted[lower]) * (index - lower);
};
const roundEven = value => {
  const floor = Math.floor(value);
  return value - floor === 0.5 ? floor + (floor % 2) : Math.round(value);
};
const acceptance = read('acceptance.json');
const shapes = acceptance.proposed_benchmark_shapes;
const budget = read('measurement-budget.json');
require(budget.closed && budget.usedComparisons === 3 && budget.originalProfiles === 3 && budget.candidateProfiles === 3 &&
  budget.originalOnlyDiagnosticProfiles === 0 && budget.sourceCandidateShapes === 1, 'Actual closed3-comparison/6-profile budget required.');
const accounting = { reports: 0, actualWorkloadIterations: 0, retainedResults: 0, upperFiltered: 0, actualWarmups: 0,
  actualOverheadIterations: 0, settingsRecords: 0, actualRoundtripRecords: 0, profiles: [], sourceBindings: 0, selectedSourceDocuments: 0 };
const records = [];
for (let comparison = 1; comparison <= 3; comparison++) {
  const number = String(comparison).padStart(3, '0');
  const attempt = budget.attempts.find(item => item.comparison === comparison);
  require(attempt?.state === 'completed-actual28-reports', 'Every reserved comparison must actually complete.');
  require(JSON.stringify(attempt.roleOrder) === JSON.stringify(comparison === 2 ? ['candidate', 'original'] : ['original', 'candidate']),
    'Actual interleaved profile order differs.');
  for (const role of ['original', 'candidate']) {
    const relative = path.join('measurements', `comparison-${number}`, role);
    const rawPath = path.join(root, 'measurement-execution', `comparison-${number}`, role + '.log');
    const jsonPath = path.join(root, relative, 'results', 'AutoPerf.EncryptionBenchmarks-report-full.json');
    const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8').replace(/^\uFEFF/, ''));
    const raw = fs.readFileSync(rawPath, 'utf8');
    const blocks = raw.split(/^\/\/ Benchmark: /m).slice(1);
    require(blocks.length === shapes.length && report.Benchmarks.length === shapes.length, 'Actual14 raw/report cases required.');
    const stateDirectory = path.join(root, relative, 'states');
    const states = fs.readdirSync(stateDirectory).filter(file => file.endsWith('.json')).sort().map(file => ({
      file, data: JSON.parse(fs.readFileSync(path.join(stateDirectory, file), 'utf8')),
    }));
    const runtime = states.filter(item => item.file.endsWith('-runtime.json'));
    require(runtime.length === 1, 'One actual runtime record required.');
    const metadata = runtime[0].data;
    require(metadata.hostTargetFramework === '.NETFramework,Version=v4.7.2' &&
      metadata.ownerTargetFramework === '.NETFramework,Version=v4.6.2' && metadata.actualX64Process &&
      metadata.actualCorelibFileVersion.startsWith('4.8.10008.0') && metadata.serverGc === false,
    'Actual Framework4.8/x64/concurrent workstation and actual net462 product must be observed.');
    const manifest = read(path.join('framework-contexts', role, 'context-manifest.json'));
    const ownerEntry = manifest.files.find(file => file.path === 'image\\Microsoft.AspNetCore.DataProtection.dll');
    const harnessEntry = manifest.files.find(file => file.path === 'image\\AutoPerf.Benchmarks.exe');
    require(metadata.ownerSha256 === ownerEntry.sha256 && metadata.harnessSha256 === harnessEntry.sha256, 'Runtime image binding differs.');
    const setup = states.filter(item => item.file.endsWith('-native-roundtrip.json') && item.data.phase === 'untimed-global-setup');
    const cleanup = states.filter(item => item.file.endsWith('-native-roundtrip.json') && item.data.phase === 'untimed-global-cleanup');
    require(setup.length === 14 && cleanup.length === 14, 'Every actual Framework benchmark setup/cleanup must validate.');
    for (const phase of [setup, cleanup]) {
      require(new Set(phase.map(item => item.data.shape)).size === 14 && shapes.every(shape => phase.some(item => item.data.shape === shape)),
        'Actual setup/cleanup shape inventory differs.');
      for (const item of phase) {
        require(item.data.actualPayloadLength === item.data.expectedPayloadLength &&
          item.data.actualDecryptedLength === item.data.plaintextLength && item.data.inputBuffersUnchanged &&
          item.data.actualPublicFactory && item.data.realDefaultOperationRandomness &&
          item.data.plaintextOffset === 3 && item.data.aadOffset === 5 && item.data.ciphertextOffset === 4,
        'A real factory/offset/input/roundtrip check failed.');
      }
    }
    const settings = states.filter(item => /-settings-(before|after)\.json$/.test(item.file));
    require(settings.length === 28 && settings.every(item => JSON.stringify(item.data) === JSON.stringify(metadata.initialSettings)),
      'Every actual per-case settings point must match initial process/thread/affinity.');
    const bindings = states.filter(item => item.file.startsWith('000') && item.file.includes('-source-pdb-'));
    require(bindings.length === 2 && bindings.every(item => item.data.actualPePdbBindingMatched), 'Two actual selected-source PE/PDB bindings required.');
    const documents = bindings.reduce((sum, item) => sum + item.data.documents.length, 0);
    require(documents === 11, 'Seven owner/factory/producer and four harness source witnesses required.');
    accounting.settingsRecords += settings.length;
    accounting.actualRoundtripRecords += setup.length + cleanup.length;
    accounting.sourceBindings += bindings.length;
    accounting.selectedSourceDocuments += documents;
    for (let index = 0; index < report.Benchmarks.length; index++) {
      const benchmark = report.Benchmarks[index];
      const shape = benchmark.Parameters.replace(/^Shape=/, '');
      require(shapes.includes(shape) && setup[index].data.shape === shape && cleanup[index].data.shape === shape,
        'Full exporter parameters and actual native ordered fixture states must disambiguate shortened raw display names.');
      const block = blocks[index];
      const parse = stage => [...block.matchAll(new RegExp(`^${stage}\\s+(\\d+):\\s+(\\d+) op,\\s+([0-9.]+) ns,`, 'gm'))]
        .map(match => ({ iteration: Number(match[1]), operations: Number(match[2]), nanoseconds: Number(match[3]) }));
      const actual = parse('WorkloadActual');
      const results = parse('WorkloadResult');
      const overhead = parse('OverheadActual');
      const warmups = parse('WorkloadWarmup');
      require(actual.length === 8 && warmups.length === 3 && overhead.length > 0 && results.length >= 5,
        'Actual8 workloads/3 warmups/recorded overheads required.');
      const overheadMedian = quantile(overhead.map(item => item.nanoseconds / item.operations), 0.5);
      const compensated = actual.map(item => Math.max(0, item.nanoseconds / item.operations - overheadMedian));
      const q1 = quantile(compensated, 0.25), q3 = quantile(compensated, 0.75);
      const upperFence = q3 + 1.5 * (q3 - q1);
      const kept = compensated.filter(value => value <= upperFence);
      require(kept.length === results.length && benchmark.Statistics.N === results.length &&
        benchmark.Measurements.length === results.length, 'Actual upper filtering and retained sample counts differ.');
      const values = benchmark.Statistics.OriginalValues;
      require(values.length === results.length, 'Retained OriginalValues length differs.');
      for (let sample = 0; sample < kept.length; sample++) {
        close(kept[sample], values[sample], 'Median-overhead-compensated retained raw value');
        close(results[sample].nanoseconds / results[sample].operations, values[sample], 'Raw retained WorkloadResult');
        const exported = benchmark.Measurements[sample];
        require(exported.IterationMode === 'Workload' && exported.IterationStage === 'Result', 'Exporter result stage differs.');
        close(exported.Nanoseconds / exported.Operations, values[sample], 'Exported retained measurement');
      }
      const statistics = benchmark.Statistics;
      const average = mean(values);
      const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
      close(statistics.Mean, average, 'Mean');
      close(statistics.Variance, variance, 'N-1 variance');
      close(statistics.StandardDeviation, Math.sqrt(variance), 'Sample deviation');
      close(statistics.StandardError, Math.sqrt(variance / values.length), 'Standard error');
      for (const [field, fraction] of [['Min', 0], ['Q1', 0.25], ['Median', 0.5], ['Q3', 0.75], ['Max', 1]]) {
        close(statistics[field], quantile(values, fraction), 'R7 ' + field);
      }
      close(statistics.ConfidenceInterval.Lower, average - statistics.ConfidenceInterval.Margin, 'Reported CI lower arithmetic');
      close(statistics.ConfidenceInterval.Upper, average + statistics.ConfidenceInterval.Margin, 'Reported CI upper arithmetic');
      const gcMatches = [...block.matchAll(/^GC:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/gm)];
      require(gcMatches.length === 1, 'One actual raw GC counter tuple required.');
      const gc = gcMatches[0].slice(1).map(Number);
      require(gc[4] === benchmark.Memory.TotalOperations && gc[0] === benchmark.Memory.Gen0Collections &&
        gc[1] === benchmark.Memory.Gen1Collections && gc[2] === benchmark.Memory.Gen2Collections,
      'Actual raw/exported GC count or denominator differs.');
      require(roundEven(gc[3] / gc[4]) === benchmark.Memory.BytesAllocatedPerOperation, 'Actual inclusive raw GC allocation rounding differs.');
      accounting.reports++;
      accounting.actualWorkloadIterations += actual.length;
      accounting.retainedResults += results.length;
      accounting.upperFiltered += actual.length - results.length;
      accounting.actualWarmups += warmups.length;
      accounting.actualOverheadIterations += overhead.length;
      records.push({ comparison, role, shape, meanNs: average, standardDeviationNs: Math.sqrt(variance),
        retainedN: values.length, actualN: actual.length, upperFiltered: actual.length - values.length,
        bytesPerOperation: benchmark.Memory.BytesAllocatedPerOperation, rawGc: gc, overheadMedianNsPerOperation: overheadMedian,
        rawConsole: path.relative(root, rawPath), rawConsoleSha256: hash(rawPath),
        fullJson: path.relative(root, jsonPath), fullJsonSha256: hash(jsonPath) });
    }
    accounting.profiles.push({ comparison, role, actualReports: 14, actualRuntime: metadata.runtime,
      actualCorelibFileVersion: metadata.actualCorelibFileVersion, serverGc: metadata.serverGc,
      hostEnvironmentInfo: report.HostEnvironmentInfo, rawConsoleSha256: hash(rawPath), fullJsonSha256: hash(jsonPath) });
  }
}
require(accounting.reports === 84 && accounting.actualWorkloadIterations === 672 && accounting.actualWarmups === 252,
  'Complete six-profile raw accounting required.');
const rows = shapes.map(shape => {
  const original = records.filter(record => record.shape === shape && record.role === 'original');
  const candidate = records.filter(record => record.shape === shape && record.role === 'candidate');
  require(original.length === 3 && candidate.length === 3, 'Every shape requires all3 paired rounds.');
  const originalMeanNs = mean(original.map(record => record.meanNs));
  const candidateMeanNs = mean(candidate.map(record => record.meanNs));
  const originalMeanBytes = mean(original.map(record => record.bytesPerOperation));
  const candidateMeanBytes = mean(candidate.map(record => record.bytesPerOperation));
  const rounds = original.map(before => {
    const after = candidate.find(record => record.comparison === before.comparison);
    return { comparison: before.comparison, originalNs: before.meanNs, candidateNs: after.meanNs,
      timeChangePercent: (after.meanNs / before.meanNs - 1) * 100,
      originalBytes: before.bytesPerOperation, candidateBytes: after.bytesPerOperation,
      originalCvPercent: before.standardDeviationNs / before.meanNs * 100,
      candidateCvPercent: after.standardDeviationNs / after.meanNs * 100 };
  });
  return { shape, originalMeanNs, candidateMeanNs, timeChangePercent: (candidateMeanNs / originalMeanNs - 1) * 100,
    originalMeanBytes, candidateMeanBytes, allocationChangePercent: (candidateMeanBytes / originalMeanBytes - 1) * 100, rounds };
});
const analysis = {
  candidate: 'F015', actualFrameworkOnlyPerformance: true, actualComparisonCount: 3, actualProfileCount: 6,
  aggregation: 'Unweighted arithmetic mean of three per-profile means and three process-inclusive B/op values, not pooled independent samples, an application result or a net12 speedup.',
  limitations: 'Shared Hyper-V Windows VM; actual .NET Framework4.8.10008/x64 concurrent workstation GC; selected PE/PDB/source witnesses not a complete compiler/binary-source proof. B/op includes actual entire managed operation/diagnostic process boundary, not just MemoryStream. No native allocation measure. Small/adverse/noisy results retained; no fourth run.',
  statisticsChecked: 'All84 raw8-sample workloads, median overhead compensation, R7 upper-only filtering, retained values/counts, means/N-1 variance/SD/SE/R7 quantiles, reported CI bound arithmetic and raw GC tuple/denominator/midpoint-even allocation rounding. Student-t quantile and host clock calibration not independently reproduced.',
  accounting, rows, records,
};
if (verifyOnly) {
  const prior = read('analysis.json');
  require(JSON.stringify(prior) === JSON.stringify(analysis), 'Portable recomputation differs from the published analysis.');
  console.log(JSON.stringify({ verified: true, ...accounting, profiles: accounting.profiles.length }, null, 2));
} else {
  require(!fs.existsSync(path.join(root, 'analysis.json')), 'Do not overwrite a completed extraction.');
  fs.writeFileSync(path.join(root, 'analysis.json'), JSON.stringify(analysis, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'measurement-accounting.json'), JSON.stringify(accounting, null, 2) + '\n');
  const lines = [
    '| Shape | Original us | Capacity us | Time change | Original B/op | Capacity B/op | Allocation change |',
    '|---|---:|---:|---:|---:|---:|---:|',
    ...rows.map(row => `| ${row.shape} | ${(row.originalMeanNs / 1000).toFixed(3)} | ${(row.candidateMeanNs / 1000).toFixed(3)} | ${row.timeChangePercent.toFixed(2)}% | ${row.originalMeanBytes.toFixed(1)} | ${row.candidateMeanBytes.toFixed(1)} | ${row.allocationChangePercent.toFixed(2)}% |`),
  ];
  fs.writeFileSync(path.join(root, 'analysis-table.md'), lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  console.log(JSON.stringify({ ...accounting, profiles: accounting.profiles.length }, null, 2));
}
