import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(session, 'autoperf-runs', 'F112');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const [label = 'original', flag] = process.argv.slice(2);
assert(/^[a-z0-9-]+$/.test(label));
const goalFile = path.join(root, 'resource-goals.json');
if (flag === '--initialize')
{
    assert.equal(label, 'original');
    assert(!fs.existsSync(goalFile), 'Never retune the acceptance goal after observing candidates.');
    const sourceFile = 'C:\\src\\aspnetcore\\src\\Components\\Endpoints\\src\\Serialization\\JsonStoredDataSerializer.cs';
    const original = read(path.join(root, 'producer-source-copies.json')).find(row => row.path.endsWith('Serialization\\JsonStoredDataSerializer.cs'));
    assert.equal(sha(sourceFile), original.rawSha256, 'Define absolute resource goals before shipping edits.');
    const acceptance = read(path.join(root, 'acceptance.json'));
    const goals = acceptance.measurement.preselectedTargets.map(Label =>
    {
        const caliperFile = path.join(root, 'characterization', 'original', 'states', `caliper-${Label}.json`);
        const caliper = read(caliperFile);
        assert.equal(caliper.samples.length, 5);
        const originalMinimumBytesPerOperation = Math.min(...caliper.samples.map(row => row.bytesPerOperation));

        return { Label, originalCaliperSha256: sha(caliperFile), originalMinimumBytesPerOperation,
            maximumCandidateBytesPerOperation: originalMinimumBytesPerOperation * 0.75 };
    });
    fs.writeFileSync(goalFile, JSON.stringify({ candidate: 'F112', definedAt: new Date().toISOString(),
        exactOriginalOwnerSourceSha256: original.rawSha256, definition: 'All5 same-thread samples<=75percent of original minimum,each of7 preselected targets.',
        goals }, null, 2) + '\n', { flag: 'wx' });
}
const goals = read(goalFile);
const outcomes = goals.goals.map(goal =>
{
    const actualFile = path.join(root, 'characterization', label, 'states', `caliper-${goal.Label}.json`);
    const actual = read(actualFile);
    assert.equal(actual.samples.length, 5);
    const samples = actual.samples.map(row => ({ sample: row.sample, bytesPerOperation: row.bytesPerOperation,
        passed: row.bytesPerOperation <= goal.maximumCandidateBytesPerOperation }));

    return { ...goal, actualCaliperSha256: sha(actualFile), samples, passed: samples.every(row => row.passed) };
});
const passed = outcomes.filter(row => row.passed).length;
const output = path.join(root, `resource-check-${label}.json`);
assert(!fs.existsSync(output), 'Preserve every resource result.');
fs.writeFileSync(output, JSON.stringify({ candidate: 'F112', label, resourceGoalsSha256: sha(goalFile),
    expectedOriginalFailures: label === 'original' ? 7 : null, passed, failed: outcomes.length - passed,
    outcomes, note: 'Diagnostic same-thread allocation checks,not extra BDN timing profiles or cold/retained-heap measurements.' }, null, 2) + '\n', { flag: 'wx' });
assert.equal(passed, label === 'original' ? 0 : 7, 'Every exact expected original-red or candidate-green resource case must agree.');
console.log(`F112:${label}:resource goals ${passed}/7green,${7 - passed}/7red;all35 individual samples inspected.`);
