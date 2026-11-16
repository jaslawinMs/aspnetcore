$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F109'
$fixture=Join-Path $run 'synthetic-fixture'
if (Test-Path $fixture) { throw 'Retain the exact shared synthetic fixture and never overwrite its keys.' }
$directory=Join-Path $run 'fixture-generation'
if (Test-Path $directory) { throw 'Retain the actual fixture generation attempt.' }
New-Item -ItemType Directory -Path $directory|Out-Null
$arguments=@((Join-Path $run 'harness\bin\Release\net12.0\AutoPerf.Benchmarks.dll'),'--create-fixture',$fixture)
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log')
$code=$LASTEXITCODE
[ordered]@{
    candidate='F109';arguments=$arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    harnessSha256=(Get-FileHash $arguments[0]).Hash;sourceComparisons=0
    syntheticOnly=$true;isolatedPrivateKeyBytesNotForPublication=$true
}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 25
if ($code) { throw 'Actual shared synthetic public-producer fixture generation failed;retain failure and keys.' }
$provenance=Get-Content (Join-Path $fixture 'provenance.json') -Raw|ConvertFrom-Json
if ($provenance.caseCount -ne 33 -or -not $provenance.syntheticOnly -or -not $provenance.actualPublicManagerGenerateUsed -or
    -not $provenance.actualPublicDataProtectionUsed -or $provenance.keys.Count -le 0)
{
    throw 'Actual33-case public-producer/isolated-key fixture receipt differs.'
}
Write-Output 'F109 actual33-case shared synthetic token fixture created once;real public producer/protector,original one-day lifetime,private keys stay local.'
