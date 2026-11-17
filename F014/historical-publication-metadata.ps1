$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F014'
$path = Join-Path $run 'preparation-history.json'
if (Test-Path $path)
{
    throw 'Preserve actual preparation history.'
}
$execution = Get-Content (Join-Path $run 'preparation-attempts\attempt-001\execution.json') -Raw | ConvertFrom-Json
$records = @($execution.commands)
$audit = Get-Content (Join-Path $run 'measurement-audit.json') -Raw | ConvertFrom-Json
if ($execution.newOwningTestRuns -ne 0 -or $records.Count -ne 4 -or
    @($records | Where-Object actualExitCode -NE 0).Count -or
    @($records | Where-Object { $_.arguments[0] -ceq 'build' }).Count -ne 1 -or
    @($records | Where-Object { $_.arguments[0] -ceq 'restore' }).Count -ne 1 -or
    @($records | Where-Object { $_.arguments -ccontains '--characterize' }).Count -ne 2 -or
    -not $audit.auditPassed -or -not $audit.actualLiveAuditPassed -or
    $audit.actualNewOwningTestRuns -ne 0 -or $audit.explicitlyReusedOriginalAreaRows -ne 27 -or
    $audit.actualWorkloadIterations -ne 112 -or $audit.retainedResults -ne 107 -or
    $audit.actualWarmups -ne 42 -or $audit.actualOverheadIterations -ne 267)
{
    throw 'Actual independent user-send preparation and live audit required.'
}
foreach ($relative in 'investigation-execution\attempt-001\execution.json',
    'preparation-execution\attempt-001\execution.json', 'measurement-execution\attempt-001\execution.json',
    'analysis-attempts\attempt-001\execution.json')
{
    $commands = @(Get-Content (Join-Path $run $relative) -Raw | ConvertFrom-Json)
    if (@($commands | Where-Object actualExitCode -NE 0).Count)
    {
        throw 'Do not omit an actual preparation/reader/timing failure.'
    }
}
[ordered]@{
    candidate = 'F014'; readerFailures = @(); actualNewNativePreparationCommands = 4
    actualNewBuilds = 1; actualNewRestores = 1; actualNewCompleteCharacterizations = 2
    actualNewOwningTestRuns = 0; explicitlyReusedOriginalAreaRows = 27; actualNewCurrentProducerBuilds = 0
    actualNativePreparationFailures = 0; actualReaderFailures = 0; actualTimingFailures = 0
    originalOwnerAndCurrentJsonBytesExplicitlyReusedFrom = 'F011; actual original commands/timestamps/TRX/images, hashes and new actual user-send source/PDB/runtime witnesses retained.'
    priorGroupBroadcastConnectionObservationsOrTimingUsedAsUserSendProof = $false
    actualOriginalOnlyProfiles = 1; actualCandidateProfiles = 0; actualPairedComparisons = 0
    additionalTimingAuthorized = $false; repositoryOriginalJsonOutputsUnchanged = $true
    independentExtraction = 'analysis-attempts\attempt-001\extract-analysis.log; actual exit0.'
    independentAudit = 'analysis-attempts\attempt-001\reproduce-analysis.log; actual exit0.'
    actualDefaultUserIdProducer = 'DefaultUserIdProvider.GetUserId on real configured connection principals during untimed setup; not an internal handshake invocation.'
    qualification = 'Fresh source/history reader, first harness build, both native19-check/14-wrapper producer runs, sole14-shape diagnostic, extraction and independent audit passed without failed attempts or reruns. Two existing provider/interface snapshots reused; feature interface adds one source,90 total per image. No old group/broadcast/connection timing or new owning-suite/current-producer build claim.'
} | ConvertTo-Json -Depth 10 | Set-Content $path
Write-Output 'F014 reconciled: four successful native preparation commands, no new reader/native/timing failure, explicitly borrowed27-row tests/current JSON, one independent original-only profile.'
