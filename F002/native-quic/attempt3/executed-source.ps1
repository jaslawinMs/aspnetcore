param([int]$Attempt=1)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F002'
$tag="original-prep$Attempt"
$manifest=Get-Content (Join-Path $run "manifest-$tag.json") -Raw|ConvertFrom-Json
$directory=Join-Path $run "native-quic\attempt$Attempt"
$states=Join-Path $directory 'states'
if((Test-Path $directory) -or (Test-Path (Join-Path $run 'native-ready.json'))){throw 'Never repeat completed native producer evidence.'}
foreach($entry in $manifest.files)
{
    if((Get-FileHash (Join-Path $manifest.image $entry.file)).Hash -cne $entry.sha256){throw 'Frozen original image changed.'}
}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$arguments=@((Join-Path $manifest.image 'AutoPerf.Benchmarks.dll'),'--native-quic',$states)
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log');$code=$LASTEXITCODE
[ordered]@{
    candidate='F002';tag=$tag;entryPoint='dotnet';arguments=$arguments;actualExitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    caseName='NativeQuicProbe.ActualQuicFinRemovesAssociatedStreamAsync';fullNetworkHttp3OrContendedRegistrationProofClaimed=$false
}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 30
if($code -eq 2)
{
    $blocked=@(Get-ChildItem $states -File -Filter '*-native-producer-blocked.json'|ForEach-Object {Get-Content $_.FullName -Raw|ConvertFrom-Json})
    if($blocked.Count -ne 1 -or $blocked[0].value.outcome -cne 'blocked-not-passed'){throw 'Exact unsupported-prerequisite record required;never downgrade an arbitrary failure.'}
}
elseif($code){throw 'Actual native producer probe failed;preserve source/image/log/negative exit and fix only the diagnosed boundary.'}
[ordered]@{
    candidate='F002';tag=$tag;manifest="manifest-$tag.json";states=$states;actualExitCode=$code
    outcome=if($code -eq 0){'passed-native-fin-hybrid-boundary'}else{'blocked-native-prerequisite-not-passed'}
    namedNativeAssertionReached=($code -eq 0);sourceChanged=$false;sourceComparisons=0
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $run 'native-ready.json') -Encoding utf8
Write-Output "F002 native producer actual exit$code;hybrid boundary only,no full network HTTP3/contention/performance claim."
