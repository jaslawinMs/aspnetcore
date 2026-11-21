import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F207-225`;
const repo = String.raw`C:\src\aspnetcore`;
const controls = path.dirname(root);
const owner = '2d68b596-6cf0-421c-8e56-42a1a990cb9e';
const original = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const expectedHead = '24875ef5dabb55567870b39f6eb0002170435e2f';
const out = path.join(root, 'capture-v001');
fs.mkdirSync(out, { recursive: true });
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const write = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const policyBytes = fs.readFileSync(path.join(controls, 'policy.json'));
const policy = JSON.parse(policyBytes);
if (policy.independentFindingPreparationWorkers?.F207 !== owner || !policy.activeWorkerPreparationScopes?.F207?.includes('225')) {
    throw new Error('F207 registration/scope mismatch');
}
fs.writeFileSync(path.join(out, 'policy-observed.json'), policyBytes, { flag: 'wx' });
write('admission-source-only.json', {
    recordedAtUtc: new Date().toISOString(),
    explicitGo: 'Coordinator GO225 received 2026-11-21T01:09:38.013Z',
    owner,
    policySha256: sha256(policyBytes),
    registration: policy.independentFindingPreparationWorkers.F207,
    registeredOwnerCount: Object.keys(policy.independentFindingPreparationWorkers).length,
    maximumRegisteredPreparationOwners: policy.maximumRegisteredPreparationOwners,
    scope: policy.activeWorkerPreparationScopes.F207,
    benchmarkLeasePresent: fs.existsSync(path.join(controls, 'benchmark-exclusive.lease.json')),
    actualWorkerBuildHoldActive: policy.actualWorkerBuildHoldActive,
    buildAndTestWorkQuiesced: policy.buildAndTestWorkQuiesced,
    sourceOnly: true,
    nativeBuildTestOrPerformanceAuthorityExercised: false
});

const commands = [];
function run(id, exe, argv) {
    const startedAtUtc = new Date().toISOString();
    const result = spawnSync(exe, argv, {
        cwd: repo,
        windowsHide: true,
        encoding: null,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat', GH_PAGER: 'cat', GH_PROMPT_DISABLED: '1' },
        maxBuffer: 32 * 1024 * 1024
    });
    const stdout = result.stdout ?? Buffer.alloc(0);
    const stderr = result.stderr ?? Buffer.alloc(0);
    fs.writeFileSync(path.join(out, `${id}.stdout`), stdout, { flag: 'wx' });
    fs.writeFileSync(path.join(out, `${id}.stderr`), stderr, { flag: 'wx' });
    commands.push({
        id, exe, argv, cwd: repo, startedAtUtc, completedAtUtc: new Date().toISOString(),
        explicitEnvironment: { GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat', GH_PAGER: 'cat', GH_PROMPT_DISABLED: '1' },
        inheritedEnvironment: 'Inherited; not dumped to avoid unrelated credentials. No dotnet/build/test/runtime invoked.',
        exitCode: result.status, signal: result.signal, error: result.error ? String(result.error) : null,
        stdout: `${id}.stdout`, stdoutBytes: stdout.length, stdoutSha256: sha256(stdout),
        stderr: `${id}.stderr`, stderrBytes: stderr.length, stderrSha256: sha256(stderr)
    });
    write(`commands-through-${id}.json`, commands);
    return { ...result, stdout, stderr };
}
function required(id, exe, argv) {
    const result = run(id, exe, argv);
    if (result.status !== 0 || result.error) {
        throw new Error(`${id} failed; see retained streams and command receipt`);
    }
    return result.stdout;
}

const head = required('001-head', 'git', ['--no-pager', 'rev-parse', 'HEAD']).toString('utf8').trim();
const branch = required('002-branch', 'git', ['--no-pager', 'branch', '--show-current']).toString('utf8').trim();
const status = required('003-status', 'git', ['--no-pager', '-c', 'core.quotepath=false', 'status', '--porcelain=v1', '--untracked-files=all']).toString('utf8');
required('004-diff', 'git', ['--no-pager', 'diff', '--binary']);
required('005-index-diff', 'git', ['--no-pager', 'diff', '--cached', '--binary']);
required('006-root', 'git', ['--no-pager', 'rev-parse', '--show-toplevel']);
required('007-original-commit', 'git', ['--no-pager', 'show', '-s', '--format=fuller', original]);
if (head !== expectedHead || branch !== 'autoperf/F145-hoist-large-response-utf8-encoding') {
    throw new Error('Reserved checkout identity differs from authorized HEAD/branch; source investigation stopped');
}
const statusEntries = status.split(/\r?\n/).filter(Boolean);
const untracked = statusEntries.filter(line => line.startsWith('?? ')).map(line => {
    const relative = line.slice(3);
    const bytes = fs.readFileSync(path.join(repo, relative));
    return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
});
if (statusEntries.length !== 4 || untracked.length !== 4) {
    throw new Error('Reserved status differs from expected four unrelated untracked reports');
}
write('reserved-start.json', { recordedAtUtc: new Date().toISOString(), repo, head, branch, statusEntries, untracked, noWritesToReservedCheckout: true });

const branchBytes = required('008-upstream-main', 'gh', ['api', 'repos/dotnet/aspnetcore/branches/main']);
const upstream = JSON.parse(branchBytes.toString('utf8'));
const defaultSha = upstream.commit?.sha;
if (!/^[0-9a-f]{40}$/.test(defaultSha ?? '')) {
    throw new Error('Upstream main SHA not established');
}
const defaultLocal = run('009-default-object', 'git', ['--no-pager', 'cat-file', '-e', `${defaultSha}^{commit}`]);
write('source-roles.json', {
    recordedAtUtc: new Date().toISOString(),
    Original: { commit: original, repository: 'dotnet/aspnetcore', selection: 'User-designated original' },
    Default: { commit: defaultSha, repository: 'dotnet/aspnetcore', branch: 'main', observationCommand: '008-upstream-main', localCommitAvailable: defaultLocal.status === 0 },
    Reserved: { commit: head, branch, role: 'Read-only checkout; not Default' }
});
write('instruction-read-receipt.json', {
    instructionReadsBeforeGo: [
        '.github\\copilot-instructions.md',
        '.github\\instructions\\cross-cutting-guidance.instructions.md',
        'docs\\CrossCuttingGuidance.md',
        'docs\\BuildFromSource.md lines 1-220',
        'src\\DataProtection\\README.md'
    ],
    applicableAgentsSearch: { rootAgentsAbsent: true, srcAgentsAbsent: true, dataProtectionDescendantAgents: [] },
    preservedToolFailuresBeforeGo: [
        { tool: 'view', target: 'C:\\src\\aspnetcore\\AGENTS.md', result: 'Path does not exist' },
        { tool: 'view', target: 'policy.json without range', result: 'Too large; subsequently read bounded ranges' },
        { tool: 'write_agent', target: 'a24edcfd-1bb9-4160-afce-6ba54b1b7f00', result: 'No agent found; no source or native action followed before GO225' }
    ],
    noNativeWork: true
});
console.log(JSON.stringify({ sourceOnly: true, owner, original, default: defaultSha, defaultLocal: defaultLocal.status === 0, reservedHead: head, untrackedCount: untracked.length }));
