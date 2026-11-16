param([int]$Attempt=1,[switch]$NoRestore)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F118'
$directory=Join-Path $run "build\attempt$Attempt"
if ((Test-Path $directory) -or $Attempt -lt 1 -or
    (git branch --show-current).Trim() -cne 'autoperf/F118-url-resolution-writer' -or
    (git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5') {throw 'Exact independent baseline/new build attempt required.'}
New-Item -ItemType Directory -Path (Join-Path $directory 'source') -Force|Out-Null
$sources=@(foreach($entry in Get-ChildItem (Join-Path $run 'harness') -File)
{
    Copy-Item $entry.FullName (Join-Path $directory "source\$($entry.Name)")
    [ordered]@{file=$entry.Name;sha256=(Get-FileHash $entry.FullName).Hash}
})
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$arguments=@('build',(Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'),'-c','Release','-m:2','-p:UseIisNativeAssets=false','-v:quiet','--nologo')
if($NoRestore){$arguments+='--no-restore'}
$start=[DateTimeOffset]::UtcNow.ToString('o')
& dotnet @arguments *> (Join-Path $directory 'console.log');$code=$LASTEXITCODE
[ordered]@{candidate='F118';entryPoint='dotnet';arguments=$arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o');sources=$sources
    note='Standalone pinned BDN0.13/net12/C#13 harness with actual in-tree Mvc.Razor project and scoped tested dependency closure. New manifest permits initial restore;later corrections use --no-restore.'}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 30
if($code){throw 'Actual harness build failed;preserve this attempt/source and repair only the diagnosed error.'}
Write-Output "F118:standalone actual-owner harness build attempt$Attempt passed."
