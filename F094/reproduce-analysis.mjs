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
    const text = JSON.stringify(value, null, 2) + '\n';
    if (option === '--verify')
    {
        assert.equal(readFileSync(join(root, name), 'utf8'), text, `Existing audit differs:${name}`);
    }
    else
    {
        writeFileSync(join(root, name), text);
    }
};
const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const close = (actual, expected, label) =>
{
    assert(Number.isFinite(actual) && Number.isFinite(expected), label);
    assert(Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), label);
};
const profiles = {
    NoSections: { count: 0 },
    Completed1: { count: 1 },
    Completed2: { count: 2 },
    Completed8: { count: 8 },
    Completed32: { count: 32 },
    Completed128: { count: 128 },
    Completed8Long: { count: 8, length: 256 },
    MissingOptional: { count: 0, missing: true },
    GatedPending1: { count: 1, pending: true }
};
const methods = ['PageSync', 'PageAsync', 'ViewSync', 'ViewAsync'];
const expected = Object.keys(profiles).flatMap(profile => methods.map(method => `${method}/${profile}`)).sort();
const budget = read(join(root, 'measurement-budget.json'));
assert.equal(budget.maximum_comparisons, 3);
assert.equal(budget.consumed_comparisons, 3);
assert.equal(budget.status, 'closed');
const executions = read(join(root, 'execution.json'));
assert.deepEqual(executions.map(row => row.label),
    ['round-1-before', 'round-1-after', 'round-2-after', 'round-2-before', 'round-3-before', 'round-3-after']);
for (const row of executions)
{
    assert.equal(row.exit_code, 0);
    assert.equal(row.sdk, '12.0.100-alpha.1.26557.102');
    for (const [flag, value] of [['--warmupCount', '3'], ['--iterationCount', '8'],
        ['--iterationTime', '100'], ['--outliers', 'DontRemove'], ['--job', 'Short']])
    {
        assert(row.arguments.includes(flag));
        assert.equal(String(row.arguments[row.arguments.indexOf(flag) + 1]), value);
    }
    assert(row.arguments.includes('--inProcess'));
    assert(row.arguments[0].endsWith(`\\${row.variant}\\AutoPerf.Benchmarks.dll`));
}
const manifests = Object.fromEntries(['before', 'after'].map(variant =>
    [variant, read(join(root, `${variant}-manifest.json`))]));
for (const variant of ['before', 'after'])
{
    const sourceHash = hash(join(root, `source-${variant}.cs`));
    assert.equal(manifests[variant].target_source_sha256, sourceHash);
    const owner = read(join(root, `owner-pdb-${variant}.json`));
    assert(owner.verified && owner.document.endsWith('RazorPage.cs'));
    assert.equal(owner.source_sha256, sourceHash);
    assert.equal(owner.actual_pdb_document_sha256, sourceHash);
    const harness = read(join(root, `harness-pdb-${variant}.json`));
    assert.equal(harness.length, 4);
    for (const [index, file] of ['Program.cs', 'SectionLifecycle.cs', 'SectionBenchmark.cs', 'SectionProbe.cs'].entries())
    {
        assert(harness[index].verified && harness[index].document.endsWith(file));
        assert.equal(harness[index].source_sha256, hash(join(root, 'harness', file)));
        assert.equal(harness[index].actual_pdb_document_sha256, harness[index].source_sha256);
    }
}
const original = readFileSync(join(root, 'source-before.cs'), 'utf8');
const selected = readFileSync(join(root, 'source-after.cs'), 'utf8');
const eol = original.includes('\r\n') ? '\r\n' : '\n';
const syncOriginal = ['        var task = RenderSectionAsyncCore(name, required);',
    '        return task.GetAwaiter().GetResult();'].join(eol);
const syncSelected = ['        var task = RenderSectionAsyncCore(name, required);',
    '        if (task.IsCompletedSuccessfully)', '        {',
    '            return task.GetAwaiter().GetResult();', '        }', '',
    '        return task.AsTask().GetAwaiter().GetResult();'].join(eol);
assert(original.includes(syncOriginal));
assert.equal(selected, original.replace(syncOriginal, syncSelected)
    .replace('return RenderSectionAsyncCore(name, required);', 'return RenderSectionAsyncCore(name, required).AsTask();')
    .replace('private async Task<HtmlString?> RenderSectionAsyncCore',
        'private async ValueTask<HtmlString?> RenderSectionAsyncCore'));
const sourceCommit = readFileSync(join(root, 'source-commit.txt'), 'utf8').trim();
const committed = read(join(root, 'committed-source-identity.json'));
assert.equal(committed.merge_base_commit.sha, '37e809ead5824bc753a1c3d56f11615bdb1296c5');
assert.equal(committed.commits.length, 1);
assert.equal(committed.commits[0].sha, sourceCommit);
assert.equal(committed.files.length, 1);
assert.equal(committed.files[0].filename, 'src/Mvc/Mvc.Razor/src/RazorPage.cs');
assert.deepEqual([committed.files[0].additions, committed.files[0].deletions], [8, 3]);
const committedBytes = readFileSync(join(root, 'committed-canonical-source.cs'));
const actualGitBlob = createHash('sha1').update(`blob ${committedBytes.length}\0`).update(committedBytes).digest('hex');
assert.equal(committed.files[0].sha, actualGitBlob);
const canonicalization = read(join(root, 'committed-source-canonicalization.json'));
assert.equal(canonicalization.sourceCommit, sourceCommit);
assert.equal(canonicalization.actualRemoteBlobSha, actualGitBlob);
assert.equal(canonicalization.measuredSourceSha256, hash(join(root, 'source-after.cs')));
assert.equal(canonicalization.committedCanonicalSourceSha256, hash(join(root, 'committed-canonical-source.cs')));
assert(committedBytes.equals(Buffer.from(selected.replace(/\r\n/g, '\n'), 'utf8')));
assert(canonicalization.onlyCrLfToLfCanonicalizationDiffers && canonicalization.measuredSourceBytesPreservedUnchanged);
assert.equal(canonicalization.rawSourceBytesIdentical, false);
const defaultHead = read(join(root, 'current-default-head.json')).sha;
const defaultOwners = read(join(root, 'current-default-owner-producer-identity.json'));
assert.equal(defaultOwners.length, 3);
assert(defaultOwners.every(row => row.identical && row.baselineBlob === row.currentDefaultBlob &&
    row.currentDefault === defaultHead && row.baseline === committed.merge_base_commit.sha));
const defaultTest = read(join(root, 'current-default-test-identity.json'));
assert(defaultTest.identical && defaultTest.baselineBlob === defaultTest.currentDefaultBlob);
const producers = read(join(root, 'producer-source-copies.json'));
assert.equal(producers.length, 3);
for (const row of producers)
{
    assert.equal(hash(join(root, row.published)), row.sha256);
    if (row.baselineBlob)
    {
        assert.equal(row.baselineBlob, defaultTest.baselineBlob);
        assert(row.identical_to_current_default_and_baseline);
    }
    else
    {
        assert(row.identical_to_manifest);
        assert.equal(manifests.before.additional_target_sources.find(item => item.path === row.source)?.sha256, row.sha256);
    }
}
for (const field of ['benchmark_assembly_sha256', 'runtime_configuration_sha256',
    'dependency_configuration_sha256', 'source_revision', 'runtime_framework'])
{
    assert.equal(manifests.before[field], manifests.after[field]);
}
assert.deepEqual(manifests.before.additional_target_sources, manifests.after.additional_target_sources);
assert.notEqual(manifests.before.target_assembly_sha256, manifests.after.target_assembly_sha256);
const closure = read(join(root, 'execution-closure.json'));
assert.equal(closure.complete_recursive_file_sets_equal, true);
assert.equal(closure.copied_files, 266);
assert.equal(closure.runtime_assets, 98);
assert.deepEqual([...closure.changed_files].sort(),
    ['Microsoft.AspNetCore.Mvc.Razor.dll', 'Microsoft.AspNetCore.Mvc.Razor.pdb']);
assert.equal(closure.before.length, 266);
assert.equal(closure.after.length, 266);
for (const before of closure.before)
{
    const after = closure.after.filter(row => row.file === before.file);
    assert.equal(after.length, 1);
    if (!closure.changed_files.includes(before.file))
    {
        assert.deepEqual(after[0], before);
    }
}
const tests = read(join(root, 'actual-test-audit.json'));
assert.deepEqual([tests.originalPassed, tests.selectedPassed, tests.actualRows, tests.skipped], [14, 14, 28, 0]);
assert.deepEqual(tests.variants.before.map(row => row.testName), tests.variants.after.map(row => row.testName));
for (const variant of ['before', 'after'])
{
    assert.equal(tests.trxSha256[variant], hash(join(root, `tests-${variant}`, `F094-razor-${variant}.trx`)));
    assert.equal(tests.variants[variant].length, 14);
    assert(tests.variants[variant].every(row => row.outcome === 'Passed' &&
        row.className === 'Microsoft.AspNetCore.Mvc.Razor.RazorPageTest' && row.duration !== '00:00:00'));
    assert.equal(read(join(root, `verify-${variant}-execution.json`)).exit_code, 0);
}
const functionalBefore = read(join(root, 'verification-before', 'states', 'functional-probe.json'));
const functionalAfter = read(join(root, 'verification-after', 'states', 'functional-probe.json'));
assert.deepEqual(functionalAfter, functionalBefore);
assert.equal(functionalBefore.realViewFaults.length, 4);
for (const field of ['synchronousNullNameValidated', 'synchronousLayoutEntryValidated', 'publicPresentTasksRemainDistinct',
    'actualEmptyTokenIdentity', 'cachedNullTaskRetained', 'mixedSyncAsyncDuplicateRejected', 'completedFaultUnwrapped'])
{
    assert.equal(functionalBefore[field], true);
}
for (const row of functionalBefore.realViewFaults)
{
    assert(row.Boundary.startsWith('Actual RazorView'));
    assert.equal(row.Written, '');
    assert.equal(row.Invocations, 1);
    assert.equal(row.Tokens, 0);
    assert.equal(row.ErrorType, 'AutoPerf.SectionFailure');
    assert.equal(row.ErrorMessage, 'actual section failed');
    assert(row.ErrorHasNoInner && row.DuplicateAfterFailureRejected && row.OriginalDictionaryTransferred);
    if (row.Profile === 'PendingFault')
    {
        assert.equal(row.SyncCallerObservedWaiting, !row.AsyncCaller);
        assert.equal(row.AsyncReturnedPending, row.AsyncCaller);
        assert.equal(row.BeforeGateReleaseOutput, '');
    }
}
const resources = {};
for (const variant of ['before', 'after'])
{
    resources[variant] = read(join(root, `verification-${variant}`, 'states', 'resource-check.json'));
    assert.equal(resources[variant].length, 4);
    for (const row of resources[variant])
    {
        assert.equal(row.Operations, 5000);
        assert.equal(row.ActualEmptyOrNullToken, true);
        const expectedBytes = row.Present && (variant === 'before' || row.Method === 'RenderSectionAsync') ? 72 : 0;
        assert.equal(row.BytesPerOperation, expectedBytes);
        assert.equal(row.AllocatedBytes, expectedBytes * row.Operations);
    }
    const zeroRows = read(join(root, `zero-wrapper-${variant}`, 'states', 'zero-wrapper-resource-check.json'));
    assert.deepEqual(zeroRows, resources[variant]);
}
assert.equal(read(join(root, 'zero-wrapper-before-execution.json')).expected_resource_failure, true);
assert.notEqual(read(join(root, 'zero-wrapper-before-execution.json')).exit_code, 0);
assert(readFileSync(join(root, 'zero-wrapper-before.log'), 'utf8')
    .includes('Actual completed public synchronous sections allocated 360000 extra bytes across 5000 primed owners; expected no completed wrapper.'));
assert.equal(read(join(root, 'zero-wrapper-after-execution.json')).exit_code, 0);
assert(readFileSync(join(root, 'zero-wrapper-after.log'), 'utf8')
    .includes('F094: actual completed public synchronous sections allocate zero wrapper bytes.'));
const verifySignature = (signature, method, profile) =>
{
    const spec = profiles[profile];
    assert(spec);
    const full = method.startsWith('View');
    const asyncCaller = method.endsWith('Async');
    const body = (full ? '<body/>' : '') + Array.from({ length: spec.count }, (_, index) =>
        '<s>Section_' + 'a'.repeat(spec.length ?? 16) + String(index).padStart(3, '0') + '</s>').join('');
    assert.equal(signature.Profile, profile);
    assert.equal(signature.AsyncCaller, asyncCaller);
    assert.equal(signature.Written, body);
    assert.equal(signature.Invocations, spec.count);
    assert.equal(signature.Tokens, spec.count);
    assert.equal(signature.NullTokens, spec.missing ? 1 : 0);
    assert(signature.EmptyTokenIdentity && signature.OriginalDictionaryTransferred);
    assert.equal(signature.ContentMarkedForLayout, full);
    assert(signature.DictionaryType.startsWith('System.Collections.Generic.Dictionary`2[[System.String,'));
    assert(signature.DictionaryType.includes('Microsoft.AspNetCore.Mvc.Razor.RenderAsyncDelegate'));
    assert.equal(signature.BufferScopeType, full ? 'Microsoft.AspNetCore.Mvc.ViewFeatures.Buffers.MemoryPoolViewBufferScope' : null);
    assert.equal(signature.Boundary, full ?
        'Actual RazorView section transfer/scoped pooled buffering/HTML flush' :
        'Real public page/DefineSection; caller-set PreviousSectionWriters diagnostic; RazorView transfer bypassed');
    assert.equal(signature.SyncCallerObservedWaiting, spec.pending ? !asyncCaller : null);
    assert.equal(signature.AsyncReturnedPending, spec.pending ? asyncCaller : null);
    assert.equal(signature.BeforeGateReleaseOutput, spec.pending ? '' : null);
    for (const field of ['ErrorType', 'ErrorMessage', 'ErrorHasNoInner', 'DuplicateAfterFailureRejected'])
    {
        assert.equal(signature[field], null);
    }
};
for (const profile of Object.keys(profiles))
{
    for (const method of methods)
    {
        const before = read(join(root, 'verification-before', 'states', `${method}-${profile}.json`));
        const after = read(join(root, 'verification-after', 'states', `${method}-${profile}.json`));
        verifySignature(before.signature, method, profile);
        assert.deepEqual(after.signature, before.signature);
    }
}
const outcomes = [], pairs = [], consoleReceipts = [], setupReceipts = [];
let environment, actualRuntime;
for (const round of [1, 2, 3])
{
    const byVariant = {};
    for (const variant of ['before', 'after'])
    {
        const folder = join(root, `round-${round}-${variant}`);
        const reports = readdirSync(join(folder, 'results')).filter(file => file.includes('-full') && file.endsWith('.json'));
        assert.equal(reports.length, 1);
        const report = read(join(folder, 'results', reports[0]));
        assert.equal(report.Benchmarks.length, 36);
        environment ??= report.HostEnvironmentInfo;
        assert.deepEqual(report.HostEnvironmentInfo, environment);
        assert.deepEqual([environment.BenchmarkDotNetVersion, environment.RuntimeVersion, environment.Architecture,
            environment.Configuration, environment.DotNetCliVersion],
        ['0.13.0', '.NET 12.0.0 (12.0.26.56305)', 'X64', 'RELEASE', '12.0.100-alpha.1.26557.102']);
        assert.deepEqual(report.Benchmarks.map(row => `${row.Method}/${row.Parameters.replace('Profile=', '')}`).sort(), expected);
        const runtime = read(join(folder, 'states', 'runtime.json'));
        assert.equal(runtime.corelibInformationalVersion, '12.0.0-alpha.1.26562.105+dfd6ac738610ea05f42e704be82b386e71052e12');
        assert.equal(runtime.diInformationalVersion, runtime.corelibInformationalVersion);
        assert.equal(runtime.architecture, 'X64');
        assert(runtime.serverGc && runtime.processId > 0);
        assert.equal(runtime.ownerSha256, manifests[variant].target_assembly_sha256);
        assert.equal(runtime.harnessSha256, manifests[variant].benchmark_assembly_sha256);
        const invariantRuntime = { ...runtime };
        delete invariantRuntime.processId;
        delete invariantRuntime.ownerSha256;
        actualRuntime ??= invariantRuntime;
        assert.deepEqual(invariantRuntime, actualRuntime);
        const consoleText = readFileSync(join(folder, 'console.log'), 'utf8').replace(/\r\n/g, '\n');
        const sections = consoleText.split(/^\/\/ Benchmark:\s*/m).slice(1);
        assert.equal(sections.length, 36);
        const receipts = new Map();
        const stateFiles = readdirSync(join(folder, 'states')).filter(file => file.endsWith('.json'));
        assert.equal(stateFiles.length, 37);
        const states = stateFiles.filter(file => file !== 'runtime.json')
            .map(file => ({ file, value: read(join(folder, 'states', file)) }));
        assert.deepEqual(states.map(row => `${row.value.method}/${row.value.profile}`).sort(), expected);
        for (const section of sections)
        {
            const identity = /^SectionBenchmark\.(\w+):[^\n]+\[Profile=(\w+)\]/.exec(section);
            assert(identity);
            const [, method, profile] = identity;
            const key = `${method}/${profile}`;
            assert(!receipts.has(key) && section.includes('GC=Concurrent Server'));
            const setupMatches = [...section.matchAll(/^AUTOPERF_F094_SETUP (\{[^\n]+\})$/gm)];
            assert.equal(setupMatches.length, 1);
            const setup = JSON.parse(setupMatches[0][1]);
            const state = states.filter(row => row.value.method === method && row.value.profile === profile);
            assert.equal(state.length, 1);
            assert.deepEqual(setup, state[0].value);
            assert.equal(setup.actualSetupRuns, 2);
            assert.equal(setup.ownerSha256, manifests[variant].target_assembly_sha256);
            assert.equal(setup.harnessSha256, manifests[variant].benchmark_assembly_sha256);
            assert.equal(setup.processId, runtime.processId);
            verifySignature(setup.signature, method, profile);
            setupReceipts.push({ round, variant, file: state[0].file, ...setup });
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
                actualOwnerSha256: setup.ownerSha256, actualHarnessSha256: setup.harnessSha256,
                actualProcessId: setup.processId };
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
            const values = results.map(item => item.Nanoseconds / item.Operations);
            const mean = average(values);
            const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
            assert.equal(row.Statistics.OriginalValues.length, 8);
            values.forEach((value, index) => close(row.Statistics.OriginalValues[index], value, 'Retained original sample'));
            close(row.Statistics.Mean, mean, 'Actual sample mean');
            close(row.Statistics.Variance, variance, 'Actual sample variance');
            close(row.Statistics.StandardDeviation, Math.sqrt(variance), 'Actual sample standard deviation');
            close(row.Statistics.StandardError, Math.sqrt(variance / values.length), 'Actual sample standard error');
            close(row.Statistics.Min, Math.min(...values), 'Actual sample minimum');
            close(row.Statistics.Max, Math.max(...values), 'Actual sample maximum');
            const sorted = [...values].sort((a, b) => a - b);
            close(row.Statistics.Median, (sorted[3] + sorted[4]) / 2, 'Actual sample median');
            const ci = row.Statistics.ConfidenceInterval;
            assert.equal(ci.N, 8);
            close(ci.Mean, mean, 'Reported CI mean');
            close(ci.StandardError, row.Statistics.StandardError, 'Reported CI standard error');
            close(ci.Lower, ci.Mean - ci.Margin, 'Reported CI lower arithmetic');
            close(ci.Upper, ci.Mean + ci.Margin, 'Reported CI upper arithmetic');
            assert.equal(row.Memory.Gen0Collections, receipt.gc.gen0);
            assert.equal(row.Memory.Gen1Collections, receipt.gc.gen1);
            assert.equal(row.Memory.Gen2Collections, receipt.gc.gen2);
            assert.equal(row.Memory.TotalOperations, receipt.gc.totalOperations);
            assert.equal(row.Memory.BytesAllocatedPerOperation, Math.round(receipt.gc.totalAllocatedBytes / receipt.gc.totalOperations));
            outcomes.push({ round, variant, profile,
                rawGcBytesPerOperation: receipt.gc.totalAllocatedBytes / receipt.gc.totalOperations, ...row });
        }
    }
    for (const before of byVariant.before)
    {
        const after = byVariant.after.filter(row => row.FullName === before.FullName);
        assert.equal(after.length, 1);
        const profile = before.Parameters.replace('Profile=', '');
        const beforeState = setupReceipts.find(row => row.round === round && row.variant === 'before' &&
            row.method === before.Method && row.profile === profile);
        const afterState = setupReceipts.find(row => row.round === round && row.variant === 'after' &&
            row.method === before.Method && row.profile === profile);
        assert.deepEqual(beforeState.signature, afterState.signature);
        const completedTarget = before.Method.endsWith('Sync') && profile.startsWith('Completed');
        pairs.push({ round, method: before.Method, profile, completedSyncAllocationTarget: completedTarget,
            modifiedAsyncCompatibilityCaller: before.Method.endsWith('Async') && profile !== 'NoSections',
            genuinelyUnchangedBypass: profile === 'NoSections',
            pendingCompatibilityCaller: profile === 'GatedPending1',
            expectedCompletedWrapperSavingBytes: completedTarget ? 72 * profiles[profile].count : 0,
            beforeNs: before.Statistics.Mean, afterNs: after[0].Statistics.Mean,
            changePercent: 100 * (after[0].Statistics.Mean / before.Statistics.Mean - 1),
            beforeBytes: before.Memory.BytesAllocatedPerOperation, afterBytes: after[0].Memory.BytesAllocatedPerOperation,
            savedBytes: before.Memory.BytesAllocatedPerOperation - after[0].Memory.BytesAllocatedPerOperation,
            beforeCvPercent: 100 * before.Statistics.StandardDeviation / before.Statistics.Mean,
            afterCvPercent: 100 * after[0].Statistics.StandardDeviation / after[0].Statistics.Mean });
    }
}
assert.deepEqual([outcomes.length, pairs.length, consoleReceipts.length, setupReceipts.length], [216, 108, 216, 216]);
const range = values => ({ minimum: Math.min(...values), maximum: Math.max(...values) });
const groups = expected.map(key =>
{
    const [method, profile] = key.split('/');
    const rows = pairs.filter(row => row.method === method && row.profile === profile);
    assert.equal(rows.length, 3);
    return { method, profile, completedSyncAllocationTarget: rows[0].completedSyncAllocationTarget,
        modifiedAsyncCompatibilityCaller: rows[0].modifiedAsyncCompatibilityCaller,
        genuinelyUnchangedBypass: rows[0].genuinelyUnchangedBypass,
        medianPairedChangePercent: rows.map(row => row.changePercent).sort((a, b) => a - b)[1],
        pairedChangePercent: rows.map(row => row.changePercent),
        allPairsFaster: rows.every(row => row.changePercent < 0),
        allPairsSlower: rows.every(row => row.changePercent > 0),
        beforeBytes: rows.map(row => row.beforeBytes), afterBytes: rows.map(row => row.afterBytes),
        savedBytes: rows.map(row => row.savedBytes),
        expectedCompletedWrapperSavingBytes: rows[0].expectedCompletedWrapperSavingBytes,
        maximumCvPercent: Math.max(...rows.flatMap(row => [row.beforeCvPercent, row.afterCvPercent])) };
});
const summary = {
    completedSyncTargetTimingChanges: range(pairs.filter(row => row.completedSyncAllocationTarget).map(row => row.changePercent)),
    modifiedAsyncCompatibilityTimingChanges: range(pairs.filter(row => row.modifiedAsyncCompatibilityCaller).map(row => row.changePercent)),
    genuinelyUnchangedBypassTimingChanges: range(pairs.filter(row => row.genuinelyUnchangedBypass).map(row => row.changePercent)),
    pendingTimingChanges: range(pairs.filter(row => row.pendingCompatibilityCaller).map(row => row.changePercent)),
    pendingReportedSavedBytes: range(pairs.filter(row => row.pendingCompatibilityCaller).map(row => row.savedBytes)),
    maximumCvPercent: Math.max(...pairs.flatMap(row => [row.beforeCvPercent, row.afterCvPercent])),
    groups
};
emit('raw-outcomes.json', outcomes);
emit('paired-outcomes.json', pairs);
emit('setup-correctness.json', setupReceipts);
emit('console-measurement-receipts.json', consoleReceipts);
emit('measurement-audit.json', {
    candidate: 'F094', comparisons: 3, launchOrder: executions.map(row => row.label),
    outcomes: outcomes.length, pairedOutcomes: pairs.length, resultSamples: outcomes.length * 8,
    actualConsoleWarmups: outcomes.length * 3, actualHashPidLinkedSetupReceipts: setupReceipts.length,
    matchedManualSignatures: 36, matchedActualRazorViewFaultObservations: 4,
    actualOriginalTestsPassed: 14, actualSelectedTestsPassed: 14, actualTestRowsPassed: 28, testSkips: 0,
    actualCompletedPresentSyncBytesBefore: 72, actualCompletedPresentSyncBytesAfter: 0,
    actualCompletedPresentAsyncBytesBefore: 72, actualCompletedPresentAsyncBytesAfter: 72,
    actualMissingSyncAndAsyncBytesBeforeAfter: 0, actualResourceRedGreenVerified: true,
    functionalAndExistingTestsAreGreenGreen: true, ownerOnlyChangedFileCount: 2, copiedFiles: 266, runtimeAssets: 98,
    actualSampleMeanVarianceSdSeMedianArithmeticVerified: true,
    reportedConfidenceIntervalInternalArithmeticVerified: true, confidenceIntervalDistributionNotIndependentlyRecomputed: true,
    actualConsoleGcTotalsAndReportedRoundingVerified: true, actualPendingProducerAndPreReleaseCallerOutputVerified: true,
    exactThreeShippingSeamsVerified: true, recordedOwnerAndFourHarnessPdbSourceProofsVerified: true,
    actualCommittedCanonicalSourceBytesAndOneFileEightAdditionThreeDeletionScopeVerified: true,
    onlyGitCrLfToLfCanonicalizationDiffersFromMeasuredSource: true,
    scopedDefaultOwnerProducerAndTestBlobIdentityVerified: true, copiedActualProducerSourcesVerified: 3,
    sourceCommit, scopedDefaultHead: defaultHead,
    publicAuditRechecksRecordsNotOmittedBinaryBytes: true,
    asyncCompatibilityCallersAreModifiedNotUntouched: true, noSectionBypassesAreGenuinelyUntouched: true,
    firstRoundPageSyncCompleted1RegressionAndExtraHeapRetained: true,
    boundary: 'Handwritten real public pages/DefineSection and actual RazorView transfer/scoped pooled buffering/exact HTML flush. Page methods assign writers diagnostically; no compiler/network/browser boundary.',
    environment, actualRuntime, summary
});
console.log(JSON.stringify(summary, null, 2));
