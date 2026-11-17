param([int]$Attempt=1)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F001'
$tag="original-prep$Attempt"
$image=Join-Path $run "binaries\$tag"
$source=Join-Path $run "frozen-source\$tag"
$states=Join-Path $run "characterization\$tag\states"
$development=Join-Path $run "development\$tag"
if((Test-Path $image) -or (Test-Path $source) -or (Test-Path (Join-Path $run 'original-ready.json')) -or
    (git branch --show-current).Trim() -cne 'autoperf/F001-webtransport-session-disposal' -or
    (git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or @(git diff --name-only).Count){throw 'Fresh immutable preparation from exact independent source required.'}
New-Item -ItemType Directory -Path $image,$source,$development -Force|Out-Null
Copy-Item (Join-Path $run 'harness\bin\Release\net12.0\*') $image -Recurse
foreach($entry in Get-ChildItem (Join-Path $run 'harness') -File){Copy-Item $entry.FullName (Join-Path $source $entry.Name)}
Copy-Item $PSCommandPath (Join-Path $development 'executed-source.ps1')
$files=@(foreach($entry in Get-ChildItem $image -Recurse -File)
{
    [pscustomobject]@{file=[IO.Path]::GetRelativePath($image,$entry.FullName);bytes=$entry.Length;sha256=(Get-FileHash $entry.FullName).Hash}
})
[ordered]@{candidate='F001';tag=$tag;image=$image;files=$files;sourceChanged=$false;baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5'
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run "manifest-$tag.json") -Encoding utf8
$arguments=@((Join-Path $image 'AutoPerf.Benchmarks.dll'),'--characterize',$states)
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $development 'console.log');$code=$LASTEXITCODE
[ordered]@{candidate='F001';tag=$tag;entryPoint='dotnet';arguments=$arguments;actualExitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $development 'execution.json') -Encoding utf8
Get-Content (Join-Path $development 'console.log') -Tail 25
if($code){throw 'Actual producer preparation failed;preserve source/image/log/exit and fix only diagnosed preparation issues.'}
[ordered]@{candidate='F001';tag=$tag;image=$image;source=$source;states=$states;manifest="manifest-$tag.json";originalOnly=$true
    sourceChanged=$false;sourceComparisons=0;liveQuicBlockingPreconditionEstablished=$false
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $run 'original-ready.json') -Encoding utf8
Write-Output "F001:$tag faithful original protocol/pipe characterization completed;no source edit,comparison or live QUIC claim."
