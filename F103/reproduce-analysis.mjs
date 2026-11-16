import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const [root, mode] = process.argv.slice(2);
assert(root && path.isAbsolute(root) && (!mode || mode === '--verify'),
    'An absolute actual run/capsule directory and optional --verify are required.');
const local = relative => path.join(root, ...relative.split(/[\\/]/));
const textAt = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const jsonAt = file => JSON.parse(textAt(file));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const copyManifest = fs.existsSync(local('authoritative-copy-manifest.json'))
    ? jsonAt(local('authoritative-copy-manifest.json')) : null;
const runCopies = new Map((copyManifest ?? []).filter(row => row.kind.startsWith('run'))
    .map(row => [row.original.replaceAll('/', '\\'), row]));
function file(relative)
{
    if (!copyManifest)
    {
        return local(relative);
    }
    const row = runCopies.get(relative.replaceAll('/', '\\'));
    assert(row, `Capsule lacks an authoritative recorded-file mapping:${relative}`);

    return local(row.destination);
}
const read = relative => jsonAt(file(relative));
const text = relative => textAt(file(relative));
const hash = relative => digest(fs.readFileSync(file(relative)));
const equal = (actual, expected, label = 'Recorded evidence differs.') => assert.deepEqual(actual, expected, label);
const near = (actual, expected, label) => assert(Number.isFinite(actual) && Number.isFinite(expected) &&
    Math.abs(actual - expected) <= Math.max(1e-5, Math.abs(expected) * 1e-12), label);
const unique = values => assert.equal(new Set(values).size, values.length, 'Duplicate recorded identity.');
const roundEven = value =>
{
    const floor = Math.floor(value);

    return value - floor === 0.5 ? floor + floor % 2 : Math.round(value);
};
const shapes = {
    Empty: [129, 129, 0, 1],
    LifecycleOnly: [129, 129, 0, 129],
    EventOnly: [129, 129, 128, 1],
    SmallPopulated: [33, 33, 64, 65],
    WidePartials: [5, 33, 256, 257]
};
const cases = Object.keys(shapes).flatMap(shape => ['Serial', 'Concurrent']
    .map(driver => ({ shape, driver, parameters: `Workload=${shape}&Mode=${driver}` })));
const variants = ['original', 'candidate-1', 'candidate-2', 'candidate-3'];
const sweeps = ['original', 'candidate-1', 'original-2', 'candidate-2', 'original-3', 'candidate-3'];
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const expectedHarness = '1287E9681BEEA9AC360F56AFE7A9653BED094763F4993E53A971A0E3C44848A1';
const expectedOwners = {
    original: '8F6AA9AA776BAA9F37984B85E0EA679F6770E271ECC68B9A2F27977D08EA5E30',
    'candidate-1': '3C9146F191480015C359F7F42E2D09BDE572DA21A080694C38B18FF1A7A9EE19',
    'candidate-2': '96F7DEC475E40C80AE3201DA9D81CAC7259B895B412BA3A0BA5E7F80EBA2C9B5',
    'candidate-3': '96F7DEC475E40C80AE3201DA9D81CAC7259B895B412BA3A0BA5E7F80EBA2C9B5'
};
const investigation = read('current-source-investigation.json');
equal([investigation.candidate, investigation.sourceRevision, investigation.verifiedScopedSources,
    investigation.currentDefaultRevision, investigation.targetFramework, investigation.existingAnalyzerRoslynPackageVersion],
['F103', baseline, 20, 'd7870e7ec8da214eb96f96f5512aad0d89bfef11', 'netstandard2.0', '3.3.1']);
const producerSources = read('producer-source-copies.json');
assert.equal(producerSources.length, 20);
unique(producerSources.map(row => row.path));
for (const row of producerSources)
{
    const bytes = fs.readFileSync(file(row.snapshot));
    equal([digest(bytes), bytes.length, row.equalityVerified, row.canonicalRemoteBytesVerified],
        [row.sha256, row.bytes, true, true]);
    const canonical = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
    const blob = crypto.createHash('sha1').update(Buffer.from(`blob ${canonical.length}\0`)).update(canonical).digest('hex');
    equal([row.currentDefaultGitBlob, row.baselineGitBlob, row.workingGitBlob], [blob, blob, blob]);
    equal(row.utf8BomPreserved, true, 'The canonical byte/blob checks preserve both BOM and BOM-free sources.');
}
const manifests = new Map();
const closures = new Map();
for (const variant of variants)
{
    const manifest = read(`${variant}-manifest.json`);
    manifests.set(variant, manifest);
    equal([manifest.candidate, manifest.variant, manifest.baselineSourceRevision, manifest.ownerAssemblySha256,
        manifest.harnessSha256, manifest.ownerFramework, manifest.shippingRoslynDependencyUnchanged, manifest.measuredCompilerHost],
    ['F103', variant, baseline, expectedOwners[variant], expectedHarness, 'netstandard2.0', '3.3.1', '5.11.0-1.26420.103']);
    equal(hash(`source-${variant}.patch`), manifest.sourcePatchSha256);
    equal(manifest.trackedSourceChanges, variant === 'original' ? [] :
        [' M src/Components/Analyzers/src/StateHasChangedAnalyzer.cs']);
    const closure = read(`execution-closure-${variant}.json`);
    closures.set(variant, closure);
    equal([closure.candidate, closure.variant, closure.copiedFiles, closure.declaredRuntimeAssets,
        closure.files.length, closure.runtimeAssets.length], ['F103', variant, 98, 29, 98, 29]);
    unique(closure.files.map(row => row.file));
    for (const [name, field] of [
        ['Microsoft.AspNetCore.Components.Analyzers.dll', 'ownerAssemblySha256'],
        ['AutoPerf.Benchmarks.dll', 'harnessSha256'],
        ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtimeConfigurationSha256'],
        ['AutoPerf.Benchmarks.deps.json', 'dependencyConfigurationSha256']
    ])
    {
        equal(closure.files.find(row => row.file === name)?.sha256, manifest[field]);
    }
    for (const asset of closure.runtimeAssets)
    {
        equal(asset.sha256, closure.files.find(row => row.file === asset.copied)?.sha256);
    }
    for (const [name, field] of [
        ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtimeConfigurationSha256'],
        ['AutoPerf.Benchmarks.deps.json', 'dependencyConfigurationSha256']
    ])
    {
        equal(hash(`execution-image-metadata\\${variant}\\${name}`), manifest[field]);
    }
    const config = read(`execution-image-metadata\\${variant}\\AutoPerf.Benchmarks.runtimeconfig.json`).runtimeOptions;
    equal([config.tfm, config.rollForward, config.framework.version,
        config.configProperties['System.GC.Server'], config.configProperties['System.GC.Concurrent']],
    ['net12.0', 'Disable', '12.0.0-alpha.1.26562.105', true, true]);
    const deps = read(`execution-image-metadata\\${variant}\\AutoPerf.Benchmarks.deps.json`);
    const libraries = Object.values(deps.targets[deps.runtimeTarget.name]);
    const declared = [...new Set(libraries.flatMap(library => [
        ...Object.keys(library.runtime ?? {}), ...Object.keys(library.native ?? {}),
        ...Object.entries(library.runtimeTargets ?? {}).filter(([, value]) =>
            ['runtime', 'native'].includes(value.assetType)).map(([name]) => name)
    ]))].sort();
    equal(declared, closure.runtimeAssets.map(row => row.declared));
    const sources = read(`source-copies-${variant}.json`);
    assert.equal(sources.length, 9);
    for (const source of sources)
    {
        equal(hash(source.copy), source.sha256);
        if (variant !== 'original' && !source.source.endsWith('\\StateHasChangedAnalyzer.cs'))
        {
            equal(source.sha256, read('source-copies-original.json')
                .find(original => original.source === source.source)?.sha256);
        }
    }
    const commands = read(`pdb-${variant}-commands.json`);
    assert.equal(commands.length, 13);
    equal(commands.filter(row => row.kind === 'harness').length, 5);
    for (const command of commands)
    {
        assert.equal(command.exitCode, 0);
        const name = command.source.split('\\').at(-1).replace(/\.cs$/, '');
        const proof = read(`${command.kind === 'harness' ? 'harness' : 'owner'}-${name}-pdb-${variant}.json`);
        const source = command.kind === 'harness' ? `harness\\${name}.cs`
            : sources.find(row => row.source === command.source)?.copy;
        assert(source);
        equal([proof.verified, proof.source_sha256, proof.actual_pdb_document_sha256], [true, hash(source), hash(source)]);
    }
}
const originalClosure = closures.get('original');
for (const variant of variants.slice(1))
{
    const closure = closures.get(variant);
    equal(closure.files.filter(row => originalClosure.files.find(old => old.file === row.file)?.sha256 !== row.sha256)
        .map(row => row.file).sort(), ['Microsoft.AspNetCore.Components.Analyzers.dll', 'Microsoft.AspNetCore.Components.Analyzers.pdb'].sort());
    equal(closure.runtimeAssets.map(({ declared, copied }) => ({ declared, copied })),
        originalClosure.runtimeAssets.map(({ declared, copied }) => ({ declared, copied })));
}
equal(closures.get('candidate-2'), { ...closures.get('candidate-3'), variant: 'candidate-2' });
equal(read('source-copies-candidate-2.json').map(row => row.sha256),
    read('source-copies-candidate-3.json').map(row => row.sha256));
equal(manifests.get('candidate-2').sourcePatchSha256, manifests.get('candidate-3').sourcePatchSha256);
const bdnReceipt = read('public-lazy-bdn-memory-documentation-receipt.json');
equal([hash('bdn-0.13.0-GcStats.cs'), read('bdn-gc-source-tag.json').object.sha],
    [bdnReceipt.publicSourceSha256, bdnReceipt.pinnedBdnSourceRevision]);
equal(hash('bdn-0.13.0-RunResults.cs'), read('public-bdn-runresults-receipt.json').sha256);
const compatibility = read('public-lazyinitializer-receipt.json');
equal(hash('public-lazyinitializer-documentation.html'), compatibility.sha256);
equal(read('premeasurement-unavailable-three-argument-harness-build-candidate-2-command.json').exitCode, 1);
assert(/6 Error\(s\)/.test(text('premeasurement-unavailable-three-argument-harness-build-candidate-2.log')));
assert((text('premeasurement-unavailable-three-argument-harness-build-candidate-2.log').match(/error CS1503/g) ?? []).length >= 6);
const drift = read('premeasurement-harness-drift-candidate-1.json');
equal([drift.sourceComparisonsStarted, drift.ownerIdentityPreserved, drift.harnessSources.length], [0, true, 5]);
for (const row of drift.harnessSources)
{
    equal([row.originalPdbSourceSha256, row.currentSourceSha256, row.identical],
        [hash(`harness\\${row.source}`), hash(`harness\\${row.source}`), true]);
}
assert(/4 Warning\(s\)/.test(text('harness-build-final.log')) && /0 Error\(s\)/.test(text('harness-build-final.log')));
for (const variant of variants.slice(1))
{
    equal(read(`harness-build-${variant}-command.json`).exitCode, 0);
    equal(read(`source-whitespace-${variant}-command.json`).exitCode, 0);
}
const budget = read('measurement-budget.json');
equal([budget.maximumSourceComparisons, budget.startedSourceComparisons, budget.completedSourceComparisons,
    budget.originalSweepsStarted, budget.originalSweepsCompleted, budget.closed], [3, 3, 3, 3, 3, true]);
const runtimeReference = read('verification\\original\\states\\runtime.json');
function checkRuntime(relative, variant)
{
    const runtime = read(`${relative}\\states\\runtime.json`);
    equal([runtime.ownerSha256, runtime.harnessSha256, runtime.architecture, runtime.serverGc,
        runtime.configuredConcurrentGc, runtime.generatedInputLanguage],
    [expectedOwners[variant], expectedHarness, 'X64', true, true, 'CSharp8']);
    for (const field of ['runtime', 'corelibInformationalVersion', 'corelibSha256', 'componentsSha256',
        'roslynCommonSha256', 'roslynCSharpSha256', 'roslynInformationalVersion', 'ownerAssemblyReferences'])
    {
        equal(runtime[field], runtimeReference[field]);
    }
    assert(runtime.processId > 0);

    return runtime;
}
const inputCache = new Map();
let inputProofs = 0;
let checkedInputMappings = 0;
function input(relative, label)
{
    const key = `${relative}\\states\\input-${label}.json`;
    if (inputCache.has(key))
    {
        return inputCache.get(key);
    }
    const proof = read(key);
    equal([proof.Label, proof.generatedInputLanguage, proof.componentMetadataSha256, proof.compilerSha256],
        [label, 'CSharp8', runtimeReference.componentsSha256, runtimeReference.roslynCSharpSha256]);
    assert.equal(proof.references.length, 209);
    unique(proof.copies.map(row => row.file));
    assert.equal(proof.copies.length, proof.syntaxTrees);
    const documents = new Map();
    for (const row of proof.copies)
    {
        const source = `${relative}\\inputs\\${label}\\${row.file}`;
        const bytes = fs.readFileSync(file(source));
        equal([digest(bytes), bytes.length], [row.sha256, row.bytes]);
        documents.set(row.file, bytes.toString('utf8'));
        checkedInputMappings++;
    }
    const diagnostics = proof.expectedDiagnostics.map(row =>
    {
        equal(documents.get(row.File)?.slice(row.Start, row.Start + row.Length), 'StateHasChanged()');

        return { Id: 'BL0012', Severity: 'Warning', File: row.File, Start: row.Start, Length: row.Length,
            Message: `StateHasChanged is unnecessary in method '${row.Method}' and can be removed.` };
    }).sort((a, b) => a.File < b.File ? -1 : a.File > b.File ? 1 : a.Start - b.Start);
    const result = { proof, diagnostics };
    inputCache.set(key, result);
    inputProofs++;

    return result;
}
const probeResources = [];
const callbackConcurrency = [];
for (const variant of variants)
{
    const relative = `verification\\${variant}`;
    const runtime = checkRuntime(relative, variant);
    const report = read(`${relative}\\states\\actual-analyzer-contract-resources.json`);
    equal([report.ownerSha256, report.harnessSha256, report.processId, report.observations.length,
        report.resources.length, report.producers.length, report.actualDriverDiagnosticsConsumed,
        report.inputsUseActualComponentsMetadata, report.browserRenderingOrFullBuildClaimed],
    [expectedOwners[variant], expectedHarness, runtime.processId, 17, 10, 10, true, true, false]);
    equal(read(`verification-${variant}-command.json`).exitCode, 0);
    for (const observation of report.observations.filter(row => row.Label))
    {
        const expected = input(relative, observation.Label);
        equal(observation.diagnostics, expected.diagnostics);
        equal([observation.Components, observation.BoundStateCalls],
            [expected.proof.components, expected.proof.actualBoundStateCalls]);
    }
    const lifetimes = report.observations.filter(row => row.label);
    assert.equal(lifetimes.length, 1);
    equal([lifetimes[0].label, lifetimes[0].concurrentlyStartedDriverRuns, lifetimes[0].sameAnalyzerInstance,
        lifetimes[0].inputSourcePaddingDifference], ['Same-analyzer-two-real-compilation-lifetimes', 2, true, 3]);
    equal(lifetimes[0].first, input(relative, 'WidePartials-Concurrent-pad0-ordinary').diagnostics);
    equal(lifetimes[0].second, input(relative, 'WidePartials-Concurrent-pad3-ordinary').diagnostics);
    for (const item of cases)
    {
        const label = `${item.shape}-${item.driver}-pad0-ordinary`;
        const expected = input(relative, label);
        const [components, trees, factories, diagnosticCount] = shapes[item.shape];
        equal([expected.proof.components, expected.proof.syntaxTrees, expected.proof.factoryInvocations,
            expected.proof.actualUniqueHandlerTargets, expected.proof.actualBoundStateCalls, expected.diagnostics.length],
        [components, trees, factories, factories, diagnosticCount, diagnosticCount]);
        const producer = report.producers.find(row => row.Label === label);
        assert(producer);
        equal([producer.actualQualifyingComponentRegistrations, producer.EnabledConcurrentExecution,
            producer.configuredGeneratedCodeFlags, producer.realDriverCallbacksForwardedWithoutInjection,
            producer.observerUsedInTimedBenchmark, producer.rows.length],
        [components, true, 'Analyze, ReportDiagnostics', true, false, components]);
        assert(producer.rows.every(row => row.symbolEndCallbacks === 1));
        equal(producer.rows.reduce((sum, row) => sum + row.actualFactoryInvocations, 0), factories);
        equal(producer.rows.reduce((sum, row) => sum + row.actualUniqueHandlerMethodTargets, 0), factories);
        equal(producer.rows.reduce((sum, row) => sum + row.actualBoundUnsuspendedStateCallMethods, 0), diagnosticCount);
        unique(producer.rows.map(row => row.component));
        assert(producer.maximumOverlappingObservedCallbacks >= 1 && producer.observedCallbackThreadIds.length >= 1);
        if (item.driver === 'Serial')
        {
            assert.equal(producer.maximumOverlappingObservedCallbacks, 1);
        }
        callbackConcurrency.push({ variant, parameters: item.parameters,
            maximumGlobalOverlap: producer.maximumOverlappingObservedCallbacks, perCacheContentionProven: false });
        const resource = report.resources.find(row => row.Label === label);
        assert(resource);
        equal([resource.completeDriverRuns, resource.expectedDiagnosticsPerRun, resource.checksum], [10, diagnosticCount, 10 * diagnosticCount]);
        equal(resource.allocatedBytes, resource.allocatedAfter - resource.allocatedBefore);
        near(resource.bytesPerCompleteDriverRun, resource.allocatedBytes / 10, 'Process-wide caliper arithmetic.');
        equal(resource.enclosingActualBdnGcHelperExtraBytes, resource.enclosingActualBdnGcHelperBytes - resource.allocatedBytes);
        assert(resource.enclosingActualBdnGcHelperExtraBytes >= 0);
        equal(resource.enclosingActualBdnGcHelperBytesPerRun, roundEven(resource.enclosingActualBdnGcHelperBytes / 10));
        equal(resource.actualBdnGcHelperSha256,
            closures.get(variant).files.find(row => row.file === 'BenchmarkDotNet.dll')?.sha256);
        for (const field of ['gen0Collections', 'gen1Collections', 'gen2Collections'])
        {
            assert(Number.isSafeInteger(resource[field]) && resource[field] >= 0);
        }
        probeResources.push({ variant, parameters: item.parameters, bytesPerCompleteRun: resource.bytesPerCompleteDriverRun,
            enclosingGcHelperExtraBytes: resource.enclosingActualBdnGcHelperExtraBytes });
    }
}
const decodeXml = value => value.replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const xmlAttributes = value => Object.fromEntries([...value.matchAll(/([\w:]+)="([^"]*)"/g)]
    .map(match => [match[1], decodeXml(match[2])]));
const expectedTests = [];
for (const name of ['StateHasChangedAnalyzerTest', 'StateHasChangedCodeFixProviderTest'])
{
    const source = `producer-source\\src\\Components\\Analyzers\\test\\${name}.cs`;
    for (const match of text(source).matchAll(/\[Fact\]\s+public void (\w+)\(/g))
    {
        expectedTests.push({ class: `Microsoft.AspNetCore.Components.Analyzers.Test.${name}`,
            method: match[1], source: `${name}.cs`, sourceSha256: hash(source) });
    }
}
assert.equal(expectedTests.length, 30);
for (const variant of ['original', 'candidate-3'])
{
    const relative = `tests\\${variant}`;
    const audit = read(`${relative}\\actual-test-audit-${variant}.json`);
    equal([audit.actualTests, audit.passed, audit.failed, audit.skipped, audit.actualSourceDefinedFactsVerified], [30, 30, 0, 0, true]);
    equal(hash(`${relative}\\owning-${variant}.trx`), audit.trxSha256);
    const trx = text(`${relative}\\owning-${variant}.trx`);
    const results = [...trx.matchAll(/<UnitTestResult\s+([^>]*?)(?:\/>|>)/g)].map(match => xmlAttributes(match[1]));
    const definitions = [...trx.matchAll(/<UnitTest\s+([^>]+)>([\s\S]*?)<\/UnitTest>/g)].map(match =>
        ({ attributes: xmlAttributes(match[1]), method: xmlAttributes(match[2].match(/<TestMethod\s+([^>]+)\/>/)?.[1] ?? ''),
            execution: xmlAttributes(match[2].match(/<Execution\s+([^>]+)\/>/)?.[1] ?? '') }));
    const entries = [...trx.matchAll(/<TestEntry\s+([^>]+)\/>/g)].map(match => xmlAttributes(match[1]));
    equal([results.length, definitions.length, entries.length, audit.rows.length], [30, 30, 30, 30]);
    unique(results.map(row => row.testId));
    for (const result of results)
    {
        equal(result.outcome, 'Passed');
        const duration = result.duration.match(/^(\d+):(\d+):(\d+(?:\.\d+)?)$/);
        assert(duration && Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]) > 0);
        const definition = definitions.find(row => row.attributes.id === result.testId);
        const entry = entries.find(row => row.testId === result.testId && row.executionId === result.executionId);
        assert(definition && entry);
        equal(definition.execution.id, result.executionId);
        const expected = expectedTests.find(row => row.class === definition.method.className.split(',')[0] &&
            row.method === definition.method.name);
        assert(expected);
        equal(audit.rows.find(row => row.testId === result.testId),
            { ...expected, testId: result.testId, executionId: result.executionId, duration: result.duration, outcome: 'Passed' });
    }
    const binaryProof = read(`${relative}\\actual-binary-execution-proof.json`);
    equal([binaryProof.actualLoadedOutputOwnerSha256, binaryProof.actualTestCommonCompilerSha256,
        binaryProof.actualTestCSharpCompilerSha256, binaryProof.sourcePdbAssociations],
    [expectedOwners[variant], runtimeReference.roslynCommonSha256, runtimeReference.roslynCSharpSha256, 2]);
    for (const name of ['StateHasChangedAnalyzerTest', 'StateHasChangedCodeFixProviderTest'])
    {
        const proof = read(`${relative}\\${name}-source-pdb.json`);
        const source = `producer-source\\src\\Components\\Analyzers\\test\\${name}.cs`;
        equal([proof.verified, proof.source_sha256, proof.actual_pdb_document_sha256], [true, hash(source), hash(source)]);
    }
}
const outcomeRows = [];
let warmups = 0;
let resultSamples = 0;
let setups = 0;
let overheadSamples = 0;
const percentile = (sorted, percentage) =>
{
    const rank = (sorted.length - 1) * percentage / 100;
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);

    return sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);
};
for (const label of sweeps)
{
    const variant = label.startsWith('original') ? 'original' : label;
    const relative = `measurements\\${label}`;
    const runtime = checkRuntime(relative, variant);
    const execution = read(`execution-${label}.json`);
    equal([execution.exitCode, execution.expectedCases, execution.expectedRetainedResultsPerCase, execution.sdk],
        [0, 10, 8, '12.0.100-alpha.1.26557.102']);
    const args = execution.arguments;
    for (const [flag, value] of [['--warmupCount', '3'], ['--iterationCount', '8'], ['--iterationTime', '100'], ['--outliers', 'DontRemove']])
    {
        equal(args[args.indexOf(flag) + 1], value);
    }
    assert(args.includes('--inProcess') && Date.parse(execution.completedAt) > Date.parse(execution.startedAt));
    const reports = fs.readdirSync(local(`${relative}\\results`)).filter(name => /-report-full.*\.json$/.test(name));
    assert.equal(reports.length, 1);
    const report = read(`${relative}\\results\\${reports[0]}`);
    equal([report.HostEnvironmentInfo.BenchmarkDotNetVersion, report.HostEnvironmentInfo.Architecture,
        report.HostEnvironmentInfo.ProcessorName, report.HostEnvironmentInfo.PhysicalProcessorCount,
        report.HostEnvironmentInfo.PhysicalCoreCount, report.HostEnvironmentInfo.LogicalCoreCount],
    ['0.13.0', 'X64', 'Unknown processor', null, null, null]);
    assert.equal(report.Benchmarks.length, 10);
    unique(report.Benchmarks.map(row => row.Parameters));
    const console = text(`${relative}\\console.log`);
    const blocks = console.split(/^\/\/ Benchmark: /m).slice(1);
    assert.equal(blocks.length, 10);
    for (const item of cases)
    {
        const benchmark = report.Benchmarks.find(row => row.Parameters === item.parameters);
        assert(benchmark && benchmark.Method === 'ActualStateHasChangedAnalyzer');
        assert(benchmark.DisplayInfo.includes('OutlierMode=DontRemove') && benchmark.DisplayInfo.includes('InProcessEmitToolchain'));
        const setup = read(`${relative}\\states\\setup-${item.shape}-${item.driver}.json`);
        const expected = input(relative, `${item.shape}-${item.driver}-pad0-ordinary`);
        equal([setup.workload, setup.mode, setup.setupCompleteDriverRuns, setup.freshDriverPerInvocation,
            setup.benchmarkReturnType, setup.ownerSha256, setup.harnessSha256, setup.processId],
        [item.shape, item.driver, 2, true, 'Task<int>', expectedOwners[variant], expectedHarness, runtime.processId]);
        equal(setup.firstDiagnostics, expected.diagnostics);
        equal(setup.secondDiagnostics, expected.diagnostics);
        const block = blocks.find(value => value.startsWith(benchmark.DisplayInfo));
        assert(block);
        const loggedSetup = [...block.matchAll(/^AUTOPERF_F103_SETUP (\{[^\r\n]+\})/gm)];
        assert.equal(loggedSetup.length, 1);
        equal(JSON.parse(loggedSetup[0][1]), setup);
        const raw = [...block.matchAll(/^Workload(Warmup|Actual|Result)\s+(\d+):\s+(\d+) op,\s+([\d.]+) ns,\s+([\d.]+) (ms|us|ns)\/op/gm)]
            .map(match => ({ stage: match[1], index: Number(match[2]), operations: Number(match[3]),
                nanoseconds: Number(match[4]), roundedPerOperation: Number(match[5]), unit: match[6] }));
        equal([raw.filter(row => row.stage === 'Warmup').length, raw.filter(row => row.stage === 'Actual').length,
            raw.filter(row => row.stage === 'Result').length], [3, 8, 8]);
        for (const row of raw)
        {
            const scale = { ms: 1e6, us: 1e3, ns: 1 }[row.unit];
            assert(row.operations > 0 && row.nanoseconds > 0 &&
                Math.abs(row.nanoseconds / row.operations / scale - row.roundedPerOperation) <= 0.000050001);
        }
        const actual = raw.filter(row => row.stage === 'Actual');
        const result = raw.filter(row => row.stage === 'Result');
        const overhead = [...block.matchAll(/^OverheadActual\s+(\d+):\s+(\d+) op,\s+([\d.]+) ns/gm)]
            .map(match => ({ index: Number(match[1]), operations: Number(match[2]), nanoseconds: Number(match[3]) }));
        assert([0, 20].includes(overhead.length), `Actual overhead row count differs:${label}/${item.parameters}`);
        assert(overhead.every(row => row.operations === actual[0].operations && row.nanoseconds >= 0));
        const overheadMedian = overhead.length === 0 ? 0 :
            percentile(overhead.map(row => row.nanoseconds).sort((a, b) => a - b), 50);
        equal(actual.map(({ index, operations, nanoseconds }) =>
            ({ index, operations, nanoseconds: Math.max(0, nanoseconds - overheadMedian) })),
            result.map(({ index, operations, nanoseconds }) => ({ index, operations, nanoseconds })));
        equal(benchmark.Measurements, result.map(row => ({ IterationMode: 'Workload', IterationStage: 'Result',
            LaunchIndex: 1, IterationIndex: row.index, Operations: row.operations, Nanoseconds: row.nanoseconds })));
        const samples = result.map(row => row.nanoseconds / row.operations);
        const sorted = [...samples].sort((a, b) => a - b);
        const mean = samples.reduce((sum, value) => sum + value, 0) / 8;
        const variance = samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / 7;
        const deviation = Math.sqrt(variance);
        const statistics = benchmark.Statistics;
        equal(statistics.N, 8);
        equal(statistics.OriginalValues, samples);
        for (const [field, value] of Object.entries({ Mean: mean, Min: sorted[0], Max: sorted[7], Variance: variance,
            StandardDeviation: deviation, StandardError: deviation / Math.sqrt(8), Median: percentile(sorted, 50),
            Q1: percentile(sorted, 25), Q3: percentile(sorted, 75) }))
        {
            near(statistics[field], value, `Raw sample arithmetic:${label}/${item.parameters}/${field}`);
        }
        const range = statistics.Q3 - statistics.Q1;
        near(statistics.InterquartileRange, range, 'Raw IQR arithmetic.');
        near(statistics.LowerFence, statistics.Q1 - 1.5 * range, 'Raw lower fence.');
        near(statistics.UpperFence, statistics.Q3 + 1.5 * range, 'Raw upper fence.');
        equal(statistics.LowerOutliers, sorted.filter(value => value < statistics.LowerFence));
        equal(statistics.UpperOutliers, sorted.filter(value => value > statistics.UpperFence));
        for (const [field, value] of Object.entries(statistics.Percentiles))
        {
            near(value, percentile(sorted, Number(field.slice(1))), 'Raw R7 percentile arithmetic.');
        }
        const interval = statistics.ConfidenceInterval;
        equal(interval.N, 8);
        near(interval.Mean, mean, 'Recorded confidence mean.');
        near(interval.StandardError, statistics.StandardError, 'Recorded confidence standard error.');
        near(interval.Lower, mean - interval.Margin, 'Recorded confidence lower arithmetic.');
        near(interval.Upper, mean + interval.Margin, 'Recorded confidence upper arithmetic.');
        const gc = [...block.matchAll(/^GC:\s+(\d+) (\d+) (\d+) (\d+) (\d+)/gm)];
        assert.equal(gc.length, 1);
        const [gen0, gen1, gen2, allocated, operations] = gc[0].slice(1).map(Number);
        equal([benchmark.Memory.Gen0Collections, benchmark.Memory.Gen1Collections, benchmark.Memory.Gen2Collections,
            benchmark.Memory.TotalOperations, benchmark.Memory.BytesAllocatedPerOperation],
        [gen0, gen1, gen2, operations, roundEven(allocated / operations)]);
        equal(operations, result[0].operations);
        for (const [id, value] of [['Gen0Collects', 1000 * gen0 / operations], ['Gen1Collects', 1000 * gen1 / operations],
            ['Gen2Collects', 1000 * gen2 / operations], ['Allocated Memory', roundEven(allocated / operations)]])
        {
            near(benchmark.Metrics.find(metric => metric.Descriptor.Id === id)?.Value, value, 'Raw GC/metric arithmetic.');
        }
        outcomeRows.push({ sweep: label, parameters: item.parameters, meanMs: mean / 1e6, medianMs: statistics.Median / 1e6,
            cvPercent: 100 * deviation / mean, bytesPerOperation: benchmark.Memory.BytesAllocatedPerOperation,
            rawOverheadMedianNanoseconds: overheadMedian });
        warmups += 3;
        resultSamples += 8;
        setups++;
        overheadSamples += overhead.length;
    }
}
const pairs = [];
for (const comparison of [1, 2, 3])
{
    const reference = comparison === 1 ? 'original' : `original-${comparison}`;
    for (const item of cases)
    {
        const original = outcomeRows.find(row => row.sweep === reference && row.parameters === item.parameters);
        const candidate = outcomeRows.find(row => row.sweep === `candidate-${comparison}` && row.parameters === item.parameters);
        pairs.push({ comparison, parameters: item.parameters, original, candidate,
            allocationReductionPercent: 100 * (1 - candidate.bytesPerOperation / original.bytesPerOperation),
            observedMeanReductionPercent: 100 * (1 - candidate.meanMs / original.meanMs), causalGlobalSpeedupEstablished: false });
    }
}
const finalEmptyPairs = pairs.filter(row => row.comparison > 1 && row.parameters.startsWith('Workload=Empty&'));
assert(finalEmptyPairs.every(row => row.allocationReductionPercent > 0));
const finalEmptyResources = probeResources.filter(row => ['candidate-2', 'candidate-3'].includes(row.variant) &&
    row.parameters.startsWith('Workload=Empty&')).map(row =>
{
    const original = probeResources.find(reference => reference.variant === 'original' && reference.parameters === row.parameters);
    assert(row.bytesPerCompleteRun < original.bytesPerCompleteRun);

    return { ...row, originalBytesPerCompleteRun: original.bytesPerCompleteRun,
        reductionPercent: 100 * (1 - row.bytesPerCompleteRun / original.bytesPerCompleteRun) };
});
const audit = {
    candidate: 'F103', disposition: 'qualified-allocation-draft', finalVariant: 'candidate-3',
    baselineSourceRevision: baseline, finalSourceBuiltFromBaselinePlusRecordedPatchNotLaterCommit: true,
    sourceComparisons: 3, originalSweeps: 3, comparisonBudgetClosed: true,
    actualBenchmarkOutcomes: outcomeRows.length, actualRetainedResultSamples: resultSamples, actualWorkloadWarmups: warmups,
    actualRetainedOverheadSamples: overheadSamples, actualMedianOverheadSubtractionVerified: true,
    actualHashPidLinkedSetups: setups, scopedCurrentBaselineWorkingSourceIdentities: producerSources.length,
    canonicalGitCrLfCleanFilterSeparateFromExactRawSourceByteHashes: true,
    recordedApplicationClosureFilesPerVariant: 98, recordedDeclaredRuntimeAssetsPerVariant: 29,
    actualPdbSourceAssociationsPerVariant: 13, actualFrozenVariants: variants.length,
    actualSourceInputProofs: inputProofs, actualInputByteMappingsChecked: checkedInputMappings,
    actualSemanticObservationsPerVariant: 17, actualProcessWideResourceRowsPerVariant: 10, actualRealProducerCasesPerVariant: 10,
    actualOriginalOwningControlTests: 30, actualFinalOwningControlTests: 30, testSkips: 0, testSourcePdbAssociationsPerVariant: 2,
    existingControlsAreNotRedGreenPerformanceTests: true, knownOriginalStandaloneProbeBuildWarnings: 4,
    unavailableThreeArgumentOverloadBuildErrors: 6, failedCompatibilityAndRejectedHarnessDriftRetained: true,
    finalTwoComparisonsUseIdenticalOwnerDllPdbAndSource: true, actualHarnessSha256: expectedHarness, actualOwnerHashes: expectedOwners,
    finalEmptyAllocationReductionPercentRange: [Math.min(...finalEmptyPairs.map(row => row.allocationReductionPercent)),
        Math.max(...finalEmptyPairs.map(row => row.allocationReductionPercent))],
    maximumCvPercent: Math.max(...outcomeRows.map(row => row.cvPercent)),
    allRegressionsAndControlMovementRetained: true, causalGlobalSpeedupEstablished: false,
    wholeBuildThroughputOrProductionDistributionEstablished: false, perCacheContentionEstablished: false,
    independentlyRecomputedConfidenceCriticalValues: false, sampleAndGcAndR7PercentileArithmeticVerified: true,
    publicAuditRehashesOmittedDllPdbOrEntireRuntimePack: false, recordedRuntimeReferenceNamesPerInput: 209,
    pdbDocumentAssociationNotMethodCoverage: true, measuredBoundary: 'Real Roslyn5.11 compiler driver/actual Components metadata/complete Task<int> diagnostics/process-wide managed allocations;parsing/metadata/setup/observer excluded.',
    pairs, finalEmptyResources, probeResources, callbackConcurrency
};
equal([audit.actualBenchmarkOutcomes, resultSamples, warmups, setups], [60, 480, 180, 60]);
if (copyManifest)
{
    for (const row of copyManifest)
    {
        const bytes = fs.readFileSync(local(row.destination));
        equal([digest(bytes), bytes.length], [row.sha256, row.bytes], 'Authoritative raw/session/source copy changed.');
    }
}
if (mode === '--verify')
{
    equal(read('measurement-audit.json'), audit, 'Recorded portable measurement audit changed.');
}
else
{
    fs.writeFileSync(local('measurement-audit.json'), JSON.stringify(audit, null, 2) + '\n');
    const lines = ['# F103 all three actual comparisons', '',
        'Allocation-focused qualified draft, not a causal global speedup or whole-build claim. All source comparisons and raw variation retained.',
        'Comparisons2/3 repeat identical final source/owner and each include a fresh exact-frozen-original control.', ''];
    for (const comparison of [1, 2, 3])
    {
        lines.push(`## Comparison ${comparison}${comparison === 1 ? ' - System.Lazy proposal' : ' - final four-argument LazyInitializer proposal'}`, '',
            '| Actual driver case | Original mean ms | Proposed mean ms | Original B/op | Proposed B/op | Allocation reduction |',
            '|---|---:|---:|---:|---:|---:|');
        for (const row of pairs.filter(row => row.comparison === comparison))
        {
            lines.push(`| ${row.parameters.replace('Workload=', '').replace('&Mode=', '/')} | ${row.original.meanMs.toFixed(3)} | ${row.candidate.meanMs.toFixed(3)} | ${row.original.bytesPerOperation} | ${row.candidate.bytesPerOperation} | ${row.allocationReductionPercent.toFixed(2)}% |`);
        }
        lines.push('');
    }
    lines.push('## Actual process-wide empty-input calipers', '',
        '| Final image/case | Original B/complete run | Proposed B/complete run | Reduction |',
        '|---|---:|---:|---:|');
    for (const row of finalEmptyResources)
    {
        lines.push(`| ${row.variant}/${row.parameters.replace('Workload=', '').replace('&Mode=', '/')} | ${row.originalBytesPerCompleteRun.toFixed(1)} | ${row.bytesPerCompleteRun.toFixed(1)} | ${row.reductionPercent.toFixed(2)}% |`);
    }
    lines.push('', 'B/op is rounded exactly as the pinned actual BDN GC helper; raw byte totals/operation counts and all samples remain in the console/full JSON.',
        'The caliper encloses10 actual completed driver runs after3 warmups. It includes worker threads/driver/tasks/diagnostics/metadata/cache work, not isolated dictionary bytes.',
        'Raw BDN processor name/core counts remain Unknown/null; separately recorded Environment.ProcessorCount is not substituted into that report.', '');
    fs.writeFileSync(local('comparisons.md'), lines.join('\n'));
}
console.log(`F103 portable audit:${audit.actualBenchmarkOutcomes} outcomes/${resultSamples} results/${warmups} warmups/${setups} setups;20 source identities/13 PDB associations per image/17 observations/10 producers/10 process-wide calipers/30 original+30 final controls verified. Omitted binary/runtime-pack bytes and causal speedup not claimed.`);
