import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const script = fileURLToPath(import.meta.url);
const session = path.dirname(script);
const run = path.join(session, 'autoperf-runs', 'F044');
const root = String.raw`C:\src\aspnetcore`;
const attempt = Number(process.argv[2]);
function require(condition, message) {
  if (!condition) throw new Error(message);
}
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const writeNew = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function files(directory, relative = '') {
  return fs.readdirSync(path.join(directory, relative), { withFileTypes: true })
    .flatMap(entry => {
      require(!entry.isSymbolicLink(), 'Do not traverse image links.');
      const next = path.join(relative, entry.name);
      return entry.isDirectory() ? files(directory, next) : [next.replaceAll('\\', '/')];
    }).sort();
}
require(Number.isInteger(attempt) && attempt >= 1 && attempt <= 3, 'Require an explicit authorization1 through3.');
require(path.resolve(process.env.DOTNET_ROOT ?? '').toLowerCase() === path.join(root, '.dotnet').toLowerCase(),
  'Activate the primary repository in this same PowerShell process before running the driver.');
const lock = path.join(run, 'source-comparison.lock');
const handle = fs.openSync(lock, 'wx');
let budget;
let entry;
let output;
try {
  const budgetPath = path.join(run, 'diagnostic-budget.json');
  budget = read(budgetPath);
  require(budget.maximumSourceComparisons === 3 && !budget.closed
    && budget.standaloneOriginalTimingAllowed === false
    && budget.failedOrPartialTimedAuthorizationsCountAgainstMaximum === true
    && budget.consumed === attempt - 1 && budget.authorizations.length === attempt - 1
    && budget.authorizations.every(item => ['completed', 'failed'].includes(item.state)),
    'Never reuse an authorization, overlap timing, exceed the budget or silently retry a partial source comparison.');
  require(hash(path.join(run, 'acceptance-plan.json')) === budget.acceptancePlanSha256,
    'The original acceptance criteria must remain byte-exact.');
  const preservation = read(path.join(run, 'paired-untimed-validation.json'));
  require(JSON.stringify(preservation.actualVariantsWithIdenticalPreservation) === JSON.stringify(['Default', 'Original', 'Candidate'])
    && preservation.verified.length === 3 && preservation.actualOriginalTestRows === 59
    && preservation.verified.every(item => item.actualContractCases === 10 && item.actualCompiledProfiles === 6 && item.actualBoundaries === 12),
    'Require actual default/original/candidate preservation before timing.');
  for (const role of preservation.verified) {
    for (const file of role.stateHashes) require(hash(path.join(run, file.path)) === file.sha256, 'Historical preservation evidence changed.');
  }
  const tests = read(path.join(run, 'actual-paired-test-row-validation.json'));
  require(tests.actualXmlParsed && tests.actualVariant === 'Both' && tests.audits.length === 2
    && tests.audits.every(item => item.actualRows === 59 && item.actualAllPassed && item.actualSkipped === 0
      && item.actualBothNewTheoryValuesPassed), 'Require both actual59-row preservation inventories.');
  require(read(path.join(run, 'validation', 'candidate-format-whitespace-001', 'result.json')).exitCode === 0,
    'Require the successful exact-file formatting check.');
  for (const file of read(path.join(run, 'premeasurement-protected-inputs.json')).protectedFiles) {
    require(hash(path.join(root, file.path)) === file.sha256, `Protected source/workspace artifact changed: ${file.path}`);
  }
  const variants = {};
  for (const variant of ['Original', 'Candidate']) {
    const lower = variant.toLowerCase();
    const image = path.join(run, 'consumer-' + lower);
    const closurePath = path.join(run, 'consumer-' + lower + '-closure.json');
    const closure = read(closurePath);
    require(JSON.stringify(files(image)) === JSON.stringify(closure.files.map(item => item.path).sort()), 'Frozen image entry sets changed.');
    for (const file of closure.files) require(hash(path.join(image, file.path)) === file.sha256, `Frozen ${variant} entry changed: ${file.path}`);
    const sourceInputs = path.join(run, 'source-inputs-' + lower + '.json');
    const sourceRoot = path.join(run, 'source-files-' + lower);
    for (const file of read(sourceInputs).sourceFiles) {
      require(hash(path.join(sourceRoot, file.path)) === file.sha256, 'Frozen selected source changed.');
      if (variant === 'Candidate') require(hash(path.join(root, file.path)) === file.sha256, 'Current candidate physical source differs from its measured snapshot.');
    }
    variants[variant] = { image, closurePath, closureSha256: hash(closurePath), sourceInputs, sourceRoot };
  }
  for (const filename of ['AutoPerf.Benchmarks.dll', 'AutoPerf.Benchmarks.pdb']) {
    require(hash(path.join(variants.Original.image, filename)) === hash(path.join(variants.Candidate.image, filename)),
      'Measured common harness binaries must remain byte-identical.');
  }
  const orders = [['Original', 'Candidate'], ['Candidate', 'Original'], ['Original', 'Candidate']];
  const declarationPath = path.join(run, 'comparison-order-declaration.json');
  if (attempt === 1) {
    writeNew(declarationPath, { candidate: 'F044', declaredBeforeTiming: new Date().toISOString(),
      acceptancePlanSha256: budget.acceptancePlanSha256, orders, failuresOrPartialAttemptsAreNotReplayed: true });
  } else {
    require(JSON.stringify(read(declarationPath).orders) === JSON.stringify(orders), 'The declared source order changed.');
  }
  const order = orders[attempt - 1];
  output = path.join(run, 'comparison-' + String(attempt).padStart(3, '0'));
  require(!fs.existsSync(output), 'Never overwrite a source comparison.');
  fs.mkdirSync(output);
  writeNew(path.join(output, 'budget-before.json'), budget);
  entry = { attempt, state: 'running', kind: 'paired-source-comparison', order,
    authorizedAt: new Date().toISOString(), actualTimingStarted: false,
    actualDriverSha256: hash(script), includesUntimedPreparationInTiming: false };
  budget.consumed++;
  budget.authorizations.push(entry);
  budget.state = 'attempt-' + attempt + '-running';
  save(budgetPath, budget);
  const authorizationPath = path.join(output, 'authorization.json');
  writeNew(authorizationPath, {
    candidate: 'F044', kind: 'paired-source-comparison', attempt, order, consumedBeforeLaunch: budget.consumed,
    actualAcceptancePlanSha256: budget.acceptancePlanSha256,
    Original: { closureSha256: variants.Original.closureSha256, sourceInputsSha256: hash(variants.Original.sourceInputs) },
    Candidate: { closureSha256: variants.Candidate.closureSha256, sourceInputsSha256: hash(variants.Candidate.sourceInputs) }
  });
  const completed = [];
  for (const variant of order) {
    const input = variants[variant];
    const directory = path.join(output, variant);
    const evidence = path.join(directory, 'evidence');
    const reports = path.join(directory, 'reports');
    fs.mkdirSync(evidence, { recursive: true });
    fs.mkdirSync(reports);
    const executable = path.join(root, '.dotnet', 'dotnet.exe');
    const args = [path.join(input.image, 'AutoPerf.Benchmarks.dll'), 'measure', evidence,
      input.closurePath, input.sourceInputs, input.sourceRoot, reports, variant, authorizationPath];
    const command = { executable, arguments: args, workingDirectory: root, actualAttempt: attempt,
      actualVariant: variant, requiresActivatedRepositoryEnvironment: true,
      actualProcessSettingsModifiedByDriver: false, startedUtc: new Date().toISOString() };
    writeNew(path.join(directory, 'command.json'), command);
    console.log(`F044 comparison${attempt}: starting ${variant}; consumed ${budget.consumed}/3.`);
    const result = spawnSync(executable, args, { cwd: root, env: process.env, encoding: 'utf8',
      windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
    fs.writeFileSync(path.join(directory, 'stdout.txt'), result.stdout ?? '', { flag: 'wx' });
    fs.writeFileSync(path.join(directory, 'stderr.txt'), result.stderr ?? '', { flag: 'wx' });
    writeNew(path.join(directory, 'result.json'), { exitCode: result.status, signal: result.signal,
      launchError: result.error?.message ?? null, completedAt: new Date().toISOString(),
      stdoutSha256: hash(path.join(directory, 'stdout.txt')), stderrSha256: hash(path.join(directory, 'stderr.txt')) });
    entry.actualTimingStarted ||= (result.stdout ?? '').includes('WorkloadActual');
    save(budgetPath, budget);
    require(result.status === 0 && !result.error, 'Retain the actual failure; this consumed source-comparison authorization must not be rerun.');
    const markers = fs.readdirSync(evidence).filter(file => file.endsWith('-completed.json'));
    require(markers.length === 1 && read(path.join(evidence, markers[0])).actualReports === 12,
      'Require actual completion of all twelve declared cases.');
    const full = path.join(reports, 'results', 'AutoPerf.SectionRegistrationBenchmarks-report-full.json');
    const data = read(full);
    require(data.Benchmarks.length === 12 && data.Benchmarks.every(item => item.Statistics.N === 8
      && item.Statistics.OriginalValues.length === 8 && item.Statistics.OriginalValues.every(Number.isFinite)),
      'Every actual case must retain all eight samples.');
    completed.push({ variant, actualCases: 12, actualRetainedSamples: 96,
      fullJson: path.relative(run, full), fullJsonSha256: hash(full) });
    console.log(`F044 comparison${attempt}: ${variant} completed all12 cases/96 retained samples.`);
  }
  entry.state = 'completed';
  entry.completedAt = new Date().toISOString();
  entry.completed = completed;
  entry.actualRetainedSamples = 192;
  budget.completed++;
  budget.state = 'attempt-' + attempt + '-completed';
  save(budgetPath, budget);
  writeNew(path.join(output, 'execution-receipt.json'), {
    candidate: 'F044', attempt, actualCompletePairedSourceComparison: true, order,
    actualRetainedSamples: 192, completed, actualDriverSha256: hash(script)
  });
  console.log(JSON.stringify({ attempt, bothSourcesComplete: true, retainedSamples: 192,
    consumed: budget.consumed, completed: budget.completed, closed: budget.closed }, null, 2));
} catch (error) {
  if (budget && entry) {
    entry.state = 'failed';
    entry.failedAt = new Date().toISOString();
    entry.failure = error.message;
    budget.state = 'attempt-' + attempt + '-failed';
    save(path.join(run, 'diagnostic-budget.json'), budget);
    if (output && fs.existsSync(output)) writeNew(path.join(output, 'failure.json'), {
      attempt, failure: error.message, authorizationRemainsConsumed: true, mustNotReplay: true
    });
  }
  throw error;
} finally {
  fs.closeSync(handle);
  fs.unlinkSync(lock);
}
