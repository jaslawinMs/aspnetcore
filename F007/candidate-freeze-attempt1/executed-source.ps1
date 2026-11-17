$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$repo=[string]$PWD
$run=Join-Path $PSScriptRoot 'autoperf-runs\F007'
$image=Join-Path $run 'binaries\candidate-1'
$frozen=Join-Path $run 'frozen-source\candidate-1'
$directory=Join-Path $run 'candidate-freeze-attempt1'
if((Test-Path $image) -or (Test-Path $frozen) -or (Test-Path $directory)){throw 'Fresh tested-owner substitution required.'}
New-Item $directory -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$original=Get-Content (Join-Path $run 'manifest-original.json') -Raw|ConvertFrom-Json
foreach($file in $original.files)
{
    $actual=Join-Path $run "binaries\original\$($file.relativePath)"
    if((Get-FileHash $actual).Hash-cne$file.sha256 -or (Get-Item $actual).Length-ne$file.bytes){throw 'Original immutable image changed.'}
}
$tests=Join-Path $run 'tests\candidate-1'
$audit=Get-Content (Join-Path $tests 'actual-test-audit.json') -Raw|ConvertFrom-Json
$owner=Join-Path $repo 'artifacts\bin\Microsoft.AspNetCore.Components.Server\Release\net12.0'
if((Get-FileHash (Join-Path $owner 'Microsoft.AspNetCore.Components.Server.dll')).Hash-cne$audit.binaryHashes[0].sha256 -or
    (Get-FileHash (Join-Path $owner 'Microsoft.AspNetCore.Components.Server.pdb')).Hash-cne$audit.binaryHashes[1].sha256){throw 'Actual candidate DLL/PDB must equal freshly tested owner.'}
New-Item $image,$frozen -ItemType Directory -Force|Out-Null
Copy-Item (Join-Path $run 'binaries\original\*') $image -Recurse
Copy-Item (Join-Path $run 'frozen-source\original\*') $frozen -Recurse
foreach($name in 'Microsoft.AspNetCore.Components.Server.dll','Microsoft.AspNetCore.Components.Server.pdb'){Copy-Item (Join-Path $owner $name) (Join-Path $image $name)}
Copy-Item 'src\Components\Server\src\Circuits\ServerComponentDeserializer.cs' (Join-Path $frozen 'owner\ServerComponentDeserializer.cs')
New-Item (Join-Path $tests 'test-image') -ItemType Directory|Out-Null
foreach($name in 'Microsoft.AspNetCore.Components.Server.Tests.dll','Microsoft.AspNetCore.Components.Server.Tests.pdb','Microsoft.AspNetCore.Components.Server.Tests.deps.json','Microsoft.AspNetCore.Components.Server.Tests.runtimeconfig.json')
{
    Copy-Item (Join-Path $repo "artifacts\bin\Microsoft.AspNetCore.Components.Server.Tests\Release\net12.0\$name") (Join-Path $tests 'test-image')
}
$files=@(Get-ChildItem $image -File -Recurse|ForEach-Object {[ordered]@{relativePath=[IO.Path]::GetRelativePath($image,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
$sources=@(Get-ChildItem $frozen -File -Recurse|ForEach-Object {[ordered]@{relativePath=[IO.Path]::GetRelativePath($frozen,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
$changed=@(foreach($row in $files){$before=@($original.files|Where-Object relativePath -CEQ $row.relativePath);if($before.Count-ne1){throw 'Image inventories differ.'};if($row.sha256-cne$before[0].sha256){$row.relativePath}})
if((($changed|Sort-Object)-join'|')-cne'Microsoft.AspNetCore.Components.Server.dll|Microsoft.AspNetCore.Components.Server.pdb' -or
    $files.Count-ne147 -or $sources.Count-ne26){throw 'Only tested owner DLL/PDB may differ;all145 nonowner files including actual original harness required.'}
[ordered]@{candidate='F007';variant='candidate-1';ownerSha256=$audit.binaryHashes[0].sha256;ownerPdbSha256=$audit.binaryHashes[1].sha256;imageRoot=$image;
    files=$files;frozenSources=$sources;actualTestOutputOwnerMatched=$true;harnessRecompiled=$false;
    exactOriginalHarnessDllPdbRetained=$true;onlyOwnerDllPdbDiffer=$true;actualChangedImageFiles=$changed;expectedBenchmarkReports=22;expectedOwnerChecks=129}|
    ConvertTo-Json -Depth 7|Set-Content (Join-Path $run 'manifest-candidate-1.json')
Write-Output 'F007 candidate frozen:147 files/26 sources;exact original harness/all145 nonowner image files retained,only tested owner DLL/PDB differ.'
