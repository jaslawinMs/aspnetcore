param([Parameter(Mandatory)][ValidateSet('original','candidate-1','candidate-2','candidate-3')][string]$Variant)
$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
Set-Location $repo
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F103'
$destination = Join-Path $run "measurements\$Variant"
if (Test-Path $destination) { throw 'Actual sweep already exists;do not overwrite or rerun it.' }
node (Join-Path $PSScriptRoot 'F103-closure.mjs') $run $Variant --verify
if ($LASTEXITCODE) { throw 'Frozen closure changed before sweep.' }
$probe = Get-Content (Join-Path $run "verification\$Variant\states\actual-analyzer-contract-resources.json") -Raw | ConvertFrom-Json
$manifest = Get-Content (Join-Path $run "$Variant-manifest.json") -Raw | ConvertFrom-Json
if ($probe.observations.Count -ne 17 -or $probe.resources.Count -ne 10 -or $probe.producers.Count -ne 10 -or
    $probe.ownerSha256 -cne $manifest.ownerAssemblySha256 -or $probe.harnessSha256 -cne $manifest.harnessSha256)
{
    throw 'Actual frozen real-driver probe identity/cardinality is not green.'
}
$budgetPath = Join-Path $run 'measurement-budget.json'
if ($Variant -eq 'original')
{
    if (Test-Path $budgetPath) { throw 'Original measurement budget exists;inspect actual progress.' }
    $budget = [ordered]@{candidate='F103';maximumSourceComparisons=3;startedSourceComparisons=0;
        completedSourceComparisons=0;originalSweepsStarted=1;originalSweepsCompleted=0;closed=$false;
        note='One fixed original10-case reference sweep;at most3 actual source proposals compared to that reference. Harness/inputs/metadata/compiler/config/dependencies remain identical;only actual owner DLL/PDB may change. Complete fresh actual driver runs,not constructor microbenchmarks/full builds.'}
}
else
{
    $budget = Get-Content $budgetPath -Raw | ConvertFrom-Json
    $index = [int]$Variant.Substring($Variant.Length - 1)
    if ($budget.closed -or $budget.originalSweepsCompleted -ne $index -or $index -gt 3 -or
        $budget.startedSourceComparisons -ne $index - 1 -or $budget.completedSourceComparisons -ne $index - 1)
    {
        throw 'Source comparison budget/order mismatch;do not bypass previous outcome.'
    }
    $budget.startedSourceComparisons = $index
}
$budget | ConvertTo-Json -Depth 6 | Set-Content $budgetPath
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$a = @((Join-Path $run "binaries\$Variant\AutoPerf.Benchmarks.dll"),'--filter','*AnalyzerBenchmark*','--inProcess',
    '--exporters','json','csv','--artifacts',$destination,'--job','Short','--warmupCount','3','--iterationCount','8',
    '--iterationTime','100','--outliers','DontRemove')
$started = [DateTimeOffset]::UtcNow.ToString('o')
dotnet @a *> (Join-Path $destination 'console.log')
$code = $LASTEXITCODE
$execution = [ordered]@{candidate='F103';variant=$Variant;arguments=$a;startedAt=$started;
    completedAt=[DateTimeOffset]::UtcNow.ToString('o');exitCode=$code;sdk=(dotnet --version);
    expectedCases=10;expectedRetainedResultsPerCase=8;sourceComparison=($Variant -ne 'original');
    ownerSha256=$manifest.ownerAssemblySha256;harnessSha256=$manifest.harnessSha256;
    scope='Actual StateHasChangedAnalyzer over controlled real Components metadata/real Roslyn5.11 host/fresh driver/warmed immutable compilation;exact diagnostic setup anchors;actual Task<int> completion/diagnostic consumption. Parsing/metadata/setup/observer excluded,not whole-build/browser/native allocation.'}
$execution | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run "execution-$Variant.json")
if ($code) { throw 'Actual BDN sweep failed;preserve failure/budget rather than rerun.' }
$resultFiles = @(Get-ChildItem (Join-Path $destination 'results') -Filter '*-report-full*.json' -File)
if ($resultFiles.Count -ne 1) { throw 'Actual complete BDN JSON report is missing/ambiguous.' }
$report = Get-Content $resultFiles[0].FullName -Raw | ConvertFrom-Json
if ($report.Benchmarks.Count -ne 10 -or @($report.Benchmarks | Where-Object { $_.Statistics.N -ne 8 }).Count)
{
    throw 'BDN zero exit is not enough;actual10 cases/eight retained result samples required.'
}
if ($Variant -eq 'original') { $budget.originalSweepsCompleted = 1 } else { $budget.completedSourceComparisons++ }
$budget | ConvertTo-Json -Depth 6 | Set-Content $budgetPath
node (Join-Path $PSScriptRoot 'F103-closure.mjs') $run $Variant --verify
if ($LASTEXITCODE) { throw 'Actual closure changed during sweep.' }
Get-Content (Join-Path $destination 'console.log') -Tail 30
Write-Output "F103 $Variant completed actual10-case sweep;source comparisons:$($budget.completedSourceComparisons)/3."
