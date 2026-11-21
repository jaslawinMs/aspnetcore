$ErrorActionPreference = 'Stop'
$script:PhasePath = $PSCommandPath
. (Join-Path $PSScriptRoot 'source-support-268.ps1')
$guard = Get-FreshSourceGuard 'Post-source data-only audit; source body budget closed'
[IO.File]::WriteAllBytes((Join-Path $Out 'control\audit-006-policy.raw.json'), $guard.policyBytes)
[IO.File]::WriteAllBytes((Join-Path $Out 'control\audit-006-registration.raw.json'), $guard.registrationBytes)
Write-FreshJson (Join-Path $Out 'control\audit-006-guard.json') $guard.receipt
$roles = [IO.File]::ReadAllText((Join-Path $Out 'roles.json')) | ConvertFrom-Json
$allBindings = @(
    Get-ChildItem -LiteralPath $Out -File -Filter 'bindings-*.json' | Sort-Object Name | ForEach-Object {
        ([IO.File]::ReadAllText($_.FullName) | ConvertFrom-Json).bindings
    }
)
if ($allBindings.Count -ne 30)
{
    throw 'Expected30 whole raw source bindings.'
}

$verifiedBindings = @(
    foreach ($binding in $allBindings)
    {
        if ($binding.commit -cne $roles.($binding.role).commit -or -not $binding.exactRawGitMembership -or $binding.textNormalizationPerformed)
        {
            throw 'Invalid immutable role binding.'
        }

        $body = [IO.File]::ReadAllBytes($binding.capture)
        $raw = [IO.File]::ReadAllBytes($binding.batchRawStdout)
        $stdin = [IO.File]::ReadAllBytes((Join-Path $binding.batchRoot 'stdin.bin'))
        $requests = [Text.Encoding]::UTF8.GetString($stdin).TrimEnd("`n").Split("`n")
        if ($requests[$binding.requestOrdinal] -cne $binding.commitPath -or
            $body.Length -ne $binding.bytes -or (Get-BytesHash $body) -cne $binding.sha256 -or
            (Get-BytesHash $raw) -cne $binding.batchRawStdoutSha256 -or
            $raw[$binding.trailingFramingLfOffset] -ne 10)
        {
            throw 'Raw request/body/stream integrity mismatch.'
        }

        $member = [byte[]]::new($binding.bytes)
        [Array]::Copy($raw, [int]$binding.bodyOffset, $member, 0, [int]$binding.bytes)
        if ((Get-BytesHash $member) -cne $binding.sha256)
        {
            throw 'Capture differs from exact binary batch member.'
        }

        $header = [Text.Encoding]::ASCII.GetString($raw, [int]$binding.headerOffset, [int]$binding.bodyOffset - [int]$binding.headerOffset - 1)
        if ($header -cne $binding.headerAscii -or $header -cne ($binding.blobId + ' blob ' + $binding.bytes))
        {
            throw 'Raw type/size/blob framing mismatch.'
        }

        $objectHeader = [Text.Encoding]::ASCII.GetBytes("blob $($body.Length)$([char]0)")
        $object = [byte[]]::new($objectHeader.Length + $body.Length)
        [Array]::Copy($objectHeader, 0, $object, 0, $objectHeader.Length)
        [Array]::Copy($body, 0, $object, $objectHeader.Length, $body.Length)
        $sha1 = [Security.Cryptography.SHA1]::Create()
        try
        {
            $recomputedId = [BitConverter]::ToString($sha1.ComputeHash($object)).Replace('-', '').ToLowerInvariant()
        }
        finally
        {
            $sha1.Dispose()
        }
        if ($recomputedId -cne $binding.blobId)
        {
            throw 'Independently recomputed raw Git object ID mismatch.'
        }

        [ordered]@{
            role = $binding.role
            commit = $binding.commit
            path = $binding.path
            commitPath = $binding.commitPath
            blobId = $binding.blobId
            bytes = $binding.bytes
            sha256 = $binding.sha256
            capture = $binding.capture
            rawGitMembershipRechecked = $true
        }
    }
)
$roleCounts = @(
    foreach ($role in @('Original', 'Default'))
    {
        $selected = @($verifiedBindings | Where-Object { $_.role -eq $role })
        $paths = @($selected.path | Sort-Object -Unique)
        if ($selected.Count -ne 15 -or $paths.Count -ne 15)
        {
            throw 'Unexpected conservative whole logical file count.'
        }

        [ordered]@{
            role = $role
            commit = $roles.$role.commit
            wholeLogicalFiles = $paths.Count
            bytes = ($selected | Measure-Object -Property bytes -Sum).Sum
            paths = $paths
        }
    }
)
$same = 0
foreach ($binding in @($verifiedBindings | Where-Object { $_.role -eq 'Original' }))
{
    $peer = @($verifiedBindings | Where-Object { $_.role -eq 'Default' -and $_.path -eq $binding.path })
    if ($peer.Count -ne 1)
    {
        throw 'Missing unique Default peer.'
    }
    if ($peer[0].sha256 -ceq $binding.sha256)
    {
        $same++
    }
}
if ($same -ne 14)
{
    throw 'Unexpected cross-role raw file identity count.'
}

$rootDirectories = @(Get-ChildItem -LiteralPath (Join-Path $Out 'roots') -Directory -Filter 'root-*' | Sort-Object Name)
if ($rootDirectories.Count -ne 9 -or $rootDirectories.Count -gt 32)
{
    throw 'Unexpected source root count.'
}
$rootSummary = @(
    foreach ($directory in $rootDirectories)
    {
        $receiptPath = Join-Path $directory.FullName 'receipt.json'
        $receipt = [IO.File]::ReadAllText($receiptPath) | ConvertFrom-Json
        foreach ($kind in @('stdin', 'stdout', 'stderr'))
        {
            $path = Join-Path $directory.FullName ($kind + '.bin')
            $data = [IO.File]::ReadAllBytes($path)
            $expectedBytes = if ($kind -eq 'stdin') { $receipt.launch.stdinBytes } else { $receipt.($kind + 'Bytes') }
            $expectedHash = if ($kind -eq 'stdin') { $receipt.launch.stdinSha256 } else { $receipt.($kind + 'Sha256') }
            if ($data.Length -ne $expectedBytes -or (Get-BytesHash $data) -cne $expectedHash)
            {
                throw "Preserved raw stream mismatch: $path"
            }
        }

        if ($receipt.exitCode -ne 0 -or -not $receipt.explicitRootWaitReturned -or
            -not $receipt.stdoutCopyAwaitedToEof -or -not $receipt.stderrCopyAwaitedToEof -or
            -not $receipt.streamFilesClosed -or
            @($receipt.observedChildren | Where-Object { -not $_.observedIdentityWaitReturned }).Count -ne 0)
        {
            throw 'Source-root or observed-child custody is incomplete.'
        }

        foreach ($source in @('helper', 'support'))
        {
            $path = $receipt.launch.$source
            if ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -cne $receipt.launch.($source + 'Sha256'))
            {
                throw 'An executed source helper changed.'
            }
        }

        $rootGuard = [IO.File]::ReadAllText((Join-Path $directory.FullName 'guard.json')) | ConvertFrom-Json
        $policyHash = (Get-FileHash -LiteralPath (Join-Path $directory.FullName 'policy.raw.json') -Algorithm SHA256).Hash
        if ($policyHash -cne $rootGuard.policySha256 -or $rootGuard.actualOwner -cne $Owner -or
            $rootGuard.scope -cne $ExpectedScope -or $rootGuard.actualWorkerBuildHoldActive -cne $false -or
            $rootGuard.buildAndTestWorkQuiesced -cne $false)
        {
            throw 'Preserved per-root guard mismatch.'
        }

        [ordered]@{
            rootAttemptNumber = $receipt.rootAttemptNumber
            receipt = $receiptPath
            rootIdentity = $receipt.rootIdentity
            observer = $receipt.launch.observer
            exitCode = $receipt.exitCode
            rootWaitReturned = $true
            bothStreamsAwaitedToEof = $true
            stdoutBytes = $receipt.stdoutBytes
            stderrBytes = $receipt.stderrBytes
            observedChildren = @($receipt.observedChildren)
            observedChildLimit = $receipt.observedChildLimit
            observationErrors = @($receipt.observationErrors)
        }
    }
)
Write-FreshJson (Join-Path $Out 'ROLE-BINDINGS.json') @{
    verifiedUtc = [DateTime]::UtcNow.ToString('o')
    observer = Get-ProcessIdentity (Get-Process -Id $PID)
    roles = $roles
    conservativeCounts = $roleCounts
    wholeBlobBindings = $verifiedBindings
    bodyBindings = $verifiedBindings.Count
    crossRoleByteIdenticalFiles = $same
    normalizationUsedForMembership = $false
}
$allChildren = @($rootSummary | ForEach-Object { $_.observedChildren })
Write-FreshJson (Join-Path $Out 'SOURCE-TERMINAL-RECEIPTS.json') @{
    auditedUtc = [DateTime]::UtcNow.ToString('o')
    dataOnlyAuditObserver = Get-ProcessIdentity (Get-Process -Id $PID)
    directGitGhRoots = $rootSummary.Count
    rootLimit = 32
    wholeFilesPerRoleLimit = 15
    sourceRootObserverPids = @($rootSummary | ForEach-Object { $_.observer.pid } | Sort-Object -Unique)
    rootWaitsReturned = $rootSummary.Count
    redirectedOutputStreamsFullyAwaited = $rootSummary.Count * 2
    rawStdinStreamsRetained = $rootSummary.Count
    observedChildren = $allChildren.Count
    observedChildWaitsReturned = @($allChildren | Where-Object { $_.observedIdentityWaitReturned }).Count
    totalRawStdoutBytes = ($rootSummary | Measure-Object -Property stdoutBytes -Sum).Sum
    totalRawStderrBytes = ($rootSummary | Measure-Object -Property stderrBytes -Sum).Sum
    observationsAreNotUniversalDescendantAbsenceProof = $true
    roots = $rootSummary
    outerToolReceipts = 'control\outer-tool-receipts-through-005.json'
    noProspectiveAuditOuterExitClaim = $true
}
Write-Host ('AUDIT_OBSERVER_PID=' + $PID)
Write-Host ("AUDIT_COMPLETE=30 exact raw bindings;15whole files/role;9Git-gh roots;14byte-identical role files; observed child waits={0}/{1}; output EOF streams=18/18" -f @($allChildren | Where-Object { $_.observedIdentityWaitReturned }).Count, $allChildren.Count)
