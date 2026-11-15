import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const [directory, mode] = process.argv.slice(2);
assert(directory && ['--write', '--verify'].includes(mode), 'Explicit evidence directory and mode required.');
const read = file => fs.readFileSync(path.join(directory, file));
const json = file => JSON.parse(read(file).toString().replace(/^\uFEFF/, ''));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const close = (left, right) => assert(Math.abs(left - right) <= Math.max(1e-8, Math.abs(right) * 1e-10));
const original = json('contracts-before.json');
assert.equal(original.cases.length, 20);
assert.equal(original.comparisons.length, 529);
assert(read('contracts-before.json').equals(read('contracts-after.json')));
assert.equal(new Set(original.comparisons.map(row => JSON.stringify(row.left))).size, 23);
assert.equal(new Set(original.comparisons.map(row => JSON.stringify(row.right))).size, 23);
assert.equal(new Set(original.comparisons.map(row => JSON.stringify([row.left, row.right]))).size, 529);
assert(original.comparisons.every(row => [-1, 0, 1].includes(row.sign)));
for (const profile of original.cases.filter(row => row.Name.startsWith('Fill')))
{
    assert.equal(profile.contract.cache_hit_without_enumeration, true);
    assert.equal(profile.contract.actual_token_invalidation_observes_new_file, true);
    assert.equal(profile.contract.updated.length, profile.contract.urls.length + 1);
}
for (const file of ['contracts-before-command.json', 'contracts-after-command.json',
    'harness-before-build/command.json', 'harness-after-build/command.json', 'formatting.json'])
{
    assert.equal(json(file).exit_code, 0);
}
const before = json('before-manifest.json');
const after = json('after-manifest.json');
for (const field of ['benchmark_assembly_sha256', 'runtime_configuration_sha256', 'dependency_configuration_sha256'])
{
    assert.equal(before[field], after[field]);
}
assert.notEqual(before.target_assembly_sha256, after.target_assembly_sha256);
for (const variant of ['before', 'after'])
{
    const manifest = variant === 'before' ? before : after;
    const pdb = json(`pdb-${variant}.json`);
    assert.equal(hash(read(`source-${variant}.cs`)), manifest.target_source_sha256);
    assert.equal(pdb.verified, true);
    assert.equal(pdb.source_sha256, manifest.target_source_sha256);
    assert.equal(pdb.actual_pdb_document_sha256, manifest.target_source_sha256);
}
const tested = json('tested-owner-after.json');
assert.equal(tested.verified, true);
assert.equal(tested.actual_tested_owner_sha256, after.target_assembly_sha256);
assert.equal(tested.selected_benchmark_owner_sha256, after.target_assembly_sha256);
const closure = json('execution-closure.json');
assert.equal(closure.complete_recursive_file_sets_equal, true);
assert.equal(closure.copied_files, 285);
assert.equal(closure.runtime_assets, 117);
assert.equal(closure.before.length, 285);
assert.equal(closure.after.length, 285);
assert.equal(closure.runtimeAssets.length, 117);
assert.deepEqual(closure.before.map(row => row.file), closure.after.map(row => row.file));
for (const variant of ['before', 'after'])
{
    const manifest = variant === 'before' ? before : after;
    for (const [file, field] of [
        ['Microsoft.AspNetCore.Mvc.TagHelpers.dll', 'target_assembly_sha256'],
        ['AutoPerf.Benchmarks.dll', 'benchmark_assembly_sha256'],
        ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtime_configuration_sha256'],
        ['AutoPerf.Benchmarks.deps.json', 'dependency_configuration_sha256'],
    ])
    {
        assert.equal(closure[variant].find(row => row.file === file).sha256.toUpperCase(), manifest[field]);
    }
}
const changed = closure.before.filter((row, i) => row.sha256 !== closure.after[i].sha256).map(row => row.file).sort();
assert.deepEqual(changed, ['Microsoft.AspNetCore.Mvc.TagHelpers.dll', 'Microsoft.AspNetCore.Mvc.TagHelpers.pdb']);
assert.deepEqual([...closure.changed_files].sort(), changed);
for (const asset of closure.runtimeAssets)
{
    const a = closure.before.find(row => row.file === asset.copied);
    const b = closure.after.find(row => row.file === asset.copied);
    assert(a && b);
    assert.equal(asset.before_sha256, a.sha256);
    assert.equal(asset.after_sha256, b.sha256);
    assert(a.sha256 === b.sha256 || asset.copied === 'Microsoft.AspNetCore.Mvc.TagHelpers.dll');
}
const execution = json('all-execution.json');
assert.equal(execution.length, 6);
assert.deepEqual(execution.map(row => `${row.round}-${row.variant}`),
    ['1-before', '1-after', '2-after', '2-before', '3-before', '3-after']);
const launches = new Map();
let sampleCount = 0;
let markerCount = 0;
let environment;
for (const row of execution)
{
    assert.equal(row.exit_code, 0);
    for (const [flag, value] of [['--warmupCount', '3'], ['--iterationCount', '8'],
        ['--iterationTime', '100'], ['--outliers', 'DontRemove']])
    {
        assert.equal(row.arguments[row.arguments.indexOf(flag) + 1], value);
    }
    const result = json(`${row.label}/results.json`);
    assert.equal(result.Benchmarks.length, 20);
    const currentEnvironment = {
        sdk: result.HostEnvironmentInfo.DotNetCliVersion,
        runtime: result.HostEnvironmentInfo.RuntimeVersion,
        benchmarkdotnet: result.HostEnvironmentInfo.BenchmarkDotNetVersion,
        architecture: result.HostEnvironmentInfo.Architecture,
    };
    environment ??= currentEnvironment;
    assert.deepEqual(currentEnvironment, environment);
    assert.equal(currentEnvironment.sdk, '12.0.100-alpha.1.26557.102');
    assert.equal(currentEnvironment.benchmarkdotnet, '0.13.0');
    const markers = [...read(`${row.label}/console.log`).toString()
        .matchAll(/AUTOPERF_OWNER_SHA256=([A-F0-9]{64})/g)].map(match => match[1]);
    assert(markers.length >= 21, 'Expected startup and all 20 actual setup owner markers.');
    assert(markers.every(value => value === (row.variant === 'before' ? before : after).target_assembly_sha256));
    markerCount += markers.length;
    const cases = new Map();
    for (const resultCase of result.Benchmarks)
    {
        const match = /Case: "([^"]+)"/.exec(resultCase.FullName);
        assert(match && !cases.has(match[1]), 'Complete, unique benchmark identities required.');
        assert.equal(resultCase.Statistics.N, 8);
        assert(resultCase.Memory && resultCase.Memory.BytesAllocatedPerOperation >= 0);
        const samples = resultCase.Measurements.filter(value =>
            value.IterationMode === 'Workload' && value.IterationStage === 'Result');
        assert.equal(samples.length, 8);
        assert(samples.every(value => value.Operations > 0 && value.Nanoseconds > 0));
        close(samples.reduce((sum, value) => sum + value.Nanoseconds / value.Operations, 0) / 8,
            resultCase.Statistics.Mean);
        sampleCount += samples.length;
        cases.set(match[1], resultCase);
    }
    assert.deepEqual([...cases.keys()].sort(), original.cases.map(row => row.Name).sort());
    launches.set(`${row.round}-${row.variant}`, cases);
}
const cases = original.cases.map(profile =>
{
    const pairs = [1, 2, 3].map(round =>
    {
        const a = launches.get(`${round}-before`).get(profile.Name);
        const b = launches.get(`${round}-after`).get(profile.Name);
        return {
            round,
            before_ns: a.Statistics.Mean,
            after_ns: b.Statistics.Mean,
            paired_time_change_percent: 100 * (b.Statistics.Mean / a.Statistics.Mean - 1),
            before_bytes: a.Memory.BytesAllocatedPerOperation,
            after_bytes: b.Memory.BytesAllocatedPerOperation,
            saved_bytes: a.Memory.BytesAllocatedPerOperation - b.Memory.BytesAllocatedPerOperation,
            before_rsd_percent: 100 * a.Statistics.StandardDeviation / a.Statistics.Mean,
            after_rsd_percent: 100 * b.Statistics.StandardDeviation / b.Statistics.Mean,
        };
    });
    if (profile.Name.startsWith('Compare'))
    {
        assert(pairs.every(row => row.before_bytes > 0 && row.after_bytes === 0));
    }
    if (['CacheHit64', 'CacheStatic64', 'SameStemControl', 'IdenticalControl', 'EmptyPatternControl'].includes(profile.Name))
    {
        assert(pairs.every(row => row.before_bytes === row.after_bytes));
    }
    return {
        name: profile.Name,
        median_paired_time_change_percent: median(pairs.map(row => row.paired_time_change_percent)),
        pairs,
    };
});
const correctness = JSON.parse(execFileSync('pwsh', ['-NoProfile', '-NonInteractive', '-Command', String.raw`
$ErrorActionPreference = 'Stop'
$all = foreach ($folder in 'tests-before', 'tests-naive-unbounded', 'tests-after')
{
    $root = Join-Path $env:F080_EVIDENCE_DIR $folder
    [xml]$document = Get-Content (Join-Path $root 'results.trx') -Raw
    $command = Get-Content (Join-Path $root 'command.json') -Raw | ConvertFrom-Json
    $rows = @($document.TestRun.Results.UnitTestResult)
    $counters = $document.TestRun.ResultSummary.Counters
    [ordered]@{
        folder = $folder
        exit_code = $command.exit_code
        total = [int]$counters.total
        passed = [int]$counters.passed
        failed = [int]$counters.failed
        rows = @($rows | Sort-Object testName | ForEach-Object {
            [ordered]@{name = $_.testName; outcome = $_.outcome;
                failure = [string]$_.Output.ErrorInfo.Message}
        })
    }
}
ConvertTo-Json -InputObject @($all) -Depth 8 -Compress
`], { env: { ...process.env, F080_EVIDENCE_DIR: path.resolve(directory) }, encoding: 'utf8' }));
for (const record of correctness)
{
    assert.equal(record.total, 29);
    assert.equal(record.rows.length, 29);
    const negative = record.folder === 'tests-naive-unbounded';
    assert.equal(record.exit_code, negative ? 1 : 0);
    assert.equal(record.passed, negative ? 28 : 29);
    assert.equal(record.failed, negative ? 1 : 0);
    assert.equal(record.rows.filter(row => row.outcome === 'Passed').length, record.passed);
    assert.equal(record.rows.filter(row => row.outcome === 'Failed').length, record.failed);
    const newFact = record.rows.filter(row => row.name.endsWith('OrdersGlobbedMatchResults_WithDirectorySegmentPrefixes'));
    assert.equal(newFact.length, 1);
    assert.equal(newFact[0].outcome, 'Passed');
    if (negative)
    {
        const failure = record.rows.find(row => row.outcome === 'Failed');
        assert(failure.name.includes('OrdersGlobbedMatchResultsCorrectly('));
        assert(failure.failure.includes('Expected: "/A/a.css"'));
        assert(failure.failure.includes('Actual:   "/A/a-b.css"'));
    }
}
assert.equal(sampleCount, 960);
const audit = {
    candidate: 'F080',
    comparison_budget_used: 3,
    comparison_budget_closed: true,
    measured_source_strategies: 1,
    unmeasured_rejected_prototype: 'Full-buffer StringSegment replacement changes extension-boundary ordering.',
    measured_outcomes: 120,
    paired_cases: 60,
    actual_result_samples: sampleCount,
    actual_owner_markers: markerCount,
    copied_execution_files_per_variant: 285,
    declared_runtime_assets: 117,
    untimed_profiles: 20,
    byte_identical_signed_comparison_pairs: 529,
    environment,
    correctness,
    limitations: [
        'Shared Windows microbenchmark, no production throughput or physical filesystem claim.',
        'Fill1 contains no comparer invocation and has unstable timings/async cache-eviction accounting.',
        'CacheHit64 bypasses comparison; its first-pair time change is not attributed to this proposal.',
        'IdenticalControl returns before the changed seam and its higher median is retained without causal attribution.',
        'Direct and virtual-provider long inputs are scaling probes, not evidence for physical filename limits.',
    ],
    cases,
};
const bytes = Buffer.from(JSON.stringify(audit, null, 2) + '\n');
if (mode === '--write')
{
    fs.writeFileSync(path.join(directory, 'measurement-audit.json'), bytes);
}
else
{
    assert(read('measurement-audit.json').equals(bytes), 'Audit must reproduce exactly from raw results, XML and identities.');
}
console.log(`F080:${audit.measured_outcomes} outcomes/${audit.paired_cases} pairs/${sampleCount} samples;actual owners,529 comparisons and all 87 preservation/prototype rows verified.`);
for (const profile of cases)
{
    console.log(`${profile.name}: ${profile.median_paired_time_change_percent.toFixed(2)}%; ` +
        profile.pairs.map(row => `${row.before_bytes}/${row.after_bytes}B`).join(';'));
}
