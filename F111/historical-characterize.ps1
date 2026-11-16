param(
    [ValidateSet('original','candidate1','candidate2','candidate3')][string]$Variant='original',
    [ValidatePattern('^[a-z0-9-]+$')][string]$Label='original',
    [switch]$CreateFixture
)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F111'
$directory=Join-Path $run "characterization\$Label"
if (Test-Path $directory) { throw 'Retain exact prior diagnostic attempts;choose a new label.' }
New-Item -ItemType Directory -Path $directory -Force|Out-Null
node (Join-Path $PSScriptRoot 'F111-closure.mjs') $run $Variant --verify
if ($LASTEXITCODE) { throw 'Actual frozen execution image differs before characterization.' }
$executable=Join-Path $run "binaries\$Variant\AutoPerf.Benchmarks.dll"
$fixture=Join-Path $run 'fixture'
if ($CreateFixture)
{
    if ($Variant -ne 'original') { throw 'Only the unchanged owning original creates exact shared fixture bytes.' }
    $fixtureArguments=@($executable,'--create-fixture',$fixture)
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    dotnet @fixtureArguments *> (Join-Path $directory 'fixture-console.log')
    $code=$LASTEXITCODE
    [ordered]@{candidate='F111';variant=$Variant;arguments=$fixtureArguments;exitCode=$code;startedAt=$start;
        completedAt=[DateTimeOffset]::UtcNow.ToString('o')}|ConvertTo-Json -Depth 5|
        Set-Content (Join-Path $directory 'fixture-execution.json') -Encoding utf8
    if ($code) { Get-Content (Join-Path $directory 'fixture-console.log') -Tail 30;throw "Exact owning fixture creation failed:$code" }
}
$arguments=@($executable,'--characterize','--fixture',$fixture,'--variant',$Variant,'--artifacts',$directory)
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log')
$code=$LASTEXITCODE
[ordered]@{
    candidate='F111';variant=$Variant;label=$Label;arguments=$arguments;exitCode=$code;startedAt=$start
    completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    boundary='Original reproduction or associated candidate allocation calipers;not additional BenchmarkDotNet timing comparisons.'
}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 5
if ($code) { throw "Actual owning characterization failed:$code;preserve this attempt." }
$manifest=Get-Content (Join-Path $fixture 'manifest.json') -Raw|ConvertFrom-Json
$contracts=@(Get-ChildItem (Join-Path $directory 'states') -Filter 'contract-*.json' -File)
$calipers=@(Get-ChildItem (Join-Path $directory 'states') -Filter 'caliper-*.json' -File)
if ($manifest.actualCases -ne 28 -or $contracts.Count -ne 28 -or $calipers.Count -ne 28)
{
    throw 'All28 actual fixture/contract/caliper cases must complete.'
}
foreach ($case in $manifest.files)
{
    $contract=Get-Content (Join-Path $directory "states\contract-$($case.Label).json") -Raw|ConvertFrom-Json
    $caliper=Get-Content (Join-Path $directory "states\caliper-$($case.Label).json") -Raw|ConvertFrom-Json
    if ($contract.Label -cne $case.Label -or $contract.outputSha256 -cne $case.outputSha256 -or
        $contract.inputSha256 -cne $case.inputSha256 -or $caliper.samples.Count -ne 5 -or
        @($caliper.samples|Where-Object {$_.operations -le 0 -or $_.allocatedBytes -lt 0}).Count)
    {
        throw "Exact owning input/output or allocation-sample validation failed:$($case.Label)"
    }
}
Write-Output "F111:${Label} all28 actual input/output/type/log/ownership/failure controls and140allocation samples completed."
