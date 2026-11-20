$ErrorActionPreference = 'Stop'
$parallel = Join-Path $PSScriptRoot 'autoperf-parallelism'
$capsule = Join-Path $parallel 'finding-F187-F189-038\capsule'
$selectionFile = Join-Path $capsule 'research\native-selection.json'
if ((Get-FileHash -LiteralPath $selectionFile).Hash -cne 'DED0EAA7E035D4BA5CBBB20659632BB259E67F32068E430D76E4E178C7202DA9')
{
    throw 'The frozen native case selection changed.'
}
$selection = Get-Content -LiteralPath $selectionFile -Raw | ConvertFrom-Json -DateKind String
$owner = Get-Content -LiteralPath (Join-Path $capsule 'RESULTS.json') -Raw | ConvertFrom-Json -DateKind String
if ($selection.reports.Count -ne 4 -or $selection.expectedRowExecutions -ne 38 -or $selection.expectedRowsPerRole -ne 19)
{
    throw 'Unexpected fixed native selection.'
}
$allCases = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$allMethods = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$theoryCases = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$theoryExecutions = 0
$reports = foreach ($spec in $selection.reports)
{
    $file = Join-Path $capsule $spec.path.Replace('/', '\')
    $expectedReport = @($owner.native.reports | Where-Object { $_.path -ceq $spec.path })
    if ($expectedReport.Count -ne 1 -or (Get-FileHash -LiteralPath $file).Hash -ine $expectedReport[0].sha256)
    {
        throw 'Native report membership or hash differs from the frozen owner envelope.'
    }
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
    $expectedCount = if ($spec.scenario -ceq 'functional') { 10 } else { 9 }
    if ($rows.Count -ne $expectedCount -or $definitions.Count -ne $expectedCount -or $entries.Count -ne $expectedCount -or $spec.expectedNames.Count -ne $expectedCount)
    {
        throw 'Missing actual selected result, definition, or entry.'
    }
    if (Compare-Object @($rows | ForEach-Object { $_.GetAttribute('testName') } | Sort-Object -CaseSensitive) @($spec.expectedNames | Sort-Object -CaseSensitive) -CaseSensitive)
    {
        throw 'An exact selected native fact or individual discovery-Theory row differs.'
    }
    foreach ($attribute in 'testId', 'executionId')
    {
        if (@($rows | ForEach-Object { $_.GetAttribute($attribute) } | Sort-Object -Unique).Count -ne $expectedCount)
        {
            throw 'Duplicated actual native execution identity.'
        }
    }
    $accepted = foreach ($row in $rows)
    {
        $id = $row.GetAttribute('testId')
        $executionId = $row.GetAttribute('executionId')
        $definition = @($definitions | Where-Object { $_.GetAttribute('id') -eq $id })
        $entry = @($entries | Where-Object { $_.GetAttribute('testId') -eq $id -and $_.GetAttribute('executionId') -eq $executionId })
        if ($definition.Count -ne 1 -or $entry.Count -ne 1)
        {
            throw 'Nonunique actual definition/entry association.'
        }
        $method = $definition[0].SelectSingleNode('t:TestMethod', $ns)
        $execution = $definition[0].SelectSingleNode('t:Execution', $ns)
        $fullMethod = "$($method.GetAttribute('className')).$($method.GetAttribute('name'))"
        $codeBase = $method.GetAttribute('codeBase')
        $name = $row.GetAttribute('testName')
        $expectedMethod = $name -creplace '\(.*$', ''
        if ($execution.GetAttribute('id') -ne $executionId -or $row.GetAttribute('outcome') -cne 'Passed' -or
            $definition[0].GetAttribute('name') -cne $name -or $expectedMethod -cne $fullMethod -or
            $spec.expectedClasses -cnotcontains $method.GetAttribute('className') -or
            $codeBase -ine $spec.expectedCodeBasePrefix -or $definition[0].GetAttribute('storage') -ine $codeBase -or
            $entry[0].GetAttribute('testListId') -ne $row.GetAttribute('testListId'))
        {
            throw 'Actual native identity, method, owner image, list, or outcome mismatch.'
        }
        [void]$allCases.Add($name)
        [void]$allMethods.Add($fullMethod)
        if ($name.StartsWith('Microsoft.AspNetCore.Mvc.FunctionalTests.ControllerFromServicesTest.AddControllersFromServices_UsesControllerDiscoveryContentions(', [StringComparison]::Ordinal))
        {
            [void]$theoryCases.Add($name)
            $script:theoryExecutions++
        }
        [pscustomobject]@{
            testName = $name; method = $fullMethod; testId = $id; executionId = $executionId
            codeBase = $codeBase; outcome = 'Passed'; testListId = $row.GetAttribute('testListId')
        }
    }
    $counters = $document.SelectSingleNode('/t:TestRun/t:ResultSummary/t:Counters', $ns)
    foreach ($attribute in 'total', 'executed', 'passed')
    {
        if ([int]$counters.GetAttribute($attribute) -ne $expectedCount)
        {
            throw 'A required exact native counter differs.'
        }
    }
    foreach ($attribute in $counters.Attributes)
    {
        $expectedValue = if ($attribute.Name -in @('total', 'executed', 'passed')) { $expectedCount } else { 0 }
        if ([int]$attribute.Value -ne $expectedValue)
        {
            throw "Nonzero or unexpected native counter: $($attribute.Name)"
        }
    }
    [pscustomobject]@{
        role = $spec.role; scenario = $spec.scenario; file = $spec.path
        sha256 = (Get-FileHash -LiteralPath $file).Hash; rows = @($accepted)
    }
}
if ($allCases.Count -ne 19 -or $allMethods.Count -ne 16 -or $theoryCases.Count -ne 4 -or $theoryExecutions -ne 8)
{
    throw 'The complete fact/method/individual discovery-Theory set differs.'
}
$result = [ordered]@{
    recordedAt = [DateTime]::UtcNow.ToString('o'); actualParser = 'System.Xml.XmlDocument'
    actualNativeReports = 4; actualPassedExecutions = 38; actualUniqueSelectedCases = $allCases.Count
    actualUniqueNativeMethods = $allMethods.Count; actualDistinctCaseSensitiveTheoryCases = $theoryCases.Count
    actualTheoryExecutionsAcrossRoles = $theoryExecutions
    actualNoNativeRerun = $true; actualNativeFrameworkAssertionCountUninstrumented = $true
    actualAllExactCasesDefinitionsEntriesExecutionOwnerIdentitiesAndCountersReconciled = $true
    actualNestedDiscoveryTheoryIs404NotTargetEmptyResultExecution = $true; runs = @($reports)
}
$target = Join-Path $parallel 'F187-F189-coordinator-system-xml-057.json'
if (Test-Path -LiteralPath $target)
{
    throw 'Do not overwrite a reconciliation observation.'
}
$result | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath "$target.tmp" -Encoding utf8NoBOM
[IO.File]::Move("$target.tmp", $target)
Write-Output 'Independent System.Xml PASS: 38 actual saved executions,19 case-sensitive cases/16 methods,four discovery-Theory cases/eight executions; no native rerun or target EmptyResult-execution claim.'
