import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256, verifyMembership } from '../../autoperf-published-results/F240-F268/source-objects.mjs';

const root = import.meta.dirname, session = path.resolve(root, '..', '..');
const capsule = path.join(session, 'autoperf-published-results', 'F210-F211');
const run = path.join(session, 'autoperf-runs', 'F210-F211', 'publication-238');
function write(file, raw)
{
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
const jsonWrite = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
const source = JSON.parse(fs.readFileSync(path.join(root, 'source-membership.json'), 'utf8'));
const verified = verifyMembership(root, source);
assert.equal(verified.memberships, 28);
assert.equal(verified.objects, 34);
const guidance = [];
for (const relative of [
    String.raw`.github\instructions\cross-cutting-guidance.instructions.md`,
    String.raw`.github\instructions\build.instructions.md`,
    String.raw`docs\CrossCuttingGuidance.md`,
])
{
    const raw = fs.readFileSync(path.join(String.raw`C:\src\aspnetcore`, relative));
    const artifact = 'reserved-guidance/' + relative.replaceAll('\\', '/');
    write(path.join(root, ...artifact.split('/')), raw);
    guidance.push({ path: relative, artifact, bytes: raw.length, sha256: sha256(raw),
        representation: 'reserved-working-guidance-only-not-compiler-source-or-raw-Git-membership' });
}
jsonWrite(path.join(root, 'reserved-guidance.json'), guidance);
function inventory(directory, relative = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const logical = relative ? relative + '/' + entry.name : entry.name;
        const full = path.join(directory, entry.name);
        if (entry.isDirectory())
        {
            return inventory(full, logical);
        }
        const raw = fs.readFileSync(full);
        return [{ path: logical, bytes: raw.length, sha256: sha256(raw) }];
    });
}
const files = inventory(root);
assert.ok(files.every(item => !['HASHES.json', 'HANDOFF.json'].includes(item.path)));
jsonWrite(path.join(root, 'HASHES.json'), { recordedUtc: new Date().toISOString(), files,
    selfExcluded: ['HASHES.json', 'HANDOFF.json'], scope: 'Whole exact source-preparation directory.' });
const handoff = { findings: ['F210', 'F211'], preparation: 238, decision: 'bounded-source-only-no-material-candidates',
    acceptance: 'ACCEPTANCE.json', assessment: 'ASSESSMENT.json', sourceMemberships: 28, rawGitObjects: 34,
    index: 'HASHES.json', indexSha256: sha256(fs.readFileSync(path.join(root, 'HASHES.json'))),
    nativeStarts: 0, comparisonsAuthorized: 0, candidateOrPrivateGraphCreated: false,
    limitation: 'Source provenance only; no selected logger/TRACE/runtime, socket/HTTP2 frame, correctness or measured no-gain result.',
    finalization: 'Separate coordinator fork publication required.' };
jsonWrite(path.join(root, 'HANDOFF.json'), handoff);
const complete = [...files, ...['HASHES.json', 'HANDOFF.json'].map(relative =>
{
    const raw = fs.readFileSync(path.join(root, relative));
    return { path: relative, bytes: raw.length, sha256: sha256(raw) };
})];
const evidence = [];
for (const item of complete)
{
    const raw = fs.readFileSync(path.join(root, ...item.path.split('/')));
    assert.equal(raw.length, item.bytes);
    assert.equal(sha256(raw), item.sha256);
    const logical = 'evidence/' + item.path;
    write(path.join(capsule, ...logical.split('/')), raw);
    evidence.push({ file: logical, bytes: raw.length, sha256: sha256(raw) });
}
jsonWrite(path.join(capsule, 'evidence-index.json'), { files: evidence });
write(path.join(capsule, '.gitattributes'), '* -text\n');
write(path.join(capsule, 'source-objects.mjs'), fs.readFileSync(path.join(session, 'autoperf-published-results', 'F240-F268', 'source-objects.mjs')));
const audit = spawnSync('node', [path.join(capsule, 'verify.mjs'), capsule], { encoding: 'utf8', windowsHide: true });
write(path.join(run, 'prepared-verifier.stdout'), audit.stdout ?? '');
write(path.join(run, 'prepared-verifier.stderr'), audit.stderr ?? '');
assert.ifError(audit.error);
assert.equal(audit.status, 0, audit.stderr + audit.stdout);
jsonWrite(path.join(run, 'prepared-audit.json'), JSON.parse(audit.stdout));
console.log(audit.stdout.trim());
