import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F126');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const budget = read(path.join(run, 'diagnostic-budget.json'));
assert.equal(budget.permanentlyClosed, true);
assert.equal(budget.authorizations.length, 3);
assert.equal(budget.completed.length, 3);
assert.equal(sha(path.join(run, 'diagnostic-budget.json')), read(path.join(run, 'budget-closure.json')).actualClosedBudgetSha256);
const expected = ['WarmRequest', 'CachingDisabledRequest', 'DirectGetPolicy']
  .flatMap(method => ['MinimumAge10', 'MinimumAge50'].map(profile => `${method}/${profile}`)).sort();
const rawCases = [];
const pairs = [];
let actualTimingSettingsRecords = 0;
let actualRuntimeRecords = 0;
for (const pair of budget.completed) {
  const parsed = {};
  const receipt = read(path.join(run, `comparison-${String(pair.attempt).padStart(3, '0')}`, 'execution-receipt.json'));
  for (const role of receipt.completed) {
    const file = path.join(run, ...role.fullJson.split('/'));
    assert.equal(sha(file), role.fullJsonSha256);
    const report = read(file);
    const entries = {};
    for (const item of report.Benchmarks) {
      assert.match(item.Parameters, /^Profile=MinimumAge(?:10|50)$/);
      const profile = item.Parameters.slice('Profile='.length);
      const key = `${item.Method}/${profile}`;
      assert.equal(Object.hasOwn(entries, key), false);
      const values = item.Statistics.OriginalValues;
      assert.equal(values.length, 8);
      assert.equal(item.Statistics.N, 8);
      assert.ok(values.every(value => Number.isFinite(value) && value > 0));
      const actual = item.Measurements.filter(value => value.IterationMode === 'Workload' && value.IterationStage === 'Result');
      assert.equal(actual.length, 8);
      actual.forEach((value, index) => {
        assert.ok(value.Operations > 0 && value.Nanoseconds > 0);
        assert.ok(Math.abs(value.Nanoseconds / value.Operations - values[index]) <= Math.max(1e-8, values[index] * 1e-12));
      });
      const mean = average(values);
      assert.ok(Math.abs(mean - item.Statistics.Mean) <= Math.max(1e-8, mean * 1e-12));
      assert.ok(Number.isFinite(item.Memory.BytesAllocatedPerOperation));
      assert.ok(item.DisplayInfo.includes('OutlierMode=DontRemove') && item.DisplayInfo.includes('WarmupCount=3')
        && item.DisplayInfo.includes('IterationCount=8') && item.DisplayInfo.includes('UnrollFactor=1')
        && item.DisplayInfo.includes('PowerPlanMode=00000000-0000-0000-0000-000000000000'));
      const entry = {
        attempt: pair.attempt, role: role.variant, key, method: item.Method, profile,
        meanNanoseconds: mean, reportedMeanNanoseconds: item.Statistics.Mean,
        retainedNanoseconds: values, standardDeviation: item.Statistics.StandardDeviation,
        confidenceInterval: item.Statistics.ConfidenceInterval, actualMemory: item.Memory,
        reportedBytesPerOperation: item.Memory.BytesAllocatedPerOperation,
        actualAllOutliersRetained: item.Statistics.AllOutliers, sourceReport: role.fullJson
      };
      entries[key] = entry;
      rawCases.push(entry);
    }
    assert.deepEqual(Object.keys(entries).sort(), expected);
    parsed[role.variant] = entries;
    const state = path.join(run, `comparison-${String(pair.attempt).padStart(3, '0')}`, role.variant, 'states');
    const names = fs.readdirSync(state);
    for (const name of names.filter(name => /-settings-(before|after)\.json$/.test(name))) {
      const settings = read(path.join(state, name));
      assert.equal(settings.processPriority, 'Normal');
      assert.equal(settings.threadPriority, 'Normal');
      assert.equal(settings.affinity, 65535);
      actualTimingSettingsRecords++;
    }
    for (const name of names.filter(name => /-runtime-measure-(before|after)\.json$/.test(name))) {
      const runtime = read(path.join(state, name));
      assert.equal(runtime.version, '12.0.0');
      actualRuntimeRecords++;
    }
    assert.equal(names.filter(name => name.endsWith('-case-setup.json')).length, 6);
    assert.equal(names.filter(name => name.endsWith('-case-cleanup.json')).length, 6);
  }
  const cells = expected.map(key => {
    const original = parsed.Original[key];
    const candidate = parsed.Candidate[key];
    return {
      key, originalMeanNanoseconds: original.meanNanoseconds, candidateMeanNanoseconds: candidate.meanNanoseconds,
      lessTimePercent: 100 * (original.meanNanoseconds - candidate.meanNanoseconds) / original.meanNanoseconds,
      originalReportedBytesPerOperation: original.reportedBytesPerOperation,
      candidateReportedBytesPerOperation: candidate.reportedBytesPerOperation,
      reportedBytesSavedPerOperation: original.reportedBytesPerOperation - candidate.reportedBytesPerOperation
    };
  });
  pairs.push({ attempt: pair.attempt, order: pair.order, cells });
}
assert.equal(rawCases.length, 36);
assert.equal(actualRuntimeRecords, 12);
assert.equal(actualTimingSettingsRecords, 72);
const aggregates = expected.map(key => {
  const cells = pairs.map(pair => pair.cells.find(cell => cell.key === key));
  return {
    key, pairedLessTimePercent: cells.map(cell => cell.lessTimePercent),
    medianLessTimePercent: median(cells.map(cell => cell.lessTimePercent)),
    pairedReportedBytesSaved: cells.map(cell => cell.reportedBytesSavedPerOperation),
    medianReportedBytesSaved: median(cells.map(cell => cell.reportedBytesSavedPerOperation))
  };
});
const primary = aggregates.find(item => item.key === 'WarmRequest/MinimumAge10');
const matched = aggregates.find(item => item.key === 'CachingDisabledRequest/MinimumAge10');
const guard = aggregates.find(item => item.key === 'DirectGetPolicy/MinimumAge10');
const timingFasterPairs = primary.pairedLessTimePercent.filter(value => value > 0).length;
const timingBeatsMatchedPairs = primary.pairedLessTimePercent.filter((value, index) => value > Math.abs(matched.pairedLessTimePercent[index])).length;
const allocationQualifiedPairs = primary.pairedReportedBytesSaved.filter((value, index) =>
  value >= 32 && value - matched.pairedReportedBytesSaved[index] >= 32).length;
const slowerGuardPairs = guard.pairedLessTimePercent.filter(value => value < 0).length;
const adverseGuardExceedsMatchedPairs = guard.pairedLessTimePercent.filter((value, index) =>
  -value > Math.abs(matched.pairedLessTimePercent[index])).length;
const timingQualified = primary.medianLessTimePercent >= 10 && timingFasterPairs >= 2 && timingBeatsMatchedPairs >= 2;
const allocationQualified = allocationQualifiedPairs >= 2;
const guardRejects = guard.medianLessTimePercent <= -10 && slowerGuardPairs >= 2 && adverseGuardExceedsMatchedPairs >= 2;
const result = {
  candidate: 'F126', actualClosedBudgetSha256: sha(path.join(run, 'diagnostic-budget.json')),
  actualPrimary: primary.key, actualMatchedControl: matched.key, actualGuard: guard.key,
  actualCompleteComparisons: pairs.length, actualCases: rawCases.length,
  actualRetainedObservations: rawCases.reduce((sum, item) => sum + item.retainedNanoseconds.length, 0),
  actualTimingSettingsRecords, actualMeasurementRuntimeRecords: actualRuntimeRecords,
  actualGates: { timingQualified, allocationQualified, guardRejects, timingFasterPairs, timingBeatsMatchedPairs,
    allocationQualifiedPairs, slowerGuardPairs, adverseGuardExceedsMatchedPairs },
  actualVerdict: !guardRejects && (timingQualified || allocationQualified) ? 'qualified' : 'no-gain',
  actualBoundary: 'Actual source-built sample routed TestServer requests with disabled logging, ephemeral data protection and the documented lightweight counting observer. No network or general framework/application throughput claim.',
  pairs, aggregates, rawCases
};
fs.writeFileSync(path.join(run, 'analysis.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualVerdict: result.actualVerdict, actualGates: result.actualGates,
  actualRetainedObservations: result.actualRetainedObservations, aggregates }, null, 2));
