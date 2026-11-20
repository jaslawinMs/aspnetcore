import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? import.meta.dirname);
const digest = (algorithm, bytes) => crypto.createHash(algorithm).update(bytes).digest('hex');
function file(relative)
{
    const resolved = path.resolve(root, relative.replaceAll('/', path.sep));
    assert.ok(resolved.startsWith(root + path.sep), relative);
    assert.equal(fs.lstatSync(resolved).isSymbolicLink(), false);
    return resolved;
}
const bytes = relative => fs.readFileSync(file(relative));
const read = relative => JSON.parse(bytes(relative).toString('utf8').replace(/^\uFEFF/, ''));
function check(relative, expectedLength, expectedHash)
{
    const content = bytes(relative);
    assert.equal(content.length, expectedLength, relative);
    assert.equal(digest('sha256', content).toUpperCase(), expectedHash.toUpperCase(), relative);
    return content;
}
function treeEntries(content)
{
    const result = new Map();
    let offset = 0;
    while (offset < content.length)
    {
        const space = content.indexOf(32, offset);
        const nul = content.indexOf(0, space + 1);
        assert.ok(space > offset && nul > space && nul + 21 <= content.length);
        const name = content.subarray(space + 1, nul).toString('utf8');
        assert.equal(result.has(name), false);
        result.set(name, { mode: content.subarray(offset, space).toString('ascii'), sha: content.subarray(nul + 1, nul + 21).toString('hex') });
        offset = nul + 21;
    }
    return result;
}
const evidence = read('evidence-index.json');
for (const item of evidence.files)
{
    check(item.file, item.bytes, item.sha256);
}
const dictionary = read('evidence/F214/changed-file-index.json');
assert.deepEqual(dictionary.shippingChanges, []);
assert.equal(bytes('evidence/F214/shipping-changes.diff').length, 0);
for (const item of dictionary.artifactOnlyFiles)
{
    check('evidence/F214/' + item.path.replaceAll('\\', '/'), item.length, item.sha256);
}
const metadata = read('evidence/F236/changed-file-diff-hash-index.json');
assert.deepEqual(metadata.changes, []);
assert.equal(bytes('evidence/F236/changed-files.diff').length, 0);
for (const item of metadata.artifactHashesExcludingThisIndex)
{
    check('evidence/F236/' + item.path.replaceAll('\\', '/'), item.bytes, item.sha256);
}
const membership = read('source-membership.json');
const objects = new Map();
for (const item of membership.objects)
{
    const content = check(item.file, item.bytes, item.sha256);
    assert.equal(digest('sha1', Buffer.concat([Buffer.from(`${item.type} ${content.length}\0`), content])), item.sha);
    assert.equal(objects.has(item.sha), false);
    objects.set(item.sha, { ...item, content });
}
assert.deepEqual([...new Set(membership.sources.map(item => item.commit))].sort(), [
    '37e809ead5824bc753a1c3d56f11615bdb1296c5',
    'd3483989953ae3cccd773aea5ea04cb0c7198531',
].sort());
for (const item of membership.sources)
{
    const commit = objects.get(item.commit);
    assert.equal(commit.type, 'commit');
    let current = commit.content.toString('utf8').match(/^tree ([a-f0-9]{40})$/m)[1];
    const parts = item.path.split('/');
    for (const [index, part] of parts.entries())
    {
        const tree = objects.get(current);
        assert.equal(tree.type, 'tree');
        const entry = treeEntries(tree.content).get(part);
        assert.ok(entry, item.path);
        assert.equal(entry.mode, index === parts.length - 1 ? '100644' : '40000');
        current = entry.sha;
    }
    assert.equal(current, item.blob);
    assert.equal(objects.get(current).type, 'blob');
    if (item.compilationSource)
    {
        const captured = check(item.compilationSource.file, item.compilationSource.bytes, item.compilationSource.sha256);
        assert.equal(captured.toString('utf8').replaceAll('\r\n', '\n'), objects.get(current).content.toString('utf8').replaceAll('\r\n', '\n'));
        const represented = item.compilationSource.declaredHashRepresentation === 'worktree' ? captured : objects.get(current).content;
        assert.equal(digest('sha256', represented).toUpperCase(), item.compilationSource.declaredSha256);
    }
}
for (const role of ['original', 'default'])
{
    const xml = bytes(`evidence/F214/${role}-unit-results.xml`).toString('utf8');
    assert.equal([...xml.matchAll(/<test\b[^>]*\bresult="Pass"/g)].length, 18);
    assert.equal([...xml.matchAll(/<test\b[^>]*\bresult="(?:Fail|Skip)"/g)].length, 0);
    const disassembly = bytes(`evidence/F214/${role}-jit-disassembly.txt`).toString('utf8');
    assert.equal([...disassembly.matchAll(/; Assembly listing for method Microsoft\.AspNetCore\.Internal\.AdaptiveCapacityDictionary`2/g)].length, 6);
}
const jit = read('evidence/F214/jit-determination.json');
assert.equal(jit.allocationCountersOrPerformanceMeasurements, false);
assert.equal(jit.noBoxingInInspectedNullGuards, true);
for (const diagnostic of jit.diagnostics)
{
    assert.equal(diagnostic.sections.length, 6);
    assert.ok(diagnostic.sections.every(section => section.normalTier0 && !section.boxHelperPresent));
}
const cleanup = read('evidence/F214/owned-descendant-cleanup.json');
assert.equal(cleanup.allTwoRecordedIdentitiesTerminal, true);
assert.equal(cleanup.noNameBasedTermination, true);
assert.equal(read('evidence/F214/HANDOFF.json').executionControlException.fullyCompliant, false);
const tests = read('evidence/F236/correctness-test-results.json');
assert.equal(tests.status, 'blocked-before-test-discovery');
assert.equal(tests.requestedSourceRows, 13);
assert.equal(tests.tests.reduce((sum, item) => sum + item.rows, 0), 13);
assert.equal(tests.executedRows, 0);
assert.equal(tests.passedRows, 0);
const histogram = read('evidence/F236/native-fixture-cardinalities-v2.json');
assert.equal(histogram.declarationCount, 52);
assert.equal(histogram.records.length, 52);
const actualHistogram = Object.fromEntries([1, 2, 3, 4].map(count => [count, histogram.records.filter(item => item.constructorParameters === count).length]));
assert.deepEqual(actualHistogram, { 1: 18, 2: 31, 3: 2, 4: 1 });
assert.deepEqual(histogram.parameterHistogram.map(item => item.recordDeclarations), [18, 31, 2, 1]);
assert.equal(metadata.comparisonAuthorizations, 0);
assert.equal(read('evidence/F214/HANDOFF.json').materialityAndPerformance.comparisonAuthorizations, 0);
const sealPath = path.join(root, 'capsule-file-hashes.json');
if (process.argv.includes('--require-seal') || fs.existsSync(sealPath))
{
    const seal = read('capsule-file-hashes.json');
    for (const item of seal.files)
    {
        check(item.file, item.bytes, item.sha256);
    }
}
console.log(JSON.stringify({
    findings: ['F214', 'F236'],
    disposition: 'rejected-at-explicit-bounded-evidence',
    copiedEvidenceFilesVerified: evidence.files.length,
    rawGitObjectsVerified: objects.size,
    commitPathMembershipsVerified: membership.sources.length,
    linkedRowsPassedPerRole: 18,
    blockedMvcSourceRows: 13,
    mvcAssertionsExecuted: 0,
    correctedFixtureDeclarations: 52,
    productChanges: 0,
    performanceComparisons: 0,
    offlineOnly: true,
}));
