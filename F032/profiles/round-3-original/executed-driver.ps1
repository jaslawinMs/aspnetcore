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
$run = Join-Path $PSScriptRoot 'autoperf-runs\F032'
$manifest = Get-Content -Raw (Join-Path $run "$Preparation\prepared\capsule.json") | ConvertFrom-Json
$prepared = Split-Path $manifest.closurePath -Parent
$output = $manifest.output
$variant = $manifest.variant
$execution = Join-Path $run "profiles\$Label"
$budgetFile = Join-Path $run 'measurement-budget.json'
$lockFile = Join-Path $run 'actual-profile.lock'
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual F032 native profile.'
}
$lock = [IO.File]::Open($lockFile, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
Push-Location $root
try
{
    . .\activate.ps1
    if (!$manifest.actualWhitespaceVerifiedBeforeFreeze -or $variant -notin @('original', 'candidate'))
    {
        throw 'Require a preformatted explicitly bound owner variant.'
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
            throw "Actual consumer closure file differs: $($entry.path)"
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
        $next = @($budget.nativeProfilesStarted).Count
        $expectedRound = @($budget.comparisonsSettled).Count + 1
        $startedInRound = @($budget.nativeProfilesStarted | Where-Object round -eq $Round).Count
        $completedInRound = @($budget.nativeProfilesCompleted | Where-Object round -eq $Round).Count
        if ($budget.sourceComparisonBudgetClosed -or $budget.maximumActualSourceComparisons -ne 3 -or
            $next -ge 6 -or $Round -ne $expectedRound -or
            $startedInRound -ge 2 -or $completedInRound -ne $startedInRound -or
            $budget.pairedOrder[$Round - 1][$startedInRound] -cne $variant -or
            $Preparation -cne $budget.authoritativePreparations.$variant -or
            $Label -cne "round-$Round-$variant")
        {
            throw 'Only the next member of the predeclared bounded paired order may start.'
        }
        foreach ($name in @('original', 'candidate'))
        {
            $contracts = Get-Content -Raw (Join-Path $run "profiles\$($budget.authoritativeCharacterizations.$name)\verified-native-exit.json") | ConvertFrom-Json
            $ownerManifest = Get-Content -Raw (Join-Path $run "$($budget.authoritativePreparations.$name)\prepared\capsule.json") | ConvertFrom-Json
            if ($contracts.actualNativeExitCode -ne 0 -or $contracts.actualMode -cne 'characterize' -or
                $contracts.actualHarnessSha256 -cne $manifest.actualHarnessSha256 -or
                $ownerManifest.actualHarnessSha256 -cne $manifest.actualHarnessSha256 -or
                $ownerManifest.actualHarnessPdbSha256 -cne $manifest.actualHarnessPdbSha256)
            {
                throw 'Both actually characterized images must use this byte-identical frozen harness DLL/PDB.'
            }
        }
        if ($startedInRound -eq 0)
        {
            if ($budget.actualSourceComparisonsStarted -ne ($Round - 1))
            {
                throw 'Unexpected prior comparison count.'
            }
            $budget.actualSourceComparisonsStarted++
        }
        $budget.nativeProfilesStarted += [ordered]@{
            round = $Round; variant = $variant; label = $Label; preparation = $Preparation
            actualStartedBeforeNativeLaunch = [DateTimeOffset]::UtcNow.ToString('o')
        }
        $budget | ConvertTo-Json -Depth 15 | Set-Content $budgetFile -Encoding utf8NoBOM
        Copy-Item -LiteralPath $budgetFile -Destination (Join-Path $execution 'budget-before-native-launch.json')
    }
    elseif ($Round -ne 0)
    {
        throw 'Untimed characterization is not a source-comparison slot.'
    }
    $arguments = @((Join-Path $output 'AutoPerf.Benchmarks.dll'), '--mode', $Mode,
        '--sources', $manifest.sources, '--closure', $manifest.closurePath, '--artifacts', $execution)
    if ($Mode -eq 'measure')
    {
        $arguments += @('--filter', '*')
    }
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @arguments 1> (Join-Path $execution 'native.stdout') 2> (Join-Path $execution 'native.stderr')
    $code = $LASTEXITCODE
    [ordered]@{
        executable = (Get-Command dotnet).Source; arguments = $arguments; workingDirectory = $root
        mode = $Mode; variant = $variant; round = $Round; preparation = $Preparation
        actualSourceHeadAtOwnerBuild = $manifest.actualSourceHeadAtBuild
        actualHarnessSha256 = $manifest.actualHarnessSha256; actualHarnessPdbSha256 = $manifest.actualHarnessPdbSha256
        actualClosureSha256 = (Get-FileHash -LiteralPath $manifest.closurePath).Hash
        actualClosureFileCount = $closure.files.Count
        started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o'); actualExitCode = $code
        actualTimingProfile = $Mode -eq 'measure'
        processPolicy = 'Direct settings-preserving emitter;never set priority,affinity or power.'
    } | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $execution 'invocation.json') -Encoding utf8NoBOM
    foreach ($entry in $closure.files)
    {
        if ((Get-FileHash -LiteralPath (Join-Path $output $entry.path)).Hash -cne $entry.sha256)
        {
            throw 'Actual consumer file changed during execution.'
        }
    }
    Get-Content (Join-Path $execution 'native.stdout') -Tail 24
    if ($code -ne 0)
    {
        if ($Mode -eq 'measure')
        {
            $budget.comparisonsSettled += [ordered]@{
                round = $Round; actualCompletedPair = $false; actualFailedLabel = $Label
                actualFailedNativeExitCode = $code; actualFailedAttemptConsumesSourceComparison = $true
            }
            $budget.actualSourceComparisonsConcluded = @($budget.comparisonsSettled).Count
            $budget.sourceComparisonBudgetClosed = $budget.actualSourceComparisonsConcluded -eq $budget.maximumActualSourceComparisons
            $budget | ConvertTo-Json -Depth 15 | Set-Content $budgetFile -Encoding utf8NoBOM
        }
        Get-Content (Join-Path $execution 'native.stderr') -Tail 24
        throw "Actual $Mode exited $code;retain the attempt and any consumed slot."
    }
    if ($Mode -eq 'characterize')
    {
        $completed = @(Get-ChildItem -LiteralPath (Join-Path $execution 'states') -Filter '*-characterization-completed.json' -File)
        if ($completed.Count -ne 1)
        {
            throw 'Zero process exit alone does not establish all producer contracts.'
        }
        $actualContracts = Get-Content -Raw $completed[0].FullName | ConvertFrom-Json
        if (!$actualContracts.actualAllSuccessful -or $actualContracts.actualCompletedProfiles -ne 6 -or
            $actualContracts.actualAdditionalProducerContracts -ne 12 -or
            $actualContracts.actualBenchmarkLifecycleProfiles -ne 6 -or
            !$actualContracts.actualRealHttpSysHostAndAcceptedRequest)
        {
            throw 'All predeclared actual HTTP.sys producer and wire cases must complete.'
        }
    }
    [ordered]@{
        candidate = 'F032'; variant = $variant; actualNativeExitCode = $code; actualMode = $Mode; actualRound = $Round
        actualClosureBeforeAndAfterMatched = $true; actualHarnessSha256 = $manifest.actualHarnessSha256
        actualHarnessPdbSha256 = $manifest.actualHarnessPdbSha256; actualPreparationLabel = $Preparation
        actualTimingProfile = $Mode -eq 'measure'
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $execution 'verified-native-exit.json') -Encoding utf8NoBOM
    if ($Mode -eq 'measure')
    {
        $budget.nativeProfilesCompleted += [ordered]@{
            round = $Round; variant = $variant; label = $Label; actualNativeExitCode = $code
            actualCompleted = [DateTimeOffset]::UtcNow.ToString('o')
        }
        if (@($budget.nativeProfilesCompleted | Where-Object round -eq $Round).Count -eq 2)
        {
            $budget.actualSourceComparisonsCompleted++
            $budget.comparisonsSettled += [ordered]@{
                round = $Round; actualCompletedPair = $true; actualBothSixProfileMembersPassed = $true
            }
        }
        $budget.actualSourceComparisonsConcluded = @($budget.comparisonsSettled).Count
        $budget.sourceComparisonBudgetClosed = $budget.actualSourceComparisonsConcluded -eq $budget.maximumActualSourceComparisons
        $budget | ConvertTo-Json -Depth 15 | Set-Content $budgetFile -Encoding utf8NoBOM
    }
}
finally
{
    Pop-Location
    $lock.Dispose()
    Remove-Item -LiteralPath $lockFile
}
