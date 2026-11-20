'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const { sha } = require('./Inventories.cjs');
const root = __dirname, consumer = path.join(root, 'consumer');
const graphs = JSON.parse(fs.readFileSync(path.join(root, 'graph-creation.json')));
const inputs = JSON.parse(fs.readFileSync(path.join(consumer, 'inputs.json')));
const role = process.argv[2], phase = process.argv[3], attempt = process.argv[4] ?? '01';
assert(['original', 'default'].includes(role));
const stem = inputs.outputName;
function run(label, arguments_) {
  const quote = value => "'" + value.replaceAll("'", "''") + "'";
  const command = `& ${quote(path.join(root, 'Run-Native.ps1'))} -Checkout ${quote(graphs[`${role}Path`])} -Label ${quote(label)} -NativeArguments @(${arguments_.map(quote).join(',')})`;
  const result = cp.spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command],
    { encoding: 'utf8', windowsHide: true, cwd: graphs[`${role}Path`], maxBuffer: 128 * 1024 * 1024 });
  fs.writeFileSync(path.join(root, 'evidence', label + '.wrapper.stdout.txt'), result.stdout ?? '');
  fs.writeFileSync(path.join(root, 'evidence', label + '.wrapper.stderr.txt'), result.stderr ?? '');
  console.log(JSON.stringify({ label, status: result.status, error: result.error?.message ?? null }));
  return result.status;
}
if (phase === 'compile') {
  assert.equal(role, 'original');
  const label = `common-compile-${attempt}`, directory = path.join(consumer, 'compile-history', label);
  assert(!fs.existsSync(directory));
  assert(!fs.existsSync(path.join(consumer, 'accepted', stem + '.dll')), 'Preserve any earlier successful PE/PDB before replacing accepted bytes');
  fs.mkdirSync(directory, { recursive: true });
  for (const name of ['Program.cs', 'compile.rsp', 'inputs.json']) fs.copyFileSync(path.join(consumer, name), path.join(directory, name));
  const arguments_ = ['exec', path.join(consumer, 'inputs', 'compiler', 'csc.dll'), '/noconfig', '@' + path.join(consumer, 'compile.rsp')];
  const status = run(label, arguments_);
  const outputs = [];
  for (const extension of ['dll', 'pdb', 'deps.json', 'runtimeconfig.json']) {
    const file = path.join(consumer, 'accepted', `${stem}.${extension}`);
    if (!fs.existsSync(file)) continue;
    const bytes = fs.readFileSync(file);
    fs.writeFileSync(path.join(directory, path.basename(file)), bytes);
    outputs.push({ name: path.basename(file), bytes: bytes.length, sha256: sha(bytes) });
  }
  fs.writeFileSync(path.join(directory, 'attempt.json'), JSON.stringify({ label, role, arguments: arguments_, exitCode: status,
    successful: status === 0, outputs, sourceSha256: sha(fs.readFileSync(path.join(directory, 'Program.cs'))),
    responseSha256: sha(fs.readFileSync(path.join(directory, 'compile.rsp'))) }, null, 2) + '\n');
  assert.equal(status, 0, `Retained compiler attempt ${label}`);
} else if (phase === 'copy' || phase === 'copy-replace') {
  const output = path.join(graphs[`${role}Path`], 'artifacts', 'bin', 'Microsoft.AspNetCore.Mvc.Razor.Test', 'Release', 'net12.0');
  const files = [];
  for (const extension of ['dll', 'pdb', 'deps.json', 'runtimeconfig.json']) {
    const name = `${stem}.${extension}`, bytes = fs.readFileSync(path.join(consumer, 'accepted', name)), destination = path.join(output, name);
    if (fs.existsSync(destination)) {
      assert.equal(phase, 'copy-replace');
      const previous = JSON.parse(fs.readFileSync(path.join(consumer, role + '-copies.json'))).files.find(file => file.name === name);
      assert(previous && previous.sha256 === sha(fs.readFileSync(destination)), 'Previously copied private helper only, never replace native project bytes');
    }
    fs.writeFileSync(destination, bytes);
    files.push({ name, bytes: bytes.length, sha256: sha(bytes), destination });
  }
  fs.writeFileSync(path.join(consumer, role + '-copies.json'), JSON.stringify({ role, directory: output, files }, null, 2) + '\n');
  console.log(JSON.stringify({ role, copied: files.length }));
} else if (phase === 'run') {
  const ownerDirectory = path.join(graphs[`${role}Path`], 'artifacts', 'bin', 'Microsoft.AspNetCore.Mvc.Razor.Test', 'Release', 'net12.0');
  const label = `${role}-producer-${attempt}`, base = path.join(root, 'evidence', label), asset = path.join(graphs[`${role}Path`], 'artifacts', 'bin', 'RazorBuildWebSite.Views', 'Release', 'net12.0', 'RazorBuildWebSite.Views.dll');
  const arguments_ = ['exec', '--runtimeconfig', path.join(ownerDirectory, 'Microsoft.AspNetCore.Mvc.Razor.Test.runtimeconfig.json'),
    '--depsfile', path.join(ownerDirectory, 'Microsoft.AspNetCore.Mvc.Razor.Test.deps.json'),
    path.join(ownerDirectory, stem + '.dll'), role, base + '.result.json', base + '.identity.json', asset,
    path.join(graphs[`${role}Path`], 'artifacts', 'bin', 'Microsoft.AspNetCore.StaticAssets', 'Release', 'net12.0', 'Microsoft.AspNetCore.StaticAssets.dll')];
  assert.equal(run(label, arguments_), 0, `Retained real-producer attempt ${label}`);
} else throw new Error(`Unknown phase ${phase}`);
