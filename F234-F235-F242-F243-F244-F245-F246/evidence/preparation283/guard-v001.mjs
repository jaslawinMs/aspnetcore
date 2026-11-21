import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const scope = import.meta.dirname;
const parallel = path.dirname(scope);
const session = path.dirname(parallel);
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const copies = {};
function capture(name, file) {
    const bytes = fs.readFileSync(file);
    fs.writeFileSync(path.join(scope, name), bytes, { flag: 'wx' });
    copies[name] = { originalPath: file, bytes: bytes.length, sha256: sha256(bytes) };
    return JSON.parse(bytes.toString('utf8'));
}

const policy = capture('guard-policy-v001.raw.json', path.join(parallel, 'policy.json'));
const registration = capture('guard-registration-v001.raw.json', path.join(parallel, 'owner-registrations-282-283.json'));
const campaign = capture('guard-campaign-v001.raw.json', path.join(session, 'autoperf-campaign.json'));
const ids = ['F243', 'F244', 'F245', 'F246'];
const actualAgentId = '7edc5806-0226-40d8-81f6-5c50d73959bc';
assert.equal(policy.independentFindingPreparationWorkers.F243, actualAgentId);
assert.equal(registration.actualOwners.F243, actualAgentId);
assert.equal(policy.activeWorkerPreparationScopes.F243, registration.exactScopes.F243);
assert.ok(policy.activeWorkerPreparationScopes.F243.startsWith('283 SOURCE ONLY after separateGO283'));
assert.ok(policy.activeWorkerPreparationScopes.F243.includes('New finding-F243-F246-283 only:'));
assert.equal(policy.actualWorkerBuildHoldActive, false);
assert.equal(policy.buildAndTestWorkQuiesced, false);
assert.equal(policy.maximumRegisteredPreparationOwners, 4);
assert.ok(Object.keys(policy.independentFindingPreparationWorkers).length <= 4);
const lease = path.join(parallel, 'benchmark-exclusive.lease.json');
assert.equal(fs.existsSync(lease), false);
const selectedRetainedMetadata = ids.map(id => {
    const found = campaign.candidates.filter(candidate => candidate.id === id);
    assert.equal(found.length, 1);
    assert.equal(found[0].status, 'pending');
    return found[0];
});
const result = {
    kind: 'fresh-guard-and-retained-record-metadata-not-source-evidence',
    observedUtc: new Date().toISOString(),
    actualAgentId,
    scope,
    policySha256: copies['guard-policy-v001.raw.json'].sha256,
    registrationPolicySha256: registration.policyAfterSha256,
    ownRegistrationAndExactScopeMatch: true,
    actualOwners: policy.independentFindingPreparationWorkers,
    leasePath: lease,
    leaseAbsentAtObservation: true,
    HOLD: false,
    quiesced: false,
    pendingCanonicalOuterIdsConfirmed: ids,
    copies,
    selectedRetainedMetadata,
    sourceRootsExecuted: 0,
    limitations: ['Point observation only; no future authorization, complete process-tree, or machine-idleness claim.']
};
fs.writeFileSync(path.join(scope, 'guard-result-v001.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
