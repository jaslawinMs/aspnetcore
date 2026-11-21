import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F207-225`;
const repo = String.raw`C:\src\aspnetcore`;
const out = path.join(root, 'capture-v004');
fs.mkdirSync(out, { recursive: true });
const roles = JSON.parse(fs.readFileSync(path.join(root, 'capture-v001', 'source-roles.json'), 'utf8'));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const gitBlobSha1 = bytes => crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
const commands = [];
const memberships = [];
let next = 1;
function run(label, argv) {
    const id = `${String(next++).padStart(3, '0')}-${label}`;
    const startedAtUtc = new Date().toISOString();
    const result = spawnSync('git', argv, {
        cwd: repo, windowsHide: true, encoding: null,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat' },
        maxBuffer: 32 * 1024 * 1024
    });
    const stdout = result.stdout ?? Buffer.alloc(0);
    const stderr = result.stderr ?? Buffer.alloc(0);
    fs.writeFileSync(path.join(out, `${id}.stdout`), stdout, { flag: 'wx' });
    fs.writeFileSync(path.join(out, `${id}.stderr`), stderr, { flag: 'wx' });
    commands.push({
        id, exe: 'git', argv, cwd: repo, helperPid: process.pid, childPid: result.pid,
        startedAtUtc, completedAtUtc: new Date().toISOString(),
        explicitEnvironment: { GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat' },
        inheritedEnvironment: 'Inherited; values not dumped to avoid unrelated credentials. No .NET/build/test/runtime invoked.',
        exitCode: result.status, signal: result.signal, error: result.error ? String(result.error) : null,
        stdout: `${id}.stdout`, stdoutBytes: stdout.length, stdoutSha256: sha256(stdout),
        stderr: `${id}.stderr`, stderrBytes: stderr.length, stderrSha256: sha256(stderr),
        childAndStreamsSynchronouslyAwaited: true
    });
    if (result.status !== 0 || result.error) {
        throw new Error(`${id} failed; exact streams retained`);
    }
    return { id, stdout };
}
function capture(role, commit, relative) {
    const gitPath = relative.replaceAll('\\', '/');
    const tree = run(`${role}-membership`, ['--no-pager', 'ls-tree', '-l', commit, '--', gitPath]);
    if (!tree.stdout.length) {
        throw new Error(`Missing historical/current path: ${relative}`);
    }
    const blob = run(`${role}-blob`, ['--no-pager', 'show', `${commit}:${gitPath}`]);
    const target = path.join(out, 'sources', role, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, blob.stdout, { flag: 'wx' });
    const treeEntry = tree.stdout.toString('utf8').trim();
    const blobSha1 = gitBlobSha1(blob.stdout);
    if (!treeEntry.includes(blobSha1)) {
        throw new Error(`Blob membership mismatch: ${role} ${relative}`);
    }
    memberships.push({
        role, commit, path: relative, gitTreeEntry: treeEntry, gitBlobSha1: blobSha1,
        bytes: blob.stdout.length, sha256: sha256(blob.stdout),
        capture: path.relative(root, target), membershipCommand: tree.id, sourceCommand: blob.id
    });
}
let failure = null;
try {
    const policy = JSON.parse(fs.readFileSync(path.join(path.dirname(root), 'policy.json'), 'utf8'));
    if (policy.independentFindingPreparationWorkers?.F207 !== '2d68b596-6cf0-421c-8e56-42a1a990cb9e') {
        throw new Error('F207 registration mismatch before final source capture');
    }
    for (const role of ['Original', 'Default']) {
        for (const relative of [
            String.raw`src\DataProtection\DataProtection\src\Internal\KeyManagementOptionsSetup.cs`,
            String.raw`src\DataProtection\DataProtection\src\AuthenticatedEncryption\ConfigurationModel\SecretExtensions.cs`
        ]) {
            capture(role, roles[role].commit, relative);
        }
    }
    capture('History2015', 'e8cc1106d88710ce643104bb7aa6aebd4e7ceb3b', String.raw`src\Microsoft.AspNet.DataProtection\XmlEncryption\DpapiXmlEncryptor.cs`);
    const migration = '90c08fe18cd455d15add9b469b41fa288b26eb96';
    const parent = run('logger-migration-parent', ['--no-pager', 'rev-parse', `${migration}^`]).stdout.toString('utf8').trim();
    capture('History2021Before', parent, String.raw`src\DataProtection\DataProtection\src\LoggingExtensions.cs`);
    capture('History2021After', migration, String.raw`src\DataProtection\DataProtection\src\LoggingExtensions.cs`);
    run('logger-migration-diff', ['--no-pager', 'show', '--format=fuller', '--no-ext-diff', migration, '--', 'src/DataProtection/DataProtection/src/LoggingExtensions.cs']);
    const primaryMemberships = JSON.parse(fs.readFileSync(path.join(root, 'capture-v002', 'source-memberships.json'), 'utf8'));
    const currentMemberships = [...primaryMemberships, ...memberships.filter(item => ['Original', 'Default'].includes(item.role))];
    const comparisons = currentMemberships.filter(item => item.role === 'Original').map(original => {
        const current = currentMemberships.find(item => item.role === 'Default' && item.path === original.path);
        return {
            path: original.path,
            Original: { commit: original.commit, gitBlobSha1: original.gitBlobSha1, bytes: original.bytes, sha256: original.sha256, capture: original.capture },
            Default: { commit: current?.commit, gitBlobSha1: current?.gitBlobSha1, bytes: current?.bytes, sha256: current?.sha256, capture: current?.capture },
            exactSameBytes: original.sha256 === current?.sha256 && original.bytes === current?.bytes
        };
    });
    fs.writeFileSync(path.join(out, 'role-byte-comparisons.json'), JSON.stringify(comparisons, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ comparedPaths: comparisons.length, same: comparisons.filter(item => item.exactSameBytes).length, differentPaths: comparisons.filter(item => !item.exactSameBytes).map(item => item.path) }));
} catch (error) {
    failure = { message: String(error), stack: error.stack, atUtc: new Date().toISOString() };
    process.exitCode = 1;
} finally {
    fs.writeFileSync(path.join(out, 'commands.json'), JSON.stringify(commands, null, 2) + '\n', { flag: 'wx' });
    fs.writeFileSync(path.join(out, 'source-memberships.json'), JSON.stringify(memberships, null, 2) + '\n', { flag: 'wx' });
    fs.writeFileSync(path.join(out, 'completion.json'), JSON.stringify({
        recordedAtUtc: new Date().toISOString(), sourceOnly: true, helperPid: process.pid, parentPid: process.ppid,
        commands: commands.length, captures: memberships.length, failure,
        nonzeroCommands: commands.filter(item => item.exitCode !== 0),
        allStartedSourceChildrenAndStreamsAwaited: true, noNativeBuildTestOrMeasurements: true
    }, null, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify({ sourceOnly: true, commands: commands.length, captures: memberships.length, failure }));
