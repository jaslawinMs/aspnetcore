import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F142');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const median = values => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length / 2)]; };
const planHash = hash(path.join(run, 'plan.json'));
assert.equal(planHash, read(path.join(run, 'plan-seal.json')).sha256);
const imagesHash = hash(path.join(run, 'accepted-images.json'));
assert.equal(imagesHash, read(path.join(run, 'accepted-images-seal.json')).sha256);
const plan = read(path.join(run, 'plan.json'));
const images = read(path.join(run, 'accepted-images.json'));
assert.equal(hash(path.join(session, 'F142-compare.mjs')), images.driverSha256);
assert.equal(hash(images.launcher), images.launcherSha256);
assert.equal(fs.existsSync(path.join(session, 'autoperf-parallelism', 'benchmark-exclusive.lease.json')), false);
const budgetPath = path.join(run, 'diagnostic-budget.json');
const budget = read(budgetPath);
assert.equal(budget.authorizations.length, 3); assert.equal(budget.closed, false);
const gates = fs.readFileSync(path.join(session, 'autoperf-parallelism', 'benchmark-gate-events.jsonl'), 'utf8')
    .trim().split(/\r?\n/).map(line => JSON.parse(line)).filter(row => row.findingId === 'F142' && row.event === 'acquired');
assert.equal(gates.length, 3);
const allEvents = fs.readFileSync(path.join(session, 'autoperf-parallelism', 'benchmark-gate-events.jsonl'), 'utf8')
    .trim().split(/\r?\n/).map(line => JSON.parse(line));
const comparisons = [];
let lastChildCompleted = 0;
let actualRawSamplesRecomputed = 0;
for (const [index, authorization] of budget.authorizations.entries())
{
    assert.equal(authorization.number, index + 1); assert.equal(authorization.status, 'completed');
    assert.equal(authorization.actualPlanSha256, planHash); assert.equal(authorization.actualAcceptedImagesSha256, imagesHash);
    assert.deepEqual(authorization.roleOrder, plan.comparisonRoleOrders[index]);
    const root = path.join(run, 'comparisons', String(index + 1).padStart(3, '0'));
    assert.equal(hash(path.join(root, 'result.json')), authorization.actualResultSha256);
    const acquired = gates[index];
    const release = allEvents.find(row => row.event === 'released' && row.token === acquired.token);
    const ended = allEvents.find(row => row.event === 'child-ended' && row.token === acquired.token);
    assert.ok(release); assert.equal(ended.actualExitCode, 0); assert.equal(ended.leaseMayRelease, true);
    const pairs = [];
    for (const profile of [plan.primary.profile, ...plan.secondaryProfiles])
    {
        const rows = {};
        for (const role of authorization.roleOrder)
        {
            const prefix = path.join(root, `${role}-${profile}`);
            const lifecycle = read(prefix + '.lifecycle.json');
            assert.equal(lifecycle.actualExitCode, 0); assert.equal(lifecycle.actualChildAwaitedToExit, true);
            assert.ok(Date.parse(lifecycle.startedAt) >= Date.parse(acquired.recordedAt));
            assert.ok(Date.parse(lifecycle.completedAt) <= Date.parse(release.recordedAt));
            assert.ok(Date.parse(lifecycle.startedAt) >= lastChildCompleted, 'Owned measurement children overlapped.');
            lastChildCompleted = Date.parse(lifecycle.completedAt);
            const row = read(path.join(prefix + '-observation', profile + '.json'));
            assert.equal(row.role, role); assert.equal(row.profile, profile);
            assert.equal(row.passed, true); assert.equal(row.measured, true);
            assert.equal(row.actualGeneratedOwnerSha256, images.roles[role].generatedOwnerSha256);
            assert.equal(row.actualPlatform, images.actualRuntime); assert.equal(row.samples.length, 15);
            for (const [sampleIndex, sample] of row.samples.entries())
            {
                assert.equal(sample.Index, sampleIndex); assert.equal(sample.Iterations, 50000);
                assert.ok(Number.isFinite(sample.NanosecondsPerOperation) && sample.NanosecondsPerOperation > 0);
                assert.ok(Number.isFinite(sample.BytesPerOperation) && sample.BytesPerOperation >= 0);
                actualRawSamplesRecomputed++;
            }
            rows[role] = row;
        }
        assert.equal(rows.Original.expectedOperation, rows.Candidate.expectedOperation);
        const originalNs = median(rows.Original.samples.map(row => row.NanosecondsPerOperation));
        const candidateNs = median(rows.Candidate.samples.map(row => row.NanosecondsPerOperation));
        const originalBytes = median(rows.Original.samples.map(row => row.BytesPerOperation));
        const candidateBytes = median(rows.Candidate.samples.map(row => row.BytesPerOperation));
        pairs.push({ profile, originalNs, candidateNs, originalBytes, candidateBytes,
            lessTimePercent: (originalNs - candidateNs) / originalNs * 100,
            savedBytes: originalBytes - candidateBytes,
            lessAllocationPercent: originalBytes === 0 ? 0 : (originalBytes - candidateBytes) / originalBytes * 100 });
    }
    assert.deepEqual(pairs, read(path.join(root, 'result.json')).pairs);
    comparisons.push(pairs);
}
const aggregate = [plan.primary.profile, ...plan.secondaryProfiles].map(profile =>
{
    const rows = comparisons.map(pairs => pairs.find(pair => pair.profile === profile));
    return { profile, medianOriginalNs: median(rows.map(row => row.originalNs)), medianCandidateNs: median(rows.map(row => row.candidateNs)),
        medianOriginalBytes: median(rows.map(row => row.originalBytes)), medianCandidateBytes: median(rows.map(row => row.candidateBytes)),
        medianPairedLessTimePercent: median(rows.map(row => row.lessTimePercent)), medianPairedSavedBytes: median(rows.map(row => row.savedBytes)),
        medianPairedLessAllocationPercent: median(rows.map(row => row.lessAllocationPercent)),
        elapsedRegressionsGreaterThan10Percent: rows.filter(row => row.lessTimePercent < -10).length,
        allocationIncreasesAtLeast16Bytes: rows.filter(row => row.savedBytes <= -16).length };
});
const primary = aggregate[0];
const controlsPass = aggregate.slice(1).every(row => row.elapsedRegressionsGreaterThan10Percent < 2 && row.allocationIncreasesAtLeast16Bytes === 0);
const timeRoutePass = primary.medianPairedLessTimePercent >= 10 && primary.medianPairedSavedBytes >= 0;
const allocationRoutePass = primary.medianPairedSavedBytes >= 128 && primary.medianPairedLessAllocationPercent >= 5
    && primary.medianPairedLessTimePercent >= -3;
const decision = { recordedAt: new Date().toISOString(), actualPlanSha256: planHash, actualAcceptedImagesSha256: imagesHash,
    actualThreeAuthorizationsComplete: true, actualAll42NativeMeasurementChildrenSerializedAndTerminal: true,
    actualRawSamplesRecomputed, aggregate, actualTimeRoutePassed: timeRoutePass, actualAllocationRoutePassed: allocationRoutePass,
    actualSecondaryControlsPassed: controlsPass, actualPredeclaredUsefulGainGatePassed: controlsPass && (timeRoutePass || allocationRoutePass),
    actualQualification: 'Focused allocation efficiency in the warm isolated real generated operation transformer; not whole-document or application throughput.',
    remainingBeforeAnyPR: ['Update dependent generated-code snapshot baselines and run relevant existing tests.', 'Publish runnable benchmark/evidence and precise limitations; no source or primary tuning.'] };
fs.writeFileSync(path.join(run, 'measurement-decision.json'), JSON.stringify(decision, null, 2) + '\n', { flag: 'wx' });
Object.assign(budget, { closed: true, closedAt: decision.recordedAt,
    closureReason: 'All three fixed canonical authorizations completed; no further F142 timing, tuning, primary substitution or replay is permitted.',
    actualDecisionSha256: hash(path.join(run, 'measurement-decision.json')) });
fs.writeFileSync(budgetPath, JSON.stringify(budget, null, 2) + '\n');
console.log(JSON.stringify(decision, null, 2));
