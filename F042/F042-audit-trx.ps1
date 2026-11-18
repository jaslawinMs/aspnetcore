param([Parameter(Mandatory)][string]$RunDirectory)

$ErrorActionPreference = 'Stop'
$recorded = Get-Content -LiteralPath (Join-Path $RunDirectory 'actual-test-row-validation.json') -Raw | ConvertFrom-Json
$allNames = @()
foreach ($variant in @('original', 'candidate'))
{
    $entry = @($recorded | Where-Object variant -CEQ $variant)
    if ($entry.Count -ne 1)
    {
        throw "Require exactly one recorded inventory: $variant"
    }
    $trxPath = Join-Path $RunDirectory "validation\$variant-dictionary-tests-001\results\results.trx"
    if ((Get-FileHash -LiteralPath $trxPath).Hash -cne $entry[0].actualTrxSha256)
    {
        throw "TRX hash mismatch: $variant"
    }
    $xml = [System.Xml.XmlDocument]::new()
    $xml.Load($trxPath)
    $counters = $xml.SelectSingleNode('//*[local-name()="ResultSummary"]/*[local-name()="Counters"]')
    if ($counters.total -ne '34' -or $counters.passed -ne '34' -or $counters.failed -ne '0' -or
        $counters.notExecuted -ne '0')
    {
        throw "Require the actual complete 34-passed, zero-failed, zero-skipped report: $variant"
    }
    $rows = @($xml.SelectNodes('//*[local-name()="Results"]/*[local-name()="UnitTestResult"]') | ForEach-Object {
        [pscustomobject]@{ testName = $_.testName; outcome = $_.outcome; executionId = $_.executionId; testId = $_.testId }
    })
    if ($rows.Count -ne 34 -or @($rows | Where-Object outcome -CNE 'Passed').Count -ne 0 -or
        @($rows.executionId | Select-Object -Unique).Count -ne 34)
    {
        throw "The actual discovered result rows are incomplete or not all passed: $variant"
    }
    $actual = @($rows | ForEach-Object { "$($_.testName)|$($_.outcome)|$($_.executionId)|$($_.testId)" } | Sort-Object)
    $expected = @($entry[0].rows | ForEach-Object { "$($_.testName)|$($_.outcome)|$($_.executionId)|$($_.testId)" } | Sort-Object)
    if (($actual -join "`n") -cne ($expected -join "`n"))
    {
        throw "Independent XML rows disagree with the recorded inventory: $variant"
    }
    $names = @($rows.testName | Sort-Object)
    if ($allNames.Count -ne 0 -and ($names -join "`n") -cne ($allNames -join "`n"))
    {
        throw 'Original and candidate discovered test identities differ.'
    }
    $allNames = $names
}
$focused = @($allNames | Where-Object { $_ -clike '*.DictionaryReplaceTest.*' })
$expectedFocused = @(
    'Replace_AlreadyTypedReference_PreservesIdentityWithoutConversion'
    'Replace_ExistingNullValue_PreservesDictionaryEntry'
    'Replace_MissingKey_ReportsErrorBeforeValueConversion'
    'Replace_ConverterChangesDictionary_WritesCurrentStorage(clear: False)'
    'Replace_ConverterChangesDictionary_WritesCurrentStorage(clear: True)'
) | ForEach-Object { "Microsoft.AspNetCore.JsonPatch.SystemTextJson.IntegrationTests.DictionaryReplaceTest.$_" } | Sort-Object
if (($focused -join "`n") -cne ($expectedFocused -join "`n"))
{
    throw 'Require every preservation case and both real converter-mutation theory rows.'
}
[ordered]@{ actualVariants = 2; actualPassedPerVariant = 34; actualFailed = 0; actualSkipped = 0
    actualIndependentlyParsedXml = $true; actualExactFocusedRows = $focused } | ConvertTo-Json -Depth 6
