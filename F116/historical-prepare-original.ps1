param([ValidateRange(1,10)][int]$Attempt=1,[switch]$ReuseFixture1)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F116'
$tag="original-prep$Attempt"
$image=Join-Path $run "binaries\$tag"
$frozen=Join-Path $run "frozen-source\$tag"
$directory=Join-Path $run "development\$tag"
$fixture=Join-Path $run "fixtures\$tag"
$characterization=Join-Path $run "characterization\$tag"
$manifestName="manifest-$tag.json"
foreach ($file in $image,$frozen,$directory,$fixture,$characterization,(Join-Path $run $manifestName),(Join-Path $run 'original-ready.json'))
{
    if (Test-Path $file) {throw 'Never overwrite an original preparation attempt or frozen readiness receipt.'}
}
if ((git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
    (git branch --show-current).Trim() -cne 'autoperf/F116-boxed-port-cache' -or @(git status --porcelain --untracked-files=no).Count) {throw 'Unchanged independent original branch required.'}
$budget=Get-Content (Join-Path $run 'measurement-budget.json') -Raw|ConvertFrom-Json
if ($budget.startedSourceComparisons -or $budget.originalProfilesStarted -or $budget.candidateProfilesStarted) {throw 'Prepare original contracts/resource proof before source comparison/timing.'}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
New-Item -ItemType Directory -Path $image -Force|Out-Null
Get-ChildItem (Join-Path $run 'harness\bin\Release\net12.0') -Force|Copy-Item -Destination $image -Recurse
New-Item -ItemType Directory -Path (Join-Path $frozen 'harness') -Force|Out-Null
Get-ChildItem (Join-Path $run 'harness') -File|Copy-Item -Destination (Join-Path $frozen 'harness')
Get-ChildItem (Join-Path $run 'producer-source') -Force|Copy-Item -Destination $frozen -Recurse
$audit=Get-Content (Join-Path $run 'tests\original\test-audit.json') -Raw|ConvertFrom-Json
if (-not $audit.allPassed -or $audit.actualRows -ne 31) {throw 'Actual31 existing owning rows required.'}
$owners=@('Microsoft.AspNetCore.Server.Kestrel.Core','Microsoft.AspNetCore.SignalR.Core','Microsoft.AspNetCore.Http.Connections')
$names=@('AutoPerf.Benchmarks.dll','AutoPerf.Benchmarks.pdb','AutoPerf.Benchmarks.runtimeconfig.json','AutoPerf.Benchmarks.deps.json')+
    @($owners|ForEach-Object {"$_.dll";"$_.pdb"})
$identities=@(foreach ($name in $names)
{
    $hash=(Get-FileHash (Join-Path $image $name)).Hash
    if ($name.StartsWith('Microsoft.AspNetCore.'))
    {
        $matches=@($audit.scopes|ForEach-Object {$_.capturedTestAndOwnerImage}|Where-Object file -CEQ $name)
        if (-not $matches.Count -or @($matches|Where-Object sha256 -CNE $hash).Count) {throw "Frozen owner must match all actual tested copies:$name"}
    }
    [pscustomobject]@{file=$name;sha256=$hash}
})
[ordered]@{candidate='F116';variant='original';baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5'
    imageRelative="binaries\$tag";sourceRelative="frozen-source\$tag";fixtureRelative="fixtures\$tag";characterizationRelative="characterization\$tag"
    closureFile="execution-closure-$tag.json";sourceTrackedUnchanged=$true;actualTestedOwnerMatches=$true;semanticRows=31
    executionIdentities=$identities;createdAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $run $manifestName) -Encoding utf8
node (Join-Path $PSScriptRoot 'F116-closure.mjs') $run $manifestName
if ($LASTEXITCODE) {throw 'Original whole-image/dependency closure failed.'}
$commands=[System.Collections.Generic.List[object]]::new()
function Invoke-Dotnet([string]$Label,[string[]]$Arguments)
{
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    dotnet @Arguments *> (Join-Path $directory "$Label.log")
    $code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{label=$Label;entryPoint='dotnet';arguments=$Arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')})
    [ordered]@{candidate='F116';variant='original';commands=$commands}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
    if ($code) {Get-Content (Join-Path $directory "$Label.log") -Tail 30;throw "Original preparation failed:$Label"}
}
$assembly=Join-Path $image 'AutoPerf.Benchmarks.dll'
if ($ReuseFixture1)
{
    Copy-Item (Join-Path $run 'fixtures\original-prep1') $fixture -Recurse
}
else
{
    Invoke-Dotnet 'create-fixture' @($assembly,'--create-fixture',$fixture)
}
Invoke-Dotnet 'characterize' @($assembly,'--fixture',$fixture,'--variant','original','--artifacts',$characterization,'--characterize')
foreach ($sample in 1..3)
{
    Invoke-Dotnet "cold-race-$sample" @($assembly,'--fixture',$fixture,'--variant','original','--artifacts',(Join-Path $run "cold\$tag-$sample"),'--cold-race')
}
$goalFile=Join-Path $run 'resource-goals.json'
$goals=Get-Content $goalFile -Raw|ConvertFrom-Json
$rows=@(foreach ($goal in $goals.goals)
{
    $actual=Get-Content (Join-Path $characterization "states\caliper-$($goal.label).json") -Raw|ConvertFrom-Json
    if ($actual.samples.Count -ne $goals.samplesPerGoal) {throw 'Every preselected original sample must be present.'}
    foreach ($sample in $actual.samples)
    {
        if ($sample.operations -ne $goals.operationsPerSample -or $sample.bytesPerOperation -ne $goal.originalExpectedBytesPerOperation -or
            $sample.bytesPerOperation -le $goal.maximumBytesPerOperation -or
            $sample.allocatedBytes -ne $sample.operations*$sample.bytesPerOperation) {throw "Original expected-red resource goal not established:$($goal.label)/$($sample.sample)"}
    }
    [pscustomobject]@{label=$goal.label;samples=$actual.samples.Count;observedBytesPerOperation=@($actual.samples.bytesPerOperation)
        maximumBytesPerOperation=$goal.maximumBytesPerOperation;everySampleFailsForExpectedAllocation=$true}
})
[ordered]@{candidate='F116';variant='original';allExpectedRed=$true;goalsSha256=(Get-FileHash $goalFile).Hash;goals=$rows
    shippingEdited=$false;timingStarted=$false
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run "resource-original-$tag.json") -Encoding utf8
$cim=Get-CimInstance Win32_Processor|Select-Object Name,NumberOfCores,NumberOfLogicalProcessors
$os=Get-CimInstance Win32_OperatingSystem|Select-Object Caption,Version,TotalVisibleMemorySize,FreePhysicalMemory
[ordered]@{capturedAt=[DateTimeOffset]::UtcNow.ToString('o');processor=$cim;os=$os;claim='Separate read-only CIM point observation,not replacement for BDN Unknown processor metadata. Shared VM,not a dedicated task sandbox;no deliberate process/thread priority,affinity,power or unrelated-process changes.'
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $directory 'machine-observation.json') -Encoding utf8
[ordered]@{candidate='F116';variant='original';manifest=$manifestName;imageRelative="binaries\$tag";sourceRelative="frozen-source\$tag"
    fixtureRelative="fixtures\$tag";characterizationRelative="characterization\$tag";closureFile="execution-closure-$tag.json"
    all24ContractsPassed=$true;actualOwningRows=31;all25PreselectedResourceSamplesExpectedRed=$true;coldFreshProcesses=3
    noSourceComparisonsOrTimingYet=$true;readyAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $run 'original-ready.json') -Encoding utf8
Write-Output 'F116:24 original contracts,31 actual owning rows,25/25 preselected expected-red allocation samples,3 fresh four-port cold races;original image/fixtures frozen before source edits or timing.'
