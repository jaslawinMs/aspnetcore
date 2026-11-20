import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F142');
const parallel = path.join(session, 'autoperf-parallelism');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const writeNew = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const writeBudget = value => fs.writeFileSync(path.join(run, 'diagnostic-budget.json'), JSON.stringify(value, null, 2) + '\n');
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const plan = read(path.join(run, 'plan.json'));
const planHash = hash(path.join(run, 'plan.json'));
assert.equal(planHash, read(path.join(run, 'plan-seal.json')).sha256);
const imagesFile = path.join(run, 'accepted-images.json');
const imagesHash = hash(imagesFile);
assert.equal(imagesHash, read(path.join(run, 'accepted-images-seal.json')).sha256);
const images = read(imagesFile);
const driverHash = hash(fileURLToPath(import.meta.url));
assert.equal(driverHash, images.driverSha256);
assert.equal(hash(images.launcher), images.launcherSha256);
assert.equal(hash(path.join(run, 'canonical-preflight-inputs-005', 'input-seal.json')), images.inputSealSha256);
assert.equal(hash(String.raw`C:\src\aspnetcore\global.json`), images.protectedGlobalJsonSha256);
for (const item of images.runtimeFiles) { assert.equal(hash(item.path), item.sha256); }
for (const role of ['Original', 'Candidate'])
{
    const image = images.roles[role];
    assert.equal(hash(image.inventory), image.inventorySha256);
    for (const file of read(image.inventory).Files)
    {
        const absolute = path.join(image.consumer, file.File);
        assert.equal(fs.statSync(absolute).size, file.Bytes); assert.equal(hash(absolute), file.Sha256);
    }
}
if (process.argv[2] === 'inspect')
{
    assert.equal(process.argv.length, 3);
    console.log(JSON.stringify({ actualNoMeasurementExecuted: true, actualDriverAndLauncherAndImagesAndRuntimeHashesVerified: true,
        actualPlanSha256: planHash, actualAcceptedImagesSha256: imagesHash, actualDriverSha256: driverHash,
        actualAwaitingMechanism: 'Node spawnSync waits for each PowerShell launcher; each launcher explicitly WaitForExit/read streams/disposes its sole native measurement child before exit.',
        actualProcessOnlyConfiguration: images.processOnlyRuntimeConfiguration }));
}
else
{
    assert.equal(process.argv.length, 2, 'No ad hoc measurement selectors or tuning arguments.');
    const leasePath = path.join(parallel, 'benchmark-exclusive.lease.json');
    const lease = read(leasePath);
    assert.equal(lease.purpose, 'benchmark'); assert.equal(lease.findingId, 'F142');
    assert.equal(lease.gatePid, process.ppid, 'Only the actual owning gateway may launch this driver.');
    assert.equal(lease.arguments[0], fileURLToPath(import.meta.url));
    const budget = read(path.join(run, 'diagnostic-budget.json'));
    assert.equal(budget.closed, false); assert.ok(budget.authorizations.length < 3);
    const number = budget.authorizations.length + 1;
    const comparison = path.join(run, 'comparisons', String(number).padStart(3, '0'));
    fs.mkdirSync(comparison, { recursive: false });
    const authorization = { number, authorizedAt: new Date().toISOString(), status: 'started',
        roleOrder: plan.comparisonRoleOrders[number - 1], actualCompletedRows: [],
        actualPlanSha256: planHash, actualAcceptedImagesSha256: imagesHash, actualDriverSha256: driverHash,
        failedOrPartialStillConsumesAuthorization: true };
    budget.authorizations.push(authorization); writeBudget(budget);
    try
    {
        const rows = [];
        for (const profile of [plan.primary.profile, ...plan.secondaryProfiles])
        {
            for (const role of authorization.roleOrder)
            {
                const image = images.roles[role];
                const prefix = path.join(comparison, `${role}-${profile}`);
                const invocation = {
                    activationSourceRoot: String.raw`C:\src\aspnetcore`,
                    stdoutPath: prefix + '.stdout.txt', stderrPath: prefix + '.stderr.txt', lifecyclePath: prefix + '.lifecycle.json',
                    arguments: ['exec', '--fx-version', images.actualRuntime, '--roll-forward', 'Disable',
                        path.join(image.consumer, 'AutoPerf.F142.Measurement.dll'), 'measure', role,
                        image.inventory, image.canonicalDocuments, prefix + '-observation', profile]
                };
                const invocationFile = prefix + '.invocation.json';
                writeNew(invocationFile, invocation);
                const child = spawnSync(images.powerShell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', images.launcher,
                    '-InvocationPath', invocationFile], {
                    encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024,
                    env: { ...process.env, AUTOPERF_BENCHMARK_LEASE_PATH: leasePath, AUTOPERF_BENCHMARK_LEASE_TOKEN: lease.token }
                });
                fs.writeFileSync(prefix + '.launcher.stdout.txt', child.stdout ?? '', { flag: 'wx' });
                fs.writeFileSync(prefix + '.launcher.stderr.txt', child.stderr ?? '', { flag: 'wx' });
                if (child.error) { throw child.error; }
                assert.equal(child.status, 0, `Actual measurement child failed: ${role}/${profile}`);
                const lifecycle = read(invocation.lifecyclePath);
                assert.equal(lifecycle.actualChildAwaitedToExit, true); assert.equal(lifecycle.actualExitCode, 0);
                const observed = read(path.join(prefix + '-observation', profile + '.json'));
                assert.equal(observed.role, role); assert.equal(observed.profile, profile);
                assert.equal(observed.passed, true); assert.equal(observed.measured, true);
                assert.equal(observed.actualGeneratedOwnerSha256, image.generatedOwnerSha256);
                assert.equal(observed.actualPlatform, images.actualRuntime);
                assert.equal(observed.samples.length, plan.samples.sampleCount);
                for (const [index, sample] of observed.samples.entries())
                {
                    assert.equal(sample.Index, index); assert.equal(sample.Iterations, plan.samples.invocationsPerSample);
                    assert.ok(Number.isFinite(sample.NanosecondsPerOperation) && sample.NanosecondsPerOperation > 0);
                    assert.ok(Number.isFinite(sample.BytesPerOperation) && sample.BytesPerOperation >= 0);
                }
                rows.push(observed);
                authorization.actualCompletedRows.push({ role, profile, actualChildPid: lifecycle.actualOwnedChildPid });
                writeBudget(budget);
            }
        }
        const pairs = [plan.primary.profile, ...plan.secondaryProfiles].map(profile =>
        {
            const original = rows.find(row => row.role === 'Original' && row.profile === profile);
            const candidate = rows.find(row => row.role === 'Candidate' && row.profile === profile);
            assert.equal(original.expectedOperation, candidate.expectedOperation);
            const originalNs = median(original.samples.map(sample => sample.NanosecondsPerOperation));
            const candidateNs = median(candidate.samples.map(sample => sample.NanosecondsPerOperation));
            const originalBytes = median(original.samples.map(sample => sample.BytesPerOperation));
            const candidateBytes = median(candidate.samples.map(sample => sample.BytesPerOperation));
            return { profile, originalNs, candidateNs, originalBytes, candidateBytes,
                lessTimePercent: (originalNs - candidateNs) / originalNs * 100,
                savedBytes: originalBytes - candidateBytes,
                lessAllocationPercent: originalBytes === 0 ? 0 : (originalBytes - candidateBytes) / originalBytes * 100 };
        });
        const primary = pairs[0];
        const result = {
            number, completedAt: new Date().toISOString(), pairs, actualAllFourteenChildrenTerminalAndPassed: true,
            actualPlanSha256: planHash, actualAcceptedImagesSha256: imagesHash,
            predeclaredEarlyStopGatePassed: (primary.lessTimePercent >= 25 || primary.lessAllocationPercent >= 25)
                && primary.lessTimePercent >= -3 && pairs.every(pair => pair.lessTimePercent >= -5 && pair.savedBytes >= 0),
            actualNotWholeDocumentOrApplicationThroughput: true
        };
        const resultFile = path.join(comparison, 'result.json');
        writeNew(resultFile, result);
        Object.assign(authorization, { status: 'completed', completedAt: result.completedAt, actualResultSha256: hash(resultFile) });
        writeBudget(budget);
        console.log(JSON.stringify(result, null, 2));
    }
    catch (error)
    {
        Object.assign(authorization, { status: 'failed-or-partial', failedAt: new Date().toISOString(), error: String(error.stack ?? error) });
        writeBudget(budget);
        writeNew(path.join(comparison, 'failure.json'), authorization);
        throw error;
    }
}
