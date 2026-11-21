$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'source-observer-256b.psm1') -Force
foreach ($name in @('index.json','seal.json','sealer-observation.json'))
{
    if (Test-Path -LiteralPath (Join-Path $PSScriptRoot $name)) { throw "No seal replay or overwrite: $name" }
}
Assert-SourceGuard256 '025-final-source-seal'
$audit=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'input-audit.json') -Raw | ConvertFrom-Json
$handoffPath=Join-Path $PSScriptRoot 'handoff.json'
$handoff=Get-Content -LiteralPath $handoffPath -Raw | ConvertFrom-Json
if ($audit.validatedSourceBindings -ne 30 -or $audit.actualNativeSourceRoots -ne 13 -or $audit.sourceUtilityStartAttempts -ne 14 -or $audit.failedBeforeNativeStart -ne 1) { throw 'Persisted audit counts mismatch.' }
if ($handoff.canonicalStates.F225 -cne 'pending' -or $handoff.canonicalStates.F226 -cne 'pending' -or $handoff.qualificationBoundary -cne 'SOURCE ONLY') { throw 'Handoff scope mismatch.' }
$nativeRows=@(Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.native.json' -File | Sort-Object Name | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json })
$ownedIdentities=@()
foreach ($row in $nativeRows)
{
    if ($null -eq $row.rootPid) { continue }
    if (-not $row.waitForExitReturned -or -not $row.rootHasExited -or $row.rootExitCode -ne 0 -or -not $row.stdoutCopyAwaited -or -not $row.stderrCopyAwaited) { throw 'Root wait/stream terminal evidence changed.' }
    $ownedIdentities += [pscustomobject]@{kind='source root';pid=[int]$row.rootPid;creationUtc=[DateTimeOffset]::Parse($row.rootStartUtc).UtcDateTime}
    foreach ($child in $row.observedChildTerminal)
    {
        if ($child.sameCreationIdentityStillPresent) { throw 'A recorded observed child remained.' }
        $ownedIdentities += [pscustomobject]@{kind='observed direct child';pid=[int]$child.pid;creationUtc=[DateTimeOffset]::Parse($child.creationDate).UtcDateTime}
    }
    foreach ($streamName in @('stdin','stdout','stderr'))
    {
        if ((Get-FileHash -LiteralPath (Join-Path $PSScriptRoot $row.$streamName)).Hash -cne $row.("${streamName}Sha256")) { throw 'Retained exact native stream changed.' }
    }
}
$identityChecks=@()
foreach ($identity in $ownedIdentities)
{
    $now=@(Get-CimInstance Win32_Process -Filter "ProcessId = $($identity.pid)")
    $same=@($now | Where-Object { [Math]::Abs(($_.CreationDate.ToUniversalTime()-$identity.creationUtc).TotalMilliseconds) -lt 1 })
    $identityChecks += [pscustomobject][ordered]@{
        kind=$identity.kind;pid=$identity.pid;recordedCreationUtc=$identity.creationUtc.ToString('O')
        observedAtUtc=[DateTime]::UtcNow.ToString('O');sameCreationIdentityStillPresent=($same.Count -gt 0)
        observation=if ($now.Count -eq 0) { 'PID absent' } elseif ($same.Count -eq 0) { 'PID reused; owned creation identity absent' } else { 'owned identity still present' }
    }
    if ($same.Count -gt 0) { throw "Owned observed identity still present at seal: $($identity.pid)" }
}
$observerPids=@()
foreach ($guardFile in @(Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.guard.json' -File))
{
    $guardRecord=Get-Content -LiteralPath $guardFile.FullName -Raw | ConvertFrom-Json
    $observerPids += [int]$guardRecord.observerPid
}
$sealer=[System.Diagnostics.Process]::GetCurrentProcess()
$sealerObservation=[pscustomobject][ordered]@{
    sealerObserverPid=$PID
    sealerObserverStartUtc=$sealer.StartTime.ToUniversalTime().ToString('O')
    sealerObserverExecutable=$sealer.MainModule.FileName
    actualDistinctAllObservedObserverPids=@($observerPids | Sort-Object -Unique)
    actualDistinctNativeSourceRootPids=$audit.distinctNativeRootPids
    actualNativeSourceObserverPids=$audit.distinctNativeObserverPids
    sourceRootCount=13; sourceStartAttemptCount=14; sourcePreStartFailures=1
    sourceRootWaitMilliseconds=120000; sourceRootWaitsReturned=$true; sourceRootExitCodes=@(0)
    sourceRootBothStreamsAwaited=$true
    distinctObservedChildren=$audit.distinctObservedChildren.Count
    currentOwnedIdentityChecks=$identityChecks
    currentOwnedIdentitiesAbsent=$true
    universalDescendantClosureClaimed=$false
    currentSealerTerminalStatus='not yet observable from within this process; actual enclosing tool return is authoritative'
    enclosingToolExitCode=$null
    noNativeSourceUtilitiesStartedBySealer=$true
    productExecutions=0
}
Write-FreshJson256 (Join-Path $PSScriptRoot 'sealer-observation.json') $sealerObservation
$entries=@()
foreach ($file in @(Get-ChildItem -LiteralPath $PSScriptRoot -File -Recurse -Force | Sort-Object FullName))
{
    $relative=[System.IO.Path]::GetRelativePath($PSScriptRoot,$file.FullName)
    if ($relative -in @('index.json','seal.json')) { continue }
    $entries += [pscustomobject][ordered]@{path=$relative;bytes=$file.Length;sha256=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash}
}
$index=[pscustomobject][ordered]@{
    schemaVersion=1;scope=256;owner='67af6370-08fe-49c0-8900-39c0f83a5f9e'
    root=$PSScriptRoot;createdAtUtc=[DateTime]::UtcNow.ToString('O')
    entryCount=$entries.Count
    indexedBytes=[long](($entries | Measure-Object bytes -Sum).Sum)
    completeSet='Every file under the private evidence root except index.json and seal.json; those two exclusions avoid recursive self-hashing and are explicitly bound by seal.json/final tool output.'
    wholeImmutableSourceBindings=30;uniqueRepositoryPaths=15;wholeFilesPerRole=15
    directSourceStartAttempts=14;actualNativeSourceRoots=13
    handoff='handoff.json';inputAudit='input-audit.json';sealerObservation='sealer-observation.json'
    entries=$entries
}
$indexPath=Join-Path $PSScriptRoot 'index.json'
Write-FreshJson256 $indexPath $index
$indexHash=(Get-FileHash -LiteralPath $indexPath -Algorithm SHA256).Hash
$handoffHash=(Get-FileHash -LiteralPath $handoffPath -Algorithm SHA256).Hash
foreach ($entry in $entries)
{
    $path=Join-Path $PSScriptRoot $entry.path
    if ((Get-Item -LiteralPath $path).Length -ne $entry.bytes -or (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -cne $entry.sha256) { throw "Evidence changed during seal: $($entry.path)" }
}
if ((Get-FileHash -LiteralPath $indexPath -Algorithm SHA256).Hash -cne $indexHash) { throw 'Index changed during seal.' }
$seal=[pscustomobject][ordered]@{
    schemaVersion=1;scope=256;owner='67af6370-08fe-49c0-8900-39c0f83a5f9e';recordedAtUtc=[DateTime]::UtcNow.ToString('O')
    handoffPath=$handoffPath;handoffSha256=$handoffHash;indexPath=$indexPath;indexSha256=$indexHash
    indexedFiles=$entries.Count;indexedBytes=$index.indexedBytes;totalSealedFilesIncludingIndexAndSeal=$entries.Count+2
    wholeImmutableSourceBindings=30;wholeFilesPerRole=15
    sourceUtilityAttempts=14;actualNativeSourceRoots=13;failedBeforeStart=1
    actualDistinctNativeRootPids=$audit.distinctNativeRootPids
    actualDistinctAllObservedObserverPids=$sealerObservation.actualDistinctAllObservedObserverPids
    sealerObserverPid=$PID
    observedChildCount=$audit.distinctObservedChildren.Count
    allSourceRootsWaitedAndStreamsAwaited=$true;allObservedOwnedIdentitiesAbsentAtSeal=$true
    noProductBehaviorOrPerformancePass=$true
    canonicalFindingStates='F225 pending; F226 pending; parent alone accepts/finalizes/retires'
    finalToolExit='not prospectively asserted; read the actual enclosing functions.powershell return'
}
$sealPath=Join-Path $PSScriptRoot 'seal.json'
Write-FreshJson256 $sealPath $seal
if (@(Get-ChildItem -LiteralPath $PSScriptRoot -File -Recurse -Force).Count -ne $entries.Count+2) { throw 'Unexpected evidence set after seal.' }
[pscustomobject][ordered]@{
    handoffPath=$handoffPath;handoffSha256=$handoffHash;indexPath=$indexPath;indexSha256=$indexHash
    sealPath=$sealPath;sealSha256=(Get-FileHash -LiteralPath $sealPath -Algorithm SHA256).Hash
    indexedFiles=$entries.Count;totalSealedFilesIncludingIndexAndSeal=$entries.Count+2;wholeSourceBindings=30;wholeFilesPerRole=15
    sourceUtilityAttempts=14;actualNativeSourceRoots=13;failedBeforeStart=1
    nativeRootPids=$audit.distinctNativeRootPids;allObservedObserverPids=$sealerObservation.actualDistinctAllObservedObserverPids
    nativeRootWaitsReturned=$true;bothNativeStreamsAwaited=$true;observedChildCount=$audit.distinctObservedChildren.Count
    observedOwnedIdentitiesAbsent=$true
    currentToolExitAuthority='Only the actual return after this script finishes; no future self-attested exit.'
} | ConvertTo-Json -Depth 10
