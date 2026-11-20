import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F132');
const common = path.join(session, 'autoperf-runs', 'F132-common');
const directory = path.join(run, 'reconstruction-001');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const read = file => JSON.parse(fs.readFileSync(file));
assert.equal(fs.existsSync(directory), false, 'Never repeat an independent reconstruction');
const budgetPath = path.join(run, 'diagnostic-budget.json');
const budgetBefore = sha(budgetPath);
assert.equal(read(budgetPath).closed, true);
assert.equal(read(budgetPath).authorizations.length, 3);
const original = read(path.join(run, 'images-v2', 'Original', 'manifest.json'));
fs.mkdirSync(path.join(directory, 'project'), { recursive: true });
for (const input of original.commonInputs)
{
    assert.equal(sha(path.join(common, input.file)), input.sha256);
    const destination = path.join(directory, 'project', input.file);
    fs.copyFileSync(path.join(common, input.file), destination, fs.constants.COPYFILE_EXCL);
    assert.equal(sha(destination), input.sha256);
}
const project = path.join(directory, 'project', 'AutoPerf.CascadingHashes.csproj');
const frozenReferences = path.join(run, 'images-v2', 'Original', 'bin');
function managed(label, ...args)
{
    const result = spawnSync(process.execPath, [path.join(session, 'F132-managed-command.mjs'), label, String.raw`C:\src\aspnetcore`, ...args],
        { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
    process.stdout.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    return result.status;
}
const flags = ['--configuration', 'Release', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false',
    '-p:ReferencePathRoot=' + frozenReferences, '-p:ComponentsOwnerRoot=' + frozenReferences];
const first = managed('reconstruction-build-001', 'build', project, '--no-restore', ...flags);
assert.equal(first, 1, 'A genuinely fresh project should have missing restore assets, not an unexplained failure');
assert.match(fs.readFileSync(path.join(run, 'validation', 'reconstruction-build-001', 'stdout.txt'), 'utf8'), /NETSDK1004/);
assert.equal(managed('reconstruction-restore-001', 'restore', project, '-p:UseIisNativeAssets=false', '/m:2', '/nr:false',
    '-p:ReferencePathRoot=' + frozenReferences, '-p:ComponentsOwnerRoot=' + frozenReferences), 0);
assert.equal(managed('reconstruction-build-002', 'build', project, '--no-restore', ...flags), 0);
const buildStream = fs.readFileSync(path.join(run, 'validation', 'reconstruction-build-002', 'stdout.txt'), 'utf8');
assert.match(buildStream, /0 Warning\(s\)/);
assert.match(buildStream, /0 Error\(s\)/);
const freshBin = path.join(directory, 'project', 'bin', 'Release', 'net12.0');
const reconstructions = [];
for (const role of ['Original', 'Candidate'])
{
    const old = path.join(run, 'images-v2', role);
    const manifest = read(path.join(old, 'manifest.json'));
    const target = path.join(directory, role);
    fs.mkdirSync(target);
    fs.cpSync(path.join(old, 'bin'), path.join(target, 'bin'), { recursive: true, force: false, errorOnExist: true });
    fs.cpSync(path.join(old, 'source'), path.join(target, 'source'), { recursive: true, force: false, errorOnExist: true });
    for (const suffix of ['.dll', '.pdb'])
    {
        const file = 'AutoPerf.CascadingHashes' + suffix;
        fs.copyFileSync(path.join(freshBin, file), path.join(target, 'bin', file));
    }
    const binaries = manifest.binaries.map(entry =>
    {
        const file = path.join(target, 'bin', ...entry.file.split('/'));
        return { file: entry.file, bytes: fs.statSync(file).size, sha256: sha(file) };
    });
    const changed = binaries.filter(entry => entry.sha256 !== manifest.binaries.find(oldEntry => oldEntry.file === entry.file).sha256).map(entry => entry.file).sort();
    assert.deepEqual(changed, ['AutoPerf.CascadingHashes.dll', 'AutoPerf.CascadingHashes.pdb']);
    const rebuiltManifest = { ...manifest, role: role + 'Rebuilt', actualFreshProject: project,
        actualInputFiles: original.commonInputs, binaries, actualComparedToFrozenRole: role,
        actualChangedFilesComparedToCorrespondingRole: changed, actualOther23ConsumerFilesPreserved: true,
        recordedAt: new Date().toISOString() };
    fs.writeFileSync(path.join(target, 'manifest.json'), JSON.stringify(rebuiltManifest, null, 2) + '\n', { flag: 'wx' });
    const label = 'reconstruction-' + role.toLowerCase() + '-characterize-001';
    const output = path.join(run, 'validation', label, 'observations.json');
    assert.equal(managed(label, path.join(target, 'bin', 'AutoPerf.CascadingHashes.dll'), 'characterize', role + 'Rebuilt', output), 0);
    const observation = read(output);
    assert.equal(observation.ContractFailures, 0);
    assert.equal(observation.Rows.length, 9);
    assert.equal(observation.SourceBindings.length, 9);
    assert.ok(observation.Rows.every(row => row.Samples.length === 0 && row.Failures.length === 0 &&
        row.ActiveAfterRendererDisposal === 0 && row.SubscriptionsCreated === row.SubscriptionsDisposed));
    reconstructions.push({ role: role + 'Rebuilt', actualLifetimes: observation.Rows.length,
        actualKeyContractRows: observation.Rows.flatMap(row => row.KeyContracts).length,
        actualCommonHarnessSha256: sha(path.join(target, 'bin', 'AutoPerf.CascadingHashes.dll')),
        actualObservationSha256: sha(output), actualOnlyFreshHarnessDllAndPdbDiffer: true,
        actualOther23ConsumerFilesPreserved: true, actualManifestSha256: sha(path.join(target, 'manifest.json')) });
}
assert.equal(reconstructions[0].actualCommonHarnessSha256, reconstructions[1].actualCommonHarnessSha256);
assert.equal(sha(budgetPath), budgetBefore, 'Independent reconstruction must never consume/replay timing');
const receipt = { findingId: 'F132', actualIndependentFreshProjectBuildSucceeded: true, actualInputFileCount: 2,
    actualInputFiles: original.commonInputs, actualReferenceRootExplicitlyFrozenOriginal: frozenReferences,
    actualZeroWarningErrorBuild: true, actualPreparatoryMissingAssetsFailurePreserved: true,
    actualFreshCommonHarnessIdenticalAcrossRoles: true, actualReexecutions: reconstructions,
    actualAdditionalTiming: 0, actualClosedBudgetUnchangedSha256: budgetBefore, recordedAt: new Date().toISOString(),
    limitation: 'Rebuilds exactly the common source project against frozen source-built owners; does not rebuild every historical compiler input or owner graph.' };
fs.writeFileSync(path.join(directory, 'verified-reproduction.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt, null, 2));
