param([ValidateSet('original','candidate1','candidate2','candidate3')][string]$Variant='original')
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F113'
$tool=Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'
$destination=Join-Path $run "symbols\$Variant"
if (Test-Path $destination) {throw 'Never replace actual PDB/source records.'}
New-Item -ItemType Directory -Path $destination -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
$source=Join-Path $run "frozen-source\$Variant";$image=Join-Path $run "binaries\$Variant"
$mappings=@(
    @('AutoPerf.Benchmarks','Program.cs','harness\Program.cs'),@('AutoPerf.Benchmarks','Cases.cs','harness\Cases.cs'),
    @('AutoPerf.Benchmarks','Workload.cs','harness\Workload.cs'),
    @('AutoPerf.Benchmarks','SettingsPreservingEmitToolchain.cs','harness\SettingsPreservingEmitToolchain.cs'),
    @('Microsoft.AspNetCore.Mvc.TagHelpers','DistributedCacheTagHelperService.cs','src\Mvc\Mvc.TagHelpers\src\Cache\DistributedCacheTagHelperService.cs'),
    @('Microsoft.AspNetCore.Mvc.TagHelpers','DistributedCacheTagHelperFormatter.cs','src\Mvc\Mvc.TagHelpers\src\Cache\DistributedCacheTagHelperFormatter.cs'),
    @('Microsoft.AspNetCore.Mvc.TagHelpers','DistributedCacheTagHelperStorage.cs','src\Mvc\Mvc.TagHelpers\src\Cache\DistributedCacheTagHelperStorage.cs'),
    @('Microsoft.AspNetCore.Mvc.TagHelpers','CacheTagKey.cs','src\Mvc\Mvc.TagHelpers\src\Cache\CacheTagKey.cs'),
    @('Microsoft.AspNetCore.Mvc.TagHelpers','DistributedCacheTagHelper.cs','src\Mvc\Mvc.TagHelpers\src\DistributedCacheTagHelper.cs'),
    @('Microsoft.AspNetCore.Mvc.TagHelpers','CacheTagHelperBase.cs','src\Mvc\Mvc.TagHelpers\src\CacheTagHelperBase.cs'),
    @('Microsoft.AspNetCore.Mvc.TagHelpers','TagHelperExtensions.cs','src\Mvc\Mvc.TagHelpers\src\DependencyInjection\TagHelperExtensions.cs')
)
$commands=@(foreach ($mapping in $mappings)
{
    $arguments=@($tool,'pdb',(Join-Path $image "$($mapping[0]).pdb"),$mapping[1],(Join-Path $source $mapping[2]))
    $raw=@(dotnet @arguments);$code=$LASTEXITCODE
    $raw|Set-Content (Join-Path $destination "$($mapping[1]).json") -Encoding utf8
    if ($code) {throw "Actual portable-PDB document/source checksum mismatch:$($mapping[1])"}
    [ordered]@{arguments=$arguments;exitCode=$code}
})
[ordered]@{candidate='F113';variant=$Variant;toolSha256=(Get-FileHash $tool).Hash;commands=$commands;
    note='Portable-PDB document/source checksums,not PE-CodeView/PDB binding or method coverage.'}|
    ConvertTo-Json -Depth 7|Set-Content (Join-Path $destination 'commands.json') -Encoding utf8
Write-Output "F113:${Variant}:$($mappings.Count) selected portable-PDB document/source checksums passed;not method coverage."
