import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(import.meta.url);
const session = path.dirname(script);
const run = path.join(session, 'autoperf-runs', 'F126');
const root = 'C:\\src\\aspnetcore';
const attempt = Number(process.argv[2]);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function files(directory, relative = '') {
  return fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).flatMap(item => {
    assert.equal(item.isSymbolicLink(), false);
    const next = path.join(relative, item.name);
    return item.isDirectory() ? files(directory, next) : [next.replaceAll('\\', '/')];
  }).sort();
}
assert.ok(Number.isInteger(attempt) && attempt >= 1 && attempt <= 3);
assert.equal(path.resolve(process.env.DOTNET_ROOT ?? '').toLowerCase(), path.join(root, '.dotnet').toLowerCase());
const lock = path.join(run, 'source-comparison.lock');
const handle = fs.openSync(lock, 'wx');
let budget;
let entry;
let output;
try {
  const budgetPath = path.join(run, 'diagnostic-budget.json');
  budget = read(budgetPath);
  assert.equal(budget.maximumComparisonAuthorizations, 3);
  assert.equal(budget.permanentlyClosed, false);
  assert.equal(budget.authorizations.length, attempt - 1);
  assert.ok(budget.authorizations.every(item => ['completed', 'failed'].includes(item.state)));
  if (attempt === 1) {
    assert.equal(Object.hasOwn(budget, 'completed'), false);
    assert.equal(Object.hasOwn(budget, 'failedOrPartialAttempts'), false);
    budget.completed = [];
    budget.failedOrPartialAttempts = [];
  }
  assert.ok(Array.isArray(budget.completed) && Array.isArray(budget.failedOrPartialAttempts));
  const seal = read(path.join(run, 'premeasurement-validation.json'));
  for (const [file, field] of [
    ['acceptance-plan.json', 'acceptancePlanSha256'], ['baseline-completed.json', 'baselineValidationSha256'],
    ['candidate-correctness-completed.json', 'candidateCorrectnessSha256'], ['hot-reload-verified.json', 'hotReloadVerificationSha256'],
    ['harness\\profile-definitions.json', 'profileDefinitionsSha256'], ['common-inputs-prepared.json', 'commonInputManifestSha256']
  ]) assert.equal(sha(path.join(run, file)), seal[field]);
  assert.equal(seal.actualNewRowsIndividuallyRedThenGreen, 2);
  assert.equal(seal.actualHotReloadSamePidNoRestartControllerAttributeDeltaVerified, true);
  assert.equal(seal.actualParsedXmlExecutions, 32);
  assert.equal(seal.actualParsedPassingXmlExecutions, 30);
  assert.equal(seal.roles.length, 3);
  for (const role of seal.roles) {
    for (const item of role.stateHashes) assert.equal(sha(path.join(run, ...item.path.split('/'))), item.sha256);
  }
  for (const audit of seal.audits) {
    assert.equal(sha(path.join(run, ...audit.auditPath.split('/'))), audit.auditSha256);
    assert.equal(sha(path.join(run, ...audit.trxPath.split('/'))), audit.trxSha256);
  }
  for (const item of seal.actualProtectedFiles) assert.equal(sha(path.join(root, ...item.path.split('/'))), item.sha256);
  for (const input of read(path.join(run, 'common-inputs-prepared.json')).actualInputs) {
    assert.equal(sha(path.join(run, 'harness', input.path)), input.sha256);
  }
  const variants = {};
  function verifyImage(input) {
    const closure = read(input.closurePath);
    assert.equal(closure.files.length, 352);
    assert.deepEqual(files(input.image), closure.files.map(item => item.path).sort());
    for (const file of closure.files) assert.equal(sha(path.join(input.image, ...file.path.split('/'))), file.sha256);
  }
  for (const variant of ['Original', 'Candidate']) {
    const directory = path.join(run, 'images', variant);
    const input = {
      image: path.join(directory, 'image'), closurePath: path.join(directory, 'closure.json'),
      sourceInputs: path.join(directory, 'source-inputs.json'), sourceRoot: path.join(directory, 'source')
    };
    const sealed = seal.roles.find(role => role.role === variant);
    assert.equal(sha(input.closurePath), sealed.closureSha256);
    assert.equal(sha(input.sourceInputs), sealed.sourceInputsSha256);
    verifyImage(input);
    for (const file of read(input.sourceInputs).sourceFiles) {
      assert.equal(sha(path.join(input.sourceRoot, ...file.path.split('/'))), file.sha256);
      if (variant === 'Candidate') assert.equal(sha(path.join(root, ...file.path.split('/'))), file.sha256);
    }
    variants[variant] = input;
  }
  for (const name of ['AutoPerf.Benchmarks.dll', 'AutoPerf.Benchmarks.pdb']) {
    assert.equal(sha(path.join(variants.Original.image, name)), sha(path.join(variants.Candidate.image, name)));
  }
  const order = read(path.join(run, 'acceptance-plan.json')).measurements.completedPairOrders[attempt - 1];
  output = path.join(run, 'comparison-' + String(attempt).padStart(3, '0'));
  assert.equal(fs.existsSync(output), false);
  fs.mkdirSync(output);
  write(path.join(output, 'budget-before.json'), budget);
  entry = { attempt, kind: 'paired-source-comparison', state: 'running', order,
    actualAuthorizedAt: new Date().toISOString(), actualTimingStarted: false,
    actualDriverSha256: sha(script), actualFailedOrPartialAuthorizationMustNotBeReplayed: true };
  budget.authorizations.push(entry);
  budget.state = 'attempt-' + attempt + '-running';
  save(budgetPath, budget);
  const authorizationPath = path.join(output, 'authorization.json');
  write(authorizationPath, { candidate: 'F126', kind: 'paired-source-comparison', attempt, order,
    actualConsumedBeforeProcessLaunch: budget.authorizations.length, actualAcceptancePlanSha256: seal.acceptancePlanSha256,
    Original: { closureSha256: sha(variants.Original.closurePath), sourceInputsSha256: sha(variants.Original.sourceInputs) },
    Candidate: { closureSha256: sha(variants.Candidate.closurePath), sourceInputsSha256: sha(variants.Candidate.sourceInputs) } });
  const completed = [];
  for (const variant of order) {
    const input = variants[variant];
    const directory = path.join(output, variant);
    const states = path.join(directory, 'states');
    const reports = path.join(directory, 'reports');
    fs.mkdirSync(states, { recursive: true });
    fs.mkdirSync(reports);
    const executable = path.join(root, '.dotnet', 'dotnet.exe');
    const args = [path.join(input.image, 'AutoPerf.Benchmarks.dll'), 'measure', states,
      input.closurePath, input.sourceInputs, input.sourceRoot, reports, variant, authorizationPath];
    write(path.join(directory, 'command.json'), { executable, arguments: args, workingDirectory: root,
      actualVariant: variant, actualAttempt: attempt, actualStartedAt: new Date().toISOString(),
      actualProcessSettingsModifiedByDriver: false, actualRequiresActivatedEnvironment: true });
    console.log(`F126 comparison ${attempt}: starting ${variant}; ${budget.authorizations.length}/3 authorizations consumed.`);
    const result = spawnSync(executable, args, { cwd: root, env: process.env, windowsHide: true,
      encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    fs.writeFileSync(path.join(directory, 'stdout.txt'), result.stdout ?? '', { flag: 'wx' });
    fs.writeFileSync(path.join(directory, 'stderr.txt'), result.stderr ?? '', { flag: 'wx' });
    write(path.join(directory, 'result.json'), { exitCode: result.status, signal: result.signal,
      launchError: result.error?.message ?? null, actualCompletedAt: new Date().toISOString(),
      stdoutSha256: sha(path.join(directory, 'stdout.txt')), stderrSha256: sha(path.join(directory, 'stderr.txt')) });
    entry.actualTimingStarted ||= (result.stdout ?? '').includes('WorkloadActual');
    save(budgetPath, budget);
    assert.ifError(result.error);
    assert.equal(result.status, 0, 'Retain the failure; never replay a consumed comparison.');
    const markers = fs.readdirSync(states).filter(file => file.endsWith('-completed.json'));
    assert.equal(markers.length, 1);
    assert.equal(read(path.join(states, markers[0])).actualReports, 6);
    const full = path.join(reports, 'results', 'AutoPerf.PolicyBenchmarks-report-full.json');
    const data = read(full);
    assert.equal(data.Benchmarks.length, 6);
    assert.ok(data.Benchmarks.every(item => item.Statistics.N === 8 && item.Statistics.OriginalValues.length === 8
      && item.Statistics.OriginalValues.every(Number.isFinite)));
    verifyImage(input);
    completed.push({ variant, actualCases: data.Benchmarks.length,
      actualRetainedSamples: data.Benchmarks.reduce((sum, item) => sum + item.Statistics.OriginalValues.length, 0),
      fullJson: path.relative(run, full).replaceAll('\\', '/'), fullJsonSha256: sha(full) });
    console.log(`F126 comparison ${attempt}: ${variant} completed all ${data.Benchmarks.length} real route/method cases.`);
  }
  entry.state = 'completed';
  entry.actualCompletedAt = new Date().toISOString();
  entry.completed = completed;
  const actualRetainedSamples = completed.reduce((sum, item) => sum + item.actualRetainedSamples, 0);
  budget.completed.push({ attempt, order, actualRetainedSamples, completed });
  budget.state = 'attempt-' + attempt + '-completed';
  save(budgetPath, budget);
  write(path.join(output, 'execution-receipt.json'), { candidate: 'F126', attempt, order,
    actualCompletePairedSourceComparison: true, actualRetainedSamples, completed, actualDriverSha256: sha(script) });
  console.log(JSON.stringify({ actualCompletedAttempt: attempt, actualAuthorizationsConsumed: budget.authorizations.length,
    actualCompletedComparisons: budget.completed.length, actualRetainedSamples }, null, 2));
} catch (error) {
  if (budget && entry) {
    entry.state = 'failed';
    entry.actualFailedAt = new Date().toISOString();
    entry.failure = error.message;
    budget.failedOrPartialAttempts.push({ attempt, actualTimingStarted: entry.actualTimingStarted,
      failure: error.message, actualAuthorizationRemainsConsumed: true });
    budget.state = 'attempt-' + attempt + '-failed';
    save(path.join(run, 'diagnostic-budget.json'), budget);
    if (output && fs.existsSync(output)) write(path.join(output, 'failure.json'),
      { candidate: 'F126', attempt, failure: error.message, actualAuthorizationRemainsConsumed: true, actualMustNotReplay: true });
  }
  throw error;
} finally {
  fs.closeSync(handle);
  fs.unlinkSync(lock);
}
