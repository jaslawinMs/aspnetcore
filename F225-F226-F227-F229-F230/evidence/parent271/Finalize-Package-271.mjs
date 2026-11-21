import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitId, sha256, verifyMembership } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const root = import.meta.dirname, parallel = path.dirname(root), session = path.dirname(parallel);
const previous = path.join(parallel, 'source-outcomes-266'), repo = String.raw`C:\src\aspnetcore`;
const prior = path.join(session, 'autoperf-published-results', 'F150-F206-F215-F220');
const capsule = path.join(session, 'autoperf-published-results', 'F225-F226-F227-F229-F230');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
function write(file, raw)
{
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
const jsonWrite = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
function inventory(directory, relative = '')
{
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    {
        assert.equal(entry.isSymbolicLink(), false);
        const name = relative ? relative + '/' + entry.name : entry.name;
        return entry.isDirectory() ? inventory(path.join(directory, entry.name), name) : [name];
    });
}
function guard()
{
    const raw = fs.readFileSync(path.join(parallel, 'policy.json')), policy = JSON.parse(raw);
    assert.deepEqual(Object.keys(policy.independentFindingPreparationWorkers).sort(), ['F209', 'F231', 'F234', 'F239']);
    assert.equal(policy.actualWorkerBuildHoldActive, false);
    assert.equal(policy.buildAndTestWorkQuiesced, false);
    assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
    return { observedUtc: new Date().toISOString(), policySha256: sha256(raw),
        actualOwners: policy.independentFindingPreparationWorkers, scopes: policy.activeWorkerPreparationScopes,
        leaseAbsent: true, HOLD: false, quiesced: false, pointOnly: true };
}
jsonWrite(path.join(root, 'policy-observation.json'), guard());
assert.equal(fs.existsSync(path.join(capsule, 'evidence-index.json')), false);
const evidence = [], ownerCopies = [], copied = new Set();
function copy(file, raw, existing = false)
{
    assert.equal(copied.has(file), false, file);
    copied.add(file);
    const destination = path.join(capsule, file);
    if (existing) assert.ok(fs.readFileSync(destination).equals(raw), file);
    else write(destination, raw);
    evidence.push({ file, bytes: raw.length, sha256: sha256(raw) });
}
const acceptance = read(path.join(parallel, 'accepted-preparations-265.json'));
for (const [key, group, expectedHash] of [
    ['F225', 'F225-F226', '933FE97F15FDF7DB60815D9AAD037162357B9C37A0D67C73449FAF84B7CC9F9D'],
    ['F227', 'F227', 'A6CA473FB3EC1C6DAE1E6940141C68C1C94CFD8D4EFD81F7D236FE36EF5AAB09'],
    ['F229', 'F229-F230', 'A12FD7372A3784778EE36A90B4E00E5A4028C12FD7AEA6C7036ED95474872567'],
])
{
    const owner = acceptance.accepted.find(x => x.key === key), directory = path.join(parallel, owner.folder);
    assert.equal(owner.hash, expectedHash);
    assert.equal(sha256(fs.readFileSync(path.join(directory, owner.index))), expectedHash);
    assert.deepEqual(inventory(directory).sort(), owner.completeFiles.map(x => x.file).sort());
    for (const item of owner.completeFiles)
    {
        const raw = fs.readFileSync(path.join(directory, item.file));
        assert.equal(raw.length, item.bytes);
        assert.equal(sha256(raw), item.sha256);
        copy('evidence/' + group + '/' + item.file, raw, true);
    }
    ownerCopies.push({ group, indexedPayloads: owner.indexed, completeCopiedFiles: owner.complete,
        failed266CopiesReverifiedWithoutEdits: true });
}
assert.equal(ownerCopies.reduce((sum, item) => sum + item.completeCopiedFiles, 0), 514);
const failedRaw = fs.readFileSync(path.join(capsule, 'source-membership.json')), original = JSON.parse(failedRaw);
assert.equal(original.sources.length, 78);
for (const item of original.objects) copy(item.file, fs.readFileSync(path.join(capsule, item.file)), true);
copy('source-membership.json', failedRaw, true);
const corrected = { ...original, sources: original.sources.map(item =>
{
    assert.equal(item.finding, undefined);
    assert.ok(['F225-F226', 'F227', 'F229-F230'].includes(item.group));
    const raw = fs.readFileSync(path.join(capsule, item.artifact));
    assert.equal(raw.length, item.bytes);
    assert.equal(sha256(raw), item.sha256);
    assert.equal(gitId('blob', raw), item.blob);
    return { ...item, finding: item.group };
}) };
copy('qualified-source-membership-271.json', Buffer.from(JSON.stringify(corrected, null, 2) + '\n'));
const verified = verifyMembership(capsule, corrected);
assert.equal(verified.memberships, 78);
const external = [];
for (const item of read(path.join(parallel, 'finding-F227-257', 'collection-contract-history-v1.json')).referenceContracts)
{
    const artifact = 'evidence/F227/' + item.path.replaceAll('\\', '/'), raw = fs.readFileSync(path.join(capsule, artifact));
    assert.equal(item.wholeFile, true);
    assert.equal(raw.length, item.bytes);
    assert.equal(sha256(raw), item.sha256);
    external.push({ repository: item.repository, commit: item.commit, role: item.role,
        path: item.logicalPath.replaceAll('\\', '/'), artifact, bytes: item.bytes, sha256: item.sha256,
        computedBlob: gitId('blob', raw), notSelectedRoleRuntime: true,
        boundary: 'Whole common reference-source fingerprint; not external commit/tree membership or executing runtime/comparer/culture proof.' });
}
assert.equal(external.length, 4);
copy('external-source.json', Buffer.from(JSON.stringify(external, null, 2) + '\n'));
const previousCommands = fs.readdirSync(path.join(previous, 'commands')).filter(x => x.endsWith('.json')).sort()
    .map(file => read(path.join(previous, 'commands', file)));
assert(previousCommands.every(x => x.exitCode === 0 && x.rootWaited && x.redirectedStreamsDrained));
const commands = [];
function git(label, argv)
{
    assert.ok(commands.length < 2);
    const observation = guard(), args = ['--no-pager', '-C', repo, ...argv], startedUtc = new Date().toISOString();
    const result = spawnSync('git', args, { cwd: repo, windowsHide: true, timeout: 90000,
        maxBuffer: 8 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', GIT_PAGER: '' } });
    const prefix = 'commands/' + String(commands.length + 1).padStart(3, '0') + '-' + label;
    write(path.join(root, prefix + '.stdout'), result.stdout ?? Buffer.alloc(0));
    write(path.join(root, prefix + '.stderr'), result.stderr ?? Buffer.alloc(0));
    const record = { label, argv: args, pid: result.pid, observation, startedUtc, endedUtc: new Date().toISOString(),
        exitCode: result.status, error: result.error?.message ?? null, stdout: prefix + '.stdout', stderr: prefix + '.stderr',
        rootWaited: result.status !== null && !result.error, redirectedStreamsDrained: !result.error,
        unobservedCreationOrDescendantClosureNotClaimed: true };
    commands.push(record);
    jsonWrite(path.join(root, prefix + '.json'), record);
    assert.ifError(result.error);
    assert.equal(result.status, 0);
    return result.stdout.toString('utf8');
}
const before = {
    head: fs.readFileSync(path.join(previous, previousCommands.find(x => x.label === 'reserved-head-before').stdout), 'utf8'),
    status: fs.readFileSync(path.join(previous, previousCommands.find(x => x.label === 'reserved-status-before').stdout), 'utf8'),
};
const after = {
    head: git('reserved-head-after', ['rev-parse', 'HEAD']),
    status: git('reserved-status-after', ['status', '--porcelain', '--untracked-files=normal']),
};
assert.deepEqual(after, before);
jsonWrite(path.join(root, 'COMMANDS.json'), commands);
jsonWrite(path.join(root, 'ARCHIVE.json'), {
    findings: ['F225', 'F226', 'F227', 'F229', 'F230'], ownerCopies, rawGitVerification: verified,
    sourceUtilityRoots: commands.length, prior266SourceUtilityRoots: previousCommands.length,
    previousFailure: { actualTool: 'autoperf-source-package-266 completed with exit code 1',
        seam: 'Required source.finding namespace omitted; repeated guidance paths across source groups collided in verifier key.',
        correction: 'Fresh metadata adds finding=existing group for every source;78 captures, raw objects, hashes and paths unchanged.',
        failedCollectorOrOriginalOutputsEditedOrReplayed: false },
    before, after, reservedHeadStatusEqual: true, externalWholeSourceFingerprints: external.length,
    productNativeOrComparisonStarts: 0, rejectedIsNotMeasuredNoGain: true, finalizationRequiresIndependentPublisher: true,
    allSourceCommandsRetained: true, universalProcessIdlenessNotClaimed: true
});
for (const file of inventory(previous))
    copy('evidence/failed-parent266/' + file, fs.readFileSync(path.join(previous, file)));
for (const file of inventory(root)) copy('evidence/parent271/' + file, fs.readFileSync(path.join(root, file)));
for (const file of ['Accept-Preparations-265.mjs', 'accepted-preparations-265.json', 'owner-advancement-265.json'])
    copy('evidence/parent/' + file, fs.readFileSync(path.join(parallel, file)));
copy('source-objects.mjs', fs.readFileSync(path.join(prior, 'source-objects.mjs')));
for (const file of ['README.md', 'verify.mjs', '.gitattributes'])
{
    const raw = fs.readFileSync(path.join(capsule, file));
    evidence.push({ file, bytes: raw.length, sha256: sha256(raw) });
}
jsonWrite(path.join(capsule, 'evidence-index.json'), { files: evidence, ownerCopies,
    boundary: 'Preserved failed266 and exact old outputs; fresh namespace correction271. Actual tool completion added only after real return.' });
console.log(JSON.stringify({ completeOwnerFiles: 514, copiedEvidenceFiles: evidence.length,
    sourceMemberships: verified.memberships, rawGitObjects: verified.objects,
    externalWholeSourceFingerprints: external.length, directNewSourceUtilityRoots: commands.length,
    preservedPriorSourceUtilityRoots: previousCommands.length, productNativeOrComparisonStarts: 0,
    ownFinalToolExitNotSelfAttested: true }));
