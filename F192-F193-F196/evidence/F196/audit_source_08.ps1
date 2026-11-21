. (Join-Path $PSScriptRoot 'source_runner_03.ps1')
function WriteJson($Path, $Value)
{
    [System.IO.File]::WriteAllText($Path, ((ConvertTo-Json -InputObject $Value -Depth 60) + "`n"), $Utf8)
}
$script:Batch = '08'
$started = [DateTime]::UtcNow.ToString('o')
$observed = Get-Content (Join-Path $Out 'source_collection_02.json') -Raw | ConvertFrom-Json
$rawIndex = Get-Content (Join-Path $Out 'RAW_SOURCE_INDEX.json') -Raw | ConvertFrom-Json
foreach ($entry in $rawIndex.verified)
{
    $item = Get-Item -LiteralPath (Join-Path $Out $entry.artifact)
    if ($item.Length -ne $entry.bytes -or (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256 -or -not $entry.rawHashAndGitMembershipVerified)
    {
        throw "Raw pinned source audit failed: $($entry.artifact)"
    }
}
$runtime = @(Get-Content (Join-Path $Out 'runtime_membership_06.json') -Raw | ConvertFrom-Json)
foreach ($entry in $runtime)
{
    $item = Get-Item -LiteralPath (Join-Path $Out $entry.artifact)
    if ($entry.exitCode -ne 0 -or $item.Length -ne $entry.bytes -or (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256)
    {
        throw "Supporting runtime raw source audit failed: $($entry.path)"
    }
}
Git '08-reserved-head-final' @('rev-parse', 'HEAD') | Out-Null
Git '08-reserved-branch-final' @('symbolic-ref', '--short', 'HEAD') | Out-Null
Git '08-reserved-status-final' @('status', '--porcelain=v2', '--untracked-files=all') | Out-Null
Git '08-reserved-tracked-diff-final' @('diff', '--no-ext-diff', '--binary', 'HEAD', '--') | Out-Null
$defaultFinal = RunSource '08-upstream-main-final' 'gh' @('api', '--method', 'GET', 'repos/dotnet/aspnetcore/git/ref/heads/main')
$finalDefaultSha = if ($defaultFinal.ExitCode -eq 0) { ([System.Text.Encoding]::UTF8.GetString($defaultFinal.Bytes) | ConvertFrom-Json).object.sha } else { $null }
$initialReports = Get-Content (Join-Path $Out 'reserved_reports_observation_03.json') -Raw | ConvertFrom-Json
$reportChecks = @()
foreach ($report in $initialReports.files)
{
    $item = Get-Item -LiteralPath (Join-Path $Root $report.path)
    $sha = (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    $expectedUtc = ([DateTime]$report.lastWriteTimeUtc).ToUniversalTime()
    $reportChecks += [ordered]@{
        path = $report.path
        bytes = $item.Length
        expectedBytes = $report.bytes
        lastWriteTimeUtc = $item.LastWriteTimeUtc.ToString('o')
        expectedLastWriteTimeUtc = $expectedUtc.ToString('o')
        initialJsonParsedTimestampType = $report.lastWriteTimeUtc.GetType().FullName
        sha256 = $sha
        expectedSha256 = $report.sha256
        sameHash = $sha -eq $report.sha256
        sameLength = $item.Length -eq $report.bytes
        sameLastWriteTimeTicks = $item.LastWriteTimeUtc.Ticks -eq $expectedUtc.Ticks
    }
}
$head = [System.IO.File]::ReadAllText((Join-Path $Out 'commands\08-reserved-head-final.stdout')).Trim()
$branch = [System.IO.File]::ReadAllText((Join-Path $Out 'commands\08-reserved-branch-final.stdout')).Trim()
$initialStatusHash = (Get-FileHash (Join-Path $Out 'commands\reserved-status.stdout') -Algorithm SHA256).Hash
$finalStatusHash = (Get-FileHash (Join-Path $Out 'commands\08-reserved-status-final.stdout') -Algorithm SHA256).Hash
$finalDiff = Get-Item (Join-Path $Out 'commands\08-reserved-tracked-diff-final.stdout')
$isolation = [ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    reservedRoot = $Root
    head = $head
    expectedHead = $observed.revisions.reserved
    sameHead = $head -eq $observed.revisions.reserved
    branch = $branch
    expectedBranch = 'autoperf/F145-hoist-large-response-utf8-encoding'
    sameBranch = $branch -eq 'autoperf/F145-hoist-large-response-utf8-encoding'
    statusExactlyMatchesInitialBytes = $initialStatusHash -eq $finalStatusHash
    trackedDiffBytes = $finalDiff.Length
    protectedReports = $reportChecks
    originalPrivateGraphExists = Test-Path -LiteralPath 'C:\src\ap-F196-o216'
    defaultPrivateGraphExists = Test-Path -LiteralPath 'C:\src\ap-F196-d216'
    privateGraphsCreated = @()
    repositoryEdits = @()
    sharedPolicyRegistryLeaseLedgerWrites = 0
    gitFetchCheckoutRefWrites = 0
    supersedes = 'ISOLATION.json'
    correction = 'Audit 07 compared an ISO string to a DateTime value automatically parsed from JSON. All report hashes/lengths and the displayed timestamps already agreed. Fresh audit 08 compares UTC DateTime ticks; no protected file was changed to satisfy the check.'
}
WriteJson (Join-Path $Out 'ISOLATION_08.json') $isolation
if (-not $isolation.sameHead -or -not $isolation.sameBranch -or -not $isolation.statusExactlyMatchesInitialBytes -or $isolation.trackedDiffBytes -ne 0 -or @($reportChecks | Where-Object { -not $_.sameHash -or -not $_.sameLength -or -not $_.sameLastWriteTimeTicks }).Count -ne 0)
{
    throw 'Corrected reserved checkout or inherited-report equality check failed.'
}
WriteJson (Join-Path $Out 'DIFF_INDEX.json') ([ordered]@{
    finding = 'F196'
    preparation = 216
    decision = 'source-only rejection'
    candidateFiles = @()
    testFiles = @()
    repositoryChangedFiles = @()
    patchArtifacts = @()
    reservedTrackedDiff = 'commands\08-reserved-tracked-diff-final.stdout'
    reservedTrackedDiffBytes = 0
    nativeProducerOrCorrectnessArtifacts = @()
    runtimeVerification = $false
})
$equality = @()
$targetPath = 'src\Mvc\test\WebSites\TagHelpersWebSite\TagHelpers\TagCloudViewComponentTagHelper.cs'
$targetEntries = @($rawIndex.verified | Where-Object { $_.path -eq $targetPath })
$defaultTarget = $targetEntries | Where-Object { $_.role -eq 'observedDefault' }
foreach ($entry in $targetEntries)
{
    $equality += [ordered]@{ role = $entry.role; revision = $entry.revision; sha256 = $entry.sha256; blobSha1 = $entry.blobSha1; exactlyMatchesObservedDefault = $entry.sha256 -eq $defaultTarget.sha256 }
}
if (@($equality | Where-Object { -not $_.exactlyMatchesObservedDefault }).Count -ne 0)
{
    throw 'The target source differs between the recorded source roles.'
}
WriteJson (Join-Path $Out 'TARGET_SOURCE_EQUALITY.json') $equality
$jsonProblems = @()
foreach ($file in (Get-ChildItem -LiteralPath $Out -Recurse -Filter '*.json'))
{
    try
    {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        if ([string]::IsNullOrWhiteSpace($content))
        {
            throw 'Blank JSON artifact'
        }
        $null = ConvertFrom-Json -InputObject $content
    }
    catch
    {
        $relative = [System.IO.Path]::GetRelativePath($Out, $file.FullName)
        $jsonProblems += [ordered]@{ artifact = $relative; error = $_.Exception.Message; preserved = $true; knownCorrection = if ($relative -eq 'membership_06.json') { 'membership_06.corrected_07.json' } else { $null } }
    }
}
if (@($jsonProblems | Where-Object { -not $_.knownCorrection }).Count -ne 0)
{
    throw 'An unexpected JSON serialization problem remains.'
}
$allCommands = @(Get-ChildItem (Join-Path $Out 'commands') -Filter '*.json' | Sort-Object Name | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json })
$failures = @($allCommands | Where-Object { $_.exitCode -ne 0 })
$terminalCount = @($allCommands | Where-Object { $_.terminal -and $_.redirectedStreamsDrained }).Count
if ($terminalCount -ne $allCommands.Count)
{
    throw 'A source subprocess lacks actual terminal/drained-stream evidence.'
}
WriteJson (Join-Path $Out 'COMMAND_FAILURES.json') ([ordered]@{
    subprocessFailures = $failures
    failedInitialInterpreterAttempt = 'collector_01.execution.json'
    initialInterpreterFailure = 'Windows python alias exited 9009 before collect_source_01.py ran. Original script/output retained; fresh PowerShell collector 02 used without installation.'
    failedAuditAttempt = 'collector_07.execution.json'
    failedAudit = 'audit_source_07.ps1 ended with exit 1 due solely to a string-versus-JSON-parsed-DateTime timestamp comparison. ISOLATION.json retains true hash/length/head/branch/status checks and false timestamp booleans. Fresh audit_source_08.ps1 corrects the comparison; neither original script nor failed artifacts was altered.'
    correctedIsolationEvidence = 'ISOLATION_08.json'
    toolFailures = 'TOOL_EVIDENCE.json'
    auxiliaryArtifactProblems = $jsonProblems
    nativeFailures = @()
})
$audit = [ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    verifiedMvcRawSourceEntries = @($rawIndex.verified).Count
    failedMembershipProbesRetained = @($rawIndex.missingPathProbes).Count
    sourceSubprocessCount = $allCommands.Count
    sourceSubprocessFailures = $failures.Count
    sourceSubprocessesActuallyWaitedAndStreamsDrained = $terminalCount
    supportingRuntimeRawSourceEntries = $runtime.Count
    nativeBuildTestRestoreStarts = 0
    benchmarkTimingWarmupAllocationProfilingCounterStarts = 0
    defaultObservation = [ordered]@{
        initial = $observed.revisions.observedDefault
        final = $finalDefaultSha
        movedAfterInitialObservation = [bool]($finalDefaultSha -and $finalDefaultSha -ne $observed.revisions.observedDefault)
        finalReadSucceeded = $defaultFinal.ExitCode -eq 0
        finalReadMetadata = 'commands\08-upstream-main-final.json'
        limitationIfMoved = 'Source remains pinned to the independently observed initial Default; no substitution, fetch, ref update or checkout reconstruction was performed.'
    }
    auxiliaryJsonProblemsPreservedWithFreshCorrection = $jsonProblems
    producerStaticCheck = 'static_producer_check_05.json'
    sourceChecksPassed = $true
    runtimeChecksPerformed = $false
    correction = 'Preserved failed audit 07; corrected source audit 08 passed.'
    currentControlShellPid = $PID
    currentControlShellRole = 'synchronous source audit; all Git/GitHub children exited and both redirected streams drained'
    unrelatedProcessOrMachineQuiescenceClaim = $false
}
WriteJson (Join-Path $Out 'SOURCE_AUDIT.json') $audit
WriteJson (Join-Path $Out 'COMMAND_INDEX.json') $allCommands
FinishBatch $started ([ordered]@{ audit = 'SOURCE_AUDIT.json'; nativeStarts = 0; repositoryChanges = 0; earlierFailedAuditPreserved = $true })
Write-Host "SOURCE_AUDIT: verified=$(@($rawIndex.verified).Count), source-commands=$($allCommands.Count), failures-retained=$($failures.Count), native-starts=0, source-checks-passed=True"
