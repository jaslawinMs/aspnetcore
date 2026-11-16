param([Parameter(Mandatory)][ValidateSet(2,3)][int]$Comparison)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F103'
$budgetPath = Join-Path $run 'measurement-budget.json'
$budget = Get-Content $budgetPath -Raw | ConvertFrom-Json
if ($budget.closed -or $budget.completedSourceComparisons -ne $Comparison - 1 -or
    $budget.startedSourceComparisons -ne $Comparison - 1 -or $budget.originalSweepsCompleted -ne $Comparison - 1)
{
    throw 'Matched reference repeat is only allowed inside the next of at most3 actual comparisons.'
}
$label = "original-$Comparison"
$destination = Join-Path $run "measurements\$label"
if (Test-Path $destination) { throw 'Actual matched reference exists;do not overwrite/rerun.' }
node (Join-Path $PSScriptRoot 'F103-closure.mjs') $run original --verify
if ($LASTEXITCODE) { throw 'Original closure changed before matched reference.' }
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$budget.originalSweepsStarted++
$budget.note = 'At most3 actual source comparisons;comparison1 retains the initial fixed original,comparisons2/3 include fresh paired original controls because timing moved even in fully populated controls. No causal global speedup claim. All original/candidate raw outcomes retained.'
$budget | ConvertTo-Json -Depth 6 | Set-Content $budgetPath
$a = @((Join-Path $run 'binaries\original\AutoPerf.Benchmarks.dll'),'--filter','*AnalyzerBenchmark*','--inProcess',
    '--exporters','json','csv','--artifacts',$destination,'--job','Short','--warmupCount','3','--iterationCount','8',
    '--iterationTime','100','--outliers','DontRemove')
$started = [DateTimeOffset]::UtcNow.ToString('o')
dotnet @a *> (Join-Path $destination 'console.log')
$code = $LASTEXITCODE
[ordered]@{candidate='F103';variant='original';label=$label;matchedReferenceForComparison=$Comparison;arguments=$a;
    startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o');exitCode=$code;sdk=(dotnet --version);
    expectedCases=10;expectedRetainedResultsPerCase=8;sourceComparison=$false;
    note='Fresh exact-frozen-original control inside comparison budget;retained because sequential timing shifts also affected populated-map controls.'} |
    ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run "execution-$label.json")
if ($code) { throw 'Matched original control failed;preserve actual outcome.' }
$f = @(Get-ChildItem (Join-Path $destination 'results') -Filter '*-report-full*.json' -File)
if ($f.Count -ne 1) { throw 'Matched original full result report missing.' }
$report = Get-Content $f[0].FullName -Raw | ConvertFrom-Json
if ($report.Benchmarks.Count -ne 10 -or @($report.Benchmarks | Where-Object { $_.Statistics.N -ne 8 }).Count)
{
    throw 'Matched original requires10 actual cases/eight retained samples,not just zero exit.'
}
$budget.originalSweepsCompleted++
$budget | ConvertTo-Json -Depth 6 | Set-Content $budgetPath
node (Join-Path $PSScriptRoot 'F103-closure.mjs') $run original --verify
if ($LASTEXITCODE) { throw 'Original closure changed during matched control.' }
Write-Output "F103 comparison$Comparison matched original10-case control completed;all earlier originals retained."
