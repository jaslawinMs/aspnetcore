import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256 } from './evidence/attempt275/source-objects.mjs';

const root = path.resolve(process.argv[2] ?? import.meta.dirname);
function content(relative)
{
    const file = path.resolve(root, ...relative.split(/[\\/]/));
    assert.ok(file.startsWith(root + path.sep), relative);
    return fs.readFileSync(file);
}
const json = file => JSON.parse(content(file).toString('utf8').replace(/^\uFEFF/, ''));
function checked(item)
{
    const raw = content(item.file);
    assert.equal(raw.length, item.bytes, item.file);
    assert.equal(sha256(raw), item.sha256, item.file);
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
assert.match(content('.gitattributes').toString('utf8'), /^\* -text\r?\n$/);
const index = json('transport-index.json');
assert.equal(new Set(index.files.map(x => x.file)).size, index.files.length);
assert.deepEqual(inventory(path.join(root, 'evidence'), 'evidence').sort(), index.files.map(x => x.file).sort());
for (const item of index.files) checked(item);
const inner = path.join(root, 'evidence', 'attempt275');
const result = spawnSync(process.execPath, [path.join(inner, 'verify.mjs'), inner, '--require-seal'],
    { windowsHide: true, maxBuffer: 1024 * 1024 });
assert.ifError(result.error);
assert.equal(result.status, 0, result.stderr.toString('utf8'));
const source = JSON.parse(result.stdout.toString('utf8'));
assert.equal(source.sourceMemberships, 46);
assert.equal(source.rawGitObjects, 63);
assert.equal(source.externalWholeFingerprints, 7);
assert.equal(source.productNativeTestsCandidatesOrComparisons, 0);
const diagnosis = json('evidence/transport277/DIAGNOSIS.json');
assert.equal(diagnosis.mismatches.length, 21);
assert.ok(diagnosis.mismatches.every(x => x.stagedPayloadExactlyCrLfToLf));
assert.equal(diagnosis.actualFailedPublisherTool.commitPushIssueOrLedgerStepReached, false);
const archive = json('evidence/parent278/ARCHIVE.json');
assert.deepEqual(archive.reservedBefore, archive.reservedAfter);
assert.equal(archive.originalSealedCapsuleBytesUnchanged, true);
assert.equal(archive.originalSourceScopeNotReplayedOrBroadened, true);
assert.equal(archive.transportGitRoots, 12);
assert.equal(archive.productNativeTestsCandidatesOrComparisons, 0);
const commands = json('evidence/parent278/COMMANDS.json');
assert.equal(commands.length, 12);
assert.ok(commands.every(x => x.exitCode === 0 && x.rootWaited && x.bothRawStreamsReturned));
const completion = json('transport-terminal.json');
assert.equal(completion.actualToolCompleted, true);
assert.equal(completion.actualToolExitCode, 0);
assert.equal(completion.collectorEditedOrReplayed, false);
if (fs.existsSync(path.join(root, 'capsule-file-hashes.json')) || process.argv.includes('--require-seal'))
{
    const seal = json('capsule-file-hashes.json');
    for (const item of seal.files) checked(item);
    assert.deepEqual(inventory(root).filter(x => !['capsule-file-hashes.json', 'publication.json'].includes(x)).sort(),
        seal.files.map(x => x.file).sort());
}
console.log(JSON.stringify({ findings: ['F222', 'F223', 'F224'], copiedTransportFiles: index.files.length,
    preservedOriginalSourceCapsule: true, historicalSourceAudit: source, stagedConversionFailureCount: 21,
    scopedArchivalTextConversionDisabled: true, sourceMemberships: 46, rawGitObjects: 63,
    externalWholeFingerprints: 7, productNativeTestsCandidatesOrComparisons: 0 }));
