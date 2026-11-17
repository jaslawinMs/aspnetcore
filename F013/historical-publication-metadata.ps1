$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F013'
$destination = Join-Path $run 'preparation-history.json'
if (Test-Path $destination)
{
    throw 'Preserve actual preparation history.'
}
$paths = @(
    'preparation-attempts\attempt-001\execution.json'
    'tests\owning-comparison\original\execution.json'
    'tests\owning-comparison\original-attempt-002\execution.json'
    'tests\owning-comparison\native-specialization-001\execution.json'
    'tests\owning-comparison\native-specialization-002\execution.json'
    'candidate-preparation\attempt-001\execution.json'
    'candidate-preparation\native-specialization-002\attempt-001\execution.json'
)
$records = foreach ($relative in $paths)
{
    $data = Get-Content (Join-Path $run $relative) -Raw | ConvertFrom-Json
    foreach ($command in $data.commands)
    {
        [pscustomobject]@{ original = $relative; command = $command }
    }
}
$builds = @($records | Where-Object { $_.command.arguments[0] -ceq 'build' })
$restores = @($records | Where-Object { $_.command.arguments[0] -ceq 'restore' })
$tests = @($records | Where-Object { $_.command.arguments[0] -ceq 'test' })
$characterizations = @($records | Where-Object { $_.command.arguments -ccontains '--characterize' })
$failures = @($records | Where-Object { $_.command.actualExitCode -ne 0 })
if ($records.Count -ne 17 -or $builds.Count -ne 7 -or $restores.Count -ne 1 -or $tests.Count -ne 3 -or
    $characterizations.Count -ne 6 -or $failures.Count -ne 1 -or $failures[0].command.actualExitCode -ne 1 -or
    $failures[0].original -cne 'tests\owning-comparison\original\execution.json')
{
    throw 'Actual F013 native preparation history differs.'
}
$formats = foreach ($relative in 'format-validation\execution.json', 'format-validation-native-specialization-002\execution.json')
{
    foreach ($command in Get-Content (Join-Path $run $relative) -Raw | ConvertFrom-Json)
    {
        [pscustomobject]@{ original = $relative; command = $command }
    }
}
if (@($formats).Count -ne 4 -or @($formats | Where-Object { $_.command.actualExitCode -ne 0 }).Count)
{
    throw 'Four successful changed-file whitespace checks required.'
}
$audit = Get-Content (Join-Path $run 'measurement-audit.json') -Raw | ConvertFrom-Json
if (-not $audit.auditPassed -or -not $audit.actualLiveAuditPassed -or $audit.proposalDisposition -cne 'no-gain' -or
    $audit.actualFreshOwningTestRuns -ne 3 -or $audit.actualFreshOwningRows -ne 84 -or
    $audit.explicitlyReusedOriginalAreaRows -ne 27 -or $audit.benchmarkOutcomes -ne 84 -or
    $audit.actualWorkloadIterations -ne 672 -or $audit.retainedResults -ne 645 -or
    $audit.actualWarmups -ne 252 -or $audit.actualOverheadIterations -ne 1511 -or -not $audit.budgetClosed)
{
    throw 'Actual audited fresh suites, all timing and explicit preparation reuse required.'
}
$readerFailures = @(
    (Get-Content (Join-Path $run 'analysis-attempts\independent-audit\attempt-001\observed-failure.json') -Raw | ConvertFrom-Json)
    (Get-Content (Join-Path $run 'analysis-attempts\independent-audit\attempt-002\observed-failure.json') -Raw | ConvertFrom-Json)
)
$tools = foreach ($name in 'F010-extract-comparison.mjs', 'F012-reproduce-analysis.mjs', 'F013-extract-comparison.mjs',
    'F013-finalize-analysis.mjs', 'F013-reproduce-analysis.mjs')
{
    [ordered]@{ name = $name; sha256 = (Get-FileHash (Join-Path $PSScriptRoot $name)).Hash }
}
[ordered]@{
    candidate = 'F013'; nativePreparationCommands = $records
    actualNativePreparationCommands = $records.Count; actualSuccessfulNativePreparationCommands = 16
    actualNewBuildsIncludingFailure = $builds.Count; actualSuccessfulNewBuilds = 6; actualFailedNewBuilds = 1
    actualNewRestores = $restores.Count; actualNewCompleteCharacterizations = $characterizations.Count
    actualNewOwningTestRuns = $tests.Count; actualFreshOwningRows = 84
    explicitInitialBorrowedAreaRows = 27; actualNewCurrentProducerBuilds = 0
    changedFileFormatCommands = $formats; actualSuccessfulChangedFileWhitespaceChecks = 4
    failedOwningPreparation = (Get-Content (Join-Path $run 'tests\owning-comparison\original\observed-failure.json') -Raw | ConvertFrom-Json)
    failedAnalysisReaders = $readerFailures; failedReaderCount = $readerFailures.Count
    successfulIndependentAudit = 'analysis-attempts\independent-audit\attempt-003, syntax and live commands exit0.'
    successfulExtractionCommands = 3; successfulFinalizationCommands = 1
    actualOriginalProfiles = 3; actualCandidateProfiles = 3; actualPairedComparisons = 3
    actualSourceCandidateShapesMeasured = 2; actualOriginalOnlyProfiles = 0; additionalTimingAuthorized = $false
    actualUntimedProducerChecksPerContext = 18; actualTimedWrapperPathsPerContext = 14; actualProducerContexts = 6
    analysisToolProvenance = $tools
    qualification = 'Initial F01127-row preparation test evidence and identical captured-default JSON bytes are explicitly borrowed/rehashed, not new F013 runs/builds. A fresh original test assembly and each candidate actually run28 rows. Original owner bytes are reused/rehashed; both candidate owners are actually compiled. First helper-placement test build fails before a test command/assertion; the premature raw actualNewOwningTestRun flag is explicitly corrected by observed commands. Two read-only auditor schema/expected-padding failures retain exact failed sources/full stderr, no product or timing changes. First successful original runner final informational line interpolates role/count incorrectly; actual TRX/audit are correct and no suite was rerun for that display typo. Functional preservation is green on original/candidates, not functional bug-fix red/green. All3 timing slots used across2 source variants; no more F013 measurement.'
} | ConvertTo-Json -Depth 14 | Set-Content $destination
Write-Output 'F013 preparation reconciled:17 native preparation commands (16 pass,1 failed build),4 successful formatting checks,3 fresh28-row suites,6 actual producer contexts,2 retained reader failures and all3 closed comparison slots.'
