import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const [root, mode] = process.argv.slice(2);
assert(root && path.isAbsolute(root) && (!mode || mode === '--verify'), 'An absolute run/capsule directory is required.');
const local = relative => path.join(root, ...relative.split(/[\\/]/));
const textAt = name => fs.readFileSync(name, 'utf8').replace(/^\uFEFF/, '');
const jsonAt = name => JSON.parse(textAt(name));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const copies = fs.existsSync(local('authoritative-copy-manifest.json')) ? jsonAt(local('authoritative-copy-manifest.json')) : null;
const runCopies = new Map((copies ?? []).filter(row => row.kind.startsWith('run'))
    .map(row => [row.original.replaceAll('/', '\\'), row]));
function file(relative)
{
    if (!copies)
    {
        return local(relative);
    }
    const row = runCopies.get(relative.replaceAll('/', '\\'));
    assert(row, `An authoritative raw artifact mapping is required:${relative}`);

    return local(row.destination);
}
const read = relative => jsonAt(file(relative));
const text = relative => textAt(file(relative));
const bytesAt = relative => fs.readFileSync(file(relative));
const hash = relative => digest(bytesAt(relative));
const equal = (actual, expected, label = 'Recorded evidence differs.') => assert.deepEqual(actual, expected, label);
const near = (actual, expected, label) => assert(Number.isFinite(actual) && Number.isFinite(expected) &&
    Math.abs(actual - expected) <= Math.max(1e-5, Math.abs(expected) * 1e-12), label);
const unique = values => assert.equal(new Set(values).size, values.length, 'Duplicate recorded identity.');
const roundEven = value =>
{
    const lower = Math.floor(value);

    return value - lower === 0.5 ? lower + lower % 2 : Math.round(value);
};
const xmlDecode = value => value.replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attributes = value => Object.fromEntries([...value.matchAll(/([\w:]+)="([^"]*)"/g)]
    .map(match => [match[1], xmlDecode(match[2])]));
const percentile = (sorted, value) =>
{
    const rank = (sorted.length - 1) * value / 100;
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);

    return sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);
};
const baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5';
const currentDefault = '0443efd5cd088ab2f82cb793f476545d85545a7c';
const harness = '1D9BA54C8A03005A70B288CB48EB161BABB73DE067B17EA030BF79438525DB9E';
const owners = {
    original: '162A0E48C0D9D80D26835CBC829C99DBA566CAE40C0E94AA8451C1D9393B009D',
    'candidate-1': '6C0406D82CE4B8567A07C2B26BAC5E55D3FE2DA17D447E33E27ACDEEBFA75B6C',
    'candidate-2': '972C6F7051E6D3EE194B93C53ACEE2B83D47C8842E2DC0465A1AD62F56B8E1E7',
    'candidate-3': '972C6F7051E6D3EE194B93C53ACEE2B83D47C8842E2DC0465A1AD62F56B8E1E7'
};
const variants = Object.keys(owners);
const sweeps = ['original', 'candidate-1', 'original-2', 'candidate-2', 'original-3', 'candidate-3'];
const shapes = {
    Empty: [129, 2, 2],
    SmallUnique: [17, 66, 2],
    SmallDuplicate: [17, 66, 66],
    WideUnique: [5, 514, 2],
    WideDuplicate: [5, 514, 514]
};
const cases = Object.keys(shapes).flatMap(shape => ['Serial', 'Concurrent']
    .map(driver => ({ shape, driver, parameters: `Workload=${shape}&Mode=${driver}` })));
const controls = {
    DifferentHttpMethods: [2, 4, 4, 2],
    DistinctBuilders: [2, 4, 4, 2],
    Conditional: [2, 4, 4, 2],
    UnknownMetadata: [2, 4, 4, 2],
    SafeNameMetadata: [2, 4, 4, 4],
    SameMapGroup: [2, 4, 4, 4],
    RequestDelegate: [2, 4, 4, 4],
    NonLiteral: [2, 4, 2, 2],
    PoolReuse: [3, 5, 5, 4],
    ExplicitHandlerCast: [2, 4, 4, 2]
};
const sourcePath = 'src\\Framework\\AspNetCoreAnalyzers\\src\\Analyzers\\RouteHandlers\\RouteHandlerAnalyzer.cs';
const sourceOriginal = 'producer-source\\' + sourcePath;
const investigation = read('current-source-investigation.json');
equal([investigation.candidate, investigation.sourceRevision, investigation.currentDefaultRevision,
    investigation.verifiedScopedSources, investigation.targetFramework, investigation.existingAnalyzerRoslynPackageVersion],
['F104', baseline, currentDefault, 20, 'netstandard2.0', '5.11.0-1.26420.103']);
const primary = read('producer-source-copies.json');
equal(primary.length, 20);
unique(primary.map(row => row.path));
for (const row of primary)
{
    const raw = bytesAt(row.rawSnapshot);
    equal([digest(raw), raw.length, row.equalityVerified, row.canonicalRemoteBytesVerified],
        [row.rawSha256, row.rawBytes, true, true]);
    const canonical = Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
    const blob = crypto.createHash('sha1').update(Buffer.from(`blob ${canonical.length}\0`)).update(canonical).digest('hex');
    equal([row.currentDefaultGitBlob, row.baselineGitBlob, row.workingGitBlob], [blob, blob, blob]);
}
const supplementalNames = ['EndpointRouteBuilderExtensions', 'RouteGroupBuilder', 'IEndpointRouteBuilder',
    'RequestDelegate', 'IActionResult', 'BindAttribute', 'RouteData', 'Resources'];
const supplemental = supplementalNames.map(name => read(`metadata-${name}-source-proof.json`));
for (const row of supplemental)
{
    const canonical = bytesAt(row.canonicalRemoteSnapshot);
    const raw = bytesAt(row.rawSnapshot);
    const blob = crypto.createHash('sha1').update(Buffer.from(`blob ${canonical.length}\0`)).update(canonical).digest('hex');
    equal([row.candidate, row.currentDefaultRevision, row.retrievalExitCode, row.canonicalRemoteBytesVerified],
        ['F104', currentDefault, 0, true]);
    equal([row.canonicalRemoteGitBlob, row.currentDefaultGitBlob, row.baselineGitBlob, row.workingGitBlob],
        [blob, blob, blob, blob]);
    equal([digest(canonical), canonical.length, digest(raw), raw.length],
        [row.canonicalRemoteSha256, row.canonicalRemoteBytes, row.rawSha256, row.rawBytes]);
    equal(Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'), 'utf8'), canonical,
        'Raw source bytes and canonical Git bytes have separate, verified roles.');
}
unique([...primary, ...supplemental].map(row => row.path));
const resourceSource = supplemental.find(row => row.path.endsWith('\\Resources.resx')).rawSnapshot;
const messageMatch = text(resourceSource).match(/<data name="Analyzer_AmbiguousRouteHandlerRoute_Message"[^>]*>\s*<value>([\s\S]*?)<\/value>/);
assert(messageMatch, 'The independently sourced original diagnostic resource is required.');
const messageFormat = xmlDecode(messageMatch[1]);
const manifests = new Map();
const closures = new Map();
const sourceSets = new Map();
for (const variant of variants)
{
    const manifest = read(`${variant}-manifest.json`);
    manifests.set(variant, manifest);
    equal([manifest.candidate, manifest.variant, manifest.baselineSourceRevision, manifest.ownerAssemblySha256,
        manifest.harnessSha256, manifest.ownerFramework, manifest.shippingRoslynDependencyUnchanged,
        manifest.measuredCompilerHost, manifest.scopedSourceIdentities, manifest.exactOriginalHarnessUsed],
    ['F104', variant, baseline, owners[variant], harness, 'netstandard2.0', '5.11.0-1.26420.103', '5.11.0-1.26420.103', 28, true]);
    equal(hash(`source-${variant}.patch`), manifest.sourcePatchSha256);
    equal(manifest.trackedSourceChanges, variant === 'original' ? [] : [' M ' + sourcePath.replaceAll('\\', '/')]);
    const closure = read(`execution-closure-${variant}.json`);
    closures.set(variant, closure);
    equal([closure.candidate, closure.variant, closure.copiedFiles, closure.declaredRuntimeAssets,
        closure.files.length, closure.runtimeAssets.length], ['F104', variant, 196, 59, 196, 59]);
    unique(closure.files.map(row => row.file));
    for (const [name, field] of [
        ['Microsoft.AspNetCore.App.Analyzers.dll', 'ownerAssemblySha256'], ['AutoPerf.Benchmarks.dll', 'harnessSha256'],
        ['AutoPerf.Benchmarks.runtimeconfig.json', 'runtimeConfigurationSha256'],
        ['AutoPerf.Benchmarks.deps.json', 'dependencyConfigurationSha256']
    ])
    {
        equal(closure.files.find(row => row.file === name)?.sha256, manifest[field]);
        if (name.endsWith('.json'))
        {
            equal(hash(`execution-image-metadata\\${variant}\\${name}`), manifest[field]);
        }
    }
    const config = read(`execution-image-metadata\\${variant}\\AutoPerf.Benchmarks.runtimeconfig.json`).runtimeOptions;
    equal([config.tfm, config.framework.version, config.rollForward,
        config.configProperties['System.GC.Server'], config.configProperties['System.GC.Concurrent']],
    ['net12.0', '12.0.0-alpha.1.26562.105', 'Disable', true, true]);
    const deps = read(`execution-image-metadata\\${variant}\\AutoPerf.Benchmarks.deps.json`);
    const declared = [...new Set(Object.values(deps.targets[deps.runtimeTarget.name]).flatMap(library => [
        ...Object.keys(library.runtime ?? {}), ...Object.keys(library.native ?? {}),
        ...Object.entries(library.runtimeTargets ?? {}).filter(([, value]) =>
            ['runtime', 'native'].includes(value.assetType)).map(([name]) => name)
    ]))].sort();
    equal(declared, closure.runtimeAssets.map(row => row.declared));
    for (const asset of closure.runtimeAssets)
    {
        equal(asset.sha256, closure.files.find(row => row.file === asset.copied)?.sha256);
    }
    const sources = read(`source-copies-${variant}.json`);
    sourceSets.set(variant, sources);
    equal(sources.length, 28);
    unique(sources.map(row => row.source));
    for (const row of sources)
    {
        equal(hash(row.copy), row.sha256);
        const original = [...primary, ...supplemental].find(item => item.path === row.source);
        assert(original, 'Every copied source must have captured current/baseline identity evidence.');
        if (variant === 'original' || row.source !== sourcePath)
        {
            equal(row.sha256, original.rawSha256);
        }
        else
        {
            const originalStatement = 'new ConcurrentDictionary<MapOperation, byte>()';
            const capacity = variant === 'candidate-1' ? 1 : 31;
            const originalText = text(sourceOriginal);
            equal(originalText.split(originalStatement).length, 2);
            equal(text(row.copy), originalText.replace(originalStatement,
                `new ConcurrentDictionary<MapOperation, byte>(concurrencyLevel: 1, capacity: ${capacity})`));
        }
    }
    const commands = read(`pdb-${variant}-commands.json`);
    equal([commands.length, commands.filter(row => row.kind === 'harness').length], [25, 5]);
    for (const command of commands)
    {
        equal(command.exitCode, 0);
        const name = command.source.split('\\').at(-1).replace(/\.cs$/, '');
        const kind = command.kind === 'harness' ? 'harness' : 'owner';
        const proof = read(`${kind}-${name}-pdb-${variant}.json`);
        const source = kind === 'harness' ? `harness\\${name}.cs`
            : sources.find(row => row.source === command.source)?.copy;
        assert(source);
        equal([proof.verified, proof.source_sha256, proof.actual_pdb_document_sha256], [true, hash(source), hash(source)]);
    }
}
for (const variant of variants.slice(1))
{
    const closure = closures.get(variant);
    const original = closures.get('original');
    equal(closure.files.map(row => row.file), original.files.map(row => row.file));
    equal(closure.files.filter(row => original.files.find(old => old.file === row.file)?.sha256 !== row.sha256)
        .map(row => row.file).sort(), ['Microsoft.AspNetCore.App.Analyzers.dll', 'Microsoft.AspNetCore.App.Analyzers.pdb'].sort());
    equal(closure.runtimeAssets.map(({ declared, copied }) => ({ declared, copied })),
        original.runtimeAssets.map(({ declared, copied }) => ({ declared, copied })));
}
equal(closures.get('candidate-2'), { ...closures.get('candidate-3'), variant: 'candidate-2' });
equal(sourceSets.get('candidate-2').map(row => row.sha256), sourceSets.get('candidate-3').map(row => row.sha256));
equal(manifests.get('candidate-2').sourcePatchSha256, manifests.get('candidate-3').sourcePatchSha256);
const pinned = read('bdn-pinned-public-source.json');
equal([hash('bdn-0.13.0-GcStats.cs'), hash('bdn-0.13.0-RunResults.cs'), pinned.revision],
    ['8784625B02B605F2ACB3581CCC43F258748C16012DB38AB9FCB2B2AFB4EA8BAB',
        '423FE522828BABB95D7C706634BE6362D515C8D6464A36384010A2F397841660',
        '6dcf438fc389d096f2797fc0815da2a85eb3a0d4']);
equal(pinned.benchmarkDotNetAssemblySha256, closures.get('original').files.find(row => row.file === 'BenchmarkDotNet.dll')?.sha256);
const budget = read('measurement-budget.json');
equal([budget.maximumSourceComparisons, budget.startedSourceComparisons, budget.completedSourceComparisons,
    budget.originalSweepsStarted, budget.originalSweepsCompleted, budget.closed], [3, 3, 3, 3, 3, true]);
for (const label of ['harness-whitespace-apply', 'harness-whitespace-verify', 'harness-build-final'])
{
    equal(read(`${label}-command.json`).exitCode, 0);
}
equal(read('harness-build-initial-command.json').exitCode, 1);
equal(read('harness-build-corrected-context-signatures-command.json').exitCode, 1);
equal(read('prototype-real-owner-command.json').exitCode, -532462766);
equal(read('prototype-complete-metadata-real-owner-command.json').exitCode, -532462766);
equal(read('prototype-mvc-prerequisites-real-owner-command.json').exitCode, -532462766);
equal(read('prototype-direct-lambda-producer-real-owner-command.json').exitCode, -532462766);
equal(read('prototype-actual-observer-context-real-owner-command.json').exitCode, 0);
for (const variant of ['candidate-1', 'candidate-2'])
{
    equal(read(`source-whitespace-${variant}-command.json`).exitCode, 0);
    equal(read(`owner-build-${variant}-command.json`).exitCode, 0);
}
const runtimeReference = read('verification\\original\\states\\runtime.json');
function runtimeAt(relative, variant)
{
    const runtime = read(`${relative}\\states\\runtime.json`);
    equal([runtime.ownerSha256, runtime.harnessSha256, runtime.architecture, runtime.serverGc,
        runtime.configuredConcurrentGc, runtime.generatedInputLanguage], [owners[variant], harness, 'X64', true, true, 'CSharp13']);
    for (const field of ['runtime', 'corelibInformationalVersion', 'corelibSha256', 'routingSha256',
        'roslynCommonSha256', 'roslynCSharpSha256', 'roslynInformationalVersion', 'ownerAssemblyReferences'])
    {
        equal(runtime[field], runtimeReference[field]);
    }
    for (const [name, field] of [['Microsoft.AspNetCore.Routing.dll', 'routingSha256'],
        ['Microsoft.CodeAnalysis.dll', 'roslynCommonSha256'], ['Microsoft.CodeAnalysis.CSharp.dll', 'roslynCSharpSha256']])
    {
        equal(runtime[field], closures.get(variant).files.find(row => row.file === name)?.sha256);
    }
    assert(Number.isInteger(runtime.processId) && runtime.processId > 0);

    return runtime;
}
const inputCache = new Map();
const canonicalInputSets = new Map();
let inputProofCount = 0;
let inputMappings = 0;
let referenceCount;
function inputAt(relative, label)
{
    const key = `${relative}\\states\\input-${label}.json`;
    if (inputCache.has(key))
    {
        return inputCache.get(key);
    }
    const proof = read(key);
    equal([proof.Label, proof.generatedInputLanguage, proof.routingMetadataSha256, proof.compilerSha256],
        [label, 'CSharp13', runtimeReference.routingSha256, runtimeReference.roslynCSharpSha256]);
    const names = proof.references.map(name => path.win32.basename(name)).sort();
    unique(names);
    assert(names.includes('Microsoft.AspNetCore.Routing.dll') && names.includes('Microsoft.AspNetCore.Mvc.Abstractions.dll') &&
        names.includes('Microsoft.AspNetCore.Http.Abstractions.dll'));
    referenceCount ??= names.length;
    equal(names.length, referenceCount);
    const documents = new Map();
    unique(proof.copies.map(row => row.file));
    equal(proof.copies.length, proof.syntaxTrees);
    for (const row of proof.copies)
    {
        const bytes = bytesAt(`${relative}\\inputs\\${label}\\${row.file}`);
        equal([digest(bytes), bytes.length], [row.sha256, row.bytes]);
        equal(Buffer.from(bytes.toString('utf8'), 'utf8'), bytes, 'Actual input must preserve its recorded UTF8 bytes.');
        documents.set(row.file, bytes.toString('utf8'));
        inputMappings++;
    }
    const identity = { files: proof.copies, references: names };
    if (canonicalInputSets.has(label))
    {
        equal(identity, canonicalInputSets.get(label), 'Identical labels must not silently change measured inputs or references.');
    }
    else
    {
        canonicalInputSets.set(label, identity);
    }
    const diagnostics = proof.expectedDiagnostics.map(row =>
    {
        equal(documents.get(row.File)?.slice(row.Start, row.Start + row.Length), `"${row.Route}"`,
            'Expected route-token span must select the real emitted literal.');

        return { Id: 'ASP0022', Severity: 'Warning', File: row.File, Start: row.Start, Length: row.Length,
            Message: messageFormat.replace('{0}', row.Route) };
    }).sort((a, b) => a.File < b.File ? -1 : a.File > b.File ? 1 : a.Start - b.Start);
    equal(diagnostics.filter(row => row.File === 'Anchor.cs').length, 2, 'Every actual workload has an ordinary positive anchor.');
    const result = { proof, diagnostics };
    inputCache.set(key, result);
    inputProofCount++;

    return result;
}
const probeResources = [];
const freshResources = [];
const concurrency = [];
for (const variant of variants)
{
    const relative = `verification\\${variant}`;
    const runtime = runtimeAt(relative, variant);
    const report = read(`${relative}\\states\\actual-analyzer-contract-resources.json`);
    equal([report.ownerSha256, report.harnessSha256, report.processId, report.observations.length,
        report.resources.length, report.freshCompilationResources.length, report.producers.length,
        report.actualEndpointMetadataAndCompletedDiagnostics, report.compilationStartPoolNotCarriedBetweenDifferentDriverRuns,
        report.nativeBrowserOrWholeBuildClaimed], [owners[variant], harness, runtime.processId, 33, 10, 10, 10, true, true, false]);
    equal(read(`verification-${variant}-command.json`).exitCode, 0);
    unique(report.observations.map(row => row.Label ?? row.label));
    for (const observation of report.observations.filter(row => row.Label))
    {
        const expected = inputAt(relative, observation.Label);
        equal(observation.diagnostics, expected.diagnostics);
        equal([observation.BoundRouteInvocations, observation.LiteralRouteInvocations],
            [expected.proof.boundRouteInvocations, expected.proof.literalRouteInvocations]);
    }
    for (const driver of ['Serial', 'Concurrent'])
    {
        for (const [control, counts] of Object.entries(controls))
        {
            const expected = inputAt(relative, `${control}-${driver}`);
            equal([expected.proof.syntaxTrees, expected.proof.boundRouteInvocations, expected.proof.literalRouteInvocations,
                expected.diagnostics.length], counts);
        }
        const generated = inputAt(relative, `SmallDuplicate-${driver}-pad0-generated`);
        equal([generated.proof.syntaxTrees, generated.proof.boundRouteInvocations, generated.diagnostics.length,
            generated.proof.GeneratedInput], [17, 66, 2, true]);
        const observation = report.observations.find(row => row.Label === generated.proof.Label);
        equal(observation.unwrappedOwnerGeneratedCodeControl, true);
    }
    const lifetimes = report.observations.filter(row => row.label);
    equal(lifetimes.length, 1);
    equal([lifetimes[0].label, lifetimes[0].concurrentlyStartedDriverRuns, lifetimes[0].sameAnalyzerInstance,
        lifetimes[0].sourcePaddingDifference], ['Same-analyzer-two-real-compilation-lifetimes', 2, true, 3]);
    equal(lifetimes[0].first, inputAt(relative, 'WideDuplicate-Concurrent-pad0-ordinary').diagnostics);
    equal(lifetimes[0].second, inputAt(relative, 'WideDuplicate-Concurrent-pad3-ordinary').diagnostics);
    for (const item of cases)
    {
        const label = `${item.shape}-${item.driver}-pad0-ordinary`;
        const expected = inputAt(relative, label);
        const [trees, routes, diagnostics] = shapes[item.shape];
        equal([expected.proof.syntaxTrees, expected.proof.boundRouteInvocations, expected.proof.literalRouteInvocations,
            expected.diagnostics.length, expected.proof.GeneratedInput], [trees, routes, routes, diagnostics, false]);
        const producer = report.producers.find(row => row.Label === label);
        assert(producer);
        equal([producer.actualCompilationStarts, producer.actualOperationBlocks, producer.actualRouteInvocationCallbacks,
            producer.EnabledConcurrentExecution, producer.configuredGeneratedCodeFlags, producer.rows.length,
            producer.realRoslynCallbacksForwardedWithoutInjection, producer.observerUsedInTimedBenchmark,
            producer.dictionaryConstructionCountOrPhysicalPoolReuseMeasured,
            producer.blockStartReadOnlyFiltersNotForwardableThroughPublicProtectedConstructor,
            producer.blockStartOwnerOnlyUsesRegistrationMethods, producer.originalOperationAndEndCallbackContextsForwardedUnchanged],
        [1, trees, routes, true, 'None', trees, true, false, false, true, true, true]);
        assert(producer.rows.every(row => row.successfulBlockEndCallbacks === 1 && !row.actualBlockStartIsGeneratedCode));
        equal(producer.rows.reduce((sum, row) => sum + row.actualRouteInvocations, 0), routes);
        equal(producer.rows.reduce((sum, row) => sum + row.invocationCallbacks, 0), producer.actualInvocationCallbacks);
        unique(producer.rows.map(row => row.owningSymbol));
        assert(producer.maximumOverlappingGlobalCallbacks >= 1 && producer.observedCallbackThreadIds.length >= 1);
        equal(producer.maximumOverlappingCallbacksWithinSingleBlock,
            Math.max(...producer.rows.map(row => row.maximumOverlappingInvocationCallbacksWithinBlock)));
        assert(producer.maximumOverlappingCallbacksWithinSingleBlock >= 1 &&
            producer.maximumOverlappingCallbacksWithinSingleBlock <= producer.maximumOverlappingGlobalCallbacks);
        if (item.driver === 'Serial')
        {
            equal(producer.maximumOverlappingGlobalCallbacks, 1);
        }
        concurrency.push({ variant, parameters: item.parameters, globalOverlap: producer.maximumOverlappingGlobalCallbacks,
            perBlockOverlap: producer.maximumOverlappingCallbacksWithinSingleBlock, perDictionaryContentionEstablished: false });
        const resource = report.resources.find(row => row.Label === label);
        assert(resource);
        equal([resource.completeDriverRuns, resource.expectedDiagnosticsPerRun, resource.checksum,
            resource.compilationStartPoolFreshPerDriver], [10, diagnostics, 10 * diagnostics, true]);
        equal(resource.allocatedBytes, resource.allocatedAfter - resource.allocatedBefore);
        near(resource.bytesPerCompleteDriverRun, resource.allocatedBytes / 10, 'Precise process-wide resource arithmetic.');
        equal(resource.enclosingActualBdnGcHelperExtraBytes, resource.enclosingActualBdnGcHelperBytes - resource.allocatedBytes);
        assert(resource.enclosingActualBdnGcHelperExtraBytes >= 0);
        equal(resource.enclosingActualBdnGcHelperBytesPerRun, roundEven(resource.enclosingActualBdnGcHelperBytes / 10));
        equal(resource.actualBdnGcHelperSha256, pinned.benchmarkDotNetAssemblySha256);
        for (const field of ['gen0Collections', 'gen1Collections', 'gen2Collections'])
        {
            assert(Number.isSafeInteger(resource[field]) && resource[field] >= 0);
        }
        probeResources.push({ variant, parameters: item.parameters, bytesPerCompleteRun: resource.bytesPerCompleteDriverRun,
            enclosingBdnExtraBytes: resource.enclosingActualBdnGcHelperExtraBytes });
        const fresh = report.freshCompilationResources.find(row => row.Label === label);
        assert(fresh);
        equal([fresh.actualFreshCompilations, fresh.actualCompletedDriverRuns, fresh.actualDiagnostics,
            fresh.beforeAnyPerCaseDriverWarmups, fresh.freshProcessOrColdMetadataJitClaimed], [1, 1, diagnostics, true, false]);
        equal(fresh.allocatedBytes, fresh.allocatedAfter - fresh.allocatedBefore);
        assert(fresh.allocatedBytes > 0 && fresh.elapsedTicks > 0 && fresh.stopwatchFrequency > 0);
        freshResources.push({ variant, parameters: item.parameters, allocatedBytes: fresh.allocatedBytes,
            elapsedTimeSpanTicks: fresh.elapsedTicks, notColdProcessOrIsolatedConstructor: true });
    }
}
const testSource = 'producer-source\\src\\Framework\\AspNetCoreAnalyzers\\test\\RouteHandlers\\DetectAmbiguousMappedRoutesTest.cs';
const className = 'Microsoft.AspNetCore.Analyzers.RouteHandlers.DetectAmbiguousMappedRoutesTest';
const facts = [...text(testSource).matchAll(/\[Fact\]\s+public async Task (\w+)\(/g)].map(match => match[1]);
const theories = [...text(testSource).matchAll(/\[Theory\]\s+((?:\[InlineData\([\s\S]*?\)\]\s+)+)public async Task (\w+)\(string method\)/g)];
const parameterRows = theories.flatMap(group => [...group[1].matchAll(/\[InlineData\(@"((?:""|[^"])*)"\)\]/g)]
    .map(match => ({ method: group[2], value: match[1].replaceAll('""', '"') })));
equal([facts.length, theories.length, parameterRows.length], [23, 2, 12]);
const expectedNames = [...facts.map(name => className + '.' + name), ...parameterRows.map(row =>
    `${className}.${row.method}(method: "${row.value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}")`)];
unique(expectedNames);
for (const variant of ['original', 'candidate-3'])
{
    const relative = `tests\\${variant}`;
    const audit = read(`${relative}\\test-audit.json`);
    equal([audit.actualControlRows, audit.passed, audit.failed, audit.skipped, audit.sourceDefinedFacts,
        audit.sourceDefinedInlineDataRows, audit.positiveDurationsAndExactDefinitionExecutionIds],
    [35, 35, 0, 0, 23, 12, true]);
    equal(read(`${relative}\\execution.json`).exitCode, 0);
    equal(hash(`${relative}\\owning-${variant}.trx`), audit.trxSha256);
    equal(audit.actualOwnerSha256, owners[variant]);
    equal(audit.actualCompilerSha256, runtimeReference.roslynCSharpSha256);
    const trx = text(`${relative}\\owning-${variant}.trx`);
    const results = [...trx.matchAll(/<UnitTestResult\s+([^>]*?)(?:\/>|>)/g)].map(match => attributes(match[1]));
    const definitions = [...trx.matchAll(/<UnitTest\s+([^>]+)>([\s\S]*?)<\/UnitTest>/g)].map(match =>
        ({ attributes: attributes(match[1]), method: attributes(match[2].match(/<TestMethod\s+([^>]+)\/>/)?.[1] ?? ''),
            execution: attributes(match[2].match(/<Execution\s+([^>]+)\/>/)?.[1] ?? '') }));
    const entries = [...trx.matchAll(/<TestEntry\s+([^>]+)\/>/g)].map(match => attributes(match[1]));
    equal([results.length, definitions.length, entries.length], [35, 35, 35]);
    unique(results.map(row => row.testId));
    equal(results.map(row => row.testName).sort(), [...expectedNames].sort());
    for (const result of results)
    {
        equal(result.outcome, 'Passed');
        const duration = result.duration.match(/^(\d+):(\d+):(\d+(?:\.\d+)?)$/);
        assert(duration && Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]) > 0);
        const definition = definitions.find(row => row.attributes.id === result.testId);
        const entry = entries.find(row => row.testId === result.testId && row.executionId === result.executionId);
        assert(definition && entry);
        equal(definition.execution.id, result.executionId);
        equal(definition.attributes.name, result.testName);
        equal(definition.method.className.split(',')[0], className);
        equal(audit.rows.find(row => row.testId === result.testId), { testName: result.testName,
            testId: result.testId, executionId: result.executionId, outcome: result.outcome, duration: result.duration });
    }
    const parameters = read(`${relative}\\parameter-row-proof.json`);
    equal([parameters.actualSourceDefinedTheories, parameters.actualVerifiedInlineDataRows,
        parameters.everyIndividualRowPassedForItsExactSourceParameter, parameters.sourceSha256], [2, 12, true, hash(testSource)]);
    for (const row of parameterRows)
    {
        const proof = parameters.rows.find(item => item.method === row.method && item.inlineData === row.value);
        assert(proof);
        const actual = results.find(item => item.testId === proof.testId);
        assert(actual);
        equal([proof.actualTestName, proof.executionId, proof.outcome, proof.duration],
            [actual.testName, actual.executionId, actual.outcome, actual.duration]);
    }
    const binary = read(`${relative}\\actual-binary-execution-proof.json`);
    equal([binary.actualLoadedOutputOwnerSha256, binary.actualTestCommonCompilerSha256,
        binary.actualTestCSharpCompilerSha256, binary.sourcePdbAssociations, binary.actualPassedControls,
        binary.sourcePdbAssociationNotMethodCoverage], [owners[variant], runtimeReference.roslynCommonSha256,
        runtimeReference.roslynCSharpSha256, 1, 35, true]);
    const proof = read(`${relative}\\DetectAmbiguousMappedRoutesTest-source-pdb.json`);
    equal([proof.verified, proof.source_sha256, proof.actual_pdb_document_sha256], [true, hash(testSource), hash(testSource)]);
    equal(read(`${relative}\\test-source-pdb-command.json`).exitCode, 0);
}
const outcomes = [];
let warmups = 0;
let resultSamples = 0;
let setupCount = 0;
let overheadCount = 0;
for (const label of sweeps)
{
    const variant = label.startsWith('original') ? 'original' : label;
    const relative = `measurements\\${label}`;
    const runtime = runtimeAt(relative, variant);
    const execution = read(`execution-${label}.json`);
    equal([execution.exitCode, execution.expectedCases, execution.expectedRetainedResultsPerCase, execution.sdk,
        execution.ownerSha256, execution.harnessSha256], [0, 10, 8, '12.0.100-alpha.1.26557.102', owners[variant], harness]);
    for (const [flag, value] of [['--warmupCount', '3'], ['--iterationCount', '8'], ['--iterationTime', '100'], ['--outliers', 'DontRemove']])
    {
        equal(execution.arguments[execution.arguments.indexOf(flag) + 1], value);
    }
    assert(execution.arguments.includes('--inProcess') && Date.parse(execution.completedAt) > Date.parse(execution.startedAt));
    const reports = fs.readdirSync(local(`${relative}\\results`)).filter(name => /-report-full.*\.json$/.test(name));
    equal(reports.length, 1);
    const report = read(`${relative}\\results\\${reports[0]}`);
    equal([report.HostEnvironmentInfo.BenchmarkDotNetVersion, report.HostEnvironmentInfo.Architecture,
        report.HostEnvironmentInfo.ProcessorName, report.HostEnvironmentInfo.PhysicalProcessorCount,
        report.HostEnvironmentInfo.PhysicalCoreCount, report.HostEnvironmentInfo.LogicalCoreCount],
    ['0.13.0', 'X64', 'Unknown processor', null, null, null]);
    equal(report.Benchmarks.length, 10);
    unique(report.Benchmarks.map(row => row.Parameters));
    const blocks = text(`${relative}\\console.log`).split(/^\/\/ Benchmark: /m).slice(1);
    equal(blocks.length, 10);
    for (const item of cases)
    {
        const benchmark = report.Benchmarks.find(row => row.Parameters === item.parameters);
        assert(benchmark && benchmark.Method === 'ActualRouteHandlerAnalyzer');
        assert(benchmark.DisplayInfo.includes('OutlierMode=DontRemove') && benchmark.DisplayInfo.includes('InProcessEmitToolchain'));
        const expected = inputAt(relative, `${item.shape}-${item.driver}-pad0-ordinary`);
        const setup = read(`${relative}\\states\\setup-${item.shape}-${item.driver}.json`);
        equal([setup.workload, setup.mode, setup.syntaxTrees, setup.BoundRouteInvocations, setup.LiteralRouteInvocations,
            setup.setupCompleteDriverRuns, setup.freshDriverAndCompilationStartPoolPerInvocation,
            setup.benchmarkReturnType, setup.ownerSha256, setup.harnessSha256, setup.processId],
        [item.shape, item.driver, ...shapes[item.shape].slice(0, 2), shapes[item.shape][1], 2, true, 'Task<int>', owners[variant], harness, runtime.processId]);
        equal(setup.firstDiagnostics, expected.diagnostics);
        equal(setup.secondDiagnostics, expected.diagnostics);
        const block = blocks.find(value => value.startsWith(benchmark.DisplayInfo));
        assert(block);
        const logged = [...block.matchAll(/^AUTOPERF_F104_SETUP (\{[^\r\n]+\})/gm)];
        equal(logged.length, 1);
        equal(JSON.parse(logged[0][1]), setup);
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
        unique(overhead.map(row => row.index));
        assert(overhead.every(row => row.operations === actual[0].operations && row.nanoseconds >= 0));
        const medianOverhead = overhead.length ? percentile(overhead.map(row => row.nanoseconds).sort((a, b) => a - b), 50) : 0;
        equal(actual.map(({ index, operations, nanoseconds }) =>
            ({ index, operations, nanoseconds: Math.max(0, nanoseconds - medianOverhead) })),
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
            near(statistics[field], value, `Raw result arithmetic:${label}/${item.parameters}/${field}`);
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
        equal(gc.length, 1);
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
        outcomes.push({ sweep: label, parameters: item.parameters, meanMs: mean / 1e6,
            medianMs: statistics.Median / 1e6, cvPercent: 100 * deviation / mean,
            bytesPerOperation: benchmark.Memory.BytesAllocatedPerOperation, rawOverheadMedianNanoseconds: medianOverhead });
        warmups += 3;
        resultSamples += 8;
        setupCount++;
        overheadCount += overhead.length;
    }
}
const pairs = [1, 2, 3].flatMap(comparison => cases.map(item =>
{
    const reference = comparison === 1 ? 'original' : `original-${comparison}`;
    const original = outcomes.find(row => row.sweep === reference && row.parameters === item.parameters);
    const candidate = outcomes.find(row => row.sweep === `candidate-${comparison}` && row.parameters === item.parameters);

    return { comparison, parameters: item.parameters, original, candidate,
        allocationReductionPercent: 100 * (1 - candidate.bytesPerOperation / original.bytesPerOperation),
        observedMeanReductionPercent: 100 * (1 - candidate.meanMs / original.meanMs), causalSpeedupEstablished: false };
}));
const repeatedFinal = pairs.filter(row => row.comparison > 1);
const resourcePairs = probeResources.filter(row => row.variant !== 'original').map(row =>
{
    const original = probeResources.find(item => item.variant === 'original' && item.parameters === row.parameters);

    return { ...row, originalBytesPerCompleteRun: original.bytesPerCompleteRun,
        reductionPercent: 100 * (1 - row.bytesPerCompleteRun / original.bytesPerCompleteRun) };
});
assert(repeatedFinal.some(row => row.allocationReductionPercent > 0) && repeatedFinal.some(row => row.allocationReductionPercent < 0));
for (const comparison of [2, 3])
{
    assert(pairs.find(row => row.comparison === comparison && row.parameters === 'Workload=SmallUnique&Mode=Concurrent')
        .allocationReductionPercent < 0, 'Retain the actual small/concurrent allocation regression in both repeated final pairs.');
}
const audit = {
    candidate: 'F104', disposition: 'no-gain',
    qualification: 'Mixed full-owner allocations and timing/control movement do not establish a sufficiently repeatable compatible overall gain. Some individual measured savings are retained;this is not proof every sizing or private redesign can never help.',
    finalEvaluatedVariant: 'candidate-3', sourceComparisons: 3, distinctSourcePolicies: 2, originalSweeps: 3,
    comparisonBudgetClosed: true, finalTwoComparisonsUseIdenticalSourceAndOwner: true,
    baselineSourceRevision: baseline, capturedCurrentDefault: currentDefault,
    measuredCandidateImagesBuiltFromBaselinePlusRecordedPatch: true,
    actualBenchmarkOutcomes: outcomes.length, actualRetainedResultSamples: resultSamples,
    actualWorkloadWarmups: warmups, actualRetainedOverheadSamples: overheadCount, actualHashPidLinkedSetups: setupCount,
    actualMedianRawTotalOverheadSubtractionVerified: true, sampleAndGcRoundingAndR7ArithmeticVerified: true,
    recordedConfidenceIntervalArithmeticVerified: true, independentlyRecomputedConfidenceCriticalValues: false,
    scopedCurrentBaselineWorkingSourceIdentities: 28, primarySourceIdentities: 20, supplementalSourceIdentities: 8,
    exactRawSourceBytesSeparateFromCanonicalGitBytes: true,
    copiedApplicationClosureFilesPerVariant: 196, declaredRuntimeAssetsPerVariant: 59,
    actualPdbSourceAssociationsPerVariant: 25, frozenVariants: 4, pdbDocumentAssociationNotMethodCoverage: true,
    actualInputProofs: inputProofCount, actualInputByteMappings: inputMappings, recordedReferenceNamesPerInput: referenceCount,
    semanticObservationsPerVariant: 33, processWideCalipersPerVariant: 10, freshCompilationRowsPerVariant: 10,
    realProducerCasesPerVariant: 10, existingOriginalOwningTestRows: 35, finalProposedOwningTestRows: 35,
    exactIndividualInlineDataRowsPerTestRun: 12, originalAndProposedTestSkips: 0,
    existingControlsNotRedGreenPerformanceTests: true,
    maximumObservedGlobalCallbackOverlap: Math.max(...concurrency.map(row => row.globalOverlap)),
    maximumObservedPerBlockCallbackOverlap: Math.max(...concurrency.map(row => row.perBlockOverlap)),
    observerNotUsedInMeasurements: true, readOnlyBlockStartFilterAdapterLimitDisclosed: true,
    physicalPoolAddressesOrDictionaryConstructionCountMeasured: false,
    actualHarnessSha256: harness, actualOwnerHashes: owners,
    finalRepeatedAllocationReductionRange: [Math.min(...repeatedFinal.map(row => row.allocationReductionPercent)),
        Math.max(...repeatedFinal.map(row => row.allocationReductionPercent))],
    maximumCvPercent: Math.max(...outcomes.map(row => row.cvPercent)),
    allPartialSavingsRegressionsAndControlMovementRetained: true, causalSpeedupEstablished: false,
    productionDistributionOrWholeBuildThroughputEstablished: false, publicAuditRehashesOmittedDllPdbRuntimePack: false,
    measuredBoundary: 'Actual RouteHandlerAnalyzer/fresh real CompilationWithAnalyzers and compilation-start pool/real in-tree endpoint HTTP MVC metadata/complete Task<int> diagnostics/warmed immutable compilation. Parsing/metadata/setup/observer excluded;managed process-wide allocation,not isolated dictionary/native/browser/full build.',
    pairs, resourcePairs, freshResources, concurrency
};
equal([outcomes.length, resultSamples, warmups, setupCount], [60, 480, 180, 60]);
equal([inputProofCount, inputMappings], [192, 3784]);
if (copies)
{
    for (const row of copies)
    {
        const bytes = fs.readFileSync(local(row.destination));
        equal([digest(bytes), bytes.length], [row.sha256, row.bytes], 'An authoritative exact copy changed.');
    }
}
if (mode === '--verify')
{
    equal(read('measurement-audit.json'), audit, 'The recorded portable audit differs.');
}
else
{
    fs.writeFileSync(local('measurement-audit.json'), JSON.stringify(audit, null, 2) + '\n');
    const lines = ['# F104 - all three actual comparisons', '',
        '**No-gain disposition.** Some partial savings are real recorded observations,but mixed full-owner regressions and variation do not justify a performance draft.',
        'Comparison1:concurrency1/capacity1. Comparisons2/3:identical concurrency1/capacity31 source/owner,each paired with a fresh exact original.', ''];
    for (const comparison of [1, 2, 3])
    {
        lines.push(`## Comparison ${comparison}`, '',
            '| Actual complete-driver case | Original mean ms | Trial mean ms | Original B/op | Trial B/op | Allocation reduction |',
            '|---|---:|---:|---:|---:|---:|');
        for (const row of pairs.filter(row => row.comparison === comparison))
        {
            lines.push(`| ${row.parameters.replace('Workload=', '').replace('&Mode=', '/')} | ${row.original.meanMs.toFixed(3)} | ${row.candidate.meanMs.toFixed(3)} | ${row.original.bytesPerOperation} | ${row.candidate.bytesPerOperation} | ${row.allocationReductionPercent.toFixed(2)}% |`);
        }
        lines.push('');
    }
    lines.push('## Independent precise process-wide warmed calipers', '',
        'Each row contains10 completed actual driver runs after3 warmups. Original is one retained independent probe,not a contemporaneous original for each candidate probe.',
        '| Trial/case | Original B/run | Trial B/run | Reduction |', '|---|---:|---:|---:|');
    for (const row of resourcePairs)
    {
        lines.push(`| ${row.variant}/${row.parameters.replace('Workload=', '').replace('&Mode=', '/')} | ${row.originalBytesPerCompleteRun.toFixed(1)} | ${row.bytesPerCompleteRun.toFixed(1)} | ${row.reductionPercent.toFixed(2)}% |`);
    }
    lines.push('', 'Positive reduction means fewer bytes;negative means more. No causal timing,whole-build or production-frequency claim.',
        'B/op follows pinned BDN MidpointRounding.ToEven. Every raw sample,GC byte/operation total,setup receipt and actual overhead row is retained.',
        'Fresh-compilation source/parse/binding/first-driver allocation/time rows are separate in measurement-audit.json;they are not cold-process or constructor-only comparisons.', '');
    fs.writeFileSync(local('comparisons.md'), lines.join('\n'));
}
console.log(`F104 portable audit:${outcomes.length} outcomes/${resultSamples} results/${warmups} warmups/${overheadCount} overhead samples/${setupCount} setups;${inputProofCount} input proofs/${inputMappings} mappings;28 source identities/25 PDB associations per image/33 observations/35 original+35 final controls. No-gain,not universal disproof or omitted-binary rehash.`);
