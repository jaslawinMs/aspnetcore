import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F219');
const parallel = path.join(session, 'autoperf-parallelism');
const sourceRole = 'Original';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const writeNew = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const saveBudget = value => fs.writeFileSync(path.join(run, 'diagnostic-budget.json'), JSON.stringify(value, null, 2) + '\n');
const geometricMean = values => Math.exp(values.reduce((sum, value) => sum + Math.log(value), 0) / values.length);
const planFile = path.join(run, 'plan.json');
const planHash = hash(planFile);
assert.equal(planHash, 'D83AC482C2A940298186EE421CE780ECC17A1A711E5514A3E4480FB24F66390C');
assert.equal(planHash, read(path.join(run, 'plan-seal.json')).sha256);
const plan = read(planFile);
assert.equal(plan.schedule.blocks, 7);
assert.deepEqual(plan.schedule.blockOrder, ['BaselineBefore', 'Candidate', 'BaselineAfter']);
assert.deepEqual(plan.parameterValues, [10, 100, 1000]);
assert.equal(plan.primaryParameter, 100);
const imagesFile = path.join(run, 'accepted-images-Original.json');
const imagesHash = hash(imagesFile);
assert.equal(imagesHash, read(path.join(run, 'accepted-images-Original-seal.json')).sha256);
const images = read(imagesFile);
const driverHash = hash(fileURLToPath(import.meta.url));
assert.equal(images.sourceRole, sourceRole);
assert.equal(images.driverSha256, driverHash);
assert.equal(hash(images.launcher), images.launcherSha256);
assert.equal(hash(images.powerShell), images.powerShellSha256);
assert.equal(hash(String.raw`C:\src\aspnetcore\global.json`), images.protectedGlobalJsonSha256);
assert.equal(images.actualRuntime, '12.0.0-alpha.1.26562.105');
assert.equal(images.coordinatorName, os.hostname());
for (const file of images.runtimeFiles) { assert.equal(hash(file.path), file.sha256); }
for (const file of images.functionalEvidence) { assert.equal(hash(file.path), file.sha256); }
const inventories = {};
for (const role of ['Baseline', 'Candidate'])
{
    const image = images.roles[role];
    assert.equal(hash(image.inventory), image.inventorySha256);
    const inventory = read(image.inventory);
    const actualPaths = fs.readdirSync(image.root, { recursive: true, withFileTypes: true })
        .filter(item => item.isFile()).map(item => path.relative(image.root, path.join(item.parentPath, item.name))).sort();
    assert.deepEqual(actualPaths, inventory.Files.map(item => item.File).sort());
    for (const file of inventory.Files)
    {
        const absolute = path.join(image.root, file.File);
        assert.equal(fs.statSync(absolute).size, file.Bytes);
        assert.equal(hash(absolute), file.Sha256);
    }
    inventories[role] = new Map(inventory.Files.map(item => [item.File, item.Sha256]));
    const inspection = read(image.inspection);
    assert.equal(inspection.NoMeasurementExecuted, true);
    assert.equal(inspection.Helper.length, 7);
    assert.ok(inspection.Helper.every(item => item.Passed === true));
    assert.deepEqual(inspection.Documents.map(item => item.EndpointCount), [10, 100, 1000]);
    assert.deepEqual(inspection.Documents.map(item => item.Operations), [34, 304, 3004]);
    assert.ok(inspection.Documents.every(item => item.ActualUnchangedBenchmarkMethodAlsoCompleted === true));
    const completion = read(image.inspectionCompletion);
    assert.equal(completion.Mode, 'inspect');
    assert.equal(completion.Passed, true);
}
assert.deepEqual([...inventories.Baseline.keys()].sort(), [...inventories.Candidate.keys()].sort());
const differences = [...inventories.Baseline].filter(([file, sha]) => inventories.Candidate.get(file) !== sha)
    .map(([file]) => file).sort();
assert.deepEqual(differences, [
    'Benchmark\\Microsoft.AspNetCore.OpenApi.dll', 'Benchmark\\Microsoft.AspNetCore.OpenApi.pdb',
    'Native\\Microsoft.AspNetCore.OpenApi.dll', 'Native\\Microsoft.AspNetCore.OpenApi.pdb'
]);
assert.equal(images.launcherSha256, '611CF0C7A98CAA3BF79BBBED27A0D96F6427EC2AD3E7BD37972ADDC37C139B74');
if (process.argv[2] === 'inspect')
{
    assert.equal(process.argv.length, 3);
    console.log(JSON.stringify({ actualNoMeasurementExecuted: true, actualDriverSha256: driverHash,
        actualPlanSha256: planHash, actualAcceptedImagesSha256: imagesHash, actualCausalDifferences: differences,
        actualFrozenComparisons: 'Seven fresh BaselineBefore/Candidate/BaselineAfter processes; all three unchanged parameters in each.',
        actualAwaiting: 'Sequential spawnSync; pinned launcher awaits its sole native child and both streams.',
        actualNoPriorityAffinityOrPowerChanges: true }, null, 2));
}
else
{
    assert.equal(process.argv.length, 2, 'No ad hoc selectors or tuning arguments.');
    const leasePath = path.join(parallel, 'benchmark-exclusive.lease.json');
    const lease = read(leasePath);
    assert.equal(lease.purpose, 'benchmark');
    assert.equal(lease.findingId, 'F219');
    assert.equal(lease.gatePid, process.ppid);
    assert.equal(lease.arguments[0], fileURLToPath(import.meta.url));
    const budget = read(path.join(run, 'diagnostic-budget.json'));
    assert.equal(budget.closed, false);
    assert.ok(budget.authorizations.length < 3);
    assert.ok(!budget.authorizations.some(item => item.sourceRole === sourceRole), 'A source-role comparison may not be repeated.');
    const number = budget.authorizations.length + 1;
    const comparison = path.join(run, 'comparisons', String(number).padStart(3, '0'));
    fs.mkdirSync(comparison);
    const authorization = {
        number, sourceRole, authorizedAt: new Date().toISOString(), status: 'started', actualCompletedChildren: [],
        actualPlanSha256: planHash, actualAcceptedImagesSha256: imagesHash, actualDriverSha256: driverHash,
        actualCoordinatorName: os.hostname(), failedOrPartialStillConsumesAuthorization: true
    };
    budget.authorizations.push(authorization);
    budget.performanceOrAllocationMeasurementsPerformed = null;
    budget.measurementBoundary = 'Authorization persisted before warmup; whether measurements occurred awaits actual child receipts.';
    saveBudget(budget);
    try
    {
        const blocks = [];
        for (let block = 1; block <= plan.schedule.blocks; block++)
        {
            const observations = {};
            for (const position of plan.schedule.blockOrder)
            {
                const role = position === 'Candidate' ? 'Candidate' : 'Baseline';
                const image = images.roles[role];
                const prefix = path.join(comparison, `block-${block}-${position}`);
                const spec = { ...image.launchSpec, Output: prefix + '-observation' };
                const specFile = prefix + '.spec.json';
                writeNew(specFile, spec);
                const invocation = {
                    activationSourceRoot: images.activationSourceRoot,
                    stdoutPath: prefix + '.stdout.txt', stderrPath: prefix + '.stderr.txt', lifecyclePath: prefix + '.lifecycle.json',
                    arguments: ['exec', '--fx-version', images.actualRuntime, '--roll-forward', 'Disable',
                        '--runtimeconfig', path.join(image.consumer, 'Microsoft.AspNetCore.OpenApi.Microbenchmarks.runtimeconfig.json'),
                        '--depsfile', path.join(image.consumer, 'Microsoft.AspNetCore.OpenApi.Microbenchmarks.deps.json'),
                        path.join(image.consumer, 'AutoPerf.F219.ExistingBenchmark.dll'), 'run', specFile]
                };
                const invocationFile = prefix + '.invocation.json';
                writeNew(invocationFile, invocation);
                const child = spawnSync(images.powerShell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', images.launcher,
                    '-InvocationPath', invocationFile], {
                    encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024,
                    env: { ...process.env, DOTNET_gcServer: '1', AUTOPERF_BENCHMARK_LEASE_PATH: leasePath,
                        AUTOPERF_BENCHMARK_LEASE_TOKEN: lease.token }
                });
                fs.writeFileSync(prefix + '.launcher.stdout.txt', child.stdout ?? '', { flag: 'wx' });
                fs.writeFileSync(prefix + '.launcher.stderr.txt', child.stderr ?? '', { flag: 'wx' });
                if (child.error) { throw child.error; }
                assert.equal(child.status, 0, `Actual measurement child failed: block${block}/${position}`);
                const lifecycle = read(invocation.lifecyclePath);
                assert.equal(lifecycle.actualChildAwaitedToExit, true);
                assert.equal(lifecycle.actualExitCode, 0);
                const measurement = read(path.join(spec.Output, 'measurement.json'));
                const completion = read(path.join(spec.Output, 'completion.json'));
                assert.equal(measurement.Role, spec.Role);
                assert.equal(completion.Mode, 'run');
                assert.equal(completion.Passed, true);
                assert.deepEqual(measurement.Rows.map(item => item.EndpointCount).sort((a, b) => a - b), plan.parameterValues);
                for (const row of measurement.Rows)
                {
                    assert.ok(Number.isFinite(row.Nanoseconds) && row.Nanoseconds > 0);
                    assert.ok(Number.isFinite(row.Bytes) && row.Bytes > 0);
                    assert.equal(row.Measurements.length, 7);
                    assert.ok(row.Measurements.every(item => item.Operations > 0 && item.Nanoseconds > 0));
                }
                budget.performanceOrAllocationMeasurementsPerformed = true;
                budget.measurementBoundary = 'At least one actual child completed all three seven-iteration benchmark cases.';
                observations[position] = measurement.Rows;
                authorization.actualCompletedChildren.push({ block, position, actualOwnedPid: lifecycle.actualOwnedChildPid });
                saveBudget(budget);
            }
            blocks.push({
                block,
                parameters: plan.parameterValues.map(parameter =>
                {
                    const get = position => observations[position].find(item => item.EndpointCount === parameter);
                    const before = get('BaselineBefore'), candidate = get('Candidate'), after = get('BaselineAfter');
                    const baselineNs = Math.sqrt(before.Nanoseconds * after.Nanoseconds);
                    const baselineBytes = Math.sqrt(before.Bytes * after.Bytes);
                    return { parameter, before, candidate, after, baselineNs, baselineBytes,
                        elapsedRatio: candidate.Nanoseconds / baselineNs, allocationRatio: candidate.Bytes / baselineBytes,
                        absoluteControlDriftPercent: Math.abs(after.Nanoseconds / before.Nanoseconds - 1) * 100 };
                })
            });
        }
        const parameters = plan.parameterValues.map(parameter =>
        {
            const rows = blocks.map(block => block.parameters.find(item => item.parameter === parameter));
            return { parameter,
                elapsedReductionPercent: (1 - geometricMean(rows.map(item => item.elapsedRatio))) * 100,
                allocationReductionPercent: (1 - geometricMean(rows.map(item => item.allocationRatio))) * 100,
                elapsedDirectionalBlocks: rows.filter(item => item.elapsedRatio < 1).length,
                allocationDirectionalBlocks: rows.filter(item => item.allocationRatio < 1).length,
                maximumAbsoluteControlDriftPercent: Math.max(...rows.map(item => item.absoluteControlDriftPercent))
            };
        });
        const gate = plan.acceptance;
        const primary = parameters.find(item => item.parameter === plan.primaryParameter);
        const controlsPassed = parameters.every(item => item.maximumAbsoluteControlDriftPercent <= gate.maximumAbsoluteBaselineControlElapsedDriftPercentEveryBlockAndParameter);
        const materialElapsed = primary.elapsedReductionPercent >= gate.wholeDocumentPrimaryMinimumElapsedOrAllocationReductionPercent &&
            primary.elapsedDirectionalBlocks >= gate.requiredPrimaryDirectionalBlocks;
        const materialAllocation = primary.allocationReductionPercent >= gate.wholeDocumentPrimaryMinimumElapsedOrAllocationReductionPercent &&
            primary.allocationDirectionalBlocks >= gate.requiredPrimaryDirectionalBlocks;
        const regressionsPassed = parameters.every(item => item.elapsedReductionPercent >= -gate.maximumElapsedRegressionPercentAtAnyParameter &&
            item.allocationReductionPercent >= -gate.maximumAllocationRegressionPercentAtAnyParameter);
        const result = {
            number, sourceRole, completedAt: new Date().toISOString(), actualCoordinatorName: os.hostname(),
            actualPlanSha256: planHash, actualAcceptedImagesSha256: imagesHash,
            actualAll21MeasurementChildrenTerminalAndPassed: true, actualNoSamplesExcludedOrRetried: true,
            actualControlDriftDefinition: 'Absolute percentage change of BaselineAfter elapsed relative to BaselineBefore elapsed, every block and parameter.',
            blocks, parameters, controlsPassed, materialElapsed, materialAllocation, regressionsPassed,
            predeclaredAcceptancePassed: controlsPassed && (materialElapsed || materialAllocation) && regressionsPassed,
            outcome: !controlsPassed ? 'inconclusive-control-drift' :
                (materialElapsed || materialAllocation) && regressionsPassed ? 'qualified-Original-only' : 'measured-no-gain'
        };
        const resultFile = path.join(comparison, 'result.json');
        writeNew(resultFile, result);
        Object.assign(authorization, { status: 'completed', completedAt: result.completedAt, actualResultSha256: hash(resultFile),
            predeclaredAcceptancePassed: result.predeclaredAcceptancePassed, outcome: result.outcome });
        saveBudget(budget);
        console.log(JSON.stringify(result, null, 2));
    }
    catch (error)
    {
        Object.assign(authorization, { status: 'failed-or-partial', failedAt: new Date().toISOString(), error: String(error.stack ?? error) });
        saveBudget(budget);
        writeNew(path.join(comparison, 'failure.json'), authorization);
        throw error;
    }
}
