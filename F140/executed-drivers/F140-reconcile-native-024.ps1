$ErrorActionPreference = 'Stop'
$parallel = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism'
$root = Join-Path $parallel 'finding-F140-implementation-019'
$prior = Get-Content -LiteralPath (Join-Path $parallel 'finding-F140-F141-native-013\native-system-xml-full-reconciliation-019.json') -Raw | ConvertFrom-Json
$expected = @($prior.runs[0].rows.testName | Sort-Object)
$runs = @()
foreach ($role in @('Original37', 'Default90'))
{
    foreach ($variant in @('baseline', 'candidate'))
    {
        $file = Join-Path $root "invocations\$role-$variant-native-022\F140-native-022.trx"
        $xml = [System.Xml.XmlDocument]::new()
        $xml.Load($file)
        $ns = [System.Xml.XmlNamespaceManager]::new($xml.NameTable)
        $ns.AddNamespace('t', $xml.DocumentElement.NamespaceURI)
        $results = @($xml.SelectNodes('/t:TestRun/t:Results/t:UnitTestResult', $ns))
        $definitions = @($xml.SelectNodes('/t:TestRun/t:TestDefinitions/t:UnitTest', $ns))
        $entries = @($xml.SelectNodes('/t:TestRun/t:TestEntries/t:TestEntry', $ns))
        if ($results.Count -ne 7 -or $definitions.Count -ne 7 -or $entries.Count -ne 7)
        {
            throw 'Actual native result/definition/entry cardinality mismatch.'
        }
        $names = @($results | ForEach-Object { $_.GetAttribute('testName') } | Sort-Object)
        if (Compare-Object $names $expected)
        {
            throw 'Actual seven native Facts differ from the independently accepted original selection.'
        }
        $counters = $xml.SelectSingleNode('/t:TestRun/t:ResultSummary/t:Counters', $ns)
        foreach ($attribute in $counters.Attributes)
        {
            $value = if ($attribute.Name -in @('total', 'executed', 'passed')) { '7' } else { '0' }
            if ($attribute.Value -ne $value)
            {
                throw "Actual native counter differs: $($attribute.Name)."
            }
        }
        $rows = foreach ($result in $results)
        {
            $id = $result.GetAttribute('testId')
            $execution = $result.GetAttribute('executionId')
            $definition = @($definitions | Where-Object { $_.GetAttribute('id') -eq $id })
            $entry = @($entries | Where-Object { $_.GetAttribute('testId') -eq $id -and $_.GetAttribute('executionId') -eq $execution })
            if ($result.GetAttribute('outcome') -ne 'Passed' -or $definition.Count -ne 1 -or $entry.Count -ne 1 -or
                $definition[0].SelectSingleNode('t:Execution', $ns).GetAttribute('id') -ne $execution)
            {
                throw 'Actual native result/definition/execution identity differs.'
            }
            $method = $definition[0].SelectSingleNode('t:TestMethod', $ns)
            @{
                testName = $result.GetAttribute('testName')
                outcome = 'Passed'
                testId = $id
                executionId = $execution
                actualClass = $method.GetAttribute('className')
                actualMethod = $method.GetAttribute('name')
                actualCodeBase = $method.GetAttribute('codeBase')
                actualStorage = $definition[0].GetAttribute('storage')
            }
        }
        $runs += @{
            role = $role
            variant = $variant
            file = $file
            sha256 = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
            actualDefinitions = 7
            actualEntries = 7
            actualPassed = 7
            rows = @($rows)
        }
    }
}
$receipt = @{
    recordedAt = [DateTime]::UtcNow.ToString('o')
    actualParser = 'System.Xml.XmlDocument'
    actualExactNamesDefinitionsEntriesExecutionsCountersReconciled = $true
    actualPassedExecutions = 28
    actualDistinctFacts = 7
    actualReplayedNativeWorkForReconciliation = $false
    runs = $runs
}
$file = Join-Path $root 'native-real-system-xml-024.json'
if (Test-Path -LiteralPath $file)
{
    throw 'Independent native reconciliation already exists.'
}
$receipt | ConvertTo-Json -Depth 14 | Set-Content -LiteralPath $file -Encoding utf8
@{ actualIndependentXmlPassed = $true; actualNativeImages = 4; actualNativeExecutions = 28; actualDistinctFacts = 7 } | ConvertTo-Json
