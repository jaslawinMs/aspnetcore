$ErrorActionPreference = 'Stop'
$session = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files'
$capsule = Join-Path $session 'autoperf-parallelism\finding-F182-F186-022\capsule'
$reconciliation = Get-Content -LiteralPath (Join-Path $capsule 'native-reconciliation.json') -Raw | ConvertFrom-Json
$images = Get-Content -LiteralPath (Join-Path $capsule 'native-images.json') -Raw | ConvertFrom-Json
$expected = @(
    'CanRoleFindByName', 'CanUpdateRoleName', 'CanDeleteRole', 'CreateRoleFailsIfExists',
    'CanAddUsersToRole', 'CanRemoveUsersFromRole', 'RemoveUserNotInRoleFails',
    'AddUserToRoleFailsIfAlreadyInRole', 'CanGetUsersInRole'
) | ForEach-Object { "Microsoft.AspNetCore.Identity.InMemory.Test.InMemoryStoreTest.$_" } | Sort-Object
if (@($reconciliation.reports).Count -ne 2) { throw 'Expected exactly two new native reports.' }
$runs = foreach ($report in $reconciliation.reports)
{
    $file = Join-Path $capsule $report.report
    $document = [System.Xml.XmlDocument]::new()
    $document.PreserveWhitespace = $true
    $document.Load($file)
    if ($document.DocumentElement.LocalName -ne 'TestRun') { throw 'Not an actual TestRun XML document.' }
    $namespace = [System.Xml.XmlNamespaceManager]::new($document.NameTable)
    $namespace.AddNamespace('t', $document.DocumentElement.NamespaceURI)
    $rows = @($document.SelectNodes('/t:TestRun/t:Results/t:UnitTestResult', $namespace))
    $definitions = @($document.SelectNodes('/t:TestRun/t:TestDefinitions/t:UnitTest', $namespace))
    $entries = @($document.SelectNodes('/t:TestRun/t:TestEntries/t:TestEntry', $namespace))
    if ($rows.Count -ne 9 -or $definitions.Count -ne 9 -or $entries.Count -ne 9) { throw 'Expected exactly nine actual rows, definitions and entries.' }
    $names = @($rows | ForEach-Object { $_.GetAttribute('testName') } | Sort-Object)
    if (Compare-Object $names $expected) { throw 'Actual native Fact names differ from the complete expected set.' }
    if (@($rows | ForEach-Object { $_.GetAttribute('testId') } | Sort-Object -Unique).Count -ne 9) { throw 'Duplicate native test IDs.' }
    if (@($rows | ForEach-Object { $_.GetAttribute('executionId') } | Sort-Object -Unique).Count -ne 9) { throw 'Duplicate native execution IDs.' }
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
        $owner = Join-Path $images.images.($report.role).directory 'Microsoft.AspNetCore.Identity.InMemory.Test.dll'
        if ($method.GetAttribute('codeBase') -ine $owner -or $definition[0].GetAttribute('storage') -ine $owner) { throw 'Actual native owner codeBase/storage differs from the declared role.' }
        if ($entry[0].GetAttribute('testListId') -ne $row.GetAttribute('testListId')) { throw 'Native test-list identity mismatch.' }
        [pscustomobject]@{ testName = $row.GetAttribute('testName'); testId = $id; executionId = $executionId; outcome = 'Passed'; codeBase = $method.GetAttribute('codeBase'); testListId = $entry[0].GetAttribute('testListId') }
    }
    $counters = $document.SelectSingleNode('/t:TestRun/t:ResultSummary/t:Counters', $namespace)
    foreach ($attribute in $counters.Attributes)
    {
        $expectedValue = if ($attribute.Name -in @('total', 'executed', 'passed')) { 9 } else { 0 }
        if ([int]$attribute.Value -ne $expectedValue) { throw "Actual native counter differs: $($attribute.Name)" }
    }
    [pscustomobject]@{ role = $report.role; file = $file; sha256 = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash; actualRows = 9; rows = @($accepted) }
}
$result = [ordered]@{
    recordedAt = [DateTime]::UtcNow.ToString('o')
    actualParser = 'System.Xml.XmlDocument'
    actualNewNativeExecutionStarted = $false
    actualAllExactNamesDefinitionsEntriesExecutionsCountersReconciled = $true
    actualPassedExecutions = 18
    actualUniqueFacts = 9
    actualSelectedTheoryRows = 0
    runs = @($runs)
}
$target = Join-Path $session 'autoperf-parallelism\F182-F186-coordinator-system-xml-039.json'
if (Test-Path -LiteralPath $target) { throw 'Do not overwrite a reconciliation observation.' }
$result | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath "$target.tmp" -Encoding utf8NoBOM
[IO.File]::Move("$target.tmp", $target)
Write-Output 'Independent System.Xml reconciliation PASS: 18 actual saved executions, nine unique Facts, two real TRX reports; no native test rerun.'
