import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const [directory, mode] = process.argv.slice(2);
assert(directory && ['--write', '--verify'].includes(mode), 'Explicit evidence directory and mode required.');
const read = file => fs.readFileSync(path.join(directory, file));
const json = file => JSON.parse(read(file).toString());
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const median = numbers => [...numbers].sort((a, b) => a - b)[Math.floor(numbers.length / 2)];
const close = (left, right) => assert(Math.abs(left - right) <= Math.max(1e-8, Math.abs(right) * 1e-10));
const original = json('harness-original-contracts-v2/contracts.json');
assert.equal(original.cases.length, 24);
assert(read('harness-original-contracts-v2/contracts.json').equals(read('harness-after-contracts/contracts.json')));
const before = json('before-manifest.json');
const after = json('after-manifest.json');
for (const field of ['benchmark_assembly_sha256', 'runtime_configuration_sha256', 'dependency_configuration_sha256'])
{
    assert.equal(before[field], after[field]);
}
assert.notEqual(before.target_assembly_sha256, after.target_assembly_sha256);
for (const variant of ['before', 'after'])
{
    const manifest = variant === 'before' ? before : after;
    const pdb = json(`pdb-${variant}.json`);
    assert.equal(hash(read(`source-${variant}.cs`)), manifest.target_source_sha256);
    assert.equal(pdb.verified, true);
    assert.equal(pdb.source_sha256, manifest.target_source_sha256);
    assert.equal(pdb.actual_pdb_document_sha256, manifest.target_source_sha256);
}
const execution = json('all-execution.json');
assert.equal(execution.length, 6);
assert.deepEqual(execution.map(row => `${row.round}-${row.variant}`),
    ['1-before', '1-after', '2-after', '2-before', '3-before', '3-after']);
const launches = new Map();
let sampleCount = 0;
let markerCount = 0;
let environment;
for (const row of execution)
{
    assert.equal(row.exit_code, 0);
    assert([1, 2, 3].includes(row.round));
    assert(['before', 'after'].includes(row.variant));
    const result = json(`${row.label}/results.json`);
    assert.equal(result.Benchmarks.length, 24);
    const currentEnvironment = {
        sdk: result.HostEnvironmentInfo.DotNetCliVersion,
        runtime: result.HostEnvironmentInfo.RuntimeVersion,
        benchmarkdotnet: result.HostEnvironmentInfo.BenchmarkDotNetVersion,
        architecture: result.HostEnvironmentInfo.Architecture,
    };
    environment ??= currentEnvironment;
    assert.deepEqual(currentEnvironment, environment);
    assert.equal(currentEnvironment.sdk, '12.0.100-alpha.1.26557.102');
    assert.equal(currentEnvironment.benchmarkdotnet, '0.13.0');
    const log = read(`${row.label}/console.log`).toString();
    const markers = [...log.matchAll(/AUTOPERF_OWNER_SHA256=([A-F0-9]{64})/g)].map(match => match[1]);
    assert(markers.length >= 25, 'Expected startup plus all24 setup owner markers.');
    assert(markers.every(value => value === (row.variant === 'before' ? before : after).target_assembly_sha256));
    markerCount += markers.length;
    const cases = new Map();
    for (const resultCase of result.Benchmarks)
    {
        const match = /Case: "([^"]+)"/.exec(resultCase.FullName);
        assert(match, 'Full benchmark identity, not truncated display text, required.');
        assert(!cases.has(match[1]));
        assert.equal(resultCase.Statistics.N, 8);
        assert(resultCase.Memory && resultCase.Memory.BytesAllocatedPerOperation >= 0);
        const samples = resultCase.Measurements.filter(value =>
            value.IterationMode === 'Workload' && value.IterationStage === 'Result');
        assert.equal(samples.length, 8);
        assert(samples.every(value => value.Operations > 0 && value.Nanoseconds > 0));
        const durations = samples.map(value => value.Nanoseconds / value.Operations);
        close(durations.reduce((sum, value) => sum + value, 0) / durations.length, resultCase.Statistics.Mean);
        sampleCount += durations.length;
        cases.set(match[1], resultCase);
    }
    assert.deepEqual([...cases.keys()].sort(), original.cases.map(value => value.Name).sort());
    launches.set(`${row.round}-${row.variant}`, cases);
}
const cases = original.cases.map(profile =>
{
    const fragments = Object.keys(profile.contract.fragment_frames).length;
    const length = fragments ? profile.contract.raw_fragment_characters / fragments : 0;
    assert(Number.isInteger(length));
    const prediction = fragments * Math.ceil((22 + 2 * length) / 8) * 8;
    const pairs = [1, 2, 3].map(round =>
    {
        const a = launches.get(`${round}-before`).get(profile.Name);
        const b = launches.get(`${round}-after`).get(profile.Name);
        return {
            round,
            before_ns: a.Statistics.Mean,
            after_ns: b.Statistics.Mean,
            paired_time_change_percent: 100 * (b.Statistics.Mean / a.Statistics.Mean - 1),
            before_bytes: a.Memory.BytesAllocatedPerOperation,
            after_bytes: b.Memory.BytesAllocatedPerOperation,
            saved_bytes: a.Memory.BytesAllocatedPerOperation - b.Memory.BytesAllocatedPerOperation,
            before_rsd_percent: 100 * a.Statistics.StandardDeviation / a.Statistics.Mean,
            after_rsd_percent: 100 * b.Statistics.StandardDeviation / b.Statistics.Mean,
        };
    });
    if (!fragments && !profile.Name.startsWith('Collection'))
    {
        assert(pairs.every(pair => pair.before_bytes === pair.after_bytes), 'Typed owner controls must preserve heap counts.');
    }
    if (fragments)
    {
        assert(pairs.every(pair => Math.abs(pair.saved_bytes - prediction) <= 8),
            'Measured savings must agree with removal of the raw UTF16 string within allocation-report granularity.');
    }
    return {
        name: profile.Name,
        corrected_string_allocation_prediction: prediction,
        frozen_harness_provisional_prediction: profile.contract.predicted_removed_utf16_string_bytes,
        median_paired_time_change_percent: median(pairs.map(pair => pair.paired_time_change_percent)),
        pairs,
    };
});
const closure = json('execution-closure.json');
assert.equal(closure.verified, true);
assert.equal(closure.common_copied_files, 209);
assert.equal(closure.declared_runtime_files.length, 90);
assert.deepEqual(closure.changed_files.sort(),
    ['Microsoft.AspNetCore.Components.Server.dll', 'Microsoft.AspNetCore.Components.Server.pdb']);
assert.equal(closure.extra_after_compiler_output.declared_runtime_dependency, false);
for (const file of closure.files)
{
    assert.equal(file.changed, file.before_sha256 !== file.after_sha256);
    if (file.changed)
    {
        assert(closure.changed_files.includes(file.file));
    }
}
const correctness = [];
for (const [folder, count] of [
    ['tests-before', 47], ['tests-after', 47],
    ['e2e-original-exact-utf16-v2', 15], ['e2e-after', 15],
])
{
    const receipt = json(`${folder}/command.json`);
    assert.equal(receipt.exit_code, 0);
    const results = [...read(`${folder}/results.trx`).toString().matchAll(/<UnitTestResult\b[^>]*\boutcome="([^"]+)"/g)];
    assert.equal(results.length, count);
    assert(results.every(match => match[1] === 'Passed'));
    correctness.push({ folder, passed: count, failed: 0, skipped: 0 });
}
for (const label of ['original', 'after'])
{
    const receipt = json(`browser-${label}-command.json`);
    const browser = json(`browser-${label}.json`);
    assert.equal(receipt.driver_exit, 0);
    assert.equal(receipt.document_status, 200);
    assert.equal(receipt.owner_sha256, receipt.sample_owner_sha256);
    assert.equal(browser.cases.length, 6);
    assert.equal(browser.current_page_errors.length, 0);
    assert.equal(browser.server_websocket_101, true);
    assert(browser.trusted_clicks >= 3);
}
const native = json('e2e-native-newline-isolation/native-observation.json');
assert.deepEqual(native.nativeCodes, [65, 10, 66]);
assert.deepEqual(native.propertyCodes, [65, 13, 10, 66]);
assert.equal(json('formatting.json').exit_code, 0);
const audit = {
    candidate: 'F074',
    comparison_budget_used: 3,
    comparison_budget_closed: true,
    measured_outcomes: 144,
    paired_cases: 72,
    actual_result_samples: sampleCount,
    actual_owner_markers: markerCount,
    environment,
    correctness,
    canonical_browser_states_per_variant: 6,
    exact_native_newline_transport_isolated: true,
    corrected_allocation_model: '22+2*n bytes including the UTF16 terminator, aligned to8; original frozen provisional24-byte model is retained.',
    qualified_allocation_proposal_not_merge_ready: true,
    cases,
};
assert.equal(sampleCount, 1152);
const bytes = Buffer.from(JSON.stringify(audit, null, 2) + '\n');
if (mode === '--write')
{
    fs.writeFileSync(path.join(directory, 'measurement-audit.json'), bytes);
}
else
{
    assert(read('measurement-audit.json').equals(bytes), 'Published audit must reproduce exactly from raw evidence.');
}
console.log('F074: verified144 outcomes,72 paired cases,1152 result samples, actual owners, all preservation rows and browser evidence.');
