import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(process.argv[2] || path.dirname(fileURLToPath(import.meta.url)));
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex').toUpperCase();
const acceptance = read('coordinator-acceptance.json'), budget = read('closed-budget.json');
assert.equal(acceptance.finalDisposition, 'rejected');
assert.equal(acceptance.subtype, 'material-optimization-unestablished');
assert.equal(acceptance.actualSelectedCapsuleFilesIndependentlyRehashed, 208);
assert.equal(acceptance.actualEntireOriginalPayloadRehashedByCoordinator, false);
assert.equal(acceptance.actualNoMeasuredNoGainOrJitEquivalenceClaim, true);
assert.equal(acceptance.actualCausalPerformancePairAdmitted, false);
assert.equal(acceptance.actualNonOwnerOriginalDefaultDifferences, 67);
assert.equal(acceptance.actualLoadedAssociationsHistoricallyChecked, 118);
assert.equal(acceptance.actualSourcePePdbAssociationsHistoricallyChecked, 10);
assert.equal(new Set(acceptance.boundedTargetGitIdentities.map(item => item.actualGitBlob)).size, 1);
assert.equal(budget.findingId, 'F135');
assert.equal(budget.closed, true);
assert.deepEqual(budget.authorizations, []);
assert.equal(budget.maximumAuthorizations, 3);
for (const item of read('authoritative-copies.json'))
{
    assert.equal(fs.statSync(path.join(root, item.file)).size, item.bytes);
    assert.equal(hash(item.file), item.sha256);
}
assert.equal(hash('owner-handoff/manifest.json'), '09324EECAB55082C39E27CD33104456D76601093C211709FF3EBEBBC39918482');
const audit = spawnSync(process.execPath, [path.join(root, 'owner-handoff', 'audit.cjs'), '--self-test'],
    { encoding: 'utf8', windowsHide: true });
assert.ifError(audit.error);
assert.equal(audit.status, 0, audit.stderr + '\n' + audit.stdout);
const result = JSON.parse(audit.stdout.trim());
assert.equal(result.producerRows, 54);
assert.equal(result.exactExistingTestExecutions, 6);
assert.equal(result.nonOwnerPairDifferences, 67);
assert.equal(result.selfTests, 'PASS');
let sealedFiles = null;
if (fs.existsSync(path.join(root, 'capsule-file-hashes.json')))
{
    const files = read('capsule-file-hashes.json').files;
    for (const item of files)
    {
        assert.equal(fs.statSync(path.join(root, item.file)).size, item.bytes);
        assert.equal(hash(item.file), item.sha256);
    }
    const enumerate = (directory, relative = '') => fs.readdirSync(directory, { withFileTypes: true }).flatMap(item =>
    {
        assert.equal(item.isSymbolicLink(), false);
        const absolute = path.join(directory, item.name), name = path.join(relative, item.name);
        return item.isDirectory() ? enumerate(absolute, name) : [name.replaceAll('\\', '/')];
    });
    assert.deepEqual(enumerate(root).filter(file => !['capsule-file-hashes.json', 'publication.json'].includes(file)).sort(),
        files.map(item => item.file).sort());
    sealedFiles = files.length + 1;
}
else
{
    assert.equal(process.argv.includes('--require-seal'), false);
}
console.log(JSON.stringify({ candidate: 'F135', finalDisposition: 'rejected', subtype: 'material-optimization-unestablished',
    actualSelectedCapsuleFilesVerified: 208, actualSelectedMiddlewareRowsVerified: 54,
    actualExistingConsoleExecutionsVerified: 6, actualLoadedAssociationsHistoricallyChecked: 118,
    actualSourcePePdbAssociationsHistoricallyChecked: 10, actualPhysicalGitSourceAssociations: 36,
    actualNonOwnerPairDifferences: 67, actualCausalPerformancePairAdmitted: false,
    actualOriginalExistingTestRuntime: '12.0.0-alpha.1.26562.105',
    actualDefaultTestsAndBothProducerRuntime: '12.0.0-alpha.1.26568.110',
    actualResidualCostMeasured: false, actualCandidateApplied: false, actualNewComparisons: 0,
    actualZeroComparisonBudgetClosed: true, actualNativeDotnetProcessStartedByThisAudit: false,
    actualFreshOmittedBinaryAttestation: false, actualFullCompilerInputAttestation: false, sealedFiles }));
