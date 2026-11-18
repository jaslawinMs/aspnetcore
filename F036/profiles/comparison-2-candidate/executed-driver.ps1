param(
    [Parameter(Mandatory)]
    [ValidateSet('characterize', 'measure')]
    [string]$Mode,
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label,
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Preparation,
    [ValidateRange(0, 3)]
    [int]$Round = 0
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F036'
$manifest = Get-Content -Raw (Join-Path $run "$Preparation\prepared\capsule.json") | ConvertFrom-Json
$prepared = Split-Path $manifest.closurePath -Parent
$output = $manifest.output
$variant = $manifest.variant
$execution = Join-Path $run "profiles\$Label"
$budgetFile = Join-Path $run 'source-comparison-budget.json'
$lockFile = Join-Path $run 'actual-profile.lock'
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual F036 source-comparison native profile.'
}
$lock = [IO.File]::Open($lockFile,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
Push-Location $root
try
{
    . .\activate.ps1
    if (!$manifest.actualWhitespaceVerifiedBeforeFreeze -or $variant -notin 'original','candidate')
    {
        throw 'Require the explicitly frozen source variant.'
    }
    foreach ($entry in $manifest.sourceFiles)
    {
        if ((Get-FileHash -LiteralPath (Join-Path $prepared $entry.path)).Hash -cne $entry.sha256)
        {
            throw 'Frozen source differs.'
        }
    }
    $closure = Get-Content -Raw $manifest.closurePath | ConvertFrom-Json
    foreach ($entry in $closure.files)
    {
        if ((Get-FileHash -LiteralPath (Join-Path $output $entry.path)).Hash -cne $entry.sha256)
        {
            throw "Actual source-comparison consumer file differs:$($entry.path)"
        }
    }
    if (@(Get-ChildItem -LiteralPath $output -Recurse -File -Force).Count -ne $closure.files.Count)
    {
        throw 'Actual consumer closure file set differs.'
    }
    New-Item -ItemType Directory -Path $execution | Out-Null
    Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
    if ($Mode -eq 'measure')
    {
        $budget = Get-Content -Raw $budgetFile | ConvertFrom-Json
        $seal = Get-Content -Raw (Join-Path $run 'source-comparison-contracts.json') | ConvertFrom-Json
        if (!$seal.actualAllConcreteRecordsIdentical -or $seal.actualSemanticRecordsPerImage -ne 33 -or
            $seal.actualBenchmarkLifecyclesPerImage -ne 32 -or !$seal.actualSameHarnessAndOnlyOwnerPairChanged)
        {
            throw 'Require all exact original/candidate cursor,copy,derived and benchmark contracts before comparison timing.'
        }
        foreach ($entry in $seal.sealedFiles)
        {
            if ((Get-FileHash -LiteralPath $entry.path).Hash -cne $entry.sha256)
            {
                throw 'Precomparison sealed source,plan,contracts or image changed.'
            }
        }
        $next = @($budget.nativeProfilesStarted).Count
        $expectedRound = @($budget.comparisonsSettled).Count + 1
        $startedInRound = @($budget.nativeProfilesStarted | Where-Object round -eq $Round).Count
        $completedInRound = @($budget.nativeProfilesCompleted | Where-Object round -eq $Round).Count
        if ($budget.sourceComparisonBudgetClosed -or $budget.maximumActualSourceComparisons -ne 3 -or
            $next -ge 6 -or $Round -ne $expectedRound -or $startedInRound -ge 2 -or
            $completedInRound -ne $startedInRound -or
            $budget.pairedOrder[$Round - 1][$startedInRound] -cne $variant -or
            $Preparation -cne $budget.authoritativePreparations.$variant -or
            $Label -cne "comparison-$Round-$variant")
        {
            throw 'Only the next member of the three predeclared alternating source pairs may start.'
        }
        foreach ($name in 'original','candidate')
        {
            $contracts = Get-Content -Raw (Join-Path $run "profiles\$($budget.authoritativeCharacterizations.$name)\verified-native-exit.json") | ConvertFrom-Json
            $ownerManifest = Get-Content -Raw (Join-Path $run "$($budget.authoritativePreparations.$name)\prepared\capsule.json") | ConvertFrom-Json
            if ($contracts.actualNativeExitCode -ne 0 -or $contracts.actualMode -cne 'characterize' -or
                $contracts.actualHarnessSha256 -cne $manifest.actualHarnessSha256 -or
                $ownerManifest.actualHarnessSha256 -cne $manifest.actualHarnessSha256 -or
                $ownerManifest.actualHarnessPdbSha256 -cne $manifest.actualHarnessPdbSha256)
            {
                throw 'Both actually characterized images must use this byte-identical frozen comparison harness.'
            }
        }
        if ($startedInRound -eq 0)
        {
            if ($budget.actualSourceComparisonsStarted -ne ($Round - 1))
            {
                throw 'Unexpected prior source-comparison attempt count.'
            }
            $budget.actualSourceComparisonsStarted++
        }
        $budget.nativeProfilesStarted += [ordered]@{
            round=$Round; variant=$variant; label=$Label; preparation=$Preparation
            actualStartedBeforeNativeLaunch=[DateTimeOffset]::UtcNow.ToString('o')
        }
        $budget | ConvertTo-Json -Depth 15 | Set-Content $budgetFile -Encoding utf8NoBOM
        Copy-Item -LiteralPath $budgetFile -Destination (Join-Path $execution 'budget-before-native-launch.json')
    }
    elseif ($Round -ne 0)
    {
        throw 'Untimed characterization is not a source-comparison slot.'
    }
    $arguments = @((Join-Path $output 'AutoPerf.Benchmarks.dll'),'--mode',$Mode,
        '--sources',$manifest.sources,'--closure',$manifest.closurePath,'--artifacts',$execution)
    if ($Mode -eq 'measure')
    {
        $arguments += @('--filter','*')
    }
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    $executable = (Get-Command dotnet).Source
    [ordered]@{
        executable=$executable; arguments=$arguments; workingDirectory=$root; mode=$Mode; variant=$variant
        round=$Round; started=$started; actualNativeProcessNotYetStarted=$true
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $execution 'native-launch-intent.json') -Encoding utf8NoBOM
    $startInfo = [Diagnostics.ProcessStartInfo]::new($executable)
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.WorkingDirectory = $root
    foreach ($argument in $arguments)
    {
        $startInfo.ArgumentList.Add($argument)
    }
    $process = [Diagnostics.Process]::new()
    try
    {
        $process.StartInfo = $startInfo
        if (!$process.Start())
        {
            throw 'Actual source-comparison native process did not start.'
        }
        $nativeId = $process.Id
        [ordered]@{
            actualNativeProcessId=$nativeId; actualNativeProcessStartTimeUtc=$process.StartTime.ToUniversalTime().ToString('o')
            actualProcessStartObservedBeforeWait=$true; executable=$executable; arguments=$arguments
        } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $execution 'native-process-started.json') -Encoding utf8NoBOM
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        $process.WaitForExit()
        $code = $process.ExitCode
        [IO.File]::WriteAllText((Join-Path $execution 'native.stdout'),$stdout.GetAwaiter().GetResult())
        [IO.File]::WriteAllText((Join-Path $execution 'native.stderr'),$stderr.GetAwaiter().GetResult())
    }
    finally
    {
        $process.Dispose()
    }
    [ordered]@{
        executable=$executable; arguments=$arguments; workingDirectory=$root; mode=$Mode; variant=$variant; round=$Round
        preparation=$Preparation; actualNativeProcessId=$nativeId; actualSourceHeadAtOwnerBuild=$manifest.actualSourceHeadAtBuild
        actualHarnessSha256=$manifest.actualHarnessSha256; actualHarnessPdbSha256=$manifest.actualHarnessPdbSha256
        actualClosureSha256=(Get-FileHash -LiteralPath $manifest.closurePath).Hash; actualClosureFileCount=$closure.files.Count
        started=$started; completed=[DateTimeOffset]::UtcNow.ToString('o'); actualExitCode=$code
        actualTimingProfile=$Mode -eq 'measure'; actualSourceComparisonMember=$Mode -eq 'measure'
        processPolicy='Direct settings-preserving emitter;never set priority,affinity or power.'
    } | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $execution 'invocation.json') -Encoding utf8NoBOM
    foreach ($entry in $closure.files)
    {
        if ((Get-FileHash -LiteralPath (Join-Path $output $entry.path)).Hash -cne $entry.sha256)
        {
            throw 'Actual frozen consumer file changed during native execution.'
        }
    }
    Get-Content (Join-Path $execution 'native.stdout') -Tail 24
    if ($code -ne 0)
    {
        if ($Mode -eq 'measure')
        {
            $budget.comparisonsSettled += [ordered]@{
                round=$Round; actualCompletedPair=$false; actualFailedLabel=$Label
                actualFailedNativeExitCode=$code; actualFailedAttemptConsumesSourceComparison=$true
            }
            $budget.actualSourceComparisonsConcluded = @($budget.comparisonsSettled).Count
            $budget.sourceComparisonBudgetClosed = $budget.actualSourceComparisonsConcluded -eq 3
            $budget | ConvertTo-Json -Depth 15 | Set-Content $budgetFile -Encoding utf8NoBOM
        }
        Get-Content (Join-Path $execution 'native.stderr') -Tail 24
        throw "Actual $Mode exited$code;retain the consumed source-comparison slot if any."
    }
    $suffix = if ($Mode -ceq 'characterize') { '*-characterization-completed.json' } else { '*-completed.json' }
    $completed = @(Get-ChildItem -LiteralPath (Join-Path $execution 'states') -Filter $suffix -File)
    if ($completed.Count -ne 1)
    {
        throw 'Zero native exit alone does not establish completion.'
    }
    $completion = Get-Content -Raw $completed[0].FullName | ConvertFrom-Json
    if (!$completion.actualAllSuccessful -or
        ($Mode -ceq 'characterize' -and ($completion.actualSemanticRecords -ne 33 -or
            $completion.actualBenchmarkLifecycleProfiles -ne 32 -or !$completion.actualPublicBaseTypedCopyAndDerivedProducers)) -or
        ($Mode -ceq 'measure' -and ($completion.actualReports -ne 32 -or !$completion.actualSourceComparisonMember)))
    {
        throw 'All predeclared source-variant semantic/benchmark cases must complete.'
    }
    [ordered]@{
        candidate='F036'; variant=$variant; actualNativeExitCode=$code; actualMode=$Mode; actualRound=$Round
        actualNativeProcessId=$nativeId; actualClosureBeforeAndAfterMatched=$true
        actualHarnessSha256=$manifest.actualHarnessSha256; actualHarnessPdbSha256=$manifest.actualHarnessPdbSha256
        actualPreparationLabel=$Preparation; actualTimingProfile=$Mode -eq 'measure'
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $execution 'verified-native-exit.json') -Encoding utf8NoBOM
    if ($Mode -eq 'measure')
    {
        $budget.nativeProfilesCompleted += [ordered]@{
            round=$Round; variant=$variant; label=$Label; actualNativeExitCode=$code
            actualCompleted=[DateTimeOffset]::UtcNow.ToString('o')
        }
        if (@($budget.nativeProfilesCompleted | Where-Object round -eq $Round).Count -eq 2)
        {
            $budget.actualSourceComparisonsCompleted++
            $budget.comparisonsSettled += [ordered]@{
                round=$Round; actualCompletedPair=$true; actualBothThirtyTwoProfileMembersPassed=$true
            }
        }
        $budget.actualSourceComparisonsConcluded = @($budget.comparisonsSettled).Count
        $budget.sourceComparisonBudgetClosed = $budget.actualSourceComparisonsConcluded -eq 3
        $budget | ConvertTo-Json -Depth 15 | Set-Content $budgetFile -Encoding utf8NoBOM
    }
}
finally
{
    Pop-Location
    $lock.Dispose()
    Remove-Item -LiteralPath $lockFile
}
