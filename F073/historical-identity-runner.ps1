param(
    [ValidateSet('after', 'after-2', 'after-3')]
    [string]$Snapshot = 'after',
    [ValidateRange(1, 3)]
    [int]$Comparison = 1,
    [string]$ProposedSource = 'source-proposed.cs'
)

$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F073'
$tool = Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'
$before = Get-Content (Join-Path $run 'before-manifest.json') -Raw | ConvertFrom-Json
$after = Get-Content (Join-Path $run "$Snapshot-manifest.json") -Raw | ConvertFrom-Json
foreach ($key in 'benchmark_assembly_sha256', 'runtime_configuration_sha256', 'dependency_configuration_sha256')
{
    if ($before.$key -cne $after.$key) { throw "Canonical A/B identity changed: $key" }
}
if ($before.target_assembly_sha256 -ceq $after.target_assembly_sha256)
{
    throw 'The actual source-linked owners must differ.'
}
$specifications = @(
    @((Join-Path $run 'binaries\before\Microsoft.AspNetCore.Mvc.Core.pdb'), 'OutputFormatter.cs',
        (Join-Path $run 'source-original.cs')),
    @((Join-Path $run "binaries\$Snapshot\Microsoft.AspNetCore.Mvc.Core.pdb"), 'OutputFormatter.cs',
        (Join-Path $run $ProposedSource)),
    @('C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Mvc.Core.Test\Release\net12.0\Microsoft.AspNetCore.Mvc.Core.Test.pdb',
        'OutputFormatterTests.cs', (Join-Path $run 'source-tests.cs')),
    @((Join-Path $run 'binaries\before\AutoPerf.Benchmarks.pdb'), 'Program.cs',
        (Join-Path $run 'harness\Program.cs')),
    @((Join-Path $run 'binaries\before\AutoPerf.Benchmarks.pdb'), 'OutputNegotiationBenchmark.cs',
        (Join-Path $run 'harness\OutputNegotiationBenchmark.cs')),
    @((Join-Path $run 'binaries\before\AutoPerf.Benchmarks.pdb'), 'NegotiationFixture.cs',
        (Join-Path $run 'harness\NegotiationFixture.cs')))
$documents = foreach ($specification in $specifications)
{
    $output = & dotnet $tool pdb $specification[0] $specification[1] $specification[2]
    if ($LASTEXITCODE) { throw 'Actual portable-PDB source document mismatch.' }
    $output -join "`n" | ConvertFrom-Json
}
@{ candidate = 'F073'; snapshot = $Snapshot; documents = @($documents);
    benchmark_sha256 = $before.benchmark_assembly_sha256;
    before_owner_sha256 = $before.target_assembly_sha256;
    proposed_owner_sha256 = $after.target_assembly_sha256 } |
    ConvertTo-Json -Depth 8 |
    Set-Content (Join-Path $run "compiled-source-identity-$Comparison.json") -Encoding utf8
$hashes = @{}
foreach ($variant in @('before', $Snapshot))
{
    $directory = Join-Path $run "binaries\$variant"
    $variantHashes = @{}
    foreach ($file in Get-ChildItem $directory -Recurse -File | Where-Object Extension -ne '.pdb')
    {
        $key = [IO.Path]::GetRelativePath($directory, $file.FullName).Replace('\', '/')
        $variantHashes[$key] = (Get-FileHash $file.FullName).Hash
    }
    $hashes[$variant] = $variantHashes
}
if ((($hashes.before.Keys | Sort-Object) -join ',') -cne (($hashes[$Snapshot].Keys | Sort-Object) -join ','))
{
    throw 'Recursive A/B execution closures differ in membership.'
}
$differences = @($hashes.before.Keys | Where-Object { $hashes.before[$_] -cne $hashes[$Snapshot][$_] })
if ($differences.Count -ne 1 -or $differences[0] -cne 'Microsoft.AspNetCore.Mvc.Core.dll')
{
    throw 'Recursive A/B execution closures differ outside the measured owner.'
}
@{ candidate = 'F073'; hashes = $hashes; count = $hashes.before.Count; differences = $differences } |
    ConvertTo-Json -Depth 8 |
    Set-Content (Join-Path $run "dependency-closure-$Comparison.json") -Encoding utf8
Write-Output "Six actual PDB documents and $($hashes.before.Count) recursive execution paths verified; only MVC.Core differs."
