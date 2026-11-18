param(
    [Parameter(Mandatory)]
    [ValidateSet('characterize', 'measure')]
    [string]$Mode,
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label,
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Preparation
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F036'
$manifest = Get-Content -Raw (Join-Path $run "$Preparation\prepared\capsule.json") | ConvertFrom-Json
$prepared = Split-Path $manifest.closurePath -Parent
$output = $manifest.output
$execution = Join-Path $run "profiles\$Label"
$budgetFile = Join-Path $run 'measurement-budget.json'
$lockFile = Join-Path $run 'actual-profile.lock'
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual F036 native profile.'
}
$lock = [IO.File]::Open($lockFile,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
Push-Location $root
try
{
    . .\activate.ps1
    if (!$manifest.actualWhitespaceVerifiedBeforeFreeze -or $manifest.variant -cne 'original' -or
        $manifest.actualShippingChanges -ne 0)
    {
        throw 'Require the explicitly frozen unchanged original owner.'
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
            throw "Actual consumer closure file differs:$($entry.path)"
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
        $seal = Get-Content -Raw (Join-Path $run 'measurement-plan-receipt.json') | ConvertFrom-Json
        $budget = Get-Content -Raw $budgetFile | ConvertFrom-Json
        if (!$seal.actualOriginalContractsAndLifecyclesPassed -or $seal.actualSemanticRecords -ne 33 -or
            $seal.actualBenchmarkLifecycles -ne 32 -or !$budget.sourceComparisonBudgetClosed -or
            $budget.actualSourceComparisonsStarted -ne 0 -or $budget.originalOnlyBudgetClosed -or
            $budget.authoritativePreparation -cne $Preparation -or
            @($budget.originalOnlyProfilesStarted).Count -ge 3 -or
            @($budget.originalOnlyProfilesConcluded).Count -ne @($budget.originalOnlyProfilesStarted).Count -or
            @($budget.originalOnlyProfilesConcluded | Where-Object actualPostExecutionVerificationPassed).Count)
        {
            throw 'Only one successful original-only diagnostic is allowed after all original contracts.'
        }
        foreach ($entry in $seal.sealedFiles)
        {
            if ((Get-FileHash -LiteralPath $entry.path).Hash -cne $entry.sha256)
            {
                throw 'Premeasurement sealed plan,source,contracts or image changed.'
            }
        }
        $budget.originalOnlyProfilesStarted += [ordered]@{
            label=$Label; preparation=$Preparation; actualStartedBeforeNativeLaunch=[DateTimeOffset]::UtcNow.ToString('o')
        }
        $budget | ConvertTo-Json -Depth 15 | Set-Content $budgetFile -Encoding utf8NoBOM
        Copy-Item -LiteralPath $budgetFile -Destination (Join-Path $execution 'budget-before-native-launch.json')
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
        executable=$executable; arguments=$arguments; workingDirectory=$root; mode=$Mode
        started=$started; actualNativeProcessNotYetStarted=$true; actualSourceComparisons=0
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
            throw 'Actual original native process did not start.'
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
        executable=$executable; arguments=$arguments; workingDirectory=$root; mode=$Mode; variant='original'
        preparation=$Preparation; actualNativeProcessId=$nativeId; actualSourceHeadAtOwnerBuild=$manifest.actualSourceHeadAtBuild
        actualHarnessSha256=$manifest.actualHarnessSha256; actualHarnessPdbSha256=$manifest.actualHarnessPdbSha256
        actualClosureSha256=(Get-FileHash -LiteralPath $manifest.closurePath).Hash; actualClosureFileCount=$closure.files.Count
        started=$started; completed=[DateTimeOffset]::UtcNow.ToString('o'); actualExitCode=$code
        actualOriginalOnlyTiming=$Mode -eq 'measure'; actualSourceComparisons=0
        processPolicy='Direct settings-preserving emitter;never set priority,affinity or power.'
    } | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $execution 'invocation.json') -Encoding utf8NoBOM
    if ($Mode -eq 'measure')
    {
        $conclusion = [pscustomobject]@{
            label=$Label; actualNativeExitCode=$code; actualPostExecutionVerificationPassed=$false
        }
        $budget.originalOnlyProfilesConcluded += $conclusion
        $budget | ConvertTo-Json -Depth 15 | Set-Content $budgetFile -Encoding utf8NoBOM
    }
    foreach ($entry in $closure.files)
    {
        if ((Get-FileHash -LiteralPath (Join-Path $output $entry.path)).Hash -cne $entry.sha256)
        {
            throw 'Actual consumer file changed during native execution.'
        }
    }
    Get-Content (Join-Path $execution 'native.stdout') -Tail 24
    if ($code -ne 0)
    {
        Get-Content (Join-Path $execution 'native.stderr') -Tail 24
        throw "Actual $Mode exited$code;retain the original-only attempt."
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
        ($Mode -ceq 'measure' -and ($completion.actualReports -ne 32 -or $completion.actualSourceComparisons -ne 0)))
    {
        throw 'All predeclared original semantic/benchmark cases must complete.'
    }
    [ordered]@{
        candidate='F036'; variant='original'; actualNativeExitCode=$code; actualMode=$Mode
        actualNativeProcessId=$nativeId; actualClosureBeforeAndAfterMatched=$true
        actualHarnessSha256=$manifest.actualHarnessSha256; actualHarnessPdbSha256=$manifest.actualHarnessPdbSha256
        actualPreparationLabel=$Preparation; actualOriginalOnlyTiming=$Mode -eq 'measure'; actualSourceComparisons=0
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $execution 'verified-native-exit.json') -Encoding utf8NoBOM
    if ($Mode -eq 'measure')
    {
        $conclusion.actualPostExecutionVerificationPassed = $true
        $budget.originalOnlyBudgetClosed = $true
        $budget | ConvertTo-Json -Depth 15 | Set-Content $budgetFile -Encoding utf8NoBOM
    }
}
finally
{
    Pop-Location
    $lock.Dispose()
    Remove-Item -LiteralPath $lockFile
}
