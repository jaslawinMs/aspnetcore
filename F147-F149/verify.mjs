import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePe, parsePdb, parseXml, parseTrx } from './metadata-reader.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const local = logical => {
    assert.ok(!path.isAbsolute(logical) && !logical.includes(':') && !logical.split(/[\\/]/).includes('..'));
    return path.join(root, ...logical.split(/[\\/]/));
};
const read = logical => JSON.parse(fs.readFileSync(local(logical), 'utf8').replace(/^\uFEFF/, ''));
const copies = read('authoritative-copies.json');
const key = name => name.replaceAll('/', '\\').toLowerCase();
const origins = new Map(copies.map(c => [key(c.actualSourcePath), c]));
const selected = original => {
    const copy = origins.get(key(original));
    assert.ok(copy, 'Unselected private path is not a portable input: ' + original);
    return fs.readFileSync(local(copy.file));
};
const jsonOrigin = original => JSON.parse(selected(original).toString('utf8').replace(/^\uFEFF/, ''));
for (const copy of copies)
{
    const bytes = fs.readFileSync(local(copy.file));
    assert.equal(bytes.length, copy.bytes);
    assert.equal(hash(bytes), copy.sha256);
}
const metadata = read('study/evidence/native-identity-acceptance-011.json');
assert.equal(metadata.passed, true);
assert.equal(metadata.actualSelectedPairsFreshlyParsed.length, 7);
for (const pair of metadata.actualSelectedPairsFreshlyParsed)
{
    const pe = parsePe(selected(pair.dll)), pdb = parsePdb(selected(pair.pdb));
    assert.equal(pe.mvid, pair.actualParsedMvid);
    assert.ok(pe.codeView.some(c => c.guid === pdb.guid && c.stamp === pdb.stamp && c.age === 1));
    assert.deepEqual([pdb.guid, pdb.stamp], pair.actualParsedPdbId);
    const document = pdb.documents.find(d => d.name === pair.actualFreshDocument.name);
    assert.ok(document);
    assert.equal(document.algorithm, '8829d00f-11b8-4213-878b-770e8597ac16');
    assert.equal(document.checksum.toUpperCase(), hash(selected(pair.source)));
    assert.equal(document.checksum.toUpperCase(), pair.actualFreshDocument.checksum);
}
const all = node => [node, ...node.children.flatMap(all)];
const name = node => node.name.split(':').at(-1);
const expectedUtf8 = new Set(['False', 'True'].flatMap(direction => ['ValidUtf8', 'InvalidUtf8', 'SplitUtf8'].map(scenario =>
    `Microsoft.AspNetCore.Server.Kestrel.Core.Tests.CompiledSampleProducerTests.ActualSample_Utf8DecodeAndPerReadFallback(bidirectional: ${direction}, caseName: "${scenario}")`)));
let functionalRows = 0;
for (const report of metadata.actualNativeReports)
{
    const bytes = selected(report.file);
    assert.equal(hash(bytes), report.sha256);
    const parsed = parseTrx(bytes.toString('utf8'));
    assert.equal(parsed.rows.length, 20);
    assert.ok(parsed.rows.every(r => r.outcome === 'Passed'));
    assert.deepEqual(new Set(parsed.rows.filter(r => r.testName.includes('ActualSample_Utf8DecodeAndPerReadFallback')).map(r => r.testName)), expectedUtf8);
    functionalRows += parsed.rows.length;
}
assert.equal(functionalRows, 120);
for (const role of ['Original', 'CurrentDefault'])
{
    const baseline = read(`study/evidence/${role}-Baseline-image.json`);
    const original = new Map(baseline.actualAllImageFiles.map(f => [f.file, f]));
    for (const finding of ['F147', 'F149'])
    {
        const candidate = read(`study/evidence/${role}-${finding}-image.json`);
        assert.deepEqual(candidate.actualAllImageFiles.map(f => f.file).sort(), [...original.keys()].sort());
        assert.equal(original.size, 156);
        assert.deepEqual(candidate.actualAllImageFiles.filter(f => JSON.stringify(f) !== JSON.stringify(original.get(f.file))).map(f => f.file).sort(),
            ['WebTransportInteractiveSampleApp.dll', 'WebTransportInteractiveSampleApp.pdb']);
    }
}
let measuredRows = 0;
const decisions = [];
for (const finding of ['F147', 'F149'])
{
    const prefix = `measurements/${finding}`;
    const budget = read(`${prefix}/diagnostic-budget.json`);
    assert.equal(budget.closed, true);
    assert.equal(budget.authorizations.length, 1);
    assert.equal(budget.authorizations[0].sourceRole, 'Original');
    assert.equal(budget.authorizations[0].status, 'completed');
    const pairs = read(`${prefix}/comparisons/authorization-1-Original/paired-samples.json`);
    assert.equal(pairs.length, 7);
    const metrics = [];
    for (const pair of pairs)
    {
        const observed = {};
        for (const variant of ['baseline', 'candidate'])
        {
            const result = jsonOrigin(pair[variant].file);
            assert.equal(result.outcome, 'pass');
            assert.equal(result.actualNativeTerminal, true);
            assert.equal(result.actualNativeExitCode, 0);
            assert.equal(result.actualStdoutCompletelyDrained, true);
            assert.equal(result.actualStderrCompletelyDrained, true);
            const xmlBytes = selected(result.actualNativeXml);
            assert.equal(hash(xmlBytes), result.actualNativeXmlSha256);
            const parsed = parseTrx(xmlBytes.toString('utf8'));
            assert.equal(parsed.rows.length, 1);
            assert.equal(parsed.rows[0].outcome, 'Passed');
            const xml = all(parseXml(xmlBytes.toString('utf8')));
            const stdout = xml.find(n => name(n) === 'StdOut').text;
            const markers = [...stdout.matchAll(/AUTOPERF_SAMPLE_WORKLOAD_JSON ([^\r\n]+)/g)];
            assert.equal(markers.length, 1);
            const actual = JSON.parse(markers[0][1]);
            assert.equal(actual.mode, 'measure');
            assert.equal(actual.finding, finding);
            assert.equal(actual.pair, pair.pair);
            assert.equal(actual.observations.length, 2);
            for (const o of actual.observations)
            {
                assert.equal(o.ActualMeasurement, true);
                assert.equal(o.Operations, 128);
                assert.equal(o.PayloadBytes, 65536);
                assert.ok(o.AllocatedBytes > 0 && o.ElapsedMilliseconds > 0);
            }
            const primary = finding === 'F147' ? 'unidirectional' : 'bidirectional';
            observed[variant] = { primary: actual.observations.find(o => o.Direction === primary),
                control: actual.observations.find(o => o.Direction !== primary) };
            measuredRows++;
        }
        metrics.push({
            allocation: observed.candidate.primary.AllocatedBytes / observed.baseline.primary.AllocatedBytes,
            elapsed: observed.candidate.primary.ElapsedMilliseconds / observed.baseline.primary.ElapsedMilliseconds,
            controlAllocation: observed.candidate.control.AllocatedBytes / observed.baseline.control.AllocatedBytes,
            controlElapsed: observed.candidate.control.ElapsedMilliseconds / observed.baseline.control.ElapsedMilliseconds,
            saved: observed.baseline.primary.AllocatedBytes - observed.candidate.primary.AllocatedBytes
        });
    }
    const gm = k => Math.exp(metrics.reduce((sum, m) => sum + Math.log(m[k]), 0) / 7);
    const decision = budget.authorizations[0].decision;
    for (const [actual, expected] of [
        [gm('allocation'), decision.actualPrimaryAllocationGeometricMeanCandidateBaselineRatio],
        [gm('elapsed'), decision.actualPrimaryElapsedGeometricMeanCandidateBaselineRatio],
        [gm('controlAllocation'), decision.actualUnchangedControlAllocationGeometricMeanCandidateBaselineRatio],
        [gm('controlElapsed'), decision.actualUnchangedControlElapsedGeometricMeanCandidateBaselineRatio],
        [metrics.reduce((sum, m) => sum + m.saved, 0) / 7, decision.actualMeanAbsoluteAllocatedBytesSavedPerObservation]])
    {
        assert.ok(Math.abs(actual - expected) < 0.00000001);
    }
    assert.equal(metrics.filter(m => m.allocation < 1).length, 7);
    assert.equal(decision.actualAllocationGatePassed, true);
    assert.equal(decision.actualElapsedGatePassed, true);
    assert.equal(decision.actualUnchangedControlGatePassed, false);
    assert.equal(decision.actualAllPredeclaredGatesPassed, false);
    assert.ok(gm('controlElapsed') > 1.10);
    decisions.push({ finding, observedAllocationRatio: gm('allocation'), observedControlElapsedRatio: gm('controlElapsed'),
        actualQualification: 'inconclusive-unchanged-control-elapsed-drift', actualBudgetClosedAt: '1of3' });
}
assert.equal(measuredRows, 28);
if (process.argv.includes('--require-seal'))
{
    const seal = read('capsule-file-hashes.json');
    for (const file of seal.files)
    {
        const bytes = fs.readFileSync(local(file.file));
        assert.equal(bytes.length, file.bytes);
        assert.equal(hash(bytes), file.sha256);
    }
}
console.log(JSON.stringify({ audit: 'PASS', actualSelectedUnchangedCopiedFiles: copies.length,
    actualFreshPePdbRawDocumentPairs: 7, actualFunctionalXmlRows: functionalRows, actualMeasuredXmlRows: measuredRows,
    actualDecisions: decisions, actualNoNativeTargetOrCounterStarted: true,
    actualOmittedFullImagesRehashed: false, actualFullCompilerInputAttestation: false,
    actualWholeDefaultFrameworkClaimed: false }, null, 2));
