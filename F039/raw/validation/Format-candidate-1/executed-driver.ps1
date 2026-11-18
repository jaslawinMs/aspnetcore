param(
    [Parameter(Mandatory)]
    [ValidateSet('Tests', 'SampleBuild', 'HarnessRestore', 'HarnessBuild', 'Format')]
    [string]$Task,
    [Parameter(Mandatory)]
    [ValidateSet('original', 'candidate')]
    [string]$Variant,
    [int]$Attempt = 1
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F039'
$directory = Join-Path $run "validation\$Task-$Variant-$Attempt"
if (Test-Path -LiteralPath $directory)
{
    throw "Do not overwrite validation evidence: $directory"
}
$plan = Get-Content -Raw -LiteralPath (Join-Path $run 'acceptance-plan.json') | ConvertFrom-Json
$owner = Join-Path $root 'src\Components\Endpoints\src\TempData\TempData.cs'
$ownerBefore = (Get-FileHash -LiteralPath $owner -Algorithm SHA256).Hash
if ($Variant -eq 'original' -and $ownerBefore -cne $plan.actualOriginalOwnerSha256)
{
    throw 'The original owner no longer matches the pre-edit acceptance witness.'
}
New-Item -ItemType Directory -Path $directory | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $directory 'executed-driver.ps1')
if ($Task -in @('HarnessRestore', 'HarnessBuild'))
{
    $inputDirectory = Join-Path $directory 'harness-inputs'
    New-Item -ItemType Directory -Path $inputDirectory | Out-Null
    $inputs = @(Get-ChildItem -LiteralPath (Join-Path $run 'harness') -File |
        Where-Object { $_.Extension -in @('.cs', '.csproj') } | ForEach-Object {
            Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $inputDirectory $_.Name)
            [ordered]@{file=$_.Name;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash}
        })
    $inputs | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $directory 'harness-input-manifest.json') -Encoding utf8NoBOM
}
Set-Location $root
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:UseIisNativeAssets = 'false'
$env:AUTOPERF_ASPNETCORE_ROOT = $root
$common = @('-m:2', '-nr:false', '--verbosity', 'quiet', '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false')
$testProject = 'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj'
$sampleProject = 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj'
$harnessProject = Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'
$arguments = switch ($Task)
{
    'Tests' {
        @('test', $testProject, '--configuration', 'Release', '--no-restore') + $common +
        @('--filter', 'FullyQualifiedName~TempData', '--logger', 'trx;LogFileName=TempData.trx', '--results-directory', $directory)
    }
    'SampleBuild' {
        @('build', $sampleProject, '--configuration', 'Release', '--no-restore') + $common
    }
    'HarnessRestore' {
        @('restore', $harnessProject) + $common
    }
    'HarnessBuild' {
        @('build', $harnessProject, '--configuration', 'Release', '--no-restore') + $common
    }
    'Format' {
        @('format', 'whitespace', $testProject, '--no-restore', '--verify-no-changes', '--include', $owner,
            (Join-Path $root 'src\Components\Endpoints\test\TempData\TempDataTest.cs'), '--verbosity', 'quiet')
    }
}
$start = [DateTime]::UtcNow
& dotnet @arguments 1> (Join-Path $directory 'stdout.log') 2> (Join-Path $directory 'stderr.log')
$nativeExit = $LASTEXITCODE
$ownerAfter = (Get-FileHash -LiteralPath $owner -Algorithm SHA256).Hash
$binary = Join-Path $root 'artifacts\bin\Microsoft.AspNetCore.Components.Endpoints\Release\net12.0\Microsoft.AspNetCore.Components.Endpoints.dll'
$binaryHash = if (Test-Path -LiteralPath $binary) { (Get-FileHash -LiteralPath $binary -Algorithm SHA256).Hash } else { $null }
[ordered]@{
    candidate = 'F039'
    task = $Task
    variant = $Variant
    attempt = $Attempt
    executable = (Get-Command dotnet).Source
    arguments = $arguments
    actualExitCode = $nativeExit
    startedUtc = $start.ToString('O')
    finishedUtc = [DateTime]::UtcNow.ToString('O')
    ownerSourceBeforeSha256 = $ownerBefore
    ownerSourceAfterSha256 = $ownerAfter
    actualOwnerProduct = $binary
    actualOwnerProductSha256 = $binaryHash
    maximumMsbuildWorkers = 2
    sharedMachineNotIsolated = $true
    actualRestoreCommand = $Task -eq 'HarnessRestore'
    actualExecutedDriverSha256 = (Get-FileHash -LiteralPath (Join-Path $directory 'executed-driver.ps1') -Algorithm SHA256).Hash
} | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $directory 'command.json') -Encoding utf8NoBOM
Get-Content -LiteralPath (Join-Path $directory 'stdout.log') -Tail 18
Get-Content -LiteralPath (Join-Path $directory 'stderr.log') -Tail 10
if ($nativeExit -ne 0)
{
    throw "F039 $Task failed with actual native exit $nativeExit; preserve this evidence and investigate."
}
if ($ownerBefore -cne $ownerAfter)
{
    throw 'The source owner changed during validation.'
}
if ($Task -eq 'Tests')
{
    [xml]$trx = Get-Content -Raw -LiteralPath (Join-Path $directory 'TempData.trx')
    $definitions = @{}
    foreach ($test in $trx.TestRun.TestDefinitions.UnitTest)
    {
        $definitions[$test.id] = $test.TestMethod
    }
    $rows = @($trx.TestRun.Results.UnitTestResult | ForEach-Object {
        $method = $definitions[$_.testId]
        [ordered]@{
            testName = $_.testName
            outcome = $_.outcome
            executionId = $_.executionId
            testId = $_.testId
            className = $method.className
            methodName = $method.name
        }
    })
    $rows | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $directory 'all-trx-rows.json') -Encoding utf8NoBOM
    $bad = @($rows | Where-Object { $_.outcome -ne 'Passed' })
    $unique = @($rows.executionId | Sort-Object -Unique)
    if ($rows.Count -eq 0 -or $bad.Count -ne 0 -or $unique.Count -ne $rows.Count -or
        [int]$trx.TestRun.ResultSummary.Counters.total -ne $rows.Count)
    {
        throw "Invalid/incomplete TempData rows: total$($rows.Count),nonPassed$($bad.Count),unique$($unique.Count)."
    }
    $required = @('Get_ConsumesValue_WhenFirstAccessTriggersLazyLoad', 'Indexer_ConsumesValue_WhenFirstAccessTriggersLazyLoad',
        'Remove_RemovesValue_WhenFirstAccessTriggersLazyLoad', 'Keep_RetainsAllKeys_WhenFirstAccessTriggersLazyLoad',
        'Enumerator_IteratesAllKeys_WhenFirstAccessTriggersLazyLoad')
    foreach ($name in $required)
    {
        if (@($rows | Where-Object { $_.methodName -eq $name }).Count -ne 1)
        {
            throw "Expected one successful existing lazy-load fact: $name"
        }
    }
    [ordered]@{
        candidate = 'F039'
        variant = $Variant
        actualRows = $rows.Count
        actualPassed = $rows.Count
        actualSkipped = 0
        actualAllExecutionIdsUnique = $true
        actualAllRowsIndependentlyParsed = $true
        actualRequiredExistingLazyLoadFacts = $required
    } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $directory 'verified-result.json') -Encoding utf8NoBOM
    Write-Output "F039:$Variant TempData: $($rows.Count) passed, 0 skipped; every TRX row inspected."
}
