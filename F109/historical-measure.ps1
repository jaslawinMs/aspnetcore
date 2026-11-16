param(
    [ValidateRange(1,3)][int]$Comparison=1,
    [Parameter(Mandatory)][ValidateSet('original','candidate1','candidate2','candidate3')][string]$Variant,
    [switch]$Reverse
)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F109'
$destination=Join-Path $run "measurements\comparison$Comparison\$Variant"
if (Test-Path $destination) { throw 'Retain actual profile attempts;never silently rerun or overwrite.' }
node (Join-Path $PSScriptRoot 'F109-closure.mjs') $run $Variant --verify
if ($LASTEXITCODE) { throw 'Actual frozen complete execution image differs before profiling.' }
$manifest=Get-Content (Join-Path $run "$Variant-manifest.json") -Raw|ConvertFrom-Json
$probe=Get-Content (Join-Path $run "verification\frozen-$Variant\states\contract-resources.json") -Raw|ConvertFrom-Json
if ($probe.contracts.Count -ne 33 -or $probe.independentContractRuns -ne 66 -or $probe.resources.Count -ne 165 -or
    $probe.harnessSha256 -cne $manifest.harnessSha256 -or $probe.ownerSha256 -cne $manifest.actualOwners[0].sha256 -or
    -not $probe.allCompleteOutcomesAndExactContractsPassed)
{
    throw 'The actual complete frozen public-producer contracts must pass for this exact image.'
}
$budgetPath=Join-Path $run 'measurement-budget.json'
if (Test-Path $budgetPath)
{
    $budget=Get-Content $budgetPath -Raw|ConvertFrom-Json
}
else
{
    $budget=[pscustomobject][ordered]@{
        candidate='F109';maximumSourceComparisons=3;startedSourceComparisons=0;completedSourceComparisons=0
        originalProfilesStarted=0;originalProfilesCompleted=0;candidateProfilesStarted=0;candidateProfilesCompleted=0
        completedProfiles=@();closed=$false
        note='Each source comparison is a sequential33-case original/candidate pair using identical frozen harness/runtime/config/shared synthetic inputs/keys. Development probes/equivalence diagnostics are not source comparisons. All actual attempts retained.'
    }
}
if ($budget.closed -or $budget.maximumSourceComparisons -ne 3) { throw 'The fixed campaign budget is closed or differs.' }
$firstHalf=if ($Reverse) {$Variant -cne 'original'} else {$Variant -ceq 'original'}
if ($firstHalf)
{
    if ($budget.startedSourceComparisons -ne ($Comparison-1) -or $budget.completedSourceComparisons -ne ($Comparison-1))
    {
        throw 'Start only the next sequential comparison after the preceding one completes.'
    }
    $budget.startedSourceComparisons++
}
else
{
    if ($budget.startedSourceComparisons -ne $Comparison -or $budget.completedSourceComparisons -ne ($Comparison-1) -or
        @($budget.completedProfiles|Where-Object {
            $_.comparison -eq $Comparison -and (($_.variant -ceq 'original') -ne ($Variant -ceq 'original'))
        }).Count -ne 1)
    {
        throw 'Exactly one completed opposite variant is required before the second half.'
    }
}
if ($Variant -ceq 'original')
{
    $budget.originalProfilesStarted++
}
else
{
    $budget.candidateProfilesStarted++
}
$budget|ConvertTo-Json -Depth 8|Set-Content $budgetPath -Encoding utf8
New-Item -ItemType Directory -Path $destination -Force|Out-Null
$arguments=@((Join-Path $run "binaries\$Variant\AutoPerf.Benchmarks.dll"),'--filter','*TokenValidationBenchmark*','--inProcess',
    '--exporters','json','csv','--artifacts',$destination,'--job','Short','--warmupCount','3','--iterationCount','8',
    '--iterationTime','100','--outliers','DontRemove','--fixture',(Join-Path $run 'synthetic-fixture'),'--variant',$Variant)
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $destination 'console.log')
$code=$LASTEXITCODE
[ordered]@{
    candidate='F109';comparison=$Comparison;variant=$Variant;arguments=$arguments;exitCode=$code
    startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o');sdk=(dotnet --version)
    expectedCases=33;expectedRetainedResultsPerCase=8;sourceComparison=$true
    pairOrder=$(if ($Reverse) {'candidate-first'} else {'original-first'})
    harnessSha256=$manifest.harnessSha256;actualOwners=$manifest.actualOwners
    scope='Actual complete public UserManager verification/registered provider/real persisted public Data Protection/synchronous in-memory store. No hosted throughput,external-store I/O or observed malformed-token frequency claim.'
}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $destination 'execution.json') -Encoding utf8
if ($code) { throw 'Actual BDN process failed;retain failure and started budget.' }
$reports=@(Get-ChildItem (Join-Path $destination 'results') -Filter '*-report-full*.json' -File)
if ($reports.Count -ne 1) { throw 'Exactly one complete actual BDN JSON report is required.' }
$report=Get-Content $reports[0].FullName -Raw|ConvertFrom-Json
$setups=@(Get-ChildItem (Join-Path $destination 'states') -Filter 'setup-*.json' -File)
if ($report.Benchmarks.Count -ne 33 -or @($report.Benchmarks|Where-Object {$_.Statistics.N -ne 8}).Count -or $setups.Count -ne 33)
{
    throw 'All33 actual benchmark results/eight retained samples/source-defined complete setups are required.'
}
foreach ($file in $setups)
{
    $setup=Get-Content $file.FullName -Raw|ConvertFrom-Json
    if ($setup.variant -cne $Variant -or $setup.harnessSha256 -cne $manifest.harnessSha256 -or
        $setup.ownerSha256 -cne $manifest.actualOwners[0].sha256 -or $setup.completeRunsCheckedOutsideTiming -ne 2 -or
        $setup.input.sha256 -cne (Get-FileHash (Join-Path $run "synthetic-fixture\case-inputs\$($setup.label).json")).Hash)
    {
        throw 'An actual complete setup/harness/owner/shared-input witness differs.'
    }
}
$budget.completedProfiles=@($budget.completedProfiles)+[pscustomobject]@{
    comparison=$Comparison;variant=$Variant;cases=33;reportSha256=(Get-FileHash $reports[0].FullName).Hash
    startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
}
if ($Variant -ceq 'original')
{
    $budget.originalProfilesCompleted++
}
else
{
    $budget.candidateProfilesCompleted++
}
if (-not $firstHalf)
{
    $budget.completedSourceComparisons++
}
$budget|ConvertTo-Json -Depth 8|Set-Content $budgetPath -Encoding utf8
node (Join-Path $PSScriptRoot 'F109-closure.mjs') $run $Variant --verify
if ($LASTEXITCODE) { throw 'The frozen complete image changed during the actual profile.' }
Get-Content (Join-Path $destination 'console.log') -Tail 48
Write-Output "F109 comparison$Comparison/$Variant all33 actual profiles/eight retained samples/66 complete setup contracts verified."
