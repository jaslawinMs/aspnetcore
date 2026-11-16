param(
    [ValidateSet('original','candidate1','candidate2','candidate3')][string]$Variant='original',
    [ValidatePattern('^[a-z0-9-]+$')][string]$Label='original',
    [switch]$CreateFixture
)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F112'
$directory=Join-Path $run "characterization\$Label"
if (Test-Path $directory) { throw 'Preserve every original/candidate diagnostic attempt.' }
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
node (Join-Path $PSScriptRoot 'F112-closure.mjs') $run $Variant --verify
if ($LASTEXITCODE) { throw 'Frozen execution image differs before characterization.' }
$executable=Join-Path $run "binaries\$Variant\AutoPerf.Benchmarks.dll"
$fixture=Join-Path $run 'fixture'
if ($CreateFixture)
{
    if ($Variant -ne 'original') { throw 'Only actual unchanged original creates fixtures.' }
    $fixtureArguments=@($executable,'--create-fixture',$fixture)
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    dotnet @fixtureArguments *> (Join-Path $directory 'fixture-console.log')
    $code=$LASTEXITCODE
    [ordered]@{candidate='F112';variant=$Variant;arguments=$fixtureArguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')}|
        ConvertTo-Json -Depth 5|Set-Content (Join-Path $directory 'fixture-execution.json') -Encoding utf8
    if ($code) { Get-Content (Join-Path $directory 'fixture-console.log') -Tail 30;throw "Exact owning fixture creation failed:$code" }
}
$arguments=@($executable,'--characterize','--fixture',$fixture,'--variant',$Variant,'--artifacts',$directory)
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log')
$code=$LASTEXITCODE
[ordered]@{
    candidate='F112';variant=$Variant;label=$Label;arguments=$arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    boundary='Original reproduction/candidate allocation calipers,not additional BDN timing comparisons.'
}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 3
if ($code) { throw "Actual owning characterization failed:$code;preserve this attempt." }
$manifest=Get-Content (Join-Path $fixture 'manifest.json') -Raw|ConvertFrom-Json
$contracts=@(Get-ChildItem (Join-Path $directory 'states') -Filter 'contract-*.json' -File)
$calipers=@(Get-ChildItem (Join-Path $directory 'states') -Filter 'caliper-*.json' -File)
if ($manifest.actualCases -ne 28 -or $contracts.Count -ne 28 -or $calipers.Count -ne 28) { throw 'All28 actual fixture/contract/caliper cases must complete.' }
foreach ($case in $manifest.files)
{
    $contract=Get-Content (Join-Path $directory "states\contract-$($case.Label).json") -Raw|ConvertFrom-Json
    $caliper=Get-Content (Join-Path $directory "states\caliper-$($case.Label).json") -Raw|ConvertFrom-Json
    if ($contract.Label -cne $case.Label -or $contract.outputSha256 -cne $case.outputSha256 -or
        $contract.inputSha256 -cne $case.inputSha256 -or $caliper.samples.Count -ne 5 -or
        @($caliper.samples|Where-Object {$_.operations -le 0 -or $_.allocatedBytes -lt 0}).Count) { throw "Exact owning contract/calipers failed:$($case.Label)" }
}
Write-Output "F112:${Label}:all28 exact typed/owned/real-getter/failure/recovery contracts and140allocation samples completed."
