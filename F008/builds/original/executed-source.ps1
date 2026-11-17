$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$repo=(Get-Location).Path
$run=Join-Path $PSScriptRoot 'autoperf-runs\F008'
$build=Join-Path $run 'builds\original'
$image=Join-Path $run 'images\original'
$sources=Join-Path $run 'sources\original'
$characterization=Join-Path $run 'characterization\original'
foreach($path in $build,$image,$sources,$characterization)
{
    if(Test-Path $path){throw "Preserve existing actual preparation:$path"}
}
$testAudit=Get-Content (Join-Path $run 'tests\original\actual-test-audit.json') -Raw|ConvertFrom-Json
if($testAudit.actualTests-ne40 -or $testAudit.passed-ne40 -or $testAudit.skipped-ne0){throw 'Actual existing40 unit cases required.'}
$investigation=Get-Content (Join-Path $run 'current-source-investigation.json') -Raw|ConvertFrom-Json
if((git rev-parse HEAD).Trim()-cne$investigation.baseline -or @(git diff --name-only).Count){throw 'Independent unmodified baseline required.'}
foreach($source in $investigation.sources)
{
    if((Get-FileHash $source.file).Hash-cne$source.workingSha256){throw 'Selected original source changed.'}
}
New-Item $build -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $build 'executed-source.ps1')
$harness=Join-Path $run 'harness'
Copy-Item (Join-Path $PSScriptRoot 'autoperf-runs\F007\harness\SettingsPreservingEmitToolchain.cs') `
    (Join-Path $harness 'SettingsPreservingEmitToolchain.cs')
[ordered]@{candidate='F008';origin='Final F007 unchanged settings-preserving in-process emitted executor;original attribution retained in published history.';
    sourceSha256=(Get-FileHash (Join-Path $harness 'SettingsPreservingEmitToolchain.cs')).Hash;
    noPowerPriorityAffinityChanges=$true}|ConvertTo-Json|Set-Content (Join-Path $build 'toolchain-attribution.json')
$commands=[System.Collections.Generic.List[object]]::new()
function InvokeDotnet([string]$Label,[string[]]$Arguments)
{
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @Arguments *> (Join-Path $build "$Label.log")
    $code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{label=$Label;entryPoint='dotnet';arguments=$Arguments;actualExitCode=$code;
        startedUtc=$start;completedUtc=[DateTimeOffset]::UtcNow.ToString('o')})
    [ordered]@{candidate='F008';variant='original';activation='. .\activate.ps1';commands=$commands}|
        ConvertTo-Json -Depth 8|Set-Content (Join-Path $build 'execution.json')
    Get-Content (Join-Path $build "$Label.log") -Tail 10
    if($code){throw "Original$Label failed;retain failure and repair only the supported prerequisite."}
}
$project=Join-Path $harness 'AutoPerf.Benchmarks.csproj'
$restored=Join-Path $run 'builds\original-attempt-2'
$restoredProject=Join-Path $restored 'harness-source\AutoPerf.Benchmarks.csproj'
$reusedRestore=$false
if((Test-Path $restoredProject) -and (Test-Path (Join-Path $harness 'obj\project.assets.json')) -and
    (Get-FileHash $restoredProject).Hash-ceq(Get-FileHash $project).Hash)
{
    $previous=Get-Content (Join-Path $restored 'execution.json') -Raw|ConvertFrom-Json
    if(@($previous.commands|Where-Object {$_.label-ceq'restore-new-harness-manifest' -and $_.actualExitCode-eq0}).Count-ne1)
    {throw 'Exact prior successful restore must be preserved before reusing its unchanged manifest.'}
    [ordered]@{candidate='F008';actualRestoreRepeated=$false;manifestSha256=(Get-FileHash $project).Hash;
        priorExecution='builds\original-attempt-2\execution.json';allTrackedProjectReferencesAtSameBaseline=$true;
        reason='Only three C# collection expressions changed;exact manifest already restored successfully,no missing dependency.'}|
        ConvertTo-Json|Set-Content (Join-Path $build 'reused-restore.json')
    $reusedRestore=$true
}
if(-not$reusedRestore)
{
    InvokeDotnet 'restore-new-harness-manifest' @('restore',$project,'--configfile',(Join-Path $repo 'NuGet.config'),'-m:2','-v:q','-p:UseIisNativeAssets=false')
}
InvokeDotnet 'build-harness' @('build',$project,'--no-restore','--no-dependencies','-c','Release','-t:Rebuild','-m:2','-v:q',
    '-p:UseIisNativeAssets=false',"-bl:$build\build-harness.binlog")
$output=Join-Path $harness 'bin\Release\net12.0'
foreach($file in $testAudit.binaryHashes)
{
    if((Get-FileHash $file.path).Hash-cne$file.sha256 -or
        (Get-FileHash (Join-Path $output (Split-Path $file.path -Leaf))).Hash-cne$file.sha256){throw 'Diagnostic owner must be exact freshly tested original.'}
}
New-Item $image -ItemType Directory -Force|Out-Null
Copy-Item (Join-Path $output '*') $image -Recurse
foreach($kind in 'owner','harness','test')
{
    New-Item (Join-Path $sources $kind) -ItemType Directory -Force|Out-Null
}
Get-ChildItem 'src\Middleware\Localization\src' -File|Where-Object {$_.Extension-in'.cs','.csproj'}|
    Copy-Item -Destination (Join-Path $sources 'owner')
Get-ChildItem $harness -File|Where-Object {$_.Extension-in'.cs','.csproj'}|
    Copy-Item -Destination (Join-Path $sources 'harness')
Get-ChildItem 'src\Middleware\Localization\test\UnitTests' -File -Filter '*.cs'|
    Copy-Item -Destination (Join-Path $sources 'test')
$files=@(Get-ChildItem $image -Recurse -File|Sort-Object FullName|ForEach-Object{
    @{path=[IO.Path]::GetRelativePath($image,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
$sourceFiles=@(Get-ChildItem $sources -Recurse -File|Sort-Object FullName|ForEach-Object{
    @{path=[IO.Path]::GetRelativePath($sources,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
[ordered]@{candidate='F008';variant='original';baseline=$investigation.baseline;sourceCandidateShapes=0;pairedComparisons=0;
    files=$files;sources=$sourceFiles;ownerDllSha256=(Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.Localization.dll')).Hash;
    ownerPdbSha256=(Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.Localization.pdb')).Hash;
    harnessDllSha256=(Get-FileHash (Join-Path $image 'AutoPerf.Benchmarks.dll')).Hash;
    harnessPdbSha256=(Get-FileHash (Join-Path $image 'AutoPerf.Benchmarks.pdb')).Hash;
    benchmarkDotNetSha256=(Get-FileHash (Join-Path $image 'BenchmarkDotNet.dll')).Hash;
    boundedSelectedSourcePdbEvidenceNotWholeSdkProvenance=$true}|
    ConvertTo-Json -Depth 8|Set-Content (Join-Path $run 'manifest-original.json')
InvokeDotnet 'characterization' @((Join-Path $image 'AutoPerf.Benchmarks.dll'),'--sources',$sources,'--context','original',
    '--test-assembly',(Join-Path $run 'tests\original\test-image\Microsoft.AspNetCore.Localization.Tests.dll'),
    '--characterize','--artifacts',$characterization)
Write-Output "F008 original image frozen:$($files.Count) files/$($sourceFiles.Count) source snapshots;actual owner tests/untimed contract/setup paths complete."
