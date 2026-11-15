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
assert.deepEqual(execution.map(run => run.label), [
    'round-1-before', 'round-1-after', 'round-2-after',
    'round-2-before', 'round-3-before', 'round-3-after'
]);
const snapshots = ['before', 'after', 'after-2', 'after-3'];
const manifests = Object.fromEntries(snapshots.map(snapshot => [snapshot, read(`${snapshot}-manifest.json`)]));
const strategyByRound = ['equality-first', 'early-parameter-wildcard-eligibility', 'equality-first'];
const snapshotByRound = ['after', 'after-2', 'after'];
const selectedRounds = [1, 3];
assert.equal(new Set(snapshots.map(snapshot => manifests[snapshot].target_assembly_sha256)).size, 3);
for (const snapshot of snapshots.slice(1))
{
    for (const key of ['benchmark_assembly_sha256', 'runtime_configuration_sha256', 'dependency_configuration_sha256'])
    {
        assert.equal(manifests[snapshot][key], manifests.before[key]);
    }
}
for (const key of ['target_source_sha256', 'target_assembly_sha256',
    'benchmark_assembly_sha256', 'runtime_configuration_sha256', 'dependency_configuration_sha256'])
{
    assert.equal(manifests['after-3'][key], manifests.after[key]);
}
const reports = new Map();
let samples = 0;
let markers = 0;
let environment;
let profileNames;
for (const [index, run] of execution.entries())
{
    assert.equal(run.exit_code, 0);
    assert.equal(run.round, Math.floor(index / 2) + 1);
    assert.equal(run.snapshot, run.variant === 'before' ? 'before' : snapshotByRound[run.round - 1]);
    assert.ok(Date.parse(run.completed_at) > Date.parse(run.started_at));
    if (index > 0)
    {
        assert.ok(Date.parse(run.started_at) >= Date.parse(execution[index - 1].completed_at));
    }
    for (const [flag, value] of [
        ['--filter', '*OutputNegotiationBenchmark*'], ['--warmupCount', '3'],
        ['--iterationCount', '8'], ['--iterationTime', '100'], ['--outliers', 'DontRemove']])
    {
        assert.equal(run.arguments[run.arguments.indexOf(flag) + 1], value);
    }
    assert.ok(run.arguments.includes('--inProcess'));
    const report = read(`${run.label}/results.json`);
    assert.equal(report.Benchmarks.length, 40);
    assert.equal(new Set(report.Benchmarks.map(row => row.FullName)).size, 40);
    const profiles = report.Benchmarks.map(row => /Exercise\(Case: "([^"]+)"\)$/.exec(row.FullName)?.[1]).sort();
    assert.ok(profiles.every(Boolean));
    if (profileNames)
    {
        assert.deepEqual(profiles, profileNames);
    }
    profileNames = profiles;
    const currentEnvironment = {
        sdk: report.HostEnvironmentInfo.DotNetCliVersion,
        runtime: report.HostEnvironmentInfo.RuntimeVersion,
        bdn: report.HostEnvironmentInfo.BenchmarkDotNetVersion
    };
    if (environment)
    {
        assert.deepEqual(currentEnvironment, environment);
    }
    environment = currentEnvironment;
    for (const row of report.Benchmarks)
    {
        assert.equal(row.Statistics.N, 8);
        assert.ok(Number.isFinite(row.Statistics.Mean) && row.Statistics.Mean > 0);
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
    assert.equal(owners.length, 41);
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
        assert.equal(b.Memory.BytesAllocatedPerOperation, a.Memory.BytesAllocatedPerOperation);
        return {
            name: b.FullName,
            profile: /Exercise\(Case: "([^"]+)"\)$/.exec(b.FullName)[1],
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
    comparisons.push({ round, snapshot: snapshotByRound[round - 1], strategy: strategyByRound[round - 1], cases });
}
let closureCount;
for (const index of [1, 2, 3])
{
    const closure = read(`dependency-closure-${index}.json`);
    assert.ok(closure.count > 0);
    closureCount ??= closure.count;
    assert.equal(closure.count, closureCount);
    assert.deepEqual(closure.differences, ['Microsoft.AspNetCore.Mvc.Core.dll']);
    const variants = Object.keys(closure.hashes);
    assert.equal(variants.length, 2);
    const a = closure.hashes[variants[0]];
    const b = closure.hashes[variants[1]];
    assert.equal(Object.keys(a).length, closure.count);
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
    assert.deepEqual(Object.keys(a).filter(key => a[key] !== b[key]), closure.differences);
}
const originalContractBytes = fs.readFileSync(path.join(root, 'contracts-before.json'));
for (const snapshot of snapshots.slice(1))
{
    assert.ok(originalContractBytes.equals(fs.readFileSync(path.join(root, `contracts-${snapshot}.json`))));
}
const contracts = read('contracts-before.json');
assert.equal(contracts.cases.length, 40);
assert.deepEqual(contracts.cases.map(row => row.Name).sort(), profileNames);
assert.equal(contracts.cases.filter(row => row.Name.startsWith('Direct')).length, 25);
assert.equal(contracts.cases.filter(row => row.Name.startsWith('Selector')).length, 14);
assert.equal(contracts.cases.filter(row => row.Name.startsWith('Metadata')).length, 1);
assert.equal(contracts.raw_producers.length, 26);
assert.equal(contracts.selector_producers.length, 3);
assert.equal(contracts.mutations.length, 1);
assert.equal(contracts.type_check_producers.length, 2);
assert.equal(contracts.segment_boundaries.length, 2);
assert.deepEqual(contracts.segment_boundaries.map(row => row.result), [false, true]);
assert.ok(contracts.segment_boundaries.every(row => row.segment_equal_before_owner));
assert.equal(contracts.type_check_producers[0].result, false);
assert.equal(contracts.type_check_producers[1].actual_error, 'ArgumentOutOfRangeException(offset)');
assert.ok(contracts.type_check_producers.every(row => row.supported_after === 0 && row.type_checks === 1));
assert.deepEqual(contracts.selector_producers.map(row => row.inputs.at(-1).Offset), [0, 11, 0]);
assert.deepEqual(contracts.selector_producers.map(row => row.inputs.at(-1).ServerDefined), [false, false, true]);
const sourceFiles = ['source-original.cs', 'source-proposed.cs', 'source-proposed-2.cs', 'source-tests.cs',
    'harness/Program.cs', 'harness/OutputNegotiationBenchmark.cs', 'harness/NegotiationFixture.cs'];
const documents = read('compiled-source-identity-final.json').documents;
assert.equal(documents.length, 7);
for (const [index, file] of sourceFiles.entries())
{
    assert.equal(documents[index].verified, true);
    assert.equal(documents[index].actual_pdb_document_sha256, hash(file));
    assert.equal(documents[index].source_sha256, hash(file));
    if (index < 3)
    {
        assert.equal(manifests[snapshots[index]].target_source_sha256, hash(file));
    }
}
assert.equal(manifests['after-3'].additional_target_sources[0].sha256, hash('source-tests.cs'));
const committedSource = read('committed-source-identity.json');
assert.equal(committedSource.documents.length, 2);
for (const document of committedSource.documents)
{
    assert.equal(document.source_sha256, hash(document.source_snapshot));
    assert.equal(document.committed_source_equal_after_git_line_ending_canonicalization, true);
}
const requiredNewTests = new Map([
    ['CanWriteResult_IdenticalContentType_PreservesRawValue', 8],
    ['CanWriteResult_IdenticalContentType_PreservesParsingErrors', 2],
    ['CanWriteResult_PreservesContentTypeSegmentBoundaries', 2],
    ['CanWriteResult_DoesNotSkipEarlierInvalidContentTypes', 2],
    ['CanWriteResult_ObservesSupportedMediaTypeChanges', 1],
    ['CanWriteResult_ObservesMediaTypesChangedByCanWriteType', 2]
]);
const testResults = [];
for (const [directory, count] of [
    ['tests-original', 57], ['tests-before', 74], ['tests-after', 74],
    ['tests-after-2', 74], ['tests-after-3', 74], ['http-before', 8],
    ['http-after', 8], ['http-after-2', 8], ['http-after-3', 8]])
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
    if (directory.startsWith('tests-') && directory !== 'tests-original')
    {
        for (const [name, expectedRows] of requiredNewTests)
        {
            assert.equal(rows.filter(row => row.includes(name)).length, expectedRows, name);
        }
    }
    if (directory.startsWith('http-'))
    {
        const owner = read(`${directory}/owner-validation.json`);
        assert.equal(owner.actual_owner_equal_frozen, true);
        assert.equal(owner.test_owner_sha256, manifests[owner.snapshot].target_assembly_sha256);
        assert.equal(owner.frozen_owner_sha256, owner.test_owner_sha256);
    }
    testResults.push({ directory, total: count, passed: count });
}
for (const directory of ['tests-before-annotation-failure', 'http-before-project-path-failure'])
{
    assert.equal(read(`${directory}/command.json`).exit_code, 1);
    assert.ok(!fs.existsSync(path.join(root, directory, 'results.trx')));
}
assert.equal(read('formatting.json').exit_code, 0);
const finalComparison = read('comparison.json');
assert.deepEqual(finalComparison.rounds, selectedRounds);
assert.equal(finalComparison.cases.length, 40);
for (const derived of finalComparison.cases)
{
    const pairs = selectedRounds.map(round => comparisons[round - 1].cases.find(row => row.name === derived.name));
    assert.ok(pairs.every(Boolean));
    assert.deepEqual(derived.before_ns, pairs.map(row => row.before_ns));
    assert.deepEqual(derived.after_ns, pairs.map(row => row.after_ns));
    assert.deepEqual(derived.before_bytes, pairs.map(row => row.before_bytes));
    assert.deepEqual(derived.after_bytes, pairs.map(row => row.after_bytes));
    const median = pairs.reduce((sum, row) => sum + row.time_change_percent, 0) / 2;
    assert.ok(Math.abs(derived.median_paired_time_change_percent - median) < 1e-10);
}
const spread = read('spread-inspection.json');
assert.equal(spread.length, 18);
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
const transient = spread.find(row => row.round === 3 && row.variant === 'after' && row.profile === 'DirectClientSuffix1');
assert.ok(transient.cv_pct > 40);
assert.ok(transient.values.slice(0, 5).every(value => value > 280));
assert.ok(transient.values.slice(-2).every(value => value < 80));
assert.equal(samples, 1920);
assert.equal(markers, 246);
const audit = {
    candidate: 'F073',
    measured_comparisons: 3,
    measured_source_strategies: 2,
    final_strategy_comparisons: 2,
    selected_strategy_rounds: selectedRounds,
    no_aggregation_across_strategies: true,
    selected_strategy_both_before_then_after_order: true,
    complete_outcomes: 240,
    paired_rows: 120,
    actual_workload_result_samples: samples,
    actual_owner_markers: markers,
    recursive_execution_closure_count: closureCount,
    canonical_harness_settings_and_dependencies_identical_except_owner: true,
    byte_identical_owner_contract_profiles: 40,
    actual_raw_producer_outcomes_and_errors_identical: 26,
    actual_selector_input_captures: 3,
    live_mutation_contracts: 1,
    actual_virtual_clearing_producers: 2,
    actual_segment_boundary_producers: 2,
    actual_pdb_documents: 7,
    all_prepared_owner_selector_and_control_allocations_unchanged: true,
    structural_allocation_saving_claim: false,
    round3_client_suffix_large_transient_retained_without_stable_regression_claim: true,
    cause_of_transient_or_control_movements_not_established: true,
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
console.log(`F073:240 outcomes,120 pairs,${samples} samples,${markers} owner markers; two strategies,selected rounds1/3;${mode} passed.`);
