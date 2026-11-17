$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F012'
$prior = Join-Path $PSScriptRoot 'autoperf-runs\F011\investigation\bdn-memory-accounting'
$destination = Join-Path $run 'investigation\bdn-memory-accounting'
if (Test-Path $destination)
{
    throw 'Preserve actual attribution.'
}
$previous = Get-Content (Join-Path $prior 'provenance.json') -Raw | ConvertFrom-Json
$manifest = Get-Content (Join-Path $run 'manifest-original.json') -Raw | ConvertFrom-Json
$actual = (Get-FileHash (Join-Path $run 'images\original\BenchmarkDotNet.dll')).Hash
if ($actual -cne $manifest.benchmarkDotNetSha256 -or $actual -cne $previous.currentMeasuredBdnDllSha256 -or
    (Get-FileHash (Join-Path $prior 'GcStats.cs')).Hash -cne $previous.source_sha256)
{
    throw 'Only the actual identical BDN DLL and attributed source observation may be reused.'
}
New-Item $destination -ItemType Directory -Force | Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
Copy-Item (Join-Path $prior 'GcStats.cs') (Join-Path $destination 'GcStats.cs')
Copy-Item (Join-Path $prior 'provenance.json') (Join-Path $destination 'borrowed-F011-provenance.json')
Get-ChildItem $prior -Filter 'borrowed-*.json' -File | Copy-Item -Destination $destination
[ordered]@{
    candidate = 'F012'; source_url = $previous.source_url; source_sha256 = $previous.source_sha256
    explicitlyBorrowedFrom = 'F011/F008/F007/F006/F002 attributed source capture chain, retained exactly.'
    currentMeasuredBdnDllSha256 = $actual; actualMeasuredImageRehashed = $true
    newSourceFetchOrDelegateInstrumentation = $false
    observation = 'Pinned net12 supplies GC.GetTotalAllocatedBytes; attributed BDN0.13 source uses reflected process-wide precise=true accounting when available. Raw GC bytes/op use midpoint-to-even rounding.'
    limitation = 'Attributed prior source observation plus identical DLL hash, not independent source-to-binary binding or direct delegate instrumentation. Includes native broadcast, actual serialization, bounded transport counters and other process activity; not isolated membership/transport/enumerator allocation.'
} | ConvertTo-Json | Set-Content (Join-Path $destination 'provenance.json')
Write-Output 'F012 process-wide memory-accounting attribution retained through identical measured BDN binary; no isolated-allocation claim.'
