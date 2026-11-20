param(
    [string]$OutputPath = '',
    [switch]$Verify
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
function Attributes([System.Xml.XmlElement]$Element)
{
    $result = [ordered]@{}
    foreach ($attribute in $Element.Attributes)
    {
        $result[$attribute.Name] = $attribute.Value
    }
    return $result
}
$records = @()
foreach ($file in (Get-ChildItem -LiteralPath "$root\evidence" -Filter *.trx -File -Recurse | Sort-Object FullName))
{
    $settings = [System.Xml.XmlReaderSettings]::new()
    $settings.DtdProcessing = [System.Xml.DtdProcessing]::Prohibit
    $settings.XmlResolver = $null
    $reader = [System.Xml.XmlReader]::Create($file.FullName, $settings)
    $document = [System.Xml.XmlDocument]::new()
    $document.PreserveWhitespace = $true
    $document.XmlResolver = $null
    try
    {
        $document.Load($reader)
    }
    finally
    {
        $reader.Dispose()
    }
    $definitions = @()
    foreach ($definition in $document.SelectNodes("//*[local-name()='TestDefinitions']/*[local-name()='UnitTest']"))
    {
        $methods = @($definition.SelectNodes("./*[local-name()='TestMethod']"))
        if ($methods.Count -ne 1)
        {
            throw "Expected one real TestMethod in $($file.Name)"
        }
        $definitions += [ordered]@{
            attributes = (Attributes $definition)
            executions = @($definition.SelectNodes("./*[local-name()='Execution']") | ForEach-Object { Attributes $_ })
            method = (Attributes $methods[0])
        }
    }
    $results = @()
    $entries = @($document.SelectNodes("//*[local-name()='TestEntries']/*[local-name()='TestEntry']") | ForEach-Object { Attributes $_ })
    foreach ($result in $document.SelectNodes("//*[local-name()='UnitTestResult']"))
    {
        $matching = @($definitions | Where-Object { $_.attributes.id -eq $result.GetAttribute('testId') })
        $matchingEntries = @($entries | Where-Object { $_.testId -eq $result.GetAttribute('testId') -and $_.executionId -eq $result.GetAttribute('executionId') })
        if ($matching.Count -ne 1 -or $matchingEntries.Count -ne 1 -or
            $result.GetAttribute('executionId') -notin @($matching[0].executions | ForEach-Object { $_.id }))
        {
            throw "Result/definition/execution mismatch in $($file.Name)"
        }
        $results += (Attributes $result)
    }
    if ($entries.Count -ne $results.Count -or $definitions.Count -ne $results.Count)
    {
        throw "Unmatched real execution or definition rows in $($file.Name)"
    }
    $counterNodes = @($document.SelectNodes("//*[local-name()='ResultSummary']/*[local-name()='Counters']"))
    if ($counterNodes.Count -ne 1)
    {
        throw "Expected one real Counters element in $($file.Name)"
    }
    $counters = Attributes $counterNodes[0]
    if ([int]$counters.total -ne $results.Count -or
        [int]$counters.passed -ne @($results | Where-Object { $_.outcome -eq 'Passed' }).Count -or
        [int]$counters.failed -ne @($results | Where-Object { $_.outcome -eq 'Failed' }).Count)
    {
        throw "Actual TRX counters do not reconcile in $($file.Name)"
    }
    $summary = $document.SelectSingleNode("//*[local-name()='ResultSummary']")
    $records += [ordered]@{
        path = [IO.Path]::GetRelativePath($root, $file.FullName)
        sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
        rootAttributes = (Attributes $document.DocumentElement)
        summaryAttributes = (Attributes $summary)
        counters = $counters
        results = $results
        definitions = $definitions
        entries = $entries
        messages = @($document.SelectNodes("//*[local-name()='Message']") | ForEach-Object { $_.InnerText })
    }
}
$receipt = [ordered]@{
    parser = 'System.Xml.XmlReader + XmlDocument; DTD prohibited; XmlResolver null'
    files = $records
}
$json = $receipt | ConvertTo-Json -Depth 40
if ($Verify)
{
    $saved = Get-Content -LiteralPath "$root\evidence\xml-system-receipt.json" -Raw | ConvertFrom-Json -AsHashtable -DateKind String
    if (($saved | ConvertTo-Json -Depth 40 -Compress) -cne ($receipt | ConvertTo-Json -Depth 40 -Compress))
    {
        throw 'Fresh System.Xml reconciliation differs from sealed receipt'
    }
}
if ($OutputPath)
{
    $full = [IO.Path]::GetFullPath($OutputPath)
    if (-not $full.StartsWith("$root\", [StringComparison]::OrdinalIgnoreCase))
    {
        throw 'Output must stay inside this capsule before sealing'
    }
    [IO.File]::WriteAllText($full, $json)
    [ordered]@{ files = $records.Count; resultRows = @($records | ForEach-Object { $_.results }).Count; output = $full } | ConvertTo-Json -Compress
}
else
{
    $json
}
