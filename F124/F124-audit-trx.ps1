param(
    [Parameter(Mandatory)][string]$TrxPath,
    [Parameter(Mandatory)][int]$ExpectedRows,
    [ValidateSet(0, 6)][int]$ExpectedFocusedRows = 0
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
        throw "The XML $key counter does not account for every row."
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
    throw 'Require distinguishable individual result names, including each theory row.'
}
$prefix = 'Microsoft.AspNetCore.Analyzers.PublicPartialProgramClassTest.'
$focused = @($rows | Where-Object {
    $_.testName.StartsWith($prefix + 'DoesNotFix_ProgramDeclarationInSeparateFile(', [StringComparison]::Ordinal) -or
    $_.testName.StartsWith($prefix + 'RemovesDeclarationIfItIsFound_WithOneOtherNode(', [StringComparison]::Ordinal)
})
if ($focused.Count -ne $ExpectedFocusedRows)
{
    throw 'The focused threshold-preservation rows did not all execute.'
}
if ($ExpectedFocusedRows -eq 6)
{
    $single = @($focused | Where-Object { $_.testName.Contains('.DoesNotFix_ProgramDeclarationInSeparateFile(') })
    $two = @($focused | Where-Object { $_.testName.Contains('.RemovesDeclarationIfItIsFound_WithOneOtherNode(') })
    if ($single.Count -ne 4 -or $two.Count -ne 2)
    {
        throw 'A named one-node or two-node theory row is missing.'
    }
    foreach ($style in @('public partial class Program { }', 'public partial class Program;', 'public partial class @Program { }', '/* trivia */ public partial class Program { }'))
    {
        if (@($single | Where-Object { $_.testName.Contains('declarationStyle: "' + $style + '"') }).Count -ne 1)
        {
            throw "A concrete one-node declaration style is missing: $style."
        }
    }
    foreach ($style in @('public partial class Program { }', 'public partial class Program;'))
    {
        if (@($two | Where-Object { $_.testName.Contains('declarationStyle: "' + $style + '"') }).Count -ne 1)
        {
            throw "A concrete two-node declaration style is missing: $style."
        }
    }
}
[ordered]@{
    actualPassed = $rows.Count
    actualSkippedOrFailed = 0
    actualFocusedRows = $focused.Count
    actualRows = $rows
} | ConvertTo-Json -Depth 10 -EscapeHandling EscapeNonAscii
