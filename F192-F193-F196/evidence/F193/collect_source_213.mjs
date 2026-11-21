import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const REPO = String.raw`C:\src\aspnetcore`;
export const CAMPAIGN = path.dirname(ROOT);
export const ORIGINAL = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
export const REPORTED_DEFAULT = 'd3483989953ae3cccd773aea5ea04cb0c7198531';
export const OWNER = 'c1cf1d27-371f-40da-9895-3a099570e45e';
export const utc = () => new Date().toISOString();
export const sha256 = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();

export function writeJson(relative, data, update = false) {
    const destination = path.join(ROOT, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (!update && fs.existsSync(destination)) throw new Error(`Refusing replay/overwrite: ${destination}`);
    fs.writeFileSync(destination, JSON.stringify(data, null, 2) + '\n');
}

export function run(label, argv, allowed = [0]) {
    const relative = path.join('commands', label + '.json');
    const recordPath = path.join(ROOT, relative);
    if (fs.existsSync(recordPath)) throw new Error(`Refusing command replay: ${label}`);
    fs.mkdirSync(path.dirname(recordPath), { recursive: true });
    const startedUtc = utc();
    const result = spawnSync(argv[0], argv.slice(1), {
        cwd: REPO, windowsHide: true, input: undefined, maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat', GH_PAGER: 'cat' },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout = result.stdout ?? Buffer.alloc(0);
    const stderr = result.stderr ?? Buffer.alloc(0);
    const stdoutRelative = path.join('commands', label + '.stdout.txt');
    const stderrRelative = path.join('commands', label + '.stderr.txt');
    fs.writeFileSync(path.join(ROOT, stdoutRelative), stdout);
    fs.writeFileSync(path.join(ROOT, stderrRelative), stderr);
    writeJson(relative, {
        label, argv, cwd: REPO, startedUtc, finishedUtc: utc(), processId: result.pid,
        returnCode: result.status, signal: result.signal, spawnError: result.error?.message ?? null,
        stdout: stdoutRelative, stdoutBytes: stdout.length, stdoutSha256: sha256(stdout),
        stderr: stderrRelative, stderrBytes: stderr.length, stderrSha256: sha256(stderr),
        rootAwaited: true, bothRedirectedStreamsAwaited: true,
        executionClass: 'Read-only source/metadata; not build, test, restore or performance work',
    });
    if (result.error || !allowed.includes(result.status)) {
        throw new Error(`${label}: exit ${result.status}; see retained stdout/stderr`);
    }
    return stdout;
}

export const git = (label, args, allowed = [0]) =>
    run(label, ['git', '--no-pager', '-C', REPO, ...args], allowed);

export function snapshot(label, sourcePath) {
    const data = fs.readFileSync(sourcePath);
    const relative = path.join('snapshots', label);
    const destination = path.join(ROOT, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, data, { flag: 'wx' });
    return {
        path: sourcePath, artifact: relative, bytes: data.length,
        sha256: sha256(data), observedUtc: utc(),
    };
}

export function captureFile(role, revision, gitPath) {
    const manifestPath = path.join(ROOT, 'source-manifest.json');
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath)) : [];
    if (manifest.some(entry => entry.role === role && entry.gitPath === gitPath)) return;
    const slug = gitPath.replaceAll('/', '__').replaceAll('.', '_');
    const membership = git(`source-${role}-${slug}-membership`, ['ls-tree', revision, '--', gitPath]);
    const row = membership.toString('utf8').trim();
    if (!row) {
        manifest.push({
            role, revision, gitPath, present: false,
            membershipCommand: `commands\\source-${role}-${slug}-membership.json`,
        });
    } else {
        const [fields, observedPath] = row.split('\t');
        const [mode, kind, oid] = fields.split(' ');
        if (kind !== 'blob' || observedPath !== gitPath) throw new Error(`Unexpected membership: ${row}`);
        const data = git(`source-${role}-${slug}-blob`, ['cat-file', 'blob', oid]);
        const relative = path.join('source', role, ...gitPath.split('/'));
        const destination = path.join(ROOT, relative);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, data, { flag: 'wx' });
        const actualGitOid = crypto.createHash('sha1')
            .update(`blob ${data.length}\0`).update(data).digest('hex');
        if (actualGitOid !== oid) throw new Error('Blob identity mismatch');
        manifest.push({
            role, revision, gitPath, present: true, mode, gitBlob: oid,
            bytes: data.length, sha256: sha256(data), artifact: relative,
            membershipCommand: `commands\\source-${role}-${slug}-membership.json`,
            blobCommand: `commands\\source-${role}-${slug}-blob.json`,
            rawGitBlobIdentityVerified: true,
        });
    }
    writeJson('source-manifest.json', manifest, true);
}

function initial() {
    if (fs.existsSync(path.join(ROOT, 'INITIAL.json'))) throw new Error('Initial capture already exists');
    const policySnapshot = snapshot('policy-initial.json', path.join(CAMPAIGN, 'policy.json'));
    const policy = JSON.parse(fs.readFileSync(path.join(ROOT, policySnapshot.artifact)));
    const reports = [
        'autoperf-issue-70219-deduplicated-report.html',
        'autoperf-issue-70219-duplicate-report.html',
        'autoperf-scan-report.md',
        'performance-antipattern-findings.md',
    ];
    const reportHashes = reports.map(name => {
        const data = fs.readFileSync(path.join(REPO, name));
        return { path: path.join(REPO, name), bytes: data.length, sha256: sha256(data) };
    });
    const lease = path.join(policy.runsRoot, 'benchmark-exclusive.lease.json');
    const leaseObservation = { path: lease, exists: fs.existsSync(lease), observedUtc: utc() };
    if (leaseObservation.exists) leaseObservation.snapshot = snapshot('benchmark-lease-initial.json', lease);
    const instructionReads = [
        String.raw`src\Components\AGENTS.md`,
        String.raw`.github\instructions\components.instructions.md`,
        String.raw`.github\instructions\cross-cutting-guidance.instructions.md`,
        String.raw`.github\instructions\components.server.instructions.md`,
        String.raw`docs\BuildFromSource.md`,
        String.raw`docs\BlazorComponentsGuidance.md`,
        String.raw`docs\CrossCuttingGuidance.md`,
    ].map(relative => snapshot('instructions-' + relative.replaceAll('\\', '__'), path.join(REPO, relative)));
    writeJson('instruction-read-manifest.json', instructionReads);
    writeJson('INITIAL.json', {
        recordedUtc: utc(), finding: 'F193', preparation: 213, ownerAgentId: OWNER,
        host: os.hostname(), nodeExecutable: process.execPath, nodeVersion: process.version,
        collectorPid: process.pid, policy: policySnapshot,
        actualRegisteredOwner: policy.independentFindingPreparationWorkers.F193,
        registeredOwnerCount: Object.keys(policy.independentFindingPreparationWorkers).length,
        maximumOwners: policy.maximumRegisteredPreparationOwners,
        actualWorkerBuildHoldActive: policy.actualWorkerBuildHoldActive,
        buildAndTestWorkQuiesced: policy.buildAndTestWorkQuiesced,
        scope: policy.activeWorkerPreparationScopes.F193, actualLease: leaseObservation,
        reservedReports: reportHashes,
        authority: {
            go213Received: true, coordinatorObservationUtc: '2026-11-21T00:34:42.2416286Z',
            coordinatorPolicyReadToolId: '4467', goAppliesOnlyIfCandidateSurvives: true,
            nativeExecutionInThisCollection: false,
        },
        interpreterCorrection: {
            firstAttempt: 'python .\\collect_source_213.py',
            actualExit: 9009, failedShellId: '4475',
            failure: 'Python executable resolved to Windows Store alias, not an installed interpreter',
            retainedEvidence: ['collect_source_213.py', 'collector.initial.stdout.txt',
                'collector.initial.stderr.txt', 'collector.initial.exit.json'],
            correction: 'Use already-available Node v26.13.0; no package/tool install',
            nodeProbeShellId: '4478',
        },
        bootstrapTools: [
            {
                tool: 'functions.powershell', shellId: '4465', exit: 0,
                commands: [
                    'Get-ChildItem -LiteralPath <campaign root> -Force | Select-Object Name,Mode,Length',
                    'git --no-pager -C C:\\src\\aspnetcore status --porcelain=v1 -uall',
                    'git --no-pager -C C:\\src\\aspnetcore branch --show-current',
                    'git --no-pager -C C:\\src\\aspnetcore rev-parse HEAD',
                ],
                observedBranch: 'autoperf/F145-hoist-large-response-utf8-encoding',
                observedHead: '24875ef5dabb55567870b39f6eb0002170435e2f',
                observedStatus: reports.map(name => '?? ' + name),
                limitation: 'Bootstrap full output is retained in tool history, not a local stdout artifact.',
            },
            {
                tool: 'functions.lsp', operation: 'documentSymbol',
                file: path.join(REPO, String.raw`src\Components\test\testassets\Components.TestServer\Controllers\PersonController.cs`),
                result: 'PersonController.Delete() : string at line 48; identity/navigation only, not pinned behavioral evidence',
            },
        ],
    });
    if (policy.independentFindingPreparationWorkers.F193 !== OWNER) throw new Error('Actual owner mismatch');
    git('reserved-initial-status', ['status', '--porcelain=v1', '-uall']);
    git('reserved-initial-head', ['rev-parse', 'HEAD']);
    git('reserved-initial-branch', ['symbolic-ref', '--short', 'HEAD']);
    git('reserved-initial-diff', ['diff', '--binary', '--no-ext-diff']);
    git('reserved-initial-index-diff', ['diff', '--cached', '--binary', '--no-ext-diff']);
    git('related-remotes', ['remote', '-v']);
    const repoResult = run('upstream-repository', ['gh', 'api', 'repos/dotnet/aspnetcore']);
    const defaultBranch = JSON.parse(repoResult).default_branch;
    const branchStartedUtc = utc();
    const branchResult = run('upstream-default-branch',
        ['gh', 'api', `repos/dotnet/aspnetcore/branches/${defaultBranch}`]);
    const observedDefault = JSON.parse(branchResult).commit.sha;
    const roles = {};
    for (const [role, revision] of [['Original', ORIGINAL], ['Default', observedDefault]]) {
        git(`role-${role}-commit-exists`, ['cat-file', '-e', revision + '^{commit}'], [0, 1, 128]);
        const record = JSON.parse(fs.readFileSync(path.join(ROOT, 'commands', `role-${role}-commit-exists.json`)));
        roles[role] = { revision, localCommitExists: record.returnCode === 0 };
        if (record.returnCode === 0) git(`role-${role}-commit-metadata`, ['show', '-s', '--format=fuller', revision]);
    }
    writeJson('SOURCE-ROLES.json', {
        recordedUtc: utc(), upstreamRepository: 'dotnet/aspnetcore',
        observedDefaultBranch: defaultBranch, defaultObservationStartedUtc: branchStartedUtc,
        observedDefaultCommit: observedDefault, reportedDefaultCommit: REPORTED_DEFAULT,
        reportedDefaultStillCurrentAtObservation: observedDefault === REPORTED_DEFAULT,
        roles, fetchOrRefUpdatesPerformed: false, reservedCheckoutIsNotABaseline: true,
        upstreamEvidence: ['commands\\upstream-repository.json', 'commands\\upstream-default-branch.json'],
    });
    if (Object.values(roles).some(role => !role.localCommitExists)) {
        throw new Error('Current role commit missing locally; preserve limitation, do not fetch/substitute');
    }
    const paths = [
        'src/Components/test/testassets/Components.TestServer/Controllers/PersonController.cs',
        'src/Components/test/testassets/Components.TestServer/Components.TestServer.csproj',
        'src/Components/test/testassets/Components.TestServer/Startup.cs',
        'src/Components/test/testassets/Components.TestServer/Program.cs',
        'src/Http/Http/src/HeaderDictionary.cs',
        'src/Http/Http.Features/src/IHeaderDictionary.cs',
        'eng/Version.Details.xml', 'eng/Versions.props', 'global.json',
        'src/Components/AGENTS.md', '.github/instructions/components.instructions.md',
        '.github/instructions/cross-cutting-guidance.instructions.md',
        '.github/instructions/components.server.instructions.md',
        'docs/BuildFromSource.md', 'docs/BlazorComponentsGuidance.md', 'docs/CrossCuttingGuidance.md',
    ];
    for (const [role, revision] of [['Original', ORIGINAL], ['Default', observedDefault]]) {
        for (const gitPath of paths) captureFile(role, revision, gitPath);
        git(`discovery-${role}-person-consumers`, ['grep', '-n', '-i', '-E',
            'api/person|PersonController', revision, '--', 'src/Components'], [0, 1]);
        git(`history-${role}-controller-follow`, ['log', '--follow', '-n', '12',
            '--format=fuller', '--name-status', revision, '--', paths[0]]);
        git(`history-${role}-controller-patches`, ['log', '-n', '8', '-p',
            '--format=fuller', revision, '--', paths[0]]);
    }
    console.log(JSON.stringify({ phase: 'initial-source-captured', default: observedDefault, root: ROOT }));
}

if (path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) initial();
