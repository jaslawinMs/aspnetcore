$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'SourceCapture-259.psm1') -Force -DisableNameChecking
Start-OneShotStage 'capture-final-sources-259' $PSCommandPath
$roles = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'IMMUTABLE-ROLES.json')) | ConvertFrom-Json
$paths = @(
    'src\Identity\testassets\Identity.DefaultUI.WebSite\NoIdentityStartup.cs',
    'src\Identity\UI\src\IdentityBuilderUIExtensions.cs',
    'eng\Versions.props'
)
$requests = [Collections.Generic.List[object]]::new()
foreach ($role in @('Original', 'Default')) {
    $commit = if ($role -ceq 'Original') { $roles.originalCommit } else { $roles.observedDefaultCommit }
    foreach ($path in $paths) {
        $requests.Add(@{ Role = $role; Kind = 'blob'; Commit = $commit; Path = $path })
    }
}
$captured = @(Capture-WholeSources 'final-whole-sources' $requests.ToArray())
Write-EvidenceJson (Join-Path $PSScriptRoot 'capture-final-sources-259.completed.json') ([ordered]@{
    completedUtc = [DateTime]::UtcNow.ToString('o')
    observer = Get-ObserverIdentity
    newNativeRoots = 1
    nativeRootsTotal = 12
    wholeFilesPerRole = 15
    wholeFileBudgetNowClosed = $true
    furtherSourceExpansionRequiresFiniteParentApproval = $true
    enclosingToolCompletion = 'Await actual functions.powershell return; not asserted inside helper.'
})
[ordered]@{ stage = 'capture-final-sources-259'; observerPid = $PID; newWholeFiles = $captured.Count; wholeFilesPerRole = 15; nativeRootsTotal = 12; sourceExpansionClosedWithoutNewApproval = $true } | ConvertTo-Json -Compress
