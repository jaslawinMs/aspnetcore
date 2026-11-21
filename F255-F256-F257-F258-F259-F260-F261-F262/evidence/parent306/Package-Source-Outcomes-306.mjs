import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitId, sha256, verifyMembership } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const root = import.meta.dirname, parallel = path.dirname(root), session = path.dirname(parallel);
const repo = String.raw`C:\src\aspnetcore`, published = path.join(session, 'autoperf-published-results');
const folder = 'F255-F256-F257-F258-F259-F260-F261-F262', capsule = path.join(published, folder), commands = [];
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
    assert.deepEqual(Object.keys(policy.independentFindingPreparationWorkers).sort(), ['F209', 'F269', 'F271', 'F274']);
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
        actualRootExitCode: result.status, error: result.error?.message ?? null, policySha256: sha256(policyBytes),
        rootWaited: result.status !== null && !result.error, bothRawStreamsReturned: !result.error,
        creationBoundOrUniversalDescendantCensusNotClaimed: true, productNativeOrTimingAdmission: false,
        stdout: prefix + '.stdout', stderr: prefix + '.stderr', stdin: input ? prefix + '.stdin' : null };
    commands.push(record);
    json(path.join(root, prefix + '.json'), record);
    assert.ifError(result.error);
    assert.equal(result.status, 0);
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
assert.equal(git(published, 'publication-parent', ['rev-parse', 'HEAD']).trim(), '04dc4efb943f537825beebbefe5a7126502bf765');
assert.equal(git(published, 'publication-status', ['status', '--porcelain', '--untracked-files=normal']).trim(), '?? ' + folder + '/');
assert.equal(fs.readFileSync(path.join(capsule, '.gitattributes'), 'utf8').trim(), '* -text');
const source = path.join(parallel, 'source-qualification-305'), m305 = read(path.join(source, 'source-membership.json'));
const parser = path.join(parallel, 'finding-F260-F261-F262-302'), m302 = read(path.join(parser, 'source-membership.json'));
assert.deepEqual(verifyMembership(source, m305), { objects: 91, memberships: 90 });
assert.deepEqual(verifyMembership(parser, m302), { objects: 36, memberships: 36 });
assert.equal(read(path.join(source, 'actual-source-tool-305.json')).actualReturnedExitCode, 0);
assert.equal(sha256(fs.readFileSync(path.join(parser, 'SEAL.json'))), 'DD0670F2F74CC7FBAF27E03E942BF387E412615063D17FE089E82FB9389E1968');
const parserIndex = read(path.join(parser, 'FILE-INVENTORY.json'));
for (const item of parserIndex.files)
{
    const raw = fs.readFileSync(path.join(parser, item.file));
    assert.equal(raw.length, item.bytes);
    assert.equal(sha256(raw), item.sha256);
}
let completePreparations = 0;
for (const [directory, count, label] of [['finding-F255-F256-293', 334, 'preparation293'],
    ['finding-F257-298', 105, 'preparation298'], ['finding-F258-F259-299', 235, 'preparation299'],
    ['finding-F260-F261-F262-302', 178, 'preparation302']])
{
    const from = path.join(parallel, directory);
    assert.equal(inventory(from).length, count);
    copyTree(from, path.join(capsule, 'evidence', label));
    completePreparations += count;
}
assert.equal(completePreparations, 852);
copyTree(source, path.join(capsule, 'evidence', 'source305'));
const objects = new Map(), sources = [];
for (const [from, membership, prefix] of [[source, m305, 'evidence/source305/'], [parser, m302, 'evidence/preparation302/']])
{
    for (const item of membership.sources)
    {
        const raw = fs.readFileSync(path.join(from, item.artifact));
        assert.equal(raw.length, item.bytes);
        assert.equal(sha256(raw), item.sha256);
        assert.equal(gitId('blob', raw), item.blob);
        sources.push({ ...item, artifact: prefix + item.artifact });
    }
    for (const item of membership.objects)
    {
        const raw = fs.readFileSync(path.join(from, item.file));
        if (objects.has(item.sha))
        {
            assert.deepEqual(objects.get(item.sha), item);
            assert.ok(fs.readFileSync(path.join(capsule, item.file)).equals(raw));
        }
        else
        {
            write(path.join(capsule, item.file), raw);
            objects.set(item.sha, item);
        }
    }
}
assert.equal(objects.size, 117);
json(path.join(capsule, 'source-membership.json'), { sources, objects: [...objects.values()] });
assert.deepEqual(verifyMembership(capsule, read(path.join(capsule, 'source-membership.json'))), { objects: 117, memberships: 126 });
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
    completePreparationFilesCopied: completePreparations, rawMemberships: 126, rawGitObjects: 117,
    exactRolePairs: 62, rolePairs: 63, source305GitMetadataRoots: 14, coordinator302GitMetadataRoots: 19,
    packaging306GitMetadataRoots: commands.length, source305PlusPackagingRoots: 14 + commands.length,
    aggregateDistinctCoordinator302305306Roots: 19 + 14 + commands.length,
    accounting: '302 and305 have distinct explicit source caps;305pluspackaging23roots,302pluspackaging28roots;42combined is disclosed, not asserted to fit one32-root scope.',
    capsuleLocalTextUnsetPathsChecked: attributes.length, noNestedAttributeOverrides: true,
    scopedAttributesCreatedBeforeSealAndStage: true, noSharedGitConfigurationEditsOrNormalization: true,
    oldPreparationsFailuresHelpersAndSealBytesPreserved: true, noRetroactiveOwnerProceduralApproval: true,
    productNativeTestsCandidatesOrComparisonsForTheseEight: 0, actualEnclosingToolCompletionNotSelfAttested: true
});
copyTree(root, path.join(capsule, 'evidence', 'parent306'));
assert.deepEqual(inventory(capsule).filter(x => path.basename(x) === '.gitattributes'), ['.gitattributes']);
const files = inventory(path.join(capsule, 'evidence'), 'evidence').map(file =>
{
    const raw = fs.readFileSync(path.join(capsule, file));
    return { file, bytes: raw.length, sha256: sha256(raw) };
});
json(path.join(capsule, 'evidence-index.json'), { files, completeCopyOfFourPreparations305AndParent306: true,
    sourceAndRawBytesNotNormalized: true, sourceOnly: true });
console.log(JSON.stringify({ completePreparationFilesCopied: 852, wholeMemberships: 126, rawGitObjects: 117,
    copiedEvidenceFiles: files.length, textUnsetPathsChecked: attributes.length,
    distinctCoordinatorSourceAndPackagingRoots: 19 + 14 + commands.length,
    productNativeTestsCandidatesComparisonsForTheseEight: 0, portableAuditAndActualToolReturnStillRequired: true }));
