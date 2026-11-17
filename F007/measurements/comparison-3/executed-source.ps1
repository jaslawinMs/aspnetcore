param([Parameter(Mandatory)][ValidateRange(1,3)][int]$Comparison)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F007'
$destination=Join-Path $run "measurements\comparison-$Comparison"
$budgetFile=Join-Path $run 'measurement-budget.json'
$budget=Get-Content $budgetFile -Raw|ConvertFrom-Json
if($budget.closed -or $budget.usedComparisons-ne($Comparison-1) -or $Comparison-gt$budget.maximumComparisons){throw 'Closed/exhausted/nonsequential comparison budget.'}
if(Test-Path $destination){throw 'Never overwrite an actual measured comparison.'}
$source=Get-Content (Join-Path $run 'source-patch-metadata.json') -Raw|ConvertFrom-Json
function AssertSelectedSource
{
    if((Get-FileHash 'src\Components\Server\src\Circuits\ServerComponentDeserializer.cs').Hash-cne$source.candidateSourceSha256){throw 'Captured private candidate source changed.'}
    if((git branch --show-current)-cne$source.branch -or (git rev-parse HEAD)-cne$source.baseline){throw 'Independent baseline/branch changed.'}
    $files=@(git diff --name-only)
    if($files.Count-ne1 -or $files[0].Replace('/','\')-cne'src\Components\Server\src\Circuits\ServerComponentDeserializer.cs' -or
        @(git diff --cached --name-only).Count){throw 'Only independently selected unstaged owner may change.'}
}
function AssertFrozen([string]$Variant)
{
    $manifest=Get-Content (Join-Path $run "manifest-$Variant.json") -Raw|ConvertFrom-Json
    foreach($group in @(@{root="binaries\$Variant";rows=$manifest.files},@{root="frozen-source\$Variant";rows=$manifest.frozenSources}))
    {
        foreach($file in $group.rows)
        {
            $path=Join-Path $run "$($group.root)\$($file.relativePath)"
            if((Get-FileHash $path).Hash-cne$file.sha256 -or (Get-Item $path).Length-ne$file.bytes){throw 'Actual frozen image/source changed.'}
        }
    }
}
AssertSelectedSource
$original=Get-Content (Join-Path $run 'manifest-original.json') -Raw|ConvertFrom-Json
foreach($variant in 'original','candidate-1')
{
    $ready=Get-Content (Join-Path $run "ready-$variant.json") -Raw|ConvertFrom-Json
    if($ready.actualExitCode-ne0 -or $ready.actualOwnerChecks-ne151 -or $ready.actualProducerProofs-ne129 -or $ready.actualTimedSetupsPreflighted-ne22 -or
        -not$ready.largeSparseExtremeAndRealDescriptorStateCharacterized){throw 'Real producer/log/state preconditions did not pass.'}
    $audit=Get-Content (Join-Path $run "tests\$variant\actual-test-audit.json") -Raw|ConvertFrom-Json
    if($audit.passed-ne33 -or $audit.failed-ne0 -or $audit.skipped-ne0){throw 'Full source-defined owning class did not pass.'}
    AssertFrozen $variant
    $manifest=Get-Content (Join-Path $run "manifest-$variant.json") -Raw|ConvertFrom-Json
    $changed=@(foreach($row in $manifest.files)
    {
        $before=@($original.files|Where-Object relativePath -CEQ $row.relativePath)
        if($before.Count-ne1){throw 'Exact same image file inventory required.'}
        if($row.sha256-cne$before[0].sha256){$row.relativePath}
    })
    $expected=if($variant-ceq'original'){''}else{'Microsoft.AspNetCore.Components.Server.dll|Microsoft.AspNetCore.Components.Server.pdb'}
    if($manifest.files.Count-ne$original.files.Count -or $manifest.frozenSources.Count-ne$original.frozenSources.Count -or (($changed|Sort-Object)-join'|')-cne$expected){throw 'Exact original harness/every actual nonowner byte required for every completed comparison.'}
}
New-Item $destination -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
Copy-Item $budgetFile (Join-Path $destination 'budget-before.json')
Copy-Item (Join-Path $run 'source-patch-metadata.json') $destination
$budget.usedComparisons=$Comparison
$budget.sourceShapesMeasured=2
$budget|ConvertTo-Json -Depth 5|Set-Content $budgetFile
$order=if($Comparison-eq2){@('candidate-1','original')}else{@('original','candidate-1')}
$commands=@()
foreach($variant in $order)
{
    AssertSelectedSource
    AssertFrozen $variant
    $image=Join-Path $run "binaries\$variant"
    $sources=Join-Path $run "frozen-source\$variant"
    $artifacts=Join-Path $destination $variant
    New-Item $artifacts -ItemType Directory -Force|Out-Null
    $manifestPath=Join-Path $run "manifest-$variant.json"
    $manifest=Get-Content $manifestPath -Raw|ConvertFrom-Json
    if($variant-ceq'original'){$budget.originalProfiles++}else{$budget.candidateProfiles++}
    $budget|ConvertTo-Json -Depth 5|Set-Content $budgetFile
    $a=@((Join-Path $image 'AutoPerf.Benchmarks.dll'),'--artifacts',$artifacts,'--sources',$sources,'--context',$variant,'--filter','*')
    $started=[DateTime]::UtcNow.ToString('o')
    & dotnet @a *> (Join-Path $artifacts 'console.log')
    $code=$LASTEXITCODE
    $commands+=[ordered]@{variant=$variant;imageVariant=$variant;actualExpectedReports=22;entryPoint='dotnet';arguments=$a;actualExitCode=$code;
        startedUtc=$started;completedUtc=[DateTime]::UtcNow.ToString('o');manifestSha256=(Get-FileHash $manifestPath).Hash;
        actualPreImageHashesVerified=$manifest.files.Count;actualPreSourceHashesVerified=$manifest.frozenSources.Count;originalHarnessDllPdbByteExact=$true}
    [ordered]@{candidate='F007';comparison=$Comparison;actualOrder=$order;commands=$commands;activation='. .\activate.ps1'}|
        ConvertTo-Json -Depth 8|Set-Content (Join-Path $destination 'execution.json')
    if($code-ne0)
    {
        Get-Content (Join-Path $artifacts 'console.log') -Tail 65
        throw "Actual $variant profile failed;comparison budget remains spent."
    }
    AssertSelectedSource
    AssertFrozen $variant
    $commands[-1].actualPostImageHashesVerified=$manifest.files.Count
    $commands[-1].actualPostSourceHashesVerified=$manifest.frozenSources.Count
    [ordered]@{candidate='F007';comparison=$Comparison;actualOrder=$order;commands=$commands;activation='. .\activate.ps1'}|
        ConvertTo-Json -Depth 8|Set-Content (Join-Path $destination 'execution.json')
    Write-Output "F007 comparison$Comparison $variant`:actual22-case full-owner profile completed,$($manifest.files.Count) image/$($manifest.frozenSources.Count) source hashes checked before/after;identical original harness."
}
$budget.completedComparisonIds=@($budget.completedComparisonIds)+$Comparison
$budget.completedProfiles+=2
$budget|ConvertTo-Json -Depth 6|Set-Content $budgetFile
Copy-Item $budgetFile (Join-Path $destination 'budget-after.json')
Write-Output "F007 comparison$Comparison completed;used$($budget.usedComparisons)/3 paired comparisons."
