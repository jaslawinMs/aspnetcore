import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const [directory, mode] = process.argv.slice(2);
assert(directory && ['--write', '--verify'].includes(mode));
const read = file => fs.readFileSync(path.join(directory, file));
const json = file => JSON.parse(read(file).toString().replace(/^\uFEFF/, ''));
const hash = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const close = (a, b) => assert(Math.abs(a - b) <= Math.max(1e-8, Math.abs(b) * 1e-10));
const median = values =>
{
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const variants = ['before', 'after', 'after-2'];
const target = 'Microsoft.AspNetCore.StaticFiles';
const manifests = new Map(variants.map(v => [v, json(`${v}-manifest.json`)]));
const original = json('contracts-before.json');
assert.equal(original.cases.length, 24);
assert.equal(new Set(original.cases.map(c => c.Name)).size, 24);
for (const variant of variants)
{
    assert(read(`contracts-${variant}.json`).equals(read('contracts-before.json')));
    for (const profile of original.cases)
    {
        const c = profile.contract;
        const head = c.method === 'HEAD';
        const bytes = read(`contracts-${variant}-responses/${profile.Name}.html`);
        assert.equal(hash(bytes), c.response_sha256);
        assert.equal(bytes.length, c.response_bytes);
        assert.equal(c.file_provider_lookups, 1);
        assert.equal(c.next_calls, 0);
        assert.equal(c.contents_enumerations, head ? 0 : 2);
        assert.equal(c.writes, head ? 0 : 1);
        assert.equal(c.content_type, 'text/html; charset=utf-8');
        assert.equal(c.content_length, head ? null : bytes.length);
        assert.equal(c.links.length, head ? 0 : c.normalized_segments);
        if (head)
        {
            assert.equal(bytes.length, 0);
        }
        else
        {
            assert(bytes.length > 2000);
        }
        if (c.encoder === 'Override')
        {
            assert.equal(c.override_string_calls, 13 + 2 * c.normalized_segments);
        }
        assert(bytes.equals(read(`contracts-before-responses/${profile.Name}.html`)));
    }
    const manifest = manifests.get(variant);
    for (const field of ['benchmark_assembly_sha256', 'runtime_configuration_sha256', 'dependency_configuration_sha256'])
    {
        assert.equal(manifest[field], manifests.get('before')[field]);
    }
    assert.equal(hash(read(`source-${variant}.cs`)), manifest.target_source_sha256);
    const pdb = json(`pdb-${variant}.json`);
    assert.equal(pdb.verified, true);
    assert.equal(pdb.source_sha256, manifest.target_source_sha256);
    assert.equal(pdb.actual_pdb_document_sha256, manifest.target_source_sha256);
    const tested = json(variant === 'before' ? 'original-owner-validation.json' : `tested-owner-${variant}.json`);
    assert.equal(tested.owner_sha256, manifest.target_assembly_sha256);
    assert.equal(tested.source_sha256, manifest.target_source_sha256);
    assert.equal(tested.passed, 98);
    assert.equal(tested.formatter_cases, 20);
    assert.equal(tested.rows.length, 98);
    assert(tested.rows.every(r => r.outcome === 'Passed'));
}
assert.equal(new Set(variants.map(v => manifests.get(v).target_assembly_sha256)).size, 3);
for (const file of ['DirectoryFixture.cs', 'DirectoryBenchmark.cs', 'Program.cs'])
{
    const pdb = json(`pdb-harness-${file}.json`);
    assert.equal(pdb.verified, true);
    assert.equal(pdb.source_sha256, hash(read(`harness/${file}`)));
    assert.equal(pdb.actual_pdb_document_sha256, pdb.source_sha256);
}
const testPdb = json('pdb-test-source.json');
assert.equal(testPdb.verified, true);
assert.equal(testPdb.source_sha256, hash(read('source-tests.cs')));
assert.equal(testPdb.actual_pdb_document_sha256, testPdb.source_sha256);
const deps = json('execution-deps.json');
assert.equal(hash(read('execution-deps.json')), manifests.get('before').dependency_configuration_sha256);
assert.equal(hash(read('execution-runtimeconfig.json')), manifests.get('before').runtime_configuration_sha256);
const runtime = json('execution-runtimeconfig.json');
assert.equal(runtime.runtimeOptions.framework.version, '12.0.0-alpha.1.26562.105');
assert.equal(runtime.runtimeOptions.configProperties['System.GC.Server'], true);
assert.equal(runtime.runtimeOptions.configProperties['System.GC.Concurrent'], true);
const declaredAssets = [...new Set(Object.values(deps.targets[deps.runtimeTarget.name]).flatMap(l =>
    [...Object.keys(l.runtime ?? {}), ...Object.keys(l.native ?? {}),
        ...Object.entries(l.runtimeTargets ?? {}).filter(([, v]) =>
            ['runtime', 'native'].includes(v.assetType)).map(([file]) => file)]))].sort();
for (const variant of ['after', 'after-2'])
{
    const closure = json(`execution-closure${variant === 'after' ? '' : '-after-2'}.json`);
    assert.equal(closure.complete_recursive_file_sets_equal, true);
    assert.equal(closure.copied_files, 149);
    assert.equal(closure.runtime_assets, 68);
    assert.equal(closure.before.length, 149);
    assert.equal(closure.after.length, 149);
    assert.deepEqual(closure.before.map(r => r.file), closure.after.map(r => r.file));
    const changed = closure.before.filter((r, i) => r.sha256 !== closure.after[i].sha256).map(r => r.file).sort();
    assert.deepEqual(changed, [`${target}.dll`, `${target}.pdb`].sort());
    assert.deepEqual([...closure.changed_files].sort(), changed);
    assert.deepEqual(closure.runtimeAssets.map(a => a.declared).sort(), declaredAssets);
    for (const [v, files] of [['before', closure.before], [variant, closure.after]])
    {
        for (const [file, field] of [[`${target}.dll`, 'target_assembly_sha256'],
            ['AutoPerf.Benchmarks.dll', 'benchmark_assembly_sha256'],
            ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtime_configuration_sha256'],
            ['AutoPerf.Benchmarks.deps.json', 'dependency_configuration_sha256']])
        {
            assert.equal(files.find(r => r.file === file).sha256.toUpperCase(), manifests.get(v)[field]);
        }
    }
    for (const a of closure.runtimeAssets)
    {
        assert.equal(closure.before.find(r => r.file === a.copied).sha256, a.before_sha256);
        assert.equal(closure.after.find(r => r.file === a.copied).sha256, a.after_sha256);
        assert(a.before_sha256 === a.after_sha256 || a.copied === `${target}.dll`);
    }
}
for (const variant of variants)
{
    assert.equal(json(`contracts-${variant}-command.json`).exit_code, 0);
    assert.equal(json(`harness-build-${variant}.json`).exit_code, 0);
}
assert.equal(json('formatting.json').exit_code, 0);
assert(json('pdb-commands.json').every(c => c.exit_code === 0));
const execution = fs.existsSync(path.join(directory, 'all-execution.json'))
    ? json('all-execution.json') : json('execution.json');
assert.equal(execution.length, 6);
assert.deepEqual(execution.map(r => `${r.round}-${r.variant}`),
    ['1-before', '1-after', '2-after', '2-before', '3-before', '3-after']);
const launches = new Map();
let samples = 0;
let markers = 0;
let environment;
for (const row of execution)
{
    assert.equal(row.exit_code, 0);
    assert.equal(row.snapshot, row.variant === 'before' ? 'before' : row.round === 1 ? 'after' : 'after-2');
    for (const [flag, value] of [['--warmupCount', '3'], ['--iterationCount', '8'],
        ['--iterationTime', '100'], ['--outliers', 'DontRemove']])
    {
        assert.equal(row.arguments[row.arguments.indexOf(flag) + 1], value);
    }
    assert(row.arguments.includes('--inProcess'));
    const packaged = path.join(directory, row.label, 'results.json');
    const report = fs.existsSync(packaged) ? json(`${row.label}/results.json`)
        : json(`${row.label}/results/${fs.readdirSync(path.join(directory, row.label, 'results')).find(f => /-full.*\.json$/.test(f))}`);
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
    assert(identities.every(v => v === manifests.get(row.snapshot).target_assembly_sha256));
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
    assert.deepEqual([...cases.keys()].sort(), original.cases.map(c => c.Name).sort());
    launches.set(`${row.round}-${row.variant}`, cases);
}
const cases = original.cases.map(profile =>
{
    const pairs = [1, 2, 3].map(round =>
    {
        const b = launches.get(`${round}-before`).get(profile.Name);
        const a = launches.get(`${round}-after`).get(profile.Name);
        return {
            round, after_snapshot: round === 1 ? 'after' : 'after-2',
            before_ns: b.Statistics.Mean, after_ns: a.Statistics.Mean,
            time_change_percent: 100 * (a.Statistics.Mean / b.Statistics.Mean - 1),
            before_bytes: b.Memory.BytesAllocatedPerOperation, after_bytes: a.Memory.BytesAllocatedPerOperation,
            saved_bytes: b.Memory.BytesAllocatedPerOperation - a.Memory.BytesAllocatedPerOperation,
            before_rsd_percent: 100 * b.Statistics.StandardDeviation / b.Statistics.Mean,
            after_rsd_percent: 100 * a.Statistics.StandardDeviation / a.Statistics.Mean,
        };
    });
    return {
        name: profile.Name,
        selected_median_time_change_percent: median(pairs.slice(1).map(r => r.time_change_percent)),
        unselected_original_strategy_pairs: pairs.slice(0, 1),
        selected_pairs: pairs.slice(1),
    };
});
if (fs.existsSync(path.join(directory, 'comparison.json')))
{
    const comparison = json('comparison.json');
    assert.deepEqual(comparison.rounds, [2, 3]);
    assert.equal(comparison.cases.length, 24);
    for (const c of cases)
    {
        const summaries = comparison.cases.filter(r => /Case: "([^"]+)"/.exec(r.name)?.[1] === c.name);
        assert.equal(summaries.length, 1);
        const s = summaries[0];
        close(s.median_paired_time_change_percent, c.selected_median_time_change_percent);
        for (const field of ['before_ns', 'after_ns', 'before_bytes', 'after_bytes'])
        {
            assert.deepEqual(s[field], c.selected_pairs.map(r => r[field]));
        }
    }
}
const correctness = JSON.parse(execFileSync('pwsh', ['-NoProfile', '-NonInteractive', '-Command', String.raw`
$ErrorActionPreference = 'Stop'
$all = foreach ($folder in 'tests-before','tests-naive-defaultless','tests-after','tests-after-2')
{
    [xml]$x = Get-Content (Join-Path $env:F084_EVIDENCE_DIR "$folder\results.trx") -Raw
    $command = Get-Content (Join-Path $env:F084_EVIDENCE_DIR "$folder\command.json") -Raw | ConvertFrom-Json
    [ordered]@{folder=$folder;exit_code=$command.exit_code;
        total=[int]$x.TestRun.ResultSummary.Counters.total;
        passed=[int]$x.TestRun.ResultSummary.Counters.passed;
        failed=[int]$x.TestRun.ResultSummary.Counters.failed;
        rows=@($x.TestRun.Results.UnitTestResult|Sort-Object testName|ForEach-Object {
            [ordered]@{name=$_.testName;outcome=$_.outcome;failure=[string]$_.Output.ErrorInfo.Message}
        })}
}
ConvertTo-Json -InputObject @($all) -Depth 8 -Compress
`], { env: { ...process.env, F084_EVIDENCE_DIR: path.resolve(directory) }, encoding: 'utf8' }));
const labels = ['Root', 'SeparatorsOnly', 'Single', 'Two', 'MissingTrailing', 'Repeated',
    'PathBase', 'PathBaseTrailing', 'PathBaseRepeated', 'Spaces', 'Attributes', 'Unicode',
    'PercentLiteral', 'LongSegment', 'ManySegments', 'UnpairedSurrogates'];
for (const record of correctness)
{
    const prototype = record.folder === 'tests-naive-defaultless';
    assert.equal(record.total, 98);
    assert.equal(record.rows.length, 98);
    assert.equal(new Set(record.rows.map(r => r.name)).size, 98);
    assert.equal(record.exit_code, prototype ? 1 : 0);
    assert.equal(record.passed, prototype ? 96 : 98);
    assert.equal(record.failed, prototype ? 2 : 0);
    const formatter = record.rows.filter(r => r.name.includes('.HtmlDirectoryFormatterTests.'));
    assert.equal(formatter.length, 20);
    for (const label of labels)
    {
        const row = formatter.filter(r => r.name.includes('.GenerateContentAsync_DefaultEncoderPreservesBreadcrumbs(') &&
            r.name.endsWith(`(scenario: "${label}")`));
        assert.equal(row.length, 1);
        assert.equal(row[0].outcome, 'Passed');
    }
    for (const label of ['Two', 'ManySegments'])
    {
        const row = formatter.filter(r => r.name.includes('.GenerateContentAsync_PreservesStringEncoderOverride(') &&
            r.name.endsWith(`(scenario: "${label}")`));
        assert.equal(row.length, 1);
        assert.equal(row[0].outcome, prototype ? 'Failed' : 'Passed');
        if (prototype)
        {
            assert(row[0].failure.includes('Assert.Contains() Failure'));
        }
    }
    for (const method of ['GenerateContentAsync_PreservesConfiguredEncoder', 'GenerateContentAsync_HeadDoesNotEnumerateContents'])
    {
        const row = formatter.filter(r => r.name.endsWith(`.${method}`));
        assert.equal(row.length, 1);
        assert.equal(row[0].outcome, 'Passed');
    }
    const failed = record.rows.filter(r => r.outcome !== 'Passed');
    assert.equal(failed.length, prototype ? 2 : 0);
    assert(failed.every(r => r.name.includes('GenerateContentAsync_PreservesStringEncoderOverride')));
}
const audit = {
    candidate: 'F084', selected_snapshot: 'after-2', selected_rounds: [2, 3],
    selected_median_rule: 'Two paired mean percentage changes use their midpoint;not a confidence interval or significance test.',
    all_round_order: ['AB', 'BA', 'AB'], measured_comparisons: 3,
    measured_source_strategies: 2, comparison_budget_closed: true,
    measured_outcomes: 144, measured_pairs: 72, actual_result_samples: samples,
    selected_outcomes: 96, selected_pairs: 48, selected_actual_result_samples: 768,
    executing_owner_markers_verified: markers, environment,
    complete_recursive_files: 149, declared_runtime_assets: 68,
    source_pdb_tested_executing_owners_verified: true,
    harness_source_documents_verified: 3, test_source_document_verified: true,
    byte_identical_contracts_per_owner: 24, actual_response_captures_verified: 72,
    tests: { total: 392, passes: 390, expected_prototype_failures: 2, skips: 0, new_formatter_rows_per_suite: 20 },
    limits: 'Qualified allocation/scaling proposal,not merge-ready;retain HEAD/two-level/custom control slowdowns,variability andunselected strategy costs;no universal,physical-filesystem,server/browser orproduction-throughput claim.',
    cases,
};
assert.equal(samples, 1152);
for (const [file, value] of [['measurement-audit.json', audit], ['correctness.json', correctness]])
{
    if (mode === '--write')
    {
        fs.writeFileSync(path.join(directory, file), JSON.stringify(value, null, 2) + '\n');
    }
    else
    {
        assert.deepEqual(json(file), value);
    }
}
console.log(`F084:144 outcomes/72 pairs/1152 actual samples;selected48 pairs use only rounds2/3;392 TRX outcomes/2 expected failures;72 full response byte captures;${markers} owner markers;149-file/68-asset closure andsource/PDB/tested identity pass.`);
