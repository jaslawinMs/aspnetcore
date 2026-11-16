$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F116'
$original=Get-Content (Join-Path $run 'original-ready.json') -Raw|ConvertFrom-Json
$directory=Join-Path $run 'development\candidate1-preparation'
$image=Join-Path $run 'binaries\candidate1'
$frozen=Join-Path $run 'frozen-source\candidate1'
$characterization=Join-Path $run 'characterization\candidate1'
foreach ($file in $directory,$image,$frozen,$characterization,(Join-Path $run 'candidate1-ready.json'),(Join-Path $run 'manifest-candidate1.json'))
{
    if (Test-Path $file) {throw 'Never overwrite candidate preparation/image/evidence.'}
}
$changes=@(git diff --name-only)
if ($changes.Count -ne 1 -or $changes[0] -cne 'src/Shared/ConnectionEndpointTags.cs' -or
    (git branch --show-current).Trim() -cne 'autoperf/F116-boxed-port-cache' -or
    (git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5') {throw 'Only the registered independent shared-source candidate is permitted.'}
$registration=Get-Content (Join-Path $run 'candidate1-source-registration.json') -Raw|ConvertFrom-Json
if ((Get-FileHash 'src\Shared\ConnectionEndpointTags.cs').Hash -cne $registration.sourceSha256) {throw 'Registered source shape changed.'}
$audit=Get-Content (Join-Path $run 'tests\candidate1\test-audit.json') -Raw|ConvertFrom-Json
if (-not $audit.allPassed -or $audit.actualRows -ne 31) {throw 'All actual31 candidate owning rows required.'}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
Copy-Item (Join-Path $run $original.imageRelative) $image -Recurse
Copy-Item (Join-Path $run $original.sourceRelative) $frozen -Recurse
Copy-Item 'src\Shared\ConnectionEndpointTags.cs' (Join-Path $frozen 'src\Shared\ConnectionEndpointTags.cs')
$owners=@('Microsoft.AspNetCore.Server.Kestrel.Core','Microsoft.AspNetCore.SignalR.Core','Microsoft.AspNetCore.Http.Connections')
foreach ($owner in $owners)
{
    foreach ($extension in '.dll','.pdb')
    {
        $name=$owner+$extension
        $tested=Join-Path $run "tests\candidate1\image-signalr\$name"
        $hash=(Get-FileHash $tested).Hash
        $matches=@($audit.scopes|ForEach-Object {$_.capturedTestAndOwnerImage}|Where-Object file -CEQ $name)
        if (-not $matches.Count -or @($matches|Where-Object sha256 -CNE $hash).Count) {throw "Every actual tested owner must agree:$name"}
        Copy-Item $tested (Join-Path $image $name)
    }
}
$originalImage=Join-Path $run $original.imageRelative
$changes=@(Get-ChildItem $image -Recurse -File|ForEach-Object
{
    $relative=[IO.Path]::GetRelativePath($image,$_.FullName)
    if ((Get-FileHash $_.FullName).Hash -cne (Get-FileHash (Join-Path $originalImage $relative)).Hash) {$relative}
})
$expected=@($owners|ForEach-Object {"$_.dll";"$_.pdb"})
if (@(Compare-Object @($changes|Sort-Object) @($expected|Sort-Object)).Count) {throw 'Only six actual owning DLL/PDB files may differ;harness/runtime/deps/other files must remain byte-identical.'}
$names=@('AutoPerf.Benchmarks.dll','AutoPerf.Benchmarks.pdb','AutoPerf.Benchmarks.runtimeconfig.json','AutoPerf.Benchmarks.deps.json')+$expected
$identities=@($names|ForEach-Object {[pscustomobject]@{file=$_;sha256=(Get-FileHash (Join-Path $image $_)).Hash}})
[ordered]@{candidate='F116';variant='candidate1';baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5';builtFromUncommittedRegisteredSource=$true
    imageRelative='binaries\candidate1';sourceRelative='frozen-source\candidate1';fixtureRelative=$original.fixtureRelative
    characterizationRelative='characterization\candidate1';closureFile='execution-closure-candidate1.json';sourceSha256=$registration.sourceSha256
    actualTestedOwnerMatches=$true;semanticRows=31;onlyChangedApplicationFiles=$changes;executionIdentities=$identities
    sameFrozenHarnessRuntimeDependenciesFixtures=$true;createdAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run 'manifest-candidate1.json') -Encoding utf8
node (Join-Path $PSScriptRoot 'F116-closure.mjs') $run 'manifest-candidate1.json'
if ($LASTEXITCODE) {throw 'Exact candidate application/runtime closure failed.'}
$commands=[System.Collections.Generic.List[object]]::new()
function Invoke-Dotnet([string]$Label,[string[]]$Arguments)
{
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    dotnet @Arguments *> (Join-Path $directory "$Label.log")
    $code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{label=$Label;entryPoint='dotnet';arguments=$Arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')})
    [ordered]@{candidate='F116';variant='candidate1';commands=$commands}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
    if ($code) {Get-Content (Join-Path $directory "$Label.log") -Tail 30;throw "Candidate preparation failed:$Label"}
}
$assembly=Join-Path $image 'AutoPerf.Benchmarks.dll'
$fixture=Join-Path $run $original.fixtureRelative
Invoke-Dotnet 'characterize' @($assembly,'--fixture',$fixture,'--variant','candidate1','--artifacts',$characterization,'--characterize')
foreach ($sample in 1..3)
{
    Invoke-Dotnet "cold-race-$sample" @($assembly,'--fixture',$fixture,'--variant','candidate1','--artifacts',(Join-Path $run "cold\candidate1-$sample"),'--cold-race')
}
$goalFile=Join-Path $run 'resource-goals.json'
$goals=Get-Content $goalFile -Raw|ConvertFrom-Json
$originalResources=Get-Content (Join-Path $run "resource-original-original-prep2.json") -Raw|ConvertFrom-Json
if ($originalResources.goalsSha256 -cne (Get-FileHash $goalFile).Hash -or -not $originalResources.allExpectedRed) {throw 'Frozen goals/expected-red original proof changed.'}
$rows=@(foreach ($goal in $goals.goals)
{
    $actual=Get-Content (Join-Path $characterization "states\caliper-$($goal.label).json") -Raw|ConvertFrom-Json
    if ($actual.samples.Count -ne $goals.samplesPerGoal) {throw 'Every preselected candidate resource row required.'}
    foreach ($sample in $actual.samples)
    {
        if ($sample.operations -ne $goals.operationsPerSample -or $sample.bytesPerOperation -gt $goal.maximumBytesPerOperation -or
            $sample.allocatedBytes -ne $sample.operations*$sample.bytesPerOperation) {throw "Candidate resource goal not green:$($goal.label)/$($sample.sample)"}
    }
    [pscustomobject]@{label=$goal.label;samples=$actual.samples.Count;observedBytesPerOperation=@($actual.samples.bytesPerOperation)
        maximumBytesPerOperation=$goal.maximumBytesPerOperation;everySamplePasses=$true}
})
[ordered]@{candidate='F116';variant='candidate1';allGreen=$true;goalsSha256=(Get-FileHash $goalFile).Hash;goals=$rows;goalsRetuned=$false
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run 'resource-candidate1.json') -Encoding utf8
[ordered]@{candidate='F116';variant='candidate1';manifest='manifest-candidate1.json';imageRelative='binaries\candidate1';sourceRelative='frozen-source\candidate1'
    fixtureRelative=$original.fixtureRelative;characterizationRelative='characterization\candidate1';closureFile='execution-closure-candidate1.json'
    all24ContractsPassed=$true;actualOwningRows=31;all25UnchangedResourceSamplesGreen=$true;coldFreshProcesses=3
    onlySixTestedOwnerFilesChanged=$true;readyAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run 'candidate1-ready.json') -Encoding utf8
Write-Output 'F116:candidate1 all24 contracts,31 owning rows,25/25 unchanged resource goals green,three fresh four-port cold observations;only six actual tested owner DLL/PDB files differ in frozen233-file image.'
