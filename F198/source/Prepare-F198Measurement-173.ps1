$ErrorActionPreference = 'Stop'
$base = Join-Path $PSScriptRoot 'autoperf-parallelism\finding-F198-158'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F198'
$planHash = '448B26429F40AD582CB9C72F327549D24238974A82E8B060CA9C977CFDAB611F'
if (Test-Path -LiteralPath $run) { throw 'Preserve existing F198 run state.' }
if (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'autoperf-parallelism\benchmark-exclusive.lease.json'))
{
    throw 'A benchmark lease blocks preparation.'
}

function Assert-Hash([string]$Path, [string]$Expected)
{
    if ((Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash -cne $Expected)
    {
        throw "Accepted source or image changed: $Path"
    }
}

function Write-NewJson([string]$Path, $Value)
{
    $stream = [IO.File]::Open($Path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    try
    {
        $bytes = [Text.Encoding]::UTF8.GetBytes(($Value | ConvertTo-Json -Depth 20))
        $stream.Write($bytes)
    }
    finally
    {
        $stream.Dispose()
    }
}

Assert-Hash (Join-Path $base 'plan.json') $planHash
Assert-Hash (Join-Path $base 'TransportConnectionManagerBenchmark.cs') 'CC7C2FE781011DD41DCEDCF1E95037A0D412FA5949B27D036A25D4F0EA4646B1'
Assert-Hash (Join-Path $base 'consumer-163\Program.cs') '16841FD20191A00BFD582360FBD514F9516AE50040A09485B576C88C717700EA'
$launcher = Join-Path $PSScriptRoot 'autoperf-runs\F142-common\Invoke-MeasurementChild.ps1'
Assert-Hash $launcher '611CF0C7A98CAA3BF79BBBED27A0D96F6427EC2AD3E7BD37972ADDC37C139B74'
$images = @()
foreach ($kind in @('Perf', 'Native'))
{
    foreach ($variant in @('Baseline', 'Candidate'))
    {
        $directory = Join-Path $base "images-169\$kind\$variant"
        $inventoryPath = Join-Path $base "images-169\$kind-$variant-inventory.json"
        $inventory = @(Get-Content -LiteralPath $inventoryPath -Raw | ConvertFrom-Json)
        $actualFiles = @(Get-ChildItem -LiteralPath $directory -File -Recurse -Force)
        $actualPaths = @($actualFiles | ForEach-Object { $_.FullName.Substring($directory.Length + 1) })
        if ($actualFiles.Count -ne $inventory.Count -or @(Compare-Object @($inventory.path) $actualPaths -CaseSensitive).Count)
        {
            throw "Post-execution causal membership changed: $directory"
        }
        foreach ($file in $inventory)
        {
            $path = Join-Path $directory $file.path
            if ((Get-Item -LiteralPath $path).Length -ne $file.bytes) { throw "Image length changed: $path" }
            Assert-Hash $path $file.sha256
        }
        $images += [ordered]@{
            kind = $kind
            variant = $variant
            root = $directory
            inventoryPath = $inventoryPath
            inventorySha256 = (Get-FileHash -LiteralPath $inventoryPath -Algorithm SHA256).Hash
            actualFilesVerified = $inventory.Count
        }
    }
}

$evidence = @()
$nativeLives = @{}
$specs = [ordered]@{}
foreach ($variant in @('Baseline', 'Candidate'))
{
    $inspection = Join-Path $base "causal-acceptance-169\$variant\inspection"
    $native = Join-Path $base "causal-native-171\$variant\Native"
    $specPath = Join-Path $base "images-169\$variant-inspection-spec.json"
    $spec = Get-Content -LiteralPath $specPath -Raw | ConvertFrom-Json
    $common = Get-Content -LiteralPath (Join-Path $inspection 'inspection.json') -Raw | ConvertFrom-Json
    $complete = Get-Content -LiteralPath (Join-Path $inspection 'completion.json') -Raw | ConvertFrom-Json
    $validation = @(Get-Content -LiteralPath (Join-Path $inspection 'config-validation.json') -Raw | ConvertFrom-Json)
    if (-not $complete.Passed -or $complete.Mode -cne 'inspect' -or
        $complete.Role -cne "Original-$variant" -or $validation.Count -ne 0 -or
        -not $common.ActualAllFourCustomIsSupportedCallsPassed -or -not $common.ActualCompleteConfigValidationClean -or
        -not $common.ActualNoEngineOrCounters -or $common.ExecuteCalls -ne 0 -or
        @(Compare-Object @('WrongGcRejected', 'MultipleInvocationsRejected', 'StockExecutorRejected') @($common.NegativeControls)).Count)
    {
        throw "Actual custom support/configuration/negative controls differ: $variant"
    }
    if ($common.Cases.Count -ne 4 -or @(Compare-Object @(0, 1, 16, 256) @($common.Cases.ConnectionCount)).Count)
    {
        throw "Actual real-producer case membership differs: $variant"
    }
    foreach ($case in $common.Cases)
    {
        if ($case.ActualCloseRequested -ne $case.ConnectionCount -or
            $case.ActualExecutionTasksCompleted -ne $case.ConnectionCount -or
            $case.ActualDelegatesCompleted -ne $case.ConnectionCount -or $case.ActualRemainingConnections -ne 0 -or
            $case.ActualCloseResult -ne $true -or $case.ActualPrivateExecutionTaskOrCallbackInjected -ne $false)
        {
            throw "Actual producer assertions differ: $variant/$($case.ConnectionCount)"
        }
    }
    foreach ($pin in @($spec.Owner, $spec.Fixture, $spec.CoreLib))
    {
        Assert-Hash $pin.Path $pin.Sha256
        $loaded = @($complete.Assemblies | Where-Object Path -eq $pin.Path)
        if ($loaded.Count -ne 1 -or $loaded[0].Sha256 -cne $pin.Sha256 -or $loaded[0].Mvid -cne $pin.Mvid)
        {
            throw "Actual loaded causal/common runtime pin differs: $variant"
        }
    }
    [xml]$trx = Get-Content -LiteralPath (Join-Path $native 'F198-native.trx') -Raw
    $rows = @($trx.SelectNodes('//*[local-name()="UnitTestResult"]'))
    $methods = @($trx.SelectNodes('//*[local-name()="TestDefinitions"]/*[local-name()="UnitTest"]/*[local-name()="TestMethod"]') | ForEach-Object name)
    $expected = @('Http1Connection_ServerShutdown_Abort', 'Http1Connection_ServerShutdown_Graceful')
    $life = Get-Content -LiteralPath (Join-Path $native 'lifecycle.json') -Raw | ConvertFrom-Json -DateKind String
    if ($rows.Count -ne 2 -or @($rows | Where-Object outcome -cne 'Passed').Count -ne 0 -or
        @(Compare-Object $expected $methods).Count -ne 0 -or $life.actualExitCode -ne 0 -or
        -not $life.actualDirectChildAwaitedToExit -or -not $life.actualBothStreamsDrained)
    {
        throw "Actual two owning native rows/direct-root completion differ: $variant"
    }
    $nativeLives[$variant] = $life
    $specs[$variant] = $spec
    foreach ($path in @(
        $specPath,
        (Join-Path $inspection 'inspection.json'), (Join-Path $inspection 'completion.json'),
        (Join-Path $inspection 'identity.json'), (Join-Path $inspection 'config-validation.json'),
        (Join-Path $native 'F198-native.trx'), (Join-Path $native 'lifecycle.json'),
        (Join-Path $native 'accepted-rows.json')))
    {
        $evidence += [ordered]@{ path = $path; sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }
    }
}
if ([DateTimeOffset]::Parse($nativeLives.Baseline.completedAtUtc) -gt [DateTimeOffset]::Parse($nativeLives.Candidate.actualChildCreationUtc))
{
    throw 'Accepted native executions overlapped their shared assembly log directory.'
}

$null = New-Item -ItemType Directory -Path $run
Copy-Item -LiteralPath (Join-Path $base 'plan.json') -Destination (Join-Path $run 'plan.json')
Write-NewJson (Join-Path $run 'plan-seal.json') ([ordered]@{
    sha256 = $planHash
    frozenSourceSealPath = Join-Path $base 'plan-seal.json'
    frozenSourceSealSha256 = (Get-FileHash -LiteralPath (Join-Path $base 'plan-seal.json') -Algorithm SHA256).Hash
    originalFrozenUtc = '2026-11-20T20:44:31.9821774Z'
})
$compatibilityPath = Join-Path $run 'compatibility-173.json'
Write-NewJson $compatibilityPath ([ordered]@{
    findingId = 'F198'
    sourceRole = 'Original'
    actualAcceptedUtc = [DateTime]::UtcNow.ToString('o')
    planSha256 = $planHash
    actualPostExecutionAllImageBytesAndMembershipVerified = $true
    actualNativePassedRowsPerVariant = 2
    actualCommonRealProducerCasesPerVariant = 4
    actualCustomSupportAndCompleteConfigurationAccepted = $true
    actualNegativeControlsPerVariant = 3
    actualExecutorCalls = 0
    actualNativeExecutionsWereSerialized = $true
    actualNativeCasePhaseClrOrMvidDirectlySampled = $false
    actualCommonOwnerFixtureCoreLibDirectlySampled = $true
    priorFailedNativeTrx = Join-Path $base 'causal-acceptance-169\Candidate\Native\F198-native.trx'
    priorFailureBoundary = 'LoggedTest.Initialize before useful logger/material test assertion. Native170 intervals overlapped; byte-common test assembly embeds the same log-root attribute. Source demonstrates a possible shared file-log race, but the original swallowed initialization exception was not recovered; no verified race or framework regression claim.'
    images = $images
    evidence = $evidence
    noMeasurementAuthorizationYet = $true
})
Write-NewJson (Join-Path $run 'diagnostic-budget.json') ([ordered]@{
    findingId = 'F198'
    maximumAuthorizations = 3
    oneComparisonPerSourceRole = $true
    noRetryAfterFailedOrPartialComparison = $true
    sourceRoleOrder = @('Original', 'ObservedDefault')
    closed = $false
    authorizations = @()
})
Write-NewJson (Join-Path $run 'driver-config-173.json') ([ordered]@{
    findingId = 'F198'
    allowedSourceRole = 'Original'
    activationSourceRoot = 'C:\src\ap-F198-o158'
    planSha256 = $planHash
    compatibilityPath = $compatibilityPath
    compatibilitySha256 = (Get-FileHash -LiteralPath $compatibilityPath -Algorithm SHA256).Hash
    launcherPath = $launcher
    launcherSha256 = '611CF0C7A98CAA3BF79BBBED27A0D96F6427EC2AD3E7BD37972ADDC37C139B74'
    specimens = $specs
    adapterFile = 'AutoPerf.F198.Benchmark163.dll'
    actualDefaultComparisonNotAuthorized = $true
})
Write-NewJson (Join-Path $run 'preparation-173.json') ([ordered]@{
    source = $PSCommandPath
    sha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    completedUtc = [DateTime]::UtcNow.ToString('o')
    actualNoEngineOrCounters = $true
    actualAuthorizations = 0
})
Write-Output "F198_ACCEPTED_RUN_STATE=$run"
