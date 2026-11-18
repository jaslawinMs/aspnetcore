param(
    [Parameter(Mandatory)][string]$Label,
    [Parameter(Mandatory)][int]$ExpectedTotal,
    [ValidateSet(0, 7)][int]$ExpectedPreservationRows = 0
)

$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F120'
if ($Label -notmatch '^[a-z0-9-]+$')
{
    throw 'Require one explicit validation label, not a path.'
}
$directory = Join-Path $run ('validation\' + $Label)
$result = Get-Content -LiteralPath (Join-Path $directory 'result.json') -Raw | ConvertFrom-Json
if ($result.exitCode -ne 0 -or -not $result.protectedPinUnchanged)
{
    throw 'A nonzero runner or changed SDK pin is not a passing test result.'
}
$reports = @(Get-ChildItem -LiteralPath (Join-Path $directory 'test-results') -File -Filter '*.trx')
if ($reports.Count -ne 1)
{
    throw 'Require exactly the configured report for this unique actual invocation.'
}
$report = $reports[0]
if ($report.LastWriteTimeUtc -lt [datetime]$result.startedAt -or $report.LastWriteTimeUtc -gt ([datetime]$result.completedAt).AddSeconds(1))
{
    throw 'Reject a stale or unrelated report.'
}
[xml]$document = [System.IO.File]::ReadAllText($report.FullName)
$rows = @($document.SelectNodes("/*[local-name()='TestRun']/*[local-name()='Results']/*[local-name()='UnitTestResult']"))
$counters = @($document.SelectNodes("/*[local-name()='TestRun']/*[local-name()='ResultSummary']/*[local-name()='Counters']"))
if ($rows.Count -ne $ExpectedTotal -or $ExpectedTotal -le 0 -or $counters.Count -ne 1)
{
    throw "Wrong discovery: expected $ExpectedTotal individual result rows, observed $($rows.Count)."
}
foreach ($key in @('total', 'executed', 'passed'))
{
    if ([int]$counters[0].GetAttribute($key) -ne $ExpectedTotal)
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
$audited = @($rows | ForEach-Object {
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
if (@($audited.testName | Sort-Object -Unique).Count -ne $ExpectedTotal)
{
    throw 'Every individual theory row must have a distinguishable report name.'
}
$prefix = 'Microsoft.AspNetCore.Mvc.Infrastructure.CopyOnWriteListTest.'
$preservation = @($audited | Where-Object { $_.testName.StartsWith($prefix, [StringComparison]::Ordinal) })
if ($preservation.Count -ne $ExpectedPreservationRows)
{
    throw 'The expected focused preservation rows did not all execute.'
}
if ($ExpectedPreservationRows -eq 7)
{
    $expectedMethods = [ordered]@{
        Contains_PreservesSourceAndCopiedStoreContents = 2
        Contains_CopiedStoreUsesObjectEqualsInsteadOfEquatableEquals = 1
        Contains_PreservesReentrantMutationAndEarlySuccess = 2
        Contains_UnmodifiedStoreEnumeratesAndDisposesSource = 1
        Contains_UnmodifiedListSubclassPreservesInterfaceEnumerationOrder = 1
    }
    foreach ($entry in $expectedMethods.GetEnumerator())
    {
        $methodPrefix = $prefix + $entry.Key
        if (@($preservation | Where-Object { $_.testName.StartsWith($methodPrefix, [StringComparison]::Ordinal) }).Count -ne $entry.Value)
        {
            throw "Missing or duplicate method/theory rows: $($entry.Key)."
        }
    }
}
$audit = [ordered]@{
    candidate = 'F120'
    actualValidationLabel = $Label
    actualRunnerExitCode = $result.exitCode
    actualReport = $report.Name
    actualReportSha256 = (Get-FileHash -LiteralPath $report.FullName -Algorithm SHA256).Hash
    actualIndividualRows = $rows.Count
    actualPassed = $rows.Count
    actualFailed = 0
    actualSkipped = 0
    actualPreservationRows = $preservation.Count
    actualEveryConfiguredRowParsed = $true
    actualReportSafeDistinguishableNames = $true
    rows = $audited
}
$destination = Join-Path $directory 'test-row-audit.json'
if (Test-Path -LiteralPath $destination)
{
    throw 'Preserve an existing result audit.'
}
[System.IO.File]::WriteAllText($destination, ($audit | ConvertTo-Json -Depth 10) + "`n", [System.Text.UTF8Encoding]::new($false))
[pscustomobject]$audit | Select-Object candidate, actualValidationLabel, actualIndividualRows, actualPassed, actualFailed, actualSkipped, actualPreservationRows | ConvertTo-Json
