$ErrorActionPreference = 'Stop'
$scope = $PSScriptRoot
$scriptPath = Join-Path $scope 'qualify-v001.mjs'
$stdoutPath = Join-Path $scope 'invoke-v005.stdout.raw'
$stderrPath = Join-Path $scope 'invoke-v005.stderr.raw'
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
do
{
    try
    {
        $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $rootPid" -ErrorAction Stop | Select-Object ProcessId, ParentProcessId, CreationDate, ExecutablePath, CommandLine)
        $observations.Add(@{ observedUtc = [DateTime]::UtcNow.ToString('o'); directChildren = $children })
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
    directChildPointObservations = $observations; observerErrors = $observerErrors
    limitations = @('Awaited Node root/full redirected streams only. Point samples may miss short-lived/deeper descendants. The outer tool result cannot be observed by this running script.')
}
[IO.File]::WriteAllText((Join-Path $scope 'invoke-v005.receipt.json'), ($receipt | ConvertTo-Json -Depth 10), [Text.UTF8Encoding]::new($false))

$known = [Collections.Generic.List[object]]::new()
$priorReceipts = @(Get-ChildItem -LiteralPath $scope -File -Filter 'invoke-v*.receipt.json' | Sort-Object Name)
foreach ($file in $priorReceipts)
{
    $item = [IO.File]::ReadAllText($file.FullName) | ConvertFrom-Json
    $known.Add(@{ pid = [int]$item.rootPid; identityCreationUtc = $item.rootStartTimeUtc; evidence = $file.Name; kind = 'awaited-node-root'; rootExitCode = $item.rootExitCode })
    foreach ($sample in $item.directChildPointObservations)
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
    $known.Add(@{ pid = [int]$item.actualRootPid; identityCreationUtc = $null; evidence = $file.Name; kind = 'synchronously-awaited-git-gh-root'; rootExitCode = $item.rootExitCode })
}
$knownPids = @($known | ForEach-Object { $_.pid } | Sort-Object -Unique)
$postObservationUtc = [DateTime]::UtcNow.ToString('o')
$postObserverError = $null
$currentlyPresent = @()
try
{
    $filter = ($knownPids | ForEach-Object { "ProcessId = $_" }) -join ' OR '
    $currentlyPresent = @(Get-CimInstance Win32_Process -Filter $filter -ErrorAction Stop | Select-Object ProcessId, ParentProcessId, CreationDate)
}
catch
{
    $postObserverError = $_.Exception.Message
}
$identities = @($known | ForEach-Object {
    $historical = $_
    $current = @($currentlyPresent | Where-Object { [int]$_.ProcessId -eq $historical.pid })
    $state = if ($postObserverError)
    {
        'observer-error-unknown'
    }
    elseif ($current.Count -eq 0)
    {
        'pid-absent-at-point-observation'
    }
    elseif ($historical.identityCreationUtc)
    {
        $creation = ([DateTime]$current[0].CreationDate).ToUniversalTime()
        $expected = ([DateTime]$historical.identityCreationUtc).ToUniversalTime()
        if ([Math]::Abs(($creation - $expected).TotalMilliseconds) -lt 2)
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
    observedUtc = $postObservationUtc; observationCompletedUtc = [DateTime]::UtcNow.ToString('o')
    exactKnownPidsQueried = $knownPids; exactKnownPidCount = $knownPids.Count
    observerError = $postObserverError; identities = $identities
    sameHistoricalIdentitiesStillPresent = @($identities | Where-Object { $_.pointState -eq 'same-observed-identity-still-present' })
    limitations = @('Exact known PIDs only. Point samples do not reveal unseen/deeper descendants, prove continuous absence, or establish machine idleness. No process was terminated. Missing historical creation identity is not silently treated as a matching identity.')
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
    explicitlyOutsideRecursiveInventory = @('artifact-index-v001.json', 'artifact-seal-v001.json')
    exclusionReason = 'Self-hash circularity only. The separate seal hashes this complete index; parent must record the outer tool receipt after return.'
    wholeSourceMembershipProof = 'Independent raw Git ls-tree and cat-file streams; this index is not sole membership evidence.'
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
    observedNodeHelperExitCode = $exitCode
    observedNodeStreamsComplete = ($outTask.IsCompletedSuccessfully -and $errTask.IsCompletedSuccessfully)
    knownHistoricalIdentitiesStillPresentAtPoint = $postResult.sameHistoricalIdentitiesStillPresent.Count
    knownIdentityObserverError = $postObserverError
    sourceReport = 'SOURCE-QUALIFICATION-v001.md'
    sourceVerification = 'source-verification-v001.json'
    bodyBudget = '15 captured repository whole inputs per role; injected instruction-context accounting explicitly disclosed for parent review.'
    sourceOnlyNoRuntimeOrMeasurement = $true
    finalOuterToolExitCode = $null
    actualFinalOuterReceiptOnlyAfterToolReturn = $true
    parentAcceptanceRetirementFinalizationRequired = $true
}
[IO.File]::WriteAllText((Join-Path $scope 'artifact-seal-v001.json'), ($seal | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
[IO.File]::ReadAllText($stdoutPath)
if ((Get-Item -LiteralPath $stderrPath).Length -gt 0)
{
    [Console]::Error.Write([IO.File]::ReadAllText($stderrPath))
}
$seal | ConvertTo-Json -Depth 8
exit $exitCode
