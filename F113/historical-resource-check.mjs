import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url)), root = path.join(session, 'autoperf-runs', 'F113');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const [label = 'original', flag] = process.argv.slice(2);
assert(/^[a-z0-9-]+$/.test(label));
const expectedOriginal = label === 'original' || flag === '--expect-original-red';
const goalFile = path.join(root, 'resource-goals.json');
if (flag === '--initialize')
{
    assert.equal(label, 'original'); assert(!fs.existsSync(goalFile), 'Never retune goals after observing candidates.');
    const sourceFile = 'C:\\src\\aspnetcore\\src\\Mvc\\Mvc.TagHelpers\\src\\Cache\\DistributedCacheTagHelperService.cs';
    const source = read(path.join(root, 'producer-source-copies.json')).find(row => row.path.endsWith('DistributedCacheTagHelperService.cs'));
    assert.equal(sha(sourceFile), source.rawSha256, 'Freeze absolute goals before shipping edits.');
    const acceptance = read(path.join(root, 'acceptance.json'));
    const goals = acceptance.measurement.preselectedTargets.map(Label =>
    {
        const caliperFile = path.join(root, 'characterization', 'original', 'states', `caliper-${Label}.json`);
        const caliper = read(caliperFile); assert.equal(caliper.samples.length, 5);
        const originalMinimumBytesPerOperation = Math.min(...caliper.samples.map(row => row.bytesPerOperation));
        const reductionRequiredPercent = acceptance.measurement.resourceReductionRequiredPercent[Label];
        assert(reductionRequiredPercent > 0);

        return { Label, reductionRequiredPercent, originalCaliperSha256: sha(caliperFile), originalMinimumBytesPerOperation,
            maximumCandidateBytesPerOperation: originalMinimumBytesPerOperation * (1 - reductionRequiredPercent / 100) };
    });
    fs.writeFileSync(goalFile, JSON.stringify({ candidate: 'F113', definedAt: new Date().toISOString(), exactOriginalOwnerSourceSha256: source.rawSha256,
        definition: 'All5 same-thread samples meet predeclared25percent direct/fivepercent real-miss reduction below minimum original. Every absolute goal frozen before source edit.', goals }, null, 2) + '\n', { flag: 'wx' });
}
const goals = read(goalFile);
const outcomes = goals.goals.map(goal =>
{
    const actualFile = path.join(root, 'characterization', label, 'states', `caliper-${goal.Label}.json`);
    const actual = read(actualFile); assert.equal(actual.samples.length, 5);
    const samples = actual.samples.map(row => ({ sample: row.sample, bytesPerOperation: row.bytesPerOperation,
        passed: row.bytesPerOperation <= goal.maximumCandidateBytesPerOperation }));

    return { ...goal, actualCaliperSha256: sha(actualFile), samples, passed: samples.every(row => row.passed) };
});
const passed = outcomes.filter(row => row.passed).length, output = path.join(root, `resource-check-${label}.json`);
assert(!fs.existsSync(output), 'Preserve every resource result.');
fs.writeFileSync(output, JSON.stringify({ candidate: 'F113', label, resourceGoalsSha256: sha(goalFile),
    expectedOriginalFailures: expectedOriginal ? 7 : null, passed, failed: outcomes.length - passed, outcomes,
    note: 'Associated allocation calipers,not new timing comparisons. Goals explicitly differ for direct encoder and whole prepared miss pipeline.' }, null, 2) + '\n', { flag: 'wx' });
assert.equal(passed, expectedOriginal ? 0 : 7, 'Every exact expected original-red or selected-green resource case must agree.');
console.log(`F113:${label}:resource ${passed}/7green,${7 - passed}/7red;all35 target samples inspected.`);
