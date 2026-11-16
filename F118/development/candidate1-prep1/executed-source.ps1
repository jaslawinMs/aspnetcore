$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F118'
$original=Get-Content (Join-Path $run 'original-ready.json') -Raw|ConvertFrom-Json
$tag='candidate1-prep1'
$image=Join-Path $run "binaries\$tag"
$frozen=Join-Path $run "frozen-source\$tag"
$directory=Join-Path $run "development\$tag"
$characterization=Join-Path $run "characterization\$tag"
$fixture=Join-Path $run $original.fixtureRelative
$source='src\Mvc\Mvc.Razor\src\TagHelpers\UrlResolutionTagHelper.cs'
foreach($file in $image,$frozen,$directory,$characterization,(Join-Path $run 'candidate1-ready.json'))
{
    if(Test-Path $file){throw 'Never overwrite candidate preparation,images or readiness.'}
}
if((git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
    (git branch --show-current).Trim() -cne 'autoperf/F118-url-resolution-writer' -or
    @(git diff --name-only).Count -ne 1 -or (git diff --name-only).Trim().Replace('/','\') -cne $source){throw 'Only planned exact shipping seam may change.'}
$budgetFile=Join-Path $run 'measurement-budget.json'
$budget=Get-Content $budgetFile -Raw|ConvertFrom-Json
if($budget.startedSourceComparisons -or $budget.originalProfilesStarted -or $budget.candidateProfilesStarted -or $budget.candidateSourceShapes.Count){throw 'First and only source shape,zero timing required for this preparation.'}
$originalPdb=Get-Content (Join-Path $run 'pdb\original\document-audit.json') -Raw|ConvertFrom-Json
$originalResource=Get-Content (Join-Path $run "resource-original-$($original.imageRelative.Split('\')[-1]).json") -Raw|ConvertFrom-Json
if($originalPdb.verifiedDocuments -ne 24 -or -not $originalResource.allExpectedRed){throw 'Original24 PDB documents/all15 unchanged expected-red samples required.'}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
Copy-Item (Join-Path $run $original.imageRelative) $image -Recurse
Copy-Item (Join-Path $run $original.sourceRelative) $frozen -Recurse
Copy-Item $source (Join-Path $frozen $source)
$patch=Join-Path $directory 'candidate-source.patch'
& git diff --binary "--output=$patch"
if($LASTEXITCODE){throw 'Actual candidate source diff capture failed.'}
$audit=Get-Content (Join-Path $run 'tests\candidate1\test-audit.json') -Raw|ConvertFrom-Json
if(-not $audit.allPassed -or $audit.actualRows -ne 38 -or $audit.skipped){throw 'Actual38 unchanged candidate owning rows required.'}
foreach($name in 'Microsoft.AspNetCore.Mvc.Razor.dll','Microsoft.AspNetCore.Mvc.Razor.pdb')
{
    Copy-Item (Join-Path $run "tests\candidate1\image\$name") (Join-Path $image $name)
}
$originalManifest=Get-Content (Join-Path $run $original.manifest) -Raw|ConvertFrom-Json
$identities=@(foreach($row in $originalManifest.executionIdentities)
{
    $hash=(Get-FileHash (Join-Path $image $row.file)).Hash
    if($row.file -notlike 'AutoPerf.*')
    {
        $matches=@($audit.capturedTestAndProducerImage|Where-Object file -CEQ $row.file)
        if($matches.Count -ne 1 -or $matches[0].sha256 -cne $hash){throw "Frozen producer must match actual tested candidate copy:$($row.file)"}
    }
    [pscustomobject]@{file=$row.file;sha256=$hash}
})
$manifestName="manifest-$tag.json"
[ordered]@{candidate='F118';variant='candidate1';baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5'
    imageRelative="binaries\$tag";sourceRelative="frozen-source\$tag";fixtureRelative=$original.fixtureRelative;characterizationRelative="characterization\$tag"
    closureFile="execution-closure-$tag.json";actualTestedProducerMatches=$true;semanticRows=38;executionIdentities=$identities
    sourceSha256=(Get-FileHash $source).Hash;createdAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run $manifestName) -Encoding utf8
node (Join-Path $PSScriptRoot 'F118-closure.mjs') $run $manifestName
if($LASTEXITCODE){throw 'Candidate whole-image/dependency closure failed.'}
$oldClosure=Get-Content (Join-Path $run $original.closureFile) -Raw|ConvertFrom-Json
$newClosure=Get-Content (Join-Path $run "execution-closure-$tag.json") -Raw|ConvertFrom-Json
$differences=@(foreach($row in $oldClosure.files)
{
    $matching=@($newClosure.files|Where-Object file -CEQ $row.file)
    if($matching.Count -ne 1){throw 'Exact same complete image file set required.'}
    if($matching[0].sha256 -cne $row.sha256){[pscustomobject]@{file=$row.file;original=$row.sha256;candidate1=$matching[0].sha256}}
})
if($oldClosure.copiedFiles -ne $newClosure.copiedFiles -or $differences.Count -ne 2 -or
    @($differences|Where-Object file -CNotIn 'Microsoft.AspNetCore.Mvc.Razor.dll','Microsoft.AspNetCore.Mvc.Razor.pdb').Count){throw 'Only tested Mvc.Razor DLL/PDB may differ across entire frozen images.'}
[ordered]@{candidate='F118';frozenFiles=$newClosure.copiedFiles;declaredRuntimeAssets=$newClosure.declaredRuntimeAssets;differences=$differences
    identicalHarnessFixturesAndDependencies=$true
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run 'image-comparison.json') -Encoding utf8
$commands=[System.Collections.Generic.List[object]]::new()
function Invoke-Dotnet([string]$Label,[string[]]$Arguments)
{
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @Arguments *> (Join-Path $directory "$Label.log")
    $code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{label=$Label;entryPoint='dotnet';arguments=$Arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')})
    [ordered]@{candidate='F118';variant='candidate1';commands=$commands}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
    if($code){Get-Content (Join-Path $directory "$Label.log") -Tail 35;throw "Candidate preparation failed:$Label"}
}
$assembly=Join-Path $image 'AutoPerf.Benchmarks.dll'
Invoke-Dotnet 'characterize' @($assembly,'--fixture',$fixture,'--variant','candidate1','--artifacts',$characterization,'--characterize')
foreach($sample in 1..3)
{
    $artifacts=Join-Path $run "cold\$tag-$sample"
    Invoke-Dotnet "cold-state-$sample" @($assembly,'--fixture',$fixture,'--variant','candidate1','--artifacts',$artifacts,'--cold-state')
    $cold=Get-Content (Join-Path $artifacts 'states\cold-state.json') -Raw|ConvertFrom-Json
    if(-not $cold.afterFirst.present -or $cold.afterFirst.slots.Count -lt 1 -or -not $cold.afterOversized.present -or $cold.afterOversized.slots.Count){throw 'Actual first buffered render/oversize discard retained-state witness differs.'}
}
$goalFile=Join-Path $run 'resource-goals.json'
if((Get-FileHash $goalFile).Hash -cne $originalResource.goalsSha256){throw 'Never retune preselected absolute resource goals.'}
$goals=Get-Content $goalFile -Raw|ConvertFrom-Json
$rows=@(foreach($goal in $goals.goals)
{
    $actual=Get-Content (Join-Path $characterization "states\caliper-$($goal.label).json") -Raw|ConvertFrom-Json
    if($actual.samples.Count -ne $goals.samplesPerGoal){throw 'All preselected candidate resource samples required.'}
    foreach($sample in $actual.samples)
    {
        if($sample.operations -ne $goals.operationsPerSample -or $sample.bytesPerOperation -gt $goal.maximumBytesPerOperation -or
            $sample.allocatedBytes -ne $sample.operations*$sample.bytesPerOperation){throw "Unchanged candidate allocation goal failed:$($goal.label)/$($sample.sample)"}
    }
    [pscustomobject]@{label=$goal.label;samples=$actual.samples.Count;observedBytesPerOperation=@($actual.samples.bytesPerOperation)
        maximumBytesPerOperation=$goal.maximumBytesPerOperation;everySamplePasses=$true}
})
[ordered]@{candidate='F118';variant='candidate1';allGreen=$true;goalsSha256=(Get-FileHash $goalFile).Hash;goals=$rows;timingStarted=$false
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run 'resource-candidate1.json') -Encoding utf8
[ordered]@{candidate='F118';variant='candidate1';manifest=$manifestName;imageRelative="binaries\$tag";sourceRelative="frozen-source\$tag"
    fixtureRelative=$original.fixtureRelative;characterizationRelative="characterization\$tag";closureFile="execution-closure-$tag.json"
    all24ContractsPassed=$true;actualOwningRows=38;all15UnchangedResourceSamplesGreen=$true;coldFreshProcesses=3
    noSourceComparisonsOrTimingYet=$true;readyAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run 'candidate1-ready.json') -Encoding utf8
$budget.candidateSourceShapes=@([ordered]@{variant='candidate1';file=$source;sourceSha256=(Get-FileHash $source).Hash;registeredAt=[DateTimeOffset]::UtcNow.ToString('o')
    shape='Existing public bounded StringBuilder policy/private static pool;fresh StringWriter(builder) per call;original using block/locals preserved inside try/finally Return. No public API,dependency,constructor or fast-path edits.'})
$budget|ConvertTo-Json -Depth 9|Set-Content $budgetFile -Encoding utf8
Write-Output 'F118:candidate38 owning rows,24 frozen contracts,15/15 unchanged resource goals green,3 fresh-process cleared/bounded/oversize-discard probes;only tested Mvc.Razor DLL/PDB differ.'
