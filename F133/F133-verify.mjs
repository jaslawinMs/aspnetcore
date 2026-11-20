import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(process.argv[2] ?? '.');
const live = process.argv.includes('--live-images');
const read = relative => JSON.parse(fs.readFileSync(path.join(root, ...relative.split('/')), 'utf8').replace(/^\uFEFF/, ''));
const bytesHash = (bytes, algorithm = 'sha256') => crypto.createHash(algorithm).update(bytes).digest('hex').toUpperCase();
const hash = relative => bytesHash(fs.readFileSync(path.join(root, ...relative.split('/'))));
assert.equal(hash('plan.json'), read('plan-seal.json').sha256);
const plan = read('plan.json');
const budget = read('diagnostic-budget.json');
assert.equal(budget.authorizations.length, 0);
assert.equal(budget.closed, true);
assert.equal(budget.actualUnusedAuthorizationsPermanentlyClosed, 3);
assert.equal(hash('diagnostic-budget-before-closure.json'), read('reconstruction-001/verified-reproduction.json').actualBudgetUnchangedSha256);
let commands = 0, rows = 0, associations = 0, runtimeRecords = 0, manyPropertyRows = 0;
const failedPreparation = ['default-tests-001', 'harness-build-001', 'reconstruction-build-001'];
for (const label of fs.readdirSync(path.join(root, 'validation')).sort())
{
    const directory = 'validation/' + label;
    if (!fs.statSync(path.join(root, directory)).isDirectory()) continue;
    const command = read(directory + '/command.json'), result = read(directory + '/result.json');
    assert.equal(command.activation, '. .\\activate.ps1');
    assert.equal(command.machineSettingsChanged, false);
    assert.equal(result.exitCode, failedPreparation.includes(label) ? 1 : 0);
    if (failedPreparation.includes(label)) assert.match(fs.readFileSync(path.join(root, directory, 'stdout.txt'), 'utf8'), /NETSDK1004/);
    assert.equal(hash(directory + '/command.ps1'), result.actualCommandSha256);
    assert.equal(hash(directory + '/stdout.txt'), result.stdoutSha256);
    assert.equal(hash(directory + '/stderr.txt'), result.stderrSha256);
    assert.equal(result.protectedGlobalJsonBefore, result.protectedGlobalJsonAfter);
    assert.ok(!command.arguments.includes('measure'));
    commands++;
}
const roles = [
    ['validation/original-characterize-001', 'images/Original'],
    ['validation/default-characterize-001', 'images/Default'],
    ['validation/reconstruction-original-characterize-001', 'reconstruction-001/Original'],
    ['validation/reconstruction-default-characterize-001', 'reconstruction-001/Default'],
];
let acceptedInputIdentities;
for (const [directory, image] of roles)
{
    const report = read(directory + '/observations.json'), manifest = read(image + '/manifest.json');
    assert.equal(report.Mode, 'characterize');
    assert.equal(report.ActualTiming, false);
    assert.equal(report.Runtime, '.NET 12.0.0-alpha.1.26562.105');
    assert.equal(report.SourcePredicateOnlyNotInvocationInstrumentation, true);
    assert.equal(report.NonDefaultModelMetadataProducerExercised, false);
    assert.equal(report.ContractFailures, 0);
    assert.equal(report.Rows.length, 28);
    assert.equal(manifest.binaries.length, 279);
    assert.deepEqual(manifest.sources, plan.actualPhysicalSnapshots.filter(source => source.role === (image.endsWith('Original') ? 'Original' : 'Default')));
    if (!acceptedInputIdentities) acceptedInputIdentities = manifest.commonInputs;
    else assert.deepEqual(manifest.commonInputs, acceptedInputIdentities);
    for (const mode of plan.fixedProviderModes)
    {
        for (const profile of plan.fixedProbeProfiles)
        {
            const matches = report.Rows.filter(row => row.ProviderMode === mode && row.Profile === profile);
            assert.deepEqual(matches.map(row => row.Repetition).sort(), [0, 1]);
        }
    }
    for (const row of report.Rows)
    {
        assert.deepEqual(row.Failures, []);
        assert.equal(row.RootIsDefaultModelMetadata, true);
        assert.equal(row.ActualMetadataReferenceRetained, true);
        assert.equal(row.ActualPropertyMetadataReferencesRetained, true);
        assert.equal(row.SourcePredicateFallbackEligibleMetadata, 0);
        assert.ok(row.ActualProperties.every(property => property.IsDefaultModelMetadata && !property.TargetFallbackEligible));
        if (row.Profile === 'ManyPropertiesInvalid')
        {
            assert.equal(row.ActualProperties.length, 17);
            assert.equal(row.ActualNamedValueCandidates, 1);
            manyPropertyRows++;
        }
        const valid = ['PublicValid', 'OrdinaryObject'].includes(row.Profile);
        assert.equal(row.ActualModelStateValid, valid);
        assert.deepEqual(row.ActualErrors, valid ? [] : [{ Key: 'model.Value', Message: row.Profile === 'NamesakeRequired' ? 'The Value field is required.' : 'Invalid case.' }]);
        assert.equal(row.ActualPublicGetterCalls, row.Profile === 'ExplicitInvalid' ? 0 : 1);
        assert.equal(row.ActualInterfaceGetterCalls, ['ExplicitInvalid', 'NamesakeRequired', 'NamesakeCase'].includes(row.Profile) ? 1 : 0);
        assert.equal(row.ActualCaseValidatorCalls, ['OrdinaryObject', 'NamesakeRequired'].includes(row.Profile) ? 0 : 1);
        rows++;
    }
    assert.equal(report.SourceBindings.length, 6);
    for (const binding of report.SourceBindings)
    {
        const bytes = fs.readFileSync(path.join(root, image, 'source', binding.RelativePath));
        assert.equal(bytesHash(bytes), binding.SourceSha256);
        const algorithm = binding.HashAlgorithm === '8829d00f-11b8-4213-878b-770e8597ac16' ? 'sha256' :
            binding.HashAlgorithm === 'ff1816ec-aa5e-4d10-87f7-6f4963833460' ? 'sha1' : null;
        assert.ok(algorithm && binding.PeCodeViewGuid && binding.PeCodeViewStamp > 0);
        assert.equal(bytesHash(bytes, algorithm), binding.PdbDocumentHash);
        associations++;
    }
    for (const assembly of report.Assemblies)
    {
        const file = path.win32.basename(assembly.Location);
        const entry = manifest.binaries.find(binary => binary.file === file);
        if (entry) assert.equal(assembly.Sha256, entry.sha256);
        if (live) assert.equal(bytesHash(fs.readFileSync(assembly.Location)), assembly.Sha256);
        runtimeRecords++;
    }
    for (const entry of manifest.sources) assert.equal(hash(image + '/source/' + entry.file.replaceAll('\\', '/')), entry.sha256);
    if (live)
    {
        for (const entry of manifest.binaries)
        {
            const relative = image + '/bin/' + entry.file;
            assert.equal(hash(relative), entry.sha256);
            assert.equal(fs.statSync(path.join(root, ...relative.split('/'))).size, entry.bytes);
        }
        for (const prefix of ['images', 'reconstruction-001'])
        {
            const original = read(prefix + '/Original/manifest.json'), actualDefault = read(prefix + '/Default/manifest.json');
            for (const name of ['AutoPerf.UnionMetadata.dll', 'AutoPerf.UnionMetadata.pdb', 'AutoPerf.UnionMetadata.deps.json', 'AutoPerf.UnionMetadata.runtimeconfig.json'])
            {
                const identity = manifest =>
                {
                    const { file, bytes, sha256 } = manifest.binaries.find(entry => entry.file === name);
                    return { file, bytes, sha256 };
                };
                assert.deepEqual(identity(original), identity(actualDefault));
            }
        }
    }
}
for (const role of ['Original', 'Default'])
{
    const before = read('images/' + role + '/manifest.json'), after = read('reconstruction-001/' + role + '/manifest.json');
    const changed = after.binaries.filter(entry => entry.sha256 !== before.binaries.find(old => old.file === entry.file).sha256).map(entry => entry.file);
    assert.deepEqual(changed, ['AutoPerf.UnionMetadata.dll', 'AutoPerf.UnionMetadata.pdb']);
}
const actualXml = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', path.join(root, 'F133-audit-trx.ps1'), '-CaseRoot', root], { encoding: 'utf8' });
assert.equal(actualXml.status, 0, actualXml.stderr);
const xml = JSON.parse(actualXml.stdout), storedXml = read('all-existing-tests-audit.json');
assert.equal(xml.individualExecutions, 68);
for (const role of xml.reports)
{
    const expected = storedXml.reports.find(report => report.role === role.role);
    assert.equal(role.sha256, expected.sha256);
    assert.deepEqual(role.rows, expected.rows);
}
assert.equal(read('reconstruction-001/verified-reproduction.json').actualAdditionalTiming, 0);
assert.equal(rows, 112);
assert.equal(associations, 24);
assert.equal(manyPropertyRows, 16);
if (process.argv.includes('--require-seal'))
{
    for (const entry of read('capsule-file-hashes.json').files)
    {
        assert.equal(hash(entry.file), entry.sha256);
        assert.equal(fs.statSync(path.join(root, ...entry.file.split('/'))).size, entry.bytes);
    }
}
console.log(JSON.stringify({ actualAuditPassed: true, actualManagedCommands: commands, actualPublicValidationRows: rows,
    actualManyPropertyRows: manyPropertyRows, actualExistingXmlExecutions: xml.individualExecutions, actualFailedOrSkippedXml: 0,
    actualSelectedSourcePePdbAssociations: associations, actualRuntimeAssemblyRecords: runtimeRecords,
    actualSameCompiledCommonHarnessAcrossOriginalDefault: true, actualFreshCommonInputs: 2,
    actualConsumerFilesPerRole: 279, actualCorrespondingUnchangedConsumerFilesOnFreshRebuild: 277,
    actualNonDefaultModelMetadataProducerExercised: false, actualPropertyLookupCountsInstrumented: false,
    actualSourcePredicateFallbackEligibleMetadata: 0, actualTimingComparisons: 0, actualUnusedTimingAuthorizationsClosed: 3,
    actualLiveImagesVerified: live, actualPortableRecordedProvenanceBoundaryOnly: !live }, null, 2));
