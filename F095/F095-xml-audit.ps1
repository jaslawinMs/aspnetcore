param(
    [Parameter(Mandatory)][string]$RunRoot,
    [ValidateSet('before', 'after', 'restored')][string[]]$Variants = @('before'),
    [switch]$Verify
)
$ErrorActionPreference = 'Stop'
$expected = @(
    'LoadAsync_InvokesApplicationModelProviders',
    'LoadAsync_CreatesEndpoint_WithRoute',
    'LoadAsync_InvokesApplicationModelProviders_WithTheRightOrder',
    'LoadAsync_CachesResults',
    'LoadAsync_IsUniquePerPageDescriptor',
    'LoadAsync_CompiledPageActionDescriptor_ReturnsSelf'
)
$actual = [ordered]@{}
$hashes = [ordered]@{}
foreach ($variant in $Variants)
{
    $file = Join-Path $RunRoot "tests-$variant\F095-loader-$variant.trx"
    [xml]$document = Get-Content -LiteralPath $file -Raw
    $results = @($document.TestRun.Results.UnitTestResult)
    $definitions = @($document.TestRun.TestDefinitions.UnitTest)
    $counters = $document.TestRun.ResultSummary.Counters
    if ($results.Count -ne 6 -or $definitions.Count -ne 6 -or [int]$counters.passed -ne 6 -or
        [int]$counters.total -ne 6 -or [int]$counters.executed -ne 6 -or
        [int]$counters.notExecuted -ne 0 -or [int]$counters.failed -ne 0)
    {
        throw "Actual $variant result/definition/counter count differs."
    }
    $rows = foreach ($result in $results)
    {
        $definition = @($definitions | Where-Object id -ceq $result.testId)
        if ($definition.Count -ne 1 -or
            $definition[0].TestMethod.className -cne 'Microsoft.AspNetCore.Mvc.RazorPages.Infrastructure.DefaultPageLoaderTest' -or
            $definition[0].TestMethod.name -cnotin $expected -or
            $result.testName -cne "$($definition[0].TestMethod.className).$($definition[0].TestMethod.name)" -or
            $result.outcome -cne 'Passed' -or [TimeSpan]::Parse($result.duration).Ticks -le 0)
        {
            throw "Actual identity/outcome/duration differs:$variant/$($result.testName)"
        }
        [pscustomobject]@{
            testName = $result.testName
            className = $definition[0].TestMethod.className
            methodName = $definition[0].TestMethod.name
            outcome = $result.outcome
            duration = $result.duration
            actualTestId = $result.testId
        }
    }
    $actual[$variant] = @($rows | Sort-Object testName)
    if ((($actual[$variant].methodName | Sort-Object) -join "`n") -cne (($expected | Sort-Object) -join "`n"))
    {
        throw "Each exact required method must execute once:$variant"
    }
    if (($actual[$variant].testName -join "`n") -cne ($actual[$Variants[0]].testName -join "`n"))
    {
        throw 'Actual owning test identities must match across variants.'
    }
    $hashes[$variant] = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
}
$audit = [ordered]@{
    candidate = 'F095'
    passedPerVariant = 6
    variantsAudited = $Variants
    actualRows = 6 * $Variants.Count
    skipped = 0
    matchingActualTestNames = $true
    boundary = 'Existing DefaultPageLoader tests exercise actual cache, factory/provider order, endpoint route and compiled-self behavior with mock compiler/providers. The separate external real-DI/default-catalog/compiler-extension harness establishes actual typed model, pending producer, fault/cancel and primed allocation behavior. These are preservation checks, not fabricated bug-fix red/green.'
    trxSha256 = $hashes
    variants = $actual
} | ConvertTo-Json -Depth 8
$file = Join-Path $RunRoot 'actual-test-audit.json'
if ($Verify)
{
    if ((Get-Content -LiteralPath $file -Raw).Replace("`r`n", "`n").TrimEnd("`n") -cne
        $audit.Replace("`r`n", "`n").TrimEnd("`n"))
    {
        throw 'Nonmutating actual TRX audit differs.'
    }
}
else
{
    $audit | Set-Content -LiteralPath $file -Encoding utf8
}
Write-Output "F095: all $($Variants.Count * 6) actual rows passed;6 exact methods per variant, no skips."
