param([int]$Attempt=1,[switch]$NoRestore)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F002'
$directory=Join-Path $run "build\attempt$Attempt"
if((Test-Path $directory) -or $Attempt -lt 1 -or
    (git branch --show-current).Trim() -cne 'autoperf/F002-webtransport-stream-removal' -or
    (git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or @(git diff --name-only).Count){throw 'Exact independent baseline/new build attempt required.'}
$base=Get-Content (Join-Path $run 'base-image-ready.json') -Raw|ConvertFrom-Json
if($base.borrowedTestRows -ne 17 -or $base.newExistingTestExecutions -ne 0 -or $base.actualQuicPdbDocumentChecks.Count -ne 2){throw 'Explicit tested baseline and actual source-identified QUIC image required.'}
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
[ordered]@{
    candidate='F002';entryPoint='dotnet';arguments=$arguments;actualExitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o');sources=$sources
    note='Original-only pinned BDN0.13/net12/C#13,explicit borrowed source/image-identified F001 owner and captured actual baseline QUIC transport. New manifest permits initial restore;repairs use --no-restore.'
}|ConvertTo-Json -Depth 10|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 30
if($code){throw 'Actual standalone build failed;preserve source/log/exit and fix only diagnosed errors.'}
$bin=Join-Path $run 'harness\bin\Release\net12.0'
$conflicts=@(foreach($file in Get-ChildItem (Join-Path $run 'tests\borrowed-F001\image') -File|Where-Object Extension -In '.dll','.pdb')
{
    $target=Join-Path $bin $file.Name
    if(-not (Test-Path $target)){Copy-Item $file.FullName $target}
    elseif((Get-FileHash $target).Hash -cne (Get-FileHash $file.FullName).Hash)
    {
        if($file.Name -like 'Microsoft.AspNetCore.*' -or $file.Name -in 'InMemory.FunctionalTests.dll','System.IO.Pipelines.dll'){throw "Tested owner mismatch:$($file.Name)"}
        [pscustomobject]@{file=$file.Name;existingSha256=(Get-FileHash $target).Hash;testImageSha256=(Get-FileHash $file.FullName).Hash;action='Preserved resolved benchmark dependency without overwriting.'}
    }
})
ConvertTo-Json -InputObject @($conflicts) -Depth 6|Set-Content (Join-Path $directory 'test-dependency-copy-conflicts.json') -Encoding utf8
foreach($entry in $base.quicImageFiles|Where-Object file -Match '\.(dll|pdb)$')
{
    $target=Join-Path $bin $entry.file
    if(-not (Test-Path $target)){Copy-Item (Join-Path $run "quic-owner\image\$($entry.file)") $target}
    if((Get-FileHash $target).Hash -cne $entry.sha256){throw 'Actual captured QUIC owner differs in harness output.'}
}
Write-Output "F002:original-only real-owner build attempt$Attempt passed;no shipping source change."
