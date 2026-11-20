import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const session = path.dirname(fileURLToPath(import.meta.url));
const run = path.join(session, 'autoperf-runs', 'F219');
const preparedRoot = path.join(run, 'causal-original-145');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const writeNew = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const pin = file => ({ path: file, sha256: hash(file) });
const original = String.raw`C:\src\autoperf-finding-F145-original`;
const candidate = String.raw`C:\src\ap-F219-c143`;
const prepared = read(path.join(preparedRoot, 'prepared-roles.json'));
assert.equal(prepared.actualNoMeasurementExecuted, true);
assert.equal(prepared.actualSourceRole, 'Original');
const originalCompiler = path.join(original, '.dotnet', 'sdk', '12.0.100-alpha.1.26557.102', 'Roslyn', 'bincore', 'csc.dll');
const candidateCompiler = path.join(candidate, '.dotnet', 'sdk', '12.0.100-alpha.1.26557.102', 'Roslyn', 'bincore', 'csc.dll');
assert.equal(hash(originalCompiler), hash(candidateCompiler));
assert.equal(hash(path.join(original, 'global.json')), hash(path.join(candidate, 'global.json')));
const git = args =>
{
    const result = spawnSync('git', ['--no-pager', '-c', 'core.longpaths=true', ...args], { encoding: 'utf8', windowsHide: true });
    if (result.error) { throw result.error; }
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
};
assert.equal(git(['-C', original, 'rev-parse', 'HEAD']), '37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(git(['-C', original, 'status', '--porcelain=v1', '--untracked-files=no']), '');
assert.equal(git(['-C', candidate, 'rev-parse', 'HEAD']), '37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(git(['-C', candidate, 'status', '--porcelain=v1', '--untracked-files=no']),
    'M src/OpenApi/src/Extensions/ApiDescriptionExtensions.cs');
assert.equal(git(['-C', candidate, 'diff', '--check']), '');
const evidence = [
    path.join(preparedRoot, 'prepared-roles.json'),
    path.join(session, 'Stage-F219Original-145.ps1'),
    path.join(session, 'autoperf-parallelism', 'finding-F219-090', 'benchmark-139', 'Program.cs'),
    path.join(session, 'autoperf-parallelism', 'finding-F219-090', 'benchmark-139', 'ExistingBenchmark.csproj'),
    path.join(session, 'autoperf-parallelism', 'finding-F219-090', 'default-recheck-143.json'),
    path.join(original, 'src', 'OpenApi', 'src', 'Extensions', 'ApiDescriptionExtensions.cs'),
    path.join(candidate, 'src', 'OpenApi', 'src', 'Extensions', 'ApiDescriptionExtensions.cs'),
    originalCompiler, candidateCompiler
].map(pin);
const inventories = {};
for (const role of ['Baseline', 'Candidate'])
{
    const image = prepared.roles[role];
    assert.equal(image.actualNativeRowsPassed, 15);
    assert.equal(image.actualNativeRowNames.length, 15);
    assert.equal(hash(image.inventory), image.inventorySha256);
    const inventory = read(image.inventory);
    for (const item of inventory.Files)
    {
        const file = path.join(image.root, item.File);
        assert.equal(fs.statSync(file).size, item.Bytes);
        assert.equal(hash(file), item.Sha256);
    }
    inventories[role] = new Map(inventory.Files.map(item => [item.File, item.Sha256]));
    const recordRoot = path.join(preparedRoot, role, 'records');
    for (const item of fs.readdirSync(recordRoot, { recursive: true, withFileTypes: true }))
    {
        if (item.isFile()) { evidence.push(pin(path.join(item.parentPath, item.name))); }
    }
    const inspection = read(image.inspection);
    assert.equal(inspection.Helper.length, 7);
    assert.ok(inspection.Helper.every(item => item.Passed));
    assert.deepEqual(inspection.Documents.map(item => item.Operations), [34, 304, 3004]);
    const identity = read(path.join(recordRoot, 'inspection', 'identity.json'));
    assert.equal(identity.Runtime, '12.0.0-alpha.1.26562.105');
    assert.equal(identity.IsServerGC, true);
    assert.equal(identity.NativeRuntime.length, 3);
    for (const module of identity.NativeRuntime) { assert.equal(hash(module.Path), module.Sha256); }
}
assert.deepEqual([...inventories.Baseline.keys()].sort(), [...inventories.Candidate.keys()].sort());
const differences = [...inventories.Baseline].filter(([file, sha]) => inventories.Candidate.get(file) !== sha)
    .map(([file]) => file).sort();
assert.deepEqual(differences, [
    'Benchmark\\Microsoft.AspNetCore.OpenApi.dll', 'Benchmark\\Microsoft.AspNetCore.OpenApi.pdb',
    'Native\\Microsoft.AspNetCore.OpenApi.dll', 'Native\\Microsoft.AspNetCore.OpenApi.pdb'
]);
assert.deepEqual(prepared.roles.Baseline.actualNativeRowNames, prepared.roles.Candidate.actualNativeRowNames);
const runtimeRoot = path.join(original, '.dotnet', 'shared', 'Microsoft.NETCore.App', '12.0.0-alpha.1.26562.105');
const runtimeFiles = fs.readdirSync(runtimeRoot, { recursive: true, withFileTypes: true })
    .filter(item => item.isFile()).map(item => pin(path.join(item.parentPath, item.name)));
runtimeFiles.push(pin(path.join(original, '.dotnet', 'dotnet.exe')));
for (const item of fs.readdirSync(path.join(original, '.dotnet', 'host', 'fxr'), { recursive: true, withFileTypes: true }))
{
    if (item.isFile()) { runtimeFiles.push(pin(path.join(item.parentPath, item.name))); }
}
const launcher = path.join(session, 'autoperf-runs', 'F142-common', 'Invoke-MeasurementChild.ps1');
const driver = path.join(session, 'F219-Original-compare.mjs');
const powerShell = String.raw`C:\Program Files\PowerShell\7\pwsh.exe`;
const images = {
    sourceRole: 'Original', coordinatorName: os.hostname(), actualRuntime: '12.0.0-alpha.1.26562.105',
    activationSourceRoot: original, powerShell, powerShellSha256: hash(powerShell),
    launcher, launcherSha256: hash(launcher), driverSha256: hash(driver),
    protectedGlobalJsonSha256: hash(String.raw`C:\src\aspnetcore\global.json`),
    functionalEvidence: evidence, runtimeFiles, roles: prepared.roles, actualCausalDifferences: differences,
    actualNativeBoundary: 'Actual existing VSTest/xUnit fifteen-row cohort, each Boolean row inspected. Its testhost CLR/MVID is not established by a runtime listing; separately loaded helper/document inspection binds executing CLR/native modules and owner/fixture hashes/MVIDs.',
    actualProcessOnlyConfiguration: { DOTNET_gcServer: '1', DOTNET_TieredCompilation: '0', COMPlus_TieredCompilation: '0', rollForward: 'Disable' },
    actualNoPriorityAffinityPowerOrMachineChanges: true, actualNoMeasurementExecuted: true,
    sealedAtUtc: new Date().toISOString()
};
const file = path.join(run, 'accepted-images-Original.json');
writeNew(file, images);
const seal = { sha256: hash(file), sealedAtUtc: new Date().toISOString(), actualBeforeAnyAuthorization: true };
writeNew(path.join(run, 'accepted-images-Original-seal.json'), seal);
console.log(JSON.stringify({ actualAcceptedImagesSha256: seal.sha256, actualDriverSha256: images.driverSha256,
    actualNativeRowsPerRole: 15, actualHelperRowsPerRole: 7, actualCausalDifferences: differences,
    actualRuntimeFilesPinned: runtimeFiles.length, actualNoMeasurementExecuted: true }, null, 2));
