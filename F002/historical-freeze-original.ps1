param([int]$Attempt=1)
$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F002'
$tag="original-prep$Attempt"
$image=Join-Path $run "binaries\$tag"
$source=Join-Path $run "frozen-source\$tag"
$build=Get-Content (Join-Path $run "build\attempt$Attempt\execution.json") -Raw|ConvertFrom-Json
if((Test-Path $image) -or (Test-Path $source) -or $build.actualExitCode -ne 0){throw 'Fresh immutable preparation from actual successful same-number build required.'}
foreach($entry in $build.sources)
{
    if((Get-FileHash (Join-Path $run "harness\$($entry.file)")).Hash -cne $entry.sha256){throw 'Do not freeze stale build output after source changed.'}
}
New-Item -ItemType Directory -Path $image,$source -Force|Out-Null
Copy-Item (Join-Path $run 'harness\bin\Release\net12.0\*') $image -Recurse
foreach($entry in Get-ChildItem (Join-Path $run 'harness') -File){Copy-Item $entry.FullName (Join-Path $source $entry.Name)}
$files=@(foreach($entry in Get-ChildItem $image -Recurse -File)
{
    [pscustomobject]@{file=[IO.Path]::GetRelativePath($image,$entry.FullName);bytes=$entry.Length;sha256=(Get-FileHash $entry.FullName).Hash}
})
[ordered]@{
    candidate='F002';tag=$tag;image=$image;source=$source;buildAttempt=$Attempt;files=$files;sourceChanged=$false
    baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5';nativeAndComponentControlsNotYetExecutedForThisImage=$true
}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $run "manifest-$tag.json") -Encoding utf8
Write-Output "F002:$tag exact$($files.Count)-file original image frozen;no control/timing execution claimed."
