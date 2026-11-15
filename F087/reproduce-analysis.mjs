import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const root = process.argv[2];
const write = process.argv.includes('--write');
assert(root && (write || process.argv.includes('--verify')), 'Explicit root and --write/--verify required.');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex').toUpperCase();
const near = (actual, expected) => assert(Math.abs(actual - expected) <= Math.max(1e-8, Math.abs(expected) * 1e-10));
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const caseName = benchmark => {
    const name = benchmark.FullName.match(/Case: "([^"]+)"/)?.[1];
    assert(name, `Full untruncated case identity required: ${benchmark.FullName}`);
    return name;
};
const expectedCases = [
    'ImplicitInt', 'ImplicitValid', 'ImplicitInvalid', 'ExplicitValid', 'ExplicitInvalid',
    'NamesakeCaseInvalid', 'NamesakePropertyInvalid', 'InheritedInvalid', 'OverrideInvalid',
    'ImplicitArray8Valid', 'ImplicitArray64Valid', 'ImplicitArray8Invalid', 'ImplicitArray64Invalid',
    'InterfaceMixed8', 'InterfaceMixed64', 'Depth4', 'Depth16', 'Depth64Valid', 'Wide8', 'Wide32',
    'DecoratedImplicitInvalid', 'DecoratedNamesakeInvalid', 'SuppressedUnion', 'SuppressedValue',
    'CustomStrategy', 'PlainObject', 'PlainCheckedCase', 'TopLevelValueInvalid', 'FilterEnabled',
    'FilterSuppressed', 'FreshDerived64', 'FreshDeclared64',
];
const decision = read('measurement-decision.json');
assert.equal(decision.measured_comparisons, 3);
assert.equal(decision.comparison_budget_closed, true);
assert.equal(decision.selected_snapshot, 'after-2');
const execution = read(fs.existsSync(path.join(root, 'execution-original.json')) ? 'execution-original.json' : 'execution.json');
assert.equal(execution.length, 6);
assert.deepEqual(execution.map(run => run.variant), ['before', 'after', 'after', 'before', 'before', 'after']);
assert.deepEqual(execution.map(run => run.round), [1, 1, 2, 2, 3, 3]);
assert(execution.every(run => run.exit_code === 0 && run.snapshot === (run.variant === 'before' ? 'before' : 'after-2')));
const reports = new Map();
const ownerMarkers = [];
const coldProtocols = [];
let samples = 0;
let truncatedHeaderDisambiguations = 0;
const loggedResults = section => [...section.matchAll(/WorkloadResult\s+(\d+): (\d+) op, ([\d.]+) ns,/g)];
for (const run of execution)
{
    let file = path.join(root, run.label, 'results.json');
    if (!fs.existsSync(file))
    {
        const directory = path.join(root, run.label, 'results');
        const names = fs.readdirSync(directory).filter(name => /-full.*\.json$/.test(name));
        assert.equal(names.length, 1);
        file = path.join(directory, names[0]);
    }
    const report = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(report.Benchmarks.length, 32);
    assert.deepEqual(report.Benchmarks.map(caseName).sort(), [...expectedCases].sort());
    assert.equal(new Set(report.Benchmarks.map(benchmark => benchmark.FullName)).size, 32);
    reports.set(`${run.round}-${run.variant}`, report);
    const manifest = read(`${run.snapshot}-manifest.json`);
    const log = fs.readFileSync(path.join(root, run.label, 'console.log'), 'utf8');
    const markers = [...log.matchAll(/AUTOPERF_OWNER_SHA256=([A-F0-9]{64})/g)].map(match => match[1]);
    assert.equal(markers.length, 33);
    assert(markers.every(value => value === manifest.target_assembly_sha256));
    ownerMarkers.push({ round: run.round, variant: run.variant, count: markers.length, sha256: markers[0] });
    const sections = log.split(/\r?\n\/\/ Benchmark: /).filter(section => /^Union(?:Cold)?Benchmark\./.test(section));
    assert.equal(sections.length, 32);
    const used = new Set();
    for (const benchmark of report.Benchmarks)
    {
        const result = benchmark.Measurements.filter(row => row.IterationMode === 'Workload' && row.IterationStage === 'Result');
        assert.equal(result.length, 8);
        const candidates = sections.filter(section => section.startsWith(`${benchmark.Type}.${benchmark.Method}:`) &&
            section.slice(0, section.indexOf('\n')).includes(`[${benchmark.Parameters}]`));
        assert(candidates.length > 0);
        const matched = candidates.filter(section => {
            const logged = loggedResults(section);
            return logged.length === 8 && logged.every((row, index) =>
                +row[2] === result[index].Operations && Math.abs(+row[3] - result[index].Nanoseconds) <= 0.01);
        });
        assert.equal(matched.length, 1, 'Colliding truncated display headers must resolve through all eight actual raw result vectors.');
        if (candidates.length > 1)
        {
            truncatedHeaderDisambiguations++;
        }
        const section = matched[0];
        assert(!used.has(section));
        used.add(section);
        const actual = [...section.matchAll(/WorkloadActual\s+(\d+): (\d+) op, ([\d.]+) ns,/g)];
        const logged = loggedResults(section);
        assert.equal(actual.length, 8);
        assert.deepEqual(actual.map(row => +row[1]), [1, 2, 3, 4, 5, 6, 7, 8]);
        assert.deepEqual(logged.map(row => +row[1]), [1, 2, 3, 4, 5, 6, 7, 8]);
        assert.equal(benchmark.Statistics.N, 8);
        assert(result.every(row => row.Operations > 0 && row.Nanoseconds > 0));
        near(benchmark.Statistics.Mean, result.reduce((sum, row) => sum + row.Nanoseconds / row.Operations, 0) / 8);
        assert(Number.isFinite(benchmark.Memory.BytesAllocatedPerOperation) && benchmark.Memory.BytesAllocatedPerOperation >= 0);
        if (benchmark.Type === 'UnionColdBenchmark')
        {
            const name = caseName(benchmark);
            assert(benchmark.DisplayInfo.includes('InvocationCount=1') && benchmark.DisplayInfo.includes('UnrollFactor=1'));
            assert(result.every(row => row.Operations === 64));
            assert(actual.every(row => +row[2] === 64));
            const batches = [...section.matchAll(/AUTOPERF_UNION_COLD=(Fresh(?:Derived|Declared)64);generation=([a-f0-9]{32});types=64/g)];
            assert(batches.length >= 8);
            assert(batches.every(match => match[1] === name));
            assert.equal(new Set(batches.map(match => match[2])).size, batches.length);
            const freshActual = [...section.matchAll(/AUTOPERF_UNION_COLD=(Fresh(?:Derived|Declared)64);generation=([a-f0-9]{32});types=64\r?\nWorkloadActual\s+(\d+): 64 op,/g)];
            assert.equal(freshActual.length, 8, 'Each actual timed cold iteration needs a new genuine 64-Type producer batch.');
            assert.deepEqual(freshActual.map(match => +match[3]), [1, 2, 3, 4, 5, 6, 7, 8]);
            coldProtocols.push({ round: run.round, variant: run.variant, case: name,
                distinct_setup_batches: batches.length, actual_first_use_batches: 8, types_per_batch: 64 });
        }
        samples += 8;
    }
    assert.equal(used.size, 32);
}
assert.equal(samples, 1536);
for (const report of reports.values())
{
    for (const field of ['RuntimeVersion', 'DotNetCliVersion', 'BenchmarkDotNetVersion'])
    {
        assert.deepEqual(report.HostEnvironmentInfo[field], reports.get('1-before').HostEnvironmentInfo[field]);
    }
}
const pairs = expectedCases.map(name => {
    const before = [1, 2, 3].map(round => reports.get(`${round}-before`).Benchmarks.find(row => caseName(row) === name));
    const after = [1, 2, 3].map(round => reports.get(`${round}-after`).Benchmarks.find(row => caseName(row) === name));
    const changes = before.map((row, index) => 100 * (after[index].Statistics.Mean / row.Statistics.Mean - 1));
    return {
        name: before[0].FullName,
        case: name,
        parameters: `Case=${name}`,
        cold_first_use: before[0].Type === 'UnionColdBenchmark',
        before_ns: before.map(row => row.Statistics.Mean),
        after_ns: after.map(row => row.Statistics.Mean),
        paired_time_changes_percent: changes,
        median_paired_time_change_percent: median(changes),
        before_bytes: before.map(row => row.Memory.BytesAllocatedPerOperation),
        after_bytes: after.map(row => row.Memory.BytesAllocatedPerOperation),
        before_rsd_percent: before.map(row => 100 * row.Statistics.StandardDeviation / row.Statistics.Mean),
        after_rsd_percent: after.map(row => 100 * row.Statistics.StandardDeviation / row.Statistics.Mean),
    };
});
const suiteSpecs = [
    ['tests-before-unit', 54, 54, 0],
    ['tests-before-integration-corrected', 39, 39, 0],
    ['tests-before-functional-corrected', 26, 26, 0],
    ['tests-before-integration', 39, 38, 1],
    ['tests-strong-unit', 1, 0, 1],
    ['tests-no-invalidation-unit-corrected2', 2, 0, 2],
    ['tests-after-unit', 56, 56, 0],
    ['tests-after-integration', 39, 39, 0],
    ['tests-after-functional', 26, 26, 0],
];
const xmlParser = String.raw`
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
$specs = $env:AUTOPERF_F087_SUITES | ConvertFrom-Json
$all = foreach ($suite in $specs)
{
    [xml]$xml = [IO.File]::ReadAllText([IO.Path]::Combine($env:AUTOPERF_F087_ROOT,[string]$suite,'results.trx'))
    $rows = @($xml.TestRun.Results.UnitTestResult | ForEach-Object {
        @{name=[string]$_.testName;execution_id=[string]$_.executionId;test_id=[string]$_.testId;
            outcome=[string]$_.outcome;message=[string]$_.Output.ErrorInfo.Message}
    })
    @{suite=[string]$suite;rows=$rows}
}
ConvertTo-Json -InputObject @($all) -Depth 8 -Compress
`;
const nativeSuites = JSON.parse(execFileSync(process.platform === 'win32' ? 'powershell.exe' : 'pwsh',
    ['-NoProfile', '-NonInteractive', '-Command', xmlParser],
    { encoding: 'utf8', env: { ...process.env, AUTOPERF_F087_ROOT: path.resolve(root),
        AUTOPERF_F087_SUITES: JSON.stringify(suiteSpecs.map(spec => spec[0])) } }));
const tests = new Map(nativeSuites.map(suite => [suite.suite, suite.rows]));
const testSummary = suiteSpecs.map(([suite, total, passes, failures]) => {
    const rows = tests.get(suite);
    assert.equal(rows.length, total);
    assert.equal(new Set(rows.map(row => row.execution_id)).size, total, 'Count actual distinct executions,not display names.');
    assert(rows.every(row => row.execution_id && row.test_id));
    assert.equal(rows.filter(row => row.outcome === 'Passed').length, passes);
    assert.equal(rows.filter(row => row.outcome === 'Failed').length, failures);
    assert(rows.every(row => ['Passed', 'Failed'].includes(row.outcome)));
    const command = read(`${suite}/command.json`);
    assert.equal(command.exit_code, failures ? 1 : 0);
    if (suite === 'tests-strong-unit')
    {
        assert(rows[0].name.endsWith('IsUnionValueProperty_DoesNotRetainCollectibleUnionType'));
        assert(rows[0].message.includes('Assert.False()'));
    }
    if (suite === 'tests-no-invalidation-unit-corrected2')
    {
        assert(rows.every(row => row.name.includes('ClearCache_ReplacesPopulatedInterfaceMapCache') && row.message.includes('Assert.NotSame()')));
        assert(rows.some(row => row.name.includes('True')) && rows.some(row => row.name.includes('False')));
    }
    if (suite === 'tests-before-integration')
    {
        const failure = rows.find(row => row.outcome === 'Failed');
        assert(failure.name.includes('Validate_RepeatedRuntimeUnionTypes_PreservesPropertyAndCaseValidation'));
        assert(failure.name.toLowerCase().includes('namesake'));
    }
    const counts = new Map();
    for (const row of rows)
    {
        counts.set(row.name, (counts.get(row.name) ?? 0) + 1);
    }
    const duplicateNames = [...counts].filter(([, count]) => count > 1)
        .map(([name, count]) => ({ name, distinct_actual_executions: count }));
    return { suite, actual_rows: total, distinct_actual_execution_ids: total, passes, failures, skipped: 0,
        preexisting_duplicate_display_names: duplicateNames };
});
const sortedNames = suite => tests.get(suite).map(row => row.name).sort();
assert.deepEqual(sortedNames('tests-before-integration-corrected'), sortedNames('tests-after-integration'));
assert.deepEqual(sortedNames('tests-before-functional-corrected'), sortedNames('tests-after-functional'));
assert.deepEqual(sortedNames('tests-before-unit'), tests.get('tests-after-unit')
    .filter(row => !row.name.includes('ClearCache_ReplacesPopulatedInterfaceMapCache')).map(row => row.name).sort());
const repeated = /Validate_RepeatedRuntimeUnionTypes_PreservesPropertyAndCaseValidation|Validate_MixedUnionTypes_PreservesEachGetterIdentity|Validate_ConcurrentUnionTypes_PreservesPropertyAndCaseValidation/;
assert.equal(tests.get('tests-before-integration-corrected').filter(row => repeated.test(row.name)).length, 5);
assert.equal(tests.get('tests-after-integration').filter(row => repeated.test(row.name)).length, 5);
assert.equal(tests.get('tests-after-unit').filter(row => row.name.includes('DefaultUnionValidationStrategyTest.')).length, 3);
assert.equal(testSummary.reduce((sum, suite) => sum + suite.actual_rows, 0), 282);
assert.equal(testSummary.reduce((sum, suite) => sum + suite.passes, 0), 278);
const beforeManifest = read('before-manifest.json');
const afterManifest = read('after-2-manifest.json');
assert.equal(read('original-owner-validation.json').owner_sha256, beforeManifest.target_assembly_sha256);
assert.equal(read('selected-owner-validation.json').owner_sha256, afterManifest.target_assembly_sha256);
for (const [suite] of suiteSpecs.filter(spec => spec[3] === 0))
{
    assert.equal(read(`${suite}/actual-outcomes.json`).owner_sha256,
        suite.startsWith('tests-before') ? beforeManifest.target_assembly_sha256 : afterManifest.target_assembly_sha256);
}
const sourceMap = {
    'owner-before': 'source-before.cs',
    'unit-before': 'source-unit-before.cs',
    'integration-before': 'source-integration.cs',
    'functional-before': 'source-functional.cs',
    'harness-UnionFixture.cs': 'harness/UnionFixture.cs',
    'harness-UnionBenchmark.cs': 'harness/UnionBenchmark.cs',
    'harness-Program.cs': 'harness/Program.cs',
    'owner-after-2': 'source-after.cs',
    'unit-after': 'source-unit-after.cs',
    'integration-after': 'source-integration.cs',
    'functional-after': 'source-functional.cs',
    'owner-strong': 'source-strong.cs',
    'owner-no-invalidation': 'source-no-invalidation.cs',
};
const pdbCommands = read('pdb-commands.json');
assert.equal(pdbCommands.length, 13);
assert.deepEqual(pdbCommands.map(command => command.name).sort(), Object.keys(sourceMap).sort());
for (const command of pdbCommands)
{
    assert.equal(command.exit_code, 0);
    const proof = read(`pdb-${command.name}.json`);
    assert.equal(proof.verified, true);
    assert.equal(proof.actual_pdb_document_sha256, proof.source_sha256);
    assert.equal(hash(sourceMap[command.name]), proof.source_sha256);
}
const originalContracts = read('contracts-before-observed.json');
assert.deepEqual(originalContracts, read('contracts-after-2.json'));
assert.equal(originalContracts.cases.length, 32);
assert.deepEqual(originalContracts.cases.map(row => row.Name).sort(), [...expectedCases].sort());
for (const contract of originalContracts.cases.filter(row => row.Name.startsWith('Fresh')))
{
    assert.equal(contract.GetterCalls, 64);
    assert.equal(contract.CaseValidations, 64);
    const actual = JSON.parse(contract.State);
    assert.equal(actual.length, 64);
    assert(actual.every(row => row.getterCalls === 1 && row.validations === 1 &&
        row.errors.length === 1 && row.errors[0].Key === 'model.Value' && row.errors[0].Message === 'Invalid case.'));
}
const states = fs.readdirSync(path.join(root, 'contracts-before-observed-states')).sort();
assert.equal(states.length, 32);
assert.deepEqual(states, fs.readdirSync(path.join(root, 'contracts-after-2-states')).sort());
for (const file of states)
{
    assert.equal(hash(`contracts-before-observed-states/${file}`), hash(`contracts-after-2-states/${file}`));
}
const closure = read('execution-closure-after-2.json');
assert.equal(closure.copied_files, 292);
assert.equal(closure.runtime_assets, 121);
assert.equal(closure.before.length, 292);
assert.equal(closure.after.length, 292);
assert.equal(closure.runtimeAssets.length, 121);
assert.equal(closure.complete_recursive_file_sets_equal, true);
assert.deepEqual(closure.changed_files, ['Microsoft.AspNetCore.Mvc.Core.dll', 'Microsoft.AspNetCore.Mvc.Core.pdb']);
for (let index = 0; index < closure.before.length; index++)
{
    assert.equal(closure.before[index].file, closure.after[index].file);
    if (!closure.changed_files.includes(closure.before[index].file))
    {
        assert.equal(closure.before[index].sha256, closure.after[index].sha256);
    }
}
assert.equal(read('formatting-before.json').exit_code, 0);
assert.equal(read('formatting-after.json').exit_code, 0);
const live = read('hot-reload-verification.json');
const liveBefore = read('hot-reload-before.json');
const liveAfter = read('hot-reload-body.json');
const liveLog = fs.readFileSync(path.join(root, 'hot-reload-final-watch.log'), 'utf8');
assert.equal(live.no_restart, true);
assert.equal(live.no_direct_callback_injection, true);
assert.equal(live.no_seeded_cache, true);
assert.equal(live.updates_applied, 3);
assert.equal(live.actual_owner_handler_calls, 3);
assert.equal(liveBefore.pid, liveAfter.pid);
assert.equal(liveAfter.owner_sha256, afterManifest.target_assembly_sha256);
assert.equal(liveBefore.valid, true);
assert.equal(liveAfter.valid, false);
assert.equal(liveAfter.errors.length, 1);
assert.equal(liveAfter.errors[0].key, 'model.Value');
assert.equal(liveAfter.cache_generation, 4);
assert.equal((liveLog.match(/^AUTOPERF_WATCH_START=/gm) ?? []).length, 1);
assert.equal((liveLog.match(/Updates applied\./g) ?? []).length, 3);
assert.equal((liveLog.match(/DefaultUnionValidationStrategy\+MetadataUpdateHandler\.ClearCache/g) ?? []).length, 3);
assert.equal(read('hot-reload-stop.json').owned_app_absent, true);
assert.equal(read('hot-reload-attribute.json').valid, true);
assert.equal(read('hot-reload-explicit-unmet.json').valid, true);
const comparison = { candidate: 'F087', rounds: [1, 2, 3], cases: pairs };
const table = [
    '| Case | Before ns/op R1 / R2 / R3 | After ns/op R1 / R2 / R3 | Median paired change | Before B/op | After B/op |',
    '|---|---:|---:|---:|---:|---:|',
    ...pairs.map(row => `| ${row.case} | ${row.before_ns.map(value => value.toFixed(2)).join(' / ')} | ${row.after_ns.map(value => value.toFixed(2)).join(' / ')} | ${row.median_paired_time_change_percent.toFixed(2)}% | ${median(row.before_bytes).toFixed(2)} | ${median(row.after_bytes).toFixed(2)} |`),
].join('\n') + '\n';
const audit = {
    candidate: 'F087', selected_snapshot: 'after-2', selected_rounds: [1, 2, 3],
    comparison_budget_closed: true, comparisons: 3, measured_strategies: 1, pairs: 32, outcomes: 192,
    actual_result_samples: samples, console_actual_workload_rows: samples,
    executing_owner_markers: ownerMarkers, truncated_header_disambiguations: truncatedHeaderDisambiguations,
    cold_protocols: coldProtocols, actual_xml_outcomes: 282, actual_xml_passes: 278, actual_xml_failures: 4,
    expected_initial_assertion_correction_failures: 1, expected_strong_cache_lifetime_failures: 1,
    expected_no_invalidation_failures: 2, skipped_rows: 0, test_suites: testSummary,
    original_required_owner_rows: 119, selected_required_owner_rows: 121, selected_new_rows: 8,
    identical_actual_state_captures: 64, verified_source_pdb_documents: 13,
    closure_files: 292, runtime_assets: 121, full_file_formatter_passed: true,
    real_watch_getter_body_delta_verified: true, real_watch_no_restart_verified: true,
    real_watch_owner_handler_calls: 3, real_watch_cache_generations: [1, 2, 3, 4],
    real_watch_attribute_refresh_or_interface_remapping_verified: false,
    pairs_detail: pairs,
};
if (write)
{
    fs.writeFileSync(path.join(root, 'comparison.json'), JSON.stringify(comparison, null, 2) + '\n');
    fs.writeFileSync(path.join(root, 'comparison.md'), table);
    fs.writeFileSync(path.join(root, 'environment.json'), JSON.stringify(reports.get('1-before').HostEnvironmentInfo, null, 2) + '\n');
    fs.writeFileSync(path.join(root, 'measurement-audit.json'), JSON.stringify(audit, null, 2) + '\n');
}
else
{
    assert.deepEqual(read('comparison.json'), comparison);
    assert.equal(fs.readFileSync(path.join(root, 'comparison.md'), 'utf8'), table);
    assert.deepEqual(read('measurement-audit.json'), audit);
}
console.log('F087:3/3 closed,192 outcomes/32 pairs/1536 actual results,282 XML rows,64 exact states,198 owner markers,13 PDB proofs,292/121 closure andreal no-restart getter/cache delta audited;all cold/control/runtime limits retained.');
