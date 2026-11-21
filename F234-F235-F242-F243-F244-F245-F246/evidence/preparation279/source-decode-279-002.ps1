$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'control-support-279.ps1')
$guard = Get-FreshGuard279 'Data-only decode of already completed root010; no native/Git source retry'
[IO.File]::WriteAllBytes((Join-Path $Out 'control\decode-002-policy.raw.json'), $guard.policyBytes)
[IO.File]::WriteAllBytes((Join-Path $Out 'control\decode-002-registration.raw.json'), $guard.registrationBytes)
Write-FreshJson279 (Join-Path $Out 'control\decode-002-guard.json') $guard.receipt
$root = Join-Path $Out 'roots\root-010'
$receipt = [IO.File]::ReadAllText((Join-Path $root 'receipt.json')) | ConvertFrom-Json
$plan = [IO.File]::ReadAllText((Join-Path $Out 'BATCH-PLAN-279.json')) | ConvertFrom-Json
$raw = [IO.File]::ReadAllBytes((Join-Path $root 'stdout.bin'))
$stdin = [IO.File]::ReadAllBytes((Join-Path $root 'stdin.bin'))
$expectedRequests = @($plan.selections | ForEach-Object { $_.commit + ':' + $_.path })
$expectedStdin = [Text.UTF8Encoding]::new($false).GetBytes(($expectedRequests -join "`n") + "`n")
if ((Get-BytesHash279 $raw) -cne $receipt.stdoutSha256 -or
    (Get-BytesHash279 $stdin) -cne $receipt.launch.stdinSha256 -or
    (Get-BytesHash279 $stdin) -cne (Get-BytesHash279 $expectedStdin) -or
    $receipt.exitCode -ne 0 -or -not $receipt.explicitRootWaitReturned -or
    -not $receipt.stdoutCopyAwaitedToEof -or -not $receipt.stderrCopyAwaitedToEof)
{
    throw 'Retained request/stream/custody inputs do not match.'
}
foreach ($kind in @('helper', 'support'))
{
    if ((Get-FileHash -LiteralPath $receipt.launch.$kind -Algorithm SHA256).Hash -cne $receipt.launch.($kind + 'Sha256'))
    {
        throw 'A completed source helper changed.'
    }
}
$offset = 0
$responses = @(
    for ($ordinal = 0; $ordinal -lt $plan.selections.Count; $ordinal++)
    {
        $selection = $plan.selections[$ordinal]
        $request = $expectedRequests[$ordinal]
        $headerOffset = $offset
        $newline = [Array]::IndexOf($raw, [byte]10, $offset)
        if ($newline -lt $offset)
        {
            throw 'Retained stream has no next member header LF.'
        }
        $header = [Text.Encoding]::ASCII.GetString($raw, $offset, $newline - $offset)
        $offset = $newline + 1
        if ($header -ceq ($request + ' missing'))
        {
            [ordered]@{
                role = $selection.role
                commit = $selection.commit
                path = $selection.path
                commitPath = $request
                requestOrdinal = $ordinal
                response = 'missing'
                headerOffset = $headerOffset
                headerAscii = $header
                nextResponseOffset = $offset
                rawStdout = Join-Path $root 'stdout.bin'
                rawStdoutSha256 = $receipt.stdoutSha256
                interpretation = 'Exact requested commit:path received a Git missing response; no substitute source, independent tree-chain absence proof or class/type absence inference.'
            }
            continue
        }
        if ($header -notmatch '^([0-9a-f]{40}) blob ([0-9]+)$')
        {
            throw "Unexpected retained Git response: $header"
        }
        $blobId = $Matches[1]
        $size = [int]$Matches[2]
        $bodyOffset = $offset
        if ($offset + $size -ge $raw.Length -or $raw[$offset + $size] -ne 10)
        {
            throw 'Invalid retained binary member size/trailing LF.'
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
            throw 'Retained binary Git object ID mismatch.'
        }
        $captureDirectory = Join-Path (Join-Path $Out 'blobs') $selection.role
        $null = [IO.Directory]::CreateDirectory($captureDirectory)
        $capture = Join-Path $captureDirectory ($selection.path.Replace('/', '__') + '.raw.txt')
        if (Test-Path -LiteralPath $capture)
        {
            throw 'Decoded capture must be fresh; no overwrite.'
        }
        [IO.File]::WriteAllBytes($capture, $body)
        $offset += $size + 1
        [ordered]@{
            role = $selection.role
            commit = $selection.commit
            path = $selection.path
            commitPath = $request
            response = 'blob'
            objectType = 'blob'
            blobId = $blobId
            recomputedGitObjectId = $recomputedId
            bytes = $size
            sha256 = Get-BytesHash279 $body
            capture = $capture
            sourceRequestAssociation = 'Exact retained commit:path request and corresponding raw Git batch member; no independent raw commit/tree-chain expansion.'
            textNormalizationPerformed = $false
            rawStdout = Join-Path $root 'stdout.bin'
            rawStdoutSha256 = $receipt.stdoutSha256
            requestOrdinal = $ordinal
            headerOffset = $headerOffset
            headerAscii = $header
            bodyOffset = $bodyOffset
            trailingFramingLfOffset = $offset - 1
            nextResponseOffset = $offset
        }
    }
)
$bindings = @($responses | Where-Object { $_.response -eq 'blob' })
$missing = @($responses | Where-Object { $_.response -eq 'missing' })
if ($offset -ne $raw.Length -or $responses.Count -ne 6 -or $bindings.Count -ne 4 -or $missing.Count -ne 2)
{
    throw 'Unexpected retained response inventory; no source retry.'
}
Write-FreshJson279 (Join-Path $Out 'BINDINGS-279-002.json') @{
    decodedUtc = [DateTime]::UtcNow.ToString('o')
    dataOnlyDecoderObserver = Get-ProcessIdentity279 (Get-Process -Id $PID)
    responses = $responses
    bindings = $bindings
    missing = $missing
    completeFramingConsumed = $true
    rawStdoutBytes = $raw.Length
    newWholeSourcePathRequestsPerRole = 3
    completeNewWholeBodiesPerRole = 2
    cumulativeWholePathRequestsPerRole = 18
    cumulativeCompleteWholeBodiesPerRole = 17
    newGitGhRoots = 1
    aggregateGitGhRoots = 10
    sourceRootAndBodySelectionBudgetClosed = $true
    failedCaptureHelperPreserved = 'source-capture-279-001.ps1'
    noNativeSourceRetryOrNewBodyRequestPerformed = $true
}
foreach ($response in $responses)
{
    if ($response.response -eq 'blob')
    {
        Write-Host ("BLOB {0} {1} {2} {3}bytes SHA256={4}" -f $response.role, $response.commit, $response.path, $response.bytes, $response.sha256)
    }
    else
    {
        Write-Host ('MISSING ' + $response.commitPath)
    }
}
Write-Host ('DECODE_OBSERVER_PID=' + $PID)
Write-Host 'DECODE_COMPLETE=4whole raw bodies;2exact missing responses;0new source roots;1/1approved Git root consumed;no retry/broadening'
