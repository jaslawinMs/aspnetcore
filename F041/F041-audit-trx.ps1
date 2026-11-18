param(
    [string]$Directory = $PSScriptRoot,
    [switch]$Verify
)
$ErrorActionPreference = 'Stop'
$relative = 'validation\InputBaseTests-original-001\results\results.trx'
$file = Join-Path $Directory $relative
$document = [xml][System.IO.File]::ReadAllText($file)
$namespaces = [System.Xml.XmlNamespaceManager]::new($document.NameTable)
$namespaces.AddNamespace('t', 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010')
$rows = @(
    foreach ($row in $document.SelectNodes('//t:UnitTestResult', $namespaces))
    {
        [pscustomobject][ordered]@{
            testName = $row.GetAttribute('testName')
            testId = $row.GetAttribute('testId')
            executionId = $row.GetAttribute('executionId')
            outcome = $row.GetAttribute('outcome')
            duration = $row.GetAttribute('duration')
        }
    }
)
if ($rows.Count -ne 21 -or @($rows.executionId | Select-Object -Unique).Count -ne 21 -or
    @($rows | Where-Object { $_.outcome -ne 'Passed' -or $_.testName -notlike '*.InputBaseTest.*' }).Count -ne 0)
{
    throw 'Require all 21 distinct actual InputBase test executions to pass.'
}
$counters = $document.SelectSingleNode('//t:ResultSummary/t:Counters', $namespaces)
if ($counters.GetAttribute('total') -ne '21' -or $counters.GetAttribute('passed') -ne '21' -or
    $counters.GetAttribute('failed') -ne '0' -or $counters.GetAttribute('notExecuted') -ne '0')
{
    throw 'TRX counters disagree with the complete parsed execution rows.'
}
$owner = Get-Content -LiteralPath (Join-Path $Directory 'validation\verified-owner-validation.json') -Raw | ConvertFrom-Json
$identities = @($rows | ForEach-Object { "$($_.testName)|$($_.testId)|$($_.outcome)" } | Sort-Object)
$expected = @($owner.actualRows | ForEach-Object { "$($_.testName)|$($_.testId)|$($_.outcome)" } | Sort-Object)
if (($identities -join "`n") -ne ($expected -join "`n"))
{
    throw 'Actual XML execution identities differ from the original owner-validation receipt.'
}
$result = [ordered]@{ actualIndependentlyParsedXml = $true; source = $relative
    sourceSha256 = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
    actualRows = 21; actualPassed = 21; actualSkipped = 0; rows = $rows }
$destination = Join-Path $Directory 'validation\all-trx-rows.json'
if ($Verify)
{
    $recorded = Get-Content -LiteralPath $destination -Raw | ConvertFrom-Json
    if ($recorded.sourceSha256 -ne $result.sourceSha256 -or
        ($recorded.rows | ConvertTo-Json -Depth 6 -Compress) -ne ($rows | ConvertTo-Json -Depth 6 -Compress))
    {
        throw 'TRX bytes or independently parsed rows differ from the recorded audit.'
    }
}
else
{
    if (Test-Path -LiteralPath $destination)
    {
        throw 'Do not overwrite a completed XML audit; use -Verify.'
    }
    [System.IO.File]::WriteAllText($destination, ($result | ConvertTo-Json -Depth 8) + "`n")
}
[pscustomobject]@{ actualXmlRowsParsed = 21; actualPassed = 21; actualSkipped = 0
    actualNoTestWasRerun = $true; sourceSha256 = $result.sourceSha256 } | ConvertTo-Json
