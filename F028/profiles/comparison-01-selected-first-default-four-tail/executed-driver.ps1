param(
    [Parameter(Mandatory)]
    [ValidateSet('original','selected')]
    [string]$Variant,
    [Parameter(Mandatory)]
    [ValidateSet('characterize','measure','first-use')]
    [string]$Mode,
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label,
    [string]$FirstCase = '',
    [int]$Attempt = 0
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F028'
$manifest = Get-Content -Raw -LiteralPath (Join-Path $run 'prepared\capsule.json') | ConvertFrom-Json
$variantInfo = $manifest.variants.$Variant
$output = $manifest.output
$execution = Join-Path $run "profiles\$Label"
$budgetFile = Join-Path $run 'measurement-budget.json'
$lockFile = Join-Path $run 'actual-profile.lock'
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual owner profile.'
}
if ($Mode -eq 'characterize' -and ($Attempt -ne 0 -or $FirstCase))
{
    throw 'Untimed characterization is not a hidden timing attempt.'
}
if ($Mode -eq 'first-use' -and $FirstCase -cnotin @('Default.Four.Tail','DerivedManager.Four.Tail'))
{
    throw 'Require an explicitly declared first-observed public case.'
}
$lock = [IO.File]::Open($lockFile, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
Push-Location $root
try
{
    . .\activate.ps1
    foreach ($entry in $variantInfo.sourceFiles)
    {
        if ((Get-FileHash -LiteralPath (Join-Path $variantInfo.directory $entry.path)).Hash -cne $entry.sha256)
        {
            throw 'The frozen actual owner/harness source changed.'
        }
    }
    foreach ($owner in $variantInfo.owners)
    {
        if ((Get-FileHash -LiteralPath $owner.source).Hash -cne $owner.sha256)
        {
            throw 'The captured owning DLL/PDB changed.'
        }
        Copy-Item -LiteralPath $owner.source -Destination (Join-Path $output $owner.name)
    }
    $closure = Get-Content -Raw -LiteralPath $variantInfo.closurePath | ConvertFrom-Json
    foreach ($entry in $closure.files)
    {
        if ((Get-FileHash -LiteralPath (Join-Path $output $entry.path)).Hash -cne $entry.sha256)
        {
            throw "An actual consumer closure file differs:$($entry.path)"
        }
    }
    if (@(Get-ChildItem -LiteralPath $output -Recurse -File).Count -ne $closure.files.Count)
    {
        throw 'The actual consumer closure file set differs.'
    }
    New-Item -ItemType Directory -Path $execution | Out-Null
    Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
    if ($Mode -ne 'characterize')
    {
        $budget = Get-Content -Raw -LiteralPath $budgetFile | ConvertFrom-Json
        $account = @($budget.attempts | Where-Object number -eq $Attempt)
        if ($Attempt -lt 1 -or $Attempt -gt 3 -or $budget.comparison_budget_closed -or $account.Count -ne 1 -or
            $budget.actual_comparisons_started -ne $Attempt -or $account[0].status -ne 'in_progress')
        {
            throw 'Record an open actual comparison slot before launching any timing,including first-use.'
        }
        $budget.actual_timing_profiles_started++
        $account[0].profilesStarted += [ordered]@{
            label = $Label; variant = $Variant; mode = $Mode; firstCase = $FirstCase
            actualStartedBeforeNativeLaunch = [DateTimeOffset]::UtcNow.ToString('o')
        }
        $budget | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $budgetFile -Encoding utf8NoBOM
        Copy-Item -LiteralPath $budgetFile -Destination (Join-Path $execution 'budget-before-native-launch.json')
    }
    $arguments = @((Join-Path $output 'AutoPerf.Benchmarks.dll'), '--mode', $Mode, '--context', $Variant,
        '--sources', $variantInfo.sources, '--closure', $variantInfo.closurePath, '--expected-owner',
        $variantInfo.owners[0].sha256, '--artifacts', $execution)
    if ($Mode -eq 'measure')
    {
        $arguments += @('--filter','*')
    }
    if ($Mode -eq 'first-use')
    {
        $arguments += @('--first-case',$FirstCase)
    }
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @arguments 1> (Join-Path $execution 'native.stdout') 2> (Join-Path $execution 'native.stderr')
    $code = $LASTEXITCODE
    [ordered]@{
        executable = (Get-Command dotnet).Source; arguments = $arguments; workingDirectory = $root
        variant = $Variant; mode = $Mode; actualSourceHeadAtOwnerBuild = $manifest.actualSourceHeadAtBuild
        actualBuiltAsBaselinePlusScopedUncommittedPatch = $manifest.actualBuiltAsBaselinePlusUncommittedScopedPatch
        actualOwnerSha256 = $variantInfo.owners[0].sha256; actualHarnessSha256 = $manifest.actualHarnessSha256
        actualClosureSha256 = (Get-FileHash -LiteralPath $variantInfo.closurePath).Hash
        actualClosureFileCount = $closure.files.Count; actualComparisonAttempt = $Attempt
        started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o'); actualExitCode = $code
        actualTimingProfile = $Mode -ne 'characterize'
        processPolicy = 'Direct settings-preserving emitter. Never set priority,affinity or power.'
    } | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $execution 'invocation.json') -Encoding utf8NoBOM
    foreach ($entry in $closure.files)
    {
        if ((Get-FileHash -LiteralPath (Join-Path $output $entry.path)).Hash -cne $entry.sha256)
        {
            throw 'An actual consumer closure file changed while the native profile ran.'
        }
    }
    Get-Content -LiteralPath (Join-Path $execution 'native.stdout') -Tail 18
    if ($code -ne 0)
    {
        Get-Content -LiteralPath (Join-Path $execution 'native.stderr') -Tail 20
        throw "The actual $Variant/$Mode profile exited $code. Preserve it and any consumed slot."
    }
    [ordered]@{
        candidate = 'F028'; actualNativeExitCode = $code; actualClosureBeforeAndAfterMatched = $true
        actualCommonHarnessSha256 = $manifest.actualHarnessSha256
        actualOnlyVariantDifferences = $manifest.actualOnlyClosureDifferences
        actualTimingProfile = $Mode -ne 'characterize'
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $execution 'verified-native-exit.json') -Encoding utf8NoBOM
}
finally
{
    foreach ($owner in $manifest.variants.selected.owners)
    {
        if ((Get-FileHash -LiteralPath $owner.source).Hash -cne $owner.sha256)
        {
            throw 'Do not restore a selected owner from an altered snapshot.'
        }
        Copy-Item -LiteralPath $owner.source -Destination (Join-Path $output $owner.name)
    }
    Pop-Location
    $lock.Dispose()
    Remove-Item -LiteralPath $lockFile
}
