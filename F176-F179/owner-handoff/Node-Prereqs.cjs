'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = __dirname, role = process.argv[2], phase = process.argv[3];
process.env.ContinuousIntegrationBuild = 'true';
const graphs = JSON.parse(fs.readFileSync(path.join(root, 'graph-creation.json')));
assert(['original', 'default'].includes(role));
const checkout = graphs[`${role}Path`], quote = value => "'" + value.replaceAll("'", "''") + "'";
const npm = 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js';
const all = {
  initial: ['run', 'build', '--workspace', '@microsoft/microsoft.aspnetcore.components.web.js'],
  install: ['ci', '--ignore-scripts', '--no-audit', '--fund=false', '--cache', path.join(checkout, 'artifacts', 'npm-cache')],
  dependencies: ['run', 'build', '--if-present', '--workspace', '@microsoft/signalr', '--workspace', '@microsoft/signalr-protocol-msgpack', '--workspace', '@microsoft/dotnet-js-interop', '--workspace', '@microsoft/dotnet-runtime'],
  build: ['run', 'build', '--workspace', '@microsoft/microsoft.aspnetcore.components.web.js']
};
assert(all[phase]);
const label = `${role}-node-${phase}`, args = [npm, ...all[phase]];
assert(!fs.existsSync(path.join(root, 'evidence', label + '.started.json')));
const command = `& ${quote(path.join(root, 'Run-Native.ps1'))} -Checkout ${quote(checkout)} -Label ${quote(label)} -Tool node -NativeArguments @(${args.map(quote).join(',')})`;
const result = cp.spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command],
  { cwd: checkout, windowsHide: true, encoding: null, maxBuffer: 128 * 1024 * 1024 });
fs.writeFileSync(path.join(root, 'evidence', label + '.wrapper.stdout.txt'), result.stdout ?? '');
fs.writeFileSync(path.join(root, 'evidence', label + '.wrapper.stderr.txt'), result.stderr ?? '');
console.log(JSON.stringify({ label, status: result.status, error: result.error?.message ?? null }));
if (result.status !== 0) console.error(String(result.stdout).slice(-6000), String(result.stderr).slice(-6000));
process.exitCode = result.status ?? 1;
