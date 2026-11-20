$ErrorActionPreference = 'Stop'
$parallel = Join-Path $PSScriptRoot 'autoperf-parallelism'
$capsule = Join-Path $parallel 'finding-F194-F195-042\capsule'
$selection = Get-Content -LiteralPath (Join-Path $capsule 'evidence\NATIVE-SELECTION.json') -Raw | ConvertFrom-Json -DateKind String
$theory = 'Microsoft.Extensions.FileProviders.ManifestEmbeddedFileProviderTests.GetFileInfo_ResolvesFiles_WithDifferentCasing'
$expected = @($selection.nativeMethods | Where-Object { $_ -cne $theory })
$expected += @($selection.expectedTheoryRows | ForEach-Object { "$theory(folder: `"$($_[0])`", file: `"$($_[1])`")" })
if ($expected.Count -ne 11) { throw 'Unexpected exact native selection.' }
$allCases = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$allMethods = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$reports = foreach ($role in 'original', 'default')
{
    $file = Join-Path $capsule "native\$role\results\selected.trx"
    $document = [Xml.XmlDocument]::new()
    $document.PreserveWhitespace = $true
    $document.Load($file)
    if ($document.DocumentElement.LocalName -cne 'TestRun') { throw 'Not an actual native TestRun document.' }
    $ns = [Xml.XmlNamespaceManager]::new($document.NameTable)
    $ns.AddNamespace('t', $document.DocumentElement.NamespaceURI)
    $rows = @($document.SelectNodes('/t:TestRun/t:Results/t:UnitTestResult', $ns))
    $definitions = @($document.SelectNodes('/t:TestRun/t:TestDefinitions/t:UnitTest', $ns))
    $entries = @($document.SelectNodes('/t:TestRun/t:TestEntries/t:TestEntry', $ns))
    if ($rows.Count -ne 11 -or $definitions.Count -ne 11 -or $entries.Count -ne 11) { throw 'Missing actual result, definition, or entry.' }
    if (Compare-Object @($rows | ForEach-Object { $_.GetAttribute('testName') } | Sort-Object -CaseSensitive) @($expected | Sort-Object -CaseSensitive) -CaseSensitive)
    {
        throw 'An exact case-sensitive selected native or individual theory row differs.'
    }
    foreach ($attribute in 'testId', 'executionId')
    {
        if (@($rows | ForEach-Object { $_.GetAttribute($attribute) } | Sort-Object -Unique).Count -ne 11) { throw 'Duplicated native execution identity.' }
    }
    $graph = if ($role -eq 'original') { 'C:\src\ap-F194-o042' } else { 'C:\src\ap-F194-d042' }
    $accepted = foreach ($row in $rows)
    {
        $id = $row.GetAttribute('testId')
        $executionId = $row.GetAttribute('executionId')
        $definition = @($definitions | Where-Object { $_.GetAttribute('id') -eq $id })
        $entry = @($entries | Where-Object { $_.GetAttribute('testId') -eq $id -and $_.GetAttribute('executionId') -eq $executionId })
        if ($definition.Count -ne 1 -or $entry.Count -ne 1) { throw 'Nonunique actual definition/entry association.' }
        $method = $definition[0].SelectSingleNode('t:TestMethod', $ns)
        $execution = $definition[0].SelectSingleNode('t:Execution', $ns)
        $fullMethod = "$($method.GetAttribute('className')).$($method.GetAttribute('name'))"
        $codeBase = $method.GetAttribute('codeBase')
        if ($execution.GetAttribute('id') -ne $executionId -or $row.GetAttribute('outcome') -cne 'Passed' -or
            $definition[0].GetAttribute('name') -cne $row.GetAttribute('testName') -or
            $selection.nativeMethods -cnotcontains $fullMethod -or
            $codeBase -ine "$graph\artifacts\bin\Microsoft.Extensions.FileProviders.Embedded.Tests\Release\net12.0\Microsoft.Extensions.FileProviders.Embedded.Tests.dll" -or
            $definition[0].GetAttribute('storage') -ine $codeBase -or
            $entry[0].GetAttribute('testListId') -ne $row.GetAttribute('testListId'))
        {
            throw 'Actual native identity, method, owner image, list, or outcome mismatch.'
        }
        [void]$allCases.Add($row.GetAttribute('testName'))
        [void]$allMethods.Add($fullMethod)
        [pscustomobject]@{
            testName = $row.GetAttribute('testName'); method = $fullMethod; testId = $id; executionId = $executionId
            codeBase = $codeBase; outcome = 'Passed'; testListId = $row.GetAttribute('testListId')
        }
    }
    $counters = $document.SelectSingleNode('/t:TestRun/t:ResultSummary/t:Counters', $ns)
    foreach ($attribute in 'total', 'executed', 'passed')
    {
        if ($counters.GetAttribute($attribute) -cne '11') { throw 'A required exact native counter differs.' }
    }
    foreach ($attribute in $counters.Attributes)
    {
        $expectedValue = if ($attribute.Name -in @('total', 'executed', 'passed')) { 11 } else { 0 }
        if ([int]$attribute.Value -ne $expectedValue) { throw "Nonzero or unexpected native counter: $($attribute.Name)" }
    }
    [pscustomobject]@{ role = $role; file = "native\$role\results\selected.trx"; sha256 = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash; rows = @($accepted) }
}
if ($allCases.Count -ne 11 -or $allMethods.Count -ne 10) { throw 'The case-sensitive complete native set differs.' }
$result = [ordered]@{
    recordedAt = [DateTime]::UtcNow.ToString('o'); actualParser = 'System.Xml.XmlDocument'
    actualNativeReports = 2; actualPassedExecutions = 22; actualUniqueSelectedCases = $allCases.Count
    actualUniqueNativeMethods = $allMethods.Count; actualDistinctCaseSensitiveTheoryCases = 2
    actualTheoryExecutionsAcrossRoles = 4
    actualNoNativeRerun = $true; actualNativeTesthostExitCodesStillUnknown = $true
    actualAllExactCasesDefinitionsEntriesExecutionOwnerIdentitiesAndCountersReconciled = $true
    runs = @($reports)
}
$target = Join-Path $parallel 'F194-F195-coordinator-system-xml-051.json'
if (Test-Path -LiteralPath $target) { throw 'Do not overwrite a reconciliation observation.' }
$result | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath "$target.tmp" -Encoding utf8NoBOM
[IO.File]::Move("$target.tmp", $target)
Write-Output 'Independent System.Xml PASS: 22 actual saved executions, 11 case-sensitive cases/10 methods, both casing theory rows in both roles; no native rerun and testhost exits remain unknown.'
