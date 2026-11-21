$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'control-support-279.ps1')
$indexPath = Join-Path $Out 'EVIDENCE-INDEX.json'
$sealPath = Join-Path $Out 'FINAL-SEAL.json'
if ((Test-Path -LiteralPath $indexPath) -or (Test-Path -LiteralPath $sealPath))
{
    throw '279 seal destinations must be fresh; no replay/overwrite.'
}
$guard = Get-FreshGuard279 'Final279 data-only seal; source budget consumed; no source retry'
[IO.File]::WriteAllBytes((Join-Path $Out 'control\seal-004-policy.raw.json'), $guard.policyBytes)
[IO.File]::WriteAllBytes((Join-Path $Out 'control\seal-004-registration.raw.json'), $guard.registrationBytes)
Write-FreshJson279 (Join-Path $Out 'control\seal-004-guard.json') $guard.receipt
$baseline = [IO.File]::ReadAllText((Join-Path $Out 'BASELINE-268-PINS.json')) | ConvertFrom-Json
if (@(Get-ChildItem -LiteralPath $baseline.priorRoot -File -Recurse -Force).Count -ne 136)
{
    throw '268 exact inventory changed before279 seal.'
}
foreach ($file in $baseline.exactPriorInventory)
{
    if ((Get-Item -LiteralPath $file.path).Length -ne $file.bytes -or
        (Get-FileHash -LiteralPath $file.path -Algorithm SHA256).Hash -cne $file.sha256)
    {
        throw 'A pinned268 artifact changed before279 seal.'
    }
}
$roles = [IO.File]::ReadAllText((Join-Path $Out 'ROLE-BINDINGS-279.json')) | ConvertFrom-Json
$terminal = [IO.File]::ReadAllText((Join-Path $Out 'TERMINAL-RECEIPTS-279.json')) | ConvertFrom-Json
$auditOuter = [IO.File]::ReadAllText((Join-Path $Out 'control\outer-audit-279-003-actual.json')) | ConvertFrom-Json
$assessment = [IO.File]::ReadAllText((Join-Path $Out 'ASSESSMENT-279.json')) | ConvertFrom-Json
if ($auditOuter.actualOuterExitCode -ne 0 -or $roles.newCompleteBodyCount -ne 4 -or
    $roles.newMissingResponses.Count -ne 2 -or $roles.cumulativeCompleteBodyCount -ne 34 -or
    $terminal.newActualGitGhRoots -ne 1 -or $terminal.aggregateActualGitGhRoots -ne 10 -or
    $terminal.aggregateRootWaitsReturned -ne 10 -or $terminal.aggregateOutputStreamsAwaitedToEof -ne 20 -or
    $terminal.aggregateObservedChildWaitsReturned -ne 7 -or $terminal.sourceHelperOuterExit -ne 1 -or
    @($assessment.findings | Where-Object { $_.sourceDecision -cne 'source-only-no-material-candidate' }).Count -ne 0)
{
    throw 'Partial-input/failed-attempt/custody boundaries do not match the data audit.'
}
foreach ($body in $roles.newCompleteBodyBindings)
{
    if ((Get-FileHash -LiteralPath $body.capture -Algorithm SHA256).Hash -cne $body.sha256)
    {
        throw 'An exact new whole-body capture changed.'
    }
}
$root = Join-Path $Out 'roots\root-010'
foreach ($stream in @('stdin', 'stdout', 'stderr'))
{
    $expectedHash = if ($stream -eq 'stdin') { $terminal.newRoot.launch.stdinSha256 } else { $terminal.newRoot.($stream + 'Sha256') }
    if ((Get-FileHash -LiteralPath (Join-Path $root ($stream + '.bin')) -Algorithm SHA256).Hash -cne $expectedHash)
    {
        throw 'A retained exact raw root010 stream changed.'
    }
}
foreach ($kind in @('helper', 'support'))
{
    if ((Get-FileHash -LiteralPath $terminal.newRoot.launch.$kind -Algorithm SHA256).Hash -cne $terminal.newRoot.launch.($kind + 'Sha256'))
    {
        throw 'An executed279 source helper changed before final seal.'
    }
}
$allFiles = @(Get-ChildItem -LiteralPath $Out -File -Recurse -Force | Sort-Object FullName)
if (@($allFiles | Where-Object { ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 }).Count -ne 0)
{
    throw 'Unexpected reparse-point artifact.'
}
foreach ($file in @($allFiles | Where-Object { $_.Extension -eq '.json' }))
{
    $null = [IO.File]::ReadAllText($file.FullName) | ConvertFrom-Json
}
$entries = @(
    foreach ($file in $allFiles)
    {
        [ordered]@{
            path = $file.FullName.Substring($Out.Length + 1)
            bytes = $file.Length
            sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
        }
    }
)
Write-FreshJson279 $indexPath ([ordered]@{
    format = 'GO279-source-evidence-index-v1'
    createdUtc = [DateTime]::UtcNow.ToString('o')
    root = $Out
    actualOwner = $Owner
    localIndexedArtifactCount = $entries.Count
    localIndexedBytes = ($entries | Measure-Object -Property bytes -Sum).Sum
    localExclusions = @('EVIDENCE-INDEX.json', 'FINAL-SEAL.json')
    exclusionReason = 'No recursive self-hashing; final seal binds this index and actual outer exit is known only after the tool returns.'
    entries = $entries
    external268Root = $baseline.priorRoot
    external268CompleteArtifactCount = 136
    external268PinnedInventory = $baseline.exactPriorInventory
    externalAcceptanceBoundary = 'Unchanged indexed bytes/exact inventory only; no new raw commit/tree-chain/runtime/materiality qualification.'
})
$indexHash = (Get-FileHash -LiteralPath $indexPath -Algorithm SHA256).Hash
$handoffPath = Join-Path $Out 'HANDOFF.md'
$handoffHash = (Get-FileHash -LiteralPath $handoffPath -Algorithm SHA256).Hash
Write-FreshJson279 $sealPath ([ordered]@{
    format = 'GO279-data-only-final-seal-v1'
    createdUtc = [DateTime]::UtcNow.ToString('o')
    actualOwner = $Owner
    sourceDecisions = @{ F234 = 'source-only-no-material-candidate'; F235 = 'source-only-no-material-candidate' }
    canonicalOuterStatusesObserved = @{ F234 = 'pending'; F235 = 'pending' }
    parentOnlyQualificationAcceptanceRetirementFinalization = $true
    handoff = @{ path = $handoffPath; sha256 = $handoffHash }
    index = @{ path = $indexPath; sha256 = $indexHash; localIndexedArtifactCount = $entries.Count }
    localCompleteArtifactsIncludingIndexAndSeal = $entries.Count + 2
    unchangedExternal268CompleteArtifacts = 136
    assessment = @{
        path = (Join-Path $Out 'ASSESSMENT-279.json')
        sha256 = (Get-FileHash -LiteralPath (Join-Path $Out 'ASSESSMENT-279.json') -Algorithm SHA256).Hash
    }
    roleBindings = @{
        path = (Join-Path $Out 'ROLE-BINDINGS-279.json')
        sha256 = (Get-FileHash -LiteralPath (Join-Path $Out 'ROLE-BINDINGS-279.json') -Algorithm SHA256).Hash
        newCompleteWholeBodies = 4
        exactMissingResponses = 2
        cumulativeCompleteWholeBodies = 34
        cumulativeWholePathRequestsPerRole = 18
        cumulativeCompleteWholeBodiesPerRole = 17
    }
    terminalReceipts = @{
        path = (Join-Path $Out 'TERMINAL-RECEIPTS-279.json')
        sha256 = (Get-FileHash -LiteralPath (Join-Path $Out 'TERMINAL-RECEIPTS-279.json') -Algorithm SHA256).Hash
        newGitGhRoots = 1
        aggregateGitGhRoots = 10
        aggregateSourceObserverPids = $terminal.aggregateSourceObserverPids
        aggregateRootWaitsReturned = 10
        aggregateOutputEofStreams = 20
        aggregateStdinStreamsRetained = 10
        aggregateObservedChildWaitsReturned = 7
        observedChildLimit = $terminal.observedChildLimit
        sourceHelperOuterExit = 1
        gitRootExit = 0
        successfulDataDecodeDoesNotEraseSourceHelperFailure = $true
    }
    priorAuditActualOuterReceipt = $auditOuter
    sealerLiveIdentity = Get-ProcessIdentity279 (Get-Process -Id $PID)
    sealerOuterToolReceipt = @{
        shellId = 'f234-f235-279-seal-004'
        completionKnownInsideSealer = $false
        instruction = 'Report the actual returned outer tool exit after this tool completes; no prospective self-exit claim.'
    }
    sourceRootAndApprovedPathBudgetClosed = $true
    missingFactoryOrNormalGlobalScenarioQualified = $false
    newCurrentDefaultObserved = $false
    productNativeRuntimeTestsCandidatesOrMeasurementsPerformed = $false
})
$sealHash = (Get-FileHash -LiteralPath $sealPath -Algorithm SHA256).Hash
Write-Host ('HANDOFF_PATH=' + $handoffPath)
Write-Host ('HANDOFF_SHA256=' + $handoffHash)
Write-Host ('INDEX_PATH=' + $indexPath)
Write-Host ('INDEX_SHA256=' + $indexHash)
Write-Host ('LOCAL_INDEXED_ARTIFACTS=' + $entries.Count)
Write-Host ('LOCAL_COMPLETE_ARTIFACTS=' + ($entries.Count + 2))
Write-Host 'EXTERNAL_268_COMPLETE_ARTIFACTS=136unchanged;bytes-inventory-only'
Write-Host ('FINAL_SEAL_PATH=' + $sealPath)
Write-Host ('FINAL_SEAL_SHA256=' + $sealHash)
Write-Host ('SOURCE_OBSERVER_PIDS=' + ($terminal.aggregateSourceObserverPids -join ','))
Write-Host ('SEALER_OBSERVER_PID=' + $PID)
Write-Host 'SOURCE_INPUTS=4whole new bodies/2missing;17complete/18requested per role;34complete aggregate bodies;no source retry'
Write-Host 'CUSTODY=1new/10aggregate Git-gh roots;10/10root waits;20/20output EOF streams;10stdin streams;7/7observed-child waits'
Write-Host 'CHILD_LIMIT=nominal100ms CIM census;64observed descendants;10s post-root wait;not universal closure'
Write-Host 'ACTUAL_PRIOR_SOURCE_HELPER_OUTER_EXIT=1;GIT_ROOT_EXIT=0;DATA_ONLY_DECODER_EXIT=0;MISSING_FACTORY_GAP_PRESERVED'
Write-Host 'CANONICAL_F234_F235=pending;SOURCE_DECISIONS=source-only-no-material-candidate;NO_PRODUCT_TEST_OR_PERFORMANCE_PASS'
