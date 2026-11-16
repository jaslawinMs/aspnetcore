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
        assert.equal(readFileSync(join(root, name), 'utf8'), text, `Existing audit differs: ${name}`);
    }
    else
    {
        writeFileSync(join(root, name), text);
    }
};
const profiles = [
    'TypedTrue', 'TypedFalse', 'TypedTrueNoPkce', 'TypedFalseNoPkce',
    'TrueOverridesItem', 'FalseOverridesItem', 'TypedNull', 'Absent',
    'ItemTrue', 'ItemFalse', 'ItemVerbatim', 'NullKeepsItem', 'EndpointDefault',
];
const targetProfiles = new Set(profiles.slice(0, 6));
const methods = ['PreparedOwner', 'PublicChallenge'];
const expectedCases = profiles.flatMap(profile => methods.map(method => `${method}/${profile}`)).sort();
const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const budget = read(join(root, 'measurement-budget.json'));
assert.equal(budget.closed, true);
assert.deepEqual(budget.completedComparisons, [1, 2, 3]);
assert.equal(budget.maximumComparisons, 3);
const failedPreparation = readFileSync(join(root, 'preparation-bdn-declaration-failure', 'console.log'), 'utf8');
assert(failedPreparation.includes('InvalidBenchmarkDeclarationException'));
assert(!failedPreparation.includes('WorkloadActual') && !failedPreparation.includes('WorkloadResult'));
const executions = read(join(root, 'execution.json'));
assert.deepEqual(executions.map(row => row.label),
    ['round-1-before', 'round-1-after', 'round-2-after', 'round-2-before', 'round-3-before', 'round-3-after']);
assert(executions.every(row => row.exit_code === 0));
for (const row of executions)
{
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
    for (const [kind, source] of [
        ['owner', `source-${variant}.cs`], ['harness', 'harness\\GoogleChallengeBenchmark.cs'],
    ])
    {
        const proof = read(join(root, `${kind}-pdb-${variant}.json`));
        assert.equal(proof.verified, true);
        assert.equal(proof.source_sha256, hash(join(root, source)));
        assert.equal(proof.actual_pdb_document_sha256, proof.source_sha256);
    }
}
const originalSource = readFileSync(join(root, 'source-before.cs'), 'utf8');
const selectedSource = readFileSync(join(root, 'source-after.cs'), 'utf8');
const sourceEol = originalSource.includes('\r\n') ? '\r\n' : '\n';
assert.equal(selectedSource, originalSource.replace(`using System.Globalization;${sourceEol}`, '')
    .replace('v => v?.ToString(CultureInfo.InvariantCulture).ToLowerInvariant()',
        'v => v switch\n        {\n            true => "true",\n            false => "false",\n            null => null,\n        }'.split('\n').join(sourceEol)));
for (const field of ['benchmark_assembly_sha256', 'runtime_configuration_sha256', 'dependency_configuration_sha256'])
{
    assert.equal(manifests.before[field], manifests.after[field]);
}
assert.notEqual(manifests.before.target_assembly_sha256, manifests.after.target_assembly_sha256);
const closure = read(join(root, 'execution-closure.json'));
assert.equal(closure.complete_recursive_file_sets_equal, true);
assert.equal(closure.copied_files, 127);
assert.equal(closure.runtime_assets, 49);
assert.deepEqual(closure.changed_files.sort(),
    ['Microsoft.AspNetCore.Authentication.Google.dll', 'Microsoft.AspNetCore.Authentication.Google.pdb']);
const tests = read(join(root, 'actual-test-audit.json'));
assert.equal(tests.originalPassed, 50);
assert.equal(tests.selectedPassed, 50);
assert.equal(tests.skipped, 0);
assert.equal(tests.matchingActualTestNames, true);
for (const variant of ['before', 'after'])
{
    assert.equal(tests.variants[variant].length, 50);
    assert(tests.variants[variant].every(row => row.outcome === 'Passed' && row.testName && row.methodName
        && row.className === 'Microsoft.AspNetCore.Authentication.Google.GoogleTests' && row.duration !== '00:00:00'));
}
assert.deepEqual(tests.variants.before.map(row => row.testName), tests.variants.after.map(row => row.testName));

const outcomes = [];
const pairs = [];
const setupReceipts = [];
const consoleReceipts = [];
let environment;
for (const round of [1, 2, 3])
{
    const resultsByVariant = {};
    for (const variant of ['before', 'after'])
    {
        const folder = join(root, `round-${round}-${variant}`);
        const reports = readdirSync(join(folder, 'results')).filter(file => file.includes('-full') && file.endsWith('.json'));
        assert.equal(reports.length, 1);
        const report = read(join(folder, 'results', reports[0]));
        assert.equal(report.Benchmarks.length, 26);
        const currentEnvironment = report.HostEnvironmentInfo;
        environment ??= currentEnvironment;
        assert.deepEqual(currentEnvironment, environment);
        assert.equal(environment.BenchmarkDotNetVersion, '0.13.0');
        assert.equal(environment.RuntimeVersion, '.NET 12.0.0 (12.0.26.56305)');
        assert.equal(environment.Architecture, 'X64');
        assert.equal(environment.Configuration, 'RELEASE');
        assert.equal(environment.DotNetCliVersion, '12.0.100-alpha.1.26557.102');
        assert.deepEqual(report.Benchmarks.map(item => `${item.Method}/${item.Parameters.replace('Profile=', '')}`).sort(), expectedCases);
        const text = readFileSync(join(folder, 'console.log'), 'utf8');
        const sections = text.split(/^\/\/ Benchmark:\s*/m).slice(1);
        assert.equal(sections.length, 26);
        const sectionByCase = new Map();
        for (const section of sections)
        {
            const identity = /^GoogleChallengeBenchmark\.(\w+):[^\r\n]+\[Profile=(\w+)\]/.exec(section);
            assert(identity);
            const [, method, profile] = identity;
            const key = `${method}/${profile}`;
            assert(!sectionByCase.has(key));
            assert(section.includes('GC=Concurrent Server'));
            const owner = new RegExp(`^AUTOPERF_F091_OWNER:${profile}/${method}:([A-F0-9]{64})$`, 'm').exec(section);
            assert(owner);
            assert.equal(owner[1], manifests[variant].target_assembly_sha256);
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
            assert(gc.totalAllocatedBytes > 0 && gc.totalOperations > 0);
            const receipt = { round, variant, method, profile, warmups, results, gc, ownerSha256: owner[1] };
            sectionByCase.set(key, receipt);
            consoleReceipts.push(receipt);
        }
        const states = readdirSync(join(folder, 'states')).filter(file => file.endsWith('.json'))
            .map(file => ({ file, ...read(join(folder, 'states', file)) }));
        assert.equal(states.length, 26);
        assert.deepEqual(states.map(state => `${state.method}/${state.Profile}`).sort(), expectedCases);
        for (const state of states)
        {
            assert.equal(state.ownerSha256, manifests[variant].target_assembly_sha256);
            assert(state.ownerLocation.endsWith(`\\binaries\\${variant}\\Microsoft.AspNetCore.Authentication.Google.dll`));
            assert.equal(state.realPropertiesDataFormat, true);
            assert.equal(state.persistentKeyStoreUsed, false);
            assert.equal(state.captures.length, 2);
            assert.deepEqual(state.captures[0], state.captures[1]);
            for (const capture of state.captures)
            {
                assert.equal(capture.publicChallenge, state.method === 'PublicChallenge');
                for (const flag of ['protectedStateRoundTrip', 'consumedItemRemoved', 'payloadPreserved',
                    'returnUriPreserved', 'completeQueryAndStateChecked'])
                {
                    assert.equal(capture[flag], true);
                }
                assert.equal(capture.generatedPkce, state.pkce);
                assert.equal(capture.pkceRelationChecked, state.pkce);
            }
            setupReceipts.push({ round, variant, ...state });
        }
        resultsByVariant[variant] = report.Benchmarks;
        for (const item of report.Benchmarks)
        {
            const profile = item.Parameters.replace('Profile=', '');
            const section = sectionByCase.get(`${item.Method}/${profile}`);
            assert(section);
            const results = item.Measurements.filter(row => row.IterationMode === 'Workload' && row.IterationStage === 'Result');
            assert.equal(item.Statistics.N, 8);
            assert.equal(results.length, 8);
            assert.deepEqual(results.map(row => row.IterationIndex), [1, 2, 3, 4, 5, 6, 7, 8]);
            assert(results.every(row => row.LaunchIndex === 1 && row.Operations > 0 && row.Nanoseconds > 0));
            for (const [index, row] of results.entries())
            {
                assert.equal(row.Operations, section.results[index].operations);
                assert.equal(row.Nanoseconds, section.results[index].nanoseconds);
            }
            assert(Math.abs(average(results.map(row => row.Nanoseconds / row.Operations)) - item.Statistics.Mean)
                <= 1e-9 * item.Statistics.Mean);
            assert.equal(item.Memory.Gen0Collections, section.gc.gen0);
            assert.equal(item.Memory.Gen1Collections, section.gc.gen1);
            assert.equal(item.Memory.Gen2Collections, section.gc.gen2);
            assert.equal(item.Memory.TotalOperations, section.gc.totalOperations);
            assert.equal(item.Memory.BytesAllocatedPerOperation,
                Math.round(section.gc.totalAllocatedBytes / section.gc.totalOperations));
            const matching = states.filter(state => state.method === item.Method && state.Profile === profile);
            assert.equal(matching.length, 1);
            outcomes.push({ round, variant, profile, rawGcBytesPerOperation:
                section.gc.totalAllocatedBytes / section.gc.totalOperations, ...item });
        }
    }
    for (const before of resultsByVariant.before)
    {
        const after = resultsByVariant.after.find(item => item.FullName === before.FullName);
        assert(after);
        const profile = before.Parameters.replace('Profile=', '');
        const stateBefore = setupReceipts.find(state => state.round === round && state.variant === 'before'
            && state.Profile === profile && state.method === before.Method);
        const stateAfter = setupReceipts.find(state => state.round === round && state.variant === 'after'
            && state.Profile === profile && state.method === before.Method);
        assert.deepEqual(stateBefore.captures, stateAfter.captures);
        const beforeBytes = before.Memory.BytesAllocatedPerOperation;
        const afterBytes = after.Memory.BytesAllocatedPerOperation;
        const savedBytes = beforeBytes - afterBytes;
        if (targetProfiles.has(profile))
        {
            assert(savedBytes >= 31 && savedBytes <= 33, 'Reached typed owner saves approximately one 32-byte lowercase string.');
        }
        else
        {
            assert(Math.abs(savedBytes) <= 1, 'Untouched resource control must remain within actual rounding noise.');
        }
        pairs.push({
            round, method: before.Method, profile, target: targetProfiles.has(profile),
            beforeNs: before.Statistics.Mean, afterNs: after.Statistics.Mean,
            changePercent: 100 * (after.Statistics.Mean / before.Statistics.Mean - 1),
            beforeBytes, afterBytes, savedBytes,
            allocationReductionPercent: 100 * savedBytes / beforeBytes,
            beforeCvPercent: 100 * before.Statistics.StandardDeviation / before.Statistics.Mean,
            afterCvPercent: 100 * after.Statistics.StandardDeviation / after.Statistics.Mean,
        });
    }
}
const targetPairs = pairs.filter(row => row.target);
const controls = pairs.filter(row => !row.target);
const range = values => ({ minimum: Math.min(...values), maximum: Math.max(...values) });
const summary = {
    targetChangePercent: range(targetPairs.map(row => row.changePercent)),
    controlChangePercent: range(controls.map(row => row.changePercent)),
    targetReportedSavedBytes: range(targetPairs.map(row => row.savedBytes)),
    targetAllocationReductionPercent: range(targetPairs.map(row => row.allocationReductionPercent)),
    maximumCvPercent: Math.max(...pairs.flatMap(row => [row.beforeCvPercent, row.afterCvPercent])),
    firstPreparedAbsentControl: pairs.filter(row => row.method === 'PreparedOwner' && row.profile === 'Absent'),
    targetCasesSlowerInEveryPair: expectedCases.filter(key =>
    {
        const [method, profile] = key.split('/');
        if (!targetProfiles.has(profile))
        {
            return false;
        }
        return pairs.filter(row => row.method === method && row.profile === profile).every(row => row.changePercent > 0);
    }),
};
emit('raw-outcomes.json', outcomes);
emit('paired-outcomes.json', pairs);
emit('setup-correctness.json', setupReceipts);
emit('console-measurement-receipts.json', consoleReceipts);
emit('measurement-audit.json', {
    candidate: 'F091', comparisons: 3, launchOrder: executions.map(row => row.label),
    outcomes: outcomes.length, pairedOutcomes: pairs.length,
    resultSamples: outcomes.length * 8, warmupSamples: outcomes.length * 3,
    genuineActualSetupReceipts: setupReceipts.length, actualSetupCaptures: setupReceipts.length * 2,
    allCompleteQueryAndStatePreserved: true, realPkceVerifierChallengeRelationChecked: true,
    realRegisteredPublicHandlerAndActualEphemeralState: true,
    rawConsoleResultsAndStatisticsArithmeticVerified: true, rawGcTotalsAndReportedRoundingVerified: true,
    allTypedTargetResourceChangesSupported: true, unchangedResourceControlsWithinOneByteRounding: true,
    sourceHashesMatchRecordedActualPdbProofs: true,
    completeCopiedExecutionFiles: closure.copied_files, declaredRuntimeAssets: closure.runtime_assets,
    onlyOwnerDllAndPdbDiffer: true, actualOwnerManifests: manifests, environment, summary,
    existingActualOriginalAndSelectedTestsPassed: [50, 50],
    auditIndependentlyRehashesOmittedBinaryOrPdbBytes: false,
    conclusions: [
        'One lowercase string, approximately 32 B per typed challenge, is avoided; Boolean.ToString itself reuses a literal.',
        'Full owner/request allocations fall only approximately 0.16-0.26%; null and Items controls are unchanged apart from one-byte reporting noise.',
        'No repeatable speedup is established: target regressions, phase/control movement and first-case nonstationarity are retained.',
        'The optional typed parameter is not an established every-request hot path or a production-throughput result.',
        'The declaration-conversion failure occurred before timing, is preserved, and is not an extra measured comparison.',
    ],
});
const number = value => value.toFixed(2);
const lines = [
    '# F091 actual Google challenge comparisons', '',
    'Positive timing changes mean slower. All three comparisons, regressions, unchanged controls and raw samples are retained.', '',
    '**Resource-only result:** typed true/false reaches an approximately 32 B/op reduction (reported 31-33 B/op).',
    'The complete owner/request allocation reduction is approximately 0.16-0.26%. The ToString two-allocation scan premise is false.', '',
    '**No established speedup:** target regressions and unchanged-control movement remain. PreparedOwner/Absent is nonstationary in every launch; no samples are removed or extra comparisons run.', '',
    '| Method / profile | Pair | Before ns/op | After ns/op | Change % | Before / after B/op | Saved B/op | Max CV % |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
    ...pairs.map(row => `| ${row.method} / ${row.profile}${row.target ? '' : ' (control)'} | ${row.round} | ${number(row.beforeNs)} | ${number(row.afterNs)} | ${number(row.changePercent)} | ${row.beforeBytes} / ${row.afterBytes} | ${row.savedBytes} | ${number(Math.max(row.beforeCvPercent, row.afterCvPercent))} |`),
    '', 'PreparedOwner invokes the actual protected Google owner through a thin initialized external subclass. PublicChallenge creates/disposes a real request scope and invokes the registered handler through ChallengeAsync. Both use actual ephemeral PropertiesDataFormat state protection; no remote provider or browser workflow is measured.', '',
    'Setup checks complete query/state keys, typed-over-Items precedence, verbatim Items, nullable omission, existing two-value endpoint-query repetition, item removal, return URI/payload and the real generated PKCE verifier/challenge relationship. The 50 existing Google tests pass on each owner. These are preservation checks, not a correctness red/green claim.', '',
    'Public record auditing rehashes published source and raw records, not omitted binary/PDB bytes. Recorded original-host portable-PDB/source proofs and full copied execution hashes remain available.', '',
];
emit('comparison.md', lines.join('\n'));
console.log(`F091: ${outcomes.length} actual outcomes, ${setupReceipts.length} setup receipts, 1248 results/468 warmups; 3/3 comparisons closed.`);
console.log(JSON.stringify(summary, null, 2));
