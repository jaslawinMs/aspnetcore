$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F011'
$destination = Join-Path $run 'investigation\bdn-memory-accounting'
if (Test-Path $destination)
{
    throw 'Preserve actual memory-accounting attribution.'
}
$prior = Join-Path $PSScriptRoot 'autoperf-runs\F008\investigation\bdn-memory-accounting'
$previous = Get-Content (Join-Path $prior 'provenance.json') -Raw | ConvertFrom-Json
$manifest = Get-Content (Join-Path $run 'manifest-original.json') -Raw | ConvertFrom-Json
$actual = (Get-FileHash (Join-Path $run 'images\original\BenchmarkDotNet.dll')).Hash
if ($actual -cne $manifest.benchmarkDotNetSha256 -or $actual -cne $previous.currentMeasuredBdnDllSha256 -or
    (Get-FileHash (Join-Path $prior 'GcStats.cs')).Hash -cne $previous.source_sha256)
{
    throw 'Only an explicitly attributed identical measured BDN binary/source observation may be reused.'
}
New-Item $destination -ItemType Directory -Force | Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
Copy-Item (Join-Path $prior 'GcStats.cs') (Join-Path $destination 'GcStats.cs')
Copy-Item (Join-Path $prior 'provenance.json') (Join-Path $destination 'borrowed-F008-provenance.json')
foreach ($name in 'borrowed-F007-provenance.json', 'borrowed-F006-provenance.json')
{
    Copy-Item (Join-Path $prior $name) (Join-Path $destination $name)
}
[ordered]@{
    candidate = 'F011'; source_url = $previous.source_url; source_sha256 = $previous.source_sha256
    explicitlyBorrowedFrom = 'F008; earlier F007/F006/F002 upstream capture chain retained.'
    currentMeasuredBdnDllSha256 = $actual; actualMeasuredImageRehashed = $true
    newSourceFetchOrDelegateInstrumentation = $false
    observation = 'Pinned net12 supplies GC.GetTotalAllocatedBytes; the attributed BDN0.13 source uses reflected process-wide precise=true accounting when available. Raw GC bytes/op use midpoint-to-even rounding.'
    limitation = 'An attributed prior source observation plus identical DLL hash, not independent source-to-binary binding or direct delegate instrumentation. Includes serialization, native owner, bounded transport counters and other process activity; not isolated membership allocation.'
} | ConvertTo-Json | Set-Content (Join-Path $destination 'provenance.json')
Write-Output 'F011 memory-accounting attribution captured; identical measured BDN DLL, no new upstream fetch or isolated-allocation claim.'
