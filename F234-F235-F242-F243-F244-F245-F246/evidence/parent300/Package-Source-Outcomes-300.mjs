import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitId, sha256, verifyMembership } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const root = import.meta.dirname, parallel = path.dirname(root), session = path.dirname(parallel);
const repo = String.raw`C:\src\aspnetcore`, published = path.join(session, 'autoperf-published-results');
const folder = 'F234-F235-F242-F243-F244-F245-F246', capsule = path.join(published, folder), commands = [];
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
function write(file, raw)
{
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
const json = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
function git(directory, label, args, input)
{
    assert.ok(commands.length < 9);
    const policyBytes = fs.readFileSync(path.join(parallel, 'policy.json')), policy = JSON.parse(policyBytes);
    assert.deepEqual(Object.keys(policy.independentFindingPreparationWorkers).sort(), ['F209', 'F255', 'F257', 'F258']);
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
function reserved(when)
{
    return { branch: git(repo, 'reserved-branch-' + when, ['symbolic-ref', '--short', 'HEAD']),
        head: git(repo, 'reserved-head-' + when, ['rev-parse', 'HEAD']),
        status: git(repo, 'reserved-status-' + when, ['status', '--porcelain', '--untracked-files=normal']),
        globalSha256: sha256(fs.readFileSync(path.join(repo, 'global.json'))) };
}
const before = reserved('before');
assert.equal(before.branch.trim(), 'autoperf/F145-hoist-large-response-utf8-encoding');
assert.equal(before.head.trim(), '24875ef5dabb55567870b39f6eb0002170435e2f');
assert.equal(before.globalSha256, 'C3D6E7C29D94C34B6343D4A2EFE74164929F29BFA26FD84B5E2020A15091CD53');
assert.equal(git(published, 'publication-parent', ['rev-parse', 'HEAD']).trim(), 'd66fa862edeab82645baec65f0390473cb0b1298');
assert.equal(git(published, 'publication-status', ['status', '--porcelain', '--untracked-files=normal']).trim(), '?? ' + folder + '/');
assert.equal(fs.readFileSync(path.join(capsule, '.gitattributes'), 'utf8').trim(), '* -text');
const source = path.join(parallel, 'source-qualification-297'), membership = read(path.join(source, 'source-membership.json'));
assert.deepEqual(verifyMembership(source, membership), { objects: 110, memberships: 104 });
assert.equal(read(path.join(source, 'actual-source-tool-297.json')).actualReturnedExitCode, 0);
for (const item of membership.sources)
{
    const raw = fs.readFileSync(path.join(source, item.artifact));
    assert.equal(raw.length, item.bytes);
    assert.equal(sha256(raw), item.sha256);
    assert.equal(gitId('blob', raw), item.blob);
}
let completePreparations = 0;
for (const [directory, count, label] of [['finding-F234-F235-268', 136, 'preparation268'],
    ['finding-F234-F235-279', 44, 'preparation279'], ['finding-F234-F235-286', 49, 'preparation286'],
    ['finding-F242-282', 276, 'preparation282'], ['finding-F243-F246-283', 186, 'preparation283'],
    ['finding-F243-F246-290', 65, 'preparation290']])
{
    const from = path.join(parallel, directory);
    assert.equal(inventory(from).length, count);
    copyTree(from, path.join(capsule, 'evidence', label));
    completePreparations += count;
}
assert.equal(completePreparations, 756);
copyTree(source, path.join(capsule, 'evidence', 'source297'));
for (const item of membership.objects) write(path.join(capsule, item.file), fs.readFileSync(path.join(source, item.file)));
json(path.join(capsule, 'source-membership.json'), { ...membership,
    sources: membership.sources.map(item => ({ ...item, artifact: 'evidence/source297/' + item.artifact })) });
write(path.join(capsule, 'source-objects.mjs'), fs.readFileSync(path.join(published, 'F150-F206-F215-F220', 'source-objects.mjs')));
const attributes = inventory(capsule).sort();
assert.deepEqual(attributes.filter(x => path.basename(x) === '.gitattributes'), ['.gitattributes']);
const attributeResult = git(published, 'all-current-capsule-text-attributes', ['check-attr', 'text', '--stdin'],
    Buffer.from(attributes.map(x => folder + '/' + x).join('\n') + '\n'));
const attributeLines = attributeResult.trimEnd().split(/\r?\n/);
assert.equal(attributeLines.length, attributes.length);
for (const line of attributeLines) assert.ok(line.endsWith(': text: unset'), line);
const after = reserved('after');
assert.deepEqual(before, after);
json(path.join(root, 'COMMANDS.json'), commands);
json(path.join(root, 'ARCHIVE.json'), {
    observedUtc: new Date().toISOString(), before, after, reservedStateUnchanged: true,
    completePreparationFilesCopied: completePreparations, rawMemberships: 104, rawGitObjects: 110,
    exactRolePairs: 51, rolePairs: 52, source297GitMetadataRoots: 12, packaging300GitMetadataRoots: commands.length,
    aggregateCoordinatorSourceAndPackagingRoots: 12 + commands.length,
    capsuleLocalTextUnsetPathsChecked: attributes.length, noNestedAttributeOverrides: true,
    scopedAttributesCreatedBeforeSealAndStage: true, noSharedGitConfigurationEditsOrNormalization: true,
    oldPreparationsFailuresHelpersAndSealBytesPreserved: true,
    oldContextAccountingAndMissingHelperFailureNotRetroactivelyApproved: true,
    productNativeTestsCandidatesOrComparisonsForTheseSeven: 0, actualEnclosingToolCompletionNotSelfAttested: true
});
copyTree(root, path.join(capsule, 'evidence', 'parent300'));
assert.deepEqual(inventory(capsule).filter(x => path.basename(x) === '.gitattributes'), ['.gitattributes']);
const files = inventory(path.join(capsule, 'evidence'), 'evidence').map(file =>
{
    const raw = fs.readFileSync(path.join(capsule, file));
    return { file, bytes: raw.length, sha256: sha256(raw) };
});
json(path.join(capsule, 'evidence-index.json'), { files, completeCopyOfSixPreparations297AndParent300: true,
    sourceAndRawBytesNotNormalized: true, sourceOnly: true });
console.log(JSON.stringify({ completePreparationFilesCopied: 756, wholeMemberships: 104, rawGitObjects: 110,
    copiedEvidenceFiles: files.length, textUnsetPathsChecked: attributes.length, coordinatorGitMetadataRoots: 12 + commands.length,
    productNativeTestsCandidatesOrComparisonsForTheseSeven: 0, portableAuditAndActualToolReturnStillRequired: true }));
