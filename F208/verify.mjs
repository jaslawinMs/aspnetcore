import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gitId, sha256, treeEntries, verifyMembership } from './source-objects.mjs';

const root = path.resolve(process.argv[2] ?? import.meta.dirname);
function content(relative)
{
    const file = path.resolve(root, ...relative.split(/[\\/]/));
    assert.ok(file.startsWith(root + path.sep), relative);
    return fs.readFileSync(file);
}
const json = relative => JSON.parse(content(relative).toString('utf8').replace(/^\uFEFF/, ''));
function checked(relative, bytes, hash)
{
    const raw = content(relative);
    assert.equal(raw.length, bytes, relative);
    assert.equal(sha256(raw), hash.toUpperCase(), relative);
    return raw;
}
const evidence = json('evidence-index.json');
assert.equal(evidence.files.length, 142);
assert.equal(new Set(evidence.files.map(item => item.file)).size, 142);
for (const item of evidence.files)
{
    checked(item.file, item.bytes, item.sha256);
}
assert.equal(sha256(content('evidence/ARTIFACTS.sha256.json')), 'FE24BF3E29C7FFF374A767C7AC6FE0018611C115ABA8A9873EB5C171A2870C98');
const historical = json('evidence/ARTIFACTS.sha256.json');
assert.equal(historical.length, 136);
for (const item of historical)
{
    checked(`evidence/${item.path}`, item.bytes, item.sha256);
}
assert.equal(sha256(content('evidence/HANDOFF.json')), '37E6327BCAAB75AD65242121D48B78234031D017DF95013B6847C5F5C8ED065E');
const handoff = json('evidence/HANDOFF.json');
assert.equal(handoff.state, 'private-candidate-correctness-qualified-only');
assert.equal(handoff.performanceAndMateriality.comparisonsAuthorized, 0);
assert.equal(handoff.performanceAndMateriality.performanceQualified, false);
assert.equal(handoff.nativeExecution.nativeRoots, 15);
assert.equal(json('evidence/materiality-decision-227.json').coordinatorDecision, 'bounded-campaign-rejection-materiality-not-established');
assert.equal(json('evidence/performance-proposal-203/HANDOFF.json').status, 'source-only-proposal-complete-not-performance-ready');
assert.equal(json('evidence/source-test-rows.json')['default-010-red-native'].actualRowCount, 0);
const proof = json('evidence/red-green-row-proof.json');
const rows = json('evidence/test-rows.json');
assert.equal(proof.length, 8);
for (const role of ['original', 'default'])
{
    assert.equal(rows[role].baseline.length, 4);
    assert.equal(rows[role].candidate.length, 18);
    assert.ok(rows[role].candidate.every(item => item.outcome === 'Passed'));
    for (const level of ['Information', 'Error', 'Critical', 'None'])
    {
        const member = proof.filter(item => item.role === role && item.testName.endsWith(`(minimumLevel: ${level})`));
        assert.equal(member.length, 1);
        const item = member[0];
        const expectedRed = ['Critical', 'None'].includes(level);
        assert.equal(item.testIdUnchanged, true);
        assert.equal(item.baselineTestId, item.candidateTestId);
        assert.equal(item.baselineOutcome, expectedRed ? 'Failed' : 'Passed');
        assert.equal(item.candidateOutcome, 'Passed');
        for (const variant of ['baseline', 'candidate'])
        {
            const result = rows[role][variant].filter(row => row.testName === item.testName);
            assert.equal(result.length, 1);
            assert.equal(result[0].executionId, item[`${variant}ExecutionId`]);
            assert.equal(result[0].testId, item[`${variant}TestId`]);
            assert.equal(result[0].outcome, item[`${variant}Outcome`]);
            if (variant === 'baseline' && expectedRed)
            {
                assert.match(result[0].failureMessage, /Assert\.Equal\(\) Failure: Collections differ/);
            }
            const trx = content(`evidence/${item[`${variant}Attempt`]}/TestResults/rows.trx`).toString('utf8');
            const actual = [...trx.matchAll(/<UnitTestResult\b([^>]+)>/g)].map(match =>
                Object.fromEntries([...match[1].matchAll(/([A-Za-z]+)="([^"]*)"/g)].map(attribute => [attribute[1], attribute[2]])))
                .filter(row => row.executionId === result[0].executionId);
            assert.equal(actual.length, 1);
            assert.equal(actual[0].testId, result[0].testId);
            assert.equal(actual[0].outcome, result[0].outcome);
        }
    }
}
const membership = json('source-membership.json');
const objects = verifyMembership(root, membership);
assert.equal(membership.sources.length, 4);
assert.equal(membership.absences.length, 4);
const rawObjects = new Map(membership.objects.map(item => [item.sha, { ...item, raw: content(item.file) }]));
for (const item of membership.absences)
{
    let current = rawObjects.get(item.commit).raw.toString('utf8').match(/^tree ([a-f0-9]{40})$/m)[1];
    let absent = false;
    for (const part of item.path.split('/'))
    {
        const entry = treeEntries(rawObjects.get(current).raw).get(part);
        if (entry === undefined)
        {
            absent = true;
            break;
        }
        current = entry.sha;
    }
    assert.equal(absent, true, item.path);
}
const changes = json('evidence/changed-files.json');
assert.equal(changes.length, 2);
assert.equal(membership.candidateSnapshots.length, 8);
for (const change of changes)
{
    const patch = content(`evidence/${change.patch}`);
    assert.equal(sha256(patch), change.patchSha256);
    assert.equal(change.files.length, 4);
    for (const item of change.files)
    {
        const snapshot = membership.candidateSnapshots.filter(candidate => candidate.role === change.role && candidate.path === item.path.replaceAll('\\', '/'));
        assert.equal(snapshot.length, 1);
        const raw = checked(snapshot[0].file, item.bytes, item.candidateRawSha256);
        assert.equal(gitId('blob', raw), item.candidateRawGitBlob);
        assert.equal(snapshot[0].sourceCommit, change.sourceCommit);
        const member = membership.sources.find(source => source.role === change.role && source.path === item.path.replaceAll('\\', '/'));
        if (item.baselineGitBlob === null)
        {
            assert.equal(member, undefined);
            assert.ok(membership.absences.some(absence => absence.role === change.role && absence.path === item.path.replaceAll('\\', '/')));
        }
        else
        {
            assert.equal(member.blob, item.baselineGitBlob);
            if (item.path.endsWith('NodeScriptRunner.cs'))
            {
                const normalize = value => value.toString('utf8').replaceAll('\r\n', '\n');
                const guard = ' && logger.IsEnabled(LogLevel.Error)';
                assert.equal(normalize(raw).split(guard).length, 2);
                assert.equal(normalize(raw).replace(guard, ''), normalize(rawObjects.get(member.blob).raw));
            }
        }
    }
}
if (fs.existsSync(path.join(root, 'capsule-file-hashes.json')) || process.argv.includes('--require-seal'))
{
    const seal = json('capsule-file-hashes.json');
    for (const item of seal.files)
    {
        checked(item.file, item.bytes, item.sha256);
    }
    function files(directory, relative = '')
    {
        return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
        {
            assert.equal(entry.isSymbolicLink(), false);
            const logical = relative ? relative + '/' + entry.name : entry.name;
            return entry.isDirectory() ? files(path.join(directory, entry.name), logical) : [logical];
        });
    }
    assert.deepEqual(files(root).filter(item => !['capsule-file-hashes.json', 'publication.json'].includes(item)).sort(),
        seal.files.map(item => item.file).sort());
}
console.log(JSON.stringify({
    finding: 'F208',
    retainedHistoricalFiles: 136,
    completeCopiedEvidenceFiles: 142,
    rawGitObjectsVerified: objects.objects,
    baselineSourceMemberships: objects.memberships,
    newSourceAbsences: 4,
    candidateRawSourceSnapshots: 8,
    producerRowPairsBoundToActualTrx: 8,
    candidateProjectRowsPerRole: 18,
    newNativeBuildsTestsOrProbes: 0,
    performanceComparisons: 0,
    materialityEstablished: false,
    disposition: 'bounded-materiality-rejection-not-measured-no-gain',
}));
