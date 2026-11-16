$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F105'
$destination = Join-Path $run 'measurements\original'
if (Test-Path $destination) { throw 'Actual original profile exists;do not overwrite or rerun.' }
node (Join-Path $PSScriptRoot 'F105-closure.mjs') $run --verify
if ($LASTEXITCODE) { throw 'Actual frozen original closure differs before profile.' }
$manifest = Get-Content (Join-Path $run 'original-manifest.json') -Raw | ConvertFrom-Json
$probe = Get-Content (Join-Path $run 'verification\original\states\original-contract-resources.json') -Raw | ConvertFrom-Json
if ($probe.contracts.Count -ne 24 -or $probe.resources.Count -ne 120 -or
    $probe.harnessSha256 -cne $manifest.harnessSha256 -or $probe.ownerSha256 -cne $manifest.actualOwners[0].sha256)
{
    throw 'Actual frozen public dictionary/factory/DI validation original probe is not green.'
}
$budget = [pscustomobject][ordered]@{
    candidate='F105';maximumSourceComparisons=3;startedSourceComparisons=0;completedSourceComparisons=0
    originalProfilesStarted=1;originalProfilesCompleted=0;closed=$false
    note='One original-only24-case public-owner pressure profile;not a before/after or compatible optimization gain. Public struct-return replacement is source/API-rejected without building a modified binary. Three possible source comparisons have not been consumed.'
}
$budgetPath = Join-Path $run 'measurement-budget.json'
if (Test-Path $budgetPath) { throw 'Measurement budget exists;inspect actual progress rather than restart.' }
$budget | ConvertTo-Json -Depth 5 | Set-Content $budgetPath -Encoding utf8
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$arguments = @((Join-Path $run 'binaries\original\AutoPerf.Benchmarks.dll'),'--filter','*EnumerationBenchmark*','--inProcess',
    '--exporters','json','csv','--artifacts',$destination,'--job','Short','--warmupCount','3','--iterationCount','8',
    '--iterationTime','100','--outliers','DontRemove')
$started = [DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $destination 'console.log')
$code = $LASTEXITCODE
[ordered]@{
    candidate='F105';variant='original';arguments=$arguments;exitCode=$code
    startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o');sdk=(dotnet --version)
    expectedCases=24;expectedRetainedResultsPerCase=8;sourceComparison=$false
    harnessSha256=$manifest.harnessSha256;actualOwners=$manifest.actualOwners
    scope='Actual complete public dictionary traversal or actual factory-produced state/public-DI Required-model validation. Original-only/warm managed boundary;not source comparison,HTTP/model-binding throughput or production frequency.'
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'execution-original.json') -Encoding utf8
if ($code) { throw 'Actual original BDN profile failed;retain failure and budget.' }
$reports = @(Get-ChildItem (Join-Path $destination 'results') -Filter '*-report-full*.json' -File)
if ($reports.Count -ne 1) { throw 'Actual complete BDN JSON report missing/ambiguous.' }
$report = Get-Content $reports[0].FullName -Raw | ConvertFrom-Json
if ($report.Benchmarks.Count -ne 24 -or @($report.Benchmarks | Where-Object {$_.Statistics.N -ne 8}).Count)
{
    throw 'All24 cases/eight retained results required,not merely process exit zero.'
}
$budget.originalProfilesCompleted=1
$budget | ConvertTo-Json -Depth 5 | Set-Content $budgetPath -Encoding utf8
node (Join-Path $PSScriptRoot 'F105-closure.mjs') $run --verify
if ($LASTEXITCODE) { throw 'Actual frozen closure changed during original profile.' }
Get-Content (Join-Path $destination 'console.log') -Tail 30
Write-Output 'F105 actual original24-case profile completed;source comparisons remain0/3,no performance improvement claimed.'
