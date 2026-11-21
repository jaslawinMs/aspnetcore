import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F207-225`;
const repo = String.raw`C:\src\aspnetcore`;
const out = path.join(root, 'capture-v003');
fs.mkdirSync(out, { recursive: true });
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const gitBlobSha1 = bytes => crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
const commands = [];
const apiSources = [];
let next = 1;
function run(label, exe, argv, required = true) {
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
        inheritedEnvironment: 'Inherited; not dumped to avoid unrelated credentials. No .NET/build/test/runtime invoked.',
        exitCode: result.status, signal: result.signal, error: result.error ? String(result.error) : null,
        stdout: `${id}.stdout`, stdoutBytes: stdout.length, stdoutSha256: sha256(stdout),
        stderr: `${id}.stderr`, stderrBytes: stderr.length, stderrSha256: sha256(stderr),
        required, childAndStreamsSynchronouslyAwaited: true
    });
    if (required && (result.status !== 0 || result.error)) {
        throw new Error(`${id} failed; exact streams retained`);
    }
    return { ...result, id, stdout, stderr };
}
function getSource(repository, commit, relative, label) {
    const gitPath = relative.replaceAll('\\', '/');
    const result = run(label, 'gh', ['api', `repos/${repository}/contents/${gitPath}?ref=${commit}`]);
    const item = JSON.parse(result.stdout.toString('utf8'));
    if (item.type !== 'file' || item.encoding !== 'base64') {
        throw new Error(`Not an inline source file: ${repository} ${relative}`);
    }
    const bytes = Buffer.from(item.content.replaceAll('\n', ''), 'base64');
    if (gitBlobSha1(bytes) !== item.sha || bytes.length !== item.size) {
        throw new Error(`API blob membership mismatch: ${relative}`);
    }
    const destination = path.join(out, 'external-sources', repository.replaceAll('/', '\\'), relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes, { flag: 'wx' });
    apiSources.push({
        repository, commit, path: relative, gitBlobSha1: item.sha,
        bytes: bytes.length, sha256: sha256(bytes), apiUrl: item.url, htmlUrl: item.html_url,
        capture: path.relative(root, destination), command: result.id,
        evidenceKind: 'Pinned public source read; not an observed generated/native/runtime output'
    });
    return bytes;
}

let failure = null;
try {
    const policy = JSON.parse(fs.readFileSync(path.join(path.dirname(root), 'policy.json'), 'utf8'));
    if (policy.independentFindingPreparationWorkers?.F207 !== '2d68b596-6cf0-421c-8e56-42a1a990cb9e') {
        throw new Error('F207 registration mismatch before source capture');
    }
    const nuspec = fs.readFileSync(path.join(root, 'capture-v002', 'logging-abstractions-existing-package.nuspec'), 'utf8');
    const packageCommit = nuspec.match(/<repository[^>]*commit="([a-f0-9]{40})"/)?.[1];
    if (!packageCommit) {
        throw new Error('Existing generator package source commit not established');
    }
    const generatorDirectory = String.raw`src\runtime\src\libraries\Microsoft.Extensions.Logging.Abstractions\gen`;
    const directoryResult = run('generator-directory', 'gh', ['api', `repos/dotnet/dotnet/contents/${generatorDirectory.replaceAll('\\', '/')}?ref=${packageCommit}`]);
    const entries = JSON.parse(directoryResult.stdout.toString('utf8'));
    const emitter = entries.find(item => item.name === 'LoggerMessageGenerator.Emitter.cs');
    if (!emitter) {
        throw new Error('Emitter path absent from package-pinned source directory');
    }
    getSource('dotnet/dotnet', packageCommit, emitter.path.replaceAll('/', '\\'), 'generator-emitter');
    for (const [label, relative] of [
        ['logger-message', String.raw`src\runtime\src\libraries\Microsoft.Extensions.Logging.Abstractions\src\LoggerMessage.cs`],
        ['log-define-options', String.raw`src\runtime\src\libraries\Microsoft.Extensions.Logging.Abstractions\src\LogDefineOptions.cs`],
        ['logger-message-attribute', String.raw`src\runtime\src\libraries\Microsoft.Extensions.Logging.Abstractions\src\LoggerMessageAttribute.cs`],
        ['ilogger', String.raw`src\runtime\src\libraries\Microsoft.Extensions.Logging.Abstractions\src\ILogger.cs`],
        ['null-logger', String.raw`src\runtime\src\libraries\Microsoft.Extensions.Logging.Abstractions\src\NullLogger.cs`],
        ['windows-identity', String.raw`src\runtime\src\libraries\System.Security.Principal.Windows\src\System\Security\Principal\WindowsIdentity.cs`]
    ]) {
        getSource('dotnet/dotnet', packageCommit, relative, label);
    }
    const docsResult = run('docs-main', 'gh', ['api', 'repos/dotnet/AspNetCore.Docs/branches/main']);
    const docsCommit = JSON.parse(docsResult.stdout.toString('utf8')).commit.sha;
    getSource('dotnet/AspNetCore.Docs', docsCommit, String.raw`aspnetcore\security\data-protection\implementation\key-management.md`, 'docs-key-management');
    getSource('dotnet/AspNetCore.Docs', docsCommit, String.raw`aspnetcore\security\data-protection\configuration\default-settings.md`, 'docs-default-settings');
    run('historical-target-path-2015', 'git', ['--no-pager', 'show', '--format=fuller', '--name-status', 'e8cc1106d88710ce643104bb7aa6aebd4e7ceb3b', '--', '*DpapiXmlEncryptor.cs']);
    run('historical-logger-names-2019', 'git', ['--no-pager', 'show', '--format=fuller', '--no-ext-diff', '774f8dbdbd8a2cd438a7aadd624122f556428dd7', '--', 'src/DataProtection/DataProtection/src/LoggingExtensions.cs']);
    run('logger-source-generation-history-6', 'git', ['--no-pager', 'log', 'd3483989953ae3cccd773aea5ea04cb0c7198531', '--max-count=6', '-SLoggerMessage(', '--format=fuller', '--', 'src/DataProtection/DataProtection/src/LoggingExtensions.cs']);
} catch (error) {
    failure = { message: String(error), stack: error.stack, atUtc: new Date().toISOString() };
    process.exitCode = 1;
} finally {
    fs.writeFileSync(path.join(out, 'commands.json'), JSON.stringify(commands, null, 2) + '\n', { flag: 'wx' });
    fs.writeFileSync(path.join(out, 'external-source-memberships.json'), JSON.stringify(apiSources, null, 2) + '\n', { flag: 'wx' });
    fs.writeFileSync(path.join(out, 'completion.json'), JSON.stringify({
        recordedAtUtc: new Date().toISOString(), sourceOnly: true, helperPid: process.pid, parentPid: process.ppid,
        commands: commands.length, captures: apiSources.length, failure,
        nonzeroCommands: commands.filter(item => item.exitCode !== 0),
        allStartedSourceChildrenAndStreamsAwaited: true, noNativeBuildTestOrMeasurements: true
    }, null, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify({ sourceOnly: true, commands: commands.length, captures: apiSources.length, failure }));
