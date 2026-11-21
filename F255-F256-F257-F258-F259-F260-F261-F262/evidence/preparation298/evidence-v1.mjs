import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const output = import.meta.dirname;
const parallel = path.dirname(output);
const sessionFiles = path.dirname(parallel);
const repository = 'C:\\src\\aspnetcore';
const owner = '7ebf00d6-76eb-41b9-8a9b-b6549a772002';
const original = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const stateFile = path.join(output, 'STATE.json');
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const state = fs.existsSync(stateFile) ? readJson(stateFile) : {
    phase: 298, owner, original, default: null, roots: [], bodies: { Original: [], Default: [] }, actions: []
};

function guard(action) {
    const policyBytes = fs.readFileSync(path.join(parallel, 'policy.json'));
    const acceptanceBytes = fs.readFileSync(path.join(output, 'PARENT-ACCEPTANCE.json'));
    const registrationBytes = fs.readFileSync(path.join(parallel, 'owner-registrations-298-299.json'));
    const campaignBytes = fs.readFileSync(path.join(sessionFiles, 'autoperf-campaign.json'));
    const policy = JSON.parse(policyBytes);
    const acceptance = JSON.parse(acceptanceBytes);
    const registration = JSON.parse(registrationBytes).entries.find(x => x.key === 'F257');
    const candidate = JSON.parse(campaignBytes).candidates.find(x => x.id === 'F257');
    assert.equal(acceptance.actualOwner, owner);
    assert.equal(acceptance.phase, 298);
    assert.deepEqual(acceptance.findings, ['F257']);
    assert.equal(policy.independentFindingPreparationWorkers.F257, owner);
    assert.equal(policy.activeWorkerPreparationScopes.F257, acceptance.scope);
    assert.equal(registration.actualOwner, owner);
    assert.equal(registration.scope, acceptance.scope);
    assert.match(acceptance.scope, /^298 SOURCE ONLY after separateGO298 /);
    assert.equal(Object.keys(policy.independentFindingPreparationWorkers).length <= 4, true);
    assert.equal(policy.actualWorkerBuildHoldActive, false);
    assert.equal(policy.buildAndTestWorkQuiesced, false);
    assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
    assert.equal(candidate.status, 'pending');
    const folder = path.join(output, 'guards');
    fs.mkdirSync(folder, { recursive: true });
    const inputs = [
        ['policy', policyBytes], ['acceptance', acceptanceBytes],
        ['registration', registrationBytes], ['campaign', campaignBytes]
    ];
    const snapshots = inputs.map(([kind, bytes]) => {
        const digest = hash(bytes);
        const name = `${kind}-${digest}.json`;
        const file = path.join(folder, name);
        if (!fs.existsSync(file)) fs.writeFileSync(file, bytes, { flag: 'wx' });
        return { kind, file: `guards\\${name}`, bytes: bytes.length, sha256: digest };
    });
    const receipt = {
        utc: new Date().toISOString(), action, owner, exactScope: true, noGlobalLease: true,
        leasePath: path.join(parallel, 'benchmark-exclusive.lease.json'),
        noHold: true, nonquiesced: true, candidateStatus: candidate.status, snapshots
    };
    fs.appendFileSync(path.join(output, 'guard-observations.jsonl'), JSON.stringify(receipt) + '\n');
    return receipt;
}

function save() {
    writeJson(stateFile, state);
}

async function root(label, executable, args, stdin = Buffer.alloc(0)) {
    guard(`root:${label}`);
    assert.equal(state.roots.length < 32, true, 'Direct Git/gh root cap');
    assert.equal(state.roots.every(x => x.terminal === true && !x.exceededObservationDeadline), true);
    assert.equal(['git', 'gh'].includes(executable), true);
    const index = state.roots.length + 1;
    const directory = path.join(output, 'roots', String(index).padStart(2, '0') + '-' + label);
    fs.mkdirSync(directory, { recursive: true });
    const relativeDirectory = path.relative(output, directory);
    const record = {
        index, label, executable, args, cwd: repository, startedUtc: new Date().toISOString(),
        rootPid: null, terminal: false, exitCode: null, signal: null,
        observationDeadlineMilliseconds: executable === 'gh' ? 90000 : 60000,
        exceededObservationDeadline: false,
        childObservation: 'Direct spawned PID and its exit/close plus both stream EOFs only. No descendant census or machine-idleness claim. No process stops authorized or attempted.',
        directory: relativeDirectory,
        environmentOverrides: { GIT_TERMINAL_PROMPT: '0', GH_PROMPT_DISABLED: '1', GIT_PAGER: 'cat', PAGER: 'cat' },
        inheritedEnvironmentCaptured: false
    };
    state.roots.push(record);
    fs.writeFileSync(path.join(directory, 'stdin.bin'), stdin);
    fs.writeFileSync(path.join(directory, 'stdout.bin'), Buffer.alloc(0));
    fs.writeFileSync(path.join(directory, 'stderr.bin'), Buffer.alloc(0));
    writeJson(path.join(directory, 'root.json'), record);
    save();
    const stdout = [];
    const stderr = [];
    const child = spawn(executable, args, {
        cwd: repository,
        env: { ...process.env, ...record.environmentOverrides },
        shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe']
    });
    record.rootPid = child.pid ?? null;
    writeJson(path.join(directory, 'root.json'), record);
    save();
    child.stdout.on('data', bytes => {
        stdout.push(bytes);
        fs.appendFileSync(path.join(directory, 'stdout.bin'), bytes);
    });
    child.stderr.on('data', bytes => {
        stderr.push(bytes);
        fs.appendFileSync(path.join(directory, 'stderr.bin'), bytes);
    });
    child.stdin.on('error', error => {
        record.stdinError = { name: error.name, message: error.message, code: error.code ?? null };
    });
    child.stdin.end(stdin);
    const deadline = setTimeout(() => {
        record.exceededObservationDeadline = true;
        record.deadlineObservedUtc = new Date().toISOString();
        writeJson(path.join(directory, 'root.json'), record);
        save();
        console.error(`Observation deadline exceeded for ${label}; no further roots and no stop attempt.`);
    }, record.observationDeadlineMilliseconds);
    child.on('error', error => {
        record.spawnError = { name: error.name, message: error.message, code: error.code ?? null };
    });
    child.on('exit', (code, signal) => {
        record.exitObservedUtc = new Date().toISOString();
        record.exitCode = code;
        record.signal = signal;
    });
    await new Promise(resolve => child.on('close', resolve));
    clearTimeout(deadline);
    record.closeObservedUtc = new Date().toISOString();
    record.terminal = true;
    record.streamsClosed = { stdout: true, stderr: true };
    for (const stream of ['stdin', 'stdout', 'stderr']) {
        const bytes = fs.readFileSync(path.join(directory, stream + '.bin'));
        record[stream] = { bytes: bytes.length, sha256: hash(bytes) };
    }
    writeJson(path.join(directory, 'root.json'), record);
    save();
    const result = { record, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) };
    assert.equal(record.exceededObservationDeadline, false, 'Root exceeded bounded observation deadline');
    assert.equal(record.exitCode, 0, `${label} failed; raw failure retained, no automatic retry`);
    return result;
}

function tree(role) {
    const file = path.join(output, 'metadata', role + '-tree.json');
    return readJson(file);
}

function selected(role, names) {
    const metadata = tree(role);
    return names.map(name => {
        const matches = metadata.filter(x => x.path === name);
        assert.equal(matches.length, 1, `Select exactly one proven path: ${role}:${name}`);
        assert.equal(matches[0].type, 'blob');
        return matches[0];
    });
}

async function capture(role, names) {
    guard(`capture-selection:${role}`);
    const entries = selected(role, names);
    const old = state.bodies[role];
    assert.equal(old.length + names.length <= 15, true, 'Whole repository-body cap per role');
    for (const entry of entries) assert.equal(old.some(x => x.path === entry.path), false, 'No body replacement/retry');
    const commit = role === 'Original' ? original : state.default;
    const requests = entries.map(x => `${commit}:${x.path}`);
    const batch = await root(`bodies-${role}-${old.length + 1}`, 'git', ['--no-pager', 'cat-file', '--batch'], Buffer.from(requests.join('\n') + '\n'));
    let offset = 0;
    for (let index = 0; index < entries.length; index++) {
        const entry = entries[index];
        const start = offset;
        const endHeader = batch.stdout.indexOf(10, offset);
        assert.notEqual(endHeader, -1, 'Full Git batch header');
        const header = batch.stdout.subarray(offset, endHeader).toString('ascii');
        const match = /^([a-f0-9]{40}) blob ([0-9]+)$/.exec(header);
        assert.notEqual(match, null, `Missing/invalid Git member retained: ${header}`);
        const length = Number(match[2]);
        const bodyStart = endHeader + 1;
        const bodyEnd = bodyStart + length;
        assert.equal(batch.stdout[bodyEnd], 10, 'Full Git batch terminator');
        assert.equal(match[1], entry.oid);
        const bytes = batch.stdout.subarray(bodyStart, bodyEnd);
        const file = path.join(output, 'bodies', role, ...entry.path.split('/'));
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, bytes, { flag: 'wx' });
        const actualGitOid = crypto.createHash('sha1').update(Buffer.from(`blob ${length}\0`)).update(bytes).digest('hex');
        assert.equal(actualGitOid, entry.oid);
        old.push({
            role, commit, path: entry.path, commitPath: `${commit}:${entry.path}`, mode: entry.mode,
            blob: entry.oid, bytes: bytes.length, sha256: hash(bytes),
            file: path.relative(output, file), root: batch.record.index,
            framing: { stdoutOffset: start, headerBytes: endHeader + 1 - start, bodyOffset: bodyStart, bodyBytes: length, terminatorOffset: bodyEnd, terminatorHex: '0a' }
        });
        offset = bodyEnd + 1;
    }
    assert.equal(offset, batch.stdout.length, 'No unframed batch suffix');
    save();
    console.log(JSON.stringify({ role, wholeBodies: old.length, captured: entries.map(x => x.path), roots: state.roots.length }));
}

async function main() {
    const [action, ...args] = process.argv.slice(2);
    guard(`action:${action}`);
    state.actions.push({ action, args, utc: new Date().toISOString() });
    save();
    if (action === 'init') {
        const registrar = path.join(parallel, 'Register-Owners-298-299.mjs');
        const folder = path.join(output, 'bootstrap');
        fs.mkdirSync(folder, { recursive: true });
        fs.copyFileSync(registrar, path.join(folder, 'Register-Owners-298-299.reference.mjs'), fs.constants.COPYFILE_EXCL);
        const automaticToolOutputs = [
            ['guard-discovery', 'C:\\Users\\jaslawin\\AppData\\Local\\Temp\\1795238281624-copilot-tool-output-2356-ee13b329-4b94-4cab-b169-28829d0700cc.txt'],
            ['policy-discovery', 'C:\\Users\\jaslawin\\AppData\\Local\\Temp\\1795238308005-copilot-tool-output-2356-c2036693-c779-4efb-8225-12de19344d43.txt']
        ];
        for (const [label, file] of automaticToolOutputs) {
            fs.copyFileSync(file, path.join(folder, label + '.automatic-tool-output.txt'), fs.constants.COPYFILE_EXCL);
        }
        writeJson(path.join(folder, 'acquisition-boundaries.json'), {
            separateGo: 'GO298 received after actual owner registration; no pre-GO tools.',
            commonContextsPerRole: [
                'Injected task/developer/repository-convention context in this fresh agent (not claimed newly read repository source).',
                'Operational registrar reference, read whole only to establish benchmark-exclusive.lease.json guard path; never executed or modified.'
            ],
            initialGuardDiscoveryTools: 11,
            initialGuardDiscoveryGitGhRoots: 0,
            initialGuardDiscoverySourceBodies: 0,
            initialGuardDiscoveryBoundary: 'Early read-only operational guard/path discovery used CLI transcript receipts. Two oversized automatic tool-output files are copied byte-exact here. Other early PowerShell guard stdout/stderr are in the conversation transcript, not independently captured binary streams. No retrospective raw-custody claim for those probes.',
            automaticToolOutputOrigin: 'Tool-managed temporary paths were read/copied only. This agent did not request or write temporary files.',
            sourceRootBoundary: 'Every subsequent direct Git/gh root uses this helper with exact stdin/stdout/stderr, direct PID exit+close and bounded-deadline observations. No descendants, arbitrary processes, machine-idle state, SDK or runtime are inspected.',
            acceptanceCriteria: [
                'Resolve a single freshly observed upstream Default and immutable Original without changing reserved R.',
                'Establish real selected stop-list, active-transport and configuration-reload producers and relevant contracts from whole pinned bodies, with bounded history/docs/tests.',
                'Return source-only proposal/no-material-candidate or justified next gate; no production-size assumption, lifecycle-only rejection, synthetic workload or runtime/performance claim.',
                'No more than 15 repository bodies plus at most 2 disclosed common contexts per role and 32 direct Git/gh roots, including failures; disclose gaps.',
                'Seal actual complete own-output inventory and payload hashes; parent independently qualifies and changes campaign disposition.'
            ]
        });
        const observed = await root('fresh-upstream-default', 'gh', ['api', 'graphql', '-f', 'query=query { repository(owner: "dotnet", name: "aspnetcore") { nameWithOwner defaultBranchRef { name target { oid ... on Commit { committedDate messageHeadline } } } } }']);
        const data = JSON.parse(observed.stdout).data.repository;
        assert.equal(data.nameWithOwner, 'dotnet/aspnetcore');
        state.default = data.defaultBranchRef.target.oid;
        state.defaultBranch = data.defaultBranchRef.name;
        state.defaultObservation = { root: observed.record.index, observedUtc: observed.record.closeObservedUtc, repository: data.nameWithOwner, branch: state.defaultBranch, commit: state.default, committedDate: data.defaultBranchRef.target.committedDate };
        save();
        fs.mkdirSync(path.join(output, 'metadata'), { recursive: true });
        for (const role of ['Original', 'Default']) {
            const commit = role === 'Original' ? original : state.default;
            const result = await root(`metadata-tree-${role}`, 'git', ['--no-pager', 'ls-tree', '-r', '-z', commit]);
            const entries = result.stdout.toString('utf8').split('\0').filter(Boolean).map(line => {
                const match = /^([0-7]{6}) (blob|tree|commit) ([a-f0-9]{40})\t(.*)$/s.exec(line);
                assert.notEqual(match, null);
                return { mode: match[1], type: match[2], oid: match[3], path: match[4] };
            });
            writeJson(path.join(output, 'metadata', role + '-tree.json'), entries);
            const choices = entries.filter(x => /(^|\/)(AGENTS\.md|TransportManager\.cs|KestrelServerImpl\.cs|KestrelConfigurationLoader\.cs|EndpointConfig\.cs|ConfigurationReader\.cs|ListenOptions\.cs|AddressBinder\.cs|.*(?:TransportManager|EndpointConfig|ConfigurationLoader|Reload|KestrelServer).*Tests?\.cs)$/.test(x.path)
                || /^\.github\/instructions\/.*(?:cross-cutting|server|kestrel).*\.md$/.test(x.path)
                || /^src\/Servers\/Kestrel\/.*(?:README|configuration|reload).*\.md$/i.test(x.path));
            writeJson(path.join(output, 'metadata', role + '-initial-selection-metadata.json'), choices);
            console.log(JSON.stringify({ role, commit, metadataEntries: entries.length, filenameChoices: choices }));
        }
    } else if (action === 'capture') {
        const [role, ...names] = args;
        assert.equal(['Original', 'Default'].includes(role), true);
        await capture(role, names);
    } else if (action === 'select') {
        const expression = new RegExp(args[0]);
        console.log(JSON.stringify(Object.fromEntries(['Original', 'Default'].map(role => [role, tree(role).filter(x => expression.test(x.path))])), null, 2));
    } else if (action === 'read') {
        for (const selector of args) {
            const separator = selector.indexOf(':');
            const role = selector.slice(0, separator);
            const name = selector.slice(separator + 1);
            const entry = state.bodies[role].find(x => x.path === name);
            assert.notEqual(entry, undefined, 'Only previously selected/captured source bodies may be read');
            const bytes = fs.readFileSync(path.join(output, entry.file));
            assert.equal(hash(bytes), entry.sha256);
            console.log(`\n===== ${entry.commitPath} (${entry.bytes} bytes; ${entry.sha256}) =====\n`);
            console.log(bytes.toString('utf8').split('\n').map((line, index) => `${index + 1}: ${line}`).join('\n'));
        }
    } else if (action === 'history') {
        const role = args[0];
        const names = args.slice(1);
        selected(role, names);
        const commit = role === 'Original' ? original : state.default;
        const result = await root(`history-${role}`, 'git', ['--no-pager', 'log', commit, '-8', '--format=%H%x09%aI%x09%s', '--', ...names]);
        console.log(result.stdout.toString('utf8'));
    } else if (action === 'history-detail') {
        const [commit, ...names] = args;
        assert.match(commit, /^[a-f0-9]{40}$/);
        for (const name of names) {
            assert.equal([...state.bodies.Original, ...state.bodies.Default].some(x => x.path === name), true);
        }
        const result = await root(`history-detail-${commit.slice(0, 10)}`, 'git', ['--no-pager', 'show', '--format=fuller', '--no-ext-diff', '--unified=5', commit, '--', ...names]);
        console.log(result.stdout.toString('utf8'));
    } else if (action === 'status') {
        console.log(JSON.stringify({ owner, original, default: state.default, directGitGhRoots: state.roots.length, wholeRepositoryBodies: Object.fromEntries(Object.entries(state.bodies).map(([k,v])=>[k,v.length])), prospectiveEnclosingToolExit: null }, null, 2));
    } else {
        throw new Error('Unknown evidence action: ' + action);
    }
}

main().catch(error => {
    const failure = { utc: new Date().toISOString(), name: error.name, message: error.message, stack: error.stack, prospectiveEnclosingToolExit: null };
    fs.appendFileSync(path.join(output, 'helper-failures.jsonl'), JSON.stringify(failure) + '\n');
    console.error(error.stack);
    process.exitCode = 1;
});
