$ErrorActionPreference = 'Stop'
$Out = $PSScriptRoot
Set-Location $Out
$Utf8 = [System.Text.UTF8Encoding]::new($false)
function WriteJsonNew([string] $Path, $Value)
{
    $json = (ConvertTo-Json -InputObject $Value -Depth 80) + "`n"
    $null = ConvertFrom-Json -InputObject $json
    $bytes = $Utf8.GetBytes($json)
    $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    try
    {
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.Flush($true)
    }
    finally
    {
        $stream.Dispose()
    }
}
$started = [DateTime]::UtcNow.ToString('o')
$handoffPath = Join-Path $Out 'HANDOFF.json'
if (Test-Path -LiteralPath $handoffPath)
{
    throw 'Refusing to overwrite an existing HANDOFF.json.'
}
$analysis = Get-Content (Join-Path $Out 'ANALYSIS.json') -Raw | ConvertFrom-Json
$audit = Get-Content (Join-Path $Out 'SOURCE_AUDIT.json') -Raw | ConvertFrom-Json
$isolation = Get-Content (Join-Path $Out 'ISOLATION_08.json') -Raw | ConvertFrom-Json
$commands = @(Get-Content (Join-Path $Out 'COMMAND_INDEX.json') -Raw | ConvertFrom-Json)
$preparation = Get-Content (Join-Path $Out 'PREPARATION.json') -Raw | ConvertFrom-Json
$raw = Get-Content (Join-Path $Out 'RAW_SOURCE_INDEX.json') -Raw | ConvertFrom-Json
$revisions = Get-Content (Join-Path $Out 'revision_summary_06.json') -Raw | ConvertFrom-Json
$static = Get-Content (Join-Path $Out 'static_producer_check_05.json') -Raw | ConvertFrom-Json
if (-not $audit.sourceChecksPassed -or $audit.runtimeChecksPerformed -or $audit.nativeBuildTestRestoreStarts -ne 0 -or $analysis.retainedCandidate -or $analysis.decision -ne 'bounded-source-only-no-material-candidate')
{
    throw 'Source-only decision/audit prerequisites did not pass.'
}
if (-not $isolation.sameHead -or -not $isolation.sameBranch -or -not $isolation.statusExactlyMatchesInitialBytes -or $isolation.trackedDiffBytes -ne 0 -or @($isolation.protectedReports | Where-Object { -not $_.sameHash -or -not $_.sameLength -or -not $_.sameLastWriteTimeTicks }).Count -ne 0)
{
    throw 'Corrected isolation acceptance is not green.'
}
if (@($commands | Where-Object { -not $_.terminal -or -not $_.redirectedStreamsDrained }).Count -ne 0)
{
    throw 'A source subprocess has not reached the recorded terminal/drained state.'
}
$rootObservations = @()
foreach ($file in (Get-ChildItem -LiteralPath $Out -Filter 'collector_0*.execution.json' | Sort-Object Name))
{
    $execution = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
    $process = Get-Process -Id ([int]$execution.shellPid) -ErrorAction Ignore
    $currentStart = $null
    $sameIdentityActive = $false
    $state = 'not present; prior synchronous invocation completed'
    if ($process)
    {
        $currentStart = $process.StartTime.ToUniversalTime()
        $previousEnd = ([DateTime]$execution.endedUtc).ToUniversalTime()
        $sameIdentityActive = $currentStart.Ticks -le $previousEnd.Ticks
        $state = if ($sameIdentityActive) { 'previous control-process identity may still be active' } else { 'PID reused after this completed invocation; not owned by F196' }
    }
    $rootObservations += [ordered]@{
        executionArtifact = $file.Name
        pid = $execution.shellPid
        recordedCommand = @($execution.argv)
        recordedStartUtc = $execution.startedUtc
        recordedEndUtc = $execution.endedUtc
        recordedExitCode = $execution.exitCode
        currentProcessStartUtc = if ($currentStart) { $currentStart.ToString('o') } else { $null }
        samePriorIdentityActive = $sameIdentityActive
        observedState = $state
    }
}
if (@($rootObservations | Where-Object { $_.samePriorIdentityActive }).Count -ne 0)
{
    throw 'A prior owned source-control root has not been observed terminal.'
}
$processState = [ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    scope = 'Only this F196 preparation216 owner; no claim about other owners or machine quiescence.'
    nativeRootsEverStarted = @()
    testServersEverStarted = @()
    sourceSubprocesses = $commands.Count
    sourceSubprocessesActuallyWaitedAndStreamsDrained = @($commands | Where-Object { $_.terminal -and $_.redirectedStreamsDrained }).Count
    sourceSubprocessIdentityIndex = 'COMMAND_INDEX.json'
    initialFailedInterpreterAttempt = 'The prior PowerShell invocation returned the Windows python-alias exit 9009 and closed redirected output streams. Its shell PID, executable path, argv and exit are preserved in collector_01.execution.json; the alias child PID was not captured. The Python collector body never ran.'
    priorControlRoots = $rootObservations
    pendingOwnedRedirectedStreams = @()
    activeOwnedNativeOrServerProcesses = @()
    observedAdditionalOwnedChildren = @()
    arbitraryStops = 0
    controlWriterAtSeal = [ordered]@{
        pid = $PID
        argv = @('.\seal_handoff_09.ps1')
        startedUtc = $started
        state = 'Running synchronous control-only writer at the instant of sealing; it launches no subprocesses and exits after printing the handoff digest. Its actual terminal exit is the enclosing completed tool result, not a predicted workload-exit claim.'
    }
    unrelatedProcessOrMachineInactivityClaim = $false
}
WriteJsonNew (Join-Path $Out 'PROCESS_TERMINAL_STATE.json') $processState
$acceptance = Get-Content (Join-Path $Out 'ACCEPTANCE.json') -Raw | ConvertFrom-Json
$evidenceByCriterion = @{
    'pinned-source' = 'RAW_SOURCE_INDEX.json; revision_summary_06.json; TARGET_SOURCE_EQUALITY.json; SOURCE_AUDIT.json'
    'producer-and-consumer' = 'ANALYSIS.json; static_producer_check_05.json; complete pinned source under source'
    'context' = 'guidance_02.json; docs/build/test sources; history command outputs; related_work_summary_04.json; related_pr_membership_05.json'
    'candidate-gate' = 'ANALYSIS.json: bounded-source-only-no-material-candidate; no retained candidate'
    'isolation' = 'ISOLATION_08.json; DIFF_INDEX.json; protected report SHA256/length/timestamp equality; no private graphs'
    'native-gate' = 'SOURCE_AUDIT.json; PREPARATION.json; zero native/measurement starts; no gate bypass'
    'sealed-handoff' = 'This finalizer verifies every artifact digest and writes exactly one persistent HANDOFF.json last'
}
foreach ($criterion in $acceptance.criteria)
{
    $criterion.status = 'done'
    $criterion | Add-Member -NotePropertyName evidence -NotePropertyValue $evidenceByCriterion[$criterion.id]
}
$acceptance | Add-Member -NotePropertyName finalDecision -NotePropertyValue $analysis.decision
$acceptance | Add-Member -NotePropertyName completedUtc -NotePropertyValue ([DateTime]::UtcNow.ToString('o'))
$acceptance | Add-Member -NotePropertyName nativeValidation -NotePropertyValue 'Not applicable after source-only rejection; not performed or claimed.'
WriteJsonNew (Join-Path $Out 'ACCEPTANCE_FINAL.json') $acceptance
$artifacts = @()
foreach ($file in (Get-ChildItem -LiteralPath $Out -Recurse -File -Force | Sort-Object FullName))
{
    if ($file.FullName -eq $handoffPath)
    {
        throw 'HANDOFF unexpectedly appeared before seal.'
    }
    $artifacts += [ordered]@{
        path = [System.IO.Path]::GetRelativePath($Out, $file.FullName)
        bytes = $file.Length
        sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
}
foreach ($artifact in $artifacts)
{
    $file = Get-Item -LiteralPath (Join-Path $Out $artifact.path)
    if ($file.Length -ne $artifact.bytes -or (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant() -ne $artifact.sha256)
    {
        throw "Artifact changed during seal: $($artifact.path)"
    }
}
$handoff = [ordered]@{
    schemaVersion = 1
    sealed = $true
    sealedUtc = [DateTime]::UtcNow.ToString('o')
    finding = 'F196'
    preparation = 216
    ownerAgentId = '1fec726d-1dd9-49ba-8189-d1fdd75d886a'
    evidenceRoot = $Out
    status = 'sealed-source-only-no-material-candidate'
    decision = $analysis.decision
    retainedCandidate = $null
    repositoryChanges = @()
    privateGraphsCreated = @()
    scope = 'Only TagCloudViewComponentTagHelper.GetTags materialization; no other finding or one-time producer-copy change.'
    summary = 'The actual test/sample producer has 67 fixed tags. The existing Index path selects 20, 15 and 20 tags through two tag helpers and one view component; its single-use arrays are joined into the expected HTML. Neither an enumerable Join rewrite nor a count-normalized array-range Join has established material justification. No source was changed merely to close a count.'
    sourceVsRuntime = [ordered]@{
        completedBoundary = 'Pinned source/history/tree verification and static consistency with the checked-in expected HTML resource.'
        staticProducerCount = $static.tokenCount
        actualSourceCounts = @($static.observedSourceCounts)
        sourceReferencesSelectedPerIndex = $static.perIndexSourceSelectedStringReferences
        sourceChecksPassed = $true
        nativeBuildTestRestoreCommands = @()
        nativeTestAssertionsReached = $false
        liveHttpOrRenderedBrowserObservation = $false
        measurements = @()
        comparisonBudgetConsumed = 0
        redGreen = 'Not applicable: no behavioral change or performance candidate implemented.'
        limitation = 'Not proven immateriality, measured no-gain or runtime correctness verification.'
    }
    revisions = [ordered]@{
        original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
        observedDefault = $revisions.upstream
        finalDefaultReobservation = $audit.defaultObservation
        finalDefaultCommand = 'commands\08-upstream-main-final.json'
        observedForkDefault = $revisions.fork
        reservedRoot = 'C:\src\aspnetcore'
        reservedBranch = $isolation.branch
        reservedHead = $isolation.head
        reservedRole = 'Protected checkout, not a baseline; unchanged.'
        sourceEquality = 'TARGET_SOURCE_EQUALITY.json'
        targetBlobSha1 = '1f7d821c49ceb55210bdadf031ae8bf3274b4f05'
        targetSha256 = '73bd90034a6e270b38090aa4ea7ed447d804e6b231acb4b1307ce4368b828e53'
        runtimeSupport = $revisions.runtimeSupport
    }
    rawSource = [ordered]@{
        index = 'RAW_SOURCE_INDEX.json'
        completeAspNetCoreFiles = @($raw.verified).Count
        verification = 'Raw bytes validated against SHA256 and Git blob SHA1/tree membership at exact pinned revisions; audit 08 rechecked all source artifact hashes.'
        supportingRuntimeIndex = 'runtime_membership_06.json'
        supportingRuntimeFiles = 5
        actualInstalledSdkRuntimeVerified = $false
        historyIntroduction = 'c87de5a0fc3ef6bd356aeb16d83e406b1abab9ff'
        historyConsumerTransition = 'f1fa1bd8f41a8c42f944ea41eed80cc0b6909cbb'
        relocatedHistoricalPathsVerified = $true
    }
    reasoning = [ordered]@{
        producerSemanticsCallersDefaultsEdgesLifecycle = 'ANALYSIS.json'
        sourceResourceConsistency = 'static_producer_check_05.json'
        arrayRangeVsEnumerable = 'ANALYSIS.json: alternatives, including count clamping, snapshot/exception timing and distinct Join implementations'
        guidance = 'guidance_02.json; source\reserved-working-guidance; pinned documentation/build/project source'
        relatedWorkSearches = 'related_work_summary_04.json'
        relatedWorkFileMembership = 'related_pr_membership_05.json'
        relatedWorkLimit = 'Bounded index/query-dependent GitHub reads, not proof that no related work exists.'
        lowerFaithfulBoundaryIfNeeded = 'Existing Microsoft.AspNetCore.Mvc.FunctionalTests.TagHelpersTest.CanRenderViewsWithTagHelpers(\"Index\") via the actual controller/Razor/TestServer path.'
        nativeTestNotRun = 'No candidate survived; no missing-prerequisite or runtime success claim.'
    }
    isolation = [ordered]@{
        currentEvidence = 'ISOLATION_08.json'
        reservedHeadBranchStatusUnchanged = $true
        inheritedReportsUnchanged = $true
        protectedReports = @($isolation.protectedReports)
        diffIndex = 'DIFF_INDEX.json'
        candidateDiff = @()
        sharedPolicyRegistryLeaseLedgerWrites = 0
        gitFetchCheckoutRefWrites = 0
        githubWrites = 0
        remoteExecution = 0
        subagentsLaunched = 0
    }
    nativeAdmission = [ordered]@{
        coordinatorGo = $preparation.coordinatorGo
        nativeStarts = 0
        freshOwnerLeaseHoldReadRequiredBeforeAnyFutureNativeStart = $true
        actualLeaseHoldReadByThisOwnerForNativeEntry = 'Not applicable: no native entry was attempted.'
        sdkActivationOrAmbientFallback = 'Neither occurred.'
        futureHoldTextTreatedAsActualEntryHold = $false
    }
    commandsAndFailures = [ordered]@{
        commandIndex = 'COMMAND_INDEX.json'
        sourceSubprocesses = $commands.Count
        sourceSubprocessesWithTerminalAndDrainedStreams = $audit.sourceSubprocessesActuallyWaitedAndStreamsDrained
        sourceSubprocessFailuresPreserved = $audit.sourceSubprocessFailures
        rawOutputs = 'commands\*.stdout and commands\*.stderr'
        exactArgvPidsTimesActualExits = 'commands\*.json'
        collectorEnvelopes = 'collector_01.execution.json through collector_08.execution.json'
        allFailureDetails = 'COMMAND_FAILURES.json'
        toolEvidenceAndFailures = 'TOOL_EVIDENCE.json; PREPARATION.json'
        initialInterpreterFailure = 'Exit 9009; Windows python alias unavailable. Original Python script/output and shell execution identity retained; alias child PID was not captured. Fresh PowerShell collector used without installation.'
        auditFailureAndCorrection = 'Audit 07 exited 1 on string-versus-DateTime comparison. Failed script/ISOLATION.json retained; fresh audit 08 compared UTC ticks and passed without changing reserved files.'
        auxiliarySerializationCorrection = 'Blank membership_06.json preserved; membership_06.corrected_07.json contains the correct empty array.'
        missingPathRefProbes = 'Nine Git exits 128 retained; actual default object was available. Correct test/factory paths were resolved from pinned trees and LSP, not substituted baselines.'
        nativeFailures = @()
        correctedSourceAudit = 'SOURCE_AUDIT.json'
        captureLimits = 'All 165 Git/GitHub CLI subprocesses have individual PID, exact argv, raw stdout/stderr, actual exit and drained-stream evidence. The failed initial Windows alias attempt has a shell execution envelope and actual exit, but no individually captured alias child PID. Structured LSP/view tool observations are transcribed in TOOL_EVIDENCE.json, not misrepresented as raw command streams.'
    }
    processTerminalState = $processState
    acceptance = [ordered]@{
        initial = 'ACCEPTANCE.json'
        final = 'ACCEPTANCE_FINAL.json'
        allRequestedSourceOnlyCriteriaGreen = $true
        runtimeAcceptanceIntentionallyNotClaimed = $true
    }
    artifactIndex = [ordered]@{
        algorithm = 'SHA256'
        relativePathSeparator = '\'
        scope = 'Every retained file below evidenceRoot except HANDOFF.json itself, avoiding recursive self-hashing. All listed lengths/digests were verified before this final file was created. HANDOFF.json digest is printed in the completed sealing tool output.'
        count = $artifacts.Count
        totalBytes = ($artifacts | Measure-Object -Property bytes -Sum).Sum
        verifiedBeforeSeal = $true
        files = $artifacts
    }
    coordinatorNextAction = 'Source-only no-candidate gate is ready to consume. No timing/comparison, publication or change finalization was performed by this owner.'
}
WriteJsonNew $handoffPath $handoff
$sha = (Get-FileHash -LiteralPath $handoffPath -Algorithm SHA256).Hash.ToLowerInvariant()
[ordered]@{
    handoff = $handoffPath
    sha256 = $sha
    bytes = (Get-Item -LiteralPath $handoffPath).Length
    indexedArtifacts = $artifacts.Count
    decision = $analysis.decision
    nativeStarts = 0
    priorOwnedControlRootsActive = 0
    sourceSubprocessesTerminalAndDrained = $commands.Count
} | ConvertTo-Json -Depth 6
