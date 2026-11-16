param([Parameter(Mandatory)][string]$RunRoot, [switch]$Verify)
$ErrorActionPreference = 'Stop'
$variants = [ordered]@{}
$allowedClasses = @(
    'Microsoft.AspNetCore.TestHost.ResponseResetTests',
    'Microsoft.AspNetCore.TestHost.ResponseFeatureTests',
    'Microsoft.AspNetCore.TestHost.RequestLifetimeTests',
    'Microsoft.AspNetCore.TestHost.Tests.ResponseBodyTests'
)
foreach ($variant in 'initial', 'before', 'after')
{
    $file = switch ($variant)
    {
        'initial' { 'tests-before\F092-testhost-before.trx' }
        'before' { 'tests-before-preservation\F092-testhost-before-preservation.trx' }
        'after' { 'tests-after\F092-testhost-after.trx' }
    }
    $count = if ($variant -eq 'initial') { 23 } else { 26 }
    [xml]$document = Get-Content -LiteralPath (Join-Path $RunRoot $file) -Raw
    $results = @($document.TestRun.Results.UnitTestResult)
    $definitions = @($document.TestRun.TestDefinitions.UnitTest)
    if ($results.Count -ne $count -or $definitions.Count -ne $count -or
        [int]$document.TestRun.ResultSummary.Counters.passed -ne $count)
    {
        throw "Actual $variant TestHost result/definition count differs."
    }
    $rows = foreach ($result in $results)
    {
        $definition = @($definitions | Where-Object id -eq $result.testId)
        if ($definition.Count -ne 1 -or $definition[0].TestMethod.className -cnotin $allowedClasses -or
            $result.outcome -cne 'Passed' -or [TimeSpan]::Parse($result.duration).Ticks -le 0)
        {
            throw "Actual result, class, outcome or duration differs:$variant/$($result.testName)"
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
    if ($variants[$variant].Count -ne $count)
    {
        throw 'Actual rows, not counters alone, must be retained.'
    }
}
if (($variants.before.testName -join "`n") -cne ($variants.after.testName -join "`n"))
{
    throw 'Actual original and selected preservation test identities differ.'
}
$method = 'BodyStream_SynchronousRead_PreservesOffsetShortReadAndEof'
foreach ($variant in 'before', 'after')
{
    $cases = @($variants[$variant] | Where-Object methodName -eq $method)
    if ($cases.Count -ne 3)
    {
        throw 'All three actual cached/uncached synchronous-read theory cases are required.'
    }
    foreach ($value in 8, 9, 256)
    {
        if (@($cases | Where-Object testName -like "*byteCount: $value)*").Count -ne 1)
        {
            throw "Actual theory case $value did not pass."
        }
    }
}
$audit = [pscustomobject]@{
    candidate = 'F092'
    originalInitialPassed = 23
    originalWithPreservationPassed = 26
    selectedPassed = 26
    actualRows = 75
    skipped = 0
    matchingActualTestNames = $true
    allThreeTheoryRowsPassedOnBothOwners = $true
    verificationBoundary = 'Actual TestHost response/lifetime/reset/features preservation; functional green/green. The distinct real-producer zero-wrapper resource assertion is red/green.'
    variants = $variants
} | ConvertTo-Json -Depth 8
$file = Join-Path $RunRoot 'actual-test-audit.json'
if ($Verify)
{
    $existing = Get-Content -LiteralPath $file -Raw
    if ($existing.Replace("`r`n", "`n").TrimEnd("`n") -cne $audit.Replace("`r`n", "`n").TrimEnd("`n"))
    {
        throw 'Nonmutating actual TRX audit differs.'
    }
}
else
{
    $audit | Set-Content -LiteralPath $file -Encoding utf8
}
Write-Output 'F092: all 75 actual TestHost rows passed; all three new rows are green on both owners.'
