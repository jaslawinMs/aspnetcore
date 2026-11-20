import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const directory = path.dirname(fileURLToPath(import.meta.url));
const { decide, allocationRatio, geometricMean } = await import(pathToFileURL(path.join(directory, 'AutoPerf.F198.Driver173.mjs')));
const make = () => Array.from({ length: 7 }, () => Object.fromEntries(
    ['BaselineBefore', 'Candidate', 'BaselineAfter'].map(step => [step,
        [0, 1, 16, 256].map(ConnectionCount => ({ ConnectionCount, Nanoseconds: 100, Bytes: 100 }))])));
const primary = rows => rows.find(row => row.ConnectionCount === 16);

test('identical images have zero directional blocks and do not qualify', () => {
    const result = decide(make());
    assert.equal(result.status, 'measured-no-gain');
    assert.equal(result.ratios.find(row => row.ConnectionCount === 16).elapsedDirectionalBlocks, 0);
    assert.equal(result.ratios.find(row => row.ConnectionCount === 16).allocationDirectionalBlocks, 0);
});

test('exact five percent primary elapsed reduction with seven directional blocks qualifies', () => {
    const blocks = make();
    for (const block of blocks) primary(block.Candidate).Nanoseconds = 95;
    const result = decide(blocks);
    assert.equal(result.status, 'qualifies-original-only');
    assert.equal(result.ratios.find(row => row.ConnectionCount === 16).elapsedDirectionalBlocks, 7);
});

test('exact five percent primary allocation reduction independently qualifies', () => {
    const blocks = make();
    for (const block of blocks) primary(block.Candidate).Bytes = 95;
    assert.equal(decide(blocks).status, 'qualifies-original-only');
});

test('material aggregate reduction with only five directional blocks is insufficient', () => {
    const blocks = make();
    for (let index = 0; index < 7; index++) primary(blocks[index].Candidate).Nanoseconds = index < 5 ? 80 : 120;
    const result = decide(blocks);
    assert.ok(result.ratios.find(row => row.ConnectionCount === 16).elapsedReductionPercent > 5);
    assert.equal(result.ratios.find(row => row.ConnectionCount === 16).elapsedDirectionalBlocks, 5);
    assert.equal(result.status, 'measured-no-gain');
});

test('elapsed regression at any nonprimary parameter rejects an otherwise qualifying change', () => {
    const blocks = make();
    for (const block of blocks) {
        primary(block.Candidate).Nanoseconds = 90;
        block.Candidate.find(row => row.ConnectionCount === 256).Nanoseconds = 106;
    }
    const result = decide(blocks);
    assert.equal(result.primaryPassed, true);
    assert.equal(result.nonregressionPassed, false);
    assert.equal(result.status, 'measured-no-gain');
});

test('allocation regression beyond one percent at any parameter rejects qualification', () => {
    const blocks = make();
    for (const block of blocks) {
        primary(block.Candidate).Nanoseconds = 90;
        block.Candidate.find(row => row.ConnectionCount === 1).Bytes = 101.1;
    }
    assert.equal(decide(blocks).status, 'measured-no-gain');
});

test('exact ten percent bracketing elapsed drift remains within the frozen bound', () => {
    const blocks = make();
    for (const block of blocks) {
        primary(block.Candidate).Nanoseconds = 90;
        primary(block.BaselineAfter).Nanoseconds = 110;
    }
    const result = decide(blocks);
    assert.equal(result.controlsPassed, true);
    assert.equal(result.status, 'qualifies-original-only');
});

test('one excessive baseline-control drift makes the whole comparison inconclusive', () => {
    const blocks = make();
    for (const block of blocks) primary(block.Candidate).Nanoseconds = 90;
    primary(blocks[6].BaselineAfter).Nanoseconds = 110.0001;
    const result = decide(blocks);
    assert.equal(result.controlsPassed, false);
    assert.equal(result.status, 'inconclusive-control-drift');
    assert.equal(result.controls.length, 28);
});

test('incomplete blocks cannot become a result', () => {
    assert.throws(() => decide(make().slice(0, 6)), /All seven/);
});

test('a repeated parameter cannot hide a missing required case', () => {
    const blocks = make();
    blocks[0].Candidate[3].ConnectionCount = 16;
    assert.throws(() => decide(blocks), /four unique/);
});

test('zero allocation controls are neutral only when candidate allocation is also zero', () => {
    assert.equal(allocationRatio(0, 0), 1);
    assert.equal(allocationRatio(1, 0), Infinity);
    const blocks = make();
    for (const block of blocks) {
        for (const step of Object.values(block)) step.find(row => row.ConnectionCount === 0).Bytes = 0;
        primary(block.Candidate).Nanoseconds = 90;
        block.Candidate.find(row => row.ConnectionCount === 0).Bytes = 1;
    }
    assert.equal(decide(blocks).status, 'measured-no-gain');
});

test('undefined mixed zero and infinite ratios are not silently averaged', () => {
    assert.throws(() => geometricMean([0, Infinity]), /Undefined mixed/);
    assert.throws(() => geometricMean([NaN, 1]), /Invalid geometric/);
    assert.throws(() => allocationRatio(-1, 0), /Invalid allocation/);
});
