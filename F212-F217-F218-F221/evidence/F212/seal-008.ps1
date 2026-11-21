$ErrorActionPreference='Stop'
$Root='C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F212-233'
$ParentRoot=Split-Path $Root
$Agent='c485590a-1d0d-4aa3-971b-e1bfc2bfe790'
$Utf8=[Text.UTF8Encoding]::new($false)
function Save([string] $Relative,[byte[]] $Value)
{
    $path=Join-Path $Root $Relative
    [void][IO.Directory]::CreateDirectory((Split-Path $path))
    $s=[IO.File]::Open($path,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
    try { $s.Write($Value,0,$Value.Length) } finally { $s.Dispose() }
    return $path
}
function Json([string] $Relative,$Value)
{
    $path=Save $Relative $Utf8.GetBytes((ConvertTo-Json -InputObject $Value -Depth 100))
    $null=[IO.File]::ReadAllText($path) | ConvertFrom-Json
    return $path
}
function Hash([byte[]] $Value) { return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($Value)) }
function FileHash([string] $Path) { return Hash ([IO.File]::ReadAllBytes($Path)) }
function Blob([byte[]] $Value)
{
    $h=$Utf8.GetBytes("blob $($Value.Length)`0"); $b=[byte[]]::new($h.Length+$Value.Length)
    [Array]::Copy($h,0,$b,0,$h.Length); [Array]::Copy($Value,0,$b,$h.Length,$Value.Length)
    return [Convert]::ToHexString([Security.Cryptography.SHA1]::HashData($b)).ToLowerInvariant()
}
try
{
    $raw=[IO.File]::ReadAllBytes((Join-Path $ParentRoot 'policy.json'))
    $null=Save 'guards\008-sealer-entry.policy.json' $raw
    $policy=$Utf8.GetString($raw) | ConvertFrom-Json
    $scope=([IO.File]::ReadAllText((Join-Path $Root 'registrations\233234-observed003.json')) | ConvertFrom-Json).registrationScopes.F212
    $lease=Test-Path -LiteralPath (Join-Path $ParentRoot 'benchmark-exclusive.lease.json')
    $admitted=$policy.independentFindingPreparationWorkers.F212 -ceq $Agent -and
        $policy.activeWorkerPreparationScopes.F212 -ceq $scope -and $policy.actualWorkerBuildHoldActive -eq $false -and
        $policy.buildAndTestWorkQuiesced -eq $false -and -not $lease
    $null=Json 'guards\008-sealer-entry.admission.json' ([ordered]@{
        observedUtc=[DateTime]::UtcNow.ToString('O');policySha256=Hash $raw;actualAgent=$policy.independentFindingPreparationWorkers.F212
        exactScopeMatches=($policy.activeWorkerPreparationScopes.F212 -ceq $scope);benchmarkLeasePresent=$lease
        actualWorkerBuildHoldActive=$policy.actualWorkerBuildHoldActive;buildAndTestWorkQuiesced=$policy.buildAndTestWorkQuiesced
        admittedThisStartOnly=$admitted;purpose='Offline read/hash/seal only; this helper starts no child process'
    })
    if (-not $admitted) { throw 'Fresh F212 sealer guard denied; no native child or success fallback.' }
    $self=[Diagnostics.Process]::GetCurrentProcess()
    $sealerIdentity=[ordered]@{
        processId=$PID;processStartUtc=$self.StartTime.ToUniversalTime().ToString('O');helperPath=$PSCommandPath
        helperSha256=FileHash $PSCommandPath;argv=[Environment]::GetCommandLineArgs();commandLine=[Environment]::CommandLine
        oneExecutionOnly=$true;childrenStarted=@();terminalAuthority='functions.powershell tool completion; not self-attested before this process returns'
    }
    $self.Dispose()
    $null=Json 'sealer-008.invocation.json' $sealerIdentity
    $qualification=[IO.File]::ReadAllText((Join-Path $Root 'qualification-007.json')) | ConvertFrom-Json
    $null=[IO.File]::ReadAllText((Join-Path $Root 'tool-observations-007.json')) | ConvertFrom-Json
    if ($qualification.disposition -cne 'SOURCE_ONLY_INTENTIONAL_DISPATCH_NO_MATERIAL_CANDIDATE' -or $qualification.candidateCreated)
    { throw 'Unexpected source disposition at seal.' }
    $pins=[IO.File]::ReadAllText((Join-Path $Root 'source-pins-003.json')) | ConvertFrom-Json
    $checkedSources=[Collections.Generic.List[object]]::new()
    $absences=[Collections.Generic.List[object]]::new()
    foreach ($manifest in @('source-memberships-003.json','external-memberships-004.json','source-memberships-005.json','source-memberships-006.json'))
    {
        $entries=[IO.File]::ReadAllText((Join-Path $Root $manifest)) | ConvertFrom-Json
        foreach ($entry in $entries)
        {
            if ($entry.PSObject.Properties['present'] -and $entry.present -eq $false)
            {
                $absences.Add([pscustomobject]@{manifest=$manifest;repository=$entry.repository;role=$entry.role;commit=$entry.commit;path=$entry.path})
                continue
            }
            if (-not $entry.savedPath.StartsWith($Root+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Source binding escapes private evidence root.' }
            $bytes=[IO.File]::ReadAllBytes($entry.savedPath)
            $sha=Hash $bytes; $blob=Blob $bytes
            if ($sha -cne $entry.sha256 -or $blob -cne $entry.blob -or $bytes.Length -ne $entry.bytes)
            { throw "Source membership integrity mismatch: $manifest $($entry.path)" }
            $checkedSources.Add([pscustomobject]@{
                manifest=$manifest;repository=$entry.repository;role=$entry.role;commit=$entry.commit;path=$entry.path
                savedPath=$entry.savedPath;bytes=$bytes.Length;sha256=$sha;gitBlob=$blob
            })
        }
    }
    $null=Json 'source-integrity-008.json' ([ordered]@{
        everyPresentBindingRehashed=$true;verifiedBindings=$checkedSources.Count;verified=@($checkedSources.ToArray())
        observedExactPathAbsences=@($absences.ToArray());sourceProvenanceIsNotLoadedRuntimeProof=$true
    })
    $nativeFiles=@(Get-ChildItem -LiteralPath (Join-Path $Root 'native') -File -Filter '*.process.json' | Sort-Object Name)
    $nativeRecords=@(foreach ($f in $nativeFiles) { [IO.File]::ReadAllText($f.FullName) | ConvertFrom-Json })
    if ($nativeRecords.Count -ne 36) { throw "Expected36 actual direct gh/git records; found $($nativeRecords.Count)." }
    foreach ($record in $nativeRecords)
    {
        if (-not $record.rootTerminal -or $record.exitCode -ne 0 -or -not $record.stdoutDrained -or -not $record.stderrDrained)
        { throw "Incomplete direct native root/stream: $($record.label)" }
        if ($record.executable -cnotin @('gh','git')) { throw 'Unexpected executable in source-only collection.' }
        $null=[IO.File]::ReadAllBytes($record.stdoutPath); $null=[IO.File]::ReadAllBytes($record.stderrPath)
    }
    $helperFiles=@(Get-ChildItem -LiteralPath $Root -File -Filter 'collector-*.invocation.json' | Sort-Object Name)
    $helperChecks=[Collections.Generic.List[object]]::new()
    foreach ($file in $helperFiles)
    {
        $inv=[IO.File]::ReadAllText($file.FullName) | ConvertFrom-Json
        if ((FileHash $inv.helperPath) -cne $inv.helperSha256) { throw "Executed helper changed after execution: $($inv.helperPath)" }
        $id=if ($inv.PSObject.Properties['processId']) {[int]$inv.processId} else {[int]$inv.powershellProcessId}
        $startValue=if ($inv.PSObject.Properties['processStartUtc']) {$inv.processStartUtc} else {$inv.powershellProcessStartUtc}
        $expectedStart=([DateTime]$startValue).ToUniversalTime()
        $start=$expectedStart.ToString('O')
        $state='NotObserved'
        try
        {
            $old=[Diagnostics.Process]::GetProcessById($id)
            try
            {
                $actualStart=$old.StartTime.ToUniversalTime()
                if ($actualStart.Ticks -eq $expectedStart.Ticks -and -not $old.HasExited) { $state='OwnedIdentityStillRunning' }
                elseif ($actualStart.Ticks -ne $expectedStart.Ticks) { $state='PidReused_NotOurIdentity' }
                else { $state='Exited' }
            }
            finally { $old.Dispose() }
        }
        catch
        {
            if ($_.Exception.GetBaseException() -is [ArgumentException]) { $state='Absent' } else { throw }
        }
        $helperChecks.Add([pscustomobject]@{invocationFile=$file.Name;helperPath=$inv.helperPath;processId=$id;processStartUtc=$start;currentExactIdentityState=$state;helperBytesUnchanged=$true})
    }
    if ($helperChecks.Count -ne 6 -or @($helperChecks | Where-Object {$_.currentExactIdentityState -ceq 'OwnedIdentityStillRunning'}).Count -ne 0)
    { throw 'Prior owning helper identities not all terminal/absent/reused as expected.' }
    $null=Json 'native-terminal-008.json' ([ordered]@{
        directReadOnlyRootCount=$nativeRecords.Count;directRoots=@($nativeRecords);allDirectRootsExited=$true;allDirectStreamsDrained=$true
        priorOuterHelperChecks=@($helperChecks.ToArray());owningHelperToolExitCodes=@(1,1,0,0,0,0)
        knownLiveOwnedChildren=@();outstandingOwnedNativeWork=@();descendantClosureLimit='No descendant enumeration; no universal descendant or unrelated-process quiescence claim.'
        currentSealer=$sealerIdentity;currentSealerStartsChildren=$false;outerShellRawSeparateStreamsAvailable=$false
    })
    $before=[IO.File]::ReadAllText((Join-Path $Root 'reserved\before003.snapshot.json')) | ConvertFrom-Json
    $after=[IO.File]::ReadAllText((Join-Path $Root 'reserved\after006.snapshot.json')) | ConvertFrom-Json
    if (-not $after.allAssignedReservedInvariantsUnchanged) { throw 'Latest actual read-only git observation is not unchanged.' }
    if ((FileHash (Join-Path $before.gitDirectory 'HEAD')) -cne $before.headFileSha256 -or
        (FileHash (Join-Path $before.gitDirectory 'index')) -cne $before.indexSha256) { throw 'Reserved HEAD/index bytes changed before seal.' }
    foreach ($report in $before.untracked)
    {
        if ((FileHash (Join-Path 'C:\src\aspnetcore' $report.path)) -cne $report.sha256) { throw "Reserved unrelated report changed: $($report.path)" }
    }
    $null=Json 'reserved\seal008-byte-recheck.json' ([ordered]@{
        latestGitSnapshot='reserved\after006.snapshot.json';headAndIndexBytesRechecked=$true;allFourUntrackedReportBytesRechecked=$true
        reservedFilesWrittenByThisOwner=@();latestObservedHead=$after.head;latestObservedBranch=$after.branch
    })
    $null=Save 'candidate.diff' ([byte[]]::new(0))
    $targetOriginal=@($checkedSources | Where-Object {$_.role -ceq 'Original' -and $_.path -ceq 'src/Components/WebView/Samples/PhotinoPlatform/src/PhotinoWebViewManager.cs'})
    $targetDefault=@($checkedSources | Where-Object {$_.role -ceq 'Default' -and $_.path -ceq 'src/Components/WebView/Samples/PhotinoPlatform/src/PhotinoWebViewManager.cs'})
    if ($targetOriginal.Count -ne 1 -or $targetDefault.Count -ne 1 -or $targetOriginal[0].gitBlob -cne $targetDefault[0].gitBlob)
    { throw 'Finding-site pinned-role identity check failed.' }
    $null=Json 'validation-008.json' ([ordered]@{
        state='SOURCE_ONLY_COMPLETE_PENDING_COORDINATOR_ACCEPTANCE';sourceIntegrity='All present exact bindings rehashed and Git blob IDs recomputed'
        sourceBindings=$checkedSources.Count;observedAbsences=$absences.Count;targetOriginal=$targetOriginal[0];targetDefault=$targetDefault[0]
        nativeDirectRootsTerminal=$true;nativeDirectStreamsDrained=$true;priorExecutedHelpersImmutable=$true
        candidateDiffBytes=0;candidateDiffSha256=FileHash (Join-Path $Root 'candidate.diff');graphsCreated=@();testsRun=@();testRows=@()
        runtimeOrBrowserValidation=$false;redGreenFixVerification=$false;performanceMeasurement=$false;performanceQualification=$false
        sharedCheckoutIndexHeadReportsPreserved=$true;shippingFilesChanged=@();outstandingOwnedWork=@()
    })
    $jsonFiles=@(Get-ChildItem -LiteralPath $Root -File -Recurse -Filter '*.json')
    foreach ($file in $jsonFiles) { $null=[IO.File]::ReadAllText($file.FullName) | ConvertFrom-Json }
    $null=Json 'json-readback-008.json' ([ordered]@{
        parsedEveryPreIndexJson=$true;parsedPaths=@($jsonFiles.FullName);count=$jsonFiles.Count
        ownFileAndIndexSealHandoff='Each is parsed immediately after CreateNew write; index payload is then rehashed from disk'
    })
    $entries=@(Get-ChildItem -LiteralPath $Root -File -Recurse | Sort-Object FullName | ForEach-Object {
        $bytes=[IO.File]::ReadAllBytes($_.FullName)
        [pscustomobject]@{path=$_.FullName.Substring($Root.Length+1);bytes=$bytes.Length;sha256=Hash $bytes}
    })
    $indexValue=[ordered]@{
        format='F212-233 complete payload index v1';root=$Root;hashAlgorithm='SHA256';entryCount=$entries.Count
        totalBytes=($entries | Measure-Object bytes -Sum).Sum
        exclusions='This index, artifact-seal-008.json and final HANDOFF.json are bound separately by the final handoff; no self-referential hash claim.'
        files=$entries
    }
    $indexPath=Json 'artifact-index-008.json' $indexValue
    foreach ($entry in $entries)
    {
        $bytes=[IO.File]::ReadAllBytes((Join-Path $Root $entry.path))
        if ($bytes.Length -ne $entry.bytes -or (Hash $bytes) -cne $entry.sha256) { throw "Post-index file verification failed: $($entry.path)" }
    }
    $indexSha=FileHash $indexPath
    $sealValue=[ordered]@{
        format='F212-233 payload seal v1';algorithm='SHA256';artifactIndexPath=$indexPath;artifactIndexSha256=$indexSha
        verifiedPayloadFiles=$entries.Count;everyIndexedFileRehashedAfterIndexWrite=$true
        qualificationSha256=FileHash (Join-Path $Root 'qualification-007.json')
        nativeTerminalSha256=FileHash (Join-Path $Root 'native-terminal-008.json')
        sourceIntegritySha256=FileHash (Join-Path $Root 'source-integrity-008.json')
        candidateDiffSha256=FileHash (Join-Path $Root 'candidate.diff')
        selfHashAuthority='Final HANDOFF.json binds this seal; parent receives final HANDOFF SHA256 from the tool response.'
    }
    $sealPath=Json 'artifact-seal-008.json' $sealValue
    $handoff=[ordered]@{
        finding='F212';ownerAgentId=$Agent;go='GO233';recordedUtc=[DateTime]::UtcNow.ToString('O')
        state='SEALED_SOURCE_ONLY_PENDING_COORDINATOR_ACCEPTANCE'
        disposition=$qualification.disposition;summary=$qualification.conclusion
        sourceRolePins=$pins;targetOriginal=$targetOriginal[0];targetDefault=$targetDefault[0]
        qualificationPath=Join-Path $Root 'qualification-007.json';qualificationSha256=$sealValue.qualificationSha256
        sourceMembershipManifests=@('source-memberships-003.json','external-memberships-004.json','source-memberships-005.json','source-memberships-006.json')
        candidate=[ordered]@{created=$false;diffPath=Join-Path $Root 'candidate.diff';bytes=0;sha256=$sealValue.candidateDiffSha256;privateGraphsCreated=@()}
        validation=[ordered]@{boundary='Pinned source/history and authoritative Windows documentation only';runtimeProof=$false;tests=@();testRows=@();performance=@();measuredNoGain=$false}
        nativeTerminal=[ordered]@{
            path=Join-Path $Root 'native-terminal-008.json';sha256=$sealValue.nativeTerminalSha256;directGhGitRoots=36;allDirectRootsExited=$true;bothDirectStreamsDrained=$true
            knownLiveOwnedChildren=@();outstandingOwnedWork=@();descendantLimit='No universal descendant-closure claim'
            sealerIdentity=$sealerIdentity;sealerExitAuthority='Only the external functions.powershell completed exit code establishes this final helper root exit; not self-proven while writing.'
        }
        fullFailureArtifacts=@('collector-001.failure.json','collector-001.failure.txt','collector-002.failure.json','collector-002.failure.txt','tool-observations-007.json')
        limits=$qualification.operationalLimitsAndFailures;unverifiedBoundary=$qualification.faithfulValidationBoundary.unverified
        reservedStatePreserved=$true;sharedWrites=@();outstandingWork=@();nextActor='coordinator only; acceptance/finalization/publication'
        artifactIndex=[ordered]@{path=$indexPath;sha256=$indexSha;contents=$indexValue}
        artifactSeal=[ordered]@{path=$sealPath;sha256=FileHash $sealPath;contents=$sealValue}
        finalFileHash='No self-referential value; final HANDOFF SHA256 is returned by the sealer tool response for independent parent verification.'
        stopAfterThisHandoff=$true
    }
    $handoffPath=Json 'HANDOFF.json' $handoff
    $reread=[IO.File]::ReadAllText($handoffPath) | ConvertFrom-Json
    if ($reread.artifactIndex.sha256 -cne (FileHash $indexPath) -or $reread.artifactSeal.sha256 -cne (FileHash $sealPath))
    { throw 'Final handoff readback links do not match disk.' }
    Write-Output "HANDOFF_PATH=$handoffPath"
    Write-Output "HANDOFF_SHA256=$(FileHash $handoffPath)"
    Write-Output "ARTIFACT_INDEX_SHA256=$indexSha"
    Write-Output "ARTIFACT_SEAL_SHA256=$(FileHash $sealPath)"
    Write-Output "QUALIFICATION_SHA256=$($sealValue.qualificationSha256)"
    Write-Output "SOURCE_BINDINGS=$($checkedSources.Count) PAYLOAD_FILES=$($entries.Count) DIRECT_GH_GIT_ROOTS=36 ALL_EXITED_AND_BOTH_STREAMS_DRAINED=True"
    Write-Output "DISPOSITION=$($qualification.disposition)"
    Write-Output "SEALER_ROOT_PID=$PID START_UTC=$($sealerIdentity.processStartUtc) CHILDREN_STARTED=0"
}
catch
{
    $failure=$_ | Format-List * -Force | Out-String
    $null=Save 'sealer-008.failure.txt' $Utf8.GetBytes($failure)
    $null=Json 'sealer-008.failure.json' ([ordered]@{state='FAILED_NOT_SEALED_NO_SUCCESS_FALLBACK';exception=$failure;anyExistingHandoffNotAccepted=$true})
    Write-Error -ErrorAction Continue $failure
    exit 1
}
