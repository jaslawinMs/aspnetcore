import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F142');
const capsule = path.join(session, 'autoperf-published-results', 'F142');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const budgetFile = path.join(run, 'diagnostic-budget.json');
const budgetHash = hash(budgetFile);
const budget = read(budgetFile);
assert.equal(budget.closed, true); assert.equal(budget.authorizations.length, 3);
const images = read(path.join(run, 'accepted-images.json'));
const plan = read(path.join(run, 'plan.json'));
assert.equal(plan.sourceAndRuntime.identicalFrozenDependenciesAndHarnessRequiredForOriginalCandidate, true);
const inventories = {};
for (const role of ['Original', 'Candidate'])
{
    const accepted = images.roles[role];
    assert.equal(hash(accepted.inventory), accepted.inventorySha256);
    inventories[role] = read(accepted.inventory).Files;
    for (const file of inventories[role])
    {
        const physical = path.join(accepted.consumer, file.File);
        assert.equal(fs.statSync(physical).size, file.Bytes);
        assert.equal(hash(physical), file.Sha256);
    }
}
assert.deepEqual(inventories.Original.map(file => file.File), inventories.Candidate.map(file => file.File));
const differences = inventories.Original.flatMap(original =>
{
    const candidate = inventories.Candidate.find(file => file.File === original.File);
    return original.Sha256 === candidate.Sha256 ? [] : [{
        file: original.File, originalBytes: original.Bytes, candidateBytes: candidate.Bytes,
        originalSha256: original.Sha256, candidateSha256: candidate.Sha256
    }];
});
assert.deepEqual(differences.map(file => file.file).sort(), [
    'AutoPerf.F142.Characterization.dll', 'AutoPerf.F142.Characterization.pdb',
    'AutoPerf.F142.GeneratedOwner.dll', 'AutoPerf.F142.GeneratedOwner.pdb',
    'AutoPerf.F142.Measurement.dll', 'AutoPerf.F142.Measurement.pdb'
].sort());
const commonHarnessDifferences = differences.filter(file => file.file.startsWith('AutoPerf.F142.Measurement.'));
assert.equal(commonHarnessDifferences.length, 2);
const numerical = read(path.join(run, 'measurement-decision.json'));
assert.equal(numerical.actualPredeclaredUsefulGainGatePassed, true);
const result = {
    recordedAt: new Date().toISOString(), findingId: 'F142', disposition: 'no-gain',
    subtype: 'measurement-identity-inconclusive', actualFinalPerformanceQualification: false,
    actualNumericalAllocationGatePassed: true, actualNumericalTimeGatePassed: false,
    actualRequiredCommonHarnessImageIdentityMet: false,
    actualPhysicalFilesRehashedPerRole: inventories.Original.length,
    actualAcceptedInventoriesAndPhysicalBytesReverified: true,
    actualDifferentConsumerFiles: differences, actualCommonMeasurementHarnessDifferences: commonHarnessDifferences,
    actualOriginalCandidateCommonHarnessSourceInputsIdentical: true,
    actualPrematureImageAcceptanceGap: 'The pre-timing verifier excluded every AutoPerf.F142.* file when checking dependency equality. This correctly counted133 identical non-fixture dependencies but failed to enforce common measurement DLL/PDB identity required by the frozen plan.',
    actualNumericalDecisionPreservedSha256: hash(path.join(run, 'measurement-decision.json')),
    actualPlanPreservedSha256: hash(path.join(run, 'plan.json')),
    actualAcceptedImagesPreservedSha256: hash(path.join(run, 'accepted-images.json')),
    actualClosedBudgetPreservedSha256: budgetHash,
    actualNoAdditionalMeasurements: true, actualNoPostTimingSourceTuning: true,
    actualLaterUntimedCommonReconstructionDoesNotRepairHistoricalTiming: true,
    actualNoPerformancePrAuthorized: true,
    actualSourceBranchIsExploratoryOnly: 'autoperf/F142-reuse-xml-operation-method-parameters',
    actualSourceRevision: '81222347869a8c7dcd504f22b2234f9a126265f4',
    conclusion: 'Observed168B/op(7.394341%) difference in all3 comparisons is retained, not a byte-identical-harness owner-isolated verified improvement. Distinct harness images do not prove the optimization has no benefit or caused the difference; they leave this study inconclusive. The budget remains closed, no replay/retuning or performance draft.',
    actualOriginalAndCandidateCorrectnessStillEstablished: 'All7 full producer documents identical and25 exact existing tests pass each;17 expected golden-only failures retained. Fresh exact common-project reconstruction verifies7 rows per measured owner without more timing.'
};
const backup = path.join(run, 'unpublished-authoring-before-identity-audit-001');
fs.mkdirSync(backup);
for (const file of ['README.md', 'validation-commands.md', 'F142-verify.mjs'])
{
    fs.copyFileSync(path.join(capsule, file), path.join(backup, file), fs.constants.COPYFILE_EXCL);
}
write(path.join(run, 'final-qualification.json'), result);
fs.copyFileSync(path.join(run, 'final-qualification.json'), path.join(capsule, 'final-qualification.json'), fs.constants.COPYFILE_EXCL);
fs.copyFileSync(path.join(session, 'F142-adjudicate-image-identity.mjs'), path.join(capsule, 'executed-drivers', 'F142-adjudicate-image-identity.mjs'), fs.constants.COPYFILE_EXCL);
assert.equal(hash(budgetFile), budgetHash);
console.log(JSON.stringify(result, null, 2));
