param([string]$RunRoot)

$ErrorActionPreference = 'Stop'
$run = if ($RunRoot) { $RunRoot } else { Join-Path $PSScriptRoot 'autoperf-runs\F058' }
$variants = @('before', 'after', 'restored') | Where-Object { Test-Path (Join-Path $run "tests-$_\results.trx") }
if ('before' -notin $variants -or 'after' -notin $variants)
{
    throw 'Original/prototype full owning Headers suites required.'
}
$all = foreach ($variant in $variants)
{
    [xml]$trx = Get-Content (Join-Path $run "tests-$variant\results.trx") -Raw
    $rows = @($trx.TestRun.Results.UnitTestResult)
    if ($rows.Count -ne 1848 -or @($rows | Where-Object outcome -ne Passed).Count)
    {
        throw "Incomplete or failed actual1848-case suite:$variant."
    }
    foreach ($row in $rows)
    {
        [pscustomobject]@{ variant = $variant; name = $row.testName; outcome = $row.outcome; duration = $row.duration }
    }
}
$all | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run 'all-test-outcomes.json') -Encoding utf8
Write-Output "All$($all.Count) actual Headers outcomes passed across$($variants.Count) suites;no new red functional defect claimed."
