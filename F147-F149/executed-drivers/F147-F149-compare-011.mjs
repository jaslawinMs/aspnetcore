import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const session = path.dirname(fileURLToPath(import.meta.url));
const parallel = path.join(session, 'autoperf-parallelism');
const driver = fileURLToPath(import.meta.url);
const runner = path.join(session, 'F147-F149-run-variant-011.ps1');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const writeOnce = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const finding = process.argv[2], role = process.argv[3];
assert.ok(['F147', 'F149'].includes(finding));
assert.equal(process.argv.length, 4);
const root = path.join(session, 'autoperf-runs', finding);
const plan = read(path.join(root, 'plan.json'));
const accepted = read(path.join(root, 'accepted-images.json'));
const functional = read(path.join(root, 'functional-acceptance.json'));
const budgetPath = path.join(root, 'diagnostic-budget.json');
const saveBudget = value => fs.writeFileSync(budgetPath, JSON.stringify(value, null, 2) + '\n');
const leasePath = path.join(parallel, 'benchmark-exclusive.lease.json');

function inventory(directory, entries)
{
    const files = [];
    function walk(current)
    {
        for (const entry of fs.readdirSync(current, { withFileTypes: true }))
        {
            const file = path.join(current, entry.name);
            if (entry.isDirectory()) { walk(file); }
            else { assert.ok(entry.isFile()); files.push(path.relative(directory, file).split(path.sep).join('/')); }
        }
    }
    walk(directory);
    assert.deepEqual(files.sort(), entries.map(e => e.file).sort());
    for (const entry of entries)
    {
        const file = path.join(directory, entry.file);
        assert.equal(fs.statSync(file).size, entry.bytes);
        assert.equal(hash(file), entry.sha256);
    }
}

function inspect()
{
    for (const stem of ['plan', 'accepted-images', 'functional-acceptance'])
    {
        assert.equal(hash(path.join(root, stem + '.json')), read(path.join(root, stem + '-seal.json')).sha256);
    }
    assert.equal(plan.findingId, finding);
    assert.equal(plan.driverSha256, hash(driver));
    assert.equal(plan.runnerSha256, hash(runner));
    assert.equal(hash(plan.acceptanceFile), plan.acceptanceSha256);
    assert.deepEqual(plan.protocol, read(plan.acceptanceFile).performanceAcceptance);
    assert.equal(functional.actualAllFourRequiredImagesPassed, true);
    assert.equal(functional.actualNoStopwatchOrAllocationCounterExecuted, true);
    assert.equal(functional.actualCommonCompiledOnceAndUnchanged, true);
    assert.equal(functional.runnerSha256, hash(runner));
    assert.equal(hash(accepted.metadataAcceptance.file), accepted.metadataAcceptance.sha256);
    const metadata = read(accepted.metadataAcceptance.file);
    assert.equal(metadata.passed, true);
    assert.equal(metadata.actualAllNativeXmlRows, 120);
    assert.equal(metadata.actualCausalPairImageComparisons.length, 4);
    assert.equal(plan.expectedMachine, process.env.COMPUTERNAME);
    assert.equal(plan.protocol.pairedObservationsPerSourceRole, 7);
    assert.equal(plan.protocol.operationsPerObservation, 128);
    assert.equal(plan.protocol.warmupOperationsPerCasePerFreshVariantProcess, 16);
    for (const key of ['Original', 'CurrentDefault'])
    {
        for (const variant of ['baseline', 'candidate'])
        {
            const image = accepted.images[key][variant];
            assert.equal(image.actualWholeDefaultFrameworkClaimed, false);
            assert.equal(image.actualRuntime, '12.0.0-alpha.1.26557.102');
            inventory(image.actualImagePath, image.actualAllImageFiles);
            assert.equal(hash(image.actualRawSourceSnapshot), image.actualRawSourceSha256);
        }
    }
    inventory(accepted.common.actualOutputDirectory, accepted.common.actualFiles);
    inventory(accepted.common.actualRuntimeDirectory, accepted.common.actualAllRuntimeFiles);
    for (const file of accepted.toolchainAndHostInputs) { assert.equal(hash(file.file), file.sha256); }
    for (const file of functional.observations) { assert.equal(hash(file.file), file.sha256); }
}

if (role === '--inspect-images')
{
    assert.equal(fs.existsSync(leasePath), false);
    inspect();
    console.log(JSON.stringify({ finding, actualAllFourImagesRuntimeAndSelectedToolchainUnchanged: true,
        actualAllFunctionalAndFreshMetadataContractsVerified: true, actualNoNativeExecutionOrCounters: true }, null, 2));
}
else
{
    assert.ok(['Original', 'CurrentDefault'].includes(role));
    const lease = read(leasePath), policy = read(path.join(parallel, 'policy.json'));
    assert.equal(lease.findingId, finding);
    assert.equal(lease.purpose, 'benchmark');
    assert.equal(lease.gatePid, process.ppid);
    assert.deepEqual(lease.arguments, [driver, finding, role]);
    assert.equal(policy.buildAndTestWorkQuiesced, true);
    assert.equal(policy.actualWorkerBuildHoldActive, true);
    assert.equal(policy.workersMayBuildOrTest, false);
    const approved = policy.approvedBenchmarkDrivers.find(e => e.findingId === finding && e.path === driver);
    assert.equal(approved.sha256, hash(driver));
    const budget = read(budgetPath);
    assert.equal(budget.closed, false);
    assert.ok(budget.authorizations.length < 3);
    assert.equal(budget.authorizations.some(a => a.sourceRole === role), false);
    if (role === 'Original') { assert.equal(budget.authorizations.length, 0); }
    else
    {
        assert.equal(budget.authorizations.length, 1);
        assert.equal(budget.authorizations[0].status, 'completed');
        assert.equal(budget.authorizations[0].decision.actualAllPredeclaredGatesPassed, true);
    }
    const number = budget.authorizations.length + 1;
    const authorization = { authorization: number, sourceRole: role,
        sourceRoleLabel: role === 'Original' ? 'Original' : 'CurrentDefaultSampleOwner',
        authorizedAt: new Date().toISOString(), status: 'running', gatePid: lease.gatePid,
        gatewayLeaseToken: lease.token, driverPid: process.pid, driverSha256: hash(driver),
        runnerSha256: hash(runner), planSha256: hash(path.join(root, 'plan.json')),
        acceptedImagesSha256: hash(path.join(root, 'accepted-images.json')),
        actualFailedOrPartialAuthorizationConsumedBeforeInspectionOrWarmup: true, windows: [] };
    budget.authorizations.push(authorization);
    budget.noTimingYet = false;
    saveBudget(budget);
    try
    {
        inspect();
        const comparison = path.join(root, 'comparisons', `authorization-${number}-${role}`);
        fs.mkdirSync(comparison, { recursive: false });
        const results = [];
        for (let pair = 0; pair < 7; pair++)
        {
            const order = pair % 2 === 0 ? ['baseline', 'candidate'] : ['candidate', 'baseline'];
            const paired = {};
            for (const variant of order)
            {
                const label = `measure-${finding}-${role}-${variant}-a${number}-pair${pair}`;
                const args = ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', runner,
                    '-Finding', finding, '-Role', role, '-Variant', variant, '-Pair', String(pair), '-Label', label];
                const window = { label, pair, variant, startedAt: new Date().toISOString(),
                    launcher: plan.powershell, arguments: args, actualLauncherPid: null, actualTerminal: false };
                authorization.windows.push(window);
                saveBudget(budget);
                const child = spawnSync(plan.powershell, args, { cwd: root, encoding: 'utf8', windowsHide: true,
                    maxBuffer: 8 * 1024 * 1024,
                    env: { ...process.env, AUTOPERF_BENCHMARK_LEASE_PATH: leasePath, AUTOPERF_BENCHMARK_LEASE_TOKEN: lease.token } });
                window.actualLauncherPid = child.pid;
                window.actualExitCode = child.status;
                window.actualTerminal = child.status !== null;
                window.completedAt = new Date().toISOString();
                fs.writeFileSync(path.join(comparison, label + '.stdout.txt'), child.stdout ?? '', { flag: 'wx' });
                fs.writeFileSync(path.join(comparison, label + '.stderr.txt'), child.stderr ?? '', { flag: 'wx' });
                saveBudget(budget);
                assert.ifError(child.error);
                assert.equal(child.status, 0, child.stderr + '\n' + child.stdout);
                const file = path.join(root, 'executions', label, 'result.json'), result = read(file);
                assert.equal(result.outcome, 'pass');
                assert.equal(result.actualPerformanceMeasurement, true);
                assert.equal(result.actualMachine, plan.expectedMachine);
                assert.equal(result.actualNativeExitCode, 0);
                assert.equal(result.actualNativeTerminal, true);
                assert.equal(result.actualStdoutCompletelyDrained, true);
                assert.equal(result.actualStderrCompletelyDrained, true);
                assert.ok(result.actualObservedDescendants.every(d => d.actualTerminal === true));
                assert.equal(result.actualWholeDefaultFrameworkClaimed, false);
                assert.equal(hash(result.actualNativeXml), result.actualNativeXmlSha256);
                const measurement = result.actualMeasurement;
                assert.equal(measurement.sampleSha256, accepted.images[role][variant].actualOwnerSha256);
                assert.equal(measurement.commonCoreSha256, accepted.commonCoreSha256);
                const primaryDirection = finding === 'F147' ? 'unidirectional' : 'bidirectional';
                const controlDirection = finding === 'F147' ? 'bidirectional' : 'unidirectional';
                assert.deepEqual(measurement.observations.map(o => o.Direction),
                    pair % 2 === 0 ? [primaryDirection, controlDirection] : [controlDirection, primaryDirection]);
                const primary = measurement.observations.find(o => o.Direction === primaryDirection);
                const control = measurement.observations.find(o => o.Direction === controlDirection);
                for (const o of [primary, control])
                {
                    assert.equal(o.ActualMeasurement, true);
                    assert.equal(o.Operations, 128);
                    assert.equal(o.PayloadBytes, 65536);
                    assert.ok(o.AllocatedBytes > 0 && o.ElapsedMilliseconds > 0);
                }
                paired[variant] = { file, sha256: hash(file), nativePid: result.actualNativePid, primary, control };
            }
            results.push({ pair, order, ...paired,
                primaryAllocationRatio: paired.candidate.primary.AllocatedBytes / paired.baseline.primary.AllocatedBytes,
                primaryElapsedRatio: paired.candidate.primary.ElapsedMilliseconds / paired.baseline.primary.ElapsedMilliseconds,
                controlAllocationRatio: paired.candidate.control.AllocatedBytes / paired.baseline.control.AllocatedBytes,
                controlElapsedRatio: paired.candidate.control.ElapsedMilliseconds / paired.baseline.control.ElapsedMilliseconds,
                absoluteAllocatedBytesSaved: paired.baseline.primary.AllocatedBytes - paired.candidate.primary.AllocatedBytes });
        }
        inspect();
        const geometric = key => Math.exp(results.reduce((sum, p) => sum + Math.log(p[key]), 0) / 7);
        const p = plan.protocol;
        const allocations = geometric('primaryAllocationRatio'), elapsed = geometric('primaryElapsedRatio');
        const controlAllocations = geometric('controlAllocationRatio'), controlElapsed = geometric('controlElapsedRatio');
        const favorable = results.filter(r => r.primaryAllocationRatio < 1).length;
        const saved = results.reduce((sum, r) => sum + r.absoluteAllocatedBytesSaved, 0) / 7;
        const allocationPassed = allocations <= p.primaryAllocationGeomeanMaximumRatio &&
            favorable >= p.primaryAllocationMinimumFavorablePairs &&
            saved >= p.minimumMeanAbsoluteAllocatedBytesSavedPerObservation;
        const elapsedPassed = elapsed <= p.primaryElapsedGeomeanMaximumRatio;
        const controlPassed = controlAllocations >= p.unchangedControlAllocationGeomeanRatioRange[0] &&
            controlAllocations <= p.unchangedControlAllocationGeomeanRatioRange[1] &&
            controlElapsed >= p.unchangedControlElapsedGeomeanRatioRange[0] &&
            controlElapsed <= p.unchangedControlElapsedGeomeanRatioRange[1];
        const decision = { finding, sourceRole: role, actualMeasuredPairs: 7,
            actualWarmupOperationsPerDirectionPerFreshProcess: 16,
            actualPrimaryAllocationGeometricMeanCandidateBaselineRatio: allocations,
            actualPrimaryElapsedGeometricMeanCandidateBaselineRatio: elapsed,
            actualPrimaryAllocationPairsFavoringCandidate: favorable,
            actualMeanAbsoluteAllocatedBytesSavedPerObservation: saved,
            actualUnchangedControlAllocationGeometricMeanCandidateBaselineRatio: controlAllocations,
            actualUnchangedControlElapsedGeometricMeanCandidateBaselineRatio: controlElapsed,
            actualAllocationGatePassed: allocationPassed, actualElapsedGatePassed: elapsedPassed,
            actualUnchangedControlGatePassed: controlPassed,
            actualAllPredeclaredGatesPassed: allocationPassed && elapsedPassed && controlPassed,
            actualSameHostAndRuntimeWithinEveryPair: true, actualSourceRolesPooled: false,
            actualWholeDefaultFrameworkClaimed: false,
            actualNoPhysicalConsoleQuicTlsBrowserThroughputClaim: true };
        writeOnce(path.join(comparison, 'paired-samples.json'), results);
        writeOnce(path.join(comparison, 'decision.json'), decision);
        authorization.status = 'completed';
        authorization.completedAt = new Date().toISOString();
        authorization.decision = decision;
        if (!decision.actualAllPredeclaredGatesPassed || role === 'CurrentDefault')
        {
            budget.closed = true;
            budget.closedAt = new Date().toISOString();
            budget.closureReason = decision.actualAllPredeclaredGatesPassed
                ? 'Both required roles completed; unused third authorization permanently closed.'
                : 'A predeclared useful-gain/elapsed/control gate did not pass; no retiming, tuning or substitution.';
            writeOnce(path.join(root, 'measurement-decision.json'), { recordedAt: new Date().toISOString(), finding,
                actualPerformanceQualification: role === 'CurrentDefault' &&
                    budget.authorizations.every(a => a.decision?.actualAllPredeclaredGatesPassed === true),
                actualBudgetPermanentlyClosed: true, actualNoPerformancePrCreated: true,
                authorizations: budget.authorizations.map(a => ({ authorization: a.authorization,
                    sourceRole: a.sourceRole, decision: a.decision })) });
        }
        saveBudget(budget);
        console.log(JSON.stringify({ authorization: number, decision, actualBudgetClosed: budget.closed,
            actualAllMeasuredNativeProcessesAndStreamsTerminal: true }, null, 2));
    }
    catch (error)
    {
        authorization.status = 'failed';
        authorization.failedAt = new Date().toISOString();
        authorization.failure = String(error.stack ?? error);
        budget.closed = true;
        budget.closedAt = new Date().toISOString();
        budget.closureReason = 'Failed or partial authorization consumed; budget closed without retry or measurement-driven changes.';
        saveBudget(budget);
        throw error;
    }
}
