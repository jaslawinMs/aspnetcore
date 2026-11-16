param([ValidateRange(1,10)][int]$Attempt=1)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F118'
$tag="original-prep$Attempt"
$image=Join-Path $run "binaries\$tag"
$frozen=Join-Path $run "frozen-source\$tag"
$directory=Join-Path $run "development\$tag"
$fixture=Join-Path $run "fixtures\$tag"
$characterization=Join-Path $run "characterization\$tag"
$manifestName="manifest-$tag.json"
foreach($file in $image,$frozen,$directory,$fixture,$characterization,(Join-Path $run $manifestName),(Join-Path $run 'original-ready.json'))
{
    if(Test-Path $file){throw 'Never overwrite an original preparation attempt or frozen readiness receipt.'}
}
if((git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
    (git branch --show-current).Trim() -cne 'autoperf/F118-url-resolution-writer' -or @(git status --porcelain --untracked-files=no).Count){throw 'Unchanged independent original branch required.'}
$budget=Get-Content (Join-Path $run 'measurement-budget.json') -Raw|ConvertFrom-Json
if($budget.startedSourceComparisons -or $budget.originalProfilesStarted -or $budget.candidateProfilesStarted){throw 'Prepare original contracts/resource proof before source comparison/timing.'}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
New-Item -ItemType Directory -Path $image -Force|Out-Null
Get-ChildItem (Join-Path $run 'harness\bin\Release\net12.0') -Force|Copy-Item -Destination $image -Recurse
New-Item -ItemType Directory -Path (Join-Path $frozen 'harness') -Force|Out-Null
Get-ChildItem (Join-Path $run 'harness') -File|Copy-Item -Destination (Join-Path $frozen 'harness')
Get-ChildItem (Join-Path $run 'producer-source') -Force|Copy-Item -Destination $frozen -Recurse
$supporting=@(foreach($relative in 'src\Mvc\Mvc.Abstractions\src\ActionContext.cs','src\Mvc\Mvc.ViewFeatures\src\Rendering\ViewContext.cs')
{
    $target=Join-Path $frozen $relative
    New-Item -ItemType Directory -Path (Split-Path $target) -Force|Out-Null
    Copy-Item $relative $target
    [ordered]@{source=$relative;sha256=(Get-FileHash $target).Hash;reason='Explicit empty RouteData/ActionDescriptor supplied;parameterless view/action contexts are documented test constructors without complete routing state.'}
})
$supporting|ConvertTo-Json -Depth 6|Set-Content (Join-Path $directory 'supporting-context-sources.json') -Encoding utf8
$audit=Get-Content (Join-Path $run 'tests\original\test-audit.json') -Raw|ConvertFrom-Json
if(-not $audit.allPassed -or $audit.actualRows -ne 38){throw 'Actual38 existing owning rows required.'}
$owners=@('Microsoft.AspNetCore.Mvc.Razor','Microsoft.AspNetCore.Razor.Runtime','Microsoft.AspNetCore.Razor',
    'Microsoft.AspNetCore.Html.Abstractions','Microsoft.AspNetCore.Mvc.Core','Microsoft.Extensions.ObjectPool')
$names=@('AutoPerf.Benchmarks.dll','AutoPerf.Benchmarks.pdb','AutoPerf.Benchmarks.runtimeconfig.json','AutoPerf.Benchmarks.deps.json')+
    @($owners|ForEach-Object {"$_.dll";"$_.pdb"})
$identities=@(foreach($name in $names)
{
    $hash=(Get-FileHash (Join-Path $image $name)).Hash
    if($name -notlike 'AutoPerf.*')
    {
        $matches=@($audit.capturedTestAndProducerImage|Where-Object file -CEQ $name)
        if($matches.Count -ne 1 -or $matches[0].sha256 -cne $hash){throw "Frozen producer must match actual tested copy:$name"}
    }
    [pscustomobject]@{file=$name;sha256=$hash}
})
[ordered]@{candidate='F118';variant='original';baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5'
    imageRelative="binaries\$tag";sourceRelative="frozen-source\$tag";fixtureRelative="fixtures\$tag";characterizationRelative="characterization\$tag"
    closureFile="execution-closure-$tag.json";sourceTrackedUnchanged=$true;actualTestedProducerMatches=$true;semanticRows=38
    executionIdentities=$identities;createdAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run $manifestName) -Encoding utf8
node (Join-Path $PSScriptRoot 'F118-closure.mjs') $run $manifestName
if($LASTEXITCODE){throw 'Original whole-image/dependency closure failed.'}
$commands=[System.Collections.Generic.List[object]]::new()
function Invoke-Dotnet([string]$Label,[string[]]$Arguments)
{
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @Arguments *> (Join-Path $directory "$Label.log")
    $code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{label=$Label;entryPoint='dotnet';arguments=$Arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')})
    [ordered]@{candidate='F118';variant='original';commands=$commands}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
    if($code){Get-Content (Join-Path $directory "$Label.log") -Tail 35;throw "Original preparation failed:$Label"}
}
$assembly=Join-Path $image 'AutoPerf.Benchmarks.dll'
Invoke-Dotnet 'create-fixture' @($assembly,'--create-fixture',$fixture)
Invoke-Dotnet 'characterize' @($assembly,'--fixture',$fixture,'--variant','original','--artifacts',$characterization,'--characterize')
foreach($sample in 1..3)
{
    Invoke-Dotnet "cold-state-$sample" @($assembly,'--fixture',$fixture,'--variant','original','--artifacts',(Join-Path $run "cold\$tag-$sample"),'--cold-state')
}
$goalFile=Join-Path $run 'resource-goals.json'
$goals=Get-Content $goalFile -Raw|ConvertFrom-Json
$rows=@(foreach($goal in $goals.goals)
{
    $actual=Get-Content (Join-Path $characterization "states\caliper-$($goal.label).json") -Raw|ConvertFrom-Json
    if($actual.samples.Count -ne $goals.samplesPerGoal){throw 'Every preselected original sample must be present.'}
    foreach($sample in $actual.samples)
    {
        if($sample.operations -ne $goals.operationsPerSample -or $sample.bytesPerOperation -le $goal.maximumBytesPerOperation -or
            $sample.allocatedBytes -ne $sample.operations*$sample.bytesPerOperation){throw "Original expected-red resource goal not established:$($goal.label)/$($sample.sample)"}
    }
    [pscustomobject]@{label=$goal.label;samples=$actual.samples.Count;observedBytesPerOperation=@($actual.samples.bytesPerOperation)
        maximumBytesPerOperation=$goal.maximumBytesPerOperation;everySampleFailsForExpectedAllocation=$true}
})
[ordered]@{candidate='F118';variant='original';allExpectedRed=$true;goalsSha256=(Get-FileHash $goalFile).Hash;goals=$rows;shippingEdited=$false;timingStarted=$false
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run "resource-original-$tag.json") -Encoding utf8
[ordered]@{candidate='F118';variant='original';manifest=$manifestName;imageRelative="binaries\$tag";sourceRelative="frozen-source\$tag"
    fixtureRelative="fixtures\$tag";characterizationRelative="characterization\$tag";closureFile="execution-closure-$tag.json"
    all24ContractsPassed=$true;actualOwningRows=38;all15PreselectedResourceSamplesExpectedRed=$true;coldFreshProcesses=3
    noSourceComparisonsOrTimingYet=$true;readyAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run 'original-ready.json') -Encoding utf8
Write-Output 'F118:24 original contracts,38 actual owning rows,15/15 unchanged expected-red allocation samples,3 fresh-process retained-state probes;original image/fixtures frozen before shipping edits or timing.'
