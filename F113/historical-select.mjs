import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'autoperf-runs', 'F113');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, ''));
const budget = read('measurement-budget.json');
assert.equal(budget.closed, false);
assert.deepEqual([budget.startedSourceComparisons, budget.completedSourceComparisons, budget.completedProfiles.length], [3, 3, 6]);
assert.equal(read('resource-check-original-settings.json').failed, 7);
assert.equal(read('resource-check-candidate1-settings.json').passed, 7);
assert.equal(read('format-execution.json').exitCode, 0);
for (const label of ['original-final', 'candidate1-final']) assert.equal(read(`tests\\${label}\\test-audit.json`).passed, 19);
const pairs = [];
for (let comparison = 1; comparison <= 3; comparison++)
{
    const reports = Object.fromEntries(['original', 'candidate1'].map(variant =>
    {
        const directory = path.join(root, 'measurements', `comparison${comparison}`, variant, 'results');
        const files = fs.readdirSync(directory).filter(name => /-report-full.*\.json$/.test(name));
        assert.equal(files.length, 1);

        return [variant, JSON.parse(fs.readFileSync(path.join(directory, files[0]), 'utf8'))];
    }));
    assert.equal(reports.original.Benchmarks.length, 28);
    for (const original of reports.original.Benchmarks)
    {
        const candidate = reports.candidate1.Benchmarks.find(row => row.FullName === original.FullName);
        assert(candidate && original.Statistics.N === 8 && candidate.Statistics.N === 8);
        const label = original.FullName.match(/\(Case: "([^"]+)"\)$/)?.[1]; assert(label);
        pairs.push({ comparison, label, originalMeanNs: original.Statistics.Mean, candidateMeanNs: candidate.Statistics.Mean,
            timeReductionPercent: 100 * (1 - candidate.Statistics.Mean / original.Statistics.Mean),
            originalBytes: original.Memory.BytesAllocatedPerOperation, candidateBytes: candidate.Memory.BytesAllocatedPerOperation,
            allocationReductionPercent: 100 * (1 - candidate.Memory.BytesAllocatedPerOperation / original.Memory.BytesAllocatedPerOperation) });
    }
}
const targets = pairs.filter(row => read('acceptance.json').measurement.preselectedTargets.includes(row.label));
assert.equal(targets.length, 21);
assert(targets.every(row => row.allocationReductionPercent >= (row.label.startsWith('Miss') ? 5 : 25)));
const publicMisses = targets.filter(row => row.label.startsWith('Miss'));
assert.equal(publicMisses.length, 6);
budget.closed = true;
budget.selectedVariant = 'candidate1';
budget.closedAt = new Date().toISOString();
budget.unusedComparisons = 0;
budget.closureReason = 'All3 permitted comparisons used because public evict-plus-miss gains were below the large-win early-stop example. One minimal exact-owned-array source shape,not3 fabricated alternatives;middle pair reverses order. All7 pre-edit allocation goals pass every sample and all21 targeted BDN allocation pairs improve. Retain all84 pairs/control movements/shared-VM variability;no further profiles.';
fs.writeFileSync(path.join(root, 'measurement-budget.json'), JSON.stringify(budget, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'final-evaluation.json'), JSON.stringify({
    candidate: 'F113', selectedVariant: 'candidate1', disposition: 'measured-exact-owned-buffer-component-draft',
    sourceComparisons: 3, distinctCandidateSourceShapes: 1, maximumPermittedComparisons: 3,
    closed: true, reason: budget.closureReason, targetObservations: targets, publicMissObservations: publicMisses, allPairedObservations: pairs,
    mergeReady: false, applicationSpeedupClaimed: false, publicApiDefaultDependencyTfmChanged: false,
    implementationScope: 'Only private Encode plus focused existing-class tests;native keyLength prefix/local and owned bytes retained. Decode/workers/keys/expiration unchanged.',
    executionPolicy: 'Same actual BDN emitted generator/builder/RunnableProgram/engine,with harness-only settings-preserving executor;startup/setup/before/after Normal process/thread priority/all16CPU affinity. Guid.Empty avoids power-plan application.',
    excludedBoundary: 'No unrepresentable aggregate array capacity/OOM failure-type equivalence,LOH-cutoff,Razor/HTTP/external-store/load/production mix claim.',
}, null, 2) + '\n', { flag: 'wx' });
console.log(`F113 budget closed3/3;one selected source shape,all21 targeted BDN allocation pairs lower;all28 cases/3pairs retained.`);
