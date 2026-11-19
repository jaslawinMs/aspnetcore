param(
    [Parameter(Mandatory)][string]$TrxPath,
    [Parameter(Mandatory)][int]$ExpectedRows,
    [ValidateSet(0, 12)][int]$ExpectedFocusedRows = 0
)

$ErrorActionPreference = 'Stop'
[xml]$document = [System.IO.File]::ReadAllText($TrxPath)
$nodes = @($document.SelectNodes("/*[local-name()='TestRun']/*[local-name()='Results']/*[local-name()='UnitTestResult']"))
$counters = @($document.SelectNodes("/*[local-name()='TestRun']/*[local-name()='ResultSummary']/*[local-name()='Counters']"))
if ($ExpectedRows -le 0 -or $nodes.Count -ne $ExpectedRows -or $counters.Count -ne 1)
{
    throw 'The XML does not contain every expected individual result row.'
}
foreach ($key in @('total', 'executed', 'passed'))
{
    if ([int]$counters[0].GetAttribute($key) -ne $ExpectedRows)
    {
        throw "The XML $key counter does not account for all rows."
    }
}
foreach ($key in @('failed', 'error', 'timeout', 'aborted', 'inconclusive', 'notExecuted'))
{
    if ([int]$counters[0].GetAttribute($key) -ne 0)
    {
        throw "Non-passing XML outcome: $key."
    }
}
$rows = @($nodes | ForEach-Object {
    $name = $_.GetAttribute('testName')
    if ($_.GetAttribute('outcome') -ne 'Passed' -or [string]::IsNullOrWhiteSpace($name) -or $name -match '[\x00-\x1f]')
    {
        throw "Non-passing or report-unsafe individual row: $name."
    }
    [ordered]@{
        testName = $name
        outcome = $_.GetAttribute('outcome')
        testId = $_.GetAttribute('testId')
        executionId = $_.GetAttribute('executionId')
    }
})
if (@($rows.testName | Sort-Object -Unique).Count -ne $ExpectedRows)
{
    throw 'Require distinguishable individual result names, including every theory row.'
}
$prefix = 'Microsoft.AspNetCore.Mvc.Infrastructure.CopyOnWriteListTest.'
$focused = @($rows | Where-Object { $_.testName.StartsWith($prefix, [StringComparison]::Ordinal) })
if ($focused.Count -ne $ExpectedFocusedRows)
{
    throw 'The focused preservation rows did not all execute.'
}
if ($ExpectedFocusedRows -eq 12)
{
    $expected = @(
        'IndexOf_PreservesFirstMatchNullsAndSourceIsolation(copied: False)',
        'IndexOf_PreservesFirstMatchNullsAndSourceIsolation(copied: True)',
        'IndexOf_UsesLegacyObjectEquality(copied: False)',
        'IndexOf_UsesLegacyObjectEquality(copied: True)',
        'IndexOf_PreservesStoredLeftEqualityOrderAndShortCircuit(copied: False)',
        'IndexOf_PreservesStoredLeftEqualityOrderAndShortCircuit(copied: True)',
        'IndexOf_CopiedStorePreservesMutationDetection(match: False)',
        'IndexOf_CopiedStorePreservesMutationDetection(match: True)',
        'IndexOf_ArbitrarySourceDisposesOnMatchOrCompletion(match: False)',
        'IndexOf_ArbitrarySourceDisposesOnMatchOrCompletion(match: True)',
        'IndexOf_ArbitrarySourceDisposesOnCurrentOrEqualityFailure(equalityFailure: False)',
        'IndexOf_ArbitrarySourceDisposesOnCurrentOrEqualityFailure(equalityFailure: True)'
    ) | ForEach-Object { $prefix + $_ } | Sort-Object
    if (Compare-Object @($focused.testName | Sort-Object) @($expected))
    {
        throw 'A named preservation method or Boolean theory row is missing.'
    }
}
[ordered]@{
    actualPassed = $rows.Count
    actualSkippedOrFailed = 0
    actualFocusedRows = $focused.Count
    actualRows = $rows
} | ConvertTo-Json -Depth 10 -EscapeHandling EscapeNonAscii
