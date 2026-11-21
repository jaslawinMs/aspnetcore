import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const root = path.join(session, 'autoperf-runs', 'F145');
const parallel = path.join(session, 'autoperf-parallelism');
const driver = fileURLToPath(import.meta.url);
const runner = path.join(session, 'F145-run-variant-008.ps1');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const writeOnce = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const writeBudget = value => fs.writeFileSync(path.join(root, 'diagnostic-budget.json'), JSON.stringify(value, null, 2) + '\n');
const plan = read(path.join(root, 'plan.json'));
const accepted = read(path.join(root, 'accepted-images.json'));
const functional = read(path.join(root, 'functional-acceptance.json'));
function inspect()
{
    assert.equal(hash(path.join(root, 'plan.json')), read(path.join(root, 'plan-seal.json')).sha256);
    assert.equal(hash(path.join(root, 'accepted-images.json')), read(path.join(root, 'accepted-images-seal.json')).sha256);
    assert.equal(hash(path.join(root, 'functional-acceptance.json')), read(path.join(root, 'functional-acceptance-seal.json')).sha256);
    assert.equal(functional.actualFourRoleVariantContractsPassed, true);
    assert.equal(functional.actualAllTwelveNativeChildrenTerminal, true);
    assert.equal(functional.actualNoStopwatchOrAllocationCounterExecuted, true);
    assert.equal(functional.runnerSha256, hash(runner));
    assert.equal(plan.protocol.perSourceRoleComparison.measuredPairs, 7);
    assert.equal(plan.protocol.perSourceRoleComparison.warmupPairs, 1);
    assert.equal(hash(String.raw`C:\src\aspnetcore\src\Servers\IIS\IIS\test\testassets\InProcessWebSite\Startup.cs`),
        hash(path.join(root, 'inputs', 'Startup.candidate.cs')));
    for (const role of ['original', 'default'])
    {
        for (const variant of ['baseline', 'candidate'])
        {
            const image = accepted.images[role][variant];
            for (const file of image.files)
            {
                assert.equal(fs.statSync(path.join(image.imagePath, file.file)).size, file.bytes);
                assert.equal(hash(path.join(image.imagePath, file.file)), file.sha256);
            }
        }
        for (const file of accepted.images[role].runtimeInputs) { assert.equal(hash(file.file), file.sha256); }
    }
    for (const observation of functional.observations) { assert.equal(hash(observation.file), observation.sha256); }
}
inspect();
if (process.argv[2] === '--inspect-images')
{
    assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
    console.log(JSON.stringify({ actualAllFourImagesAndRuntimeInputsUnchanged: true,
        actualAllFunctionalContractsAndRunnerSealVerified: true, actualNoTimingExecuted: true }, null, 2));
}
else
{
    const role = process.argv[2];
    assert.ok(['original', 'default'].includes(role));
    assert.equal(process.argv.length, 3);
    const leasePath = path.join(parallel, 'benchmark-exclusive.lease.json');
    const lease = read(leasePath), policy = read(path.join(parallel, 'policy.json'));
    assert.equal(lease.findingId, 'F145'); assert.equal(lease.purpose, 'benchmark');
    assert.equal(lease.gatePid, process.ppid);
    assert.equal(lease.arguments[0], driver); assert.equal(lease.arguments[1], role);
    assert.equal(policy.buildAndTestWorkQuiesced, true);
    assert.equal(policy.actualWorkerBuildHoldActive, true);
    assert.equal(policy.workersMayBuildOrTest, false);
    const approved = policy.approvedBenchmarkDrivers.find(item => item.findingId === 'F145' && item.path === driver);
    assert.equal(approved.sha256, hash(driver));
    const budget = read(path.join(root, 'diagnostic-budget.json'));
    assert.equal(budget.closed, false);
    assert.ok(budget.authorizations.length < 3);
    assert.equal(budget.authorizations.some(item => item.sourceRole === role), false);
    if (role === 'default')
    {
        const original = budget.authorizations.find(item => item.sourceRole === 'original');
        assert.equal(original.status, 'completed');
        assert.equal(original.decision.actualPrimaryAndControlGatesPassed, true);
    }
    else { assert.equal(budget.authorizations.length, 0); }
    const number = budget.authorizations.length + 1;
    const comparisonDirectory = path.join(root, 'comparisons', `authorization-${number}-${role}`);
    fs.mkdirSync(path.dirname(comparisonDirectory), { recursive: true });
    assert.equal(fs.existsSync(comparisonDirectory), false);
    const authorization = { authorization: number, sourceRole: role, status: 'running',
        authorizedAt: new Date().toISOString(), gatePid: lease.gatePid, gatewayLeaseToken: lease.token,
        driverPid: process.pid, driverSha256: hash(driver), runnerSha256: hash(runner),
        planSha256: hash(path.join(root, 'plan.json')), imagesSha256: hash(path.join(root, 'accepted-images.json')),
        functionalAcceptanceSha256: hash(path.join(root, 'functional-acceptance.json')),
        samePhysicalHostAndExactRuntimeWithinEachPair: true, windows: [] };
    budget.authorizations.push(authorization);
    budget.noTimingYet = false;
    writeBudget(budget);
    try
    {
        fs.mkdirSync(comparisonDirectory, { recursive: false });
        const results = [];
        for (let pair = -1; pair < 7; pair++)
        {
            const warmup = pair === -1;
            const order = warmup || pair % 2 === 0 ? ['baseline', 'candidate'] : ['candidate', 'baseline'];
            const paired = {};
            for (const variant of order)
            {
                const label = `measure-${role}-${variant}-a${number}-${warmup ? 'warmup' : 'pair' + pair}`;
                const args = ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', runner,
                    '-Role', role, '-Variant', variant, '-Mode', 'Measure', '-Label', label];
                const window = { label, pair, warmup, variant, startedAt: new Date().toISOString(),
                    launcher: 'pwsh', arguments: args, actualLauncherPid: null, actualExitCode: null, actualTerminal: false };
                authorization.windows.push(window);
                writeBudget(budget);
                const child = spawnSync('pwsh', args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024,
                    env: { ...process.env, AUTOPERF_BENCHMARK_LEASE_PATH: leasePath, AUTOPERF_BENCHMARK_LEASE_TOKEN: lease.token } });
                window.actualLauncherPid = child.pid;
                window.actualExitCode = child.status;
                window.actualTerminal = child.status !== null;
                window.endedAt = new Date().toISOString();
                fs.writeFileSync(path.join(comparisonDirectory, label + '.stdout.txt'), child.stdout ?? '', { flag: 'wx' });
                fs.writeFileSync(path.join(comparisonDirectory, label + '.stderr.txt'), child.stderr ?? '', { flag: 'wx' });
                writeBudget(budget);
                assert.ifError(child.error);
                assert.equal(child.status, 0, child.stderr + '\n' + child.stdout);
                const resultFile = path.join(root, 'executions', label, 'result.json'), result = read(resultFile);
                assert.equal(result.outcome, 'pass'); assert.equal(result.mode, 'Measure');
                assert.equal(result.actualPerformanceTiming, true);
                assert.equal(result.hostTerminal, true); assert.equal(result.hostExit, 0);
                assert.equal(result.nativeChildren.length, 2);
                for (const native of result.nativeChildren)
                {
                    assert.equal(native.terminal, true); assert.equal(native.exitCode, 0); assert.equal(native.actualTiming, true);
                }
                assert.equal(result.ready.startup.sha256.toUpperCase(), accepted.images[role][variant].sourceAssociation.ownerSha256);
                const core = accepted.images[role].runtimeInputs.find(item => path.basename(item.file) === 'System.Private.CoreLib.dll');
                assert.equal(result.ready.coreLibrary.sha256.toUpperCase(), core.sha256);
                assert.equal(result.actualEndpointFilesCreatedAndDeleted, 1);
                assert.equal(result.actualSameCreatedFilesDeleted, true);
                paired[variant] = { label, file: resultFile, sha256: hash(resultFile), hostPid: result.hostPid,
                    clientPids: result.nativeChildren.map(item => item.pid),
                    primarySeconds: result.primary.elapsedTicks / result.primary.ticksPerSecond,
                    controlSeconds: result.control.elapsedTicks / result.control.ticksPerSecond };
                assert.ok(paired[variant].primarySeconds > 0 && paired[variant].controlSeconds > 0);
            }
            results.push({ pair, warmup, order, ...paired,
                primaryCandidateBaselineRatio: paired.candidate.primarySeconds / paired.baseline.primarySeconds,
                controlCandidateBaselineRatio: paired.candidate.controlSeconds / paired.baseline.controlSeconds });
        }
        const measured = results.filter(item => !item.warmup);
        assert.equal(measured.length, 7);
        const mean = name => Math.exp(measured.reduce((sum, item) => sum + Math.log(item[name]), 0) / 7);
        const primaryRatio = mean('primaryCandidateBaselineRatio'), controlRatio = mean('controlCandidateBaselineRatio');
        const favoring = measured.filter(item => item.primaryCandidateBaselineRatio < 1).length;
        const decision = { sourceRole: role, measuredPairs: 7, actualWarmupPairsExcluded: 1,
            actualPrimaryGeometricMeanCandidateBaselineRatio: primaryRatio,
            actualPrimaryGeometricMeanLessTimePercent: (1 - primaryRatio) * 100,
            actualPrimaryPairsFavoringCandidate: favoring,
            actualPrimaryUsefulGainPassed: primaryRatio <= 0.90 && favoring >= 6,
            actualControlGeometricMeanCandidateBaselineRatio: controlRatio,
            actualControlGatePassed: controlRatio >= 0.95 && controlRatio <= 1.05,
            actualPrimaryAndControlGatesPassed: primaryRatio <= 0.90 && favoring >= 6 && controlRatio >= 0.95 && controlRatio <= 1.05,
            actualNoSourceRolesPooledOrPrimarySubstituted: true, actualAllocationMetrics: 0 };
        writeOnce(path.join(comparisonDirectory, 'paired-samples.json'), results);
        writeOnce(path.join(comparisonDirectory, 'decision.json'), decision);
        authorization.status = 'completed'; authorization.completedAt = new Date().toISOString();
        authorization.decision = decision;
        if (!decision.actualPrimaryAndControlGatesPassed || role === 'default')
        {
            budget.closed = true; budget.closedAt = new Date().toISOString();
            budget.closureReason = decision.actualPrimaryAndControlGatesPassed
                ? 'Both required source-role comparisons completed; no further comparison authorized.'
                : 'Completed primary useful-gain gate failed or unchanged control was noisy; no retry, retiming or substitution.';
            writeOnce(path.join(root, 'measurement-decision.json'), { recordedAt: new Date().toISOString(),
                actualPerformanceQualification: role === 'default' && budget.authorizations.every(item => item.decision?.actualPrimaryAndControlGatesPassed === true),
                actualNoPerformancePrCreated: true, actualBudgetPermanentlyClosed: true, authorizations: budget.authorizations.map(item => ({ authorization: item.authorization, sourceRole: item.sourceRole, decision: item.decision })) });
        }
        writeBudget(budget);
        console.log(JSON.stringify({ authorization: number, sourceRole: role, decision, actualBudgetClosed: budget.closed,
            actualAllNativeHostsAndClientsTerminal: true }, null, 2));
    }
    catch (error)
    {
        authorization.status = 'failed'; authorization.failedAt = new Date().toISOString(); authorization.failure = String(error.stack ?? error);
        budget.closed = true; budget.closedAt = new Date().toISOString();
        budget.closureReason = 'Infrastructure/identity failure; partial attempt consumed and budget closed conservatively without retiming.';
        writeBudget(budget);
        throw error;
    }
}
