import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(session, 'autoperf-runs', 'F011');
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8').replace(/^\uFEFF/, ''));
const budget = read('measurement-budget.json');
assert.equal(budget.closed, true);
assert.equal(budget.originalOnlyDiagnosticProfiles, 1);
assert.equal(budget.usedComparisons, 0);
assert.equal(budget.candidateProfiles, 0);
assert.equal(read('measurements\\original-diagnostic-only\\execution.json').actualExitCode, 0);
const directory = path.join(root, 'measurements', 'original-diagnostic-only');
const exports = fs.readdirSync(path.join(directory, 'results')).filter(name => name.endsWith('full.json'));
assert.equal(exports.length, 1);
const bytes = fs.readFileSync(path.join(directory, 'results', exports[0]));
const data = JSON.parse(bytes);
assert.equal(data.Benchmarks.length, 12);
const parts = fs.readFileSync(path.join(directory, 'console.log'), 'utf8').split(/^\/\/ Benchmark: /m).slice(1);
assert.equal(parts.length, 12);
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const setupDirectory = path.join(directory, 'states');
const setups = fs.readdirSync(setupDirectory).filter(name => name.endsWith('-setup-preflight.json'))
  .map(name => read(path.join('measurements', 'original-diagnostic-only', 'states', name)));
assert.equal(setups.length, 12);
const cases = data.Benchmarks.map(benchmark => {
  const shape = benchmark.FullName.match(/^AutoPerf\.GroupSendBenchmarks\.Send\(Shape: (\w+)\)$/)?.[1];
  assert(shape);
  const matching = parts.filter(part => part.slice(0, part.indexOf('\n')).trimEnd().endsWith(`[${benchmark.Parameters}]`));
  assert.equal(matching.length, 1);
  const part = matching[0];
  const parse = kind => [...part.matchAll(new RegExp('^' + kind + '\\s+(\\d+):\\s+(\\d+) op, ([\\d.]+) ns,', 'gm'))]
    .map(match => ({ index: Number(match[1]), operations: Number(match[2]), ns: Number(match[3]) }));
  const rawActual = parse('WorkloadActual');
  const retainedResult = parse('WorkloadResult');
  const warmup = parse('WorkloadWarmup');
  const overheadActual = parse('OverheadActual');
  assert.equal(rawActual.length, 8);
  assert.equal(warmup.length, 3);
  assert.equal(retainedResult.length, benchmark.Statistics.N);
  assert(retainedResult.length >= 5 && overheadActual.length > 0);
  const setup = setups.filter(value => value.shape === shape);
  assert.equal(setup.length, 1);
  return {
    shape, groupSize: setup[0].groupSize, exclusionSize: setup[0].exclusionSize,
    actualExpectedRecipients: setup[0].actual.expectedRecipientCount,
    originalExportedParameter: benchmark.Parameters, fullExportedIdentity: benchmark.FullName,
    reportedMeanNs: benchmark.Statistics.Mean, reportedSdNs: benchmark.Statistics.StandardDeviation,
    reportedCvPercent: 100 * benchmark.Statistics.StandardDeviation / benchmark.Statistics.Mean,
    reportedRetainedN: benchmark.Statistics.N,
    allocatedProcessBytesPerOperation: benchmark.Memory.BytesAllocatedPerOperation,
    rawActual, retainedResult, warmup, overheadActual,
    allEightUnfilteredActualMeanNs: mean(rawActual.map(row => row.ns / row.operations)),
  };
});
assert.equal(new Set(cases.map(row => row.shape)).size, 12);
const analysis = {
  candidate: 'F011', mode: 'original-only-diagnostic', pairedComparisons: 0, candidateProfiles: 0,
  shippingSourceCandidates: 0, actualProfiles: 1, successfulReports: 12,
  actualWorkloadIterations: cases.reduce((sum, row) => sum + row.rawActual.length, 0),
  actualRetainedResults: cases.reduce((sum, row) => sum + row.retainedResult.length, 0),
  actualWarmups: cases.reduce((sum, row) => sum + row.warmup.length, 0),
  actualOverheadIterations: cases.reduce((sum, row) => sum + row.overheadActual.length, 0),
  fullExportSha256: crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),
  noImprovementOrAcrossInputSpeedupClaimed: true,
  statisticsPolicy: 'BDN default upper-outlier filtering; all 8 raw actual samples, actual overheads, warmups and GC records retained. These are different configured original inputs, not before/after roles.',
  allocationBoundary: 'Process-wide allocation on pinned net12 using the identical BDN0.13 DLL and explicitly attributed prior GcStats source observation; not isolated lookup, serializer, transport or owner allocation.',
  measuredBoundary: 'Repeated actual public group sends over pre-registered/grouped HubConnectionContexts, real per-send JSON serialization and 256-byte synchronous per-connection transport buffers. Includes minimal call/frame/byte counters; no unbounded Pipe growth, network, handshake, connection creation or stateful-reconnect throughput.',
  nativeAsyncBoundary: 'Actual Pipe backpressure, wait-for-every-recipient completion and cancellation separately characterized untimed with both original and captured-default JSON producers.',
  cases,
};
const evaluation = {
  candidate: 'F011', disposition: 'rejected/design-blocked',
  proposalScope: read('candidate-selection.json').proposalScope,
  performancePrJustified: false, shippingSourceChanged: false,
  originalFindingCostStillPresent: true, notMeasuredComparativeNoGain: true,
  notClaimingAllOptimizationsImpossible: true,
  originalOnlyDiagnosticProfiles: 1, pairedComparisons: 0, candidateProfiles: 0,
  existingAreaRows: 27, existingRowsFailed: 0, existingRowsSkipped: 0,
  contractChecksPerProducer: 17, actualTimedWrapperPathsPerProducer: 12,
  actualProducerVersionsCharacterized: 2, benchmarkOutcomes: 12,
  actualWorkloadIterations: analysis.actualWorkloadIterations,
  retainedResults: analysis.actualRetainedResults,
  actualWarmups: analysis.actualWarmups, actualOverheadIterations: analysis.actualOverheadIterations,
  conclusion: read('candidate-selection.json').qualifiedConclusion,
};
for (const [name, value] of [['analysis.json', analysis], ['final-evaluation.json', evaluation]]) {
  const output = path.join(root, name);
  assert(!fs.existsSync(output), 'Preserve actual extracted observations: ' + name);
  fs.writeFileSync(output, JSON.stringify(value, null, 2) + '\n');
}
for (const row of cases) {
  console.log(`${row.shape.padEnd(16)} ${row.reportedMeanNs.toFixed(3)} ns SD ${row.reportedSdNs.toFixed(3)} ns ` +
    `CV ${row.reportedCvPercent.toFixed(2)}% ${row.allocatedProcessBytesPerOperation} B/op N=${row.reportedRetainedN}`);
}
console.log(`F011: 12 original-only reports / ${analysis.actualWorkloadIterations} raw / ` +
  `${analysis.actualRetainedResults} retained / ${analysis.actualWarmups} warmups / ${analysis.actualOverheadIterations} overheads. No candidate, comparison or gain.`);
