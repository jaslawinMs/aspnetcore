import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] ?? path.dirname(fileURLToPath(import.meta.url)));
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex').toUpperCase();
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
if (process.argv.includes('--require-seal'))
{
    for (const file of read('capsule-file-hashes.json').files)
    {
        assert.equal(fs.statSync(path.join(root, file.file)).size, file.bytes);
        assert.equal(hash(file.file), file.sha256);
    }
}
assert.equal(hash('plan.json'), read('plan-seal.json').sha256);
assert.equal(hash('accepted-images.json'), read('accepted-images-seal.json').sha256);
const budget = read('diagnostic-budget.json');
assert.equal(budget.closed, true); assert.equal(budget.authorizations.length, 3);
const plan = read('plan.json'), images = read('accepted-images.json'), decision = read('measurement-decision.json');
const qualification = read('final-qualification.json');
assert.equal(qualification.disposition, 'no-gain');
assert.equal(qualification.subtype, 'measurement-identity-inconclusive');
assert.equal(qualification.actualFinalPerformanceQualification, false);
assert.equal(qualification.actualRequiredCommonHarnessImageIdentityMet, false);
assert.equal(qualification.actualNoPerformancePrAuthorized, true);
assert.equal(hash('diagnostic-budget.json'), qualification.actualClosedBudgetPreservedSha256);
assert.equal(hash('measurement-decision.json'), qualification.actualNumericalDecisionPreservedSha256);
const inventories = {
    Original: read('canonical-preflight-005/Original/measurement-consumer-inventory.json'),
    Candidate: read('canonical-candidate-001/Candidate/measurement-consumer-inventory.json')
};
for (const role of ['Original', 'Candidate'])
{
    const inventory = role === 'Original' ? 'canonical-preflight-005/Original/' : 'canonical-candidate-001/Candidate/';
    assert.equal(hash(inventory + 'measurement-consumer-inventory.json'), images.roles[role].inventorySha256);
}
for (const difference of qualification.actualCommonMeasurementHarnessDifferences)
{
    assert.equal(inventories.Original.Files.find(row => row.File === difference.file).Sha256, difference.originalSha256);
    assert.equal(inventories.Candidate.Files.find(row => row.File === difference.file).Sha256, difference.candidateSha256);
    assert.notEqual(difference.originalSha256, difference.candidateSha256);
}
assert.equal(qualification.actualCommonMeasurementHarnessDifferences.length, 2);
const gateEvents = read('actual-exclusive-gateway-events.json');
const acquisitions = gateEvents.filter(row => row.event === 'acquired');
assert.equal(acquisitions.length, 3);
const all = [];
let samples = 0, children = 0, previous = 0;
for (const [index, authorization] of budget.authorizations.entries())
{
    assert.equal(authorization.status, 'completed');
    const directory = 'comparisons/' + String(index + 1).padStart(3, '0');
    assert.equal(hash(directory + '/result.json'), authorization.actualResultSha256);
    const acquisition = acquisitions[index];
    const release = gateEvents.find(row => row.event === 'released' && row.token === acquisition.token);
    assert.ok(release);
    if (index > 0)
    {
        const previousRelease = gateEvents.find(row => row.event === 'released' && row.token === acquisitions[index - 1].token);
        assert.ok(Date.parse(previousRelease.recordedAt) <= Date.parse(acquisition.recordedAt));
    }
    const pairs = [];
    for (const profile of [plan.primary.profile, ...plan.secondaryProfiles])
    {
        const rows = {};
        for (const role of plan.comparisonRoleOrders[index])
        {
            const prefix = directory + '/' + role + '-' + profile;
            const lifecycle = read(prefix + '.lifecycle.json');
            assert.equal(lifecycle.actualExitCode, 0); assert.equal(lifecycle.actualChildAwaitedToExit, true);
            assert.ok(Date.parse(lifecycle.startedAt) >= Date.parse(acquisition.recordedAt));
            assert.ok(Date.parse(lifecycle.completedAt) <= Date.parse(release.recordedAt));
            assert.ok(Date.parse(lifecycle.startedAt) >= previous); previous = Date.parse(lifecycle.completedAt); children++;
            const row = read(prefix + '-observation/' + profile + '.json');
            assert.equal(row.passed, true); assert.equal(row.measured, true); assert.equal(row.profile, profile); assert.equal(row.role, role);
            assert.equal(row.actualPlatform, images.actualRuntime);
            assert.equal(row.actualGeneratedOwnerSha256, images.roles[role].generatedOwnerSha256); assert.equal(row.samples.length, 15);
            for (const [sampleIndex, sample] of row.samples.entries())
            {
                assert.equal(sample.Index, sampleIndex); assert.equal(sample.Iterations, 50000);
                assert.ok(Number.isFinite(sample.NanosecondsPerOperation) && sample.NanosecondsPerOperation > 0);
                assert.ok(Number.isFinite(sample.BytesPerOperation) && sample.BytesPerOperation >= 0); samples++;
            }
            rows[role] = row;
        }
        assert.equal(rows.Original.expectedOperation, rows.Candidate.expectedOperation);
        const originalNs = median(rows.Original.samples.map(row => row.NanosecondsPerOperation));
        const candidateNs = median(rows.Candidate.samples.map(row => row.NanosecondsPerOperation));
        const originalBytes = median(rows.Original.samples.map(row => row.BytesPerOperation));
        const candidateBytes = median(rows.Candidate.samples.map(row => row.BytesPerOperation));
        pairs.push({ profile, originalNs, candidateNs, originalBytes, candidateBytes,
            lessTimePercent: (originalNs - candidateNs) / originalNs * 100, savedBytes: originalBytes - candidateBytes,
            lessAllocationPercent: originalBytes === 0 ? 0 : (originalBytes - candidateBytes) / originalBytes * 100 });
    }
    assert.deepEqual(pairs, read(directory + '/result.json').pairs); all.push(pairs);
}
assert.equal(samples, 630); assert.equal(children, 42);
const primary = all.map(rows => rows[0]);
assert.equal(median(primary.map(row => row.savedBytes)), 168);
assert.equal(median(primary.map(row => row.lessTimePercent)), decision.aggregate[0].medianPairedLessTimePercent);
assert.equal(median(primary.map(row => row.lessAllocationPercent)), decision.aggregate[0].medianPairedLessAllocationPercent);
assert.ok(median(primary.map(row => row.savedBytes)) >= 128 && median(primary.map(row => row.lessAllocationPercent)) >= 5
    && median(primary.map(row => row.lessTimePercent)) >= -3);
assert.equal(decision.actualTimeRoutePassed, false); assert.equal(decision.actualAllocationRoutePassed, true);
for (const profile of plan.secondaryProfiles)
{
    const pairs = all.map(rows => rows.find(row => row.profile === profile));
    assert.ok(pairs.filter(row => row.lessTimePercent < -10).length < 2);
    assert.ok(pairs.every(row => row.savedBytes > -16));
}
const reconstructed = read('reconstruction-paired-001/verified-reproduction.json');
assert.equal(reconstructed.actualAdditionalMeasurements, 0); assert.equal(reconstructed.actualClosedBudgetBytesUnchanged, true);
assert.deepEqual(reconstructed.actualVariants.map(row => row.actualFreshVerificationRowsPassed), [7, 7]);
assert.equal(hash('source/Candidate-measured.Emitter.cs'), hash('source/Candidate-final.Emitter.cs'));
const xml = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', path.join(root, 'F142-audit-trx.ps1'), '-CapsuleRoot', root],
    { encoding: 'utf8', windowsHide: true, maxBuffer: 1024 * 1024 });
assert.equal(xml.status, 0, xml.stderr ?? 'XML audit failed.');
console.log(JSON.stringify({ actualPortableHistoricalAuditPassed: true, actualRawSamplesRecomputed: samples,
    actualNativeMeasurementChildrenSerializedAndTerminal: children, actualNumericalAllocationGatePassed: true,
    actualTimeGatePassed: false, actualAllSecondaryControlsPassed: true, actualNoAdditionalMeasurementsExecuted: true,
    actualRequiredCommonHarnessImageIdentityMet: false, actualFinalPerformanceQualification: false,
    actualDisposition: qualification.disposition, actualSubtype: qualification.subtype, actualNoPerformancePrAuthorized: true,
    actualXmlAudit: JSON.parse(xml.stdout.replace(/^\uFEFF/, '')) }, null, 2));
