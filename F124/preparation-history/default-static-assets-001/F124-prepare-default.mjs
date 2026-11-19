import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F124');
const root = String.raw`C:\src\autoperf-F042-default`;
const project = String.raw`src\Framework\AspNetCoreAnalyzers\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj`;
const managed = path.join(session, 'F124-managed-command.mjs');
const resume = process.argv[2] === '--resume-after-default-js-prerequisite';
assert.ok(process.argv.length === 2 || resume && process.argv.length === 3);
function invoke(script, args) {
  const result = spawnSync(process.execPath, [path.join(session, script), ...args],
    { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  assert.ifError(result.error);
  return result.status;
}
function command(label, args) {
  const result = spawnSync(process.execPath, [managed, label, root, ...args],
    { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  assert.ifError(result.error);
  return result.status;
}
const buildArgs = ['build', project, '-c', 'Release', '--no-restore', '-p:UseIisNativeAssets=false',
  '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo', '--verbosity', 'quiet'];
let exit;
if (resume) {
  const prior = label => path.join(run, 'validation', label);
  assert.equal(JSON.parse(fs.readFileSync(path.join(prior('default-analyzer-restore-001'), 'result.json'), 'utf8')).exitCode, 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(prior('default-analyzer-build-002'), 'result.json'), 'utf8')).exitCode, 1);
  assert.match(fs.readFileSync(path.join(prior('default-analyzer-build-002'), 'stdout.txt'), 'utf8'),
    /The following Blazor assets do not exist:/);
  buildArgs.push('-p:BuildNodeJS=false');
  exit = command('default-analyzer-build-003', buildArgs);
} else {
  exit = command('default-analyzer-build-001', buildArgs);
}
if (exit !== 0 && !resume) {
  const output = fs.readFileSync(path.join(run, 'validation', 'default-analyzer-build-001', 'stdout.txt'), 'utf8');
  assert.match(output, /NETSDK1004|NETSDK1047/, 'Only a genuinely missing dependency/assets failure authorizes this scoped restore.');
  assert.equal(command('default-analyzer-restore-001', ['restore', project, '--configfile', path.join(root, 'NuGet.config'),
    '--disable-parallel', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false',
    '--verbosity', 'quiet']), 0);
  exit = command('default-analyzer-build-002', buildArgs);
}
assert.equal(exit, 0);
const label = 'default-existing-tests-001';
assert.equal(command(label, ['test', project, '-c', 'Release', '--no-build', '--no-restore',
  '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Analyzers.PublicPartialProgramClassTest',
  '--logger', 'trx;LogFileName=results.trx', '--logger', 'console;verbosity=normal',
  '--results-directory', path.join(run, 'validation', label, 'test-results'),
  '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo']), 0);
assert.equal(invoke('F124-audit-test-results.mjs', [label, '17', '0']), 0);
assert.equal(invoke('F124-freeze.mjs', ['Default']), 0);
assert.equal(invoke('F124-run-characterization.mjs', ['Default', 'default-characterization-001']), 0);
console.log(JSON.stringify({ candidate: 'F124', actualCurrentDefaultPrepared: true,
  actualExistingXmlRowsParsed: 17, actualOwnerAndPdbLoaded: true, actualTimingSamples: 0 }, null, 2));
