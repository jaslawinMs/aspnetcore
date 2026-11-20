param([Parameter(Mandatory = $true)][string] $CaseRoot)
$ErrorActionPreference = 'Stop'
$mapping = @{
    Original = 'original-tests-001'
    Default = 'default-tests-002'
}
$reports = foreach ($role in @('Original', 'Default'))
{
    $directory = Join-Path $CaseRoot "validation\$($mapping[$role])\test-results"
    $files = @(Get-ChildItem -LiteralPath $directory -File -Filter '*.trx')
    if ($files.Count -ne 1) { throw "Expected one actual XML report for $role" }
    [xml] $xml = Get-Content -LiteralPath $files[0].FullName -Raw
    $results = @($xml.GetElementsByTagName('UnitTestResult'))
    if ($results.Count -ne 34) { throw "Expected 34 actual union validation executions for $role" }
    $rows = foreach ($result in $results)
    {
        if ($result.outcome -ne 'Passed' -or
            $result.testName -notmatch '^Microsoft\.AspNetCore\.Mvc\.IntegrationTests\.UnionValidationIntegrationTest\.')
        {
            throw "$role/$($result.testName): unexpected test or outcome $($result.outcome)"
        }
        [pscustomobject]@{
            testName = [string] $result.testName
            outcome = [string] $result.outcome
            duration = [string] $result.duration
            testId = [string] $result.testId
            executionId = [string] $result.executionId
        }
    }
    if (@($rows.executionId | Sort-Object -Unique).Count -ne 34) { throw "Duplicate execution identity in $role" }
    $counter = $xml.GetElementsByTagName('Counters')
    if ($counter.Count -ne 1 -or $counter[0].total -ne '34' -or $counter[0].passed -ne '34' -or
        $counter[0].failed -ne '0' -or $counter[0].notExecuted -ne '0')
    {
        throw "XML counters differ from parsed executions in $role"
    }
    [pscustomobject]@{
        role = $role
        file = $files[0].FullName
        sha256 = (Get-FileHash -LiteralPath $files[0].FullName -Algorithm SHA256).Hash
        rows = @($rows)
    }
}
[pscustomobject]@{ reports = @($reports); individualExecutions = 68; failed = 0; skipped = 0 } | ConvertTo-Json -Depth 8
