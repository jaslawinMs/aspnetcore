param(
    [Parameter(Mandatory)]
    [string]$RunRoot,
    [ValidateSet('Original', 'Candidate', 'Both')]
    [string]$Variant = 'Both'
)

$ErrorActionPreference = 'Stop'
$selected = if ($Variant -eq 'Both') { @('Original', 'Candidate') } else { @($Variant) }
$audits = @()
foreach ($source in $selected)
{
    $lower = $source.ToLowerInvariant()
    $directory = Join-Path $RunRoot "validation\$lower-razor-page-tests-001"
    $commandPath = Join-Path $directory 'command.json'
    $resultPath = Join-Path $directory 'result.json'
    $trxPath = Join-Path $directory "test-results\F044-$lower-razor.trx"
    $command = Get-Content -LiteralPath $commandPath -Raw | ConvertFrom-Json
    $result = Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json
    if ($result.exitCode -ne 0 -or -not $result.protectedPinUnchanged -or
        $command.arguments -notcontains 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Razor.RazorPageTest')
    {
        throw "The $source command did not complete successfully with the declared test selection."
    }

    [xml]$document = Get-Content -LiteralPath $trxPath -Raw
    $results = @($document.TestRun.Results.UnitTestResult)
    $definitions = @($document.TestRun.TestDefinitions.UnitTest)
    $counters = $document.TestRun.ResultSummary.Counters
    if ($results.Count -ne 59 -or [int]$counters.total -ne 59 -or
        [int]$counters.executed -ne 59 -or [int]$counters.passed -ne 59 -or
        [int]$counters.failed -ne 0 -or [int]$counters.notExecuted -ne 0 -or
        @($results | Where-Object outcome -ne 'Passed').Count -ne 0)
    {
        throw "The actual $source TRX does not contain every expected passed case."
    }

    $rows = foreach ($row in $results)
    {
        $definition = @($definitions | Where-Object id -eq $row.testId)
        if ($definition.Count -ne 1 -or
            $definition[0].TestMethod.className -notlike 'Microsoft.AspNetCore.Mvc.Razor.RazorPageTest*')
        {
            throw "A $source result has no unique actual RazorPageTest definition."
        }

        [pscustomobject]@{
            name = [string]$row.testName
            outcome = [string]$row.outcome
            duration = [string]$row.duration
            testId = [string]$row.testId
            executionId = [string]$row.executionId
            className = [string]$definition[0].TestMethod.className
            methodName = [string]$definition[0].TestMethod.name
        }
    }
    $theory = @($rows | Where-Object methodName -eq 'DefineSection_BaseImplementationRejectsCaseInsensitiveDuplicateWithoutReplacingWriter')
    if ($theory.Count -ne 2 -or
        @($theory | Where-Object { $_.name.Contains('"scripts"', [StringComparison]::Ordinal) }).Count -ne 1 -or
        @($theory | Where-Object { $_.name.Contains('"SCRIPTS"', [StringComparison]::Ordinal) }).Count -ne 1)
    {
        throw "Both real $source preservation theory rows were not independently observed."
    }

    $audits += [pscustomobject]@{
        variant = $source
        actualRows = $rows.Count
        actualDefinitions = $definitions.Count
        actualAllPassed = $true
        actualSkipped = 0
        actualBothNewTheoryValuesPassed = $true
        trxSha256 = (Get-FileHash -LiteralPath $trxPath -Algorithm SHA256).Hash
        commandSha256 = (Get-FileHash -LiteralPath $commandPath -Algorithm SHA256).Hash
        resultSha256 = (Get-FileHash -LiteralPath $resultPath -Algorithm SHA256).Hash
        rows = @($rows)
    }
}

if ($Variant -eq 'Both')
{
    $before = @($audits[0].rows.name | Sort-Object -CaseSensitive)
    $after = @($audits[1].rows.name | Sort-Object -CaseSensitive)
    if (@(Compare-Object $before $after -CaseSensitive).Count -ne 0)
    {
        throw 'Original and candidate actual test inventories differ.'
    }
}

[pscustomobject]@{
    candidate = 'F044'
    actualXmlParsed = $true
    actualVariant = $Variant
    actualGreenGreenPreservationNotBugFixRedGreen = $true
    audits = $audits
} | ConvertTo-Json -Depth 12
