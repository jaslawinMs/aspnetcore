$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
. (Join-Path $repo 'activate.ps1')
$run = Join-Path $PSScriptRoot 'autoperf-runs\F102'
$built = Join-Path $run 'harness\bin\Release\net12.0'
$destination = Join-Path $run 'binaries\original'
if (Test-Path -LiteralPath $destination) { throw 'F102 frozen original exists;do not overwrite.' }
if (@(git -C $repo status --porcelain --untracked-files=no).Count) { throw 'Unexpected tracked source edits before freeze.' }
New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
Copy-Item -LiteralPath $built -Destination $destination -Recurse
[ordered]@{
    candidate='F102';variant='original';source_revision=(git -C $repo rev-parse HEAD);source_dirty=@(git -C $repo status --porcelain)
    source_tracked_unchanged=$true;target_source='src\Components\JSInterop\src\JSRuntimeExtensions.cs'
    target_source_sha256=(Get-FileHash (Join-Path $repo 'src\Components\JSInterop\src\JSRuntimeExtensions.cs')).Hash
    target_assembly_sha256=(Get-FileHash (Join-Path $destination 'Microsoft.JSInterop.dll')).Hash
    benchmark_assembly_sha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.dll')).Hash
    runtime_configuration_sha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.runtimeconfig.json')).Hash
    dependency_configuration_sha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.deps.json')).Hash
    configuration='Release';targetFramework='net12.0';runtimeFramework='12.0.0-alpha.1.26562.105'
    source_comparison_budget_consumed=0;capturedAt=[DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'original-manifest.json')
$commands = [System.Collections.Generic.List[object]]::new()
$tool = Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'
foreach ($file in Get-ChildItem -LiteralPath (Join-Path $run 'harness') -Filter '*.cs' -File)
{
    $a = @($tool,'pdb',(Join-Path $destination 'AutoPerf.Benchmarks.pdb'),$file.Name,$file.FullName)
    dotnet @a > (Join-Path $run "harness-$($file.BaseName)-pdb-original.json")
    $code = $LASTEXITCODE
    $commands.Add([ordered]@{arguments=$a;exitCode=$code;kind='harness';source=$file.Name})
    if ($code) { throw "Actual F102 harness source/PDB differs:$($file.Name)" }
}
foreach ($source in @(Get-Content (Join-Path $run 'producer-source-copies.json') -Raw | ConvertFrom-Json |
    Where-Object executableBodyPdbExpected))
{
    $name = Split-Path $source.path -Leaf
    $a = @($tool,'pdb',(Join-Path $destination 'Microsoft.JSInterop.pdb'),$name,(Join-Path $run $source.snapshot))
    dotnet @a > (Join-Path $run "owner-$([IO.Path]::GetFileNameWithoutExtension($name))-pdb-original.json")
    $code = $LASTEXITCODE
    $commands.Add([ordered]@{arguments=$a;exitCode=$code;kind='owner-producer';source=$source.path})
    if ($code) { throw "Actual F102 recorded owner source/PDB differs:$name" }
}
if ($commands.Count -ne 16) { throw 'F102 requires5 harness/11 recorded owner source/PDB documents;pure marker/enum/flags separate.' }
$commands | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'pdb-original-commands.json')
node (Join-Path $PSScriptRoot 'F102-closure.mjs') $run
if ($LASTEXITCODE) { throw 'Frozen original F102 closure failed.' }
Write-Output 'F102:16 source/PDB document associations and frozen closure verified;not method coverage proof,no unfrozen probe or BDN.'
