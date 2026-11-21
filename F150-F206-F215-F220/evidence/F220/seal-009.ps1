$ErrorActionPreference = 'Stop'
$scope = $PSScriptRoot
$campaign = Split-Path $scope -Parent
$owner = '640fc34c-7345-4501-b6b9-52b0379fb55a'
function Read-FreshScopeGuard
{
    $policyPath = Join-Path $campaign 'policy.json'
    $policy = [IO.File]::ReadAllText($policyPath) | ConvertFrom-Json
    $registrationPath = Join-Path $campaign 'owner-registration-background-247.json'
    $registration = [IO.File]::ReadAllText($registrationPath) | ConvertFrom-Json
    $leasePath = Join-Path $campaign 'benchmark-exclusive.lease.json'
    $leaseExists = Test-Path -LiteralPath $leasePath
    $ownerCount = @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count
    $scopeCount = @($policy.activeWorkerPreparationScopes.PSObject.Properties).Count
    if ($policy.independentFindingPreparationWorkers.F220 -ne $owner -or
        $registration.actualRegisteredOwners.F220 -ne $owner -or
        $policy.maximumRegisteredPreparationOwners -ne 4 -or
        $policy.activeWorkerPreparationScopes.F220 -notlike '243 only after GO243*' -or
        $ownerCount -gt 4 -or $scopeCount -gt 4 -or
        $leaseExists -or $policy.actualWorkerBuildHoldActive -ne $false -or
        $policy.buildAndTestWorkQuiesced -ne $false)
    {
        throw 'Fresh actual-own-registration/no-lease/no-HOLD/nonquiesced final guard rejected.'
    }

    return [ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('o')
        owner = $owner
        ownerCount = $ownerCount
        scopeCount = $scopeCount
        policyPath = $policyPath
        policySha256 = (Get-FileHash -LiteralPath $policyPath -Algorithm SHA256).Hash
        registrationPath = $registrationPath
        registrationSha256 = (Get-FileHash -LiteralPath $registrationPath -Algorithm SHA256).Hash
        registrationOwner = $registration.actualRegisteredOwners.F220
        leasePath = $leasePath
        leaseExists = $leaseExists
        HOLD = $policy.actualWorkerBuildHoldActive
        quiesced = $policy.buildAndTestWorkQuiesced
    }
}
function Write-NewEvidence
{
    param([string]$Name, $Value)
    $destination = Join-Path $scope $Name
    $stream = [IO.File]::Open($destination, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
    try
    {
        $content = if ($Value -is [string]) { $Value } else { ($Value | ConvertTo-Json -Depth 40) + "`n" }
        $bytes = [Text.UTF8Encoding]::new($false).GetBytes($content)
        $stream.Write($bytes, 0, $bytes.Length)
    }
    finally
    {
        $stream.Dispose()
    }
}
$startGuard = Read-FreshScopeGuard
foreach ($name in @('seal-009.request.json', 'seal-009.stdout.bin', 'seal-009.stderr.bin', 'seal-009.receipt.json', 'native-closure.json', 'HANDOFF.json', 'HASHES.json', 'HASHES.sha256'))
{
    if (Test-Path -LiteralPath (Join-Path $scope $name))
    {
        throw "Version009 output already exists; preserve it and do not replay this helper: $name"
    }
}
$entry = Join-Path $scope 'qualify-seal-009.mjs'
$node = (Get-Command node -CommandType Application).Source
Write-NewEvidence 'seal-009.request.json' ([ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    launcherPath = $PSCommandPath
    launcherSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    launcherPidSelfObserved = $PID
    entry = $entry
    entrySha256 = (Get-FileHash -LiteralPath $entry -Algorithm SHA256).Hash
    executable = $node
    argumentList = @($entry)
    workingDirectory = 'C:\src\aspnetcore'
    requestedToolExecutionId = 'F220243-final-seal-009'
    freshGuardBeforeNodeStart = $startGuard
    ownFutureExitNotAttested = $true
})
$start = [Diagnostics.ProcessStartInfo]::new()
$start.FileName = $node
$start.WorkingDirectory = 'C:\src\aspnetcore'
$start.ArgumentList.Add($entry)
$start.UseShellExecute = $false
$start.CreateNoWindow = $true
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
$stdout = [IO.File]::Open((Join-Path $scope 'seal-009.stdout.bin'), [IO.FileMode]::CreateNew)
$stderr = [IO.File]::Open((Join-Path $scope 'seal-009.stderr.bin'), [IO.FileMode]::CreateNew)
$child = [Diagnostics.Process]::Start($start)
$childPid = $child.Id
$childCreationUtc = $child.StartTime.ToUniversalTime().ToString('o')
$stdoutTask = $child.StandardOutput.BaseStream.CopyToAsync($stdout)
$stderrTask = $child.StandardError.BaseStream.CopyToAsync($stderr)
$child.WaitForExit()
$null = $stdoutTask.GetAwaiter().GetResult()
$null = $stderrTask.GetAwaiter().GetResult()
$childExit = $child.ExitCode
$stdout.Dispose()
$stderr.Dispose()
$child.Dispose()
$childTerminal = [ordered]@{
    observedAfterWaitUtc = [DateTime]::UtcNow.ToString('o')
    launcherPidSelfObserved = $PID
    childRootPidObservedByProcessObject = $childPid
    childCreationUtcObservedByProcessObject = $childCreationUtc
    childExitCodeAfterWait = $childExit
    childRootWaitReturned = $true
    bothRawStreamCopiesReturned = $true
    stdoutSha256 = (Get-FileHash -LiteralPath (Join-Path $scope 'seal-009.stdout.bin') -Algorithm SHA256).Hash
    stderrSha256 = (Get-FileHash -LiteralPath (Join-Path $scope 'seal-009.stderr.bin') -Algorithm SHA256).Hash
    universalDescendantCensusClaimed = $false
    launcherOwnFutureExitNotAttested = $true
}
Write-NewEvidence 'seal-009.receipt.json' $childTerminal
if ($childExit -ne 0)
{
    $childTerminal | ConvertTo-Json -Depth 8
    exit $childExit
}
$qualification = [IO.File]::ReadAllText((Join-Path $scope 'seal-inputs-009.json')) | ConvertFrom-Json
if ($qualification.sourceAudit.checksFailed -ne 0 -or
    $qualification.productBuildTestApplicationStarts -ne 0 -or
    $qualification.comparisons -ne 0 -or
    $qualification.materialCandidateQualified -ne $false)
{
    throw 'Unexpected final qualification state; seal withheld.'
}
$closingGuard = Read-FreshScopeGuard
Write-NewEvidence 'seal-guard-009.json' $closingGuard
Write-NewEvidence 'native-closure.json' ([ordered]@{
    finding = 'F220'
    scope = 243
    observedUtc = [DateTime]::UtcNow.ToString('o')
    productBuildTestApplicationStarts = 0
    productBuildTestApplicationRoots = @()
    productBuildTestApplicationChildren = @()
    sdkActivations = 0
    restoreOrInstallStarts = 0
    timingWarmupAllocationProfilingStarts = 0
    comparisons = 0
    benchmarkBudgetConsumption = 0
    capturedGitGitHubSourceRootCount = $qualification.capturedSourceToolRootCount
    allCapturedGitGitHubRootsAndBothStreamsReturned = $true
    finalNodeAdministrativeChildActualTerminal = $childTerminal
    pendingOwnedProductNativeWork = @()
    noUniversalDescendantOrUnrelatedProcessCensusClaim = $true
    earlyOuterConsoleRawCaptureLimit = 'tool-boundaries.json; no rendered console output is passed off as original raw OS bytes.'
    finalOuterLauncherTerminalAuthority = 'Only the actual returned tool result, after this sealer ends; not self-attested here.'
})
Write-NewEvidence 'HANDOFF.json' ([ordered]@{
    finding = 'F220'
    scope = 243
    owner = $owner
    card = 'ienumerable-count-before-reenumeration'
    target = 'src\ProjectTemplates\Shared\AspNetProcess.cs'
    targetLines = @(162, 163)
    disposition = 'bounded-source-only-no-material-candidate'
    readyForParentAcceptance = $true
    campaignFinalized = $false
    canonicalOuterCandidateId = 'F220; pending confirmed by parent, not inferred from older nested reports'
    sourcePins = $qualification.sourcePins
    assessment = 'assessment.json'
    producerMatrix = 'producer-matrix.json'
    sourceAudit = [ordered]@{
        file = 'source-audit-results-008.json'
        checksPassed = $qualification.sourceAudit.checksPassed
        checksFailed = $qualification.sourceAudit.checksFailed
        completeRawSourceBindings = $qualification.sourceAudit.completeRawSourceBindings
        notProductTests = $true
    }
    producerSummary = '16 non-null Links initializers:12 small string arrays and4 fixed-depth Concat/Append pipelines. Exact declared LINQ sources count all through collection/iterator metadata; no expected-element Count traversal is removed. Seven Blazor Page construction sites leave Links null.'
    DOMDistinction = 'AngleSharp Document.Links is a cached live-query wrapper; Length counts its deferred DOM query. The two Length reads and eager diagnostic are distinct real source work. No material normal owning-workload benefit was established; do not conclude the entire statement has no deferred work.'
    overlapF190 = 'Different card and target seam. Prior target117 had an empty candidate.diff and no retained implementation; not classified as an exact duplicate merely by filename or related discussion.'
    candidateRetained = $false
    candidateDiffBytes = 0
    sourceFilesEdited = @()
    privateGraphsCreated = @()
    productBuildTestApplicationStarts = 0
    productTestResult = 'Not run: the material-candidate gate did not pass; no red/green, runtime, browser, performance or correctness claim.'
    comparisons = 0
    benchmarkBudgetConsumption = 0
    sourceOnlyNotMeasuredNoGain = $true
    notUniversalImmateriality = $true
    nativeClosure = 'native-closure.json'
    fullSourceCommandRootIndex = 'source-root-terminal-index-009.json'
    capturedGitGitHubSourceRoots = $qualification.capturedSourceToolRootCount
    capturedSourceRootExitCounts = $qualification.sourceToolRootExitCounts
    ancillaryToolFailuresAndLimits = 'tool-boundaries.json'
    reservedNavigationWorktree = $qualification.reserved
    originalUntrackedReports = $qualification.protectedReports
    originalReportHashLimit = $qualification.protectedReportLimit
    noRegistryPolicyLeaseLedgerCampaignManifestRemoteOrPublicReportWrites = $true
    noSubagents = $true
    freshClosingGuard = $closingGuard
    sealerPowerShellPidSelfObserved = $PID
    nodeChildObservedActualTerminal = $childTerminal
    requestedToolExecutionId = 'F220243-final-seal-009'
    outerLauncherExitNotSelfAttested = $true
    checksumIndex = 'HASHES.json'
    checksumIndexDigest = 'HASHES.sha256'
    sealBoundary = 'All finding files except the checksum index and its own digest are indexed. Scripts, source, full command streams/argv/waits/exits, tool-limit records, actual Node terminal, audit and this handoff are included. Outer sealer terminal is reported only after the actual tool return.'
    qualificationLimits = @(
        'Declared package/reference source pins are not observed executing host/package binaries, runtime switches or JIT behavior.'
        'Generated application HTML, authentication state, native DOM sizes and material performance were not exercised.'
        'LSP omitted linked external callers and external binding; pinned inventories and full source supplemented it.'
        'Historical raw card extraction was absent; this is assigned existing-row qualification, not a new scan or all-card-complete evaluation.'
        'First helper outer console bytes and some broad-discovery partial renderings remain transcript-only; complete native source-command streams and later helper captures are preserved.'
        'Only recorded source roots and streams were waited; no universal descendant or unrelated-process census is claimed.'
    )
    nextActor = 'Parent alone accepts/rejects and finalizes. Owner stops at this handoff after final tool result.'
})
$rootPrefix = $scope.TrimEnd('\') + '\'
$files = [IO.Directory]::GetFiles($scope, '*', [IO.SearchOption]::AllDirectories)
[Array]::Sort($files, [StringComparer]::Ordinal)
$records = @(
    foreach ($file in $files)
    {
        $relative = $file.Substring($rootPrefix.Length)
        if ($relative -in @('HASHES.json', 'HASHES.sha256'))
        {
            continue
        }

        [ordered]@{
            path = $relative
            bytes = ([IO.FileInfo]::new($file)).Length
            sha256 = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
        }
    }
)
Write-NewEvidence 'HASHES.json' ([ordered]@{
    finding = 'F220'
    scope = 243
    observedUtc = [DateTime]::UtcNow.ToString('o')
    algorithm = 'SHA256'
    root = $scope
    fileCount = $records.Count
    excludedSelfReferentialFiles = @('HASHES.json', 'HASHES.sha256')
    files = $records
})
$indexPath = Join-Path $scope 'HASHES.json'
$indexHash = (Get-FileHash -LiteralPath $indexPath -Algorithm SHA256).Hash
Write-NewEvidence 'HASHES.sha256' ($indexHash + '  HASHES.json' + "`n")
$persisted = [IO.File]::ReadAllText($indexPath) | ConvertFrom-Json
if ($persisted.fileCount -ne $records.Count)
{
    throw 'Persisted checksum index count mismatch.'
}
foreach ($record in $persisted.files)
{
    $file = Join-Path $scope $record.path
    if (([IO.FileInfo]::new($file)).Length -ne $record.bytes -or
        (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $record.sha256)
    {
        throw "Post-seal byte validation failed: $($record.path)"
    }
}
if ((Get-FileHash -LiteralPath $indexPath -Algorithm SHA256).Hash -ne $indexHash -or
    [IO.File]::ReadAllText((Join-Path $scope 'HASHES.sha256')).Trim() -ne ($indexHash + '  HASHES.json'))
{
    throw 'Post-seal checksum-index/digest validation failed.'
}
$terminalGuard = Read-FreshScopeGuard
[ordered]@{
    observation = 'Actual body reached this line only after child root/stream waits and persisted full-file checksum validation; own outer exit is not self-attested.'
    requestedToolExecutionId = 'F220243-final-seal-009'
    launcherPidSelfObserved = $PID
    childRootPidObservedByProcessObject = $childPid
    childExitCodeAfterRootAndBothRawStreamWaits = $childExit
    indexedFiles = $records.Count
    checksumIndexSha256 = $indexHash
    postSealChecksPassed = $true
    sourceAuditChecksPassed = $qualification.sourceAudit.checksPassed
    sourceAuditChecksFailed = $qualification.sourceAudit.checksFailed
    nativeProductStarts = 0
    comparisons = 0
    finalFreshGuard = $terminalGuard
    parentAcceptancePending = $true
} | ConvertTo-Json -Depth 10
exit 0
