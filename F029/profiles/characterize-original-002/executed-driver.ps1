param(
    [Parameter(Mandatory)]
    [ValidateSet('characterize', 'diagnose')]
    [string]$Mode,
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label,
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Preparation = 'preparation-002'
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F029'
$manifest = Get-Content -Raw -LiteralPath (Join-Path $run "$Preparation\prepared\capsule.json") | ConvertFrom-Json
$prepared = Split-Path $manifest.closurePath -Parent
$output = $manifest.output
$execution = Join-Path $run "profiles\$Label"
$budgetFile = Join-Path $run 'measurement-budget.json'
$lockFile = Join-Path $run 'actual-profile.lock'
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual F029 native profile.'
}
$lock = [IO.File]::Open($lockFile, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
Push-Location $root
try
{
    . .\activate.ps1
    foreach ($entry in $manifest.sourceFiles)
    {
        if ((Get-FileHash -LiteralPath (Join-Path $prepared $entry.path)).Hash -cne $entry.sha256)
        {
            throw 'The frozen actual producer/harness source changed.'
        }
    }
    $closure = Get-Content -Raw -LiteralPath $manifest.closurePath | ConvertFrom-Json
    foreach ($entry in $closure.files)
    {
        if ((Get-FileHash -LiteralPath (Join-Path $output $entry.path)).Hash -cne $entry.sha256)
        {
            throw "An actual consumer closure file differs:$($entry.path)"
        }
    }
    if (@(Get-ChildItem -LiteralPath $output -Recurse -File -Force).Count -ne $closure.files.Count)
    {
        throw 'The actual consumer closure file set differs.'
    }
    New-Item -ItemType Directory -Path $execution | Out-Null
    Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
    if ($Mode -eq 'diagnose')
    {
        $budget = Get-Content -Raw -LiteralPath $budgetFile | ConvertFrom-Json
        $characterized = Get-Content -Raw -LiteralPath (Join-Path $run "profiles\$($budget.authoritative_characterization)\verified-native-exit.json") | ConvertFrom-Json
        if ($Preparation -cne $budget.authoritative_preparation -or !$budget.source_comparison_budget_closed -or
            $budget.actual_source_comparisons_started -ne 0 -or $budget.actual_diagnostic_profiles_started -ne 0 -or
            $budget.maximum_original_diagnostic_profiles -ne 1 -or !$budget.original_only_diagnostic_authorized -or
            $characterized.actualNativeExitCode -ne 0 -or $characterized.actualHarnessSha256 -cne $manifest.actualHarnessSha256)
        {
            throw 'Only one explicitly authorized original diagnostic may follow actual characterization. Never retime another consumer.'
        }
        $budget.actual_diagnostic_profiles_started++
        $budget.profilesStarted += [ordered]@{
            label = $Label; mode = $Mode; sourceComparison = $false
            actualStartedBeforeNativeLaunch = [DateTimeOffset]::UtcNow.ToString('o')
        }
        $budget | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath $budgetFile -Encoding utf8NoBOM
        Copy-Item -LiteralPath $budgetFile -Destination (Join-Path $execution 'budget-before-native-launch.json')
    }
    $arguments = @((Join-Path $output 'AutoPerf.Benchmarks.dll'), '--mode', $Mode,
        '--sources', $manifest.sources, '--closure', $manifest.closurePath, '--artifacts', $execution)
    if ($Mode -eq 'diagnose')
    {
        $arguments += @('--filter', '*')
    }
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @arguments 1> (Join-Path $execution 'native.stdout') 2> (Join-Path $execution 'native.stderr')
    $code = $LASTEXITCODE
    [ordered]@{
        executable = (Get-Command dotnet).Source; arguments = $arguments; workingDirectory = $root
        mode = $Mode; actualSourceHeadAtOwnerBuild = $manifest.actualSourceHeadAtBuild
        actualShippingChanges = 0; actualHarnessSha256 = $manifest.actualHarnessSha256
        actualClosureSha256 = (Get-FileHash -LiteralPath $manifest.closurePath).Hash
        actualClosureFileCount = $closure.files.Count; actualSourceComparisons = 0
        started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o'); actualExitCode = $code
        actualTimingProfile = $Mode -eq 'diagnose'; originalOnlyDiagnostic = $Mode -eq 'diagnose'
        processPolicy = 'Direct settings-preserving emitter. Never set priority,affinity or power.'
    } | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $execution 'invocation.json') -Encoding utf8NoBOM
    foreach ($entry in $closure.files)
    {
        if ((Get-FileHash -LiteralPath (Join-Path $output $entry.path)).Hash -cne $entry.sha256)
        {
            throw 'An actual consumer closure file changed while the native profile ran.'
        }
    }
    Get-Content -LiteralPath (Join-Path $execution 'native.stdout') -Tail 22
    if ($code -ne 0)
    {
        Get-Content -LiteralPath (Join-Path $execution 'native.stderr') -Tail 22
        throw "The actual original/$Mode profile exited $code. Preserve it and any consumed slot."
    }
    [ordered]@{
        candidate = 'F029'; actualNativeExitCode = $code; actualClosureBeforeAndAfterMatched = $true
        actualHarnessSha256 = $manifest.actualHarnessSha256; actualPreparationLabel = $Preparation
        actualTimingProfile = $Mode -eq 'diagnose'; sourceComparison = $false; actualShippingChanges = 0
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $execution 'verified-native-exit.json') -Encoding utf8NoBOM
}
finally
{
    Pop-Location
    $lock.Dispose()
    Remove-Item -LiteralPath $lockFile
}
