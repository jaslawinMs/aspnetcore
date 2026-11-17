import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] ?? path.join(here, 'autoperf-runs', 'F018'));
const verifyOnly = process.argv.includes('--verify');
const file = relative => path.join(root, ...relative.split(/[\\/]/));
const read = relative => JSON.parse(fs.readFileSync(file(relative), 'utf8').replace(/^\uFEFF/, ''));
const hash = target => crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex').toUpperCase();
const require = (condition, message) => { if (!condition) throw new Error(message); };
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
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
const shapes = acceptance.requiredBenchmarkShapes;
require(shapes.length === 24 && new Set(shapes).size === 24, 'The predeclared24 distinct shapes are required.');
const budget = read('measurement-budget.json');
const comparisons = budget.usedComparisons;
require(Number.isInteger(comparisons) && comparisons >= 1 && comparisons <= 3 && budget.maximumComparisons === 3 &&
  budget.originalProfiles === comparisons && budget.candidateProfiles === comparisons &&
  budget.originalOnlyDiagnosticProfiles === 0 && budget.sourceCandidateShapes === 1 && budget.attempts.length === comparisons,
'Only the actual1-to3 paired attempts and single candidate are allowed.');
const accounting = { reports: 0, actualWorkloadIterations: 0, retainedResults: 0, upperFiltered: 0, actualWarmups: 0,
  actualOverheadIterations: 0, settingsRecords: 0, actualProfileContracts: 0, profiles: [], sourceBindings: 0, selectedSourceDocuments: 0 };
const records = [];
for (let comparison = 1; comparison <= comparisons; comparison++) {
  const number = String(comparison).padStart(3, '0');
  const attempt = budget.attempts.find(item => item.comparison === comparison);
  require(attempt?.status === 'completed-actual48-reports' && attempt.profiles.length === 2 &&
    attempt.profiles.every(item => item.status === 'completed-actual24-reports' && item.actualExitCode === 0 && item.actualReports === 24),
  'Every reserved comparison must actually complete all48 owner reports.');
  require(equal(attempt.roleOrder, comparison === 2 ? ['candidate', 'original'] : ['original', 'candidate']),
    'Actual interleaved profile order differs.');
  for (const role of ['original', 'candidate']) {
    const relative = `measurements\\comparison-${number}\\${role}`;
    const rawPath = file(`measurement-execution\\comparison-${number}\\${role}.log`);
    const jsonPath = file(`${relative}\\results\\AutoPerf.GoogleBenchmarks-report-full.json`);
    const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8').replace(/^\uFEFF/, ''));
    const raw = fs.readFileSync(rawPath, 'utf8');
    const blocks = raw.split(/^\/\/ Benchmark: /m).slice(1);
    require(blocks.length === shapes.length && report.Benchmarks.length === shapes.length &&
      new Set(report.Benchmarks.map(item => item.FullName)).size === shapes.length, 'All24 distinct actual raw/report cases required.');
    const states = fs.readdirSync(file(`${relative}\\states`)).filter(name => name.endsWith('.json')).sort().map(name => ({
      name, data: read(`${relative}\\states\\${name}`),
    }));
    const runtime = states.filter(item => item.name.endsWith('-runtime.json'));
    require(runtime.length === 1, 'One actual runtime record required.');
    const metadata = runtime[0].data;
    require(metadata.candidate === 'F018' && metadata.context === role && metadata.mode === 'measure' &&
      metadata.hostTargetFramework === '.NETCoreApp,Version=v12.0' && metadata.ownerTargetFramework === '.NETCoreApp,Version=v12.0' &&
      metadata.actualX64Process && metadata.serverGc === true && metadata.sharedMachineNotIsolated,
    'Actual net12/x64/serverGC and shared-machine observations required.');
    const manifest = read(`contexts\\${role}\\manifest.json`);
    require(metadata.ownerSha256 === manifest.files.find(item => item.path === 'image\\Microsoft.AspNetCore.Authentication.Google.dll')?.sha256 &&
      metadata.harnessSha256 === manifest.files.find(item => item.path === 'image\\AutoPerf.Benchmarks.dll')?.sha256,
    'Actual executing Google owner/harness image binding differs.');
    const corelib = metadata.runtimeAssemblies.find(item => item.name === 'System.Private.CoreLib');
    const bdn = metadata.runtimeAssemblies.find(item => item.name === 'BenchmarkDotNet');
    require(corelib?.informationalVersion === '12.0.0-alpha.1.26562.105+dfd6ac738610ea05f42e704be82b386e71052e12' &&
      bdn?.sha256 === manifest.files.find(item => item.path === 'image\\BenchmarkDotNet.dll')?.sha256 &&
      bdn?.sha256 === '4560EE1128636D3913C3FA71B8419DD2317FB97FD331231A53AD5501D5BA5437',
    'Observed actual prerelease runtime and BDN0.13 image required.');
    const setup = states.filter(item => item.name.endsWith('-contract.json') && item.data.phase === 'setup');
    const cleanup = states.filter(item => item.name.endsWith('-contract.json') && item.data.phase === 'cleanup');
    require(setup.length === shapes.length && cleanup.length === shapes.length &&
      [...setup, ...cleanup].every(item => item.data.allAssertionsPassed && item.data.cancellationMode === null),
    'Every actual measured profile requires48 successful real producer/claim/lifetime contracts.');
    const settings = states.filter(item => /-settings-(setup|before|after)\.json$/.test(item.name));
    require(settings.length === shapes.length * 3 && settings.every(item => equal(item.data, metadata.initialSettings)) &&
      metadata.initialSettings.processPriority === 'Normal' && metadata.initialSettings.threadPriority === 'Normal',
    'Every actual setup/before/after settings point must preserve initial Normal process/thread priority and affinity.');
    const bindings = states.filter(item => item.name.includes('-source-pdb-'));
    require(bindings.length === 3 && bindings.every(item => item.data.actualPePdbBindingMatched), 'Three actual selected-source PE/PDB bindings required.');
    const documents = bindings.reduce((sum, item) => sum + item.data.documents.length, 0);
    require(documents === 8, 'Two Google,two OAuth and four harness source witnesses required.');
    accounting.settingsRecords += settings.length;
    accounting.actualProfileContracts += setup.length + cleanup.length;
    accounting.sourceBindings += bindings.length;
    accounting.selectedSourceDocuments += documents;
    for (let index = 0; index < report.Benchmarks.length; index++) {
      const benchmark = report.Benchmarks[index];
      const shape = /^AutoPerf\.GoogleBenchmarks\.Exercise\(Case: "([A-Za-z0-9_]+)"\)$/.exec(benchmark.FullName)?.[1];
      require(shapes.includes(shape) && setup[index].data.shape === shape && cleanup[index].data.shape === shape,
        'Unshortened exporter identity and ordered native fixture contracts must agree.');
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
      require(statistics.ConfidenceInterval.Margin >= 0, 'Nonnegative reported CI margin required.');
      close(statistics.ConfidenceInterval.Lower, average - statistics.ConfidenceInterval.Margin, 'Reported CI lower arithmetic');
      close(statistics.ConfidenceInterval.Upper, average + statistics.ConfidenceInterval.Margin, 'Reported CI upper arithmetic');
      const gcMatches = [...block.matchAll(/^GC:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/gm)];
      require(gcMatches.length === 1, 'One actual raw GC counter tuple required.');
      const gc = gcMatches[0].slice(1).map(Number);
      require(gc[4] > 0 && gc[4] === benchmark.Memory.TotalOperations && gc[0] === benchmark.Memory.Gen0Collections &&
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
    accounting.profiles.push({ comparison, role, actualReports: shapes.length, actualRuntime: metadata.runtime,
      actualRuntimeAssemblies: metadata.runtimeAssemblies, serverGc: metadata.serverGc,
      hostEnvironmentInfo: report.HostEnvironmentInfo, rawConsoleSha256: hash(rawPath), fullJsonSha256: hash(jsonPath) });
  }
}
require(accounting.reports === comparisons * 48 && accounting.actualWorkloadIterations === comparisons * 384 &&
  accounting.actualWarmups === comparisons * 144 && accounting.settingsRecords === comparisons * 144,
'Complete actual profile/raw/settings accounting required.');
const rows = shapes.map(shape => {
  const original = records.filter(record => record.shape === shape && record.role === 'original');
  const candidate = records.filter(record => record.shape === shape && record.role === 'candidate');
  require(original.length === comparisons && candidate.length === comparisons, 'Every shape requires every actual paired attempt.');
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
const gate = acceptance.performanceAcceptance;
const primary = gate.primaryAsciiScalingShapes.map(shape => rows.find(row => row.shape === shape));
const numericPrimaryGatePassed = primary.length === 2 && primary.every(row => row &&
  row.timeChangePercent < 0 && row.allocationChangePercent <= -gate.primaryAggregateAllocationReductionAtLeastPercent &&
  row.rounds.every(round => round.candidateBytes < round.originalBytes));
const large = rows.find(row => row.shape === 'Utf8Large64K');
const numericEarlyStopEligible = comparisons === 1 && numericPrimaryGatePassed && large.timeChangePercent <= -50;
const analysis = {
  candidate: 'F018', actualComparisonCount: comparisons, actualProfileCount: comparisons * 2,
  aggregation: 'Unweighted arithmetic mean of actual per-profile means and B/op,not pooled raw samples or independent application trials.',
  limitations: 'Shared Windows Hyper-V VM;actual prerelease net12/x64/serverGC;synthetic padding and in-memory producer,no external network/browser/full callback timed or production response distribution established. Selected PE/PDB documents are not full compiler provenance. B/op is inclusive process-wide managed GC.GetTotalAllocatedBytes(true) diagnostic accounting,not just the avoided string,not native bytes or working set. Extra owned UTF8 copy and invalid-byte fallback costs are retained;not streaming and not universal/login/production speedup.',
  statisticsChecked: 'All actual8-sample workloads,median overhead compensation,R7 upper-only filtering,retained values/counts,mean/N-1 variance/SD/SE/R7 quantiles,reported CI bound arithmetic and raw GC tuple/denominator/midpoint-even allocation rounding. Student-t quantile,host clock calibration and source-to-BDN-binary equivalence not independently reproduced.',
  numericPrimaryGatePassed, numericEarlyStopEligible, semanticAndIdentityAcceptanceRequiresSeparateAudit: true,
  accounting, rows, records,
};
if (verifyOnly) {
  require(equal(read('analysis.json'), analysis), 'Portable recomputation differs from the published analysis.');
  console.log(JSON.stringify({ verified: true, reports: accounting.reports, actualWorkloadIterations: accounting.actualWorkloadIterations,
    retainedResults: accounting.retainedResults, upperFiltered: accounting.upperFiltered,
    numericPrimaryGatePassed, numericEarlyStopEligible }, null, 2));
} else {
  require(!fs.existsSync(file('analysis.json')) && !fs.existsSync(file('measurement-accounting.json')) &&
    !fs.existsSync(file('analysis-table.md')), 'Never overwrite completed extraction evidence.');
  fs.writeFileSync(file('analysis.json'), JSON.stringify(analysis, null, 2) + '\n');
  fs.writeFileSync(file('measurement-accounting.json'), JSON.stringify(accounting, null, 2) + '\n');
  const lines = [
    '| Shape | Original us | Guarded UTF8 us | Time change | Original B/op | Guarded UTF8 B/op | Allocation change |',
    '|---|---:|---:|---:|---:|---:|---:|',
    ...rows.map(row => `| ${row.shape} | ${(row.originalMeanNs / 1000).toFixed(3)} | ${(row.candidateMeanNs / 1000).toFixed(3)} | ${row.timeChangePercent.toFixed(2)}% | ${row.originalMeanBytes.toFixed(1)} | ${row.candidateMeanBytes.toFixed(1)} | ${row.allocationChangePercent.toFixed(2)}% |`),
  ];
  fs.writeFileSync(file('analysis-table.md'), lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  console.log(JSON.stringify({ reports: accounting.reports, actualWorkloadIterations: accounting.actualWorkloadIterations,
    retainedResults: accounting.retainedResults, upperFiltered: accounting.upperFiltered,
    actualOverheadIterations: accounting.actualOverheadIterations, numericPrimaryGatePassed, numericEarlyStopEligible }, null, 2));
}
