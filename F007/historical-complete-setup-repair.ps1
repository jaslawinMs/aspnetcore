$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F007'
$history=Join-Path $run 'retired-harness\failed-slot-1'
$stale=Join-Path $run 'retired-harness\stale-output-during-repair'
$budget=Get-Content (Join-Path $run 'measurement-budget.json') -Raw|ConvertFrom-Json
$source=Get-Content (Join-Path $run 'source-patch-metadata.json') -Raw|ConvertFrom-Json
$originalAudit=Get-Content (Join-Path $run 'tests\original\actual-test-audit.json') -Raw|ConvertFrom-Json
$candidateAudit=Get-Content (Join-Path $run 'tests\candidate-1\actual-test-audit.json') -Raw|ConvertFrom-Json
$live='src\Components\Server\src\Circuits\ServerComponentDeserializer.cs'
if((Test-Path $stale) -or $budget.usedComparisons-ne1 -or $budget.originalProfiles-ne1 -or $budget.candidateProfiles-ne0 -or
    (Get-FileHash $live).Hash-cne$source.candidateSourceSha256){throw 'Only continue actual unmeasured setup repair with unchanged candidate.'}
$partial=Join-Path $run 'binaries\original'
if((Get-FileHash (Join-Path $partial 'Microsoft.AspNetCore.Components.Server.dll')).Hash-cne$candidateAudit.binaryHashes[0].sha256 -or
    (Get-FileHash (Join-Path $partial 'Microsoft.AspNetCore.Components.Server.pdb')).Hash-cne$candidateAudit.binaryHashes[1].sha256 -or
    (Get-FileHash (Join-Path $run 'frozen-source\original\owner\ServerComponentDeserializer.cs')).Hash-cne$source.originalSourceSha256)
{
    throw 'Inspect unexpected rebuilt-image identity instead of assuming incremental reuse.'
}
New-Item $stale -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $stale 'executed-source.ps1')
[ordered]@{candidate='F007';observedFreezeStageExitCode=1;actualHarnessBuildExitCode=0;timingSlotsUsed=1;workloadSamplesInFailedSlot=0;
    observedOutput='Attempt3 retained exact already-tested candidate DLL/PDB despite temporary byte-exact original source. Freeze guard caught mismatch before any characterization/timing.';
    likelyBoundary='Incremental ProjectReference output reuse after copying older source timestamps;source equality alone is not rebuilt-binary evidence.';
    sourceOriginalSha256=$source.originalSourceSha256;actualRetainedCandidateDllSha256=$candidateAudit.binaryHashes[0].sha256;
    actualRequiredOriginalDllSha256=$originalAudit.binaryHashes[0].sha256;
    correction='Force fresh original owner Rebuild,assert tested-original byte identity,then force final harness Rebuild against that owner. No measurement rerun or budget reset.'}|
    ConvertTo-Json -Depth 6|Set-Content (Join-Path $stale 'stale-owner-proof.json')
foreach($sub in 'binaries','frozen-source')
{
    New-Item (Join-Path $stale $sub) -ItemType Directory|Out-Null
    Move-Item (Join-Path $run "$sub\original") (Join-Path $stale "$sub\original")
}
$originalSource=Join-Path $history 'frozen-source\original\owner\ServerComponentDeserializer.cs'
$candidateSource=Join-Path $history 'frozen-source\candidate-1\owner\ServerComponentDeserializer.cs'
$owner='artifacts\bin\Microsoft.AspNetCore.Components.Server\Release\net12.0'
try
{
    Copy-Item $originalSource $live
    if((Get-FileHash $live).Hash-cne$source.originalSourceSha256 -or @(git diff --name-only).Count){throw 'Exact original source required.'}
    $a=@('build','src\Components\Server\src\Microsoft.AspNetCore.Components.Server.csproj','--no-restore','--no-dependencies',
        '-c','Release','-t:Rebuild','-m:2','-v:q','-p:UseIisNativeAssets=false',"-bl:$stale\fresh-original-owner.binlog")
    & dotnet @a *> (Join-Path $stale 'fresh-original-owner.log')
    $code=$LASTEXITCODE
    [ordered]@{entryPoint='dotnet';arguments=$a;actualExitCode=$code;activation='. .\activate.ps1'}|
        ConvertTo-Json -Depth 5|Set-Content (Join-Path $stale 'fresh-original-owner-execution.json')
    if($code){Get-Content (Join-Path $stale 'fresh-original-owner.log') -Tail 35;throw 'Actual original owner rebuild failed.'}
    if((Get-FileHash (Join-Path $owner 'Microsoft.AspNetCore.Components.Server.dll')).Hash-cne$originalAudit.binaryHashes[0].sha256 -or
        (Get-FileHash (Join-Path $owner 'Microsoft.AspNetCore.Components.Server.pdb')).Hash-cne$originalAudit.binaryHashes[1].sha256){throw 'Fresh original owner must reproduce exact tested original DLL/PDB.'}
    & (Join-Path $PSScriptRoot 'F007-build-original.ps1') -Attempt 4 -RebuildHarness
    if(-not$?){throw 'Final original-bound harness build/freeze failed.'}
}
finally
{
    Copy-Item $candidateSource $live
    foreach($name in 'Microsoft.AspNetCore.Components.Server.dll','Microsoft.AspNetCore.Components.Server.pdb')
    {
        Copy-Item (Join-Path $history "binaries\candidate-1\$name") (Join-Path $owner $name)
    }
}
& (Join-Path $PSScriptRoot 'F007-freeze-candidate.ps1') -Attempt 2
if(-not$?){throw 'Final candidate substitution failed.'}
foreach($variant in 'original','candidate-1')
{
    & (Join-Path $PSScriptRoot 'F007-characterize.ps1') -Variant $variant -Attempt 2
    if(-not$?){throw 'Actual setup/producer preflight failed;do not spend another slot.'}
}
$after=Get-Content (Join-Path $run 'measurement-budget.json') -Raw|ConvertFrom-Json
if($after.usedComparisons-ne1 -or $after.originalProfiles-ne1 -or $after.candidateProfiles-ne0){throw 'Untimed repair cannot reset/spend slots.'}
[ordered]@{candidate='F007';actualUntimedChecksPerOwner=151;actualTimedSetupsPreflightedPerOwner=22;actualProducerProofsPerOwner=129;
    firstSlotSpent=$true;remainingAuthorizedSlots=@(2,3);sourceCandidateByteExact=((Get-FileHash $live).Hash-ceq$source.candidateSourceSha256);
    finalHarnessForceRebuiltAgainstFreshByteExactTestedOriginalOwner=$true;candidateOnlyTestedOwnerSubstituted=$true;
    noTimingPerformedDuringRepair=$true;actualExistingTestRowsPerOwner=33;existingOwningTestEvidenceReusedNotRerun=$true;
    bothUnmeasuredFreezeFailuresAndAllEarlierSourceImageVersionsPreserved=$true}|
    ConvertTo-Json -Depth 6|Set-Content (Join-Path $history 'repair-completed.json')
Write-Output 'F007 repaired:byte-exact fresh original owner,one final shared harness,151 checks/all22 actual setups pass per owner. Failure slot1 remains spent;only slots2/3 authorized.'
