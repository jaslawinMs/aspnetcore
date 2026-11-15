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
const snapshots = ['before', 'after', 'after-2'];
const selectedByRound = ['after', 'after-2', 'after-2'];
const manifests = Object.fromEntries(snapshots.map(snapshot => [snapshot, read(`${snapshot}-manifest.json`)]));
const strategies = ['default-value-null-plain-parse-guard', 'direct-null-plain-add-and-continue'];
assert.equal(new Set(Object.values(manifests).map(manifest => manifest.target_assembly_sha256)).size, 3);
const reports = new Map();
let samples = 0;
let markers = 0;
let environment;
for (let i = 0; i < execution.length; i++)
{
    const run = execution[i];
    assert.equal(run.exit_code, 0);
    assert.equal(run.round, Math.floor(i / 2) + 1);
    assert.equal(run.snapshot, run.variant === 'before' ? 'before' : selectedByRound[run.round - 1]);
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
            profile: /Exercise\(Case: "([^"]+)"\)$/.exec(b.FullName)?.[1],
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
    comparisons.push({ round, snapshot: selectedByRound[round - 1], strategy: strategies[round === 1 ? 0 : 1], cases });
}
for (const snapshot of snapshots.slice(1))
{
    for (const key of ['benchmark_assembly_sha256', 'runtime_configuration_sha256', 'dependency_configuration_sha256'])
    {
        assert.equal(manifests[snapshot][key], manifests.before[key]);
    }
}
for (const file of ['dependency-closure-1.json', 'dependency-closure-2.json'])
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
assert.equal(contracts.metadata_updates.length, 1);
assert.deepEqual(contracts.metadata_updates[0], {
    original: ['application/json'],
    changed: ['application/xml', 'text/plain'],
    removed: ['text/plain']
});
assert.equal(contracts.raw_producers.length, 13);
assert.equal(contracts.raw_producers[0].actual_error, 'ArgumentOutOfRangeException(offset)');
assert.equal(contracts.raw_producers[1].actual_error, 'ArgumentOutOfRangeException(index)');
for (const item of contracts.cases.filter(item => item.Name.startsWith('Metadata')))
{
    const contract = item.contract;
    assert.equal(contract.actual_controller_actions, 4);
    assert.equal(contract.owner_reached, item.Name !== 'MetadataCachedControl');
    assert.deepEqual(contract.descriptions.map(description => description.RelativePath), [
        'autoperf/metadata/declared', 'autoperf/metadata/empty',
        'autoperf/metadata/implicit', 'autoperf/metadata/typed'
    ]);
    for (const description of contract.descriptions)
    {
        assert.equal(description.HttpMethod, 'GET');
        assert.equal(description.responses.length, 1);
        const response = description.responses[0];
        assert.equal(response.StatusCode, 200);
        assert.equal(response.type, description.RelativePath.endsWith('/empty') ? 'System.Void' : 'AutoPerf.MetadataPayload');
        if (description.RelativePath.endsWith('/empty'))
        {
            assert.deepEqual(response.formats, []);
        }
        else if (description.RelativePath.endsWith('/declared'))
        {
            assert.deepEqual(response.formats, [{ MediaType: 'application/x-declared', formatter: null }]);
        }
        else
        {
            assert.equal(response.formats.length, item.Name === 'MetadataPlain32' ? 32 : item.Name === 'MetadataMixed3' ? 2 : 3);
            assert.ok(response.formats.every(format => format.formatter === 'BenchmarkFormatter'));
        }
    }
}
const sourceFiles = ['source-original.cs', 'source-proposed-1.cs', 'source-proposed-2.cs', 'source-tests.cs',
    'harness/Program.cs', 'harness/FormatterFixture.cs', 'harness/OutputFormatterBenchmark.cs'];
const documents = read('compiled-source-identity-final.json').documents;
assert.equal(documents.length, 7);
for (let i = 0; i < sourceFiles.length; i++)
{
    assert.equal(documents[i].verified, true);
    assert.equal(documents[i].actual_pdb_document_sha256, hash(sourceFiles[i]));
    assert.equal(documents[i].source_sha256, hash(sourceFiles[i]));
    if (i < 3)
    {
        assert.equal(manifests[snapshots[i]].target_source_sha256, hash(sourceFiles[i]));
    }
}
assert.equal(manifests['after-2'].additional_target_sources[0].sha256, hash('source-tests.cs'));
const committedSource = read('committed-source-identity.json');
assert.equal(committedSource.documents.length, 2);
for (const document of committedSource.documents)
{
    assert.equal(document.source_sha256, hash(document.source_snapshot));
    assert.equal(document.committed_source_equal_after_git_line_ending_canonicalization, true);
}
const testResults = [];
for (const [directory, count] of [
    ['tests-before', 23], ['tests-after', 23], ['tests-after-2', 23],
    ['api-tests-original-restored', 28], ['api-tests-after', 28], ['api-tests-after-2', 28],
    ['tests-original', 43]])
{
    const trx = fs.readFileSync(path.join(root, directory, 'results.trx'), 'utf8');
    const rows = [...trx.matchAll(/<UnitTestResult\b([^>]*)>/g)].map(match =>
    {
        const name = /\btestName="([^"]+)"/.exec(match[1])?.[1];
        assert.ok(name);
        assert.equal(/\boutcome="([^"]+)"/.exec(match[1])?.[1], 'Passed');
        return name;
    });
    assert.equal(rows.length, count);
    assert.equal(new Set(rows).size, count);
    assert.equal(read(`${directory}/command.json`).exit_code, 0);
    testResults.push({ directory, total: count, passed: count });
}
const apiOwner = read('api-tests-after-2/owner-validation.json');
assert.equal(apiOwner.actual_test_owner_equal_frozen_selected_owner, true);
assert.equal(apiOwner.actual_test_owner_sha256, manifests['after-2'].target_assembly_sha256);
assert.equal(apiOwner.frozen_owner_sha256, manifests['after-2'].target_assembly_sha256);
assert.equal(read('formatting.json').exit_code, 0);
const finalComparison = read('comparison.json');
assert.deepEqual(finalComparison.rounds, [2, 3]);
const allocationCounterDifferences = [];
for (const derived of finalComparison.cases)
{
    const pairs = comparisons.slice(1).map(comparison => comparison.cases.find(row => row.name === derived.name));
    assert.ok(pairs.every(Boolean));
    assert.deepEqual(derived.before_ns, pairs.map(row => row.before_ns));
    assert.deepEqual(derived.after_ns, pairs.map(row => row.after_ns));
    assert.deepEqual(derived.before_bytes, pairs.map(row => row.before_bytes));
    assert.deepEqual(derived.after_bytes, pairs.map(row => row.after_bytes));
    const median = pairs.reduce((sum, row) => sum + row.time_change_percent, 0) / 2;
    assert.ok(Math.abs(derived.median_paired_time_change_percent - median) < 1e-10);
    for (let i = 0; i < pairs.length; i++)
    {
        const row = pairs[i];
        if (!row.profile.startsWith('Metadata') || row.profile === 'MetadataCachedControl')
        {
            assert.equal(row.before_bytes, row.after_bytes);
        }
        if (row.before_bytes !== row.after_bytes)
        {
            allocationCounterDifferences.push({
                round: i + 2, profile: row.profile, before_bytes: row.before_bytes, after_bytes: row.after_bytes
            });
        }
    }
}
assert.equal(finalComparison.cases.length, 30);
const spread = read('spread-inspection.json');
assert.equal(spread.length, 8);
for (const item of spread)
{
    const row = reports.get(`round-${item.round}-${item.variant}`).Benchmarks.find(row =>
        row.FullName.endsWith(`(Case: "${item.profile}")`));
    assert.ok(row);
    assert.equal(item.mean, row.Statistics.Mean);
    assert.equal(item.sd, row.Statistics.StandardDeviation);
    assert.deepEqual(item.values, row.Measurements.filter(sample =>
        sample.IterationMode === 'Workload' && sample.IterationStage === 'Result')
        .map(sample => sample.Nanoseconds / sample.Operations));
}
const suffix2 = comparisons[1].cases.find(row => row.profile === 'Suffix1');
const suffix3 = comparisons[2].cases.find(row => row.profile === 'Suffix1');
const mixed2 = comparisons[1].cases.find(row => row.profile === 'MetadataMixed3');
const mixed3 = comparisons[2].cases.find(row => row.profile === 'MetadataMixed3');
assert.ok(suffix2.time_change_percent > 20 && suffix2.after_standard_deviation_ns / suffix2.after_ns > 0.1);
assert.ok(Math.abs(suffix3.time_change_percent) < 2);
assert.ok(mixed2.before_standard_deviation_ns / mixed2.before_ns > 0.1 && mixed2.time_change_percent < -10);
assert.ok(mixed3.time_change_percent > 0);
assert.equal(samples, 1440);
assert.equal(markers, 186);
const audit = {
    candidate: 'F072',
    measured_comparisons: 3,
    measured_source_strategies: 2,
    final_strategy_comparisons: 2,
    selected_strategy_rounds: [2, 3],
    no_aggregation_across_strategies: true,
    complete_outcomes: 180,
    paired_rows: 90,
    actual_workload_result_samples: samples,
    actual_owner_markers: markers,
    recursive_dll_json_closure_count: 165,
    canonical_harness_settings_and_dependencies_identical_except_owner: true,
    byte_identical_owner_contract_profiles: 30,
    live_mutation_contracts: 1,
    actual_raw_producer_outcomes_and_errors_identical: 13,
    actual_controller_metadata_profiles: 5,
    actual_pdb_documents: 7,
    prepared_and_cached_control_allocations_unchanged: true,
    final_allocation_counter_differences: allocationCounterDifferences,
    structural_allocation_saving_claim: false,
    large_round2_suffix_cost_and_mixed_metadata_gain_not_repeated: true,
    test_results: testResults,
    comparison_budget_closed: true,
    environment,
    all_checks_passed: true
};
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
console.log(`F072: 180 outcomes, 90 pairs, ${samples} samples, ${markers} owner markers; two strategies, final rounds2/3; ${mode} passed.`);
