$ErrorActionPreference = 'Stop'
$session = $PSScriptRoot
$root = Join-Path $session 'autoperf-runs\F140'
$output = Join-Path $root 'coordinator-known-process-review-029.json'
if (Test-Path -LiteralPath $output)
{
    throw 'Preserve the existing process-review observation; do not overwrite it.'
}
$functional = Get-Content -LiteralPath (Join-Path $root 'functional-acceptance.json') -Raw | ConvertFrom-Json
$known = @{}
foreach ($file in $functional.actualObservationFiles)
{
    if ($file.mode -notin @('native', 'functional'))
    {
        continue
    }
    if ($file.file -notlike '*.json')
    {
        continue
    }
    $snapshot = Get-Content -LiteralPath $file.file -Raw | ConvertFrom-Json
    $key = "$($snapshot.pid)|$($snapshot.processStartUtc)"
    $known[$key] = @{
        pid = $snapshot.pid
        processStartUtc = $snapshot.processStartUtc
        recordedProcessPath = $snapshot.processPath
    }
}
foreach ($record in $functional.actualAllCompletedInvocationRecords)
{
    if ($record.exitCode -ne 0 -or -not $record.actualRootAwaited -or
        -not $record.actualStdoutAwaited -or -not $record.actualStderrAwaited)
    {
        throw 'A recorded F140 native/common root or redirected stream is not accepted terminal.'
    }
}
$processes = @(Get-CimInstance Win32_Process)
$checks = @()
foreach ($record in $known.Values)
{
    $current = @($processes | Where-Object { $_.ProcessId -eq $record.pid })
    $same = $current.Count -eq 1 -and
        [Math]::Abs(($current[0].CreationDate.ToUniversalTime() - [DateTimeOffset]::Parse($record.processStartUtc).UtcDateTime).TotalMilliseconds) -lt 1
    $checks += @{
        pid = $record.pid; recordedStartUtc = $record.processStartUtc
        actualSameCreationIdentityStillLive = $same
        actualPidPresentWithDifferentCreationIdentity = $current.Count -eq 1 -and -not $same
        currentName = if ($current.Count -eq 1) { $current[0].Name } else { $null }
        currentStartUtc = if ($current.Count -eq 1) { $current[0].CreationDate.ToUniversalTime().ToString('o') } else { $null }
        actualStoppedOrWaitedUnrelatedProcess = $false
    }
}
$workerChecks = @()
$workerA = Get-Content -LiteralPath (Join-Path $session 'autoperf-parallelism\finding-F176-F179-022\F140-HOLD-027-ack.json') -Raw | ConvertFrom-Json
$workerB = Get-Content -LiteralPath (Join-Path $session 'autoperf-parallelism\finding-F182-F186-022\F140-HOLD-027-ack.json') -Raw | ConvertFrom-Json
$workerIdentities = @($workerA.knownPidCreationTerminalObservations | ForEach-Object {
    @{ pid = $_.processId; creation = $_.creationUtc; toleranceMilliseconds = 1000; owner = 'F176' }
}) + @($workerB.terminalObservations | ForEach-Object {
    @{ pid = $_.recorded.processId; creation = $_.recorded.creationTimeUtc; toleranceMilliseconds = 1; owner = 'F182' }
})
foreach ($record in $workerIdentities)
{
    $current = @($processes | Where-Object { $_.ProcessId -eq $record.pid })
    $created = [DateTimeOffset]::Parse($record.creation, [Globalization.CultureInfo]::InvariantCulture,
        [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal)
    $possibleSame = $current.Count -eq 1 -and
        [Math]::Abs(($current[0].CreationDate.ToUniversalTime() - $created.UtcDateTime).TotalMilliseconds) -lt $record.toleranceMilliseconds
    $workerChecks += @{
        owner = $record.owner; pid = $record.pid; recordedCreationUtc = $record.creation
        actualSameOrConservativelyPossibleCreationIdentityStillLive = $possibleSame
        actualPidPresentWithDifferentCreationIdentity = $current.Count -eq 1 -and -not $possibleSame
        actualConservativeCreationToleranceMilliseconds = $record.toleranceMilliseconds
        currentName = if ($current.Count -eq 1) { $current[0].Name } else { $null }
        currentStartUtc = if ($current.Count -eq 1) { $current[0].CreationDate.ToUniversalTime().ToString('o') } else { $null }
        actualStoppedOrWaitedUnrelatedProcess = $false
    }
}
$scopes = @(
    'C:\src\ap-F140-',
    'C:\src\ap-F173-',
    'C:\src\ap-F176-',
    'C:\src\ap-F182-',
    'finding-F140-',
    'finding-F176-',
    'finding-F182-'
)
$scopedLive = @($processes | Where-Object {
    $native = $_
    $native.Name -match '^(dotnet|testhost(?:[.]x86)?|VBCSCompiler|MSBuild|csc|cl|link|node)[.]exe$' -and
        $null -ne $native.CommandLine -and
        @($scopes | Where-Object { $native.CommandLine.Contains($_, [StringComparison]::OrdinalIgnoreCase) }).Count -gt 0
} | Select-Object ProcessId, ParentProcessId, Name, CreationDate, CommandLine)
$recognized = @($processes | Where-Object {
    $_.Name -match '^(dotnet|node|corerun|BenchmarkDotNet.*)[.]exe$' -and
        $_.CommandLine -match '(?i)(AutoPerf[.\\]|BenchmarkDotNet|F[0-9]{3}-(compare|benchmark)|[ .]measure[ .])'
} | Select-Object ProcessId, ParentProcessId, Name, CreationDate, CommandLine)
$sameLive = @($checks | Where-Object { $_.actualSameCreationIdentityStillLive })
$workerLive = @($workerChecks | Where-Object { $_.actualSameOrConservativelyPossibleCreationIdentityStillLive })
$receipt = @{
    recordedAt = [DateTime]::UtcNow.ToString('o')
    actualExplicitHoldId = 'F140-027'
    actualCoordinatorKnownBuildTestChildrenAndStreamsTerminal = $sameLive.Count -eq 0
    actualRecordedF140CompletedRootsAndStreamRecords = $functional.actualAllCompletedInvocationRecords.Count
    actualKnownIdentityChecks = $checks
    actualWorkerKnownIdentityChecks = $workerChecks
    actualLiveSourceScopedNativeOrNodeWork = $scopedLive
    actualRecognizedBenchmarkProcesses = $recognized
    actualNoKnownOwnedOrRecognizedWorkRemains = $sameLive.Count -eq 0 -and $workerLive.Count -eq 0 -and $scopedLive.Count -eq 0 -and $recognized.Count -eq 0
    actualBenchmarkOrCounterStarted = $false
    actualNoArbitraryThirdPartyActivityAbsenceOrHistoricalExecutionClosureClaim = $true
}
$receipt | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $output -Encoding utf8
if (-not $receipt.actualNoKnownOwnedOrRecognizedWorkRemains)
{
    throw 'Known owned or recognizable work remains; preserve the observation and do not admit timing.'
}
@{
    actualKnownCreationIdentitiesReviewed = $checks.Count
    actualWorkerKnownCreationIdentitiesReviewed = $workerChecks.Count
    actualRecordedF140RootsAndStreamsTerminal = $functional.actualAllCompletedInvocationRecords.Count
    actualLiveSourceScopedNativeOrNodeWork = $scopedLive.Count
    actualRecognizedBenchmarkProcesses = $recognized.Count
    actualNoKnownOwnedOrRecognizedWorkRemains = $true
    actualSharedHostIdlenessClaimed = $false
} | ConvertTo-Json
