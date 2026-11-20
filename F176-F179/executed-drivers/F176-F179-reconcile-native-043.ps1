$ErrorActionPreference = 'Stop'
$session = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files'
$capsule = Join-Path $session 'autoperf-parallelism\finding-F176-F179-022\capsule'
$results = Get-Content -LiteralPath (Join-Path $capsule 'RESULTS.json') -Raw | ConvertFrom-Json
$selection = Get-Content -LiteralPath (Join-Path $capsule 'native-selection.json') -Raw | ConvertFrom-Json
if (@($results.nativeRuns).Count -ne 8) { throw 'Expected all eight actual saved native reports.' }
$runs = foreach ($report in $results.nativeRuns)
{
    $group = @($selection.groups | Where-Object kind -EQ $report.kind)
    if ($group.Count -ne 1) { throw 'Native report kind is not uniquely selected.' }
    $expected = @($group[0].expected | ForEach-Object {
        $name = "$($_.class).$($_.method)"
        if (@($_.parameters).Count -gt 0)
        {
            $parameters = @($_.parameters | ForEach-Object { "$($_.name): `"$($_.value)`"" }) -join ', '
            $name += "($parameters)"
        }
        $name
    } | Sort-Object)
    $count = if ($report.kind -eq 'core') { 3 } else { 8 }
    if ($expected.Count -ne $count) { throw 'Native expected case count differs.' }
    $file = Join-Path $capsule $report.trx
    $document = [System.Xml.XmlDocument]::new()
    $document.PreserveWhitespace = $true
    $document.Load($file)
    if ($document.DocumentElement.LocalName -ne 'TestRun') { throw 'Not an actual TestRun XML document.' }
    $namespace = [System.Xml.XmlNamespaceManager]::new($document.NameTable)
    $namespace.AddNamespace('t', $document.DocumentElement.NamespaceURI)
    $rows = @($document.SelectNodes('/t:TestRun/t:Results/t:UnitTestResult', $namespace))
    $definitions = @($document.SelectNodes('/t:TestRun/t:TestDefinitions/t:UnitTest', $namespace))
    $entries = @($document.SelectNodes('/t:TestRun/t:TestEntries/t:TestEntry', $namespace))
    if ($rows.Count -ne $count -or $definitions.Count -ne $count -or $entries.Count -ne $count) { throw 'Actual native row/definition/entry count differs.' }
    if (Compare-Object @($rows | ForEach-Object { $_.GetAttribute('testName') } | Sort-Object) $expected -CaseSensitive) { throw 'Actual native names or individual theory parameters differ.' }
    foreach ($attribute in 'testId', 'executionId')
    {
        if (@($rows | ForEach-Object { $_.GetAttribute($attribute) } | Sort-Object -Unique).Count -ne $count) { throw 'Duplicate native case identity.' }
    }
    $graph = if ($report.role -eq 'original') { 'C:\src\ap-F176-o022' } elseif ($report.role -eq 'default') { 'C:\src\ap-F176-d022' } else { throw 'Unknown native source role.' }
    $accepted = foreach ($row in $rows)
    {
        $id = $row.GetAttribute('testId')
        $executionId = $row.GetAttribute('executionId')
        $definition = @($definitions | Where-Object { $_.GetAttribute('id') -eq $id })
        $entry = @($entries | Where-Object { $_.GetAttribute('testId') -eq $id -and $_.GetAttribute('executionId') -eq $executionId })
        if ($definition.Count -ne 1 -or $entry.Count -ne 1) { throw 'Actual native definition/entry identity mismatch.' }
        $execution = $definition[0].SelectSingleNode('t:Execution', $namespace)
        $method = $definition[0].SelectSingleNode('t:TestMethod', $namespace)
        if ($execution.GetAttribute('id') -ne $executionId -or $row.GetAttribute('outcome') -ne 'Passed') { throw 'Native execution identity or outcome mismatch.' }
        if ($definition[0].GetAttribute('name') -ne $row.GetAttribute('testName')) { throw 'Actual definition/result name mismatch.' }
        $owner = $method.GetAttribute('codeBase')
        if (!$owner.StartsWith("$graph\artifacts\bin\", [StringComparison]::OrdinalIgnoreCase) -or
            [IO.Path]::GetFileName($owner) -ne "$($group[0].assembly).dll" -or
            !$owner.Contains('\Release\net12.0\', [StringComparison]::OrdinalIgnoreCase) -or
            $definition[0].GetAttribute('storage') -ine $owner)
        {
            throw 'Actual native owner codeBase/storage differs from the selected role/build/assembly.'
        }
        if ($entry[0].GetAttribute('testListId') -ne $row.GetAttribute('testListId')) { throw 'Native test-list identity mismatch.' }
        [pscustomobject]@{ testName = $row.GetAttribute('testName'); testId = $id; executionId = $executionId; outcome = 'Passed'; codeBase = $owner; method = $method.GetAttribute('name'); testListId = $entry[0].GetAttribute('testListId') }
    }
    $counters = $document.SelectSingleNode('/t:TestRun/t:ResultSummary/t:Counters', $namespace)
    foreach ($name in 'total', 'executed', 'passed')
    {
        if ($counters.GetAttribute($name) -ne [string]$count) { throw 'A required native counter is absent or differs.' }
    }
    foreach ($attribute in $counters.Attributes)
    {
        $expectedValue = if ($attribute.Name -in @('total', 'executed', 'passed')) { $count } else { 0 }
        if ([int]$attribute.Value -ne $expectedValue) { throw "Actual native counter differs: $($attribute.Name)" }
    }
    [pscustomobject]@{ role = $report.role; kind = $report.kind; mode = $report.mode; file = $file; sha256 = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash; actualRows = $count; rows = @($accepted) }
}
$result = [ordered]@{
    recordedAt = [DateTime]::UtcNow.ToString('o')
    actualParser = 'System.Xml.XmlDocument'
    actualNewNativeExecutionStarted = $false
    actualAllExactNamesParametersDefinitionsEntriesExecutionsCountersReconciled = $true
    actualPassedExecutions = 44
    actualUniqueSelectedCases = 11
    actualUniqueNativeMethods = 9
    actualDistinctParameterizedCases = 3
    actualParameterizedExecutionsAcrossRolesAndModes = 12
    actualMissingHistoricalNativeManagedExitSnapshots = 4
    actualXmlPassDoesNotSubstituteForMissingManagedExitSnapshots = $true
    runs = @($runs)
}
$target = Join-Path $session 'autoperf-parallelism\F176-F179-coordinator-system-xml-043.json'
if (Test-Path -LiteralPath $target) { throw 'Do not overwrite a reconciliation observation.' }
$result | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath "$target.tmp" -Encoding utf8NoBOM
[IO.File]::Move("$target.tmp", $target)
Write-Output 'Independent System.Xml reconciliation PASS: 44 saved executions, 11 selected cases including each of three theory rows; eight real TRXs, no native rerun. Four historical managed-exit snapshots remain missing.'
