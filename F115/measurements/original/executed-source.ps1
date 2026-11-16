$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F115'
$directory=Join-Path $run 'measurements\original'
$budgetPath=Join-Path $run 'measurement-budget.json'
$budget=Get-Content $budgetPath -Raw|ConvertFrom-Json
if ((Test-Path $directory) -or $budget.closed -or $budget.actualSourceComparisons -ne 0 -or
    $budget.originalPressureProfilesStarted -ne 0 -or $budget.candidateSourceShapes.Count -ne 0 -or
    @(git status --porcelain --untracked-files=no).Count -or
    (git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5') {throw 'Only one new original-pressure profile on unchanged baseline permitted.'}
$characterization=Get-Content (Join-Path $run 'characterization\original\execution.json') -Raw|ConvertFrom-Json
$pdb=Get-Content (Join-Path $run 'symbols\original\commands.json') -Raw|ConvertFrom-Json
if ($characterization.exitCode -ne 0 -or $pdb.commands.Count -ne 15 -or @($pdb.commands|Where-Object exitCode -NE 0).Count) {throw 'All original contracts/calipers and selected source-document checks required.'}
node (Join-Path $PSScriptRoot 'F115-closure.mjs') $run --verify
if ($LASTEXITCODE) {throw 'Complete frozen original image differs.'}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$powerBefore=@(powercfg /GETACTIVESCHEME)
if ($LASTEXITCODE) {throw 'Read-only existing power scheme unavailable.'}
$machine=[ordered]@{
    candidate='F115';observedAt=[DateTimeOffset]::UtcNow.ToString('o')
    os=Get-CimInstance Win32_OperatingSystem|Select-Object Caption,Version,OSArchitecture,LastBootUpTime
    cpu=@(Get-CimInstance Win32_Processor|Select-Object Name,NumberOfCores,NumberOfLogicalProcessors)
    computer=Get-CimInstance Win32_ComputerSystem|Select-Object Manufacturer,Model,TotalPhysicalMemory
    powerSchemeBefore=$powerBefore;sharedMachine=$true;idleOrContinuousOsTraceClaimed=$false
}
$machine|ConvertTo-Json -Depth 7|Set-Content (Join-Path $directory 'preprofile-machine-observation.json') -Encoding utf8
$arguments=@((Join-Path $run 'binaries\original\AutoPerf.Benchmarks.dll'),'--fixture',(Join-Path $run 'fixture'),
    '--artifacts',$directory,'--filter','*ListReadBenchmark*','--exporters','json','csv',
    '--warmupCount','3','--iterationCount','8','--iterationTime','100','--outliers','DontRemove')
$budget.originalPressureProfilesStarted=1
$budget|ConvertTo-Json -Depth 7|Set-Content $budgetPath -Encoding utf8
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log');$code=$LASTEXITCODE
$powerAfter=@(powercfg /GETACTIVESCHEME)
if ($LASTEXITCODE) {throw 'Read-only postprofile power scheme unavailable.'}
[ordered]@{
    candidate='F115';variant='original';entryPoint='dotnet';arguments=$arguments;exitCode=$code;expectedCases=28
    startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o');powerSchemeBefore=$powerBefore;powerSchemeAfter=$powerAfter
    sourceComparison=$false;sourceChanged=$false;processPriorityAffinityOrPowerChangedByHarness=$false
    note='One original-pressure sweep,not a before/after comparison. Stock emitted generator/builder/RunnableProgram/engine with settings-preserving custom executor and Guid.Empty power plan;point observations are not continuous OS tracing.'
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 30
if ($code -or ($powerBefore -join "`n") -cne ($powerAfter -join "`n")) {throw 'Actual original profile failed or power observations differ;preserve this attempt,never silently rerun.'}
$reports=@(Get-ChildItem (Join-Path $directory 'results') -Filter '*-full.json')
if ($reports.Count -ne 1) {throw 'Exactly one actual full original report required.'}
$report=Get-Content $reports[0].FullName -Raw|ConvertFrom-Json
if ($report.Benchmarks.Count -ne 28 -or @($report.Benchmarks|Where-Object {@($_.Measurements|Where-Object {$_.IterationMode -eq 'Workload' -and $_.IterationStage -eq 'Result'}).Count -ne 8}).Count) {throw 'Every actual original case must retain all eight requested results.'}
node (Join-Path $PSScriptRoot 'F115-closure.mjs') $run --verify
if ($LASTEXITCODE) {throw 'Frozen complete image changed during timing.'}
Write-Output 'F115:28 actual original-pressure outcomes/eight retained each;zero source comparisons,all settings/producer/hash witnesses retained.'
