$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F036'
$receipt = Join-Path $run 'reproduction-verification.json'
$target = Join-Path $run 'independent-reproduction\harness'
if ((Test-Path -LiteralPath $receipt) -or (Test-Path -LiteralPath $target))
{
    throw 'Do not overwrite an actual independent F036 reproduction.'
}
$budget = Get-Content -Raw (Join-Path $run 'measurement-budget.json') | ConvertFrom-Json
if (!$budget.originalOnlyBudgetClosed -or !$budget.sourceComparisonBudgetClosed -or
    $budget.actualSourceComparisonsStarted -ne 0 -or
    @($budget.originalOnlyProfilesConcluded | Where-Object actualPostExecutionVerificationPassed).Count -ne 1)
{
    throw 'Finish the single original-only diagnostic before untimed independent reproduction.'
}
$source = Join-Path $run 'harness'
New-Item -ItemType Directory -Path $target | Out-Null
$names = @('AutoPerf.Benchmarks.csproj','Contracts.cs','EnumerationBenchmarks.cs','Program.cs','Scenario.cs','SettingsPreservingEmitToolchain.cs')
foreach ($name in $names)
{
    Copy-Item -LiteralPath (Join-Path $source $name) -Destination (Join-Path $target $name)
}
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $run 'independent-reproduction\executed-driver.ps1')
& (Join-Path $PSScriptRoot 'F036-prepare.ps1') -Label preparation-reproduction-original -HarnessDirectory $target
& (Join-Path $PSScriptRoot 'F036-run-profile.ps1') -Mode characterize `
    -Label characterize-reproduction-original -Preparation preparation-reproduction-original
$files = @(foreach ($name in $names)
{
    $before = (Get-FileHash -LiteralPath (Join-Path $source $name)).Hash
    $after = (Get-FileHash -LiteralPath (Join-Path $target $name)).Hash
    if ($before -cne $after)
    {
        throw 'Independent relocated source/project bytes differ after formatting/build.'
    }
    [ordered]@{file=$name; actualOriginalSha256=$before; actualReproductionSha256=$after; actualByteExact=$true}
})
$comparisons = @(foreach ($suffix in 'contracts','benchmark-lifecycles')
{
    $before = @(Get-ChildItem -LiteralPath (Join-Path $run 'profiles\characterize-original-001\states') -Filter "*-$suffix.json" -File)
    $after = @(Get-ChildItem -LiteralPath (Join-Path $run 'profiles\characterize-reproduction-original\states') -Filter "*-$suffix.json" -File)
    if ($before.Count -ne 1 -or $after.Count -ne 1)
    {
        throw 'Require both complete concrete-record collections.'
    }
    $beforeHash = (Get-FileHash -LiteralPath $before[0].FullName).Hash
    $afterHash = (Get-FileHash -LiteralPath $after[0].FullName).Hash
    if ($beforeHash -cne $afterHash)
    {
        throw 'Original and independently rebuilt complete semantic/lifecycle collections differ.'
    }
    $data = Get-Content -Raw $after[0].FullName | ConvertFrom-Json
    [ordered]@{
        collection=$suffix; actualOriginalSha256=$beforeHash; actualReproductionSha256=$afterHash
        actualRecordCount=@($data.records).Count; actualExactRecordBytesMatched=$true
    }
})
$native = Get-Content -Raw (Join-Path $run 'profiles\characterize-reproduction-original\verified-native-exit.json') | ConvertFrom-Json
if ($native.actualNativeExitCode -ne 0 -or $native.actualOriginalOnlyTiming -or $native.actualSourceComparisons -ne 0)
{
    throw 'Require a successful untimed independent native characterization.'
}
[ordered]@{
    candidate='F036'; actualIndependentRelocatedRebuildCompleted=$true; actualSixSourceProjectFilesByteExact=$true
    actualFiles=$files; actualRecordCollections=$comparisons; actualSemanticRecords=33; actualBenchmarkLifecycleProfiles=32
    actualNativeTimingRerun=$false; actualSourceComparisons=0
    actualRelocatedHarnessPePdbByteIdentityClaimed=$false
    limitation='Relocated build path may change harness PE/PDB identity. All6source/project files and both33/32record collections match byte-for-byte;actual new PE/PDB/source witnesses are separately retained.'
} | ConvertTo-Json -Depth 12 | Set-Content $receipt -Encoding utf8NoBOM
Write-Output 'F036 independent relocated rebuild:6byte-exact files;33semantic+32lifecycle records matched;no retiming.'
