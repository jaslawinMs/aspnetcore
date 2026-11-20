param([Parameter(Mandatory)][string]$Root)
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path -LiteralPath $Root).Path
$prefix = 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.RuntimeViewCompilerTest.'
$expected = @(
    'CompileAsync_PerformsCaseInsensitiveLookupsForPrecompiledViews(lookupPath: "/viEws/HoME/inDex.cshtml")',
    'CompileAsync_PerformsCaseInsensitiveLookupsForPrecompiledViews(lookupPath: "/views/home/index.cshtml")',
    'CompileAsync_PerformsCaseInsensitiveLookupsForPrecompiledViews(lookupPath: "/VIEWS/HOME/INDEX.CSHTML")',
    'CompileAsync_NormalizesPathSeparatorForPaths(relativePath: "Areas\\Finances\\Views\\Home\\Index.cshtml")',
    'CompileAsync_NormalizesPathSeparatorForPaths(relativePath: "\\Areas\\Finances\\Views\\Home\\Index.cshtml")',
    'CompileAsync_NormalizesPathSeparatorForPaths(relativePath: "/Areas/Finances/Views/Home/Index.cshtml")',
    'CompileAsync_NormalizesPathSeparatorForPaths(relativePath: "\\Areas\\Finances\\Views/Home\\Index.cshtml")',
    'CompileAsync_ReturnsResultWithNullAttribute_IfFileIsNotFoundInFileSystem',
    'CompileAsync_ReturnsPrecompiledViews',
    'CompileAsync_PerformsCaseInsensitiveLookupsForPrecompiledViews_WithNonNormalizedPaths'
) | ForEach-Object { $prefix + $_ } | Sort-Object -CaseSensitive
$results = foreach ($role in @('original', 'default'))
{
    $directory = Join-Path $Root "owner-handoff\results\$role"
    [xml]$xml = Get-Content -LiteralPath (Join-Path $directory 'existing.trx') -Raw
    $rows = @($xml.TestRun.Results.UnitTestResult)
    $parsed = Get-Content -LiteralPath (Join-Path $directory 'existing-tests-parsed.json') -Raw | ConvertFrom-Json
    if ($rows.Count -ne 10 -or $parsed.rows.Count -ne 10 -or
        (($rows.testName | Sort-Object -CaseSensitive) -join "`n") -cne ($expected -join "`n"))
    {
        throw "Exact existing theory names/counts changed: $role"
    }
    $seen = @{}
    foreach ($row in $rows)
    {
        $identity = "$($row.testId)/$($row.executionId)"
        $matching = @($parsed.rows | Where-Object { $_.testId -eq $row.testId -and $_.executionId -eq $row.executionId })
        if ($seen.ContainsKey($identity) -or $row.outcome -cne 'Passed' -or $matching.Count -ne 1 -or
            $matching[0].outcome -cne 'Passed' -or $matching[0].testName -cne $row.testName)
        {
            throw "Exact native row failed or its source association changed: $role $($row.testName)"
        }
        $seen[$identity] = $true
    }
    [ordered]@{ role = $role; actualRows = 10; actualPassed = 10; actualNamesAndExecutionIdsReconciled = $true }
}
[ordered]@{ actualTotalNativeXmlRowsPassed = 20; actualEveryTheoryValueReconciled = $true; roles = @($results); actualDotnetOrBenchmarkStarts = 0 } |
    ConvertTo-Json -Depth 6
