import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = String.raw`C:\src\aspnetcore\src\OpenApi\test\Microsoft.AspNetCore.OpenApi.SourceGenerators.Tests\snapshots`;
const evidence = String.raw`C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-runs\F142\existing-tests\snapshot-update-001`;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const normalize = text => text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const files = fs.readdirSync(root).filter(file => file.endsWith('#OpenApiXmlCommentSupport.generated.received.cs')).sort();
assert.equal(files.length, 17);
const prepared = [];
for (const received of files)
{
    const verified = received.replace('.received.cs', '.verified.cs');
    const before = fs.readFileSync(path.join(root, verified));
    const actual = fs.readFileSync(path.join(root, received));
    const source = before.toString('utf8');
    const newline = source.includes('\r\n') ? '\r\n' : '\n';
    const guard = ['                if (methodComment.Parameters is { Count: > 0})',
        '                {', '                    foreach (var parameterComment in methodComment.Parameters)'].join(newline);
    const replacement = ['                if (methodComment.Parameters is { Count: > 0})',
        '                {', '                    var methodParameters = methodInfo.GetParameters();',
        '                    foreach (var parameterComment in methodComment.Parameters)'].join(newline);
    const beforeCall = 'global::System.Linq.Enumerable.SingleOrDefault(methodInfo.GetParameters(), info => info.Name == parameterComment.Name)';
    const afterCall = 'global::System.Linq.Enumerable.SingleOrDefault(methodParameters, info => info.Name == parameterComment.Name)';
    assert.equal(source.split(guard).length, 2, verified);
    assert.equal(source.split(beforeCall).length, 2, verified);
    const after = Buffer.from(source.replace(guard, replacement).replace(beforeCall, afterCall), 'utf8');
    assert.equal(normalize(after.toString('utf8')), normalize(actual.toString('utf8')),
        'The actual received snapshot differs by more than the exact measured local-array seam: ' + verified);
    prepared.push({ verified, received, before, actual, after });
}
fs.mkdirSync(evidence);
fs.mkdirSync(path.join(evidence, 'before'));
fs.mkdirSync(path.join(evidence, 'received'));
for (const file of prepared)
{
    fs.writeFileSync(path.join(evidence, 'before', file.verified), file.before, { flag: 'wx' });
    fs.writeFileSync(path.join(evidence, 'received', file.received), file.actual, { flag: 'wx' });
    fs.writeFileSync(path.join(root, file.verified), file.after);
}
const result = { recordedAt: new Date().toISOString(), actualOnlyDependentGoldenSnapshotsChanged: true,
    actualExactTwoLineMeasuredSeamAndNoOtherGeneratedCodeChanges: true,
    actualExistingFileBomAndLineEndingsPreserved: true,
    actualReceivedComparisonBoundary: 'Generated C# text; only UTF8 BOM representation and CRLF-to-LF are normalized for comparison, never rewritten in the existing golden.',
    files: prepared.map(file => ({ file: file.verified, beforeSha256: hash(file.before), afterSha256: hash(file.after), actualReceivedSha256: hash(file.actual) })) };
fs.writeFileSync(path.join(evidence, 'update.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualSnapshotsUpdated: prepared.length, actualExpectedDeltaOnly: true, actualOriginalPhysicalEncodingPreserved: true }));
