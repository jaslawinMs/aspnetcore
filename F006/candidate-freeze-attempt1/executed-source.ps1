$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$repo=[string]$PWD
$run=Join-Path $PSScriptRoot 'autoperf-runs\F006'
$image=Join-Path $run 'binaries\candidate-1'
$frozen=Join-Path $run 'frozen-source\candidate-1'
$directory=Join-Path $run 'candidate-freeze-attempt1'
if((Test-Path $image) -or (Test-Path $frozen) -or (Test-Path $directory)){throw 'Fresh candidate owner-substitution image required.'}
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
$owner=Join-Path $repo 'artifacts\bin\Microsoft.AspNetCore.Components.Analyzers\Release\netstandard2.0'
if((Get-FileHash (Join-Path $owner 'Microsoft.AspNetCore.Components.Analyzers.dll')).Hash-cne$audit.binaryHashes[0].sha256){throw 'Actual candidate owner must equal freshly tested owner.'}
New-Item $image,$frozen -ItemType Directory -Force|Out-Null
Copy-Item (Join-Path $run 'binaries\original\*') $image -Recurse
Copy-Item (Join-Path $run 'frozen-source\original\*') $frozen -Recurse
foreach($name in 'Microsoft.AspNetCore.Components.Analyzers.dll','Microsoft.AspNetCore.Components.Analyzers.pdb'){Copy-Item (Join-Path $owner $name) (Join-Path $image $name)}
Copy-Item 'src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs' (Join-Path $frozen 'owner\ForLoopIteratorInClosureAnalyzer.cs')
New-Item (Join-Path $tests 'test-image') -ItemType Directory|Out-Null
foreach($name in 'Microsoft.AspNetCore.Components.Analyzers.Tests.dll','Microsoft.AspNetCore.Components.Analyzers.Tests.pdb','Microsoft.AspNetCore.Components.Analyzers.Tests.deps.json','Microsoft.AspNetCore.Components.Analyzers.Tests.runtimeconfig.json')
{
    Copy-Item (Join-Path $repo "artifacts\bin\Microsoft.AspNetCore.Components.Analyzers.Tests\Release\net12.0\$name") (Join-Path $tests 'test-image')
}
$files=@(Get-ChildItem $image -File -Recurse|ForEach-Object {[ordered]@{relativePath=[IO.Path]::GetRelativePath($image,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
$sources=@(Get-ChildItem $frozen -File -Recurse|ForEach-Object {[ordered]@{relativePath=[IO.Path]::GetRelativePath($frozen,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
$changed=@(foreach($row in $files){$before=@($original.files|Where-Object relativePath -CEQ $row.relativePath);if($before.Count-ne1){throw 'Image inventories differ.'};if($row.sha256-cne$before[0].sha256){$row.relativePath}})
if((($changed|Sort-Object)-join'|')-cne'Microsoft.AspNetCore.Components.Analyzers.dll|Microsoft.AspNetCore.Components.Analyzers.pdb' -or
    $files.Count-ne98 -or $sources.Count-ne31){throw 'Only actual owner DLL/PDB may differ;identical original harness and other96 files required.'}
[ordered]@{candidate='F006';variant='candidate-1';ownerSha256=$audit.binaryHashes[0].sha256;imageRoot=$image;files=$files;frozenSources=$sources;
    actualTestOutputOwnerMatched=$true;harnessRecompiled=$false;exactOriginalHarnessDllPdbRetained=$true;onlyOwnerDllPdbDiffer=$true;
    actualChangedImageFiles=$changed;expectedBenchmarkReports=22;expectedCompilerChecks=120}|
    ConvertTo-Json -Depth 7|Set-Content (Join-Path $run 'manifest-candidate-1.json')
Write-Output 'F006 candidate frozen:98 files/31 sources;exact original harness and96 nonowner image files retained,only tested owner DLL/PDB differ.'
