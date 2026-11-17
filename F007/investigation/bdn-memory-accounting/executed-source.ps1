$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F007'
$destination=Join-Path $run 'investigation\bdn-memory-accounting'
$budget=Get-Content (Join-Path $run 'measurement-budget.json') -Raw|ConvertFrom-Json
if((Test-Path $destination) -or -not$budget.closed -or $budget.usedComparisons-ne3 -or
    ($budget.completedComparisonIds -join ',')-cne'2,3' -or $budget.completedProfiles-ne4){throw 'Fresh audit with closed actual three-slot budget required.'}
New-Item $destination -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
$borrowed=Join-Path $PSScriptRoot 'autoperf-runs\F006\investigation\bdn-memory-accounting'
Copy-Item (Join-Path $borrowed 'GcStats.cs') $destination
Copy-Item (Join-Path $borrowed 'provenance.json') (Join-Path $destination 'borrowed-F006-provenance.json')
$expected='4560EE1128636D3913C3FA71B8419DD2317FB97FD331231A53AD5501D5BA5437'
foreach($variant in 'original','candidate-1')
{
    if((Get-FileHash (Join-Path $run "binaries\$variant\BenchmarkDotNet.dll")).Hash-cne$expected){throw 'Actual measured DLL differs from explicitly attributed source observation.'}
}
[ordered]@{candidate='F007';source_url='https://github.com/dotnet/BenchmarkDotNet/blob/v0.13.0/src/BenchmarkDotNet/Engines/GcStats.cs';
    source_sha256=(Get-FileHash (Join-Path $destination 'GcStats.cs')).Hash;explicitlyBorrowedFrom='F006/investigation/bdn-memory-accounting;original upstream capture attributed to F002';
    currentMeasuredBdnDllSha256=$expected;actualTwoFinalImagesRehashed=$true;newSourceFetchOrDelegateInstrumentation=$false;
    observation='Pinned net12 supplies GC.GetTotalAllocatedBytes;BDN0.13 upstream source uses reflected process-wide precise=true delegate when available. Raw GC totals/operation counts use midpoint-to-even allocation rounding.';
    limitation='Explicit reused upstream-source observation plus identical DLL identity,not independent assembly/source binding or directly instrumented delegate;includes parser/process workers,not isolated owner/set allocation.'}|
    ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'provenance.json')
$source='C:\src\aspnetcore\src\Components\Server\src\Circuits\ServerComponentDeserializer.cs'
$frozen=Join-Path $run 'frozen-source\candidate-1\owner\ServerComponentDeserializer.cs'
$patch=Get-Content (Join-Path $run 'source-patch-metadata.json') -Raw|ConvertFrom-Json
if((Get-FileHash $source).Hash-cne(Get-FileHash $frozen).Hash -or (Get-FileHash $source).Hash-cne$patch.candidateSourceSha256){throw 'Actual working source differs from measured candidate.'}
[ordered]@{candidate='F007';actualWorkingSha256=(Get-FileHash $source).Hash;measuredCandidateSha256=(Get-FileHash $frozen).Hash;
    exactMeasuredCandidateBytesRetained=$true;sourceCandidateShapes=1;attemptedComparisonSlots=3;failedNoSampleSlots=@(1);
    controlledComparisonIds=@(2,3);attemptedOriginalProfiles=3;attemptedCandidateProfiles=2;completedProfiles=4;
    finalImageFilesPerRole=146;all144NonownerImageBytesIdentical=$true;harnessVersionsWithWorkloadSamples=1;
    historicalBudgetSourceShapesMeasuredMeansSelectedImageRolesNotMeasuredSamples=$true;comparisonBudgetClosed=$true;
    performancePrNotYetCreated=$true}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $run 'source-state.json')
[ordered]@{candidate='F007';disposition='qualified-scaling-draft-pending-audit';performancePrJustified=$true;
    qualification='Narrow parser CPU/allocation trade-off,not a default-app win. Both completed order-reversed pairs improve Remove4096/16384 and marker-disabled Resume4096/16384,with more process-wide allocation. Default100 simultaneous roots is not a batch-size bound;large cases are scaling stress with unmeasured production frequency. Small/129 controls reverse and early failures allocate more without a timing win. Empty control has high CV. No marker-conversion throughput,browser/downstream circuit or whole-current-default integration claim.';
    practicalDefaultAppBenefitEstablished=$false;productionBatchDistributionEstablished=$false;
    newPermanentTestsAdded=$false;owningTestFactsPerRole=33;actualUntimedOwnerChecksPerRole=151;
    reasonForNoNewPermanentTests='Private collection substitution with unchanged contracts;33 actual existing owner Facts and real-serializer/parameter/state/full-owner companion cover equivalence. Draft proposal includes runnable characterization rather than new permanent coverage or a claim of merge readiness.';
    actualAttemptedComparisons=3;failedNoSampleComparisonIds=@(1);completedComparisonIds=@(2,3);successfulReports=88;
    rawWorkloadIterations=704;retainedResults=665;warmups=264;overheads=1700;
    candidateTuningAfterSlot2=$false;additionalTimingAuthorized=$false}|
    ConvertTo-Json -Depth 6|Set-Content (Join-Path $run 'final-evaluation.json')
Write-Output 'F007 narrow scaling/allocation proposal pending independent audit;closed budget,failed slot and unchanged measured candidate preserved;no additional timing.'
