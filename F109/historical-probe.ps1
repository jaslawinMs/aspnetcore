param(
    [ValidatePattern('^[a-z0-9-]+$')][string]$Label='development-original',
    [ValidateSet('original','candidate1','candidate2','candidate3')][string]$Variant='original',
    [string]$ImageDirectory
)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F109'
if (-not $ImageDirectory) { $ImageDirectory=Join-Path $run 'harness\bin\Release\net12.0' }
$directory=Join-Path $run "verification\$Label"
if (Test-Path $directory) { throw 'Retain actual probe attempts;choose a new explicit label.' }
New-Item -ItemType Directory -Path $directory -Force|Out-Null
$arguments=@((Join-Path $ImageDirectory 'AutoPerf.Benchmarks.dll'),'--fixture',(Join-Path $run 'synthetic-fixture'),
    '--variant',$Variant,'--artifacts',$directory,'--characterize')
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log')
$code=$LASTEXITCODE
[ordered]@{
    candidate='F109';label=$Label;variant=$Variant;arguments=$arguments;exitCode=$code
    startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o');sourceComparisonProfile=$false
    actualHarnessSha256=(Get-FileHash $arguments[0]).Hash
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 30
if ($code) { throw 'Actual F109 public producer/consumer probe failed;retain observed states/input/failure.' }
$receipt=Get-Content (Join-Path $directory 'states\contract-resources.json') -Raw|ConvertFrom-Json
if ($receipt.contracts.Count -ne 33 -or $receipt.resources.Count -ne 165 -or $receipt.independentContractRuns -ne 66 -or
    -not $receipt.allCompleteOutcomesAndExactContractsPassed)
{
    throw 'Every actual33-case/two-pass contract/165 resource caliper receipt is required.'
}
Write-Output "F109 actual$Label:33 cases/66 complete observed contracts/165 precise8192-op process-wide calipers passed;not a BDN source comparison."
