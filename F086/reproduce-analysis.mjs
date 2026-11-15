import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = process.argv[2];
const write = process.argv.includes('--write');
assert(root && (write || process.argv.includes('--verify')), 'Explicit artifact root and--write/--verify required.');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const near = (actual, expected) => assert(Math.abs(actual - expected) <= Math.max(1e-8, Math.abs(expected) * 1e-10));
const decision = read('measurement-decision.json');
const execution = read(fs.existsSync(path.join(root, 'execution-original.json')) ? 'execution-original.json' : 'execution.json');
assert.equal(execution.length, 2);
assert.deepEqual(execution.map(row => row.variant), ['before', 'after']);
assert(execution.every(row => row.round === 1 && row.exit_code === 0));
assert.equal(decision.measured_comparisons, 1);
assert.equal(decision.comparison_budget_closed, true);
const reports = {};
const markers = [];
const coldProtocols = [];
let resultSamples = 0;
for (const run of execution)
{
    const direct = path.join(root, run.label, 'results.json');
    let file = direct;
    if (!fs.existsSync(file))
    {
        const directory = path.join(root, run.label, 'results');
        const candidates = fs.readdirSync(directory).filter(name => /-full.*\.json$/.test(name));
        assert.equal(candidates.length, 1);
        file = path.join(directory, candidates[0]);
    }
    const report = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(report.Benchmarks.length, 28);
    assert.equal(new Set(report.Benchmarks.map(row => row.FullName)).size, 28);
    reports[run.variant] = report;
    const manifest = read(`${run.snapshot}-manifest.json`);
    const consoleLog = fs.readFileSync(path.join(root, run.label, 'console.log'), 'utf8');
    const ownerMarkers = [...consoleLog.matchAll(/AUTOPERF_OWNER_SHA256=([A-F0-9]{64})/g)].map(match => match[1]);
    assert.equal(ownerMarkers.length, 29);
    assert(ownerMarkers.every(value => value === manifest.target_assembly_sha256));
    markers.push({ variant: run.variant, count: ownerMarkers.length, sha256: ownerMarkers[0] });
    const coldSections = consoleLog.split(/\r?\n\/\/ Benchmark: /).filter(section => section.startsWith('JsonPatchColdBenchmark.ApplyBatch:'));
    const workloadSections = consoleLog.split(/\r?\n\/\/ Benchmark: /).filter(section => /^JsonPatch(?:Cold)?Benchmark\./.test(section));
    assert.equal(workloadSections.length, 28);
    assert.equal(coldSections.length, 2);
    for (const section of coldSections)
    {
        const caseName = section.match(/\[Case=(Fresh(?:List|Element)64)\]/)?.[1];
        assert(caseName);
        assert(section.slice(0, section.indexOf('\n')).includes('InvocationCount=1'));
        assert(section.slice(0, section.indexOf('\n')).includes('UnrollFactor=1'));
        const batches = [...section.matchAll(/AUTOPERF_COLD_BATCH=(Fresh(?:List|Element)64)\|([a-f0-9]{32})\|64/g)];
        assert.equal(batches.length, 13);
        assert(batches.every(match => match[1] === caseName));
        assert.equal(new Set(batches.map(match => match[2])).size, 13);
        const actual = [...section.matchAll(/AUTOPERF_COLD_BATCH=(Fresh(?:List|Element)64)\|([a-f0-9]{32})\|64\r?\nWorkloadActual\s+(\d+): 64 op,/g)];
        assert.equal(actual.length, 8, 'Every timed cold actual iteration needs its own64-type producer batch.');
        assert.deepEqual(actual.map(match => +match[3]), [1, 2, 3, 4, 5, 6, 7, 8]);
        coldProtocols.push({ variant: run.variant, case: caseName, distinct_setup_batches: 13, actual_first_use_batches: 8, types_per_batch: 64 });
    }
    for (const benchmark of report.Benchmarks)
    {
        const result = benchmark.Measurements.filter(row => row.IterationMode === 'Workload' && row.IterationStage === 'Result');
        const sections = workloadSections.filter(section => section.startsWith(`${benchmark.Type}.${benchmark.Method}:`) &&
            section.slice(0, section.indexOf('\n')).includes(`[${benchmark.Parameters}]`));
        assert.equal(sections.length, 1);
        const actual = [...sections[0].matchAll(/WorkloadActual\s+(\d+): (\d+) op, ([\d.]+) ns,/g)];
        const loggedResult = [...sections[0].matchAll(/WorkloadResult\s+(\d+): (\d+) op, ([\d.]+) ns,/g)];
        assert.equal(result.length, 8);
        assert.equal(actual.length, 8);
        assert.equal(loggedResult.length, 8);
        assert.deepEqual(actual.map(row => +row[1]), [1, 2, 3, 4, 5, 6, 7, 8]);
        for (let i = 0; i < result.length; i++)
        {
            assert.equal(+loggedResult[i][2], result[i].Operations);
            assert(Math.abs(+loggedResult[i][3] - result[i].Nanoseconds) <= 0.01);
        }
        assert.equal(benchmark.Statistics.N, 8);
        assert(result.every(row => row.Operations > 0 && row.Nanoseconds > 0));
        near(benchmark.Statistics.Mean, result.reduce((sum, row) => sum + row.Nanoseconds / row.Operations, 0) / 8);
        if (benchmark.Type === 'JsonPatchColdBenchmark')
        {
            assert(result.every(row => row.Operations === 64));
            assert(actual.every(row => +row[2] === 64));
            assert(benchmark.DisplayInfo.includes('InvocationCount=1'));
            assert(benchmark.DisplayInfo.includes('UnrollFactor=1'));
        }
        assert(Number.isFinite(benchmark.Memory.BytesAllocatedPerOperation));
        resultSamples += result.length;
    }
}
assert.equal(resultSamples, 448);
for (const field of ['RuntimeVersion', 'DotNetCliVersion', 'BenchmarkDotNetVersion'])
{
    assert.deepEqual(reports.before.HostEnvironmentInfo[field], reports.after.HostEnvironmentInfo[field]);
}
const pairs = reports.before.Benchmarks.map(before =>
{
    const matches = reports.after.Benchmarks.filter(after => after.FullName === before.FullName);
    assert.equal(matches.length, 1);
    const after = matches[0];
    return {
        name: before.FullName,
        parameters: before.Parameters,
        cold_first_use: before.Type === 'JsonPatchColdBenchmark',
        before_ns: before.Statistics.Mean,
        after_ns: after.Statistics.Mean,
        paired_time_change_percent: 100 * (after.Statistics.Mean / before.Statistics.Mean - 1),
        before_bytes: before.Memory.BytesAllocatedPerOperation,
        after_bytes: after.Memory.BytesAllocatedPerOperation,
        before_rsd_percent: 100 * before.Statistics.StandardDeviation / before.Statistics.Mean,
        after_rsd_percent: 100 * after.Statistics.StandardDeviation / after.Statistics.Mean,
    };
});
assert.equal(pairs.filter(row => row.paired_time_change_percent <= -50).length, 15);
if (fs.existsSync(path.join(root, 'comparison.json')))
{
    const summary = read('comparison.json');
    assert.equal(summary.cases.length, 28);
    assert.deepEqual(summary.rounds, [1]);
    for (const pair of pairs)
    {
        const matches = summary.cases.filter(row => row.name === pair.name);
        assert.equal(matches.length, 1);
        const row = matches[0];
        near(row.before_ns[0], pair.before_ns);
        near(row.after_ns[0], pair.after_ns);
        near(row.median_paired_time_change_percent, pair.paired_time_change_percent);
        near(row.before_bytes[0], pair.before_bytes);
        near(row.after_bytes[0], pair.after_bytes);
    }
}
const suites = ['tests-before', 'tests-naive-strong', 'tests-after'];
const xmlParser = String.raw`
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
$all = foreach ($suite in 'tests-before','tests-naive-strong','tests-after')
{
    [xml]$xml = [IO.File]::ReadAllText([IO.Path]::Combine($env:AUTOPERF_F086_ROOT,$suite,'results.trx'))
    $rows = @($xml.TestRun.Results.UnitTestResult | ForEach-Object {
        @{name=[string]$_.testName;outcome=[string]$_.outcome;message=[string]$_.Output.ErrorInfo.Message}
    })
    @{rows=$rows}
}
ConvertTo-Json -InputObject @($all) -Depth 8 -Compress
`;
const tests = JSON.parse(execFileSync(process.platform === 'win32' ? 'powershell.exe' : 'pwsh',
    ['-NoProfile', '-NonInteractive', '-Command', xmlParser],
    { encoding: 'utf8', env: { ...process.env, AUTOPERF_F086_ROOT: path.resolve(root) } })).map(suite => suite.rows);
const testSummary = suites.map((suite, index) =>
{
    const rows = tests[index];
    assert.equal(rows.length, 83);
    const failed = rows.filter(row => row.outcome !== 'Passed');
    assert.equal(failed.length, index === 1 ? 1 : 0);
    if (index === 1)
    {
        assert(failed[0].name.endsWith('.Get_DoesNotRetainCollectibleListOrElementTypes'));
        assert(failed[0].message.includes('Assert.False()'));
    }
    const newRows = rows.filter(row => /Patch_RepeatedAdaptersPreserveRuntimeListElementTypes|Patch_ConcurrentAdaptersPreserveRuntimeListElementTypes|Get_DoesNotRetainCollectibleListOrElementTypes/.test(row.name));
    assert.equal(newRows.length, 7);
    assert.equal(new Set(newRows.map(row => row.name)).size, 7);
    return { suite, actual_rows: 83, passes: rows.length - failed.length, failures: failed.length, skipped: 0, new_rows: 7 };
});
assert.deepEqual(tests[0].map(row => row.name).sort(), tests[2].map(row => row.name).sort());
const original = read('original-owner-validation.json');
const selected = read('tested-owner-after.json');
assert.equal(original.owner_sha256, read('before-manifest.json').target_assembly_sha256);
assert.equal(selected.owner_sha256, read('after-manifest.json').target_assembly_sha256);
const pdbCommands = read('pdb-commands.json');
assert.equal(pdbCommands.length, 8);
for (const command of pdbCommands)
{
    assert.equal(command.exit_code, 0);
    const proof = read(`pdb-${command.name}.json`);
    assert.equal(proof.verified, true);
    assert.equal(proof.actual_pdb_document_sha256, proof.source_sha256);
    const source = command.name.startsWith('harness-') ? `harness/${command.name.slice(8)}` :
        command.name.includes('test-source') ? 'source-tests.cs' :
        command.name === 'naive-strong' ? 'source-naive-strong.cs' : `source-${command.name}.cs`;
    assert.equal(hash(source).toUpperCase(), proof.source_sha256);
}
assert.deepEqual(read('contracts-before.json'), read('contracts-after.json'));
assert.equal(read('contracts-before.json').cases.length, 28);
const stateFiles = fs.readdirSync(path.join(root, 'contracts-before-states')).sort();
assert.equal(stateFiles.length, 28);
assert.deepEqual(stateFiles, fs.readdirSync(path.join(root, 'contracts-after-states')).sort());
for (const file of stateFiles)
{
    assert.equal(hash(`contracts-before-states/${file}`), hash(`contracts-after-states/${file}`));
}
const closure = read('execution-closure.json');
assert.equal(closure.copied_files, 152);
assert.equal(closure.runtime_assets, 70);
assert.equal(closure.before.length, 152);
assert.equal(closure.after.length, 152);
assert.equal(closure.runtimeAssets.length, 70);
assert.equal(closure.complete_recursive_file_sets_equal, true);
assert.deepEqual(closure.changed_files, [
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.dll',
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.pdb',
]);
for (let i = 0; i < closure.before.length; i++)
{
    assert.equal(closure.before[i].file, closure.after[i].file);
    if (!closure.changed_files.includes(closure.before[i].file))
    {
        assert.equal(closure.before[i].sha256, closure.after[i].sha256);
    }
}
for (const variant of ['before', 'after'])
{
    const manifest = read(`${variant}-manifest.json`);
    assert.equal(closure[variant].find(row => row.file === manifest.target_assembly).sha256.toUpperCase(), manifest.target_assembly_sha256);
}
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const formatter = fs.existsSync(path.join(scriptDirectory, 'formatting-audit.mjs')) ?
    path.join(scriptDirectory, 'formatting-audit.mjs') : path.join(scriptDirectory, 'F086-formatting-audit.mjs');
execFileSync('node', [formatter, root, '--verify'], { stdio: 'inherit' });
const audit = {
    candidate: 'F086',
    selected_rounds: [1],
    comparison_budget_closed: true,
    comparisons: 1,
    pairs: 28,
    outcomes: 56,
    actual_result_samples: 448,
    console_actual_workload_rows: 448,
    large_warm_gain_profiles: 15,
    executing_owner_markers: markers,
    cold_protocols: coldProtocols,
    actual_test_outcomes: 249,
    actual_test_passes: 248,
    expected_unmeasured_strong_cache_failures: 1,
    test_suites: testSummary,
    identical_actual_state_captures: 56,
    verified_source_pdb_documents: 8,
    closure_files: 152,
    runtime_assets: 70,
    full_file_formatter_passed: false,
    baseline_only_formatter_diagnostics: 3,
    added_line_formatter_violations: 0,
    pairs_detail: pairs,
};
if (write)
{
    fs.writeFileSync(path.join(root, 'measurement-audit.json'), JSON.stringify(audit, null, 2) + '\n');
}
else
{
    assert.deepEqual(read('measurement-audit.json'), audit);
}
console.log('F086:56 outcomes/28 pairs/448 actual results,249 actual XML rows,56 state captures,58 owner markers,8 PDB documents and152/70 closure audited;1/3 large-win budget closed,all costs retained.');
