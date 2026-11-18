import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F042');
const root = 'C:\\src\\aspnetcore';
const number = Number(process.argv[2]);
const require = (condition, message) => { if (!condition) throw new Error(message); };
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const writeNew = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const budgetPath = path.join(run, 'diagnostic-budget.json');
require(Number.isInteger(number) && number >= 1 && number <= 3, 'Require an explicit attempt from one through three.');
require(path.resolve(process.env.DOTNET_ROOT ?? '').toLowerCase() === path.join(root, '.dotnet').toLowerCase(),
    'First activate the primary repository in the current PowerShell process.');
const lock = path.join(run, 'source-comparison.lock');
const lockHandle = fs.openSync(lock, 'wx');
let budget;
let entry;
let output;
try {
    budget = read(budgetPath);
    const budgetBefore = structuredClone(budget);
    require(!budget.closed && budget.maximumAuthorizations === 3 && budget.standaloneOriginalOnlyTimingAuthorized === false,
        'The declared paired-source budget is closed or changed.');
    if (number === 1) {
        require(budget.consumedAuthorizations === 1 && budget.attempts.length === 1 && budget.attempts[0].state === 'preparing',
            'The first source attempt must already have been consumed before candidate implementation.');
        entry = budget.attempts[0];
    } else {
        require(budget.consumedAuthorizations === number - 1 && budget.attempts.length === number - 1
            && budget.attempts.every(attempt => attempt.state === 'completed' || attempt.state === 'failed'),
            'Never reuse an authorization or overlap a running or partial comparison.');
        entry = { attempt: number, state: 'preparing', actualAuthorizedUtc: new Date().toISOString(),
            actualIncludesCandidateBuildAndUntimedPreservation: false, actualTimingStarted: false };
        budget.consumedAuthorizations = number;
        budget.attempts.push(entry);
        budget.state = `attempt-${number}-preparing`;
        save(budgetPath, budget);
    }
    const tag = String(number).padStart(3, '0');
    output = path.join(run, `comparison-${tag}`);
    require(!fs.existsSync(output), 'Do not overwrite a comparison directory or repeat an authorization.');
    for (const [file, expected] of Object.entries(read(path.join(run, 'current-default-worktree-relocation.json')).actualPrimaryProtectedBefore)) {
        require(hash(path.join(root, file)) === expected, `Protected primary file changed: ${file}`);
    }
    const observations = [
        path.join(run, 'default-validation', 'state'),
        path.join(run, 'original-characterization-001', 'evidence'),
        path.join(run, 'candidate-characterization-001', 'evidence')
    ].map(directory => {
        const characterization = read(path.join(directory, '0005-characterization.json'));
        const lifecycles = read(path.join(directory, '0006-all-lifecycles.json'));
        require(characterization.actualCases === 16 && characterization.actualEveryCasePassed
            && characterization.cases.length === 16 && characterization.cases.every(item => item.passed === true)
            && lifecycles.actualProfiles === 12 && lifecycles.actualEverySetupWorkloadCleanupPassed,
            'Every actual-default/original/candidate preservation observation is required before timing.');
        return characterization;
    });
    require(observations.every(item => JSON.stringify(item) === JSON.stringify(observations[0])),
        'Default/original/candidate observable producer behavior differs.');
    const tests = read(path.join(run, 'actual-test-row-validation.json'));
    require(tests.length === 2 && tests.every(item => item.passed === 34 && item.failed === 0 && item.skipped === 0
        && item.rows.length === 34 && item.rows.every(row => row.outcome === 'Passed')), 'Require both actual passed TRX inventories.');
    require(read(path.join(run, 'validation', 'candidate-format-whitespace-002', 'command.json')).actualExitCode === 0,
        'Require the passed exact two-file formatting check.');
    const variants = {};
    for (const variant of ['Original', 'Candidate']) {
        const lower = variant.toLowerCase();
        const image = path.join(run, `consumer-${lower}`);
        const closurePath = path.join(run, `consumer-${lower}-closure.json`);
        const closure = read(closurePath);
        for (const file of closure.files) {
            require(hash(path.join(image, file.path)) === file.sha256, `Frozen ${variant} file changed: ${file.path}`);
        }
        variants[variant] = { image, closurePath, closureSha256: hash(closurePath),
            sourceInputs: path.join(run, `source-inputs-${lower}.json`),
            sourceRoot: path.join(run, variant === 'Original' ? 'source-files' : 'source-files-candidate') };
    }
    require(hash(path.join(variants.Original.image, 'AutoPerf.Benchmarks.dll')) === hash(path.join(variants.Candidate.image, 'AutoPerf.Benchmarks.dll'))
        && hash(path.join(variants.Original.image, 'AutoPerf.Benchmarks.pdb')) === hash(path.join(variants.Candidate.image, 'AutoPerf.Benchmarks.pdb')),
        'The measured harness must be byte-identical across sources.');
    const order = budget.predeclaredOrder[number - 1];
    require(Array.isArray(order) && order.length === 2 && new Set(order).size === 2 && order.every(item => variants[item]),
        'Require the predeclared alternating source order.');
    fs.mkdirSync(output);
    writeNew(path.join(output, 'budget-before.json'), budgetBefore);
    entry.state = 'running';
    entry.actualTimingInvocationRequested = true;
    entry.actualOrder = order;
    entry.actualStartedUtc = new Date().toISOString();
    budget.state = `attempt-${number}-running`;
    save(budgetPath, budget);
    const authorization = {
        candidate: 'F042', kind: 'paired-source-comparison', attempt: number, actualOrder: order,
        actualAuthorizedUtc: entry.actualAuthorizedUtc, actualBudgetConsumedBeforeTiming: budget.consumedAuthorizations,
        Original: { closureSha256: variants.Original.closureSha256, sourceInputsSha256: hash(variants.Original.sourceInputs) },
        Candidate: { closureSha256: variants.Candidate.closureSha256, sourceInputsSha256: hash(variants.Candidate.sourceInputs) }
    };
    const authorizationPath = path.join(output, 'authorization.json');
    writeNew(authorizationPath, authorization);
    const completed = [];
    for (const variant of order) {
        const input = variants[variant];
        const directory = path.join(output, variant);
        const evidence = path.join(directory, 'evidence');
        const reports = path.join(directory, 'reports');
        fs.mkdirSync(evidence, { recursive: true });
        fs.mkdirSync(reports);
        const args = [path.join(input.image, 'AutoPerf.Benchmarks.dll'), 'measure', evidence,
            input.closurePath, input.sourceInputs, input.sourceRoot, reports, variant, authorizationPath];
        const executable = path.join(root, '.dotnet', 'dotnet.exe');
        const command = { executable, arguments: args, workingDirectory: root, actualAttempt: number,
            actualVariant: variant, actualProcessSettingsModifiedByDriver: false, startedUtc: new Date().toISOString() };
        save(path.join(directory, 'command.json'), command);
        console.log(`F042 comparison ${number}: starting ${variant}; budget ${budget.consumedAuthorizations}/3.`);
        const result = spawnSync(executable, args, { cwd: root, env: process.env, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
        fs.writeFileSync(path.join(directory, 'stdout.txt'), result.stdout ?? '');
        fs.writeFileSync(path.join(directory, 'stderr.txt'), result.stderr ?? '');
        command.actualExitCode = result.status;
        command.actualSignal = result.signal;
        command.actualLaunchError = result.error?.message ?? null;
        command.completedUtc = new Date().toISOString();
        save(path.join(directory, 'command.json'), command);
        entry.actualTimingStarted ||= (result.stdout ?? '').includes('WorkloadActual');
        save(budgetPath, budget);
        require(result.status === 0 && !result.error, `Retained ${variant} failure; this authorization is consumed and must not be rerun.`);
        const markers = fs.readdirSync(evidence).filter(file => file.endsWith('-completed.json'));
        require(markers.length === 1 && read(path.join(evidence, markers[0])).actualReports === 12, 'Require actual complete BDN execution, not only exit zero.');
        const full = path.join(reports, 'results', 'AutoPerf.DictionaryReplaceBenchmarks-report-full.json');
        const data = read(full);
        require(data.Benchmarks.length === 12 && data.Benchmarks.every(item => item.Statistics.N === 8
            && item.Statistics.OriginalValues.length === 8 && item.Statistics.OriginalValues.every(Number.isFinite)), 'Require all twelve full eight-sample rows.');
        completed.push({ variant, actualProfiles: 12, actualRetainedSamples: 96, actualFullJson: path.relative(run, full), actualFullJsonSha256: hash(full) });
        console.log(`F042 comparison ${number}: ${variant} completed all 12 profiles / 96 retained samples.`);
    }
    entry.state = 'completed';
    entry.actualCompletedUtc = new Date().toISOString();
    entry.actualCompletedVariants = completed;
    entry.actualRetainedSamples = 192;
    budget.state = `attempt-${number}-completed`;
    save(budgetPath, budget);
    writeNew(path.join(output, 'execution-receipt.json'), { candidate: 'F042', actualAttempt: number,
        actualCompletePairedSourceComparison: true, actualOrder: order, actualRetainedSamples: 192, completed });
    console.log(JSON.stringify({ actualAttempt: number, actualBothSourcesComplete: true, actualRetainedSamples: 192,
        actualConsumedAuthorizations: budget.consumedAuthorizations, actualClosed: budget.closed }, null, 2));
} catch (error) {
    if (budget && entry) {
        entry.state = 'failed';
        entry.actualFailure = error.message;
        entry.actualFailedUtc = new Date().toISOString();
        budget.state = `attempt-${number}-failed`;
        save(budgetPath, budget);
        if (output && fs.existsSync(output)) {
            save(path.join(output, 'failure.json'), { actualAttempt: number, actualFailure: error.message, actualAuthorizationMustNotBeRepeated: true });
        }
    }
    throw error;
} finally {
    fs.closeSync(lockHandle);
    fs.unlinkSync(lock);
}
