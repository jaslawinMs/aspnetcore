param(
    [Parameter(Mandatory = $true)][string]$TrxPath,
    [Parameter(Mandatory = $true)][ValidateSet('Unit', 'Functional')][string]$Kind,
    [string]$OutputPath
)
$ErrorActionPreference = 'Stop'
if ($OutputPath -and (Test-Path -LiteralPath $OutputPath))
{
    throw 'Do not overwrite a real XML report audit.'
}
[xml]$document = Get-Content -LiteralPath $TrxPath -Raw
$rows = @($document.SelectNodes("//*[local-name()='Results']/*[local-name()='UnitTestResult']"))
$expected = if ($Kind -eq 'Unit') { 10 } else { 5 }
if ($rows.Count -ne $expected)
{
    throw "Expected $expected discovered rows, observed $($rows.Count)."
}
$identities = @($rows | ForEach-Object {
    if ($_.outcome -ne 'Passed')
    {
        throw "An individual test did not pass: $($_.testName) / $($_.outcome)"
    }
    if ($_.testName -match '[\x00-\x1f]')
    {
        throw 'Final test metadata contains a raw control character.'
    }
    [pscustomobject]@{ name = $_.testName; outcome = $_.outcome; executionId = $_.executionId; testId = $_.testId }
})
if (@($identities.name | Sort-Object -Unique).Count -ne $expected)
{
    throw 'Missing or duplicate test identities.'
}
if ($Kind -eq 'Unit')
{
    $methods = [ordered]@{
        Append_PreservesKeyAndValueOrder = 2
        Append_CustomStorePreservesInterfaceReadThenWrite = 1
        Append_DerivedStorePreservesInterfaceOperations = 1
        Append_ValidationPrecedesStoreAccess = 3
        Append_TrailerRestrictionPrecedesReadOnly = 1
        Append_NullValuePreservesEntry = 2
    }
    foreach ($pair in $methods.GetEnumerator())
    {
        if (@($identities | Where-Object { $_.name -like "*.$($pair.Key)*" }).Count -ne $pair.Value)
        {
            throw "Missing a required parameterized method row: $($pair.Key)"
        }
    }
    foreach ($method in @('Append_PreservesKeyAndValueOrder', 'Append_NullValuePreservesEntry'))
    {
        foreach ($value in @('True', 'False'))
        {
            if (@($identities | Where-Object { $_.name -like "*.$method(existing: $value)" }).Count -ne 1)
            {
                throw "Missing individual row $method / $value."
            }
        }
    }
    foreach ($values in @('readOnly: True, invalidName: False', 'readOnly: False, invalidName: True', 'readOnly: False, invalidName: False'))
    {
        if (@($identities | Where-Object { $_.name.EndsWith("Append_ValidationPrecedesStoreAccess($values)") }).Count -ne 1)
        {
            throw "Missing individual validation row: $values"
        }
    }
}
$receipt = [ordered]@{
    candidate = 'F046'
    kind = $Kind
    actualTrxPath = $TrxPath
    actualXmlParsed = $true
    actualPassed = $expected
    actualSkippedOrFailed = 0
    actualSafeDistinctMetadata = $true
    actualEachParameterizedRowIndividuallyChecked = $true
    actualRows = $identities
    actualCreated = [DateTime]::UtcNow.ToString('o')
}
if ($OutputPath)
{
    $receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutputPath -Encoding utf8NoBOM
}
$receipt | ConvertTo-Json -Depth 8
