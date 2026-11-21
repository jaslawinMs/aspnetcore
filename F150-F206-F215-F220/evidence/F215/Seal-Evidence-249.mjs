import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gitId, sha256, verifyMembership } from '../../autoperf-published-results/F240-F268/source-objects.mjs';

const root = import.meta.dirname;
function write(relative, raw)
{
    const file = path.resolve(root, ...relative.split(/[\\/]/));
    assert.ok(file.startsWith(root + path.sep));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
const jsonWrite = (relative, value) => write(relative, JSON.stringify(value, null, 2) + '\n');
const read = relative => JSON.parse(fs.readFileSync(path.join(root, ...relative.split('/')), 'utf8'));
const source = read('source-membership.json'), verification = verifyMembership(root, source);
assert.equal(verification.memberships, 38);
assert.equal(verification.objects, 48);
for (const item of source.sources)
{
    const raw = fs.readFileSync(path.join(root, ...item.artifact.split('/')));
    assert.equal(raw.length, item.bytes);
    assert.equal(sha256(raw), item.sha256);
    assert.equal(gitId('blob', raw), item.blob);
}
const external = read('external-source.json');
assert.equal(external.length, 4);
for (const item of external)
{
    const raw = fs.readFileSync(path.join(root, ...item.artifact.split('/')));
    assert.equal(raw.length, item.bytes);
    assert.equal(sha256(raw), item.sha256);
    assert.equal(gitId('blob', raw), item.gitBlob);
    assert.equal(item.actualLoadedRuntimeObserved, false);
}
assert.equal(read('COMMANDS.json').length, 12);
assert.equal(read('raw-object-reuse.json').reused.length, 47);
assert.equal(read('ASSESSMENT.json').decision, 'bounded-source-only-no-material-candidate');
const guidance = [];
for (const relative of [
    String.raw`src\Components\AGENTS.md`,
    String.raw`.github\instructions\components.instructions.md`,
    String.raw`.github\instructions\cross-cutting-guidance.instructions.md`,
    String.raw`docs\CrossCuttingGuidance.md`,
])
{
    const raw = fs.readFileSync(path.join(String.raw`C:\src\aspnetcore`, relative));
    const artifact = 'reserved-guidance/' + relative.replaceAll('\\', '/');
    write(artifact, raw);
    guidance.push({ path: relative, artifact, bytes: raw.length, sha256: sha256(raw),
        boundary: 'Reserved working guidance only, not a role compiler input or raw source-membership record.' });
}
jsonWrite('reserved-guidance.json', guidance);
function inventory(directory, relative = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const logical = relative ? relative + '/' + entry.name : entry.name;
        const file = path.join(directory, entry.name);
        if (entry.isDirectory())
        {
            return inventory(file, logical);
        }
        const raw = fs.readFileSync(file);
        return [{ path: logical, bytes: raw.length, sha256: sha256(raw) }];
    });
}
const files = inventory(root);
assert.ok(files.every(item => !['HASHES.json', 'HANDOFF.json'].includes(item.path)));
jsonWrite('HASHES.json', { recordedUtc: new Date().toISOString(), files,
    selfExcluded: ['HASHES.json', 'HANDOFF.json'], scope: 'Whole exact source-preparation directory, no product-native/performance work.' });
jsonWrite('HANDOFF.json', { finding: 'F215', preparation: 249,
    decision: 'bounded-source-only-no-material-candidate', assessment: 'ASSESSMENT.json',
    index: 'HASHES.json', indexSha256: sha256(fs.readFileSync(path.join(root, 'HASHES.json'))),
    filesIndexed: files.length, sourceMemberships: 38, rawGitObjects: 48, exactPriorObjectsReused: 47,
    wholeDeclaredDependencyFiles: 4, terminalSourceCommands: 12, candidateEdits: 0,
    nativeProductBuildTestRestoreServerRuntimeProbeStarts: 0, performanceAuthorizationsOrMeasurements: 0,
    hash: 'Actual multiply397-then-XOR, not plain symmetric XOR; same two fields as equality.',
    materiality: 'Real compile-time generator Distinct producer, no material owning input/work established.',
    boundary: 'No selected compiler runtime/LINQ branch/hash distribution/operation count, candidate equivalence, test or measured no-gain.',
    finalSealerToolExitRequiresLaterObservedReceipt: true,
    finalization: 'Separate remotely verified coordinator fork publication required.' });
for (const item of files)
{
    const raw = fs.readFileSync(path.join(root, ...item.path.split('/')));
    assert.equal(raw.length, item.bytes);
    assert.equal(sha256(raw), item.sha256);
}
console.log(JSON.stringify({ finding: 'F215', indexedPayloads: files.length, completeFilesIncludingEnvelopes: files.length + 2,
    sourceMemberships: 38, rawGitObjects: 48, priorObjectsReused: 47, wholeDeclaredDependencyFiles: 4,
    terminalSourceCommands: 12, nativeProductOrComparisonStarts: 0, sourceOnly: true }));
