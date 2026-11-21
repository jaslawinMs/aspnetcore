import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gitId, sha256, verifyMembership } from './source-objects.mjs';

const root = path.resolve(process.argv[2] ?? import.meta.dirname);
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
function checked(item)
{
    const file = path.resolve(root, item.file);
    assert.ok(file.startsWith(root + path.sep));
    const raw = fs.readFileSync(file);
    assert.equal(raw.length, item.bytes, item.file);
    assert.equal(sha256(raw), item.sha256, item.file);
    return raw;
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
assert.equal(fs.readFileSync(path.join(root, '.gitattributes'), 'utf8').trim(), '* -text');
const index = read('evidence-index.json');
for (const item of index.files) checked(item);
assert.deepEqual(inventory(path.join(root, 'evidence'), 'evidence').sort(), index.files.map(x => x.file).sort());
const membership = read('source-membership.json'), verification = verifyMembership(root, membership);
assert.deepEqual(verification, { objects: 117, memberships: 126 });
for (const item of membership.sources)
{
    const raw = checked({ ...item, file: item.artifact });
    assert.equal(gitId('blob', raw), item.blob);
}
const pairs = membership.sources.filter(x => x.role === 'Original').map(item =>
{
    const other = membership.sources.find(x => x.role === 'Default' && x.finding === item.finding && x.path === item.path);
    assert.ok(other);
    return { path: item.path, exact: item.blob === other.blob && item.mode === other.mode };
});
assert.equal(pairs.length, 63);
assert.equal(pairs.filter(x => x.exact).length, 62);
assert.equal(pairs.find(x => !x.exact).path, 'src/Servers/Kestrel/Core/src/KestrelServerOptions.cs');
const sealExists = fs.existsSync(path.join(root, 'capsule-file-hashes.json'));
if (process.argv.includes('--require-seal')) assert.equal(sealExists, true);
if (sealExists)
{
    const seal = read('capsule-file-hashes.json');
    for (const item of seal.files) checked(item);
    const extras = inventory(root).filter(x => !seal.files.some(item => item.file === x));
    assert.ok(extras.every(x => ['capsule-file-hashes.json', 'publication.json'].includes(x)));
}
console.log(JSON.stringify({ result: 'PASS', boundary: 'SOURCE_ONLY_NOT_RUNTIME_OR_MEASUREMENT',
    ...verification, wholeArtifactsRehashed: 126, completeEvidenceFiles: index.files.length,
    completeOriginalPreparationFiles: 852, exactOriginalDefaultPairs: 62, pairs: 63,
    sealVerified: sealExists, productTestsCandidatesComparisonsQualified: 0 }));
