import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F129');
const reconstruction = path.join(run, 'reconstruction-001');
const root = String.raw`C:\src\aspnetcore`;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
assert.equal(fs.existsSync(reconstruction), false, 'Preserve an existing reconstruction attempt');
assert.equal(hash(path.join(run, 'plan.json')), read(path.join(run, 'plan-seal.json')).sha256);
const originalReport = read(path.join(run, 'validation', 'original-characterize-001', 'observations.json'));
const prototypeReport = read(path.join(run, 'validation', 'prototype-characterize-001', 'observations.json'));
assert.equal(originalReport.ContractFailureRows, 0);
assert.deepEqual(prototypeReport.ContractFailureProfiles, ['ReplaceValueWithHref', 'AddKeyWithHref']);
assert.equal(prototypeReport.ContractFailureRows, 6);
fs.mkdirSync(path.join(reconstruction, 'project'), { recursive: true });
const inputs = read(path.join(run, 'common-inputs.json'));
for (const input of inputs)
{
    const source = path.join(run, 'harness', input.path);
    assert.equal(hash(source), input.sha256);
    fs.copyFileSync(source, path.join(reconstruction, 'project', input.path), fs.constants.COPYFILE_EXCL);
}
const project = path.join(reconstruction, 'project', 'AutoPerf.Characterization.csproj');
const reference = '-p:ReferencePathRoot=' + path.join(run, 'images', 'Original', 'consumer');
function managed(label, args, expected)
{
    const result = spawnSync(process.execPath, [path.join(session, 'F129-managed-command.mjs'), label, root, ...args],
        { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
    process.stdout.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    assert.equal(result.status, expected, `Unexpected result from ${label}`);
    return read(path.join(run, 'validation', label, 'result.json'));
}
managed('reconstruction-build-001', ['build', project, '--no-restore', '--configuration', 'Release',
    reference, '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false'], 1);
assert.match(fs.readFileSync(path.join(run, 'validation', 'reconstruction-build-001', 'stdout.txt'), 'utf8'), /NETSDK1004/);
managed('reconstruction-restore-001', ['restore', project, reference, '/m:2', '/nr:false'], 0);
managed('reconstruction-build-002', ['build', project, '--no-restore', '--configuration', 'Release',
    reference, '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false'], 0);
const freshOutput = path.join(reconstruction, 'project', 'bin', 'Release', 'net12.0');
const stable = row => ({ ...row, Exception: row.Exception ? { Type: row.Exception.Type, Message: row.Exception.Message } : null });
const roles = [];
for (const [role, before] of [['Original', originalReport], ['Prototype', prototypeReport]])
{
    const target = path.join(reconstruction, role);
    fs.mkdirSync(target);
    fs.cpSync(path.join(run, 'images', role, 'consumer'), path.join(target, 'consumer'), { recursive: true, errorOnExist: true, force: false });
    fs.cpSync(path.join(run, 'images', role, 'source'), path.join(target, 'source'), { recursive: true, errorOnExist: true, force: false });
    for (const file of ['AutoPerf.Characterization.dll', 'AutoPerf.Characterization.pdb'])
    {
        fs.copyFileSync(path.join(freshOutput, file), path.join(target, 'consumer', file));
    }
    assert.equal(hash(path.join(freshOutput, 'AutoPerf.Characterization.deps.json')),
        hash(path.join(target, 'consumer', 'AutoPerf.Characterization.deps.json')));
    assert.equal(hash(path.join(freshOutput, 'AutoPerf.Characterization.runtimeconfig.json')),
        hash(path.join(target, 'consumer', 'AutoPerf.Characterization.runtimeconfig.json')));
    const manifest = read(path.join(run, 'images', role, 'manifest.json'));
    const files = manifest.files.map(file => ({ ...file, sha256: hash(path.join(target, 'consumer', ...file.path.split('/'))) }));
    const changed = files.filter(file => file.sha256 !== manifest.files.find(old => old.path === file.path).sha256).map(file => file.path).sort();
    assert.ok(changed.every(file => ['AutoPerf.Characterization.dll', 'AutoPerf.Characterization.pdb'].includes(file)));
    const label = 'reconstruction-' + role.toLowerCase() + '-characterize-001';
    const output = path.join(run, 'validation', label, 'observations.json');
    const execution = managed(label, [path.join(target, 'consumer', 'AutoPerf.Characterization.dll'), role + 'Rebuilt', output], role === 'Original' ? 0 : 2);
    const report = read(output);
    assert.deepEqual(report.Observations.map(stable), before.Observations.map(stable), `${role} fresh-project behavior changed`);
    assert.equal(report.ContractFailureRows, before.ContractFailureRows);
    for (const assembly of report.Assemblies)
    {
        const old = before.Assemblies.find(item => item.Name === assembly.Name);
        assert.ok(old, `Unmatched runtime assembly ${assembly.Name}`);
        const prefix = path.join(run, 'images', role, 'consumer') + path.sep;
        if (old.Location.startsWith(prefix))
        {
            assert.equal(assembly.Location, path.join(target, 'consumer', path.relative(path.dirname(old.Location), old.Location)));
            if (assembly.Name !== 'AutoPerf.Characterization') assert.equal(assembly.Sha256, old.Sha256);
        }
        else
        {
            assert.equal(assembly.Location, old.Location, 'Shared runtime assemblies must keep the actual pinned runtime path');
            assert.equal(assembly.Sha256, old.Sha256);
        }
    }
    write(path.join(target, 'manifest.json'), { role: role + 'Rebuilt', files, sourceInputs: manifest.sourceInputs, commonInputs: inputs, changedFromCorrespondingImage: changed });
    roles.push({ role: role + 'Rebuilt', sourceImage: role, actualRows: report.Observations.length,
        actualContractFailureRows: report.ContractFailureRows, actualOnlyChangedFiles: changed,
        actualOtherPreservedFiles: manifest.files.length - changed.length, actualStableObservationsAgree: true,
        actualExecutionExitCode: execution.exitCode, actualLoadedOwnerAndRuntimeHashesAgree: true });
}
const receipt = {
    findingId: 'F129', recordedAt: new Date().toISOString(), actualCopiedInputs: inputs,
    actualNoRestoreAttemptPreserved: 'validation/reconstruction-build-001',
    actualRestoreCommand: 'validation/reconstruction-restore-001', actualSuccessfulBuild: 'validation/reconstruction-build-002',
    actualHarnessBuildWarnings: 0, actualRebuiltRoles: roles, actualRealRendererRows: 54,
    actualOnlyCommonHarnessDllPdbChangedInEachConsumer: true,
    actualSourceOwnersAndRuntimeAssembliesPreserved: true,
    actualNoAdditionalTimingOrAllocationMeasurement: true,
};
write(path.join(reconstruction, 'verified-reproduction.json'), receipt);
console.log(JSON.stringify(receipt, null, 2));
