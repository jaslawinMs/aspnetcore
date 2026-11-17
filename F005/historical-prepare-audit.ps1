$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F005'
$destination=Join-Path $run 'investigation\bdn-memory-accounting'
if(Test-Path $destination){throw 'Refusing to overwrite an actual provenance capture.'}
New-Item $destination -ItemType Directory -Force|Out-Null
$borrowed=Join-Path $PSScriptRoot 'autoperf-runs\F002\investigation\bdn-memory-accounting'
Copy-Item (Join-Path $borrowed 'GcStats.cs'),(Join-Path $borrowed 'provenance.json') $destination
Rename-Item (Join-Path $destination 'provenance.json') 'borrowed-F002-provenance.json'
$expected='4560EE1128636D3913C3FA71B8419DD2317FB97FD331231A53AD5501D5BA5437'
foreach($variant in 'original','candidate-1','current-default-class','original-small-controls','candidate-1-small-controls')
{
    if((Get-FileHash (Join-Path $run "binaries\$variant\BenchmarkDotNet.dll")).Hash-cne$expected){throw 'Actual measured DLL differs from explicitly borrowed source observation.'}
}
[ordered]@{candidate='F005';source_url='https://github.com/dotnet/BenchmarkDotNet/blob/v0.13.0/src/BenchmarkDotNet/Engines/GcStats.cs';
    source_sha256=(Get-FileHash (Join-Path $destination 'GcStats.cs')).Hash;explicitlyBorrowedFrom='F002/investigation/bdn-memory-accounting';
    currentMeasuredBdnDllSha256=$expected;actualFiveImagesRehashed=$true;newSourceFetchOrDelegateInstrumentation=$false;
    observation='Pinned net12 supplies GC.GetTotalAllocatedBytes;BDN0.13 upstream source uses reflected process-wide precise=true delegate when available. Raw GC totals/operation counts use midpoint-to-even allocation rounding.';
    limitation='Source observation plus identical DLL identity,not independently bound assembly/source or directly instrumented delegate. Includes other compiler/driver/process workers,not isolated owner allocation.'}|
    ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'provenance.json')
$source='C:\src\aspnetcore\src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs'
$frozen=Join-Path $run 'frozen-source\candidate-1\owner\ForLoopIteratorInClosureAnalyzer.cs'
if((Get-FileHash $source).Hash-cne(Get-FileHash $frozen).Hash){throw 'Actual working candidate source differs from measured bytes.'}
[ordered]@{candidate='F005';actualWorkingSha256=(Get-FileHash $source).Hash;measuredCandidateSha256=(Get-FileHash $frozen).Hash;
    exactMeasuredCandidateBytesRetained=$true;sourceCandidateShapes=1;changedTrackedFiles=1;changedExistingLines=4;
    f004_f006_sites_unchanged=$true;sourceComparisonBudgetClosed=$true;performancePrNotYetCreated=$true}|
    ConvertTo-Json|Set-Content (Join-Path $run 'source-state.json')
Write-Output 'F005 exact measured candidate retained;five identical-BDN image hashes/provenance captured;3/3 closed,no additional profiling.'
