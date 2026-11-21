$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'SourceCapture-259.psm1') -Force -DisableNameChecking
Start-OneShotStage 'inspect-captured-259' $PSCommandPath
$guard = Assert-FreshSourceGuard (Join-Path $PSScriptRoot 'captured-inspection-guard')
$manifest = @([IO.File]::ReadAllText((Join-Path $PSScriptRoot 'SOURCE-MANIFEST.json')) | ConvertFrom-Json)
$blobs = @($manifest | Where-Object { $_.kind -ceq 'blob' -and $_.status -ceq 'captured' })
$comparison = @()
foreach ($group in @($blobs | Group-Object repositoryPath)) {
    $original = @($group.Group | Where-Object { $_.role -ceq 'Original' })[0]
    $default = @($group.Group | Where-Object { $_.role -ceq 'Default' })[0]
    foreach ($record in @($original, $default)) {
        $actual = Get-BytesSha256 ([IO.File]::ReadAllBytes($record.evidencePath))
        if ($actual -cne $record.sha256) { throw "Captured source fingerprint changed: $($record.evidencePath)" }
    }
    $comparison += [ordered]@{
        repositoryPath = $group.Name
        originalCommit = $original.commit
        defaultCommit = $default.commit
        originalBlob = $original.objectId
        defaultBlob = $default.objectId
        originalSha256 = $original.sha256
        defaultSha256 = $default.sha256
        identicalBytes = $original.sha256 -ceq $default.sha256
    }
}
Write-EvidenceJson (Join-Path $PSScriptRoot 'ROLE-COMPARISON.json') $comparison
$needles = [ordered]@{
    'src\Identity\test\Identity.FunctionalTests\Infrastructure\ServerFactory.cs' = @('public class ServerFactory', '_connection.Open()', 'BootstrapFrameworkVersion', 'protected override void ConfigureWebHost', 'ConfigureServices(services => AddRelatedParts', 'private static void AddRelatedParts', 'GetRelatedAssemblies', 'ToDictionary', 'GetDefaultApplicationParts', 'foreach (var kvp', 'for (var i', 'partsToRemove.Any', 'manager.ApplicationParts.Remove', 'foreach (var part in partsToAdd)', 'manager.ApplicationParts.Any', 'manager.ApplicationParts.Add', '_connection.Dispose')
    'src\Mvc\Mvc.Razor\src\ApplicationParts\CompiledRazorAssemblyApplicationPartFactory.cs' = @('GetDefaultApplicationParts', 'ThrowIfNull', 'yield return new CompiledRazorAssemblyPart')
    'src\Mvc\Mvc.Razor\src\ApplicationParts\CompiledRazorAssemblyPart.cs' = @('public class CompiledRazorAssemblyPart', 'public CompiledRazorAssemblyPart', 'public override string Name')
    'src\Mvc\Mvc.Core\src\ApplicationParts\RelatedAssemblyAttribute.cs' = @('IReadOnlyList<Assembly> GetRelatedAssemblies', 'assembly.IsDynamic', 'GetCustomAttributes<RelatedAssemblyAttribute>', 'attributes.Length == 0', 'new List<Assembly>', 'AssemblyCannotReferenceSelf', 'catch when (!throwOnError)', 'relatedAssemblies.Add', 'return relatedAssemblies')
    'src\Mvc\Mvc.Core\src\ApplicationParts\ApplicationPartManager.cs' = @('precedence order', 'IList<ApplicationPart> ApplicationParts', 'PopulateDefaultParts', 'seenAssemblies.Add', 'GetApplicationPartFactory', 'ApplicationParts.Add', 'ApplicationPartAttribute', 'OrderBy', 'GetAssemblyClosure')
    'src\Mvc\Mvc.Core\src\DependencyInjection\MvcCoreServiceCollectionExtensions.cs' = @('AddMvcCore(this IServiceCollection', 'services.TryAddSingleton(partManager)', 'private static ApplicationPartManager GetApplicationPartManager', 'new ApplicationPartManager()', 'manager.PopulateDefaultParts')
    'src\Mvc\Mvc.Core\src\DependencyInjection\MvcCoreMvcBuilderExtensions.cs' = @('public static IMvcBuilder ConfigureApplicationPartManager', 'setupAction(builder.PartManager)')
    'src\Mvc\Mvc.Testing\src\WebApplicationFactory.cs' = @('private bool ServerStarted', 'internal virtual WebApplicationFactory<TEntryPoint> WithWebHostBuilderCore', '_derivedFactories.Add(factory)', 'public void StartServer()', 'if (ServerStarted)', 'private void ConfigureHostBuilder', '_configuration(webHostBuilder)', 'public HttpClient CreateDefaultClient(params', 'StartServer();', 'foreach (var factory in _derivedFactories)', 'await ((IAsyncDisposable)factory).DisposeAsync()', 'protected override IHostBuilder? CreateHostBuilder()')
    'src\Identity\test\Identity.FunctionalTests\NoIdentityAddedTests.cs' = @('IClassFixture<ServerFactory', '[Theory]', '[MemberData', 'QueryingIdentityEndpointsReturnsNotFoundWhenIdentityIsNotPresent', '.WithWebHostBuilder', '.CreateClient()', 'Assert.Equal', 'TheoryData<string> IdentityEndpoints')
    'src\Identity\testassets\Identity.DefaultUI.WebSite\NoIdentityStartup.cs' = @('public class NoIdentityStartup', 'void ConfigureServices', 'services.AddMvc()', 'void Configure(')
    'src\Identity\UI\src\IdentityBuilderUIExtensions.cs' = @('public static IdentityBuilder AddDefaultUI', 'new ConsolidatedAssemblyApplicationPartFactory()', 'apm.ApplicationParts.Add(part)', 'ViewVersionFeatureProvider')
    'src\Identity\UI\src\Microsoft.AspNetCore.Identity.UI.csproj' = @('<TargetFramework>', 'NullApplicationPartFactory', 'SetupRazorInputs', '<RazorGenerate Include=')
    'src\Identity\test\Identity.FunctionalTests\Microsoft.AspNetCore.Identity.FunctionalTests.csproj' = @('<TargetFramework>', '<TestAssetProjectReference')
    'eng\Versions.props' = @('<DefaultNetCoreTargetFramework>')
    'docs\CrossCuttingGuidance.md' = @('### Performance, allocations, caching, and pooling', 'Determine whether code runs at startup', '### Tests, determinism, and test utilities')
}
$anchors = @()
foreach ($record in $blobs) {
    $lines = [IO.File]::ReadAllLines($record.evidencePath)
    foreach ($needle in $needles[$record.repositoryPath]) {
        for ($i = 0; $i -lt $lines.Length; $i++) {
            if ($lines[$i].Contains($needle, [StringComparison]::Ordinal)) {
                $anchors += [ordered]@{ role = $record.role; commit = $record.commit; repositoryPath = $record.repositoryPath; blob = $record.objectId; needle = $needle; line = $i + 1; text = $lines[$i] }
            }
        }
    }
}
Write-EvidenceJson (Join-Path $PSScriptRoot 'SOURCE-ANCHORS.json') $anchors
$testPath = 'src\Identity\test\Identity.FunctionalTests\NoIdentityAddedTests.cs'
$testRecord = @($blobs | Where-Object { $_.role -ceq 'Default' -and $_.repositoryPath -ceq $testPath })[0]
$testText = [IO.File]::ReadAllText($testRecord.evidencePath)
$endpointRows = @([regex]::Matches($testText, '^\s*"/Identity/[^"]+",?\s*$', [Text.RegularExpressions.RegexOptions]::Multiline) | ForEach-Object { $_.Value.Trim() })
Write-EvidenceJson (Join-Path $PSScriptRoot 'SOURCE-CARDINALITIES.json') ([ordered]@{
    compiledRazorFactoryYieldStatements = 1
    perSuccessfulFactoryEnumerationPartCount = 1
    producedExactPartType = 'Microsoft.AspNetCore.Mvc.ApplicationParts.CompiledRazorAssemblyPart'
    enumeratorConcreteRuntimeTypeName = 'Compiler-generated iterator; runtime-generated name not inspected or asserted.'
    relatedAssemblyCount = $null
    relatedAssemblyCountBoundary = 'Loaded RelatedAssemblyAttribute metadata not observed; source project no longer names separate V4/V5 view outputs. Do not infer two from the framework-name dictionary or claim zero from token absence.'
    managerApplicationPartsCount = $null
    managerCountBoundary = 'Depends on real entry-assembly ApplicationPartAttribute metadata, related assemblies, part factories, and startup registrations. No generated closure or loaded collection observed.'
    observedTheory = 'QueryingIdentityEndpointsReturnsNotFoundWhenIdentityIsNotPresent'
    sourceMemberDataRows = $endpointRows.Count
    sourceRows = $endpointRows
    fixtureScope = 'IClassFixture<ServerFactory<NoIdentityStartup, IdentityDbContext>>'
    sourceChildFactoryStartsPerSuccessfulTheoryCase = 1
    plannedSourceCaseStartsForThisOneTheory = $endpointRows.Count
    executedCaseStarts = 0
    testOrStartupCountsAcrossOtherClasses = 'Not established; exact-token/LSP matches are navigation only.'
})
$receipts = @(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'utilities') -Filter 'receipt.json' -Recurse -File | Sort-Object FullName | ForEach-Object { [IO.File]::ReadAllText($_.FullName) | ConvertFrom-Json })
$summary = [ordered]@{
    directNativeRootCount = $receipts.Count
    rootPids = @($receipts | ForEach-Object { $_.rootPid })
    observerPids = @($receipts | ForEach-Object { $_.observer.pid } | Sort-Object -Unique)
    allReceiptsExitZero = @($receipts | Where-Object { $_.exitCode -ne 0 }).Count -eq 0
    allRootsExitedObserved = @($receipts | Where-Object { -not $_.rootHasExitedObserved }).Count -eq 0
    bothStreamsCompletedEveryRoot = @($receipts | Where-Object { -not $_.stdoutCopyTaskCompleted -or -not $_.stderrCopyTaskCompleted }).Count -eq 0
    observedChildren = @($receipts | ForEach-Object { $_.observedChildren })
    failures = @(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'utilities') -Filter 'failure.json' -Recurse -File | ForEach-Object { $_.FullName })
    independentManagedInspectionObserver = Get-ObserverIdentity
    nativeRootsStartedByThisInspection = 0
}
Write-EvidenceJson (Join-Path $PSScriptRoot 'PROCESS-SUMMARY-PRESEAL.json') $summary
Write-EvidenceJson (Join-Path $PSScriptRoot 'inspect-captured-259.completed.json') ([ordered]@{ completedUtc = [DateTime]::UtcNow.ToString('o'); observer = Get-ObserverIdentity; newNativeRoots = 0; enclosingToolCompletion = 'Await actual functions.powershell return; not asserted inside helper.' })
[ordered]@{
    stage = 'inspect-captured-259'
    observerPid = $PID
    comparedPaths = $comparison.Count
    differingPaths = @($comparison | Where-Object { -not $_.identicalBytes } | ForEach-Object { $_.repositoryPath })
    sourceTheoryRows = $endpointRows.Count
    processSummary = $summary
} | ConvertTo-Json -Depth 20 -Compress
