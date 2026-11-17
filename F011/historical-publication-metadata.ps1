$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F011'
$path = Join-Path $run 'preparation-history.json'
if (Test-Path $path)
{
    throw 'Preserve preparation history.'
}
$records = @(
    foreach ($relative in 'tests\original\execution.json', 'preparation-attempts\attempt-001\execution.json',
        'current-producer-preparation\execution.json', 'current-producer-preparation-attempt-002\execution.json')
    {
        (Get-Content (Join-Path $run $relative) -Raw | ConvertFrom-Json).commands
    }
)
if ($records.Count -ne 11 -or @($records | Where-Object actualExitCode -NE 0).Count)
{
    throw 'Actual native preparation command count or outcomes differ.'
}
$builds = @($records | Where-Object { $_.arguments[0] -ceq 'build' }).Count
$queries = @($records | Where-Object { $_.arguments[0] -ceq 'msbuild' }).Count
$tests = @($records | Where-Object { $_.arguments[0] -ceq 'test' }).Count
$restores = @($records | Where-Object { $_.arguments[0] -ceq 'restore' }).Count
$characterizations = @($records | Where-Object { $_.arguments -ccontains '--characterize' }).Count
if ($builds -ne 5 -or $queries -ne 2 -or $tests -ne 1 -or $restores -ne 1 -or $characterizations -ne 2)
{
    throw 'Actual preparation command classification differs.'
}
[ordered]@{
    candidate = 'F011'
    readerFailures = @(
        (Get-Content (Join-Path $run 'investigation-attempts\attempt-001\observed-failure.json') -Raw | ConvertFrom-Json)
        (Get-Content (Join-Path $run 'current-producer-preparation\observed-failure.json') -Raw | ConvertFrom-Json)
    )
    actualNativePreparationCommands = $records.Count; actualBuilds = $builds
    actualPropertyQueries = $queries; actualOwningTestCommands = $tests; actualRestoreCommands = $restores
    actualCompleteCharacterizations = $characterizations; actualNativePreparationFailures = 0
    actualOriginalOnlyProfiles = 1; actualCandidateProfiles = 0; actualPairedComparisons = 0
    additionalTimingAuthorized = $false
    originalJsonOutputsRestoredByteExact = $true
    independentExtraction = 'analysis-attempts\extraction-001: actual exit0.'
    independentAudit = 'analysis-attempts\independent-audit\attempt-001: actual exit0.'
    qualification = 'Both preserved failures are read-only/prelaunch readers, not product or timing failures. First original owner/test builds, first standalone harness build, both actual JSON producer characterizations, producer overlay/restoration builds and the sole diagnostic profile passed. No completed owning-suite/profile rerun.'
} | ConvertTo-Json -Depth 10 | Set-Content $path
Write-Output 'F011 preparation history reconciled: 11 successful native commands, two retained reader failures, one original-only profile.'
