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
const close = (a, b) => assert(Math.abs(a - b) <= Math.max(1e-8, Math.abs(b) * 1e-10));
const median = values =>
{
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const original = json('contracts-before.json');
assert.equal(original.cases.length, 20);
assert.equal(original.cancellation.length, 3);
for (const file of ['contracts-after.json', 'contracts-after-2.json'])
{
    assert(read(file).equals(read('contracts-before.json')));
}
for (const row of original.cases)
{
    const contract = row.contract;
    assert.equal(contract.serialized_bytes, contract.payload_bytes);
    assert.equal(contract.response_disposed, true);
    assert(contract.real_request_query.includes('access_token=') && contract.real_request_query.includes('appsecret_proof='));
    const error = row.Name.endsWith('Control');
    assert.equal(contract.success, !error);
    assert.equal(contract.creating_ticket_calls, error ? 0 : 1);
    assert.equal(contract.payload_document_disposed, !error);
    assert.equal(contract.failure, row.Name === 'FailedHttpControl' ? 'HttpRequestException' : error ? 'JsonException' : null);
}
const large = json('large-cancellation-before.json');
assert(read('large-cancellation-before.json').equals(read('large-cancellation-after-2.json')));
assert.equal(large.cases.length, 9);
assert.equal(new Set(large.cases.map(row => `${row.name}/${row.mode}`)).size, 9);
for (const row of [...original.cancellation, ...large.cases])
{
    const c = row.contract;
    assert.equal(c.caller_cancellation_requested, true);
    if (row.name)
    {
        assert(c.payload_bytes >= 16384);
    }
    if (row.mode === 'AfterBuffer')
    {
        assert.equal(c.success, true);
        assert.equal(c.creating_ticket_calls, 1);
        assert.equal(c.payload_document_disposed, true);
        assert.equal(c.response_disposed, true);
        assert.equal(c.serialized_bytes, c.payload_bytes);
    }
    else
    {
        assert.equal(c.success, false);
        assert.equal(c.failure, 'OperationCanceledException');
        assert.equal(c.creating_ticket_calls, 0);
        assert.equal(c.serialized_bytes, 0);
    }
}
const manifests = new Map(['before', 'after', 'after-2'].map(name => [name, json(`${name}-manifest.json`)]));
for (const [name, manifest] of manifests)
{
    for (const field of ['benchmark_assembly_sha256', 'runtime_configuration_sha256', 'dependency_configuration_sha256'])
    {
        assert.equal(manifest[field], manifests.get('before')[field]);
    }
    const pdb = json(`pdb-${name}.json`);
    assert.equal(hash(read(`source-${name}.cs`)), manifest.target_source_sha256);
    assert.equal(pdb.verified, true);
    assert.equal(pdb.source_sha256, manifest.target_source_sha256);
    assert.equal(pdb.actual_pdb_document_sha256, manifest.target_source_sha256);
}
assert.equal(new Set([...manifests.values()].map(m => m.target_assembly_sha256)).size, 3);
const target = 'Microsoft.AspNetCore.Authentication.Facebook';
for (const [name, file] of [['after', 'execution-closure.json'], ['after-2', 'execution-closure-after-2.json']])
{
    const c = json(file);
    assert.equal(c.complete_recursive_file_sets_equal, true);
    assert.equal(c.copied_files, 262);
    assert.equal(c.runtime_assets, 116);
    assert.equal(c.before.length, 262);
    assert.equal(c.after.length, 262);
    assert.equal(c.runtimeAssets.length, 116);
    assert.deepEqual(c.before.map(r => r.file), c.after.map(r => r.file));
    const changed = c.before.filter((r, i) => r.sha256 !== c.after[i].sha256).map(r => r.file).sort();
    assert.deepEqual(changed, [`${target}.dll`, `${target}.pdb`].sort());
    assert.deepEqual([...c.changed_files].sort(), changed);
    for (const variant of ['before', 'after'])
    {
        const manifest = manifests.get(variant === 'before' ? 'before' : name);
        for (const [file, field] of [
            [`${target}.dll`, 'target_assembly_sha256'],
            ['AutoPerf.Benchmarks.dll', 'benchmark_assembly_sha256'],
            ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtime_configuration_sha256'],
            ['AutoPerf.Benchmarks.deps.json', 'dependency_configuration_sha256'],
        ])
        {
            assert.equal(c[variant].find(row => row.file === file).sha256.toUpperCase(), manifest[field]);
        }
    }
    for (const asset of c.runtimeAssets)
    {
        const a = c.before.find(r => r.file === asset.copied);
        const b = c.after.find(r => r.file === asset.copied);
        assert(a && b);
        assert.equal(asset.before_sha256, a.sha256);
        assert.equal(asset.after_sha256, b.sha256);
        assert(a.sha256 === b.sha256 || asset.copied === `${target}.dll`);
    }
}
const testedBefore = json('original-tuned-owner-validation.json');
const testedAfter = json('selected-tuned-owner-validation.json');
for (const [name, receipt] of [['before', testedBefore], ['after-2', testedAfter]])
{
    assert.equal(receipt.matched, true);
    assert.equal(receipt.passed, 43);
    assert.equal(receipt.encoding_rows, 17);
    assert.equal(receipt.actual_tested_owner_sha256, manifests.get(name).target_assembly_sha256);
}
const firstTested = json('tested-owner-after.json');
assert.equal(firstTested.verified, true);
assert.equal(firstTested.actual_tested_owner_sha256, manifests.get('after').target_assembly_sha256);
const probeClosure = json('large-cancellation-execution-closure.json');
assert.equal(probeClosure.copied_files, 210);
assert.equal(probeClosure.all_nine_large_contracts_byte_identical, true);
const probeBefore = probeClosure.variants.before;
const probeAfter = probeClosure.variants['after-2'];
assert.equal(probeBefore.length, 210);
assert.equal(probeAfter.length, 210);
assert.deepEqual(probeBefore.map(r => r.file), probeAfter.map(r => r.file));
assert.deepEqual(probeBefore.filter((r, i) => r.sha256 !== probeAfter[i].sha256).map(r => r.file).sort(),
    [`${target}.dll`, `${target}.pdb`].sort());
for (const row of json('large-cancellation-commands.json'))
{
    assert.equal(row.exit_code, 0);
    assert.equal(row.actual_owner_sha256, manifests.get(row.snapshot).target_assembly_sha256);
    assert(read(`large-cancellation-${row.snapshot}.log`).toString().includes(`AUTOPERF_OWNER_SHA256=${row.actual_owner_sha256}`));
}
for (const file of ['contracts-before-command.json', 'contracts-after-command.json', 'contracts-after-2-command.json',
    'harness-before-build/command.json', 'harness-after-build/command.json', 'harness-after-tuned-build/command.json',
    'cancellation-probe-build/command.json', 'formatting.json', 'formatting-after-2.json'])
{
    assert.equal(json(file).exit_code, 0);
}
const execution = json('all-execution.json');
assert.equal(execution.length, 6);
assert.deepEqual(execution.map(r => `${r.round}-${r.variant}`),
    ['1-before', '1-after', '2-after', '2-before', '3-before', '3-after']);
assert.deepEqual(execution.map(r => r.snapshot), ['before', 'after', 'after-2', 'before', 'before', 'after-2']);
const launches = new Map();
let sampleCount = 0;
let markerCount = 0;
let environment;
for (const row of execution)
{
    assert.equal(row.exit_code, 0);
    for (const [flag, value] of [['--warmupCount', '3'], ['--iterationCount', '8'], ['--iterationTime', '100'], ['--outliers', 'DontRemove']])
    {
        assert.equal(row.arguments[row.arguments.indexOf(flag) + 1], value);
    }
    const result = json(`${row.label}/results.json`);
    assert.equal(result.Benchmarks.length, 20);
    const e = {
        sdk: result.HostEnvironmentInfo.DotNetCliVersion,
        runtime: result.HostEnvironmentInfo.RuntimeVersion,
        benchmarkdotnet: result.HostEnvironmentInfo.BenchmarkDotNetVersion,
        architecture: result.HostEnvironmentInfo.Architecture,
    };
    environment ??= e;
    assert.deepEqual(e, environment);
    assert.equal(e.sdk, '12.0.100-alpha.1.26557.102');
    assert.equal(e.benchmarkdotnet, '0.13.0');
    const markers = [...read(`${row.label}/console.log`).toString().matchAll(/AUTOPERF_OWNER_SHA256=([A-F0-9]{64})/g)].map(m => m[1]);
    assert(markers.length >= 21);
    assert(markers.every(value => value === manifests.get(row.snapshot).target_assembly_sha256));
    markerCount += markers.length;
    const cases = new Map();
    for (const c of result.Benchmarks)
    {
        const name = /Case: "([^"]+)"/.exec(c.FullName)?.[1];
        assert(name && !cases.has(name));
        assert.equal(c.Statistics.N, 8);
        assert(c.Memory && c.Memory.BytesAllocatedPerOperation >= 0);
        const samples = c.Measurements.filter(r => r.IterationMode === 'Workload' && r.IterationStage === 'Result');
        assert.equal(samples.length, 8);
        assert(samples.every(r => r.Operations > 0 && r.Nanoseconds > 0));
        close(samples.reduce((sum, r) => sum + r.Nanoseconds / r.Operations, 0) / 8, c.Statistics.Mean);
        sampleCount += samples.length;
        cases.set(name, c);
    }
    assert.deepEqual([...cases.keys()].sort(), original.cases.map(r => r.Name).sort());
    launches.set(`${row.round}-${row.variant}`, cases);
}
const changedProfiles = new Set(['Utf8Large16K', 'Utf8Large64K', 'Utf8Unicode16K', 'Utf8Bom16K', 'InvalidUtf8Large16K']);
const cases = original.cases.map(profile =>
{
    const pairs = [1, 2, 3].map(round =>
    {
        const a = launches.get(`${round}-before`).get(profile.Name);
        const b = launches.get(`${round}-after`).get(profile.Name);
        return {
            round,
            selected_strategy: round !== 1,
            before_ns: a.Statistics.Mean,
            after_ns: b.Statistics.Mean,
            time_change_percent: 100 * (b.Statistics.Mean / a.Statistics.Mean - 1),
            before_bytes: a.Memory.BytesAllocatedPerOperation,
            after_bytes: b.Memory.BytesAllocatedPerOperation,
            saved_bytes: a.Memory.BytesAllocatedPerOperation - b.Memory.BytesAllocatedPerOperation,
            before_rsd_percent: 100 * a.Statistics.StandardDeviation / a.Statistics.Mean,
            after_rsd_percent: 100 * b.Statistics.StandardDeviation / b.Statistics.Mean,
        };
    });
    const selected = pairs.filter(r => r.selected_strategy);
    if (changedProfiles.has(profile.Name))
    {
        assert(selected.every(r => r.saved_bytes > 20000 && r.time_change_percent < 0));
    }
    return {
        name: profile.Name,
        final_transcoding_path: changedProfiles.has(profile.Name),
        selected_median_time_change_percent: median(selected.map(r => r.time_change_percent)),
        pairs,
    };
});
const comparison = json('comparison.json');
assert.deepEqual(comparison.rounds, [2, 3]);
assert.equal(comparison.cases.length, 20);
for (const c of cases)
{
    const summary = comparison.cases.find(r => r.parameters === `Case=${c.name}`);
    assert(summary);
    const selected = c.pairs.filter(r => r.selected_strategy);
    close(summary.median_paired_time_change_percent, c.selected_median_time_change_percent);
    assert.deepEqual(summary.before_ns, selected.map(r => r.before_ns));
    assert.deepEqual(summary.after_ns, selected.map(r => r.after_ns));
    assert.deepEqual(summary.before_bytes, selected.map(r => r.before_bytes));
    assert.deepEqual(summary.after_bytes, selected.map(r => r.after_bytes));
}
const correctness = JSON.parse(execFileSync('pwsh', ['-NoProfile', '-NonInteractive', '-Command', String.raw`
$ErrorActionPreference = 'Stop'
$all = foreach ($folder in 'tests-before', 'tests-naive-stream', 'tests-decoding-stream-v2',
    'tests-after', 'tests-before-tuned', 'tests-gated-naive-stream', 'tests-after-tuned')
{
    $root = Join-Path $env:F081_EVIDENCE_DIR $folder
    [xml]$document = Get-Content (Join-Path $root 'results.trx') -Raw
    $command = Get-Content (Join-Path $root 'command.json') -Raw | ConvertFrom-Json
    $counters = $document.TestRun.ResultSummary.Counters
    [ordered]@{
        folder = $folder; exit_code = $command.exit_code
        total = [int]$counters.total; passed = [int]$counters.passed; failed = [int]$counters.failed
        rows = @($document.TestRun.Results.UnitTestResult | Sort-Object testName | ForEach-Object {
            [ordered]@{name = $_.testName; outcome = $_.outcome; failure = [string]$_.Output.ErrorInfo.Message}
        })
    }
}
ConvertTo-Json -InputObject @($all) -Depth 8 -Compress
`], { env: { ...process.env, F081_EVIDENCE_DIR: path.resolve(directory) }, encoding: 'utf8' }));
const originalLabels = ['Utf8', 'Utf8Large', 'Utf8Bom', 'Utf8Quoted', 'Utf8NoCharset', 'Utf8BomNoCharset',
    'Utf16', 'Utf16Quoted', 'Utf16BomNoCharset', 'BigEndianUtf16', 'BigEndianUtf16BomNoCharset',
    'Utf32', 'Utf32BomNoCharset', 'Latin1', 'InvalidUtf8'];
const initialFailures = ['Utf16', 'Utf16Quoted', 'Utf16BomNoCharset', 'BigEndianUtf16',
    'BigEndianUtf16BomNoCharset', 'Utf32', 'Utf32BomNoCharset', 'Latin1', 'InvalidUtf8'];
for (const record of correctness)
{
    const tuned = record.folder.includes('tuned') || record.folder === 'tests-gated-naive-stream';
    const labels = tuned ? [...originalLabels, 'Utf8BomLarge', 'InvalidUtf8Large'] : originalLabels;
    const failed = record.folder === 'tests-naive-stream' ? 9 : record.folder === 'tests-gated-naive-stream' ? 1 : 0;
    assert.equal(record.total, tuned ? 43 : 41);
    assert.equal(record.rows.length, record.total);
    assert.equal(record.exit_code, failed ? 1 : 0);
    assert.equal(record.failed, failed);
    assert.equal(record.passed, record.total - failed);
    assert.equal(record.rows.filter(r => r.outcome === 'Passed').length, record.passed);
    assert.equal(record.rows.filter(r => r.outcome === 'Failed').length, record.failed);
    const encodings = record.rows.filter(r => r.name.includes('UserInfoResponseEncodingPreservesClaims('));
    assert.deepEqual(encodings.map(r => /scenario: "([^"]+)"/.exec(r.name)?.[1]).sort(), [...labels].sort());
    if (failed)
    {
        const actual = record.rows.filter(r => r.outcome === 'Failed');
        assert.deepEqual(actual.map(r => /scenario: "([^"]+)"/.exec(r.name)?.[1]).sort(),
            failed === 9 ? [...initialFailures].sort() : ['InvalidUtf8Large']);
        if (failed === 1)
        {
            assert(actual[0].failure.includes('DecoderFallbackException'));
        }
    }
}
assert(read('tests-decoding-stream/command.log').toString().includes('CS8604'));
assert.notEqual(json('tests-decoding-stream/command.json').exit_code, 0);
assert.equal(correctness.reduce((sum, r) => sum + r.total, 0), 293);
assert.equal(sampleCount, 960);
const committed = json('committed-source-identity.json');
assert.equal(committed.source_commit, read('source-commit.txt').toString().trim());
assert.equal(committed.documents.length, 2);
for (const document of committed.documents)
{
    assert.equal(document.committed_source_equal_after_git_line_ending_canonicalization, true);
    assert.equal(hash(read(document.source_snapshot)), document.source_sha256);
}
const audit = {
    candidate: 'F081',
    disposition: 'Qualified allocation/scaling fork draft;explicitly not merge-ready.',
    comparison_budget_used: 3,
    comparison_budget_closed: true,
    measured_source_strategies: 2,
    selected_strategy_rounds: [2, 3],
    selected_strategy_aggregation_excludes_round_1: true,
    measured_outcomes: 120,
    paired_cases: 60,
    selected_strategy_outcomes: 80,
    selected_strategy_pairs: 40,
    actual_result_samples: sampleCount,
    selected_strategy_result_samples: 640,
    actual_owner_markers: markerCount,
    copied_execution_files_per_variant: 262,
    declared_runtime_assets: 116,
    untimed_probe_files_per_variant: 210,
    byte_identical_selected_ticket_and_cancellation_contracts: 32,
    owning_trx_outcomes: 293,
    owning_trx_passed: 283,
    expected_prototype_failed: 10,
    correctness,
    environment,
    cases,
    limits: [
        'Typical/small UTF8 and large UTF16 retained repeated regressions;not merge-ready or a universal login improvement.',
        'GetAsync still buffers;no network-streaming,external-provider,browser or production-throughput claim.',
        'The16KiB size gate is anchored to observed profiles,not an optimal crossover;intermediate and boundary payload sizes were not timed.',
        'UTF8 replacement transcoding still decodes/re-encodes and introduces buffers;it removes a whole UTF16 string,not all materialization.',
        'Legacy fallback and error-path timing/allocation movements are retained,without an asserted JIT/scheduling/GC cause.',
        'The owner response-disposal issue is unchanged;external cleanup is uniform in both measured fixtures.',
        'Custom encoding providers,other runtimes/platforms and full remote-provider flows are unverified.',
    ],
};
for (const [file, value] of [['measurement-audit.json', audit], ['correctness.json', correctness]])
{
    const text = JSON.stringify(value, null, 2) + '\n';
    if (mode === '--write')
    {
        fs.writeFileSync(path.join(directory, file), text);
    }
    else
    {
        assert.equal(read(file).toString(), text, `${file} must reproduce exactly from raw evidence.`);
    }
}
console.log('F081:120 outcomes/60 pairs/960 samples;two strategies kept separate;293 TRX rows and32 matching contracts reproduced,without timing.');
