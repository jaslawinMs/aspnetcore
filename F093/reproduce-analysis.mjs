import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const [root, option] = process.argv.slice(2);
assert(root && (!option || option === '--verify'));
const read = file => JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex').toUpperCase();
const emit = (name, value) =>
{
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n';
    if (option === '--verify')
    {
        assert.equal(readFileSync(join(root, name), 'utf8'), text, `Existing audit differs:${name}`);
    }
    else
    {
        writeFileSync(join(root, name), text);
    }
};
const profiles = {
    EmptyScope: ['Empty', 0], Sync1: ['Sync', 1], Sync16: ['Sync', 16],
    AsyncCompleted1: ['Async', 1], AsyncCompleted16: ['Async', 16],
    DualCompleted1: ['Dual', 1], SourceCompleted1: ['Source', 1],
};
const methods = ['PreparedSync', 'PreparedAsync', 'PublicExplicitSync', 'PublicRegisteredAsync'];
const expected = Object.keys(profiles).flatMap(profile => methods.map(method => `${method}/${profile}`)).sort();
const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const budget = read(join(root, 'measurement-budget.json'));
assert.equal(budget.maximum_comparisons, 3);
assert.equal(budget.consumed_comparisons, 3);
assert.equal(budget.status, 'closed');
assert(budget.preparation_failures.every(row => !row.measured_workload_executed));
const executions = read(join(root, 'execution.json'));
assert.deepEqual(executions.map(row => row.label),
    ['round-1-before', 'round-1-after', 'round-2-after', 'round-2-before', 'round-3-before', 'round-3-after']);
for (const row of executions)
{
    assert.equal(row.exit_code, 0);
    assert.equal(row.sdk, '12.0.100-alpha.1.26557.102');
    for (const [flag, value] of [['--warmupCount', '3'], ['--iterationCount', '8'], ['--iterationTime', '100'], ['--outliers', 'DontRemove'], ['--job', 'Short']])
    {
        assert.equal(String(row.arguments[row.arguments.indexOf(flag) + 1]), value);
    }
    assert(row.arguments.includes('--inProcess'));
    assert(row.arguments[0].endsWith(`\\${row.variant}\\AutoPerf.Benchmarks.dll`));
}
const manifests = Object.fromEntries(['before', 'after'].map(variant => [variant, read(join(root, `${variant}-manifest.json`))]));
for (const variant of ['before', 'after'])
{
    assert.equal(manifests[variant].target_source_sha256, hash(join(root, `source-${variant}.cs`)));
    const owner = read(join(root, `owner-pdb-${variant}.json`));
    assert(owner.verified && owner.document.endsWith('RequestServicesFeature.cs'));
    assert.equal(owner.source_sha256, hash(join(root, `source-${variant}.cs`)));
    assert.equal(owner.actual_pdb_document_sha256, owner.source_sha256);
    const harness = read(join(root, `harness-pdb-${variant}.json`));
    assert.equal(harness.length, 4);
    for (const [index, file] of ['Program.cs', 'RequestServicesLifecycle.cs', 'RequestServicesBenchmark.cs', 'RequestServicesProbe.cs'].entries())
    {
        assert(harness[index].verified && harness[index].document.endsWith(file));
        assert.equal(harness[index].source_sha256, hash(join(root, 'harness', file)));
        assert.equal(harness[index].actual_pdb_document_sha256, harness[index].source_sha256);
    }
}
const original = readFileSync(join(root, 'source-before.cs'), 'utf8');
const selected = readFileSync(join(root, 'source-after.cs'), 'utf8');
const eol = original.includes('\r\n') ? '\r\n' : '\n';
assert.equal(selected, original.replace('DisposeAsync().AsTask().GetAwaiter().GetResult();',
    ['var disposeTask = DisposeAsync();', '        if (disposeTask.IsCompletedSuccessfully)', '        {',
        '            disposeTask.GetAwaiter().GetResult();', '        }', '        else', '        {',
        '            disposeTask.AsTask().GetAwaiter().GetResult();', '        }'].join(eol)));
for (const field of ['benchmark_assembly_sha256', 'runtime_configuration_sha256', 'dependency_configuration_sha256'])
{
    assert.equal(manifests.before[field], manifests.after[field]);
}
assert.notEqual(manifests.before.target_assembly_sha256, manifests.after.target_assembly_sha256);
const closure = read(join(root, 'execution-closure.json'));
assert.equal(closure.complete_recursive_file_sets_equal, true);
assert.equal(closure.copied_files, 126);
assert.equal(closure.runtime_assets, 58);
assert.deepEqual(closure.changed_files.sort(), ['Microsoft.AspNetCore.Http.dll', 'Microsoft.AspNetCore.Http.pdb']);
const tests = read(join(root, 'actual-test-audit.json'));
assert.deepEqual([tests.originalPassed, tests.selectedPassed, tests.actualRows, tests.skipped], [3, 3, 6, 0]);
assert.deepEqual(tests.variants.before.map(row => row.testName), tests.variants.after.map(row => row.testName));
assert(tests.variants.before.every(row => row.outcome === 'Passed' && row.className === 'Microsoft.AspNetCore.Http.DefaultHttpContextTests'));
const functionalBefore = read(join(root, 'verification-before', 'functional-probe.json'));
const functionalAfter = read(join(root, 'verification-after', 'functional-probe.json'));
assert.equal(functionalBefore.length, 10);
assert.deepEqual(functionalBefore, functionalAfter);
for (const row of functionalBefore.slice(0, 4))
{
    assert.equal(row.actual_worker_waited_before_producer, true);
    assert.equal(row.references_retained_while_pending, true);
    assert.equal(row.async_calls, 1);
    assert.equal(row.sync_calls, 0);
}
assert.equal(functionalBefore.find(row => row.scenario === 'ActualRegisteredResponseGate').actual_callback_waited_for_real_scope, true);
const resourceBefore = read(join(root, 'verification-before', 'resource-check.json'));
assert.deepEqual(resourceBefore, read(join(root, 'verification-after', 'resource-check.json')));
assert.equal(resourceBefore.length, 4);
for (const row of resourceBefore)
{
    assert.equal(row.operations, 5000);
    assert.equal(row.allocated_bytes, 0);
    assert.equal(row.actual_completed_as_task_is_cached_task, true);
    assert.equal(row.all_references_and_resources_validated, true);
}
for (const variant of ['before', 'after'])
{
    assert.equal(read(join(root, `verify-${variant}-execution.json`)).exit_code, 0);
}
const restored = read(join(root, 'restoration.json'));
const restoredTests = read(join(root, 'restored-test-audit.json'));
assert(restored.source_restored_byte_identically && restored.actual_owner_restored_byte_identically);
assert(restored.actual_owner_pdb_restored_byte_identically);
assert.equal(restored.source_sha256, manifests.before.target_source_sha256);
assert.equal(restored.actual_restored_owner_dll_sha256, manifests.before.target_assembly_sha256);
assert.equal(restored.actual_restored_tests_passed, 3);
assert.equal(restoredTests.length, 3);
assert.deepEqual(restoredTests.map(row => row.testName), tests.variants.before.map(row => row.testName));
assert(restoredTests.every(row => row.outcome === 'Passed' && row.duration !== '00:00:00'));

const outcomes = [], pairs = [], consoleReceipts = [], setupReceipts = [];
let environment;
for (const round of [1, 2, 3])
{
    const byVariant = {};
    for (const variant of ['before', 'after'])
    {
        const folder = join(root, `round-${round}-${variant}`);
        const reports = readdirSync(join(folder, 'results')).filter(file => file.includes('-full') && file.endsWith('.json'));
        assert.equal(reports.length, 1);
        const report = read(join(folder, 'results', reports[0]));
        assert.equal(report.Benchmarks.length, 28);
        environment ??= report.HostEnvironmentInfo;
        assert.deepEqual(report.HostEnvironmentInfo, environment);
        assert.deepEqual([environment.BenchmarkDotNetVersion, environment.RuntimeVersion, environment.Architecture, environment.Configuration, environment.DotNetCliVersion],
            ['0.13.0', '.NET 12.0.0 (12.0.26.56305)', 'X64', 'RELEASE', '12.0.100-alpha.1.26557.102']);
        assert.deepEqual(report.Benchmarks.map(row => `${row.Method}/${row.Parameters.replace('Profile=', '')}`).sort(), expected);
        const runtime = read(join(folder, 'runtime-environment.json'));
        assert.equal(runtime.corelib_informational_version, '12.0.0-alpha.1.26562.105+dfd6ac738610ea05f42e704be82b386e71052e12');
        assert.equal(runtime.di_informational_version, runtime.corelib_informational_version);
        assert(runtime.server_gc && runtime.shared_machine && runtime.process_id > 0);
        const consoleText = readFileSync(join(folder, 'console.log'), 'utf8');
        const sections = consoleText.split(/^\/\/ Benchmark:\s*/m).slice(1);
        assert.equal(sections.length, 28);
        const receipts = new Map();
        const states = readdirSync(join(folder, 'states')).filter(file => file.endsWith('.json'))
            .map(file => ({ file, value: read(join(folder, 'states', file)) }));
        assert.equal(states.length, 28);
        assert.deepEqual(states.map(row => `${row.value.method}/${row.value.profile}`).sort(), expected);
        for (const section of sections)
        {
            const identity = /^RequestServicesBenchmark\.(\w+):[^\r\n]+\[Profile=(\w+)\]/.exec(section);
            assert(identity);
            const [, method, profile] = identity;
            const key = `${method}/${profile}`;
            assert(!receipts.has(key) && section.includes('GC=Concurrent Server'));
            const setupMatches = [...section.matchAll(/^AUTOPERF_F093_SETUP (\{[^\r\n]+\})$/gm)];
            assert.equal(setupMatches.length, 1);
            const setup = JSON.parse(setupMatches[0][1]);
            const state = states.filter(row => row.value.method === method && row.value.profile === profile);
            assert.equal(state.length, 1);
            assert.deepEqual(setup, state[0].value);
            assert.equal(setup.owner_sha256, manifests[variant].target_assembly_sha256);
            assert.equal(setup.harness_sha256, manifests[variant].benchmark_assembly_sha256);
            assert.equal(setup.process_id, runtime.process_id);
            const [kind, count] = profiles[profile];
            assert.equal(setup.kind, kind);
            assert.equal(setup.count, count);
            assert.equal(setup.Created, count);
            assert.equal(setup.CompletedCalls, count);
            assert.equal(setup.SyncCalls, kind === 'Sync' ? count : 0);
            assert.equal(setup.AsyncCalls, ['Async', 'Dual', 'Source'].includes(kind) ? count : 0);
            assert.equal(setup.SourceResults, kind === 'Source' ? count : 0);
            assert.equal(setup.OwnerType, 'Microsoft.AspNetCore.Http.Features.RequestServicesFeature');
            assert(setup.ProviderType.startsWith('Microsoft.Extensions.DependencyInjection.'));
            assert(setup.ProviderCleared && setup.RootStillAlive && setup.actual_default_http_context_and_di_scope);
            assert.equal(setup.ActualResponseCallback, method.startsWith('Public'));
            assert.equal(setup.Body, method.startsWith('Public') ? 'ok' : '');
            assert.equal(setup.Status, method.startsWith('Public') ? 200 : 0);
            setupReceipts.push({ round, variant, file: state[0].file, ...setup });
            const samples = stage => [...section.matchAll(new RegExp(
                `^Workload${stage}\\s+(\\d+):\\s+(\\d+) op,\\s+([\\d.]+) ns,`, 'gm'))]
                .map(match => ({ index: Number(match[1]), operations: Number(match[2]), nanoseconds: Number(match[3]) }));
            const warmups = samples('Warmup'), results = samples('Result');
            assert.deepEqual(warmups.map(row => row.index), [1, 2, 3]);
            assert.deepEqual(results.map(row => row.index), [1, 2, 3, 4, 5, 6, 7, 8]);
            const gcMatches = [...section.matchAll(/^GC:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/gm)];
            assert.equal(gcMatches.length, 1);
            const gc = { gen0: Number(gcMatches[0][1]), gen1: Number(gcMatches[0][2]), gen2: Number(gcMatches[0][3]),
                totalAllocatedBytes: Number(gcMatches[0][4]), totalOperations: Number(gcMatches[0][5]) };
            assert(gc.totalAllocatedBytes >= 0 && gc.totalOperations > 0);
            const receipt = { round, variant, method, profile, warmups, results, gc, actualOwnerSha256: setup.owner_sha256 };
            receipts.set(key, receipt);
            consoleReceipts.push(receipt);
        }
        byVariant[variant] = report.Benchmarks;
        for (const row of report.Benchmarks)
        {
            const profile = row.Parameters.replace('Profile=', '');
            const receipt = receipts.get(`${row.Method}/${profile}`);
            assert(receipt);
            const results = row.Measurements.filter(item => item.IterationMode === 'Workload' && item.IterationStage === 'Result');
            assert.equal(row.Statistics.N, 8);
            assert.equal(results.length, 8);
            assert.deepEqual(results.map(item => item.IterationIndex), [1, 2, 3, 4, 5, 6, 7, 8]);
            for (const [index, item] of results.entries())
            {
                assert(item.Operations > 0 && item.Nanoseconds > 0 && item.LaunchIndex === 1);
                assert.equal(item.Operations, receipt.results[index].operations);
                assert.equal(item.Nanoseconds, receipt.results[index].nanoseconds);
            }
            assert(Math.abs(average(results.map(item => item.Nanoseconds / item.Operations)) - row.Statistics.Mean) <= 1e-9 * row.Statistics.Mean);
            assert.equal(row.Memory.Gen0Collections, receipt.gc.gen0);
            assert.equal(row.Memory.Gen1Collections, receipt.gc.gen1);
            assert.equal(row.Memory.Gen2Collections, receipt.gc.gen2);
            assert.equal(row.Memory.TotalOperations, receipt.gc.totalOperations);
            assert.equal(row.Memory.BytesAllocatedPerOperation, Math.round(receipt.gc.totalAllocatedBytes / receipt.gc.totalOperations));
            outcomes.push({ round, variant, profile, rawGcBytesPerOperation: receipt.gc.totalAllocatedBytes / receipt.gc.totalOperations, ...row });
        }
    }
    for (const before of byVariant.before)
    {
        const after = byVariant.after.filter(row => row.FullName === before.FullName);
        assert.equal(after.length, 1);
        const profile = before.Parameters.replace('Profile=', '');
        const beforeState = setupReceipts.find(row => row.round === round && row.variant === 'before' && row.method === before.Method && row.profile === profile);
        const afterState = setupReceipts.find(row => row.round === round && row.variant === 'after' && row.method === before.Method && row.profile === profile);
        for (const key of ['kind', 'count', 'OwnerType', 'ProviderType', 'Created', 'CompletedCalls', 'SyncCalls', 'AsyncCalls',
            'SourceResults', 'ProviderCleared', 'RootStillAlive', 'ActualResponseCallback', 'Status', 'Body'])
        {
            assert.deepEqual(beforeState[key], afterState[key]);
        }
        pairs.push({ round, method: before.Method, profile,
            timingTarget: ['PreparedSync', 'PublicExplicitSync'].includes(before.Method),
            unchangedControl: ['PreparedAsync', 'PublicRegisteredAsync'].includes(before.Method),
            beforeNs: before.Statistics.Mean, afterNs: after[0].Statistics.Mean,
            changePercent: 100 * (after[0].Statistics.Mean / before.Statistics.Mean - 1),
            beforeBytes: before.Memory.BytesAllocatedPerOperation, afterBytes: after[0].Memory.BytesAllocatedPerOperation,
            savedBytes: before.Memory.BytesAllocatedPerOperation - after[0].Memory.BytesAllocatedPerOperation,
            beforeCvPercent: 100 * before.Statistics.StandardDeviation / before.Statistics.Mean,
            afterCvPercent: 100 * after[0].Statistics.StandardDeviation / after[0].Statistics.Mean });
    }
}
const range = values => ({ minimum: Math.min(...values), maximum: Math.max(...values) });
const groups = expected.map(key =>
{
    const [method, profile] = key.split('/');
    const rows = pairs.filter(row => row.method === method && row.profile === profile);
    assert.equal(rows.length, 3);
    return { method, profile, medianPairedChangePercent: rows.map(row => row.changePercent).sort((a, b) => a - b)[1],
        allPairsFaster: rows.every(row => row.changePercent < 0), allPairsSlower: rows.every(row => row.changePercent > 0),
        beforeBytes: rows.map(row => row.beforeBytes), afterBytes: rows.map(row => row.afterBytes),
        maximumCvPercent: Math.max(...rows.flatMap(row => [row.beforeCvPercent, row.afterCvPercent])) };
});
const summary = {
    preparedSyncTimingChanges: range(pairs.filter(row => row.method === 'PreparedSync').map(row => row.changePercent)),
    publicExplicitSyncTimingChanges: range(pairs.filter(row => row.method === 'PublicExplicitSync').map(row => row.changePercent)),
    unchangedControlTimingChanges: range(pairs.filter(row => row.unchangedControl).map(row => row.changePercent)),
    preparedReportedSavedBytes: range(pairs.filter(row => row.method.startsWith('Prepared')).map(row => row.savedBytes)),
    publicReportedSavedBytes: range(pairs.filter(row => row.method.startsWith('Public')).map(row => row.savedBytes)),
    maximumCvPercent: Math.max(...pairs.flatMap(row => [row.beforeCvPercent, row.afterCvPercent])),
    groups
};
emit('raw-outcomes.json', outcomes);
emit('paired-outcomes.json', pairs);
emit('setup-correctness.json', setupReceipts);
emit('console-measurement-receipts.json', consoleReceipts);
emit('measurement-audit.json', {
    candidate: 'F093', comparisons: 3, launchOrder: executions.map(row => row.label),
    outcomes: outcomes.length, pairedOutcomes: pairs.length, resultSamples: outcomes.length * 8,
    actualConsoleWarmups: outcomes.length * 3, actualSetupReceipts: setupReceipts.length,
    identicalActualFunctionalObservations: 10, genuinePendingSyncWorkersBeforeRealProducer: 4,
    actualRegisteredResponseGateExercised: true, completedDisposalOnlyBytesBefore: 0, completedDisposalOnlyBytesAfter: 0,
    actualCompletedAsTaskUsesCachedTask: true, resourceAndFunctionalChecksAreGreenGreen: true,
    actualTestRowsPassed: 6, originalTestsPassed: 3, selectedTestsPassed: 3, testSkips: 0,
    actualRestoredTestsPassed: 3, sourceAndActualOwnerRestoredByteIdentically: true,
    actualConsoleSamplesAndStatisticsArithmeticVerified: true, actualConsoleGcTotalsAndReportedRoundingVerified: true,
    actualSourcePdbRecordsAndSetupIdentitiesVerified: true, onlyOwnerDllAndPdbDiffer: true,
    copiedExecutionFiles: closure.copied_files, declaredRuntimeAssets: closure.runtime_assets,
    publicAuditRehashesOmittedBinaryOrPdbBytes: false, manifests, environment, summary,
    boundaries: [
        'IDisposable pending wait is required and remains; only successful completed non-generic disposal takes the direct path.',
        'Original already allocates zero disposal-only bytes and returns cached Task.CompletedTask; no wrapper allocation removal is claimed.',
        'Prepared methods include actual DefaultHttpContext, DI scope/resolution and cleanup; public methods await actual server completed-response disposal.',
        'Normal registered response uses unchanged asynchronous disposal. A sync-only result is not a normal request-throughput gain.',
        'All controls, raw samples, preparation limitations and shared-host movement remain.'
    ]
});
const number = value => value.toFixed(2);
emit('comparison.md', [
    '# F093 actual request-services disposal comparisons', '',
    'Positive timing changes mean slower. All three unchanged-strategy comparisons, controls, regressions and raw samples remain.', '',
    '**Original and selected disposal-only resource checks already allocate zero:** default non-generic ValueTask.AsTask returns cached Task.CompletedTask. No task-wrapper allocation saving and no removal of the required pending wait.', '',
    '| Method / profile | Pair | Before ns/op | After ns/op | Change % | Before / after B/op | Saved B/op | Max CV % |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
    ...pairs.map(row => `| ${row.method} / ${row.profile}${row.unchangedControl ? ' (unchanged control)' : ''} | ${row.round} | ${number(row.beforeNs)} | ${number(row.afterNs)} | ${number(row.changePercent)} | ${row.beforeBytes} / ${row.afterBytes} | ${row.savedBytes} | ${number(Math.max(row.beforeCvPercent, row.afterCvPercent))} |`),
    '', 'Prepared methods include actual default-context creation, DI scope/resolution and disposal. Public methods include actual TestHost/HttpClient response and awaited real completed-response callbacks; normal registered async response cleanup is unchanged.', '',
    'All10 actual lifetime/failure observations match, including four genuine pending sync callers, completed dual/source-backed cleanup, actual registered response gate, async return, missing factory and assigned-provider boundaries. Six actual owning test rows pass. Resource and functional checks are green/green, not a fabricated failing original.', '',
    'Actual original-host owner/four harness portable-PDB documents and full execution closure are preserved. Public audits rehash raw/source/recorded proofs, not omitted DLL/PDB bytes.', ''
].join('\n'));
console.log(`F093:${outcomes.length} outcomes,${pairs.length} pairs,${setupReceipts.length} actual setups;3/3 closed.`);
console.log(JSON.stringify(summary, null, 2));
