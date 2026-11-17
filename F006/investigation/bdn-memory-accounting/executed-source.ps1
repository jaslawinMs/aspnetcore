$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F006'
$destination=Join-Path $run 'investigation\bdn-memory-accounting'
if(Test-Path $destination){throw 'Refusing to overwrite an actual provenance capture.'}
New-Item $destination -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
$borrowed=Join-Path $PSScriptRoot 'autoperf-runs\F002\investigation\bdn-memory-accounting'
Copy-Item (Join-Path $borrowed 'GcStats.cs') $destination
Copy-Item (Join-Path $borrowed 'provenance.json') (Join-Path $destination 'borrowed-F002-provenance.json')
$expected='4560EE1128636D3913C3FA71B8419DD2317FB97FD331231A53AD5501D5BA5437'
foreach($variant in 'original','candidate-1','current-default-class')
{
    if((Get-FileHash (Join-Path $run "binaries\$variant\BenchmarkDotNet.dll")).Hash-cne$expected){throw 'Actual measured DLL differs from explicitly attributed source observation.'}
}
[ordered]@{candidate='F006';source_url='https://github.com/dotnet/BenchmarkDotNet/blob/v0.13.0/src/BenchmarkDotNet/Engines/GcStats.cs';
    source_sha256=(Get-FileHash (Join-Path $destination 'GcStats.cs')).Hash;explicitlyBorrowedFrom='F002/investigation/bdn-memory-accounting';
    currentMeasuredBdnDllSha256=$expected;actualThreeImagesRehashed=$true;newSourceFetchOrDelegateInstrumentation=$false;
    observation='Pinned net12 supplies GC.GetTotalAllocatedBytes;BDN0.13 upstream source uses reflected process-wide precise=true delegate when available. Raw GC totals/operation counts use midpoint-to-even allocation rounding.';
    limitation='Explicit reused upstream-source observation plus identical DLL identity,not independent assembly/source binding or directly instrumented delegate;includes compiler/driver/process workers,not isolated owner allocation.'}|
    ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'provenance.json')
$source='C:\src\aspnetcore\src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs'
$frozen=Join-Path $run 'frozen-source\candidate-1\owner\ForLoopIteratorInClosureAnalyzer.cs'
$metadata=Get-Content (Join-Path $run 'source-patch-metadata.json') -Raw|ConvertFrom-Json
if((Get-FileHash $source).Hash-cne(Get-FileHash $frozen).Hash -or (Get-FileHash $source).Hash-cne$metadata.candidateSourceSha256){throw 'Actual working source differs from fixed measured candidate bytes.'}
[ordered]@{candidate='F006';actualWorkingSha256=(Get-FileHash $source).Hash;measuredCandidateSha256=(Get-FileHash $frozen).Hash;
    exactMeasuredCandidateBytesRetained=$true;sourceCandidateShapes=1;changedTrackedFiles=1;changedExistingLines=5;
    f004_f005_sites_unchanged=$true;harnessVersionsMeasured=1;sourceComparisonBudgetClosed=(Get-Content (Join-Path $run 'measurement-budget.json') -Raw|ConvertFrom-Json).closed;
    performancePrNotYetCreated=$true}|ConvertTo-Json|Set-Content (Join-Path $run 'source-state.json')
Write-Output 'F006 fixed measured candidate retained;three identical-BDN image hashes and attributed accounting provenance captured;no profiling added.'
