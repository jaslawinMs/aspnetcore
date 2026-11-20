import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const session = path.resolve(root, '..', '..');
const parallel = path.join(session, 'autoperf-parallelism');
const configPath = path.join(root, 'driver-config-173.json');
const budgetPath = path.join(root, 'diagnostic-budget.json');
const leasePath = path.join(parallel, 'benchmark-exclusive.lease.json');
const configHash = '5A0E8D452C9B8A2C0EF8C8BD988276C61B8B52319CB85BCF9E119E5AFDD75347';
const parameters = [0, 1, 16, 256];
const powershell = 'C:\\Program Files\\PowerShell\\7\\pwsh.exe';
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const writeNew = (file, value) => fs.writeFileSync(file, JSON.stringify(value, (_, item) =>
    typeof item === 'number' && !Number.isFinite(item) ? String(item) : item, 2), { flag: 'wx' });
const pin = (file, expected) => requireValue(hash(file) === expected, `Pinned file changed: ${file}`);

export function geometricMean(values) {
    requireValue(values.length > 0 && values.every(value => typeof value === 'number' && value >= 0 && !Number.isNaN(value)), 'Invalid geometric-mean inputs.');
    requireValue(!(values.includes(0) && values.includes(Infinity)), 'Undefined mixed zero/infinite geometric mean.');
    if (values.every(value => value === values[0])) return values[0];
    if (values.includes(0)) return 0;
    if (values.includes(Infinity)) return Infinity;
    return Math.exp(values.reduce((sum, value) => sum + Math.log(value), 0) / values.length);
}

export function allocationRatio(candidate, baseline) {
    requireValue(Number.isFinite(candidate) && Number.isFinite(baseline) && candidate >= 0 && baseline >= 0,
        'Invalid allocation inputs.');
    return baseline === 0 ? (candidate === 0 ? 1 : Infinity) : candidate / baseline;
}

export function decide(blocks) {
    requireValue(blocks.length === 7, 'All seven frozen blocks are mandatory.');
    const controls = [];
    const ratios = parameters.map(ConnectionCount => {
        const samples = blocks.map((block, index) => {
            const select = step => {
                const rows = block[step];
                requireValue(rows.length === 4 && parameters.every(count => rows.filter(row => row.ConnectionCount === count).length === 1),
                    'Every process must contain all four unique frozen parameters.');
                const row = rows.find(item => item.ConnectionCount === ConnectionCount);
                requireValue(Number.isFinite(row.Nanoseconds) && row.Nanoseconds > 0 && Number.isFinite(row.Bytes) && row.Bytes >= 0,
                    'Invalid actual elapsed/allocation result.');
                return row;
            };
            const before = select('BaselineBefore');
            const candidate = select('Candidate');
            const after = select('BaselineAfter');
            const driftPercent = 100 * Math.abs(after.Nanoseconds / before.Nanoseconds - 1);
            controls.push({ block: index + 1, ConnectionCount, driftPercent,
                passed: Math.abs(after.Nanoseconds - before.Nanoseconds) <= before.Nanoseconds * 0.1 });
            return {
                block: index + 1,
                elapsedRatio: candidate.Nanoseconds / geometricMean([before.Nanoseconds, after.Nanoseconds]),
                allocationRatio: allocationRatio(candidate.Bytes, geometricMean([before.Bytes, after.Bytes]))
            };
        });
        const elapsedRatio = geometricMean(samples.map(item => item.elapsedRatio));
        const bytesRatio = geometricMean(samples.map(item => item.allocationRatio));
        return {
            ConnectionCount, elapsedRatio, allocationRatio: bytesRatio,
            elapsedReductionPercent: 100 * (1 - elapsedRatio),
            allocationReductionPercent: 100 * (1 - bytesRatio),
            elapsedDirectionalBlocks: samples.filter(item => item.elapsedRatio < 1).length,
            allocationDirectionalBlocks: samples.filter(item => item.allocationRatio < 1).length,
            elapsedNonregressionPassed: elapsedRatio <= 1.05,
            allocationNonregressionPassed: bytesRatio <= 1.01,
            samples
        };
    });
    const primary = ratios.find(item => item.ConnectionCount === 16);
    const controlsPassed = controls.every(item => item.passed);
    const nonregressionPassed = ratios.every(item => item.elapsedNonregressionPassed && item.allocationNonregressionPassed);
    const primaryPassed = (primary.elapsedRatio <= 0.95 && primary.elapsedDirectionalBlocks >= 6) ||
        (primary.allocationRatio <= 0.95 && primary.allocationDirectionalBlocks >= 6);
    return {
        status: !controlsPassed ? 'inconclusive-control-drift' :
            primaryPassed && nonregressionPassed ? 'qualifies-original-only' : 'measured-no-gain',
        controlsPassed, nonregressionPassed, primaryPassed, controls, ratios,
        boundary: 'Whole real graceful transport drain; not request throughput or a production connection-count distribution.'
    };
}

function imageFiles(directory, relative = '') {
    return fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).flatMap(entry => {
        requireValue(!entry.isSymbolicLink(), 'Causal image links are not allowed.');
        const name = path.join(relative, entry.name);
        return entry.isDirectory() ? imageFiles(directory, name) : [name];
    });
}

function verifyImages(compatibility) {
    for (const image of compatibility.images) {
        pin(image.inventoryPath, image.inventorySha256);
        const expected = readJson(image.inventoryPath);
        const actual = imageFiles(image.root);
        requireValue(actual.length === expected.length && actual.every(name => expected.some(item => item.path === name)),
            'Causal image membership differs.');
        for (const file of expected) {
            const name = path.join(image.root, file.path);
            requireValue(fs.statSync(name).size === file.bytes, `Causal image length changed: ${name}`);
            pin(name, file.sha256);
        }
    }
}

function preflight() {
    pin(configPath, configHash);
    const config = readJson(configPath);
    requireValue(config.findingId === 'F198' && config.allowedSourceRole === 'Original' &&
        config.actualDefaultComparisonNotAuthorized === true, 'Only the first Original comparison is allowed.');
    pin(path.join(root, 'plan.json'), config.planSha256);
    const plan = readJson(path.join(root, 'plan.json'));
    requireValue(plan.findingId === 'F198' && plan.schedule.blocks === 7 &&
        plan.benchmarkDotNet.iterationCount === 501 && plan.benchmarkDotNet.invocationCount === 1 &&
        plan.benchmarkDotNet.unrollFactor === 1, 'Frozen plan differs.');
    pin(config.compatibilityPath, config.compatibilitySha256);
    const compatibility = readJson(config.compatibilityPath);
    requireValue(compatibility.planSha256 === config.planSha256 && compatibility.actualPostExecutionAllImageBytesAndMembershipVerified === true &&
        compatibility.actualNativePassedRowsPerVariant === 2 && compatibility.actualCommonRealProducerCasesPerVariant === 4 &&
        compatibility.actualCustomSupportAndCompleteConfigurationAccepted === true && compatibility.actualExecutorCalls === 0,
        'Actual compatibility/admission record is not accepted.');
    for (const item of compatibility.evidence) pin(item.path, item.sha256);
    verifyImages(compatibility);
    pin(config.launcherPath, config.launcherSha256);
    pin(path.join(config.activationSourceRoot, '.dotnet', 'dotnet.exe'),
        'E7A8B31264AF6F112132138EFD5A5AED405FF81741640F77AE718082F6817B20');
    const budget = readJson(budgetPath);
    requireValue(budget.findingId === 'F198' && budget.closed === false && budget.maximumAuthorizations === 3 &&
        budget.oneComparisonPerSourceRole === true && budget.noRetryAfterFailedOrPartialComparison === true &&
        budget.authorizations.length === 0, 'Original budget is not open at zero; retries are forbidden.');
    return { config, compatibility, budget };
}

function replaceBudget(budget, label) {
    const directory = path.join(root, 'budget-history-173');
    fs.mkdirSync(directory, { recursive: true });
    fs.copyFileSync(budgetPath, path.join(directory, `${label}.json`), fs.constants.COPYFILE_EXCL);
    const temporary = path.join(root, `budget-${crypto.randomUUID()}.tmp`);
    writeNew(temporary, budget);
    fs.renameSync(temporary, budgetPath);
}

function requireLease() {
    const lease = readJson(leasePath);
    requireValue(lease.purpose === 'benchmark' && lease.findingId === 'F198' && typeof lease.token === 'string' &&
        lease.token.length > 0 && lease.arguments[0] === fileURLToPath(import.meta.url), 'Actual F198 global lease is required.');
    process.kill(lease.gatePid, 0);
    return lease;
}

function requireQuiescence() {
    const hold = readJson(path.join(root, 'quiescence-173.json'));
    requireValue(hold.findingId === 'F198' && hold.allOwnedLocalRemoteNativeWorkQuiescent === true &&
        hold.registeredPreparationOwnersHeld === true && hold.actualRemote161NativeTaskStatus === 'Failed' &&
        Date.now() - Date.parse(hold.observedUtc) >= 0 && Date.now() - Date.parse(hold.observedUtc) <= 600_000 &&
        !fs.existsSync(path.join(root, 'quiescence-173-released.json')),
        'A fresh actual all-owned native-work hold is required by the frozen F198 plan.');
    return hold;
}

async function runChild(config, lease, directory, variant, label) {
    const specimen = config.specimens[variant];
    const spec = { ...specimen, Role: `Original-${label}`, Output: path.join(directory, 'results') };
    fs.mkdirSync(directory);
    writeNew(path.join(directory, 'launch-spec.json'), spec);
    const image = path.dirname(spec.Owner.Path);
    const arguments_ = [
        'exec', '--fx-version', spec.Runtime,
        '--runtimeconfig', path.join(image, 'Microsoft.AspNetCore.Server.Kestrel.Microbenchmarks.runtimeconfig.json'),
        '--depsfile', path.join(image, 'Microsoft.AspNetCore.Server.Kestrel.Microbenchmarks.deps.json'),
        path.join(image, config.adapterFile), 'run', path.join(directory, 'launch-spec.json')
    ];
    const invocation = {
        activationSourceRoot: config.activationSourceRoot, arguments: arguments_,
        stdoutPath: path.join(directory, 'stdout.txt'), stderrPath: path.join(directory, 'stderr.txt'),
        lifecyclePath: path.join(directory, 'lifecycle.json')
    };
    const invocationPath = path.join(directory, 'invocation.json');
    writeNew(invocationPath, invocation);
    const stdout = fs.openSync(path.join(directory, 'launcher-stdout.txt'), 'wx');
    const stderr = fs.openSync(path.join(directory, 'launcher-stderr.txt'), 'wx');
    let exit;
    try {
        exit = await new Promise((resolve, reject) => {
            const child = spawn(powershell, ['-NoLogo', '-NoProfile', '-File', config.launcherPath, '-InvocationPath', invocationPath], {
                cwd: config.activationSourceRoot, windowsHide: true,
                env: { ...process.env, AUTOPERF_BENCHMARK_LEASE_PATH: leasePath, AUTOPERF_BENCHMARK_LEASE_TOKEN: lease.token },
                stdio: ['ignore', stdout, stderr]
            });
            child.once('error', reject);
            child.once('close', (code, signal) => {
                writeNew(path.join(directory, 'launcher-lifecycle.json'), {
                    pid: child.pid, actualAwaitedClose: true, code, signal, completedUtc: new Date().toISOString()
                });
                resolve(code);
            });
        });
    } finally {
        fs.closeSync(stdout);
        fs.closeSync(stderr);
    }
    requireValue(exit === 0, `Actual measurement child failed: ${label}, exit=${exit}. Streams/failure remain retained.`);
    const life = readJson(invocation.lifecyclePath);
    requireValue(life.actualExitCode === 0 && life.actualChildAwaitedToExit === true, 'Owned measurement child completion differs.');
    const completion = readJson(path.join(spec.Output, 'completion.json'));
    const identity = readJson(path.join(spec.Output, 'identity.json'));
    requireValue(completion.Passed === true && completion.Mode === 'run' && completion.Role === spec.Role &&
        identity.Runtime === spec.Runtime && identity.IsServerGC === true, 'Actual run/completion/runtime identity differs.');
    for (const expected of [spec.Owner, spec.Fixture, spec.CoreLib]) {
        const loaded = completion.Assemblies.filter(item => item.Path.toLowerCase() === expected.Path.toLowerCase());
        requireValue(loaded.length === 1 && loaded[0].Sha256 === expected.Sha256 && loaded[0].Mvid === expected.Mvid,
            'Actual completed run loaded an unexpected owner/fixture/CoreLib image.');
    }
    const acceptedIdentity = readJson(path.join(specimen.Output, 'identity.json'));
    requireValue(identity.NativeRuntime.length === acceptedIdentity.NativeRuntime.length && identity.NativeRuntime.every(actual =>
        acceptedIdentity.NativeRuntime.some(expected => actual.ModuleName === expected.ModuleName &&
            actual.Path === expected.Path && actual.Sha256 === expected.Sha256)), 'Actual native runtime module pins differ.');
    const measurement = readJson(path.join(spec.Output, 'measurement.json'));
    requireValue(measurement.Role === spec.Role && measurement.Rows.length === 4 &&
        parameters.every(count => measurement.Rows.filter(row => row.ConnectionCount === count).length === 1),
        'Actual measurement membership differs.');
    for (const row of measurement.Rows) {
        requireValue(row.Measurements.length === 501 && new Set(row.Measurements.map(item => item.IterationIndex)).size === 501 &&
            row.Measurements.every(item => item.Operations === 1 && Number.isFinite(item.Nanoseconds) && item.Nanoseconds >= 0),
            '501 unique raw result measurements with exactly one operation are required.');
    }
    return measurement.Rows;
}

async function main(mode) {
    requireValue(mode === '--check' || mode === '--run-original', 'Expected --check or --run-original only.');
    const { config, compatibility, budget } = preflight();
    if (mode === '--check') {
        console.log(JSON.stringify({ actualPreflightPassed: true, actualNoEngineOrCounters: true, actualAuthorizations: 0 }));
        return;
    }
    const hold = requireQuiescence();
    const lease = requireLease();
    const output = path.join(root, 'Original-comparison-173');
    fs.mkdirSync(output);
    writeNew(path.join(output, 'actual-admission.json'), {
        findingId: 'F198', sourceRole: 'Original', observedUtc: new Date().toISOString(), hostname: os.hostname(),
        lease, hold, driverSha256: hash(fileURLToPath(import.meta.url)), configSha256: configHash,
        allChildrenAwaited: true, noUniversalUnrelatedProcessInactivityOrDedicatedIsolationClaim: true
    });
    const authorization = {
        id: crypto.randomUUID(), sourceRole: 'Original', authorizedUtc: new Date().toISOString(),
        includesFailedOrPartial: true, status: 'authorized-before-any-engine-warmup-or-counters', output
    };
    budget.authorizations.push(authorization);
    replaceBudget(budget, 'before-original-authorization');
    try {
        const blocks = [];
        for (let block = 1; block <= 7; block++) {
            const directory = path.join(output, `block-${String(block).padStart(2, '0')}`);
            fs.mkdirSync(directory);
            const values = {};
            for (const [label, variant] of [['BaselineBefore', 'Baseline'], ['Candidate', 'Candidate'], ['BaselineAfter', 'Baseline']]) {
                requireLease();
                verifyImages(compatibility);
                values[label] = await runChild(config, lease, path.join(directory, label), variant, `${block}-${label}`);
            }
            blocks.push(values);
            writeNew(path.join(directory, 'block.json'), values);
        }
        verifyImages(compatibility);
        const result = decide(blocks);
        writeNew(path.join(output, 'outcome.json'), { ...result, actualCompleteBlocks: 7,
            actualManagedBenchmarkHostProcesses: 21, completedUtc: new Date().toISOString() });
        authorization.status = result.status;
        authorization.completedUtc = new Date().toISOString();
        budget.closed = result.status !== 'qualifies-original-only';
        budget.nextSourceRole = budget.closed ? null : 'ObservedDefault-only-after-separate-compatibility-and-driver-approval';
        replaceBudget(budget, 'before-original-outcome');
        console.log(JSON.stringify({ findingId: 'F198', sourceRole: 'Original', status: result.status, output }));
    } catch (error) {
        authorization.status = 'infrastructure-inconclusive';
        authorization.completedUtc = new Date().toISOString();
        authorization.error = error.stack;
        budget.closed = true;
        budget.closedReason = 'Original failed/partial comparison; frozen no-retry clause.';
        writeNew(path.join(output, 'failure.json'), { error: error.stack, actualNoRetry: true, failedUtc: new Date().toISOString() });
        replaceBudget(budget, 'before-original-failure');
        throw error;
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        requireValue(process.argv.length === 3, 'Exactly one driver mode argument is required.');
        await main(process.argv[2]);
    } catch (error) {
        console.error(error.stack);
        process.exitCode = 1;
    }
}
