import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitId, sha256, treeEntries, verifyMembership } from '../../autoperf-published-results/F240-F268/source-objects.mjs';

const root = import.meta.dirname;
const index = JSON.parse(fs.readFileSync(path.join(root, 'source-membership.json'), 'utf8'));
const objects = new Map(index.objects.map(item => [item.sha, { ...item, raw: fs.readFileSync(path.join(root, item.file)) }]));
const sources = [...index.sources], commands = [];
function write(relative, raw)
{
    const file = path.join(root, ...relative.split(/[\\/]/));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
const relative = 'src/Servers/Kestrel/Core/src/Internal/Infrastructure/ConnectionManager.cs';
for (const role of ['Original', 'Default'])
{
    const commit = index.sources.find(item => item.role === role).commit;
    let current = objects.get(commit).raw.toString('utf8').match(/^tree ([a-f0-9]{40})$/m)[1];
    for (const part of relative.split('/'))
    {
        const entry = treeEntries(objects.get(current).raw).get(part);
        assert.ok(entry);
        current = entry.sha;
    }
    if (!objects.has(current))
    {
        const argv = ['--no-pager', '-C', String.raw`C:\src\aspnetcore`, 'cat-file', 'blob', current];
        const startedUtc = new Date().toISOString();
        const result = spawnSync('git', argv, { windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
        const endedUtc = new Date().toISOString();
        const prefix = 'completion-230-' + String(commands.length + 1);
        write(prefix + '.stdout', result.stdout ?? Buffer.alloc(0));
        write(prefix + '.stderr', result.stderr ?? Buffer.alloc(0));
        commands.push({ executable: 'git', argv, pid: result.pid, startedUtc, endedUtc, exitCode: result.status,
            rootWaited: true, redirectedStreamsDrained: true, stdout: prefix + '.stdout', stderr: prefix + '.stderr' });
        assert.ifError(result.error);
        assert.equal(result.status, 0);
        assert.equal(gitId('blob', result.stdout), current);
        const file = `raw-git/objects/${current}.payload`;
        write(file, result.stdout);
        objects.set(current, { type: 'blob', sha: current, file, bytes: result.stdout.length, sha256: sha256(result.stdout), raw: result.stdout });
    }
    const blob = objects.get(current);
    assert.ok(blob.raw.toString('utf8').includes('connection.Complete();'));
    const artifact = `source/${role}/${relative}`;
    write(artifact, blob.raw);
    sources.push({ finding: 'F199', role, commit, path: relative, blob: current, artifact, bytes: blob.bytes, sha256: blob.sha256 });
}
const merged = { objects: [...objects.values()].map(({ raw, ...item }) => item), sources,
    boundary: 'Additive completion-source capture only; original229 collector/index/records unchanged.' };
const checked = verifyMembership(root, merged);
write('source-completion-230.json', JSON.stringify(merged, null, 2) + '\n');
write('completion-230-commands.json', JSON.stringify(commands, null, 2) + '\n');
console.log(JSON.stringify({ completeSourceMemberships: checked.memberships, rawGitObjects: checked.objects,
    additionalSourceCommands: commands.length, nativeStarts: 0 }));
