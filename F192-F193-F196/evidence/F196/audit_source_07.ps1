. (Join-Path $PSScriptRoot 'source_runner_03.ps1')
function WriteJson($Path, $Value)
{
    [System.IO.File]::WriteAllText($Path, ((ConvertTo-Json -InputObject $Value -Depth 60) + "`n"), $Utf8)
}
$script:Batch = '07'
$started = [DateTime]::UtcNow.ToString('o')
$observed = Get-Content (Join-Path $Out 'source_collection_02.json') -Raw | ConvertFrom-Json
$historic = 'f1fa1bd8f41a8c42f944ea41eed80cc0b6909cbb'
$historicPath = 'test\WebSites\TagHelpersWebSite\TagHelpers\TagCloudViewComponentTagHelper.cs'
Git '07-consumer-transition-membership' @('ls-tree', '-r', '-l', $historic, '--', $historicPath.Replace('\', '/')) | Out-Null
Snapshot $historic 'historicalConsumer' $historicPath
Git '07-consumer-transition-patch' @('show', '--format=fuller', $historic, '--', $historicPath.Replace('\', '/')) | Out-Null
Git '07-tree-membership-historicalConsumer' @('ls-tree', '-r', '-l', '--full-tree', $historic, '--', $historicPath.Replace('\', '/')) | Out-Null
$auxiliaryCorrections = @()
$emptyMembershipPath = Join-Path $Out 'membership_06.json'
if ([string]::IsNullOrWhiteSpace([System.IO.File]::ReadAllText($emptyMembershipPath)))
{
    WriteJson (Join-Path $Out 'membership_06.corrected_07.json') @()
    $auxiliaryCorrections += [ordered]@{
        artifact = 'membership_06.json'
        observedBytes = (Get-Item -LiteralPath $emptyMembershipPath).Length
        issue = 'The preserved executed runner serialized an empty pipeline as a blank file instead of [].'
        correction = 'membership_06.corrected_07.json'
        resolution = 'Preserve the original artifact and runner, emit a fresh corrected empty array, and use ConvertTo-Json -InputObject in this fresh script.'
        effect = 'No Git/MVC/runtime evidence was omitted. Batch 06 had no Snapshot entries; runtime source has its separate runtime_membership_06.json.'
    }
}
$allMembers = @()
foreach ($number in @('02', '03', '04', '05'))
{
    $allMembers += @(Get-Content (Join-Path $Out "membership_$number.json") -Raw | ConvertFrom-Json)
}
$allMembers += @($script:Membership)
$treeMap = @{}
$treeFiles = @(Get-ChildItem (Join-Path $Out 'commands') -Filter '06-tree-membership-*.stdout')
$treeFiles += Get-Item (Join-Path $Out 'commands\07-tree-membership-historicalConsumer.stdout')
foreach ($file in $treeFiles)
{
    $role = $file.BaseName -replace '^\d+-tree-membership-', ''
    foreach ($line in [System.IO.File]::ReadAllLines($file.FullName))
    {
        $match = [regex]::Match($line, '^(?<mode>\d+)\s+(?<type>\w+)\s+(?<blob>[a-f0-9]{40})\s+(?<size>\d+)\t(?<path>.+)$')
        if (-not $match.Success)
        {
            throw "Unexpected raw ls-tree record: $line"
        }
        $key = $role + "`0" + $match.Groups['path'].Value
        $treeMap[$key] = [ordered]@{
            blobSha1 = $match.Groups['blob'].Value
            mode = $match.Groups['mode'].Value
            type = $match.Groups['type'].Value
            bytes = [long]$match.Groups['size'].Value
            treeArtifact = "commands\$($file.Name)"
        }
    }
}
$verified = @()
$missing = @()
foreach ($entry in $allMembers)
{
    if ($entry.exitCode -ne 0)
    {
        $missing += $entry
        continue
    }
    $raw = [System.IO.File]::ReadAllBytes((Join-Path $Out $entry.artifact))
    $sha256 = HashBytes $raw
    $prefix = [System.Text.Encoding]::UTF8.GetBytes("blob $($raw.Length)" + [char]0)
    $blobData = [byte[]]::new($prefix.Length + $raw.Length)
    [System.Buffer]::BlockCopy($prefix, 0, $blobData, 0, $prefix.Length)
    [System.Buffer]::BlockCopy($raw, 0, $blobData, $prefix.Length, $raw.Length)
    $blobSha = [System.Convert]::ToHexString([System.Security.Cryptography.SHA1]::HashData($blobData)).ToLowerInvariant()
    $key = $entry.role + "`0" + $entry.gitPath
    $tree = $treeMap[$key]
    if (-not $tree -or $sha256 -ne $entry.sha256 -or $raw.Length -ne $entry.bytes -or $blobSha -ne $tree.blobSha1 -or $raw.Length -ne $tree.bytes)
    {
        throw "Pinned source/hash/tree membership mismatch: $($entry.role) $($entry.path)"
    }
    $verified += [ordered]@{
        repository = 'dotnet/aspnetcore'
        role = $entry.role
        revision = $entry.revision
        path = $entry.path
        gitPath = $entry.gitPath
        gitSpec = "$($entry.revision):$($entry.gitPath)"
        artifact = $entry.artifact
        bytes = $raw.Length
        sha256 = $sha256
        blobSha1 = $blobSha
        treeMembership = $tree.treeArtifact
        rawHashAndGitMembershipVerified = $true
    }
}
WriteJson (Join-Path $Out 'RAW_SOURCE_INDEX.json') ([ordered]@{ verified = $verified; missingPathProbes = $missing; supportingRuntimeSources = 'runtime_membership_06.json'; localGuidance = 'guidance_02.json'; auxiliaryCorrections = $auxiliaryCorrections })
Git '07-reserved-head-final' @('rev-parse', 'HEAD') | Out-Null
Git '07-reserved-branch-final' @('symbolic-ref', '--short', 'HEAD') | Out-Null
Git '07-reserved-status-final' @('status', '--porcelain=v2', '--untracked-files=all') | Out-Null
Git '07-reserved-tracked-diff-final' @('diff', '--no-ext-diff', '--binary', 'HEAD', '--') | Out-Null
$defaultFinal = RunSource '07-upstream-main-final' 'gh' @('api', '--method', 'GET', 'repos/dotnet/aspnetcore/git/ref/heads/main')
$finalDefaultSha = if ($defaultFinal.ExitCode -eq 0) { ([System.Text.Encoding]::UTF8.GetString($defaultFinal.Bytes) | ConvertFrom-Json).object.sha } else { $null }
$initialReports = Get-Content (Join-Path $Out 'reserved_reports_observation_03.json') -Raw | ConvertFrom-Json
$reportChecks = @()
foreach ($report in $initialReports.files)
{
    $item = Get-Item -LiteralPath (Join-Path $Root $report.path)
    $sha = (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    $reportChecks += [ordered]@{
        path = $report.path
        bytes = $item.Length
        lastWriteTimeUtc = $item.LastWriteTimeUtc.ToString('o')
        sha256 = $sha
        sameHash = $sha -eq $report.sha256
        sameLength = $item.Length -eq $report.bytes
        sameLastWriteTime = $item.LastWriteTimeUtc.ToString('o') -eq $report.lastWriteTimeUtc
    }
}
$head = [System.IO.File]::ReadAllText((Join-Path $Out 'commands\07-reserved-head-final.stdout')).Trim()
$branch = [System.IO.File]::ReadAllText((Join-Path $Out 'commands\07-reserved-branch-final.stdout')).Trim()
$initialStatusHash = (Get-FileHash (Join-Path $Out 'commands\reserved-status.stdout') -Algorithm SHA256).Hash
$finalStatusHash = (Get-FileHash (Join-Path $Out 'commands\07-reserved-status-final.stdout') -Algorithm SHA256).Hash
$finalDiff = Get-Item (Join-Path $Out 'commands\07-reserved-tracked-diff-final.stdout')
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
}
WriteJson (Join-Path $Out 'ISOLATION.json') $isolation
if (-not $isolation.sameHead -or -not $isolation.sameBranch -or -not $isolation.statusExactlyMatchesInitialBytes -or $isolation.trackedDiffBytes -ne 0 -or @($reportChecks | Where-Object { -not $_.sameHash -or -not $_.sameLength -or -not $_.sameLastWriteTime }).Count -ne 0)
{
    throw 'Reserved checkout or protected inherited reports changed during observation.'
}
WriteJson (Join-Path $Out 'DIFF_INDEX.json') ([ordered]@{
    finding = 'F196'
    preparation = 216
    decision = 'source-only rejection'
    candidateFiles = @()
    testFiles = @()
    repositoryChangedFiles = @()
    patchArtifacts = @()
    reservedTrackedDiff = 'commands\07-reserved-tracked-diff-final.stdout'
    reservedTrackedDiffBytes = 0
    nativeProducerOrCorrectnessArtifacts = @()
    runtimeVerification = $false
})
$equality = @()
$targetPath = 'src\Mvc\test\WebSites\TagHelpersWebSite\TagHelpers\TagCloudViewComponentTagHelper.cs'
$targetEntries = @($verified | Where-Object { $_.path -eq $targetPath })
$defaultTarget = $targetEntries | Where-Object { $_.role -eq 'observedDefault' }
foreach ($entry in $targetEntries)
{
    $equality += [ordered]@{ role = $entry.role; revision = $entry.revision; sha256 = $entry.sha256; blobSha1 = $entry.blobSha1; exactlyMatchesObservedDefault = $entry.sha256 -eq $defaultTarget.sha256 }
}
if (@($equality | Where-Object { -not $_.exactlyMatchesObservedDefault }).Count -ne 0)
{
    throw 'Target source equality assumption did not hold across the recorded source roles.'
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
$allCommandMetadata = @(Get-ChildItem (Join-Path $Out 'commands') -Filter '*.json' | Sort-Object Name | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json })
$failures = @($allCommandMetadata | Where-Object { $_.exitCode -ne 0 })
WriteJson (Join-Path $Out 'COMMAND_FAILURES.json') ([ordered]@{
    subprocessFailures = $failures
    failedInitialInterpreterAttempt = 'collector_01.execution.json'
    initialInterpreterFailure = 'Windows python alias exited 9009 before collect_source_01.py ran; stdout/stderr and the unexecuted script were preserved. Fresh collect_source_02.ps1 was used instead; no installation occurred.'
    toolFailures = 'TOOL_EVIDENCE.json'
    auxiliaryArtifactProblems = $jsonProblems
    nativeFailures = @()
})
$commandCount = $allCommandMetadata.Count
$terminalCount = @($allCommandMetadata | Where-Object { $_.terminal -and $_.redirectedStreamsDrained }).Count
if ($terminalCount -ne $commandCount)
{
    throw 'A source subprocess lacks actual terminal/drained-stream evidence.'
}
$audit = [ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    verifiedMvcRawSourceEntries = $verified.Count
    failedMembershipProbesRetained = $missing.Count
    sourceSubprocessCount = $commandCount
    sourceSubprocessFailures = $failures.Count
    sourceSubprocessesActuallyWaitedAndStreamsDrained = $terminalCount
    supportingRuntimeRawSourceEntries = 5
    nativeBuildTestRestoreStarts = 0
    benchmarkTimingWarmupAllocationProfilingCounterStarts = 0
    defaultObservation = [ordered]@{
        initial = $observed.revisions.observedDefault
        final = $finalDefaultSha
        movedAfterInitialObservation = $finalDefaultSha -and $finalDefaultSha -ne $observed.revisions.observedDefault
        finalReadSucceeded = $defaultFinal.ExitCode -eq 0
        limitationIfMoved = 'Source remains pinned to the independently observed initial Default; no substitution, fetch, ref update or checkout reconstruction was performed.'
    }
    auxiliaryJsonProblemsPreservedWithFreshCorrection = $jsonProblems
    producerStaticCheck = 'static_producer_check_05.json'
    sourceChecksPassed = $true
    runtimeChecksPerformed = $false
    currentControlShellPid = $PID
    currentControlShellRole = 'synchronous source audit; all Git/GitHub children have exited, both redirected streams drained'
    unrelatedProcessOrMachineQuiescenceClaim = $false
}
WriteJson (Join-Path $Out 'SOURCE_AUDIT.json') $audit
FinishBatch $started ([ordered]@{ audit = 'SOURCE_AUDIT.json'; nativeStarts = 0; repositoryChanges = 0 })
Write-Host "SOURCE_AUDIT: verified=$($verified.Count), source-commands=$commandCount, failures-retained=$($failures.Count), native-starts=0, source-checks-passed=True"
