$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F004'
$destination = Join-Path $run 'investigation\bdn-memory-accounting'
if (Test-Path $destination) { throw 'Refusing to overwrite an actual provenance capture.' }
New-Item $destination -ItemType Directory -Force | Out-Null
$borrowed = Join-Path $PSScriptRoot 'autoperf-runs\F002\investigation\bdn-memory-accounting'
Copy-Item (Join-Path $borrowed 'GcStats.cs'),(Join-Path $borrowed 'provenance.json') $destination
Rename-Item (Join-Path $destination 'provenance.json') 'borrowed-F002-provenance.json'
$expected = '4560EE1128636D3913C3FA71B8419DD2317FB97FD331231A53AD5501D5BA5437'
foreach ($variant in 'original','candidate-1','current-default-class')
{
    if ((Get-FileHash (Join-Path $run "binaries\$variant\BenchmarkDotNet.dll")).Hash -cne $expected) { throw 'Borrowed BDN source observation does not match the actual current DLL identity.' }
}
[ordered]@{candidate='F004';source_url='https://github.com/dotnet/BenchmarkDotNet/blob/v0.13.0/src/BenchmarkDotNet/Engines/GcStats.cs';
    source_sha256=(Get-FileHash (Join-Path $destination 'GcStats.cs')).Hash;explicitlyBorrowedFrom='F002/investigation/bdn-memory-accounting';
    currentMeasuredBdnDllSha256=$expected;actualThreeImagesRehashed=$true;newSourceFetchOrDelegateInstrumentation=$false;
    observation='Pinned net12 supplies GC.GetTotalAllocatedBytes;BDN0.13 upstream source uses the reflected process-wide precise=true delegate when available. Raw GC totals/operation counts use midpoint-to-even allocation rounding.';
    limitation='Source observation plus identical DLL identity,not independently bound assembly/source or directly instrumented delegate. Counts include other compiler/driver/process workers,not isolated owner allocation.'} |
    ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'provenance.json')
$source = 'C:\src\aspnetcore\src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs'
$original = Join-Path $run 'producer-source\src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs'
if ((Get-FileHash $source).Hash -cne (Get-FileHash $original).Hash) { throw 'Actual original working source bytes not restored.' }
[ordered]@{candidate='F004';actualOriginalWorkingSha256=(Get-FileHash $source).Hash;actualOriginalProducerSha256=(Get-FileHash $original).Hash;
    exactOriginalBytesRestored=$true;restoredOnlyOurFourChangedLines=$true;candidatePatchAndAllFrozenImagesRetained=$true;
    finalTrackedShippingChanges=0;noAdditionalBuildTestOrPerformanceRunClaimed=$true} |
    ConvertTo-Json | Set-Content (Join-Path $run 'source-restoration.json')
@(
    [ordered]@{attempt='initial fresh source capture';observedOuterExit=1;reason='Whole-owner equality guard caught the real adjacent current-default null fix;7 source triples retained.';rawInnerCommandsCaptured=$true;separateOuterConsoleFileCaptured=$false},
    [ordered]@{attempt='original harness build1';observedOuterExit=1;reason='CS1061/CS0021,BDN returns IEnumerable<Summary>;fixed with ToArray before any profile.';rawInnerCommandsCaptured=$true;separateOuterConsoleFileCaptured=$false},
    [ordered]@{attempt='current-default context1';observedOuterExit=1;reason='Nonempty optional SDK extension placeholder guard;physical file is absent.';rawInnerCommandsCaptured=$true;separateOuterConsoleFileCaptured=$false},
    [ordered]@{attempt='current-default context2';observedOuterExit=1;reason='Whole ComponentsApi equality guard;actual difference adds unrelated RazorComponentResultOfT constants. All5 referenced sites later checked individually.';rawInnerCommandsCaptured=$true;separateOuterConsoleFileCaptured=$false}
) | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run 'observed-preparation-failures.json')
Write-Output 'F004 exact source restoration and explicit same-DLL borrowed allocation-source provenance captured;failed guards/build preserved without claiming separately captured outer consoles.'
