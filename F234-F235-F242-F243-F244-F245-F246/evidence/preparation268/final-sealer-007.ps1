$ErrorActionPreference = 'Stop'
$script:PhasePath = $PSCommandPath
. (Join-Path $PSScriptRoot 'source-support-268.ps1')
$indexPath = Join-Path $Out 'EVIDENCE-INDEX.json'
$sealPath = Join-Path $Out 'FINAL-SEAL.json'
if ((Test-Path -LiteralPath $indexPath) -or (Test-Path -LiteralPath $sealPath))
{
    throw 'Seal destinations must be fresh; no replay or overwrite.'
}

$guard = Get-FreshSourceGuard 'Final data-only seal; no new source root or product execution'
[IO.File]::WriteAllBytes((Join-Path $Out 'control\seal-007-policy.raw.json'), $guard.policyBytes)
[IO.File]::WriteAllBytes((Join-Path $Out 'control\seal-007-registration.raw.json'), $guard.registrationBytes)
Write-FreshJson (Join-Path $Out 'control\seal-007-guard.json') $guard.receipt
$assessment = [IO.File]::ReadAllText((Join-Path $Out 'ASSESSMENT.json')) | ConvertFrom-Json
$roleBindings = [IO.File]::ReadAllText((Join-Path $Out 'ROLE-BINDINGS.json')) | ConvertFrom-Json
$terminal = [IO.File]::ReadAllText((Join-Path $Out 'SOURCE-TERMINAL-RECEIPTS.json')) | ConvertFrom-Json
$auditOuter = [IO.File]::ReadAllText((Join-Path $Out 'control\outer-audit-006-actual.json')) | ConvertFrom-Json
if ($auditOuter.actualOuterToolExitCode -ne 0 -or $roleBindings.bodyBindings -ne 30 -or
    $terminal.directGitGhRoots -ne 9 -or $terminal.rootWaitsReturned -ne 9 -or
    $terminal.redirectedOutputStreamsFullyAwaited -ne 18 -or
    $terminal.observedChildren -ne 7 -or $terminal.observedChildWaitsReturned -ne 7 -or
    @($assessment.findings | Where-Object { $_.sourceDecision -cne 'source-only-no-material-candidate' }).Count -ne 0)
{
    throw 'Data-only audit or bounded disposition input mismatch.'
}

foreach ($binding in $roleBindings.wholeBlobBindings)
{
    if ((Get-FileHash -LiteralPath $binding.capture -Algorithm SHA256).Hash -cne $binding.sha256)
    {
        throw 'A previously audited exact raw source capture changed.'
    }
}
foreach ($root in $terminal.roots)
{
    $receipt = [IO.File]::ReadAllText($root.receipt) | ConvertFrom-Json
    $rootDirectory = Split-Path -Parent $root.receipt
    foreach ($stream in @('stdin', 'stdout', 'stderr'))
    {
        $expectedHash = if ($stream -eq 'stdin') { $receipt.launch.stdinSha256 } else { $receipt.($stream + 'Sha256') }
        if ((Get-FileHash -LiteralPath (Join-Path $rootDirectory ($stream + '.bin')) -Algorithm SHA256).Hash -cne $expectedHash)
        {
            throw 'An audited source stream changed.'
        }
    }
}

$allFiles = @(Get-ChildItem -LiteralPath $Out -File -Recurse -Force | Sort-Object FullName)
if (@($allFiles | Where-Object { ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 }).Count -ne 0)
{
    throw 'Unexpected reparse-point artifact.'
}
foreach ($jsonFile in @($allFiles | Where-Object { $_.Extension -eq '.json' }))
{
    $null = [IO.File]::ReadAllText($jsonFile.FullName) | ConvertFrom-Json
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
Write-FreshJson $indexPath ([ordered]@{
    format = 'GO268-source-evidence-index-v1'
    createdUtc = [DateTime]::UtcNow.ToString('o')
    root = $Out
    actualOwner = $Owner
    immutableRoles = $roleBindings.roles
    indexedArtifactCount = $entries.Count
    indexedBytes = ($entries | Measure-Object -Property bytes -Sum).Sum
    exclusions = @('EVIDENCE-INDEX.json', 'FINAL-SEAL.json')
    exclusionReason = 'No recursive/self-referential hashing. FINAL-SEAL binds this exact index; actual outer exit comes only from the tool response.'
    entries = $entries
})
$indexHash = (Get-FileHash -LiteralPath $indexPath -Algorithm SHA256).Hash
$handoffPath = Join-Path $Out 'HANDOFF.md'
$handoffHash = (Get-FileHash -LiteralPath $handoffPath -Algorithm SHA256).Hash
$sealerIdentity = Get-ProcessIdentity (Get-Process -Id $PID)
Write-FreshJson $sealPath ([ordered]@{
    format = 'GO268-data-only-final-seal-v1'
    createdUtc = [DateTime]::UtcNow.ToString('o')
    actualOwner = $Owner
    sourceDecisions = @{ F234 = 'source-only-no-material-candidate'; F235 = 'source-only-no-material-candidate' }
    canonicalOuterStatusesObserved = @{ F234 = 'pending'; F235 = 'pending' }
    parentOnlyAcceptanceRetirementFinalization = $true
    handoff = @{ path = $handoffPath; sha256 = $handoffHash }
    index = @{ path = $indexPath; sha256 = $indexHash; indexedArtifactCount = $entries.Count }
    assessment = @{
        path = (Join-Path $Out 'ASSESSMENT.json')
        sha256 = (Get-FileHash -LiteralPath (Join-Path $Out 'ASSESSMENT.json') -Algorithm SHA256).Hash
    }
    roleBindings = @{
        path = (Join-Path $Out 'ROLE-BINDINGS.json')
        sha256 = (Get-FileHash -LiteralPath (Join-Path $Out 'ROLE-BINDINGS.json') -Algorithm SHA256).Hash
        wholeRawBlobBindings = 30
        wholeLogicalFilesPerRole = 15
    }
    terminalReceipts = @{
        path = (Join-Path $Out 'SOURCE-TERMINAL-RECEIPTS.json')
        sha256 = (Get-FileHash -LiteralPath (Join-Path $Out 'SOURCE-TERMINAL-RECEIPTS.json') -Algorithm SHA256).Hash
        directGitGhRoots = 9
        sourceRootObserverPids = $terminal.sourceRootObserverPids
        rootWaitsReturned = 9
        outputStreamsAwaitedToEof = 18
        stdinStreamsRetained = 9
        observedChildWaitsReturned = 7
        observedChildLimit = 'Creation-checked live-parent CIM census; nominal100ms root waits; maximum64 observed descendants/10s post-root wait. Not universal descendant closure.'
    }
    priorAuditActualOuterExit = $auditOuter
    sealerLiveIdentity = $sealerIdentity
    sealerOuterToolReceipt = @{
        shellId = 'f234-f235-268-seal-007'
        completionKnownInsideSealer = $false
        instruction = 'Bind the actual returned outer tool exit in the final parent response; this artifact makes no prospective self-exit claim.'
    }
    sourceBodyBudgetClosed = $true
    finiteNextProposalExecuted = $false
    productNativeBuildTestRuntimeOrTimingPerformed = $false
})
$sealHash = (Get-FileHash -LiteralPath $sealPath -Algorithm SHA256).Hash
Write-Host ('HANDOFF_PATH=' + $handoffPath)
Write-Host ('HANDOFF_SHA256=' + $handoffHash)
Write-Host ('INDEX_PATH=' + $indexPath)
Write-Host ('INDEX_SHA256=' + $indexHash)
Write-Host ('INDEXED_ARTIFACTS=' + $entries.Count)
Write-Host ('SEALED_ARTIFACTS_INCLUDING_INDEX_AND_SEAL=' + ($entries.Count + 2))
Write-Host ('FINAL_SEAL_PATH=' + $sealPath)
Write-Host ('FINAL_SEAL_SHA256=' + $sealHash)
Write-Host ('SOURCE_OBSERVER_PIDS=' + ($terminal.sourceRootObserverPids -join ','))
Write-Host ('SEALER_OBSERVER_PID=' + $PID)
Write-Host 'CUSTODY=9/9Git-gh roots waited;18/18output EOF streams;9raw stdin streams;7/7observed children waited;15whole files/role;30raw bindings'
Write-Host 'CHILD_LIMIT=nominal100ms CIM census;64observed descendants;10s post-root observed-child waits;not universal closure'
Write-Host 'CANONICAL_F234_F235=pending;SOURCE_DECISIONS=source-only-no-material-candidate;NO_PRODUCT_TEST_OR_PERFORMANCE_PASS'
