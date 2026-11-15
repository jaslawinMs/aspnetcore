import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(process.argv[2] ?? '.');
const mode = process.argv[3] ?? '--verify';
assert.ok(['--write', '--verify'].includes(mode));
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8').replace(/^\uFEFF/, ''));
const execution = read('all-execution.json');
assert.equal(execution.length, 6);
assert.deepEqual(execution.map(run => run.label), [
    'round-1-before', 'round-1-after', 'round-2-after',
    'round-2-before', 'round-3-before', 'round-3-after'
]);
const strategies = ['per-character-identity-guard', 'helper-exact-span-guards', 'equal-length-common-prefix'];
const owner = {
    before: read('before-manifest.json').target_assembly_sha256,
    after: read('after-manifest.json').target_assembly_sha256,
    'after-2': read('after-2-manifest.json').target_assembly_sha256,
    'after-3': read('after-3-manifest.json').target_assembly_sha256
};
const reports = new Map();
let samples = 0;
let markers = 0;
let environment;
for (let i = 0; i < execution.length; i++)
{
    const run = execution[i];
    assert.equal(run.exit_code, 0);
    assert.equal(run.round, Math.floor(i / 2) + 1);
    assert.equal(run.snapshot, run.variant === 'before' ? 'before'
        : ['after', 'after-2', 'after-3'][run.round - 1]);
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
        samples += actual.length;
    }
    const log = fs.readFileSync(path.join(root, run.label, 'console.log'), 'utf8');
    const actualOwners = [...log.matchAll(/AUTOPERF_OWNER_SHA256=([A-F0-9]{64})/g)].map(match => match[1]);
    assert.ok(actualOwners.length >= 31);
    assert.deepEqual([...new Set(actualOwners)], [owner[run.snapshot]]);
    assert.ok(!log.includes('// ERROR'));
    markers += actualOwners.length;
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
            profile: /^\S+\.Exercise\(Case: (.+)\)$/.exec(b.FullName)?.[1],
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
const beforeConfig = read('before-manifest.json');
for (const snapshot of ['after', 'after-2', 'after-3'])
{
    const config = read(`${snapshot}-manifest.json`);
    for (const key of ['benchmark_assembly_sha256', 'runtime_configuration_sha256', 'dependency_configuration_sha256'])
    {
        assert.equal(config[key], beforeConfig[key]);
    }
}
for (const name of ['dependency-closure-1.json', 'dependency-closure-2.json', 'dependency-closure-final.json'])
{
    const closure = read(name);
    assert.equal(closure.count, 94);
    assert.deepEqual(closure.differences, ['Microsoft.AspNetCore.Components.Web.dll']);
    const variants = Object.keys(closure.hashes);
    assert.equal(variants.length, 2);
    const a = closure.hashes[variants[0]];
    const b = closure.hashes[variants[1]];
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
    assert.deepEqual(Object.keys(a).filter(key => a[key] !== b[key]), closure.differences);
}
for (const suffix of ['', '-strict'])
{
    const before = fs.readFileSync(path.join(root, `contracts-before${suffix}.json`));
    const after = fs.readFileSync(path.join(root, `contracts-after-final${suffix}.json`));
    assert.ok(before.equals(after));
    const contract = read(`contracts-before${suffix}.json`);
    assert.equal(contract.contracts.length, 30);
    assert.equal(contract.raw_character_diagnostics.identical_utf16_checks, 65536);
    assert.equal(contract.raw_character_diagnostics.differing_pairs.length, 9);
}
assert.deepEqual(read('browser-original-3.json').cases, read('browser-proposed-final.json').cases);
assert.equal(read('browser-proposed-final.json').cases.length, 9);
const audit = {
    candidate: 'F070',
    measured_comparisons: 3,
    measured_source_strategies: 3,
    unmeasured_caller_alternative_not_counted_as_a_measurement: true,
    final_strategy_comparisons: 1,
    no_aggregation_across_strategies: true,
    complete_outcomes: 180,
    paired_rows: 90,
    actual_workload_result_samples: samples,
    actual_owner_markers: markers,
    identical_canonical_harness_settings_and_dependencies_except_owner: true,
    recursive_dll_json_closure_count: 94,
    original_final_contract_states_per_variant: 180,
    original_final_browser_states_per_variant: 9,
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
console.log(`F070: ${audit.complete_outcomes} outcomes, ${audit.paired_rows} pairs, ${samples} actual samples, ${markers} actual owner markers; ${mode} passed.`);
