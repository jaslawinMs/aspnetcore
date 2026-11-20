$ErrorActionPreference = 'Stop'
$parallel = Join-Path $PSScriptRoot 'autoperf-parallelism'
$root = Join-Path $parallel 'finding-F237-F238-059'
$entry = Get-Content -LiteralPath (Join-Path $root 'entry-plan.json') -Raw | ConvertFrom-Json -DateKind String
$expected = @(
    'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.FileProviderRazorProjectFileSystemTest.GetItem_ReturnsFileFromDisk'
    'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.FileProviderRazorProjectFileSystemTest.GetItem_ReturnsNotFoundResult'
    'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.FileProviderRazorProjectFileSystemTest.GetItem_PhysicalPathDoesNotStartWithContentRoot_ReturnsNull'
    'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.FileProviderRazorProjectFileSystemTest.EnumerateFiles_ReturnsEmptySequenceIfNoCshtmlFilesArePresent'
    'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.FileProviderRazorProjectFileSystemTest.EnumerateFiles_IteratesOverAllCshtmlUnderRoot'
    'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.FileProviderRazorProjectFileSystemTest.EnumerateFiles_IteratesOverAllCshtmlUnderPath'
    'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.FileProviderRazorProjectFileSystemTest.EnumerateFiles_ReturnsCshtmlFiles'
    'Microsoft.Extensions.DependencyInjection.RazorRuntimeCompilationMvcCoreBuilderExtensionsTest.AddServices_ReplacesRazorViewCompiler'
    'Microsoft.Extensions.DependencyInjection.RazorRuntimeCompilationMvcCoreBuilderExtensionsTest.AddServices_ReplacesActionDescriptorProvider'
)
$allNames = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$runs = foreach ($role in @('Original', 'Default'))
{
    $relative = "native-$role-native-after-restored-assets\results\selected.trx"
    $file = Join-Path $root $relative
    $document = [Xml.XmlDocument]::new()
    $document.PreserveWhitespace = $true
    $document.Load($file)
    if ($document.DocumentElement.LocalName -cne 'TestRun')
    {
        throw 'Not an actual native TestRun document.'
    }
    $ns = [Xml.XmlNamespaceManager]::new($document.NameTable)
    $ns.AddNamespace('t', $document.DocumentElement.NamespaceURI)
    $rows = @($document.SelectNodes('/t:TestRun/t:Results/t:UnitTestResult', $ns))
    $definitions = @($document.SelectNodes('/t:TestRun/t:TestDefinitions/t:UnitTest', $ns))
    $entries = @($document.SelectNodes('/t:TestRun/t:TestEntries/t:TestEntry', $ns))
    $names = @($rows | ForEach-Object { $_.GetAttribute('testName') } | Sort-Object -CaseSensitive)
    $differences = @(Compare-Object $names @($expected | Sort-Object -CaseSensitive) -CaseSensitive)
    if ($rows.Count -ne 9 -or $definitions.Count -ne 9 -or $entries.Count -ne 9 -or $differences.Count -ne 0)
    {
        throw 'The exact native case/result/definition/entry set differs.'
    }
    $ids = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    $executions = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    $expectedImage = Join-Path $entry.actualIndependentGraphs.$role 'artifacts\bin\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test\Release\net12.0\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.dll'
    $accepted = foreach ($row in $rows)
    {
        $id = $row.GetAttribute('testId')
        $executionId = $row.GetAttribute('executionId')
        $name = $row.GetAttribute('testName')
        $definition = @($definitions | Where-Object { $_.GetAttribute('id') -ceq $id })
        $testEntry = @($entries | Where-Object { $_.GetAttribute('testId') -ceq $id -and $_.GetAttribute('executionId') -ceq $executionId })
        if (!$ids.Add($id) -or !$executions.Add($executionId) -or $definition.Count -ne 1 -or $testEntry.Count -ne 1)
        {
            throw 'Duplicated or unassociated native identity.'
        }
        $method = $definition[0].SelectSingleNode('t:TestMethod', $ns)
        $execution = $definition[0].SelectSingleNode('t:Execution', $ns)
        $fullMethod = "$($method.GetAttribute('className')).$($method.GetAttribute('name'))"
        $codeBase = $method.GetAttribute('codeBase')
        if ($row.GetAttribute('outcome') -cne 'Passed' -or $definition[0].GetAttribute('name') -cne $name -or
            $fullMethod -cne $name -or $execution.GetAttribute('id') -cne $executionId -or
            $codeBase -ine $expectedImage -or $definition[0].GetAttribute('storage') -ine $codeBase -or
            $testEntry[0].GetAttribute('testListId') -cne $row.GetAttribute('testListId'))
        {
            throw 'A native case/method/execution/image/list/outcome association differs.'
        }
        [void]$allNames.Add($name)
        [pscustomobject]@{
            name = $name; method = $fullMethod; testId = $id; executionId = $executionId
            codeBase = $codeBase; outcome = 'Passed'
        }
    }
    $counters = $document.SelectSingleNode('/t:TestRun/t:ResultSummary/t:Counters', $ns)
    foreach ($attribute in $counters.Attributes)
    {
        $value = if ($attribute.Name -in @('total', 'executed', 'passed')) { 9 } else { 0 }
        if ([int]$attribute.Value -ne $value)
        {
            throw 'An unexpected or nonzero native counter was found.'
        }
    }
    foreach ($name in @('total', 'executed', 'passed'))
    {
        if ([int]$counters.GetAttribute($name) -ne 9)
        {
            throw 'A required exact nonempty native counter differs.'
        }
    }
    [pscustomobject]@{ role = $role; file = $relative; sha256 = (Get-FileHash -LiteralPath $file).Hash; rows = @($accepted) }
}
if ($allNames.Count -ne 9)
{
    throw 'The complete case-sensitive native method set differs.'
}
$target = Join-Path $root 'coordinator-system-xml-072.json'
if (Test-Path -LiteralPath $target)
{
    throw 'Do not overwrite an existing XML reconciliation.'
}
[ordered]@{
    recordedAt = [DateTime]::UtcNow.ToString('o')
    actualParser = 'System.Xml.XmlDocument'
    actualNativeReports = 2; actualPassedExecutions = 18; actualDistinctNativeCases = 9
    actualOriginalPrecompileSelectionWasClassFilter = $entry.nativeFilter
    actualExactCaseNamesIndependentlyReconciledAfterExecutionNotRetroactivelyFrozen = $true
    actualAllExactCasesDefinitionsEntriesExecutionOwnerIdentitiesAndCountersReconciled = $true
    actualNativeRootsExitedZeroButOriginalWrapperFailedPostRootOwnershipGuard = $true
    actualNativeTesthostManagedRuntimeNotDirectlyObserved = $true
    actualNoNativeRerunProcessStopOrRetrospectiveAncestryAttestation = $true
    runs = @($runs)
} | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $target -Encoding utf8NoBOM
Write-Output 'Independent System.Xml PASS: 18 saved native executions / nine exact facts; class-filter freeze and Original post-root wrapper failure remain explicit; no native rerun.'
