$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$capsule = Join-Path $root 'capsule'
$output = Join-Path $root 'SEALED.json'
if (Test-Path -LiteralPath $output)
{
    throw 'Preserve an existing completion before another attempt.'
}
$manifest = Get-Content -Raw -LiteralPath "$capsule\MANIFEST.json" | ConvertFrom-Json
$digest = (Get-FileHash -LiteralPath "$capsule\MANIFEST.json" -Algorithm SHA256).Hash
$seal = Get-Content -Raw -LiteralPath "$root\seal-attempt-002.receipt.json" | ConvertFrom-Json
$audit = Get-Content -Raw -LiteralPath "$root\audit-attempt-002.receipt.json" | ConvertFrom-Json
foreach ($receipt in @($seal, $audit))
{
    if ($receipt.exitCode -ne 0 -or !$receipt.exited -or !$receipt.bothStreamsDrained -or !$receipt.structuredResultValidated -or $receipt.manifestSha256After -ne $digest)
    {
        throw 'A completed, structured-validated helper receipt is missing.'
    }
}
if ($audit.manifestSha256Before -ne $digest)
{
    throw 'Read-only audit manifest differed.'
}
if ((Get-Content -Raw -LiteralPath "$capsule\MANIFEST.sha256").Trim() -ne "$digest  MANIFEST.json")
{
    throw 'Manifest sidecar differs.'
}
$files = @(Get-ChildItem -LiteralPath $capsule -File -Recurse)
$physicalBytes = ($files | Measure-Object -Property Length -Sum).Sum
$selfBytes = (Get-Item -LiteralPath "$capsule\MANIFEST.json").Length + (Get-Item -LiteralPath "$capsule\MANIFEST.sha256").Length
if ($files.Count -ne $manifest.count + 2 -or $physicalBytes -ne $manifest.bytes + $selfBytes)
{
    throw 'Physical capsule counts differ from the audited manifest plus two self files.'
}
$terminal = Get-Content -Raw -LiteralPath "$capsule\TERMINAL.json" | ConvertFrom-Json
$closing = Get-Content -Raw -LiteralPath "$capsule\closing.json" | ConvertFrom-Json
$identities = [System.Collections.Generic.List[object]]::new()
foreach ($item in $terminal.processObservations)
{
    $identities.Add([ordered]@{ processId = $item.recorded.processId; creationTimeUtc = $item.recorded.creationDate; source = 'native-root-wrapper-or-observed-descendant' })
}
foreach ($command in $closing.commands)
{
    $identities.Add([ordered]@{ processId = $command.processId; creationTimeUtc = $command.creationTimeUtc; source = $command.label })
}
foreach ($helper in @($seal, $audit, (Get-Content -Raw -LiteralPath "$root\seal-attempt-001.receipt.json" | ConvertFrom-Json), (Get-Content -Raw -LiteralPath "$root\audit-attempt-001.receipt.json" | ConvertFrom-Json)))
{
    $identities.Add([ordered]@{ processId = $helper.processId; creationTimeUtc = $helper.creationTimeUtc; source = "$($helper.kind)-attempt-$($helper.attempt)" })
}
$seen = [System.Collections.Generic.HashSet[string]]::new()
$observations = [System.Collections.Generic.List[object]]::new()
function Normalize-Utc($Value)
{
    $date = if ($Value -is [DateTime]) { $Value } else { [DateTime]::Parse([string]$Value, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind) }
    return $date.ToUniversalTime().ToString('o')
}
foreach ($identity in $identities)
{
    $recorded = Normalize-Utc $identity.creationTimeUtc
    if (!$seen.Add("$($identity.processId)|$recorded"))
    {
        continue
    }
    $current = Get-Process -Id $identity.processId -ErrorAction SilentlyContinue
    $state = 'not-running-at-recorded-PID'
    $currentStart = $null
    $method = 'exact PID/StartTime identity or absent PID'
    if ($current)
    {
        $birth = $current.StartTime
        if ($birth)
        {
            $currentStart = Normalize-Utc $birth
            $state = if ($currentStart -eq $recorded) { 'still-owned' } else { 'PID-reused-not-owned' }
        }
        else
        {
            $snapshot = Get-CimInstance Win32_Process -Filter "ProcessId=$($identity.processId)" -Property ProcessId, CreationDate -ErrorAction Stop
            $method = 'Nullable StartTime fallback to this exact PID only; matching CIM microsecond conservatively remains possibly owned'
            if (!$snapshot)
            {
                $state = 'process-gone-during-probe'
            }
            elseif (!$snapshot.CreationDate)
            {
                throw "Creation identity unavailable for PID $($identity.processId); do not claim quiescence."
            }
            else
            {
                $currentStart = Normalize-Utc $snapshot.CreationDate
                $state = if ($currentStart.Substring(0, 26) -eq $recorded.Substring(0, 26)) { 'still-owned' } else { 'PID-reused-not-owned' }
            }
        }
        $current.Dispose()
    }
    $observations.Add([ordered]@{ processId = $identity.processId; recordedCreationTimeUtc = $recorded; currentCreationTimeUtc = $currentStart; source = $identity.source; method = $method; state = $state })
}
$remaining = @($observations | Where-Object { $_.state -eq 'still-owned' })
if ($remaining.Count -ne 0)
{
    throw 'An owned recorded process remains; completion cannot be claimed.'
}
$record = [ordered]@{
    status = 'SEALED_PREPARATION_PENDING_COORDINATOR_ACCEPTANCE'
    findings = @('F182', 'F183', 'F184', 'F185', 'F186')
    findingStatus = 'PENDING'
    actualAgentId = 'd766df6d-0b55-44d6-846d-7050b83f2eea'
    capsule = $capsule
    handoff = "$capsule\HANDOFF.md"
    results = "$capsule\RESULTS.json"
    observedAtUtc = [DateTime]::UtcNow.ToString('o')
    finalizerScriptSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    manifestedFiles = $manifest.count
    manifestedBytes = $manifest.bytes
    physicalFilesIncludingTwoSelfFiles = $files.Count
    physicalBytesIncludingTwoSelfFiles = $physicalBytes
    manifestFileBytes = (Get-Item -LiteralPath "$capsule\MANIFEST.json").Length
    manifestSha256 = $digest
    audit = [ordered]@{
        result = 'PASS'
        executable = $audit.executable
        arguments = $audit.arguments
        processId = $audit.processId
        creationTimeUtc = $audit.creationTimeUtc
        exited = $audit.exited
        bothStreamsDrained = $audit.bothStreamsDrained
        structuredResultValidated = $audit.structuredResultValidated
        manifestUnchanged = $true
        receipt = "$root\audit-attempt-002.receipt.json"
        receiptSha256 = (Get-FileHash -LiteralPath "$root\audit-attempt-002.receipt.json" -Algorithm SHA256).Hash
        stdout = $audit.stdout
        stdoutSha256 = (Get-FileHash -LiteralPath $audit.stdout -Algorithm SHA256).Hash
        stderr = $audit.stderr
        stderrSha256 = (Get-FileHash -LiteralPath $audit.stderr -Algorithm SHA256).Hash
    }
    source = [ordered]@{
        original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
        wholeDefaultBuiltAndTested = 'adf2e9d22addd1461c6c25e8a8f411be28b81100'
        separatelyObservedClosingMainNotBuiltOrTested = '0328b915263b84541e57b75f824e79a75f2d5ed3'
    }
    newNative = [ordered]@{ reports = 2; uniqueFacts = 9; rowExecutions = 18; allPassed = $true; selectedTheoryRows = 0 }
    supplemental = [ordered]@{ rowsPerRole = 9; assertionsPerRole = 185; allPassed = $true; newSuccessfulCommonCompilations = 1; failedCommonCompilations = 0 }
    newDotnetRoots = 12
    dotnetSuccesses = 10
    preservedPrerequisiteFailures = 2
    closingReadOnlyCliRoots = 13
    firstSealAndAuditPassedThenOptionalFinalizerHadNullableStartTime = "$capsule\seal-history\001\HISTORY.json"
    finalPidCreationObservations = $observations.ToArray()
    actualRemainingOwnedNativeRootsOrObservedChildren = $remaining.Count
    allRecordedStreamsAndObservedDescendantsDrained = $true
    finalProcessBoundary = '106 native/root-wrapper/sampled descendant identities plus thirteen closing CLI and all four first/final seal/audit identities rechecked. Earlier synchronous helper children were awaited, not an exhaustive historical PID census. No watchers.'
    performanceOutcome = $null
    noCandidateOrCampaignWrites = $true
}
$record | ConvertTo-Json -Depth 20 | Set-Content -Encoding utf8NoBOM "$output.stage"
Move-Item -LiteralPath "$output.stage" -Destination $output
[ordered]@{
    result = 'SEALED; F182-F186 PENDING'
    completion = $output
    completionSha256 = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash
    manifestFiles = $manifest.count
    manifestBytes = $manifest.bytes
    manifestSha256 = $digest
    physicalFiles = $files.Count
    physicalBytes = $physicalBytes
    knownPidCreationIdentities = $observations.Count
    ownedRemaining = $remaining.Count
    auditProcessId = $audit.processId
    auditCreationTimeUtc = $audit.creationTimeUtc
    auditPassedAndDrained = $true
} | ConvertTo-Json
