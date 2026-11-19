import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F124');
const root = String.raw`C:\src\aspnetcore`;
const project = String.raw`src\Framework\AspNetCoreAnalyzers\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj`;
const owner = String.raw`src\Framework\AspNetCoreAnalyzers\src\Analyzers\WebApplicationBuilder\PublicPartialProgramClassAnalyzer.cs`;
const test = String.raw`src\Framework\AspNetCoreAnalyzers\test\WebApplicationBuilder\PublicPartialProgramClassTest.cs`;
const baseline = JSON.parse(fs.readFileSync(path.join(run, 'baseline-validation.json'), 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
assert.equal(baseline.actualShippingEditsAtSeal, 0);
assert.equal(baseline.actualParsedPassingXmlExecutions, 40);
assert.equal(sha(path.join(root, test)), baseline.actualFocusedTestSource.sha256);
for (const item of baseline.protectedFiles) assert.equal(sha(path.join(root, item.path)), item.sha256);
function invoke(script, args) {
  const result = spawnSync(process.execPath, [path.join(session, script), ...args],
    { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  assert.ifError(result.error);
  assert.equal(result.status, 0);
}
const managed = (label, args) => invoke('F124-managed-command.mjs', [label, root, ...args]);
managed('candidate-analyzer-build-001', ['build', project, '-c', 'Release', '--no-restore',
  '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false',
  '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo', '--verbosity', 'quiet']);
const label = 'candidate-preservation-tests-001';
managed(label, ['test', project, '-c', 'Release', '--no-build', '--no-restore',
  '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Analyzers.PublicPartialProgramClassTest',
  '--logger', 'trx;LogFileName=results.trx', '--logger', 'console;verbosity=normal',
  '--results-directory', path.join(run, 'validation', label, 'test-results'),
  '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false',
  '-p:UseSharedCompilation=false', '/m:2', '/nr:false', '--nologo']);
invoke('F124-audit-test-results.mjs', [label, '23', '6']);
managed('candidate-format-whitespace-001', ['format', 'whitespace', '--folder',
  '--include', owner, test, '--verify-no-changes', '--no-restore', '--verbosity', 'normal']);
invoke('F124-freeze.mjs', ['Candidate']);
invoke('F124-run-characterization.mjs', ['Candidate', 'candidate-characterization-001']);
invoke('F124-seal-validation.mjs', ['premeasurement']);
console.log(JSON.stringify({ candidate: 'F124', actualCandidatePreservationRowsParsed: 23,
  actualNewThresholdRowsParsed: 6, actualFreshCandidateDriverExecutions: 34,
  actualReadyForPredeclaredComparisons: true, actualTimingSamples: 0 }, null, 2));
