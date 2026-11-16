import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { createHash } from 'node:crypto';

const [root, option] = process.argv.slice(2);
assert(root && (!option || option === '--verify'));
const read = file => JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex').toUpperCase();
const emit = (name, value, text = false) =>
{
    const content = text ? value : JSON.stringify(value, null, 2) + '\n';
    if (option === '--verify')
    {
        assert.equal(readFileSync(join(root, name), 'utf8'), content, `Existing nonmutating audit differs:${name}`);
    }
    else
    {
        writeFileSync(join(root, name), content);
    }
};
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const range = values => ({ minimum: Math.min(...values), maximum: Math.max(...values) });
const close = (actual, expected, label) =>
{
    assert(Number.isFinite(actual) && Number.isFinite(expected), label);
    assert(Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), label);
};
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const target = 'Microsoft.AspNetCore.Mvc.RazorPages';
const methods = ['LegacyBridge', 'ModernWait', 'ModernAsync'];
const profiles = ['CachedOriginal', 'CompiledSelf', 'FreshPrecompiled', 'GatedPrecompiled'];
const expected = profiles.flatMap(profile => methods.map(method => `${method}/${profile}`)).sort();
const budget = read(join(root, 'measurement-budget.json'));
assert.deepEqual([budget.maximumComparisons, budget.startedComparisons, budget.completedComparisons, budget.closed], [3, 3, 3, true]);
assert.deepEqual(budget.history.map(row => [row.round, row.order, row.status]),
    [[1, ['before', 'after'], 'completed'], [2, ['after', 'before'], 'completed'], [3, ['before', 'after'], 'completed']]);
const executions = read(join(root, 'execution.json'));
assert.deepEqual(executions.map(row => row.label),
    ['round-1-before', 'round-1-after', 'round-2-after', 'round-2-before', 'round-3-before', 'round-3-after']);
for (const row of executions)
{
    assert.equal(row.exit_code, 0);
    assert.equal(row.sdk, '12.0.100-alpha.1.26557.102');
    assert(row.arguments[0].endsWith(`\\${row.variant}\\AutoPerf.Benchmarks.dll`));
    assert(row.arguments.includes('--inProcess'));
    for (const [flag, value] of [['--filter', '*LoaderBenchmark*'], ['--job', 'Short'],
        ['--warmupCount', '3'], ['--iterationCount', '8'], ['--iterationTime', '100'], ['--outliers', 'DontRemove']])
    {
        assert.equal(String(row.arguments[row.arguments.indexOf(flag) + 1]), value);
    }
}
const manifests = Object.fromEntries(['before', 'after'].map(variant => [variant, read(join(root, `${variant}-manifest.json`))]));
for (const variant of ['before', 'after'])
{
    assert.equal(manifests[variant].source_revision, baseline);
    assert.equal(manifests[variant].target_source_sha256, hash(join(root, `source-${variant}`, 'PageLoader.cs')));
    const documents = [
        [`owner-pdb-${variant}.json`, join(root, `source-${variant}`, 'PageLoader.cs')],
        ...['Program.cs', 'LoaderLifecycle.cs', 'LoaderBenchmark.cs', 'LoaderProbe.cs'].map(name =>
            [`harness-${name.replace('.cs', '')}-pdb-${variant}.json`, join(root, 'harness', name)]),
        ...[
            'src\\Mvc\\Mvc.RazorPages\\src\\Infrastructure\\DefaultPageLoader.cs',
            'src\\Mvc\\Mvc.RazorPages\\src\\Infrastructure\\IPageLoader.cs',
            'src\\Mvc\\Mvc.RazorPages\\src\\ApplicationModels\\DefaultPageApplicationModelProvider.cs',
            'src\\Mvc\\Mvc.Razor\\src\\Compilation\\DefaultViewCompiler.cs',
            'src\\Mvc\\Mvc.Razor\\src\\ApplicationParts\\CompiledRazorAssemblyPart.cs'
        ].map(relative => [`producer-${relative.split('\\').at(-1).replace('.cs', '')}-pdb-${variant}.json`,
            join(root, 'producer-source', relative.replaceAll('\\', sep))])
    ];
    assert.equal(documents.length, 10);
    for (const [record, source] of documents)
    {
        const proof = read(join(root, record));
        assert.equal(proof.verified, true);
        assert(proof.document.endsWith(source.split(sep).at(-1)));
        assert.equal(proof.source_sha256, hash(source));
        assert.equal(proof.actual_pdb_document_sha256, proof.source_sha256);
    }
    const commands = read(join(root, `pdb-${variant}-commands.json`));
    assert.equal(commands.length, 10);
    assert(commands.every(row => row.exitCode === 0));
    assert.equal(read(join(root, `verify-${variant}-command.json`)).exit_code, 0);
}
for (const key of ['benchmark_assembly_sha256', 'runtime_configuration_sha256', 'dependency_configuration_sha256', 'runtime_framework'])
{
    assert.equal(manifests.before[key], manifests.after[key]);
}
assert.deepEqual(manifests.before.additional_target_sources, manifests.after.additional_target_sources);
assert.notEqual(manifests.before.target_assembly_sha256, manifests.after.target_assembly_sha256);
const original = readFileSync(join(root, 'source-before', 'PageLoader.cs'), 'utf8');
const prototype = readFileSync(join(root, 'source-after', 'PageLoader.cs'), 'utf8');
const eol = original.includes('\r\n') ? '\r\n' : '\n';
const seam = '        => LoadAsync(actionDescriptor, EndpointMetadataCollection.Empty).GetAwaiter().GetResult();';
const change = [
    '    {', '        var task = LoadAsync(actionDescriptor, EndpointMetadataCollection.Empty);',
    '        if (task.IsCompletedSuccessfully)', '        {', '            return task.Result;',
    '        }', '', '        return task.GetAwaiter().GetResult();', '    }'
].join(eol);
assert.equal(original.split(seam).length, 2);
assert.equal(prototype, original.replace(seam, change), 'Exactly the obsolete bridge seam may change.');
const defaultHead = readFileSync(join(root, 'current-default-head.txt'), 'utf8').trim();
const defaultSources = [...read(join(root, 'current-default-owner-producer-test-identity.json')),
    ...read(join(root, 'current-default-additional-producer-identity.json'))];
assert.equal(defaultSources.length, 10);
assert(defaultSources.every(row => row.identical && row.currentDefault === defaultHead &&
    row.baseline === baseline && row.baselineBlob === row.currentDefaultBlob));
const sourceCopies = read(join(root, 'producer-source-copies.json'));
assert.equal(sourceCopies.length, 10);
for (const row of sourceCopies)
{
    const source = join(root, 'producer-source', row.path.replaceAll('/', sep));
    assert.equal(hash(source), row.sha256);
    const canonical = Buffer.from(readFileSync(source, 'utf8').replace(/\r\n/g, '\n'));
    const blob = createHash('sha1').update(`blob ${canonical.length}\0`).update(canonical).digest('hex');
    assert.equal(blob, row.baselineBlob);
    assert.equal(row.currentDefaultBlob, row.baselineBlob);
}
const closure = read(join(root, 'execution-closure.json'));
assert.deepEqual([closure.complete_recursive_file_sets_equal, closure.copied_files, closure.runtime_assets], [true, 276, 104]);
assert.deepEqual([...closure.changed_files].sort(), [`${target}.dll`, `${target}.pdb`]);
assert.equal(closure.before.length, 276);
assert.equal(closure.after.length, 276);
assert.equal(closure.runtimeAssets.length, 104);
assert.deepEqual(closure.before.map(row => row.file), closure.after.map(row => row.file));
for (const [index, row] of closure.before.entries())
{
    if (!closure.changed_files.includes(row.file))
    {
        assert.deepEqual(closure.after[index], row);
    }
}
for (const row of closure.runtimeAssets)
{
    if (row.copied !== `${target}.dll`)
    {
        assert.equal(row.before_sha256, row.after_sha256);
    }
}
const restoration = read(join(root, 'restoration.json'));
assert.equal(restoration.disposition, 'no-gain');
for (const field of ['source_restored_byte_identically', 'actual_owner_restored_byte_identically',
    'actual_owner_pdb_restored_byte_identically', 'test_loaded_owner_dll_matches_measured_original',
    'actual_restored_test_names_match_original_and_selected', 'no_performance_pr', 'no_more_measurements'])
{
    assert.equal(restoration[field], true);
}
assert.equal(restoration.source_sha256, manifests.before.target_source_sha256);
assert.equal(restoration.actual_restored_owner_dll_sha256, manifests.before.target_assembly_sha256);
assert.equal(restoration.actual_restored_owner_pdb_sha256, closure.before.find(row => row.file === `${target}.pdb`).sha256.toUpperCase());
assert.equal(restoration.actual_restored_tests_passed, 6);
assert.equal(restoration.baseline_head, baseline);
assert.equal(restoration.comparison_budget_closed, 3);
const sourceRef = read(join(root, 'source-branch-verification.json'));
assert.equal(sourceRef.ref, 'refs/heads/autoperf/F095-sync-page-loader');
assert.equal(sourceRef.object.sha, baseline);
const tests = read(join(root, 'actual-test-audit.json'));
assert.deepEqual([tests.passedPerVariant, tests.actualRows, tests.skipped, tests.matchingActualTestNames], [6, 18, 0, true]);
const expectedTests = ['LoadAsync_CachesResults', 'LoadAsync_CompiledPageActionDescriptor_ReturnsSelf',
    'LoadAsync_CreatesEndpoint_WithRoute', 'LoadAsync_InvokesApplicationModelProviders',
    'LoadAsync_InvokesApplicationModelProviders_WithTheRightOrder', 'LoadAsync_IsUniquePerPageDescriptor'].sort();
for (const variant of ['before', 'after', 'restored'])
{
    assert.equal(tests.trxSha256[variant], hash(join(root, `tests-${variant}`, `F095-loader-${variant}.trx`)));
    assert.equal(read(join(root, `test-${variant}-command.json`)).exit_code, 0);
    const rows = tests.variants[variant];
    assert.equal(rows.length, 6);
    assert.deepEqual(rows.map(row => row.methodName).sort(), expectedTests);
    assert(rows.every(row => row.outcome === 'Passed' && row.duration !== '00:00:00' &&
        row.className === 'Microsoft.AspNetCore.Mvc.RazorPages.Infrastructure.DefaultPageLoaderTest'));
    assert.deepEqual(rows.map(row => row.testName), tests.variants.before.map(row => row.testName));
}
const beforeFunctional = read(join(root, 'verify-before', 'states', 'functional-probe.json'));
assert.deepEqual(read(join(root, 'verify-after', 'states', 'functional-probe.json')), beforeFunctional);
for (const key of ['sameActualDiBridge', 'sameActualCachedResult', 'sameActualEndpointAndMetadataCache', 'newCachedMetadataIgnored'])
{
    assert.equal(beforeFunctional[key], true);
}
assert.equal(beforeFunctional.synchronousNullParameter, 'actionDescriptor');
assert.deepEqual(beforeFunctional.actualEndpointMetadataOrder, ['first', 'second']);
const failures = beforeFunctional.pendingCompilerFailuresAndCancellation;
assert.equal(failures.length, 4);
assert.deepEqual(failures.map(row => [row.cancel, row.asyncCaller]), [[false, false], [false, true], [true, false], [true, true]]);
for (const row of failures)
{
    for (const key of ['actualProducerEntered', 'NoResultBeforeRelease', 'actualTaskIdentityPreserved', 'unwrapped',
        'alreadyFaultedOrCanceledObsoleteBridge'])
    {
        assert.equal(row[key], true);
    }
    assert.equal(row.SyncObservedWaiting, !row.asyncCaller);
    assert.equal(row.AsyncReturnedPending, row.asyncCaller);
    assert.equal(row.cachedTaskFaulted, !row.cancel);
    assert.equal(row.cachedTaskCanceled, row.cancel);
    assert.equal(row.exceptionType, row.cancel ? 'System.Threading.Tasks.TaskCanceledException' : 'AutoPerf.CompilerFailure');
    assert.equal(row.message, row.cancel ? 'A task was canceled.' : 'actual compiler extension failed');
}
const resources = {};
for (const variant of ['before', 'after'])
{
    resources[variant] = read(join(root, `verify-${variant}`, 'states', 'resource-check.json'));
    assert.equal(resources[variant].length, 4);
    assert.deepEqual(resources[variant].map(row => `${row.caller}/${row.profile}`).sort(),
        ['LegacyBridge/CachedOriginal', 'LegacyBridge/CompiledSelf', 'ModernWait/CachedOriginal', 'ModernWait/CompiledSelf'].sort());
    for (const row of resources[variant])
    {
        assert.deepEqual([row.operations, row.allocatedBytes, row.bytesPerOperation,
            row.actualCachedResultIdentity, row.noInternalCacheInjection], [5000, 0, 0, true, true]);
    }
}
assert.deepEqual(resources.after, resources.before);
const verifySignature = (signature, method, profile) =>
{
    const cached = profile === 'CachedOriginal' || profile === 'CompiledSelf';
    const gated = profile === 'GatedPrecompiled';
    assert.equal(signature.Profile, profile);
    assert.equal(signature.Caller, method);
    assert.equal(signature.OwnerType, 'Microsoft.AspNetCore.Mvc.RazorPages.Infrastructure.DefaultPageLoader');
    assert.equal(signature.CompilerType, 'Microsoft.AspNetCore.Mvc.Razor.Compilation.DefaultViewCompiler');
    for (const key of ['SameDiInstance', 'SameCachedTask', 'ActualCompiledItem'])
    {
        assert.equal(signature[key], true);
    }
    assert.equal(signature.SameCachedResult, cached);
    assert.equal(signature.FreshResultDistinctFromPrimedResult, !cached);
    assert.equal(signature.ActualCompilerCalls, cached ? 0 : 1);
    assert.equal(signature.PageType, 'AutoPerf.LoaderPage');
    assert.equal(signature.HandlerType, 'AutoPerf.LoaderPage');
    assert.equal(signature.EndpointType, 'Microsoft.AspNetCore.Routing.RouteEndpoint');
    assert.equal(signature.Route, '/loader-probe');
    assert.equal(signature.HandlerCount, 1);
    assert.equal(signature.SyncObservedWaiting, gated ? method !== 'ModernAsync' : null);
    assert.equal(signature.AsyncReturnedPending, gated ? method === 'ModernAsync' : null);
    assert.equal(signature.NoResultBeforeRelease, gated ? true : null);
};
for (const profile of profiles)
{
    for (const method of methods)
    {
        const before = read(join(root, 'verify-before', 'states', `${method}-${profile}.json`));
        const after = read(join(root, 'verify-after', 'states', `${method}-${profile}.json`));
        verifySignature(before.signature, method, profile);
        assert.deepEqual(after.signature, before.signature);
    }
}
const outcomes = [], pairs = [], setupReceipts = [], consoleReceipts = [];
let environment, actualRuntime;
for (const round of [1, 2, 3])
{
    const byVariant = {};
    for (const variant of ['before', 'after'])
    {
        const folder = join(root, `round-${round}-${variant}`);
        const reports = readdirSync(join(folder, 'results')).filter(name => name.includes('-full') && name.endsWith('.json'));
        assert.equal(reports.length, 1);
        const report = read(join(folder, 'results', reports[0]));
        assert.equal(report.Benchmarks.length, 12);
        assert.deepEqual(report.Benchmarks.map(row => `${row.Method}/${row.Parameters.replace('Profile=', '')}`).sort(), expected);
        environment ??= report.HostEnvironmentInfo;
        assert.deepEqual(report.HostEnvironmentInfo, environment);
        assert.deepEqual([environment.BenchmarkDotNetVersion, environment.RuntimeVersion, environment.Architecture,
            environment.Configuration, environment.DotNetCliVersion],
            ['0.13.0', '.NET 12.0.0 (12.0.26.56305)', 'X64', 'RELEASE', '12.0.100-alpha.1.26557.102']);
        const runtime = read(join(folder, 'states', 'runtime.json'));
        assert.equal(runtime.corelibInformationalVersion, '12.0.0-alpha.1.26562.105+dfd6ac738610ea05f42e704be82b386e71052e12');
        assert.equal(runtime.diInformationalVersion, runtime.corelibInformationalVersion);
        assert.equal(runtime.architecture, 'X64');
        assert(runtime.serverGc && runtime.processId > 0);
        assert.equal(runtime.ownerSha256, manifests[variant].target_assembly_sha256);
        assert.equal(runtime.harnessSha256, manifests[variant].benchmark_assembly_sha256);
        const invariant = { ...runtime };
        delete invariant.processId;
        delete invariant.ownerSha256;
        actualRuntime ??= invariant;
        assert.deepEqual(invariant, actualRuntime);
        const stateFiles = readdirSync(join(folder, 'states')).filter(name => name.endsWith('.json'));
        assert.equal(stateFiles.length, 13);
        const states = stateFiles.filter(name => name !== 'runtime.json')
            .map(file => ({ file, value: read(join(folder, 'states', file)) }));
        assert.deepEqual(states.map(row => `${row.value.caller}/${row.value.profile}`).sort(), expected);
        const consoleText = readFileSync(join(folder, 'console.log'), 'utf8').replace(/\r\n/g, '\n');
        const sections = consoleText.split(/^\/\/ Benchmark:\s*/m).slice(1);
        assert.equal(sections.length, 12);
        const receipts = new Map();
        for (const section of sections)
        {
            const identity = /^LoaderBenchmark\.(\w+):[^\n]+\[Profile=(\w+)\]/.exec(section);
            assert(identity);
            const [, method, profile] = identity;
            const key = `${method}/${profile}`;
            assert(!receipts.has(key) && section.includes('GC=Concurrent Server'));
            const setupMatches = [...section.matchAll(/^AUTOPERF_F095_SETUP (\{[^\n]+\})$/gm)];
            assert.equal(setupMatches.length, 1);
            const setup = JSON.parse(setupMatches[0][1]);
            const matching = states.filter(row => row.value.caller === method && row.value.profile === profile);
            assert.equal(matching.length, 1);
            assert.deepEqual(setup, matching[0].value);
            assert.equal(setup.actualSetupRuns, 2);
            assert.equal(setup.ownerSha256, manifests[variant].target_assembly_sha256);
            assert.equal(setup.harnessSha256, manifests[variant].benchmark_assembly_sha256);
            assert.equal(setup.processId, runtime.processId);
            verifySignature(setup.signature, method, profile);
            setupReceipts.push({ round, variant, file: matching[0].file, ...setup });
            const samples = stage => [...section.matchAll(new RegExp(
                `^Workload${stage}\\s+(\\d+):\\s+(\\d+) op,\\s+([\\d.]+) ns,`, 'gm'))]
                .map(match => ({ index: Number(match[1]), operations: Number(match[2]), nanoseconds: Number(match[3]) }));
            const warmups = samples('Warmup'), results = samples('Result');
            assert.deepEqual(warmups.map(row => row.index), [1, 2, 3]);
            assert.deepEqual(results.map(row => row.index), [1, 2, 3, 4, 5, 6, 7, 8]);
            assert([...warmups, ...results].every(row => row.operations > 0 && row.nanoseconds > 0));
            const gcMatches = [...section.matchAll(/^GC:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/gm)];
            assert.equal(gcMatches.length, 1);
            const gc = { gen0: Number(gcMatches[0][1]), gen1: Number(gcMatches[0][2]), gen2: Number(gcMatches[0][3]),
                totalAllocatedBytes: Number(gcMatches[0][4]), totalOperations: Number(gcMatches[0][5]) };
            assert(gc.totalAllocatedBytes >= 0 && gc.totalOperations > 0);
            const receipt = { round, variant, method, profile, warmups, results, gc,
                actualOwnerSha256: setup.ownerSha256, actualHarnessSha256: setup.harnessSha256, actualProcessId: setup.processId };
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
            results.forEach((item, index) =>
            {
                assert(item.Operations > 0 && item.Nanoseconds > 0 && item.LaunchIndex === 1);
                assert.equal(item.Operations, receipt.results[index].operations);
                assert.equal(item.Nanoseconds, receipt.results[index].nanoseconds);
            });
            const values = results.map(item => item.Nanoseconds / item.Operations);
            const average = mean(values);
            const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / 7;
            assert.equal(row.Statistics.OriginalValues.length, 8);
            values.forEach((value, index) => close(row.Statistics.OriginalValues[index], value, 'Actual retained sample'));
            close(row.Statistics.Mean, average, 'Actual mean');
            close(row.Statistics.Variance, variance, 'Actual variance');
            close(row.Statistics.StandardDeviation, Math.sqrt(variance), 'Actual standard deviation');
            close(row.Statistics.StandardError, Math.sqrt(variance / 8), 'Actual standard error');
            close(row.Statistics.Min, Math.min(...values), 'Actual minimum');
            close(row.Statistics.Max, Math.max(...values), 'Actual maximum');
            const sorted = [...values].sort((a, b) => a - b);
            close(row.Statistics.Median, (sorted[3] + sorted[4]) / 2, 'Actual median');
            const ci = row.Statistics.ConfidenceInterval;
            assert.equal(ci.N, 8);
            close(ci.Mean, average, 'Reported CI mean');
            close(ci.StandardError, row.Statistics.StandardError, 'Reported CI standard error');
            close(ci.Lower, ci.Mean - ci.Margin, 'Reported CI lower arithmetic');
            close(ci.Upper, ci.Mean + ci.Margin, 'Reported CI upper arithmetic');
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
        const beforeSetup = setupReceipts.find(row => row.round === round && row.variant === 'before' &&
            row.caller === before.Method && row.profile === profile);
        const afterSetup = setupReceipts.find(row => row.round === round && row.variant === 'after' &&
            row.caller === before.Method && row.profile === profile);
        assert.deepEqual(beforeSetup.signature, afterSetup.signature);
        pairs.push({ round, method: before.Method, profile, changedObsoleteBridgeCaller: before.Method === 'LegacyBridge',
            sourceUnchangedModernCaller: before.Method !== 'LegacyBridge', gatedCompiler: profile === 'GatedPrecompiled',
            actualWarmCache: profile === 'CachedOriginal' || profile === 'CompiledSelf',
            beforeNs: before.Statistics.Mean, afterNs: after[0].Statistics.Mean,
            changePercent: 100 * (after[0].Statistics.Mean / before.Statistics.Mean - 1),
            beforeBytes: before.Memory.BytesAllocatedPerOperation, afterBytes: after[0].Memory.BytesAllocatedPerOperation,
            savedBytes: before.Memory.BytesAllocatedPerOperation - after[0].Memory.BytesAllocatedPerOperation,
            beforeCvPercent: 100 * before.Statistics.StandardDeviation / before.Statistics.Mean,
            afterCvPercent: 100 * after[0].Statistics.StandardDeviation / after[0].Statistics.Mean });
    }
}
assert.deepEqual([outcomes.length, pairs.length, setupReceipts.length, consoleReceipts.length], [72, 36, 72, 72]);
assert(pairs.filter(row => row.actualWarmCache).every(row => row.beforeBytes === 0 && row.afterBytes === 0));
const groups = expected.map(key =>
{
    const [method, profile] = key.split('/');
    const rows = pairs.filter(row => row.method === method && row.profile === profile);
    assert.equal(rows.length, 3);
    return { method, profile, medianPairedChangePercent: rows.map(row => row.changePercent).sort((a, b) => a - b)[1],
        pairedChangePercent: rows.map(row => row.changePercent),
        allPairsFaster: rows.every(row => row.changePercent < 0), allPairsSlower: rows.every(row => row.changePercent > 0),
        beforeNs: rows.map(row => row.beforeNs), afterNs: rows.map(row => row.afterNs),
        beforeBytes: rows.map(row => row.beforeBytes), afterBytes: rows.map(row => row.afterBytes),
        savedBytes: rows.map(row => row.savedBytes),
        maximumCvPercent: Math.max(...rows.flatMap(row => [row.beforeCvPercent, row.afterCvPercent])) };
});
const summary = {
    obsoleteBridgeTimingChanges: range(pairs.filter(row => row.changedObsoleteBridgeCaller).map(row => row.changePercent)),
    untouchedSourceModernTimingChanges: range(pairs.filter(row => row.sourceUnchangedModernCaller).map(row => row.changePercent)),
    coldPrecompiledObsoleteBridgeTimingChanges: range(pairs.filter(row => row.method === 'LegacyBridge' &&
        row.profile === 'FreshPrecompiled').map(row => row.changePercent)),
    gatedTimingChanges: range(pairs.filter(row => row.gatedCompiler).map(row => row.changePercent)),
    maximumCvPercent: Math.max(...pairs.flatMap(row => [row.beforeCvPercent, row.afterCvPercent])),
    zeroByteWarmPairs: pairs.filter(row => row.actualWarmCache).length,
    groups
};
emit('raw-outcomes.json', outcomes);
emit('paired-outcomes.json', pairs);
emit('setup-correctness.json', setupReceipts);
emit('console-measurement-receipts.json', consoleReceipts);
emit('measurement-audit.json', {
    candidate: 'F095', disposition: 'no-gain', comparisons: 3, launchOrder: executions.map(row => row.label),
    outcomes: 72, pairedOutcomes: 36, actualConsoleResultSamples: 576, actualConsoleWarmups: 216,
    actualHashPidLinkedSetupReceipts: 72, actualSetupInvocations: 144, matchedManualSignatures: 12,
    matchedActualPendingFaultCancelCallerObservations: 4, actualOriginalTestsPassed: 6,
    actualPrototypeTestsPassed: 6, actualRestoredTestsPassed: 6, actualTestRowsPassed: 18, testSkips: 0,
    originalAndPrototypePrimedCacheAllocationBatches: 4, actualCacheOperationsPerBatch: 5000,
    actualPrimedCacheAllocationBytesPerOperationEachSource: 0, resourceAndFunctionalChecksAreGreenGreen: true,
    actualAllocationBugFixRedGreenClaimed: false, ownerOnlyChangedFileCount: 2, copiedFiles: 276, runtimeAssets: 104,
    recordedOwnerProducerAndHarnessSourcePdbProofsVerified: 20, scopedCurrentDefaultSourceBlobIdentities: 10,
    exactOneShippingBridgeSeamPrototypeVerified: true, noPublicShapeOrDefaultChanged: true,
    actualRestoredSourceOwnerDllPdbAndTestLoadedOwnerByteIdentityRecorded: true,
    actualRestoredPublicSourceBranchRefVerified: true, requiredPendingSyncWaitRetained: true,
    actualTypedItemDefaultModelCacheHandlerEndpointMetadataProducerExercised: true,
    actualCompilerExtensionProducesPendingFaultAndCancellation: true,
    realRazorSourceCompilationOrHttpExecutionClaimed: false,
    actualSampleMeanVarianceSdSeMedianArithmeticVerified: true, reportedCiInternalArithmeticVerified: true,
    confidenceIntervalDistributionNotIndependentlyRecomputed: true, actualConsoleGcTotalsAndReportedRoundingVerified: true,
    publicAuditRechecksRecordsNotOmittedBinaryBytes: true,
    modernControlsBypassChangedBridgeButShareChangedOwningAssembly: true,
    sourceRevision: baseline, scopedCurrentDefaultHead: defaultHead,
    allWarmImprovementColdRegressionsAndUntouchedControlMovementsRetained: true,
    boundary: 'Normal AddRazorPages DI with actual DefaultPageLoader, hand-authored valid typed Razor compiled item, actual DefaultViewCompiler/default application model/compiled factory/route endpoint and public compiler-extension gate. No Razor source compilation, HTTP, network, synchronization-context or production-frequency claim.',
    environment, actualRuntime, summary
});
const f = value => value.toFixed(2);
const lines = [
    '# F095: every paired outcome', '',
    'No supported material loader-lifecycle gain; original and prototype warmed allocations are0B. All observations, including tiny warmed improvements and large untouched-source controls, are retained. Negative timing change means faster. These are same-harness pairs, not a throughput claim.', '',
    '## Three-pair summaries', '',
    '| Caller | Profile | Median timing change % | Pair1/2/3 timing change % | Before B/op | After B/op | Maximum CV % |',
    '|---|---|---:|---|---|---|---:|'
];
for (const row of groups)
{
    lines.push(`| ${row.method} | ${row.profile} | ${f(row.medianPairedChangePercent)} | ${row.pairedChangePercent.map(f).join(' / ')} | ${row.beforeBytes.join(' / ')} | ${row.afterBytes.join(' / ')} | ${f(row.maximumCvPercent)} |`);
}
lines.push('', '## All36 exact A/B pairs', '',
    '| Pair | Caller | Profile | Before ns | After ns | Timing change % | Before B/op | After B/op | Before CV % | After CV % |',
    '|---:|---|---|---:|---:|---:|---:|---:|---:|---:|');
for (const row of pairs)
{
    lines.push(`| ${row.round} | ${row.method} | ${row.profile} | ${f(row.beforeNs)} | ${f(row.afterNs)} | ${f(row.changePercent)} | ${row.beforeBytes} | ${row.afterBytes} | ${f(row.beforeCvPercent)} | ${f(row.afterCvPercent)} |`);
}
lines.push('', 'All72 actual outcomes,576 retained result samples,216 actual warmups and72 real owner/harness/PID-linked setup receipts are independently tied to raw console/full JSON measurements. Reported CI arithmetic is checked; distribution quantiles are not recomputed. No unfavorable pair is removed.', '');
emit('comparison.md', lines.join('\n'), true);
console.log(JSON.stringify(summary, null, 2));
