param([int]$Attempt=1)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$repo=[string]$PWD
$run=Join-Path $PSScriptRoot 'autoperf-runs\F007'
$harness=Join-Path $run 'harness'
$build=Join-Path $run "build\original-attempt$Attempt"
$image=Join-Path $run 'binaries\original'
$frozen=Join-Path $run 'frozen-source\original'
if((Test-Path $build) -or (Test-Path $image) -or (Test-Path $frozen) -or
    (git rev-parse HEAD).Trim()-cne'37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
    @(git status --porcelain --untracked-files=no).Count){throw 'Fresh attempt/image/source and unchanged independent original required.'}
New-Item $build -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $build 'executed-source.ps1')
$borrow=Join-Path $PSScriptRoot 'autoperf-runs\F002\harness\SettingsPreservingEmitToolchain.cs'
$target=Join-Path $harness 'SettingsPreservingEmitToolchain.cs'
if((Get-FileHash $borrow).Hash-cne(Get-FileHash $target).Hash){throw 'Exact attributed settings-preserving executor required.'}
[ordered]@{borrowedFrom=$borrow;sha256=(Get-FileHash $target).Hash;exactUnmodifiedCopy=$true;notARerunOfFinalizedF002=$true}|
    ConvertTo-Json|Set-Content (Join-Path $build 'executor-provenance.json')
Get-ChildItem $harness -File|Where-Object Extension -In '.cs','.csproj'|Copy-Item -Destination $build
$project=Join-Path $harness 'AutoPerf.Benchmarks.csproj'
$a=@('build',$project,'-c','Release','-m:2','-v:q','-p:UseIisNativeAssets=false',"-p:RestoreConfigFile=$repo\NuGet.config","-bl:$build\harness-build.binlog")
if($Attempt-ne1){$a+='--no-restore'}
& dotnet @a *> (Join-Path $build 'harness-build.log')
$code=$LASTEXITCODE
[ordered]@{candidate='F007';variant='original';attempt=$Attempt;entryPoint='dotnet';arguments=$a;actualExitCode=$code;
    activation='. .\activate.ps1';firstNewHarnessManifestMayRestore=($Attempt-eq1);harnessCompiledOnceForAllOwnerRoles=$true}|
    ConvertTo-Json -Depth 7|Set-Content (Join-Path $build 'execution.json')
if($code-ne0)
{
    Get-Content (Join-Path $build 'harness-build.log') -Tail 60
    throw "Actual harness build failed with exit$code."
}
New-Item $image -ItemType Directory -Force|Out-Null
Copy-Item (Join-Path $harness 'bin\Release\net12.0\*') $image -Recurse
New-Item (Join-Path $frozen 'harness'),(Join-Path $frozen 'owner'),(Join-Path $frozen 'test') -ItemType Directory -Force|Out-Null
Get-ChildItem $harness -File|Where-Object Extension -In '.cs','.csproj'|Copy-Item -Destination (Join-Path $frozen 'harness')
$sources=@(
    'src\Components\Server\src\Circuits\ServerComponentDeserializer.cs',
    'src\Components\Server\src\Circuits\IServerComponentDeserializer.cs',
    'src\Components\Server\src\Circuits\ComponentParameterDeserializer.cs',
    'src\Components\Server\src\CircuitRootComponentOptions.cs',
    'src\Components\Shared\src\RootComponentOperation.cs',
    'src\Components\Shared\src\RootComponentOperationBatch.cs',
    'src\Components\Shared\src\RootComponentOperationType.cs',
    'src\Components\Shared\src\RootTypeCache.cs',
    'src\Components\Shared\src\ComponentParametersTypeCache.cs',
    'src\Components\Shared\src\WebRootComponentParameters.cs',
    'src\Components\Shared\src\WebRootComponentManager.cs',
    'src\Shared\Components\ComponentMarker.cs',
    'src\Shared\Components\ServerComponent.cs',
    'src\Shared\Components\ComponentParameter.cs',
    'src\Shared\Components\ServerComponentSerializationSettings.cs',
    'src\Shared\Components\ServerComponentSerializer.cs',
    'src\Shared\Components\ServerComponentInvocationSequence.cs',
    'src\Components\Server\src\Microsoft.AspNetCore.Components.Server.csproj')
foreach($source in $sources){Copy-Item (Join-Path $repo $source) (Join-Path $frozen 'owner')}
$tests=@('ServerComponentDeserializerTest.cs','ServerComponentDeserializerTest.Unions.cs')
foreach($test in $tests){Copy-Item (Join-Path $repo "src\Components\Server\test\Circuits\$test") (Join-Path $frozen 'test')}
$testDirectory=Join-Path $run 'tests\original'
$testAudit=Get-Content (Join-Path $testDirectory 'actual-test-audit.json') -Raw|ConvertFrom-Json
$ownerHash=(Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.Components.Server.dll')).Hash
$ownerPdbHash=(Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.Components.Server.pdb')).Hash
if($ownerHash-cne$testAudit.binaryHashes[0].sha256 -or $ownerPdbHash-cne$testAudit.binaryHashes[1].sha256){throw 'Frozen owner differs from freshly tested original.'}
New-Item (Join-Path $testDirectory 'test-image') -ItemType Directory|Out-Null
foreach($name in 'Microsoft.AspNetCore.Components.Server.Tests.dll','Microsoft.AspNetCore.Components.Server.Tests.pdb','Microsoft.AspNetCore.Components.Server.Tests.deps.json','Microsoft.AspNetCore.Components.Server.Tests.runtimeconfig.json')
{
    Copy-Item (Join-Path $repo "artifacts\bin\Microsoft.AspNetCore.Components.Server.Tests\Release\net12.0\$name") (Join-Path $testDirectory 'test-image')
}
$files=@(Get-ChildItem $image -File -Recurse|ForEach-Object {[ordered]@{relativePath=[IO.Path]::GetRelativePath($image,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
$frozenSources=@(Get-ChildItem $frozen -File -Recurse|ForEach-Object {[ordered]@{relativePath=[IO.Path]::GetRelativePath($frozen,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
[ordered]@{candidate='F007';variant='original';ownerSha256=$ownerHash;ownerPdbSha256=$ownerPdbHash;imageRoot=$image;files=$files;frozenSources=$frozenSources;
    selectedOwnerSourceMappings=$sources;actualTestOutputOwnerMatched=$true;harnessCompiledOnceForAllOwnerRoles=$true;expectedBenchmarkReports=22;
    sourceProvenanceBoundary='18 selected owner/context source files,not complete SDK/native/full-assembly-source provenance.'}|
    ConvertTo-Json -Depth 7|Set-Content (Join-Path $run 'manifest-original.json')
Write-Output "F007 original:standalone harness built/frozen,$($files.Count) image files/$($frozenSources.Count) exact sources;freshly tested actual owner matched."
