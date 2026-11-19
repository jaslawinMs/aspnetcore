import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(import.meta.url);
const session = path.dirname(script);
const run = path.join(session, 'autoperf-runs', 'F122');
const root = String.raw`C:\src\aspnetcore`;
const attempt = Number(process.argv[2]);
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex').toUpperCase();
const save = (filename, value) => fs.writeFileSync(filename, JSON.stringify(value, null, 2) + '\n');
const write = (filename, value) => fs.writeFileSync(filename, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const files = (directory, prefix = '') => fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
  assert.equal(item.isSymbolicLink(), false);
  const name = prefix ? prefix + '/' + item.name : item.name;
  return item.isDirectory() ? files(path.join(directory, item.name), name) : [name];
}).sort();
assert.ok(Number.isInteger(attempt) && attempt >= 1 && attempt <= 3);
assert.equal(path.resolve(process.env.DOTNET_ROOT ?? '').toLowerCase(), path.join(root, '.dotnet').toLowerCase());
const lock = path.join(run, 'original-profile.lock');
const handle = fs.openSync(lock, 'wx');
let budget;
let entry;
let output;
try {
  const budgetPath = path.join(run, 'diagnostic-budget.json');
  budget = read(budgetPath);
  assert.equal(budget.maximum, 3);
  assert.equal(budget.permanentlyClosed, false);
  assert.equal(budget.authorized.length, attempt - 1);
  assert.ok(budget.authorized.every(item => ['completed', 'failed'].includes(item.state)));
  const seal = read(path.join(run, 'baseline-validation.json'));
  assert.equal(sha(path.join(run, 'acceptance-plan.json')), seal.acceptancePlanSha256);
  assert.equal(sha(path.join(run, 'profile-definitions.json')), seal.profileDefinitionsSha256);
  assert.equal(seal.actualCandidateSelected, false);
  assert.equal(seal.actualOriginalOnlyProfileJustified, true);
  assert.equal(seal.actualShippingEdits, 0);
  assert.equal(seal.roles.length, 2);
  for (const role of seal.roles) {
    assert.equal(role.actualOtherConcreteGetEnumeratorOperands, 0);
    for (const item of role.stateHashes) assert.equal(sha(path.join(run, ...item.path.split('/'))), item.sha256);
    assert.equal(sha(path.join(run, role.closurePath)), role.closureSha256);
    assert.equal(sha(path.join(run, role.sourcePath)), role.sourceSha256);
  }
  for (const audit of seal.audits) {
    assert.equal(sha(path.join(run, ...audit.auditPath.split('/'))), audit.auditSha256);
    assert.equal(sha(path.join(run, ...audit.trxPath.split('/'))), audit.trxSha256);
  }
  for (const item of seal.actualProtectedPrimaryInputs) assert.equal(sha(path.join(root, item.path)), item.sha256);
  assert.equal(sha(path.join(root, seal.actualFocusedTestSource.path)), seal.actualFocusedTestSource.sha256);
  const image = path.join(run, 'consumer-original');
  const closurePath = path.join(run, 'closure-original.json');
  const sourceInputs = path.join(run, 'source-inputs-original.json');
  const sourceRoot = path.join(run, 'source-files-original');
  function verifyImage() {
    const closure = read(closurePath);
    assert.equal(closure.files.length, 328);
    assert.deepEqual(files(image), closure.files.map(item => item.path).sort());
    for (const item of closure.files) assert.equal(sha(path.join(image, ...item.path.split('/'))), item.sha256);
  }
  verifyImage();
  for (const item of read(sourceInputs).sourceFiles) {
    assert.equal(sha(path.join(sourceRoot, ...item.path.split('/'))), item.sha256);
    assert.equal(sha(path.join(root, ...item.path.split('/'))), item.sha256);
  }
  output = path.join(run, 'original-profile-' + String(attempt).padStart(3, '0'));
  assert.equal(fs.existsSync(output), false);
  fs.mkdirSync(output);
  write(path.join(output, 'budget-before.json'), budget);
  entry = {
    attempt, kind: 'original-only-profile', state: 'running', actualAuthorizedAt: new Date().toISOString(),
    actualTimingStarted: false, actualDriverSha256: sha(script),
    actualFailedOrPartialAuthorizationMustNotBeReplayed: true, actualSourceComparisons: 0
  };
  budget.authorized.push(entry);
  budget.state = 'original-profile-' + attempt + '-running';
  save(budgetPath, budget);
  const authorizationPath = path.join(output, 'authorization.json');
  write(authorizationPath, {
    candidate: 'F122', kind: 'original-only-profile', attempt,
    actualConsumedBeforeProcessLaunch: budget.authorized.length,
    actualAcceptancePlanSha256: seal.acceptancePlanSha256,
    Original: { closureSha256: sha(closurePath), sourceInputsSha256: sha(sourceInputs) }
  });
  const states = path.join(output, 'Original', 'states');
  const reports = path.join(output, 'Original', 'reports');
  fs.mkdirSync(states, { recursive: true });
  fs.mkdirSync(reports);
  const executable = path.join(root, '.dotnet', 'dotnet.exe');
  const args = [path.join(image, 'AutoPerf.Benchmarks.dll'), 'measure', states,
    closurePath, sourceInputs, sourceRoot, reports, 'Original', authorizationPath];
  write(path.join(output, 'Original', 'command.json'), {
    executable, arguments: args, workingDirectory: root, actualVariant: 'Original',
    actualAttempt: attempt, actualStartedAt: new Date().toISOString(),
    actualProcessSettingsModifiedByDriver: false, actualRequiresActivatedEnvironment: true
  });
  console.log(`F122 original-only profile ${attempt}: starting 32 cases; ${budget.authorized.length}/3 timing authorizations consumed, zero source comparisons.`);
  const result = spawnSync(executable, args, { cwd: root, env: process.env, windowsHide: true,
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(output, 'Original', 'stdout.txt'), result.stdout ?? '', { flag: 'wx' });
  fs.writeFileSync(path.join(output, 'Original', 'stderr.txt'), result.stderr ?? '', { flag: 'wx' });
  write(path.join(output, 'Original', 'result.json'), {
    exitCode: result.status, signal: result.signal, launchError: result.error?.message ?? null,
    actualCompletedAt: new Date().toISOString(),
    stdoutSha256: sha(path.join(output, 'Original', 'stdout.txt')),
    stderrSha256: sha(path.join(output, 'Original', 'stderr.txt'))
  });
  entry.actualTimingStarted = (result.stdout ?? '').includes('WorkloadActual');
  save(budgetPath, budget);
  assert.equal(result.status, 0, 'Preserve a failed/partial timing authorization; never replay it.');
  assert.equal(result.error, undefined);
  const markers = fs.readdirSync(states).filter(filename => filename.endsWith('-completed.json'));
  assert.equal(markers.length, 1);
  const marker = read(path.join(states, markers[0]));
  assert.equal(marker.actualReports, 32);
  assert.equal(marker.actualOriginalOnlyProfile, true);
  assert.equal(marker.actualSourceComparison, false);
  const full = path.join(reports, 'results', 'AutoPerf.CollectionBenchmarks-report-full.json');
  const data = read(full);
  assert.equal(data.Benchmarks.length, 32);
  assert.ok(data.Benchmarks.every(item => item.Statistics.N === 8 && item.Statistics.OriginalValues.length === 8
    && item.Statistics.OriginalValues.every(Number.isFinite)));
  verifyImage();
  const completed = {
    variant: 'Original', actualCases: 32, actualRetainedSamples: 256,
    actualSourceComparisons: 0, fullJson: path.relative(run, full).replaceAll('\\', '/'), fullJsonSha256: sha(full)
  };
  entry.state = 'completed';
  entry.actualCompletedAt = new Date().toISOString();
  entry.completed = [completed];
  budget.completed.push({ attempt, kind: entry.kind, actualRetainedSamples: 256, completed: [completed] });
  budget.state = 'original-profile-' + attempt + '-completed';
  save(budgetPath, budget);
  write(path.join(output, 'execution-receipt.json'), {
    candidate: 'F122', attempt, actualOriginalOnlyProfile: true,
    actualCompletePairedSourceComparison: false, actualSourceComparisons: 0,
    actualRetainedSamples: 256, completed: [completed], actualDriverSha256: sha(script)
  });
  console.log(JSON.stringify({ actualCompletedOriginalProfile: attempt,
    actualTimingAuthorizationsConsumed: budget.authorized.length, actualSourceComparisons: 0,
    actualRetainedSamples: 256 }, null, 2));
} catch (error) {
  if (budget && entry) {
    entry.state = 'failed';
    entry.actualFailedAt = new Date().toISOString();
    entry.failure = error.message;
    budget.failedOrPartialAttempts.push({ attempt, actualTimingStarted: entry.actualTimingStarted,
      failure: error.message, actualAuthorizationRemainsConsumed: true });
    budget.state = 'original-profile-' + attempt + '-failed';
    save(path.join(run, 'diagnostic-budget.json'), budget);
    if (output && fs.existsSync(output)) write(path.join(output, 'failure.json'), {
      candidate: 'F122', attempt, failure: error.message, actualAuthorizationRemainsConsumed: true, actualMustNotReplay: true
    });
  }
  throw error;
} finally {
  fs.closeSync(handle);
  fs.unlinkSync(lock);
}
