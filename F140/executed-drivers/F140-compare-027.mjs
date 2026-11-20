import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const driver = fileURLToPath(import.meta.url), session = path.dirname(driver);
const root = path.join(session, 'autoperf-runs', 'F140');
const parallel = path.join(session, 'autoperf-parallelism');
const runner = path.join(session, 'F140-run-variant-027.ps1');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const writeOnce = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(process.argv.length, 4);
assert.equal(process.argv[2], 'F140');
const role = process.argv[3], roles = ['Original37', 'Default90'];
const plan = read(path.join(root, 'plan.json')), accepted = read(path.join(root, 'accepted-images.json'));
const functional = read(path.join(root, 'functional-acceptance.json'));
const budgetPath = path.join(root, 'diagnostic-budget.json');
const saveBudget = value => fs.writeFileSync(budgetPath, JSON.stringify(value, null, 2) + '\n');
const leasePath = path.join(parallel, 'benchmark-exclusive.lease.json');
const datasets = ['primary', 'primitive-control', 'no-interface'];
const checks = [
    'PublicSend.PrimitiveNullStringEnumDateTimeDecimalControl',
    'PublicSend.RepeatedGuidPocoListAndObjectRetainExactArguments',
    'PublicSend.IAsyncEnumerableTwoUploadsExactIdsValuesCompletionAndDisposal',
    'PublicSend.ChannelReaderExactItemsAndCompletionControl',
    'PublicSend.IAsyncEnumerableCancellationCompletesAndDisposesProducer',
    'ActualStartedConnection.CollectibleArgumentTypeClassifiedBeforeSerializationAndUnloads',
    ...datasets.map(name => 'PublicSend.ExactRawNativeFrame.' + name)
];
function inventory(directory, entries)
{
    const files = [];
    function walk(current)
    {
        for (const entry of fs.readdirSync(current, { withFileTypes: true }))
        {
            const file = path.join(current, entry.name);
            assert.equal(entry.isSymbolicLink(), false);
            if (entry.isDirectory()) { walk(file); }
            else { assert.ok(entry.isFile()); files.push(path.relative(directory, file)); }
        }
    }
    walk(directory);
    assert.deepEqual(files.sort(), entries.map(item => item.file).sort());
    for (const item of entries)
    {
        const file = path.join(directory, item.file);
        assert.equal(fs.statSync(file).size, item.bytes);
        assert.equal(hash(file), item.sha256);
    }
}
function inspect()
{
    for (const stem of ['plan', 'accepted-images', 'functional-acceptance'])
    {
        assert.equal(hash(path.join(root, stem + '.json')), read(path.join(root, stem + '-seal.json')).sha256);
    }
    assert.equal(plan.findingId, 'F140');
    assert.equal(plan.driverSha256, hash(driver));
    assert.equal(plan.runnerSha256, hash(runner));
    assert.equal(hash(plan.acceptanceFile), plan.acceptanceSha256);
    assert.deepEqual(plan.protocol, read(plan.acceptanceFile).performanceAcceptance);
    assert.equal(hash(plan.clarificationFile), plan.clarificationSha256);
    const clarification = read(plan.clarificationFile);
    assert.equal(clarification.actualPriorAcceptanceSha256, plan.acceptanceSha256);
    assert.equal(clarification.actualPrimaryDatasetOrThresholdsChanged, false);
    assert.equal(clarification.actualResultsOrCountersExistedAtClarification, false);
    assert.equal(functional.actualAllFourRequiredImagesPassed, true);
    assert.equal(functional.actualNativePassedExecutions, 28);
    assert.equal(functional.actualCommonV2FunctionalChecksPassed, 36);
    assert.equal(functional.actualNoStopwatchOrAllocationCounterExecuted, true);
    assert.equal(accepted.actualAcceptedV2SuccessfulCompiles, 1);
    assert.equal(accepted.actualCommonSuccessfulCompilesTotal, 2);
    assert.equal(accepted.actualSharedCommonFiveFileImageByteIdenticalForAllRolesAndVariants, true);
    assert.equal(plan.expectedMachine, process.env.COMPUTERNAME);
    assert.equal(plan.protocol.pairedObservationsPerSourceRole, 7);
    assert.equal(plan.protocol.operationsPerObservationPerDataset, 8192);
    assert.equal(plan.protocol.warmupOperationsPerDatasetPerFreshVariantProcess, 128);
    for (const key of roles)
    {
        const pair = accepted.images[key];
        assert.deepEqual(pair.causalDifferences,
            ['Microsoft.AspNetCore.SignalR.Client.Core.dll', 'Microsoft.AspNetCore.SignalR.Client.Core.pdb']);
        assert.deepEqual(pair.imagePrefixExceptions, []);
        const differences = [];
        for (const item of pair.baseline.files)
        {
            const other = pair.candidate.files.find(entry => entry.file === item.file);
            assert.ok(other);
            if (item.bytes !== other.bytes || item.sha256 !== other.sha256) { differences.push(item.file); }
        }
        assert.equal(pair.baseline.files.length, 273);
        assert.equal(pair.candidate.files.length, 273);
        assert.deepEqual(differences.sort(), [...pair.causalDifferences].sort());
        for (const variant of ['baseline', 'candidate'])
        {
            inventory(pair[variant].directory, pair[variant].files);
            const result = read(plan.roles[key].functionalResults[variant]);
            assert.deepEqual(result.passed, checks);
            assert.equal(result.actualCollectibleLifetime.actualClassifierCachePresent, variant === 'candidate');
            assert.equal(result.actualCollectibleLifetime.actualEntryObservedOnlyAfterRealProducer, variant === 'candidate');
            assert.equal(result.actualCollectibleLifetime.actualContextAndTypeCollected, true);
            assert.equal(result.actualCollectibleLifetime.actualRealConnectionKeptAliveThroughCollection, true);
            assert.equal(result.actualF141NativeAotOrDisabledDynamicCodeProducerVerified, false);
        }
        inventory(accepted.runtimeInputs[key].directory, accepted.runtimeInputs[key].files);
    }
    inventory(accepted.common.directory, accepted.common.files);
    for (const input of accepted.common.inputs)
    {
        assert.equal(hash(input.source), input.sha256);
        assert.equal(hash(input.copiedAs), input.sha256);
    }
    for (const document of accepted.common.freshlyVerifiedAllPdbRawDocuments)
    {
        assert.equal(hash(document.actualCopiedAs), document.actualSha256);
    }
    for (const input of accepted.toolInputs)
    {
        assert.equal(fs.statSync(input.file).size, input.bytes);
        assert.equal(hash(input.file), input.sha256);
    }
    for (const input of functional.actualObservationFiles) { assert.equal(hash(input.file), input.sha256); }
    assert.equal(hash(functional.actualIndependentXml.file), functional.actualIndependentXml.sha256);
    const xml = read(functional.actualIndependentXml.file);
    assert.equal(xml.actualPassedExecutions, 28);
    for (const run of xml.runs) { assert.equal(hash(run.file), run.sha256); }
}
if (role === '--inspect-images')
{
    assert.equal(fs.existsSync(leasePath), false);
    inspect();
    console.log(JSON.stringify({ finding: 'F140', actualAllFourCausalImagesAndCompleteRuntimesUnchanged: true,
        actualAllSelectedHostAndCommonInputsUnchanged: true, actualExactFunctionalNamesAndNativeReceiptsVerified: true,
        actualNoNativeExecutionOrCounters: true }, null, 2));
}
else
{
    assert.ok(roles.includes(role));
    const lease = read(leasePath), policy = read(path.join(parallel, 'policy.json'));
    assert.equal(lease.findingId, 'F140');
    assert.equal(lease.purpose, 'benchmark');
    assert.equal(lease.gatePid, process.ppid);
    assert.deepEqual(lease.arguments, [driver, 'F140', role]);
    const request = read(lease.requestPath);
    assert.equal(request.executable, process.execPath);
    assert.equal(request.workingDirectory, root);
    assert.deepEqual(request.arguments, lease.arguments);
    assert.equal(policy.buildAndTestWorkQuiesced, true);
    assert.equal(policy.actualWorkerBuildHoldActive, true);
    assert.equal(policy.workersMayBuildOrTest, false);
    assert.equal(policy.explicitF140HoldId, 'F140-027');
    const holdFile = path.join(session, policy.actualLocalQuiescenceReceipt);
    const hold = read(holdFile);
    assert.equal(hold.actualExplicitHoldId, 'F140-027');
    assert.equal(hold.actualAllRecordedLocalNativeAndSourceHeavyIoQuiesced, true);
    assert.deepEqual(hold.actualWorkerIds.sort(), Object.values(policy.independentFindingPreparationWorkers).sort());
    const approved = policy.approvedBenchmarkDrivers.find(item => item.findingId === 'F140' && item.path === driver);
    assert.equal(approved.sha256, hash(driver));
    const budget = read(budgetPath);
    assert.equal(budget.closed, false);
    assert.ok(budget.authorizations.length < 3);
    assert.equal(budget.authorizations.some(item => item.sourceRole === role), false);
    if (role === 'Original37') { assert.equal(budget.authorizations.length, 0); }
    else
    {
        assert.equal(budget.authorizations.length, 1);
        assert.equal(budget.authorizations[0].status, 'completed');
        assert.equal(budget.authorizations[0].decision.actualAllPredeclaredGatesPassed, true);
    }
    const number = budget.authorizations.length + 1;
    const authorization = { authorization: number, sourceRole: role, authorizedAt: new Date().toISOString(),
        status: 'running', gatePid: lease.gatePid, gatewayLeaseToken: lease.token, driverPid: process.pid,
        driverSha256: hash(driver), runnerSha256: hash(runner), planSha256: hash(path.join(root, 'plan.json')),
        acceptedImagesSha256: hash(path.join(root, 'accepted-images.json')), actualHoldReceiptSha256: hash(holdFile),
        actualFailedOrPartialAuthorizationConsumedBeforeInspectionOrWarmup: true, windows: [] };
    budget.authorizations.push(authorization);
    budget.noTimingYet = false;
    saveBudget(budget);
    try
    {
        inspect();
        const comparison = path.join(root, 'comparisons', `authorization-${number}-${role}`);
        fs.mkdirSync(comparison);
        const results = [];
        for (let pair = 0; pair < 7; pair++)
        {
            const order = pair % 2 === 0 ? ['baseline', 'candidate'] : ['candidate', 'baseline'];
            const paired = {};
            for (const variant of order)
            {
                const label = `measure-F140-${role}-${variant}-a${number}-pair${pair}`;
                const args = ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', runner,
                    '-Role', role, '-Variant', variant, '-Pair', String(pair), '-Label', label];
                const window = { label, pair, variant, startedAt: new Date().toISOString(),
                    launcher: plan.powershell, arguments: args, actualLauncherPid: null, actualTerminal: false };
                authorization.windows.push(window);
                saveBudget(budget);
                const child = spawnSync(plan.powershell, args, { cwd: root, encoding: 'utf8', windowsHide: true,
                    maxBuffer: 8 * 1024 * 1024, env: { ...process.env,
                        AUTOPERF_BENCHMARK_LEASE_PATH: leasePath, AUTOPERF_BENCHMARK_LEASE_TOKEN: lease.token,
                        AUTOPERF_GATE_DRIVER_PID: String(process.pid) } });
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
                assert.equal(result.actualMachine.toLowerCase(), plan.expectedMachine.toLowerCase());
                assert.equal(result.actualNativeExitCode, 0);
                assert.equal(result.actualNativeTerminal, true);
                assert.equal(result.actualStdoutCompletelyDrained, true);
                assert.equal(result.actualStderrCompletelyDrained, true);
                assert.ok(result.actualObservedDescendants.every(item => item.actualTerminal));
                assert.equal(hash(result.actualMeasurementFile), result.actualMeasurementSha256);
                const measured = result.actualMeasurement;
                const observed = read(plan.roles[role].functionalResults[variant]);
                assert.equal(measured.role, role);
                assert.equal(measured.pairIndex, pair);
                assert.equal(measured.actualPid, result.actualNativePid);
                assert.equal(measured.actualMachine.toLowerCase(), plan.expectedMachine.toLowerCase());
                assert.equal(measured.actualFramework, `.NET ${accepted.runtimeInputs[role].version}`);
                assert.equal(measured.actualClientMvid, observed.actualClientMvid);
                assert.equal(measured.actualTestProducerMvid, observed.actualTestProducerMvid);
                assert.equal(measured.actualCommonFixtureMvid, accepted.common.pe.mvid);
                assert.equal(measured.actualSourceBuiltClient.toLowerCase(),
                    path.join(accepted.images[role][variant].directory, 'Microsoft.AspNetCore.SignalR.Client.Core.dll').toLowerCase());
                assert.equal(measured.actualTieredCompilationEnvironment, '0');
                assert.equal(measured.actualIsolatedDedicatedMachineClaimed, false);
                assert.equal(measured.actualNormalPriorityAtSampleTimeClaimed, false);
                assert.deepEqual(measured.observations.map(item => item.name),
                    datasets.map((_, index) => datasets[(index + pair) % datasets.length]));
                for (const observation of measured.observations)
                {
                    assert.equal(observation.actualOperations, 8192);
                    assert.equal(observation.actualWarmupOperations, 128);
                    assert.ok(observation.actualAllocatedBytes > 0 && observation.actualElapsedTimestampTicks > 0 &&
                        observation.actualStopwatchFrequency > 0 && observation.actualFrameCharacters > 0);
                }
                paired[variant] = { file, sha256: hash(file), nativePid: measured.actualPid,
                    serverGc: measured.actualServerGc, observations: measured.observations };
            }
            assert.equal(paired.baseline.serverGc, paired.candidate.serverGc);
            const observations = {};
            for (const name of datasets)
            {
                const baseline = paired.baseline.observations.find(item => item.name === name);
                const candidate = paired.candidate.observations.find(item => item.name === name);
                assert.equal(baseline.actualFrameCharacters, candidate.actualFrameCharacters);
                assert.equal(baseline.actualStopwatchFrequency, candidate.actualStopwatchFrequency);
                observations[name] = {
                    allocationRatio: candidate.actualAllocatedBytes / baseline.actualAllocatedBytes,
                    elapsedRatio: candidate.actualElapsedTimestampTicks / baseline.actualElapsedTimestampTicks,
                    allocatedBytesSaved: baseline.actualAllocatedBytes - candidate.actualAllocatedBytes
                };
            }
            results.push({ pair, order, ...paired, observations });
        }
        inspect();
        const geometric = (name, field) => Math.exp(results.reduce((sum, item) =>
            sum + Math.log(item.observations[name][field]), 0) / 7);
        const p = plan.protocol;
        const allocations = geometric('primary', 'allocationRatio'), elapsed = geometric('primary', 'elapsedRatio');
        const controlAllocation = geometric('primitive-control', 'allocationRatio');
        const controlElapsed = geometric('primitive-control', 'elapsedRatio');
        const noInterfaceAllocation = geometric('no-interface', 'allocationRatio');
        const noInterfaceElapsed = geometric('no-interface', 'elapsedRatio');
        const favorable = results.filter(item => item.observations.primary.allocationRatio < 1).length;
        const saved = results.reduce((sum, item) => sum + item.observations.primary.allocatedBytesSaved, 0) / 7;
        const allocationPassed = allocations <= p.primaryAllocationGeomeanMaximumRatio &&
            favorable >= p.primaryAllocationMinimumFavorablePairs &&
            saved >= p.minimumMeanAbsoluteAllocatedBytesSavedPerObservation;
        const elapsedPassed = elapsed <= p.primaryElapsedGeomeanMaximumRatio;
        const controlPassed = controlAllocation >= p.unchangedControlAllocationGeomeanRatioRange[0] &&
            controlAllocation <= p.unchangedControlAllocationGeomeanRatioRange[1] &&
            controlElapsed >= p.unchangedControlElapsedGeomeanRatioRange[0] &&
            controlElapsed <= p.unchangedControlElapsedGeomeanRatioRange[1];
        const noInterfacePassed = noInterfaceAllocation <= p.changedPathAllocationGeomeanMaximumRatio &&
            noInterfaceElapsed <= p.changedPathElapsedGeomeanMaximumRatio;
        const decision = { finding: 'F140', sourceRole: role, actualMeasuredPairs: 7,
            actualOperationsPerDatasetPerObservation: 8192, actualWarmupOperationsPerDatasetPerFreshProcess: 128,
            actualPrimaryAllocationGeometricMeanCandidateBaselineRatio: allocations,
            actualPrimaryElapsedGeometricMeanCandidateBaselineRatio: elapsed,
            actualPrimaryAllocationPairsFavoringCandidate: favorable,
            actualMeanAbsoluteAllocatedBytesSavedPerObservation: saved,
            actualUnchangedControlAllocationGeometricMeanCandidateBaselineRatio: controlAllocation,
            actualUnchangedControlElapsedGeometricMeanCandidateBaselineRatio: controlElapsed,
            actualNoInterfaceAllocationGeometricMeanCandidateBaselineRatio: noInterfaceAllocation,
            actualNoInterfaceElapsedGeometricMeanCandidateBaselineRatio: noInterfaceElapsed,
            actualAllocationGatePassed: allocationPassed, actualElapsedGatePassed: elapsedPassed,
            actualUnchangedControlGatePassed: controlPassed, actualChangedPathNonregressionGatePassed: noInterfacePassed,
            actualAllPredeclaredGatesPassed: allocationPassed && elapsedPassed && controlPassed && noInterfacePassed,
            actualSameLocalPhysicalHostAndPinnedRuntimeWithinEveryPair: true, actualSourceRolesPooled: false,
            actualCompleteSerializedFrameComparedEveryPublicSend: true,
            actualNoSocketServerBrowserThroughputOrColdTypeClaim: true, actualNoDedicatedIsolationClaim: true };
        writeOnce(path.join(comparison, 'paired-samples.json'), results);
        writeOnce(path.join(comparison, 'decision.json'), decision);
        authorization.status = 'completed';
        authorization.completedAt = new Date().toISOString();
        authorization.decision = decision;
        if (!decision.actualAllPredeclaredGatesPassed || role === 'Default90')
        {
            budget.closed = true;
            budget.closedAt = new Date().toISOString();
            budget.actualUnusedAuthorizationsPermanentlyClosed = 3 - budget.authorizations.length;
            budget.closureReason = decision.actualAllPredeclaredGatesPassed
                ? 'Both required roles independently passed; unused authorization permanently closed.'
                : 'A frozen useful-gain/elapsed/unchanged-control/zero-interface gate did not pass; no tuning, retiming or substitution.';
            writeOnce(path.join(root, 'measurement-decision.json'), { recordedAt: new Date().toISOString(), finding: 'F140',
                actualPerformanceQualification: role === 'Default90' &&
                    budget.authorizations.every(item => item.decision?.actualAllPredeclaredGatesPassed),
                actualBudgetPermanentlyClosed: true, actualNoPerformancePrCreated: true,
                authorizations: budget.authorizations.map(item => ({
                    authorization: item.authorization, sourceRole: item.sourceRole, decision: item.decision })) });
        }
        saveBudget(budget);
        console.log(JSON.stringify({ authorization: number, decision, actualBudgetClosed: budget.closed,
            actualAllMeasuredNativeRootsObservedChildrenAndStreamsTerminal: true }, null, 2));
    }
    catch (error)
    {
        authorization.status = 'failed';
        authorization.failedAt = new Date().toISOString();
        authorization.failure = String(error.stack ?? error);
        budget.closed = true;
        budget.closedAt = new Date().toISOString();
        budget.actualUnusedAuthorizationsPermanentlyClosed = 3 - budget.authorizations.length;
        budget.closureReason = 'Failed or partial authorization consumed and permanently closed without retry or measurement-driven changes.';
        saveBudget(budget);
        throw error;
    }
}
