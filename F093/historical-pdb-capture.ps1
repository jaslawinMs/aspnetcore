param([Parameter(Mandatory)][ValidateSet('before', 'after')][string]$Variant)
$ErrorActionPreference = 'Stop'
. 'C:\src\aspnetcore\activate.ps1'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F093'
$tool = Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'
$commands = @()
$arguments = @($tool, 'pdb', "$run\binaries\$Variant\Microsoft.AspNetCore.Http.pdb",
    'RequestServicesFeature.cs', "$run\source-$Variant.cs")
$raw = @(dotnet @arguments)
if ($LASTEXITCODE) { throw "Actual $Variant owner PDB source differs." }
$raw | Set-Content "$run\owner-pdb-$Variant.json" -Encoding utf8
$commands += @{ arguments = $arguments; exitCode = 0 }
$proofs = foreach ($file in 'Program.cs', 'RequestServicesLifecycle.cs', 'RequestServicesBenchmark.cs', 'RequestServicesProbe.cs')
{
    $arguments = @($tool, 'pdb', "$run\binaries\$Variant\AutoPerf.Benchmarks.pdb", $file, "$run\harness\$file")
    $raw = @(dotnet @arguments)
    if ($LASTEXITCODE) { throw "Actual $Variant harness PDB source differs:$file" }
    $commands += @{ arguments = $arguments; exitCode = 0 }
    ($raw -join "`n") | ConvertFrom-Json
}
$proofs | ConvertTo-Json | Set-Content "$run\harness-pdb-$Variant.json" -Encoding utf8
$commands | ConvertTo-Json -Depth 6 | Set-Content "$run\pdb-$Variant-commands.json" -Encoding utf8
Write-Output "F093:$Variant actual owner and four harness PDB/source proofs passed."
