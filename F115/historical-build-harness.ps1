$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F115'
$directory=Join-Path $run 'development\harness-build-initial'
if (Test-Path $directory) {throw 'Never overwrite the actual F115 initial harness build.'}
New-Item -ItemType Directory -Path (Join-Path $directory 'source') -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
Get-ChildItem (Join-Path $run 'harness') -File|Copy-Item -Destination (Join-Path $directory 'source')
$arguments=@('build',(Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'),'-c','Release','-m:2',
    '-p:BuildProjectReferences=false','-p:UseIisNativeAssets=false','-p:RestoreDisableParallel=true','-v:minimal')
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log');$code=$LASTEXITCODE
[ordered]@{candidate='F115';entryPoint='dotnet';arguments=$arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    restoreReason='New standalone dependency manifest;initial implicit restore permitted. No repository manifests or dependencies changed.'
}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 18
if ($code) {throw 'Actual initial F115 harness build failed;preserve this attempt.'}
