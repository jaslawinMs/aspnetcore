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
assert.equal(hash(path.join(root, 'plan.json')), read(path.join(root, 'plan-seal.json')).sha256);
const proof = read(path.join(root, 'inputs', 'owner-source-associations.json'));
assert.equal(proof.selectedAssociations.length, 4);
const ownerAllowlist = ['InProcessWebSite.dll', 'InProcessWebSite.pdb'];
const images = {};
function inventory(directory, relative = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const file = path.join(directory, entry.name), logical = path.join(relative, entry.name);
        return entry.isDirectory() ? inventory(file, logical) : [{ file: logical.replaceAll('\\', '/'), bytes: fs.statSync(file).size, sha256: hash(file) }];
    });
}
for (const role of ['original', 'default'])
{
    const source = plan.sourceRoles[role];
    images[role] = {};
    for (const variant of ['baseline', 'candidate'])
    {
        const imagePath = path.join(root, 'images', role, variant), files = inventory(imagePath);
        const association = proof.selectedAssociations.find(row => row.role === role && row.variant === variant);
        assert.equal(association.actualGuidAndStampMatch, true);
        assert.equal(association.actualSelectedSourceChecksumMatches, true);
        assert.equal(files.find(row => row.file === 'InProcessWebSite.dll').sha256, association.ownerSha256);
        assert.equal(files.find(row => row.file === 'InProcessWebSite.pdb').sha256, association.pdbSha256);
        assert.equal(files.find(row => row.file === 'F145ResponseWorkload.dll').sha256, plan.functionalAcceptance.unchangedCommonConsumerSha256);
        images[role][variant] = { imagePath, files, sourceAssociation: association };
    }
    assert.deepEqual(images[role].baseline.files, source.baselineImageFiles);
    assert.deepEqual(images[role].baseline.files.map(row => row.file), images[role].candidate.files.map(row => row.file));
    const differences = images[role].baseline.files.filter((row, index) => row.sha256 !== images[role].candidate.files[index].sha256);
    assert.deepEqual(differences.map(row => row.file).sort(), [...ownerAllowlist].sort());
    for (const name of ['F145FunctionalHost.dll', 'F145FunctionalHost.pdb', 'F145ResponseWorkload.dll', 'F145ResponseWorkload.pdb',
        'F145ResponseWorkload.deps.json', 'F145ResponseWorkload.runtimeconfig.json', 'InProcessWebSite.deps.json', 'InProcessWebSite.runtimeconfig.json'])
    {
        assert.equal(images[role].baseline.files.find(row => row.file === name).sha256, images[role].candidate.files.find(row => row.file === name).sha256);
    }
    const runtimeDirectory = path.join(source.runtimeRoot, 'shared', 'Microsoft.NETCore.App', source.exactRuntime);
    images[role].runtimeInputs = [path.join(source.runtimeRoot, 'dotnet.exe'),
        ...['System.Private.CoreLib.dll', 'coreclr.dll', 'clrjit.dll'].map(file => path.join(runtimeDirectory, file)),
        ...fs.readdirSync(path.join(source.runtimeRoot, 'host', 'fxr')).map(version => path.join(source.runtimeRoot, 'host', 'fxr', version, 'hostfxr.dll'))]
        .map(file => ({ file, bytes: fs.statSync(file).size, sha256: hash(file) }));
    images[role].actualEveryFileComparedWithoutPrefixExclusions = true;
    images[role].actualOnlyIntendedOwnerDllPdbDiffer = true;
}
const result = { recordedAt: new Date().toISOString(), planSha256: hash(path.join(root, 'plan.json')),
    actualNoTimingExecuted: true, actualFourImagesAdmittedForUntimedFunctionalValidation: true,
    actualPerformanceComparisonAuthorized: false, actualBothPinsRequireFunctionalSuccessBeforeAnyTiming: true,
    ownerDifferenceAllowlist: ownerAllowlist, images };
write(path.join(root, 'accepted-images.json'), result);
write(path.join(root, 'accepted-images-seal.json'), { file: 'accepted-images.json', sha256: hash(path.join(root, 'accepted-images.json')) });
console.log(JSON.stringify({ planSha256: result.planSha256, acceptedImagesSha256: hash(path.join(root, 'accepted-images.json')),
    actualAllFileImageComparisonsPassed: true, actualOnlyOwnerDllPdbDifferWithinEachPair: true,
    actualCommonHostAndClientBytesIdenticalWithinEachPair: true, actualImageFileCounts: Object.fromEntries(Object.entries(images).map(([role, value]) => [role, [value.baseline.files.length, value.candidate.files.length]])),
    actualPerformanceComparisonAuthorized: false }, null, 2));
