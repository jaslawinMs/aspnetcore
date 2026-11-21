function Invoke-WholeBodyBatch([string]$Label, [string[]]$Paths)
{
    $tree = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'all-tree-metadata-015.json')) | ConvertFrom-Json -Depth 30
    $previous = @()
    foreach ($indexFile in [IO.Directory]::EnumerateFiles($PSScriptRoot, 'capture-index-*.json'))
    {
        $previous += @([IO.File]::ReadAllText($indexFile) | ConvertFrom-Json -Depth 30)
    }
    $selected = @()
    foreach ($role in @('Original','ObservedDefault'))
    {
        $ordinal = @($previous | Where-Object { $_.role -ceq $role }).Count
        if ($ordinal + $Paths.Count -gt 15) { throw 'Whole repository input ceiling would be exceeded before capture' }
        foreach ($sourcePath in $Paths)
        {
            if (@($previous | Where-Object { $_.role -ceq $role -and $_.path -ceq $sourcePath }).Count -gt 0) { throw 'Previously captured member would replay' }
            $match = @($tree | Where-Object { $_.role -ceq $role -and $_.path -ceq $sourcePath })
            if ($match.Count -ne 1 -or $match[0].type -cne 'blob') { throw ('Whole body not uniquely established by prior metadata: ' + $sourcePath) }
            $ordinal++
            $entry = $match[0]
            $selected += [ordered]@{ role = $role; inputOrdinal = $ordinal; commit = $entry.commit; path = $entry.path; spec = ($entry.commit + ':' + $entry.path); mode = $entry.mode; expectedBlob = $entry.blob; treeProvenanceRoot = $entry.provenanceRoot }
        }
    }
    Save-NewJson ('capture-selection-' + $Label + '.json') $selected
    $stdin = [Text.UTF8Encoding]::new($false).GetBytes((($selected | ForEach-Object { $_.spec }) -join "`n") + "`n")
    $raw = Invoke-SourceRoot $Label 'git' @('--no-pager','cat-file','--batch') $stdin
    $offset = 0
    $index = @()
    foreach ($member in $selected)
    {
        $headerStart = $offset
        while ($offset -lt $raw.Length -and $raw[$offset] -ne 10) { $offset++ }
        if ($offset -ge $raw.Length) { throw 'Truncated cat-file member header' }
        $header = [Text.Encoding]::ASCII.GetString($raw,$headerStart,$offset-$headerStart)
        if ($header -notmatch '^(?<oid>[0-9a-f]{40}) blob (?<size>[0-9]+)$') { throw ('Missing/non-blob cat-file member retained without replay: ' + $member.spec + ' / ' + $header) }
        $blobId = $Matches.oid
        $size = [int]$Matches.size
        $offset++
        $bodyStart = $offset
        if ($size -gt 50000000 -or $offset + $size -ge $raw.Length) { throw 'Truncated/oversized whole member' }
        $body = [byte[]]::new($size)
        [Array]::Copy($raw,$offset,$body,0,$size)
        $offset += $size
        if ($raw[$offset] -ne 10) { throw 'Missing cat-file member trailing framing LF' }
        $offset++
        $prefix = [Text.Encoding]::ASCII.GetBytes('blob ' + $size + [char]0)
        $gitInput = [byte[]]::new($prefix.Length + $body.Length)
        [Array]::Copy($prefix,0,$gitInput,0,$prefix.Length)
        [Array]::Copy($body,0,$gitInput,$prefix.Length,$body.Length)
        $computedBlob = [Convert]::ToHexString([Security.Cryptography.SHA1]::HashData($gitInput)).ToLowerInvariant()
        if ($blobId -cne $member.expectedBlob -or $computedBlob -cne $blobId) { throw 'Raw header/tree/recomputed Git blob ID mismatch' }
        $relative = 'bodies\' + $member.role + '\' + $member.path.Replace('/','\') + '.raw'
        Save-NewBytes $relative $body
        $index += [ordered]@{ role = $member.role; inputOrdinal = $member.inputOrdinal; commit = $member.commit; path = $member.path; commitPath = $member.spec; mode = $member.mode; blob = $blobId; recomputedBlob = $computedBlob; bytes = $size; sha256 = (Get-BytesSha256 $body); bodyFile = $relative; catFileRoot = $Label; stdoutFile = ($Label + '.stdout.bin'); headerStartOffset = $headerStart; headerBytesIncludingLF = $bodyStart - $headerStart; headerAscii = $header; bodyStartOffset = $bodyStart; trailingFramingLfOffset = $offset - 1; nextMemberOffset = $offset; treeProvenanceRoot = $member.treeProvenanceRoot; byteExactNoEolOrArchiveNormalization = $true }
    }
    if ($offset -ne $raw.Length) { throw 'Unconsumed cat-file batch stream suffix' }
    Save-NewJson ('capture-index-' + $Label + '.json') $index
    [Console]::WriteLine(([ordered]@{ batch = $Label; wholeBodies = $index.Count; inputsPerRole = @($index | Group-Object role | ForEach-Object { [ordered]@{ role = $_.Name; capturedThisBatch = $_.Count } }); fullStreamBytes = $raw.Length; allFramingConsumed = $true } | ConvertTo-Json -Compress -Depth 8))
}
