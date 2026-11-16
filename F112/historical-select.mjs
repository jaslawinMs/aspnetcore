import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'autoperf-runs', 'F112');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, ''));
const budget = read('measurement-budget.json');
assert.equal(budget.closed, false);
assert.deepEqual([budget.startedSourceComparisons, budget.completedSourceComparisons, budget.completedProfiles.length], [1, 1, 2]);
assert.equal(read('resource-check-original.json').failed, 7);
assert.equal(read('resource-check-candidate1.json').passed, 7);
const reports = Object.fromEntries(['original', 'candidate1'].map(variant =>
{
    const directory = path.join(root, 'measurements', 'comparison1', variant, 'results');
    const files = fs.readdirSync(directory).filter(name => /-report-full.*\.json$/.test(name));
    assert.equal(files.length, 1);

    return [variant, JSON.parse(fs.readFileSync(path.join(directory, files[0]), 'utf8'))];
}));
const pairs = reports.original.Benchmarks.map(original =>
{
    const candidate = reports.candidate1.Benchmarks.find(row => row.FullName === original.FullName);
    assert(candidate);
    const label = original.FullName.match(/\(Case: "([^"]+)"\)$/)?.[1];
    assert(label);

    return { label, originalMeanNs: original.Statistics.Mean, candidateMeanNs: candidate.Statistics.Mean,
        timeReductionPercent: 100 * (1 - candidate.Statistics.Mean / original.Statistics.Mean),
        originalBytes: original.Memory.BytesAllocatedPerOperation, candidateBytes: candidate.Memory.BytesAllocatedPerOperation,
        allocationReductionPercent: 100 * (1 - candidate.Memory.BytesAllocatedPerOperation / original.Memory.BytesAllocatedPerOperation) };
});
assert.equal(pairs.length, 28);
const targets = read('acceptance.json').measurement.preselectedTargets.map(label => pairs.find(row => row.label === label));
assert(targets.every(Boolean) && targets.filter(row => row.timeReductionPercent >= 50).length >= 4);
for (const label of ['original', 'candidate1'])
{
    assert.equal(read(`browser\\${label}\\execution.json`).exitCode, 0);
    assert.equal(read(`browser\\${label}-server\\shutdown.json`).bothExactProcessesGone, true);
}
assert.equal(read('format-execution.json').exitCode, 0);
budget.closed = true;
budget.selectedVariant = 'candidate1';
budget.closedAt = new Date().toISOString();
budget.unusedComparisons = 2;
budget.closureReason = 'Clear>=50percent component-time gains on at least4 predeclared large-value targets and all7 resource goals green;stop after1comparison under the user early-stop rule. All28 rows,unchanged-control movement and uncertainty retained;no more profiles.';
fs.writeFileSync(path.join(root, 'measurement-budget.json'), JSON.stringify(budget, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'final-evaluation.json'), JSON.stringify({
    candidate: 'F112', selectedVariant: 'candidate1', disposition: 'conditional-warmed-pool-component-draft',
    sourceComparisons: 1, maximumPermittedComparisons: 3, remainingComparisonsIntentionallyUnused: 2,
    closed: true, reason: budget.closureReason, targetObservations: targets, allPairedObservations: pairs,
    coldPoolMissesOrRetainedHeapMeasured: false, mergeReady: false, applicationSpeedupClaimed: false,
    f111SerializeDataChangeInherited: false, implementationScope: 'Only single-value buffer plus existing helper Compile include and focused tests.',
}, null, 2) + '\n', { flag: 'wx' });
console.log(`F112 budget closed1/3;selectedcandidate1;all7 allocation targets green;${targets.filter(row => row.timeReductionPercent >= 50).length}/7 preselected targets>=50percent lower measured component time.`);
