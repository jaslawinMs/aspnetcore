param([string]$Root = (Split-Path $PSScriptRoot))

$ErrorActionPreference = 'Stop'
$selectionPath = Join-Path $Root 'research\native-selection.json'
$selection = Get-Content -LiteralPath $selectionPath -Raw | ConvertFrom-Json

function Get-Attributes([System.Xml.XmlNode]$Node)
{
    $result = [ordered]@{}
    foreach ($attribute in $Node.Attributes)
    {
        $result[$attribute.Name] = $attribute.Value
    }

    return $result
}

$reports = [System.Collections.Generic.List[object]]::new()
foreach ($report in $selection.reports)
{
    $path = Join-Path $Root $report.path
    if (!(Test-Path -LiteralPath $path))
    {
        throw "Actual report absent: $path"
    }
    $settings = [System.Xml.XmlReaderSettings]::new()
    $settings.DtdProcessing = [System.Xml.DtdProcessing]::Prohibit
    $reader = [System.Xml.XmlReader]::Create($path, $settings)
    $document = [System.Xml.XmlDocument]::new()
    try
    {
        $document.Load($reader)
    }
    finally
    {
        $reader.Dispose()
    }
    $namespace = [System.Xml.XmlNamespaceManager]::new($document.NameTable)
    $namespace.AddNamespace('t', $document.DocumentElement.NamespaceURI)
    $results = @($document.SelectNodes('/t:TestRun/t:Results/t:UnitTestResult', $namespace))
    $definitions = @($document.SelectNodes('/t:TestRun/t:TestDefinitions/t:UnitTest', $namespace))
    $entries = @($document.SelectNodes('/t:TestRun/t:TestEntries/t:TestEntry', $namespace))
    $counters = Get-Attributes $document.SelectSingleNode('/t:TestRun/t:ResultSummary/t:Counters', $namespace)
    $rows = [System.Collections.Generic.List[object]]::new()
    foreach ($result in $results)
    {
        $id = $result.GetAttribute('testId')
        $executionId = $result.GetAttribute('executionId')
        $definition = @($definitions | Where-Object { $_.GetAttribute('id') -eq $id })
        $entry = @($entries | Where-Object { $_.GetAttribute('testId') -eq $id -and $_.GetAttribute('executionId') -eq $executionId })
        if ($definition.Count -ne 1 -or $entry.Count -ne 1)
        {
            throw 'Actual result does not have exactly one definition and execution entry.'
        }
        $execution = $definition[0].SelectSingleNode('t:Execution', $namespace)
        $method = $definition[0].SelectSingleNode('t:TestMethod', $namespace)
        if (!$execution -or !$method -or $execution.GetAttribute('id') -ne $executionId)
        {
            throw 'Actual definition execution ID/method mismatch.'
        }
        if ($result.GetAttribute('outcome') -ne 'Passed' -or
            $definition[0].GetAttribute('name') -ne $result.GetAttribute('testName') -or
            $method.GetAttribute('codeBase') -notlike "$($report.expectedCodeBasePrefix)*" -or
            $method.GetAttribute('className') -notin $report.expectedClasses)
        {
            throw 'Actual case result/name/source role/class does not match the selected unchanged fixture.'
        }
        $rows.Add([ordered]@{
            result = Get-Attributes $result
            definition = Get-Attributes $definition[0]
            method = Get-Attributes $method
            execution = Get-Attributes $execution
            entry = Get-Attributes $entry[0]
        })
    }
    $names = @($rows | ForEach-Object { $_.result.testName } | Sort-Object)
    $expectedNames = @($report.expectedNames | Sort-Object)
    if ($names.Count -ne $expectedNames.Count -or (Compare-Object $names $expectedNames))
    {
        throw "Each expanded case must match the declared native selection: $path"
    }
    if ($results.Count -eq 0 -or $results.Count -ne $definitions.Count -or $results.Count -ne $entries.Count -or
        [int]$counters.total -ne $results.Count -or [int]$counters.executed -ne $results.Count -or
        [int]$counters.passed -ne $results.Count -or [int]$counters.failed -ne 0)
    {
        throw 'Actual XML results/definitions/entries/counters do not reconcile.'
    }
    foreach ($key in $counters.Keys)
    {
        if ($key -notin @('total', 'executed', 'passed', 'failed') -and [int]$counters[$key] -ne 0)
        {
            throw "Unexpected nonzero actual XML counter: $key"
        }
    }
    $reports.Add([ordered]@{
        role = $report.role
        scenario = $report.scenario
        path = $report.path
        bytes = (Get-Item -LiteralPath $path).Length
        sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
        run = Get-Attributes $document.DocumentElement
        summary = Get-Attributes $document.SelectSingleNode('/t:TestRun/t:ResultSummary', $namespace)
        counters = $counters
        rows = $rows.ToArray()
    })
}
$receipt = [ordered]@{
    parser = 'System.Xml.XmlDocument with XmlReader DTD prohibited and namespace-aware element/attribute traversal'
    scriptSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    selectionSha256 = (Get-FileHash -LiteralPath $selectionPath -Algorithm SHA256).Hash
    reports = $reports.ToArray()
    actualRowExecutions = @($reports | ForEach-Object { $_.rows }).Count
    findingsStatus = 'PENDING'
}
$destination = Join-Path $Root 'research\xml-system-reconciliation.json'
[System.IO.File]::WriteAllText("$destination.partial", ($receipt | ConvertTo-Json -Depth 30))
Move-Item -LiteralPath "$destination.partial" -Destination $destination -Force
[ordered]@{ result = 'PASS'; reports = $reports.Count; actualRowExecutions = $receipt.actualRowExecutions; receipt = $destination } | ConvertTo-Json
