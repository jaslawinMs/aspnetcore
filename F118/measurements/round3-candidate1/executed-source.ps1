param([ValidateRange(1,3)][int]$Round=1,[ValidateSet('original','candidate1')][string]$Variant='original')
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F118'
$label="round$Round-$Variant"
$directory=Join-Path $run "measurements\$label"
if(Test-Path $directory){throw 'Never overwrite or rerun an actual timing profile.'}
$ready=Get-Content (Join-Path $run "$Variant-ready.json") -Raw|ConvertFrom-Json
foreach($name in 'original','candidate1')
{
    $pdb=Get-Content (Join-Path $run "pdb\$name\document-audit.json") -Raw|ConvertFrom-Json
    if($pdb.verifiedDocuments -ne 24){throw 'Both exact24-document original/candidate source audits required before timing.'}
}
node (Join-Path $PSScriptRoot 'F118-closure.mjs') $run $ready.manifest '--verify'
if($LASTEXITCODE){throw 'Exact frozen application closure changed before timing.'}
& (Join-Path $PSScriptRoot 'F118-runtime.ps1') -Verify
$budgetFile=Join-Path $run 'measurement-budget.json'
$budget=Get-Content $budgetFile -Raw|ConvertFrom-Json
$order=@('round1-original','round1-candidate1','round2-candidate1','round2-original','round3-original','round3-candidate1')
if($budget.closed -or $budget.maximumSourceComparisons -ne 3 -or $budget.candidateSourceShapes.Count -ne 1 -or
    $budget.completedProfiles.Count -ge 6 -or $label -cne $order[$budget.completedProfiles.Count] -or
    $budget.originalProfilesStarted+$budget.candidateProfilesStarted -ne $budget.completedProfiles.Count){throw 'Exact bounded source-comparison order/no duplicate or failed-profile rerun required.'}
$source='src\Mvc\Mvc.Razor\src\TagHelpers\UrlResolutionTagHelper.cs'
if((Get-FileHash $source).Hash -cne $budget.candidateSourceShapes[0].sourceSha256 -or
    (git branch --show-current).Trim() -cne 'autoperf/F118-url-resolution-writer'){throw 'Only frozen selected source shape may be evaluated.'}
if($Round -gt $budget.startedSourceComparisons){$budget.startedSourceComparisons=$Round}
if($Variant -ceq 'candidate1'){$budget.candidateProfilesStarted++}else{$budget.originalProfilesStarted++}
$budget.note='Actual source comparison counted before its first profile;maximum3 comparisons/one selected source shape. Exact order original/candidate,candidate/original,original/candidate. No profile rerun for postprocessing failures;early stop allowed for a clear grounded large improvement.'
$budget|ConvertTo-Json -Depth 9|Set-Content $budgetFile -Encoding utf8
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$arguments=@((Join-Path (Join-Path $run $ready.imageRelative) 'AutoPerf.Benchmarks.dll'),'--fixture',(Join-Path $run $ready.fixtureRelative),
    '--variant',$Variant,'--artifacts',$directory,'--filter','*UrlBenchmark*','--exporters','json','csv','--warmupCount','3',
    '--iterationCount','8','--iterationTime','100','--launchCount','1','--outliers','DontRemove')
$started=[DateTimeOffset]::UtcNow.ToString('o')
& dotnet @arguments *> (Join-Path $directory 'console.log')
$code=$LASTEXITCODE
[ordered]@{candidate='F118';round=$Round;variant=$Variant;entryPoint='dotnet';arguments=$arguments;exitCode=$code
    startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o');manifest=$ready.manifest;cpuHeavyOperationsSerialized=$true
}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
if($code){Get-Content (Join-Path $directory 'console.log') -Tail 35;throw 'Actual measured profile failed;preserve attempt/budget and inspect,never automatically rerun.'}
$reports=@(Get-ChildItem (Join-Path $directory 'results') -File -Filter '*-report-full*.json')
if($reports.Count -ne 1){throw 'One actual full JSON report required;never rerun timing for report lookup.'}
$report=Get-Content $reports[0].FullName -Raw|ConvertFrom-Json
if($report.Benchmarks.Count -ne 24 -or @($report.Benchmarks|Where-Object {$_.Statistics.N -ne 8}).Count){throw 'All24 cases/eight retained each required;never fabricate missing outcomes.'}
$budget=Get-Content $budgetFile -Raw|ConvertFrom-Json
$budget.completedProfiles=@($budget.completedProfiles)+$label
if("round$Round-original" -cin @($budget.completedProfiles) -and "round$Round-candidate1" -cin @($budget.completedProfiles)){$budget.completedSourceComparisons++}
$budget|ConvertTo-Json -Depth 9|Set-Content $budgetFile -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 8
Write-Output "F118:$label actual24-case/eight-retained sweep completed,shared-machine settings-preserving job."
