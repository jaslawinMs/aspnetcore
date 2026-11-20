import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const root = path.join(session, 'autoperf-runs', 'F145');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const plan = read(path.join(root, 'plan.json'));
const accepted = read(path.join(root, 'accepted-images.json'));
assert.equal(hash(path.join(root, 'plan.json')), read(path.join(root, 'plan-seal.json')).sha256);
assert.equal(hash(path.join(root, 'accepted-images.json')), read(path.join(root, 'accepted-images-seal.json')).sha256);
assert.deepEqual(read(path.join(root, 'diagnostic-budget.json')).authorizations, []);
const observations = [];
for (const role of ['original', 'default'])
{
    const source = plan.sourceRoles[role];
    for (const variant of ['baseline', 'candidate'])
    {
        const label = `verify-${role}-${variant}-001`;
        const file = path.join(root, 'executions', label, 'result.json');
        const result = read(file), image = accepted.images[role][variant];
        assert.equal(result.outcome, 'pass'); assert.equal(result.actualPerformanceTiming, false);
        assert.equal(result.role, role); assert.equal(result.variant, variant);
        assert.equal(result.rawResponse.bytes, 200000000);
        assert.equal(result.rawResponse.sha256, plan.functionalAcceptance.rawSha256);
        assert.equal(result.primary.bodyLength, 200000000); assert.equal(result.primary.allCharactersExpected, true);
        assert.equal(result.control.bodyLength, 65000); assert.equal(result.control.allCharactersExpected, true);
        for (const client of [result.primary, result.control])
        {
            assert.equal(client.runtime, '.NET ' + source.exactRuntime);
            assert.equal(Object.hasOwn(client, 'elapsedTicks'), false);
        }
        assert.equal(result.ready.startup.sha256.toUpperCase(), image.sourceAssociation.ownerSha256);
        assert.equal(result.ready.startup.mvid.toLowerCase(), image.sourceAssociation.mvid.toLowerCase());
        const core = accepted.images[role].runtimeInputs.find(row => path.basename(row.file) === 'System.Private.CoreLib.dll');
        assert.equal(result.ready.coreLibrary.sha256.toUpperCase(), core.sha256);
        assert.equal(result.postFileBarrier, '/after-large');
        assert.equal(result.actualSameCreatedFilesDeleted, true);
        assert.equal(result.actualEndpointFilesCreatedAndDeleted, 2);
        assert.equal(result.hostTerminal, true); assert.equal(result.hostExit, 0);
        assert.equal(result.nativeChildren.length, 2);
        for (const child of result.nativeChildren)
        {
            assert.equal(child.terminal, true); assert.equal(child.exitCode, 0); assert.equal(child.actualTiming, false);
        }
        for (const entry of image.files) { assert.equal(hash(path.join(image.imagePath, entry.file)), entry.sha256); }
        observations.push({ role, variant, label, file, sha256: hash(file), actualFullRawBytesAndDecodedCharacterContractsPassed: true,
            actualHostPid: result.hostPid, actualNativeClientPids: result.nativeChildren.map(row => row.pid), actualAllNativeChildrenTerminal: true });
    }
    assert.equal(hash(path.join(source.checkout, source.sourcePath)), source.originalSourceSha256);
    for (const file of ['InProcessWebSite.dll', 'InProcessWebSite.pdb'])
    {
        const current = path.join(source.site, file);
        assert.equal(hash(current), accepted.images[role].candidate.files.find(row => row.file === file).sha256);
        fs.copyFileSync(path.join(source.baselineImage, file), current);
        assert.equal(hash(current), source.baselineImageFiles.find(row => row.file === file).sha256);
    }
}
const oldSeals = [];
for (const seal of plan.oldImmutableCapsules)
{
    assert.equal(hash(path.join(seal.directory, 'manifest.json')), seal.manifestSha256);
    const entries = read(path.join(seal.directory, 'manifest.json')).files;
    for (const entry of entries)
    {
        assert.equal(hash(path.join(seal.directory, entry.relativePath)).toLowerCase(), entry.sha256.toLowerCase());
    }
    oldSeals.push({ actualPayloadFilesRehashed: entries.length, actualOldCapsuleBytesUnchanged: true, manifestSha256: seal.manifestSha256 });
}
const result = { recordedAt: new Date().toISOString(), planSha256: hash(path.join(root, 'plan.json')),
    acceptedImagesSha256: hash(path.join(root, 'accepted-images.json')), actualFourRoleVariantContractsPassed: true,
    actualRawBytesPerResponse: 200000000, actualGetStringAsyncCharacters: 200000000,
    actualEveryDecodedCharacterChecked: true, actualResponseOnlyControlCharacters: 65000,
    actualAllTwelveNativeChildrenTerminal: true, actualNoStopwatchOrAllocationCounterExecuted: true,
    actualTemporaryNativeSourceAndTwoOwnerOutputsPerWorktreeRestored: true,
    actualImplementationSourceStillMatchesCandidate: hash(String.raw`C:\src\aspnetcore\src\Servers\IIS\IIS\test\testassets\InProcessWebSite\Startup.cs`) === hash(path.join(root, 'inputs', 'Startup.candidate.cs')),
    actualNoPerformanceComparisonAuthorized: true, sourceAssociationBoundary: 'Selected PE/PDB associations were captured against candidate physical native inputs before restoration; baseline checksum used exact original source snapshots. Full compiler attestation not claimed.',
    runnerSha256: hash(path.join(session, 'F145-run-variant-008.ps1')), observations, oldSeals };
assert.equal(result.actualImplementationSourceStillMatchesCandidate, true);
write(path.join(root, 'functional-acceptance.json'), result);
write(path.join(root, 'functional-acceptance-seal.json'), { file: 'functional-acceptance.json', sha256: hash(path.join(root, 'functional-acceptance.json')) });
const policyFile = path.join(session, 'autoperf-parallelism', 'policy.json');
fs.copyFileSync(policyFile, path.join(root, 'policy-before-active-owner-update-009.json'), fs.constants.COPYFILE_EXCL);
const policy = read(policyFile);
assert.equal(policy.actualWorkerBuildHoldActive, false);
policy.independentFindingPreparationWorkers = { F135: 'bade3e44-8518-40da-be32-cb21e56b5a70', F137: '8b9e7d6d-aed9-4054-b96b-60dbaef43dae' };
policy.activeWorkerPreparationScopes = { F135: 'Small same-finding capsule packaging only; no dotnet; pause heavy IO on explicit HOLD.',
    F137: 'Full untimed precompiled-view producer preparation; new explicit HOLD stops new native starts and awaits all owned children.' };
policy.activeWorkerRegistryUpdatedAt = new Date().toISOString();
fs.writeFileSync(policyFile, JSON.stringify(policy, null, 2) + '\n');
console.log(JSON.stringify({ actualAllFourContractsPassed: true, actualRawBytesAndDecodedCharacters: 200000000,
    actualAllTwelveNativeChildrenTerminal: true, actualNoTimingCollected: true, actualNativeGraphsRestored: true,
    actualOriginalCapsuleFilesRehashedUnchanged: oldSeals.map(row => row.actualPayloadFilesRehashed),
    functionalAcceptanceSha256: hash(path.join(root, 'functional-acceptance.json')) }, null, 2));
