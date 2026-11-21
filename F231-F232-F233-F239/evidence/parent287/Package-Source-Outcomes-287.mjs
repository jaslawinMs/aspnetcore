import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitId, sha256, verifyMembership } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const root = import.meta.dirname, parallel = path.dirname(root), session = path.dirname(parallel);
const repo = String.raw`C:\src\aspnetcore`, published = path.join(session, 'autoperf-published-results');
const capsule = path.join(published, 'F231-F232-F233-F239'), commands = [];
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
function write(file, raw)
{
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
const json = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
function git(directory, label, args, input)
{
    assert.ok(commands.length < 7);
    const policyBytes = fs.readFileSync(path.join(parallel, 'policy.json')), policy = JSON.parse(policyBytes);
    assert.deepEqual(Object.keys(policy.independentFindingPreparationWorkers).sort(), ['F209', 'F234', 'F242', 'F243']);
    assert.equal(policy.actualWorkerBuildHoldActive, false);
    assert.equal(policy.buildAndTestWorkQuiesced, false);
    assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
    const argv = ['--no-pager', '-C', directory, ...args], startedUtc = new Date().toISOString();
    const result = spawnSync('git', argv, { cwd: directory, input, timeout: 90000, windowsHide: true,
        maxBuffer: 32 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: '', GIT_TERMINAL_PROMPT: '0' } });
    const prefix = 'commands/' + String(commands.length + 1).padStart(3, '0') + '-' + label;
    write(path.join(root, prefix + '.stdout'), result.stdout ?? Buffer.alloc(0));
    write(path.join(root, prefix + '.stderr'), result.stderr ?? Buffer.alloc(0));
    if (input) write(path.join(root, prefix + '.stdin'), input);
    const record = { executable: 'git', argv, cwd: directory, pid: result.pid, startedUtc, endedUtc: new Date().toISOString(),
        exitCode: result.status, error: result.error?.message ?? null, policySha256: sha256(policyBytes),
        rootWaited: result.status !== null && !result.error, bothRawStreamsReturned: !result.error,
        creationBoundOrUniversalDescendantCensusNotClaimed: true, productNativeOrTimingAdmission: false,
        stdout: prefix + '.stdout', stderr: prefix + '.stderr', stdin: input ? prefix + '.stdin' : null };
    commands.push(record);
    json(path.join(root, prefix + '.json'), record);
    assert.ifError(result.error);
    assert.equal(result.status, 0, (result.stderr ?? Buffer.alloc(0)).toString('utf8'));
    return result.stdout.toString('utf8');
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
function copyTree(from, to)
{
    for (const file of inventory(from))
    {
        const raw = fs.readFileSync(path.join(from, file)), output = path.join(to, file);
        write(output, raw);
        assert.ok(fs.readFileSync(output).equals(raw));
    }
}
const before = { head: git(repo, 'reserved-head-before', ['rev-parse', 'HEAD']),
    status: git(repo, 'reserved-status-before', ['status', '--porcelain', '--untracked-files=normal']),
    globalSha256: sha256(fs.readFileSync(path.join(repo, 'global.json'))) };
assert.equal(before.head.trim(), '24875ef5dabb55567870b39f6eb0002170435e2f');
assert.equal(before.globalSha256, 'C3D6E7C29D94C34B6343D4A2EFE74164929F29BFA26FD84B5E2020A15091CD53');
assert.equal(git(published, 'publication-parent', ['rev-parse', 'HEAD']).trim(), '98d9df08542180ded25b88bae43b6ed5e29b2b26');
assert.equal(git(published, 'publication-status', ['status', '--porcelain', '--untracked-files=normal']).trim(), '?? F231-F232-F233-F239/');
assert.equal(fs.readFileSync(path.join(capsule, '.gitattributes'), 'utf8').trim(), '* -text');
const source = path.join(parallel, 'source-qualification-284'), membership = read(path.join(source, 'source-membership.json'));
assert.deepEqual(verifyMembership(source, membership), { objects: 55, memberships: 54 });
assert.equal(read(path.join(source, 'actual-source-tool-284.json')).actualReturnedExitCode, 0);
for (const item of membership.sources)
{
    const raw = fs.readFileSync(path.join(source, item.artifact));
    assert.equal(raw.length, item.bytes);
    assert.equal(sha256(raw), item.sha256);
    assert.equal(gitId('blob', raw), item.blob);
}
const claimRoot = path.join(parallel, 'finding-F231-F232-F233-267'), directoryRoot = path.join(parallel, 'finding-F239-269');
assert.equal(inventory(claimRoot).length, 272);
assert.equal(inventory(directoryRoot).length, 462);
copyTree(claimRoot, path.join(capsule, 'evidence', 'preparation267'));
copyTree(directoryRoot, path.join(capsule, 'evidence', 'preparation269'));
copyTree(source, path.join(capsule, 'evidence', 'source284'));
for (const item of membership.objects) write(path.join(capsule, item.file), fs.readFileSync(path.join(source, item.file)));
json(path.join(capsule, 'source-membership.json'), { ...membership,
    sources: membership.sources.map(item => ({ ...item, artifact: 'evidence/source284/' + item.artifact })) });
write(path.join(capsule, 'source-objects.mjs'), fs.readFileSync(path.join(published, 'F150-F206-F215-F220', 'source-objects.mjs')));
const attributes = inventory(capsule).sort();
assert.deepEqual(attributes.filter(x => path.basename(x) === '.gitattributes'), ['.gitattributes']);
const attributeResult = git(published, 'all-current-capsule-text-attributes', ['check-attr', 'text', '--stdin'],
    Buffer.from(attributes.map(x => 'F231-F232-F233-F239/' + x).join('\n') + '\n'));
const attributeLines = attributeResult.trimEnd().split(/\r?\n/);
assert.equal(attributeLines.length, attributes.length);
for (const line of attributeLines) assert.ok(line.endsWith(': text: unset'), line);
const after = { head: git(repo, 'reserved-head-after', ['rev-parse', 'HEAD']),
    status: git(repo, 'reserved-status-after', ['status', '--porcelain', '--untracked-files=normal']),
    globalSha256: sha256(fs.readFileSync(path.join(repo, 'global.json'))) };
assert.deepEqual(before, after);
json(path.join(root, 'COMMANDS.json'), commands);
json(path.join(root, 'ARCHIVE.json'), {
    observedUtc: new Date().toISOString(), before, after, reservedStateUnchanged: true,
    preparationPayloadsByteAccepted: 727, completePreparationFilesCopied: 734,
    rawMemberships: 54, rawGitObjects: 55, exactRolePairs: 26, rolePairs: 27,
    source284GitMetadataRoots: 10, packaging287GitMetadataRoots: commands.length,
    aggregateCoordinatorSourceAndPackagingRoots: 17,
    capsuleLocalTextUnsetPathsChecked: attributes.length, noNestedAttributeOverrides: true,
    scopedAttributesCreatedBeforeSealAndStage: true, noSharedGitConfigurationEditsOrNormalization: true,
    oldPreparationsFailuresHelpersAndSealBytesPreserved: true,
    productNativeTestsCandidatesOrComparisons: 0, actualEnclosingToolCompletionNotSelfAttested: true
});
copyTree(root, path.join(capsule, 'evidence', 'parent287'));
assert.deepEqual(inventory(capsule).filter(x => path.basename(x) === '.gitattributes'), ['.gitattributes']);
const files = inventory(path.join(capsule, 'evidence'), 'evidence').map(file =>
{
    const raw = fs.readFileSync(path.join(capsule, file));
    return { file, bytes: raw.length, sha256: sha256(raw) };
});
json(path.join(capsule, 'evidence-index.json'), { files, completeCopyOf267269284AndParent287: true,
    sourceAndRawBytesNotNormalized: true, sourceOnly: true });
console.log(JSON.stringify({ completePreparationFilesCopied: 734, wholeMemberships: 54, rawGitObjects: 55,
    copiedEvidenceFiles: files.length, textUnsetPathsChecked: attributes.length, coordinatorGitMetadataRoots: 17,
    productNativeTestsCandidatesOrComparisons: 0, portableAuditAndActualToolReturnStillRequired: true }));
