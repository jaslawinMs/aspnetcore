$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F005'
$budget=Get-Content (Join-Path $run 'measurement-budget.json') -Raw|ConvertFrom-Json
if($budget.closed -or $budget.usedComparisons-ne1 -or $budget.originalProfiles-ne1 -or $budget.candidateProfiles-ne1){throw 'Only completed comparison1 and untouched remaining budget permit this harness correction.'}
$harness=Join-Path $run 'harness-small-controls'
$build=Join-Path $run 'build\small-controls-attempt1'
if(Test-Path $build){throw 'Refusing to overwrite an actual build.'}
New-Item $build -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $build 'executed-source.ps1')
Get-ChildItem $harness -File|Where-Object Extension -In '.cs','.csproj'|Copy-Item -Destination $build
$a=@('build',(Join-Path $harness 'AutoPerf.Benchmarks.csproj'),'-c','Release','-m:2','-v:q','-p:UseIisNativeAssets=false',"-p:RestoreConfigFile=$PWD\NuGet.config","-bl:$build\harness-build.binlog")
& dotnet @a *> (Join-Path $build 'harness-build.log')
$code=$LASTEXITCODE
[ordered]@{candidate='F005';purpose='Versioned nearest small-target controls within comparisons2/3,not an extra comparison.';entryPoint='dotnet';arguments=$a;
    actualExitCode=$code;activation='. .\activate.ps1';firstNewHarnessManifestMayRestore=$true;shippingSourceChangedForHarness=$false}|
    ConvertTo-Json -Depth 7|Set-Content (Join-Path $build 'execution.json')
if($code){Get-Content (Join-Path $build 'harness-build.log') -Tail 50;throw 'Actual small-control harness build failed.'}
$compiled=Join-Path $harness 'bin\Release\net12.0'
$candidateManifest=Get-Content (Join-Path $run 'manifest-candidate-1.json') -Raw|ConvertFrom-Json
if((Get-FileHash (Join-Path $compiled 'Microsoft.AspNetCore.Components.Analyzers.dll')).Hash-cne$candidateManifest.ownerSha256){throw 'Candidate owner changed during harness-only build.'}
foreach($role in 'original','candidate-1')
{
    $variant="$role-small-controls"
    $image=Join-Path $run "binaries\$variant"
    $frozen=Join-Path $run "frozen-source\$variant"
    if((Test-Path $image) -or (Test-Path $frozen)){throw 'Refusing to overwrite a frozen image/source version.'}
    $previous=Get-Content (Join-Path $run "manifest-$role.json") -Raw|ConvertFrom-Json
    foreach($file in $previous.files)
    {
        if((Get-FileHash (Join-Path $run "binaries\$role\$($file.relativePath)")).Hash-cne$file.sha256){throw 'Original14-case evidence image changed.'}
    }
    New-Item $image,$frozen -ItemType Directory -Force|Out-Null
    Copy-Item (Join-Path $compiled '*') $image -Recurse
    foreach($name in 'Microsoft.AspNetCore.Components.Analyzers.dll','Microsoft.AspNetCore.Components.Analyzers.pdb')
    {
        Copy-Item (Join-Path $run "binaries\$role\$name") (Join-Path $image $name)
    }
    Copy-Item (Join-Path $run "frozen-source\$role\*") $frozen -Recurse
    Get-ChildItem $harness -File|Where-Object Extension -In '.cs','.csproj'|Copy-Item -Destination (Join-Path $frozen 'harness')
    if((Get-FileHash (Join-Path $frozen 'harness\CompilerSamples.cs')).Hash-cne(Get-FileHash (Join-Path $run "frozen-source\$role\harness\CompilerSamples.cs")).Hash){throw 'Compiler producer input/oracle changed rather than just adding timed controls.'}
    $files=@(Get-ChildItem $image -Recurse -File|ForEach-Object {[ordered]@{relativePath=[IO.Path]::GetRelativePath($image,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
    $sources=@(Get-ChildItem $frozen -Recurse -File|ForEach-Object {[ordered]@{relativePath=[IO.Path]::GetRelativePath($frozen,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
    if($files.Count-ne$previous.files.Count -or $sources.Count-ne$previous.frozenSources.Count){throw 'Frozen file scope changed.'}
    foreach($file in $files|Where-Object relativePath -NotIn 'AutoPerf.Benchmarks.dll','AutoPerf.Benchmarks.pdb')
    {
        $before=@($previous.files|Where-Object relativePath -CEQ $file.relativePath)
        if($before.Count-ne1 -or $before[0].sha256-cne$file.sha256){throw "Unexpected changed non-harness image file:$($file.relativePath)"}
    }
    [ordered]@{candidate='F005';variant=$variant;role=$role;ownerSha256=$previous.ownerSha256;imageRoot=$image;files=$files;frozenSources=$sources;
        harnessReports=18;harnessBuiltAgainst='actual candidate public analyzer contract';ownerReusedByteExactFrom=$role;
        actualTestOutputOwnerMatched=$true;owningTestResultSource="tests\$role";newExistingTestExecutions=0;
        notAnAdditionalSourceComparison=$true;allNonHarnessImageBytesUnchanged=$true;compilerSampleBytesUnchanged=$true}|
        ConvertTo-Json -Depth 8|Set-Content (Join-Path $run "manifest-$variant.json")
}
foreach($name in 'AutoPerf.Benchmarks.dll','AutoPerf.Benchmarks.pdb')
{
    if((Get-FileHash (Join-Path $run "binaries\original-small-controls\$name")).Hash-cne(Get-FileHash (Join-Path $run "binaries\candidate-1-small-controls\$name")).Hash){throw 'Both roles must use identical new harness bytes.'}
}
Write-Output 'F00518-case harness built once;both exact owner variants paired and frozen. Original14-case images retained;no new source candidate,existing test execution or timed comparison.'
