param(
    [Parameter(Mandatory)]
    [string]$RunRoot,
    [switch]$Verify
)

$ErrorActionPreference = 'Stop'
$rows = [System.Collections.Generic.List[object]]::new()
foreach ($variant in 'before', 'after')
{
    $command = Get-Content -LiteralPath (Join-Path $RunRoot "e2e-test-$variant-command.json") -Raw | ConvertFrom-Json
    if ($command.exitCode -ne 0 -or $command.exactClass -cne 'RoutingTest' -or $command.expectedTests.Count -ne 5)
    {
        throw "Successful exact five-test Client routing command required: $variant"
    }
    $expected = @($command.expectedTests | ForEach-Object {
        'Microsoft.AspNetCore.Components.E2ETest.Tests.RoutingTest.' + $_
    })
    $file = Join-Path $RunRoot "e2e-results-$variant\F089-routing-$variant.trx"
    $document = [xml](Get-Content -LiteralPath $file -Raw)
    $results = @($document.SelectNodes('//*[local-name()="UnitTestResult"]'))
    $counters = $document.SelectSingleNode('//*[local-name()="Counters"]')
    if ($results.Count -ne 5 -or $counters.total -ne '5' -or $counters.executed -ne '5' -or
        $counters.passed -ne '5' -or $counters.failed -ne '0' -or $counters.notExecuted -ne '0' -or
        (Compare-Object $expected @($results | ForEach-Object testName) -CaseSensitive))
    {
        throw "Actual complete unskipped routing results differ: $variant"
    }
    foreach ($result in $results)
    {
        if ($result.outcome -cne 'Passed' -or [TimeSpan]::Parse($result.duration).Ticks -le 0)
        {
            throw "Routing assertion was not successfully exercised: $($result.testName)"
        }
        $rows.Add([ordered]@{
            variant = $variant
            test = [string]$result.testName
            outcome = [string]$result.outcome
            duration = [string]$result.duration
            executionId = [string]$result.executionId
            resultFile = "e2e-results-$variant\F089-routing-$variant.trx"
        })
    }
}
$audit = [ordered]@{
    candidate = 'F089'
    exactConcreteClass = 'RoutingTest'
    executionMode = 'Client'
    actualTrxExecutions = $rows.Count
    passed = $rows.Count
    failed = 0
    skipped = 0
    preservationNotFunctionalRedGreen = $true
    outcomes = @($rows.ToArray())
}
$target = Join-Path $RunRoot 'actual-xml-audit.json'
$text = $audit | ConvertTo-Json -Depth 6
if ($Verify)
{
    $recorded = Get-Content -LiteralPath $target -Raw
    if ($recorded.TrimEnd("`r", "`n") -cne $text.TrimEnd("`r", "`n"))
    {
        throw 'Existing actual TRX audit differs.'
    }
}
else
{
    $text | Set-Content -LiteralPath $target -Encoding utf8
}
Write-Output 'F089: ten actual unskipped Client routing TRX rows passed; five original/five selected.'
