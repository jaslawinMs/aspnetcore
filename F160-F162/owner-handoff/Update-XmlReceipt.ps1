$ErrorActionPreference = 'Stop'
$file = "$PSScriptRoot\evidence\native-default69\default-native69.trx"
$document = [System.Xml.XmlDocument]::new()
$document.Load($file)
$namespaces = [System.Xml.XmlNamespaceManager]::new($document.NameTable)
$namespaces.AddNamespace('t', 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010')
$rows = @($document.SelectNodes('//t:UnitTestResult', $namespaces) | ForEach-Object {
    [ordered]@{
        testName = $_.GetAttribute('testName')
        testId = $_.GetAttribute('testId')
        executionId = $_.GetAttribute('executionId')
        outcome = $_.GetAttribute('outcome')
        output = $_.OuterXml
    }
})
$definitions = @($document.SelectNodes('//t:UnitTest', $namespaces) | ForEach-Object {
    [ordered]@{
        name = $_.GetAttribute('name')
        id = $_.GetAttribute('id')
        executionId = $_.SelectSingleNode('t:Execution', $namespaces).GetAttribute('id')
        className = $_.SelectSingleNode('t:TestMethod', $namespaces).GetAttribute('className')
        methodName = $_.SelectSingleNode('t:TestMethod', $namespaces).GetAttribute('name')
    }
})
$receipt = [ordered]@{
    role = 'default69'
    parser = 'System.Xml.XmlDocument + namespace-aware XPath (real XML parser)'
    reportSha256 = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
    runOutcome = $document.SelectSingleNode('//t:ResultSummary', $namespaces).GetAttribute('outcome')
    counters = @($document.SelectSingleNode('//t:Counters', $namespaces).Attributes | ForEach-Object { @{name=$_.Name;value=$_.Value} })
    rows = $rows
    definitions = $definitions
    uniqueTestIds = @($rows.testId | Sort-Object -Unique).Count
    uniqueExecutionIds = @($rows.executionId | Sort-Object -Unique).Count
    messages = @($document.SelectNodes('//t:Message', $namespaces) | ForEach-Object { $_.InnerText })
    rawXml = $document.OuterXml
}
$existing = @(Get-Content "$PSScriptRoot\evidence\real-xml-parse.json" -Raw | ConvertFrom-Json | Where-Object { $_.role -ne 'default69' })
@($existing) + @($receipt) | ConvertTo-Json -Depth 20 | Set-Content "$PSScriptRoot\evidence\real-xml-parse.json"
[ordered]@{role=$receipt.role;rows=$rows.Count;passed=@($rows|Where-Object {$_.outcome -eq 'Passed'}).Count;outcome=$receipt.runOutcome;parser=$receipt.parser} | ConvertTo-Json
