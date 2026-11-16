import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const [root, option] = process.argv.slice(2);
assert(root && (!option || option === '--verify'));
const read = path => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
const sourceHash = file => createHash('sha256').update(readFileSync(file)).digest('hex').toUpperCase();
const emit = (name, value) =>
{
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n';
    if (option === '--verify')
    {
        assert.equal(readFileSync(join(root, name), 'utf8'), text, `Existing audit output differs: ${name}`);
    }
    else
    {
        writeFileSync(join(root, name), text);
    }
};
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const cv = values =>
{
    const average = mean(values);
    return 100 * Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1)) / average;
};
const decimal = value => value.toFixed(2);
const budget = read(join(root, 'measurement-budget.json'));
assert.equal(budget.closed, true);
assert.equal(budget.combinedComparisonsCompleted, 3);

const outcomes = [];
const desktopPairs = [];
const desktopWarmups = [];
let desktopEnvironment;
for (const round of [1, 2])
{
    const variants = {};
    for (const variant of ['before', 'after'])
    {
        const folder = join(root, `round-${round}-${variant}`, 'results');
        const reports = readdirSync(folder).filter(file => file.includes('full') && file.endsWith('.json'));
        assert.equal(reports.length, 1);
        const report = read(join(folder, reports[0]));
        assert.equal(report.Benchmarks.length, 18);
        const environment = Object.fromEntries(
            ['RuntimeVersion', 'DotNetCliVersion', 'BenchmarkDotNetVersion', 'Architecture', 'Configuration']
                .map(key => [key, report.HostEnvironmentInfo[key]]));
        desktopEnvironment ??= environment;
        assert.deepEqual(environment, desktopEnvironment);
        assert.equal(new Set(report.Benchmarks.map(item => item.FullName)).size, 18);
        const consoleText = readFileSync(join(root, `round-${round}-${variant}`, 'console.log'), 'utf8');
        const sections = consoleText.split(/^\/\/ Benchmark:\s*/m).slice(1);
        assert.equal(sections.length, 18);
        for (const section of sections)
        {
            const identity = /^HashDelimiterBenchmark\.(\w+):[^\r\n]+\[Profile=(\w+)\]/.exec(section);
            assert(identity);
            const warmups = [...section.matchAll(/^WorkloadWarmup\s+(\d+):\s+(\d+) op,\s+([\d.]+) ns,/gm)]
                .map(match => ({ index: Number(match[1]), operations: Number(match[2]), nanoseconds: Number(match[3]) }));
            assert.deepEqual(warmups.map(item => item.index), [1, 2, 3]);
            desktopWarmups.push({ round, variant, method: identity[1], profile: identity[2], warmups });
        }
        variants[variant] = report.Benchmarks;
        for (const item of report.Benchmarks)
        {
            assert.equal(item.Statistics.N, 8);
            const results = item.Measurements.filter(row => row.IterationMode === 'Workload' && row.IterationStage === 'Result');
            assert.equal(results.length, 8);
            assert.deepEqual(results.map(row => row.IterationIndex), [1, 2, 3, 4, 5, 6, 7, 8]);
            const values = results.map(row => row.Nanoseconds / row.Operations);
            assert(values.every(value => value > 0 && Number.isFinite(value)));
            assert(Math.abs(mean(values) - item.Statistics.Mean) <= 1e-9 * item.Statistics.Mean);
            assert.equal(desktopWarmups.filter(row => row.round === round && row.variant === variant &&
                row.method === item.Method && `Profile=${row.profile}` === item.Parameters).length, 1);
            assert.equal(item.Memory.BytesAllocatedPerOperation, 0);
            outcomes.push({ round, combinedComparison: round + 1, variant, ...item });
        }
    }
    for (const before of variants.before)
    {
        const after = variants.after.find(item => item.FullName === before.FullName);
        assert(after);
        desktopPairs.push({
            round, combinedComparison: round + 1, fullName: before.FullName,
            method: before.Method, parameters: before.Parameters,
            beforeNs: before.Statistics.Mean, afterNs: after.Statistics.Mean,
            changePercent: 100 * (after.Statistics.Mean / before.Statistics.Mean - 1),
            beforeBytes: before.Memory.BytesAllocatedPerOperation,
            afterBytes: after.Memory.BytesAllocatedPerOperation,
            maxCvPercent: Math.max(
                100 * before.Statistics.StandardDeviation / before.Statistics.Mean,
                100 * after.Statistics.StandardDeviation / after.Statistics.Mean),
        });
    }
}

const original = read(join(root, 'native-before-release-attempt-2.json'));
const selected = read(join(root, 'native-after-release.json'));
assert.deepEqual(original.Cases.map(item => item.Step), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
assert.deepEqual(selected.Cases.map(item => item.Step), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
assert.equal(original.Frequency, selected.Frequency);
assert.equal(original.FrameworkDescription, selected.FrameworkDescription);
assert(original.AccountingProbeAllocatedBytes >= 4096);
assert.equal(original.AccountingProbeAllocatedBytes, selected.AccountingProbeAllocatedBytes);
const nativePairs = original.Cases.map(before =>
{
    const after = selected.Cases.find(item => item.Step === before.Step);
    assert(after);
    assert.equal(before.Location, after.Location);
    assert.equal(before.Operations, after.Operations);
    for (const item of [before, after])
    {
        assert.equal(item.Samples.length, 8);
        assert.equal(item.Warmups.length, 3);
        for (const sample of [...item.Samples, ...item.Warmups])
        {
            assert.equal(sample.Operations, item.Operations);
            assert(sample.ElapsedTicks > 0 && sample.AllocatedBytes >= 0);
        }
    }
    const a = before.Samples.map(item => 1e9 * item.ElapsedTicks / original.Frequency / item.Operations);
    const b = after.Samples.map(item => 1e9 * item.ElapsedTicks / selected.Frequency / item.Operations);
    const allocatedA = before.Samples.map(item => item.AllocatedBytes / item.Operations);
    const allocatedB = after.Samples.map(item => item.AllocatedBytes / item.Operations);
    assert(allocatedA.every(value => value === allocatedA[0]));
    assert(allocatedB.every(value => value === allocatedB[0]));
    assert.equal(allocatedA[0], allocatedB[0]);
    return {
        combinedComparison: 1, step: before.Step, location: before.Location, operations: before.Operations,
        beforeNs: mean(a), afterNs: mean(b), changePercent: 100 * (mean(b) / mean(a) - 1),
        beforeBytes: allocatedA[0], afterBytes: allocatedB[0], maxCvPercent: Math.max(cv(a), cv(b)),
        beforeSamples: before.Samples, afterSamples: after.Samples,
    };
});

const states = readdirSync(join(root, 'desktop-states')).filter(file => file.endsWith('.json'))
    .map(file => ({ file, ...read(join(root, 'desktop-states', file)) }));
assert.equal(states.length, 72);
const manifests = { before: read(join(root, 'before-manifest.json')), after: read(join(root, 'after-manifest.json')) };
for (const variant of ['before', 'after'])
{
    assert.equal(sourceHash(join(root, `source-${variant}.cs`)), manifests[variant].target_source_sha256);
    const ownerProof = read(join(root, `native-owner-${variant}-pdb-proof.json`));
    assert.equal(ownerProof.verified, true);
    assert.equal(ownerProof.source_sha256, manifests[variant].target_source_sha256);
    assert.equal(ownerProof.actual_pdb_document_sha256, ownerProof.source_sha256);
    const caliperProof = read(join(root, `native-caliper-${variant}-pdb-proof.json`));
    assert.equal(caliperProof.verified, true);
    assert.equal(caliperProof.source_sha256, sourceHash(join(root, 'sample', 'HashOwnerMeasurements.cs')));
    assert.equal(caliperProof.actual_pdb_document_sha256, caliperProof.source_sha256);
}
const beforeSource = readFileSync(join(root, 'source-before.cs'), 'utf8');
const afterSource = readFileSync(join(root, 'source-after.cs'), 'utf8');
assert.equal(afterSource, beforeSource.replace('IndexOf("#", StringComparison.Ordinal)', "IndexOf('#')"));
assert.equal(manifests.before.benchmark_assembly_sha256, manifests.after.benchmark_assembly_sha256);
assert.equal(manifests.before.runtime_configuration_sha256, manifests.after.runtime_configuration_sha256);
assert.equal(manifests.before.dependency_configuration_sha256, manifests.after.dependency_configuration_sha256);
const closure = read(join(root, 'execution-closure.json'));
assert.equal(closure.complete_recursive_file_sets_equal, true);
assert.equal(closure.copied_files, 98);
assert.equal(closure.runtime_assets, 38);
assert.equal(closure.changed_files.length, 2);
const nativeParity = read(join(root, 'native-harness-parity.json'));
assert.equal(nativeParity.methodCount, 212);
assert.equal(nativeParity.metadataEntryCount, 377);
assert.equal(nativeParity.changedMethods.length, 0);
const nativeOutputParity = read(join(root, 'native-output-parity.json'));
assert.equal(nativeOutputParity.identicalExistingRuntimeAndOtherOutputs, 219);
for (const state of states)
{
    assert.equal(state.completedOwnerCalls, 1000);
    assert.equal(state.allocatedBytes, 0);
    assert.equal(state.importReached, false);
    assert(Object.values(manifests).some(item => item.target_assembly_sha256 === state.ownerSha256));
}
for (const outcome of outcomes)
{
    const hash = manifests[outcome.variant].target_assembly_sha256;
    const profile = outcome.Parameters.replace('Profile=', '');
    const receipts = states.filter(item => item.ownerSha256 === hash && item.profile === profile && item.method === outcome.Method);
    assert.equal(receipts.length, 2);
}

emit('raw-desktop-outcomes.json', outcomes);
emit('desktop-paired-outcomes.json', desktopPairs);
emit('native-paired-outcomes.json', nativePairs);
emit('setup-correctness.json', states);
emit('desktop-warmup-receipts.json', desktopWarmups);
emit('measurement-audit.json', {
    candidate: 'F089', combinedComparisons: 3, desktopOutcomes: outcomes.length,
    desktopResultSamples: 576, desktopRawWarmupSamples: 216, nativeOutcomes: 20, nativeResultSamples: 160,
    genuineDesktopSetupReceipts: states.length, nativeExactInputsAndCounts: true,
    allPerOperationAllocationsUnchanged: true, actualOwnerManifestHashes: manifests,
    desktopEnvironment, desktopRawResultArithmeticVerified: true,
    ownerAndCaliperSourceHashesMatchRecordedPdbProofs: true,
    copiedDesktopFiles: closure.copied_files, declaredDesktopRuntimeAssets: closure.runtime_assets,
    recordedNativeMethodParity: nativeParity.methodCount,
    recordedNativeBindingAndFieldMetadataParity: nativeParity.metadataEntryCount,
    recordedNativeUnchangedOutputs: nativeOutputParity.identicalExistingRuntimeAndOtherOutputs,
    auditIndependentlyRehashesOmittedBinaryOrPdbBytes: false,
    nativeAccountingProofs: [original.AccountingProbeAllocatedBytes, selected.AccountingProbeAllocatedBytes],
    caveats: [
        'Native is one custom WebAssembly comparison, not BDN and not whole-navigation throughput.',
        'There is no unchanged native timing control; native launch-level movement cannot be separated causally.',
        'Desktop direct-string and direct-char diagnostics are untouched controls; preserve their substantial movement.',
        'Runtime statistics and samples are never pooled across CoreCLR and WebAssembly.',
    ],
});

const lines = [
    '# F089 measured comparisons', '',
    'Positive percentage changes are slower. All result samples and controls are retained. CoreCLR and WebAssembly statistics are separate.', '',
    '## Actual native WebAssembly owner: one custom caliper pair', '',
    '| Step | Before ns/op | After ns/op | Change % | Before / after B/op | Max CV % |',
    '|---|---:|---:|---:|---:|---:|',
    ...nativePairs.map(row => `| ${row.step} | ${decimal(row.beforeNs)} | ${decimal(row.afterNs)} | ${decimal(row.changePercent)} | ${row.beforeBytes} / ${row.afterBytes} | ${decimal(row.maxCvPercent)} |`),
    '', 'No unchanged native timing control was run. These prepared-target owner/import calipers do not establish first-navigation or whole-app improvement.', '',
    '## Desktop BDN actual no-import owner and untouched diagnostics', '',
    '| Method / profile | Desktop pair | Before ns/op | After ns/op | Change % | Before / after B/op | Max CV % |',
    '|---|---:|---:|---:|---:|---:|---:|',
    ...desktopPairs.map(row => `| ${row.method} / ${row.parameters} | ${row.round} | ${decimal(row.beforeNs)} | ${decimal(row.afterNs)} | ${decimal(row.changePercent)} | 0 / 0 | ${decimal(row.maxCvPercent)} |`),
    '', 'Both diagnostic methods are unchanged across variants. Their cross-launch shifts must not be attributed to the owner edit, even when within-launch CV is small.', '',
];
emit('comparison.md', lines.join('\n'));
console.log(`F089: ${outcomes.length} desktop outcomes/${states.length} actual setups; 20 native outcomes; 736 retained result samples; 3/3 comparisons closed.`);
