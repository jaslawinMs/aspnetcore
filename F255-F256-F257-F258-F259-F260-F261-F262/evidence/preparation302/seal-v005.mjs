import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sha256, verifyMembership } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const root = import.meta.dirname, read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const policy = read(path.join(path.dirname(root), 'policy.json'));
assert.equal(policy.actualWorkerBuildHoldActive, false);
assert.equal(policy.buildAndTestWorkQuiesced, false);
assert.equal(fs.existsSync(path.join(path.dirname(root), 'benchmark-exclusive.lease.json')), false);
const campaign = read(path.join(path.dirname(path.dirname(root)), 'autoperf-campaign.json'));
for (const id of ['F260', 'F261', 'F262']) assert.equal(campaign.candidates.find(x => x.id === id).status, 'pending');
assert.deepEqual(verifyMembership(root, read(path.join(root, 'source-membership.json'))), { objects: 36, memberships: 36 });
const receiptFiles = fs.readdirSync(path.join(root, 'commands')).filter(x => x.endsWith('.receipt.json'));
assert.equal(receiptFiles.length, 19);
for (const file of receiptFiles)
{
    const receipt = read(path.join(root, 'commands', file));
    assert.equal(receipt.actualRootExitCode, 0);
    assert.equal(receipt.error, null);
    assert.equal(receipt.completeRawStreamsReturned, true);
}
function inventory(directory, relative = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const name = relative ? relative + '/' + entry.name : entry.name;
        return entry.isDirectory() ? inventory(path.join(directory, entry.name), name) : [name];
    });
}
const files = inventory(root).sort().map(file =>
{
    const raw = fs.readFileSync(path.join(root, file));
    return { file, bytes: raw.length, sha256: sha256(raw) };
});
const index = Buffer.from(JSON.stringify({ files, explicitSelfReferenceExclusions: ['FILE-INVENTORY.json', 'SEAL.json'] }, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'FILE-INVENTORY.json'), index, { flag: 'wx' });
const seal = Buffer.from(JSON.stringify({ phase: 302, status: 'SEALED_SOURCE_ONLY_PARENT_DISPOSITION_PENDING',
    payloadFiles: files.length, completeFiles: files.length + 2, inventorySha256: sha256(index),
    actualDirectGitGhRoots: 19, rawObjects: 36, memberships: 36,
    completeInventoryVerified: true, prospectiveSelfExit: null, actualEnclosingToolExit: null,
    sourceIdentityNotRuntimeOrMaterialityQualification: true, productTestsCandidatesComparisons: 0 }, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'SEAL.json'), seal, { flag: 'wx' });
assert.deepEqual(inventory(root).sort(), files.map(x => x.file).concat('FILE-INVENTORY.json', 'SEAL.json').sort());
console.log(JSON.stringify({ phase: 302, payloadFiles: files.length, completeFiles: files.length + 2,
    sealSha256: sha256(seal), indexSha256: sha256(index), actualEnclosingToolExitNotSelfAttested: true }));
