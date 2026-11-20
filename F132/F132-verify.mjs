import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(process.argv[2] ?? '.');
const live = process.argv.includes('--live-images');
const read = file => JSON.parse(fs.readFileSync(path.join(root, ...file.split('/')), 'utf8').replace(/^\uFEFF/, ''));
const bytesHash = (bytes, algorithm = 'sha256') => crypto.createHash(algorithm).update(bytes).digest('hex').toUpperCase();
const hash = file => bytesHash(fs.readFileSync(path.join(root, ...file.split('/'))));
assert.equal(hash('plan.json'), read('plan-seal.json').sha256);
const budget = read('diagnostic-budget.json');
assert.equal(budget.closed, true);
assert.equal(budget.authorizations.length, 3);
assert.ok(budget.authorizations.every(entry => entry.status === 'completed' && entry.actualCompletedRoles.length === 2));
assert.equal(read('measurement-analysis.json').preliminaryDisposition, 'no-gain');
assert.equal(read('measurement-analysis.json').actualTimingQualification, false);
assert.equal(read('measurement-analysis.json').actualAllocationQualification, false);
const expectedPreparationFailures = new Set(['default-tests-001', 'harness-build-001', 'reconstruction-build-001']);
let managedCommands = 0;
const executions = [];
for (const label of fs.readdirSync(path.join(root, 'validation')).sort())
{
    const folder = 'validation/' + label;
    if (!fs.statSync(path.join(root, folder)).isDirectory()) continue;
    const command = read(folder + '/command.json');
    const result = read(folder + '/result.json');
    assert.equal(command.activation, '. .\\activate.ps1');
    assert.equal(command.machineSettingsChanged, false);
    assert.equal(hash(folder + '/command.ps1'), result.actualCommandSha256);
    assert.equal(hash(folder + '/stdout.txt'), result.stdoutSha256);
    assert.equal(hash(folder + '/stderr.txt'), result.stderrSha256);
    assert.equal(result.protectedGlobalJsonBefore, result.protectedGlobalJsonAfter);
    if (expectedPreparationFailures.has(label))
    {
        assert.equal(result.exitCode, 1);
        assert.match(fs.readFileSync(path.join(root, folder, 'stdout.txt'), 'utf8'), /NETSDK1004/);
    }
    else assert.equal(result.exitCode, label === 'original-characterize-001' ? 2 : 0);
    managedCommands++;
    const map = {
        'original-characterize-001': 'images/Original',
        'original-characterize-002': 'images-v2/Original',
        'default-characterize-001': 'images-v2/Default',
        'candidate-characterize-001': 'images-v2/Candidate',
        'restored-characterize-001': 'images-v2/RestoredOriginal',
        'reconstruction-original-characterize-001': 'reconstruction-001/Original',
        'reconstruction-candidate-characterize-001': 'reconstruction-001/Candidate',
    };
    if (map[label]) executions.push({ file: folder + '/observations.json', image: map[label], historicalFailure: label === 'original-characterize-001' });
}
for (let index = 1; index <= 3; index++)
{
    const directory = 'comparison-' + String(index).padStart(3, '0');
    const comparison = read(directory + '/verified-comparison.json');
    assert.deepEqual(comparison.roleOrder, read('plan.json').benchmark.beforeAfterRoleOrders[index - 1]);
    for (const role of comparison.roleOrder)
    {
        const folder = directory + '/' + role;
        const command = read(folder + '/command.json');
        const result = read(folder + '/result.json');
        assert.equal(command.activation, '. .\\activate.ps1');
        assert.deepEqual(command.environmentOverrides, { ...read('plan.json').benchmark.processOverrides, DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_NOLOGO: '1' });
        assert.equal(command.actualMachineSettingsChanged, false);
        assert.equal(result.exitCode, 0);
        for (const [file, field] of [['command.ps1', 'actualCommandSha256'], ['stdout.txt', 'stdoutSha256'], ['stderr.txt', 'stderrSha256'], ['observations.json', 'actualOutputSha256']])
            assert.equal(hash(folder + '/' + file), result[field]);
        executions.push({ file: folder + '/observations.json', image: 'images-v2/' + role, historicalFailure: false });
    }
}
let untimedLifetimes = 0, acceptedUntimedLifetimes = 0, timedProfileLifetimes = 0, keyContracts = 0, sourceAssociations = 0, runtimeRecords = 0, historicalFailedRows = 0;
const checkedManifests = new Map();
for (const execution of executions)
{
    const report = read(execution.file);
    const manifest = read(execution.image + '/manifest.json');
    checkedManifests.set(execution.image, manifest);
    assert.equal(report.ContractFailures, execution.historicalFailure ? 6 : 0);
    assert.equal(report.Rows.length, report.Mode === 'measure' ? 3 : 9);
    if (report.Mode === 'measure') timedProfileLifetimes += report.Rows.length;
    else
    {
        untimedLifetimes += report.Rows.length;
        if (!execution.historicalFailure) acceptedUntimedLifetimes += report.Rows.length;
    }
    for (const row of report.Rows)
    {
        historicalFailedRows += row.Failures.length > 0 ? 1 : 0;
        if (!execution.historicalFailure) assert.equal(row.Failures.length, 0);
        if (row.Failures.length) assert.deepEqual(row.Failures, ['Final renderer disposal leaked a subscription.']);
        const generic = row.Profile !== 'PlainShort4';
        assert.equal(row.ReadCallsBeforeRemoval, generic ? (row.ParentTicks + 1) * 64 * 4 : 0);
        assert.equal(row.ActualRetainedChildren, 64);
        assert.equal(row.ActualChildRendersBeforeRemoval, (row.ParentTicks + 1) * 64);
        assert.equal(row.SubscriptionsCreated, generic ? 512 : 0);
        if (!execution.historicalFailure)
        {
            assert.equal(row.SubscriptionsDisposed, row.SubscriptionsCreated);
            assert.equal(row.ActiveAfterRendererDisposal, 0);
            assert.equal(row.FinalRemovalHtml, '<main></main>');
        }
        for (const contract of row.KeyContracts) { assert.equal(contract.Passed, true); keyContracts++; }
        assert.equal(row.Samples.length, report.Mode === 'measure' ? 8 : 0);
        for (const sample of row.Samples)
        {
            assert.equal(sample.ParentTicks, 256);
            assert.equal(sample.ActualProducerReads, generic ? 256 * 64 * 4 : 0);
            assert.ok(sample.ElapsedStopwatchTicks > 0 && sample.AllocatedBytes >= 0);
        }
    }
    for (const binding of report.SourceBindings)
    {
        const bytes = fs.readFileSync(path.join(root, execution.image, 'source', binding.RelativePath));
        assert.equal(bytesHash(bytes), binding.SourceSha256);
        const algorithm = binding.HashAlgorithm === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256' :
            binding.HashAlgorithm === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
        assert.ok(algorithm);
        assert.equal(bytesHash(bytes, algorithm), binding.PdbDocumentHash);
        assert.ok(binding.PeCodeViewGuid && binding.PeCodeViewStamp > 0);
        sourceAssociations++;
    }
    for (const assembly of report.Assemblies)
    {
        const filename = path.win32.basename(assembly.Location);
        const binary = manifest.binaries.find(entry => entry.file === filename);
        if (binary) assert.equal(assembly.Sha256, binary.sha256);
        if (live) assert.equal(bytesHash(fs.readFileSync(assembly.Location)), assembly.Sha256);
        runtimeRecords++;
    }
}
assert.equal(untimedLifetimes, 63);
assert.equal(acceptedUntimedLifetimes, 54);
assert.equal(timedProfileLifetimes, 18);
assert.equal(historicalFailedRows, 6);
assert.equal(keyContracts, 378);
assert.equal(sourceAssociations, 116);
for (const [image, manifest] of checkedManifests)
{
    for (const entry of manifest.sources) assert.equal(hash(image + '/source/' + entry.file.replaceAll('\\', '/')), entry.sha256);
    if (live)
    {
        for (const entry of manifest.binaries)
        {
            const file = image + '/bin/' + entry.file;
            assert.equal(fs.statSync(path.join(root, ...file.split('/'))).size, entry.bytes);
            assert.equal(hash(file), entry.sha256);
        }
    }
}
assert.deepEqual(read('images-v2/Original/manifest.json').binaries, read('images-v2/RestoredOriginal/manifest.json').binaries);
assert.deepEqual(read('images-v2/Candidate/manifest.json').actualDifferencesFromOriginal, ['Microsoft.AspNetCore.Components.dll', 'Microsoft.AspNetCore.Components.pdb']);
const testAudit = read('all-existing-tests-audit.json');
assert.equal(testAudit.individualExecutions, 330);
assert.equal(testAudit.failed, 0);
assert.equal(testAudit.skipped, 0);
const xml = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', path.join(root, 'F132-audit-trx.ps1'),
    '-CaseRoot', root, '-Roles', 'Original,Default,Candidate,RestoredOriginal,StaleRestorationAttempt'], { encoding: 'utf8' });
assert.equal(xml.status, 0, xml.stderr);
const actualXml = JSON.parse(xml.stdout);
assert.equal(actualXml.individualExecutions, testAudit.individualExecutions);
for (const role of testAudit.reports)
{
    const actual = actualXml.reports.find(entry => entry.role === role.role);
    assert.equal(actual.sha256, role.sha256);
    assert.deepEqual(actual.rows, role.rows);
}
assert.equal(read('reconstruction-001/verified-reproduction.json').actualAdditionalTiming, 0);
assert.equal(read('reconstruction-001/verified-reproduction.json').actualClosedBudgetUnchangedSha256, hash('diagnostic-budget.json'));
const median = values =>
{
    const sorted = [...values].sort((a, b) => a - b);
    return (sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2;
};
const primaryEffects = [];
for (let index = 1; index <= 3; index++)
{
    const folder = 'comparison-' + String(index).padStart(3, '0');
    const original = read(folder + '/Original/observations.json');
    const candidate = read(folder + '/Candidate/observations.json');
    for (const profile of ['RegisteredShort4', 'RegisteredLong4', 'PlainShort4'])
    {
        const old = original.Rows.find(row => row.Profile === profile);
        const current = candidate.Rows.find(row => row.Profile === profile);
        const ns = row => median(row.Samples.map(sample => sample.ElapsedStopwatchTicks * 1e9 / original.Frequency / sample.ParentTicks));
        const originalNs = ns(old), candidateNs = ns(current);
        const effect = (originalNs - candidateNs) / originalNs * 100;
        const recorded = read('measurement-analysis.json').pairs[index - 1].profiles.find(row => row.profile === profile);
        assert.equal(recorded.originalNsPerParentTick, originalNs);
        assert.equal(recorded.candidateNsPerParentTick, candidateNs);
        assert.equal(recorded.lessTimePercent, effect);
        assert.equal(recorded.savedBytesPerParentTick, 0);
        if (profile === 'RegisteredShort4') primaryEffects.push(effect);
    }
}
assert.equal(read('measurement-analysis.json').primaryMedianLessTimePercent, median(primaryEffects));
assert.ok(median(primaryEffects) < 10, 'Do not substitute a different qualification primary');
if (process.argv.includes('--require-seal'))
{
    const seal = read('capsule-file-hashes.json');
    for (const entry of seal.files)
    {
        assert.equal(hash(entry.file), entry.sha256);
        assert.equal(fs.statSync(path.join(root, ...entry.file.split('/'))).size, entry.bytes);
    }
}
console.log(JSON.stringify({ actualAuditPassed: true, managedCommands, actualComparisonRoles: 6,
    actualAcceptedUntimedLifetimes: acceptedUntimedLifetimes, actualAllUntimedLifetimesIncludingV1: untimedLifetimes,
    actualTimedProfileLifetimes: timedProfileLifetimes, actualRetainedHistoricalFailedRows: historicalFailedRows,
    actualExistingXmlExecutions: actualXml.individualExecutions, actualAcceptedOriginalDefaultCandidateRestoredXmlExecutions: 264,
    actualStaleRestorationXmlExecutionsRetainedSeparately: 66, actualKeyContractRows: keyContracts,
    actualRecordedSourcePePdbAssociations: sourceAssociations, actualRuntimeAssemblyRecords: runtimeRecords,
    actualRestoredConsumerByteIdentical: true, actualBudgetClosedAtThree: true,
    actualLiveImagesVerified: live, actualPortableRecordedAssociationBoundaryOnly: !live }, null, 2));
