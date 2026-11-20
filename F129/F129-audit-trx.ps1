param(
    [Parameter(Mandatory = $true)][string]$CaseRoot,
    [Parameter(Mandatory = $true)][string[]]$Roles
)
$ErrorActionPreference = 'Stop'
$mapping = @{
    Original = 'original-tests-001'
    Default = 'default-tests-002'
    Prototype = 'prototype-tests-002'
    RestoredOriginal = 'restored-tests-001'
}
$reports = foreach ($role in $Roles)
{
    if (-not $mapping.ContainsKey($role)) { throw "Unknown role $role" }
    $directory = Join-Path $CaseRoot "validation\$($mapping[$role])\test-results"
    $files = @(Get-ChildItem -LiteralPath $directory -File -Filter '*.trx')
    if ($files.Count -ne 1) { throw "Expected one actual XML report for $role" }
    [xml]$xml = Get-Content -LiteralPath $files[0].FullName -Raw
    $results = @($xml.GetElementsByTagName('UnitTestResult'))
    if ($results.Count -ne 7) { throw "Expected seven individual XML results for $role, found $($results.Count)" }
    $rows = foreach ($result in $results)
    {
        if ($result.outcome -ne 'Passed') { throw "$role/$($result.testName): $($result.outcome)" }
        if ($result.testName -notlike 'Microsoft.AspNetCore.Components.Media.Tests.FileDownloadTest.*') { throw "Unexpected test $($result.testName)" }
        [pscustomobject]@{ testName = [string]$result.testName; outcome = [string]$result.outcome; duration = [string]$result.duration; testId = [string]$result.testId }
    }
    if (@($rows.testName | Sort-Object -Unique).Count -ne 7) { throw "Duplicate XML test name in $role" }
    $counter = $xml.GetElementsByTagName('Counters')
    if ($counter.Count -ne 1 -or $counter[0].total -ne '7' -or $counter[0].passed -ne '7' -or $counter[0].failed -ne '0' -or $counter[0].notExecuted -ne '0')
    {
        throw "XML counters do not agree with the individually parsed $role rows"
    }
    [pscustomobject]@{ role = $role; file = $files[0].FullName; sha256 = (Get-FileHash -LiteralPath $files[0].FullName -Algorithm SHA256).Hash; rows = @($rows) }
}
[pscustomobject]@{ reports = @($reports); individualExecutions = 7 * $Roles.Count; failed = 0; skipped = 0 } | ConvertTo-Json -Depth 8
