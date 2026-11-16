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
const profiles = ['Eof', 'Cached1', 'Cached8', 'Uncached9', 'Uncached16', 'Partial16', 'Uncached256', 'Uncached4096'];
const targetProfiles = new Set(profiles.slice(3));
const methods = ['PreparedSync', 'PreparedMemoryAsync', 'PublicSync'];
const expected = profiles.flatMap(profile => methods.map(method => `${method}/${profile}`)).sort();
const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const budget = read(join(root, 'measurement-budget.json'));
assert.equal(budget.maximum_comparisons, 3);
assert.equal(budget.consumed_comparisons, 3);
assert.equal(budget.status, 'closed');
assert.equal(budget.preparation_failures.length, 3);
assert(budget.preparation_failures.every(row => !row.measured_workload_executed && !row.resource_assertion_reached));
const executions = read(join(root, 'execution.json'));
assert.deepEqual(executions.map(row => row.label),
    ['round-1-before', 'round-1-after', 'round-2-after', 'round-2-before', 'round-3-before', 'round-3-after']);
for (const row of executions)
{
    assert.equal(row.exit_code, 0);
    assert.equal(row.sdk, '12.0.100-alpha.1.26557.102');
    for (const [flag, value] of [
        ['--warmupCount', '3'], ['--iterationCount', '8'], ['--iterationTime', '100'],
        ['--outliers', 'DontRemove'], ['--job', 'Short'],
    ])
    {
        assert.equal(String(row.arguments[row.arguments.indexOf(flag) + 1]), value);
    }
    assert(row.arguments.includes('--inProcess'));
    assert(row.arguments[0].endsWith(`\\${row.variant}\\AutoPerf.Benchmarks.dll`));
}
const manifests = Object.fromEntries(['before', 'after'].map(variant =>
    [variant, read(join(root, `${variant}-manifest.json`))]));
for (const variant of ['before', 'after'])
{
    assert.equal(manifests[variant].target_source_sha256, hash(join(root, `source-${variant}.cs`)));
    const owner = read(join(root, `owner-pdb-${variant}.json`));
    assert.equal(owner.verified, true);
    assert.equal(owner.source_sha256, hash(join(root, `source-${variant}.cs`)));
    assert.equal(owner.actual_pdb_document_sha256, owner.source_sha256);
    const harness = read(join(root, `harness-pdb-${variant}.json`));
    assert.equal(harness.length, 4);
    for (const [index, file] of ['LiveResponse.cs', 'ResponseBodyReadBenchmark.cs', 'ResponseBodyReadProbe.cs', 'Program.cs'].entries())
    {
        assert.equal(harness[index].verified, true);
        assert.equal(harness[index].source_sha256, hash(join(root, 'harness', file)));
        assert.equal(harness[index].actual_pdb_document_sha256, harness[index].source_sha256);
    }
}
const original = readFileSync(join(root, 'source-before.cs'), 'utf8');
const selected = readFileSync(join(root, 'source-after.cs'), 'utf8');
const eol = original.includes('\r\n') ? '\r\n' : '\n';
assert.equal(selected, original.replace(
    'return ReadAsync(buffer, offset, count, CancellationToken.None).GetAwaiter().GetResult();',
    `var readTask = ReadAsync(buffer.AsMemory(offset, count), CancellationToken.None);${eol}` +
    '        return readTask.IsCompletedSuccessfully ? readTask.Result : readTask.AsTask().GetAwaiter().GetResult();'));
for (const field of ['benchmark_assembly_sha256', 'runtime_configuration_sha256', 'dependency_configuration_sha256'])
{
    assert.equal(manifests.before[field], manifests.after[field]);
}
assert.notEqual(manifests.before.target_assembly_sha256, manifests.after.target_assembly_sha256);
const closure = read(join(root, 'execution-closure.json'));
assert.equal(closure.complete_recursive_file_sets_equal, true);
assert.equal(closure.copied_files, 126);
assert.equal(closure.runtime_assets, 58);
assert.deepEqual(closure.changed_files.sort(), ['Microsoft.AspNetCore.TestHost.dll', 'Microsoft.AspNetCore.TestHost.pdb']);
const tests = read(join(root, 'actual-test-audit.json'));
assert.deepEqual([tests.originalInitialPassed, tests.originalWithPreservationPassed, tests.selectedPassed], [23, 26, 26]);
assert.equal(tests.skipped, 0);
assert.equal(tests.actualRows, 75);
for (const variant of ['before', 'after'])
{
    assert.equal(tests.variants[variant].length, 26);
    assert(tests.variants[variant].every(row => row.outcome === 'Passed' && row.methodName && row.className && row.duration !== '00:00:00'));
}
assert.deepEqual(tests.variants.before.map(row => row.testName), tests.variants.after.map(row => row.testName));
const functionalBefore = read(join(root, 'verification-before', 'functional-probe.json'));
const functionalAfter = read(join(root, 'verification-after', 'functional-probe.json'));
assert.equal(functionalBefore.length, 15);
assert.deepEqual(functionalBefore, functionalAfter);
for (const row of functionalBefore.slice(0, 4))
{
    assert(row.observed_state_before_producer.includes('WaitSleepJoin'));
    assert.equal(row.completed_before_producer, false);
}
const resourceBefore = read(join(root, 'verification-before', 'resource-check.json'));
const resourceAfter = read(join(root, 'verification-after', 'resource-check.json'));
assert.equal(resourceBefore.operations, 5000);
assert.equal(resourceAfter.operations, 5000);
assert.equal(resourceBefore.extra_bytes_per_read, 72);
assert.equal(resourceBefore.passed_zero_wrapper, false);
assert.equal(resourceAfter.extra_bytes, 0);
assert.equal(resourceAfter.passed_zero_wrapper, true);
assert.equal(resourceBefore.memory_bytes, resourceAfter.memory_bytes);
assert.notEqual(read(join(root, 'verify-before-execution.json')).exit_code, 0);
assert.equal(read(join(root, 'verify-after-execution.json')).exit_code, 0);

const outcomes = [];
const pairs = [];
const consoleReceipts = [];
const setupReceipts = [];
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
        assert.equal(report.Benchmarks.length, 24);
        environment ??= report.HostEnvironmentInfo;
        assert.deepEqual(report.HostEnvironmentInfo, environment);
        assert.equal(environment.BenchmarkDotNetVersion, '0.13.0');
        assert.equal(environment.RuntimeVersion, '.NET 12.0.0 (12.0.26.56305)');
        assert.equal(environment.Architecture, 'X64');
        assert.equal(environment.Configuration, 'RELEASE');
        assert.equal(environment.DotNetCliVersion, '12.0.100-alpha.1.26557.102');
        assert.deepEqual(report.Benchmarks.map(row => `${row.Method}/${row.Parameters.replace('Profile=', '')}`).sort(), expected);
        const consoleText = readFileSync(join(folder, 'console.log'), 'utf8');
        const sections = consoleText.split(/^\/\/ Benchmark:\s*/m).slice(1);
        assert.equal(sections.length, 24);
        const receipts = new Map();
        const states = readdirSync(join(folder, 'states')).filter(file => file.endsWith('.json'))
            .map(file => ({ file, value: read(join(folder, 'states', file)) }));
        assert.equal(states.length, 24);
        assert.deepEqual(states.map(row => `${row.value.method}/${row.value.profile}`).sort(), expected);
        for (const section of sections)
        {
            const identity = /^ResponseBodyReadBenchmark\.(\w+):[^\r\n]+\[Profile=(\w+)\]/.exec(section);
            assert(identity);
            const [, method, profile] = identity;
            const key = `${method}/${profile}`;
            assert(!receipts.has(key));
            assert(section.includes('GC=Concurrent Server'));
            const setupMatches = [...section.matchAll(/^AUTOPERF_F092_SETUP (\{[^\r\n]+\})$/gm)];
            assert.equal(setupMatches.length, 1);
            const setup = JSON.parse(setupMatches[0][1]);
            const state = states.filter(row => row.value.method === method && row.value.profile === profile);
            assert.equal(state.length, 1);
            assert.deepEqual(setup, state[0].value);
            assert.equal(setup.owner_type, 'Microsoft.AspNetCore.TestHost.ResponseBodyReaderStream');
            assert.equal(setup.real_public_producer, 'Microsoft.AspNetCore.TestHost.ResponseBodyPipeWriter');
            assert.equal(setup.owner_sha256, manifests[variant].target_assembly_sha256);
            assert.equal(setup.harness_sha256, manifests[variant].benchmark_assembly_sha256);
            assert.equal(setup.profile, profile);
            assert.equal(setup.method, method);
            assert(setup.process_id > 0 && setup.exact_payload && setup.sentinels_unchanged);
            const payloadSize = ({ Eof: 0, Cached1: 1, Cached8: 8, Uncached9: 9, Uncached16: 16, Partial16: 16, Uncached256: 256, Uncached4096: 4096 })[profile];
            const payload = Buffer.from(Array.from({ length: payloadSize }, (_, index) => index % 239));
            const actual = Buffer.from(setup.actual_bytes, 'base64');
            assert.equal(setup.actual, payloadSize);
            assert.equal(setup.requested, profile === 'Partial16' ? 32 : Math.max(payloadSize, 1));
            assert.equal(actual.length, setup.requested + 4);
            assert(actual.subarray(2, 2 + payloadSize).equals(payload));
            assert([...actual.subarray(0, 2), ...actual.subarray(2 + payloadSize)].every(value => value === 255));
            assert.equal(setup.payload_sha256, createHash('sha256').update(payload).digest('hex').toUpperCase());
            setupReceipts.push({ round, variant, file: state[0].file, ...setup });
            const samples = stage => [...section.matchAll(new RegExp(
                `^Workload${stage}\\s+(\\d+):\\s+(\\d+) op,\\s+([\\d.]+) ns,`, 'gm'))]
                .map(match => ({ index: Number(match[1]), operations: Number(match[2]), nanoseconds: Number(match[3]) }));
            const warmups = samples('Warmup');
            const results = samples('Result');
            assert.deepEqual(warmups.map(row => row.index), [1, 2, 3]);
            assert.deepEqual(results.map(row => row.index), [1, 2, 3, 4, 5, 6, 7, 8]);
            const gcMatches = [...section.matchAll(/^GC:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/gm)];
            assert.equal(gcMatches.length, 1);
            const gc = {
                gen0: Number(gcMatches[0][1]), gen1: Number(gcMatches[0][2]), gen2: Number(gcMatches[0][3]),
                totalAllocatedBytes: Number(gcMatches[0][4]), totalOperations: Number(gcMatches[0][5]),
            };
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
                assert.equal(item.LaunchIndex, 1);
                assert(item.Operations > 0 && item.Nanoseconds > 0);
                assert.equal(item.Operations, receipt.results[index].operations);
                assert.equal(item.Nanoseconds, receipt.results[index].nanoseconds);
            }
            assert(Math.abs(average(results.map(item => item.Nanoseconds / item.Operations)) - row.Statistics.Mean)
                <= 1e-9 * row.Statistics.Mean);
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
        for (const key of ['actual_bytes', 'actual', 'requested', 'payload_sha256', 'owner_type', 'real_public_producer'])
        {
            assert.deepEqual(beforeState[key], afterState[key]);
        }
        const savedBytes = before.Memory.BytesAllocatedPerOperation - after[0].Memory.BytesAllocatedPerOperation;
        const resourceTarget = before.Method === 'PreparedSync' && targetProfiles.has(profile);
        const preparedControl = before.Method === 'PreparedMemoryAsync' || (before.Method === 'PreparedSync' && !targetProfiles.has(profile));
        if (resourceTarget)
        {
            assert.equal(savedBytes, 72, 'All guaranteed-completed target reads remove the actual task wrapper.');
        }
        if (preparedControl)
        {
            assert.equal(savedBytes, 0, 'Actual prepared memory/cached/EOF allocation controls are unchanged.');
        }
        pairs.push({
            round, method: before.Method, profile, resourceTarget, preparedControl,
            timingTarget: before.Method !== 'PreparedMemoryAsync' && targetProfiles.has(profile),
            beforeNs: before.Statistics.Mean, afterNs: after[0].Statistics.Mean,
            changePercent: 100 * (after[0].Statistics.Mean / before.Statistics.Mean - 1),
            beforeBytes: before.Memory.BytesAllocatedPerOperation, afterBytes: after[0].Memory.BytesAllocatedPerOperation,
            savedBytes, allocationReductionPercent: before.Memory.BytesAllocatedPerOperation > 0
                ? 100 * savedBytes / before.Memory.BytesAllocatedPerOperation : 0,
            beforeCvPercent: 100 * before.Statistics.StandardDeviation / before.Statistics.Mean,
            afterCvPercent: 100 * after[0].Statistics.StandardDeviation / after[0].Statistics.Mean,
        });
    }
}
const range = values => ({ minimum: Math.min(...values), maximum: Math.max(...values) });
const groupRows = expected.map(key =>
{
    const [method, profile] = key.split('/');
    const rows = pairs.filter(row => row.method === method && row.profile === profile);
    assert.equal(rows.length, 3);
    const changes = rows.map(row => row.changePercent).sort((a, b) => a - b);
    return { method, profile, medianPairedChangePercent: changes[1],
        allPairsFaster: rows.every(row => row.changePercent < 0), allPairsSlower: rows.every(row => row.changePercent > 0),
        beforeBytes: rows.map(row => row.beforeBytes), afterBytes: rows.map(row => row.afterBytes),
        maximumCvPercent: Math.max(...rows.flatMap(row => [row.beforeCvPercent, row.afterCvPercent])) };
});
const summary = {
    preparedTargetTimingChanges: range(pairs.filter(row => row.resourceTarget).map(row => row.changePercent)),
    publicTargetTimingChanges: range(pairs.filter(row => row.method === 'PublicSync' && row.timingTarget).map(row => row.changePercent)),
    guaranteedCompletedTargetSavedBytes: range(pairs.filter(row => row.resourceTarget).map(row => row.savedBytes)),
    guaranteedCompletedAllocationReductionPercent: range(pairs.filter(row => row.resourceTarget).map(row => row.allocationReductionPercent)),
    publicTargetReportedAllocationChanges: range(pairs.filter(row => row.method === 'PublicSync' && row.timingTarget).map(row => row.savedBytes)),
    unchangedMemoryTimingChanges: range(pairs.filter(row => row.method === 'PreparedMemoryAsync').map(row => row.changePercent)),
    maximumCvPercent: Math.max(...pairs.flatMap(row => [row.beforeCvPercent, row.afterCvPercent])),
    groups: groupRows,
};
emit('raw-outcomes.json', outcomes);
emit('paired-outcomes.json', pairs);
emit('setup-correctness.json', setupReceipts);
emit('console-measurement-receipts.json', consoleReceipts);
emit('measurement-audit.json', {
    candidate: 'F092', comparisons: 3, launchOrder: executions.map(row => row.label),
    outcomes: outcomes.length, pairedOutcomes: pairs.length, resultSamples: outcomes.length * 8,
    actualConsoleWarmups: outcomes.length * 3, actualSetupReceipts: setupReceipts.length,
    sourceHashesMatchRecordedActualPdbProofs: true, originalAndSelectedActualFunctionalObservationsIdentical: 15,
    genuinePendingSynchronousReadsObservedBeforeRealProducer: 4, strictResourceAssertionIsRedGreen: true,
    existingAndNewActualTestRowsPassed: 75, allThreeNewTheoryRowsPassedOnEachOwner: true,
    actualConsoleSamplesAndStatisticsArithmeticVerified: true, actualConsoleGcTotalsAndReportedRoundingVerified: true,
    actualSourceAndSetupBytesVerified: true, onlyOwnerDllAndPdbDiffer: true,
    copiedExecutionFiles: closure.copied_files, declaredRuntimeAssets: closure.runtime_assets,
    binaryAndPdbBytesOmittedFromPublicPackage: true, publicAuditorIndependentlyRehashesOmittedBinaryOrPdbBytes: false,
    manifests, environment, summary,
    boundaries: [
        'Pending synchronous Stream.Read must continue waiting; the scanner wait itself is not an unnecessary operation.',
        'Only an already-successfully-completed memory read avoids task conversion. Pending and failed reads retain AsTask/GetResult.',
        'Prepared cases use public TestServer.SendAsync and its actual owner, plus the real captured application BodyWriter.',
        'Public cases retain real HttpClient/StreamContent.ReadOnlyStream, actual ClientHandler, full EOF/trailer copying and disposal.',
        'Prepared completion saves exactly72B/read. Public response availability, asynchronous scheduling, first-case movement and heap noise are not hidden.',
        'Three unmeasured setup failures are retained; none reached latency measurement or the resource assertion.',
    ],
});
const number = value => value.toFixed(2);
const lines = [
    '# F092 actual TestHost response read comparisons', '',
    'Positive timing changes mean slower. All three unchanged-strategy comparisons, controls, regressions and raw samples are retained.', '',
    '**Guaranteed-completed resource result:** all15 prepared target pairs remove exactly72B/op, from128B to56B (56.25%).',
    'Cached/EOF and actual memory-read allocation controls are unchanged. This does not remove a required synchronous wait or establish a production-throughput gain.', '',
    '| Method / profile | Pair | Before ns/op | After ns/op | Change % | Before / after B/op | Saved B/op | Max CV % |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
    ...pairs.map(row => `| ${row.method} / ${row.profile}${row.preparedControl ? ' (allocation control)' : ''} | ${row.round} | ${number(row.beforeNs)} | ${number(row.afterNs)} | ${number(row.changePercent)} | ${row.beforeBytes} / ${row.afterBytes} | ${row.savedBytes} | ${number(Math.max(row.beforeCvPercent, row.afterCvPercent))} |`),
    '', 'PreparedSync and PreparedMemoryAsync include the actual application ResponseBodyPipeWriter flush and the public TestServer.SendAsync response owner. PublicSync includes actual HttpClient request/response plumbing, its real runtime read-only wrapper, synchronous response read, EOF/trailer copying and disposal.', '',
    'Public reads can reach the necessary pending branch. Their observed timing/heap changes are reported independently; the prepared72B structural result is not applied to the whole request.', '',
    'All15 original/selected real-producer observations match, including four genuinely pending synchronous reads, zero-length non-consumption, EOF, abort, invalid-array validation, cancellation and disposal. The distinct zero-wrapper resource assertion is red before and green after. The26 actual original/selected tests are green/green preservation checks, not a manufactured functional red/green claim.', '',
    'Recorded actual portable-PDB/source proofs and complete copied execution hashes are preserved. Public auditing rehashes source/raw records but cannot independently rehash omitted binary/PDB bytes.', '',
];
emit('comparison.md', lines.join('\n'));
console.log(`F092:${outcomes.length} outcomes,${pairs.length} pairs,${setupReceipts.length} actual setup receipts;3/3 closed.`);
console.log(JSON.stringify(summary, null, 2));
