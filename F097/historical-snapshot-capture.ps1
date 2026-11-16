param([Parameter(Mandatory)][ValidateSet('before','after')][string]$Variant)
$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
. (Join-Path $repo 'activate.ps1')
$run = Join-Path $PSScriptRoot 'autoperf-runs\F097'
$built = Join-Path $run 'harness\bin\Release\net12.0'
$destination = Join-Path $run "binaries\$Variant"
if (Test-Path -LiteralPath $destination)
{
    throw 'Frozen actual executable snapshots must never be overwritten.'
}
New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
if ($Variant -eq 'before')
{
    Copy-Item -LiteralPath $built -Destination $destination -Recurse
}
else
{
    Copy-Item -LiteralPath (Join-Path $run 'binaries\before') -Destination $destination -Recurse
    foreach ($name in 'Microsoft.JSInterop.dll','Microsoft.JSInterop.pdb')
    {
        Copy-Item -LiteralPath (Join-Path $built $name) -Destination (Join-Path $destination $name) -Force
    }
}
$sourceFolder = Join-Path $run "source-$Variant"
New-Item -ItemType Directory -Path $sourceFolder -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $repo 'src\Components\JSInterop\src\JSRuntime.cs') -Destination (Join-Path $sourceFolder 'JSRuntime.cs') -Force
$manifest = [ordered]@{
    candidate='F097'; variant=$Variant; source_revision=(git -C $repo rev-parse HEAD)
    source_dirty=@(git -C $repo status --porcelain)
    target_source='src\Components\JSInterop\src\JSRuntime.cs'
    target_source_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $sourceFolder 'JSRuntime.cs')).Hash
    target_assembly_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $destination 'Microsoft.JSInterop.dll')).Hash
    benchmark_assembly_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $destination 'AutoPerf.Benchmarks.dll')).Hash
    runtime_configuration_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $destination 'AutoPerf.Benchmarks.runtimeconfig.json')).Hash
    dependency_configuration_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $destination 'AutoPerf.Benchmarks.deps.json')).Hash
    configuration='Release'; targetFramework='net12.0'; runtimeFramework='12.0.0-alpha.1.26562.105'
    commonHarnessFrozenBefore=$true; capturedAt=[DateTimeOffset]::UtcNow.ToString('o')
}
if ($Variant -eq 'before' -and $manifest.target_assembly_sha256 -cne '9737FA503AF90C69C2D9FBA1386898054A4BFDA613F11E8260A090BFDCDC40D5')
{
    throw 'Actual original owner differs from verified baseline.'
}
if ($Variant -eq 'after' -and $manifest.target_assembly_sha256 -ceq '9737FA503AF90C69C2D9FBA1386898054A4BFDA613F11E8260A090BFDCDC40D5')
{
    throw 'Proposed actual owner is still original.'
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $run "$Variant-manifest.json")
$commands = [System.Collections.Generic.List[object]]::new()
foreach ($file in Get-ChildItem -LiteralPath (Join-Path $run 'harness') -Filter '*.cs' -File)
{
    $args = @((Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'),
        'pdb',(Join-Path $destination 'AutoPerf.Benchmarks.pdb'),$file.Name,$file.FullName)
    dotnet @args > (Join-Path $run "harness-$($file.BaseName)-pdb-$Variant.json")
    $exit = $LASTEXITCODE
    $commands.Add([ordered]@{arguments=$args;exitCode=$exit;kind='harness';source=$file.Name})
    if ($exit -ne 0)
    {
        throw "Actual frozen harness source/PDB differs:$($file.Name)"
    }
}
$sources = @(Get-Content -LiteralPath (Join-Path $run 'producer-source-copies.json') -Raw | ConvertFrom-Json |
    Where-Object { $_.path -like '*/src/*.cs' })
foreach ($source in $sources)
{
    $name = Split-Path $source.path -Leaf
    $path = if ($name -eq 'JSRuntime.cs') { Join-Path $sourceFolder $name } else { Join-Path $run $source.snapshot }
    $args = @((Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'),
        'pdb',(Join-Path $destination 'Microsoft.JSInterop.pdb'),$name,$path)
    dotnet @args > (Join-Path $run "owner-$([IO.Path]::GetFileNameWithoutExtension($name))-pdb-$Variant.json")
    $exit = $LASTEXITCODE
    $commands.Add([ordered]@{arguments=$args;exitCode=$exit;kind='owner-producer';source=$source.path})
    if ($exit -ne 0)
    {
        throw "Actual frozen owner/producer source/PDB differs:$name"
    }
}
$commands | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $run "pdb-$Variant-commands.json")
node (Join-Path $PSScriptRoot 'F097-closure.mjs') $run
if ($LASTEXITCODE -ne 0)
{
    throw 'Actual complete frozen execution closure audit failed.'
}
Write-Output "F097:$Variant actual owner/harness source/PDB documents:$($commands.Count)."
