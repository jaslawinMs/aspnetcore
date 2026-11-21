$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'SourceCapture-259.psm1') -Force
Start-OneShotStage 'capture-initial-259' $PSCommandPath
$original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$reserved = '24875ef5dabb55567870b39f6eb0002170435e2f'
$branchRun = Invoke-GuardedSourceUtility 'default-branch' gh @('api', '--method', 'GET', 'repos/dotnet/aspnetcore', '--jq', '.default_branch')
$branch = [Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($branchRun.StdoutPath)).Trim()
if ($branch -notmatch '^[A-Za-z0-9._/-]+$') { throw 'Unexpected default-branch response.' }
$commitRun = Invoke-GuardedSourceUtility 'default-commit' gh @('api', '--method', 'GET', "repos/dotnet/aspnetcore/commits/$branch", '--jq', '.sha')
$default = [Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($commitRun.StdoutPath)).Trim()
if ($default -notmatch '^[0-9a-f]{40}$') { throw 'Unexpected immutable default-commit response.' }
Write-EvidenceJson (Join-Path $PSScriptRoot 'IMMUTABLE-ROLES.json') ([ordered]@{
    originalCommit = $original
    defaultBranch = $branch
    observedDefaultCommit = $default
    resolvedAtUtc = [DateTime]::UtcNow.ToString('o')
    defaultBranchUtility = $branchRun.Directory
    defaultCommitUtility = $commitRun.Directory
    reservedExpectedHead = $reserved
    reservedCheckoutIsDefaultEvidence = $false
})
$requests = [Collections.Generic.List[object]]::new()
$requests.Add(@{ Role = 'Original'; Kind = 'commit'; Commit = $original; Path = '' })
$requests.Add(@{ Role = 'Default'; Kind = 'commit'; Commit = $default; Path = '' })
$requests.Add(@{ Role = 'ReservedExpected'; Kind = 'commit'; Commit = $reserved; Path = '' })
$requests.Add(@{ Role = 'ReservedObserved'; Kind = 'commit'; Commit = 'HEAD'; Path = '' })
$paths = @(
    'src\Identity\test\Identity.FunctionalTests\Infrastructure\ServerFactory.cs',
    'src\Identity\test\Identity.FunctionalTests\Microsoft.AspNetCore.Identity.FunctionalTests.csproj',
    'docs\CrossCuttingGuidance.md'
)
foreach ($role in @('Original', 'Default')) {
    $commit = if ($role -ceq 'Original') { $original } else { $default }
    foreach ($path in $paths) {
        $requests.Add(@{ Role = $role; Kind = 'blob'; Commit = $commit; Path = $path })
    }
}
$records = @(Capture-WholeSources 'initial-whole-sources' $requests.ToArray())
$observedHead = @($records | Where-Object { $_.role -ceq 'ReservedObserved' })[0].objectId
if ($observedHead -cne $reserved) { throw "Reserved HEAD changed: $observedHead" }
$guidance = @(
    '.github\instructions\cross-cutting-guidance.instructions.md',
    'src\Mvc\AGENTS.md'
)
$guidanceRecords = @()
foreach ($path in $guidance) {
    $source = Join-Path 'C:\src\aspnetcore' $path
    $bytes = [IO.File]::ReadAllBytes($source)
    $target = Join-Path $PSScriptRoot ('guidance\ReservedWorkingCopy\' + $path)
    [IO.Directory]::CreateDirectory((Split-Path $target -Parent)) | Out-Null
    [IO.File]::WriteAllBytes($target, $bytes)
    $guidanceRecords += [ordered]@{ role = 'ReservedWorkingCopyGuidanceOnly'; repositoryPath = $path; expectedReservedHead = $reserved; immutableBlobNotAssumed = $true; sha256 = Get-BytesSha256 $bytes; byteLength = $bytes.Length; evidencePath = $target }
}
Write-EvidenceJson (Join-Path $PSScriptRoot 'GUIDANCE-MANIFEST.json') $guidanceRecords
Write-EvidenceJson (Join-Path $PSScriptRoot 'GUIDANCE-NAVIGATION.json') ([ordered]@{
    tool = 'functions.glob'
    identityAreaPattern = '**\AGENTS.md'
    identityAreaRoot = 'C:\src\aspnetcore\src\Identity'
    observedMatches = @()
    boundary = 'Navigation-only working-copy instruction lookup, not caller-absence evidence.'
    applicableGuidanceReadBeforeResearch = @('.github\instructions\cross-cutting-guidance.instructions.md', 'src\Mvc\AGENTS.md')
})
$registration = Join-Path (Split-Path $PSScriptRoot -Parent) 'owner-registration-F229-259.json'
[IO.File]::WriteAllBytes((Join-Path $PSScriptRoot 'OWNER-REGISTRATION-OBSERVED.json'), [IO.File]::ReadAllBytes($registration))
Write-EvidenceJson (Join-Path $PSScriptRoot 'capture-initial-259.completed.json') ([ordered]@{
    completedUtc = [DateTime]::UtcNow.ToString('o')
    observer = Get-ObserverIdentity
    nativeUtilityRootsStarted = 3
    capturedWholeFilesPerRole = @{ Original = 3; Default = 3 }
    enclosingToolCompletion = 'Await actual functions.powershell return; not asserted inside helper.'
})
[ordered]@{ stage = 'capture-initial-259'; observerPid = $PID; defaultBranch = $branch; defaultCommit = $default; wholeFilesPerRole = 3; nativeRoots = 3 } | ConvertTo-Json -Compress
