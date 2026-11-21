import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F207-225`;
const repo = String.raw`C:\src\aspnetcore`;
const out = path.join(root, 'capture-v006');
fs.mkdirSync(out, { recursive: true });
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const gitBlobSha1 = bytes => crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
const write = (target, value) => fs.writeFileSync(target, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const roles = JSON.parse(fs.readFileSync(path.join(root, 'capture-v001', 'source-roles.json'), 'utf8'));
const assessment = JSON.parse(fs.readFileSync(path.join(root, 'assessment-225.json'), 'utf8'));
const commands = [];
const memberships = [];
let next = 1;
function run(label, exe, argv) {
    const id = `${String(next++).padStart(3, '0')}-${label}`;
    const startedAtUtc = new Date().toISOString();
    const result = spawnSync(exe, argv, {
        cwd: repo, windowsHide: true, encoding: null,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat', GH_PAGER: 'cat', GH_PROMPT_DISABLED: '1' },
        maxBuffer: 32 * 1024 * 1024
    });
    const stdout = result.stdout ?? Buffer.alloc(0);
    const stderr = result.stderr ?? Buffer.alloc(0);
    fs.writeFileSync(path.join(out, `${id}.stdout`), stdout, { flag: 'wx' });
    fs.writeFileSync(path.join(out, `${id}.stderr`), stderr, { flag: 'wx' });
    commands.push({
        id, exe, argv, cwd: repo, helperPid: process.pid, childPid: result.pid,
        startedAtUtc, completedAtUtc: new Date().toISOString(),
        explicitEnvironment: { GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat', GH_PAGER: 'cat', GH_PROMPT_DISABLED: '1' },
        inheritedEnvironment: 'Inherited; values not dumped to avoid unrelated credentials. No .NET/build/test/runtime invoked.',
        exitCode: result.status, signal: result.signal, error: result.error ? String(result.error) : null,
        stdout: `${id}.stdout`, stdoutBytes: stdout.length, stdoutSha256: sha256(stdout),
        stderr: `${id}.stderr`, stderrBytes: stderr.length, stderrSha256: sha256(stderr),
        childAndStreamsSynchronouslyAwaited: true
    });
    if (result.status !== 0 || result.error) {
        throw new Error(`${id} failed; exact streams retained`);
    }
    return { id, stdout, stderr };
}
function capture(role, relative) {
    const commit = roles[role].commit;
    const gitPath = relative.replaceAll('\\', '/');
    const tree = run(`${role}-membership`, 'git', ['--no-pager', 'ls-tree', '-l', commit, '--', gitPath]);
    const blob = run(`${role}-blob`, 'git', ['--no-pager', 'show', `${commit}:${gitPath}`]);
    const treeEntry = tree.stdout.toString('utf8').trim();
    const blobSha1 = gitBlobSha1(blob.stdout);
    if (!treeEntry.includes(blobSha1)) {
        throw new Error(`Blob membership mismatch: ${role} ${relative}`);
    }
    const destination = path.join(out, 'sources', role, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, blob.stdout, { flag: 'wx' });
    memberships.push({
        role, commit, path: relative, gitTreeEntry: treeEntry, gitBlobSha1: blobSha1,
        bytes: blob.stdout.length, sha256: sha256(blob.stdout),
        capture: path.relative(root, destination), membershipCommand: tree.id, sourceCommand: blob.id
    });
}
let failure = null;
try {
    const policyBytes = fs.readFileSync(path.join(path.dirname(root), 'policy.json'));
    const policy = JSON.parse(policyBytes);
    fs.writeFileSync(path.join(out, 'policy-close-observed.json'), policyBytes, { flag: 'wx' });
    write(path.join(out, 'controls-close.json'), {
        recordedAtUtc: new Date().toISOString(),
        policySha256: sha256(policyBytes),
        registeredOwner: policy.independentFindingPreparationWorkers?.F207 ?? null,
        expectedOwner: '2d68b596-6cf0-421c-8e56-42a1a990cb9e',
        benchmarkLeasePresent: fs.existsSync(path.join(path.dirname(root), 'benchmark-exclusive.lease.json')),
        actualWorkerBuildHoldActive: policy.actualWorkerBuildHoldActive,
        buildAndTestWorkQuiesced: policy.buildAndTestWorkQuiesced,
        interpretation: 'Point-in-time close observation only. No native build/test/runtime admission was exercised.'
    });
    const configuration = String.raw`src\DataProtection\DataProtection\src\AuthenticatedEncryption\ConfigurationModel\AuthenticatedEncryptorConfiguration.cs`;
    for (const role of ['Original', 'Default']) {
        capture(role, configuration);
    }
    const configurationText = fs.readFileSync(path.join(root, memberships.find(item => item.role === 'Default').capture), 'utf8');
    if (!configurationText.includes('new AuthenticatedEncryptorDescriptor(')) {
        throw new Error('Default producer-to-descriptor mapping was not established');
    }
    const head = run('reserved-head-close', 'git', ['--no-pager', 'rev-parse', 'HEAD']).stdout.toString('utf8').trim();
    const branch = run('reserved-branch-close', 'git', ['--no-pager', 'branch', '--show-current']).stdout.toString('utf8').trim();
    const status = run('reserved-status-close', 'git', ['--no-pager', '-c', 'core.quotepath=false', 'status', '--porcelain=v1', '--untracked-files=all']).stdout.toString('utf8');
    const diff = run('reserved-diff-close', 'git', ['--no-pager', 'diff', '--binary']);
    const indexDiff = run('reserved-index-diff-close', 'git', ['--no-pager', 'diff', '--cached', '--binary']);
    run('reserved-target-index-memberships', 'git', ['--no-pager', 'ls-files', '--stage', '--', 'src/DataProtection/DataProtection/src/XmlEncryption/DpapiXmlEncryptor.cs', 'src/DataProtection/DataProtection/src/LoggingExtensions.cs']);
    const upstreamClose = JSON.parse(run('upstream-main-close', 'gh', ['api', 'repos/dotnet/aspnetcore/branches/main']).stdout.toString('utf8'));
    const initial = JSON.parse(fs.readFileSync(path.join(root, 'capture-v001', 'reserved-start.json'), 'utf8'));
    const statusEntries = status.split(/\r?\n/).filter(Boolean);
    const untracked = statusEntries.filter(line => line.startsWith('?? ')).map(line => {
        const relative = line.slice(3);
        const bytes = fs.readFileSync(path.join(repo, relative));
        return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
    });
    const reservedUnchanged =
        head === initial.head && branch === initial.branch &&
        JSON.stringify(statusEntries) === JSON.stringify(initial.statusEntries) &&
        JSON.stringify(untracked) === JSON.stringify(initial.untracked) &&
        diff.stdout.length === 0 && indexDiff.stdout.length === 0;
    write(path.join(out, 'reserved-close.json'), {
        recordedAtUtc: new Date().toISOString(), head, branch, statusEntries, untracked,
        trackedDiffBytes: diff.stdout.length, stagedDiffBytes: indexDiff.stdout.length,
        reservedUnchanged, upstreamMainAtClose: upstreamClose.commit?.sha,
        pinnedDefault: roles.Default.commit, upstreamMainMatchesPinnedDefault: upstreamClose.commit?.sha === roles.Default.commit
    });
    if (!reservedUnchanged) {
        throw new Error('Reserved checkout invariant failed; exact close evidence retained');
    }
    if (upstreamClose.commit?.sha !== roles.Default.commit) {
        throw new Error('Observed upstream main advanced during preparation; no silent repinning');
    }
    fs.writeFileSync(path.join(root, 'candidate.diff'), Buffer.alloc(0), { flag: 'wx' });
    write(path.join(out, 'commands.json'), commands);
    write(path.join(out, 'source-memberships.json'), memberships);

    const allMemberships = [
        ...JSON.parse(fs.readFileSync(path.join(root, 'capture-v002', 'source-memberships.json'), 'utf8')).filter(item => item.present),
        ...JSON.parse(fs.readFileSync(path.join(root, 'capture-v004', 'source-memberships.json'), 'utf8')),
        ...memberships
    ];
    for (const member of allMemberships) {
        const bytes = fs.readFileSync(path.join(root, member.capture));
        if (bytes.length !== member.bytes || sha256(bytes) !== member.sha256 || gitBlobSha1(bytes) !== member.gitBlobSha1) {
            throw new Error(`Re-read source membership mismatch: ${member.capture}`);
        }
    }
    const externalMemberships = [
        ...JSON.parse(fs.readFileSync(path.join(root, 'capture-v003', 'external-source-memberships.json'), 'utf8')),
        ...JSON.parse(fs.readFileSync(path.join(root, 'capture-v005', 'external-source-memberships.json'), 'utf8'))
    ];
    for (const member of externalMemberships) {
        const bytes = fs.readFileSync(path.join(root, member.capture));
        if (bytes.length !== member.bytes || sha256(bytes) !== member.sha256 || gitBlobSha1(bytes) !== member.gitBlobSha1) {
            throw new Error(`Re-read API source membership mismatch: ${member.capture}`);
        }
    }
    const stageOneFiles = fs.readdirSync(path.join(root, 'capture-v001')).filter(name => name.startsWith('commands-through-') && name.endsWith('.json'));
    const stageOne = stageOneFiles.map(name => JSON.parse(fs.readFileSync(path.join(root, 'capture-v001', name), 'utf8'))).sort((a, b) => b.length - a.length)[0];
    const commandGroups = [
        ['capture-v001', stageOne],
        ...['capture-v002', 'capture-v003', 'capture-v004', 'capture-v005', 'capture-v006'].map(stage => [stage, JSON.parse(fs.readFileSync(path.join(root, stage, 'commands.json'), 'utf8'))])
    ];
    let sourceCommandsChecked = 0;
    let apiResponsesParsed = 0;
    for (const [stage, group] of commandGroups) {
        for (const command of group) {
            const stdout = fs.readFileSync(path.join(root, stage, command.stdout));
            const stderr = fs.readFileSync(path.join(root, stage, command.stderr));
            if (stdout.length !== command.stdoutBytes || sha256(stdout) !== command.stdoutSha256 ||
                stderr.length !== command.stderrBytes || sha256(stderr) !== command.stderrSha256) {
                throw new Error(`Command stream mismatch: ${stage} ${command.id}`);
            }
            if (command.exitCode !== 0 || command.error || !['git', 'gh'].includes(command.exe)) {
                throw new Error(`Unexpected failed or non-source command: ${stage} ${command.id}`);
            }
            if (command.exe === 'gh') {
                JSON.parse(stdout.toString('utf8'));
                apiResponsesParsed++;
            }
            sourceCommandsChecked++;
        }
    }
    const related = ['096-related-prs-target-20.stdout', '097-related-issues-target-20.stdout', '098-related-prs-identity-20.stdout'].map(name =>
        JSON.parse(fs.readFileSync(path.join(root, 'capture-v002', name), 'utf8')).length);
    if (JSON.stringify(related) !== '[0,4,0]') {
        throw new Error('Finite related-work counts differ from assessment');
    }
    const comparisons = JSON.parse(fs.readFileSync(path.join(root, 'capture-v004', 'role-byte-comparisons.json'), 'utf8'));
    const productComparisons = comparisons.filter(item => item.path.startsWith('src\\DataProtection\\'));
    if (productComparisons.some(item => !item.exactSameBytes) || memberships[0].sha256 !== memberships[1].sha256) {
        throw new Error('Product/producer source role equality failed');
    }
    write(path.join(root, 'focused-source-results-225.json'), {
        recordedAtUtc: new Date().toISOString(),
        evidenceKind: 'Static source/receipt integrity checks, not native correctness tests',
        status: 'PASS',
        sourceMembershipsReReadAndChecked: allMemberships.length,
        apiSourceMembershipsReReadAndChecked: externalMemberships.length,
        sourceCommandsStreamsAndExitCodesChecked: sourceCommandsChecked,
        apiJsonResponsesReReadAndParsed: apiResponsesParsed,
        relatedQueryCounts: related,
        capturedDataProtectionRoleComparisonsAllSame: true,
        additionalConfigurationRoleBytesSame: true,
        reservedUnchanged,
        upstreamDefaultStillPinned: true,
        nativeTestsRun: 0,
        nativeAssertionsReached: 0,
        noPerformanceObservation: true
    });
    write(path.join(root, 'HANDOFF.json'), {
        finding: 'F207',
        preparation: 225,
        owner: '2d68b596-6cf0-421c-8e56-42a1a990cb9e',
        state: assessment.disposition,
        summary: 'Eager identity/name argument confirmed before Debug event 26 filtering. Normal producer is new-key XML persistence, not steady-state request protection. Material benefit for a faithful normal producer was not established; no candidate justified.',
        sourceRoles: { Original: roles.Original.commit, Default: roles.Default.commit },
        keySourceMemberships: allMemberships.filter(item => ['Original', 'Default'].includes(item.role) &&
            [String.raw`src\DataProtection\DataProtection\src\XmlEncryption\DpapiXmlEncryptor.cs`, String.raw`src\DataProtection\DataProtection\src\LoggingExtensions.cs`].includes(item.path))
            .map(({ role, commit, path: sourcePath, gitBlobSha1: blob, bytes, sha256: hash, capture }) => ({ role, commit, path: sourcePath, gitBlobSha1: blob, bytes, sha256: hash, capture })),
        sourceManifests: ['capture-v002\\source-memberships.json', 'capture-v003\\external-source-memberships.json', 'capture-v004\\source-memberships.json', 'capture-v005\\external-source-memberships.json', 'capture-v006\\source-memberships.json'],
        assessment: 'assessment-225.json',
        focusedResults: 'focused-source-results-225.json',
        qualificationCriteria: 'qualification-criteria-225.json',
        sourceNavigationAndToolFailures: 'source-navigation-225.json',
        semanticCaveat: 'An outer IsEnabled can throw or change filter/identity ordering and adds a true-path check; no blanket exception equivalence asserted.',
        native: { graphs: [], builds: 0, tests: 0, restores: 0, dotnet: 0, measurements: 0, blockedNamedAssertions: [], testDisposition: 'NOT_RUN: source-no-candidate; both existing DPAPI theory rows unexecuted, not red/green.' },
        candidate: { created: false, modifiedFiles: [], diff: 'candidate.diff' },
        reservedCheckoutUnchanged: reservedUnchanged,
        reservedClose: 'capture-v006\\reserved-close.json',
        terminalOwnedWorkReceipt: 'terminal-owned-work-225.json',
        artifactIndex: 'artifact-index-225.json',
        seal: 'SEAL-225.json',
        coordinatorNext: 'Coordinator alone reviews/accepts/finalizes. No performance authorization or publication requested.'
    });
} catch (error) {
    failure = { message: String(error), stack: error.stack, atUtc: new Date().toISOString() };
    process.exitCode = 1;
} finally {
    if (!fs.existsSync(path.join(out, 'commands.json'))) {
        write(path.join(out, 'commands.json'), commands);
    }
    if (!fs.existsSync(path.join(out, 'source-memberships.json'))) {
        write(path.join(out, 'source-memberships.json'), memberships);
    }
    write(path.join(out, 'completion.json'), {
        recordedAtUtc: new Date().toISOString(), sourceOnly: true, helperPid: process.pid, parentPid: process.ppid,
        helperExecutable: process.execPath, helperArgv: process.argv, helperNodeVersion: process.version,
        commands: commands.length, captures: memberships.length, failure,
        nonzeroCommands: commands.filter(item => item.exitCode !== 0),
        allStartedSourceChildrenAndStreamsAwaited: true, noNativeBuildTestOrMeasurements: true
    });
}
console.log(JSON.stringify({ state: failure ? 'FAILED_PRESERVED' : assessment.disposition, sourceOnly: true, commands: commands.length, failure }));
