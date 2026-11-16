$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F115'
$tool=Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'
$directory=Join-Path $run 'symbols\original'
if (Test-Path $directory) {throw 'Never overwrite actual F115 source-document checksum checks.'}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$frozen=Join-Path $run 'frozen-source\original'
$product='Microsoft.AspNetCore.JsonPatch.SystemTextJson'
$mappings=@(
    @('AutoPerf.Benchmarks','Program.cs','harness\Program.cs'),@('AutoPerf.Benchmarks','Cases.cs','harness\Cases.cs'),
    @('AutoPerf.Benchmarks','Workload.cs','harness\Workload.cs'),@('AutoPerf.Benchmarks','SettingsPreservingEmitToolchain.cs','harness\SettingsPreservingEmitToolchain.cs'),
    @($product,'GenericListOrJsonArrayUtilities.cs','src\Features\JsonPatch.SystemTextJson\src\Helpers\GenericListOrJsonArrayUtilities.cs'),
    @($product,'ListAdapter.cs','src\Features\JsonPatch.SystemTextJson\src\Internal\ListAdapter.cs'),
    @($product,'ObjectVisitor.cs','src\Features\JsonPatch.SystemTextJson\src\Internal\ObjectVisitor.cs'),
    @($product,'JsonUtilities.cs','src\Features\JsonPatch.SystemTextJson\src\Helpers\JsonUtilities.cs'),
    @($product,'AdapterFactory.cs','src\Features\JsonPatch.SystemTextJson\src\Adapters\AdapterFactory.cs'),
    @($product,'ObjectAdapter.cs','src\Features\JsonPatch.SystemTextJson\src\Adapters\ObjectAdapter.cs'),
    @($product,'JsonPatchDocument.cs','src\Features\JsonPatch.SystemTextJson\src\JsonPatchDocument.cs'),
    @($product,'JsonPatchDocumentConverter.cs','src\Features\JsonPatch.SystemTextJson\src\Converters\JsonPatchDocumentConverter.cs'),
    @("$product.Tests",'ListAdapterTest.cs','src\Features\JsonPatch.SystemTextJson\test\Internal\ListAdapterTest.cs'),
    @("$product.Tests",'ObjectVisitorTest.cs','src\Features\JsonPatch.SystemTextJson\test\Internal\ObjectVisitorTest.cs'),
    @("$product.Tests",'AnonymousObjectIntegrationTest.cs','src\Features\JsonPatch.SystemTextJson\test\IntegrationTests\AnonymousObjectIntegrationTest.cs')
)
$commands=@(foreach ($mapping in $mappings)
{
    $pdb=if ($mapping[0].EndsWith('.Tests')) {Join-Path $run "tests\original\image\$($mapping[0]).pdb"} else {Join-Path $run "binaries\original\$($mapping[0]).pdb"}
    $arguments=@($tool,'pdb',$pdb,$mapping[1],(Join-Path $frozen $mapping[2]))
    $raw=@(dotnet @arguments);$code=$LASTEXITCODE
    $raw|Set-Content (Join-Path $directory "$($mapping[1]).json") -Encoding utf8
    if ($code) {throw "Actual portable-PDB source document differs:$($mapping[1])"}
    [ordered]@{entryPoint='dotnet';arguments=$arguments;exitCode=$code}
})
[ordered]@{candidate='F115';variant='original';toolSha256=(Get-FileHash $tool).Hash;commands=$commands
    note='Fifteen portable-PDB executable-source document checks,not PE/PDB binding or method coverage. The separately captured interface contract is not assumed to produce a debug sequence-point document. No omitted runtime binary bytes rehash implied.'
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $directory 'commands.json') -Encoding utf8
Write-Output 'F115:15 actual harness/producer/owning-test PDB document/source checks passed;not PE binding or method coverage.'
