param([Parameter(Mandatory)][string]$Source)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
if (-not $Source.StartsWith('src\') -or $Source.Contains('..')) { throw 'A resolved in-repository source is required.' }
$run = Join-Path $PSScriptRoot 'autoperf-runs\F104'
$label = [IO.Path]::GetFileNameWithoutExtension($Source)
$proof = Join-Path $run "metadata-$label-source-proof.json"
if (Test-Path $proof) { throw 'Supplemental source proof exists;retain it.' }
$current = (Get-Content (Join-Path $run 'current-source-investigation.json') -Raw | ConvertFrom-Json).currentDefaultRevision
$gitPath = $Source.Replace('\','/')
$arguments = @('api',"repos/dotnet/aspnetcore/contents/$gitPath`?ref=$current")
$text = gh @arguments
if ($LASTEXITCODE) { throw "Actual current-default source unavailable: $Source" }
$remote = $text | ConvertFrom-Json
$canonical = [Convert]::FromBase64String(($remote.content -replace '\s',''))
$header = [Text.Encoding]::ASCII.GetBytes("blob $($canonical.Length)`0")
$buffer = [byte[]]::new($header.Length + $canonical.Length)
[Array]::Copy($header,0,$buffer,0,$header.Length)
[Array]::Copy($canonical,0,$buffer,$header.Length,$canonical.Length)
$canonicalGitBlob = [Convert]::ToHexString([Security.Cryptography.SHA1]::HashData($buffer)).ToLowerInvariant()
$baseline = git rev-parse "37e809ead5824bc753a1c3d56f11615bdb1296c5:$gitPath"
if ($LASTEXITCODE) { throw 'Actual baseline source identity unavailable.' }
$working = git hash-object -- $Source
if ($LASTEXITCODE -or $working -cne $baseline -or $remote.sha -cne $baseline -or $canonicalGitBlob -cne $baseline)
{
    throw "Current-default/canonical-remote/baseline/working source identity differs: $Source"
}
$rawCopy = Join-Path $run "metadata-source\$Source"
$canonicalCopy = Join-Path $run "metadata-current-default-canonical\$Source"
New-Item -ItemType Directory -Path (Split-Path $rawCopy -Parent) -Force | Out-Null
New-Item -ItemType Directory -Path (Split-Path $canonicalCopy -Parent) -Force | Out-Null
Copy-Item -LiteralPath $Source -Destination $rawCopy
[IO.File]::WriteAllBytes($canonicalCopy,$canonical)
[ordered]@{
    candidate='F104';path=$Source;currentDefaultRevision=$current
    currentDefaultGitBlob=$remote.sha;baselineGitBlob=$baseline;workingGitBlob=$working
    canonicalRemoteGitBlob=$canonicalGitBlob;canonicalRemoteBytesVerified=$true
    rawSha256=(Get-FileHash $rawCopy).Hash;rawBytes=(Get-Item $rawCopy).Length
    canonicalRemoteSha256=(Get-FileHash $canonicalCopy).Hash;canonicalRemoteBytes=$canonical.Length
    rawSnapshot="metadata-source\$Source";canonicalRemoteSnapshot="metadata-current-default-canonical\$Source"
    retrievalArguments=$arguments;retrievalExitCode=0;additionalToPrimary20SourceIdentities=$true
    canonicalGitCleanFilterSeparateFromRawSourceBytes=$true
} | ConvertTo-Json -Depth 6 | Set-Content $proof -Encoding utf8
Write-Output "F104 actual supplemental source identity verified:$label"
