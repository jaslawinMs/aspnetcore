$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = $PSScriptRoot
$trx = Join-Path $root 'logs\test-results\F134-existing.trx'
if (-not (Test-Path -LiteralPath $trx))
{
    throw 'The requested fresh existing-test report does not exist. Do not infer a passing run.'
}
$reports = @($trx)
$followup = Join-Path $root 'logs\test-results-subprotocol\F134-subprotocol.trx'
if (Test-Path -LiteralPath $followup)
{
    $reports += $followup
}
$results = @()
foreach ($report in $reports)
{
    $document = [Xml.XmlDocument]::new()
    $document.Load($report)
    $namespaces = [Xml.XmlNamespaceManager]::new($document.NameTable)
    $namespaces.AddNamespace('t', $document.DocumentElement.NamespaceURI)
    $reportResults = @($document.SelectNodes('//t:Results/t:UnitTestResult', $namespaces))
    $counters = $document.SelectSingleNode('//t:ResultSummary/t:Counters', $namespaces)
    if ($null -eq $counters -or [int]$counters.GetAttribute('total') -ne $reportResults.Count -or [int]$counters.GetAttribute('passed') -ne $reportResults.Count -or $counters.GetAttribute('failed') -ne '0' -or $counters.GetAttribute('notExecuted') -ne '0')
    {
        throw "TRX counters do not establish a complete passing run: $report"
    }
    $results += $reportResults
}
if ($results.Count -ne 6)
{
    throw "Expected six discovered/executed cases, found $($results.Count)."
}
$expected = [ordered]@{
    'Microsoft.AspNetCore.TestHost.Tests.WebSocketClientTests.CanAcceptWebSocket' = 1
    'Microsoft.AspNetCore.TestHost.TestClientTests.WebSocketSubProtocolsWorks' = 1
    'Microsoft.AspNetCore.TestHost.Tests.WebSocketClientTests.ConnectAsync_ShouldSetRequestProperties' = 3
    'Microsoft.AspNetCore.TestHost.Tests.WebSocketClientTests.VerifyWebSocketAndUpgradeFeatures' = 1
}
$rows = @($results | ForEach-Object {
    [ordered]@{
        name = $_.GetAttribute('testName')
        outcome = $_.GetAttribute('outcome')
        testId = $_.GetAttribute('testId')
    }
})
foreach ($method in $expected.Keys)
{
    $matched = @($rows | Where-Object { $_.name -eq $method -or $_.name.StartsWith($method + '(') })
    if ($matched.Count -ne $expected[$method])
    {
        throw "Unexpected row count for $method"
    }
}
foreach ($uri in @('http://localhost/connect', 'http://localhost:80/connect', 'http://localhost:81/connect'))
{
    if (@($rows | Where-Object { $_.name.Contains($uri) }).Count -ne 1)
    {
        throw "Missing or duplicate parameter row: $uri"
    }
}
if (@($rows | Where-Object { $_.outcome -ne 'Passed' }).Count -ne 0)
{
    throw 'One or more requested existing tests did not pass.'
}
$commands = Get-Content -Raw -LiteralPath (Join-Path $root 'logs\commands.json') | ConvertFrom-Json
$command = @($commands | Where-Object { $_.id.EndsWith('-existing-tests') -or $_.id.EndsWith('-existing-subprotocol-test') })
if ($command.Count -ne $reports.Count -or @($command | Where-Object { $_.exitCode -ne 0 -or -not $_.terminal }).Count -ne 0)
{
    throw 'Missing clean terminal existing-test command.'
}
$payload = Get-Content -Raw -LiteralPath (Join-Path $root 'inputs\default\payload.json') | ConvertFrom-Json
$loadedOwnerInput = Join-Path $root 'out\existing-tests\Microsoft.AspNetCore.TestHost.dll'
$ownerHash = (Get-FileHash -LiteralPath $loadedOwnerInput -Algorithm SHA256).Hash
if ($ownerHash -ne $payload.ownerPeSha256)
{
    throw 'The copied test run input owner is not the accepted Default owner.'
}
[ordered]@{
    findingId = 'F134'
    sourceRevision = $payload.sourceRevision
    reports = $reports
    commands = $command
    actualRows = $rows
    passed = 6
    skipped = 0
    failed = 0
    testRunInputOwnerSha256 = $ownerHash
    boundary = 'Exact copied existing repository test assembly and dependency inputs, fresh VSTest execution, explicit installed-runtime output overlay. No new repository test-project build is claimed.'
} | ConvertTo-Json -Depth 9 | Set-Content -LiteralPath (Join-Path $root 'evidence\existing-test-outcomes.json') -Encoding utf8
Write-Output 'Existing requested tests: 6/6 passed, zero skipped; every TRX case and summary counter parsed.'
