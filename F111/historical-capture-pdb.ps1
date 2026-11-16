param([ValidateSet('original','candidate1','candidate2','candidate3')][string]$Variant='original')
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F111'
$tool=Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'
$destination=Join-Path $run "symbols\$Variant"
if (Test-Path $destination) { throw 'Do not replace an actual symbol/source proof.' }
New-Item -ItemType Directory -Path $destination -Force|Out-Null
$source=Join-Path $run "frozen-source\$Variant"
$image=Join-Path $run "binaries\$Variant"
$mappings=@(
    @('AutoPerf.Benchmarks','Program.cs','harness\Program.cs'),
    @('AutoPerf.Benchmarks','Cases.cs','harness\Cases.cs'),
    @('AutoPerf.Benchmarks','Workload.cs','harness\Workload.cs'),
    @('Microsoft.AspNetCore.Components.Endpoints','JsonStoredDataSerializer.cs',
        'src\Components\Endpoints\src\Serialization\JsonStoredDataSerializer.cs'),
    @('Microsoft.AspNetCore.Components.Endpoints','SessionStorageTempDataProvider.cs',
        'src\Components\Endpoints\src\TempData\SessionStorageTempDataProvider.cs'),
    @('Microsoft.AspNetCore.Components.Endpoints','RazorComponentsServiceCollectionExtensions.cs',
        'src\Components\Endpoints\src\DependencyInjection\RazorComponentsServiceCollectionExtensions.cs'),
    @('Microsoft.AspNetCore.Session','DistributedSession.cs','src\Middleware\Session\src\DistributedSession.cs'),
    @('Microsoft.AspNetCore.Session','DistributedSessionStore.cs','src\Middleware\Session\src\DistributedSessionStore.cs')
)
if ($Variant -in 'candidate2','candidate3')
{
    $mappings+=,@('Microsoft.AspNetCore.Components.Endpoints','PooledArrayBufferWriter.cs','src\Shared\PooledArrayBufferWriter.cs')
}
$commands=@()
foreach ($mapping in $mappings)
{
    $arguments=@($tool,'pdb',(Join-Path $image "$($mapping[0]).pdb"),$mapping[1],(Join-Path $source $mapping[2]))
    $raw=@(dotnet @arguments)
    $code=$LASTEXITCODE
    $raw|Set-Content (Join-Path $destination "$($mapping[1]).json") -Encoding utf8
    $commands+=[ordered]@{arguments=$arguments;exitCode=$code}
    if ($code) { throw "Actual PDB document/source checksum mismatch:$($mapping[1])" }
}
$commands|ConvertTo-Json -Depth 7|Set-Content (Join-Path $destination 'commands.json') -Encoding utf8
Write-Output "F111:${Variant}$($mappings.Count)actual selected portable-PDB document/source checksums passed;not method coverage."
