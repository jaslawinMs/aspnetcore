$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'SourceCapture-259.psm1') -Force -DisableNameChecking
Start-OneShotStage 'capture-producers-259' $PSCommandPath
$roles = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'IMMUTABLE-ROLES.json')) | ConvertFrom-Json
$paths = @(
    'src\Mvc\Mvc.Razor\src\ApplicationParts\CompiledRazorAssemblyApplicationPartFactory.cs',
    'src\Mvc\Mvc.Core\src\ApplicationParts\RelatedAssemblyAttribute.cs',
    'src\Mvc\Mvc.Core\src\ApplicationParts\ApplicationPartManager.cs',
    'src\Identity\UI\src\Microsoft.AspNetCore.Identity.UI.csproj',
    'src\Mvc\Mvc.Core\src\DependencyInjection\MvcCoreServiceCollectionExtensions.cs'
)
$requests = [Collections.Generic.List[object]]::new()
foreach ($role in @('Original', 'Default')) {
    $commit = if ($role -ceq 'Original') { $roles.originalCommit } else { $roles.observedDefaultCommit }
    foreach ($path in $paths) {
        $requests.Add(@{ Role = $role; Kind = 'blob'; Commit = $commit; Path = $path })
    }
}
$captured = @(Capture-WholeSources 'producer-whole-sources' $requests.ToArray())
$discovery = @()
foreach ($role in @('Original', 'Default')) {
    $commit = if ($role -ceq 'Original') { $roles.originalCommit } else { $roles.observedDefaultCommit }
    $arguments = @('--no-pager', '-C', 'C:\src\aspnetcore', 'grep', '-n', '-F',
        '-e', 'ServerFactory<',
        '-e', 'BootstrapFrameworkVersion',
        '-e', 'RelatedAssembly',
        '-e', 'ProvideApplicationPartFactory',
        '-e', 'DefaultNetCoreTargetFramework',
        '-e', 'WithWebHostBuilder',
        '-e', 'AddDefaultUI',
        $commit, '--')
    $arguments += @(
        'src\Identity\test\Identity.FunctionalTests',
        'src\Identity\UI\src\Microsoft.AspNetCore.Identity.UI.csproj',
        'src\Identity\testassets\Identity.DefaultUI.WebSite',
        'Directory.Build.props',
        'eng\Versions.props'
    ) | ForEach-Object { $_.Replace('\', [string][char]47) }
    $result = Invoke-GuardedSourceUtility ("producer-leads-" + $role.ToLowerInvariant()) git $arguments -AcceptedExitCodes @(0, 1)
    $discovery += [ordered]@{ role = $role; commit = $commit; utility = $result.Directory; roleOfSearch = 'Exact-token leads only; no complete caller-absence inference.' }
}
$historyPath = 'src\Identity\test\Identity.FunctionalTests\Infrastructure\ServerFactory.cs'.Replace('\', [string][char]47)
$history = Invoke-GuardedSourceUtility 'serverfactory-relevant-history' git @(
    '--no-pager', '-C', 'C:\src\aspnetcore', 'log', '--follow', '-n', '4',
    '--format=fuller', '-p', '-G', 'partsToRemove|partsToAdd|RemoveParts|AddRelatedParts',
    $roles.observedDefaultCommit, '--', $historyPath
)
Write-EvidenceJson (Join-Path $PSScriptRoot 'PRODUCER-DISCOVERY.json') ([ordered]@{
    lspWorkingCopyNavigationOnly = @{
        factory = 'src\Mvc\Mvc.Razor\src\ApplicationParts\CompiledRazorAssemblyApplicationPartFactory.cs:11'
        relatedAssemblyAttribute = 'src\Mvc\Mvc.Core\src\ApplicationParts\RelatedAssemblyAttribute.cs:15'
        manager = 'src\Mvc\Mvc.Core\src\ApplicationParts\ApplicationPartManager.cs:12'
        identityUiExtensions = 'src\Identity\UI\src\IdentityBuilderUIExtensions.cs:19'
        serverFactoryReferenceResultCount = 35
        referenceBoundary = 'Working-copy LSP leads, not immutable-role completeness or absence evidence.'
    }
    immutableExactTokenSearches = $discovery
    relevantHistoryUtility = $history.Directory
    historyBoundary = 'At most four matching file-history commits reachable from observed immutable Default; not a repository-wide history census.'
})
Write-EvidenceJson (Join-Path $PSScriptRoot 'capture-producers-259.completed.json') ([ordered]@{
    completedUtc = [DateTime]::UtcNow.ToString('o')
    observer = Get-ObserverIdentity
    newNativeRoots = 4
    nativeRootsTotal = 7
    wholeFilesPerRole = 8
    enclosingToolCompletion = 'Await actual functions.powershell return; not asserted inside helper.'
})
[ordered]@{ stage = 'capture-producers-259'; observerPid = $PID; newWholeFiles = $captured.Count; wholeFilesPerRole = 8; nativeRootsTotal = 7; discoveryUtilities = $discovery; historyUtility = $history.Directory } | ConvertTo-Json -Depth 10 -Compress
