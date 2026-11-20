import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePe, parsePdb, parseXml } from './metadata-reader.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const local = logical => {
    assert.ok(!path.isAbsolute(logical) && !logical.includes(':') && !logical.split(/[\\/]/).includes('..'));
    return path.join(root, ...logical.split(/[\\/]/));
};
const json = logical => JSON.parse(fs.readFileSync(local(logical), 'utf8').replace(/^\uFEFF/, ''));
const copies = json('authoritative-copies.json');
const normalize = logical => logical.replaceAll('/', '\\').toLowerCase();
const origins = new Map(copies.map(item => [normalize(item.actualSourcePath), item]));
const selected = original => {
    const entry = origins.get(normalize(original));
    assert.ok(entry, original);
    return fs.readFileSync(local(entry.file));
};
for (const item of copies)
{
    const bytes = fs.readFileSync(local(item.file));
    assert.equal(bytes.length, item.bytes);
    assert.equal(hash(bytes), item.sha256);
    assert.equal(item.actualAlreadyPublishedEvidenceCommit, 'e3f5a048e12bcca5074266751afd07825359f88c');
}
const acceptance = json('coordinator-acceptance.json');
assert.equal(acceptance.finding, 'F148');
assert.equal(acceptance.outcome, 'rejected');
assert.equal(acceptance.actualSelectedPairs.length, 3);
for (const pair of acceptance.actualSelectedPairs)
{
    const pe = parsePe(selected(pair.dll)), pdb = parsePdb(selected(pair.pdb));
    assert.equal(pe.mvid, pair.actualParsedMvid);
    assert.ok(pe.codeView.some(item => item.guid === pdb.guid && item.stamp === pdb.stamp && item.age === 1));
    assert.deepEqual([pdb.guid, pdb.stamp], pair.actualParsedPdbId);
    const document = pdb.documents.find(item => item.name === pair.actualFreshDocument.name);
    assert.ok(document);
    assert.equal(document.algorithm, '8829d00f-11b8-4213-878b-770e8597ac16');
    assert.equal(document.checksum.toUpperCase(), hash(selected(pair.source)));
    assert.equal(document.checksum.toUpperCase(), pair.actualFreshDocument.checksum);
}
const all = node => [node, ...node.children.flatMap(all)];
const name = node => node.name.split(':').at(-1);
let rowsChecked = 0;
const distinct = new Set();
for (const report of acceptance.actualSelectedNativeReports)
{
    const bytes = selected(report.file);
    assert.equal(hash(bytes), report.sha256);
    const nodes = all(parseXml(bytes.toString('utf8')));
    const rows = nodes.filter(node => name(node) === 'UnitTestResult');
    const definitions = nodes.filter(node => name(node) === 'UnitTest');
    const entries = nodes.filter(node => name(node) === 'TestEntry');
    assert.equal(rows.length, 20);
    assert.equal(new Set(rows.map(node => node.attributes.executionId)).size, 20);
    const counters = nodes.find(node => name(node) === 'Counters').attributes;
    assert.equal(Number(counters.total), 20);
    assert.equal(Number(counters.passed), 20);
    assert.equal(Number(counters.failed), 0);
    for (const row of rows)
    {
        const actual = row.attributes;
        assert.equal(actual.outcome, 'Passed');
        const definition = definitions.find(node => node.attributes.id === actual.testId);
        assert.ok(definition);
        assert.equal(definition.attributes.name, actual.testName);
        assert.equal(definition.children.find(node => name(node) === 'Execution').attributes.id, actual.executionId);
        assert.equal(entries.filter(node => node.attributes.testId === actual.testId &&
            node.attributes.executionId === actual.executionId).length, 1);
        distinct.add(actual.testName);
    }
    for (const method of ['SeparateWritesRetainStringsAndEchoOriginalBytes', 'PayloadAbove4096TraversesRealReads',
        'IndependentStreamIdsAndHandlerOwnership'])
    {
        const expected = `Microsoft.AspNetCore.Server.Kestrel.Core.Tests.CompiledSampleProducerTests.ActualSample_${method}(bidirectional: True)`;
        assert.equal(rows.filter(row => row.attributes.testName === expected).length, 1);
    }
    rowsChecked += rows.length;
}
assert.equal(rowsChecked, 40);
assert.equal(distinct.size, 20);
for (const role of ['Original', 'CurrentDefault'])
{
    const source = fs.readFileSync(local(`study/inputs/${role}/Baseline/Program.cs`), 'utf8');
    const body = source.slice(source.indexOf('static async Task handleBidirectionalStream('),
        source.indexOf('static async Task ApplySpecialCommands('));
    assert.ok(body.startsWith('static async Task handleBidirectionalStream('));
    assert.equal([...body.matchAll(/new byte\[4096\]/g)].length, 1);
    assert.ok(body.indexOf('new byte[4096]') < body.indexOf('while ('));
    assert.ok(body.indexOf('await outputPipe.WriteAsync(outputMemory);') < body.indexOf('memory.Span.Clear();'));
    assert.ok(body.includes('var outputMemory = memory[..length];'));
    assert.ok(!body.includes('ArrayPool'));
    const image = json(`study/evidence/${role}-Baseline-image.json`);
    assert.equal(image.actualAllImageFiles.length, 156);
    assert.equal(new Set(image.actualAllImageFiles.map(item => item.file)).size, 156);
}
const budget = json('closed-budget.json');
assert.equal(budget.findingId, 'F148');
assert.equal(budget.closed, true);
assert.equal(budget.actualComparisons, 0);
assert.deepEqual(budget.authorizations, []);
assert.equal(budget.actualUnusedAuthorizationsPermanentlyClosed, 3);
assert.equal(acceptance.actualWholeDefaultFrameworkExecuted, false);
assert.equal(acceptance.actualMaterialRealClientStreamChurnEstablished, false);
assert.equal(acceptance.actualBufferPoolCandidateWritten, false);
if (process.argv.includes('--require-seal'))
{
    for (const item of json('capsule-file-hashes.json').files)
    {
        const bytes = fs.readFileSync(local(item.file));
        assert.equal(bytes.length, item.bytes);
        assert.equal(hash(bytes), item.sha256);
    }
}
console.log(JSON.stringify({ audit: 'PASS', actualSelectedUnchangedCopiedFiles: copies.length,
    actualFreshPePdbRawDocumentPairs: 3, actualHistoricalNativeXmlRows: rowsChecked,
    actualDistinctHistoricalCaseValuesAcrossRoles: distinct.size,
    actualBufferBytesOncePerBidirectionalHandler: 4096, actualComparisons: 0,
    actualNoNativeTargetOrCounterStarted: true, actualOmittedFullImagesRehashed: false,
    actualFullCompilerInputAttestation: false, actualWholeDefaultFrameworkClaimed: false }, null, 2));
