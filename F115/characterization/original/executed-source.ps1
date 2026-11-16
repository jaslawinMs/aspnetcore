$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F115'
$directory=Join-Path $run 'characterization\original'
if (Test-Path $directory) {throw 'Never overwrite F115 characterization.'}
node (Join-Path $PSScriptRoot 'F115-closure.mjs') $run --verify
if ($LASTEXITCODE) {throw 'Frozen image changed before characterization.'}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$arguments=@((Join-Path $run 'binaries\original\AutoPerf.Benchmarks.dll'),'--characterize','--fixture',(Join-Path $run 'fixture'),'--artifacts',$directory)
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log');$code=$LASTEXITCODE
[ordered]@{candidate='F115';variant='original';entryPoint='dotnet';arguments=$arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    sourceComparison=$false;diagnosticElapsedTimesAreNotBenchmarkComparisons=$true
}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
if ($code) {Get-Content (Join-Path $directory 'console.log') -Tail 25;throw 'Actual F115 characterization failed;preserve this attempt.'}
$contracts=@(Get-ChildItem (Join-Path $directory 'states') -Filter 'contract-*.json')
$calipers=@(Get-ChildItem (Join-Path $directory 'states') -Filter 'caliper-*.json')
if ($contracts.Count -ne 28 -or $calipers.Count -ne 28) {throw 'All28 positive contracts and all140 calipers required.'}
foreach ($file in $contracts)
{
    $item=Get-Content $file.FullName -Raw|ConvertFrom-Json
    if (-not $item.passed -or -not $item.result.passed) {throw 'Every complete input/result/model fixture must pass.'}
}
foreach ($file in $calipers)
{
    $item=Get-Content $file.FullName -Raw|ConvertFrom-Json
    if ($item.samples.Count -ne 5 -or @($item.samples|Where-Object {$_.operations -ne 4096 -or $_.allocatedBytes -lt 0 -or $_.bytesPerOperation -ne $_.allocatedBytes/4096}).Count) {throw 'Every exact synchronous allocation caliper required.'}
}
$diagnostic=Get-Content (Join-Path $directory 'states\typed-reader-diagnostics.json') -Raw|ConvertFrom-Json
if ($diagnostic.objectResultValue -ne 731 -or $diagnostic.nativeResultValue -ne 731 -or $diagnostic.sourceComparison -or
    $diagnostic.genericToObject.Count -ne 5 -or $diagnostic.nativeTypedReturn.Count -ne 5 -or
    @($diagnostic.genericToObject|Where-Object bytesPerOperation -NE 24).Count -or
    @($diagnostic.nativeTypedReturn|Where-Object bytesPerOperation -NE 0).Count) {throw 'Expected escaped object boxing/different native-return allocation diagnostics differ.'}
node (Join-Path $PSScriptRoot 'F115-closure.mjs') $run --verify
if ($LASTEXITCODE) {throw 'Frozen image changed during characterization.'}
Write-Output 'F115:28 complete actual helper/adapter/public-producer contracts/140 original calipers;generic-to-object24B,native-int0B different-contract diagnostics;frozen closure unchanged.'
