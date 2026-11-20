param([Parameter(Mandatory)][string]$Root)
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path -LiteralPath $Root).Path
$prefix = 'Microsoft.AspNetCore.Server.Kestrel.Core.Tests.F146ManagedProducerTests.'
$expected = @(
    'ManagedHttp3_IndependentInputStreamsReachIndependentHandlers',
    'ManagedHttp3_PayloadLargerThan4096IsReceivedAcrossReads',
    'ManagedHttp3_TwoWritesReachOneAcceptedUnidirectionalHandler'
) | ForEach-Object { $prefix + $_ } | Sort-Object -CaseSensitive
$results = foreach ($role in @('Original', 'ObservedDefault'))
{
    $file = Join-Path $Root "owner-handoff\results\$role\attempt1\F146-$role-rt57-attempt1.trx"
    [xml]$xml = Get-Content -LiteralPath $file -Raw
    $rows = @($xml.TestRun.Results.UnitTestResult)
    if ($rows.Count -ne 3 -or (($rows.testName | Sort-Object -CaseSensitive) -join "`n") -cne ($expected -join "`n"))
    {
        throw "Exact real HTTP3 producer rows changed: $role"
    }
    foreach ($row in $rows)
    {
        $text = [string]$row.Output.StdOut
        if ($row.outcome -cne 'Passed' -or -not $text.Contains('SETTINGS') -or -not $text.Contains('HEADERS') -or
            -not $text.Contains('Initializing stream'))
        {
            throw "Passed row/real managed frame trace missing: $role $($row.testName)"
        }
    }
    [ordered]@{ role = $role; actualRows = 3; actualPassed = 3; actualEveryRowHasManagedHttp3Frames = $true }
}
[ordered]@{ actualTotalNativeXmlRowsPassed = 6; actualEveryManagedFrameTraceChecked = $true; roles = @($results); actualDotnetOrBenchmarkStarts = 0 } |
    ConvertTo-Json -Depth 6
