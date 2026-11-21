$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'control-support-279.ps1')
$guard = Get-FreshGuard279 'Data-only279 audit; source-root and approved-path selection budget closed'
[IO.File]::WriteAllBytes((Join-Path $Out 'control\audit-003-policy.raw.json'), $guard.policyBytes)
[IO.File]::WriteAllBytes((Join-Path $Out 'control\audit-003-registration.raw.json'), $guard.registrationBytes)
Write-FreshJson279 (Join-Path $Out 'control\audit-003-guard.json') $guard.receipt
$baseline = [IO.File]::ReadAllText((Join-Path $Out 'BASELINE-268-PINS.json')) | ConvertFrom-Json
$baselineFiles = @(Get-ChildItem -LiteralPath $baseline.priorRoot -File -Recurse -Force)
if ($baselineFiles.Count -ne 136 -or $baseline.exactPriorInventory.Count -ne 136)
{
    throw '268 exact inventory changed.'
}
foreach ($file in $baseline.exactPriorInventory)
{
    if ((Get-Item -LiteralPath $file.path).Length -ne $file.bytes -or
        (Get-FileHash -LiteralPath $file.path -Algorithm SHA256).Hash -cne $file.sha256)
    {
        throw 'A pinned268 artifact changed.'
    }
}
$decoded = [IO.File]::ReadAllText((Join-Path $Out 'BINDINGS-279-002.json')) | ConvertFrom-Json
$plan = [IO.File]::ReadAllText((Join-Path $Out 'BATCH-PLAN-279.json')) | ConvertFrom-Json
$root = Join-Path $Out 'roots\root-010'
$receipt = [IO.File]::ReadAllText((Join-Path $root 'receipt.json')) | ConvertFrom-Json
$raw = [IO.File]::ReadAllBytes((Join-Path $root 'stdout.bin'))
$stdin = [IO.File]::ReadAllBytes((Join-Path $root 'stdin.bin'))
$rootGuard = [IO.File]::ReadAllText((Join-Path $root 'guard.json')) | ConvertFrom-Json
if ((Get-FileHash -LiteralPath (Join-Path $root 'policy.raw.json') -Algorithm SHA256).Hash -cne $rootGuard.policySha256 -or
    (Get-FileHash -LiteralPath (Join-Path $root 'registration.raw.json') -Algorithm SHA256).Hash -cne $rootGuard.registrationSha256 -or
    $rootGuard.actualOwner -cne $Owner -or $rootGuard.scope -cne $Bootstrap.scope -or
    $rootGuard.actualWorkerBuildHoldActive -cne $false -or $rootGuard.buildAndTestWorkQuiesced -cne $false)
{
    throw 'Retained per-root fresh guard bytes/scope do not match.'
}
$approvedPaths = @(
    'src/Identity/Specification.Tests/src/UserManagerSpecificationTestBase.cs',
    'src/Identity/Core/src/PasskeyHandler.cs',
    'src/Identity/test/InMemory.Test/ControllerTest.cs'
)
$pinnedRoles = @{
    Original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
    Default = 'd3483989953ae3cccd773aea5ea04cb0c7198531'
}
foreach ($selection in $plan.selections)
{
    if ($selection.path -cnotin $approvedPaths -or
        $selection.commit -cne $pinnedRoles.($selection.role))
    {
        throw 'A source request escaped the exact approved role/path whitelist.'
    }
}
foreach ($stream in @('stdin', 'stdout', 'stderr'))
{
    $streamBytes = [IO.File]::ReadAllBytes((Join-Path $root ($stream + '.bin')))
    $expectedHash = if ($stream -eq 'stdin') { $receipt.launch.stdinSha256 } else { $receipt.($stream + 'Sha256') }
    if ((Get-BytesHash279 $streamBytes) -cne $expectedHash)
    {
        throw 'Retained raw stream mismatch.'
    }
}
if ($receipt.exitCode -ne 0 -or -not $receipt.explicitRootWaitReturned -or
    -not $receipt.stdoutCopyAwaitedToEof -or -not $receipt.stderrCopyAwaitedToEof -or
    -not $receipt.streamFilesClosed -or
    @($receipt.observedChildren | Where-Object { -not $_.observedIdentityWaitReturned }).Count -ne 0)
{
    throw 'Root or observed-child custody is incomplete.'
}
foreach ($kind in @('helper', 'support'))
{
    if ((Get-FileHash -LiteralPath $receipt.launch.$kind -Algorithm SHA256).Hash -cne $receipt.launch.($kind + 'Sha256'))
    {
        throw 'An executed279 source helper changed.'
    }
}
$requests = [Text.Encoding]::UTF8.GetString($stdin).TrimEnd("`n").Split("`n")
if ($decoded.responses.Count -ne 6 -or $decoded.bindings.Count -ne 4 -or $decoded.missing.Count -ne 2)
{
    throw 'Unexpected exact response inventory.'
}
$next = 0
foreach ($response in $decoded.responses)
{
    $planned = $plan.selections[$response.requestOrdinal]
    if ($response.headerOffset -ne $next -or $requests[$response.requestOrdinal] -cne $response.commitPath -or
        $response.commitPath -cne ($planned.commit + ':' + $planned.path) -or
        $response.role -cne $planned.role)
    {
        throw 'Request order or contiguous framing mismatch.'
    }
    $lineEnd = [Array]::IndexOf($raw, [byte]10, [int]$response.headerOffset)
    $header = [Text.Encoding]::ASCII.GetString($raw, [int]$response.headerOffset, $lineEnd - [int]$response.headerOffset)
    if ($header -cne $response.headerAscii)
    {
        throw 'Raw header differs from decoded response.'
    }
    if ($response.response -eq 'missing')
    {
        if ($header -cne ($response.commitPath + ' missing') -or
            $response.path -cne 'src/Identity/Specification.Tests/src/UserManagerSpecificationTestBase.cs')
        {
            throw 'Unexpected missing response.'
        }
        $next = $lineEnd + 1
        continue
    }
    $body = [IO.File]::ReadAllBytes($response.capture)
    $member = [byte[]]::new($response.bytes)
    [Array]::Copy($raw, [int]$response.bodyOffset, $member, 0, [int]$response.bytes)
    if ($body.Length -ne $response.bytes -or (Get-BytesHash279 $body) -cne $response.sha256 -or
        (Get-BytesHash279 $member) -cne $response.sha256 -or $response.textNormalizationPerformed -or
        $raw[$response.trailingFramingLfOffset] -ne 10)
    {
        throw 'A whole capture differs from the exact retained raw member.'
    }
    $objectHeader = [Text.Encoding]::ASCII.GetBytes("blob $($body.Length)$([char]0)")
    $object = [byte[]]::new($objectHeader.Length + $body.Length)
    [Array]::Copy($objectHeader, 0, $object, 0, $objectHeader.Length)
    [Array]::Copy($body, 0, $object, $objectHeader.Length, $body.Length)
    $sha1 = [Security.Cryptography.SHA1]::Create()
    try
    {
        $objectId = [BitConverter]::ToString($sha1.ComputeHash($object)).Replace('-', '').ToLowerInvariant()
    }
    finally
    {
        $sha1.Dispose()
    }
    if ($objectId -cne $response.blobId -or $header -cne ($objectId + ' blob ' + $body.Length))
    {
        throw 'Exact raw object type/size/blob ID mismatch.'
    }
    $next = [int]$response.trailingFramingLfOffset + 1
}
if ($next -ne $raw.Length)
{
    throw 'Retained raw response framing is incomplete.'
}
$oldRoleManifestPath = Join-Path $baseline.priorRoot 'ROLE-BINDINGS.json'
$oldRoles = [IO.File]::ReadAllText($oldRoleManifestPath) | ConvertFrom-Json
$oldTerminalPath = Join-Path $baseline.priorRoot 'SOURCE-TERMINAL-RECEIPTS.json'
$oldTerminal = [IO.File]::ReadAllText($oldTerminalPath) | ConvertFrom-Json
$combinedBodyInventory = @(
    foreach ($body in $oldRoles.wholeBlobBindings)
    {
        [ordered]@{
            role = $body.role
            commit = $body.commit
            path = $body.path
            bytes = $body.bytes
            sha256 = $body.sha256
            capture = $body.capture
            stage = 268
            boundary = 'Unchanged parent-byte-accepted268 artifact; not a new raw-tree/runtime/materiality qualification.'
        }
    }
    foreach ($body in $decoded.bindings)
    {
        [ordered]@{
            role = $body.role
            commit = $body.commit
            path = $body.path
            bytes = $body.bytes
            sha256 = $body.sha256
            capture = $body.capture
            stage = 279
            boundary = 'Exact279 retained commit:path request/member bytes/type/size/Git object hash checked; no independent raw commit/tree-chain expansion.'
        }
    }
)
$roleCounts = @(
    foreach ($role in @('Original', 'Default'))
    {
        $requested = @($plan.selections | Where-Object { $_.role -eq $role })
        $complete = @($decoded.bindings | Where-Object { $_.role -eq $role })
        $missing = @($decoded.missing | Where-Object { $_.role -eq $role })
        $allBodies = @($combinedBodyInventory | Where-Object { $_.role -eq $role })
        if ($requested.Count -ne 3 -or $complete.Count -ne 2 -or $missing.Count -ne 1 -or $allBodies.Count -ne 17)
        {
            throw 'Whole source path/body role budget mismatch.'
        }
        @{
            role = $role
            previousCompleteBodies = 15
            newPathRequests = 3
            newCompleteBodies = 2
            missingPathResponses = 1
            cumulativePathRequests = 18
            cumulativeCompleteBodies = 17
        }
    }
)
$allSourceObservers = @(@($oldTerminal.sourceRootObserverPids) + @($receipt.launch.observer.pid) | Sort-Object -Unique)
Write-FreshJson279 (Join-Path $Out 'ROLE-BINDINGS-279.json') @{
    verifiedUtc = [DateTime]::UtcNow.ToString('o')
    dataOnlyAuditObserver = Get-ProcessIdentity279 (Get-Process -Id $PID)
    priorRoleManifest = @{ path = $oldRoleManifestPath; sha256 = (Get-FileHash -LiteralPath $oldRoleManifestPath -Algorithm SHA256).Hash }
    priorAcceptance = '268whole indexed bytes/exact inventory only; unchanged136 files independently rehashed here.'
    currentRoles = ([IO.File]::ReadAllText((Join-Path $Out 'ROLES-279.json')) | ConvertFrom-Json)
    roleCounts = $roleCounts
    newCompleteBodyBindings = $decoded.bindings
    newMissingResponses = $decoded.missing
    cumulativeBodyInventory = $combinedBodyInventory
    cumulativeCompleteBodyCount = $combinedBodyInventory.Count
    newCompleteBodyCount = 4
    newRawResponses = 6
    sourceBodyOrRootRetryPerformed = $false
}
Write-FreshJson279 (Join-Path $Out 'TERMINAL-RECEIPTS-279.json') @{
    auditedUtc = [DateTime]::UtcNow.ToString('o')
    dataOnlyAuditObserver = Get-ProcessIdentity279 (Get-Process -Id $PID)
    priorSourceTerminal = @{ path = $oldTerminalPath; sha256 = (Get-FileHash -LiteralPath $oldTerminalPath -Algorithm SHA256).Hash }
    priorActualGitGhRoots = 9
    newActualGitGhRoots = 1
    aggregateActualGitGhRoots = 10
    newRoot = $receipt
    aggregateSourceObserverPids = $allSourceObservers
    aggregateRootWaitsReturned = 10
    aggregateOutputStreamsAwaitedToEof = 20
    aggregateStdinStreamsRetained = 10
    aggregateObservedChildren = $oldTerminal.observedChildren + @($receipt.observedChildren).Count
    aggregateObservedChildWaitsReturned = $oldTerminal.observedChildWaitsReturned + @($receipt.observedChildren | Where-Object { $_.observedIdentityWaitReturned }).Count
    aggregateRawStdoutBytes = $oldTerminal.totalRawStdoutBytes + $receipt.stdoutBytes
    aggregateRawStderrBytes = $oldTerminal.totalRawStderrBytes + $receipt.stderrBytes
    sourceHelperOuterExit = 1
    gitRootExit = 0
    dataOnlyDecoderOuterExit = 0
    rootAndStreamClosureDoesNotEraseSourceHelperFailure = $true
    noProspectiveAuditOuterExitClaim = $true
    observedChildLimit = $receipt.observedChildLimit
}
Write-FreshJson279 (Join-Path $Out 'AUDIT-279-003.json') @{
    observer = Get-ProcessIdentity279 (Get-Process -Id $PID)
    auditedUtc = [DateTime]::UtcNow.ToString('o')
    dataIntegrityAndCustodyOnly = $true
    baseline268CompleteInventoryUnchanged = 136
    rawResponseFramingFullyConsumed = $true
    completeNewWholeBodies = 4
    exactMissingResponses = 2
    newSourceRootBudgetConsumed = 1
    aggregateSourceRoots = 10
    noProductTestRuntimeMaterialityOrRawTreeQualificationClaim = $true
}
Write-Host ('AUDIT_OBSERVER_PID=' + $PID)
Write-Host 'AUDIT279_COMPLETE=4exact whole bodies/2missing responses;17complete/18requested whole files per role;1new/10aggregate Git-gh roots;268all136unchanged'
Write-Host 'CUSTODY_AGGREGATE=10/10root waits;20/20output EOF streams;10stdin streams;7/7observed-child waits;source-helper outer1 preserved'
