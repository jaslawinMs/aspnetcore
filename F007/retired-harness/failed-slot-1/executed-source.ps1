$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F007'
$history=Join-Path $run 'retired-harness\failed-slot-1'
if(Test-Path $history){throw 'Never overwrite failed benchmark history.'}
$budget=Get-Content (Join-Path $run 'measurement-budget.json') -Raw|ConvertFrom-Json
$execution=Get-Content (Join-Path $run 'measurements\comparison-1\execution.json') -Raw|ConvertFrom-Json
$source=Get-Content (Join-Path $run 'source-patch-metadata.json') -Raw|ConvertFrom-Json
$live='src\Components\Server\src\Circuits\ServerComponentDeserializer.cs'
if($budget.usedComparisons-ne1 -or $budget.originalProfiles-ne1 -or $budget.candidateProfiles-ne0 -or $budget.closed -or
    $execution.commands.Count-ne1 -or $execution.commands[0].actualExitCode-eq0 -or
    (Get-FileHash $live).Hash-cne$source.candidateSourceSha256){throw 'Only the actual first-slot setup failure may be repaired.'}
$console=[IO.File]::ReadAllText((Join-Path $run 'measurements\comparison-1\original\console.log'))
if($console-notmatch'System.NullReferenceException' -or $console-notmatch'AutoPerf.ServerAdapter.Logger' -or
    $console-match'(?m)^WorkloadActual\s' -or (Test-Path (Join-Path $run 'measurements\comparison-1\candidate-1'))){throw 'Preserve/inspect unexpected measured boundary.'}
New-Item $history -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $history 'executed-source.ps1')
foreach($variant in 'original','candidate-1')
{
    $manifest=Get-Content (Join-Path $run "manifest-$variant.json") -Raw|ConvertFrom-Json
    foreach($group in @(@{root="binaries\$variant";rows=$manifest.files},@{root="frozen-source\$variant";rows=$manifest.frozenSources}))
    {
        foreach($file in $group.rows)
        {
            if((Get-FileHash (Join-Path $run "$($group.root)\$($file.relativePath)")).Hash-cne$file.sha256){throw 'Actual failed-era image/source changed.'}
        }
        New-Item (Join-Path $history ([IO.Path]::GetDirectoryName($group.root))) -ItemType Directory -Force|Out-Null
        Move-Item (Join-Path $run $group.root) (Join-Path $history $group.root)
    }
    Move-Item (Join-Path $run "manifest-$variant.json") (Join-Path $history "manifest-$variant.json")
    Move-Item (Join-Path $run "ready-$variant.json") (Join-Path $history "ready-$variant.json")
}
[ordered]@{candidate='F007';failedComparisonSlot=1;slotRemainsSpent=$true;actualSuccessfulReports=0;actualWorkloadSamples=0;
    actualAttemptedProfiles=1;actualCandidateProfiles=0;
    observedError='NullReferenceException in harness ServerAdapter.Logger null-logger member reflection,RootBatchBenchmarks.Setup,before any producer/timing sample.';
    correction='Bind NullLogger<T>.Instance through compiler-checked generic helper. Add untimed actual GlobalSetup/timed-wrapper checks for every one of22 shapes before using remaining slots.';
    shippingCandidateChanged=$false;benchmarkShapeInputOrMethodBoundaryChanged=$false;
    rawFailureAndBoth147FileImagesAnd26FileSourceSnapshotsPreserved=$true;remainingAuthorizedSlots=@(2,3);
    finalRevisedHarnessRequiredIdenticalAcrossEveryCompletedComparison=$true}|
    ConvertTo-Json -Depth 7|Set-Content (Join-Path $history 'failure-and-repair-plan.json')
$originalSource=Join-Path $history 'frozen-source\original\owner\ServerComponentDeserializer.cs'
$candidateSource=Join-Path $history 'frozen-source\candidate-1\owner\ServerComponentDeserializer.cs'
try
{
    Copy-Item $originalSource $live
    if((Get-FileHash $live).Hash-cne$source.originalSourceSha256 -or @(git diff --name-only).Count){throw 'Exact temporary original source restoration required.'}
    & (Join-Path $PSScriptRoot 'F007-build-original.ps1') -Attempt 3
    if(-not$?){throw 'Revised harness build failed;do not spend another slot.'}
}
finally
{
    Copy-Item $candidateSource $live
    if((Get-FileHash $live).Hash-cne$source.candidateSourceSha256){throw 'Exact original candidate source must remain unchanged after setup repair.'}
}
$owner='artifacts\bin\Microsoft.AspNetCore.Components.Server\Release\net12.0'
foreach($name in 'Microsoft.AspNetCore.Components.Server.dll','Microsoft.AspNetCore.Components.Server.pdb')
{
    Copy-Item (Join-Path $history "binaries\candidate-1\$name") (Join-Path $owner $name)
}
& (Join-Path $PSScriptRoot 'F007-freeze-candidate.ps1') -Attempt 2
if(-not$?){throw 'Revised owner-only substitution failed.'}
foreach($variant in 'original','candidate-1')
{
    & (Join-Path $PSScriptRoot 'F007-characterize.ps1') -Variant $variant -Attempt 2
    if(-not$?){throw 'Actual timed-setup/producer characterization failed;do not spend another slot.'}
}
$after=Get-Content (Join-Path $run 'measurement-budget.json') -Raw|ConvertFrom-Json
if($after.usedComparisons-ne1 -or $after.originalProfiles-ne1 -or $after.candidateProfiles-ne0){throw 'Untimed repair must not reset/spend any timing slot.'}
[ordered]@{candidate='F007';actualUntimedChecksPerOwner=151;actualTimedSetupsPreflightedPerOwner=22;actualProducerProofsPerOwner=129;
    firstSlotSpent=$true;remainingAuthorizedSlots=@(2,3);sourceCandidateByteExact=$true;
    revisedHarnessBuiltAgainstFreshOriginalThenCandidateOwnerOnlySubstituted=$true;
    noTimingPerformedDuringRepair=$true;actualExistingTestRowsPerOwner=33;existingOwningTestEvidenceReusedNotRerun=$true}|
    ConvertTo-Json -Depth 6|Set-Content (Join-Path $history 'repair-completed.json')
Write-Output 'F007 setup repaired:failure slot1 retained/spent;151 checks plus all22 actual timed setups pass per owner. Only slots2/3 remain;shipping source candidate unchanged.'
