$ErrorActionPreference = 'Stop'
$scope = $PSScriptRoot
$scriptPath = Join-Path $scope 'qualify-v001.mjs'
$stdoutPath = Join-Path $scope 'invoke-v002.stdout.raw'
$stderrPath = Join-Path $scope 'invoke-v002.stderr.raw'
$info = [Diagnostics.ProcessStartInfo]::new()
$info.FileName = 'node'
$info.ArgumentList.Add($scriptPath)
$info.WorkingDirectory = $scope
$info.UseShellExecute = $false
$info.RedirectStandardOutput = $true
$info.RedirectStandardError = $true
$info.CreateNoWindow = $true
$process = [Diagnostics.Process]::new()
$process.StartInfo = $info
$stdout = [IO.File]::Open($stdoutPath, 'CreateNew', 'Write', 'Read')
$stderr = [IO.File]::Open($stderrPath, 'CreateNew', 'Write', 'Read')
$startedUtc = [DateTime]::UtcNow.ToString('o')
$observations = [Collections.Generic.List[object]]::new()
$observerErrors = [Collections.Generic.List[string]]::new()
$process.Start() | Out-Null
$rootPid = $process.Id
$rootStartTimeUtc = $process.StartTime.ToUniversalTime().ToString('o')
$outTask = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
$errTask = $process.StandardError.BaseStream.CopyToAsync($stderr)
$previousSignature = $null
do
{
    try
    {
        $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $rootPid" -ErrorAction Stop | Select-Object ProcessId, ParentProcessId, CreationDate, ExecutablePath, CommandLine)
        $signature = ($children | ForEach-Object { "$($_.ProcessId):$($_.CreationDate)" }) -join ';'
        if ($signature -cne $previousSignature)
        {
            $observations.Add(@{ observedUtc = [DateTime]::UtcNow.ToString('o'); directChildren = $children })
            $previousSignature = $signature
        }
    }
    catch
    {
        $observerErrors.Add($_.Exception.Message)
    }
} while (-not $process.WaitForExit(200))
$process.WaitForExit()
$null = $outTask.GetAwaiter().GetResult()
$null = $errTask.GetAwaiter().GetResult()
$exitCode = $process.ExitCode
$stdout.Dispose()
$stderr.Dispose()
$receipt = [ordered]@{
    script = $scriptPath; outerPowerShellPid = $PID; rootPid = $rootPid; rootStartTimeUtc = $rootStartTimeUtc
    startedUtc = $startedUtc; observedTerminalUtc = [DateTime]::UtcNow.ToString('o'); rootExitCode = $exitCode; rootHasExited = $process.HasExited
    stdoutCopyCompleted = $outTask.IsCompletedSuccessfully; stderrCopyCompleted = $errTask.IsCompletedSuccessfully
    stdout = @{ path = $stdoutPath; bytes = (Get-Item -LiteralPath $stdoutPath).Length; sha256 = (Get-FileHash -LiteralPath $stdoutPath -Algorithm SHA256).Hash }
    stderr = @{ path = $stderrPath; bytes = (Get-Item -LiteralPath $stderrPath).Length; sha256 = (Get-FileHash -LiteralPath $stderrPath -Algorithm SHA256).Hash }
    directChildPointObservationsOnIdentitySetChange = $observations; observerErrors = $observerErrors
    limitations = @('Awaited Node root and full redirected streams only. Identity-set-change point samples may miss short-lived/deeper descendants. The running sealer cannot observe its final outer tool result.')
}
[IO.File]::WriteAllText((Join-Path $scope 'invoke-v002.receipt.json'), ($receipt | ConvertTo-Json -Depth 10), [Text.UTF8Encoding]::new($false))

$known = [Collections.Generic.List[object]]::new()
foreach ($file in @(Get-ChildItem -LiteralPath $scope -File -Filter 'invoke-v*.receipt.json' | Sort-Object Name))
{
    $item = [IO.File]::ReadAllText($file.FullName) | ConvertFrom-Json
    $known.Add(@{ pid = [int]$item.rootPid; identityCreationUtc = $item.rootStartTimeUtc; evidence = $file.Name; kind = 'awaited-node-root'; rootExitCode = $item.rootExitCode })
    foreach ($sample in $item.directChildPointObservationsOnIdentitySetChange)
    {
        foreach ($child in $sample.directChildren)
        {
            $known.Add(@{ pid = [int]$child.ProcessId; identityCreationUtc = ([DateTime]$child.CreationDate).ToUniversalTime().ToString('o'); evidence = $file.Name; kind = 'point-observed-direct-child'; parentPid = $child.ParentProcessId })
        }
    }
}
foreach ($file in @(Get-ChildItem -LiteralPath $scope -File -Filter 'root-*.receipt.json' | Sort-Object Name))
{
    $item = [IO.File]::ReadAllText($file.FullName) | ConvertFrom-Json
    $known.Add(@{ pid = [int]$item.actualPid; identityCreationUtc = $null; evidence = $file.Name; kind = 'synchronously-awaited-git-root'; rootExitCode = $item.exitCode })
}
$knownPids = @($known | ForEach-Object { $_.pid } | Sort-Object -Unique)
$postUtc = [DateTime]::UtcNow.ToString('o')
$postError = $null
$present = @()
try
{
    $filter = ($knownPids | ForEach-Object { "ProcessId = $_" }) -join ' OR '
    $present = @(Get-CimInstance Win32_Process -Filter $filter -ErrorAction Stop | Select-Object ProcessId, ParentProcessId, CreationDate)
}
catch
{
    $postError = $_.Exception.Message
}
$identities = @($known | ForEach-Object {
    $historical = $_
    $current = @($present | Where-Object { [int]$_.ProcessId -eq $historical.pid })
    $state = if ($postError)
    {
        'observer-error-unknown'
    }
    elseif ($current.Count -eq 0)
    {
        'pid-absent-at-point-observation'
    }
    elseif ($historical.identityCreationUtc)
    {
        $actual = ([DateTime]$current[0].CreationDate).ToUniversalTime()
        $expected = ([DateTime]$historical.identityCreationUtc).ToUniversalTime()
        if ([Math]::Abs(($actual - $expected).TotalMilliseconds) -lt 2)
        {
            'same-observed-identity-still-present'
        }
        else
        {
            'pid-present-with-different-creation-identity'
        }
    }
    else
    {
        'pid-present-but-historical-creation-not-captured'
    }
    [ordered]@{ historical = $historical; pointState = $state; currentIdentity = $current }
})
$postResult = [ordered]@{
    observedUtc = $postUtc; completedUtc = [DateTime]::UtcNow.ToString('o')
    exactKnownPidsQueried = $knownPids; exactKnownPidCount = $knownPids.Count; observerError = $postError
    identities = $identities
    sameHistoricalIdentitiesStillPresent = @($identities | Where-Object { $_.pointState -eq 'same-observed-identity-still-present' })
    limitations = @('Exact known 290 root/observed-child PIDs only. No unseen/deeper-descendant, continuous-absence, or machine-idleness claim. Historical creation identity missing is not silently treated as a matching live identity. No processes terminated.')
}
[IO.File]::WriteAllText((Join-Path $scope 'terminal-known-identities-v001.json'), ($postResult | ConvertTo-Json -Depth 12), [Text.UTF8Encoding]::new($false))

$files = @(Get-ChildItem -LiteralPath $scope -Recurse -File | Sort-Object FullName | ForEach-Object {
    [ordered]@{
        path = [IO.Path]::GetRelativePath($scope, $_.FullName)
        bytes = $_.Length
        sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
        fileSystemAttributes = $_.Attributes.ToString()
    }
})
$index = [ordered]@{
    createdUtc = [DateTime]::UtcNow.ToString('o')
    scope = $scope
    actualAgentId = '7edc5806-0226-40d8-81f6-5c50d73959bc'
    fileCount = $files.Count
    files = $files
    inherited283Exact186FilesRemainOutsideThisNewDirectory = 'See inherited-byte-chain-before-v001.json and inherited-byte-chain-after-v001.json; preserved unchanged, not copied or retroactively approved.'
    explicitlyOutsideOwnRecursiveListing = @('artifact-index-v001.json', 'artifact-seal-v001.json')
    exclusionReason = 'Self-hash circularity only. The separate seal hashes this index. The parent must capture the actual final outer receipt after return.'
    wholeSourceMembershipProof = 'Separate raw Git ls-tree and binary cat-file streams; neither this index nor a self-manifest alone is membership evidence.'
    finalOuterToolReceipt = $null
    parentMustCaptureActualReturnedFinalOuterReceipt = $true
}
$indexPath = Join-Path $scope 'artifact-index-v001.json'
[IO.File]::WriteAllText($indexPath, ($index | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
$seal = [ordered]@{
    sealedUtc = [DateTime]::UtcNow.ToString('o')
    index = 'artifact-index-v001.json'
    indexBytes = (Get-Item -LiteralPath $indexPath).Length
    indexSha256 = (Get-FileHash -LiteralPath $indexPath -Algorithm SHA256).Hash
    indexedFileCount = $files.Count
    completeDirectoryFileCountIncludingIndexAndSeal = $files.Count + 2
    observedNodeHelperExitCode = $exitCode
    observedNodeStreamsComplete = ($outTask.IsCompletedSuccessfully -and $errTask.IsCompletedSuccessfully)
    knownHistoricalIdentitiesStillPresentAtPoint = $postResult.sameHistoricalIdentitiesStillPresent.Count
    knownIdentityObserverError = $postError
    sourceReport = 'SOURCE-QUALIFICATION-v001.md'
    sourceVerification = 'source-verification-v001.json'
    newRepositoryBodiesPerRole = 4
    cumulativeRepositoryBodiesPerRole = 19
    injectedCommonInstructionContextsPerRole = 1
    cumulativeChargedLogicalInputsPerRole = 20
    newDirectGitRoots = 3
    aggregateDirectGitGhRoots = 17
    old283AcceptanceRemainsByteAndExactInventoryOnly = $true
    old283ProspectiveSelfExitUnchangedNull = $true
    completeTransitiveSourceProducerClosureClaimed = $false
    sourceOnlyNoRuntimeOrMeasurement = $true
    finalOuterToolExitCode = $null
    actualFinalOuterReceiptOnlyAfterToolReturn = $true
    parentAcceptanceRetirementFinalizationRequired = $true
}
[IO.File]::WriteAllText((Join-Path $scope 'artifact-seal-v001.json'), ($seal | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
$expectedPaths = @($files | ForEach-Object { $_.path }) + @('artifact-index-v001.json', 'artifact-seal-v001.json')
$actualFiles = @(Get-ChildItem -LiteralPath $scope -Recurse -File)
$actualPaths = @($actualFiles | ForEach-Object { [IO.Path]::GetRelativePath($scope, $_.FullName) })
$membershipDifference = @(Compare-Object -ReferenceObject ($expectedPaths | Sort-Object) -DifferenceObject ($actualPaths | Sort-Object))
if ($membershipDifference.Count -ne 0)
{
    throw 'Post-write complete artifact inventory differs from the indexed members plus the two explicit seal/index files.'
}
foreach ($member in $files)
{
    $memberPath = Join-Path $scope $member.path
    if ((Get-Item -LiteralPath $memberPath).Length -ne $member.bytes -or (Get-FileHash -LiteralPath $memberPath -Algorithm SHA256).Hash -cne $member.sha256)
    {
        throw "Post-write artifact bytes changed: $($member.path)"
    }
}
if ((Get-FileHash -LiteralPath $indexPath -Algorithm SHA256).Hash -cne $seal.indexSha256)
{
    throw 'Post-write index digest differs from its seal.'
}
$completeInventoryObserved = [ordered]@{
    observedAfterIndexAndSealWereWritten = $true
    indexedMemberBytesRehashed = $files.Count
    actualCompleteDirectoryFilesEnumerated = $actualFiles.Count
    exactMembershipMatchesIndexPlusExplicitTwoFiles = $true
    indexDigestMatchesSeal = $true
    finalOuterToolExitCode = $null
}
[IO.File]::ReadAllText($stdoutPath)
if ((Get-Item -LiteralPath $stderrPath).Length -gt 0)
{
    [Console]::Error.Write([IO.File]::ReadAllText($stderrPath))
}
$seal | ConvertTo-Json -Depth 8
$completeInventoryObserved | ConvertTo-Json
exit $exitCode
