param(
    [Parameter(Mandatory)]
    [ValidateSet('original', 'candidate')]
    [string]$Variant,
    [int]$Attempt = 1
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F038'
$directory = Join-Path $run "validation\$Variant-existing-$Attempt"
if (Test-Path -LiteralPath $directory)
{
    throw "Do not overwrite owning-test results: $directory"
}
New-Item -ItemType Directory -Path $directory | Out-Null
Set-Location $root
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$arguments = @('test', 'src\Components\Components\test\Microsoft.AspNetCore.Components.Tests.csproj',
    '--configuration', 'Release', '--no-restore', '-m:2', '-nr:false', '--verbosity', 'quiet',
    '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false',
    '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Components.Test.RenderTreeDiffBuilderTest',
    '--logger', "trx;LogFileName=F038-$Variant-$Attempt.trx", '--results-directory', $directory)
$start = [DateTime]::UtcNow
& dotnet @arguments 1> (Join-Path $directory 'stdout.log') 2> (Join-Path $directory 'stderr.log')
$nativeExit = $LASTEXITCODE
[ordered]@{
    candidate = 'F038'
    variant = $Variant
    attempt = $Attempt
    executable = (Get-Command dotnet).Source
    arguments = $arguments
    actualExitCode = $nativeExit
    startedUtc = $start.ToString('O')
    finishedUtc = [DateTime]::UtcNow.ToString('O')
} | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $directory 'command.json') -Encoding utf8NoBOM
Get-Content -LiteralPath (Join-Path $directory 'stdout.log') -Tail 25
Get-Content -LiteralPath (Join-Path $directory 'stderr.log') -Tail 10
if ($nativeExit -ne 0)
{
    throw "Owning-test command failed:$nativeExit"
}
[xml]$trx = Get-Content -Raw -LiteralPath (Join-Path $directory "F038-$Variant-$Attempt.trx")
$results = @($trx.TestRun.Results.UnitTestResult)
$definitions = @{}
foreach ($test in $trx.TestRun.TestDefinitions.UnitTest)
{
    $definitions[$test.id] = $test.TestMethod
}
$rows = @($results | ForEach-Object {
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
$foreign = @($rows | Where-Object { $_.className -notlike 'Microsoft.AspNetCore.Components.Test.RenderTreeDiffBuilderTest*' })
$unique = @($rows.executionId | Sort-Object -Unique)
if ($rows.Count -eq 0 -or $bad.Count -ne 0 -or $foreign.Count -ne 0 -or $unique.Count -ne $rows.Count)
{
    throw "Invalid or incomplete owning rows: total$($rows.Count),nonPassed$($bad.Count),foreign$($foreign.Count),uniqueExecutionIds$($unique.Count)."
}
if ([int]$trx.TestRun.ResultSummary.Counters.total -ne $rows.Count)
{
    throw 'TRX counters do not match independently parsed rows.'
}
$required = @('RejectsClashingKeysInOldTree', 'RejectsClashingKeysInNewTree', 'RejectsClashingKeysEvenIfAllPairsMatch',
    'RecognizesKeyedElementInsertions', 'RecognizesKeyedElementDeletions', 'RecognizesKeyedElementMoves',
    'RecognizesKeyedComponentInsertions', 'RecognizesKeyedComponentDeletions', 'RecognizesKeyedComponentMoves',
    'HandlesInsertionOfUnkeyedItemsAroundKey', 'HandlesDeletionOfUnkeyedItemsAroundKey',
    'HandlesKeyBeingAdded', 'HandlesKeyBeingRemoved', 'CanChangeFrameTypeWithMatchingKey')
foreach ($name in $required)
{
    if (@($rows | Where-Object { $_.methodName -eq $name }).Count -ne 1)
    {
        throw "Expected one fresh successful owning case:$name"
    }
}
$names = @($rows.testName | Sort-Object -CaseSensitive)
if ($Variant -eq 'candidate' -or $Attempt -gt 1)
{
    $baseline = @(Get-Content -Raw -LiteralPath (Join-Path $run 'validation\original-existing-1\all-trx-rows.json') | ConvertFrom-Json)
    if (($names | ConvertTo-Json -Compress) -cne (@($baseline.testName | Sort-Object -CaseSensitive) | ConvertTo-Json -Compress))
    {
        throw 'Fresh owning test-name multisets differ from the original run.'
    }
}
[ordered]@{candidate='F038';variant=$Variant;actualRows=$rows.Count;actualPassed=$rows.Count;actualSkipped=0;
    actualAllExecutionIdsUnique=$true;actualRequiredKeyedFacts=$required;actualAllRowsIndependentlyParsed=$true
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $directory 'verified-result.json') -Encoding utf8NoBOM
Write-Output "F038:$Variant owning RenderTreeDiffBuilderTest:$($rows.Count)passed,0skipped;allfresh rows independently checked."
