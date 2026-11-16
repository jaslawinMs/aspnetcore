$ErrorActionPreference='Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F105'
$prior = Join-Path $PSScriptRoot 'autoperf-published-results\F104'
if (Test-Path (Join-Path $run 'bdn-pinned-public-source.json')) { throw 'F105 pinned public source record exists;retain it.' }
$pin = Get-Content (Join-Path $prior 'bdn-pinned-public-source.json') -Raw | ConvertFrom-Json
$bdn = Join-Path $run 'binaries\original\BenchmarkDotNet.dll'
if ((Get-FileHash $bdn).Hash -cne $pin.benchmarkDotNetAssemblySha256)
{
    throw 'The previously verified public sources do not describe this executing BDN image.'
}
foreach ($file in $pin.files)
{
    $source = Join-Path $prior $file.file
    if ((Get-FileHash $source).Hash -cne $file.sha256 -or (Get-Item $source).Length -ne $file.bytes)
    {
        throw 'Prior authoritative public BDN source/receipt bytes changed.'
    }
    Copy-Item -LiteralPath $source -Destination (Join-Path $run $file.file)
}
[ordered]@{
    candidate='F105';revision=$pin.revision;benchmarkDotNetAssemblySha256=$pin.benchmarkDotNetAssemblySha256
    reusedExactPreviouslyPublishedPublicSourceFrom='F104'
    verifiedPriorImmutableCommit=(Get-Content (Join-Path $PSScriptRoot 'F104-results-commit.txt') -Raw).Trim()
    freshNetworkRetrievalClaimed=$false;files=$pin.files
    note='Exact tagged BenchmarkDotNet0.13.0 public sources/receipts reused byte-for-byte from verified F104. Overhead/GC arithmetic explanation,not a public rehash of omitted binaries/runtime-pack bytes.'
} | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $run 'bdn-pinned-public-source.json') -Encoding utf8
Write-Output 'F105 reused exact verified tagged BDN0.13 public GC/RunResults source bytes and receipts;no fresh retrieval claimed.'
