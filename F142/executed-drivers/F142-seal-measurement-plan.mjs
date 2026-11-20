import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const session = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files`;
const run = path.join(session, 'autoperf-runs', 'F142');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const rows = ['Undocumented', 'Zero', 'One', 'Four', 'Aliased', 'Ignored', 'Body'];
const frozen = path.join(run, 'canonical-preflight-inputs-005');
const inputs = read(path.join(frozen, 'input-seal.json'));
for (const item of inputs.actualExactInputs)
{
    assert.equal(hash(path.join(frozen, ...item.file.split('/'))), item.sha256);
}
assert.equal(hash(path.join(run, 'canonical-characterization-plan.json')), inputs.actualUnchangedSevenProfileAcceptanceSha256);
const verified = [];
for (const role of ['Original', 'Default'])
{
    const root = path.join(run, 'canonical-preflight-005', role);
    const completed = read(path.join(root, 'completed.json'));
    assert.equal(completed.actualUntimedMeasurementSetupVerified, true);
    assert.equal(completed.actualNoCandidateOrShippingSourceChange, true);
    const documents = fs.readFileSync(path.join(root, 'characterize-001.stdout.txt'), 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line)).filter(item => item.profile);
    const setups = fs.readFileSync(path.join(root, 'measurement-verify-001.stdout.txt'), 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
    assert.deepEqual(documents.map(item => item.profile), rows);
    assert.deepEqual(setups.map(item => item.profile), rows);
    for (const item of documents) { assert.equal(item.passed, true); assert.equal(item.timed, false); }
    for (const item of setups) { assert.equal(item.passed, true); assert.equal(item.measured, false); assert.deepEqual(item.samples, []); }
    for (const profile of rows)
    {
        assert.deepEqual(fs.readFileSync(path.join(root, 'observations', profile + '.json')),
            fs.readFileSync(path.join(run, 'canonical-preflight-004', role, 'observations', profile + '.json')));
    }
    const inventory = read(path.join(root, 'measurement-consumer-inventory.json'));
    assert.equal(inventory.PlatformVersion, '12.0.0-alpha.1.26565.104');
    for (const file of inventory.Files)
    {
        const absolute = path.join(root, 'measurement-consumer', file.File);
        assert.equal(fs.statSync(absolute).size, file.Bytes); assert.equal(hash(absolute), file.Sha256);
    }
    verified.push({ role, source: completed.actualSourceRevision, actualCanonicalDocumentRowsPassed: 7,
        actualCapturedProducerSetupRowsPassed: 7, actualConsumerInventorySha256: hash(path.join(root, 'measurement-consumer-inventory.json')),
        actualGeneratedOwnerSha256: setups[0].actualGeneratedOwnerSha256 });
}
assert.equal(fs.existsSync(path.join(run, 'diagnostic-budget.json')), false);
assert.equal(hash(String.raw`C:\src\aspnetcore\src\OpenApi\gen\XmlCommentGenerator.Emitter.cs`), '58DEE19C9B88DC9D50C85E0F8235517DC262887AA662AA6912CD8EB2688B88FE');
write(path.join(run, 'canonical-preflight-005-verification.json'), { recordedAt: new Date().toISOString(), actualBeforeCandidateOrTiming: true,
    actualFrozenInputsSha256: hash(path.join(frozen, 'input-seal.json')), verified, actualAllOriginalDefaultDocumentsByteIdenticalToAccepted004: true,
    boundary: 'Actual source-generated AddOpenApi provider and real endpoint/ApiExplorer documents, plus captured actual operation/context and real generated transformer. Not full compiler-input/loader attestation or performance.' });
const plan = {
    findingId: 'F142', original: '37e809ead5824bc753a1c3d56f11615bdb1296c5', observedDefault: 'ae89581dfd24c6277b4267a9779d05f7b9f047f1',
    sealedBeforeCandidateAndTiming: true, acceptanceInputSet: 'canonical-preflight-inputs-005',
    actualOwner: 'XmlCommentGenerator.Emitter.cs emits the runtime XmlCommentOperationTransformer parameter-comment loop.',
    candidate: 'Inside the existing methodComment.Parameters Count>0 guard, obtain methodInfo.GetParameters() once into methodParameters before foreach and preserve the existing SingleOrDefault predicate and all surrounding branches.',
    correctness: { profiles: rows, baselineAndDefaultFullProducerRowsPassed: 14, baselineAndDefaultCapturedSetupRowsPassed: 14,
        candidateRequiresIdenticalSevenFullProducerAndSevenCapturedSetupRows: true,
        exactSerializedOperationStateMustRemainIdenticalBeforeAndAfterRepeatedActualTransforms: true },
    primary: { profile: 'Four', boundary: 'Warm isolated actual analyzer-generated operation transformer on a real provider-produced operation/context: four documented query parameters including one integer example.',
        notClaimed: 'Whole-document generation, application throughput, startup time or cross-machine speedup.' },
    usefulGainGate: {
        timeRoute: 'Median paired primary less-time at least10%, with no primary allocation regression.',
        allocationRoute: 'Median paired primary saving at least128B/op AND5%, with primary median elapsed regression no greater than3%.',
        controls: 'No allocation increase of16B/op or more, and no elapsed regression greater than10% reproduced in at least2 completed comparisons, for any secondary profile.',
        decision: 'Use only the predeclared Four primary. Aggregate per-comparison medians. At most3 comparisons including failures/partials. No tuning or primary substitution after timing.',
        earlyStop: 'Only after a complete comparison showing at least25% primary time or allocation improvement, primary elapsed regression no greater than3%, and all controls elapsed regression no greater than5% with no allocation regression.'
    },
    secondaryProfiles: rows.filter(row => row !== 'Four'),
    samples: { warmupInvocations: 20000, sampleCount: 15, invocationsPerSample: 50000, timer: 'Stopwatch.GetTimestamp', allocation: 'GC.GetAllocatedBytesForCurrentThread; only verified synchronous-completion transforms and unchanged thread identity.' },
    comparisonRoleOrders: [['Original', 'Candidate'], ['Candidate', 'Original'], ['Original', 'Candidate']],
    sourceAndRuntime: { physicalBenchmarkHost: 'jaro-dev7 / CPC-jasla-LSEJU', actualRuntime: '12.0.0-alpha.1.26565.104',
        identicalFrozenDependenciesAndHarnessRequiredForOriginalCandidate: true, sameMachineAndConfiguration: true, buildsAndTestsQuiescentOnThisHost: true,
        coordinatorExclusiveGatewayRequired: true, maximumSimultaneousBenchmarksAcrossAllHosts: 1, remoteBenchmarksAuthorized: false,
        machineSettingsOrPriorityOrAffinityChangesAuthorized: false, sharedEnvironmentNotDedicated: true },
    maximumAuthorizations: 3, historicalAliasBudgetsRemainClosed: true, priorFailedPreparationsRetained: true,
};
write(path.join(run, 'plan.json'), plan);
write(path.join(run, 'plan-seal.json'), { recordedAt: new Date().toISOString(), sha256: hash(path.join(run, 'plan.json')), actualBeforeCandidateAndTiming: true });
write(path.join(run, 'diagnostic-budget.json'), { findingId: 'F142', maximumAuthorizations: 3, authorizations: [], closed: false,
    timingRequiresFrozenAcceptedImages: true, failedOrPartialStillConsumesAuthorization: true, noPostTimingTuningOrPrimarySubstitution: true });
console.log(JSON.stringify({ planSha256: hash(path.join(run, 'plan.json')), actualVerifiedProfilesBeforeImplementation: verified, actualComparisonAuthorizations: 0 }, null, 2));
