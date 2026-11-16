param([ValidateRange(1,3)][Parameter(Mandatory)][int]$Round)
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot 'autoperf-runs\F095'
$file = Join-Path $root 'measurement-budget.json'
$budget = Get-Content -LiteralPath $file -Raw | ConvertFrom-Json
if ($budget.closed -or $budget.startedComparisons -ne $Round - 1 -or
    $budget.completedComparisons -ne $Round - 1 -or $Round -gt $budget.maximumComparisons)
{
    throw 'A measured comparison is pending/already consumed, or the three-comparison budget is closed.'
}
$budget.startedComparisons = $Round
$budget.history = @($budget.history) + [pscustomobject]@{
    round = $Round
    order = if ($Round % 2) { @('before', 'after') } else { @('after', 'before') }
    startedUtc = [DateTimeOffset]::UtcNow.ToString('o')
    completedUtc = $null
    status = 'started'
}
$budget | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $file -Encoding utf8
& (Join-Path $PSScriptRoot 'autoperf-benchmarks.ps1') -Action Run -Id F095 -ProjectName AutoPerf.Benchmarks `
    -Filter '*LoaderBenchmark*' -ExpectedCaseCount 12 -Round $Round -ComparisonCount 1
$execution = @(Get-Content -LiteralPath (Join-Path $root 'execution.json') -Raw | ConvertFrom-Json)
$rows = @($execution | Where-Object round -eq $Round)
if ($rows.Count -ne 2 -or @($rows | Where-Object exit_code -ne 0).Count)
{
    throw 'Actual comparison execution/case counts differ.'
}
foreach ($row in $rows)
{
    $reports = @(Get-ChildItem -LiteralPath (Join-Path $root "$($row.label)\results") -Filter '*-full*.json' -File)
    if ($reports.Count -ne 1)
    {
        throw 'Exactly one actual full measurement report is required per execution.'
    }
    $report = Get-Content -LiteralPath $reports[0].FullName -Raw | ConvertFrom-Json
    if (@($report.Benchmarks).Count -ne 12 -or @($report.Benchmarks | Where-Object { $_.Statistics.N -ne 8 }).Count)
    {
        throw 'Every actual12-case report must retain exactly8 results per case.'
    }
}
$budget.completedComparisons = $Round
$budget.closed = $Round -eq $budget.maximumComparisons
$budget.history[$Round - 1].status = 'completed'
$budget.history[$Round - 1].completedUtc = [DateTimeOffset]::UtcNow.ToString('o')
$budget | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $file -Encoding utf8
Write-Output "F095 actual comparison $Round completed; budget $Round/3 consumed."
