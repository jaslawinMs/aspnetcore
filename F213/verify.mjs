import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] ?? path.dirname(fileURLToPath(import.meta.url)));
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const gitBlob = bytes => crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const finding = read('original-finding.json'), assessment = read('assessment.json');
assert.equal(finding.card_id, 'fixed-size-positional-list');
assert.equal(finding.severity, 'informational');
assert.equal(assessment.findingId, 'F213');
assert.equal(assessment.outcome, 'rejected');
assert.equal(assessment.sourceOnlyGate, true);
assert.equal(assessment.performanceImprovementClaim, false);
assert.equal(assessment.measuredNoGainClaim, false);
assert.equal(assessment.zeroRuntimeCostClaim, false);
assert.equal(assessment.actualCandidateWritten, false);
const sources = read('source-manifest.json');
assert.equal(sources.original, '37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(sources.observedDefault, 'd3483989953ae3cccd773aea5ea04cb0c7198531');
assert.equal(sources.files.length, 4);
for (const item of sources.files) {
    assert(!item.file.includes('..'));
    const bytes = fs.readFileSync(path.join(root, item.file));
    assert.equal(bytes.length, item.bytes);
    assert.equal(sha256(bytes), item.sha256);
    assert.equal(gitBlob(bytes), item.gitBlob);
    assert.equal(item.ref, sources.observedDefault);
}
const helper = fs.readFileSync(path.join(root, 'source', 'MediaTypeHelpers.cs'), 'utf8');
assert.equal(gitBlob(Buffer.from(helper)), '656d264b3eead6818e74571a2f4ed730352d2027');
assert.equal(sources.originalTargetBlob, '656d264b3eead6818e74571a2f4ed730352d2027');
assert(helper.includes('private static readonly List<Encoding> SupportedEncodings'));
const table = helper.slice(helper.indexOf('SupportedEncodings ='), helper.indexOf('// TODO Binary format'));
assert.deepEqual([...table.matchAll(/Encoding\.(\w+)/g)].map(match => match[1]), ['UTF8', 'Unicode', 'ASCII', 'Latin1']);
assert(helper.includes('for (var i = 0; i < SupportedEncodings.Count; i++)'));
assert(helper.includes('SupportedEncodings[i].WebName'));
const fallback = helper.slice(helper.indexOf('if (encoding == null)'), helper.indexOf('// Only allow specific encodings.'));
assert(fallback.includes('encoding = state.Encoding!;'));
assert(fallback.includes('return true;'));
assert(fallback.length < 400);
const middleware = fs.readFileSync(path.join(root, 'source', 'HttpLoggingMiddleware.cs'), 'utf8');
assert.equal([...middleware.matchAll(/MediaTypeHelpers\.TryGetEncodingForMediaType/g)].length, 1);
assert(middleware.includes('MediaTypeHelpers.TryGetEncodingForMediaType(request.ContentType,'));
const response = fs.readFileSync(path.join(root, 'source', 'ResponseBufferingStream.cs'), 'utf8');
assert.equal([...response.matchAll(/MediaTypeHelpers\.TryGetEncodingForMediaType/g)].length, 1);
const firstWrite = response.slice(response.indexOf('private void OnFirstWriteCore()'), response.indexOf('public void DisableBuffering()'));
assert(firstWrite.includes('MediaTypeHelpers.TryGetEncodingForMediaType'));
assert(firstWrite.includes('HeadersWritten = true;'));
const options = fs.readFileSync(path.join(root, 'source', 'MediaTypeOptions.cs'), 'utf8');
assert(options.includes('If charset is not specified in the contentType, the encoding will default to UTF-8.'));
assert(options.includes('mediaType.Encoding ??= Encoding.UTF8;'));
const history = read('source-history.json');
assert.equal(history.latestTargetChange.commit, 'af54f0bb40c06319bdd149891e51f5b6b720f043');
assert.equal(history.exhaustiveRelatedIssueOrPrSearchClaim, false);
const budgets = read('closed-budgets.json');
assert.equal(budgets.length, 1);
assert.equal(budgets[0].findingId, 'F213');
assert.equal(budgets[0].maximumComparisons, 3);
assert.equal(budgets[0].closed, true);
assert.deepEqual(budgets[0].authorizations, []);
assert.equal(budgets[0].actualComparisons, 0);
assert.equal(budgets[0].actualUnusedAuthorizationsPermanentlyClosed, 3);
const sealFile = path.join(root, 'capsule-file-hashes.json');
if (process.argv.includes('--require-seal')) assert(fs.existsSync(sealFile));
let sealedFiles = 0;
if (fs.existsSync(sealFile)) {
    const seal = read('capsule-file-hashes.json');
    for (const item of seal.files) {
        assert(!item.file.split(/[\\/]/).includes('..'));
        const bytes = fs.readFileSync(path.join(root, item.file));
        assert.equal(bytes.length, item.bytes);
        assert.equal(sha256(bytes), item.sha256);
    }
    sealedFiles = seal.files.length;
}
console.log(JSON.stringify({
    actualAudit: 'PASS', findingId: 'F213', actualDisposition: 'rejected', actualSourceOnlyGate: true,
    actualCompletePublicSourceFilesChecked: sources.files.length, actualTargetBlobUnchangedAcrossBothPins: true,
    actualSourceAssertionsNotRuntimeMeasurements: true, actualNewFrameworkTestOrBenchmarkExecutions: 0,
    actualPerformanceImprovementOrMeasuredNoGainOrZeroCostClaim: false,
    actualAuthorizationsPermanentlyClosed: '0of3', actualSealedFilesChecked: sealedFiles
}, null, 2));
