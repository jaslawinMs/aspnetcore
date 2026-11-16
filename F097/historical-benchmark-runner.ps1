param([Parameter(Mandatory)][ValidateRange(1,3)][int]$Round)
$ErrorActionPreference = 'Stop'
. 'C:\src\aspnetcore\activate.ps1'
$root = Join-Path $PSScriptRoot 'autoperf-runs\F097'
$budgetPath = Join-Path $root 'measurement-budget.json'
if (-not (Test-Path -LiteralPath $budgetPath))
{
    if ($Round -ne 1)
    {
        throw 'The first measured comparison must be round1.'
    }
    [ordered]@{
        candidate='F097'; maximumComparisons=3; startedComparisons=0; completedComparisons=0; closed=$false
        history=@(); note='Prototype1 missed unchanged allocation goal and was not benchmarked. Identical original/proposed closure,50 cases per source; overlap8 is per eight-request batch. Shared-machine runs serialized; no host/power/affinity/priority changes requested.'
    } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $budgetPath
}
$budget = Get-Content -LiteralPath $budgetPath -Raw | ConvertFrom-Json
if ($budget.closed -or $budget.startedComparisons -ne $Round - 1 -or $budget.completedComparisons -ne $Round - 1 -or
    $budget.maximumComparisons -ne 3)
{
    throw 'An actual comparison is pending/consumed or the strict three-comparison budget is closed.'
}
node (Join-Path $PSScriptRoot 'F097-closure.mjs') $root --verify
if ($LASTEXITCODE -ne 0)
{
    throw 'Actual frozen closure changed before measurement.'
}
$order = if ($Round % 2) { @('before','after') } else { @('after','before') }
$budget.startedComparisons = $Round
$budget.history = @($budget.history) + [pscustomobject]@{
    round=$Round; order=$order; startedUtc=[DateTimeOffset]::UtcNow.ToString('o'); completedUtc=$null; status='started'
}
$budget | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $budgetPath
$sdk = dotnet --version
if ($LASTEXITCODE -ne 0 -or $sdk -cne '12.0.100-alpha.1.26557.102')
{
    throw 'Pinned actual SDK selection failed.'
}
$executionPath = Join-Path $root 'execution.json'
$executions = if (Test-Path -LiteralPath $executionPath) { @(Get-Content -LiteralPath $executionPath -Raw | ConvertFrom-Json) } else { @() }
if ($executions.Count -ne 2 * ($Round - 1))
{
    throw 'Actual prior execution inventory differs from strict budget.'
}
foreach ($variant in $order)
{
    $label = "round-$Round-$variant"
    $output = Join-Path $root $label
    if (Test-Path -LiteralPath $output)
    {
        throw 'Actual measured artifacts must never be overwritten.'
    }
    New-Item -ItemType Directory -Path $output | Out-Null
    $arguments = @(
        (Join-Path $root "binaries\$variant\AutoPerf.Benchmarks.dll"),
        '--filter','*DefaultTimeoutBenchmark*','--inProcess','--exporters','json','csv','--artifacts',$output,
        '--job','Short','--warmupCount','3','--iterationCount','8','--iterationTime','100','--outliers','DontRemove'
    )
    $started = [DateTimeOffset]::UtcNow
    Write-Output "Starting F097 $label,50 actual cases; shared machine, unchanged frozen harness."
    dotnet @arguments *> (Join-Path $output 'console.log')
    $exit = $LASTEXITCODE
    $executions = @($executions) + [pscustomobject]@{
        round=$Round; variant=$variant; snapshot=$variant; label=$label; sdk=$sdk; arguments=$arguments
        started_at=$started.ToString('o'); completed_at=[DateTimeOffset]::UtcNow.ToString('o'); exit_code=$exit
    }
    $executions | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $executionPath
    if ($exit -ne 0)
    {
        throw "Actual measured variant failed:$label/$exit."
    }
    $reports = @(Get-ChildItem -LiteralPath (Join-Path $output 'results') -File -Filter '*full*.json')
    if ($reports.Count -ne 1)
    {
        throw 'Exactly one actual full report per variant is required.'
    }
    $report = Get-Content -LiteralPath $reports[0].FullName -Raw | ConvertFrom-Json
    if ($report.Benchmarks.Count -ne 50 -or @($report.Benchmarks | Where-Object {
        -not $_.Statistics -or $_.Statistics.N -ne 8 -or $_.Statistics.Mean -le 0 }).Count)
    {
        throw 'Every actually executed50-case report must contain eight positive retained samples.'
    }
    Write-Output "Completed F097 $label,50 cases/eight retained results each."
}
node (Join-Path $PSScriptRoot 'F097-closure.mjs') $root --verify
if ($LASTEXITCODE -ne 0)
{
    throw 'Actual frozen closure changed during measurement.'
}
$budget.completedComparisons = $Round
$budget.closed = $Round -eq 3
$budget.history[$Round - 1].status = 'completed'
$budget.history[$Round - 1].completedUtc = [DateTimeOffset]::UtcNow.ToString('o')
$budget | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $budgetPath
Write-Output "F097:actual comparison $Round/3 complete."
