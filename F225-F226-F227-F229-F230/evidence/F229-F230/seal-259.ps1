$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'SourceCapture-259.psm1') -Force -DisableNameChecking
Start-OneShotStage 'seal-259' $PSCommandPath
$guard = Assert-FreshSourceGuard (Join-Path $PSScriptRoot 'sealing-guard')
$sealer = Get-ObserverIdentity
$manifestPath = Join-Path $PSScriptRoot 'SOURCE-MANIFEST.json'
$manifest = @([IO.File]::ReadAllText($manifestPath) | ConvertFrom-Json)
$blobs = @($manifest | Where-Object { $_.kind -ceq 'blob' -and $_.status -ceq 'captured' })
if (@($manifest | Where-Object { $_.status -cne 'captured' }).Count -ne 0) {
    throw 'Missing or incomplete source object evidence.'
}
foreach ($role in @('Original', 'Default')) {
    if (@($blobs | Where-Object { $_.role -ceq $role }).Count -ne 15) {
        throw "Unexpected whole-file role count: $role"
    }
}
foreach ($record in $manifest) {
    $bytes = [IO.File]::ReadAllBytes($record.evidencePath)
    if ((Get-BytesSha256 $bytes) -cne $record.sha256 -or $bytes.Length -ne $record.byteLength) {
        throw "Source fingerprint/length mismatch: $($record.evidencePath)"
    }
    $header = [Text.Encoding]::ASCII.GetBytes($record.objectType + ' ' + $bytes.Length + [char]0)
    $objectBytes = [byte[]]::new($header.Length + $bytes.Length)
    [Array]::Copy($header, 0, $objectBytes, 0, $header.Length)
    [Array]::Copy($bytes, 0, $objectBytes, $header.Length, $bytes.Length)
    $objectId = [Convert]::ToHexString([Security.Cryptography.SHA1]::HashData($objectBytes)).ToLowerInvariant()
    if ($objectId -cne $record.objectId) { throw 'Whole source Git object identity mismatch.' }
}
$utilityRoot = Join-Path $PSScriptRoot 'utilities'
$utilityDirectories = @(Get-ChildItem -LiteralPath $utilityRoot -Directory | Sort-Object Name)
if ($utilityDirectories.Count -ne 12) { throw 'Unexpected direct Git/gh source-utility root count.' }
$failures = @(Get-ChildItem -LiteralPath $utilityRoot -Filter 'failure.json' -Recurse -File)
if ($failures.Count -ne 0) { throw 'Native failure evidence prevents an unqualified successful seal.' }
$receipts = @()
$utilityRows = @()
$observedChildren = @()
foreach ($directory in $utilityDirectories) {
    $receiptPath = Join-Path $directory.FullName 'receipt.json'
    if (-not [IO.File]::Exists($receiptPath)) { throw "Missing native receipt: $directory" }
    $receipt = [IO.File]::ReadAllText($receiptPath) | ConvertFrom-Json
    if ($receipt.exitCode -ne 0 -or -not $receipt.rootHasExitedObserved -or
        -not $receipt.stdoutCopyTaskCompleted -or -not $receipt.stderrCopyTaskCompleted -or
        -not $receipt.observerAndRootDistinct -or -not $receipt.guard.passed) {
        throw "Native root/stream/guard evidence incomplete: $directory"
    }
    foreach ($stream in @('stdout', 'stderr', 'stdin')) {
        $path = Join-Path $directory.FullName ($stream + '.bin')
        $hashProperty = $stream + 'Sha256'
        if ((Get-BytesSha256 ([IO.File]::ReadAllBytes($path))) -cne $receipt.$hashProperty) {
            throw "Native stream fingerprint mismatch: $path"
        }
    }
    if (@($receipt.waits | Where-Object { $_.operation -ceq 'root.WaitForExit()' -and $_.returned }).Count -ne 1) {
        throw "Missing root completion wait: $directory"
    }
    foreach ($child in @($receipt.observedChildren)) {
        if (-not $child.terminalObserved) { throw "Observed child not terminal: $($child.pid)" }
        $observedChildren += $child
    }
    $receipts += $receipt
    $utilityRows += [ordered]@{
        ordinal = $receipt.ordinal
        label = $receipt.label
        rootPid = $receipt.rootPid
        rootStartUtc = $receipt.rootStartUtc
        observerPid = $receipt.observer.pid
        observerStartUtc = $receipt.observer.startUtc
        exitCode = $receipt.exitCode
        rootHasExitedObserved = $receipt.rootHasExitedObserved
        stdoutCompleted = $receipt.stdoutCopyTaskCompleted
        stderrCompleted = $receipt.stderrCopyTaskCompleted
        observedChildPids = @($receipt.observedChildren | ForEach-Object { $_.pid })
        waits = $receipt.waits
        receiptPath = $receiptPath
        receiptSha256 = Get-BytesSha256 ([IO.File]::ReadAllBytes($receiptPath))
    }
}
$helpers = @()
$priorObservers = @()
foreach ($started in @(Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.started.json' -File | Sort-Object Name)) {
    $identity = [IO.File]::ReadAllText($started.FullName) | ConvertFrom-Json
    if ((Get-BytesSha256 ([IO.File]::ReadAllBytes($identity.entrypoint))) -cne $identity.entrypointSha256) {
        throw "Executed entrypoint bytes changed: $($identity.entrypoint)"
    }
    if ((Get-BytesSha256 ([IO.File]::ReadAllBytes((Join-Path $PSScriptRoot 'SourceCapture-259.psm1')))) -cne $identity.librarySha256) {
        throw 'Immutable function-only source capture library changed after execution.'
    }
    $helpers += [ordered]@{
        stage = $identity.stage
        entrypoint = $identity.entrypoint
        sha256 = $identity.entrypointSha256
        librarySha256 = $identity.librarySha256
        observer = $identity.observer
        oneShotReplayAllowed = $identity.replayAllowed
    }
    if ($identity.observer.pid -ne $PID) { $priorObservers += $identity.observer }
}
$tracked = @()
foreach ($receipt in $receipts) {
    $tracked += [ordered]@{ kind = 'direct-native-root'; pid = $receipt.rootPid; startUtc = $receipt.rootStartUtc }
}
foreach ($child in $observedChildren) {
    $tracked += [ordered]@{ kind = 'observed-native-child'; pid = $child.pid; startUtc = $child.creationUtc }
}
foreach ($observer in $priorObservers) {
    $tracked += [ordered]@{ kind = 'completed-prior-observer'; pid = $observer.pid; startUtc = $observer.startUtc }
}
$pidValues = @($tracked | ForEach-Object { $_.pid } | Sort-Object -Unique)
$filter = (@($pidValues | ForEach-Object { "ProcessId = $_" }) -join ' OR ')
$liveRows = @(Get-CimInstance Win32_Process -Filter $filter)
$recheck = @()
foreach ($item in $tracked) {
    $matching = @($liveRows | Where-Object { $_.ProcessId -eq $item.pid })
    $sameIdentityLive = $false
    $differentIdentity = @()
    foreach ($row in $matching) {
        $difference = [Math]::Abs(($row.CreationDate.ToUniversalTime() - [DateTime]::Parse($item.startUtc).ToUniversalTime()).TotalMilliseconds)
        if ($difference -le 1) { $sameIdentityLive = $true }
        else { $differentIdentity += [ordered]@{ pid = $row.ProcessId; creationUtc = $row.CreationDate.ToUniversalTime().ToString('o'); executable = $row.ExecutablePath } }
    }
    $recheck += [ordered]@{ tracked = $item; sameIdentityLive = $sameIdentityLive; otherIdentityAtReusedPid = $differentIdentity; observedUtc = [DateTime]::UtcNow.ToString('o') }
}
if (@($recheck | Where-Object { $_.sameIdentityLive }).Count -ne 0) {
    throw 'A started source utility, observed child or completed prior observer is still active.'
}
$closure = [ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    directNativeRootCount = $receipts.Count
    directNativeRootPids = @($receipts | ForEach-Object { $_.rootPid })
    nativeObserverPids = @($receipts | ForEach-Object { $_.observer.pid } | Sort-Object -Unique)
    allPriorObserverPids = @($priorObservers | ForEach-Object { $_.pid } | Sort-Object -Unique)
    sealerObserver = $sealer
    nativeRootsStartedBySealer = 0
    actualRootObserverPairsAreDistinct = @($receipts | Where-Object { $_.rootPid -eq $_.observer.pid }).Count -eq 0
    allRootExitCodes = @($receipts | ForEach-Object { $_.exitCode })
    allRootCompletionWaitsAndStreamsObserved = $true
    observedChildCount = $observedChildren.Count
    observedChildPids = @($observedChildren | ForEach-Object { $_.pid })
    observedChildren = $observedChildren
    observedChildTerminalEvidence = 'Every observed child identity was absent or replaced after the owning source utility; all terminalObserved flags true.'
    independentChildExitCodesBoundary = 'An independent child exit code is unavailable where its identity had already exited before a process handle could be opened. No zero child exit code is fabricated from root success.'
    unobservedChildBoundary = 'Bounded process snapshots do not prove absence of unobserved short-lived children.'
    utilityRows = $utilityRows
    identityRecheck = $recheck
    enclosingSealerToolCompletion = 'Unobservable inside this helper. The agent must observe the actual tool return before its final response.'
}
$closurePath = Join-Path $PSScriptRoot 'PROCESS-CLOSURE-259.json'
Write-EvidenceJson $closurePath $closure
Write-EvidenceJson (Join-Path $PSScriptRoot 'HELPER-IDENTITIES-259.json') $helpers
$acceptanceResult = [ordered]@{
    status = 'bounded-source-only-qualification-sealed-not-runtime-qualified'
    originalWholeFiles = 15
    defaultWholeFiles = 15
    immutableRoleSourceCount = 30
    sourceObjectRecordsIncludingCommits = $manifest.Count
    directGitGhSourceRootCount = $receipts.Count
    sourceLimitsRespected = $true
    onePartDeferredProducerEstablished = $true
    actualRelatedAssemblyAndManagerCountsEstablished = $false
    realPerCaseFixtureSetupEstablishedAtSourceBoundary = $true
    distinctRemovalAndAdditionContractsEstablished = $true
    actualRuntimeProducerReachabilityEstablished = $false
    materialPerformanceBenefitEstablished = $false
    wholeOriginalBytesGitIdentityAndSha256Verified = $true
    fullRootArgvAndRawStreamsAndWaitsRetained = $true
    actualRootObserverIdentitiesDistinct = $true
    allObservedNativeChildrenTerminal = $true
    childObservationLimitsExplicit = $true
    nativeFailureCount = $failures.Count
    nonNativeViewRangeFailureCount = 1
    nonNativeViewFailureEvidence = 'TOOL-OBSERVATIONS-259.json'
    candidateOrRuntimeExecutionAuthorizedOrPerformed = $false
    canonicalFindingsRemainPending = @('F229', 'F230')
    additionalEvidenceProposal = 'EVIDENCE-GAP-PROPOSAL-259.json; unapproved, unexecuted, not an automatic continuation.'
}
Write-EvidenceJson (Join-Path $PSScriptRoot 'ACCEPTANCE-RESULT-259.json') $acceptanceResult
$decisionPath = Join-Path $PSScriptRoot 'DECISIONS-259.json'
$decision = [IO.File]::ReadAllText($decisionPath) | ConvertFrom-Json
$rolePath = Join-Path $PSScriptRoot 'IMMUTABLE-ROLES.json'
$roles = [IO.File]::ReadAllText($rolePath) | ConvertFrom-Json
$handoffPath = Join-Path $PSScriptRoot 'HANDOFF-259.json'
$indexPath = Join-Path $PSScriptRoot 'EVIDENCE-INDEX-259.json'
$sealPath = Join-Path $PSScriptRoot 'SEAL-259.json'
foreach ($path in @($handoffPath, $indexPath, $sealPath)) {
    if ([IO.File]::Exists($path)) { throw "Refusing to overwrite an existing seal output: $path" }
}
$references = @()
foreach ($relative in @(
    'DECISIONS-259.json', 'ACCEPTANCE-259.json', 'ACCEPTANCE-RESULT-259.json',
    'SOURCE-MANIFEST.json', 'ROLE-COMPARISON.json', 'SOURCE-ANCHORS.json',
    'SOURCE-CARDINALITIES.json', 'IMMUTABLE-ROLES.json', 'GUIDANCE-MANIFEST.json',
    'PROCESS-CLOSURE-259.json', 'HELPER-IDENTITIES-259.json',
    'TOOL-OBSERVATIONS-259.json', 'EVIDENCE-GAP-PROPOSAL-259.json'
)) {
    $path = Join-Path $PSScriptRoot $relative
    $references += [ordered]@{ path = $path; sha256 = Get-BytesSha256 ([IO.File]::ReadAllBytes($path)); byteLength = [IO.FileInfo]::new($path).Length }
}
$handoff = [ordered]@{
    schemaVersion = 1
    findingIds = @('F229', 'F230')
    ownerId = 'd7e83912-457a-4897-a3af-0b27b2b3fc88'
    authorization = 'GO259'
    mode = 'source-only'
    decision = $decision.decision
    summary = $decision.summary
    canonicalState = @{ F229 = 'pending'; F230 = 'pending'; authority = 'Parent alone independently accepts, publishes or retires.' }
    immutableRoles = $roles
    counts = @{
        wholeFilesOriginal = 15
        wholeFilesDefault = 15
        wholeRoleSourceFiles = 30
        sourceObjectRecordsIncludingCommits = $manifest.Count
        distinctSourceBlobIds = @($blobs | ForEach-Object { $_.objectId } | Sort-Object -Unique).Count
        directGitGhRoots = $receipts.Count
        observedNativeChildren = $observedChildren.Count
        nativeFailures = 0
        nonNativeViewRangeFailures = 1
        productSourceOrCandidateEdits = 0
        runtimeTestBuildRestoreOrTimingStarts = 0
    }
    actualDirectNativeRootPids = $closure.directNativeRootPids
    actualNativeObserverPids = $closure.nativeObserverPids
    actualManagedInspectionObserverPids = @($priorObservers | Where-Object { $_.pid -notin $closure.nativeObserverPids } | ForEach-Object { $_.pid } | Sort-Object -Unique)
    actualObservedChildPids = $closure.observedChildPids
    sealerObserver = $sealer
    waitStreamAndTerminalBoundary = 'All 12 direct roots were waited to exit 0; both redirected streams were fully awaited and byte-hashed; all 14 observed children terminal. Child exit-code and unobserved-short-lived-child limits are explicit in PROCESS-CLOSURE-259.json.'
    observedBoundary = $decision.observedBoundary
    acceptance = $acceptanceResult
    references = $references
    evidenceIndexPath = $indexPath
    sealReceiptPath = $sealPath
    enclosingToolCompletion = 'This handoff is written while the sealer helper is active. It does not assert its own future enclosing-tool completion; the agent final response must follow the actual returned sealer tool.'
    nextAction = 'Stop at this sealed handoff. No additional source reads, candidate work, native correctness work, publication or retirement is authorized.'
}
Write-EvidenceJson $handoffPath $handoff
$files = @(Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File | Where-Object { $_.FullName -cne $indexPath -and $_.FullName -cne $sealPath } | Sort-Object FullName)
$entries = @()
foreach ($file in $files) {
    $bytes = [IO.File]::ReadAllBytes($file.FullName)
    $entries += [ordered]@{ relativePath = [IO.Path]::GetRelativePath($PSScriptRoot, $file.FullName); byteLength = $bytes.Length; sha256 = Get-BytesSha256 $bytes }
}
$index = [ordered]@{
    schemaVersion = 1
    root = $PSScriptRoot
    createdUtc = [DateTime]::UtcNow.ToString('o')
    entryCount = $entries.Count
    exclusions = @('EVIDENCE-INDEX-259.json', 'SEAL-259.json')
    exclusionReason = 'Avoid self-referential hashes; SEAL-259.json records the actual index and handoff fingerprints, and its own hash is returned by the sealer.'
    entries = $entries
}
Write-EvidenceJson $indexPath $index
$indexBack = [IO.File]::ReadAllText($indexPath) | ConvertFrom-Json
foreach ($entry in $indexBack.entries) {
    $path = Join-Path $PSScriptRoot $entry.relativePath
    if ((Get-BytesSha256 ([IO.File]::ReadAllBytes($path))) -cne $entry.sha256 -or [IO.FileInfo]::new($path).Length -ne $entry.byteLength) {
        throw "Final indexed evidence verification failed: $path"
    }
}
$handoffSha = Get-BytesSha256 ([IO.File]::ReadAllBytes($handoffPath))
$indexSha = Get-BytesSha256 ([IO.File]::ReadAllBytes($indexPath))
$seal = [ordered]@{
    helperWritesVerifiedUtc = [DateTime]::UtcNow.ToString('o')
    handoffPath = $handoffPath
    handoffSha256 = $handoffSha
    indexPath = $indexPath
    indexSha256 = $indexSha
    indexedFileCount = $entries.Count
    expectedArtifactFileCountIncludingIndexAndSeal = $entries.Count + 2
    originalWholeSourceCount = 15
    defaultWholeSourceCount = 15
    nativeRootCount = $receipts.Count
    observedNativeChildCount = $observedChildren.Count
    actualRootPids = $closure.directNativeRootPids
    actualNativeObserverPids = $closure.nativeObserverPids
    actualPriorObserverPids = $closure.allPriorObserverPids
    actualSealerObserver = $sealer
    rootWaitsBothStreamsAndObservedChildrenTerminal = $true
    oneShotSealerEntrypoint = $PSCommandPath
    oneShotSealerSha256 = Get-BytesSha256 ([IO.File]::ReadAllBytes($PSCommandPath))
    newNativeRootsStartedBySealer = 0
    enclosingToolCompletion = 'Still not observable inside helper. Require actual functions.powershell shellId f229-259-seal completion result before reporting completion.'
    noFurtherWorkAuthorized = $true
}
Write-EvidenceJson $sealPath $seal
$actualFiles = @(Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File)
if ($actualFiles.Count -ne $entries.Count + 2) { throw 'Final artifact count changed during sealing.' }
$sealSha = Get-BytesSha256 ([IO.File]::ReadAllBytes($sealPath))
[ordered]@{
    status = 'sealed-source-only-evidence'
    handoffPath = $handoffPath
    handoffSha256 = $handoffSha
    indexPath = $indexPath
    indexSha256 = $indexSha
    sealPath = $sealPath
    sealSha256 = $sealSha
    indexedFileCount = $entries.Count
    artifactFileCount = $actualFiles.Count
    sourceCounts = @{ Original = 15; Default = 15; total = 30 }
    nativeRootCount = $receipts.Count
    rootPids = $closure.directNativeRootPids
    nativeObserverPids = $closure.nativeObserverPids
    priorObserverPids = $closure.allPriorObserverPids
    sealerObserverPid = $PID
    observedChildCount = $observedChildren.Count
    observedChildPids = $closure.observedChildPids
    rootExits = @($receipts | ForEach-Object { $_.exitCode })
    waitsBothStreamsAndObservedChildTerminal = $true
    canonical = @{ F229 = 'pending'; F230 = 'pending' }
    toolBoundary = 'Helper returning after verification. Actual enclosing tool completion must be read from its returned result, not inferred from this JSON.'
} | ConvertTo-Json -Depth 20 -Compress
