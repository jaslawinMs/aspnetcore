$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F008'
$destination=Join-Path $run 'investigation\bdn-memory-accounting'
$budget=Get-Content (Join-Path $run 'measurement-budget.json') -Raw|ConvertFrom-Json
if((Test-Path $destination) -or -not$budget.closed -or $budget.usedComparisons-ne0 -or $budget.originalProfiles-ne1 -or
    $budget.candidateProfiles-ne0 -or $budget.originalOnlyDiagnosticProfiles-ne1){throw 'Fresh audit with closed actual original-only budget required.'}
New-Item $destination -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
$borrowed=Join-Path $PSScriptRoot 'autoperf-runs\F007\investigation\bdn-memory-accounting'
Copy-Item (Join-Path $borrowed 'GcStats.cs') $destination
Copy-Item (Join-Path $borrowed 'provenance.json') (Join-Path $destination 'borrowed-F007-provenance.json')
Copy-Item (Join-Path $borrowed 'borrowed-F006-provenance.json') $destination
$expected='4560EE1128636D3913C3FA71B8419DD2317FB97FD331231A53AD5501D5BA5437'
if((Get-FileHash (Join-Path $run 'images\original\BenchmarkDotNet.dll')).Hash-cne$expected){throw 'Actual measured DLL differs from attributed upstream-source observation.'}
[ordered]@{candidate='F008';source_url='https://github.com/dotnet/BenchmarkDotNet/blob/v0.13.0/src/BenchmarkDotNet/Engines/GcStats.cs';
    source_sha256=(Get-FileHash (Join-Path $destination 'GcStats.cs')).Hash;explicitlyBorrowedFrom='F007;earlier F006/F002 upstream capture chain retained.';
    currentMeasuredBdnDllSha256=$expected;actualMeasuredImageRehashed=$true;newSourceFetchOrDelegateInstrumentation=$false;
    observation='Pinned net12 supplies GC.GetTotalAllocatedBytes;BDN0.13 upstream source uses reflected process-wide precise=true delegate when available. Raw GC totals/operation counts use midpoint-to-even allocation rounding.';
    limitation='Explicit reused upstream-source observation plus identical DLL identity,not independent assembly/source binding or directly instrumented delegate;includes native providers,async owner,downstream/process activity,not isolated matching allocation.'}|
    ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'provenance.json')
$analysis=Get-Content (Join-Path $run 'analysis.json') -Raw|ConvertFrom-Json
[ordered]@{candidate='F008';disposition='rejected/design-blocked';performancePrJustified=$false;pairedComparisons=0;candidateProfiles=0;
    originalOnlyDiagnosticProfiles=1;shippingSourceCandidates=0;shippingSourceChanged=$false;branchRemainsAtCampaignBaseline=$true;
    actualExistingUnitProjectRows=40;actualAreaRows=38;repositoryAlwaysTestSentinelRows=2;actualNewUntimedOwnerChecks=36;actualTimedSetupsPreflighted=8;
    originalFindingCostStillPresent=$true;notMeasuredComparativeNoGain=$true;notClaimingAllOptimizationsImpossible=$true;
    decision='Do not precompute an uninvalidated startup culture-name index or cached read-only wrappers:actual public middleware/native providers observe caller-owned list membership,element order,options-property and CultureInfo formatting changes. Same-count list/array replacement and read-only-wrapper backing mutation invalidate identity/count/IsReadOnly heuristics. A new freeze/version/invalidation contract or a differently scoped compatible design remains unimplemented/unverified.';
    overlap='David Fowler upstream dotnet/aspnetcore#70155 replaces the exact FirstOrDefault/collection-enumerator allocation seam but preserves linear matching. Do not duplicate its safe cleanup as a new independent PR or claim it fixes O(N*M). No upstream performance numbers are reused.';
    actualOriginalDiagnosticReports=$analysis.successfulReports;actualRawIterations=$analysis.actualWorkloadIterations;
    actualRetainedResults=$analysis.actualRetainedResults;actualWarmups=$analysis.actualWarmups;actualOverheads=$analysis.actualOverheadIterations;
    claimBoundary=$analysis.measuredBoundary;allocationBoundary=$analysis.allocationBoundary;
    existingOwningTestsAndRealProducersPass=$true;newPermanentTestsAdded=$false;publicApiDefaultsDependenciesTfmsVisibilityBridgesChanged=$false;
    wholeCurrentDefaultSdkIntegrationClaimed=$false;additionalTimingAuthorized=$false}|
    ConvertTo-Json -Depth 8|Set-Content (Join-Path $run 'final-evaluation.json')
[ordered]@{candidate='F008';prelaunchHelperFailure='tests\prelaunch-helper-failure';actualNativeCommandsInPrelaunchFailure=0;
    buildAttempts=@(
        @{attempt=1;directory='builds\original-attempt-1';buildExitCode=1;cause='Missing direct HttpContext assembly reference.'},
        @{attempt=2;directory='builds\original-attempt-2';buildExitCode=1;cause='Three targetless C# collection expressions.'},
        @{attempt=3;directory='builds\original-attempt-3';buildExitCode=0;characterizationExitCode=-532462766;ownerObservations=18;cause='Wrong harness null expectation for actual empty-string native result.'},
        @{attempt=4;directory='builds\original-attempt-4';buildExitCode=0;characterizationExitCode=-532462766;ownerObservations=20;cause='Missing actual Http.Extensions runtime dependency.'},
        @{attempt=5;directory='builds\original';buildExitCode=0;characterizationExitCode=0;checks=36;cause='Final original-only project/native producer/owner and8 actual timed Setup/task wrappers pass.'});
    frozenImageVersions=3;onlyFinalImageMeasured=$true;earlierTimings=0;shippingCandidateVersions=0;
    exactOlderImageSourceManifestAndFailedLogsRetained=$true;completedOwnerTestsOrMeasurementNotRerun=$true;
    manifestRestoreRule='Only new/changed manifests restored;attempts3/4 reused exact successful attempt2 restore. Added actual Http.Extensions reference required final restore.'}|
    ConvertTo-Json -Depth 8|Set-Content (Join-Path $run 'preparation-history.json')
Write-Output 'F008 rejected/design-blocked startup-index proposal,not comparative no-gain. Actual O(N*M) remains;simple allocation cleanup overlaps70155. One original-only profile closed;all failed preparation/source/image states retained.'
