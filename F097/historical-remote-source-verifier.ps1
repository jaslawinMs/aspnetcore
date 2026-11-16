$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F097'
$source = (Get-Content -LiteralPath (Join-Path $run 'source-commit.txt') -Raw).Trim()
$repo = 'jaslawinMs/aspnetcore'
$raw = gh api "repos/$repo/compare/main...$source"
if ($LASTEXITCODE -ne 0)
{
    throw 'Actual independent fork source comparison unavailable.'
}
$comparison = ($raw -join "`n") | ConvertFrom-Json
$expected = @(
    @{path='src/Components/JSInterop/src/JSRuntime.cs';name='JSRuntime.cs';additions=54;deletions=8},
    @{path='src/Components/JSInterop/test/JSRuntimeTest.cs';name='JSRuntimeTest.cs';additions=132;deletions=0}
)
if ($comparison.merge_base_commit.sha -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
    $comparison.commits.Count -ne 1 -or $comparison.commits[0].sha -cne $source -or $comparison.files.Count -ne 2)
{
    throw 'Actual fork source is not the one-commit, two-file independent measured proposal.'
}
$rows = @(
    foreach ($entry in $expected)
    {
        $file = @($comparison.files | Where-Object filename -CEQ $entry.path)
        if ($file.Count -ne 1 -or $file[0].additions -ne $entry.additions -or $file[0].deletions -ne $entry.deletions)
        {
            throw 'Actual committed source scope differs from the reviewed surgical seam.'
        }
        $raw = gh api "repos/$repo/contents/$($entry.path)?ref=$source"
        if ($LASTEXITCODE -ne 0)
        {
            throw 'Actual committed source blob unavailable.'
        }
        $remote = ($raw -join "`n") | ConvertFrom-Json
        $bytes = [Convert]::FromBase64String($remote.content)
        $measured = Join-Path $run "source-after\$($entry.name)"
        $canonical = [Text.Encoding]::UTF8.GetBytes([IO.File]::ReadAllText($measured).Replace("`r`n","`n"))
        if (-not [System.Linq.Enumerable]::SequenceEqual([byte[]]$bytes,[byte[]]$canonical) -or $remote.sha -cne $file[0].sha)
        {
            throw 'Actual committed canonical bytes differ substantively from the source/PDB-verified measured files.'
        }
        $destination = Join-Path $run "committed-canonical-$($entry.name)"
        [IO.File]::WriteAllBytes($destination,$bytes)
        [ordered]@{
            path=$entry.path; sourceCommit=$source; remoteGitBlob=$remote.sha; additions=$entry.additions; deletions=$entry.deletions
            measuredSource="source-after\$($entry.name)"
            measuredSourceSha256=(Get-FileHash -LiteralPath $measured).Hash
            canonicalSource="committed-canonical-$($entry.name)"
            canonicalSourceSha256=(Get-FileHash -LiteralPath $destination).Hash
            substantiveBytesIdentical=$true; onlyPossibleGitCrLfToLfCanonicalization=$true
        }
    }
)
$comparison | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $run 'committed-source-comparison.json')
$rows | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $run 'committed-source-identities.json')
$ref = gh api 'repos/jaslawinMs/aspnetcore/git/ref/heads/autoperf/F097-js-runtime-default-timeouts'
if ($LASTEXITCODE -ne 0 -or (($ref -join "`n") | ConvertFrom-Json).object.sha -cne $source)
{
    throw 'Actual authorized source branch ref differs from verified source commit.'
}
[ordered]@{candidate='F097';sourceCommit=$source;files=2;additions=186;deletions=8;independentBaseline=$comparison.merge_base_commit.sha;
    exactRemoteSourceRefVerified=$true;onlyGitCrLfCanonicalizationDiffers=$true;recordedMeasuredAssemblyBaseRevision='37e809ead5824bc753a1c3d56f11615bdb1296c5';
    note='Measured owner was compiled from source/PDB-verified working edits on the baseline. Final source commit byte/canonical association is verified; assembly informational metadata is not falsely relabeled with the later commit.'} |
    ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $run 'source-branch-verification.json')
Write-Output "F097:actual fork$source, runtime54/8 and tests132/0; exact canonical source association verified."
