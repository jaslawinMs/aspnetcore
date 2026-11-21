import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitId, sha256 } from '../../autoperf-published-results/F150-F206-F215-F220/source-objects.mjs';

const root = import.meta.dirname, session = path.dirname(path.dirname(root));
const published = path.join(session, 'autoperf-published-results'), folder = 'F222-F223-F224';
const run = path.join(session, 'autoperf-runs', folder, 'publication-275');
const prior = JSON.parse(fs.readFileSync(path.join(run, 'publication-invocations.json'), 'utf8'));
const last = prior.at(-1);
assert.equal(last.command, 'git');
assert.deepEqual(last.arguments.slice(-4), ['ls-files', '--stage', '--', folder]);
assert.equal(prior.some(x => x.command === 'git' && x.arguments.includes('commit')), false);
assert.equal(prior.some(x => x.command === 'git' && x.arguments.includes('push')), false);
assert.equal(prior.some(x => x.command === 'gh' && x.arguments.includes('create')), false);
const mismatches = [];
for (const line of last.stdout.trim().split(/\r?\n/))
{
    const match = line.match(/^100644 ([a-f0-9]{40}) 0\t(.+)$/);
    assert.ok(match);
    assert.ok(match[2].startsWith(folder + '/'));
    const raw = fs.readFileSync(path.join(published, match[2])), rawBlob = gitId('blob', raw);
    if (rawBlob !== match[1])
    {
        const lf = Buffer.from(raw.toString('utf8').replaceAll('\r\n', '\n'));
        mismatches.push({ file: match[2], worktreeBlob: rawBlob, worktreeBytes: raw.length,
            worktreeSha256: sha256(raw), stagedBlob: match[1], crlfToLfBlob: gitId('blob', lf),
            crlfToLfBytes: lf.length, stagedEqualsCrLfToLfTransformation: gitId('blob', lf) === match[1] });
    }
}
assert.ok(mismatches.length);
const commands = [];
function git(label, argv, input)
{
    assert.ok(commands.length < 2);
    const args = ['--no-pager', '-C', published, ...argv], startedUtc = new Date().toISOString();
    const result = spawnSync('git', args, { cwd: published, input, windowsHide: true, timeout: 90000,
        maxBuffer: 8 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: '' } });
    function write(file, raw) { fs.writeFileSync(path.join(root, file), raw, { flag: 'wx' }); }
    write(label + '.stdout', result.stdout ?? Buffer.alloc(0));
    write(label + '.stderr', result.stderr ?? Buffer.alloc(0));
    if (input) write(label + '.stdin', input);
    const record = { executable: 'git', argv: args, pid: result.pid, startedUtc, endedUtc: new Date().toISOString(),
        exitCode: result.status, error: result.error?.message ?? null, rootWaited: result.status !== null && !result.error,
        bothRawStreamsReturned: !result.error, universalDescendantCensusNotClaimed: true };
    commands.push(record);
    write(label + '.json', JSON.stringify(record, null, 2) + '\n');
    assert.ifError(result.error);
    assert.equal(result.status, 0);
    return result.stdout;
}
git('effective-attributes', ['check-attr', '--all', '--', ...mismatches.map(x => x.file)]);
const raw = git('staged-blobs', ['cat-file', '--batch'], Buffer.from(mismatches.map(x => x.stagedBlob).join('\n') + '\n'));
let offset = 0;
for (const item of mismatches)
{
    const end = raw.indexOf(10, offset), header = raw.subarray(offset, end).toString('ascii').match(/^([a-f0-9]{40}) blob (\d+)$/);
    assert.equal(header[1], item.stagedBlob);
    const count = Number(header[2]), body = raw.subarray(end + 1, end + 1 + count);
    assert.equal(raw[end + 1 + count], 10);
    assert.equal(gitId('blob', body), item.stagedBlob);
    const working = fs.readFileSync(path.join(published, item.file));
    assert.ok(body.equals(Buffer.from(working.toString('utf8').replaceAll('\r\n', '\n'))));
    item.stagedBytesActuallyRead = count;
    item.stagedPayloadExactlyCrLfToLf = true;
    offset = end + 2 + count;
}
assert.equal(offset, raw.length);
const privateBytes = fs.readFileSync(path.join(session, 'autoperf-campaign.json'));
assert.equal(sha256(privateBytes), '36C7E7019F3B5F50CB627F90E30E773272BC95D06AFDFFB69FD16E7D9E15D417');
const diagnosis = { actualFailedPublisherTool: { shellId: 'autoperf-publish-275', exitCode: 1,
    stoppingLine: 120, commitPushIssueOrLedgerStepReached: false },
    mismatches, readOnlyNativeRoots: commands, directSourceRolesOrCapturedBytesChanged: false,
    privateCampaignSha256Unchanged: sha256(privateBytes), failedPublisherOrCapsuleEditedOrReplayed: false,
    disposition: 'Preserve original sealed failed capsule and attempt. A separate fresh capsule needs scoped archival -text attributes before its first staging/seal, with the original sealed capsule nested unchanged.' };
fs.writeFileSync(path.join(root, 'DIAGNOSIS.json'), JSON.stringify(diagnosis, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ stagedByteMismatches: mismatches.length, mismatches,
    privateCampaignUnchanged: true, noCommitPushIssueOrLedgerStepReached: true, freshTransportPackageRequired: true }));
