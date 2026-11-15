import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const [root, published] = process.argv.slice(2);
assert(root && published, 'Explicit historical session root and F082 evidence directory required.');
const manifest = JSON.parse(fs.readFileSync(path.join(published, 'authoritative-copy-manifest.json'), 'utf8').replace(/^\uFEFF/, ''));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const rows = manifest.map(row =>
{
    let original;
    if (row.kind === 'native-git-diff')
    {
        original = execFileSync('git', ['-C', 'C:\\src\\aspnetcore', 'diff', '--binary',
            '37e809ead5824bc753a1c3d56f11615bdb1296c5', row.original, '--',
            'src/Security/Authentication/MicrosoftAccount/src/MicrosoftAccountHandler.cs',
            'src/Security/Authentication/test/MicrosoftAccountTests.cs']);
    }
    else
    {
        const base = row.kind === 'run' ? path.join(root, 'autoperf-runs', 'F082')
            : row.kind === 'session' ? root : row.kind === 'pdb-tools' ? path.join(root, 'autoperf-runs', 'F071', 'tools') : undefined;
        assert(base);
        original = fs.readFileSync(path.join(base, row.original));
    }
    const actual = fs.readFileSync(path.join(published, row.destination));
    assert(original.equals(actual), `Authoritative copy differs:${row.destination}`);
    assert.equal(hash(actual), row.sha256);
    assert.equal(actual.length, row.bytes);
    return { ...row, original_sha256: hash(original), published_sha256: hash(actual), exactly_equal: true };
});
for (const [source, destination] of [
    ['F082-package.log', 'package-command.log'],
    ['F082-verify-raw-copies.mjs', 'historical-raw-copy-verifier.mjs'],
])
{
    const original = fs.readFileSync(path.join(root, source));
    const actual = fs.readFileSync(path.join(published, destination));
    assert(original.equals(actual));
    rows.push({ kind: 'session', original: source, destination, bytes: actual.length,
        original_sha256: hash(original), published_sha256: hash(actual), exactly_equal: true });
}
assert.equal(new Set(rows.map(r => r.destination)).size, rows.length);
fs.writeFileSync(path.join(published, 'raw-file-copy-verification.json'), JSON.stringify({
    candidate: 'F082', verified_copies: rows.length, transformations: 'None;report filenames normalized only.', rows,
}, null, 2) + '\n');
console.log(`F082:${rows.length} exact authoritative source/report/log/native-patch copy mappings verified.`);
