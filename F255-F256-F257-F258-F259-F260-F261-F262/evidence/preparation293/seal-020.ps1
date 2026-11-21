$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
. (Join-Path $PSScriptRoot 'capture-library-009.ps1')
$guard = Assert-Current293Guard 'seal-020-entry'
$audit = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'source-audit-019.json')) | ConvertFrom-Json -Depth 100
$sourceMembers = @([IO.File]::ReadAllText((Join-Path $PSScriptRoot 'source-input-inventory-019.json')) | ConvertFrom-Json -Depth 100)
$rootMembers = @([IO.File]::ReadAllText((Join-Path $PSScriptRoot 'direct-root-inventory-019.json')) | ConvertFrom-Json -Depth 100)
if ($audit.completeWholeBodies -ne 30 -or $sourceMembers.Count -ne 30 -or $rootMembers.Count -ne 18) { throw 'Final source/root audit counts changed' }
foreach ($member in $sourceMembers)
{
    $bytes = [IO.File]::ReadAllBytes((Join-Path $PSScriptRoot $member.sourceFile))
    if ($bytes.Length -ne $member.bytes -or (Get-BytesSha256 $bytes) -cne $member.sha256) { throw 'Selected body changed before final inventory' }
}
foreach ($root in $rootMembers)
{
    $receipt = [IO.File]::ReadAllText((Join-Path $PSScriptRoot $root.receiptFile)) | ConvertFrom-Json -Depth 100
    foreach ($stream in @('stdout','stderr'))
    {
        $bytes = [IO.File]::ReadAllBytes((Join-Path $PSScriptRoot ($root.label + '.' + $stream + '.bin')))
        if ($bytes.Length -ne $receipt.($stream + 'Bytes') -or (Get-BytesSha256 $bytes) -cne $receipt.($stream + 'Sha256')) { throw 'Native stream changed before final inventory' }
    }
}
$handoff = [ordered]@{
    ownerTaskId = $script:ScopeBinding.actualOwner
    exactScopeBinding = 'scope-binding-005.json'
    sourceOnlyPhase = 293
    sourceDecisions = @(
        [ordered]@{ id = 'F255'; file = 'decision-F255-019.json'; disposition = 'No material candidate established; ordered case-insensitive prefix predicate, not equality membership; 21 prefixes in successful initialization path' }
        [ordered]@{ id = 'F256'; file = 'decision-F256-019.json'; disposition = 'Real repeated membership but no material candidate established; 75 source rows, 2-136 expected entries, median17, real duplicate preserved' }
    )
    independentDecisionsNotDuplicates = $true
    measuredNoGainOrRuntimeQualificationClaimed = $false
    originalCommit = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
    freshObservedUpstreamDefault = 'd3483989953ae3cccd773aea5ea04cb0c7198531'
    upstreamPinEvidence = 'r001-gh-upstream-default.stdout.bin'
    rawRoleCommitEvidence = 'commit-metadata-index-018.json'
    allSelectedBodyPairsByteEqual = 15
    wholeRepositoryInputsPerRole = 15
    guidanceDocsChargedWithinEachRole = 6
    commonInjectedInstructionSkillContextsPerRole = 2
    inclusiveLogicalInputsPerRole = 17
    perRoleSourceBytes = 315017
    totalWholeRepositoryBodies = 30
    directGitGhRootsIncludingFailures = 18
    directGitGhRootCeiling = 32
    nativeNonzeroExitRoots = 0
    observerFailedRootAttemptR002IncludedInCount = $true
    dataHelperFailuresPreserved = 3
    metadataDiscoveryTimeoutsPreserved = 3
    exactSourceInventory = 'source-input-inventory-019.json'
    exactNativeRootInventory = 'direct-root-inventory-019.json'
    exactSourceAudit = 'source-audit-019.json'
    contextAccounting = 'injected-context-accounting-018.json'
    separatelyDisclosedGovernanceInputs = 'governance-read-inputs-index-018.json'
    failureAndObserverLimits = 'execution-failures-and-observer-limits-019.json'
    finiteUnreadSourceProposal = 'finite-unread-source-proposal-017.json'
    repositoryBodyBudgetClosed = $true
    additionalBodiesOrNativeExecutionAuthorized = $false
    actualUnrunTest = 'Templates.Test.BaselineTest.Template_Produces_The_Right_Set_Of_FilesAsync'
    sourceDeclaredRowsNotExecuted = 75
    unrunReason = 'Explicit source-only prohibition, not an observed missing SDK/package prerequisite'
    staticBoundary = 'Whole selected immutable files, parsed complete embedded JSON, actual declared fixture/generation/pack metadata and metadata-only history'
    unverifiedBoundaries = @('actual package discovery/contents','Helix payload closure','the three unread package project bodies','largest-row template manifest and full transitive template engine/content production','actual generated files','test discovery and assertions','xUnit internals','runtime/performance materiality')
    reservedRepositoryStateObservation = 'HEAD24875ef5dabb55567870b39f6eb0002170435e2f and empty tracked-status output before/after; never used as Default; not a universal proof about other users'
    forbiddenActionsNotPerformed = @('SDK activation','dotnet/restore/build/test','template installation or generation','product/scenario/server/host/browser execution','candidate or repository/source/test/package-manifest/cache edits','counters/timing/warmup/allocation/profiler','installation/dependency copying or downloads','shared SDK/policy/lease/ledger writes','publication/remote/subagent operations','API/IVT/UnsafeAccessor changes','cleanup')
    actualFinalOuterReceipt = $null
    finalOuterReceiptMustBeTakenOnlyAfterReturn = $true
    parentNextActionsOnly = 'Independently inspect/accept evidence and observer/transport limitations; append actual final outer receipt after return; then decide retirement, raw provenance qualification and finalization. This handoff changes no outer status and opens no performance PR/window.'
    acceptance = @(
        [ordered]@{ criterion = 'Two distinct source decisions with actual producers, scale, contracts, current default and bounded history'; result = 'Completed at the explicitly bounded static source boundary; remaining producer/runtime gaps listed' }
        [ordered]@{ criterion = 'Whole binary Git source provenance, modes, framing, byte counts and hashes'; result = 'Verified for all30 selected bodies against native full ls-tree/cat-file streams, not a self-manifest alone' }
        [ordered]@{ criterion = '15 repository inputs plus at most2 injected contexts per role;32 roots including failures'; result = '15+2=17 per role;18 roots; failures/late control captures explicitly disclosed' }
        [ordered]@{ criterion = 'Source-only and output isolation'; result = 'All task-authored files are in the new finding directory; R remained read-only; tool-owned automatic spools were only read and retained, never created/modified by task helpers' }
        [ordered]@{ criterion = 'Runtime tests or measured optimization'; result = 'Intentionally unrun and not qualified' }
        [ordered]@{ criterion = 'Actual final enclosing exit/parent acceptance'; result = 'Not self-attested; pending parent after this final tool/agent return' }
    )
}
Save-NewJson 'handoff-020.json' $handoff
$files = @([IO.Directory]::EnumerateFiles($PSScriptRoot,'*',[IO.SearchOption]::AllDirectories) | Sort-Object)
$inventory = @()
foreach ($file in $files)
{
    $relative = [IO.Path]::GetRelativePath($PSScriptRoot,$file)
    if ($relative -in @('all-files-inventory-020.json','seal-020.json')) { throw 'Final inventory/seal already exists; no overwrite/replay allowed' }
    $bytes = [IO.File]::ReadAllBytes($file)
    $inventory += [ordered]@{ relativePath = $relative; bytes = $bytes.Length; sha256 = (Get-BytesSha256 $bytes) }
}
Save-NewJson 'all-files-inventory-020.json' $inventory
$inventoryBytes = [IO.File]::ReadAllBytes((Join-Path $PSScriptRoot 'all-files-inventory-020.json'))
$directories = @([IO.Directory]::EnumerateDirectories($PSScriptRoot,'*',[IO.SearchOption]::AllDirectories) | ForEach-Object { [IO.Path]::GetRelativePath($PSScriptRoot,$_) } | Sort-Object)
$seal = [ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    ownerTaskId = $script:ScopeBinding.actualOwner
    phase = '293 SOURCE ONLY'
    inventory = 'all-files-inventory-020.json'
    inventoryBytes = $inventoryBytes.Length
    inventorySha256 = (Get-BytesSha256 $inventoryBytes)
    indexedPayloadFiles = $inventory.Count
    indexedPayloadBytes = ($inventory | ForEach-Object { $_.bytes } | Measure-Object -Sum).Sum
    exactFinalDirectoryFileCount = $inventory.Count + 2
    explicitSelfReferenceFilesOutsidePayloadIndex = @('all-files-inventory-020.json','seal-020.json')
    selfReferenceBinding = 'Seal binds the complete payload inventory; actual seal SHA is emitted to the enclosing tool after writing. Parent must bind that actual tool result/exit after return. Neither index nor seal claims a recursive self-hash.'
    exactSubdirectories = $directories
    sourceInventory = 'source-input-inventory-019.json'
    nativeRootInventory = 'direct-root-inventory-019.json'
    sourceBodyBudgetPerRole = [ordered]@{ repositoryBodies = 15; injectedCommonContexts = 2; inclusiveInputs = 17; sourceBytes = 315017 }
    completeWholeBodies = 30
    directGitGhRootsIncludingFailures = 18
    sourceDecisions = @('decision-F255-019.json','decision-F256-019.json')
    failureAndObservationLimits = 'execution-failures-and-observer-limits-019.json'
    finalGuardReceipt = 'guards\seal-020-entry.receipt.json'
    finalGuardIsPointObservationOnly = $true
    ledgerPendingAtGuard = @('F255','F256')
    actualFinalOuterExitCode = $null
    actualFinalAgentReturnReceipt = $null
    neitherActualExitIsPredictedOrSelfAttested = $true
    parentIndependentAcceptanceAndRawQualificationRequired = $true
}
Save-NewJson 'seal-020.json' $seal
foreach ($entry in $inventory)
{
    $bytes = [IO.File]::ReadAllBytes((Join-Path $PSScriptRoot $entry.relativePath))
    if ($bytes.Length -ne $entry.bytes -or (Get-BytesSha256 $bytes) -cne $entry.sha256) { throw 'Final indexed file changed while sealing' }
}
$actualFiles = @([IO.Directory]::EnumerateFiles($PSScriptRoot,'*',[IO.SearchOption]::AllDirectories) | ForEach-Object { [IO.Path]::GetRelativePath($PSScriptRoot,$_) } | Sort-Object)
$expectedFiles = @(@($inventory | ForEach-Object { $_.relativePath }) + @('all-files-inventory-020.json','seal-020.json') | Sort-Object)
if (($actualFiles -join "`n") -cne ($expectedFiles -join "`n")) { throw 'Final directory has an unindexed or omitted file' }
$sealBytes = [IO.File]::ReadAllBytes((Join-Path $PSScriptRoot 'seal-020.json'))
[Console]::WriteLine(([ordered]@{
    handoff = 'handoff-020.json'
    seal = 'seal-020.json'
    actualSealSha256 = (Get-BytesSha256 $sealBytes)
    inventorySha256 = (Get-BytesSha256 $inventoryBytes)
    indexedPayloadFiles = $inventory.Count
    exactDirectoryFiles = $actualFiles.Count
    allIndexedBytesAndExactFileSetVerified = $true
    bodies = 30
    repositoryPlusInjectedContextsPerRole = '15+2=17'
    directGitGhRoots = '18/32 including failed observer attempt'
    runtimeOrMeasuredQualification = $false
    actualFinalEnclosingExitStillMustComeFromToolAfterReturn = $true
} | ConvertTo-Json -Depth 10))
