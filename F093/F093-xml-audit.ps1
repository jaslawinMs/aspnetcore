param([Parameter(Mandatory)][string]$RunRoot, [switch]$Verify)
$ErrorActionPreference = 'Stop'
$variants = [ordered]@{}
$methods = @('RequestServicesAreNotOverwrittenIfAlreadySet', 'RequestServicesAreDisposedOnCompleted', 'RequestServicesAreDisposedAsynOnCompleted')
foreach ($variant in 'before', 'after', 'restored')
{
    [xml]$document = Get-Content (Join-Path $RunRoot "tests-$variant\F093-http-$variant.trx") -Raw
    $results = @($document.TestRun.Results.UnitTestResult)
    $definitions = @($document.TestRun.TestDefinitions.UnitTest)
    $counters = $document.TestRun.ResultSummary.Counters
    if ($results.Count -ne 3 -or $definitions.Count -ne 3 -or [int]$counters.passed -ne 3 -or
        [int]$counters.total -ne 3 -or [int]$counters.notExecuted -ne 0 -or [int]$counters.failed -ne 0)
    {
        throw "Actual $variant row/definition/counter count differs."
    }
    $rows = foreach ($result in $results)
    {
        $definition = @($definitions | Where-Object id -eq $result.testId)
        if ($definition.Count -ne 1 -or $definition[0].TestMethod.className -cne 'Microsoft.AspNetCore.Http.DefaultHttpContextTests' -or
            $definition[0].TestMethod.name -cnotin $methods -or $result.outcome -cne 'Passed' -or
            [TimeSpan]::Parse($result.duration).Ticks -le 0)
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
}
if (($variants.before.testName -join "`n") -cne ($variants.after.testName -join "`n") -or
    ($variants.before.testName -join "`n") -cne ($variants.restored.testName -join "`n") -or
    (($variants.before.methodName | Sort-Object) -join "`n") -cne (($methods | Sort-Object) -join "`n"))
{
    throw 'All three exact owning test identities must match.'
}
$audit = [ordered]@{
    candidate = 'F093'
    originalPassed = 3
    selectedPassed = 3
    actualRows = 6
    skipped = 0
    matchingActualTestNames = $true
    boundary = 'Existing request-services callback/assigned-provider preservation; actual callback producer is additionally exercised by the real TestHost public-response harness. Resource and functional checks are green/green.'
    variants = [ordered]@{ before = $variants.before; after = $variants.after }
} | ConvertTo-Json -Depth 8
$file = Join-Path $RunRoot 'actual-test-audit.json'
if ($Verify)
{
    if ((Get-Content $file -Raw).Replace("`r`n", "`n").TrimEnd("`n") -cne $audit.Replace("`r`n", "`n").TrimEnd("`n"))
    {
        throw 'Nonmutating actual TRX audit differs.'
    }
}
else
{
    $audit | Set-Content $file -Encoding utf8
}
$restoredAudit = $variants.restored |
    Select-Object testName, className, methodName, outcome, duration |
    ConvertTo-Json
$restoredFile = Join-Path $RunRoot 'restored-test-audit.json'
if ($Verify)
{
    if ((Get-Content $restoredFile -Raw).Replace("`r`n", "`n").TrimEnd("`n") -cne
        $restoredAudit.Replace("`r`n", "`n").TrimEnd("`n"))
    {
        throw 'Nonmutating restored actual TRX audit differs.'
    }
}
else
{
    $restoredAudit | Set-Content $restoredFile -Encoding utf8
}
Write-Output 'F093: all nine actual original/candidate/restored rows passed; three exact identities match, no skips.'
