import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const scope = import.meta.dirname;
export const repository = 'C:\\src\\aspnetcore';
export const original = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
export const reservedHead = '24875ef5dabb55567870b39f6eb0002170435e2f';
export const ownId = '7edc5806-0226-40d8-81f6-5c50d73959bc';
export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
export function writeNew(name, bytes) {
    const destination = path.join(scope, name);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes, { flag: 'wx' });
}
export function jsonNew(name, value) {
    writeNew(name, JSON.stringify(value, null, 2) + '\n');
}
export function guard(label) {
    const parallel = path.dirname(scope);
    const session = path.dirname(parallel);
    const policyBytes = fs.readFileSync(path.join(parallel, 'policy.json'));
    const campaignBytes = fs.readFileSync(path.join(session, 'autoperf-campaign.json'));
    const registration = JSON.parse(fs.readFileSync(path.join(scope, 'guard-registration-v001.raw.json'), 'utf8'));
    const policy = JSON.parse(policyBytes.toString('utf8'));
    const campaign = JSON.parse(campaignBytes.toString('utf8'));
    writeNew(`guards\\${label}.policy.raw.json`, policyBytes);
    const checks = {
        observedUtc: new Date().toISOString(),
        policySha256: sha256(policyBytes),
        campaignSha256: sha256(campaignBytes),
        ownId,
        ownExactScope: policy.activeWorkerPreparationScopes.F243,
        owners: policy.independentFindingPreparationWorkers,
        leaseAbsent: !fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')),
        HOLD: policy.actualWorkerBuildHoldActive,
        quiesced: policy.buildAndTestWorkQuiesced,
        pending: ['F243', 'F244', 'F245', 'F246'].map(id => ({
            id,
            statuses: campaign.candidates.filter(candidate => candidate.id === id).map(candidate => candidate.status)
        }))
    };
    jsonNew(`guards\\${label}.observation.json`, checks);
    assert.equal(policy.independentFindingPreparationWorkers.F243, ownId);
    assert.equal(policy.activeWorkerPreparationScopes.F243, registration.exactScopes.F243);
    assert.equal(policy.maximumRegisteredPreparationOwners, 4);
    assert.ok(Object.keys(policy.independentFindingPreparationWorkers).length <= 4);
    assert.equal(checks.leaseAbsent, true);
    assert.equal(checks.HOLD, false);
    assert.equal(checks.quiesced, false);
    for (const candidate of checks.pending) assert.deepEqual(candidate.statuses, ['pending']);
    return checks;
}
export function root(label, executable, args, input = Buffer.alloc(0), allowedFailure = false) {
    assert.ok(['git', 'gh'].includes(executable));
    const previous = fs.readdirSync(scope).filter(name => /^root-\d{3}\.request\.json$/.test(name));
    const number = previous.length + 1;
    assert.ok(number <= 32, 'Direct Git/gh root budget exhausted');
    const stem = `root-${String(number).padStart(3, '0')}`;
    guard(stem);
    const request = {
        number, label, executable, args, cwd: repository,
        stdinBytes: input.length, stdinSha256: sha256(input),
        sourceOrMetadataClassification: label,
        timeoutMilliseconds: 240000,
        maximumBufferedBytesPerStream: 134217728,
        createdUtc: new Date().toISOString()
    };
    jsonNew(`${stem}.request.json`, request);
    writeNew(`${stem}.stdin.raw`, input);
    const result = spawnSync(executable, args, {
        cwd: repository,
        input,
        encoding: null,
        windowsHide: true,
        timeout: request.timeoutMilliseconds,
        maxBuffer: request.maximumBufferedBytesPerStream,
        env: { ...process.env, GIT_PAGER: 'cat', GH_PAGER: 'cat', GH_PROMPT_DISABLED: '1', GIT_TERMINAL_PROMPT: '0' }
    });
    const stdout = result.stdout ?? Buffer.alloc(0);
    const stderr = result.stderr ?? Buffer.alloc(0);
    writeNew(`${stem}.stdout.raw`, stdout);
    writeNew(`${stem}.stderr.raw`, stderr);
    const receipt = {
        ...request,
        observedTerminalUtc: new Date().toISOString(),
        actualRootPid: result.pid ?? null,
        rootExitCode: result.status,
        rootSignal: result.signal,
        error: result.error ? { message: result.error.message, code: result.error.code } : null,
        stdoutBytes: stdout.length, stdoutSha256: sha256(stdout),
        stderrBytes: stderr.length, stderrSha256: sha256(stderr),
        rootWaitAndStreamsReturned: result.status !== null && !result.error,
        limitations: ['Synchronous direct root and full returned streams only. No assertion that unobserved/deeper descendants or unrelated processes are absent.']
    };
    jsonNew(`${stem}.receipt.json`, receipt);
    console.log(JSON.stringify({ root: number, label, pid: receipt.actualRootPid, exit: result.status, stdoutBytes: stdout.length, stderrBytes: stderr.length }));
    if (!allowedFailure) {
        assert.ifError(result.error);
        assert.equal(result.status, 0, `${stem}: ${stderr.toString('utf8')}`);
    }
    return { stem, stdout, stderr, status: result.status, receipt };
}
export function parseTree(buffer) {
    return buffer.toString('utf8').split('\0').filter(Boolean).map(entry => {
        const match = /^([0-7]{6}) (blob|tree|commit) ([0-9a-f]{40})\t(.+)$/.exec(entry);
        assert.ok(match, `Invalid ls-tree member ${entry}`);
        return { mode: match[1], type: match[2], oid: match[3], path: match[4] };
    });
}
export function captureWholeBatch(selected, label) {
    for (const role of ['Original', 'Default']) {
        const already = fs.readdirSync(scope).filter(name => /^whole-inputs-v\d+\.json$/.test(name))
            .flatMap(name => JSON.parse(fs.readFileSync(path.join(scope, name), 'utf8')).members)
            .filter(member => member.role === role);
        const distinct = new Set([...already, ...selected.filter(member => member.role === role)].map(member => member.path));
        assert.ok(distinct.size <= 15, `${role} whole-input budget exceeded`);
    }
    const input = Buffer.from(selected.map(member => `${member.commit}:${member.path}`).join('\n') + '\n');
    const response = root(label, 'git', ['--no-pager', '-C', repository, 'cat-file', '--batch'], input);
    const buffer = response.stdout;
    let offset = 0;
    const members = selected.map((member, index) => {
        const headerStart = offset;
        const end = buffer.indexOf(10, offset);
        assert.ok(end >= offset);
        const header = buffer.subarray(offset, end).toString('ascii');
        const match = /^([0-9a-f]{40}) blob ([0-9]+)$/.exec(header);
        assert.ok(match, `Not a complete blob header: ${header}`);
        const size = Number(match[2]);
        const start = end + 1;
        const stop = start + size;
        assert.ok(stop < buffer.length);
        assert.equal(buffer[stop], 10);
        const bytes = buffer.subarray(start, stop);
        assert.equal(match[1], member.oid);
        const actualObjectId = crypto.createHash('sha1').update(Buffer.from(`blob ${size}\0`)).update(bytes).digest('hex');
        assert.equal(actualObjectId, member.oid);
        const destination = `whole\\${member.role}\\${member.path.replaceAll('/', '\\')}`;
        writeNew(destination, bytes);
        offset = stop + 1;
        return {
            ...member, commitPath: `${member.commit}:${member.path}`, capturedFile: destination,
            fullBytes: size, sha256: sha256(bytes), recomputedGitBlobId: actualObjectId,
            root: response.stem, memberIndex: index,
            rawFrameHeaderOffset: headerStart, rawFrameBodyOffset: start, rawFrameEndExclusive: offset,
            rawHeader: header, wholeBody: true, sourceEvidence: true
        };
    });
    assert.equal(offset, buffer.length, 'Unexpected trailing or unselected cat-file bytes');
    return { label, capturedUtc: new Date().toISOString(), rawFrameFile: `${response.stem}.stdout.raw`, exactMemberCount: members.length, members };
}
