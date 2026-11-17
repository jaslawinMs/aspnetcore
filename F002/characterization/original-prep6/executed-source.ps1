$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F002'
$native=Get-Content (Join-Path $run 'native-ready.json') -Raw|ConvertFrom-Json
$manifest=Get-Content (Join-Path $run $native.manifest) -Raw|ConvertFrom-Json
$pdb=Get-Content (Join-Path $run 'pdb\original\document-audit.json') -Raw|ConvertFrom-Json
$directory=Join-Path $run "characterization\$($manifest.tag)"
$states=Join-Path $directory 'states'
if((Test-Path $directory) -or (Test-Path (Join-Path $run 'original-ready.json')) -or $pdb.tag -cne $manifest.tag -or
    $native.actualExitCode -ne 0 -or -not $native.namedNativeAssertionReached -or $pdb.verifiedDocuments -ne 26 -or
    (git branch --show-current).Trim() -cne 'autoperf/F002-webtransport-stream-removal' -or
    (git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or @(git diff --name-only).Count){throw 'Fresh exact original image,passed native boundary and source witnesses required.'}
foreach($entry in $manifest.files)
{
    if((Get-FileHash (Join-Path $manifest.image $entry.file)).Hash -cne $entry.sha256){throw 'Frozen original image changed.'}
}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$arguments=@((Join-Path $manifest.image 'AutoPerf.Benchmarks.dll'),'--characterize',$states)
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log');$code=$LASTEXITCODE
[ordered]@{
    candidate='F002';tag=$manifest.tag;entryPoint='dotnet';arguments=$arguments;actualExitCode=$code
    startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    componentCases=4;publicAbortControls=1;directBoundRemoveIsNotNativeProducerProof=$true
}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 30
if($code){throw 'Actual original component characterization failed;preserve source/image/log/exit without silent repetition.'}
$records=@(Get-ChildItem $states -File -Filter '*.json'|ForEach-Object {Get-Content $_.FullName -Raw|ConvertFrom-Json})
$cases=@($records|Where-Object kind -CEQ 'component-removal')
$names=@($cases|ForEach-Object {$_.value.scenario}|Sort-Object -Unique)
if($cases.Count -ne 4 -or ($names -join ',') -cne 'InputOne,InputSixteen,Missing,OutputOne' -or
    @($records|Where-Object kind -CEQ 'public-abort-control').Count -ne 1){throw 'All4 actual cases and1 opposite control required.'}
foreach($entry in $manifest.files)
{
    if((Get-FileHash (Join-Path $manifest.image $entry.file)).Hash -cne $entry.sha256){throw 'Original image changed during controls.'}
}
[ordered]@{
    candidate='F002';tag=$manifest.tag;image=$manifest.image;source=$manifest.source;states=$states;manifest=$native.manifest
    originalOnly=$true;sourceChanged=$false;sourceComparisons=0;componentCases=4;publicAbortControls=1
    namedNativeAssertionReached=$true;nativeOutcome=$native.outcome
    contendedRegistrationOrIncompleteDisposalEstablished=$false;compatibleOptimizationEstablished=$false
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $run 'original-ready.json') -Encoding utf8
Write-Output 'F002:all4 original component-removal/repeat/real CONNECT EOF cases and public Abort control passed;separate actual native FIN boundary passed.'
