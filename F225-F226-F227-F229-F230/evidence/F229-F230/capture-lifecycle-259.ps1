$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'SourceCapture-259.psm1') -Force -DisableNameChecking
Start-OneShotStage 'capture-lifecycle-259' $PSCommandPath
$roles = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'IMMUTABLE-ROLES.json')) | ConvertFrom-Json
$paths = @(
    'src\Mvc\Mvc.Razor\src\ApplicationParts\CompiledRazorAssemblyPart.cs',
    'src\Mvc\Mvc.Core\src\DependencyInjection\MvcCoreMvcBuilderExtensions.cs',
    'src\Mvc\Mvc.Testing\src\WebApplicationFactory.cs',
    'src\Identity\test\Identity.FunctionalTests\NoIdentityAddedTests.cs'
)
$requests = [Collections.Generic.List[object]]::new()
foreach ($role in @('Original', 'Default')) {
    $commit = if ($role -ceq 'Original') { $roles.originalCommit } else { $roles.observedDefaultCommit }
    foreach ($path in $paths) {
        $requests.Add(@{ Role = $role; Kind = 'blob'; Commit = $commit; Path = $path })
    }
}
$captured = @(Capture-WholeSources 'lifecycle-whole-sources' $requests.ToArray())
$discovery = @()
foreach ($role in @('Original', 'Default')) {
    $commit = if ($role -ceq 'Original') { $roles.originalCommit } else { $roles.observedDefaultCommit }
    $arguments = @('--no-pager', '-C', 'C:\src\aspnetcore', 'grep', '-n', '-F',
        '-e', 'RelatedAssembly',
        '-e', 'Views.V4',
        '-e', 'Views.V5',
        '-e', 'ProvideApplicationPartFactory',
        '-e', 'RazorGenerate',
        '-e', 'NoIdentityStartup',
        $commit, '--')
    $arguments += @(
        'src\Identity\UI',
        'src\Identity\testassets\Identity.DefaultUI.WebSite',
        'src\Identity\Directory.Build.props',
        'src\Identity\Directory.Build.targets',
        'src\Directory.Build.props',
        'src\Directory.Build.targets'
    ) | ForEach-Object { $_.Replace('\', [string][char]47) }
    $run = Invoke-GuardedSourceUtility ("related-metadata-leads-" + $role.ToLowerInvariant()) git $arguments -AcceptedExitCodes @(0, 1)
    $discovery += [ordered]@{ role = $role; commit = $commit; utility = $run.Directory; boundary = 'Narrow exact-token metadata/startup leads only; no generated-assembly metadata or complete absence proof.' }
}
$projectPath = 'src\Identity\UI\src\Microsoft.AspNetCore.Identity.UI.csproj'.Replace('\', [string][char]47)
$history = Invoke-GuardedSourceUtility 'identity-ui-project-history' git @(
    '--no-pager', '-C', 'C:\src\aspnetcore', 'log', '--follow', '-n', '3',
    '--format=fuller', '-p', '-G', 'RelatedAssembly|AssemblyAttribute|RazorGenerate|Views.V4|Views.V5',
    $roles.observedDefaultCommit, '--', $projectPath
)
Write-EvidenceJson (Join-Path $PSScriptRoot 'RELATED-METADATA-DISCOVERY.json') ([ordered]@{
    exactTokenSearches = $discovery
    identityUiProjectHistoryUtility = $history.Directory
    observedSourceLead = 'Identity.UI current project does not itself declare the historical V4/V5 related assembly attributes. Resolve the real metadata producer before assuming two related assemblies.'
    wholeFilesPerRoleAfterCapture = 12
    remainingWholeFileSlotsPerRole = 3
    noRuntimeMetadataInspectionAuthorized = $true
})
Write-EvidenceJson (Join-Path $PSScriptRoot 'capture-lifecycle-259.completed.json') ([ordered]@{
    completedUtc = [DateTime]::UtcNow.ToString('o')
    observer = Get-ObserverIdentity
    newNativeRoots = 4
    nativeRootsTotal = 11
    wholeFilesPerRole = 12
    enclosingToolCompletion = 'Await actual functions.powershell return; not asserted inside helper.'
})
[ordered]@{ stage = 'capture-lifecycle-259'; observerPid = $PID; newWholeFiles = $captured.Count; wholeFilesPerRole = 12; nativeRootsTotal = 11; discovery = $discovery; historyUtility = $history.Directory } | ConvertTo-Json -Depth 10 -Compress
