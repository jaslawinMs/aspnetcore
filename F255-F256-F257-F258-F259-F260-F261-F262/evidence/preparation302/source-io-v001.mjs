import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256, gitId } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

export const root = import.meta.dirname, parallel = path.dirname(root), repo = String.raw`C:\src\aspnetcore`;
export const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
export function write(name, raw)
{
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
export const json = (name, value) => write(name, JSON.stringify(value, null, 2) + '\n');
export function command(label, executable, argv, input)
{
    const directory = path.join(root, 'commands');
    const existing = fs.existsSync(directory) ? fs.readdirSync(directory).filter(x => x.endsWith('.receipt.json')) : [];
    assert.ok(existing.length < 32);
    const policyBytes = fs.readFileSync(path.join(parallel, 'policy.json')), policy = JSON.parse(policyBytes);
    assert.equal(policy.actualWorkerBuildHoldActive, false);
    assert.equal(policy.buildAndTestWorkQuiesced, false);
    assert.ok(Object.keys(policy.independentFindingPreparationWorkers).length <= 4);
    assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
    const campaign = read(path.join(path.dirname(parallel), 'autoperf-campaign.json'));
    for (const id of ['F260', 'F261', 'F262']) assert.equal(campaign.candidates.find(x => x.id === id).status, 'pending');
    const prefix = 'commands/' + String(existing.length + 1).padStart(3, '0') + '-' + label;
    json(prefix + '.request.json', { executable, argv, cwd: repo, inputBytes: input?.length ?? 0,
        policySha256: sha256(policyBytes), retainedFindingStatesPending: true });
    if (input) write(prefix + '.stdin', input);
    const startedUtc = new Date().toISOString();
    const result = spawnSync(executable, argv, { cwd: repo, input, timeout: 90000, windowsHide: true,
        maxBuffer: 64 * 1024 * 1024, env: { ...process.env, GIT_PAGER: '', GIT_OPTIONAL_LOCKS: '0',
            GIT_TERMINAL_PROMPT: '0', GH_PAGER: '', GH_PROMPT_DISABLED: '1' } });
    write(prefix + '.stdout', result.stdout ?? Buffer.alloc(0));
    write(prefix + '.stderr', result.stderr ?? Buffer.alloc(0));
    json(prefix + '.receipt.json', { executable, argv, cwd: repo, pid: result.pid, startedUtc,
        returnedUtc: new Date().toISOString(), actualRootExitCode: result.status, error: result.error?.message ?? null,
        rootWaitReturned: result.status !== null && !result.error, completeRawStreamsReturned: !result.error,
        observationLimit: 'Synchronous root and returned pipes only; no universal/unseen-child census or creation-bound descendant closure claimed.',
        productNativeOrTimingAdmission: false });
    assert.ifError(result.error);
    assert.equal(result.status, 0, (result.stderr ?? Buffer.alloc(0)).toString('utf8'));
    return result.stdout;
}
export const git = (label, argv, input) => command(label, 'git', ['--no-pager', '-C', repo, ...argv], input);
export function tree(raw)
{
    return raw.toString('utf8').split('\0').filter(Boolean).map(line =>
    {
        const match = line.match(/^([0-9]{6}) (blob|tree) ([a-f0-9]{40})\t(.+)$/);
        assert.ok(match);
        return { mode: match[1], type: match[2], oid: match[3], path: match[4] };
    });
}
export function capture(label, selection)
{
    assert.equal(new Set(selection.map(x => x.role + '/' + x.path)).size, selection.length);
    const raw = git(label, ['cat-file', '--batch'], Buffer.from(selection.map(x => x.commit + ':' + x.path).join('\n') + '\n'));
    const captures = [];
    let offset = 0;
    for (const item of selection)
    {
        const end = raw.indexOf(10, offset);
        assert.ok(end >= offset);
        const header = raw.subarray(offset, end).toString('ascii').match(/^([a-f0-9]{40}) blob (\d+)$/);
        assert.ok(header, item.commit + ':' + item.path);
        assert.equal(header[1], item.oid);
        const bytes = Number(header[2]), start = end + 1, body = raw.subarray(start, start + bytes);
        assert.equal(raw[start + bytes], 10);
        assert.equal(gitId('blob', body), item.oid);
        const artifact = 'whole/' + item.role + '/' + item.path;
        write(artifact, body);
        captures.push({ ...item, artifact, bytes, sha256: sha256(body), rawBatchLabel: label,
            frameHeaderOffset: offset, frameBodyOffset: start, frameEndExclusive: start + bytes + 1, wholeBody: true });
        offset = start + bytes + 1;
    }
    assert.equal(offset, raw.length);
    return captures;
}
