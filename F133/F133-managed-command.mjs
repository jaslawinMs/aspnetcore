import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { finished } from 'node:stream/promises';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F133');
const [label, root, ...args] = process.argv.slice(2);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const quote = value => "'" + value.replaceAll("'", "''") + "'";
assert.ok(label && /^[a-z0-9-]+$/.test(label) && args.length);
assert.ok([String.raw`C:\src\aspnetcore`, String.raw`C:\src\autoperf-F042-default`].includes(root));
assert.equal(hash(path.join(run, 'plan.json')), JSON.parse(fs.readFileSync(path.join(run, 'plan-seal.json'))).sha256);
const directory = path.join(run, 'validation', label);
assert.equal(fs.existsSync(directory), false, 'Never overwrite an actual attempt');
fs.mkdirSync(directory, { recursive: true });
const global = path.join(root, 'global.json'), before = hash(global);
const script = ["$ErrorActionPreference = 'Stop'", `Set-Location -LiteralPath ${quote(root)}`, '. .\\activate.ps1',
    `$arguments = @(${args.map(quote).join(', ')})`, `& ${quote(path.join(root, '.dotnet', 'dotnet.exe'))} @arguments`, 'exit $LASTEXITCODE', ''].join('\r\n');
fs.writeFileSync(path.join(directory, 'command.ps1'), script, { flag: 'wx' });
const command = { label, cwd: root, activation: '. .\\activate.ps1', executable: path.join(root, '.dotnet', 'dotnet.exe'),
    arguments: args, startedAt: new Date().toISOString(), protectedGlobalJsonBefore: before,
    environmentOverrides: { MSBUILDDISABLENODEREUSE: '1', DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_NOLOGO: '1' }, machineSettingsChanged: false };
fs.writeFileSync(path.join(directory, 'command.json'), JSON.stringify(command, null, 2) + '\n', { flag: 'wx' });
const stdout = fs.createWriteStream(path.join(directory, 'stdout.txt'), { flags: 'wx' });
const stderr = fs.createWriteStream(path.join(directory, 'stderr.txt'), { flags: 'wx' });
console.log(`Activated ${label}; complete streams: ${directory}`);
const child = spawn('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', path.join(directory, 'command.ps1')],
    { cwd: root, windowsHide: true, env: { ...process.env, ...command.environmentOverrides } });
let launchError = null;
child.on('error', error => { launchError = error.message; });
child.stdout.pipe(stdout); child.stderr.pipe(stderr);
const actual = await new Promise(resolve => child.on('close', (exitCode, signal) => resolve({ exitCode, signal })));
await Promise.all([finished(stdout), finished(stderr)]);
const result = { ...actual, launchError, startedAt: command.startedAt, completedAt: new Date().toISOString(),
    protectedGlobalJsonBefore: before, protectedGlobalJsonAfter: hash(global), actualCommandSha256: hash(path.join(directory, 'command.ps1')),
    stdoutSha256: hash(path.join(directory, 'stdout.txt')), stderrSha256: hash(path.join(directory, 'stderr.txt')) };
fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ label, ...result }, null, 2));
for (const file of ['stdout.txt', 'stderr.txt'])
{
    const tail = fs.readFileSync(path.join(directory, file), 'utf8').trimEnd().split(/\r?\n/).slice(-16).join('\n');
    if (tail) console.log(`${file} final lines:\n${tail}`);
}
assert.equal(before, result.protectedGlobalJsonAfter);
process.exitCode = launchError ? 1 : (actual.exitCode ?? 1);
