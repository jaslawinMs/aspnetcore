param([int]$Attempt=1,[switch]$NoRestore)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F001'
$directory=Join-Path $run "build\attempt$Attempt"
if((Test-Path $directory) -or $Attempt -lt 1 -or
    (git branch --show-current).Trim() -cne 'autoperf/F001-webtransport-session-disposal' -or
    (git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or @(git diff --name-only).Count){throw 'Exact independent baseline/new build attempt required.'}
$audit=Get-Content (Join-Path $run 'tests\original\test-audit.json') -Raw|ConvertFrom-Json
if(-not $audit.allPassed -or $audit.actualRows -ne 17 -or $audit.skipped){throw 'Actual scoped original owner tests must pass first.'}
New-Item -ItemType Directory -Path (Join-Path $directory 'source') -Force|Out-Null
$sources=@(foreach($entry in Get-ChildItem (Join-Path $run 'harness') -File)
{
    Copy-Item $entry.FullName (Join-Path $directory "source\$($entry.Name)")
    [ordered]@{file=$entry.Name;sha256=(Get-FileHash $entry.FullName).Hash}
})
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$arguments=@('build',(Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'),'-c','Release','-m:2','-v:quiet','--nologo')
if($NoRestore){$arguments+='--no-restore'}
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log');$code=$LASTEXITCODE
[ordered]@{candidate='F001';entryPoint='dotnet';arguments=$arguments;actualExitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o');sources=$sources
    note='Standalone pinned BDN0.13/net12/C#13 original-only harness. References the captured actual scoped test owner/dependencies,not a shipped framework substitute. New manifest permits initial restore;later corrections use --no-restore.'
}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 30
if($code){throw 'Actual standalone build failed;preserve this attempt/source and repair only the diagnosed error.'}
$bin=Join-Path $run 'harness\bin\Release\net12.0'
$conflicts=@(foreach($file in Get-ChildItem (Join-Path $run 'tests\original\image') -File|Where-Object Extension -In '.dll','.pdb')
{
    $target=Join-Path $bin $file.Name
    if(-not (Test-Path $target)){Copy-Item $file.FullName $target}
    elseif((Get-FileHash $target).Hash -cne (Get-FileHash $file.FullName).Hash)
    {
        if($file.Name -like 'Microsoft.AspNetCore.*' -or $file.Name -in 'InMemory.FunctionalTests.dll','System.IO.Pipelines.dll'){throw "Tested owner mismatch:$($file.Name)"}
        [pscustomobject]@{file=$file.Name;existingSha256=(Get-FileHash $target).Hash;testImageSha256=(Get-FileHash $file.FullName).Hash;action='Preserved existing resolved benchmark dependency;did not overwrite.'}
    }
})
ConvertTo-Json -InputObject @($conflicts) -Depth 6|Set-Content (Join-Path $directory 'test-dependency-copy-conflicts.json') -Encoding utf8
Write-Output "F001:original-only real-owner standalone build attempt$Attempt passed;dependency conflicts recorded without overwriting existing outputs."
