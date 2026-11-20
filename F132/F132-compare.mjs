import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { finished } from 'node:stream/promises';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F132');
const root = String.raw`C:\src\aspnetcore`;
const common = path.join(session, 'autoperf-runs', 'F132-common');
const number = Number(process.argv[2]);
assert.ok(Number.isInteger(number) && number >= 1 && number <= 3);
const read = file => JSON.parse(fs.readFileSync(path.join(run, file), 'utf8').replace(/^\uFEFF/, ''));
const write = (file, value) => fs.writeFileSync(path.join(run, file), JSON.stringify(value, null, 2) + '\n');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const plan = read('plan.json');
assert.equal(sha(path.join(run, 'plan.json')), read('plan-seal.json').sha256);
assert.equal(read('baseline-completed.json').actualVerifiedBeforeProductEditsAndTiming, true);
assert.equal(read('pre-timing-tests-audit.json').individualExecutions, 198);
const budget = read('diagnostic-budget.json');
assert.equal(budget.closed, false);
assert.equal(budget.maximumAuthorizations, 3);
assert.equal(budget.authorizations.length, number - 1, 'No timing replay or extra authorization');
const manifests = {};
for (const [role, label] of [['Original', 'original-characterize-002'], ['Candidate', 'candidate-characterize-001']])
{
    const manifest = read(path.join('images-v2', role, 'manifest.json'));
    manifests[role] = manifest;
    for (const input of manifest.commonInputs) assert.equal(sha(path.join(common, input.file)), input.sha256);
    for (const binary of manifest.binaries)
    {
        const file = path.join(run, 'images-v2', role, 'bin', ...binary.file.split('/'));
        assert.equal(fs.statSync(file).size, binary.bytes);
        assert.equal(sha(file), binary.sha256);
    }
    for (const source of manifest.sources)
    {
        assert.equal(sha(path.join(run, 'images-v2', role, 'source', source.file)), source.sha256);
        if (role === 'Candidate') assert.equal(sha(path.join(root, source.file)), source.sha256, 'No post-freeze source tuning');
    }
    assert.equal(read(path.join('validation', label, 'result.json')).exitCode, 0);
    const observation = read(path.join('validation', label, 'observations.json'));
    assert.equal(observation.ContractFailures, 0);
    assert.equal(observation.Rows.length, 9);
    assert.equal(observation.SourceBindings.length, 9);
}
assert.deepEqual(manifests.Original.commonInputs, manifests.Candidate.commonInputs);
assert.deepEqual(manifests.Candidate.actualDifferencesFromOriginal, ['Microsoft.AspNetCore.Components.dll', 'Microsoft.AspNetCore.Components.pdb']);
const protectedFiles = read('preservation-baseline.json').protectedFiles;
for (const file of protectedFiles) assert.equal(sha(path.join(root, file.file)), file.sha256);
const ready = path.join(run, 'accepted-images-before-timing.json');
if (number === 1)
{
    assert.equal(fs.existsSync(ready), false);
    write('accepted-images-before-timing.json', {
        recordedAt: new Date().toISOString(), actualBeforeFirstTimingAuthorization: true,
        actualCommonInputs: manifests.Original.commonInputs,
        actualOriginalManifestSha256: sha(path.join(run, 'images-v2', 'Original', 'manifest.json')),
        actualCandidateManifestSha256: sha(path.join(run, 'images-v2', 'Candidate', 'manifest.json')),
        actualCandidateSourceAccepted: true, actualOriginalDefaultCandidateLifetimes: 27,
        actualExistingXmlExecutionsPassed: 198, actualCommonCompiledHarnessIdentical: true,
        actualOnlyOwnerDllAndPdbDiffer: true, actualUnchangedNonOwnerConsumerFiles: 23,
        actualStorageTradeoff: { metadataBytes: [24, 32], keyBytes: [16, 24], cascadingStateBytes: [40, 48] },
        actualPlanSha256: read('plan-seal.json').sha256,
        actualPlanAndFrozenSourceTuningPermittedAfterTiming: false,
    });
}
else assert.equal(read('accepted-images-before-timing.json').actualCandidateManifestSha256, sha(path.join(run, 'images-v2', 'Candidate', 'manifest.json')));
const directory = path.join(run, 'comparison-' + String(number).padStart(3, '0'));
assert.equal(fs.existsSync(directory), false);
fs.mkdirSync(directory);
const authorization = {
    number, authorizedAt: new Date().toISOString(), status: 'authorized',
    roleOrder: plan.benchmark.beforeAfterRoleOrders[number - 1], actualCompletedRoles: [],
    actualPlanSha256: read('plan-seal.json').sha256, actualAcceptedImagesSha256: sha(ready),
    actualDriverSha256: sha(new URL(import.meta.url)), failedOrPartialStillConsumesAuthorization: true,
};
budget.authorizations.push(authorization);
write('diagnostic-budget.json', budget);
write(path.join(path.basename(directory), 'authorization.json'), authorization);
const quoteArgs = (role, output) => [
    path.join(run, 'images-v2', role, 'bin', 'AutoPerf.CascadingHashes.dll'), 'measure', role, output,
];
async function executeRole(role)
{
    const roleDirectory = path.join(directory, role);
    fs.mkdirSync(roleDirectory);
    const output = path.join(roleDirectory, 'observations.json');
    const args = quoteArgs(role, output);
    const environmentOverrides = { ...plan.benchmark.processOverrides, DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_NOLOGO: '1' };
    const script = ["$ErrorActionPreference = 'Stop'", `Set-Location -LiteralPath ${quote(root)}`, '. .\\activate.ps1',
        `$arguments = @(${args.map(quote).join(', ')})`, `& ${quote(path.join(root, '.dotnet', 'dotnet.exe'))} @arguments`, 'exit $LASTEXITCODE', ''].join('\r\n');
    fs.writeFileSync(path.join(roleDirectory, 'command.ps1'), script, { flag: 'wx' });
    const command = { role, cwd: root, activation: '. .\\activate.ps1', executable: path.join(root, '.dotnet', 'dotnet.exe'),
        arguments: args, startedAt: new Date().toISOString(), environmentOverrides, actualMachineSettingsChanged: false,
        actualCommonHarnessSha256: sha(path.join(run, 'images-v2', role, 'bin', 'AutoPerf.CascadingHashes.dll')) };
    fs.writeFileSync(path.join(roleDirectory, 'command.json'), JSON.stringify(command, null, 2) + '\n', { flag: 'wx' });
    const stdout = fs.createWriteStream(path.join(roleDirectory, 'stdout.txt'), { flags: 'wx' });
    const stderr = fs.createWriteStream(path.join(roleDirectory, 'stderr.txt'), { flags: 'wx' });
    const child = spawn('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', path.join(roleDirectory, 'command.ps1')],
        { cwd: root, windowsHide: true, env: { ...process.env, ...environmentOverrides } });
    let launchError = null;
    child.on('error', error => { launchError = error.message; });
    child.stdout.pipe(stdout);
    child.stderr.pipe(stderr);
    const actual = await new Promise(resolve => child.on('close', (exitCode, signal) => resolve({ exitCode, signal })));
    await Promise.all([finished(stdout), finished(stderr)]);
    const result = { ...actual, launchError, startedAt: command.startedAt, completedAt: new Date().toISOString(),
        actualCommandSha256: sha(path.join(roleDirectory, 'command.ps1')), stdoutSha256: sha(path.join(roleDirectory, 'stdout.txt')),
        stderrSha256: sha(path.join(roleDirectory, 'stderr.txt')), actualOutputSha256: fs.existsSync(output) ? sha(output) : null };
    fs.writeFileSync(path.join(roleDirectory, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    assert.equal(actual.exitCode, 0, `Actual timing role failed and consumes this authorization: ${roleDirectory}`);
    const report = JSON.parse(fs.readFileSync(output));
    assert.equal(report.Mode, 'measure');
    assert.equal(report.Role, role);
    assert.equal(report.ContractFailures, 0);
    assert.deepEqual(report.ProcessOverrides, { TieredCompilation: '0', TieredPGO: '0', ReadyToRun: '0' });
    assert.equal(report.SourceBindings.length, 9);
    assert.equal(report.Rows.length, 3);
    assert.equal(report.Assemblies.find(item => item.Name === 'Microsoft.AspNetCore.Components').Sha256,
        manifests[role].binaries.find(item => item.file === 'Microsoft.AspNetCore.Components.dll').sha256);
    for (const row of report.Rows)
    {
        assert.equal(row.Failures.length, 0);
        assert.equal(row.Samples.length, 8);
        assert.equal(row.ParentTicks, 2816);
        assert.equal(row.ActualRetainedChildren, 64);
        assert.equal(row.ActualChildRendersBeforeRemoval, 64 * 2817);
        assert.equal(row.ReadCallsBeforeRemoval, row.Profile === 'PlainShort4' ? 0 : 2817 * 64 * 4);
        assert.equal(row.ActiveAfterRendererDisposal, 0);
        for (const sample of row.Samples)
        {
            assert.equal(sample.ParentTicks, 256);
            assert.equal(sample.ActualProducerReads, row.Profile === 'PlainShort4' ? 0 : 256 * 64 * 4);
            assert.ok(sample.ElapsedStopwatchTicks > 0 && sample.AllocatedBytes >= 0);
        }
    }
    authorization.actualCompletedRoles.push(role);
    write('diagnostic-budget.json', budget);
    return { role, actualExitCode: actual.exitCode, profiles: report.Rows.map(row => ({ profile: row.Profile, samples: row.Samples.length, producerReads: row.ReadCallsBeforeRemoval })) };
}
try
{
    const results = [];
    for (const role of authorization.roleOrder) results.push(await executeRole(role));
    for (const file of protectedFiles) assert.equal(sha(path.join(root, file.file)), file.sha256);
    authorization.status = 'completed';
    authorization.completedAt = new Date().toISOString();
    write('diagnostic-budget.json', budget);
    write(path.join(path.basename(directory), 'verified-comparison.json'), { number, roleOrder: authorization.roleOrder, results,
        actualCandidateTuned: false, actualTimingRolesReplayed: false, recordedAt: new Date().toISOString() });
    console.log(JSON.stringify({ comparison: number, status: authorization.status, roleOrder: authorization.roleOrder,
        profilesEach: 3, retainedBatchesEachProfile: 8, actualNoMachineSettingChanges: true }, null, 2));
}
catch (error)
{
    authorization.status = 'failed-or-partial-consumed';
    authorization.failure = error.message;
    write('diagnostic-budget.json', budget);
    throw error;
}
