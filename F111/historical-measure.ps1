param(
    [ValidateRange(1,3)][int]$Comparison=1,
    [Parameter(Mandatory)][ValidateSet('original','candidate1','candidate2','candidate3')][string]$Variant,
    [switch]$Reverse
)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F111'
$destination=Join-Path $run "measurements\comparison$Comparison\$Variant"
if (Test-Path $destination) { throw 'Retain actual profile attempts;never silently rerun or overwrite.' }
node (Join-Path $PSScriptRoot 'F111-closure.mjs') $run $Variant --verify
if ($LASTEXITCODE) { throw 'Actual frozen complete execution image differs before profiling.' }
$manifest=Get-Content (Join-Path $run "$Variant-manifest.json") -Raw|ConvertFrom-Json
$characterization=Join-Path $run "characterization\$Variant"
$probe=Get-Content (Join-Path $characterization 'states\runtime.json') -Raw|ConvertFrom-Json
$contracts=@(Get-ChildItem (Join-Path $characterization 'states') -Filter 'contract-*.json' -File)
$fixture=Get-Content (Join-Path $run 'fixture\manifest.json') -Raw|ConvertFrom-Json
if ($contracts.Count -ne 28 -or $fixture.actualCases -ne 28 -or
    $probe.harness.sha256 -cne $manifest.harnessSha256 -or $probe.owner.sha256 -cne $manifest.ownerSha256)
{
    throw 'All28 actual complete producer contracts must pass for this exact frozen image.'
}
foreach ($file in $contracts)
{
    $contract=Get-Content $file.FullName -Raw|ConvertFrom-Json
    $input=@($fixture.files|Where-Object Label -CEQ $contract.Label)
    if ($input.Count -ne 1 -or $contract.inputSha256 -cne $input[0].inputSha256 -or
        $contract.outputSha256 -cne $input[0].outputSha256 -or -not $contract.exactOutputAndTypedRoundTrip -or
        -not $contract.noPartialSessionReplacement -or -not $contract.recoveryThroughSameProducer)
    {
        throw 'A source-defined complete input/output/type/storage contract differs.'
    }
}
$budgetPath=Join-Path $run 'measurement-budget.json'
if (Test-Path $budgetPath)
{
    $budget=Get-Content $budgetPath -Raw|ConvertFrom-Json
}
else
{
    $budget=[pscustomobject][ordered]@{
        candidate='F111';maximumSourceComparisons=3;startedSourceComparisons=0;completedSourceComparisons=0
        originalProfilesStarted=0;originalProfilesCompleted=0;candidateProfilesStarted=0;candidateProfilesCompleted=0
        completedProfiles=@();closed=$false
        note='Each source comparison is a sequential28-case original/candidate pair using identical frozen harness/runtime/config/exact synthetic input/output fixtures. Original reproduction and associated allocation calipers are retained separately;not extra BDN timing sweeps.'
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
if ($Variant -ceq 'original') { $budget.originalProfilesStarted++ }
else { $budget.candidateProfilesStarted++ }
$budget|ConvertTo-Json -Depth 8|Set-Content $budgetPath -Encoding utf8
New-Item -ItemType Directory -Path $destination -Force|Out-Null
$arguments=@((Join-Path $run "binaries\$Variant\AutoPerf.Benchmarks.dll"),'--filter','*StoredDataBenchmark*','--inProcess',
    '--exporters','json','csv','--artifacts',$destination,'--job','Short','--warmupCount','3','--iterationCount','8',
    '--iterationTime','100','--outliers','DontRemove','--fixture',(Join-Path $run 'fixture'),'--variant',$Variant)
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $destination 'console.log')
$code=$LASTEXITCODE
[ordered]@{
    candidate='F111';comparison=$Comparison;variant=$Variant;arguments=$arguments;exitCode=$code
    startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o');sdk=(dotnet --version)
    expectedCases=28;expectedRetainedResultsPerCase=8;sourceComparison=$true
    pairOrder=$(if ($Reverse) {'candidate-first'} else {'original-first'})
    harnessSha256=$manifest.harnessSha256;ownerSha256=$manifest.ownerSha256;sessionSha256=$manifest.sessionSha256
    scope='Actual registered serializer and synchronous pre-commit session saves;real DistributedSessionStore/MemoryDistributedCache. Unchanged SerializeValue/empty-save controls. No HTTP/cache-I/O/production-frequency claim.'
}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $destination 'execution.json') -Encoding utf8
if ($code) { throw 'Actual BDN process failed;retain failure and started budget.' }
$reports=@(Get-ChildItem (Join-Path $destination 'results') -Filter '*-report-full*.json' -File)
if ($reports.Count -ne 1) { throw 'Exactly one complete actual BDN JSON report is required.' }
$report=Get-Content $reports[0].FullName -Raw|ConvertFrom-Json
$setups=@(Get-ChildItem (Join-Path $destination 'states') -Filter 'setup-*.json' -File)
if ($report.Benchmarks.Count -ne 28 -or @($report.Benchmarks|Where-Object {$_.Statistics.N -ne 8}).Count -or $setups.Count -ne 28)
{
    throw 'All28 actual benchmark results/eight retained samples/source-defined complete setups are required.'
}
foreach ($file in $setups)
{
    $setup=Get-Content $file.FullName -Raw|ConvertFrom-Json
    $expected=@($fixture.files|Where-Object Label -CEQ $setup.label)
    if ($setup.variant -cne $Variant -or $setup.harness.sha256 -cne $manifest.harnessSha256 -or
        $setup.owner.sha256 -cne $manifest.ownerSha256 -or $expected.Count -ne 1 -or
        $setup.contract.inputSha256 -cne $expected[0].inputSha256 -or
        $setup.contract.outputSha256 -cne $expected[0].outputSha256 -or -not $setup.contract.exactOutputAndTypedRoundTrip)
    {
        throw 'An actual complete setup/harness/owner/shared-input witness differs.'
    }
}
$budget.completedProfiles=@($budget.completedProfiles)+[pscustomobject]@{
    comparison=$Comparison;variant=$Variant;cases=28;reportSha256=(Get-FileHash $reports[0].FullName).Hash
    startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
}
if ($Variant -ceq 'original') { $budget.originalProfilesCompleted++ }
else { $budget.candidateProfilesCompleted++ }
if (-not $firstHalf) { $budget.completedSourceComparisons++ }
$budget|ConvertTo-Json -Depth 8|Set-Content $budgetPath -Encoding utf8
node (Join-Path $PSScriptRoot 'F111-closure.mjs') $run $Variant --verify
if ($LASTEXITCODE) { throw 'The frozen complete image changed during the actual profile.' }
Get-Content (Join-Path $destination 'console.log') -Tail 48
Write-Output "F111 comparison$Comparison/$Variant all28actual outcomes/eight retained samples/complete setup contracts verified."
