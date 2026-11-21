import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F207-225`;
const repo = String.raw`C:\src\aspnetcore`;
const out = path.join(root, 'capture-v005');
fs.mkdirSync(out, { recursive: true });
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const gitBlobSha1 = bytes => crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
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
    return { id, stdout };
}
let failure = null;
try {
    const policy = JSON.parse(fs.readFileSync(path.join(path.dirname(root), 'policy.json'), 'utf8'));
    if (policy.independentFindingPreparationWorkers?.F207 !== '2d68b596-6cf0-421c-8e56-42a1a990cb9e') {
        throw new Error('F207 registration mismatch before final provenance capture');
    }
    const dependencies = {};
    for (const role of ['Original', 'Default']) {
        const xml = fs.readFileSync(path.join(root, 'capture-v002', 'sources', role, 'eng', 'Version.Details.xml'), 'utf8');
        const match = xml.match(/<Dependency Name="Microsoft.Extensions.Logging.Abstractions" Version="([^"]+)">([\s\S]*?)<\/Dependency>/);
        const commit = match?.[2].match(/<Sha>([a-f0-9]{40})<\/Sha>/)?.[1];
        const repository = match?.[2].match(/<Uri>([^<]+)<\/Uri>/)?.[1];
        if (!match || !commit || repository !== 'https://github.com/dotnet/dotnet') {
            throw new Error(`Logging dependency provenance absent for ${role}`);
        }
        dependencies[role] = { version: match[1], commit, repository, evidence: path.join('capture-v002', 'sources', role, 'eng', 'Version.Details.xml') };
    }
    fs.writeFileSync(path.join(out, 'logging-source-role-dependencies.json'), JSON.stringify(dependencies, null, 2) + '\n', { flag: 'wx' });
    const priorSources = JSON.parse(fs.readFileSync(path.join(root, 'capture-v003', 'external-source-memberships.json'), 'utf8')).filter(item => item.repository === 'dotnet/dotnet');
    for (const prior of priorSources) {
        const gitPath = prior.path.replaceAll('\\', '/');
        const result = run('Default-logging-runtime-source', 'gh', ['api', `repos/dotnet/dotnet/contents/${gitPath}?ref=${dependencies.Default.commit}`]);
        const item = JSON.parse(result.stdout.toString('utf8'));
        const bytes = Buffer.from(item.content.replaceAll('\n', ''), 'base64');
        if (item.type !== 'file' || item.encoding !== 'base64' || bytes.length !== item.size || gitBlobSha1(bytes) !== item.sha) {
            throw new Error(`Default dependency source membership mismatch: ${prior.path}`);
        }
        const destination = path.join(out, 'external-sources', 'Default', prior.path);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, bytes, { flag: 'wx' });
        memberships.push({
            role: 'Default', repository: 'dotnet/dotnet', commit: dependencies.Default.commit,
            path: prior.path, gitBlobSha1: item.sha, bytes: bytes.length, sha256: sha256(bytes),
            capture: path.relative(root, destination), command: result.id, apiUrl: item.url, htmlUrl: item.html_url,
            Original: { commit: prior.commit, bytes: prior.bytes, sha256: prior.sha256, capture: prior.capture },
            exactSameBytesAsOriginalDependency: prior.sha256 === sha256(bytes) && prior.bytes === bytes.length,
            evidenceKind: 'Pinned dependency source, not a loaded runtime or newly generated output'
        });
    }
    const commit = 'd3483989953ae3cccd773aea5ea04cb0c7198531';
    const target = 'src/DataProtection/DataProtection/src/XmlEncryption/DpapiXmlEncryptor.cs';
    run('verbose-guard-history-8', 'git', ['--no-pager', 'log', commit, '--follow', '--max-count=8', '-SIsVerboseLevelEnabled', '--format=fuller', '--', target]);
    run('debug-guard-history-8', 'git', ['--no-pager', 'log', commit, '--follow', '--max-count=8', '-SIsDebugLevelEnabled', '--format=fuller', '--', target]);
    run('event-ids-target-diff-2015', 'git', ['--no-pager', 'show', '--format=fuller', '--no-ext-diff', 'c48173c9480267dab753eb5c9dc09b57242172f3', '--', 'src/Microsoft.AspNet.DataProtection/XmlEncryption/DpapiXmlEncryptor.cs']);
} catch (error) {
    failure = { message: String(error), stack: error.stack, atUtc: new Date().toISOString() };
    process.exitCode = 1;
} finally {
    fs.writeFileSync(path.join(out, 'commands.json'), JSON.stringify(commands, null, 2) + '\n', { flag: 'wx' });
    fs.writeFileSync(path.join(out, 'external-source-memberships.json'), JSON.stringify(memberships, null, 2) + '\n', { flag: 'wx' });
    fs.writeFileSync(path.join(out, 'completion.json'), JSON.stringify({
        recordedAtUtc: new Date().toISOString(), sourceOnly: true, helperPid: process.pid, parentPid: process.ppid,
        commands: commands.length, captures: memberships.length, failure,
        nonzeroCommands: commands.filter(item => item.exitCode !== 0),
        allStartedSourceChildrenAndStreamsAwaited: true, noNativeBuildTestOrMeasurements: true
    }, null, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify({ sourceOnly: true, commands: commands.length, captures: memberships.length, sameDependencyFiles: memberships.filter(item => item.exactSameBytesAsOriginalDependency).length, failure }));
