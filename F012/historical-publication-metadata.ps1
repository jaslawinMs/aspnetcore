$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F012'
$path = Join-Path $run 'preparation-history.json'
if (Test-Path $path)
{
    throw 'Preserve actual preparation history.'
}
$execution = Get-Content (Join-Path $run 'preparation-attempts\attempt-001\execution.json') -Raw | ConvertFrom-Json
$records = @($execution.commands)
if ($execution.newOwningTestRuns -ne 0 -or $records.Count -ne 4 -or @($records | Where-Object actualExitCode -NE 0).Count -or
    @($records | Where-Object { $_.arguments[0] -ceq 'build' }).Count -ne 1 -or
    @($records | Where-Object { $_.arguments[0] -ceq 'restore' }).Count -ne 1 -or
    @($records | Where-Object { $_.arguments -ccontains '--characterize' }).Count -ne 2)
{
    throw 'Actual independent F012 preparation commands differ.'
}
$audit = Get-Content (Join-Path $run 'measurement-audit.json') -Raw | ConvertFrom-Json
if (-not $audit.auditPassed -or -not $audit.actualLiveAuditPassed -or $audit.actualNewOwningTestRuns -ne 0 -or
    $audit.explicitlyReusedOriginalAreaRows -ne 27 -or $audit.retainedResults -ne 91 -or $audit.actualOverheadIterations -ne 223)
{
    throw 'Actual new broadcast audit and explicit reuse boundaries required.'
}
[ordered]@{
    candidate = 'F012'
    readerFailures = @(
        (Get-Content (Join-Path $run 'investigation-execution\observed-failure.json') -Raw | ConvertFrom-Json)
        (Get-Content (Join-Path $run 'analysis-attempts\auditor-scaffold-001\observed-failure.json') -Raw | ConvertFrom-Json)
    )
    actualNewNativePreparationCommands = 4; actualNewBuilds = 1; actualNewRestores = 1
    actualNewCompleteCharacterizations = 2; actualNewOwningTestRuns = 0; explicitlyReusedOriginalAreaRows = 27
    actualNewCurrentProducerBuilds = 0; actualNativePreparationFailures = 0
    originalOwnerAndCurrentJsonBytesExplicitlyReusedFrom = 'F011; exact hashes, prior commands/manifest, actual new source/PDB/runtime witnesses retained.'
    priorGroupObservationsOrTimingUsedAsBroadcastProof = $false
    actualOriginalOnlyProfiles = 1; actualCandidateProfiles = 0; actualPairedComparisons = 0; additionalTimingAuthorized = $false
    repositoryOriginalJsonOutputsUnchanged = $true
    independentExtraction = 'analysis-attempts\extraction-001 actual exit0.'
    independentAudit = 'analysis-attempts\independent-audit\attempt-001 actual exit0.'
    initialAuditScaffoldStderrRedirectedToArtifactFile = $false
    qualification = 'Both failures are read-only source/metadata preparation readers, not product or timing failures. Initial failed sources/observations and investigation console retained; first audit-scaffold tool stderr not separately redirected. Corrected reader runs, first standalone build, both actual broadcast characterizations, sole diagnostic profile, extraction and independent audit pass. No completed owning-suite/profile rerun or F011 timing reuse.'
} | ConvertTo-Json -Depth 10 | Set-Content $path
Write-Output 'F012 preparation reconciled: four successful new native commands, two observed reader failures, explicitly borrowed original test/producer evidence, one independent original-only profile.'
