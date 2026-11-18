param([Parameter(Mandatory)][ValidateSet('Characterize', 'Measure')][string] $Mode)
$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F041'
$sourceManifest = Join-Path $run 'source-inputs.json'
$inputs = Get-Content -Raw -LiteralPath $sourceManifest | ConvertFrom-Json
$harnessSources = @(Get-Content -Raw -LiteralPath (Join-Path $run 'harness-source-hashes.json') | ConvertFrom-Json)
$closurePath = Join-Path $run 'consumer-closure.json'
$closure = Get-Content -Raw -LiteralPath $closurePath | ConvertFrom-Json
$consumer = Join-Path $run 'consumer-original'
foreach ($file in $inputs.sourceFiles)
{
    if ((Get-FileHash -LiteralPath (Join-Path $root $file.path) -Algorithm SHA256).Hash -cne $file.sha256)
    {
        throw "Selected source changed: $($file.path)"
    }
}
foreach ($file in $harnessSources)
{
    if ((Get-FileHash -LiteralPath (Join-Path $run "harness\$($file.path)") -Algorithm SHA256).Hash -cne $file.sha256)
    {
        throw "Measured harness source changed: $($file.path)"
    }
}
foreach ($file in $closure.files)
{
    if ((Get-FileHash -LiteralPath (Join-Path $consumer $file.path) -Algorithm SHA256).Hash -cne $file.sha256)
    {
        throw "Frozen original consumer changed: $($file.path)"
    }
}
$modeArgument = $Mode.ToLowerInvariant()
$directory = Join-Path $run "native-$modeArgument-001"
if (Test-Path -LiteralPath $directory)
{
    throw 'Do not overwrite a native attempt or silently reset its budget.'
}
if ($Mode -ceq 'Measure')
{
    $gate = Get-Content -Raw -LiteralPath (Join-Path $run 'native-characterize-001\verified-native.json') | ConvertFrom-Json
    if (-not $gate.actualCharacterizationPassed -or $gate.actualCharacterizationCases -ne 10 -or
        $gate.actualLifecycles -ne 6 -or $gate.actualEligibleDiscoveredCases -ne 6)
    {
        throw 'Require every predeclared untimed case and eligible BDN lifecycle before authorization.'
    }
    $budgetPath = Join-Path $run 'diagnostic-budget.json'
    if (Test-Path -LiteralPath $budgetPath)
    {
        throw 'The sole original-only diagnostic authorization is already consumed.'
    }
    $budget = [ordered]@{
        candidate = 'F041'
        actualAuthorizedOriginalOnlyInvocations = 1
        maximumAuthorizedOriginalOnlyInvocations = 1
        actualAuthorizedSourceComparisons = 0
        maximumSourceComparisonsIncludingFailures = 3
        actualOptimizedCandidateExists = $false
        actualGainOrNoGainClaimed = $false
        actualAuthorizationUtc = [DateTime]::UtcNow.ToString('O')
        actualBudgetPermanentlyClosedAfterThisAttempt = $true
    }
    [System.IO.File]::WriteAllText($budgetPath, ($budget | ConvertTo-Json -Depth 10) + "`n")
}
New-Item -ItemType Directory -Path $directory | Out-Null
$evidence = Join-Path $directory 'evidence'
New-Item -ItemType Directory -Path $evidence | Out-Null
Set-Location $root
. .\activate.ps1
$dotnet = (Get-Command dotnet).Source
$arguments = @((Join-Path $consumer 'AutoPerf.Benchmarks.dll'), $modeArgument, $evidence, $closurePath,
    $sourceManifest, $root, (Join-Path $directory 'reports'))
$record = [ordered]@{
    executable = $dotnet
    arguments = $arguments
    workingDirectory = $root
    startedUtc = [DateTime]::UtcNow.ToString('O')
    actualSourceComparison = $false
    actualOriginalOnly = $true
}
& $dotnet @arguments 1> (Join-Path $directory 'stdout.txt') 2> (Join-Path $directory 'stderr.txt')
$code = $LASTEXITCODE
$record.actualExitCode = $code
$record.completedUtc = [DateTime]::UtcNow.ToString('O')
[System.IO.File]::WriteAllText((Join-Path $directory 'command.json'), ($record | ConvertTo-Json -Depth 10) + "`n")
if ($code -ne 0)
{
    throw "The recorded $Mode native attempt failed with exit $code; preserve all partial evidence."
}
if ($Mode -ceq 'Characterize')
{
    $characterizationFiles = @(Get-ChildItem -LiteralPath $evidence -Filter '*-characterization.json' -File)
    $lifecycleFiles = @(Get-ChildItem -LiteralPath $evidence -Filter '*-all-lifecycles.json' -File)
    $discoveryFiles = @(Get-ChildItem -LiteralPath $evidence -Filter '*-benchmarkdotnet-discovery-preflight.json' -File)
    if ($characterizationFiles.Count -ne 1 -or $lifecycleFiles.Count -ne 1 -or $discoveryFiles.Count -ne 1)
    {
        throw 'Require actual complete native records, not an empty or stale success-shaped output.'
    }
    $characterization = Get-Content -Raw -LiteralPath $characterizationFiles[0].FullName | ConvertFrom-Json
    $lifecycle = Get-Content -Raw -LiteralPath $lifecycleFiles[0].FullName | ConvertFrom-Json
    $discovery = Get-Content -Raw -LiteralPath $discoveryFiles[0].FullName | ConvertFrom-Json
    if ($characterization.actualCases -ne 10 -or -not $characterization.actualEveryCasePassed -or
        @($characterization.cases | Where-Object passed -ne $true).Count -ne 0 -or
        $lifecycle.actualProfiles -ne 6 -or -not $lifecycle.actualEverySetupWorkloadCleanupPassed -or
        $discovery.actualDiscoveredCases -ne 6 -or -not $discovery.actualEligiblePublicNonSealedType)
    {
        throw 'Require every original-only semantic case and actual profile/lifecycle.'
    }
    $verified = [ordered]@{ actualCharacterizationPassed = $true; actualCharacterizationCases = 10
        actualLifecycles = 6; actualEligibleDiscoveredCases = 6; actualExitCode = $code }
    [System.IO.File]::WriteAllText((Join-Path $directory 'verified-native.json'), ($verified | ConvertTo-Json -Depth 10) + "`n")
}
Write-Output "$Mode original-only native invocation completed with actual exit $code. Source comparisons: 0; optimization gain claimed: false."
