$ErrorActionPreference = 'Stop'
$phasePath286 = $PSCommandPath
. (Join-Path $PSScriptRoot 'source-support-286.ps1')
$discoveryPath = Join-Path $Out286 'DISCOVERY-286-001.json'
$discovery = [IO.File]::ReadAllText($discoveryPath) | ConvertFrom-Json
$path = $discovery.uniqueActualNewPath
if ($discovery.commit -cne 'd3483989953ae3cccd773aea5ea04cb0c7198531' -or
    $discovery.exactLiteral -cne 'class UserManagerSpecificationTestBase' -or
    $discovery.rawFilenames.Count -ne 1 -or
    $path -cne 'src/Identity/Specification.Tests/src/UserManagerSpecificationTests.cs')
{
    throw 'Only the single actually discovered factory-class filename may be requested.'
}
$selections = @(
    @{ role = 'Original'; commit = '37e809ead5824bc753a1c3d56f11615bdb1296c5'; path = $path },
    @{ role = 'Default'; commit = 'd3483989953ae3cccd773aea5ea04cb0c7198531'; path = $path }
)
$requests = @($selections | ForEach-Object { $_.commit + ':' + $_.path })
$stdinBytes = [Text.UTF8Encoding]::new($false).GetBytes(($requests -join "`n") + "`n")
Write-FreshJson286 (Join-Path $Out286 'RAW-BATCH-PLAN-286-002.json') ([ordered]@{
    discovery = @{ path = $discoveryPath; sha256 = (Get-FileHash -LiteralPath $discoveryPath -Algorithm SHA256).Hash }
    selections = $selections
    requests = $requests
    oldRequestedPathsPerRole = 18
    oldCompleteBodiesPerRole = 17
    newRequestedPathsPerRole = 1
    maxNewCompleteBodiesPerRole = 1
    cumulativeRequestedPathsPerRole = 19
    cumulativeMaxCompleteBodiesPerRole = 18
    aggregateRootAttempt = 12
    newSourceRootBudgetClosedAfterThisAttempt = $true
    missingMemberRequiresStop = $true
    originalMeaning = 'Existing pinned Original; no source checkout.'
    defaultMeaning = 'Existing observed268Default; no fresh upstream/default-branch observation.'
})
$result = Invoke-ReadOnlyGit286 12 @('cat-file', '--batch') $stdinBytes $phasePath286 'GO286 sole two-member raw whole-blob factory-class batch, same discovered path in both pinned roles; final allowed source root'
if ($result.receipt.exitCode -ne 0)
{
    throw 'Final allowed source root failed; no retry or replacement.'
}
$raw = $result.stdoutBytes
$offset = 0
$ordinal = 0
$responses = @(
    foreach ($selection in $selections)
    {
        $request = $selection.commit + ':' + $selection.path
        $headerOffset = $offset
        $newline = [Array]::IndexOf($raw, [byte]10, $offset)
        if ($newline -lt $offset)
        {
            throw 'Retained raw batch has no complete next header LF.'
        }
        $header = [Text.Encoding]::ASCII.GetString($raw, $offset, $newline - $offset)
        $offset = $newline + 1
        if ($header -ceq ($request + ' missing'))
        {
            [ordered]@{
                requestOrdinal = $ordinal
                role = $selection.role
                commit = $selection.commit
                path = $selection.path
                commitPath = $request
                status = 'missing'
                headerOffset = $headerOffset
                headerAscii = $header
                nextResponseOffset = $offset
                rawStdout = Join-Path $result.root 'stdout.bin'
                rawStdoutSha256 = Get-BytesHash286 $raw
                absenceBoundary = 'This exact request returned missing; not a type/class absence proof. No alternate spelling/path is authorized.'
            }
            $ordinal++
            continue
        }
        if ($header -notmatch '^([0-9a-f]{40}) blob ([0-9]+)$')
        {
            throw "Unsupported final raw-member header preserved: $header"
        }
        $blobId = $Matches[1]
        $size = [int]$Matches[2]
        $bodyOffset = $offset
        if ($offset + $size -ge $raw.Length -or $raw[$offset + $size] -ne 10)
        {
            throw 'Raw body size/trailing LF framing mismatch.'
        }
        $body = [byte[]]::new($size)
        [Array]::Copy($raw, $offset, $body, 0, $size)
        $objectHeader = [Text.Encoding]::ASCII.GetBytes("blob $size$([char]0)")
        $objectBytes = [byte[]]::new($objectHeader.Length + $body.Length)
        [Array]::Copy($objectHeader, 0, $objectBytes, 0, $objectHeader.Length)
        [Array]::Copy($body, 0, $objectBytes, $objectHeader.Length, $body.Length)
        $sha1 = [Security.Cryptography.SHA1]::Create()
        try
        {
            $recomputedId = [BitConverter]::ToString($sha1.ComputeHash($objectBytes)).Replace('-', '').ToLowerInvariant()
        }
        finally
        {
            $sha1.Dispose()
        }
        if ($recomputedId -cne $blobId)
        {
            throw 'Raw Git blob object ID mismatch.'
        }
        $captureDirectory = Join-Path (Join-Path $Out286 'blobs') $selection.role
        $null = [IO.Directory]::CreateDirectory($captureDirectory)
        $capture = Join-Path $captureDirectory ($selection.path.Replace('/', '__') + '.raw.txt')
        Write-FreshBytes286 $capture $body
        $offset += $size + 1
        [ordered]@{
            requestOrdinal = $ordinal
            role = $selection.role
            commit = $selection.commit
            path = $selection.path
            commitPath = $request
            status = 'complete'
            objectType = 'blob'
            blobId = $blobId
            recomputedGitObjectId = $recomputedId
            bytes = $size
            sha256 = Get-BytesHash286 $body
            capture = $capture
            headerOffset = $headerOffset
            headerAscii = $header
            bodyOffset = $bodyOffset
            trailingFramingLfOffset = $offset - 1
            nextResponseOffset = $offset
            rawStdout = Join-Path $result.root 'stdout.bin'
            rawStdoutSha256 = Get-BytesHash286 $raw
            textNormalizationPerformed = $false
            requestMemberAssociation = 'Exact retained commit:path request and corresponding raw cat-file member, not independent commit/tree-chain expansion.'
        }
        $ordinal++
    }
)
if ($offset -ne $raw.Length -or $responses.Count -ne 2)
{
    throw 'Final batch has extra/incomplete framing.'
}
$complete = @($responses | Where-Object { $_.status -ceq 'complete' })
$missing = @($responses | Where-Object { $_.status -ceq 'missing' })
Write-FreshJson286 (Join-Path $Out286 'BINDINGS-286-002.json') ([ordered]@{
    decodedUtc = [DateTime]::UtcNow.ToString('o')
    responses = $responses
    completeWholeBodies = $complete.Count
    exactMissingResponses = $missing.Count
    completeRawFramingConsumed = $true
    rawStdoutBytes = $raw.Length
    cumulativeRequestedPathsPerRole = 19
    cumulativeCompleteBodies = 34 + $complete.Count
    cumulativeCompleteBodiesPerRole = @(
        foreach ($role in @('Original', 'Default'))
        {
            @{ role = $role; count = 17 + @($complete | Where-Object { $_.role -ceq $role }).Count }
        }
    )
    newGitGhRootsConsumed = 2
    aggregateGitGhRootsConsumed = 12
    noFurtherSourceDiscoveryOrBodiesAuthorized = $true
})
foreach ($binding in $complete)
{
    Write-Host ("BLOB286 {0} {1} {2} {3}bytes SHA256={4}" -f $binding.role, $binding.commit, $binding.path, $binding.bytes, $binding.sha256)
}
Write-Host ("BATCH286_COMPLETE_BODIES={0};MISSING={1};AGGREGATE_BODIES={2};ROOTS=2new/12aggregate;SOURCE_BUDGET_CLOSED" -f $complete.Count, $missing.Count, (34 + $complete.Count))
if ($missing.Count -ne 0)
{
    throw 'Final approved member missing; preserve and stop with factory gap, no alternative source.'
}
