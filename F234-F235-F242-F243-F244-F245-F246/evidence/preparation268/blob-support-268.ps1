function Invoke-WholeBlobBatch([string] $BatchId, $Selections)
{
    $priorPlans = @(
        Get-ChildItem -LiteralPath $Out -File -Filter 'batch-plan-*.json' | ForEach-Object {
            ([IO.File]::ReadAllText($_.FullName) | ConvertFrom-Json).selections
        }
    )
    $budget = @(
        foreach ($role in @('Original', 'Default'))
        {
            $paths = @(@($priorPlans) + @($Selections) | Where-Object { $_.role -eq $role } | ForEach-Object { $_.path } | Sort-Object -Unique)
            if ($paths.Count -gt 15)
            {
                throw "Whole logical source-file budget would exceed15 for $role."
            }

            @{ role = $role; wholeLogicalFiles = $paths.Count; paths = $paths }
        }
    )
    Write-FreshJson (Join-Path $Out ("batch-plan-$BatchId.json")) @{
        selections = @($Selections)
        cumulativeConservativeBudget = $budget
        canonicalGitObjectPathsAreNotOperatingSystemPaths = $true
        exactByteProtocol = 'UTF8 no-BOM commit:path LF requests; git cat-file --batch raw binary output, SHA1/type/size/framing validated; body copied without text roundtrip.'
    }
    $requests = @($Selections | ForEach-Object { $_.commit + ':' + $_.path })
    $stdin = [Text.UTF8Encoding]::new($false).GetBytes(($requests -join "`n") + "`n")
    $batch = Invoke-GitSource ("Whole immutable raw Git blob batch $BatchId") @('cat-file', '--batch') $stdin
    $raw = $batch.bytes
    $offset = 0
    $bindings = @(
        foreach ($selection in $Selections)
        {
            $headerOffset = $offset
            $newline = [Array]::IndexOf($raw, [byte]10, $offset)
            if ($newline -lt $offset)
            {
                throw 'Missing cat-file header LF.'
            }

            $header = [Text.Encoding]::ASCII.GetString($raw, $offset, $newline - $offset)
            if ($header -notmatch '^([0-9a-f]{40}) blob ([0-9]+)$')
            {
                throw "Preserved unsupported/missing cat-file member: $header"
            }

            $blobId = $Matches[1]
            $size = [int]$Matches[2]
            $offset = $newline + 1
            $bodyOffset = $offset
            if ($offset + $size -ge $raw.Length -or $raw[$offset + $size] -ne 10)
            {
                throw 'Invalid cat-file binary body size/trailing LF.'
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
                throw 'Git binary object ID mismatch.'
            }

            $captureDir = Join-Path (Join-Path $Out 'blobs') $selection.role
            $null = [IO.Directory]::CreateDirectory($captureDir)
            $captureName = $BatchId + '-' + ($selection.path.Replace('/', '__')) + '.raw.txt'
            $capture = Join-Path $captureDir $captureName
            if (Test-Path -LiteralPath $capture)
            {
                throw 'Immutable source capture already exists.'
            }

            [IO.File]::WriteAllBytes($capture, $body)
            $offset += $size + 1
            [ordered]@{
                role = $selection.role
                commit = $selection.commit
                path = $selection.path
                commitPath = $selection.commit + ':' + $selection.path
                objectType = 'blob'
                blobId = $blobId
                recomputedGitObjectId = $recomputedId
                bytes = $size
                sha256 = Get-BytesHash $body
                capture = $capture
                exactRawGitMembership = $true
                textNormalizationPerformed = $false
                batchRoot = $batch.directory
                batchRawStdout = Join-Path $batch.directory 'stdout.bin'
                batchRawStdoutSha256 = $batch.receipt.stdoutSha256
                requestOrdinal = [Array]::IndexOf($requests, ($selection.commit + ':' + $selection.path))
                headerOffset = $headerOffset
                headerAscii = $header
                bodyOffset = $bodyOffset
                trailingFramingLfOffset = $offset - 1
            }
        }
    )
    if ($offset -ne $raw.Length)
    {
        throw 'Unexpected bytes after last cat-file member.'
    }

    Write-FreshJson (Join-Path $Out ("bindings-$BatchId.json")) @{
        bindings = $bindings
        rawStreamBytes = $raw.Length
        completeFramingConsumed = $true
        cumulativeConservativeBudget = $budget
    }
    foreach ($binding in $bindings)
    {
        Write-Host ("BLOB {0} {1} {2} {3}bytes {4}" -f $binding.role, $binding.commit, $binding.path, $binding.bytes, $binding.sha256)
    }
}
