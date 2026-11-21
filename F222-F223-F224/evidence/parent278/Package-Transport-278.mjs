import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitId, sha256 } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const root = import.meta.dirname, parallel = path.dirname(root), session = path.dirname(parallel);
const published = path.join(session, 'autoperf-published-results'), folder = 'F222-F223-F224';
const capsule = path.join(published, folder), repo = String.raw`C:\src\aspnetcore`, commands = [];
const run275 = path.join(session, 'autoperf-runs', folder, 'publication-275');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
function write(file, raw)
{
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw, { flag: 'wx' });
}
const json = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
function git(directory, label, args)
{
    assert.ok(commands.length < 12);
    const policyBytes = fs.readFileSync(path.join(parallel, 'policy.json')), policy = JSON.parse(policyBytes);
    assert.deepEqual(Object.keys(policy.independentFindingPreparationWorkers).sort(), ['F209', 'F231', 'F234', 'F239']);
    assert.equal(policy.actualWorkerBuildHoldActive, false);
    assert.equal(policy.buildAndTestWorkQuiesced, false);
    assert.equal(fs.existsSync(path.join(parallel, 'benchmark-exclusive.lease.json')), false);
    const argv = ['-c', 'core.longpaths=true', '--no-pager', '-C', directory, ...args], startedUtc = new Date().toISOString();
    const result = spawnSync('git', argv, { cwd: directory, windowsHide: true, timeout: 90000,
        maxBuffer: 8 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: '', GIT_TERMINAL_PROMPT: '0' } });
    const prefix = 'commands/' + String(commands.length + 1).padStart(3, '0') + '-' + label;
    write(path.join(root, prefix + '.stdout'), result.stdout ?? Buffer.alloc(0));
    write(path.join(root, prefix + '.stderr'), result.stderr ?? Buffer.alloc(0));
    const record = { executable: 'git', argv, cwd: directory, pid: result.pid, startedUtc,
        endedUtc: new Date().toISOString(), exitCode: result.status, error: result.error?.message ?? null,
        policySha256: sha256(policyBytes), rootWaited: result.status !== null && !result.error,
        bothRawStreamsReturned: !result.error, universalDescendantCensusNotClaimed: true };
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
    for (const relative of inventory(from))
    {
        const raw = fs.readFileSync(path.join(from, relative));
        write(path.join(to, relative), raw);
        assert.ok(fs.readFileSync(path.join(to, relative)).equals(raw));
    }
}
assert.equal(git(published, 'expected-parent', ['rev-parse', 'HEAD']).trim(), 'b7aa4b83c609a8bcce50967ce59c9b296c10abce');
const oldSealRaw = fs.readFileSync(path.join(capsule, 'capsule-file-hashes.json')), oldSeal = JSON.parse(oldSealRaw);
const originalNames = [...oldSeal.files.map(x => x.file), 'capsule-file-hashes.json'].sort();
assert.deepEqual(inventory(capsule).sort(), originalNames);
for (const item of oldSeal.files)
{
    const raw = fs.readFileSync(path.join(capsule, item.file));
    assert.equal(raw.length, item.bytes, item.file);
    assert.equal(sha256(raw), item.sha256, item.file);
}
const stagedNames = git(published, 'owned-stage-names', ['diff', '--cached', '--name-only']).trim().split(/\r?\n/).sort();
assert.deepEqual(stagedNames, originalNames.map(x => folder + '/' + x).sort());
const staged = git(published, 'owned-stage-identities', ['ls-files', '--stage', '--', folder]).trim();
const recordedStage = read(path.join(run275, 'publication-invocations.json')).at(-1).stdout.trim();
assert.equal(staged, recordedStage);
assert.equal(git(published, 'no-unrelated-unstaged-changes', ['diff', '--name-only']).trim(), '');
const reservedBefore = { head: git(repo, 'reserved-head-before', ['rev-parse', 'HEAD']),
    status: git(repo, 'reserved-status-before', ['status', '--porcelain', '--untracked-files=normal']),
    globalSha256: sha256(fs.readFileSync(path.join(repo, 'global.json'))) };
const privateBefore = sha256(fs.readFileSync(path.join(session, 'autoperf-campaign.json')));
assert.equal(privateBefore, '36C7E7019F3B5F50CB627F90E30E773272BC95D06AFDFFB69FD16E7D9E15D417');
const diagnosis = read(path.join(parallel, 'publication-transport-277', 'DIAGNOSIS.json'));
assert.equal(diagnosis.mismatches.length, 21);
assert.ok(diagnosis.mismatches.every(x => x.stagedPayloadExactlyCrLfToLf));
git(published, 'unstage-owned-failed-attempt-only', ['restore', '--staged', '--', folder]);
assert.equal(git(published, 'owned-untracked-before-archive', ['status', '--porcelain', '--untracked-files=normal']).trim(), '?? ' + folder + '/');
const archived = path.join(root, 'failed-capsule275');
assert.equal(fs.existsSync(archived), false);
fs.renameSync(capsule, archived);
copyTree(archived, path.join(capsule, 'evidence', 'attempt275'));
for (const file of ['.gitattributes', 'README.md', 'verify.mjs'])
    write(path.join(capsule, file), fs.readFileSync(path.join(root, 'templates', file)));
copyTree(run275, path.join(capsule, 'evidence', 'failed-publication275'));
copyTree(path.join(parallel, 'publication-transport-277'), path.join(capsule, 'evidence', 'transport277'));
const attributePaths = ['.gitattributes', 'README.md', 'verify.mjs'].map(x => folder + '/' + x).concat(
    diagnosis.mismatches.map(x => folder + '/evidence/attempt275/' + x.file.slice(folder.length + 1)));
const attributes = git(published, 'scoped-archival-attributes', ['check-attr', 'text', '--', ...attributePaths]).trim().split(/\r?\n/);
assert.equal(attributes.length, attributePaths.length);
assert.ok(attributes.every(x => x.endsWith(': text: unset')));
const reservedAfter = { head: git(repo, 'reserved-head-after', ['rev-parse', 'HEAD']),
    status: git(repo, 'reserved-status-after', ['status', '--porcelain', '--untracked-files=normal']),
    globalSha256: sha256(fs.readFileSync(path.join(repo, 'global.json'))) };
assert.deepEqual(reservedBefore, reservedAfter);
assert.equal(git(published, 'fresh-capsule-only', ['status', '--porcelain', '--untracked-files=normal']).trim(), '?? ' + folder + '/');
assert.equal(sha256(fs.readFileSync(path.join(session, 'autoperf-campaign.json'))), privateBefore);
for (const item of oldSeal.files)
    assert.equal(sha256(fs.readFileSync(path.join(capsule, 'evidence', 'attempt275', item.file))), item.sha256);
assert.ok(fs.readFileSync(path.join(capsule, 'evidence', 'attempt275', 'capsule-file-hashes.json')).equals(oldSealRaw));
json(path.join(root, 'COMMANDS.json'), commands);
json(path.join(root, 'ARCHIVE.json'), {
    observedUtc: new Date().toISOString(), reservedBefore, reservedAfter, privateCampaignUnchangedSha256: privateBefore,
    originalSealedCapsuleBytesUnchanged: true, originalSealedFiles: oldSeal.files.length,
    originalCapsuleSealSha256: sha256(oldSealRaw), archivedOriginalLocation: archived,
    originalSourceScopeNotReplayedOrBroadened: true, failedPublisher275EditedOrReplayed: false,
    ownedIndexUnstageOnly: true, scopedArchivalAttributesUnsetFor: attributePaths.length,
    sharedGitConfigOrSourceBytesChanged: false, transportGitRoots: commands.length,
    newProductOrExternalInputs: 0, productNativeTestsCandidatesOrComparisons: 0,
    actualEnclosingToolExitNotSelfAttested: true
});
const parent = path.join(capsule, 'evidence', 'parent278');
for (const file of ['ACCEPTANCE.json', 'Package-Transport-278.mjs', 'COMMANDS.json', 'ARCHIVE.json'])
    write(path.join(parent, file), fs.readFileSync(path.join(root, file)));
copyTree(path.join(root, 'commands'), path.join(parent, 'commands'));
copyTree(path.join(root, 'templates'), path.join(parent, 'templates'));
const files = inventory(path.join(capsule, 'evidence'), 'evidence').map(file =>
{
    const raw = fs.readFileSync(path.join(capsule, file));
    return { file, bytes: raw.length, sha256: sha256(raw) };
});
json(path.join(capsule, 'transport-index.json'), { files, originalSealedCapsulePreserved: true,
    failedAttemptAndDiagnosisRetained: true, sourceOnly: true });
const config = read(path.join(run275, 'publication-config.json'));
config.run = path.join(session, 'autoperf-runs', folder, 'publication-278');
config.evidenceCommitTitle = 'Preserve XML and analyzer source assessments with byte-exact archival transport';
config.evidenceCommitDescription += ' Initial275precommit21file EOL-stage failure and original sealed capsule preserved unchanged. Fresh278scoped archival -text attributes before first seal/stage; full staged/remote byte gates remain mandatory, no shared config or source normalization.';
for (const outcome of config.outcomes)
    outcome.note += ' Initial275publication stopped precommit on21GitEOLtransforms; fresh278transport preserves original sealed capsule and failed invocations unchanged with scoped archival attributes, no source normalization or gate waiver.';
json(path.join(config.run, 'publication-config.json'), config);
console.log(JSON.stringify({ copiedTransportFiles: files.length, preservedOriginalSealedFiles: oldSeal.files.length,
    stagedConversionFailureCount: 21, archivalAttributeChecks: attributePaths.length,
    transportGitRoots: commands.length, productNativeTestsCandidatesOrComparisons: 0,
    awaitingActualEnclosingCompletionAndPortableAudit: true }));
