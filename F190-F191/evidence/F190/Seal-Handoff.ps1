$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location $PSScriptRoot
[Environment]::CurrentDirectory = (Get-Location).ProviderPath
$repo = 'C:\src\aspnetcore'
$receipts = [Collections.Generic.List[object]]::new()

function Read-FinalSource([string] $Name, [string] $Tool, [string[]] $Argv)
{
    $info = [Diagnostics.ProcessStartInfo]::new()
    $info.FileName = (Get-Command $Tool -CommandType Application).Source
    $info.WorkingDirectory = $repo
    $info.UseShellExecute = $false
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.Environment['GIT_OPTIONAL_LOCKS'] = '0'
    $info.Environment['GH_PAGER'] = ''
    $info.Environment['GH_PROMPT_DISABLED'] = '1'
    foreach ($arg in $Argv)
    {
        $info.ArgumentList.Add($arg)
    }
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $info
    $started = [DateTime]::UtcNow.ToString('o')
    try
    {
        if (-not $process.Start())
        {
            throw "Could not start final source observation $Name"
        }
        $rootPid = $process.Id
        $outTask = $process.StandardOutput.ReadToEndAsync()
        $errTask = $process.StandardError.ReadToEndAsync()
        $process.WaitForExit()
        $stdout = $outTask.GetAwaiter().GetResult()
        $stderr = $errTask.GetAwaiter().GetResult()
        $exitCode = $process.ExitCode
    }
    finally
    {
        $process.Dispose()
    }
    $outPath = ".\commands\final-$Name.stdout"
    $errPath = ".\commands\final-$Name.stderr"
    if ((Test-Path -LiteralPath $outPath) -or (Test-Path -LiteralPath $errPath))
    {
        throw 'Final observations already exist; do not overwrite a prior handoff.'
    }
    [IO.File]::WriteAllText($outPath, $stdout)
    [IO.File]::WriteAllText($errPath, $stderr)
    $receipts.Add([ordered]@{
        executable = $info.FileName
        argv = $Argv
        workingDirectory = $repo
        classification = 'read-only final source/worktree observation'
        rootPid = $rootPid
        startedUtc = $started
        completedUtc = [DateTime]::UtcNow.ToString('o')
        exitCode = $exitCode
        rootTerminal = $true
        stdoutTerminal = $outTask.IsCompleted
        stderrTerminal = $errTask.IsCompleted
        stdout = $outPath
        stderr = $errPath
    })
    $receipts | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath '.\final-command-receipts.json' -Encoding utf8
    if ($exitCode -ne 0)
    {
        throw "Final source observation failed ($exitCode); exact streams retained: $Name"
    }
    return $stdout
}

$status = Read-FinalSource 'reserved-status' 'git' @('--no-optional-locks', 'status', '--porcelain=v1', '--branch', '--untracked-files=normal')
$head = (Read-FinalSource 'reserved-head' 'git' @('--no-optional-locks', 'rev-parse', 'HEAD')).Trim()
$branch = (Read-FinalSource 'reserved-branch' 'git' @('--no-optional-locks', 'symbolic-ref', '--quiet', 'HEAD')).Trim()
$targetDiff = Read-FinalSource 'reserved-target-diff' 'git' @('--no-optional-locks', '--no-pager', 'diff', '--binary', 'HEAD', '--', 'src\ProjectTemplates\Shared\AspNetProcess.cs', 'src\ProjectTemplates\Shared\PageUrls.cs', 'src\ProjectTemplates\Shared\Project.cs', 'src\ProjectTemplates\test\Templates.Mvc.Tests')
$repoMetadata = Read-FinalSource 'upstream-repository' 'gh' @('api', 'repos/dotnet/aspnetcore', '--jq', '{full_name,default_branch,fork,pushed_at}')
$upstreamRepo = $repoMetadata | ConvertFrom-Json
$defaultRef = Read-FinalSource 'actual-default-ref' 'gh' @('api', "repos/dotnet/aspnetcore/git/ref/heads/$($upstreamRepo.default_branch)")
$upstreamRef = $defaultRef | ConvertFrom-Json
$beforeStatus = [IO.File]::ReadAllText('.\commands\reserved-status-before.stdout')
$reservedUnchanged = $head -eq '24875ef5dabb55567870b39f6eb0002170435e2f' -and $branch -eq 'refs/heads/autoperf/F145-hoist-large-response-utf8-encoding' -and $status -ceq $beforeStatus -and $targetDiff.Length -eq 0
if (-not $reservedUnchanged)
{
    throw 'Reserved worktree observations changed; do not claim an unchanged handoff.'
}
if ($upstreamRepo.default_branch -ne 'main' -or $upstreamRef.object.sha -ne 'd3483989953ae3cccd773aea5ea04cb0c7198531')
{
    throw 'Actual upstream default changed; the existing source qualification is not a fresh default handoff.'
}

$policyBytes = [IO.File]::ReadAllBytes('..\policy.json')
[IO.File]::WriteAllBytes('.\policy-final-observed.json', $policyBytes)
$policy = [Text.Encoding]::UTF8.GetString($policyBytes) | ConvertFrom-Json
$owner = $policy.independentFindingPreparationWorkers.F190
$ownerCount = @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count
if ($owner -ne '0f21ad7f-ffb1-4ca5-9ee5-54f1e0543725' -or $ownerCount -gt 4 -or $policy.maximumRegisteredPreparationOwners -ne 4)
{
    throw 'Final owner registration or cap no longer matches.'
}
$audit = Get-Content -Raw '.\source-audit-results.json' | ConvertFrom-Json
$auditReceipt = Get-Content -Raw '.\source-audit-command-receipt.json' | ConvertFrom-Json
if ($audit.passed -ne 67 -or $audit.failed -ne 0 -or $auditReceipt.exitCode -ne 0)
{
    throw 'Source qualification audit did not pass.'
}
[IO.File]::WriteAllBytes('.\candidate.diff', [byte[]]::new(0))
$diffHash = (Get-FileHash '.\candidate.diff' -Algorithm SHA256).Hash
[ordered]@{
    candidateRetained = $false
    candidateGraph = $null
    shippingFilesChanged = @()
    exactDiff = 'candidate.diff'
    bytes = 0
    sha256 = $diffHash
    meaning = 'Exact empty candidate diff. No private implementation graph was necessary or created.'
    sourceRoleComparison = 'commands\projecttemplates-default-diff.stdout'
    sourceRoleComparisonBytes = (Get-Item '.\commands\projecttemplates-default-diff.stdout').Length
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath '.\diff-index.json' -Encoding utf8

$sourceReceipts = @(Get-Content -Raw '.\source-command-receipts.json' | ConvertFrom-Json)
$linqReceipts = @(Get-Content -Raw '.\linq-command-receipts.json' | ConvertFrom-Json)
$relatedReceipts = @(Get-Content -Raw '.\related-command-receipts.json' | ConvertFrom-Json)
$allSourceReceipts = @($sourceReceipts) + @($linqReceipts) + @($relatedReceipts) + @($auditReceipt) + @($receipts)
$terminal = @($allSourceReceipts | Where-Object { -not $_.rootTerminal -or -not $_.stdoutTerminal -or -not $_.stderrTerminal }).Count -eq 0
if (-not $terminal)
{
    throw 'A recorded source tool root or stream is not terminal.'
}
$final = [ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    reservedWorktree = [ordered]@{
        path = $repo
        head = $head
        branch = $branch
        statusIdenticalToInitialCapturedStatus = $status -ceq $beforeStatus
        status = $status
        relevantUncommittedDiffBytes = $targetDiff.Length
        unchanged = $reservedUnchanged
        gitOptionalLocksDisabled = $true
        writesByThisOwner = 0
    }
    actualDefaultBranch = $upstreamRepo.default_branch
    actualDefaultCommit = $upstreamRef.object.sha
    exactPolicy = 'policy-final-observed.json'
    registeredOwner = $owner
    registeredOwners = $ownerCount
    maximumRegisteredOwners = $policy.maximumRegisteredPreparationOwners
    scope = $policy.activeWorkerPreparationScopes.F190
    actualWorkerBuildHoldActive = $policy.actualWorkerBuildHoldActive
    buildAndTestWorkQuiesced = $policy.buildAndTestWorkQuiesced
    benchmarkLeasePresent = Test-Path -LiteralPath '..\benchmark-exclusive.lease.json'
    gateInterpretation = 'Observation only. No F190 native work was started, including before or after this final observation. No global process/quiescence claim is made for other owners.'
    nativeBuildTestRuntimeStarts = 0
    nativeOwnedRoots = @()
    nativeObservedChildren = @()
    nativeStdoutStreams = @()
    nativeStderrStreams = @()
    allOwnedNativeWorkTerminal = $true
    comparisons = 0
    sourceReadRootsCaptured = $sourceReceipts.Count + $linqReceipts.Count + $relatedReceipts.Count + $receipts.Count
    successfulSourceAuditRoots = 1
    recordedSourceRootsAndBothStreamsTerminal = $terminal
    sourceReadChildrenBoundary = 'No universal descendant census for Git/GitHub source tools; each recorded root and both streams were awaited. No native build/test/application roots were launched.'
}
$final | ConvertTo-Json -Depth 9 | Set-Content -LiteralPath '.\final-observations.json' -Encoding utf8

$handoff = Get-Content -Raw '.\assessment.json' | ConvertFrom-Json
$handoff | Add-Member -NotePropertyName schemaVersion -NotePropertyValue 1
$handoff | Add-Member -NotePropertyName completedUtc -NotePropertyValue ([DateTime]::UtcNow.ToString('o'))
$handoff | Add-Member -NotePropertyName outputRoot -NotePropertyValue $PSScriptRoot
$handoff | Add-Member -NotePropertyName finalObservations -NotePropertyValue $final
$handoff | Add-Member -NotePropertyName hashIndex -NotePropertyValue 'HASHES.json'
$handoff | Add-Member -NotePropertyName hashIndexChecksum -NotePropertyValue 'HASHES.sha256'
$handoff | ConvertTo-Json -Depth 18 | Set-Content -LiteralPath '.\HANDOFF.json' -Encoding utf8

$excluded = @('HASHES.json', 'HASHES.sha256')
$entries = @(
    foreach ($file in (Get-ChildItem -LiteralPath $PSScriptRoot -File -Recurse | Sort-Object FullName))
    {
        $relative = [IO.Path]::GetRelativePath($PSScriptRoot, $file.FullName)
        if ($relative -notin $excluded)
        {
            [ordered]@{
                path = $relative
                bytes = $file.Length
                sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
            }
        }
    }
)
[ordered]@{
    schemaVersion = 1
    finding = 'F190'
    scope = 207
    algorithm = 'SHA256'
    root = $PSScriptRoot
    excludedSelfIndexFiles = $excluded
    entryCount = $entries.Count
    entries = $entries
} | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath '.\HASHES.json' -Encoding utf8
$indexHash = (Get-FileHash '.\HASHES.json' -Algorithm SHA256).Hash
[IO.File]::WriteAllText('.\HASHES.sha256', "$indexHash  HASHES.json`n")
foreach ($entry in $entries)
{
    $file = Get-Item -LiteralPath $entry.path
    if ($file.Length -ne $entry.bytes -or (Get-FileHash -LiteralPath $entry.path -Algorithm SHA256).Hash -ne $entry.sha256)
    {
        throw "Final artifact integrity mismatch: $($entry.path)"
    }
}
[pscustomobject]@{
    disposition = $handoff.disposition
    handoff = Join-Path $PSScriptRoot 'HANDOFF.json'
    indexedArtifacts = $entries.Count
    allIndexedBytesAndHashesVerified = $true
    indexSha256 = $indexHash
    reservedWorktreeUnchanged = $reservedUnchanged
    nativeStarts = 0
    comparisons = 0
} | ConvertTo-Json -Depth 4
