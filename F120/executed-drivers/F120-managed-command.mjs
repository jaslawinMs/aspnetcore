import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { finished } from 'node:stream/promises';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const runRoot = path.join(session, 'autoperf-runs', 'F120');
const [label, root, ...dotnetArguments] = process.argv.slice(2);
function require(condition, message) {
  if (!condition) throw new Error(message);
}
function sha(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
}
function quote(value) {
  return "'" + value.replaceAll("'", "''") + "'";
}
require(label && /^[a-z0-9-]+$/.test(label) && path.isAbsolute(root ?? '') && dotnetArguments.length > 0,
  'Usage: F120-managed-command.mjs <unique-label> <activated-repository-root> <dotnet-arguments...>');
require(fs.existsSync(path.join(runRoot, 'intake-completed.json')), 'Require completed source intake.');
require([String.raw`C:\src\aspnetcore`, String.raw`C:\src\autoperf-F042-default`].includes(root),
  'Require one of the explicitly reviewed source roots.');
const directory = path.join(runRoot, 'validation', label);
require(!fs.existsSync(directory), 'Never overwrite an actual command attempt.');
fs.mkdirSync(directory, { recursive: true });
const pin = path.join(root, 'global.json');
const beforePin = sha(fs.readFileSync(pin));
const script = [
  "$ErrorActionPreference = 'Stop'",
  `Set-Location -LiteralPath ${quote(root)}`,
  '. .\\activate.ps1',
  `$dotnetArguments = @(${dotnetArguments.map(quote).join(', ')})`,
  `& ${quote(path.join(root, '.dotnet', 'dotnet.exe'))} @dotnetArguments`,
  'exit $LASTEXITCODE',
  ''
].join('\r\n');
fs.writeFileSync(path.join(directory, 'command.ps1'), script, { flag: 'wx' });
const startedAt = new Date().toISOString();
const command = {
  label, cwd: root, activation: '. .\\activate.ps1',
  executable: path.join(root, '.dotnet', 'dotnet.exe'),
  arguments: dotnetArguments, startedAt, protectedGlobalJsonBefore: beforePin,
  environmentOverrides: {
    MSBUILDDISABLENODEREUSE: '1',
    DOTNET_CLI_TELEMETRY_OPTOUT: '1',
    DOTNET_NOLOGO: '1'
  },
  machineSettingsChanged: false
};
fs.writeFileSync(path.join(directory, 'command.json'), JSON.stringify(command, null, 2) + '\n', { flag: 'wx' });
const stdout = fs.createWriteStream(path.join(directory, 'stdout.txt'), { flags: 'wx' });
const stderr = fs.createWriteStream(path.join(directory, 'stderr.txt'), { flags: 'wx' });
console.log(`Running ${label}; exact activated command and raw streams: ${directory}`);
const child = spawn('pwsh', [
  '-NoLogo', '-NoProfile', '-NonInteractive', '-File', path.join(directory, 'command.ps1')
], {
  cwd: root, windowsHide: true,
  env: { ...process.env, ...command.environmentOverrides }
});
let launchError = null;
child.on('error', error => { launchError = error.message; });
child.stdout.pipe(stdout);
child.stderr.pipe(stderr);
const outcome = await new Promise(resolve => child.on('close', (exitCode, signal) => resolve({ exitCode, signal })));
await Promise.all([finished(stdout), finished(stderr)]);
const afterPin = sha(fs.readFileSync(pin));
const result = {
  ...outcome, launchError, startedAt, completedAt: new Date().toISOString(),
  protectedGlobalJsonBefore: beforePin, protectedGlobalJsonAfter: afterPin,
  protectedPinUnchanged: beforePin === afterPin,
  actualCommandSha256: sha(fs.readFileSync(path.join(directory, 'command.ps1'))),
  stdoutSha256: sha(fs.readFileSync(path.join(directory, 'stdout.txt'))),
  stderrSha256: sha(fs.readFileSync(path.join(directory, 'stderr.txt')))
};
fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ label, ...result }, null, 2));
for (const filename of ['stdout.txt', 'stderr.txt']) {
  const tail = fs.readFileSync(path.join(directory, filename), 'utf8').trimEnd().split(/\r?\n/).slice(-16).join('\n');
  if (tail) console.log(`${filename} final lines:\n${tail}`);
}
require(result.protectedPinUnchanged, 'A protected SDK pin changed during the command.');
process.exitCode = launchError ? 1 : (outcome.exitCode ?? 1);
