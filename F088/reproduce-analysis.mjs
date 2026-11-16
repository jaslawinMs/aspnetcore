import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), 'autoperf-runs', 'F088');
const recordedClosureOnly = process.argv.includes('--published-records');
const verifyOnly = process.argv.includes('--verify');
assert(!recordedClosureOnly || verifyOnly, 'Published records may verify, not replace, the original host audit.');
const text = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, '');
const json = file => JSON.parse(text(file));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex').toUpperCase();
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const near = (a, b) => assert(Math.abs(a - b) <= Math.max(0.011, Math.abs(b) * 1e-11), `${a} != ${b}`);
const methods = ['PreparedRenderBlock', 'ProviderComponentHtml', 'CustomProviderComponentHtml'];
const oracles = json('contract-oracles.json');
assert.equal(oracles.length, 11);
assert.equal(new Set(oracles.map(state => state.Case)).size, 11);
const expectedNames = oracles.flatMap(state => methods.map(method =>
    `AutoPerf.TableClassBenchmark.${method}(Case: "${state.Case}")`)).sort();
const execution = json(recordedClosureOnly ? 'execution-original.json' : 'execution.json');
assert.deepEqual(execution.map(run => [run.round, run.variant]),
    [[1, 'before'], [1, 'after'], [2, 'after'], [2, 'before'], [3, 'before'], [3, 'after']]);
const manifests = Object.fromEntries(['before', 'after'].map(variant => [variant, json(`${variant}-manifest.json`)]));
const closure = json('execution-closure.json');
assert.equal(closure.copied_files, 89);
assert.equal(closure.runtime_assets, 31);
assert.equal(closure.complete_recursive_file_sets_equal, true);
assert.deepEqual(closure.changed_files, ['Microsoft.AspNetCore.Components.AI.dll', 'Microsoft.AspNetCore.Components.AI.pdb']);
for (const variant of ['before', 'after'])
{
    for (const file of closure[variant])
    {
        if (!recordedClosureOnly)
        {
            assert.equal(hash(`binaries/${variant}/${file.file}`), file.sha256.toUpperCase());
        }
    }
    const manifest = manifests[variant];
    for (const [file, expected] of [
        [manifest.target_assembly, manifest.target_assembly_sha256],
        [manifest.benchmark_assembly, manifest.benchmark_assembly_sha256],
        ['AutoPerf.Benchmarks.runtimeconfig.json', manifest.runtime_configuration_sha256],
        ['AutoPerf.Benchmarks.deps.json', manifest.dependency_configuration_sha256],
    ])
    {
        assert.equal(closure[variant].find(record => record.file === file)?.sha256.toUpperCase(), expected);
    }
    if (!recordedClosureOnly)
    {
        assert.equal(hash(`binaries/${variant}/contract-oracles.json`), hash('contract-oracles.json'));
    }
    const runtimeFile = recordedClosureOnly ? `runtime-config-${variant}.json` :
        `binaries/${variant}/AutoPerf.Benchmarks.runtimeconfig.json`;
    assert.equal(hash(runtimeFile), manifest.runtime_configuration_sha256);
    const runtime = json(runtimeFile).runtimeOptions;
    assert.equal(runtime.framework.version, '12.0.0-alpha.1.26562.105');
    assert.equal(runtime.rollForward, 'Disable');
    assert.equal(runtime.configProperties['System.GC.Server'], true);
}
assert.equal(manifests.before.benchmark_assembly_sha256, manifests.after.benchmark_assembly_sha256);
assert.equal(manifests.before.runtime_configuration_sha256, manifests.after.runtime_configuration_sha256);
assert.equal(manifests.before.dependency_configuration_sha256, manifests.after.dependency_configuration_sha256);

const proofs = [
    ['pdb-owner-before.json', 'source-before.cs'], ['pdb-owner-after.json', 'source-after.cs'],
    ['pdb-test-before.json', 'tests-before/test-source.cs'], ['pdb-test-after.json', 'tests-after/test-source.cs'],
    ['pdb-snapshot-owner-before.json', 'source-before.cs'], ['pdb-snapshot-owner-after.json', 'source-after.cs'],
    ['pdb-harness-program.json', 'harness/Program.cs'], ['pdb-harness-table.json', 'harness/TableClassBenchmark.cs'],
    ['pdb-harness-conversation.json', 'harness/ConversationFixture.cs'],
].map(([file, source]) =>
{
    const proof = json(file);
    assert.equal(proof.verified, true, file);
    assert.equal(proof.actual_pdb_document_sha256, proof.source_sha256, file);
    assert.equal(hash(source), proof.source_sha256.toUpperCase());
    return { file, source, sha256: hash(file), proof };
});
assert.equal(hash('tests-before/test-source.cs'), hash('tests-after/test-source.cs'));
assert.equal(hash('source-before.cs'), manifests.before.target_source_sha256);
assert.equal(hash('source-after.cs'), manifests.after.target_source_sha256);

const runs = [];
let startupMarkers = 0;
let stateMarkers = 0;
let samples = 0;
let actualRows = 0;
let resultRows = 0;
let previousEnd = 0;
for (const run of execution)
{
    assert.equal(run.exit_code, 0);
    assert.equal(run.sdk, '12.0.100-alpha.1.26557.102');
    assert(Date.parse(run.started_at) >= previousEnd, 'Our measured launches must not overlap.');
    assert(Date.parse(run.completed_at) >= Date.parse(run.started_at));
    previousEnd = Date.parse(run.completed_at);
    assert.deepEqual(run.arguments.slice(-10),
        ['--job', 'Short', '--warmupCount', '3', '--iterationCount', '8',
         '--iterationTime', '100', '--outliers', 'DontRemove']);
    const reportFile = `${run.label}/results/AutoPerf.TableClassBenchmark-report-full-compressed.json`;
    const report = json(reportFile);
    assert.equal(report.Benchmarks.length, 33);
    assert.deepEqual(report.Benchmarks.map(row => row.FullName).sort(), expectedNames);
    assert.equal(report.HostEnvironmentInfo.BenchmarkDotNetVersion, '0.13.0');
    assert.equal(report.HostEnvironmentInfo.DotNetCliVersion, run.sdk);
    assert.equal(report.HostEnvironmentInfo.Architecture, 'X64');
    assert.equal(report.HostEnvironmentInfo.Configuration, 'RELEASE');
    assert.equal(report.HostEnvironmentInfo.HasAttachedDebugger, false);
    const console = text(`${run.label}/console.log`);
    const ownerMarkers = [...console.matchAll(/^F088 owner SHA256: ([A-F0-9]{64})\r?$/gm)];
    assert.equal(ownerMarkers.length, 1);
    assert.equal(ownerMarkers[0][1], manifests[run.variant].target_assembly_sha256);
    startupMarkers++;
    const sections = [...console.matchAll(/^\/\/ Benchmark: TableClassBenchmark\.(\w+):[^\r\n]*\[Case=([^\]]+)\]\r?\n([\s\S]*?)(?=^\/\/ Benchmark:|(?![\s\S]))/gm)];
    assert.equal(sections.length, 33);
    assert.equal(new Set(sections.map(match => `${match[1]}/${match[2]}`)).size, 33);
    for (const row of report.Benchmarks)
    {
        const name = /^Case=(.+)$/.exec(row.Parameters)?.[1];
        const section = sections.find(match => match[1] === row.Method && match[2] === name)?.[3];
        assert(section, row.FullName);
        assert(section.includes('// GC=Concurrent Server'), `${run.label}/${row.FullName}: actual server GC header absent.`);
        const states = [...section.matchAll(/^F088 state: (\{[^\r\n]+\})\r?$/gm)];
        assert.equal(states.length, 1, row.FullName);
        const state = JSON.parse(states[0][1]);
        assert.equal(state.owner_sha256, manifests[run.variant].target_assembly_sha256);
        assert.deepEqual(state.state, oracles.find(oracle => oracle.Case === name));
        stateMarkers++;
        const results = row.Measurements.filter(sample =>
            sample.IterationMode === 'Workload' && sample.IterationStage === 'Result');
        assert.equal(results.length, 8, row.FullName);
        assert.equal(row.Statistics.N, 8, row.FullName);
        assert.equal(row.Statistics.OriginalValues.length, 8, row.FullName);
        const consoleActual = [...section.matchAll(/^WorkloadActual\s+(\d+):\s+(\d+) op,\s+([\d.]+) ns,/gm)];
        const consoleResult = [...section.matchAll(/^WorkloadResult\s+(\d+):\s+(\d+) op,\s+([\d.]+) ns,/gm)];
        assert.equal(consoleActual.length, 8, row.FullName);
        assert.equal(consoleResult.length, 8, row.FullName);
        actualRows += consoleActual.length;
        resultRows += consoleResult.length;
        for (const sample of results)
        {
            assert(sample.Operations > 0 && sample.Nanoseconds > 0);
            const index = sample.IterationIndex - 1;
            const logged = consoleResult[index];
            assert.equal(Number(logged[1]), sample.IterationIndex);
            assert.equal(Number(logged[2]), sample.Operations);
            near(Number(logged[3]), sample.Nanoseconds);
            near(sample.Nanoseconds / sample.Operations, row.Statistics.OriginalValues[index]);
            assert.equal(Number(consoleActual[index][2]), sample.Operations);
            assert(Number(consoleActual[index][3]) >= sample.Nanoseconds);
        }
        near(results.reduce((sum, sample) => sum + sample.Nanoseconds / sample.Operations, 0) / 8, row.Statistics.Mean);
        assert(Number.isFinite(row.Memory.BytesAllocatedPerOperation) && row.Memory.BytesAllocatedPerOperation >= 0);
        samples += results.length;
    }
    runs.push({ ...run, report_file: reportFile, report_sha256: hash(reportFile),
        console_sha256: hash(`${run.label}/console.log`), host: report.HostEnvironmentInfo, benchmarks: report.Benchmarks });
}
const stateFiles = ['states-round-1', 'states-rounds-2-3'].flatMap(directory =>
    fs.readdirSync(path.join(root, directory)).filter(file => file.endsWith('.json')).map(file => `${directory}/${file}`));
assert.equal(stateFiles.length, 198);
const states = stateFiles.map(file =>
{
    const value = json(file);
    assert(Object.values(manifests).some(manifest => manifest.target_assembly_sha256 === value.owner_sha256));
    assert.deepEqual(value.state, oracles.find(oracle => oracle.Case === value.state.Case));
    return { file, sha256: hash(file), owner_sha256: value.owner_sha256, case: value.state.Case };
});
for (const [variant, manifest] of Object.entries(manifests))
{
    const ownerStates = states.filter(state => state.owner_sha256 === manifest.target_assembly_sha256);
    assert.equal(ownerStates.length, 99, variant);
    for (const oracle of oracles)
    {
        assert.equal(ownerStates.filter(state => state.case === oracle.Case).length, 9);
    }
}
const comparisons = oracles.flatMap(oracle => methods.map(method =>
{
    const fullName = `AutoPerf.TableClassBenchmark.${method}(Case: "${oracle.Case}")`;
    const rounds = [1, 2, 3].map(round =>
    {
        const before = runs.find(run => run.round === round && run.variant === 'before').benchmarks.find(row => row.FullName === fullName);
        const after = runs.find(run => run.round === round && run.variant === 'after').benchmarks.find(row => row.FullName === fullName);
        return { round, before_ns: before.Statistics.Mean, after_ns: after.Statistics.Mean,
            time_change_pct: 100 * (after.Statistics.Mean / before.Statistics.Mean - 1),
            before_bytes: before.Memory.BytesAllocatedPerOperation, after_bytes: after.Memory.BytesAllocatedPerOperation,
            allocation_change_bytes: after.Memory.BytesAllocatedPerOperation - before.Memory.BytesAllocatedPerOperation,
            allocation_change_pct: before.Memory.BytesAllocatedPerOperation === 0 ? null :
                100 * (after.Memory.BytesAllocatedPerOperation / before.Memory.BytesAllocatedPerOperation - 1),
            before_cv_pct: 100 * before.Statistics.StandardDeviation / before.Statistics.Mean,
            after_cv_pct: 100 * after.Statistics.StandardDeviation / after.Statistics.Mean };
    });
    return { case: oracle.Case, method, full_name: fullName,
        median_paired_time_change_pct: median(rounds.map(round => round.time_change_pct)),
        median_before_bytes: median(rounds.map(round => round.before_bytes)),
        median_after_bytes: median(rounds.map(round => round.after_bytes)),
        median_paired_allocation_change_pct: median(rounds.map(round => round.allocation_change_pct)),
        rounds };
}));
const audit = { candidate: 'F088', measurement_budget: '3/3 closed', measured_strategies: 1,
    launch_order: 'AB/BA/AB', measured_outcomes: 198, result_samples: samples,
    actual_console_workload_rows: actualRows, actual_console_result_rows: resultRows,
    startup_owner_markers: startupMarkers, contract_owner_markers: stateMarkers,
    actual_state_files: states.length, source_pdb_proofs: proofs.length,
    copied_execution_files_per_snapshot: closure.copied_files, declared_runtime_assets: closure.runtime_assets,
    unchanged_harness_runtime_and_dependencies: true, original_and_selected_test_sources_identical: true,
    complete_copied_binary_bytes_verified_on_original_host: true,
    oracles, proofs, states, comparisons, runs };
const lines = [
    '# F088: every measured target and control',
    '',
    'Three unchanged-strategy comparisons, AB/BA/AB. Negative time/allocation change means faster/less.',
    'The median is of three paired changes, not a ratio of pooled means. ns and B/op are per operation.',
    'Prepared table rendering and full provider/component/HTML rendering are different boundaries.',
    '',
    '| Profile | Method | Median time change % | Before B/op | After B/op | Median heap change % |',
    '|---|---|---:|---:|---:|---:|',
    ...comparisons.map(row => `| ${row.case} | ${row.method} | ${row.median_paired_time_change_pct.toFixed(2)} | ${row.median_before_bytes} | ${row.median_after_bytes} | ${row.median_paired_allocation_change_pct.toFixed(2)} |`),
    '',
    '## Every paired round and retained variability',
    '',
    '| Profile | Method | Round | Before ns | After ns | Time change % | Before B/op | After B/op | Heap change B | Before CV % | After CV % |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...comparisons.flatMap(row => row.rounds.map(round =>
        `| ${row.case} | ${row.method} | ${round.round} | ${round.before_ns.toFixed(2)} | ${round.after_ns.toFixed(2)} | ${round.time_change_pct.toFixed(2)} | ${round.before_bytes} | ${round.after_bytes} | ${round.allocation_change_bytes} | ${round.before_cv_pct.toFixed(2)} | ${round.after_cv_pct.toFixed(2)} |`)),
    '',
    'All eight samples and raw console workload/result rows are retained and cross-checked in measurement-audit.json.',
    'The short target and shared host do not establish production frequency, browser allocation, cold-process behavior or universal timing.',
];
if (verifyOnly)
{
    const saved = json('measurement-audit.json');
    assert.deepEqual(audit, saved, 'Raw source/state/console/report arithmetic differs from the original host audit.');
    assert.equal(lines.join('\n') + '\n', text('comparison.md'));
}
else
{
    fs.writeFileSync(path.join(root, 'measurement-audit.json'), JSON.stringify(audit, null, 2) + '\n');
    fs.writeFileSync(path.join(root, 'comparison.md'), lines.join('\n') + '\n');
}
if (recordedClosureOnly)
{
    console.log('Published-record audit: original 89/31 closure/PDB binary checks are preserved host records; omitted binary/PDB bytes are NOT independently reverified here.');
}
console.log(`F088: ${runs.length} launches/${comparisons.length} paired profiles; ${samples} samples, ${actualRows} actual/${resultRows} result rows; ${stateMarkers} setup/${startupMarkers} startup owner markers; ${states.length} exact states; ${proofs.length} source/PDB proofs.`);
for (const row of comparisons)
{
    console.log(`${row.case}/${row.method}: ${row.median_paired_time_change_pct.toFixed(2)}% time; ${row.median_before_bytes}->${row.median_after_bytes} B; rounds ${row.rounds.map(round => round.time_change_pct.toFixed(2)).join('/')}`);
}
