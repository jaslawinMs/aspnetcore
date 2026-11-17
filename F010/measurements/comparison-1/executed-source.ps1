param([ValidateRange(1,3)][int]$Comparison=1)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F010'
$budgetPath=Join-Path $run 'measurement-budget.json'
$budget=Get-Content $budgetPath -Raw|ConvertFrom-Json
if($budget.closed -or $budget.usedComparisons-ne($Comparison-1) -or $budget.usedComparisons-ge$budget.maximumComparisons)
{throw 'F010 comparison budget is closed,already spent or out of sequence;never rerun a used slot.'}
$manifests=@{}
foreach($role in 'original','candidate')
{
    $manifestPath=Join-Path $run "manifest-$role.json"
    $manifest=Get-Content $manifestPath -Raw|ConvertFrom-Json
    foreach($image in $manifest.images)
    {
        if(@(Get-ChildItem $image.path -Recurse -File).Count-ne$image.files.Count){throw 'Frozen role-image file inventory differs.'}
        foreach($file in $image.files)
        {
            $actual=Get-Item (Join-Path $image.path $file.path)
            if($actual.Length-ne$file.bytes -or (Get-FileHash $actual.FullName).Hash-cne$file.sha256){throw 'Frozen role-image bytes differ.'}
        }
    }
    foreach($file in $manifest.sources)
    {if((Get-FileHash (Join-Path $run "sources\$role\$($file.path)")).Hash-cne$file.sha256){throw 'Frozen actual source snapshot differs.'}}
    $native=@(Get-ChildItem (Join-Path $run "characterization\$role\states") -File -Filter '*characterization-completed.json')
    if($native.Count-ne1){throw 'Unique completed native public-pipeline characterization required.'}
    $completed=Get-Content $native[0].FullName -Raw|ConvertFrom-Json
    if(-not$completed.passed -or $completed.actualChecks-ne50 -or $completed.actualTimedSetupsPreflighted-ne11)
    {throw 'All actual native preflights required before timing.'}
    foreach($kind in 'legacy','standard')
    {
        $extra=Get-Content (Join-Path $run "characterization\$kind-$role\completed.json") -Raw|ConvertFrom-Json
        if($extra.passed-cne'true' -or $extra.actualChecks-cne'39'){throw 'Actual legacy/std consumer contract observations required.'}
    }
    $manifests[$role]=$manifest
}
foreach($key in 'harnessDllSha256','harnessPdbSha256','benchmarkDotNetSha256')
{if($manifests.original.$key-cne$manifests.candidate.$key){throw 'One exact compiled harness/PDB/BDN image is mandatory.'}}
foreach($kind in 'primary','legacy','standard')
{
    $old=@($manifests.original.images|Where-Object role -CEQ $kind)[0]
    $new=@($manifests.candidate.images|Where-Object role -CEQ $kind)[0]
    $deltas=@($old.files|Where-Object {$item=$_;$other=@($new.files|Where-Object path -CEQ $item.path);$other.Count-ne1 -or $other[0].sha256-cne$item.sha256}|ForEach-Object path)
    if((($deltas|Sort-Object)-join'|') -cne 'Microsoft.AspNetCore.Authorization.dll|Microsoft.AspNetCore.Authorization.pdb')
    {throw 'Only exact freshly tested owner DLL/PDB may differ in each compiled-once consumer role.'}
}
$testAudit=Get-Content (Join-Path $run 'tests\candidate\actual-test-audit.json') -Raw|ConvertFrom-Json
if($testAudit.actualTests-ne219 -or $testAudit.failed-ne0 -or $testAudit.skipped-ne0){throw 'Actual candidate219 unit rows required.'}
if((Get-FileHash 'src\Security\Authorization\Core\src\ClaimsAuthorizationRequirement.cs').Hash-cne
    (Get-FileHash (Join-Path $run 'sources\candidate\owner\ClaimsAuthorizationRequirement.cs')).Hash -or
    (Get-FileHash 'src\Security\Authorization\test\DefaultAuthorizationServiceTests.cs').Hash-cne
    (Get-FileHash (Join-Path $run 'sources\candidate\test\DefaultAuthorizationServiceTests.cs')).Hash)
{throw 'Actual candidate source changed after tested image freeze.'}
$destination=Join-Path $run "measurements\comparison-$Comparison"
if(Test-Path $destination){throw 'Preserve every attempted timing slot.'}
New-Item $destination -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
$order=if($Comparison-eq2){@('candidate','original')}else{@('original','candidate')}
$attempt=[pscustomobject]@{comparison=$Comparison;state='running';order=$order;startedUtc=[DateTimeOffset]::UtcNow.ToString('o');
    driverSha256=(Get-FileHash $PSCommandPath).Hash;profiles=@();completedUtc=$null;failed=$false;manifestHashes=@{
        original=(Get-FileHash (Join-Path $run 'manifest-original.json')).Hash;candidate=(Get-FileHash (Join-Path $run 'manifest-candidate.json')).Hash}}
$prior=@($budget.PSObject.Properties['attempts'].Value|Where-Object {$null-ne$_})
$budget|Add-Member -NotePropertyName attempts -NotePropertyValue @($prior+$attempt) -Force
$budget.usedComparisons=$Comparison
$budget.reason='Slot reserved before native timing launch;every failed/partial launch consumes this comparison. Exact compiled harness/all nonowner bytes identical in all3 roles;contracts/API/package/format gates passed.'
function SaveBudget
{
    $budget|ConvertTo-Json -Depth 14|Set-Content $budgetPath
    $attempt|ConvertTo-Json -Depth 14|Set-Content (Join-Path $destination 'comparison-execution.json')
}
SaveBudget
$allSucceeded=$false
try
{
    $powerBefore=& powercfg /GETACTIVESCHEME
    if($LASTEXITCODE){throw 'Unable to observe current shared-host power plan.'}
    $powerBefore|Set-Content (Join-Path $destination 'power-before.txt')
    & dotnet --info *> (Join-Path $destination 'sdk-and-host-info.txt')
    if($LASTEXITCODE){throw 'Activated host context capture failed.'}
    foreach($role in $order)
    {
        $image=@($manifests[$role].images|Where-Object role -CEQ 'primary')[0].path
        $roleOutput=Join-Path $destination $role
        $arguments=@((Join-Path $image 'AutoPerf.Benchmarks.dll'),'--sources',(Join-Path $run "sources\$role"),
            '--context',"$role-comparison-$Comparison",'--measure','--filter','*ClaimBenchmarks*','--artifacts',$roleOutput)
        $profile=[pscustomobject]@{role=$role;entryPoint='dotnet';arguments=$arguments;startedUtc=[DateTimeOffset]::UtcNow.ToString('o');
            actualExitCode=$null;completedUtc=$null;expectedReports=11;actualReports=0}
        $attempt.profiles=@($attempt.profiles+$profile)
        $counterName=$role+'Profiles';$budget.$counterName++;SaveBudget
        & dotnet @arguments *> (Join-Path $destination "$role.log")
        $profile.actualExitCode=$LASTEXITCODE;$profile.completedUtc=[DateTimeOffset]::UtcNow.ToString('o')
        SaveBudget
        Get-Content (Join-Path $destination "$role.log") -Tail 24
        if($profile.actualExitCode-ne0){throw "Actual$role timing launch failed;comparison slot remains spent."}
        $completion=@(Get-ChildItem (Join-Path $roleOutput 'states') -Filter '*completed.json' -File)
        if($completion.Count-ne1){throw 'Unique actual profile completion required.'}
        $completed=Get-Content $completion[0].FullName -Raw|ConvertFrom-Json
        if(-not$completed.allSuccessful -or $completed.actualReports-ne11){throw 'All11 actual role cases must complete.'}
        $profile.actualReports=11;$budget.completedProfiles++;SaveBudget
    }
    $powerAfter=& powercfg /GETACTIVESCHEME
    if($LASTEXITCODE){throw 'Unable to observe final shared-host power plan.'}
    $powerAfter|Set-Content (Join-Path $destination 'power-after.txt')
    if(($powerBefore-join"`n")-cne($powerAfter-join"`n")){throw 'Ambient power-plan evidence changed;retain slot and do not claim controlled comparison.'}
    $allSucceeded=$true
}
finally
{
    $attempt.completedUtc=[DateTimeOffset]::UtcNow.ToString('o')
    $attempt.failed=-not$allSucceeded
    if($allSucceeded)
    {
        $attempt.state='completed';$budget.completedComparisonIds=@($budget.completedComparisonIds+$Comparison)
    }
    else
    {
        $attempt.state='failed-or-partial';$budget.failedComparisonIds=@($budget.failedComparisonIds+$Comparison)
    }
    SaveBudget
}
Write-Output "F010 comparison$Comparison completed:$($order-join' then '),11 cases/role;slot consumed,all raw reports/GC/actual settings and exact frozen-image identities retained."
