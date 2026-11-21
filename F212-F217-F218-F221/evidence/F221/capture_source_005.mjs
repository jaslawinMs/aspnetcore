import fs from 'node:fs';
import path from 'node:path';
import { ROOT, ORIGINAL, readJson, sha256, utc, writeBytes, writeJson, run, localBlob, helperStart, helperEnd } from './capture_common_002.mjs';

helperStart('capture_source_005');
const roles = readJson('source-roles.json');
const policyRaw = fs.readFileSync(path.join(ROOT, '..', 'policy.json'));
writeBytes(String.raw`guards\policy-source005.json`, policyRaw);
const policy = JSON.parse(policyRaw.toString());
writeJson(String.raw`guards\point-observation-source005.json`, {
    observedUtc: utc(), policySha256: sha256(policyRaw),
    registeredOwner: policy.independentFindingPreparationWorkers.F221,
    scope: policy.activeWorkerPreparationScopes.F221,
    actualWorkerBuildHoldActive: policy.actualWorkerBuildHoldActive,
    benchmarkLeaseExists: fs.existsSync(path.join(ROOT, '..', 'benchmark-exclusive.lease.json')),
    pointObservationOnly: true, sourceOnly: true,
    buildOrTestStarted: false,
});
const sources = [];
for (const gitPath of [
    'src/Components/Testing/testassets/TestApp.E2E.Tests/Tests/AsyncStateTests.cs',
    'src/Components/Testing/src/Infrastructure/ServerInstance.cs',
]) {
    sources.push(localBlob('Original', ORIGINAL, gitPath));
    sources.push(localBlob('Default', roles.default, gitPath));
}
const introduction = readJson('history-summary.json').commits[0].sha;
sources.push(localBlob('Introduction', introduction, 'src/Components/Testing/gen/ServiceOverrideAnalyzer.cs'));
writeJson('source-stage3.json', sources);

const allSources = [...readJson('source-stage1.json'), ...readJson('source-stage2.json'), ...sources];
for (const source of allSources) {
    const raw = fs.readFileSync(path.join(ROOT, source.artifact));
    if (raw.length !== source.bytes || sha256(raw) !== source.sha256) throw new Error(`Frozen source changed: ${source.artifact}`);
}
writeJson('source-manifest.json', allSources);
const originals = allSources.filter(item => item.role === 'Original');
writeJson('source-qualification-summary.json', {
    sourceRoleEqualityOnlyNotPerformanceComparison: true,
    original: roles.original, default: roles.default,
    frozenOriginalFiles: originals.length,
    originalDefaultByteEquality: originals.map(item => {
        const other = allSources.find(candidate => candidate.role === 'Default' && candidate.path === item.path);
        return { path: item.path, originalBlob: item.blob, defaultBlob: other.blob, equalBytesAndSha256: item.bytes === other.bytes && item.sha256 === other.sha256 };
    }),
    analyzerIntroducedBlob: sources.find(item => item.role === 'Introduction').blob,
    analyzerSourceUnchangedSinceIntroduction: sources.find(item => item.role === 'Introduction').blob === originals.find(item => item.path.endsWith('/ServiceOverrideAnalyzer.cs')).blob,
});
const readSource = (role, gitPath) => fs.readFileSync(path.join(ROOT, 'source', role, gitPath), 'utf8');
const analyzerTestPath = 'src/Components/Testing/test/Generators/ServiceOverrideAnalyzerTests.cs';
const generatorTestPath = 'src/Components/Testing/test/Generators/StartupHookGeneratorTests.cs';
const testMethods = gitPath => [...readSource('Original', gitPath).matchAll(/\[Fact\]\s+public (?:async )?(?:Task|void) (\w+)\(/g)].map(match => match[1]);
const normalPaths = [
    'src/Components/Testing/testassets/TestApp.E2E.Tests/Tests/AsyncStateTests.cs',
    'src/Components/Testing/testassets/TestApp.E2E.Tests/Tests/WeatherServiceOverrideTests.cs',
];
const normalCallsites = [];
for (const gitPath of normalPaths) {
    readSource('Original', gitPath).split(/\r?\n/).forEach((line, offset) => {
        const match = line.match(/^\s*options\.ConfigureServices<TestOverrides>\(nameof\(TestOverrides\.(\w+)\)\);/);
        if (match) normalCallsites.push({ path: gitPath, line: offset + 1, methodName: match[1], text: line.trim() });
    });
}
const overridesPath = 'src/Components/Testing/testassets/TestApp.E2E.Tests/ServiceOverrides/TestOverrides.cs';
const declarations = [];
readSource('Original', overridesPath).split(/\r?\n/).forEach((line, offset) => {
    const match = line.match(/^\s*public static void (\w+)\(IServiceCollection services\)/);
    if (match) declarations.push({ path: overridesPath, line: offset + 1, methodName: match[1], text: line.trim() });
});
writeJson('static-source-counts.json', {
    evidenceKind: 'Static textual inventory of frozen source, NOT executed analyzer cardinalities or runtime frequencies.',
    scope: 'Established Components.Testing TestApp.E2E.Tests normal service-override examples plus the two existing generator/analyzer test source files.',
    sourceRoles: ['Original', 'Default; source bytes identical for every cited file'],
    normalExplicitCallsiteCount: normalCallsites.length,
    normalCallsites,
    normalOverrideDeclarationCount: declarations.length,
    normalOverrideDeclarations: declarations,
    staticDeclarationsWithEachRequestedName: normalCallsites.map(item => ({
        path: item.path, line: item.line, methodName: item.methodName,
        declaredMatchingStaticMethods: declarations.filter(declaration => declaration.methodName === item.methodName).length,
        executedGetMembersCount: null, executedEligibleCandidateCount: null,
    })),
    analyzerFactCount: testMethods(analyzerTestPath).length,
    analyzerFacts: testMethods(analyzerTestPath),
    generatorFactCount: testMethods(generatorTestPath).length,
    generatorFacts: testMethods(generatorTestPath),
    executedTestCount: 0,
    limitations: [
        'The repository grep is an exact-name lexical inventory, not semantic proof of complete external consumer usage.',
        'No extrapolation to external packages, IDE reruns, large overload sets, test invocations, or compile repetitions.',
        'No compile, analyzer, generator, browser, runtime, duration, or allocation observation was performed.',
    ],
});
const anchors = {};
for (const [gitPath, terms] of [
    ['src/Components/Testing/gen/ServiceOverrideAnalyzer.cs', [
        'internal class ServiceOverrideAnalyzer', 'RegisterSyntaxNodeAction', 'GetSymbolInfo', 'Skip calls within',
        'method.IsGenericMethod', 'GetConstantValue', 'var candidates =', '.OfType<IMethodSymbol>()',
        '.Where(m =>', '.ToList();', 'candidates.Count == 0', 'DiagnosticDescriptors.MethodNotFound',
        'var targetMethod =', 'targetMethod is null', 'DiagnosticDescriptors.MethodMustBeStatic',
    ]],
    ['src/Components/Testing/gen/StartupHookGenerator.cs', [
        'IIncrementalGenerator', 'CreateSyntaxProvider', 'callsites.Collect()', 'RegisterSourceOutput',
        'static ServiceOverrideCallsite? ExtractCallsite', 'var targetMethod =', '.FirstOrDefault(m =>',
        'm.IsStatic &&', 'return new ServiceOverrideCallsite', 'context.AddSource("ServiceOverrideResolver.g.cs"',
    ]],
    [analyzerTestPath, ['public async Task', 'static async Task<Diagnostic[]>', 'WithAnalyzers', 'GetAnalyzerDiagnosticsAsync();']],
    [generatorTestPath, ['internal static GeneratorDriverRunResult', 'CSharpGeneratorDriver.Create', 'RunGenerators(compilation)',
        'internal static CSharpCompilation CreateCompilationWithInfrastructure', 'CSharpSyntaxTree.ParseText', 'CSharpCompilation.Create']],
    ['src/Components/Testing/src/Infrastructure/ServerInstance.cs', ['E2E_TEST_SERVICES_TYPE', 'E2E_TEST_SERVICES_METHOD']],
]) {
    const lines = readSource('Original', gitPath).split(/\r?\n/);
    anchors[gitPath] = terms.map(term => ({
        term, matches: lines.flatMap((line, offset) => line.includes(term) ? [{ line: offset + 1, text: line.trim() }] : []),
    }));
}
writeJson('source-line-anchors.json', anchors);
helperEnd('capture_source_005');
