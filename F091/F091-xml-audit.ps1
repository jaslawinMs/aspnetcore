param([Parameter(Mandatory)][string]$RunRoot, [switch]$Verify)
$ErrorActionPreference = 'Stop'
$variants = [ordered]@{}
foreach ($variant in 'before', 'after')
{
    $file = Join-Path $RunRoot "tests-$variant\F091-google-$variant.trx"
    [xml]$document = Get-Content -LiteralPath $file -Raw
    $results = @($document.TestRun.Results.UnitTestResult)
    $definitions = @($document.TestRun.TestDefinitions.UnitTest)
    if ($results.Count -ne 50 -or $definitions.Count -ne 50)
    {
        throw "Expected 50 actual Google test rows and definitions for $variant."
    }
    $rows = foreach ($result in $results)
    {
        $definition = @($definitions | Where-Object id -eq $result.testId)
        if ($definition.Count -ne 1 -or
            $definition[0].TestMethod.className -cne 'Microsoft.AspNetCore.Authentication.Google.GoogleTests' -or
            $result.outcome -ne 'Passed' -or [TimeSpan]::Parse($result.duration).Ticks -le 0)
        {
            throw "Incorrect actual Google test result/definition/duration: $variant/$($result.testName)"
        }
        [pscustomobject]@{
            testName = $result.testName
            methodName = $definition[0].TestMethod.name
            className = $definition[0].TestMethod.className
            duration = $result.duration
            outcome = $result.outcome
            actualTestId = $result.testId
        }
    }
    $variants[$variant] = @($rows | Sort-Object testName)
    if ($variants[$variant].Count -ne 50)
    {
        throw 'All 50 actual test records must remain in the audit.'
    }
}
if (($variants.before.testName -join "`n") -ne ($variants.after.testName -join "`n"))
{
    throw 'Original and selected actual Google test identities differ.'
}
$audit = [pscustomobject]@{
    candidate = 'F091'
    originalPassed = 50
    selectedPassed = 50
    skipped = 0
    matchingActualTestNames = $true
    verificationBoundary = 'Existing actual Google query/state preservation tests; green/green, not a functional red/green claim.'
    variants = $variants
} | ConvertTo-Json -Depth 8
$auditPath = Join-Path $RunRoot 'actual-test-audit.json'
if ($Verify)
{
    $existing = Get-Content -LiteralPath $auditPath -Raw
    if ($existing.Replace("`r`n", "`n").TrimEnd("`n") -cne $audit.Replace("`r`n", "`n").TrimEnd("`n"))
    {
        throw 'Existing actual TRX audit differs; verification does not rewrite records.'
    }
}
else
{
    $audit | Set-Content -LiteralPath $auditPath -Encoding utf8
}
Write-Output 'F091: all 50 original and 50 selected actual Google test rows passed with matching identities.'
