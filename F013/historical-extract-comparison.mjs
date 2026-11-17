import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const root = path.resolve(process.argv[2]);
const comparison = Number(process.argv[3]);
assert(Number.isInteger(comparison) && comparison >= 1 && comparison <= 3);
const file = relative => path.join(root, ...relative.split(/[\\/]/));
const text = relative => fs.readFileSync(file(relative), 'utf8').replace(/^\uFEFF/, '');
const json = relative => JSON.parse(text(relative));
const sha = relative => crypto.createHash('sha256').update(fs.readFileSync(file(relative))).digest('hex').toUpperCase();
const mean = values => values.reduce((total, value) => total + value, 0) / values.length;
const shapes = ['NoConnections512', 'EmptyTargets', 'Small4List2', 'Threshold16List', 'Threshold17List',
  'C32List64Miss', 'C32Array64Miss', 'C32ReadOnly64Miss', 'C128List256Miss', 'C128Array256Miss',
  'C32List64Sparse', 'C32Array64Sparse', 'C32List64All', 'C32DupList64'];
const budget = json('measurement-budget.json');
const attempt = budget.attempts.find(value => value.comparison === comparison);
assert(attempt && attempt.state === 'completed' && attempt.failed === false);
assert.equal(attempt.profiles.length, 2);
const variants = ['native-specialization-001', 'native-specialization-002']
  .filter(variant => sha(`manifest-${variant}.json`) === attempt.manifestHashes.candidate);
assert.equal(variants.length, 1);
const variant = variants[0];
if (attempt.candidateVariant !== undefined) assert.equal(attempt.candidateVariant, variant);
assert.equal(sha('manifest-comparison-original.json'), attempt.manifestHashes.original);
const directory = `measurements/comparison-${comparison}`;
const roles = {};
for (const role of ['original', 'candidate']) {
  const command = attempt.profiles.find(value => value.role === role);
  assert(command);
  assert.deepEqual([command.actualExitCode, command.actualReports, command.expectedReports], [0, 14, 14]);
  assert(command.arguments[0].endsWith(`\\images\\${role === 'original' ? 'original' : variant}\\AutoPerf.Benchmarks.dll`));
  const exports = fs.readdirSync(file(`${directory}/${role}/results`)).filter(name => name.endsWith('full.json'));
  assert.equal(exports.length, 1);
  const exportPath = `${directory}/${role}/results/${exports[0]}`;
  const exported = json(exportPath);
  const consolePath = `${directory}/${role}.log`;
  const console = text(consolePath);
  const parts = console.split(/^\/\/ Benchmark: /m).slice(1);
  assert.deepEqual([exported.Benchmarks.length, parts.length], [14, 14]);
  const cases = exported.Benchmarks.map(benchmark => {
    const shape = benchmark.FullName.match(/^AutoPerf\.TargetedSendBenchmarks\.Send\(Shape: (\w+)\)$/)?.[1];
    assert(shapes.includes(shape), benchmark.FullName);
    const matching = parts.filter(part => part.slice(0, part.indexOf('\n')).trimEnd().endsWith(`[${benchmark.Parameters}]`));
    assert.equal(matching.length, 1);
    const part = matching[0];
    const parse = kind => [...part.matchAll(new RegExp(`^${kind}\\s+(\\d+):\\s+(\\d+) op, ([\\d.]+) ns,`, 'gm'))]
      .map(match => ({ index: Number(match[1]), operations: Number(match[2]), ns: Number(match[3]) }));
    const rawActual = parse('WorkloadActual');
    const retainedResult = parse('WorkloadResult');
    const warmup = parse('WorkloadWarmup');
    const overheadActual = parse('OverheadActual');
    assert.deepEqual([rawActual.length, warmup.length, retainedResult.length], [8, 3, benchmark.Statistics.N]);
    assert(retainedResult.length >= 5 && overheadActual.length > 0);
    const gc = part.match(/^GC:\s+(.+)$/m);
    assert(gc);
    assert(Number.isFinite(benchmark.Statistics.Mean) && benchmark.Statistics.Mean > 0);
    return {
      shape, fullExportedIdentity: benchmark.FullName, exportedParameter: benchmark.Parameters,
      reportedMeanNs: benchmark.Statistics.Mean, reportedSdNs: benchmark.Statistics.StandardDeviation,
      reportedCvPercent: 100 * benchmark.Statistics.StandardDeviation / benchmark.Statistics.Mean,
      reportedRetainedN: benchmark.Statistics.N, reportedStatistics: benchmark.Statistics,
      allocatedProcessBytesPerOperation: benchmark.Memory.BytesAllocatedPerOperation,
      reportedMemory: benchmark.Memory, gcLine: `GC: ${gc[1]}`, rawActual, retainedResult, warmup, overheadActual,
      allEightUnfilteredActualMeanNs: mean(rawActual.map(value => value.ns / value.operations)),
    };
  });
  assert.deepEqual(cases.map(value => value.shape).sort(), [...shapes].sort());
  roles[role] = {
    fullExport: exportPath, fullExportSha256: sha(exportPath), console: consolePath, consoleSha256: sha(consolePath),
    printedWarningOrOutlierLines: console.split(/\r?\n/).filter(line => /warning|multimodal|outlier|unable/i.test(line)),
    cases,
  };
}
const cases = shapes.map(shape => {
  const before = roles.original.cases.find(value => value.shape === shape);
  const after = roles.candidate.cases.find(value => value.shape === shape);
  const ratio = after.reportedMeanNs / before.reportedMeanNs;
  return {
    shape, before, after, meanTimeRatio: ratio, meanTimeChangePercent: 100 * (ratio - 1),
    allEightUncompensatedRawTimeRatio: after.allEightUnfilteredActualMeanNs / before.allEightUnfilteredActualMeanNs,
    allocationChangeBytesPerOperation: after.allocatedProcessBytesPerOperation - before.allocatedProcessBytesPerOperation,
  };
});
const all = Object.values(roles).flatMap(value => value.cases);
const result = {
  candidate: 'F013', comparison, candidateVariant: variant, order: attempt.order, actualProfiles: 2, successfulReports: all.length,
  actualWorkloadIterations: all.reduce((total, value) => total + value.rawActual.length, 0),
  actualRetainedResults: all.reduce((total, value) => total + value.retainedResult.length, 0),
  actualWarmups: all.reduce((total, value) => total + value.warmup.length, 0),
  actualOverheadIterations: all.reduce((total, value) => total + value.overheadActual.length, 0),
  allocationBoundary: 'Actual BDN0.13/net12 process-wide GC allocated bytes/op, not isolated membership/enumerator/serializer costs.',
  measuredBoundary: 'Warm actual public DefaultHubLifetimeManager.SendConnectionsAsync, live registered connections, target collection and real write/serializer pipeline. Connection/input construction and complete frame/recipient validation are outside timing.',
  statisticsPolicy: 'All8 raw actual samples, default upper-filtered reported results, warmups, actual overheads, GC and settings retained. Raw8 means explicitly include overhead. Independent role profiles, not paired per operation. No universal, production-frequency or confidence claim.',
  roles: Object.fromEntries(Object.entries(roles).map(([role, value]) => [role, {
    fullExport: value.fullExport, fullExportSha256: value.fullExportSha256,
    console: value.console, consoleSha256: value.consoleSha256, printedWarningOrOutlierLines: value.printedWarningOrOutlierLines,
  }])),
  cases,
};
const output = file(`analysis-comparison-${comparison}.json`);
assert(!fs.existsSync(output), 'Preserve an existing extraction.');
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
for (const value of cases) {
  console.log(`${value.shape.padEnd(22)} ${value.before.reportedMeanNs.toFixed(3).padStart(11)} -> ${value.after.reportedMeanNs.toFixed(3).padStart(11)} ns ${value.meanTimeChangePercent.toFixed(2).padStart(8)}% CV ${value.before.reportedCvPercent.toFixed(2)}/${value.after.reportedCvPercent.toFixed(2)} B/op ${value.before.allocatedProcessBytesPerOperation}/${value.after.allocatedProcessBytesPerOperation} N ${value.before.reportedRetainedN}/${value.after.reportedRetainedN}`);
}
console.log(`F013 C${comparison}/${variant}: ${result.successfulReports} reports/${result.actualWorkloadIterations} raw/${result.actualRetainedResults} retained/${result.actualWarmups} warmups/${result.actualOverheadIterations} actual overheads. All adverse observations retained.`);
