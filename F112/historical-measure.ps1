param(
    [ValidateRange(1,3)][int]$Comparison=1,
    [Parameter(Mandatory)][ValidateSet('original','candidate1','candidate2','candidate3')][string]$Variant,
    [switch]$Reverse
)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F112'
$destination=Join-Path $run "measurements\comparison$Comparison\$Variant"
if (Test-Path $destination) { throw 'Never rerun or overwrite an actual F112 profile attempt.' }
node (Join-Path $PSScriptRoot 'F112-closure.mjs') $run $Variant --verify
if ($LASTEXITCODE) { throw 'Actual frozen complete execution image differs before profiling.' }
$manifest=Get-Content (Join-Path $run "$Variant-manifest.json") -Raw|ConvertFrom-Json
$states=Join-Path $run "characterization\$Variant\states"
$probe=Get-Content (Join-Path $states 'runtime.json') -Raw|ConvertFrom-Json
$contracts=@(Get-ChildItem $states -Filter 'contract-*.json' -File)
$fixture=Get-Content (Join-Path $run 'fixture\manifest.json') -Raw|ConvertFrom-Json
if ($contracts.Count -ne 28 -or $fixture.actualCases -ne 28 -or $probe.harness.sha256 -cne $manifest.harnessSha256 -or
    $probe.owner.sha256 -cne $manifest.ownerSha256) { throw 'All28 contracts must pass for this exact frozen owner/harness.' }
foreach ($file in $contracts)
{
    $contract=Get-Content $file.FullName -Raw|ConvertFrom-Json
    $input=@($fixture.files|Where-Object Label -CEQ $contract.Label)
    if ($input.Count -ne 1 -or $contract.inputSha256 -cne $input[0].inputSha256 -or
        $contract.outputSha256 -cne $input[0].outputSha256 -or -not $contract.exactOutputAndTypedRoundTrip -or
        -not $contract.actualRendererCreatedPropertySubscription -or -not $contract.noPartialReplacementOfFailingKey -or
        -not $contract.recoveryThroughSameProducer) { throw 'An exact source-defined producer/input/output/storage contract differs.' }
}
$budgetPath=Join-Path $run 'measurement-budget.json'
if (Test-Path $budgetPath) { $budget=Get-Content $budgetPath -Raw|ConvertFrom-Json }
else
{
    $budget=[pscustomobject][ordered]@{
        candidate='F112';maximumSourceComparisons=3;startedSourceComparisons=0;completedSourceComparisons=0
        originalProfilesStarted=0;originalProfilesCompleted=0;candidateProfilesStarted=0;candidateProfilesCompleted=0
        completedProfiles=@();closed=$false
        note='Each source comparison is a sequential28-case original/candidate pair using identical frozen harness/runtime/config/exact synthetic input/output fixtures. Original reproduction and associated allocation calipers are separately retained,not extra BDN timing sweeps.'
    }
}
if ($budget.closed -or $budget.maximumSourceComparisons -ne 3) { throw 'Fixed campaign budget is closed or differs.' }
$firstHalf=if ($Reverse) {$Variant -cne 'original'} else {$Variant -ceq 'original'}
if ($firstHalf)
{
    if ($budget.startedSourceComparisons -ne ($Comparison-1) -or $budget.completedSourceComparisons -ne ($Comparison-1)) { throw 'Only the next sequential comparison may start.' }
    $budget.startedSourceComparisons++
}
else
{
    if ($budget.startedSourceComparisons -ne $Comparison -or $budget.completedSourceComparisons -ne ($Comparison-1) -or
        @($budget.completedProfiles|Where-Object {$_.comparison -eq $Comparison -and (($_.variant -ceq 'original') -ne ($Variant -ceq 'original'))}).Count -ne 1) { throw 'One completed opposite half is required.' }
}
if ($Variant -ceq 'original') { $budget.originalProfilesStarted++ } else { $budget.candidateProfilesStarted++ }
$budget|ConvertTo-Json -Depth 8|Set-Content $budgetPath -Encoding utf8
New-Item -ItemType Directory -Path $destination -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
$arguments=@((Join-Path $run "binaries\$Variant\AutoPerf.Benchmarks.dll"),'--filter','*StoredValueBenchmark*','--inProcess',
    '--exporters','json','csv','--artifacts',$destination,'--job','Short','--warmupCount','3','--iterationCount','8',
    '--iterationTime','100','--outliers','DontRemove','--fixture',(Join-Path $run 'fixture'),'--variant',$Variant)
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $destination 'console.log')
$code=$LASTEXITCODE
[ordered]@{
    candidate='F112';comparison=$Comparison;variant=$Variant;arguments=$arguments;exitCode=$code
    startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o');sdk=(dotnet --version)
    expectedCases=28;expectedRetainedResultsPerCase=8;sourceComparison=$true;pairOrder=$(if ($Reverse) {'candidate-first'} else {'original-first'})
    harnessSha256=$manifest.harnessSha256;ownerSha256=$manifest.ownerSha256;sessionSha256=$manifest.sessionSha256
    scope='Actual registered serializer and synchronous real component-property session persistence through DistributedSession.Set. Real renderer-created subscriptions outside timing;unchanged bulk/null-removal controls. No HTTP,cache-I/O,production-frequency,cold/retained-pool claim.'
}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $destination 'execution.json') -Encoding utf8
if ($code) { throw 'Actual BDN process failed;retain failure and started budget.' }
$reports=@(Get-ChildItem (Join-Path $destination 'results') -Filter '*-report-full*.json' -File)
if ($reports.Count -ne 1) { throw 'Exactly one actual complete BDN JSON report required.' }
$report=Get-Content $reports[0].FullName -Raw|ConvertFrom-Json
$setups=@(Get-ChildItem (Join-Path $destination 'states') -Filter 'setup-*.json' -File)
if ($report.Benchmarks.Count -ne 28 -or @($report.Benchmarks|Where-Object {$_.Statistics.N -ne 8}).Count -or $setups.Count -ne 28) { throw 'All28 actual outcomes/eight retained samples/complete setups required.' }
foreach ($file in $setups)
{
    $setup=Get-Content $file.FullName -Raw|ConvertFrom-Json
    $expected=@($fixture.files|Where-Object Label -CEQ $setup.label)
    if ($setup.variant -cne $Variant -or $setup.harness.sha256 -cne $manifest.harnessSha256 -or
        $setup.owner.sha256 -cne $manifest.ownerSha256 -or $expected.Count -ne 1 -or
        $setup.contract.inputSha256 -cne $expected[0].inputSha256 -or $setup.contract.outputSha256 -cne $expected[0].outputSha256 -or
        -not $setup.contract.actualRendererCreatedPropertySubscription -or -not $setup.contract.exactOutputAndTypedRoundTrip) { throw 'Actual setup/owner/harness/shared-input witness differs.' }
}
$budget.completedProfiles=@($budget.completedProfiles)+[pscustomobject]@{
    comparison=$Comparison;variant=$Variant;cases=28;reportSha256=(Get-FileHash $reports[0].FullName).Hash;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
}
if ($Variant -ceq 'original') { $budget.originalProfilesCompleted++ } else { $budget.candidateProfilesCompleted++ }
if (-not $firstHalf) { $budget.completedSourceComparisons++ }
$budget|ConvertTo-Json -Depth 8|Set-Content $budgetPath -Encoding utf8
node (Join-Path $PSScriptRoot 'F112-closure.mjs') $run $Variant --verify
if ($LASTEXITCODE) { throw 'Frozen image changed during actual profile.' }
Get-Content (Join-Path $destination 'console.log') -Tail 40
Write-Output "F112 comparison$Comparison/$Variant all28actual outcomes/eight retained samples/complete source-defined setups verified."
