import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const directory = path.resolve(process.argv[2] ?? '.');
const live = process.argv.includes('--live-images');
const sealed = process.argv.includes('--require-seal');
const read = file => JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8').replace(/^\uFEFF/, ''));
const bytesHash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const hash = file => bytesHash(fs.readFileSync(file));
assert.equal(hash(path.join(directory, 'plan.json')), read('plan-seal.json').sha256);
const plan = read('plan.json');
const budget = read('diagnostic-budget.json');
assert.equal(budget.permanentlyClosed, true);
assert.equal(budget.maximumAuthorizations, 3);
assert.deepEqual(budget.authorizations, []);
assert.equal(budget.actualTimingComparisons, 0);
assert.equal(budget.actualUnusedAuthorizationsPermanentlyClosed, 3);
assert.equal(read('budget-closure.json').closedBudgetSha256, hash(path.join(directory, 'diagnostic-budget.json')));
const failureCodes = {
    'default-tests-001': [1, 'NETSDK1004'],
    'harness-build-001': [1, 'NETSDK1004'],
    'prototype-tests-001': [1, 'CS1061'],
    'reconstruction-build-001': [1, 'NETSDK1004'],
    'prototype-characterize-001': [2, '"ContractFailureRows":6'],
    'reconstruction-prototype-characterize-001': [2, '"ContractFailureRows":6'],
};
let managedCommands = 0;
for (const label of fs.readdirSync(path.join(directory, 'validation')).sort())
{
    const prefix = path.join('validation', label);
    const command = read(path.join(prefix, 'command.json'));
    const result = read(path.join(prefix, 'result.json'));
    const expected = failureCodes[label] ?? [0, null];
    assert.equal(result.exitCode, expected[0], `Unexpected managed result ${label}`);
    assert.equal(result.launchError, null);
    assert.equal(result.protectedGlobalJsonBefore, result.protectedGlobalJsonAfter);
    assert.equal(command.machineSettingsChanged, false);
    assert.equal(command.activation, '. .\\activate.ps1');
    assert.equal(command.environmentOverrides.MSBUILDDISABLENODEREUSE, '1');
    assert.equal(hash(path.join(directory, prefix, 'command.ps1')), result.actualCommandSha256);
    assert.equal(hash(path.join(directory, prefix, 'stdout.txt')), result.stdoutSha256);
    assert.equal(hash(path.join(directory, prefix, 'stderr.txt')), result.stderrSha256);
    assert.ok(new Date(command.startedAt) > new Date(plan.sealedAt), 'Acceptance must predate actual commands');
    if (expected[1]) assert.ok(fs.readFileSync(path.join(directory, prefix, 'stdout.txt'), 'utf8').includes(expected[1]), `Missing expected failure signature ${label}`);
    managedCommands++;
}
assert.equal(managedCommands, 19);
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const xmlScript = `& ${quote(path.join(directory, 'F129-audit-trx.ps1'))} -CaseRoot ${quote(directory)} -Roles @('Original','Default','Prototype','RestoredOriginal')`;
const xmlProcess = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', xmlScript],
    { encoding: 'utf8', windowsHide: true });
assert.equal(xmlProcess.status, 0, xmlProcess.stderr);
const xml = JSON.parse(xmlProcess.stdout.replace(/^\uFEFF/, ''));
assert.equal(xml.individualExecutions, 28);
assert.equal(xml.failed, 0);
assert.equal(xml.skipped, 0);
const commonInputs = read('common-inputs.json');
assert.equal(commonInputs.length, 2);
for (const input of commonInputs)
{
    for (const prefix of ['harness', path.join('reconstruction-001', 'project')])
    {
        assert.equal(hash(path.join(directory, prefix, input.path)), input.sha256);
    }
}
const roles = [
    ['Original', 'original-characterize-001', path.join('images', 'Original')],
    ['Default', 'default-characterize-001', path.join('images', 'Default')],
    ['Prototype', 'prototype-characterize-001', path.join('images', 'Prototype')],
    ['RestoredOriginal', 'restored-characterize-001', path.join('images', 'RestoredOriginal')],
    ['OriginalRebuilt', 'reconstruction-original-characterize-001', path.join('reconstruction-001', 'Original')],
    ['PrototypeRebuilt', 'reconstruction-prototype-characterize-001', path.join('reconstruction-001', 'Prototype')],
];
const stable = row => ({
    Profile: row.Profile, Repetition: row.Repetition, SuppliedHrefWasDetected: row.SuppliedHrefWasDetected,
    Html: row.Html, Exception: row.Exception ? { Type: row.Exception.Type, Message: row.Exception.Message } : null,
    ToStringCalls: row.ToStringCalls, SourceAttributeCount: row.SourceAttributeCount,
    SourceContainsLateKey: row.SourceContainsLateKey, SourceAfterValue: row.SourceAfterValue,
});
const reports = {};
const consumers = {};
let sourceBindings = 0;
let runtimeRecords = 0;
for (const [role, label, prefix] of roles)
{
    const report = read(path.join('validation', label, 'observations.json'));
    const manifest = read(path.join(prefix, 'manifest.json'));
    reports[role] = report;
    consumers[role] = manifest;
    assert.equal(report.Role, role);
    assert.equal(report.Observations.length, 27);
    assert.deepEqual([...new Set(report.Observations.map(row => row.Profile))], plan.profiles);
    assert.equal(report.ContractFailureRows, role.startsWith('Prototype') ? 6 : 0);
    assert.deepEqual(report.ContractFailureProfiles, role.startsWith('Prototype') ? ['ReplaceValueWithHref', 'AddKeyWithHref'] : []);
    assert.equal(report.SourceBindings.length, 5);
    assert.equal(manifest.files.length, 30);
    for (const file of manifest.sourceInputs)
    {
        assert.equal(hash(path.join(directory, prefix, 'source', ...file.path.split('/'))), file.sha256);
    }
    for (const binding of report.SourceBindings)
    {
        const source = manifest.sourceInputs.find(file => file.path === binding.RelativeSource.replaceAll('\\', '/'));
        assert.equal(binding.SnapshotSha256, source.sha256);
        const algorithm = binding.HashAlgorithm === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256' :
            binding.HashAlgorithm === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
        assert.ok(algorithm, 'Unknown actual PDB document algorithm');
        const actual = crypto.createHash(algorithm).update(fs.readFileSync(path.join(directory, prefix, 'source', ...source.path.split('/')))).digest('hex').toUpperCase();
        assert.equal(binding.PdbSourceChecksum, actual);
        sourceBindings++;
    }
    for (const profile of plan.profiles)
    {
        const rows = report.Observations.filter(row => row.Profile === profile);
        assert.deepEqual(rows.map(row => row.Repetition), [1, 2, 3]);
        for (const row of rows)
        {
            const mutating = profile.startsWith('ReplaceValue') || profile.startsWith('AddKey');
            assert.equal(row.ToStringCalls, mutating ? 1 : 0, 'Actual producer reachability changed');
            if (profile.startsWith('ReplaceValue'))
            {
                assert.equal(row.SourceAfterValue, 'after');
                const rendered = role.startsWith('Prototype') || profile === 'ReplaceValueWithoutHref' ? 'after' : 'before';
                assert.ok(row.Html?.includes(`data-after="${rendered}"`), `Wrong actual HTML ${role}/${profile}`);
            }
            if (profile.startsWith('AddKey')) assert.equal(row.SourceContainsLateKey, true);
            const expectsException = profile === 'AddKeyWithoutHref' || (role.startsWith('Prototype') && profile === 'AddKeyWithHref');
            if (expectsException)
            {
                assert.equal(row.Exception?.Type, 'System.InvalidOperationException');
                assert.match(row.Exception.Message, /Collection was modified/);
                assert.equal(row.Html, null);
            }
            else
            {
                assert.equal(row.Exception, null);
                assert.equal(typeof row.Html, 'string');
            }
            if (profile === 'ChildContentWithHref')
            {
                assert.equal(row.Html, 'custom-link');
                assert.equal(row.SourceContainsLateKey, false);
            }
            const shouldFail = role.startsWith('Prototype') && ['ReplaceValueWithHref', 'AddKeyWithHref'].includes(profile);
            assert.equal(row.Failures.length > 0, shouldFail);
        }
    }
    for (const assembly of report.Assemblies)
    {
        const local = manifest.files.find(file => file.path === path.basename(assembly.Location));
        if (assembly.Location.includes(path.sep + 'consumer' + path.sep))
        {
            assert.ok(local, `Loaded file absent from actual image ${assembly.Name}`);
            assert.equal(assembly.Sha256, local.sha256);
        }
        else
        {
            assert.ok(assembly.Location.includes(path.sep + 'shared' + path.sep + 'Microsoft.NETCore.App' + path.sep + '12.0.0-alpha.1.26562.105' + path.sep), `Unexpected external runtime owner ${assembly.Location}`);
        }
        if (live) assert.equal(hash(assembly.Location), assembly.Sha256);
        runtimeRecords++;
    }
    if (live)
    {
        for (const file of manifest.files)
        {
            assert.equal(hash(path.join(directory, prefix, 'consumer', ...file.path.split('/'))), file.sha256);
            assert.equal(fs.statSync(path.join(directory, prefix, 'consumer', ...file.path.split('/'))).size, file.bytes);
        }
    }
}
for (const role of ['Default', 'RestoredOriginal', 'OriginalRebuilt'])
{
    assert.deepEqual(reports[role].Observations.map(stable), reports.Original.Observations.map(stable));
}
assert.deepEqual(reports.PrototypeRebuilt.Observations.map(stable), reports.Prototype.Observations.map(stable));
const differences = reports.Prototype.Observations.filter((row, index) =>
    JSON.stringify(stable(row)) !== JSON.stringify(stable(reports.Original.Observations[index])));
assert.equal(differences.length, 6);
assert.deepEqual([...new Set(differences.map(row => row.Profile))], ['ReplaceValueWithHref', 'AddKeyWithHref']);
assert.deepEqual(consumers.Prototype.changedFromOriginal, ['Microsoft.AspNetCore.Components.Media.dll', 'Microsoft.AspNetCore.Components.Media.pdb']);
assert.deepEqual(consumers.RestoredOriginal.changedFromOriginal, []);
for (const file of consumers.Original.files)
{
    const prototype = consumers.Prototype.files.find(item => item.path === file.path);
    const freshOriginal = consumers.OriginalRebuilt.files.find(item => item.path === file.path);
    const freshPrototype = consumers.PrototypeRebuilt.files.find(item => item.path === file.path);
    if (!/^Microsoft\.AspNetCore\.Components\.Media\.(dll|pdb)$/.test(file.path)) assert.equal(file.sha256, prototype.sha256);
    if (!/^AutoPerf\.Characterization\.(dll|pdb)$/.test(file.path))
    {
        assert.equal(file.sha256, freshOriginal.sha256);
        assert.equal(prototype.sha256, freshPrototype.sha256);
    }
    else assert.equal(freshOriginal.sha256, freshPrototype.sha256);
}
assert.equal(read('reconstruction-001/verified-reproduction.json').actualRealRendererRows, 54);
let sealedFiles = null;
if (sealed)
{
    const seal = read('capsule-file-hashes.json');
    sealedFiles = seal.files.length;
    for (const file of seal.files)
    {
        assert.equal(hash(path.join(directory, ...file.path.split('/'))), file.sha256, `Changed sealed artifact ${file.path}`);
        assert.equal(fs.statSync(path.join(directory, ...file.path.split('/'))).size, file.bytes);
    }
}
console.log(JSON.stringify({
    findingId: 'F129', disposition: 'rejected', reason: 'Unbuffered href filtering changes observable snapshot semantics',
    actualManagedCommandsChecked: managedCommands, actualIndividualXmlExecutions: xml.individualExecutions,
    actualXmlFailed: 0, actualXmlSkipped: 0, actualRealRendererRows: roles.length * 27,
    actualRuntimeAssemblyRecordsChecked: runtimeRecords, actualSourcePePdbAssociationsRecordedAndSnapshotHashesChecked: sourceBindings,
    actualIndependentFreshProjectRoles: 2, actualChangedProfilesPerPrototype: ['ReplaceValueWithHref', 'AddKeyWithHref'],
    actualExpectedContractFailureRows: 12, actualOriginalDefaultRestoredAndFreshStableObservationsAgree: true,
    actualOriginalPrototypeImageFilesEach: 30, actualOriginalPrototypeChangedFiles: consumers.Prototype.changedFromOriginal,
    actualOriginalPrototypeUnchangedFilesIncludingCommonHarness: 28,
    actualTimingComparisons: 0, actualClosedUnusedTimingAuthorizations: 3,
    actualCurrentDefault: plan.actualDefaultCommit, actualLiveCompiledImageBytesChecked: live,
    actualSealedFilesChecked: sealedFiles,
    limitation: 'Managed HTML/exception boundary and one lazy-filter prototype only. No browser/download, performance, complete compiler-provenance, global caller census or impossibility-of-buffered-alternatives claim.'
}, null, 2));
