param([Parameter(Mandatory)][string]$CapsuleRoot)

$ErrorActionPreference = 'Stop'
$summary = Get-Content -LiteralPath (Join-Path $CapsuleRoot 'owner-handoff\evidence\existing-test-outcomes.json') -Raw | ConvertFrom-Json
$expected = @($summary.actualRows | ForEach-Object name | Sort-Object)
$files = @('owner-handoff\logs\test-results\F134-existing.trx', 'owner-handoff\logs\test-results-subprotocol\F134-subprotocol.trx')
$actual = @()
$counts = @()
foreach ($file in $files)
{
    [xml]$xml = Get-Content -LiteralPath (Join-Path $CapsuleRoot $file) -Raw
    $rows = @($xml.TestRun.Results.UnitTestResult)
    if (@($rows | Where-Object outcome -ne 'Passed').Count -ne 0)
    {
        throw "A required execution did not pass: $file"
    }
    $actual += @($rows | ForEach-Object testName)
    $counts += $rows.Count
}
if ($actual.Count -ne 6 -or (Compare-Object @($actual | Sort-Object) $expected))
{
    throw 'The exact six test executions differ.'
}
if ($counts[0] -ne 5 -or $counts[1] -ne 1)
{
    throw 'The historical five-plus-one execution boundary differs.'
}
[ordered]@{ actualPassingExecutions = 6; actualPerReportCounts = $counts; actualEveryTheoryRowPassed = $true; actualExactNames = $expected } | ConvertTo-Json -Depth 6
