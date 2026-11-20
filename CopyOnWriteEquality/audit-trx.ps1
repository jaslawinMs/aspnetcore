param([Parameter(Mandatory)][string]$CapsuleRoot)

$ErrorActionPreference = 'Stop'
$summary = Get-Content -LiteralPath (Join-Path $CapsuleRoot 'owner-handoff\manifest\existing-test-results.json') -Raw | ConvertFrom-Json
$expected = @($summary.exact_test_names | Sort-Object)
$files = @(
    'owner-handoff\outputs\original\test-results\targeted.trx'
    'owner-handoff\outputs\default\test-results\resume03-explicit-runtime.trx'
    'canonical-default-007\results\canonical-default.trx'
)
$observations = @()
foreach ($file in $files)
{
    [xml]$xml = Get-Content -LiteralPath (Join-Path $CapsuleRoot $file) -Raw
    $rows = @($xml.TestRun.Results.UnitTestResult)
    if ($rows.Count -ne 3 -or @($rows | Where-Object outcome -ne 'Passed').Count -ne 0)
    {
        throw "An exact required execution did not pass: $file"
    }
    if (Compare-Object @($rows | ForEach-Object testName | Sort-Object) $expected)
    {
        throw 'Exact test-name sets differ.'
    }
    $observations += [ordered]@{ file = $file; actualPassed = 3; actualExactNames = $expected }
}
[ordered]@{ actualPassingExecutions = 9; actualNoSkippedRows = $true; observations = $observations } | ConvertTo-Json -Depth 8
