import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '.');
const bytes = logical => fs.readFileSync(path.join(root, ...logical.split('/')));
const read = logical => JSON.parse(bytes(logical).toString('utf8'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const object = (type, sha) => {
    const value = bytes('git-objects/' + sha);
    assert.equal(crypto.createHash('sha1').update(`${type} ${value.length}\0`).update(value).digest('hex'), sha);
    return value;
};
const entries = value => {
    const result = [];
    for (let offset = 0; offset < value.length;)
    {
        const space = value.indexOf(32, offset), zero = value.indexOf(0, space + 1);
        assert.ok(space > offset && zero > space && zero + 21 <= value.length);
        result.push({ mode: value.subarray(offset, space).toString('ascii'),
            name: value.subarray(space + 1, zero).toString('utf8'),
            sha: value.subarray(zero + 1, zero + 21).toString('hex') });
        offset = zero + 21;
    }
    return result;
};
const list = (directory = root, prefix = '') => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    assert.equal(entry.isSymbolicLink(), false);
    return entry.isDirectory() ? list(path.join(directory, entry.name), prefix + entry.name + '/') : [prefix + entry.name];
});
const input = read('evidence-inputs.json').files;
assert.equal(new Set(input.map(item => item.file)).size, input.length);
for (const item of input)
{
    assert.equal(bytes(item.file).length, item.bytes);
    assert.equal(hash(bytes(item.file)), item.sha256, item.file);
}
const allowed = new Set([...input.map(item => item.file), 'evidence-inputs.json',
    'historical-audit.json', 'capsule-file-hashes.json', 'publication.json']);
assert.ok(list().every(item => allowed.has(item)));
if (process.argv.includes('--require-seal'))
{
    const material = read('capsule-file-hashes.json').files;
    assert.deepEqual(material.map(item => item.file).sort(),
        list().filter(item => !['capsule-file-hashes.json', 'publication.json'].includes(item)).sort());
    for (const item of material)
    {
        assert.equal(bytes(item.file).length, item.bytes);
        assert.equal(hash(bytes(item.file)), item.sha256, item.file);
    }
}
const source = read('source-records.json');
assert.equal(source.original, '37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(source.observedDefault, 'd3483989953ae3cccd773aea5ea04cb0c7198531');
assert.equal(source.canonicalRetainedFinding, 'F201');
assert.equal(source.canonicalDispositionAtAliasClosure, 'pending');
assert.deepEqual(source.duplicateFindings, ['F202', 'F203']);
assert.equal(source.actualNoRuntimeOrPerformanceConclusion, true);
assert.equal(source.records.length, 12);
const helpers = [];
for (const record of source.records)
{
    assert.equal(record.commit, record.role === 'Original' ? source.original : source.observedDefault);
    let current = object('commit', record.commit).toString('utf8').match(/^tree ([a-f0-9]{40})$/m)[1];
    const parts = record.repoPath.split('/');
    for (let index = 0; index < parts.length; index++)
    {
        const matches = entries(object('tree', current)).filter(item => item.name === parts[index]);
        assert.equal(matches.length, 1);
        assert.equal(matches[0].mode, index === parts.length - 1 ? '100644' : '40000');
        current = matches[0].sha;
    }
    assert.equal(current, record.blobSha1);
    const value = object('blob', current);
    assert.deepEqual(bytes(record.file), value);
    assert.equal(hash(value), record.sha256);
    if (record.helperLfSha256)
    {
        const text = value.toString('utf8');
        const matches = [...text.matchAll(/^    file static class JsonNodeExtensions\r?\n[\s\S]*?^    \}\r?$/gm)];
        assert.equal(matches.length, 1);
        const helper = matches[0][0].replaceAll('\r\n', '\n');
        assert.equal(hash(Buffer.from(helper)), record.helperLfSha256);
        assert.equal(record.helperStartLine, text.slice(0, matches[0].index).split('\n').length);
        assert.equal(record.helperLineCount, helper.split('\n').length);
        helpers.push(helper);
    }
    if (record.repoPath.endsWith('/XmlCommentGenerator.Emitter.cs'))
    {
        const text = value.toString('utf8');
        assert.ok(text.includes('internal static string GenerateXmlCommentSupportSource('));
        assert.ok(text.includes('context.AddSource("OpenApiXmlCommentSupport.generated.cs", GenerateXmlCommentSupportSource('));
    }
    if (record.repoPath.endsWith('/XmlCommentGenerator.cs'))
    {
        const text = value.toString('utf8');
        assert.ok(text.includes('context.RegisterSourceOutput(result,'));
        assert.ok(text.includes('Emit(context, compiledXmlFileComments, generatedCommentsFromCompilation, groupedAddOpenApiInvocations);'));
    }
}
assert.equal(helpers.length, 8);
assert.ok(helpers.every(item => item === helpers[0]));
console.log(JSON.stringify({
    actualInputFilesHashVerified: input.length, actualRawGitMembershipSourceFiles: source.records.length,
    actualIdenticalEmitterAndSnapshotHelperCopies: helpers.length, sourceRoles: [source.original, source.observedDefault],
    outcome: 'F202/F203 duplicate emitted-helper aliases only; F201 still pending at this closure',
    actualNativeGeneratorRuntimeOrBenchmarkExecuted: false, actualPerformanceConclusion: false,
    actualComparisonAuthorizations: 0
}));
