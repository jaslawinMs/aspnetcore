import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const output = path.dirname(fileURLToPath(import.meta.url));
export const parallel = path.dirname(output);
export const session = path.dirname(parallel);
export const repository = 'C:\\src\\aspnetcore';
export const original = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
export const owner = '0cc047c2-0858-4ee5-8cc3-b5742fe3d066';
export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
export const gitOid = (type, bytes) => crypto.createHash('sha1').update(`${type} ${bytes.length}\0`).update(bytes).digest('hex');
export const readJson = relative => JSON.parse(fs.readFileSync(path.join(output, relative), 'utf8'));

export function writeNew(relative, bytes) {
    const destination = path.resolve(output, relative);
    assert.ok(destination.startsWith(path.resolve(output) + path.sep));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes, { flag: 'wx' });
    return destination;
}

export function writeJson(relative, value) {
    return writeNew(relative, JSON.stringify(value, null, 2) + '\n');
}

export function guard(tag) {
    const policyBytes = fs.readFileSync(path.join(parallel, 'policy.json'));
    const registrationBytes = fs.readFileSync(path.join(parallel, 'owner-registrations-282-283.json'));
    const campaignBytes = fs.readFileSync(path.join(session, 'autoperf-campaign.json'));
    const policy = JSON.parse(policyBytes);
    const registration = JSON.parse(registrationBytes);
    const campaign = JSON.parse(campaignBytes);
    const lease = path.join(parallel, 'benchmark-exclusive.lease.json');
    const observed = {
        observedUtc: new Date().toISOString(),
        actualOwner: owner,
        policySha256: sha256(policyBytes),
        registrationSha256: sha256(registrationBytes),
        campaignSha256: sha256(campaignBytes),
        registeredOwner: policy.independentFindingPreparationWorkers?.F242,
        ownScope: policy.activeWorkerPreparationScopes?.F242,
        expectedScope: registration.exactScopes?.F242,
        ownerCount: Object.keys(policy.independentFindingPreparationWorkers ?? {}).length,
        maximumOwners: policy.maximumRegisteredPreparationOwners,
        leasePath: lease,
        leaseAbsent: !fs.existsSync(lease),
        HOLD: policy.actualWorkerBuildHoldActive,
        quiesced: policy.buildAndTestWorkQuiesced,
        outerF242Status: campaign.candidates?.find(candidate => candidate.id === 'F242')?.status,
        pointObservationOnly: true
    };
    writeNew(`controls\\${tag}-policy.raw.json`, policyBytes);
    writeNew(`controls\\${tag}-registration.raw.json`, registrationBytes);
    writeNew(`controls\\${tag}-campaign.raw.json`, campaignBytes);
    writeJson(`controls\\${tag}-guard.json`, observed);
    assert.equal(observed.registeredOwner, owner);
    assert.equal(registration.actualOwners?.F242, owner);
    assert.equal(observed.ownScope, observed.expectedScope);
    assert.ok(observed.ownScope.startsWith('282 SOURCE ONLY after separateGO282'));
    assert.equal(observed.maximumOwners, 4);
    assert.ok(observed.ownerCount <= 4);
    assert.equal(observed.leaseAbsent, true);
    assert.equal(observed.HOLD, false);
    assert.equal(observed.quiesced, false);
    assert.equal(observed.outerF242Status, 'pending');
    return observed;
}

export async function sourceRoot(tag, executable, args, stdin = Buffer.alloc(0)) {
    assert.ok(executable === 'git' || executable === 'gh');
    const rootsDirectory = path.join(output, 'roots');
    fs.mkdirSync(rootsDirectory, { recursive: true });
    const number = fs.readdirSync(rootsDirectory, { withFileTypes: true }).filter(entry => entry.isDirectory()).length + 1;
    assert.ok(number <= 32, 'Git/gh root budget exhausted');
    const prefix = `${String(number).padStart(3, '0')}-${tag}`;
    guard(prefix);
    const relative = `roots\\${prefix}`;
    writeNew(`${relative}\\stdin.bin`, stdin);
    const command = {
        number, tag, executable, args, cwd: repository,
        stdinBytes: stdin.length, stdinSha256: sha256(stdin),
        authorizedSourceOnly: true, maximumGitGhRoots: 32,
        creationBoundMilliseconds: 120000,
        terminalObservationLimit: 'Direct root exit/close and both pipe endings only. No descendant census or universal process-tree closure is claimed.',
        environmentOverrides: {
            GIT_OPTIONAL_LOCKS: '0', GIT_NO_LAZY_FETCH: '1',
            GIT_TERMINAL_PROMPT: '0', GIT_PAGER: '', GH_PAGER: '', GH_PROMPT_DISABLED: '1'
        }
    };
    writeJson(`${relative}\\command.json`, command);
    const creationUtc = new Date().toISOString();
    const creationTick = performance.now();
    const child = spawn(executable, args, {
        cwd: repository,
        shell: false,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...command.environmentOverrides }
    });
    const stdoutChunks = [], stderrChunks = [];
    const observations = {
        creationUtc, pid: child.pid ?? null, spawnObserved: false,
        exitObserved: false, closeObserved: false,
        stdoutEndObserved: false, stderrEndObserved: false,
        deadlineExpired: false, ownedRootKillRequested: false,
        spawnError: null, stdinError: null, pipeErrors: []
    };
    child.on('spawn', () => { observations.spawnObserved = true; });
    child.stdout.on('data', chunk => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr.on('data', chunk => stderrChunks.push(Buffer.from(chunk)));
    child.stdout.on('end', () => { observations.stdoutEndObserved = true; });
    child.stderr.on('end', () => { observations.stderrEndObserved = true; });
    child.stdout.on('error', error => observations.pipeErrors.push(`stdout: ${error.message}`));
    child.stderr.on('error', error => observations.pipeErrors.push(`stderr: ${error.message}`));
    child.stdin.on('error', error => { observations.stdinError = error.message; });
    child.on('error', error => { observations.spawnError = { message: error.message, code: error.code }; });
    child.on('exit', (code, signal) => {
        observations.exitObserved = true;
        observations.exitCode = code;
        observations.exitSignal = signal;
        observations.exitObservedUtc = new Date().toISOString();
    });
    const completion = new Promise(resolve => {
        child.on('close', (code, signal) => {
            observations.closeObserved = true;
            observations.closeCode = code;
            observations.closeSignal = signal;
            resolve();
        });
    });
    let terminalTimer;
    const deadline = new Promise(resolve => {
        terminalTimer = setTimeout(() => {
            observations.deadlineExpired = true;
            observations.ownedRootKillRequested = child.kill();
            child.stdout.destroy();
            child.stderr.destroy();
            child.stdin.destroy();
            resolve();
        }, Math.max(1, 120000 - (performance.now() - creationTick)));
    });
    child.stdin.end(stdin);
    await Promise.race([completion, deadline]);
    clearTimeout(terminalTimer);
    const stdout = Buffer.concat(stdoutChunks);
    const stderr = Buffer.concat(stderrChunks);
    writeNew(`${relative}\\stdout.bin`, stdout);
    writeNew(`${relative}\\stderr.bin`, stderr);
    const terminal = {
        ...observations,
        observedAfterAwaitUtc: new Date().toISOString(),
        stdoutBytes: stdout.length, stdoutSha256: sha256(stdout),
        stderrBytes: stderr.length, stderrSha256: sha256(stderr),
        terminalObservationLimit: command.terminalObservationLimit,
        completePipesObserved: observations.stdoutEndObserved && observations.stderrEndObserved,
        actualDirectRootSuccess: observations.exitObserved && observations.closeObserved &&
            observations.exitCode === 0 && !observations.deadlineExpired &&
            observations.stdoutEndObserved && observations.stderrEndObserved
    };
    writeJson(`${relative}\\terminal.json`, terminal);
    console.log(JSON.stringify({ root: number, tag, exit: terminal.exitCode ?? null,
        success: terminal.actualDirectRootSuccess, stdoutBytes: stdout.length, stderrBytes: stderr.length }));
    assert.equal(terminal.actualDirectRootSuccess, true, `Source root ${prefix} failed; preserved without replay`);
    return { stdout, stderr, terminal, relative };
}

export const gitArguments = (...args) => [
    '--no-pager', '-c', 'core.fsmonitor=false', '-c', 'core.pager=cat', '-C', repository, ...args
];

export function parseTree(buffer) {
    return buffer.toString('utf8').split('\0').filter(Boolean).map(record => {
        const match = /^([0-7]+) ([^ ]+) ([0-9a-f]{40})\t([\s\S]+)$/.exec(record);
        assert.ok(match, 'Unrecognized ls-tree record');
        return { mode: match[1], type: match[2], oid: match[3], path: match[4] };
    });
}

export async function captureWhole(tag, requests) {
    const treeOriginal = readJson('metadata\\tree-original.json');
    const treeDefault = readJson('metadata\\tree-default.json');
    const existingDirectory = path.join(output, 'inputs');
    const existingRecords = fs.existsSync(existingDirectory)
        ? fs.readdirSync(existingDirectory).filter(name => /^capture-.+\.json$/.test(name))
            .flatMap(name => readJson(`inputs\\${name}`))
        : [];
    for (const role of ['Original', 'Default']) {
        const logicalPaths = new Set(existingRecords.filter(record => record.role === role && record.type === 'blob').map(record => record.path));
        for (const request of requests.filter(request => request.role === role && request.path)) {
            assert.ok(!logicalPaths.has(request.path), `Duplicate body capture ${role}:${request.path}`);
            logicalPaths.add(request.path);
        }
        assert.ok(logicalPaths.size <= 15, `${role} whole-input budget exhausted`);
    }
    const stdin = Buffer.from(requests.map(request => request.path ? `${request.commit}:${request.path}` : request.commit).join('\n') + '\n');
    const result = await sourceRoot(tag, 'git', gitArguments('cat-file', '--batch'), stdin);
    let position = 0;
    const records = [];
    for (const request of requests) {
        const headerEnd = result.stdout.indexOf(10, position);
        assert.ok(headerEnd >= position);
        const header = result.stdout.subarray(position, headerEnd).toString('ascii');
        const match = /^([0-9a-f]{40}) (blob|commit) ([0-9]+)$/.exec(header);
        assert.ok(match, `Missing/invalid Git batch object: ${header}`);
        const size = Number(match[3]);
        const start = headerEnd + 1, end = start + size;
        assert.ok(end < result.stdout.length);
        assert.equal(result.stdout[end], 10);
        const bytes = result.stdout.subarray(start, end);
        assert.equal(gitOid(match[2], bytes), match[1]);
        let mode = null;
        if (request.path) {
            const tree = request.role === 'Original' ? treeOriginal : treeDefault;
            const entry = tree.find(item => item.path === request.path);
            assert.ok(entry, `No tree provenance for ${request.role}:${request.path}`);
            assert.equal(entry.oid, match[1]);
            assert.equal(entry.type, match[2]);
            mode = entry.mode;
        }
        const destination = request.path
            ? `inputs\\${request.role}\\${request.path.split('/').join('\\')}.raw`
            : `inputs\\${request.role}\\${request.commit}.commit.raw`;
        writeNew(destination, bytes);
        records.push({
            ...request, commitPath: request.path ? `${request.commit}:${request.path}` : request.commit,
            type: match[2], mode, gitObjectId: match[1], bytes: size, sha256: sha256(bytes),
            rawPath: destination, batchRoot: result.relative,
            frame: { headerStart: position, headerEndExclusive: headerEnd, header,
                bodyStart: start, bodyEndExclusive: end, trailingNewlineOffset: end },
            gitFramingAndIndependentObjectHashVerified: true,
            rawWholeBytesWithoutEolNormalization: true
        });
        position = end + 1;
    }
    assert.equal(position, result.stdout.length, 'Unexpected unparsed Git batch bytes');
    writeJson(`inputs\\capture-${tag}.json`, records);
    return records;
}
