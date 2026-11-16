param([ValidateRange(1,3)][int]$Round=1,[ValidateSet('original','candidate1')][string]$Variant='original')
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F116'
$label="round$Round-$Variant"
$directory=Join-Path $run "measurements\$label"
if (Test-Path $directory) {throw 'Never overwrite an actual measured profile attempt.'}
$ready=Get-Content (Join-Path $run "$Variant-ready.json") -Raw|ConvertFrom-Json
$pdb=Get-Content (Join-Path $run "pdb\$Variant\document-audit.json") -Raw|ConvertFrom-Json
if ($pdb.verifiedDocuments -ne 20) {throw 'All20 actual source-document identities required before timing.'}
node (Join-Path $PSScriptRoot 'F116-closure.mjs') $run $ready.manifest '--verify'
if ($LASTEXITCODE) {throw 'Exact frozen application/runtime closure changed before timing.'}
$budgetFile=Join-Path $run 'measurement-budget.json'
$budget=Get-Content $budgetFile -Raw|ConvertFrom-Json
if ($budget.closed -or $budget.maximumSourceComparisons -ne 3 -or $budget.startedSourceComparisons -gt 3 -or
    $label -cin @($budget.completedProfiles)) {throw 'Closed/exhausted/duplicate measurement forbidden.'}
if ($Variant -ceq 'candidate1')
{
    if ($Round -ne $budget.startedSourceComparisons+1 -or $Round -gt 3) {throw 'Exactly one new source comparison may start at each candidate launch,max3.'}
    $budget.startedSourceComparisons=$Round
    $budget.candidateProfilesStarted++
}
else
{
    if ($Round -gt $budget.startedSourceComparisons+1) {throw 'Original profile must belong to current/next bounded comparison.'}
    $budget.originalProfilesStarted++
}
$budget.note='Actual started profiles counted before child invocation;max3 candidate comparisons. Characterization/build/PDB probes are not timing comparisons. Original/candidate order is retained in each execution receipt;do not rerun timing for postprocessing failures.'
$budget|ConvertTo-Json -Depth 9|Set-Content $budgetFile -Encoding utf8
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$arguments=@((Join-Path (Join-Path $run $ready.imageRelative) 'AutoPerf.Benchmarks.dll'),'--fixture',(Join-Path $run $ready.fixtureRelative),
    '--variant',$Variant,'--artifacts',$directory,'--filter','*PortBenchmark*','--exporters','json','csv','--warmupCount','3',
    '--iterationCount','8','--iterationTime','100','--launchCount','1','--outliers','DontRemove')
$started=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log')
$code=$LASTEXITCODE
[ordered]@{candidate='F116';round=$Round;variant=$Variant;entryPoint='dotnet';arguments=$arguments;exitCode=$code
    startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o');manifest=$ready.manifest;cpuHeavyOperationsSerialized=$true
}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
if ($code) {Get-Content (Join-Path $directory 'console.log') -Tail 35;throw 'Actual measured profile failed;preserve attempt/budget and inspect,never automatically rerun.'}
$reports=@(Get-ChildItem (Join-Path $directory 'results') -File -Filter '*-report-full*.json')
if ($reports.Count -ne 1) {throw 'One actual full compressed/uncompressed JSON report required;do not rerun timing for report lookup.'}
$report=Get-Content $reports[0].FullName -Raw|ConvertFrom-Json
if ($report.Benchmarks.Count -ne 24 -or @($report.Benchmarks|Where-Object {$_.Statistics.N -ne 8}).Count) {throw 'All24 cases/eight retained each required;do not fabricate missing results.'}
$budget=Get-Content $budgetFile -Raw|ConvertFrom-Json
$budget.completedProfiles=@($budget.completedProfiles)+$label
if ("round$Round-original" -cin @($budget.completedProfiles) -and "round$Round-candidate1" -cin @($budget.completedProfiles))
{
    $budget.completedSourceComparisons++
}
$budget|ConvertTo-Json -Depth 9|Set-Content $budgetFile -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 8
Write-Output "F116:$label actual24-case/eight-retained sweep completed,shared-machine settings-preserving job."
