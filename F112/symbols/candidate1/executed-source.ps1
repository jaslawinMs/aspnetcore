param([ValidateSet('original','candidate1','candidate2','candidate3')][string]$Variant='original')
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F112'
$tool=Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'
$destination=Join-Path $run "symbols\$Variant"
if (Test-Path $destination) { throw 'Never replace actual PDB/source records.' }
New-Item -ItemType Directory -Path $destination -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
$source=Join-Path $run "frozen-source\$Variant"
$image=Join-Path $run "binaries\$Variant"
$mappings=@(
    @('AutoPerf.Benchmarks','Program.cs','harness\Program.cs'),
    @('AutoPerf.Benchmarks','Cases.cs','harness\Cases.cs'),
    @('AutoPerf.Benchmarks','Workload.cs','harness\Workload.cs'),
    @('Microsoft.AspNetCore.Components.Endpoints','JsonStoredDataSerializer.cs','src\Components\Endpoints\src\Serialization\JsonStoredDataSerializer.cs'),
    @('Microsoft.AspNetCore.Components.Endpoints','SessionCascadingValueSupplier.cs','src\Components\Endpoints\src\SessionCascadingValueSupplier.cs'),
    @('Microsoft.AspNetCore.Components.Endpoints','EndpointHtmlRenderer.cs','src\Components\Endpoints\src\Rendering\EndpointHtmlRenderer.cs'),
    @('Microsoft.AspNetCore.Components.Endpoints','EndpointHtmlRenderer.Prerendering.cs','src\Components\Endpoints\src\Rendering\EndpointHtmlRenderer.Prerendering.cs'),
    @('Microsoft.AspNetCore.Components.Endpoints','RazorComponentResultExecutor.cs','src\Components\Endpoints\src\Results\RazorComponentResultExecutor.cs'),
    @('Microsoft.AspNetCore.Components.Endpoints','RazorComponentsServiceCollectionExtensions.cs','src\Components\Endpoints\src\DependencyInjection\RazorComponentsServiceCollectionExtensions.cs'),
    @('Microsoft.AspNetCore.Session','DistributedSession.cs','src\Middleware\Session\src\DistributedSession.cs'),
    @('Microsoft.AspNetCore.Session','DistributedSessionStore.cs','src\Middleware\Session\src\DistributedSessionStore.cs')
)
if ($Variant -ne 'original') { $mappings+=,@('Microsoft.AspNetCore.Components.Endpoints','PooledArrayBufferWriter.cs','src\Shared\PooledArrayBufferWriter.cs') }
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
[ordered]@{candidate='F112';variant=$Variant;toolSha256=(Get-FileHash $tool).Hash;commands=$commands;
    note='Portable-PDB document/source checksums,not PE-CodeView/PDB binding or method coverage.'}|
    ConvertTo-Json -Depth 7|Set-Content (Join-Path $destination 'commands.json') -Encoding utf8
Write-Output "F112:${Variant}:$($mappings.Count) selected portable-PDB document/source checksums passed;not method coverage."
