import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F207-225`;
const repo = String.raw`C:\src\aspnetcore`;
const out = path.join(root, 'capture-v002');
fs.mkdirSync(out, { recursive: true });
const roles = JSON.parse(fs.readFileSync(path.join(root, 'capture-v001', 'source-roles.json'), 'utf8'));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const gitBlobSha1 = bytes => crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
const commands = [];
const memberships = [];
const files = [
    String.raw`src\DataProtection\DataProtection\src\XmlEncryption\DpapiXmlEncryptor.cs`,
    String.raw`src\DataProtection\DataProtection\src\LoggingExtensions.cs`,
    String.raw`src\DataProtection\DataProtection\src\KeyManagement\XmlKeyManager.cs`,
    String.raw`src\DataProtection\DataProtection\src\DataProtectionBuilderExtensions.cs`,
    String.raw`src\DataProtection\DataProtection\src\XmlEncryption\XmlEncryptionExtensions.cs`,
    String.raw`src\DataProtection\DataProtection\src\KeyManagement\KeyManagementOptions.cs`,
    String.raw`src\DataProtection\DataProtection\src\KeyManagement\KeyRingProvider.cs`,
    String.raw`src\DataProtection\DataProtection\src\KeyManagement\KeyRingBasedDataProtector.cs`,
    String.raw`src\DataProtection\DataProtection\src\AuthenticatedEncryption\ConfigurationModel\AuthenticatedEncryptorDescriptor.cs`,
    String.raw`src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\XmlEncryption\DpapiXmlEncryptionTests.cs`,
    String.raw`src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\KeyManagement\XmlKeyManagerTests.cs`,
    String.raw`src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\XmlEncryption\XmlEncryptionExtensionsTests.cs`,
    String.raw`src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\KeyManagement\KeyRingProviderTests.cs`,
    String.raw`src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj`,
    String.raw`src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj`,
    String.raw`src\DataProtection\build.cmd`,
    String.raw`src\DataProtection\README.md`,
    String.raw`docs\BuildFromSource.md`,
    String.raw`docs\CrossCuttingGuidance.md`,
    String.raw`.github\instructions\cross-cutting-guidance.instructions.md`,
    String.raw`.github\copilot-instructions.md`,
    String.raw`eng\Version.Details.xml`
];
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
        id, exe, argv, cwd: repo, startedAtUtc, completedAtUtc: new Date().toISOString(),
        explicitEnvironment: { GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat', GH_PAGER: 'cat', GH_PROMPT_DISABLED: '1' },
        inheritedEnvironment: 'Inherited; not dumped to avoid unrelated credentials. No .NET/build/test/runtime invoked.',
        exitCode: result.status, signal: result.signal, error: result.error ? String(result.error) : null,
        stdout: `${id}.stdout`, stdoutBytes: stdout.length, stdoutSha256: sha256(stdout),
        stderr: `${id}.stderr`, stderrBytes: stderr.length, stderrSha256: sha256(stderr),
        required
    });
    if (required && (result.status !== 0 || result.error)) {
        throw new Error(`${id} failed; exact streams retained`);
    }
    return { ...result, id, stdout, stderr };
}
let failure = null;
try {
    const policy = JSON.parse(fs.readFileSync(path.join(path.dirname(root), 'policy.json'), 'utf8'));
    if (policy.independentFindingPreparationWorkers?.F207 !== '2d68b596-6cf0-421c-8e56-42a1a990cb9e') {
        throw new Error('F207 registration mismatch before source capture');
    }
    for (const role of ['Original', 'Default']) {
        const commit = roles[role].commit;
        run(`${role}-commit`, 'git', ['--no-pager', 'show', '-s', '--format=fuller', commit]);
        for (const relative of files) {
            const gitPath = relative.replaceAll('\\', '/');
            const tree = run(`${role}-membership`, 'git', ['--no-pager', 'ls-tree', '-l', commit, '--', gitPath]);
            if (!tree.stdout.length) {
                memberships.push({ role, commit, path: relative, present: false, membershipCommand: tree.id });
                continue;
            }
            const blob = run(`${role}-blob`, 'git', ['--no-pager', 'show', `${commit}:${gitPath}`]);
            const target = path.join(out, 'sources', role, relative);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, blob.stdout, { flag: 'wx' });
            const entry = tree.stdout.toString('utf8').trim();
            const blobSha1 = gitBlobSha1(blob.stdout);
            if (!entry.includes(blobSha1)) {
                throw new Error(`Membership SHA mismatch: ${role} ${relative}`);
            }
            memberships.push({
                role, commit, path: relative, present: true,
                gitTreeEntry: entry, gitBlobSha1: blobSha1,
                bytes: blob.stdout.length, sha256: sha256(blob.stdout),
                capture: path.relative(root, target),
                membershipCommand: tree.id, sourceCommand: blob.id
            });
        }
    }
    const target = 'src/DataProtection/DataProtection/src/XmlEncryption/DpapiXmlEncryptor.cs';
    const logging = 'src/DataProtection/DataProtection/src/LoggingExtensions.cs';
    run('roles-target-logger-diff', 'git', ['--no-pager', 'diff', '--binary', roles.Original.commit, roles.Default.commit, '--', target, logging]);
    run('default-target-history-20', 'git', ['--no-pager', 'log', roles.Default.commit, '--follow', '--max-count=20', '--date=iso-strict', '--format=fuller', '--', target]);
    run('default-target-identity-pickaxe-20', 'git', ['--no-pager', 'log', roles.Default.commit, '--follow', '--max-count=20', '-SWindowsIdentity.GetCurrent().Name', '--format=fuller', '--', target]);
    run('default-target-blame', 'git', ['--no-pager', 'blame', '--line-porcelain', '-L', '47,76', roles.Default.commit, '--', target]);
    run('default-logger-pickaxe-12', 'git', ['--no-pager', 'log', roles.Default.commit, '--max-count=12', '-SEncryptingToWindowsDPAPIForCurrentUserAccount', '--format=fuller', '--', logging]);
    run('related-prs-target-20', 'gh', ['search', 'prs', 'DpapiXmlEncryptor', '--repo', 'dotnet/aspnetcore', '--limit', '20', '--json', 'number,title,state,url,updatedAt'], false);
    run('related-issues-target-20', 'gh', ['search', 'issues', 'DpapiXmlEncryptor', '--repo', 'dotnet/aspnetcore', '--limit', '20', '--json', 'number,title,state,url,updatedAt'], false);
    run('related-prs-identity-20', 'gh', ['search', 'prs', 'WindowsIdentity logging', '--repo', 'dotnet/aspnetcore', '--limit', '20', '--json', 'number,title,state,url,updatedAt'], false);
    const currentTarget = fs.readFileSync(path.join(repo, ...target.split('/')));
    const defaultTarget = memberships.find(item => item.role === 'Default' && item.path === target.replaceAll('/', '\\'));
    const loggerNuspec = String.raw`C:\.tools\.nuget\packages\microsoft.extensions.logging.abstractions\12.0.0-alpha.1.26562.105\microsoft.extensions.logging.abstractions.nuspec`;
    const nuspecBytes = fs.readFileSync(loggerNuspec);
    fs.writeFileSync(path.join(out, 'logging-abstractions-existing-package.nuspec'), nuspecBytes, { flag: 'wx' });
    fs.writeFileSync(path.join(out, 'existing-package-receipt.json'), JSON.stringify({
        source: loggerNuspec, bytes: nuspecBytes.length, sha256: sha256(nuspecBytes),
        reason: 'Existing LSP symbol result identified this exact generator assembly package; read-only provenance capture, no generation/build.',
        reservedTargetSha256: sha256(currentTarget),
        reservedTargetMatchesDefaultBlob: defaultTarget?.sha256 === sha256(currentTarget),
        noSensitiveRuntimeValuesCaptured: true
    }, null, 2) + '\n', { flag: 'wx' });
} catch (error) {
    failure = { message: String(error), stack: error.stack, atUtc: new Date().toISOString() };
    process.exitCode = 1;
} finally {
    fs.writeFileSync(path.join(out, 'commands.json'), JSON.stringify(commands, null, 2) + '\n', { flag: 'wx' });
    fs.writeFileSync(path.join(out, 'source-memberships.json'), JSON.stringify(memberships, null, 2) + '\n', { flag: 'wx' });
    fs.writeFileSync(path.join(out, 'completion.json'), JSON.stringify({
        recordedAtUtc: new Date().toISOString(), sourceOnly: true,
        commands: commands.length, captures: memberships.filter(item => item.present).length,
        absentPaths: memberships.filter(item => !item.present), failure,
        nonzeroCommands: commands.filter(item => item.exitCode !== 0),
        noNativeBuildTestOrMeasurements: true
    }, null, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify({ sourceOnly: true, commands: commands.length, captures: memberships.filter(item => item.present).length, failure }));
