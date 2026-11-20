import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F126');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const history = path.join(run, 'preparation-history', 'legacy-host-and-unintended-generator-001');
const manifestPath = path.join(run, 'common-inputs-prepared.json');
const budget = read(path.join(run, 'diagnostic-budget.json'));
assert.equal(budget.authorizations.length, 0);
assert.equal(budget.permanentlyClosed, false);
assert.equal(fs.existsSync(path.join(run, 'images')), false);
if (process.argv[2] === 'archive') {
  assert.equal(fs.existsSync(history), false);
  fs.mkdirSync(path.join(history, 'harness'), { recursive: true });
  const manifest = read(manifestPath);
  for (const input of manifest.actualInputs) {
    const source = path.join(run, 'harness', input.path);
    assert.equal(sha(source), input.sha256);
    fs.copyFileSync(source, path.join(history, 'harness', input.path), fs.constants.COPYFILE_EXCL);
  }
  fs.copyFileSync(manifestPath, path.join(history, 'common-inputs-prepared.json'), fs.constants.COPYFILE_EXCL);
  const failedScope = path.join(run, 'validation', 'original-common-harness-build-002');
  fs.writeFileSync(path.join(history, 'correction.json'), JSON.stringify({
    candidate: 'F126', actualComparisonAuthorizations: 0, actualAnyMeasurementPerformed: false,
    actualInitialBuildExitCode: read(path.join(failedScope, 'result.json')).exitCode,
    actualInitialBuildStdoutSha256: sha(path.join(failedScope, 'stdout.txt')),
    actualInitialCommonInputsSha256: sha(manifestPath),
    correction: 'Use the supported generic HostBuilder with the real sample Startup and TestServer, rather than deprecated WebHostBuilder/TestServer constructors. Exclude unintended generator assemblies from runtime references instead of suppressing their Roslyn version-conflict warnings. All original eight inputs and the actual four-warning build remain preserved; no performance observation exists.'
  }, null, 2) + '\n', { flag: 'wx' });
} else {
  assert.equal(process.argv[2], 'seal');
  const prior = read(path.join(history, 'common-inputs-prepared.json'));
  assert.equal(sha(manifestPath), sha(path.join(history, 'common-inputs-prepared.json')));
  const actualInputs = prior.actualInputs.map(input => ({ path: input.path, sha256: sha(path.join(run, 'harness', input.path)) }));
  const actualChangedInputs = actualInputs.filter((input, index) => input.sha256 !== prior.actualInputs[index].sha256).map(input => input.path);
  assert.deepEqual(actualChangedInputs, ['AutoPerf.Benchmarks.csproj', 'PolicyScenario.cs', 'Characterization.cs']);
  fs.writeFileSync(manifestPath, JSON.stringify({
    ...prior, actualInputs, actualPreparationCorrection: 'preparation-history/legacy-host-and-unintended-generator-001/correction.json',
    actualInitialManifestSha256: sha(path.join(history, 'common-inputs-prepared.json')), actualChangedInputs,
    actualComparisonAuthorizations: 0, actualTimingRun: false
  }, null, 2) + '\n');
}
console.log(`F126 preparation correction ${process.argv[2]} completed; zero timing authorizations.`);
