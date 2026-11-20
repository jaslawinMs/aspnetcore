import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] && process.argv[2] !== '--require-seal' ? process.argv[2] : path.dirname(fileURLToPath(import.meta.url)));
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const privateRoot = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F145`;
const local = nativePath =>
{
    const relative = path.win32.relative(privateRoot, nativePath);
    assert.ok(!relative.startsWith('..') && !path.win32.isAbsolute(relative));
    return relative.replaceAll('\\', '/');
};
const same = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected)));
function auditFileFacts(directory, expected)
{
    const facts = read(directory + '/runtime-and-files.json');
    assert.equal(facts.exitCode, 0); assert.equal(facts.failure, null);
    assert.deepEqual(facts.endpointFilesRemaining, []);
    assert.equal(facts.fileEvents.some(item => item.kind === 'watcher-error'), false);
    const names = kind => [...new Set(facts.fileEvents.filter(item => item.kind === kind).map(item => item.path))].sort();
    assert.equal(names('created').length, expected);
    assert.deepEqual(names('created'), names('deleted'));
}
for (const item of read('authoritative-copied-files.json').files)
{
    assert.equal(fs.statSync(path.join(root, item.file)).size, item.bytes);
    assert.equal(hash(path.join(root, item.file)), item.sha256);
}
for (const [file, seal] of [['plan.json', 'plan-seal.json'], ['accepted-images.json', 'accepted-images-seal.json'],
    ['functional-acceptance.json', 'functional-acceptance-seal.json']])
{
    assert.equal(hash(path.join(root, file)), read(seal).sha256);
}
const plan = read('plan.json'), accepted = read('accepted-images.json'), functional = read('functional-acceptance.json');
const budget = read('diagnostic-budget.json'), post = read('post-comparison-quiescence-001.json');
assert.equal(budget.closed, true); assert.equal(budget.authorizations.length, 2);
assert.equal(hash(path.join(root, 'diagnostic-budget.json')), 'E16D807797DE2C3CF07E2153F31B549B366A93A58BEC99E9EED99FF3FF23DEE3');
assert.equal(post.budgetSha256, hash(path.join(root, 'diagnostic-budget.json')));
assert.equal(post.actualLeaseAbsent, true); assert.equal(post.actualLeaseLifecyclesNonoverlapping, true);
assert.equal(post.actualNoOwnedNativeProcessesRemaining, true); assert.equal(post.actualDedicatedHostClaimed, false);
const allowlist = ['InProcessWebSite.dll', 'InProcessWebSite.pdb'];
let allImageEntries = 0;
for (const role of ['original', 'default'])
{
    const before = accepted.images[role].baseline.files, after = accepted.images[role].candidate.files;
    assert.equal(before.length, 137); assert.equal(after.length, 137);
    assert.deepEqual(before, plan.sourceRoles[role].baselineImageFiles);
    assert.deepEqual(before.map(item => item.file), after.map(item => item.file));
    assert.deepEqual(before.filter((item, index) => item.sha256 !== after[index].sha256).map(item => item.file).sort(), allowlist);
    allImageEntries += before.length + after.length;
    for (const variant of ['baseline', 'candidate'])
    {
        const selected = read('selected-image-files.json').files.filter(item => item.role === role && item.variant === variant);
        for (const item of selected)
        {
            const frozen = accepted.images[role][variant].files.find(entry => entry.file === item.imageFile);
            assert.equal(item.sha256, frozen.sha256); assert.equal(item.bytes, frozen.bytes);
            assert.equal(hash(path.join(root, item.file)), frozen.sha256);
        }
    }
}
assert.equal(functional.actualFourRoleVariantContractsPassed, true);
assert.equal(functional.actualAllTwelveNativeChildrenTerminal, true);
assert.equal(functional.actualNoStopwatchOrAllocationCounterExecuted, true);
assert.equal(hash(path.join(root, 'inputs', 'F145-run-variant-008.ps1')), functional.runnerSha256);
let functionalRows = 0, nativeChildren = 0;
for (const observation of functional.observations)
{
    const file = local(observation.file), result = read(file);
    assert.equal(hash(path.join(root, file)), observation.sha256);
    assert.equal(result.outcome, 'pass'); assert.equal(result.actualPerformanceTiming, false);
    assert.match(result.ready.serverType, /^Microsoft\.AspNetCore\.Server\.Kestrel\./);
    assert.equal(result.rawResponse.bytes, 200000000);
    assert.equal(result.rawResponse.sha256, plan.functionalAcceptance.rawSha256);
    assert.equal(result.primary.bodyLength, 200000000); assert.equal(result.primary.allCharactersExpected, true);
    assert.equal(result.control.bodyLength, 65000); assert.equal(result.control.allCharactersExpected, true);
    assert.equal(result.hostTerminal, true); assert.equal(result.hostExit, 0);
    assert.equal(result.nativeChildren.length, 2);
    assert.ok(result.nativeChildren.every(child => child.terminal && child.exitCode === 0 && child.actualTiming === false));
    assert.equal(result.actualSameCreatedFilesDeleted, true); assert.equal(result.actualEndpointFilesCreatedAndDeleted, 2);
    assert.equal(result.postFileBarrier, '/after-large');
    const directory = path.posix.dirname(file);
    assert.deepEqual(read(directory + '/primary.stdout.txt'), result.primary);
    assert.deepEqual(read(directory + '/control.stdout.txt'), result.control);
    auditFileFacts(directory, 2);
    const image = accepted.images[result.role][result.variant];
    assert.equal(result.ready.startup.sha256.toUpperCase(), image.sourceAssociation.ownerSha256);
    assert.equal(result.primary.runtime, '.NET ' + plan.sourceRoles[result.role].exactRuntime);
    assert.equal(result.control.runtime, result.primary.runtime);
    nativeChildren += 3; functionalRows++;
}
const reductions = [];
let variantWindows = 0, rawClientTimings = 0, retainedClientTimings = 0;
for (const authorization of budget.authorizations)
{
    assert.equal(authorization.status, 'completed');
    assert.equal(authorization.windows.length, 16);
    assert.equal(authorization.runnerSha256, hash(path.join(root, 'inputs', 'F145-run-variant-008.ps1')));
    assert.equal(authorization.driverSha256, hash(path.join(root, 'inputs', 'F145-compare-008.mjs')));
    const role = authorization.sourceRole, pairs = [];
    for (let pair = -1; pair < 7; pair++)
    {
        const expectedOrder = pair < 0 || pair % 2 === 0 ? ['baseline', 'candidate'] : ['candidate', 'baseline'];
        const windows = authorization.windows.filter(item => item.pair === pair);
        assert.deepEqual(windows.map(item => item.variant), expectedOrder);
        const values = {};
        for (const window of windows)
        {
            assert.equal(window.warmup, pair < 0); assert.equal(window.actualTerminal, true); assert.equal(window.actualExitCode, 0);
            const directory = 'executions/' + window.label, result = read(directory + '/result.json');
            assert.equal(result.outcome, 'pass'); assert.equal(result.mode, 'Measure');
            assert.match(result.ready.serverType, /^Microsoft\.AspNetCore\.Server\.Kestrel\./);
            assert.equal(result.actualPerformanceTiming, true);
            assert.equal(result.hostTerminal, true); assert.equal(result.hostExit, 0);
            assert.equal(result.actualEndpointFilesCreatedAndDeleted, 1); assert.equal(result.actualSameCreatedFilesDeleted, true);
            auditFileFacts(directory, 1);
            const image = accepted.images[role][window.variant];
            assert.equal(result.ready.startup.sha256.toUpperCase(), image.sourceAssociation.ownerSha256);
            assert.equal(result.ready.startup.mvid.toLowerCase(), image.sourceAssociation.mvid.toLowerCase());
            assert.equal(result.ready.runtime, '.NET ' + plan.sourceRoles[role].exactRuntime);
            const core = accepted.images[role].runtimeInputs.find(item => path.win32.basename(item.file) === 'System.Private.CoreLib.dll');
            assert.equal(result.ready.coreLibrary.sha256.toUpperCase(), core.sha256);
            assert.equal(result.nativeChildren.length, 2);
            assert.ok(result.nativeChildren.every(child => child.terminal && child.exitCode === 0 && child.actualTiming));
            const primary = read(directory + '/primary.stdout.txt'), control = read(directory + '/control.stdout.txt');
            assert.deepEqual(primary, result.primary); assert.deepEqual(control, result.control);
            assert.equal(primary.role, 'primary'); assert.equal(primary.bodyLength, 200000000);
            assert.equal(control.role, 'control'); assert.equal(control.bodyLength, 65000);
            assert.equal(primary.uri, result.ready.address + '/LargeResponseFile');
            assert.equal(control.uri, result.ready.address + '/LargeResponseBody?length=65000');
            assert.equal(primary.processId, result.nativeChildren.find(child => child.selector === 'primary').pid);
            assert.equal(control.processId, result.nativeChildren.find(child => child.selector === 'control').pid);
            values[window.variant] = { primary: primary.elapsedTicks / primary.ticksPerSecond, control: control.elapsedTicks / control.ticksPerSecond };
            assert.ok(values[window.variant].primary > 0 && values[window.variant].control > 0);
            nativeChildren += 3; variantWindows++; rawClientTimings += 2;
            if (pair >= 0) { retainedClientTimings += 2; }
        }
        if (pair >= 0) { pairs.push({ pair, primary: values.candidate.primary / values.baseline.primary, control: values.candidate.control / values.baseline.control }); }
    }
    const mean = name => Math.exp(pairs.reduce((sum, item) => sum + Math.log(item[name]), 0) / 7);
    const primary = mean('primary'), control = mean('control'), favoring = pairs.filter(item => item.primary < 1).length;
    assert.ok(primary <= 0.90 && favoring >= 6 && control >= 0.95 && control <= 1.05);
    same(primary, authorization.decision.actualPrimaryGeometricMeanCandidateBaselineRatio);
    same(control, authorization.decision.actualControlGeometricMeanCandidateBaselineRatio);
    assert.equal(favoring, authorization.decision.actualPrimaryPairsFavoringCandidate);
    reductions.push({ role, primaryRatio: primary, lessTimePercent: (1 - primary) * 100, favoringPairs: favoring, controlRatio: control });
    const events = post.actualGateReceipts.find(item => item.authorization === authorization.authorization).events;
    for (const name of ['acquired', 'child-started', 'child-ended', 'released']) { assert.equal(events.filter(item => item.event === name).length, 1); }
}
assert.equal(read('measurement-decision.json').actualPerformanceQualification, true);
const independent = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', path.join(root, 'audit-owner-and-numbers.ps1'), '-Root', root],
    { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
assert.ifError(independent.error); assert.equal(independent.status, 0, independent.stderr + '\n' + independent.stdout);
const external = JSON.parse(independent.stdout.replace(/^\uFEFF/, ''));
assert.equal(external.actualSelectedPePdbAndRawSourceAssociations.length, 4);
assert.equal(external.actualNoDotnetSourceAssemblyOrProducerStarted, true);
for (const item of external.actualIndependentRawClientOutputReductions)
{
    const expected = reductions.find(row => row.role === item.role);
    same(item.actualPrimaryRatio, expected.primaryRatio); same(item.actualControlRatio, expected.controlRatio);
    assert.equal(item.actualFavoringPairs, expected.favoringPairs);
}
const sealFile = path.join(root, 'capsule-file-hashes.json');
if (process.argv.includes('--require-seal')) { assert.equal(fs.existsSync(sealFile), true); }
let sealedFiles = null;
if (fs.existsSync(sealFile))
{
    const material = read('capsule-file-hashes.json').files;
    for (const item of material)
    {
        assert.equal(fs.statSync(path.join(root, item.file)).size, item.bytes);
        assert.equal(hash(path.join(root, item.file)), item.sha256);
    }
    sealedFiles = material.length + 1;
}
console.log(JSON.stringify({ actualPortableHistoricalAuditPassed: true, actualFourFunctionalRoleVariants: functionalRows,
    actualFourSelectedPePdbRawSourceAssociations: external.actualSelectedPePdbAndRawSourceAssociations.length,
    actualHistoricalImageEntriesAccountedFor: allImageEntries, actualOnlyOwnerDllPdbChangedWithinEachPair: true,
    actualFrozenComparisons: 2, actualSerializedVariantWindows: variantWindows,
    actualRawClientTimingsIncludingWarmups: rawClientTimings, actualRetainedClientTimings: retainedClientTimings,
    actualAllFunctionalAndMeasurementNativeChildrenTerminal: nativeChildren,
    actualIndependentPowerShellReductionAgrees: true, reductions, actualClosedBudgetUnchanged: true,
    actualSealedFiles: sealedFiles, actualNoDotnetProducerOrNewMeasurementStarted: true,
    actualOmittedRuntimeAndFullImagesReconstructed: false, actualFullCompilerOrNativeIisAttestation: false }, null, 2));
