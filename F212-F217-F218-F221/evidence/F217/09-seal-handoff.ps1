. (Join-Path $PSScriptRoot 'evidence-tools.ps1')
Set-Location $PSScriptRoot
if ((Test-Path -LiteralPath 'HANDOFF.json') -or (Test-Path -LiteralPath 'SEAL.json')) {
    throw 'Existing handoff/seal must not be overwritten or replayed'
}
$assessment = Get-Content -LiteralPath 'assessment.json' -Raw | ConvertFrom-Json
$acceptance = Get-Content -LiteralPath 'acceptance-evaluation.json' -Raw | ConvertFrom-Json
$preservation = Get-Content -LiteralPath 'reserved-root\preservation.json' -Raw | ConvertFrom-Json
$terminal = Get-Content -LiteralPath 'native-terminal-summary.json' -Raw | ConvertFrom-Json
$sources = Get-Content -LiteralPath 'raw-discovery\verified-members.json' -Raw | ConvertFrom-Json
$roles = Get-Content -LiteralPath 'source-roles.json' -Raw | ConvertFrom-Json
$preparation = Get-Content -LiteralPath '08-helper-result.json' -Raw | ConvertFrom-Json
if (-not $preservation.passed -or -not $sources.allGitBlobAndSha256AndLengthChecksPassed -or
    -not $terminal.allRootsWaitsAndBothStreamsTerminal -or -not $terminal.allRecordedObservedChildrenTerminal -or
    @($terminal.outstandingOwnedWork).Count -ne 0 -or $preparation.exitCode -ne 0 -or
    (Get-Item -LiteralPath 'candidate.diff').Length -ne 0 -or
    $assessment.disposition -ne 'source-only-no-material-candidate' -or
    $acceptance.disposition -ne $assessment.disposition) {
    throw 'Sealing prerequisites are not green'
}

$policyPath = Join-Path $script:PolicyRoot 'policy.json'
$policyBytes = [System.IO.File]::ReadAllBytes($policyPath)
$currentPolicy = $script:Utf8.GetString($policyBytes) | ConvertFrom-Json
[System.IO.File]::WriteAllBytes((Join-Path $PSScriptRoot 'seal-policy-snapshot.json'), $policyBytes)
Write-EvidenceJson 'seal-finalization.json' @{
    helper = '09-seal-handoff.ps1'
    helperSha256 = (Get-FileHash -LiteralPath '09-seal-handoff.ps1' -Algorithm SHA256).Hash
    invocation = "& 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F217-237\09-seal-handoff.ps1'"
    shellId = 'F217-237-seal'
    outerPowerShellPid = $PID
    nativeStarts = @()
    childStarts = @()
    semantics = 'This bounded finalizer only reads/hashes/serializes private evidence. Its final PowerShell tool exit is observed by the caller after sealing; no self-process-absence claim and no further native starts.'
    currentPolicyPointObservation = @{
        observedUtc = [DateTime]::UtcNow.ToString('o')
        owner = $currentPolicy.independentFindingPreparationWorkers.F217
        scope = $currentPolicy.activeWorkerPreparationScopes.F217
        policySha256 = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($policyBytes))
        actualWorkerBuildHoldActive = $currentPolicy.actualWorkerBuildHoldActive
        buildAndTestWorkQuiesced = $currentPolicy.buildAndTestWorkQuiesced
        benchmarkLeasePresent = Test-Path -LiteralPath (Join-Path $script:PolicyRoot 'benchmark-exclusive.lease.json')
        nativeAdmissionInferred = $false
    }
    outerToolStreamBoundary = 'Earlier outer helper results are tool-return summaries in helper-executions.json, not raw byte streams. Native stdout/stderr are complete actual byte captures. 08 preparation additionally has captured outer stdout/stderr. Display-only tool truncations are explicit.'
    presealBuiltInOnlyRead = @{ shellId = 'F217-237-preseal-read'; exitCode = 0; purpose = 'Read preservation/acceptance/native counts; no native starts or writes.' }
}

$jsonChecks = @()
foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File -Filter '*.json' | Sort-Object FullName) {
    $parsed = [System.IO.File]::ReadAllText($file.FullName) | ConvertFrom-Json
    $jsonChecks += @{ path = [System.IO.Path]::GetRelativePath($PSScriptRoot, $file.FullName); parsed = $true }
}
$jsonStreams = @()
foreach ($directory in Get-ChildItem -LiteralPath 'native' -Directory | Sort-Object Name) {
    $invocation = Get-Content -LiteralPath (Join-Path $directory.FullName 'invocation.json') -Raw | ConvertFrom-Json
    $nativeTerminal = Get-Content -LiteralPath (Join-Path $directory.FullName 'terminal.json') -Raw | ConvertFrom-Json
    if ($invocation.executable -like '*\gh.exe') {
        $rawAccept = @($invocation.argv | Where-Object { $_ -like '*application/vnd.github.raw+json*' }).Count -gt 0
        if (-not $rawAccept -or $nativeTerminal.exitCode -ne 0) {
            $stdoutPath = Join-Path $directory.FullName 'stdout.bin'
            $parsed = [System.IO.File]::ReadAllText($stdoutPath) | ConvertFrom-Json
            $jsonStreams += @{ path = [System.IO.Path]::GetRelativePath($PSScriptRoot, $stdoutPath); parsed = $true; exitCode = $nativeTerminal.exitCode }
        }
    }
}
$payloadChecks = @()
foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File | Sort-Object FullName) {
    $payloadChecks += [ordered]@{
        path = [System.IO.Path]::GetRelativePath($PSScriptRoot, $file.FullName)
        length = $file.Length
        sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    }
}
foreach ($item in $payloadChecks) {
    $path = Join-Path $PSScriptRoot $item.path
    if ((Get-Item -LiteralPath $path).Length -ne $item.length -or
        (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ne $item.sha256) {
        throw "Payload changed during verification: $($item.path)"
    }
}
Write-EvidenceJson 'VERIFY.json' @{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    passed = $true
    payloadFilesHashedAndRereadBeforeThisReport = $payloadChecks.Count
    jsonFilesReread = $jsonChecks
    ghJsonStreamsReread = $jsonStreams
    rawSourceGitBlobAndSha256Verified = $sources.sourceCount
    method = 'Every payload file was SHA256 hashed and then rehashed; all JSON files and declared gh JSON response/error streams were reparsed. HANDOFF index below includes this report, and is independently reread/rehashed before SEAL creation.'
    circularityBoundary = 'VERIFY does not recursively hash itself. HANDOFF indexes VERIFY and every other payload. SEAL binds HANDOFF. Only HANDOFF.json and SEAL.json are excluded from the payload index; the caller receives both terminal hashes.'
}

$artifactIndex = @()
foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File | Sort-Object FullName) {
    $relative = [System.IO.Path]::GetRelativePath($PSScriptRoot, $file.FullName)
    if ($relative -in @('HANDOFF.json','SEAL.json')) {
        continue
    }
    $artifactIndex += [ordered]@{
        path = $relative
        length = $file.Length
        sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    }
}
$totalBytes = ($artifactIndex | Measure-Object -Property length -Sum).Sum
Write-EvidenceJson 'HANDOFF.json' ([ordered]@{
    schemaVersion = 1
    finding = 'F217'
    owner = $script:OwnerId
    authorization = 'GO237'
    state = 'sealed-owner-terminal'
    disposition = $assessment.disposition
    coordinatorAcceptance = 'pending; coordinator alone accepts/finalizes'
    evidenceRoot = $PSScriptRoot
    sourceRoles = $roles
    exactTarget = 'src\Servers\Connections.Abstractions\src\NamedPipeEndPoint.cs:61-63'
    assessment = 'assessment.json'
    acceptance = 'acceptance-evaluation.json'
    candidate = @{ present = $false; diff = 'candidate.diff'; length = 0; sha256 = (Get-FileHash -LiteralPath 'candidate.diff' -Algorithm SHA256).Hash }
    sourceQualification = @{
        wholeRawPinnedSourceFiles = $sources.sourceCount
        sourceMembershipIndex = 'raw-discovery\verified-members.json'
        allRawBlobsAndSha256Verified = $true
        targetSha256BothRoles = $assessment.exactContract.targetSha256BothRoles
        failedArchiveNotUsedAsRawProof = 'failures\source-provenance-001.json'
        unrelatedAzureIndexUsed = $false
        sourceNotLoadedRuntimeProof = $true
        owningMaterialNamedPipeHashWorkloadEstablished = $false
        actualGenericDictionaryLead = 'Existing InMemoryTransportBenchmark uses one IP endpoint in setup, not NamedPipeEndPoint.'
    }
    reservedRoot = @{
        preservation = 'reserved-root\preservation.json'
        entries = $preservation.trackedAndUntrackedEntries
        regularFiles = $preservation.regularFileCount
        directoryOrSubmoduleEntries = $preservation.directoryOrSubmoduleCount
        headAndBranchAndIndexAndEnumeratedBytesUnchanged = $true
        scopeBoundary = $preservation.boundary
    }
    execution = @{
        nativeSummary = 'native-terminal-summary.json'
        nativeRoots = $terminal.nativeRoots
        observedChildIdentities = $terminal.observedChildIdentities
        allRootsAndObservedChildrenAndBothStreamsTerminal = $true
        nonzeroNativeExits = $terminal.nonzeroNativeCount
        failures = 'failures\index.json'
        helperResults = @('helper-executions.json','08-helper-result.json','seal-finalization.json')
        privateGraphsCreated = @()
        buildsRun = @()
        testsRun = @()
        parameterizedRowsRun = @()
        dotnetInvocations = @()
        benchmarksOrMeasurements = @()
        outstandingOwnedNativeWork = @()
        processIdentityBoundary = 'Only actual recorded root/observed-child identities; unrelated reused PIDs not waited or stopped; no universal descendant or unrelated-host-idleness claim.'
        outerToolStreamBoundary = 'See seal-finalization.json: native streams are complete raw captures; early outer tool results are not asserted to be raw full byte captures.'
    }
    unverifiedBoundaries = $assessment.outstandingWork.unverified
    remainingWork = @{
        owner = 'none; STOP after this sealed handoff'
        coordinator = 'Independently verify all indexed bytes and seal; accept/reject source-only disposition.'
        reopening = $assessment.outstandingWork.reopeningCondition
    }
    artifactIndex = $artifactIndex
    artifactCount = $artifactIndex.Count
    indexedPayloadBytes = $totalBytes
    indexExcludesOnly = @('HANDOFF.json','SEAL.json')
    seal = 'SEAL.json'
})

$handoff = Get-Content -LiteralPath 'HANDOFF.json' -Raw | ConvertFrom-Json
$declared = @($handoff.artifactIndex | ForEach-Object { $_.path })
$actual = @(Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File | ForEach-Object {
    [System.IO.Path]::GetRelativePath($PSScriptRoot, $_.FullName)
} | Where-Object { $_ -notin @('HANDOFF.json','SEAL.json') })
if (@(Compare-Object ($declared | Sort-Object) ($actual | Sort-Object)).Count -ne 0 -or
    $declared.Count -ne $handoff.artifactCount -or
    @($declared | Sort-Object -Unique).Count -ne $declared.Count) {
    throw 'HANDOFF artifact membership is incomplete or duplicated'
}
foreach ($item in $handoff.artifactIndex) {
    $path = Join-Path $PSScriptRoot $item.path
    if ((Get-Item -LiteralPath $path).Length -ne $item.length -or
        (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ne $item.sha256) {
        throw "HANDOFF artifact changed: $($item.path)"
    }
    if ($path.EndsWith('.json', [StringComparison]::OrdinalIgnoreCase)) {
        $parsed = [System.IO.File]::ReadAllText($path) | ConvertFrom-Json
    }
}
$handoffHash = (Get-FileHash -LiteralPath 'HANDOFF.json' -Algorithm SHA256).Hash
Write-EvidenceJson 'SEAL.json' ([ordered]@{
    schemaVersion = 1
    finding = 'F217'
    owner = $script:OwnerId
    sealedUtc = [DateTime]::UtcNow.ToString('o')
    disposition = $assessment.disposition
    handoff = 'HANDOFF.json'
    handoffSha256 = $handoffHash
    indexedArtifacts = $handoff.artifactCount
    indexedPayloadBytes = $handoff.indexedPayloadBytes
    allIndexedFilesRehashed = $true
    allJsonPayloadFilesReread = $true
    ghJsonResponseAndErrorStreamsReread = $true
    noFurtherNativeStartsOrArtifactWrites = $true
    selfReferenceBoundary = 'SEAL binds the full HANDOFF and inline complete payload index. Neither file indexes itself; terminal SHA256 values are returned to the coordinator.'
})
$seal = Get-Content -LiteralPath 'SEAL.json' -Raw | ConvertFrom-Json
if ($seal.handoffSha256 -ne (Get-FileHash -LiteralPath 'HANDOFF.json' -Algorithm SHA256).Hash) {
    throw 'Seal/HANDOFF binding failed readback'
}
$sealHash = (Get-FileHash -LiteralPath 'SEAL.json' -Algorithm SHA256).Hash
Write-Output ("SEALED F217: {0}; artifacts={1}; rawSources={2}; nativeRoots={3}; observedChildren={4}; nonzeroNative={5}" -f $assessment.disposition, $handoff.artifactCount, $sources.sourceCount, $terminal.nativeRoots, $terminal.observedChildIdentities, $terminal.nonzeroNativeCount)
Write-Output "HANDOFF $handoffHash"
Write-Output "SEAL $sealHash"
