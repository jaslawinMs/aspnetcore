import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { finished } from 'node:stream/promises';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F129');
const [label, root, ...args] = process.argv.slice(2);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex').toUpperCase();
const quote = value => "'" + value.replaceAll("'", "''") + "'";
assert(label && /^[a-z0-9-]+$/.test(label) && args.length, 'Expected unique label, reviewed root and dotnet arguments');
assert([String.raw`C:\src\aspnetcore`, String.raw`C:\src\autoperf-F042-default`].includes(root), 'Unreviewed source root');
assert(sha(path.join(run, 'plan.json')) === JSON.parse(fs.readFileSync(path.join(run, 'plan-seal.json'))).sha256, 'Sealed plan changed');
const directory = path.join(run, 'validation', label);
assert(!fs.existsSync(directory), 'Do not overwrite an actual command attempt');
fs.mkdirSync(directory, { recursive: true });
const pin = path.join(root, 'global.json');
const pinBefore = sha(pin);
const script = [
    "$ErrorActionPreference = 'Stop'",
    `Set-Location -LiteralPath ${quote(root)}`,
    '. .\\activate.ps1',
    `$arguments = @(${args.map(quote).join(', ')})`,
    `& ${quote(path.join(root, '.dotnet', 'dotnet.exe'))} @arguments`,
    'exit $LASTEXITCODE', ''
].join('\r\n');
fs.writeFileSync(path.join(directory, 'command.ps1'), script, { flag: 'wx' });
const command = {
    label, cwd: root, activation: '. .\\activate.ps1', executable: path.join(root, '.dotnet', 'dotnet.exe'),
    arguments: args, startedAt: new Date().toISOString(), protectedGlobalJsonBefore: pinBefore,
    environmentOverrides: { MSBUILDDISABLENODEREUSE: '1', DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_NOLOGO: '1' },
    machineSettingsChanged: false,
};
fs.writeFileSync(path.join(directory, 'command.json'), JSON.stringify(command, null, 2) + '\n', { flag: 'wx' });
const stdout = fs.createWriteStream(path.join(directory, 'stdout.txt'), { flags: 'wx' });
const stderr = fs.createWriteStream(path.join(directory, 'stderr.txt'), { flags: 'wx' });
console.log(`Running ${label}; activated command and complete streams: ${directory}`);
const child = spawn('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', path.join(directory, 'command.ps1')],
    { cwd: root, windowsHide: true, env: { ...process.env, ...command.environmentOverrides } });
let launchError = null;
child.on('error', error => { launchError = error.message; });
child.stdout.pipe(stdout);
child.stderr.pipe(stderr);
const outcome = await new Promise(resolve => child.on('close', (exitCode, signal) => resolve({ exitCode, signal })));
await Promise.all([finished(stdout), finished(stderr)]);
const result = {
    ...outcome, launchError, startedAt: command.startedAt, completedAt: new Date().toISOString(),
    protectedGlobalJsonBefore: pinBefore, protectedGlobalJsonAfter: sha(pin),
    actualCommandSha256: sha(path.join(directory, 'command.ps1')),
    stdoutSha256: sha(path.join(directory, 'stdout.txt')), stderrSha256: sha(path.join(directory, 'stderr.txt')),
};
fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ label, ...result }, null, 2));
for (const name of ['stdout.txt', 'stderr.txt'])
{
    const tail = fs.readFileSync(path.join(directory, name), 'utf8').trimEnd().split(/\r?\n/).slice(-20).join('\n');
    if (tail) console.log(`${name} final lines:\n${tail}`);
}
assert(result.protectedGlobalJsonBefore === result.protectedGlobalJsonAfter, 'Protected SDK pin changed');
process.exitCode = launchError ? 1 : (outcome.exitCode ?? 1);
