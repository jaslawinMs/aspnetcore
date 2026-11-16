param([Parameter(Mandatory)][string]$RunRoot, [switch]$Verify)
$ErrorActionPreference = 'Stop'
$variants = [ordered]@{}
$methods = @(
    'DefineSection_ThrowsIfSectionIsAlreadyDefined',
    'EnsureRenderedBodyOrSections_SucceedsIfDefinedSectionsAreNotRendered_AndIgnored',
    'EnsureRenderedBodyOrSections_SucceedsIfRenderBodyIsNotCalled_ButAllDefinedSectionsAreRendered',
    'EnsureRenderedBodyOrSections_SucceedsIfRenderBodyIsNotCalledFromPage_AndNoSectionsAreDefined_AndBodyIgnored',
    'EnsureRenderedBodyOrSections_ThrowsIfDefinedSectionsAreNotRendered',
    'EnsureRenderedBodyOrSections_ThrowsIfRenderBodyIsNotCalledFromPage_AndNoSectionsAreDefined',
    'ExecuteAsync_RendersSectionsAndBody',
    'RenderSection_RendersSectionFromPreviousPage',
    'RenderSection_ThrowsIfPreviousSectionWritersIsNotSet',
    'RenderSection_ThrowsIfRequiredSectionIsNotFound',
    'RenderSection_ThrowsIfSectionIsRenderedMoreThanOnce',
    'RenderSectionAsync_ThrowsIfNotInvokedFromLayoutPage',
    'RenderSectionAsync_ThrowsIfSectionIsRenderedMoreThanOnce',
    'RenderSectionAsync_ThrowsIfSectionIsRenderedMoreThanOnce_WithSyncMethod'
)
foreach ($variant in 'before', 'after')
{
    $file = Join-Path $RunRoot "tests-$variant\F094-razor-$variant.trx"
    [xml]$document = Get-Content $file -Raw
    $results = @($document.TestRun.Results.UnitTestResult)
    $definitions = @($document.TestRun.TestDefinitions.UnitTest)
    $counters = $document.TestRun.ResultSummary.Counters
    if ($results.Count -ne 14 -or $definitions.Count -ne 14 -or
        [int]$counters.passed -ne 14 -or [int]$counters.total -ne 14 -or
        [int]$counters.executed -ne 14 -or [int]$counters.notExecuted -ne 0 -or [int]$counters.failed -ne 0)
    {
        throw "Actual $variant row/definition/counter count differs."
    }
    $rows = foreach ($result in $results)
    {
        $definition = @($definitions | Where-Object id -ceq $result.testId)
        if ($definition.Count -ne 1 -or
            $definition[0].TestMethod.className -cne 'Microsoft.AspNetCore.Mvc.Razor.RazorPageTest' -or
            $definition[0].TestMethod.name -cnotin $methods -or
            $result.testName -cne "$($definition[0].TestMethod.className).$($definition[0].TestMethod.name)" -or
            $result.outcome -cne 'Passed' -or [TimeSpan]::Parse($result.duration).Ticks -le 0)
        {
            throw "Actual test identity/outcome/duration differs:$variant/$($result.testName)"
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
    $variants[$variant] = @($rows | Sort-Object testName)
    if ((($variants[$variant].methodName | Sort-Object) -join "`n") -cne
        (($methods | Sort-Object) -join "`n"))
    {
        throw "Each exact required test must execute once:$variant"
    }
}
if (($variants.before.testName -join "`n") -cne ($variants.after.testName -join "`n"))
{
    throw 'Exact owning test identities must match.'
}
$audit = [ordered]@{
    candidate = 'F094'
    originalPassed = 14
    selectedPassed = 14
    actualRows = 28
    skipped = 0
    matchingActualTestNames = $true
    boundary = 'Existing real public-page section/token/body/validation preservation. These green/green tests mostly assign layout writers; the separate real RazorView harness proves actual producer transfer, scoped pooled buffering, final HTML, genuine pending waits and faults. The resource assertion is independently red/green.'
    trxSha256 = [ordered]@{
        before = (Get-FileHash (Join-Path $RunRoot 'tests-before\F094-razor-before.trx') -Algorithm SHA256).Hash
        after = (Get-FileHash (Join-Path $RunRoot 'tests-after\F094-razor-after.trx') -Algorithm SHA256).Hash
    }
    variants = $variants
} | ConvertTo-Json -Depth 8
$file = Join-Path $RunRoot 'actual-test-audit.json'
if ($Verify)
{
    if ((Get-Content $file -Raw).Replace("`r`n", "`n").TrimEnd("`n") -cne
        $audit.Replace("`r`n", "`n").TrimEnd("`n"))
    {
        throw 'Nonmutating actual TRX audit differs.'
    }
}
else
{
    $audit | Set-Content $file -Encoding utf8
}
Write-Output 'F094: all28 actual original/selected rows passed;14 exact identities match, no skips.'
