import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] ?? path.dirname(fileURLToPath(import.meta.url)));
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const gitBlob = bytes => crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const gate = read('source-gate.json');
assert.equal(gate.outcome, 'rejected');
assert.equal(gate.sourceOnlyGate, true);
assert.equal(gate.classificationAloneWasNotTheDisposition, true);
assert.equal(gate.performanceImprovementClaim, false);
assert.equal(gate.measuredNoGainClaim, false);
assert.equal(gate.zeroRuntimeCostClaim, false);
assert.equal(gate.actualCandidateWritten, false);
assert.equal(gate.actualNewFrameworkTestOrBenchmarkExecutions, 0);
assert(gate.reviewedDecision.length > 50);
assert(gate.unknownBoundaries.length > 0);
const findings = read('original-findings.json');
assert.deepEqual(findings.map(item => item.id), gate.findings);
for (const item of findings) assert.equal(item.finding.severity, 'informational');
const manifest = read('source-manifest.json');
assert.equal(manifest.original, '37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.match(manifest.observedDefault, /^[a-f0-9]{40}$/);
assert(manifest.files.length > 0);
for (const item of manifest.files) {
    assert(!item.file.split(/[\\/]/).includes('..'));
    const bytes = fs.readFileSync(path.join(root, item.file));
    assert.equal(bytes.length, item.bytes);
    assert.equal(sha256(bytes), item.sha256);
    assert.equal(gitBlob(bytes), item.observedDefaultBlob);
    assert.equal(item.originalBlob, item.observedDefaultBlob);
}
for (const fact of gate.sourceAssertions) {
    const item = manifest.files.find(item => item.file === fact.file);
    assert(item);
    const text = fs.readFileSync(path.join(root, fact.file), 'utf8');
    let fragment = text;
    if (fact.from !== undefined) {
        const start = text.indexOf(fact.from), end = text.indexOf(fact.to, start + fact.from.length);
        assert(start >= 0 && end > start);
        fragment = text.slice(start, end);
    }
    for (const literal of fact.contains) assert(fragment.includes(literal), fact.file + ': ' + literal);
    for (const literal of fact.absent ?? []) assert(!fragment.includes(literal), fact.file + ': ' + literal);
}
const budgets = read('closed-budgets.json');
assert.deepEqual(budgets.map(item => item.findingId), gate.findings);
for (const budget of budgets) {
    assert.equal(budget.maximumComparisons, 3);
    assert.equal(budget.closed, true);
    assert.deepEqual(budget.authorizations, []);
    assert.equal(budget.actualComparisons, 0);
    assert.equal(budget.actualCandidateWritten, false);
    assert.equal(budget.actualUnusedAuthorizationsPermanentlyClosed, 3);
}
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
    actualAudit: 'PASS', findings: gate.findings, actualDisposition: 'rejected',
    actualSourceOnlyGate: true, actualCompletePublicSourceFilesChecked: manifest.files.length,
    actualSourceAssertionsChecked: gate.sourceAssertions.length,
    actualOriginalObservedDefaultSourceBlobsUnchanged: true,
    actualSourceChecksNotResolvedWholeRepositoryGraphOrRuntimeMeasurements: true,
    actualNewFrameworkTestOrBenchmarkExecutions: 0,
    actualPerformanceImprovementOrMeasuredNoGainOrZeroCostClaim: false,
    actualEachBudgetPermanentlyClosed: '0of3', actualSealedFilesChecked: sealedFiles
}, null, 2));
