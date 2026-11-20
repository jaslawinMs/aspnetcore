import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(process.argv[2] ?? '.');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex').toUpperCase();
if (process.argv.includes('--require-seal'))
{
    for (const file of read('capsule-file-hashes.json').files)
    {
        assert.equal(fs.statSync(path.join(root, file.file)).size, file.bytes);
        assert.equal(hash(file.file), file.sha256);
    }
}
for (const file of read('authoritative-copies.json'))
{
    assert.equal(hash(file.file), file.sha256);
}
let assertions = 0;
const owners = { original: '7812F515C4DDFE409E1B395D4CFCB5FD3E9377906FFF820DB9B0555A83BAB379',
    default: '5D7628E0E23C9378BC8A264C81AB04C65F7A44AA3495792881202B95157DBEF8' };
for (const role of ['original', 'default'])
{
    const observed = read(`owner-handoff/outputs/${role}/resume02-producer-characterization.json`);
    assert.equal(observed.passed, true); assert.equal(observed.failure, null);
    assert.equal(observed.runtime.actual, '.NET 12.0.0-alpha.1.26557.102');
    assert.equal(observed.association.owner_sha256, owners[role]);
    assert.equal(observed.association.documents.length, 4);
    assert.equal(observed.association.codeview_guid, observed.association.pdb_guid);
    assert.equal(observed.requests.length, 4); assert.equal(observed.assertions.length, 183);
    const partitions = {};
    for (const row of observed.assertions)
    {
        assert.equal(row.passed, true, row.id);
        const key = row.id.split('.')[0];
        partitions[key] = (partitions[key] ?? 0) + 1;
        if (row.id.endsWith('.generic_argument_is_value_type'))
        {
            assert.equal(row.expected, 'False');
            assert.equal(row.actual, 'False');
        }
        assertions++;
    }
    assert.deepEqual(partitions, { association: 10, runtime: 1, 'default-request-delegate': 68, 'action-invoker-provider': 68, 'helper-only': 36 });
}
const original = read('owner-handoff/manifest/existing-test-results.json');
assert.equal(original.default_canonical.status, 'host_startup_blocked_no_test_assertions_reached');
assert.equal(original.no_fallback_is_reported_as_a_canonical_pass, true);
const canonical = read('canonical-default-007/verified-canonical-default.json');
assert.equal(canonical.actualCanonicalDefaultTestRowsPassed, 3);
assert.equal(canonical.actualRequestedAndHostResolvedRuntime, '12.0.0-alpha.1.26568.110');
assert.equal(canonical.actualSourceOwnerSha256, owners.default);
assert.equal(canonical.actualNoChangesToOriginal230FileCapsule, true);
assert.equal(canonical.actualNoRuntimeOrSdkInstalled, true);
const decisions = read('decisions.json');
assert.deepEqual(decisions.decisions.map(row => row.id), ['F151', 'F152']);
for (const row of decisions.decisions)
{
    assert.equal(row.disposition, 'rejected'); assert.equal(row.subtype, 'boxing-prerequisite-unestablished');
    const budget = read(row.id + '-closed-budget.json');
    assert.equal(budget.findingId, row.id); assert.equal(budget.closed, true); assert.deepEqual(budget.authorizations, []);
}
assert.equal(decisions.actualMeasuredNoGain, false);
assert.equal(decisions.actualLiteralNoOpOrZeroBoxingEverywhereClaim, false);
for (const row of read('latest-target-identity.json').identities)
{
    assert.equal(row.actualGitBlob, '0c33a107e4464129ce8eb5b6fda3f78cc9d889e7');
}
const xml = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', path.join(root, 'audit-trx.ps1'), '-CapsuleRoot', root],
    { encoding: 'utf8', windowsHide: true, maxBuffer: 1024 * 1024 });
assert.equal(xml.status, 0, xml.stderr ?? 'XML audit failed.');
console.log(JSON.stringify({ actualPortableHistoricalAuditPassed: true, actualAssertionsRechecked: assertions,
    actualRealMvcAssertionsPerPin: 136, actualHelperOnlyAssertionsPerPin: 36, actualIdentityRuntimeAssertionsPerPin: 11,
    actualBothZeroComparisonBudgetsClosed: true, actualMaterialValueTypeGenericProducerNotEstablished: true,
    actualNoUniversalAbsenceOrPerformanceClaim: true, actualNoNativeDotnetOrTimingExecuted: true,
    actualXmlAudit: JSON.parse(xml.stdout.replace(/^\uFEFF/, '')) }, null, 2));
