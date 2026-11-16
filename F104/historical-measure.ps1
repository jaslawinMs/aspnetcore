param(
    [Parameter(Mandatory)][ValidateRange(1,3)][int]$Comparison,
    [Parameter(Mandatory)][ValidateSet('Original','Candidate')][string]$Kind
)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F104'
$variant = if ($Kind -eq 'Original') {'original'} else {"candidate-$Comparison"}
$label = if ($Kind -eq 'Original' -and $Comparison -gt 1) {"original-$Comparison"} else {$variant}
$destination = Join-Path $run "measurements\$label"
if (Test-Path $destination) { throw 'Actual sweep exists;do not overwrite/rerun it.' }
node (Join-Path $PSScriptRoot 'F104-closure.mjs') $run $variant --verify
if ($LASTEXITCODE) { throw 'Actual frozen closure differs before sweep.' }
$probe = Get-Content (Join-Path $run "verification\$variant\states\actual-analyzer-contract-resources.json") -Raw | ConvertFrom-Json
$manifest = Get-Content (Join-Path $run "$variant-manifest.json") -Raw | ConvertFrom-Json
if ($probe.observations.Count -ne 33 -or $probe.resources.Count -ne 10 -or $probe.producers.Count -ne 10 -or
    $probe.freshCompilationResources.Count -ne 10 -or $probe.ownerSha256 -cne $manifest.ownerAssemblySha256 -or
    $probe.harnessSha256 -cne $manifest.harnessSha256)
{
    throw 'Actual frozen faithful owner control proof is not green.'
}
$budgetPath = Join-Path $run 'measurement-budget.json'
if ($Kind -eq 'Original' -and $Comparison -eq 1)
{
    if (Test-Path $budgetPath) { throw 'Original budget exists;inspect actual progress.' }
    $budget = [pscustomobject][ordered]@{
        candidate='F104';maximumSourceComparisons=3;startedSourceComparisons=0;completedSourceComparisons=0
        originalSweepsStarted=0;originalSweepsCompleted=0;closed=$false
        note='At most3 actual source comparisons,each with a retained fresh exact-original10-case reference. Actual owner complete warmed compiler drivers;parse/metadata/setup/observer excluded. All raw outcomes retained;no constructor-only or whole-build claim.'
    }
}
else
{
    $budget = Get-Content $budgetPath -Raw | ConvertFrom-Json
}
if ($budget.closed -or $budget.startedSourceComparisons -ne $Comparison - 1 -or
    $budget.completedSourceComparisons -ne $Comparison - 1)
{
    throw 'Actual source-comparison order/budget differs;do not bypass an earlier outcome.'
}
if ($Kind -eq 'Original')
{
    if ($budget.originalSweepsStarted -ne $Comparison - 1 -or $budget.originalSweepsCompleted -ne $Comparison - 1)
    {
        throw 'Fresh paired-original order/budget differs.'
    }
    $budget.originalSweepsStarted++
}
else
{
    if ($budget.originalSweepsStarted -ne $Comparison -or $budget.originalSweepsCompleted -ne $Comparison)
    {
        throw 'Candidate requires its actual completed fresh paired-original sweep.'
    }
    $budget.startedSourceComparisons++
}
$budget | ConvertTo-Json -Depth 6 | Set-Content $budgetPath -Encoding utf8
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$arguments = @((Join-Path $run "binaries\$variant\AutoPerf.Benchmarks.dll"),'--filter','*AnalyzerBenchmark*','--inProcess',
    '--exporters','json','csv','--artifacts',$destination,'--job','Short','--warmupCount','3','--iterationCount','8',
    '--iterationTime','100','--outliers','DontRemove')
$started = [DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $destination 'console.log')
$code = $LASTEXITCODE
[ordered]@{
    candidate='F104';variant=$variant;label=$label;comparison=$Comparison;arguments=$arguments
    startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o');exitCode=$code;sdk=(dotnet --version)
    expectedCases=10;expectedRetainedResultsPerCase=8;sourceComparison=($Kind -eq 'Candidate')
    ownerSha256=$manifest.ownerAssemblySha256;harnessSha256=$manifest.harnessSha256
    scope='Actual RouteHandlerAnalyzer/fresh real CompilationWithAnalyzers and compilation-start pool/real in-tree endpoint HTTP MVC metadata/complete Task<int> diagnostics/warmed immutable compilation. Positive diagnostic anchors and exact setup contracts;parse/metadata/setup/observer excluded. Not constructor-only/native/browser or whole-build.'
} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run "execution-$label.json") -Encoding utf8
if ($code) { throw 'Actual BDN sweep failed;preserve failure/budget rather than rerun.' }
$reports = @(Get-ChildItem (Join-Path $destination 'results') -Filter '*-report-full*.json' -File)
if ($reports.Count -ne 1) { throw 'Actual complete BDN JSON report missing/ambiguous.' }
$report = Get-Content $reports[0].FullName -Raw | ConvertFrom-Json
if ($report.Benchmarks.Count -ne 10 -or @($report.Benchmarks | Where-Object {$_.Statistics.N -ne 8}).Count)
{
    throw 'Actual10 cases/eight retained samples per case required,not merely zero exit.'
}
if ($Kind -eq 'Original') {$budget.originalSweepsCompleted++} else {$budget.completedSourceComparisons++}
$budget | ConvertTo-Json -Depth 6 | Set-Content $budgetPath -Encoding utf8
node (Join-Path $PSScriptRoot 'F104-closure.mjs') $run $variant --verify
if ($LASTEXITCODE) { throw 'Actual frozen closure changed during sweep.' }
Get-Content (Join-Path $destination 'console.log') -Tail 28
Write-Output "F104 $label actual10-case sweep complete;source comparisons:$($budget.completedSourceComparisons)/3."
