$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$repo=(Get-Location).Path
$run=Join-Path $PSScriptRoot 'autoperf-runs\F010'
$build=Join-Path $run 'builds\original'
$image=Join-Path $run 'images\original'
$legacy=Join-Path $run 'images\legacy-original'
$standard=Join-Path $run 'images\standard-original'
$sources=Join-Path $run 'sources\original'
$characterization=Join-Path $run 'characterization\original'
foreach($path in $build,$image,$legacy,$standard,$sources,$characterization)
{if(Test-Path $path){throw "Preserve actual preparation:$path"}}
$audit=Get-Content (Join-Path $run 'tests\original\actual-test-audit.json') -Raw|ConvertFrom-Json
if($audit.actualTests-ne214 -or $audit.passed-ne214 -or $audit.failed-ne0 -or $audit.skipped-ne0)
{throw 'Actual full existing214 unit cases must all pass before harness preparation.'}
$investigation=Get-Content (Join-Path $run 'current-source-investigation.json') -Raw|ConvertFrom-Json
if((git rev-parse HEAD).Trim()-cne$investigation.baseline -or @(git diff --name-only).Count -or @(git diff --cached --name-only).Count)
{throw 'Unmodified independent baseline required.'}
foreach($source in $investigation.sources)
{if((Get-FileHash $source.file).Hash-cne$source.workingSha256){throw 'Selected original source changed.'}}
New-Item $build -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $build 'executed-source.ps1')
$harness=Join-Path $run 'harness'
Copy-Item (Join-Path $PSScriptRoot 'autoperf-runs\F008\harness\SettingsPreservingEmitToolchain.cs') `
    (Join-Path $harness 'SettingsPreservingEmitToolchain.cs')
[ordered]@{candidate='F010';origin='Unchanged F008 settings-preserving emitted executor,which reused final F007 unchanged executor.';
    sourceSha256=(Get-FileHash (Join-Path $harness 'SettingsPreservingEmitToolchain.cs')).Hash;settingsNotModified=$true}|
    ConvertTo-Json|Set-Content (Join-Path $build 'toolchain-attribution.json')
foreach($kind in 'harness','compatibility','shared')
{
    $snapshot=Join-Path $build "$kind-source"
    New-Item $snapshot -ItemType Directory|Out-Null
    Get-ChildItem (Join-Path $run $kind) -File|Where-Object {$_.Extension-in'.cs','.csproj'}|Copy-Item -Destination $snapshot
}
$commands=[System.Collections.Generic.List[object]]::new()
function InvokeCommand([string]$Label,[string]$EntryPoint,[string[]]$Arguments)
{
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    & $EntryPoint @Arguments *> (Join-Path $build "$Label.log")
    $code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{label=$Label;entryPoint=$EntryPoint;arguments=$Arguments;actualExitCode=$code;
        startedUtc=$start;completedUtc=[DateTimeOffset]::UtcNow.ToString('o')})
    [ordered]@{candidate='F010';variant='original';activation='. .\activate.ps1';commands=$commands}|
        ConvertTo-Json -Depth 8|Set-Content (Join-Path $build 'execution.json')
    Get-Content (Join-Path $build "$Label.log") -Tail 10
    if($code){throw "Original$Label failed;retain failure and repair only observed prerequisite."}
}
$project=Join-Path $harness 'AutoPerf.Benchmarks.csproj'
$compatibility=Join-Path $run 'compatibility\AutoPerf.Compatibility.csproj'
foreach($item in @(@{label='benchmark';project=$project},@{label='compatibility';project=$compatibility}))
{
    InvokeCommand "restore-new-$($item.label)-manifest" 'dotnet' @('restore',$item.project,'--configfile',(Join-Path $repo 'NuGet.config'),
        '-m:2','-v:q','-p:UseIisNativeAssets=false')
}
InvokeCommand 'build-frozen-benchmark' 'dotnet' @('build',$project,'--no-restore','--no-dependencies','-c','Release','-t:Rebuild','-m:2','-v:q',
    '-p:UseIisNativeAssets=false',"-bl:$build\build-frozen-benchmark.binlog")
foreach($tfm in 'net462','net12.0')
{
    InvokeCommand "build-frozen-compatibility-$tfm" 'dotnet' @('build',$compatibility,'--no-restore','--no-dependencies','-c','Release','-f',$tfm,
        '-t:Rebuild','-m:2','-v:q',"-bl:$build\build-frozen-compatibility-$tfm.binlog")
}
foreach($pair in @(@{from=(Join-Path $harness 'bin\Release\net12.0');to=$image;tfm='net12.0'},
    @{from=(Join-Path $run 'compatibility\bin\Release\net462');to=$legacy;tfm='net462'},
    @{from=(Join-Path $run 'compatibility\bin\Release\net12.0');to=$standard;tfm='netstandard2.0'}))
{
    $target=@($audit.ownerTargets|Where-Object targetFramework -CEQ $pair.tfm)
    if($target.Count-ne1){throw 'Unique explicitly built owner TFM required.'}
    foreach($name in 'Microsoft.AspNetCore.Authorization.dll','Microsoft.AspNetCore.Authorization.pdb')
    {
        $expected=if($name.EndsWith('.dll')){$target[0].dllSha256}else{$target[0].pdbSha256}
        $actual=Join-Path $pair.from $name
        if((Get-FileHash $actual).Hash-cne$expected){throw "Actual$($pair.tfm) consumer owner is not exact fresh tested product."}
    }
    New-Item $pair.to -ItemType Directory -Force|Out-Null
    Copy-Item (Join-Path $pair.from '*') $pair.to -Recurse
}
foreach($kind in 'owner','harness','compatibility','test')
{New-Item (Join-Path $sources $kind) -ItemType Directory -Force|Out-Null}
Get-ChildItem 'src\Security\Authorization\Core\src' -File|Where-Object {$_.Extension-in'.cs','.csproj'}|
    Copy-Item -Destination (Join-Path $sources 'owner')
Get-ChildItem $harness -File|Where-Object {$_.Extension-in'.cs','.csproj'}|Copy-Item -Destination (Join-Path $sources 'harness')
Get-ChildItem (Join-Path $run 'shared') -File -Filter '*.cs'|Copy-Item -Destination (Join-Path $sources 'harness')
Get-ChildItem (Join-Path $run 'compatibility') -File|Where-Object {$_.Extension-in'.cs','.csproj'}|
    Copy-Item -Destination (Join-Path $sources 'compatibility')
Get-ChildItem 'src\Security\Authorization\test' -File -Filter '*.cs'|Copy-Item -Destination (Join-Path $sources 'test')
$registry=Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full'
[ordered]@{release=$registry.Release;version=$registry.Version;install=$registry.Install;capturedUtc=[DateTimeOffset]::UtcNow.ToString('o')}|
    ConvertTo-Json|Set-Content (Join-Path $build 'installed-framework-host.json')
if($registry.Release-lt533320 -or $registry.Install-ne1){throw 'Required actual installed .NET Framework4.8.1 host not present.'}
$net462=@($audit.ownerTargets|Where-Object targetFramework -CEQ 'net462')[0]
$netstandard=@($audit.ownerTargets|Where-Object targetFramework -CEQ 'netstandard2.0')[0]
InvokeCommand 'legacy-characterization' (Join-Path $legacy 'AutoPerf.Compatibility.exe') @(
    (Join-Path $run 'characterization\legacy-original'),'original-net462-on-actual-framework48','.NETFramework,Version=v4.6.2',$net462.dllSha256)
InvokeCommand 'standard-characterization' 'dotnet' @((Join-Path $standard 'AutoPerf.Compatibility.dll'),
    (Join-Path $run 'characterization\standard-original'),'original-netstandard2-on-net12','.NETStandard,Version=v2.0',$netstandard.dllSha256)
InvokeCommand 'primary-characterization-and-all-pdb-bindings' 'dotnet' @((Join-Path $image 'AutoPerf.Benchmarks.dll'),'--sources',$sources,
    '--context','original','--test-assembly',(Join-Path $run 'tests\original\test-image\Microsoft.AspNetCore.Authorization.Test.dll'),
    '--legacy-image',$legacy,'--standard-image',$standard,'--characterize','--artifacts',$characterization)
$images=@()
foreach($pair in @(@{role='primary';directory=$image},@{role='legacy';directory=$legacy},@{role='standard';directory=$standard}))
{
    $files=@(Get-ChildItem $pair.directory -Recurse -File|Sort-Object FullName|ForEach-Object{
        @{path=[IO.Path]::GetRelativePath($pair.directory,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
    $images+=@{role=$pair.role;path=$pair.directory;files=$files}
}
$sourceFiles=@(Get-ChildItem $sources -Recurse -File|Sort-Object FullName|ForEach-Object{
    @{path=[IO.Path]::GetRelativePath($sources,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
[ordered]@{candidate='F010';variant='original';baseline=$investigation.baseline;images=$images;sources=$sourceFiles;
    ownerTargets=$audit.ownerTargets;harnessDllSha256=(Get-FileHash (Join-Path $image 'AutoPerf.Benchmarks.dll')).Hash;
    harnessPdbSha256=(Get-FileHash (Join-Path $image 'AutoPerf.Benchmarks.pdb')).Hash;
    benchmarkDotNetSha256=(Get-FileHash (Join-Path $image 'BenchmarkDotNet.dll')).Hash;
    oneCompiledHarnessFrozenBeforeShippingCandidate=$true;timingLaunches=0;boundedPdbSourceWitnessNotWholeSdkProvenance=$true}|
    ConvertTo-Json -Depth 9|Set-Content (Join-Path $run 'manifest-original.json')
Write-Output 'F010 original frozen harness/real legacy/std consumers and all source/PDB/public-service contract checks passed;shipping implementation and timing remain unstarted.'
