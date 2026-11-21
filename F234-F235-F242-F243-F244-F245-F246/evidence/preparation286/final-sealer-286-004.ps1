$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'control-support-286.ps1')
$indexPath = Join-Path $Out286 'EVIDENCE-INDEX.json'
$sealPath = Join-Path $Out286 'FINAL-SEAL.json'
if ((Test-Path -LiteralPath $indexPath) -or (Test-Path -LiteralPath $sealPath))
{
    throw '286 final seal must be fresh; no replay/overwrite.'
}
$guard = Get-FreshGuard286 'Final286 data-only complete inventory seal; source budget closed'
Save-Guard286 (Join-Path $Out286 'control') 'seal-004-' $guard
$baselinePath = Join-Path $Out286 'BASELINE-268-279-PINS.json'
$baseline = [IO.File]::ReadAllText($baselinePath) | ConvertFrom-Json
if ($baseline.exactPriorInventory.Count -ne 180)
{
    throw 'Expected180 exact pinned prior artifacts.'
}
foreach ($group in $baseline.roots)
{
    if (@(Get-ChildItem -LiteralPath $group.root -File -Recurse -Force).Count -ne $group.completeArtifactCount)
    {
        throw 'A prior exact inventory changed before seal.'
    }
}
foreach ($entry in $baseline.exactPriorInventory)
{
    if ((Get-Item -LiteralPath $entry.path).Length -ne $entry.bytes -or
        (Get-FileHash -LiteralPath $entry.path -Algorithm SHA256).Hash -cne $entry.sha256)
    {
        throw 'A prior artifact changed before286 seal.'
    }
}
$rolesPath = Join-Path $Out286 'ROLE-BINDINGS-286.json'
$roles = [IO.File]::ReadAllText($rolesPath) | ConvertFrom-Json
$terminalPath = Join-Path $Out286 'TERMINAL-RECEIPTS-286.json'
$terminal = [IO.File]::ReadAllText($terminalPath) | ConvertFrom-Json
$assessmentPath = Join-Path $Out286 'ASSESSMENT-286.json'
$assessment = [IO.File]::ReadAllText($assessmentPath) | ConvertFrom-Json
$factoryPath = Join-Path $Out286 'FACTORY-DISPATCH-286.json'
$factory = [IO.File]::ReadAllText($factoryPath) | ConvertFrom-Json
$auditOuterPath = Join-Path $Out286 'control\actual-outer-audit-286-003.json'
$auditOuter = [IO.File]::ReadAllText($auditOuterPath) | ConvertFrom-Json
if ($auditOuter.actualOuterExitCode -ne 0 -or $roles.newCompleteBodyCount -ne 2 -or
    $roles.newMissingResponses.Count -ne 0 -or $roles.prior279MissingResponsesPreserved.Count -ne 2 -or
    $roles.cumulativeCompleteBodyCount -ne 36 -or $roles.cumulativeCompleteBodiesPerRole -ne 18 -or
    $roles.cumulativeRequestedPathsPerRole -ne 19 -or $terminal.newActualGitGhRoots -ne 2 -or
    $terminal.aggregateActualGitGhRoots -ne 12 -or $terminal.aggregateRootWaitsReturned -ne 12 -or
    $terminal.aggregateOutputStreamsAwaitedToEof -ne 24 -or $terminal.aggregateStdinStreamsRetained -ne 12 -or
    $terminal.aggregateObservedChildWaitsReturned -ne 7 -or $terminal.aggregateRawStdoutBytes -ne 919315 -or
    $terminal.aggregateRawStderrBytes -ne 0 -or $terminal.prior279SourceHelperOuterExitPreserved -ne 1 -or
    $terminal.prior279GitRootExitPreserved -ne 0 -or
    @($assessment.findings | Where-Object { $_.sourceDecision -cne 'source-only-no-material-candidate' -or $_.canonicalOuterStatus -cne 'pending' }).Count -ne 0 -or
    $assessment.findings.Count -ne 2 -or
    $factory.qualification.inheritedNamedFactoryDispatchAndExplicitInstanceLifetimeEstablishedAtSource -cne $true -or
    $factory.qualification.effectiveDiConstructionOrRuntimeSelectionExecuted -cne $false)
{
    throw 'The completed audit, finite source boundaries, preserved failures or source/runtime decisions disagree.'
}
foreach ($body in $roles.cumulativeBodyInventory)
{
    if ((Get-FileHash -LiteralPath $body.capture -Algorithm SHA256).Hash -cne $body.sha256 -or
        (Get-Item -LiteralPath $body.capture).Length -ne $body.bytes)
    {
        throw 'A cumulative body capture changed before final seal.'
    }
}
foreach ($root in $terminal.newRoots)
{
    $rootDirectory = Join-Path $Out286 ('roots\root-' + ([int]$root.aggregateRootAttempt).ToString('000'))
    foreach ($stream in @('stdin', 'stdout', 'stderr'))
    {
        $expectedHash = if ($stream -ceq 'stdin') { $root.launch.stdinSha256 } else { $root.($stream + 'Sha256') }
        if ((Get-FileHash -LiteralPath (Join-Path $rootDirectory ($stream + '.bin')) -Algorithm SHA256).Hash -cne $expectedHash)
        {
            throw 'An exact retained new raw stream changed before seal.'
        }
    }
    foreach ($kind in @('helper', 'support', 'controlSupport'))
    {
        if ((Get-FileHash -LiteralPath $root.launch.$kind -Algorithm SHA256).Hash -cne $root.launch.($kind + 'Sha256'))
        {
            throw 'An executed source helper changed before seal.'
        }
    }
}
$allFiles = @(Get-ChildItem -LiteralPath $Out286 -File -Recurse -Force | Sort-Object FullName)
if (@($allFiles | Where-Object { ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 }).Count -ne 0)
{
    throw 'A local artifact is an unexpected reparse point.'
}
foreach ($file in @($allFiles | Where-Object { $_.Extension -ceq '.json' }))
{
    $null = [IO.File]::ReadAllText($file.FullName) | ConvertFrom-Json
}
[long]$localBytes = 0
$entries = @(
    foreach ($file in $allFiles)
    {
        $localBytes += $file.Length
        [ordered]@{
            path = $file.FullName.Substring($Out286.Length + 1)
            bytes = $file.Length
            sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
        }
    }
)
Write-FreshJson286 $indexPath ([ordered]@{
    format = 'GO286-complete-source-evidence-index-v1'
    createdUtc = [DateTime]::UtcNow.ToString('o')
    root = $Out286
    actualOwner = $Owner286
    localIndexedArtifactCount = $entries.Count
    localIndexedBytes = $localBytes
    localExclusions = @('EVIDENCE-INDEX.json', 'FINAL-SEAL.json')
    exclusionReason = 'No recursive self-hashing; final seal binds this index. Actual final outer completion is reported only after return.'
    entries = $entries
    externalCompleteArtifactCount = 180
    externalRoots = $baseline.roots
    externalPinnedInventory = $baseline.exactPriorInventory
    externalAcceptanceBoundary = 'Unchanged exact bytes/inventory only; no new raw-tree/runtime/materiality qualification.'
})
$indexHash = (Get-FileHash -LiteralPath $indexPath -Algorithm SHA256).Hash
$handoffPath = Join-Path $Out286 'HANDOFF.md'
$handoffHash = (Get-FileHash -LiteralPath $handoffPath -Algorithm SHA256).Hash
Write-FreshJson286 $sealPath ([ordered]@{
    format = 'GO286-data-only-final-seal-v1'
    createdUtc = [DateTime]::UtcNow.ToString('o')
    actualOwner = $Owner286
    handoff = @{ path = $handoffPath; sha256 = $handoffHash }
    index = @{ path = $indexPath; sha256 = $indexHash; localIndexedArtifactCount = $entries.Count; localIndexedBytes = $localBytes }
    localCompleteArtifactsIncludingIndexAndSeal = $entries.Count + 2
    unchangedExternalPriorArtifacts = 180
    baseline = @{ path = $baselinePath; sha256 = (Get-FileHash -LiteralPath $baselinePath -Algorithm SHA256).Hash }
    sourceDecisions = @{ F234 = 'source-only-no-material-candidate'; F235 = 'source-only-no-material-candidate' }
    canonicalOuterStatusesObserved = @{ F234 = 'pending'; F235 = 'pending' }
    parentOnlyQualificationAcceptanceRetirementFinalization = $true
    assessment = @{ path = $assessmentPath; sha256 = (Get-FileHash -LiteralPath $assessmentPath -Algorithm SHA256).Hash }
    factoryDispatch = @{
        path = $factoryPath
        sha256 = (Get-FileHash -LiteralPath $factoryPath -Algorithm SHA256).Hash
        namedDispatchAndExplicitStoreInstanceLifetimeEstablishedAtSource = $true
        actualDiConstructionSelectedConcreteRuntimeOrNativeTestQualified = $false
        normalCompleteGlobalPasskeyScenarioQualified = $false
    }
    roleBindings = @{
        path = $rolesPath
        sha256 = (Get-FileHash -LiteralPath $rolesPath -Algorithm SHA256).Hash
        newCompleteWholeBodies = 2
        newMissingResponses = 0
        cumulativeCompleteWholeBodyBindings = 36
        cumulativeRequestedPathsPerRole = 19
        cumulativeCompleteBodiesPerRole = 18
        prior279ExactMissingResponsesPreserved = 2
    }
    terminalReceipts = @{
        path = $terminalPath
        sha256 = (Get-FileHash -LiteralPath $terminalPath -Algorithm SHA256).Hash
        newGitGhRoots = 2
        aggregateGitGhRoots = 12
        aggregateRootWaitsReturned = 12
        aggregateOutputEofStreams = 24
        aggregateStdinStreamsRetained = 12
        aggregateObservedChildWaitsReturned = 7
        aggregateSourceObserverPids = $terminal.aggregateSourceObserverPids
        aggregateRawStdoutBytes = 919315
        aggregateRawStderrBytes = 0
        prior279SourceHelperOuterExitPreserved = 1
        prior279GitRootExitPreserved = 0
        observedChildLimit = $terminal.observedChildLimit
    }
    priorAuditActualOuterReceipt = $auditOuter
    sealerLiveIdentity = Get-ProcessIdentity286 (Get-Process -Id $PID)
    sealerOuterToolReceipt = @{
        shellId = 'f234-f235-286-seal-004'
        completionKnownInsideSealer = $false
        instruction = 'Report actual completed outer return after this tool finishes; no prospective self-exit claim.'
    }
    sourceRootAndBodyBudgetsClosed = $true
    newCurrentDefaultObserved = $false
    newRawCommitTreeChainQualified = $false
    productNativeRuntimeTestsCandidatesOrMeasurementsPerformed = $false
})
$sealHash = (Get-FileHash -LiteralPath $sealPath -Algorithm SHA256).Hash
if (@(Get-ChildItem -LiteralPath $Out286 -File -Recurse -Force).Count -ne $entries.Count + 2)
{
    throw 'Final exact local artifact count changed during seal.'
}
foreach ($entry in $entries)
{
    $path = Join-Path $Out286 $entry.path
    if ((Get-Item -LiteralPath $path).Length -ne $entry.bytes -or
        (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -cne $entry.sha256)
    {
        throw 'An indexed local artifact changed during seal.'
    }
}
Write-Host ('HANDOFF_PATH=' + $handoffPath)
Write-Host ('HANDOFF_SHA256=' + $handoffHash)
Write-Host ('INDEX_PATH=' + $indexPath)
Write-Host ('INDEX_SHA256=' + $indexHash)
Write-Host ('LOCAL_INDEXED_ARTIFACTS=' + $entries.Count)
Write-Host ('LOCAL_COMPLETE_ARTIFACTS=' + ($entries.Count + 2))
Write-Host ('LOCAL_INDEXED_BYTES=' + $localBytes)
Write-Host 'EXTERNAL_PRIOR_ARTIFACTS=180unchanged;136from268+44from279;bytes-inventory-only'
Write-Host ('FINAL_SEAL_PATH=' + $sealPath)
Write-Host ('FINAL_SEAL_SHA256=' + $sealHash)
Write-Host ('SOURCE_OBSERVER_PIDS=' + ($terminal.aggregateSourceObserverPids -join ','))
Write-Host ('AUDIT_OBSERVER_PID=' + $auditOuter.observerPid)
Write-Host ('SEALER_OBSERVER_PID=' + $PID)
Write-Host 'SOURCE_INPUTS=2new whole bodies/0newmissing;18complete/19requested per role;36aggregate bindings;prior279two missing/helper1 preserved'
Write-Host 'CUSTODY=2new/12aggregate roots;12/12root waits;24/24EOF streams;12stdin;7/7retained observed-child waits;rawstdout919315;stderr0'
Write-Host 'CHILD_LIMIT=nominal100ms CIM census;64observed descendants;10s post-root wait;old unresolved observations retained;not universal closure'
Write-Host 'FACTORY_BOUNDARY=named inherited dispatch/explicit same-store instance lifetime source-established;DI/runtime/native/materiality/global-passkey-scenario not qualified'
Write-Host 'CANONICAL_F234_F235=pending;SOURCE_DECISIONS=source-only-no-material-candidate;NO_PRODUCT_TEST_OR_PERFORMANCE_PASS'
