param(
    [Parameter(Mandatory)][string]$TrxPath,
    [Parameter(Mandatory)][ValidateSet('existing', 'original-red', 'candidate')][string]$Mode
)

$ErrorActionPreference = 'Stop'
[xml]$document = [System.IO.File]::ReadAllText($TrxPath)
$nodes = @($document.SelectNodes("/*[local-name()='TestRun']/*[local-name()='Results']/*[local-name()='UnitTestResult']"))
$counters = @($document.SelectNodes("/*[local-name()='TestRun']/*[local-name()='ResultSummary']/*[local-name()='Counters']"))
$expectedRows = if ($Mode -eq 'existing') { 7 } else { 9 }
$expectedFailures = if ($Mode -eq 'original-red') { 2 } else { 0 }
if ($nodes.Count -ne $expectedRows -or $counters.Count -ne 1)
{
    throw 'Require every expected individual XML result row.'
}
foreach ($key in @('total', 'executed'))
{
    if ([int]$counters[0].GetAttribute($key) -ne $expectedRows)
    {
        throw "The XML $key counter does not account for every case."
    }
}
if ([int]$counters[0].GetAttribute('failed') -ne $expectedFailures -or
    [int]$counters[0].GetAttribute('passed') -ne ($expectedRows - $expectedFailures))
{
    throw 'The XML passing/failing totals do not match this exact phase.'
}
foreach ($key in @('error', 'timeout', 'aborted', 'inconclusive', 'notExecuted'))
{
    if ([int]$counters[0].GetAttribute($key) -ne 0)
    {
        throw "Unexpected XML outcome: $key."
    }
}
$prefix = 'AuthSamples.FunctionalTests.CustomPolicyProviderTests.'
$existing = @(
    'DefaultReturns200',
    'MinimumAge10RedirectsWhenNotLoggedIn',
    'MinimumAge10WorksIfOldEnough',
    'MinimumAge10FailsIfNotOldEnough',
    'MinimumAge50WorksIfOldEnough',
    'MinimumAge50FailsIfNotOldEnough',
    'MinimumAge50RedirectsWhenNotLoggedIn'
)
$rows = @($nodes | ForEach-Object {
    $name = $_.GetAttribute('testName')
    if ([string]::IsNullOrWhiteSpace($name) -or $name -match '[\x00-\x1f]' -or
        -not $name.StartsWith($prefix, [StringComparison]::Ordinal))
    {
        throw 'Require report-safe names from exactly the intended test class.'
    }
    [ordered]@{
        testName = $name
        outcome = $_.GetAttribute('outcome')
        testId = $_.GetAttribute('testId')
        executionId = $_.GetAttribute('executionId')
        duration = $_.GetAttribute('duration')
        errorMessage = [string]$_.Output.ErrorInfo.Message
        errorStackTrace = [string]$_.Output.ErrorInfo.StackTrace
    }
})
if (@($rows.testName | Sort-Object -Unique).Count -ne $expectedRows)
{
    throw 'Every datum must have a distinct individual report name.'
}
foreach ($method in $existing)
{
    $matches = @($rows | Where-Object { $_.testName -eq $prefix + $method })
    if ($matches.Count -ne 1 -or $matches[0].outcome -ne 'Passed')
    {
        throw "An existing real HTTP case did not pass: $method."
    }
}
$focused = @($rows | Where-Object { $_.testName.StartsWith($prefix + 'MinimumAgePolicyIsCachedBetweenRequests(', [StringComparison]::Ordinal) })
if ($focused.Count -ne ($expectedRows - 7))
{
    throw 'A real-request cache-contract datum did not execute.'
}
if ($Mode -ne 'existing')
{
    foreach ($policy in @('MinimumAge10', 'MinimumAge50'))
    {
        $matches = @($focused | Where-Object { $_.testName.Contains('policyName: "' + $policy + '"') })
        if ($matches.Count -ne 1)
        {
            throw "A concrete named endpoint datum is missing: $policy."
        }
        $row = $matches[0]
        if ($Mode -eq 'original-red')
        {
            if ($row.outcome -ne 'Failed' -or
                $row.errorMessage -notmatch 'Expected invocation on the mock once, but was 2 times' -or
                -not $row.errorMessage.Contains('GetPolicyAsync') -or
                -not $row.errorMessage.Contains($policy) -or
                -not $row.errorStackTrace.Contains('MinimumAgePolicyIsCachedBetweenRequests'))
            {
                throw "The original datum did not fail specifically after two real routed requests: $policy."
            }
        }
        elseif ($row.outcome -ne 'Passed')
        {
            throw "The candidate datum did not pass: $policy."
        }
    }
}
[ordered]@{
    actualMode = $Mode
    actualParsedRows = $rows.Count
    actualPassed = $expectedRows - $expectedFailures
    actualExpectedOriginalCacheContractFailures = $expectedFailures
    actualSkippedOrUnexpectedFailures = 0
    actualFocusedRows = $focused.Count
    actualRows = $rows
} | ConvertTo-Json -Depth 10 -EscapeHandling EscapeNonAscii
