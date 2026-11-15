import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root = path.resolve(process.argv[2] ?? '.');
const mode = process.argv[3] ?? '--verify';
assert.ok(['--write', '--verify'].includes(mode));
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8').replace(/^\uFEFF/, ''));
const hash = name => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex').toUpperCase();
const execution = read('all-execution.json');
assert.equal(execution.length, 6);
assert.deepEqual(execution.map(run => run.label), [
    'round-1-before', 'round-1-after', 'round-2-after',
    'round-2-before', 'round-3-before', 'round-3-after'
]);
const snapshots = ['before', 'after', 'after-2', 'after-3'];
const manifests = Object.fromEntries(snapshots.map(snapshot => [snapshot, read(`${snapshot}-manifest.json`)]));
const strategies = ['per-entry-requested-parsed-value-reuse', 'first-parameterless-equality-after-requested-parse',
    'first-nonempty-parameterless-equality-before-parsing'];
assert.equal(new Set(Object.values(manifests).map(manifest => manifest.target_assembly_sha256)).size, 4);
const reports = new Map();
let samples = 0;
let markers = 0;
let environment;
for (let i = 0; i < execution.length; i++)
{
    const run = execution[i];
    assert.equal(run.exit_code, 0);
    assert.equal(run.round, Math.floor(i / 2) + 1);
    assert.equal(run.snapshot, run.variant === 'before' ? 'before' : snapshots[run.round]);
    assert.ok(Date.parse(run.completed_at) > Date.parse(run.started_at));
    if (i > 0)
    {
        assert.ok(Date.parse(run.started_at) >= Date.parse(execution[i - 1].completed_at));
    }
    const report = read(`${run.label}/results.json`);
    assert.equal(report.Benchmarks.length, 30);
    assert.equal(new Set(report.Benchmarks.map(row => row.FullName)).size, 30);
    const runtime = {
        sdk: report.HostEnvironmentInfo.DotNetCliVersion,
        runtime: report.HostEnvironmentInfo.RuntimeVersion,
        bdn: report.HostEnvironmentInfo.BenchmarkDotNetVersion
    };
    if (environment)
    {
        assert.deepEqual(runtime, environment);
    }
    environment = runtime;
    for (const row of report.Benchmarks)
    {
        assert.equal(row.Statistics.N, 8);
        assert.ok(row.Statistics.Mean > 0);
        assert.ok(Number.isFinite(row.Memory.BytesAllocatedPerOperation));
        const actual = row.Measurements.filter(sample =>
            sample.IterationMode === 'Workload' && sample.IterationStage === 'Result');
        assert.equal(actual.length, 8);
        const values = actual.map(sample =>
        {
            assert.ok(sample.Operations > 0 && sample.Nanoseconds > 0);
            return sample.Nanoseconds / sample.Operations;
        });
        const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
        assert.ok(Math.abs(mean - row.Statistics.Mean) <= Math.max(1, mean) * 1e-10);
        samples += values.length;
    }
    const log = fs.readFileSync(path.join(root, run.label, 'console.log'), 'utf8');
    const owners = [...log.matchAll(/AUTOPERF_OWNER_SHA256=([A-F0-9]{64})/g)].map(match => match[1]);
    assert.ok(owners.length >= 31);
    assert.deepEqual([...new Set(owners)], [manifests[run.snapshot].target_assembly_sha256]);
    assert.ok(!log.includes('// ERROR'));
    markers += owners.length;
    reports.set(run.label, report);
}
const comparisons = [];
for (let round = 1; round <= 3; round++)
{
    const before = reports.get(`round-${round}-before`);
    const after = new Map(reports.get(`round-${round}-after`).Benchmarks.map(row => [row.FullName, row]));
    const cases = before.Benchmarks.map(b =>
    {
        const a = after.get(b.FullName);
        assert.ok(a);
        return {
            name: b.FullName,
            profile: /ResourceFilter\(Case: "([^"]+)"\)$/.exec(b.FullName)?.[1],
            before_ns: b.Statistics.Mean,
            after_ns: a.Statistics.Mean,
            time_change_percent: 100 * (a.Statistics.Mean / b.Statistics.Mean - 1),
            before_standard_deviation_ns: b.Statistics.StandardDeviation,
            after_standard_deviation_ns: a.Statistics.StandardDeviation,
            before_bytes: b.Memory.BytesAllocatedPerOperation,
            after_bytes: a.Memory.BytesAllocatedPerOperation,
            samples_per_variant: 8
        };
    });
    assert.ok(cases.every(row => row.profile));
    comparisons.push({ round, strategy: strategies[round - 1], cases });
}
for (const snapshot of snapshots.slice(1))
{
    for (const key of ['benchmark_assembly_sha256', 'runtime_configuration_sha256', 'dependency_configuration_sha256'])
    {
        assert.equal(manifests[snapshot][key], manifests.before[key]);
    }
}
for (const file of ['dependency-closure-1.json', 'dependency-closure-2.json', 'dependency-closure-final.json'])
{
    const closure = read(file);
    assert.equal(closure.count, 165);
    assert.deepEqual(closure.differences, ['Microsoft.AspNetCore.Mvc.Core.dll']);
    const variants = Object.keys(closure.hashes);
    assert.equal(variants.length, 2);
    const a = closure.hashes[variants[0]];
    const b = closure.hashes[variants[1]];
    assert.equal(Object.keys(a).length, 165);
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
    assert.deepEqual(Object.keys(a).filter(key => a[key] !== b[key]), closure.differences);
}
const originalContractBytes = fs.readFileSync(path.join(root, 'contracts-before.json'));
for (const snapshot of snapshots.slice(1))
{
    assert.ok(originalContractBytes.equals(fs.readFileSync(path.join(root, `contracts-${snapshot}.json`))));
}
const contracts = read('contracts-before.json');
assert.equal(contracts.cases.length, 30);
assert.equal(contracts.metadata_updates.length, 4);
assert.deepEqual(contracts.metadata_updates.map(row => row.name),
    ['SecondProviderOverridesFirst', 'SameMetadataInstanceChanges', 'SameMetadataInstanceReturns', 'UpdatedMapping']);
const rawBefore = read('raw-producers-before-final.json');
const rawAfter = read('raw-producers-after-final.json');
assert.equal(rawBefore.owner_sha256, manifests.before.target_assembly_sha256);
assert.equal(rawAfter.owner_sha256, manifests['after-3'].target_assembly_sha256);
assert.equal(rawBefore.diagnostic_not_timed, true);
assert.equal(rawAfter.diagnostic_not_timed, true);
assert.equal(rawBefore.records.length, 27);
assert.deepEqual(rawBefore.records, rawAfter.records);
assert.equal(rawBefore.records[15].actual_resource_error, 'ArgumentOutOfRangeException(index)');
assert.equal(rawBefore.records[26].actual_constructor_error, 'ArgumentOutOfRangeException(offset)');
assert.equal(rawBefore.records[26].actual_resource_error, 'ArgumentOutOfRangeException(offset)');
assert.equal(rawBefore.records[26].same_reference_alias, true);
const sourceFiles = ['source-original.cs', 'source-proposed-1.cs', 'source-proposed-2.cs', 'source-proposed-3.cs',
    'source-tests-after-3.cs', 'harness/Program.cs', 'harness/FormatFilterFixture.cs', 'harness/FormatFilterBenchmark.cs'];
const documents = read('compiled-source-identity-final.json').documents;
assert.equal(documents.length, 8);
for (let i = 0; i < sourceFiles.length; i++)
{
    assert.equal(documents[i].verified, true);
    assert.equal(documents[i].actual_pdb_document_sha256, hash(sourceFiles[i]));
    assert.equal(documents[i].source_sha256, hash(sourceFiles[i]));
    if (i < 4)
    {
        assert.equal(manifests[snapshots[i]].target_source_sha256, hash(sourceFiles[i]));
    }
}
const finalSource = read('committed-source-identity.json');
assert.equal(finalSource.documents.length, 2);
for (const document of finalSource.documents)
{
    assert.equal(document.source_sha256, hash(document.source_snapshot));
    assert.equal(document.committed_source_equal_after_git_line_ending_canonicalization, true);
}
const testResults = [];
for (const [directory, count] of [
    ['tests-original-final-boundaries', 36], ['tests-after-3', 36],
    ['http-original-restored', 3], ['http-after-3', 3]])
{
    const trx = fs.readFileSync(path.join(root, directory, 'results.trx'), 'utf8');
    const rows = [...trx.matchAll(/<UnitTestResult\b([^>]*)>/g)].map(match =>
    {
        const name = /\btestName="([^"]+)"/.exec(match[1])?.[1];
        const outcome = /\boutcome="([^"]+)"/.exec(match[1])?.[1];
        assert.ok(name);
        assert.equal(outcome, 'Passed');
        return name;
    });
    assert.equal(rows.length, count);
    assert.equal(new Set(rows).size, count);
    assert.equal(read(`${directory}/command.json`).exit_code, 0);
    testResults.push({ directory, total: count, passed: count });
}
assert.equal(read('formatting.json').exit_code, 0);
assert.deepEqual(read('comparison.json').rounds, [3]);
const finalCases = comparisons[2].cases;
assert.equal(finalCases.length, 30);
for (const row of finalCases)
{
    const derived = read('comparison.json').cases.find(item => item.name === row.name);
    assert.ok(derived);
    assert.ok(Math.abs(derived.median_paired_time_change_percent - row.time_change_percent) < 1e-10);
    assert.equal(row.before_bytes, row.after_bytes);
}
const audit = {
    candidate: 'F071',
    measured_comparisons: 3,
    measured_source_strategies: 3,
    final_strategy_comparisons: 1,
    no_aggregation_across_strategies: true,
    complete_outcomes: 180,
    paired_rows: 90,
    actual_workload_result_samples: samples,
    actual_owner_markers: markers,
    recursive_dll_json_closure_count: 165,
    canonical_harness_settings_and_dependencies_identical_except_owner: true,
    byte_identical_owner_contract_profiles: 30,
    live_metadata_update_contracts: 4,
    actual_raw_producer_outcomes_and_errors_identical: 27,
    actual_pdb_documents: 8,
    final_allocations_unchanged: true,
    volatile_original_ExactJson1_in_rounds_2_and_3_not_credible_large_gain_evidence: true,
    test_results: testResults,
    comparison_budget_closed: true,
    environment,
    all_checks_passed: true
};
assert.equal(samples, 1440);
for (const [name, data] of [['all-comparisons.json', comparisons], ['measurement-audit.json', audit]])
{
    const generated = Buffer.from(JSON.stringify(data, null, 2) + '\n');
    const target = path.join(root, name);
    if (mode === '--write')
    {
        assert.ok(!fs.existsSync(target), `Refusing to overwrite ${name}`);
        fs.writeFileSync(target, generated);
    }
    else
    {
        assert.ok(fs.readFileSync(target).equals(generated), `Derived ${name} does not reproduce`);
    }
}
console.log(`F071: 180 outcomes, 90 paired rows, ${samples} actual samples, ${markers} actual owner markers; ${mode} passed.`);
