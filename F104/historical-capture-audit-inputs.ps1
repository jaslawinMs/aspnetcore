$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F104'
$prior = Join-Path $PSScriptRoot 'autoperf-published-results\F103'
$receipt = Join-Path $run 'bdn-pinned-public-source.json'
if (Test-Path -LiteralPath $receipt)
{
    throw 'F104 audit-input capture is already complete;verify rather than overwrite.'
}
foreach ($variant in 'original','candidate-1','candidate-2','candidate-3')
{
    $closure = Get-Content (Join-Path $run "execution-closure-$variant.json") -Raw | ConvertFrom-Json
    foreach ($name in 'AutoPerf.Benchmarks.runtimeconfig.json','AutoPerf.Benchmarks.deps.json')
    {
        $source = Join-Path $run "binaries\$variant\$name"
        $expected = @($closure.files | Where-Object file -CEQ $name)
        if ($expected.Count -ne 1 -or (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash -cne $expected[0].sha256)
        {
            throw "Actual frozen execution metadata changed:$variant/$name"
        }
        $target = Join-Path $run "execution-image-metadata\$variant\$name"
        if (Test-Path -LiteralPath $target) { throw "Unexpected audit metadata already exists:$target" }
        New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
        Copy-Item -LiteralPath $source -Destination $target
        if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -cne $expected[0].sha256)
        {
            throw "Exact metadata copy changed:$variant/$name"
        }
    }
}
$provenance = Get-Content (Join-Path $prior 'authoritative-copy-manifest.json') -Raw | ConvertFrom-Json
$copied = @(foreach ($name in 'bdn-0.13.0-GcStats.cs','bdn-0.13.0-RunResults.cs','bdn-gc-source-tag.json','public-bdn-runresults-receipt.json')
{
    $source = Join-Path $prior $name
    $expected = @($provenance | Where-Object destination -CEQ $name)
    if ($expected.Count -ne 1 -or (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash -cne $expected[0].sha256)
    {
        throw "Previously published pinned public-source copy changed:$name"
    }
    $target = Join-Path $run $name
    if (Test-Path -LiteralPath $target) { throw "Unexpected public-source copy already exists:$name" }
    Copy-Item -LiteralPath $source -Destination $target
    $sha = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
    if ($sha -cne $expected[0].sha256) { throw "Exact pinned public-source copy changed:$name" }
    [pscustomobject]@{file=$name;sha256=$sha;bytes=(Get-Item -LiteralPath $target).Length}
})
$tag = Get-Content (Join-Path $run 'bdn-gc-source-tag.json') -Raw | ConvertFrom-Json
$original = Get-Content (Join-Path $run 'execution-closure-original.json') -Raw | ConvertFrom-Json
[ordered]@{
    candidate='F104';revision=$tag.object.sha
    benchmarkDotNetAssemblySha256=($original.files | Where-Object file -CEQ 'BenchmarkDotNet.dll').sha256
    reusedExactPreviouslyPublishedPublicSourceFrom='F103'
    freshNetworkRetrievalClaimed=$false
    files=$copied
    note='Exact tagged BenchmarkDotNet0.13.0 public sources/receipts reused after checking the prior authoritative SHA256 mappings. They explain engine overhead/GC arithmetic,not rehash omitted binary or runtime-pack bytes.'
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $receipt -Encoding utf8
Write-Output 'F104 copied exact frozen runtime/dependency metadata for4 images and verified pinned public BDN sources.'
