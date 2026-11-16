import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const run = path.join(root, 'autoperf-runs', 'F109');
const repo = 'C:\\src\\aspnetcore';
const index = path.join(run, 'producer-source-copies.json');
const original = fs.readFileSync(index);
const rows = JSON.parse(original.toString('utf8').replace(/^\uFEFF/, ''));
assert.equal(rows.length, 20, 'Do not overwrite completed supplemental source capture.');
const relative = 'src\\Identity\\Extensions.Core\\src\\LoggerEventIds.cs';
const gitPath = relative.replaceAll('\\', '/');
const git = (...args) => execFileSync('git', args, { cwd: repo });
const text = (...args) => git(...args).toString('utf8').trim();
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const current = rows[0].actualDefaultRevision;
const canonical = git('show', `${current}:${gitPath}`);
const baselineBytes = git('show', `${baseline}:${gitPath}`);
const raw = fs.readFileSync(path.join(repo, relative));
const digest = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
assert.deepEqual(canonical, baselineBytes);
const currentBlob = text('rev-parse', `${current}:${gitPath}`);
assert.equal(currentBlob, text('rev-parse', `${baseline}:${gitPath}`));
assert.equal(currentBlob, text('hash-object', '--path=' + gitPath, relative));
const row = {
    path: relative, currentDefaultGitBlob: currentBlob, baselineGitBlob: currentBlob,
    workingGitBlob: currentBlob, equalityVerified: true,
    rawSnapshot: path.join('producer-source', relative), rawSha256: digest(raw), rawBytes: raw.length,
    canonicalSnapshot: path.join('current-default-canonical', relative),
    canonicalSha256: digest(canonical), canonicalBytes: canonical.length,
    baselineSnapshot: path.join('baseline-canonical', relative),
    baselineSha256: digest(baselineBytes), baselineBytes: baselineBytes.length,
    actualDefaultRevision: current, actualCapturedDefaultTree: rows[0].actualCapturedDefaultTree,
    actualFetchedMainRevision: rows[0].actualFetchedMainRevision,
    canonicalGitCleanFilterSeparateFromRawBytes: true,
    supplementalReason: 'Bind actual UserManager false-result event9/name to its declaring source before shipping implementation.',
    capturedAt: new Date().toISOString()
};
for (const [file, content] of [
    [row.rawSnapshot, raw], [row.canonicalSnapshot, canonical], [row.baselineSnapshot, baselineBytes],
    [path.join('development', 'producer-source-copies-initial20.json'), original]
])
{
    const destination = path.join(run, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content, { flag: 'wx' });
}
rows.push(row);
fs.writeFileSync(index, JSON.stringify(rows, null, 2) + '\n');
console.log('F109:21 original/current-default/raw scoped source identities;initial20-row record retained exactly.');
