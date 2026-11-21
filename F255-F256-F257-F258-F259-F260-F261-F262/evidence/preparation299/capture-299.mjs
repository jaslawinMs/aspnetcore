import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const output = import.meta.dirname;
const parallel = path.dirname(output);
const sessionFiles = path.dirname(parallel);
const repository = 'C:\\src\\aspnetcore';
const owner = 'a4e76420-cb81-4c3e-9008-491e049270d2';
const original = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeNew = (file, value) => fs.writeFileSync(path.join(output, file), value, { flag: 'wx' });
const writeJson = (file, value) => writeNew(file, JSON.stringify(value, null, 2) + '\n');
const acceptanceFile = path.join(output, 'PARENT-ACCEPTANCE.json');
const registrationFile = path.join(parallel, 'owner-registrations-298-299.json');
const policyFile = path.join(parallel, 'policy.json');
const campaignFile = path.join(sessionFiles, 'autoperf-campaign.json');
const leaseFile = path.join(parallel, 'benchmark-exclusive.lease.json');

function guard()
{
    const acceptanceBytes = fs.readFileSync(acceptanceFile);
    const registrationBytes = fs.readFileSync(registrationFile);
    const policyBytes = fs.readFileSync(policyFile);
    const campaignBytes = fs.readFileSync(campaignFile);
    const acceptance = JSON.parse(acceptanceBytes);
    const registration = JSON.parse(registrationBytes);
    const policy = JSON.parse(policyBytes);
    const campaign = JSON.parse(campaignBytes);
    const entry = registration.entries.find(value => value.key === 'F258');
    assert.equal(entry.actualOwner, owner);
    assert.equal(entry.phase, 299);
    assert.deepEqual(entry.findings, ['F258', 'F259']);
    assert.equal(entry.folder, path.basename(output));
    assert.equal(acceptance.actualOwner, owner);
    assert.equal(acceptance.phase, 299);
    assert.deepEqual(acceptance.findings, ['F258', 'F259']);
    assert.equal(acceptance.scope, entry.scope);
    assert.equal(policy.independentFindingPreparationWorkers.F258, owner);
    assert.equal(policy.activeWorkerPreparationScopes.F258, acceptance.scope);
    assert.ok(Object.keys(policy.independentFindingPreparationWorkers).length <= 4);
    assert.equal(policy.actualWorkerBuildHoldActive, false);
    assert.equal(policy.buildAndTestWorkQuiesced, false);
    assert.equal(fs.existsSync(leaseFile), false);
    for (const id of ['F258', 'F259'])
    {
        assert.equal(campaign.candidates.filter(value => value.id === id).length, 1);
        assert.equal(campaign.candidates.find(value => value.id === id).status, 'pending');
    }
    return {
        observedUtc: new Date().toISOString(),
        actualOwner: owner,
        phase: 299,
        separateGo299Received: true,
        exactRegisteredScope: acceptance.scope,
        registeredOwnerCount: Object.keys(policy.independentFindingPreparationWorkers).length,
        holdActive: policy.actualWorkerBuildHoldActive,
        workQuiesced: policy.buildAndTestWorkQuiesced,
        lease: { path: leaseFile, exists: false },
        pending: ['F258', 'F259'],
        inputs: [
            [acceptanceFile, acceptanceBytes],
            [registrationFile, registrationBytes],
            [policyFile, policyBytes],
            [campaignFile, campaignBytes]
        ].map(([file, bytes]) => ({ path: file, bytes: bytes.length, sha256: sha256(bytes) })),
        boundedObservationOnly: 'Fresh checks immediately before this direct root; not an atomic global lease or a claim about unrelated processes.'
    };
}

function existingRoots()
{
    return fs.readdirSync(output).filter(file => /^\d{2}-.*\.command\.json$/.test(file)).sort();
}

async function root(label, executable, args, stdin = Buffer.alloc(0))
{
    const number = existingRoots().length + 1;
    assert.ok(number <= 32, 'Git/gh root budget exhausted, including failures.');
    assert.ok(executable === 'git' || executable === 'gh');
    const prefix = `${String(number).padStart(2, '0')}-${label}`;
    writeJson(`${prefix}.guard.json`, guard());
    writeNew(`${prefix}.stdin.bin`, stdin);
    const start = {
        number, label, executable, args, cwd: repository,
        stdin: { file: `${prefix}.stdin.bin`, bytes: stdin.length, sha256: sha256(stdin) },
        helper: { pid: process.pid, parentPid: process.ppid, argv: process.argv, version: process.version },
        startedUtc: new Date().toISOString(),
        sourceOnly: true,
        environmentOverrides: { GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat', PAGER: 'cat', GH_PAGER: 'cat', GH_PROMPT_DISABLED: '1' }
    };
    writeJson(`${prefix}.command.json`, start);
    const stdout = fs.createWriteStream(path.join(output, `${prefix}.stdout.bin`), { flags: 'wx' });
    const stderr = fs.createWriteStream(path.join(output, `${prefix}.stderr.bin`), { flags: 'wx' });
    const stdoutChunks = [];
    const stderrChunks = [];
    let launchError = null;
    let exitEvent = null;
    const child = spawn(executable, args, {
        cwd: repository, windowsHide: true, shell: false,
        env: { ...process.env, ...start.environmentOverrides },
        stdio: ['pipe', 'pipe', 'pipe']
    });
    writeJson(`${prefix}.spawn.json`, {
        helperPid: process.pid, rootPid: child.pid ?? null,
        observationUtc: new Date().toISOString(),
        observedDescendants: [],
        observationBoundary: 'Direct spawned root only; descendants are not independently enumerated or proven absent.'
    });
    child.stdout.on('data', chunk => { stdout.write(chunk); stdoutChunks.push(chunk); });
    child.stderr.on('data', chunk => { stderr.write(chunk); stderrChunks.push(chunk); });
    child.on('error', error => { launchError = { name: error.name, code: error.code, message: error.message, stack: error.stack }; });
    child.on('exit', (code, signal) => { exitEvent = { utc: new Date().toISOString(), code, signal }; });
    child.stdin.on('error', error =>
    {
        writeJson(`${prefix}.stdin-error.json`, { utc: new Date().toISOString(), code: error.code, message: error.message });
    });
    child.stdin.end(stdin);
    const close = await new Promise(resolve => child.on('close', (code, signal) => resolve({ utc: new Date().toISOString(), code, signal })));
    await Promise.all([
        new Promise(resolve => stdout.end(resolve)),
        new Promise(resolve => stderr.end(resolve))
    ]);
    const out = Buffer.concat(stdoutChunks);
    const err = Buffer.concat(stderrChunks);
    const terminal = {
        number, label, rootPid: child.pid ?? null, launchError, exitEvent, close,
        stdout: { file: `${prefix}.stdout.bin`, bytes: out.length, sha256: sha256(out), complete: true },
        stderr: { file: `${prefix}.stderr.bin`, bytes: err.length, sha256: sha256(err), complete: true },
        stdin: start.stdin,
        allDirectRootsAwaited: true,
        independentlyObservedDescendants: [],
        descendantCensusComplete: false,
        limitations: 'No arbitrary timeout or stop. Exit and close plus fully drained direct streams are observed. This does not prove that unobserved descendants or unrelated work are absent.'
    };
    writeJson(`${prefix}.terminal.json`, terminal);
    console.log(JSON.stringify({ number, label, pid: child.pid ?? null, exit: close.code, stdoutBytes: out.length, stderrBytes: err.length }));
    assert.equal(launchError, null, 'Root launch failure retained; no retry.');
    assert.equal(close.code, 0, 'Nonzero root retained; stop without replacement or retry.');
    return { prefix, stdout: out };
}

function parseTree(buffer)
{
    return buffer.toString('utf8').split('\0').filter(Boolean).map(line =>
    {
        const match = /^([0-7]+) ([^ ]+) ([0-9a-f]+) +([0-9-]+)\t(.*)$/s.exec(line);
        assert.ok(match, 'Unrecognized ls-tree metadata framing.');
        return { mode: match[1], type: match[2], blob: match[3], bytes: Number(match[4]), path: match[5] };
    });
}

async function discover()
{
    writeJson('initial-guard.json', guard());
    for (const [label, file] of [['policy', policyFile], ['registration', registrationFile]])
    {
        writeNew(`initial-${label}.bin`, fs.readFileSync(file));
    }
    const campaign = readJson(campaignFile);
    writeJson('initial-pending-findings.json', campaign.candidates.filter(value => ['F258', 'F259'].includes(value.id)));
    const repositoryResponse = await root('github-repository', 'gh', ['api', 'repos/dotnet/aspnetcore']);
    const defaultBranch = JSON.parse(repositoryResponse.stdout).default_branch;
    assert.equal(typeof defaultBranch, 'string');
    const commitResponse = await root('github-observed-default', 'gh', ['api', `repos/dotnet/aspnetcore/commits/${encodeURIComponent(defaultBranch)}`]);
    const defaultCommit = JSON.parse(commitResponse.stdout).sha;
    assert.match(defaultCommit, /^[0-9a-f]{40}$/);
    assert.notEqual(defaultCommit, '24875ef5dabb55567870b39f6eb0002170435e2f');
    writeJson('pins.json', {
        observedUtc: new Date().toISOString(), original,
        default: { branch: defaultBranch, commit: defaultCommit, repositoryResponse: repositoryResponse.prefix, commitResponse: commitResponse.prefix },
        reservedWorkingTree: { path: repository, declaredBranch: 'autoperf/F145-hoist-large-response-utf8-encoding', declaredHead: '24875ef5dabb55567870b39f6eb0002170435e2f', usedAsDefault: false, modified: false },
        metadataOnly: true
    });
    const trees = {};
    for (const [role, commit] of [['Original', original], ['Default', defaultCommit]])
    {
        const captured = await root(`tree-${role}`, 'git', ['--no-pager', 'ls-tree', '-r', '-l', '-z', '--full-tree', commit]);
        const entries = parseTree(captured.stdout);
        trees[role] = { commit, raw: captured.prefix, entries };
        writeJson(`tree-${role}.json`, trees[role]);
    }
    const classPaths = await root('knownheaders-class-paths', 'git', [
        '--no-pager', 'grep', '-l', '-z', '-F', '-e', 'class KnownHeaders',
        original, defaultCommit, '--', 'src/Servers/Kestrel/shared/KnownHeaders.cs'
    ]);
    const selectedNames = classPaths.stdout.toString('utf8').split('\0').filter(Boolean);
    assert.deepEqual(selectedNames.sort(), [
        `${original}:src/Servers/Kestrel/shared/KnownHeaders.cs`,
        `${defaultCommit}:src/Servers/Kestrel/shared/KnownHeaders.cs`
    ].sort());
    writeJson('initial-path-selection.json', {
        classMetadata: classPaths.prefix,
        roleSelections: Object.fromEntries(Object.entries(trees).map(([role, tree]) => [role, {
            commit: tree.commit,
            paths: tree.entries.filter(entry =>
                /(^|\/)AGENTS\.md$/.test(entry.path) && (entry.path === 'AGENTS.md' || entry.path.startsWith('src/Servers/')) ||
                entry.path.startsWith('src/Servers/Kestrel/') && /KnownHeaders|CodeGenerator|(^|\/)build\.(cmd|ps1|sh)$|\.csproj$|README|\.targets$|\.props$/i.test(entry.path) ||
                /^\.github\/instructions\/(cross-cutting-guidance|build)\.instructions\.md$/.test(entry.path) ||
                entry.path === 'docs/BuildFromSource.md'
            )
        }]))
    });
    console.log(JSON.stringify({ original, defaultCommit, defaultBranch, roots: existingRoots().length, repositoryBodies: 0 }));
}

async function capture(selectionName)
{
    const selection = readJson(path.join(output, selectionName));
    const pins = readJson(path.join(output, 'pins.json'));
    for (const role of ['Original', 'Default'])
    {
        const tree = readJson(path.join(output, `tree-${role}.json`));
        const expectedCommit = role === 'Original' ? pins.original : pins.default.commit;
        assert.equal(tree.commit, expectedCommit);
        const previous = fs.readdirSync(output).filter(file => file.startsWith(`bodies-${role}-`) && file.endsWith('.json'))
            .flatMap(file => readJson(path.join(output, file)).entries);
        const paths = selection[role];
        assert.ok(Array.isArray(paths));
        assert.ok(previous.length + paths.length <= 15, 'Whole repository body cap reached.');
        assert.equal(new Set([...previous.map(entry => entry.path), ...paths]).size, previous.length + paths.length, 'No repeated or replacement body captures.');
        const entries = paths.map(selectedPath =>
        {
            const matches = tree.entries.filter(entry => entry.path === selectedPath);
            assert.equal(matches.length, 1, 'Selection must have exactly one previously observed metadata path.');
            assert.equal(matches[0].type, 'blob');
            return { ...matches[0], role, commit: expectedCommit, expression: `${expectedCommit}:${selectedPath}` };
        });
        writeJson(`selection-${role}-${path.basename(selectionName)}`, { role, commit: expectedCommit, entries, selectedBeforeBody: true });
        const stdin = Buffer.from(entries.map(entry => entry.expression + '\n').join(''), 'utf8');
        const captured = await root(`body-${role}-${path.basename(selectionName, '.json')}`, 'git', ['--no-pager', 'cat-file', '--batch'], stdin);
        let offset = 0;
        const framed = [];
        for (let index = 0; index < entries.length; index++)
        {
            const entry = entries[index];
            const headerEnd = captured.stdout.indexOf(10, offset);
            assert.ok(headerEnd >= offset);
            const header = captured.stdout.subarray(offset, headerEnd).toString('ascii');
            const fields = header.split(' ');
            assert.deepEqual(fields, [entry.blob, 'blob', String(entry.bytes)], 'Exact git cat-file header mismatch; raw failure retained.');
            const start = headerEnd + 1;
            const end = start + entry.bytes;
            assert.equal(captured.stdout[end], 10);
            const bytes = captured.stdout.subarray(start, end);
            const file = `${role}-${String(previous.length + index + 1).padStart(2, '0')}-${entry.path.replaceAll('/', '__')}.bin`;
            writeNew(file, bytes);
            const gitObjectId = crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
            assert.equal(gitObjectId, entry.blob);
            framed.push({
                ...entry, file, sha256: sha256(bytes), gitObjectIdVerified: true,
                raw: `${captured.prefix}.stdout.bin`,
                framing: { headerStart: offset, headerEndExclusive: headerEnd + 1, bodyStart: start, bodyEndExclusive: end, trailingNewlineOffset: end },
                wholeBody: true, normalized: false
            });
            offset = end + 1;
        }
        assert.equal(offset, captured.stdout.length, 'Unconsumed batch output.');
        writeJson(`bodies-${role}-${path.basename(selectionName)}`, {
            role, commit: expectedCommit, sourceSelection: selectionName,
            entries: framed, cumulativeRepositoryBodies: previous.length + entries.length,
            maximumRepositoryBodies: 15, maximumInjectedCommonContexts: 2, maximumInclusiveInputs: 17
        });
    }
}

const mode = process.argv[2];
try
{
    if (mode === 'discover')
    {
        await discover();
    }
    else if (mode === 'capture')
    {
        await capture(process.argv[3]);
    }
    else if (mode === 'root')
    {
        const request = readJson(path.join(output, process.argv[3]));
        await root(request.label, request.executable, request.args, request.stdinFile ? fs.readFileSync(path.join(output, request.stdinFile)) : Buffer.alloc(0));
    }
    else
    {
        throw new Error('Expected discover, capture, or root.');
    }
}
catch (error)
{
    const failure = `helper-failure-${Date.now()}-${process.pid}.json`;
    writeJson(failure, { utc: new Date().toISOString(), mode, error: { name: error.name, message: error.message, stack: error.stack }, rootsConsumed: existingRoots().length });
    console.error(error.stack);
    process.exitCode = 1;
}
