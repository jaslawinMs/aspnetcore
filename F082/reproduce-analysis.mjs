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
assert.equal(original.cases.length, 24);
assert.equal(original.cancellation.length, 12);
assert(read('contracts-after.json').equals(read('contracts-before.json')));
for (const row of original.cases)
{
    const c = row.contract;
    const error = row.Name.endsWith('Control');
    assert.equal(c.success, !error);
    assert.equal(c.creating_ticket_calls, error ? 0 : 1);
    assert.equal(c.payload_document_disposed, !error);
    assert.equal(c.serialized_bytes, c.payload_bytes);
    assert.equal(c.response_disposed, true);
    assert.equal(c.request_method, 'GET');
    assert.equal(c.authorization, 'Bearer benchmark-token');
    assert.equal(c.endpoint, 'https://graph.microsoft.com/v1.0/me');
    assert.equal(c.failure, row.Name === 'FailedHttpControl' ? 'HttpRequestException' : error ? 'JsonException' : null);
    if (!error)
    {
        assert.equal(c.identifier, 'profile-id');
        assert.equal(c.email, row.Name === 'MailPresent' ? 'direct@example.com' : 'user@example.com');
        assert.equal(c.name, row.Name.startsWith('InvalidUtf8') ? 'caf\uFFFD \u03A9 \u{1F600}\nname' : 'caf\u00E9 \u03A9 \u{1F600}\nname');
    }
}
assert.equal(new Set(original.cancellation.map(r => `${r.name}/${r.mode}`)).size, 12);
for (const row of original.cancellation)
{
    const c = row.contract;
    assert(['Utf8Small', 'Utf8Large16K', 'Utf8Bom16K', 'InvalidUtf8Large16K'].includes(row.name));
    assert.equal(c.caller_cancellation_requested, true);
    if (row.name !== 'Utf8Small')
    {
        assert(c.payload_bytes >= 16384);
    }
    assert.equal(c.success, row.mode === 'AfterBuffer');
    assert.equal(c.creating_ticket_calls, row.mode === 'AfterBuffer' ? 1 : 0);
    assert.equal(c.payload_document_disposed, row.mode === 'AfterBuffer');
    assert.equal(c.failure, row.mode === 'AfterBuffer' ? null : 'OperationCanceledException');
    assert.equal(c.serialized_bytes, row.mode === 'AfterBuffer' ? c.payload_bytes : 0);
    if (row.mode === 'AfterBuffer')
    {
        assert.equal(c.response_disposed, true);
    }
}
const target = 'Microsoft.AspNetCore.Authentication.MicrosoftAccount';
const manifests = new Map(['before', 'after'].map(name => [name, json(`${name}-manifest.json`)]));
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
assert.notEqual(manifests.get('before').target_assembly_sha256, manifests.get('after').target_assembly_sha256);
const testedBefore = json('original-owner-validation.json');
assert.equal(testedBefore.passed, 44);
assert.equal(testedBefore.encoding_rows.length, 18);
assert.equal(testedBefore.owner_sha256, manifests.get('before').target_assembly_sha256);
assert.equal(testedBefore.source_sha256, manifests.get('before').target_source_sha256);
const testedAfter = json('tested-owner-after.json');
assert.equal(testedAfter.verified, true);
assert.equal(testedAfter.passed, 44);
assert.equal(testedAfter.encoding_rows, 18);
assert.equal(testedAfter.actual_tested_owner_sha256, manifests.get('after').target_assembly_sha256);
for (const receipt of json('harness-source-pdb.json'))
{
    assert.equal(receipt.verified, true);
    assert.equal(receipt.source_sha256, receipt.actual_pdb_document_sha256);
    assert.equal(hash(read(`harness/${path.win32.basename(receipt.document)}`)), receipt.source_sha256);
}
assert.equal(json('harness-source-pdb.json').length, 3);
const closure = json('execution-closure.json');
assert.equal(closure.complete_recursive_file_sets_equal, true);
assert.equal(closure.copied_files, 262);
assert.equal(closure.runtime_assets, 116);
assert.equal(closure.before.length, 262);
assert.equal(closure.after.length, 262);
assert.equal(closure.runtimeAssets.length, 116);
assert.deepEqual(closure.before.map(r => r.file), closure.after.map(r => r.file));
const changed = closure.before.filter((r, i) => r.sha256 !== closure.after[i].sha256).map(r => r.file).sort();
assert.deepEqual(changed, [`${target}.dll`, `${target}.pdb`].sort());
assert.deepEqual([...closure.changed_files].sort(), changed);
for (const variant of ['before', 'after'])
{
    for (const [file, field] of [
        [`${target}.dll`, 'target_assembly_sha256'], ['AutoPerf.Benchmarks.dll', 'benchmark_assembly_sha256'],
        ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtime_configuration_sha256'],
        ['AutoPerf.Benchmarks.deps.json', 'dependency_configuration_sha256'],
    ])
    {
        assert.equal(closure[variant].find(row => row.file === file).sha256.toUpperCase(), manifests.get(variant)[field]);
    }
}
for (const asset of closure.runtimeAssets)
{
    const a = closure.before.find(r => r.file === asset.copied);
    const b = closure.after.find(r => r.file === asset.copied);
    assert(a && b);
    assert.equal(asset.before_sha256, a.sha256);
    assert.equal(asset.after_sha256, b.sha256);
    assert(a.sha256 === b.sha256 || asset.copied === `${target}.dll`);
}
for (const file of ['contracts-before-command.json', 'contracts-after-command.json',
    'harness-before-build/command.json', 'harness-after-build/command.json', 'formatting.json'])
{
    assert.equal(json(file).exit_code, 0);
}
const execution = json('all-execution.json');
assert.equal(execution.length, 6);
assert.deepEqual(execution.map(r => `${r.round}-${r.variant}`),
    ['1-before', '1-after', '2-after', '2-before', '3-before', '3-after']);
assert(execution.every(r => r.snapshot === r.variant));
const launches = new Map();
let samples = 0;
let markers = 0;
let environment;
for (const row of execution)
{
    assert.equal(row.exit_code, 0);
    for (const [flag, value] of [['--warmupCount', '3'], ['--iterationCount', '8'], ['--iterationTime', '100'], ['--outliers', 'DontRemove']])
    {
        assert.equal(row.arguments[row.arguments.indexOf(flag) + 1], value);
    }
    const report = json(`${row.label}/results.json`);
    assert.equal(report.Benchmarks.length, 24);
    const e = {
        sdk: report.HostEnvironmentInfo.DotNetCliVersion,
        runtime: report.HostEnvironmentInfo.RuntimeVersion,
        benchmarkdotnet: report.HostEnvironmentInfo.BenchmarkDotNetVersion,
        architecture: report.HostEnvironmentInfo.Architecture,
    };
    environment ??= e;
    assert.deepEqual(e, environment);
    assert.equal(e.sdk, '12.0.100-alpha.1.26557.102');
    assert.equal(e.benchmarkdotnet, '0.13.0');
    const identities = [...read(`${row.label}/console.log`).toString().matchAll(/AUTOPERF_OWNER_SHA256=([A-F0-9]{64})/g)].map(m => m[1]);
    assert(identities.length >= 25);
    assert(identities.every(value => value === manifests.get(row.snapshot).target_assembly_sha256));
    markers += identities.length;
    const cases = new Map();
    for (const c of report.Benchmarks)
    {
        const name = /Case: "([^"]+)"/.exec(c.FullName)?.[1];
        assert(name && !cases.has(name));
        assert.equal(c.Statistics.N, 8);
        assert(c.Memory && c.Memory.BytesAllocatedPerOperation >= 0);
        const actual = c.Measurements.filter(r => r.IterationMode === 'Workload' && r.IterationStage === 'Result');
        assert.equal(actual.length, 8);
        assert(actual.every(r => r.Operations > 0 && r.Nanoseconds > 0));
        close(actual.reduce((sum, r) => sum + r.Nanoseconds / r.Operations, 0) / 8, c.Statistics.Mean);
        samples += actual.length;
        cases.set(name, c);
    }
    assert.deepEqual([...cases.keys()].sort(), original.cases.map(r => r.Name).sort());
    launches.set(`${row.round}-${row.variant}`, cases);
}
const cases = original.cases.map(profile =>
{
    const pairs = [1, 2, 3].map(round =>
    {
        const before = launches.get(`${round}-before`).get(profile.Name);
        const after = launches.get(`${round}-after`).get(profile.Name);
        return {
            round, before_ns: before.Statistics.Mean, after_ns: after.Statistics.Mean,
            time_change_percent: 100 * (after.Statistics.Mean / before.Statistics.Mean - 1),
            before_bytes: before.Memory.BytesAllocatedPerOperation, after_bytes: after.Memory.BytesAllocatedPerOperation,
            saved_bytes: before.Memory.BytesAllocatedPerOperation - after.Memory.BytesAllocatedPerOperation,
            before_rsd_percent: 100 * before.Statistics.StandardDeviation / before.Statistics.Mean,
            after_rsd_percent: 100 * after.Statistics.StandardDeviation / after.Statistics.Mean,
        };
    });
    return { name: profile.Name, median_time_change_percent: median(pairs.map(r => r.time_change_percent)), pairs };
});
const comparison = json('comparison.json');
assert.deepEqual(comparison.rounds, [1, 2, 3]);
assert.equal(comparison.cases.length, 24);
for (const c of cases)
{
    const summary = comparison.cases.find(r => r.parameters === `Case=${c.name}`);
    assert(summary);
    close(summary.median_paired_time_change_percent, c.median_time_change_percent);
    for (const field of ['before_ns', 'after_ns', 'before_bytes', 'after_bytes'])
    {
        assert.deepEqual(summary[field], c.pairs.map(r => r[field]));
    }
}
const correctness = JSON.parse(execFileSync('pwsh', ['-NoProfile', '-NonInteractive', '-Command', String.raw`
$ErrorActionPreference = 'Stop'
$all = foreach ($folder in 'tests-before', 'tests-naive-buffer', 'tests-after')
{
    $root = Join-Path $env:F082_EVIDENCE_DIR $folder
    [xml]$x = Get-Content (Join-Path $root 'results.trx') -Raw
    $command = Get-Content (Join-Path $root 'command.json') -Raw | ConvertFrom-Json
    [ordered]@{folder=$folder;exit_code=$command.exit_code;total=[int]$x.TestRun.ResultSummary.Counters.total;
        passed=[int]$x.TestRun.ResultSummary.Counters.passed;failed=[int]$x.TestRun.ResultSummary.Counters.failed;
        rows=@($x.TestRun.Results.UnitTestResult|Sort-Object testName|ForEach-Object {
            [ordered]@{name=$_.testName;outcome=$_.outcome;failure=[string]$_.Output.ErrorInfo.Message}
        })}
}
ConvertTo-Json -InputObject @($all) -Depth 8 -Compress
`], { env: { ...process.env, F082_EVIDENCE_DIR: path.resolve(directory) }, encoding: 'utf8' }));
const labels = ['Utf8', 'Utf8Uppercase', 'Utf8Large', 'Utf8Bom', 'Utf8BomLarge', 'Utf8Quoted', 'Utf8NoCharset',
    'Utf8BomNoCharset', 'Utf16', 'Utf16Quoted', 'Utf16BomNoCharset', 'BigEndianUtf16',
    'BigEndianUtf16BomNoCharset', 'Utf32', 'Utf32BomNoCharset', 'Latin1', 'InvalidUtf8', 'InvalidUtf8Large'];
const negative = ['Utf8Bom', 'Utf8BomLarge', 'Utf8BomNoCharset', 'Utf16', 'Utf16Quoted', 'Utf16BomNoCharset',
    'BigEndianUtf16', 'BigEndianUtf16BomNoCharset', 'Utf32', 'Utf32BomNoCharset', 'Latin1', 'InvalidUtf8', 'InvalidUtf8Large'];
for (const record of correctness)
{
    const failed = record.folder === 'tests-naive-buffer' ? 13 : 0;
    assert.equal(record.total, 44);
    assert.equal(record.rows.length, 44);
    assert.equal(record.exit_code, failed ? 1 : 0);
    assert.equal(record.failed, failed);
    assert.equal(record.passed, 44 - failed);
    assert.equal(record.rows.filter(r => r.outcome === 'Passed').length, record.passed);
    assert.equal(record.rows.filter(r => r.outcome === 'Failed').length, record.failed);
    const encodings = record.rows.filter(r => r.name.includes('UserInfoResponseEncodingPreservesClaims('));
    assert.deepEqual(encodings.map(r => /scenario: "([^"]+)"/.exec(r.name)?.[1]).sort(), [...labels].sort());
    if (failed)
    {
        const actual = record.rows.filter(r => r.outcome === 'Failed');
        assert.deepEqual(actual.map(r => /scenario: "([^"]+)"/.exec(r.name)?.[1]).sort(), [...negative].sort());
        assert(actual.filter(r => r.name.includes('scenario: "InvalidUtf8')).every(r => r.failure.includes('DecoderFallbackException')));
    }
}
assert.equal(samples, 1152);
const committed = json('committed-source-identity.json');
assert.equal(committed.source_commit, read('source-commit.txt').toString().trim());
assert.equal(committed.documents.length, 2);
for (const document of committed.documents)
{
    assert.equal(document.committed_source_equal_after_git_line_ending_canonicalization, true);
    assert.equal(hash(read(document.source_snapshot)), document.source_sha256);
}
const audit = {
    candidate: 'F082',
    disposition: 'Qualified UTF8 allocation/scaling fork draft;not merge-ready because malformed-UTF8 copy costs remain.',
    comparison_budget_used: 3, comparison_budget_closed: true, measured_source_strategies: 1,
    measured_outcomes: 144, paired_cases: 72, actual_result_samples: samples, actual_owner_markers: markers,
    copied_execution_files_per_variant: 262, declared_runtime_assets: 116,
    byte_identical_ticket_and_cancellation_contracts: 36,
    owning_trx_outcomes: 132, owning_trx_passed: 119, expected_prototype_failed: 13,
    correctness, environment, cases,
    limits: [
        'Canonical valid UTF8 gains coexist with large malformed-UTF8 median+20.36% and16616B/op extra copy;not merge-ready.',
        'SendAsync retains ResponseContentRead buffering;owned UTF8 array is still materialized and retained through async event/document lifetime.',
        'Every fallback/control timing and allocation movement is retained;no causality or statistical significance claim for unchanged branches.',
        'No external-provider/browser,network streaming,production throughput,custom encoding provider,other platform/runtime claim.',
        'Original shipping request/response disposal remains unchanged;uniform external cleanup is included in both timed variants.',
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
        assert.equal(read(file).toString(), text, `${file} must reproduce from raw evidence.`);
    }
}
console.log('F082:144 outcomes/72 pairs/1152 actual samples,132 TRX rows and36 matching producer contracts reproduced,without timing.');
