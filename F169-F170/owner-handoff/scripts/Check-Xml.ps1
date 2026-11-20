$ErrorActionPreference = 'Stop'
function Attributes([Xml.XmlElement]$Element)
{
    $result = [ordered]@{}
    if ($Element) { foreach ($attribute in $Element.Attributes) { $result[$attribute.Name] = $attribute.Value } }
    return $result
}
$runs = @()
foreach ($file in Get-ChildItem -LiteralPath "$PSScriptRoot\native" -Recurse -Filter '*.trx' -File | Sort-Object FullName)
{
    $document = [Xml.XmlDocument]::new()
    $document.Load($file.FullName)
    $ns = [Xml.XmlNamespaceManager]::new($document.NameTable)
    $ns.AddNamespace('t','http://microsoft.com/schemas/VisualStudio/TeamTest/2010')
    $rows = @($document.SelectNodes('/t:TestRun/t:Results/t:UnitTestResult',$ns) | ForEach-Object { Attributes $_ })
    $definitions = @($document.SelectNodes('/t:TestRun/t:TestDefinitions/t:UnitTest',$ns) | ForEach-Object {
        @{attributes=(Attributes $_);method=(Attributes $_.SelectSingleNode('t:TestMethod',$ns));execution=(Attributes $_.SelectSingleNode('t:Execution',$ns))}
    })
    $entries = @($document.SelectNodes('/t:TestRun/t:TestEntries/t:TestEntry',$ns) | ForEach-Object { Attributes $_ })
    $counters = Attributes $document.SelectSingleNode('/t:TestRun/t:ResultSummary/t:Counters',$ns)
    if ([int]$counters.total -ne $rows.Count -or $rows.Count -ne $definitions.Count -or $rows.Count -ne $entries.Count) { throw 'XML cardinality mismatch' }
    foreach ($row in $rows)
    {
        $definition = @($definitions | Where-Object { $_.attributes.id -eq $row.testId })
        $entry = @($entries | Where-Object { $_.testId -eq $row.testId -and $_.executionId -eq $row.executionId })
        if ($definition.Count -ne 1 -or $entry.Count -ne 1 -or $definition[0].execution.id -ne $row.executionId) { throw 'XML execution ID association mismatch' }
    }
    $relative = [IO.Path]::GetRelativePath("$PSScriptRoot\native",$file.FullName)
    $expected = if ($relative -like 'default\initial-runtime\*') { 0 } else { 4 }
    if ($rows.Count -ne $expected -or @($rows | Where-Object outcome -ne 'Passed').Count -ne 0) { throw "Unexpected actual native rows: $relative" }
    $runs += @{
        source=$file.FullName; capsulePath="native\$relative"
        sha256=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        run=(Attributes $document.DocumentElement); counters=$counters
        rows=$rows; definitions=$definitions; entries=$entries
        summaryXml=$document.SelectSingleNode('/t:TestRun/t:ResultSummary',$ns).OuterXml
    }
}
if ($runs.Count -ne 3) { throw 'Expected both successful runs and the actual zero-row default failure' }
@{
    parser=[Xml.XmlDocument].Assembly.FullName
    framework=[Runtime.InteropServices.RuntimeInformation]::FrameworkDescription
    pid=$PID; runs=$runs
    executions=8; distinctNativeNames=4
    theoryRows='None selected: the exact class has four Facts. No fixture, skipped or parameterized rows were present or discarded.'
} | ConvertTo-Json -Depth 30 | Set-Content "$PSScriptRoot\system-xml-validation.json" -Encoding utf8NoBOM
Write-Output 'System.Xml: 3 TRX documents; 8 passed executions, 4 distinct native Fact names; default failed runtime attempt has 0 rows.'
