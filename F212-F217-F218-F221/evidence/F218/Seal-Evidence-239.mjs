import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sha256, verifyMembership } from '../../autoperf-published-results/F240-F268/source-objects.mjs';

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
assert.equal(verification.memberships, 34);
assert.equal(verification.objects, 44);
assert.equal(read('external-source.json').length, 2);
assert.equal(read('raw-object-reuse.json').reused.length, 36);
assert.equal(read('COMMANDS.json').length, 19);
const assessment = read('ASSESSMENT.json');
assert.equal(assessment.decision, 'bounded-source-only-no-material-candidate');
const guidance = [];
for (const relative of [
    String.raw`src\Components\AGENTS.md`,
    String.raw`.github\instructions\components.instructions.md`,
    String.raw`.github\instructions\components.server.instructions.md`,
    String.raw`.github\instructions\cross-cutting-guidance.instructions.md`,
])
{
    const raw = fs.readFileSync(path.join(String.raw`C:\src\aspnetcore`, relative));
    const artifact = 'reserved-guidance/' + relative.replaceAll('\\', '/');
    write(artifact, raw);
    guidance.push({ path: relative, artifact, bytes: raw.length, sha256: sha256(raw),
        boundary: 'Reserved working guidance, not compiler input or a raw role-source membership.' });
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
    selfExcluded: ['HASHES.json', 'HANDOFF.json'], scope: 'Whole exact source-preparation directory, no native product work.' });
const handoff = {
    finding: 'F218', preparation: 239, decision: assessment.decision,
    assessment: 'ASSESSMENT.json', index: 'HASHES.json',
    indexSha256: sha256(fs.readFileSync(path.join(root, 'HASHES.json'))),
    filesIndexed: files.length, rawGitObjects: 44, sourceMemberships: 34, completeDeclaredExternalSources: 2,
    priorPublishedRawObjectsReused: 36, terminalSourceCommands: 19,
    firstInsertionQualification: 'Declared empty-set Contains returns before hashing; not every unique library performs two probes.',
    materiality: 'Real assembly discovery/initialized data-source refresh, not per page/request; canonical source inputs two assemblies, not a universal bound.',
    nativeProductBuildTestRestoreServerRuntimeProbeStarts: 0,
    candidateEdits: 0, privateGraphsCreated: [], performanceAuthorizationsOrMeasurements: 0,
    limitation: 'Source only; no selected CLR/JIT/comparer, actual assembly counts/refreshes/metadata delta, endpoint/browser correctness or measured no-gain.',
    finalization: 'Separate verified coordinator fork publication required.',
};
jsonWrite('HANDOFF.json', handoff);
for (const item of files)
{
    const raw = fs.readFileSync(path.join(root, ...item.path.split('/')));
    assert.equal(raw.length, item.bytes);
    assert.equal(sha256(raw), item.sha256);
}
assert.equal(read('HANDOFF.json').indexSha256, sha256(fs.readFileSync(path.join(root, 'HASHES.json'))));
console.log(JSON.stringify({ finding: 'F218', completeIndexedPayloads: files.length, completeFilesIncludingEnvelopes: files.length + 2,
    rawGitObjects: 44, sourceMemberships: 34, exactRawObjectsReused: 36, nativeProductStarts: 0, sourceOnly: true }));
